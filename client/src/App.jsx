// client/src/App.jsx

/*
[] (vuoto)	eseguito una volta sola al montaggio del componente (come componentDidMount)
[variabili]	eseguito ogni volta che almeno una di quelle variabili cambia
assente (no secondo argomento)	eseguito ad ogni render
*/

import React, { useEffect, useState } from 'react';
import { socket } from './socket';  // importa socket da file esterno

function App()
{
	const [name, setName] = useState('');
	const [roomId, setRoomId] = useState('');
	const [inRoom, setInRoom] = useState(false);
	const [players, setPlayers] = useState([]);
	const [hand, setHand] = useState([]);
	const [playedCards, setPlayedCards] = useState([]);
	const [currentTurnIndex, setCurrentTurnIndex] = useState(0);
	const [isMyTurn, setIsMyTurn] = useState(false);

	useEffect(() => {
		const savedName = localStorage.getItem('username');
		const savedRoomId = localStorage.getItem('roomId');

		if (savedName) setName(savedName);
		if (savedRoomId) setRoomId(savedRoomId);

		// Try to rejoin
		socket.on('connect', () => {
			const savedName = localStorage.getItem('username');
			const savedRoomId = localStorage.getItem('roomId');
			console.log("found", savedRoomId, savedName);
			if (savedName && savedRoomId) {
			  socket.emit('rejoinRoom', { name: savedName, roomId: savedRoomId });
			  console.log("Trying to rejoin");
			}
		});

		socket.on('roomJoined', ({ room, players, hand, currentTurnSocket }) => {
			console.log(players);
			setRoomId(room);
			setInRoom(true);
			setPlayers(players);
			setHand(hand);
			setIsMyTurn(currentTurnSocket === socket.id);
			localStorage.setItem('roomId', room);
			console.log("Room joined ", room);
		});

		socket.on('playerJoined', ({ players }) => {
			console.log("Players updated ",players);
			setPlayers(players);
		});

		socket.on('cardPlayed', ({ name, card }) => {
		  setPlayedCards(prev => [...prev, { name, card }]);
		});

		socket.on('turnChanged', ({ currentTurnSocket }) => {
			console.log("turn: ",currentTurnSocket, " my id ", socket.id);
			setIsMyTurn(currentTurnSocket === socket.id);
		});

		socket.on('newCards', (newHand) => {
		  setHand(newHand);
		  setPlayedCards([]);
		});

		return () => {
			socket.off('roomJoined');
			socket.off('playerJoined');
			socket.off('connect');
			socket.off('cardPlayed');
			socket.off('turnChanged');
			socket.off('newCards');
		};
	}, []);
/*
  useEffect(() => {
	const myIndex = players.findIndex(p => p.name === name);
	setIsMyTurn(myIndex === currentTurnIndex);
  }, [currentTurnIndex, players, name]);
*/
  const handleJoin = () => {
	socket.emit('setName', name);
	socket.emit('joinRoom', roomId);
	localStorage.setItem('username', name);
  };

  const handleCreate = () => {
	socket.emit('setName', name);
	socket.emit('createRoom');
	localStorage.setItem('username', name);
  };

  const playCard = (card) => {
	if (!isMyTurn) return;
	socket.emit('playCard', {roomId: roomId, card: card});
	setHand(hand.filter(c => c !== card));
  };

  if (!inRoom) {
	return (
	  <div>
		<h2>Polterino's special card game</h2>
		<input placeholder="Name" value={name} onChange={e => setName(e.target.value)} />
		<br />
		<input placeholder="Room ID" onChange={e => setRoomId(e.target.value)} />
		<br />
		<button onClick={handleJoin}>Join room</button>
		<button onClick={handleCreate}>Create room</button>
	  </div>
	);
  }

  return (
  	<div>
  		<button onClick={() => {
  			socket.emit('leaveRoom', {name: name, roomId: roomId});
			localStorage.removeItem('roomId');
			setInRoom(false);
			setPlayers([]);
			setHand([]);
			setPlayedCards([]);
			setCurrentTurnIndex(0);
			setIsMyTurn(false);
			setRoomId('');
			}}>
			Leave room
		</button>
		<h3>Room ID: {roomId}</h3>
		<h3>Players:</h3>
	  <ul>
		{players.map((p, i) => (
		  <li key={i} style={{ fontWeight: currentTurnIndex === i ? 'bold' : 'normal' }}>
			{p.name} {name === p.name ? '(You)' : ''}
		  </li>
		))}
	  </ul>
	  <h4>Playerd cards:</h4>
	  <ul>
		{playedCards.map((play, i) => (
		  <li key={i}>{play.name} played {play.card}</li>
		))}
	  </ul>
	  <h4>Your hand:</h4>
	  <div>
		{hand.map((card, i) => (
		  <button key={i} onClick={() => playCard(card)} disabled={!isMyTurn}>
			{card}
		  </button>
		))}
	  </div>
	  {!isMyTurn && <p>Waiting for your turn...</p>}
	</div>
  );
}

export default App;
