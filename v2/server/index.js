const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
	cors: {
		origin: "*", // Allow all origins for simplicity
		methods: ["GET", "POST"]
	}
});

// --- Game Constants & Helpers ---

const SUITS = ['Bastoni', 'Spade', 'Coppe', 'Denari']; // 0, 1, 2, 3 (Denari is highest)
const VALUES = ['Asso', '2', '3', '4', '5', '6', '7', 'Fante', 'Cavallo', 'Re'];

const NEXT_HAND_TIMEOUT = 5000; // ms, timeout after each hand
const NEXT_ROUND_TIMEOUT = 10000; // ms, timeout after each round to count how many lives have been lost. Consider that players have already waited NEXT_HAND_TIMEOUT seconds

const getCardRank = (value) => VALUES.indexOf(value);
const getSuitRank = (suit) => SUITS.indexOf(suit);

const getPlayerBySocket = (room, socketId) => {
    return room.players.find(p => p.id === socketId);
};

const createDeck = () => {
	let deck = [];
	for (let s of SUITS) {
		for (let v of VALUES) {
			deck.push({ suit: s, value: v, id: uuidv4() });
		}
	}
	return deck;
};

const shuffleDeck = (deck) => {
	for (let i = deck.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[deck[i], deck[j]] = [deck[j], deck[i]];
	}
	return deck;
};

// --- Game State Management ---

const rooms = {};

// Helper to get safe game state for a specific player (hide cards)
const getPublicState = (room, playerId) => {
	if (!room) return null;
	
	const players = room.players.map(p => {
		// Logic for visibility
		let hand = [];
		const isBlindRound = (room.cardsPerHand === 1);
		
		if (isBlindRound) {
			// In blind round (1 card), I see everyone else's cards, but NOT mine
			if (p.id === playerId) {
				hand = p.hand.map(c => ({ ...c, suit: '?', value: '?' })); // Mask own
			} else {
				hand = p.hand; // Reveal others
			}
		} else {
			// Normal round: I see mine, mask others
			if (p.id === playerId) {
				hand = p.hand;
			} else {
				hand = p.hand.map(c => ({ ...c, suit: '?', value: '?' }));
			}
		}

		return {
			...p,
			hand: hand,
			lives: p.lives
		};
	});

	return {
		code: room.code,
		phase: room.phase, // 'LOBBY', 'BIDDING', 'PLAYING', 'ROUND_END', 'GAME_OVER'
		players: players,
		currentTurn: room.currentTurn, // Index of player
		currentRoundCards: room.currentRoundCards, // Cards on table
		cardsPerHand: room.cardsPerHand,
		bids: room.bids,
		hostId: room.hostId,
		lastWinnerIndex: room.lastWinnerIndex,
		notification: room.notification
	};
};

io.on('connection', (socket) => {
	console.log('New client connected:', socket.id);

	socket.on('createRoom', ({ username, initialLives }) => {
		const roomCode = uuidv4().slice(0, 6).toUpperCase();
		const pid = uuidv4(); // persistent ID

		rooms[roomCode] = {
			code: roomCode,
			hostId: socket.id,
			players: [{ id: socket.id, persistentId: pid, username, lives: parseInt(initialLives), hand: [], tricks: 0, isSpectator: false, online: true }],
			phase: 'LOBBY',
			initialLives: parseInt(initialLives),
			cardsPerHand: 5,
			deck: [],
			currentTurn: 0,
			startPlayerIndex: 0,
			bids: {}, // { playerId: number }
			currentRoundCards: [], // { playerId, card, mode }
			roundHistory: [],
			notification: 'Waiting for players...'
		};
		socket.join(roomCode);

		socket.emit('sessionSaved', { roomCode, persistentId: pid });

		socket.emit('roomCreated', roomCode);
		io.to(roomCode).emit('updateState', getPublicState(rooms[roomCode], null));
	});

	socket.on('joinRoom', ({ roomCode, username }) => {
		const room = rooms[roomCode];
		if (!room) return socket.emit('error', 'Room not found');
		if (room.players.find(p => p.username === username)) return socket.emit('error', 'Username taken');
		if (room.phase !== 'LOBBY') return socket.emit('error', 'Game already started');

		const pid = uuidv4();
		room.players.push({ id: socket.id, persistentId: pid, username, lives: room.initialLives, hand: [], tricks: 0, isSpectator: false, online: true });
		socket.join(roomCode);

		socket.emit('sessionSaved', { roomCode, persistentId: pid });
		
		// Broadcast update to everyone individually to mask cards correctly
		room.players.forEach(p => {
			io.to(p.id).emit('updateState', getPublicState(room, p.id));
		});
	});

	socket.on('rejoinGame', ({ roomCode, persistentId }) => {
	    const room = rooms[roomCode];
	    if (!room) {
	        // if room doesn't exist anymore
	        return socket.emit('resetSession'); 
	    }

	    const player = room.players.find(p => p.persistentId === persistentId);
	    if (!player) {
	        return socket.emit('resetSession');
	    }

	    // update socket
	    const oldSocketId = player.id;
	    player.id = socket.id;
	    player.online = true;
	    
	    if (room.hostId === oldSocketId)
	    {
			room.hostId = socket.id;
	    }

	    socket.join(roomCode);
	    console.log(`Player ${player.username} reconnected`);

	    // update clients
	    broadcastUpdate(room);
	});

	socket.on('startGame', ({ roomCode }) => {
		const room = rooms[roomCode];
		if (!room || room.hostId !== socket.id) return;
		if (room.players.length < 3) return socket.emit('error', 'Need at least 3 players');

		startRound(room);
	});

	socket.on('submitBid', ({ roomCode, bid }) => {
		const room = rooms[roomCode];
		if (!room || room.phase !== 'BIDDING') return;
		
		const player = getPlayerBySocket(room, socket.id);
    	if (!player) return;

		const playerIndex = room.players.findIndex(p => p.persistentId === player.persistentId);
    	if (playerIndex !== room.currentTurn) return;

		// Validation
		if (bid < 0 || bid > room.cardsPerHand) return;
		
		// Last player restriction
		const isLastBidder = Object.keys(room.bids).length === room.players.filter(p => !p.isSpectator).length - 1;

		if (isLastBidder) {
			const currentSum = Object.values(room.bids).reduce((a, b) => a + b, 0);
			if (currentSum + bid === room.cardsPerHand) {
				return socket.emit('error', 'Invalid bid (Dealer restriction)');
			}
		}

		room.bids[player.persistentId] = bid;
		advanceTurn(room);
	});

	socket.on('playCard', ({ roomCode, card, mode }) => { // mode is 'high' or 'low' for Ace Denari
		const room = rooms[roomCode];
		if (!room || room.phase !== 'PLAYING') return;

		const player = getPlayerBySocket(room, socket.id);
	    if (!player) return;

	    const playerIndex = room.players.findIndex(p => p.persistentId === player.persistentId);
	    if (playerIndex !== room.currentTurn) return;

		// Remove card from hand
		const cardIndex = player.hand.findIndex(c => c.id === card.id);
		if (cardIndex === -1) return;
		const realCard = player.hand[cardIndex];
		player.hand.splice(cardIndex, 1);

		// Server automatically assign right value to Ace of denars to let the player who played it win
		let actualMode = mode;
		if (room.cardsPerHand === 1 && realCard.suit === 'Denari' && realCard.value === 'Asso')
		{
            const playerBid = room.bids[player.persistentId];
            
            if (playerBid === 1) {
                actualMode = 'high';
            }
            else {
                actualMode = 'low';
            }
        }


		room.currentRoundCards.push({ playerId: player.persistentId, card: realCard, mode: actualMode });

		// Check if everyone played
		const activePlayers = room.players.filter(p => !p.isSpectator);
		if (room.currentRoundCards.length === activePlayers.length) {
			resolveTrick(room);
		} else {
			advanceTurn(room);
		}
	});

	socket.on('disconnect', () => {
		console.log('Client disconnected:', socket.id);

		Object.values(rooms).forEach(room => {
	        const player = room.players.find(p => p.id === socket.id);
	        if (player)
	        {
	            player.online = false;
	            broadcastUpdate(room);
	        }
    	});
	});
});

// --- Game Logic Functions ---

function startRound(room) {
	room.phase = 'BIDDING';
	room.deck = shuffleDeck(createDeck());
	room.bids = {};
	room.currentRoundCards = [];
	
	// Deal cards
	const activePlayers = room.players.filter(p => !p.isSpectator);
	if (activePlayers.length < 2) {
		room.phase = 'GAME_OVER';
		broadcastUpdate(room);
		return;
	}

	activePlayers.forEach(p => {
		p.hand = [];
		p.tricks = 0;
		for (let i = 0; i < room.cardsPerHand; i++) {
			if (room.deck.length > 0) p.hand.push(room.deck.pop());
		}
	});

	// Determine starting player for Bidding
	// Logic: In first game, random or host. Next rounds: rotates.
	// We keep room.startPlayerIndex as the "dealer" equivalent or first bidder
	room.currentTurn = room.startPlayerIndex;
	// Skip spectators if any
	while(room.players[room.currentTurn].isSpectator) {
		room.startPlayerIndex = (room.startPlayerIndex + 1) % room.players.length;
		room.currentTurn = room.startPlayerIndex;
	}

	room.notification = `Round: ${room.cardsPerHand} Cards. Place your bids!`;
	broadcastUpdate(room);
}

function advanceTurn(room) {
	// Find next non-spectator player
	let nextIndex = (room.currentTurn + 1) % room.players.length;
	while(room.players[nextIndex].isSpectator) {
		nextIndex = (nextIndex + 1) % room.players.length;
	}
	room.currentTurn = nextIndex;

	// Check if Bidding phase is over
	if (room.phase === 'BIDDING') {
		const activeCount = room.players.filter(p => !p.isSpectator).length;
		if (Object.keys(room.bids).length === activeCount) {
			room.phase = 'PLAYING';
			// Phase 2 starts with the same player who started bidding
			room.currentTurn = room.startPlayerIndex;
			while(room.players[room.currentTurn].isSpectator) {
				room.startPlayerIndex = (room.startPlayerIndex + 1) % room.players.length;
				room.currentTurn = room.startPlayerIndex;
			}
			room.notification = 'Bidding finished. Play your cards!';
		}
	}
	
	broadcastUpdate(room);
}

function resolveTrick(room) {
	// Calculate winner
	// Logic: Highest Suit (Denari > Coppe > Spade > Bastoni) wins over different suits
	// If same suit, value comparison
	// Exception: Ace of Denari (High/Low)
	
	let winnerPersistentId = null;
	let winningCardObj = null;

	room.currentRoundCards.forEach((play) => {
		if (!winningCardObj) {
			winningCardObj = play;
			winnerPersistentId = play.playerId;
			return;
		}

		const current = play;
		const best = winningCardObj;

		if (isBetterCard(current, best)) {
			winningCardObj = current;
			winnerPersistentId = current.playerId;
		}
	});

	// Update tricks
	const winner = room.players.find(p => p.persistentId === winnerPersistentId);
	winner.tricks += 1;
	
	// Notification
	room.notification = `${winner.username} takes the trick!`;
	broadcastUpdate(room);

	setTimeout(() => {
		if (!rooms[room.code]) return;
		// Check if round (5 cards etc) is over
		const activePlayers = room.players.filter(p => !p.isSpectator);
		const cardsLeft = activePlayers[0].hand.length;

		if (cardsLeft === 0) {
			calculateScores(room);
		} else {
			room.currentRoundCards = [];
			// Winner starts next trick
			room.currentTurn = room.players.findIndex(p => p.persistentId === winnerPersistentId);
			room.notification = `Now ${room.players[room.currentTurn].username} starts`;
			broadcastUpdate(room);
		}
	}, NEXT_HAND_TIMEOUT);
}

function isBetterCard(challenger, defender) {
	// challenger is the card just played, defender is the current best card on table
	const cCard = challenger.card;
	const dCard = defender.card;

	// Check Ace of Denari Special Rules
	const isC_AceDenari = cCard.suit === 'Denari' && cCard.value === 'Asso';
	const isD_AceDenari = dCard.suit === 'Denari' && dCard.value === 'Asso';

	if (isC_AceDenari) {
		if (challenger.mode === 'low') return false; // Low mode loses to everything
		return true; // High mode beats everything
	}
	if (isD_AceDenari) {
		if (defender.mode === 'low') return true; // Defender is low, so challenger wins
		return false; // Defender is high, challenger loses
	}

	// Normal Hierarchy
	const cSuitRank = getSuitRank(cCard.suit);
	const dSuitRank = getSuitRank(dCard.suit);

	if (cSuitRank > dSuitRank) return true;
	if (cSuitRank < dSuitRank) return false;

	// Same suit
	const cValRank = getCardRank(cCard.value);
	const dValRank = getCardRank(dCard.value);

	return cValRank > dValRank;
}

function calculateScores(room) {
	const roundSummary = [];

	room.players.forEach(p => {
		if (p.isSpectator) return;
		const bid = room.bids[p.persistentId];
		if (bid === undefined)
		{
			console.log("Error: "+p.username+" has undefined bids");
			bid = 0;
		}
		const tricks = p.tricks;
		const diff = Math.abs(bid - tricks);

		roundSummary.push({
            persistentId: p.persistentId,
            livesLost: diff
        });

		p.lives -= diff;
		
		if (p.lives <= 0) {
			p.isSpectator = true;
		}
	});

	// 1. send result to clients
	io.to(room.code).emit('roundSummary', roundSummary);
    room.notification = "Round ended. Checking lives...";
    broadcastUpdate(room);

    // 2. wait and then show animation
    setTimeout(() => {
        if (!rooms[room.code]) return;
		const survivors = room.players.filter(p => !p.isSpectator);
		
		if (survivors.length <= 2 && room.players.length >= 2) {
			// Game Over
			room.phase = 'GAME_OVER';
			broadcastUpdate(room);
			return;
		}

		// Prepare next round (decrease cards)
		room.cardsPerHand -= 1;
		
		if (room.cardsPerHand === 0) {
			room.phase = 'GAME_OVER';
		} else {
			// Rotate dealer
			room.startPlayerIndex = (room.startPlayerIndex + 1) % room.players.length;
			startRound(room);
		}
		broadcastUpdate(room);
	}, NEXT_ROUND_TIMEOUT);
}

function broadcastUpdate(room) {
	room.players.forEach(p => {
		io.to(p.id).emit('updateState', getPublicState(room, p.id));
	});
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on port ${PORT}`);
});