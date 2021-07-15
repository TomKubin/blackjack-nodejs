if(process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const bcrypt = require('bcrypt');
const passport = require('passport');
const flash = require('express-flash');
const session = require('express-session');
const methodOverride = require('method-override');

server.listen(3000);

const initializePassport = require('./passport-config');
initializePassport(
    passport,
    email => users.find(user => user.email === email),
    id => users.find(user => user.id === id)
);

Object.size = (obj) => {
  let size = 0, key;
  for(key in obj){
    if(obj.hasOwnProperty(key)) size++;
  }
  return size;
};

let nextRound = (room) => {
  let counter = 10;
  let botCards = [];
  let WinnerCountdown = setInterval(() => {
    io.sockets.to(room).emit('counter', counter);
    counter--;
    if (counter === 0) {
      try {
        io.sockets.to(room).emit('dealerS', rooms[room].score[0], rooms[room].roomMoney);
        for (let i = 0; i < 4; i++) {
          if (i % 2 === 0) {
            rooms[room].cards[i] = Math.round(Math.random() * 3);
            botCards[i] = rooms[room].cards[i];
          } else {
            rooms[room].cards[i] = Math.round(Math.random() * 11);
            botCards[i] = rooms[room].cards[i];
          }
        }
        rooms[room].score[0] = 0;
        rooms[room].score[0] = rooms[room].cards[1] + rooms[room].cards[3];
        rooms[room].roomMoney = 100 * Object.size(rooms[room].users);
        io.sockets.to(room).emit('addMoney', rooms[room].roomMoney);
      }catch{

      }
      io.sockets.to(room).emit('newcards', botCards);
      counter = 10;
    }
  }, 1000);
};

let users = [];

app.set('views', './views');
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.static(__dirname + '/views')); //CSS
app.use(express.urlencoded({extended: true}));
app.use(flash());
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());
app.use(methodOverride('_method'));

const rooms = {};

//Auth
let checkAuthenticated = (req, res, next) => {
  if(req.isAuthenticated()) {
    return next();
  }
  res.redirect('/login');
};

let checkNotAuthenticate = (req, res, next) => {
  if(req.isAuthenticated()) {
    return res.redirect('/');
  }
  next();
};

app.get('/', checkAuthenticated, (req, res) => {
  res.render('index', { rooms: rooms, name: req.user.name, money: req.user.money });
});

app.get('/rules', checkAuthenticated, (req, res) => {
  res.render('rules', { name: req.user.name, money: req.user.money });
});

//Login and register system
app.get('/login', checkNotAuthenticate, (req, res) => {
  res.render('login.ejs');
});

app.post('/login', checkNotAuthenticate, passport.authenticate('local', {
  successRedirect: '/',
  failureRedirect: '/login',
  failureFlash: true
}));

app.get('/register', checkNotAuthenticate, (req, res) => {
  res.render('register.ejs');
});

app.post('/register', checkNotAuthenticate, async (req, res) => {
  try{
    const hashedPassword = await bcrypt.hash(req.body.password, 12);
    users.push({
      id: Date.now().toString(),
      name: req.body.name,
      email: req.body.email,
      password: hashedPassword,
      money: parseInt(1000)
    });
    res.redirect('/login');
  }catch{
    res.redirect('/register');
  }
});

app.delete('/logout', (req, res) => {
  req.logOut();
  res.redirect('/login');
});

//Chat and rooms system
app.post('/room', (req, res) => {
  if(rooms[req.body.room] != null) {
    return res.redirect('/');
  }
  rooms[req.body.room] = { users: {}, cards: {}, score: {}, next: {}, roomMoney: {} };
  for(let i = 0; i < 4; i++) {
    if(i % 2 === 0) {
      rooms[req.body.room].cards[i] = Math.round(Math.random() * 3);
    }
    else{
      rooms[req.body.room].cards[i] = Math.round(Math.random() * 11);
    }
  }
  rooms[req.body.room].score[0] = rooms[req.body.room].cards[1] + rooms[req.body.room].cards[3];
  rooms[req.body.room].next = nextRound(req.body.room);
  rooms[req.body.room].roomMoney = parseInt(0);
  res.redirect(req.body.room);
  io.sockets.emit('room-created', req.body.room);
});

app.get('/:room', checkAuthenticated, (req, res) => {
  if(rooms[req.params.room] == null) {
    return res.redirect('/');
  }
  if(req.user.money >= 100){
    req.user.money -= 100;
  }
  else{
    return res.redirect('/');
  }
  res.render('room', { roomName: req.params.room, name: req.user.name, money: req.user.money,
    card1: rooms[req.params.room].cards[0], card11: rooms[req.params.room].cards[1],
    card2: rooms[req.params.room].cards[2], card22: rooms[req.params.room].cards[3],
    scoreBot: rooms[req.params.room].score[0]});
});

let getUserRooms = (socket) => {
  return Object.entries(rooms).reduce((names, [name, room]) => {
    if(room.users[socket.id] != null) names.push(name)
    return names
  }, []);
};

io.on('connection', socket => {
  socket.on('new-user', (room, name) => {
    try {
      socket.join(room);
      rooms[room].users[socket.id] = name;
      rooms[room].roomMoney += parseInt(100);
      socket.to(room).broadcast.emit('user-connected', name);
      io.sockets.to(room).emit('addMoney', rooms[room].roomMoney);
    }catch {

    }
  });

  socket.on('dealClick', (name, room, money) => {
    let i = 0;
    for(i; i < users.length; i++){
      if(users[i].name === name){
        users[i].money += money;
        break;
      }
    }
  });

  socket.on('send-chat-message', (room, message) => {
    socket.to(room).broadcast.emit('chat-message', {message : message, name: rooms[room].users[socket.id]});
  });
  socket.on('disconnect', () => {
    getUserRooms(socket).forEach(room => {
      socket.to(room).broadcast.emit('user-disconnected', rooms[room].users[socket.id]);
      delete rooms[room].users[socket.id];
      if(Object.size(rooms[room].users) === 0) {
        delete rooms[room];
      }
    });
  });
});
