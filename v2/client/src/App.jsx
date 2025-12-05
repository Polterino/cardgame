import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import html2canvas from 'html2canvas';

const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';
const socket = io(socketUrl);

// --- ICONS COMPONENTS ---
const HeartIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
  </svg>
);

const TargetIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm11.378-3.917c-.89-.777-2.366-.777-3.255 0a.75.75 0 01-.988-1.129c1.454-1.272 3.765-1.272 5.219 0a.75.75 0 01-1.129 1.129zM12 10.5a1.5 1.5 0 100 3 1.5 1.5 0 000-3z" clipRule="evenodd" />
  </svg>
);

const CardsIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path style={{fill:"currentColor"}} d="M16.5 6a3 3 0 00-3-3H6a3 3 0 00-3 3v7.5a3 3 0 003 3v-6A4.5 4.5 0 0110.5 6h6z" />
    <path style={{fill:"currentColor"}} d="M18 9a3 3 0 013 3v7.5a3 3 0 01-3 3H10.5a3 3 0 01-3-3V12a3 3 0 013-3H18z" />
  </svg>
);

function App() {
  // States
  const [connected, setConnected] = useState(false);
  const [gameState, setGameState] = useState(null);
  const [username, setUsername] = useState('');
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [livesInput, setLivesInput] = useState(3);
  const [aceModeModal, setAceModeModal] = useState(null); // { card }
  const [selectedCardId, setSelectedCardId] = useState(null); // pre select cards
  const [roundSummary, setRoundSummary] = useState(null);
  const prevTurnRef = useRef(null); // Previous turn reference

  // Constants
  const CARD_PATH = "/napoletane/";
  const RETRO_CARD = "retro.jpg";
  const RETRO_PATH = CARD_PATH + RETRO_CARD;
  const STORAGE_ITEM_NAME = "game_session";
  const STORAGE_USERNAME_KEY = "game_username";
  const ROUND_SUMMARY_TIMEOUT = 9700 // ms, timeout to show how many lives each player has lost

  // Useful variables
  const me = gameState?.players?.find(p => p.id === socket.id);
  const myIndex = gameState ? gameState.players.findIndex(p => p.id === socket.id) : -1;
  const isMyTurn = gameState ? gameState.currentTurn === myIndex : false;
  const isActionPhase = gameState ? ['BIDDING', 'PLAYING'].includes(gameState.phase) : false;

  const getCardAsset = (suit, value) => {
	  if (!suit || !value) return RETRO_PATH;
	  return CARD_PATH+`${suit.toLowerCase()}_${value.toLowerCase()}.png`;
  };

  const playTurnSound = () => {
    const audioStr = "data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU";
    const audio = new Audio("https://actions.google.com/sounds/v1/cartoon/pop.ogg"); 
    audio.volume = 0.5;
    audio.play().catch(e => console.log("Audio play blocked:", e));
  };

  
  // Executed only one time
  useEffect(() => {
	const params = new URLSearchParams(window.location.search);
	const code = params.get('code');
	if (code) setRoomCodeInput(code);

	const savedUsername = localStorage.getItem(STORAGE_USERNAME_KEY);
    if (savedUsername) {
        setUsername(savedUsername);
    }
	
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

    socket.on('roundSummary', (summary) => {
	    setRoundSummary(summary);
	    setTimeout(() => setRoundSummary(null), ROUND_SUMMARY_TIMEOUT);
	});

	socket.on('error', (msg) => alert(msg));

	return () => socket.off();
  }, []);

  // Executed each time the turn changes
  // Handle sounds
  useEffect(() => {
    if (!gameState) return;

    if (isMyTurn && isActionPhase && prevTurnRef.current !== gameState.currentTurn) {
        playTurnSound();
    }
    
    // Update reference
    prevTurnRef.current = gameState.currentTurn;
  }, [gameState?.currentTurn, gameState?.phase]);

  // --- Actions ---

  const createRoom = () => {
	if (!username) return alert('Enter username');
	localStorage.setItem(STORAGE_USERNAME_KEY, username);
	socket.emit('createRoom', { username, initialLives: livesInput });
  };

  const joinRoom = () => {
	if (!username || !roomCodeInput) return alert('Enter username and room code');
	localStorage.setItem(STORAGE_USERNAME_KEY, username);
	socket.emit('joinRoom', { roomCode: roomCodeInput.toUpperCase(), username });
  };

  const startGame = () => {
	socket.emit('startGame', { roomCode: gameState.code });
  };

  const submitBid = (bid) => {
	socket.emit('submitBid', { roomCode: gameState.code, bid });
  };

  const handleCardClick = (card) => {
	if (gameState.phase !== 'PLAYING') return;
	
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
				  onChange={e => setRoomCodeInput(e.target.value.toUpperCase())} 
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

  return (
	<div className="min-h-screen bg-green-800 text-white font-mono flex flex-col">
	  {/* --- FEEDBACK highlight/sound --- */}
	    {gameState && isMyTurn && !me.isSpectator && isActionPhase && (
	        <>
	            {/* Highlighting screen */}
	            <div className="fixed inset-0 border-[6px] border-yellow-400/60 z-50 pointer-events-none animate-pulse shadow-[inset_0_0_50px_rgba(250,204,21,0.5)]"></div>
	            
	            {/* Banner your turn */}
	            <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
	                <div className="bg-yellow-500 text-green-900 px-6 py-2 rounded-full font-bold text-xl shadow-xl animate-bounce border-2 border-white">
	                    IT'S YOUR TURN!
	                </div>
	            </div>
	        </>
	    )}
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
	  <div className="flex-1 flex flex-col items-center justify-between p-4 relative w-full h-full">
		
		{/* Notifications */}
		<div className="absolute top-4 bg-black/50 px-4 py-2 rounded-full backdrop-blur-sm z-10 animate-pulse">
		  {gameState.notification}
		</div>

		{/* Other Players (Top/Sides - Simplified as a row for mobile) */}
		<div className="flex flex-wrap justify-center gap-4 mb-8 w-full md:justify-around md:items-start md:px-10">
		  {gameState.players.filter(p => p.id !== socket.id).map(p => (
			<div key={p.id} className={`flex flex-col items-center p-3 rounded-xl relative transition-all ${gameState.players[gameState.currentTurn].id === p.id ? 'bg-yellow-500/20 ring-2 ring-yellow-400 shadow-lg scale-105' : 'bg-green-900/40'}`}>
			    
			    {/* LIVES BADGE (Round Summary) */}
			    {roundSummary?.find(s => s.persistentId === p.persistentId) && (
			        <div className={`absolute -top-3 -right-3 z-50 px-3 py-1 text-sm rounded-full font-bold shadow-xl animate-bounce border-2 border-white ${roundSummary.find(s => s.persistentId === p.persistentId).livesLost === 0 ? 'bg-green-500' : 'bg-red-600'}`}>
			            {roundSummary.find(s => s.persistentId === p.persistentId).livesLost === 0 ? 'SAFE' : `-${roundSummary.find(s => s.persistentId === p.persistentId).livesLost}`}
			        </div>
			    )}

			    {/* Avatar & Name */}
			    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 border-2 border-green-600/50 flex items-center justify-center mb-1 shadow-md">
			        <span className="text-lg font-bold text-gray-200">{p.username[0].toUpperCase()}</span>
			    </div>
			    <span className="text-sm font-semibold text-white drop-shadow-md mb-2">{p.username}</span>

			    {/* NEW STATS ROW */}
			    <div className="flex items-center gap-3 bg-black/40 px-3 py-1.5 rounded-full backdrop-blur-sm shadow-inner">
			        {/* Vite */}
			        <div className="flex items-center gap-1" title="Vite">
			            <HeartIcon className="w-4 h-4 text-red-500 drop-shadow-sm" />
			            <span className="font-bold text-white">{p.lives}</span>
			        </div>
			        {/* Bid */}
			        <div className="flex items-center gap-1 border-l border-white/20 pl-3" title="Scommessa">
			            <TargetIcon className="w-4 h-4 text-blue-400 drop-shadow-sm" />
			            <span className="font-bold text-white">{gameState.bids[p.persistentId] !== undefined ? gameState.bids[p.persistentId] : '-'}</span>
			        </div>
			        {/* Presi */}
			        <div className="flex items-center gap-1 border-l border-white/20 pl-3" title="Pigli">
			            <CardsIcon className="w-4 h-4 text-yellow-400 drop-shadow-sm" />
			            <span className="font-bold text-white">{p.tricks}</span>
			        </div>
			    </div>

			    {/* Cards Back */}
			    <div className="mt-3 flex -space-x-8"> 
			    {p.hand.map((c, i) => {
			        const isBlindRound = gameState.cardsPerHand === 1;
			        const assetSrc = isBlindRound ? getCardAsset(c.suit, c.value) : RETRO_PATH;
			        return (
			            <img key={i} src={assetSrc} alt="card" className="w-14 h-auto shadow-md rounded border border-white/10" />
			        );
			    })}
			    </div>
			</div>
			))}
		</div>

		{/* Center: Played Cards */}
		<div className="w-full flex-1 flex flex-col items-center justify-center my-4 relative z-0">
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 
                          bg-green-700/30 border-4 border-green-900/50 
                          w-[90vw] h-[280px] rounded-[100px]
                          md:w-[80vw] md:h-[60vh] md:rounded-[300px] 
                          -z-10 pointer-events-none">
          </div>
          {/* Played cards */}
          {/* Flexbox container for cards */}
          <div className="flex items-center justify-center 
                          /* Mobile: sovrapposizione negativa (-space-x-4) */
                          -space-x-4 
                          /* Desktop: spazio normale (gap-4) o sovrapposizione ridotta se preferisci */
                          md:space-x-6 md:gap-0">

			{gameState.currentRoundCards.map((play, idx) => {
		        if (!play || !play.card) return null;
                const playerIndex = gameState.players.findIndex(p => p.persistentId === play.playerId);
                if (playerIndex === -1) return null;
                
                const playerName = gameState.players[playerIndex].username;

                // ace highlight
                let borderColor = "border-transparent";
                if (play.mode === 'high') borderColor = "border-yellow-400";
                if (play.mode === 'low') borderColor = "border-red-400";

                return (
                    <div 
                        key={play.playerId}
                        className="relative flex flex-col items-center transition-all duration-300 hover:-translate-y-2 hover:z-20"
                        style={{ zIndex: idx }} // overlapping order
                    >
                         <img 
                            src={getCardAsset(play.card?.suit, play.card?.value)}
                            alt="played card"
                            className={`w-24 h-auto shadow-xl rounded-lg border-2 ${borderColor} bg-white md:w-32 lg:w-40`}
                        />
                        
                        {/* player Info */}
                        <div className="absolute -bottom-6 flex flex-col items-center">
                            <div className="bg-black/70 text-white text-[10px] md:text-xs px-3 py-1 rounded-full backdrop-blur-md whitespace-nowrap shadow-sm border border-white/10">
                                {playerName} 
                            </div>
                            
                            {(play.mode === 'high' || play.mode === 'low') && (
                                <span className={`text-[9px] font-bold mt-0.5 ${play.mode === 'high' ? 'text-yellow-300' : 'text-red-300'}`}>
                                    {play.mode === 'high' ? 'HIGH' : 'LOW'}
                                </span>
                            )}
                        </div>
                    </div>
                );
		    })}
		    </div>
		</div>

		{/* Player Controls (Lobby) */}
		{gameState.phase === 'LOBBY' && me.id === gameState.hostId && (
		  <button 
			onClick={startGame}
			disabled={gameState.players.length < 3}
			className="bg-yellow-500 hover:bg-yellow-400 text-green-900 px-8 py-3 rounded-lg font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed mb-8 relative z-50"
		  >
			Start Game ({gameState.players.length}/3+)
		  </button>
		)}

		{/* Player Controls (Bidding) */}
		{gameState.phase === 'BIDDING' && isMyTurn && !me.isSpectator && (
		  <div className="flex flex-col items-center mb-8 bg-green-900 p-4 rounded-lg shadow-lg relative z-50">
			<h3 className="mb-2 font-bold text-yellow-400">Choose your bid</h3>
			<div className="flex gap-2 flex-wrap justify-center">
			  {[...Array(gameState.cardsPerHand + 1)].map((_, i) => {
				// Check Restriction
				let disabled = false;
				const activePlayerCount = gameState.players.filter(p => !p.isSpectator).length;
				const bidsMade = Object.keys(gameState.bids).length;
				if (bidsMade === activePlayerCount - 1) 
				{
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

		{/* My Hand */}
		<div className="mt-auto w-full flex flex-col items-center pb-2">
    
		    {/* stats bar */}
		    <div className="relative mb-4 bg-green-900/80 backdrop-blur-md border border-green-500/30 px-6 py-2 rounded-full shadow-2xl flex items-center gap-8 md:gap-16">
		        
		        {/* lives lost */}
		        {roundSummary?.find(s => s.persistentId === me.persistentId) && (
		            <div className={`
		                absolute left-1/2 -top-5 -translate-x-1/2
		                px-4 py-1 rounded-full font-bold shadow-[0_0_15px_rgba(0,0,0,0.5)] animate-bounce z-50 whitespace-nowrap border-2 border-white
		                ${roundSummary.find(s => s.persistentId === me.persistentId).livesLost === 0 
		                ? 'bg-green-500 text-white' 
		                : 'bg-red-600 text-white'}
		            `}>
		                {roundSummary.find(s => s.persistentId === me.persistentId).livesLost === 0 
		                ? 'SAFE' 
		                : `-${roundSummary.find(s => s.persistentId === me.persistentId).livesLost} lives`}
		            </div>
		        )}

		        {/* Lives */}
		        <div className="flex flex-col md:flex-row items-center gap-1 md:gap-2">
		            <HeartIcon className="w-5 h-5 md:w-6 md:h-6 text-red-500 drop-shadow-[0_2px_4px_rgba(220,38,38,0.5)]" />
		            <div className="text-center md:text-left leading-none">
		                <span className="block text-[10px] text-green-200 uppercase tracking-wider font-bold">Lives</span>
		                <span className="text-lg md:text-2xl font-black text-white">{me.lives}</span>
		            </div>
		        </div>

		        {/* Bid */}
		        <div className="flex flex-col md:flex-row items-center gap-1 md:gap-2">
		            <TargetIcon className="w-5 h-5 md:w-6 md:h-6 text-blue-400 drop-shadow-[0_2px_4px_rgba(96,165,250,0.5)]" />
		            <div className="text-center md:text-left leading-none">
		                <span className="block text-[10px] text-green-200 uppercase tracking-wider font-bold">Bid</span>
		                <span className="text-lg md:text-2xl font-black text-white">{gameState.bids[me.persistentId] ?? '-'}</span>
		            </div>
		        </div>

		        {/* Taken */}
		        <div className="flex flex-col md:flex-row items-center gap-1 md:gap-2">
		            <CardsIcon className="w-5 h-5 md:w-6 md:h-6 text-yellow-400 drop-shadow-[0_2px_4px_rgba(250,204,21,0.5)]" />
		            <div className="text-center md:text-left leading-none">
		                <span className="block text-[10px] text-green-200 uppercase tracking-wider font-bold">Taken</span>
		                <span className="text-lg md:text-2xl font-black text-white">{me.tricks}</span>
		            </div>
		        </div>
		    </div>
		    
		    {/* CARDS CONTAINER */}
		    <div className={`
		        flex justify-center -space-x-4 pb-2 overflow-x-auto min-h-[120px] w-full 
		        md:-space-x-10 md:pb-6 md:min-h-[180px] 
		        transition-all duration-500 rounded-xl px-4
		        ${isMyTurn && isActionPhase ? 'bg-yellow-500/5 shadow-[0_0_40px_rgba(234,179,8,0.15)]' : ''}
		    `}>
		    {me.hand.map((card, idx) => {
		        const isPlayable = gameState.phase === 'PLAYING' && isMyTurn;
		        const isBlind = gameState.cardsPerHand === 1; 
		        const isSelected = selectedCardId === card.id;

		        return (
		            <img 
		                key={card.id || idx}
		                src={isBlind ? RETRO_PATH : getCardAsset(card.suit, card.value)}
		                onClick={() => isPlayable ? handleCardClick(card) : null}
		                className={`
		                    w-20 h-auto rounded-lg shadow-2xl cursor-pointer transition-transform duration-200 border border-white/20 md:w-40 md:hover:-translate-y-10
		                    ${isSelected ? '-translate-y-6 border-yellow-400 ring-2 ring-yellow-400 z-10 md:-translate-y-14' : 'translate-y-0'}
		                    ${!isPlayable ? 'opacity-90 brightness-75' : 'hover:-translate-y-2 brightness-100'}
		                `}
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

	            <h3 className="text-xl font-bold mb-4">Play as:</h3>
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
					  {`${p.lives} Lives`}
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
			<button onClick={() => {
			        localStorage.removeItem(STORAGE_ITEM_NAME);
			        
			        // remove URL GET parameters
			        window.history.replaceState({}, document.title, window.location.pathname);
			        window.location.reload();
			    }} className="bg-gray-600 px-6 py-3 rounded font-bold hover:bg-gray-500">
			  Back to Menu
			</button>
		  </div>
		</div>
	  )}
	</div>
  );
}

export default App;