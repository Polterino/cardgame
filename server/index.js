// server/index.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});


const rooms = {}; // roomId -> { players: [{id, name}], turnIndex, playedCards, deck, hands }

function createDeck() {
  const suits = ['Spade', 'Bastoni', 'Denari', 'Coppe'];
  const values = ['A', '2', '3', '4', '5', '6', '7', 'Fante', 'Cavallo', 'Re'];
  const deck = [];
  for (let suit of suits) {
    for (let value of values) {
      deck.push(`${value}${suit}`);
    }
  }
  return deck.slice(0, 40); // Mazzo da 40 carte
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

io.on('connection', socket => {
  console.log('Nuovo client connesso:', socket.id);

  socket.on('setName', name => {
    socket.data.name = name;
  });

  socket.on('createRoom', () => {
    let roomId;
    do {
      roomId = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    } while (rooms[roomId]); // Evita collisioni

    const deck = createDeck();
    shuffle(deck);
    const hand = deck.splice(0, 3);

    rooms[roomId] = {
      players: [{ id: socket.id, name: socket.data.name }],
      turnIndex: 0,
      playedCards: [],
      deck: deck,
      hands: {
        [socket.id]: hand
      }
    };

    socket.join(roomId);

    // Invia info sulla stanza
    io.to(socket.id).emit('roomJoined', {
      room: roomId,
      players: rooms[roomId].players,
      hand: hand,
      currentTurnIndex: 0
    });

    console.log("Room created ", roomId);
  });

  socket.on('joinRoom', roomId => {
    if (rooms[roomId])
    {
      rooms[roomId].players.push({ id: socket.id, name: socket.data.name });
      rooms[roomId].hands[socket.id] = rooms[roomId].deck.splice(0, 3);
      socket.join(roomId);
      io.to(socket.id).emit('roomJoined', {
        room: roomId,
        players: rooms[roomId].players,
        hand: rooms[roomId].hands[socket.id],
        currentTurnIndex: 0
      });
      io.to(roomId).emit('playerJoined', {players: rooms[roomId].players});
    }
  });

  socket.on('rejoinRoom', ({ name, roomId }) => {
    socket.join(roomId);
    const player = { id: socket.id, name };
    console.log("User ", name, " is trying to rejoin")

    
    if (!rooms[roomId]) return;

    // se esiste già un player con quel nome, lo rimpiazzi
    const existing = rooms[roomId].players.find(p => p.name === name);
    if (!existing) {
      rooms[roomId].players.push(player);
      console.log("Rejoin, added as new player");
    } else {
      existing.id = socket.id;  // aggiorna lo socketId
      console.log("Rejoin, socket id updated");
    }

    // manda lo stato attuale solo a lui
    io.to(socket.id).emit('roomJoined', {
      room: roomId,
      players: rooms[roomId].players,
      hand: rooms[roomId].hands[name] || [],
      currentTurnIndex: rooms[roomId].currentTurnIndex
    });

    io.to(roomId).emit('playerJoined', { players: rooms[roomId].players });
  });

  socket.on('startGame', roomId => {
    const room = rooms[roomId];
    if (room) {
      room.turnIndex = 0;
      room.playedCards = [];
      io.to(roomId).emit('gameStarted', room);
      const currentPlayer = room.players[room.turnIndex];
      io.to(roomId).emit('turnChanged', currentPlayer.id);
    }
  });

  socket.on('playCard', ({ roomId, card }) => {
    const room = rooms[roomId];
    if (!room) return;
    const playerIndex = room.players.findIndex(p => p.id === socket.id);
    const currentPlayer = room.players[room.turnIndex];

    if (socket.id !== currentPlayer.id) return; // Non è il suo turno

    // Rimuovi la carta dalla mano del giocatore
    const hand = room.hands[socket.id];
    const cardIndex = hand.indexOf(card);
    if (cardIndex === -1) return;
    hand.splice(cardIndex, 1);

    room.playedCards.push({ playerId: socket.id, name: socket.data.name, card });
    io.to(roomId).emit('cardPlayed', { playerId: socket.id, card, name: socket.data.name });

    // Passa al giocatore successivo
    room.turnIndex = (room.turnIndex + 1) % room.players.length;
    const nextPlayer = room.players[room.turnIndex];
    io.to(roomId).emit('turnChanged', nextPlayer.id);

    // Se la mano di tutti è vuota, pesca nuove carte (se il mazzo non è vuoto)
    const everyoneOutOfCards = room.players.every(p => room.hands[p.id].length === 0);
    if (everyoneOutOfCards && room.deck.length > 0) {
      room.players.forEach(p => {
        const newCards = room.deck.splice(0, 3);
        room.hands[p.id].push(...newCards);
        io.to(p.id).emit('newCards', room.hands[p.id]);
      });
    }
  });

  socket.on('disconnect', () => {
    for (const [roomId, room] of Object.entries(rooms)) {
      room.players = room.players.filter(p => p.id !== socket.id);
      console.log("Deleting ", socket.id)
      delete room.hands[socket.id];
      if (room.players.length === 0)
      {
        delete rooms[roomId];
        console.log("room ",roomId," deleted") 
      }
      else io.to(roomId).emit('playerJoined', { players: rooms[roomId].players });
    }
  });
});

server.listen(3001, () => console.log('Server listening on port 3001'));
