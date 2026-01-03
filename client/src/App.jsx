import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import html2canvas from 'html2canvas';

const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';
const socket = io(socketUrl);

// --- ICONS COMPONENTS ---
const EyeIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
    <path fillRule="evenodd" d="M1.323 11.447C2.811 6.976 7.028 3.75 12.001 3.75c4.97 0 9.185 3.223 10.675 7.69.12.362.12.752 0 1.113-1.487 4.471-5.705 7.697-10.677 7.697-4.97 0-9.186-3.223-10.675-7.69a1.762 1.762 0 010-1.113zM17.25 12a5.25 5.25 0 11-10.5 0 5.25 5.25 0 0110.5 0z" clipRule="evenodd" />
  </svg>
);

const EyeSlashIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M3.53 2.47a.75.75 0 00-1.06 1.06l18 18a.75.75 0 101.06-1.06l-18-18zM22.676 12.553a11.249 11.249 0 01-2.631 4.31l-3.099-3.099a5.25 5.25 0 00-6.71-6.71L7.759 4.577a11.217 11.217 0 014.242-.827c4.97 0 9.185 3.223 10.675 7.69.12.362.12.752 0 1.113z" />
    <path d="M15.75 12c0 .18-.013.357-.037.53l-4.244-4.243A3.75 3.75 0 0115.75 12zM12.53 15.713l-4.243-4.244a3.75 3.75 0 004.243 4.243z" />
    <path d="M6.75 12c0-.619.107-1.213.304-1.764l-3.1-3.1a11.25 11.25 0 00-2.63 4.31c-.12.362-.12.752 0 1.114 1.489 4.467 5.704 7.69 10.675 7.69 1.5 0 2.933-.294 4.242-.827l-2.477-2.477A5.25 5.25 0 016.75 12z" />
  </svg>
);

const FaceIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm-1.25 4.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zm6 0a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" clipRule="evenodd" />
    <path d="M8.75 12.5a.75.75 0 00-1.5 0v2.5a3 3 0 006 0v-2.5a.75.75 0 00-1.5 0v2.5a1.5 1.5 0 01-3 0v-2.5z" />
  </svg>
);

const HeartIcon = ({ className }) => (
	<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
		<path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
	</svg>
);

const TargetIcon = ({ className }) => (
	<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
		<circle cx="12" cy="12" r="10" />
		<circle cx="12" cy="12" r="6" />
		<circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
	</svg>
);

const LuckIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
    <path d="M11 12a1 1 0 01-1 1H7a1 1 0 01-1-1V9a1 1 0 011-1h3a1 1 0 011 1v3z" opacity="0.5"/> 
    <path fillRule="evenodd" d="M12 22a10 10 0 100-20 10 10 0 000 20zm-2.5-16a2.5 2.5 0 115 0 2.5 2.5 0 01-5 0zM7 9a2.5 2.5 0 100 5 2.5 2.5 0 000-5zm10 0a2.5 2.5 0 100 5 2.5 2.5 0 000-5zM9.5 16a2.5 2.5 0 115 0 2.5 2.5 0 01-5 0z" clipRule="evenodd" />
  </svg>
);

const MuscleIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path fillRule="evenodd" d="M5.166 2.621v.858c-1.035.148-2.059.33-3.071.543a.75.75 0 00-.584.859 6.753 6.753 0 006.138 5.6 6.73 6.73 0 002.743 1.346A6.707 6.707 0 019.279 15H8.54c-1.036 0-1.875.84-1.875 1.875V19.5h-.75a2.25 2.25 0 00-2.25 2.25c0 .414.336.75.75.75h14.625a.75.75 0 00.75-.75 2.25 2.25 0 00-2.25-2.25h-.75v-2.625c0-1.036-.84-1.875-1.875-1.875h-.739a6.706 6.706 0 01-1.112-3.173 6.73 6.73 0 002.743-1.347 6.753 6.753 0 006.139-5.6.75.75 0 00-.585-.858 47.077 47.077 0 00-3.07-.543V2.62a.75.75 0 00-.658-.744 49.22 49.22 0 00-6.093-.377c-2.063 0-4.096.128-6.093.377a.75.75 0 00-.657.744zm0 2.629c0 1.196.312 2.32.857 3.294A5.266 5.266 0 013.16 5.337a45.6 45.6 0 012.006-.343v.256zm13.5 0v-.256c.674.1 1.343.214 2.006.343a5.265 5.265 0 01-2.863 3.207 6.72 6.72 0 00.857-3.294z" clipRule="evenodd" />
  </svg>
);

const SkullIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm-1.72 6.97a.75.75 0 10-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 101.06 1.06L12 13.06l1.72 1.72a.75.75 0 101.06-1.06L13.06 12l1.72-1.72a.75.75 0 10-1.06-1.06L12 10.94l-1.72-1.72z" clipRule="evenodd" />
  </svg>
);

/*
const CardsIcon = ({ className }) => (
	<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>

		
		<path d="M4 10 L12 14 L20 10 V12 L12 16 L4 12 V10 Z" opacity="0.4" />
		
		<path d="M4 8 L12 12 L20 8 V10 L12 14 L4 10 V8 Z" opacity="0.7" />
		
		<path d="M12 4 L20 8 L12 12 L4 8 Z" />
		
		<path d="M4 8 L12 12 V13 L4 9 Z" opacity="0.8" />
		<path d="M20 8 L12 12 V13 L20 9 Z" opacity="0.6" />
	</svg>
);
*/
const CardsIcon = ({ className }) => (
	<img
		src="deck_of_cards_orange.png"
		alt="Taken" 
		className={className} 
		style={{ objectFit: 'contain' }}
	/>
);

function App()
{
	// Constants
	const CARD_PATH = "/napoletane/";
	const AVATAR_PATH = "/avatars/";
	const BACKS_PATH = "/card_backs/";
	const SFX_PATH = "/sfx/";
	const AVATARS = ['1.png', '2.png', '3.png'];
	const CARD_BACKS = ['retro.jpg', 'yugioh.png'];
	const SFX_SETS = ['half_life'];

	const STORAGE_ITEM_NAME = "game_session";
	const STORAGE_USERNAME_KEY = "game_username";

	const ROUND_SUMMARY_TIMEOUT = 9700; // ms, timeout to show how many lives each player has lost
	const EMOJI_TIMEOUT = 3000;
	const MIN_NUMBER_OF_PLAYERS = 2;
	const EMOJI_LIST = ['👍', '👎', '😂', '😭', '😡', '😎', '🤡', '😱', '🤯', '❤️', '💩'];


	// States
	const [connected, setConnected] = useState(false);
	const [gameState, setGameState] = useState(null);
	const [username, setUsername] = useState('');
	const [roomCodeInput, setRoomCodeInput] = useState('');
	const [livesInput, setLivesInput] = useState(5);
	const [aceModeModal, setAceModeModal] = useState(null); // { card }
	const [selectedCardId, setSelectedCardId] = useState(null); // pre select cards
	const [roundSummary, setRoundSummary] = useState(null);
	const prevTurnRef = useRef(null); // Previous turn reference
	const [availableRooms, setAvailableRooms] = useState([]);
	const [showLastHand, setShowLastHand] = useState(true);
	const [showEmojiMenu, setShowEmojiMenu] = useState(false);
  const [activeEmojis, setActiveEmojis] = useState({});
  const [settings, setSettings] = useState({
    avatar: localStorage.getItem('avatar') || AVATARS[0],
    cardBack: localStorage.getItem('cardBack') || CARD_BACKS[0],
    sfxSet: localStorage.getItem('sfxSet') || SFX_SETS[0]
	});

	// Useful variables
	const me = gameState?.players?.find(p => p.id === socket.id);
	const myIndex = gameState ? gameState.players.findIndex(p => p.id === socket.id) : -1;
	const isMyTurn = gameState ? gameState.currentTurn === myIndex : false;
	const isActionPhase = gameState ? ['BIDDING', 'PLAYING'].includes(gameState.phase) && !gameState.isPaused : false;

	// Order opponents to show them correctly to each client
	const orderedOpponents = [];
	if (gameState && myIndex !== -1)
	{
		const totalPlayers = gameState.players.length;
		for (let i = 1; i < totalPlayers; i++)
		{
			const nextIndex = (myIndex + i) % totalPlayers;
			if(!gameState.players[nextIndex].isSpectator)
				orderedOpponents.push(gameState.players[nextIndex]);
		}
	} else if (gameState)
	{
		orderedOpponents.push(...gameState.players);
	}

	const getCardAsset = (suit, value) => {
		if (!suit || !value) return RETRO_PATH;
		return CARD_PATH+`${suit.toLowerCase()}_${value.toLowerCase()}.png`;
	};

	const playTurnSound = () => {
		playLocalSfx('yourturn.mp3');
	};

	const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    localStorage.setItem(key, value);
    if (gameState && me) {
      socket.emit('updatePlayerSettings', {
          roomCode: gameState.code,
          persistentId: me.persistentId,
          avatar: key === 'avatar' ? value : settings.avatar,
          cardBack: key === 'cardBack' ? value : settings.cardBack
      });
    }
	};

	
	// Executed only one time
	useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		const code = params.get('room_code');
		if (code) setRoomCodeInput(code);

		const savedUsername = localStorage.getItem(STORAGE_USERNAME_KEY);
		if (savedUsername)
		{
			setUsername(savedUsername);
		}
		
		const handleConnect = () => {
			setConnected(true);

			// Automatic rejoin
			const savedSession = localStorage.getItem(STORAGE_ITEM_NAME);
			if (savedSession)
			{
				const { roomCode, persistentId } = JSON.parse(savedSession);
				socket.emit('rejoinGame', { roomCode, persistentId });
				return;
			}

			if (code)
			{
				if(savedUsername)
					// Small delay to create socket
					setTimeout(() => socket.emit('joinRoom', { roomCode: code.toUpperCase(), username: savedUsername }), 50);
				else
				{
					alert('Can\'t join room without a username');
					socket.emit('getRooms');
				}
			}
			else socket.emit('getRooms');
		};

		socket.on('updateState', (state) => setGameState(state));
		socket.on('roomListUpdate', (rooms) => setAvailableRooms(rooms));
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
			window.history.replaceState({}, document.title, window.location.pathname); // Clean the URL
			setGameState(null);
			alert('Session expired or room closed.');
		});

		socket.on('roundSummary', (summary) => {
			setRoundSummary(summary);
			setTimeout(() => setRoundSummary(null), ROUND_SUMMARY_TIMEOUT);
		});

		socket.on('playerEmoji', ({ persistentId, emoji }) => {
        setActiveEmojis(prev => ({ ...prev, [persistentId]: emoji }));

        setTimeout(() => {
            setActiveEmojis(prev => {
                const newState = { ...prev };
                delete newState[persistentId];
                return newState;
            });
        }, EMOJI_TIMEOUT);
    });

		socket.on('error', (msg) => alert(msg));

		socket.on('connect', handleConnect);
		if (socket.connected)
		{
			handleConnect();
		}

		return () => socket.off();
	}, []);

	// --- URL UPDATE ---
	useEffect(() => {
		if (gameState && gameState.code)
		{
			const url = new URL(window.location);
			if (url.searchParams.get('room_code') !== gameState.code)
			{
				url.searchParams.set('room_code', gameState.code);
				// pushState changes URL withouth refreshing the page
				window.history.pushState({}, '', url);
			}
		}
	}, [gameState?.code]);

	// Executed each time the turn changes
	// Handle sounds
	useEffect(() => {
		if (!gameState) return;

		if (isMyTurn && isActionPhase && prevTurnRef.current !== gameState.currentTurn)
		{
			playTurnSound();
		}
		
		// Update reference
		prevTurnRef.current = gameState.currentTurn;
	}, [gameState?.currentTurn, gameState?.phase]);

	// --- Actions ---

	const createRoom = () => {
		if (!username) return alert('Enter username');
		localStorage.setItem(STORAGE_USERNAME_KEY, username);
		socket.emit('createRoom', { 
			username,
			initialLives: livesInput,
			avatar: settings.avatar,
      cardBack: settings.cardBack
    });
	};

	const joinRoom = () => {
		if (!username || !roomCodeInput) return alert('Enter username and room code');
		localStorage.setItem(STORAGE_USERNAME_KEY, username);
		socket.emit('joinRoom', {
			roomCode: roomCodeInput.toUpperCase(),
			username,
			avatar: settings.avatar,
      cardBack: settings.cardBack
		});
	};

	const startGame = () => {
		socket.emit('startGame', { roomCode: gameState.code });
	};

	const returnToLobby = () => {
		socket.emit('returnToLobby', { roomCode: gameState.code, username});
	};

	const handleHostChoice = (choice) => {
		socket.emit('processHostDecision', { roomCode: gameState.code, choice });
  };

  const sendEmoji = (emoji) => {
    socket.emit('sendEmoji', { roomCode: gameState.code, emoji });
    setShowEmojiMenu(false);
  };

	const playLocalSfx = (fileName) => {
	  const audio = new Audio(`${SFX_PATH}${settings.sfxSet}/${fileName}`);
	  audio.volume = 0.5;
	  audio.play().catch(e => console.log("Audio play blocked", e));
	};

	const submitBid = (bid) => {
		socket.emit('submitBid', { roomCode: gameState.code, bid });
	};

	const handleExit = () => {
    if (gameState && me) {
        socket.emit('exitGame', { roomCode: gameState.code, persistentId: me.persistentId });
    }
    localStorage.removeItem(STORAGE_ITEM_NAME);
    window.history.replaceState({}, document.title, window.location.pathname);
    window.location.reload();
	};

	const handleCardClick = (card) => {
		if (gameState.phase !== 'PLAYING') return;
		
		if (gameState.currentTurn !== myIndex) return;

		// selection
		if (selectedCardId !== card.id)
		{
			playLocalSfx('preselect.mp3');
			setSelectedCardId(card.id);
			return; 
		}

		// playing cards
		if (card.suit === 'Denari' && card.value === 'Asso') {
			setAceModeModal(card);
			return;
		}

		playLocalSfx('play.mp3');
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
            <div className="flex flex-col lg:flex-row gap-6 max-w-6xl w-full items-start justify-center">
                
                <div className="bg-green-900 p-6 rounded-lg shadow-xl w-full lg:w-80 border border-green-700">
                    <h2 className="text-xl mb-4 text-yellow-400 font-bold uppercase tracking-widest border-b border-green-700 pb-2">
                        Your Look
                    </h2>
                    
                    <div className="space-y-6">
                        <div>
                            <label className="text-[10px] text-green-300 block mb-2 uppercase">Avatar</label>
                            <div className="flex lg:flex-wrap gap-2 overflow-x-auto lg:overflow-visible pb-2 custom-scrollbar">
                                {AVATARS.map(img => (
                                    <img 
                                        key={img} 
                                        src={`${AVATAR_PATH}${img}`} 
                                        onClick={() => updateSetting('avatar', img)}
                                        className={`w-12 h-12 rounded-full cursor-pointer border-2 transition-all ${settings.avatar === img ? 'border-yellow-400 scale-110 shadow-lg' : 'border-transparent opacity-40 hover:opacity-100'}`}
                                        alt="avatar option"
                                    />
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] text-green-300 block mb-2 uppercase">Card Back</label>
                            <div className="flex gap-2 overflow-x-auto lg:flex-wrap pb-2 custom-scrollbar">
                                {CARD_BACKS.map(img => (
                                    <img 
                                        key={img} 
                                        src={`${BACKS_PATH}${img}`} 
                                        onClick={() => updateSetting('cardBack', img)}
                                        className={`w-12 h-16 rounded cursor-pointer border-2 transition-all ${settings.cardBack === img ? 'border-yellow-400 scale-105 shadow-lg' : 'border-transparent opacity-40 hover:opacity-100'}`}
                                        alt="card back option"
                                    />
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] text-green-300 block mb-2 uppercase">Sound Effects</label>
                            <select 
                                value={settings.sfxSet}
                                onChange={(e) => updateSetting('sfxSet', e.target.value)}
                                className="w-full bg-green-800 text-white p-2 rounded text-sm border border-green-600 focus:border-yellow-400 outline-none"
                            >
                                {SFX_SETS.map(set => (
                                    <option key={set} value={set}>{set.toUpperCase()}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                <div className="bg-green-900 p-8 rounded-lg shadow-xl w-full max-w-md border border-green-700">
                    <h1 className="text-4xl mb-6 text-center font-bold text-yellow-400 drop-shadow-md">Bisca</h1>
                    
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
                                    className="flex-1 bg-yellow-600 hover:bg-yellow-500 py-2 rounded font-bold text-green-900 transition-colors"
                                >
                                    Create
                                </button>
                            </div>
                        </div>

                        <div className="text-center text-green-400 text-xs">- OR -</div>

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
                                    className="bg-blue-600 hover:bg-blue-500 px-4 rounded font-bold transition-colors"
                                >
                                    Join
                                </button>
                            </div>
                        </div>

                        <div className="mt-6 border-t border-green-700 pt-4">
                            <h3 className="text-green-300 mb-2 font-bold text-sm uppercase">Active Rooms</h3>
                            <div className="flex flex-col gap-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                                {availableRooms.length === 0 ? (
                                    <p className="text-green-500/50 text-xs italic text-center">No active rooms found.</p>
                                ) : (
                                    availableRooms.map((r) => (
                                        <div key={r.code} className="bg-green-800/50 p-2 rounded flex justify-between items-center border border-green-600/30">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-yellow-400 text-sm">{r.code}</span>
                                                <span className="text-[9px] text-green-200 uppercase">{r.playerCount} Players</span>
                                            </div>
                                            <button 
                                                onClick={() => {
                                                    setRoomCodeInput(r.code);
                                                    if(username) socket.emit('joinRoom', { roomCode: r.code, username, avatar: settings.avatar, cardBack: settings.cardBack });
                                                    else alert("Enter username first");
                                                }}
                                                className="bg-green-700 hover:bg-green-600 px-3 py-1 rounded text-[10px] font-bold"
                                            >
                                                JOIN
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
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
							<div className="fixed inset-0 border-[6px] border-yellow-400/60 z-[90] pointer-events-none animate-pulse shadow-[inset_0_0_50px_rgba(250,204,21,0.5)]"></div>
							
							{/* Banner your turn */}
							{/*
							<div className="fixed bottom-36 md:bottom-56 left-1/2 -translate-x-1/2 z-[100] pointer-events-none">
						<div className="bg-yellow-500 text-green-900 px-6 py-2 rounded-full font-bold text-lg md:text-xl shadow-2xl animate-bounce border-4 border-white tracking-widest whitespace-nowrap">
											IT'S YOUR TURN!
									</div>
							</div>
							*/}
					</>
			)}
		{/* Header */}
		<div className="bg-green-900 h-14 px-4 flex justify-between items-center shadow-md w-full z-50 relative shrink-0">
				
				{/* Room Code */}
				<div className="text-xs md:text-sm flex flex-col md:flex-row md:gap-2">
					<span className="opacity-70">Room:</span>
					<span className="text-yellow-400 font-bold tracking-wider">{gameState.code}</span>
				</div>

				{/* Notifications and match infos */}
				<div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center w-3/5">
						
						<div className="text-[10px] text-green-400 font-mono uppercase tracking-widest leading-tight">
								{gameState.phase} • {gameState.cardsPerHand} Cards
						</div>

						<div className="text-xs md:text-sm font-bold text-white text-center truncate w-full animate-pulse drop-shadow-md">
								{gameState.notification || "Waiting..."}
						</div>
				</div>

				{/* Exit Button */}
				<button 
						onClick={handleExit}
						className="text-[10px] md:text-xs bg-red-600/80 hover:bg-red-500 px-3 py-1.5 rounded text-white font-bold transition-colors"
				>
						Exit session
				</button>
			</div>

		{/* Main Table Area */}
		<div className="flex-1 flex flex-col items-center justify-between p-4 relative w-full h-full">

		{/* --- SPECTATOR LIST --- */}
		{gameState.players.some(p => p.isSpectator) && (
		    <div className="absolute top-20 right-4 z-0 flex flex-col items-end pointer-events-none opacity-60">
		        <span className="text-[10px] text-green-400 uppercase tracking-widest font-bold mb-1">Spectators</span>
		        <div className="flex flex-col gap-1 items-end">
		            {gameState.players
		                .filter(p => p.isSpectator)
		                .map(p => (
		                    <div key={p.id} className="flex items-center gap-2 bg-black/40 px-2 py-1 rounded-md backdrop-blur-sm">
		                        <span className={`w-2 h-2 rounded-full ${p.online ? 'bg-gray-400' : 'bg-red-900'}`}></span>
		                        <span className={`text-xs ${p.online ? 'text-gray-300' : 'text-gray-600 line-through'}`}>
		                            {p.username}
		                        </span>
		                    </div>
		                ))}
		        </div>
		    </div>
		)}

		{/* Other Players (Top/Sides - Simplified as a row for mobile) */}
		<div className="flex flex-wrap justify-center gap-4 mb-8 w-full md:justify-around md:items-start md:px-10 relative z-[60] pointer-events-none">
			{orderedOpponents.map(p => (
			<div key={p.id} className={`flex flex-col items-center p-3 rounded-xl relative transition-all ${isActionPhase && gameState.players[gameState.currentTurn].id === p.id ? 'bg-yellow-500/20 ring-2 ring-yellow-400 shadow-lg scale-105' : 'bg-green-900/40'}`}>
					
					{/* LIVES BADGE (Round Summary) */}
					{roundSummary?.find(s => s.persistentId === p.persistentId) && (
							<div className={`absolute -top-3 -right-3 z-50 px-3 py-1 text-sm rounded-full font-bold shadow-xl animate-bounce border-2 border-white ${roundSummary.find(s => s.persistentId === p.persistentId).livesLost === 0 ? 'bg-green-500' : 'bg-red-600'}`}>
									{roundSummary.find(s => s.persistentId === p.persistentId).livesLost === 0 ? 'SAFE' : `-${roundSummary.find(s => s.persistentId === p.persistentId).livesLost}`}
							</div>
					)}

					{/* --- EMOJI DISPLAY OPPONENT --- */}
	        {activeEmojis[p.persistentId] && (
	            <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-4xl animate-bounce drop-shadow-lg z-100 transition-all duration-300">
	                {activeEmojis[p.persistentId]}
	            </div>
	        )}

					{/* Avatar & Name & online status */}
					<div className="relative mb-1">
						<div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 border-2 border-green-600/50 flex items-center justify-center shadow-md overflow-hidden">
					    {p.avatar ? (
					        <img src={`${AVATAR_PATH}${p.avatar}`} className="w-full h-full object-cover" alt="avatar" />
					    ) : (
					        <span className="text-lg font-bold text-gray-200">{p.username[0]?.toUpperCase()}</span>
					    )}
						</div>
						
						{/* Online status */}
						<div 
								className={`absolute bottom-0 right-0 w-3.5 h-3.5 border-2 border-green-900 rounded-full shadow-sm
								${p.online ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]'}`}
								title={p.online ? "Online" : "Offline"}
						></div>
				</div>
					<span className="text-sm font-semibold text-white drop-shadow-md mb-2">
						{p.username}
					</span>

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
							const assetSrc = isBlindRound ? getCardAsset(c.suit, c.value) : `${BACKS_PATH}${p.cardBack}`;
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
					<div className="flex items-center justify-center -space-x-4 md:space-x-6 md:gap-0">

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

		{/* --- LAST TRICK DISPLAY --- */}
				{gameState.lastTrick && gameState.lastTrick.cards.length > 0 && (
            <div className="absolute bottom-40 left-2 md:bottom-10 md:left-10 z-20 flex flex-col items-start transition-all">
                
                {/* Header / Toggle Button */}
                <button 
                    onClick={() => setShowLastHand(!showLastHand)}
                    className="flex items-center gap-2 text-[10px] md:text-xs text-green-300 font-bold uppercase tracking-widest mb-1 bg-black/60 hover:bg-black/80 px-3 py-1.5 rounded transition-colors backdrop-blur-sm border border-white/10"
                >
                    <span>Last Hand</span>
                    {showLastHand ? <EyeSlashIcon className="w-3 h-3 text-white/70" /> : <EyeIcon className="w-3 h-3 text-white/70" />}
                </button>

                {/* Cards Container (Collapsible) */}
                {showLastHand && (
                    <div className="flex -space-x-2 md:space-x-2 bg-black/40 p-2 rounded-xl backdrop-blur-sm border border-white/10 animate-in fade-in slide-in-from-bottom-2 duration-300 origin-top-left">
                        {gameState.lastTrick.cards.map((play, idx) => {
                            const playerIndex = gameState.players.findIndex(p => p.persistentId === play.playerId);
                            if (playerIndex === -1) return null;
                            const playerName = gameState.players[playerIndex].username;
                            const isWinner = play.playerId === gameState.lastTrick.winnerId;

                            return (
                                <div key={idx} className="flex flex-col items-center">
                                    <img 
                                        src={getCardAsset(play.card?.suit, play.card?.value)} 
                                        alt="card"
                                        className={`
                                            w-10 h-auto md:w-16 rounded shadow-lg
                                            ${isWinner ? 'ring-2 ring-yellow-400 scale-110 z-10' : 'opacity-80 scale-90 grayscale-[0.3]'}
                                            transition-all duration-300
                                        `}
                                    />
                                    
                                    <span className={`
                                        text-[8px] md:text-[10px] mt-1 max-w-[50px] truncate text-center
                                        ${isWinner ? 'text-yellow-400 font-bold' : 'text-gray-400'}
                                    `}>
                                        {playerName}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        )}

		{/* Player Controls (Lobby) */}
		{gameState.phase === 'LOBBY' && me.id === gameState.hostId && (
			<button 
			onClick={startGame}
			disabled={gameState.players.length < MIN_NUMBER_OF_PLAYERS}
			className="bg-yellow-500 hover:bg-yellow-400 text-green-900 px-8 py-3 rounded-lg font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed mb-8 relative z-50"
			>
			Start Game ({gameState.players.length}/{MIN_NUMBER_OF_PLAYERS}+)
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
		{!me.isSpectator && (
    <div className="mt-auto w-full flex flex-col items-center pb-2">
        
        {/* STATS & EMOJI CONTAINER */}
        <div className={`
            relative 
            -mb-10 md:-mb-16 
            z-[60]
            flex items-center gap-2 
            scale-90 origin-bottom
        `}>

            {/* STATS BAR */}
            <div className="bg-green-900/90 backdrop-blur-md border border-green-500/30 px-4 py-1 md:px-6 md:py-2 rounded-full shadow-2xl flex items-center gap-4 md:gap-16 relative">
                
                {activeEmojis[me.persistentId] && (
                    <div className="absolute -top-12 right-0 text-5xl animate-bounce drop-shadow-xl z-50">
                        {activeEmojis[me.persistentId]}
                    </div>
                )}

                {/* Round Summary Badge */}
                {roundSummary?.find(s => s.persistentId === me.persistentId) && (
                    <div className={`absolute left-1/2 -top-5 -translate-x-1/2 px-4 py-1 rounded-full font-bold shadow-[0_0_15px_rgba(0,0,0,0.5)] animate-bounce z-50 whitespace-nowrap border-2 border-white ${roundSummary.find(s => s.persistentId === me.persistentId).livesLost === 0 ? 'bg-green-500 text-white' : 'bg-red-600 text-white'}`}>
                        {roundSummary.find(s => s.persistentId === me.persistentId).livesLost === 0 ? 'SAFE' : `-${roundSummary.find(s => s.persistentId === me.persistentId).livesLost}`}
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
            
            {/* EMOJI BUTTON & MENU CONTAINER */}
            <div className="relative">
                {showEmojiMenu && (
                    <div className="absolute bottom-full right-0 mb-2 z-[60] bg-green-900/95 backdrop-blur-md border border-yellow-500/50 p-2 rounded-xl shadow-2xl grid grid-cols-4 gap-2 w-48 animate-in fade-in zoom-in duration-200">
                        {EMOJI_LIST.map(emoji => (
                            <button
                                key={emoji}
                                onClick={() => sendEmoji(emoji)}
                                className="text-2xl hover:bg-white/10 p-1 rounded transition-colors hover:scale-110 active:scale-95"
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>
                )}

                <button 
                    onClick={() => setShowEmojiMenu(!showEmojiMenu)}
                    className={`
                        h-12 w-12 md:h-14 md:w-14 rounded-full 
                        flex items-center justify-center 
                        shadow-xl border-2 transition-all duration-200
                        ${showEmojiMenu ? 'bg-yellow-500 border-yellow-300 text-green-900 rotate-12' : 'bg-green-800 border-green-500 text-yellow-400 hover:bg-green-700'}
                    `}
                >
                    {showEmojiMenu ? (
                        <span className="text-2xl font-bold">✕</span>
                    ) : (
                        <FaceIcon className="w-8 h-8 md:w-9 md:h-9" />
                    )}
                </button>
            </div>
        </div>

        {/* CARDS CONTAINER */}
        <div className={`
            flex justify-center -space-x-4 pb-2 overflow-x-auto w-full 
            pt-8 md:pt-20
            min-h-[150px] md:min-h-[250px]
            md:-space-x-10 md:pb-6 
            transition-all duration-500 rounded-xl px-4
            ${isMyTurn && isActionPhase ? 'bg-yellow-500/5 shadow-[0_0_40px_rgba(234,179,8,0.15)]' : 'opacity-70 grayscale-[0.5] pointer-events-none'}
        `}>
            {me.hand.map((card, idx) => {
                const isPlayable = gameState.phase === 'PLAYING' && isMyTurn;
                const isBlind = gameState.cardsPerHand === 1; 
                const isSelected = selectedCardId === card.id;

                return (
                    <img 
                        key={card.id || idx}
                        src={isBlind ? `${BACKS_PATH}${me.cardBack}` : getCardAsset(card.suit, card.value)}
                        onClick={() => isPlayable ? handleCardClick(card) : null}
                        alt={`${card.value} of ${card.suit}`}
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
    )}
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

		{gameState.phase === 'HOST_DECISION' && me.id === gameState.hostId && (
        <div className="fixed inset-0 bg-black/80 flex flex-col items-center justify-center z-[400] p-4 animate-in fade-in duration-300">
            <div className="bg-green-900 border-4 border-yellow-500 p-8 rounded-2xl max-w-lg w-full text-center shadow-2xl relative">
                
                <h2 className="text-3xl font-bold text-yellow-400 mb-2">Round Set Complete!</h2>
                <p className="text-green-200 mb-8">What do you want to do next?</p>

                    <div className="flex flex-col gap-4">
                        
                        <div className="grid grid-cols-2 gap-4">
                            {/* Descending */}
                            <button 
                                onClick={() => handleHostChoice('CONTINUE_DESC')}
                                className="bg-blue-600 hover:bg-blue-500 p-4 rounded-xl flex flex-col items-center gap-2 transition-transform hover:scale-105"
                            >
                                <span className="text-2xl">Keep playing</span>
                                <div className="leading-tight">
                                    <span className="block font-bold">Descending</span>
                                    <span className="text-xs opacity-70">5 ➔ 1 Cards</span>
                                </div>
                            </button>

                            {/* Ascending */}
                            <button 
                                onClick={() => handleHostChoice('CONTINUE_ASC')}
                                className="bg-green-600 hover:bg-green-500 p-4 rounded-xl flex flex-col items-center gap-2 transition-transform hover:scale-105"
                            >
                                <span className="text-2xl">Keep playing</span>
                                <div className="leading-tight">
                                    <span className="block font-bold">Ascending</span>
                                    <span className="text-xs opacity-70">1 ➔ 5 Cards</span>
                                </div>
                            </button>
                        </div>

                        <div className="border-t border-green-700/50 my-2"></div>

                        {/* Stop game */}
                        <button 
                            onClick={() => handleHostChoice('END_GAME')}
                            className="bg-red-600 hover:bg-red-500 text-white py-3 rounded-lg font-bold shadow-lg flex items-center justify-center gap-2"
                        >
                            <span></span> End Game & Show Results
                        </button>
                    </div>
                		{ /* : (
                    <div className="flex flex-col items-center py-8">
                        <div className="w-16 h-16 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mb-6"></div>
                        <p className="text-xl font-bold text-white animate-pulse">Waiting for Host...</p>
                        <p className="text-sm text-green-300 mt-2">The Host is deciding the next phase.</p>
                    </div>
              	)*/ }
            </div>

            <div className="mt-8 text-white/50 text-sm">
                Stats and lives are preserved.
            </div>
        </div>
      )}

		{/* Game Over Scoreboard */}
		{gameState.phase === 'GAME_OVER' && (
		<div className="fixed inset-0 bg-black/90 flex flex-col items-center justify-center z-[500] overflow-auto p-4">
			<div id="scoreboard" className="bg-green-900 border-4 border-yellow-500 p-8 rounded-xl max-w-lg w-full text-center">
			<h2 className="text-3xl font-bold text-yellow-400 mb-6">Game Over</h2>

			{/* STATISTIC */}
			{(() => {
						const players = [...gameState.players].filter(p => p.participated);
            const luckyPlayer = players.sort((a,b) => b.assoDenariCount - a.assoDenariCount)[0];
            const strongPlayer = players.sort((a,b) => b.totalTricks - a.totalTricks)[0];
            const tragicPlayer = players.sort((a,b) => b.maxLivesLost - a.maxLivesLost)[0];
            /*
            console.log("--- Statistics ---");
            const debugData = gameState.players.map(p => ({
                Username: p.username,
                'assoDenariCount': p.assoDenariCount,
                'totalTricks': p.totalTricks,
                'maxLivesLost': p.maxLivesLost,
                'Raw Object': p
            }));
            console.table(debugData);
            */

            return (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <div className="bg-yellow-500/20 border border-yellow-400/50 p-3 rounded-lg flex flex-col items-center">
                        <LuckIcon className="w-8 h-8 text-yellow-300 mb-1" />
                        <span className="text-xs text-yellow-100 uppercase font-bold">The Chosen One</span>
                        <span className="text-lg font-bold text-white">{luckyPlayer.assoDenariCount > 0 ? luckyPlayer.username : '-'}</span>
                        <span className="text-[10px] text-yellow-200/70">{luckyPlayer.assoDenariCount} Golden Aces</span>
                    </div>

                    <div className="bg-blue-500/20 border border-blue-400/50 p-3 rounded-lg flex flex-col items-center">
                        <MuscleIcon className="w-8 h-8 text-blue-300 mb-1" />
                        <span className="text-xs text-blue-100 uppercase font-bold">The Harvester</span>
                        <span className="text-lg font-bold text-white">{strongPlayer.totalTricks > 0 ? strongPlayer.username : '-'}</span>
                        <span className="text-[10px] text-blue-200/70">{strongPlayer.totalTricks} Tricks Taken</span>
                    </div>

                    <div className="bg-red-500/20 border border-red-400/50 p-3 rounded-lg flex flex-col items-center">
                        <SkullIcon className="w-8 h-8 text-red-400 mb-1" />
                        <span className="text-xs text-red-100 uppercase font-bold">The Tragic</span>
                        <span className="text-lg font-bold text-white">{tragicPlayer.maxLivesLost > 0 ? tragicPlayer.username : '-'}</span>
                        <span className="text-[10px] text-red-200/70">-{tragicPlayer.maxLivesLost} Lives in 1 round</span>
                    </div>
                </div>
            );
        })()}

			<div className="space-y-4">
				{[...gameState.players]
				.filter(p => p.participated)
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
			
			<button 
								onClick={returnToLobby} 
								className="bg-green-600 hover:bg-green-500 text-white px-6 py-3 rounded font-bold shadow-lg transform hover:scale-105 transition-transform border-2 border-green-400"
						>
								Return to Lobby
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