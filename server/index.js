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


const TIMEOUT_TIME = 60 // in seconds

const rooms = {}; // roomId -> { players: [{id, name}], turnIndex, playedCards, deck, hands }
const disconnectTimeouts = {};  // chiave: name o socket.id


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
	const room = rooms[roomId];
	if (!room) return;

	const existing = room.players.find(p => p.name === name);

	if (!existing)
	{
		room.players.push({ id: socket.id, name });
		console.log("Rejoin: added player", name);
	} else {
		existing.id = socket.id;
		console.log("Rejoin: socket updated ", name);
	}
	if (disconnectTimeouts[name])
	{
		clearTimeout(disconnectTimeouts[name]);
		delete disconnectTimeouts[name];
		console.log("Timeout deleted for ", name);
	}

	socket.join(roomId);

	// Update player
	io.to(socket.id).emit('roomJoined', {
		room: roomId,
		players: room.players,
		hand: room.hands[name] || [],
		currentTurnIndex: room.currentTurnIndex
	});

	// Update all players
	io.to(roomId).emit('playerJoined', { players: room.players });
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

	if (socket.id !== currentPlayer.id) return; // Not his turn

	// Remove card from player
	const hand = room.hands[socket.id];
	const cardIndex = hand.indexOf(card);
	if (cardIndex === -1) return;
	hand.splice(cardIndex, 1);

	room.playedCards.push({ playerId: socket.id, name: socket.data.name, card });
	io.to(roomId).emit('cardPlayed', { playerId: socket.id, name: socket.data.name, card});

	// Change current player
	room.turnIndex = (room.turnIndex + 1) % room.players.length;
	const nextPlayer = room.players[room.turnIndex];
	io.to(roomId).emit('turnChanged', nextPlayer.id);

	// If everyone has no cards, draw again from the deck
	const everyoneOutOfCards = room.players.every(p => room.hands[p.id].length === 0);
	if (everyoneOutOfCards && room.deck.length > 0)
	{
	  room.players.forEach(p => {
		const newCards = room.deck.splice(0, 3);
		room.hands[p.id].push(...newCards);
		io.to(p.id).emit('newCards', room.hands[p.id]);
	  });
	}
  });

	socket.on('disconnect', () => {
		removePlayerDelay(socket, TIMEOUT_TIME*1000);
	});

	socket.on('leaveRoom', () => {
		removePlayerDelay(socket);
	});

	function removePlayerDelay(socket, delay = 0)
	{ 
		for (const [roomId, room] of Object.entries(rooms))
		{
			const player = room.players.find(p => p.id === socket.id);
			if (!player) continue;

			const playerName = player.name;

			const removePlayer = () => {
				room.players = room.players.filter(p => p.id !== socket.id);
				delete room.hands[playerName];
				console.log(playerName, " removed from room ", roomId);

				if (room.players.length === 0)
				{
					delete rooms[roomId];
					console.log("Room ", roomId, " deleted");
				} else
				{
					io.to(roomId).emit('playerJoined', { players: rooms[roomId].players });
				}

				delete disconnectTimeouts[playerName];
			};

			if (delay > 0)
			{
				const timeout = setTimeout(removePlayer, delay);
				disconnectTimeouts[playerName] = timeout;
				console.log(`${playerName} disconnected, deleting in ${TIMEOUT_TIME} seconds`);
			}
			else
			{
				removePlayer();
			}
		}
	}
});

server.listen(3001, () => console.log('Server listening on port 3001'));
