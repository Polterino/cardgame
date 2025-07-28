// === SERVER (server/index.js) ===
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*'
  }
});

const rooms = {}; // { roomId: { players: [socket.id], currentTurn: 0, playedCards: [] } }

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on('createRoom', () => {
    const roomId = generateRoomId();
    rooms[roomId] = { players: [socket.id], currentTurn: 0, playedCards: [] };
    socket.join(roomId);
    socket.emit('roomCreated', roomId);
  });

  socket.on('joinRoom', (roomId) => {
    if (rooms[roomId]) {
      rooms[roomId].players.push(socket.id);
      socket.join(roomId);
      io.to(roomId).emit('playerJoined', rooms[roomId].players);
    } else {
      socket.emit('error', 'Room does not exist');
    }
  });

  socket.on('startGame', (roomId) => {
    io.to(roomId).emit('gameStarted', {
      players: rooms[roomId].players,
      currentTurn: rooms[roomId].currentTurn
    });
  });

  socket.on('playCard', ({ roomId, card }) => {
    const room = rooms[roomId];
    room.playedCards.push({ player: socket.id, card });
    const nextTurn = (room.currentTurn + 1) % room.players.length;
    room.currentTurn = nextTurn;
    io.to(roomId).emit('cardPlayed', { player: socket.id, card });

    if (room.playedCards.length % room.players.length === 0) {
      io.to(roomId).emit('turnEnded', room.playedCards);
      room.playedCards = [];
    } else {
      io.to(roomId).emit('nextTurn', room.players[room.currentTurn]);
    }
  });
});

function generateRoomId() {
  return Math.random().toString(36).substring(2, 7);
}

server.listen(3001, () => console.log('Server listening on port 3001'));
