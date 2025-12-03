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
	  deck.push(`${value} ${suit}`);
	}
  }
  return deck.slice(0, 40); // Mazzo da 40 carte
}

function shuffle(array)
{
	for (let i = array.length - 1; i > 0; i--)
	{
		const j = Math.floor(Math.random() * (i + 1));
		[array[i], array[j]] = [array[j], array[i]];
	}
}

function evaluateHandWinner(playedCards)
{
	const suitOrder = ['Bastoni', 'Spade', 'Coppe', 'Denari'];
	const valueOrder = ['A', '2', '3', '4', '5', '6', '7', 'Fante', 'Cavallo', 'Re'];

	const extractCardInfo = (cardStr) => {
		const match = cardStr.match(/^([A2-7]|Fante|Cavallo|Re)\s(Bastoni|Spade|Coppe|Denari)$/);
		if (!match) {
			throw new Error(`Invalid card string: ${cardStr}`);
		}

		return {
			value: match[1],
			suit: match[2],
			valueIndex: valueOrder.indexOf(match[1]),
			suitIndex: suitOrder.indexOf(match[2])
		};
	};

	let bestCard = null;
	let winner = null;

	playedCards.forEach(play => {
		const cardInfo = extractCardInfo(play.card);
		if (
			!bestCard ||
			cardInfo.suitIndex > bestCard.suitIndex ||
			(cardInfo.suitIndex === bestCard.suitIndex && cardInfo.valueIndex > bestCard.valueIndex)
		) {
			bestCard = cardInfo;
			winner = play.playerId;
		}
	});

	return winner;
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
	  currentTurnSocket: socket.id,
	  playedCards: [],
	  deck: deck,
	  hands: {
		[socket.id]: hand
	  },
	  points: {}
	};

	socket.join(roomId);

	// Invia info sulla stanza
	io.to(socket.id).emit('roomJoined', {
	  room: roomId,
	  players: rooms[roomId].players,
	  hand: hand,
	  currentTurnSocket: socket.id,
	  playedCards: [],
	  points: {}
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
		currentTurnSocket: rooms[roomId].currentTurnSocket,
		playedCards: rooms[roomId].playedCards,
		points: rooms[roomId].points
	  });
	  io.to(roomId).emit('playerJoined', {players: rooms[roomId].players, points: rooms[roomId].points});
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
	} else
	{
		room.hands[socket.id] = room.hands[existing.id];
		delete room.hands[existing.id];
		
		if (room.points[existing.id])
		{
			room.points[socket.id] = room.points[existing.id];
			delete room.points[existing.id];
		}
		
		if(room.currentTurnSocket === existing.id)
			room.currentTurnSocket = socket.id;

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
		hand: room.hands[socket.id],
		currentTurnSocket: rooms[roomId].currentTurnSocket,
		playedCards: room.playedCards,
		points: room.points
	});

	// Update all players
	io.to(roomId).emit('playerJoined', { players: room.players, points: room.points });
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
		const currentPlayerId = room.currentTurnSocket;

		if (socket.id !== currentPlayerId) return; // Not his turn

		// Remove card from player
		const hand = room.hands[socket.id];
		const cardIndex = hand.indexOf(card);
		if (cardIndex === -1) return;
		hand.splice(cardIndex, 1);

		room.playedCards.push({ playerId: socket.id, name: socket.data.name, card });
		io.to(roomId).emit('cardPlayed', { playerId: socket.id, name: socket.data.name, card});
		// every player played one card
		if (room.playedCards.length === room.players.length)
		{
			const winner = evaluateHandWinner(room.playedCards);
			room.points[winner] = (room.points[winner] || 0) + 1;

			io.to(roomId).emit('handWon', {
				winner,
				points: room.points
			});

			room.playedCards = [];

			room.currentTurnSocket = winner;
			io.to(roomId).emit('turnChanged', { currentTurnSocket: winner });
			player = room.players.find(p => p.id === winner);
			if(player)
				console.log("Turn of winner ", player.name);
			else
				console.log("Winner not found: socket changed")
		}
		else
		{
			// Change current player
			const currentIndex = room.players.findIndex(p => p.id === room.currentTurnSocket);
			const nextIndex = (currentIndex + 1) % room.players.length;
			const nextPlayer = room.players[nextIndex];
			room.currentTurnSocket = nextPlayer.id;

			io.to(roomId).emit('turnChanged', { currentTurnSocket: nextPlayer.id });
			console.log("Turn of ", nextPlayer.name);
		}
		// If everyone has no cards, draw again from the deck
		const everyoneOutOfCards = room.players.every(p => room.hands[p.id].length === 0);
		if (everyoneOutOfCards && room.deck.length > 0)
		{
			room.playedCards = [];
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
					io.to(roomId).emit('playerJoined', { players: rooms[roomId].players, points: rooms[roomId].points });
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
