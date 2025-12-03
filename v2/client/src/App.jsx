import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import html2canvas from 'html2canvas';

// Change URL if hosting remotely
const socket = io('http://192.168.69.19:3001');

function App() {
  const [connected, setConnected] = useState(false);
  const [gameState, setGameState] = useState(null);
  const [username, setUsername] = useState('');
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [livesInput, setLivesInput] = useState(3);
  const [aceModeModal, setAceModeModal] = useState(null); // { card }
  const [selectedCardId, setSelectedCardId] = useState(null); // pre select cards

  const CARD_PATH = "/napoletane/";
  const RETRO_CARD = "retro.jpg";
  const RETRO_PATH = CARD_PATH + RETRO_CARD;
  const STORAGE_ITEM_NAME = "game_session";

  const getCardAsset = (suit, value) => {
	  if (!suit || !value) return RETRO_PATH;
	  return CARD_PATH+`${suit.toLowerCase()}_${value.toLowerCase()}.png`;
  };

  // Check URL params for room code
  useEffect(() => {
	const params = new URLSearchParams(window.location.search);
	const code = params.get('code');
	if (code) setRoomCodeInput(code);
	
	socket.on('connect', () => {
		setConnected(true);
		const savedSession = localStorage.getItem(STORAGE_ITEM_NAME);
        if (savedSession) {
            const { roomCode, persistentId } = JSON.parse(savedSession);
            socket.emit('rejoinGame', { roomCode, persistentId });
        }
	});

	socket.on('updateState', (state) => setGameState(state));
	socket.on('roomCreated', (code) => {
	  setRoomCodeInput(code);
	  // Auto join is handled by server state update usually, 
	  // but here the creator is already in state
	});

	socket.on('sessionSaved', ({ roomCode, persistentId }) => {
        localStorage.setItem(STORAGE_ITEM_NAME, JSON.stringify({ roomCode, persistentId }));
    });

    socket.on('resetSession', () => {
        localStorage.removeItem(STORAGE_ITEM_NAME);
        setGameState(null);
        alert('Session expired or room closed.');
    });

	socket.on('error', (msg) => alert(msg));

	return () => socket.off();
  }, []);

  // --- Actions ---

  const createRoom = () => {
	if (!username) return alert('Enter username');
	socket.emit('createRoom', { username, initialLives: livesInput });
  };

  const joinRoom = () => {
	if (!username || !roomCodeInput) return alert('Enter username and room code');
	socket.emit('joinRoom', { roomCode: roomCodeInput, username });
  };

  const startGame = () => {
	socket.emit('startGame', { roomCode: gameState.code });
  };

  const submitBid = (bid) => {
	socket.emit('submitBid', { roomCode: gameState.code, bid });
  };

  const handleCardClick = (card) => {
	if (gameState.phase !== 'PLAYING') return;
	
	const myIndex = gameState.players.findIndex(p => p.id === socket.id);
	if (gameState.currentTurn !== myIndex) return;

	// selection
	if (selectedCardId !== card.id) {
		setSelectedCardId(card.id);
		return; 
	}

	// playing cards
	if (card.suit === 'Denari' && card.value === 'Asso') {
		setAceModeModal(card);
		return;
	}

	socket.emit('playCard', { roomCode: gameState.code, card, mode: 'normal' });
	setSelectedCardId(null); // reset selection
  };

	const confirmAce = (mode) => {
		socket.emit('playCard', { roomCode: gameState.code, card: aceModeModal, mode });
		setAceModeModal(null);
		setSelectedCardId(null);
	};

	const cancelAce = () => {
	    setAceModeModal(null);
	    setSelectedCardId(null);
	};

  const downloadScoreboard = async () => {
	const element = document.getElementById('scoreboard');
	const canvas = await html2canvas(element);
	const data = canvas.toDataURL('image/png');
	const link = document.createElement('a');
	link.href = data;
	link.download = 'scoreboard.png';
	link.click();
  };

  // --- Views ---

  if (!gameState) {
	return (
	  <div className="min-h-screen bg-green-800 flex items-center justify-center p-4 font-mono text-white">
		<div className="bg-green-900 p-8 rounded-lg shadow-xl max-w-md w-full border border-green-700">
		  <h1 className="text-4xl mb-6 text-center font-bold text-yellow-400">Bisca</h1>
		  
		  <div className="space-y-4">
			<input 
			  className="w-full p-2 text-black rounded bg-green-100 border border-green-500"
			  placeholder="Username" 
			  value={username} 
			  onChange={e => setUsername(e.target.value)} 
			/>
			
			<div className="border-t border-green-700 my-4 pt-4">
			  <p className="mb-2 text-green-300">Create Room</p>
			  <div className="flex gap-2">
				<input 
				  type="number" 
				  className="w-20 p-2 text-black rounded"
				  value={livesInput}
				  onChange={e => setLivesInput(e.target.value)}
				  placeholder="Lives"
				/>
				<button 
				  onClick={createRoom}
				  className="flex-1 bg-yellow-600 hover:bg-yellow-500 py-2 rounded font-bold text-green-900"
				>
				  Create
				</button>
			  </div>
			</div>

			<div className="text-center text-green-400">- OR -</div>

			<div className="border-t border-green-700 pt-4">
			  <p className="mb-2 text-green-300">Join Room</p>
			  <div className="flex gap-2">
				<input 
				  className="w-full p-2 text-black rounded uppercase"
				  placeholder="Room Code" 
				  value={roomCodeInput} 
				  onChange={e => setRoomCodeInput(e.target.value)} 
				/>
				<button 
				  onClick={joinRoom}
				  className="bg-blue-600 hover:bg-blue-500 px-4 rounded font-bold"
				>
				  Join
				</button>
			  </div>
			</div>
		  </div>
		</div>
	  </div>
	);
  }

  // --- In Game Components ---

  const me = gameState.players.find(p => p.id === socket.id);
  const isMyTurn = gameState.players[gameState.currentTurn].id === socket.id;

  return (
	<div className="min-h-screen bg-green-800 text-white font-mono flex flex-col">
	  {/* Header */}
	  <div className="bg-green-900 p-2 flex justify-between items-center shadow-md">
		<div className="text-sm">
		  Room: <span className="text-yellow-400 font-bold">{gameState.code}</span>
		</div>
		<div className="text-sm">
		  {gameState.phase} - {gameState.cardsPerHand} Cards Round
		</div>
		<button 
		    onClick={() => {
		        localStorage.removeItem(STORAGE_ITEM_NAME);
		        window.location.reload();
		    }}
		    className="ml-4 text-xs bg-red-600 px-2 py-1 rounded hover:bg-red-500"
		>
		    Exit session
		</button>
	  </div>

	  {/* Main Table Area */}
	  <div className="flex-1 flex flex-col items-center justify-center p-4 relative overflow-hidden">
		
		{/* Notifications */}
		<div className="absolute top-4 bg-black/50 px-4 py-2 rounded-full backdrop-blur-sm z-10 animate-pulse">
		  {gameState.notification}
		</div>

		{/* Other Players (Top/Sides - Simplified as a row for mobile) */}
		<div className="flex flex-wrap justify-center gap-4 mb-8 w-full">
		  {gameState.players.filter(p => p.id !== socket.id).map(p => (
			<div key={p.id} className={`flex flex-col items-center p-2 rounded ${gameState.players[gameState.currentTurn].id === p.id ? 'bg-yellow-500/20 ring-2 ring-yellow-400' : 'bg-green-900/50'}`}>
			  <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center mb-1">
				{p.username[0].toUpperCase()}
			  </div>
			  <span className="text-xs">{p.username}</span>
			  <div className="flex text-xs gap-1 mt-1">
				<span>❤️ {p.lives}</span>
				<span>🎯 {gameState.bids[p.persistentId] !== undefined ? gameState.bids[p.persistentId] : '-'}</span>
				<span>✊ {p.tricks}</span>
			  </div>
			  <div className="mt-2 flex -space-x-8"> {/* -space-x-8 to overlap cards */}
			    {p.hand.map((c, i) => {
			        // Blind Round (only 1 card per player)
			        const isBlindRound = gameState.cardsPerHand === 1;
			        const assetSrc = isBlindRound 
			            ? getCardAsset(c.suit, c.value) 
			            : RETRO_PATH;

			        return (
			            <img 
			                key={i} 
			                src={assetSrc}
			                alt="card"
			                className="w-16 h-auto shadow-md rounded-md"
			            />
			        );
			    })}
			  </div>
			</div>
		  ))}
		</div>

		{/* Center: Played Cards */}
		<div className="h-48 w-full flex items-center justify-center mb-8">
		  <div className="relative w-64 h-48 bg-green-700/30 rounded-full border-4 border-green-900/50 flex items-center justify-center">
			{gameState.currentRoundCards.map((play, idx) => (
			  <img 
				    src={getCardAsset(play.card.suit, play.card.value)}
				    alt={`${play.card.value} ${play.card.suit}`}
				    className="absolute w-24 h-auto shadow-xl rounded-lg transform transition-all"
				    style={{ 
				        transform: `rotate(${idx * 20 - (gameState.currentRoundCards.length * 10)}deg) translateY(${idx%2===0 ? -5 : 5}px)`,
				        zIndex: idx
				    }}
			   />
			))}
		  </div>
		</div>

		{/* Player Controls (Lobby) */}
		{gameState.phase === 'LOBBY' && me.id === gameState.hostId && (
		  <button 
			onClick={startGame}
			disabled={gameState.players.length < 3}
			className="bg-yellow-500 hover:bg-yellow-400 text-green-900 px-8 py-3 rounded-lg font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed mb-8"
		  >
			Start Game ({gameState.players.length}/3+)
		  </button>
		)}

		{/* Player Controls (Bidding) */}
		{gameState.phase === 'BIDDING' && isMyTurn && !me.isSpectator && (
		  <div className="flex flex-col items-center mb-8 bg-green-900 p-4 rounded-lg shadow-lg z-20">
			<h3 className="mb-2 font-bold text-yellow-400">Choose your bid</h3>
			<div className="flex gap-2 flex-wrap justify-center">
			  {[...Array(gameState.cardsPerHand + 1)].map((_, i) => {
				// Check Restriction
				let disabled = false;
				const activePlayerCount = gameState.players.filter(p => !p.isSpectator).length;
				const bidsMade = Object.keys(gameState.bids).length;
				if (bidsMade === activePlayerCount - 1) {
				  const currentSum = Object.values(gameState.bids).reduce((a, b) => a + b, 0);
				  if (currentSum + i === gameState.cardsPerHand) disabled = true;
				}
				
				return (
				  <button
					key={i}
					onClick={() => submitBid(i)}
					disabled={disabled}
					className={`w-10 h-10 rounded font-bold ${disabled ? 'bg-gray-600 text-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}
				  >
					{i}
				  </button>
				);
			  })}
			</div>
		  </div>
		)}

		{/* Player Hand */}
		<div className="mt-auto w-full">
		  <div className="flex justify-between px-4 mb-2 text-sm text-green-200">
			<span>Lives: {me.lives}</span>
			<span>Bid: {gameState.bids[me.persistentId] ?? '-'} | Taken: {me.tricks}</span>
		  </div>
		  
		  <div className="flex justify-center -space-x-4 pb-4 overflow-x-auto min-h-[140px]">
			{me.hand.map((card, idx) => {
			    const isPlayable = gameState.phase === 'PLAYING' && isMyTurn;
			    const isBlind = gameState.cardsPerHand === 1; // Blind round
			    const isSelected = selectedCardId === card.id;

			    return (
			        <img 
			            key={card.id || idx}
			            src={isBlind ? RETRO_PATH : getCardAsset(card.suit, card.value)}
			            onClick={() => !isBlind && isPlayable ? handleCardClick(card) : null}
			            className={`
			                w-24 h-auto rounded-lg shadow-xl cursor-pointer transition-transform duration-200 border-2
			                ${isSelected ? '-translate-y-8 border-yellow-400 z-10' : 'translate-y-0 border-transparent'}
			                ${!isPlayable ? 'opacity-90' : 'hover:-translate-y-2'}
			            `}
			            style={{ marginLeft: idx === 0 ? 0 : '-40px' }} // overlapping
			        />
			    );
			})}
		  </div>
		</div>
	  </div>

	  {/* Ace of Denari Modal */}
	  {aceModeModal && (
	    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
	        <div className="bg-white p-6 rounded-lg text-center text-black relative w-80"> {/* added relative and width */}
	            
	            {/* X to close popup */}
	            <button 
	                onClick={cancelAce}
	                className="absolute top-2 right-2 text-gray-500 hover:text-red-600 font-bold text-xl"
	            >
	                &times;
	            </button>

	            <h3 className="text-xl font-bold mb-4">Play Ace of Denari as:</h3>
	            <div className="flex gap-4 justify-center">
	                <button onClick={() => confirmAce('high')} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 shadow">
	                    Highest card
	                </button>
	                <button onClick={() => confirmAce('low')} className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 shadow">
	                    Lowest card
	                </button>
	            </div>
	        </div>
	    </div>
	  )}

	  {/* Game Over Scoreboard */}
	  {gameState.phase === 'GAME_OVER' && (
		<div className="fixed inset-0 bg-black/90 flex flex-col items-center justify-center z-50 overflow-auto p-4">
		  <div id="scoreboard" className="bg-green-900 border-4 border-yellow-500 p-8 rounded-xl max-w-lg w-full text-center">
			<h2 className="text-3xl font-bold text-yellow-400 mb-6">Game Over</h2>
			<div className="space-y-4">
			  {gameState.players
				.sort((a, b) => b.lives - a.lives)
				.map((p, i) => (
				  <div key={p.id} className="flex justify-between items-center bg-green-800 p-3 rounded">
					<div className="flex items-center gap-3">
					  <span className="font-bold text-2xl text-yellow-500">#{i+1}</span>
					  <span className="text-xl">{p.username}</span>
					</div>
					<div className="text-xl font-bold">
					  {p.lives <= 0 ? 'Eliminated' : `${p.lives} Lives`}
					</div>
				  </div>
				))
			  }
			</div>
			<div className="mt-6 text-green-400 text-sm">Bisca Game - {gameState.code}</div>
		  </div>
		  <div className="mt-8 flex gap-4">
			<button onClick={downloadScoreboard} className="bg-blue-600 px-6 py-3 rounded font-bold hover:bg-blue-500">
			  Save Scoreboard Image
			</button>
			<button onClick={() => window.location.reload()} className="bg-gray-600 px-6 py-3 rounded font-bold hover:bg-gray-500">
			  Back to Menu
			</button>
		  </div>
		</div>
	  )}
	</div>
  );
}

export default App;