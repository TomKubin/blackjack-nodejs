const socket = io('http://localhost:3000');
const messageContainer = document.getElementById('message-container');
const roomContainer = document.getElementById('room-container');
const messageForm = document.getElementById('send-container');
const messageInput = document.getElementById('message-input');
const nextForm = document.getElementById('next-card');
const playerCards = document.getElementById('player-cards');
const botCards = document.getElementById('dealer-cards');
const score = document.getElementById('score');
const winTable = document.getElementById('winner-text');
const cntForm = document.getElementById('counter');
const winMoney = document.getElementById('win-money');
const userText = document.getElementById('user-info');

let playerScore = parseInt(0);
let botScore = parseInt(0);

let appendMessage = (message) => {
    const messageElement = document.createElement('div');
    messageElement.innerText = message;
    messageContainer.append(messageElement);
};

//Player Cards
let appendCard = () => {
    const col = ['♠', '♣', '♦', '♥'];
    const num = ['A', 2, 3, 4, 5, 6, 7, 8, 9, 'J', 'Q', 'K'];
    let c = Math.round(Math.random() * 3);
    let n = Math.round(Math.random() * 11);
    c = col[c];
    n = num[n];
    if(n === 'J' || n === 'Q' || n === 'K') {
        playerScore += 10;
    }
    else if(n === 'A'){
        playerScore += 1;
    }
    else{
        playerScore += n;
    }
    let colorCard = () => {
        if(c === '♠' || c === '♣'){
            return "black";
        }
        else{
            return "red";
        }
    };
    const cardElement = document.createElement('div');
    cardElement.className = "card";
    cardElement.innerHTML = `<h2 style="color:${colorCard()};text-align: left;">${n}</h2>
                             <h1 style="color:${colorCard()};text-align: center">${c}</h1>
                             <h2 style="color:${colorCard()};text-align: right;">${n}</h2>`;
    playerCards.append(cardElement);
    //Score
    score.innerText = `Score: ${playerScore}`;
};

//Bot Cards
let botCard = (c, n, hide) => {
    const col = ['♠', '♣', '♦', '♥'];
    const num = ['A', 2, 3, 4, 5, 6, 7, 8, 9, 'J', 'Q', 'K'];
    c = col[c];
    n = num[n];
    if(n === 'J' || n === 'Q' || n === 'K') {
        botScore += 10;
    }
    else if(n === 'A'){
        botScore += 1;
    }
    else{
        botScore += n;
    }
    let colorCard = () => {
        if(c === '♠' || c === '♣'){
            return "black";
        }
        else{
            return "red";
        }
    };
    if(hide === false) {
        const cardElement = document.createElement('div');
        cardElement.className = "card";
        cardElement.innerHTML = `<h2 style="color:${colorCard()};text-align: left;">${n}</h2>
                             <h1 style="color:${colorCard()};text-align: center">${c}</h1>
                             <h2 style="color:${colorCard()};text-align: right;">${n}</h2>`;
        botCards.append(cardElement);
    }
    else{
        const cardElement = document.createElement('div');
        cardElement.className = "hideCard";
        botCards.append(cardElement);
    }
};

//Remove Cards
let removeCards = (className) =>{
    let elements = document.getElementsByClassName(className);
    while(elements.length > 0){
        elements[0].parentNode.removeChild(elements[0]);
    }
}

if(messageForm != null) {
    appendMessage('You joined');
    socket.emit('new-user', roomName, name);
    score.innerText = `Score: ${playerScore}`;
    appendCard();appendCard();botCard(card1, card11, true);botCard(card2, card22, false);
    messageForm.addEventListener('submit', e => {
        e.preventDefault();
        const message = messageInput.value;
        appendMessage(`${name}: ${message}`);
        socket.emit('send-chat-message', roomName, message);
        messageInput.value = '';
    });
    nextForm.addEventListener('submit', e => {
       e.preventDefault();
       if(playerScore < 22){
           appendCard();
       }
    });
}

socket.on('room-created', room => {
    if(on_index) {
        const roomElement = document.createElement('div');
        roomElement.innerText = room;
        const roomLink = document.createElement('a');
        roomLink.href = `/${room}`;
        roomLink.innerText = 'join';
        roomContainer.append(roomElement);
        roomContainer.append(roomLink);
    }
});

socket.on('chat-message', data => {
   appendMessage(`${data.name}: ${data.message}`);
});

socket.on('user-connected', name => {
    appendMessage(`${name} connected`);
});

socket.on('user-disconnected', name =>{
    appendMessage(`${name} disconnected`);
});

socket.on('counter', (count) => {
    cntForm.innerText = count;
});

socket.on('newcards', (botCards) => {
    removeCards('card');
    removeCards('hideCard');
    playerScore = 0;
    appendCard();appendCard();botCard(botCards[0], botCards[1], true);botCard(botCards[2], botCards[3], false);
});

socket.on('addMoney', (money) => {
    winMoney.innerText = `Winner Money: ${money}$`;
});

socket.on('dealerS', (bScore, mny) => {
   if(playerScore > bScore && playerScore < 22){
       socket.emit('dealClick', name, roomName, mny);
       winTable.innerText = "You Win";
       money = parseInt(mny) + parseInt(money);
       userText.innerText = `User: ${name} | Money ${money}$`;
   }
   else if(playerScore < bScore || playerScore > 21){
       socket.emit('dealClick', name, roomName, -mny);
       winTable.innerText = "You Lose";
       mny = mny / 2;
       money = parseInt(money) - parseInt(mny);
       userText.innerText = `User: ${name} | Money ${money}$`;
   }
});