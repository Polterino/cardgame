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
const MIN_NUMBER_OF_PLAYERS = 2;
const NEXT_HAND_TIMEOUT = 5000; // ms, timeout after each hand
const NEXT_ROUND_TIMEOUT = 10000; // ms, timeout after each round to count how many lives have been lost. Consider that players have already waited NEXT_HAND_TIMEOUT seconds
const PLAYER_LEFT_TIMER = 4000; // timeout to restart round after a player leaves

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

function broadcastRoomList(targetSocket = null)
{
    const roomList = Object.values(rooms).filter(r => r.phase !== 'GAME_OVER').map(r => ({
        code: r.code,
        phase: r.phase,
        playerCount: r.players.filter(p => !p.isSpectator).length,
        spectatorCount: r.players.filter(p => p.isSpectator).length,
        initialLives: r.initialLives
    }));

    if (targetSocket) {
        targetSocket.emit('roomListUpdate', roomList);
    } else {
        io.emit('roomListUpdate', roomList);
    }
}

// --- FACTORY FUNCTIONS ---
const createPlayer = (socketId, username, lives, persistentId = null) => {
	return {
		id: socketId,
		persistentId: persistentId || uuidv4(),
		username: username,
		lives: parseInt(lives),
		isSpectator: false,
		online: true,
		
		// Game state
		hand: [],
		tricks: 0,
		participated: true,
		
		// Stats
		assoDenariCount: 0,
		totalTricks: 0,
		maxLivesLost: 0,
	};
};

const resetPlayerStats = (player, initialLives) => {
	return createPlayer(player.id, player.username, initialLives, player.persistentId);
};

const formatPlayerForClient = (player, viewerId, roomConfig) => {
	const safePlayer = { ...player }; 

    const isBlindRound = (roomConfig.cardsPerHand === 1);
    const isMe = (player.id === viewerId);

    if (isBlindRound)
    {
        if (isMe) {
            safePlayer.hand = player.hand.map(c => ({ ...c, suit: '?', value: '?' }));
        } else {
            safePlayer.hand = player.hand;
        }
    } else {
        if (isMe) {
            safePlayer.hand = player.hand;
        } else {
            safePlayer.hand = player.hand.map(c => ({ ...c, suit: '?', value: '?' }));
        }
    }

    return safePlayer;
};

// --- Game State Management ---

const rooms = {};

// Helper to get safe game state for a specific player (hide cards)
const getPublicState = (room, playerId) => {
	if (!room) return null;
	const players = room.players.map(p => formatPlayerForClient(p, playerId, room));
	return {
		code: room.code,
		phase: room.phase, // 'LOBBY', 'BIDDING', 'PLAYING', 'ROUND_END', 'HOST_DECISION', 'GAME_OVER'
		players: players,
		hostId: room.hostId,
		isPaused: room.isPaused,
		currentTurn: room.currentTurn, // Index of player
		currentRoundCards: room.currentRoundCards, // Cards on table
		lastTrick: room.lastTrick,
		cardsPerHand: room.cardsPerHand,
		bids: room.bids,
		lastWinnerIndex: room.lastWinnerIndex,
		notification: room.notification
	}; // I send only what I want the clients to receive, for instance I don't send deck (array)
};

io.on('connection', (socket) => {
	console.log('New client connected:', socket.id);

	socket.on('createRoom', ({ username, initialLives }) => {
		const livesString = String(initialLives);
		const isOnlyDigits = /^\d+$/.test(livesString);

		if (!isOnlyDigits)
		{
			socket.emit('error', 'Please enter a valid number (no letters)');
			return;
		}
		if(parseInt(livesString) < 1)
		{
			socket.emit('error', 'Number of lives must be positive');
			return;
		}

		const roomCode = uuidv4().slice(0, 6).toUpperCase();
		const newPlayer = createPlayer(socket.id, username, initialLives);

		rooms[roomCode] = {
			code: roomCode,
			hostId: socket.id,
			players: [newPlayer],
			phase: 'LOBBY',
			isPaused: false,
			initialLives: parseInt(initialLives),
			cardsPerHand: 5,
			direction: -1, // -1 = descending, +1 = ascending
			deck: [],
			currentTurn: 0,
			startPlayerIndex: 0,
			bids: {}, // { playerId: number }
			currentRoundCards: [], // { playerId, card, mode }
			lastTrick: null,
			roundHistory: [],
			notification: 'Waiting for players...'
		};
		socket.join(roomCode);

		socket.emit('sessionSaved', { roomCode, persistentId: newPlayer.persistentId });

		socket.emit('roomCreated', roomCode);
		io.to(roomCode).emit('updateState', getPublicState(rooms[roomCode], null));
		broadcastRoomList();
	});

	socket.on('joinRoom', ({ roomCode, username }) => {
		const room = rooms[roomCode];
		if (!room) return socket.emit('error', 'Room not found');
		if (room.players.find(p => p.username === username)) return socket.emit('error', 'Username taken');
		
		let isSpectator = false;
        let lives = room.initialLives;
		if (room.phase !== 'LOBBY')
		{
            isSpectator = true;
            lives = 0;
        }

		const newPlayer = createPlayer(socket.id, username, lives);
		newPlayer.isSpectator = isSpectator;
		newPlayer.participated = !isSpectator;
		room.players.push(newPlayer);
		socket.join(roomCode);

		socket.emit('sessionSaved', { roomCode, persistentId: newPlayer.persistentId });
		
		// Broadcast update to everyone individually to mask cards correctly
		broadcastUpdate(room);
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

	// Called after a match, players can restart the same lobby
	socket.on('returnToLobby', ({ roomCode, username }) => {
		const room = rooms[roomCode];
		if (!room) return;
		if (!username) return socket.emit('error', 'Username not set');

		const freshPlayer = createPlayer(socket.id, username, room.initialLives);

		if (room.phase === 'GAME_OVER')
		{
			console.log(`Room ${roomCode} hard reset by ${username}`);
			
			room.phase = 'LOBBY';
			room.hostId = socket.id; // Become Host
			room.cardsPerHand = 5;
			room.direction = -1;
			room.deck = [];
			room.bids = {};
			room.currentRoundCards = [];
			room.currentTurn = 0;
			room.startPlayerIndex = 0;
			
			// Reset all players
			room.players = [freshPlayer];
			socket.emit('sessionSaved', { roomCode, persistentId: freshPlayer.persistentId });
			broadcastRoomList();
		} 
		// room already reset
		else if (room.phase === 'LOBBY')
		{
			const alreadyIn = room.players.find(p => p.username === username);
			
			if (!alreadyIn)
			{
				room.players.push(freshPlayer);
				socket.emit('sessionSaved', { roomCode, persistentId: freshPlayer.persistentId });
			}
			else socket.emit('error', 'There\'s already a player with your username in the room');
		}

		broadcastUpdate(room);
	});

	socket.on('getRooms', () => {
        broadcastRoomList(socket);
    });

	socket.on('startGame', ({ roomCode }) => {
		const room = rooms[roomCode];
		if (!room || room.hostId !== socket.id) return;
		if (room.players.length < MIN_NUMBER_OF_PLAYERS) return socket.emit('error', 'Need at least', MIN_NUMBER_OF_PLAYERS, ' players');

		startRound(room);
	});

	socket.on('exitGame', ({ roomCode, persistentId }) => {
        const room = rooms[roomCode];
        if (!room) return;

        const playerIndex = room.players.findIndex(p => p.persistentId === persistentId);
        if (playerIndex === -1) return;

        const player = room.players[playerIndex];
        
        if (player.isSpectator || room.phase === 'LOBBY' || room.phase === 'GAME_OVER')
        {
            room.players.splice(playerIndex, 1);
        } 
        else
        {
            room.players.splice(playerIndex, 1);            
            room.notification = `${player.username} left the game. Restarting round`;
            room.isPaused = true;
            setTimeout(() => {startRound(room);}, PLAYER_LEFT_TIMER);
        }

        if (room.players.length === 0)
        {
        	delete rooms[roomCode];
        	broadcastRoomList();
        }
        else
        {
        	room.hostId = room.players[0].id;
        	broadcastUpdate(room);
        }
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
		if (room.isPaused) return;

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
		if (room.currentRoundCards.length === activePlayers.length)
		{
			resolveTrick(room);
		} else {
			advanceTurn(room);
		}
	});

	socket.on('processHostDecision', ({ roomCode, choice }) => {
		const room = rooms[roomCode];
		if (!room || room.hostId !== socket.id) return;

		if (choice === 'END_GAME')
		{
			room.phase = 'GAME_OVER';
		} 
		else if (choice === 'CONTINUE_DESC')
		{
			room.direction = -1;
			room.cardsPerHand = 5;
			room.startPlayerIndex = (room.startPlayerIndex + 1) % room.players.length;
			startRound(room);
		} 
		else if (choice === 'CONTINUE_ASC')
		{
			room.direction = 1;
			room.cardsPerHand = 1;
			room.startPlayerIndex = (room.startPlayerIndex + 1) % room.players.length;
			startRound(room);
		}

		broadcastUpdate(room);
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

function startRound(room)
{
	if(!room) return;
	room.isPaused = false;
	room.phase = 'BIDDING';
	room.deck = shuffleDeck(createDeck());
	room.bids = {};
	room.currentRoundCards = [];
	//room.lastTrick = null;
	
	// Deal cards
	const activePlayers = room.players.filter(p => !p.isSpectator);
	if (activePlayers.length < MIN_NUMBER_OF_PLAYERS)
	{
		room.phase = 'GAME_OVER';
		broadcastUpdate(room);
		return;
	}

	let assoEveryTurn = false;
	let isAsso = false;
	activePlayers.forEach(p => {
		p.hand = [];
		p.tricks = 0;
		for (let i = 0; i < room.cardsPerHand; i++)
		{
			if (room.deck.length > 0)
			{
				const singleCard = room.deck.pop();
			
				if (singleCard.suit === 'Denari' && singleCard.value === 'Asso')
				{
					p.assoDenariCount += 1;
					isAsso = true;
				}
				p.hand.push(singleCard);
			}
		}
	});
	if(!isAsso && assoEveryTurn)
	{
		const randomIndex = Math.floor(Math.random() * activePlayers.length);
		activePlayers[randomIndex].hand.pop();
		activePlayers[randomIndex].hand.push({ suit: 'Denari', value: 'Asso', id: uuidv4() });
		activePlayers[randomIndex].assoDenariCount += 1;
	}

	// Determine starting player for Bidding
	// Logic: In first game, random or host. Next rounds: rotates.
	// We keep room.startPlayerIndex as the "dealer" equivalent or first bidder
	room.currentTurn = room.startPlayerIndex;
	// Skip spectators if any
	while(room.players[room.currentTurn].isSpectator)
	{
		room.startPlayerIndex = (room.startPlayerIndex + 1) % room.players.length;
		room.currentTurn = room.startPlayerIndex;
	}

	room.notification = `Round: ${room.cardsPerHand} Cards. Place your bids!`;
	broadcastUpdate(room);
}

function advanceTurn(room)
{
	// Find next non-spectator player
	let nextIndex = (room.currentTurn + 1) % room.players.length;
	while(room.players[nextIndex].isSpectator) {
		nextIndex = (nextIndex + 1) % room.players.length;
	}
	room.currentTurn = nextIndex;

	// Check if Bidding phase is over
	if (room.phase === 'BIDDING')
	{
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

function resolveTrick(room)
{
	// Calculate winner
	// Logic: Highest Suit (Denari > Coppe > Spade > Bastoni) wins over different suits
	// If same suit, value comparison
	// Exception: Ace of Denari (High/Low)
	room.isPaused = true;
	broadcastUpdate(room);
	
	let winnerPersistentId = null;
	let winningCardObj = null;

	room.currentRoundCards.forEach((play) => {
		if (!winningCardObj)
		{
			winningCardObj = play;
			winnerPersistentId = play.playerId;
			return;
		}

		const current = play;
		const best = winningCardObj;

		if (isBetterCard(current, best))
		{
			winningCardObj = current;
			winnerPersistentId = current.playerId;
		}
	});

	// Update tricks
	const winner = room.players.find(p => p.persistentId === winnerPersistentId);
	winner.tricks += 1;
	winner.totalTricks += 1;
	
	// Notification
	room.notification = `${winner.username} takes the trick!`;
	room.lastTrick = {
		cards: [...room.currentRoundCards],
		winnerId: winnerPersistentId
	};
	broadcastUpdate(room);

	setTimeout(() => {
		if (!rooms[room.code]) return;
		// Check if round (5 cards etc) is over
		const activePlayers = room.players.filter(p => !p.isSpectator);
		const cardsLeft = activePlayers[0].hand.length;

		if (cardsLeft === 0)
		{
			calculateScores(room);
		} else {
			room.currentRoundCards = [];
			// Winner starts next trick
			room.currentTurn = room.players.findIndex(p => p.persistentId === winnerPersistentId);
			room.notification = `Now ${room.players[room.currentTurn].username} starts`;

			room.isPaused = false;
			broadcastUpdate(room);
		}
	}, NEXT_HAND_TIMEOUT);
}


function calculateScores(room)
{
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
		if (diff > p.maxLivesLost)
		{
			p.maxLivesLost = diff;
		}
		
		if (p.lives <= 0)
		{
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
		
		if (survivors.length < MIN_NUMBER_OF_PLAYERS) {
			// Game Over
			room.phase = 'GAME_OVER';
			broadcastUpdate(room);
			return;
		}

		// Prepare next round
		const nextRoundCards = room.cardsPerHand + room.direction;
		const isSetFinished = (room.direction === -1 && nextRoundCards === 0) || 
						  (room.direction === 1 && nextRoundCards === 6);

		if (isSetFinished)
		{
			room.phase = 'HOST_DECISION';
			room.notification = "End of set. Waiting for Host decision...";
		} else
		{
			room.cardsPerHand = nextRoundCards;
			// Rotate dealer
			room.startPlayerIndex = (room.startPlayerIndex + 1) % room.players.length;
			startRound(room);
		}
		broadcastUpdate(room);
	}, NEXT_ROUND_TIMEOUT);
}

function isBetterCard(challenger, defender)
{
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


function broadcastUpdate(room) {
	room.players.forEach(p => {
		io.to(p.id).emit('updateState', getPublicState(room, p.id));
	});
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
	console.log(`Server listening on port ${PORT}`);
});