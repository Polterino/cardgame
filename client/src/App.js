import React, { useEffect, useState } from 'react';
import { socket } from './socket';

function App() {
  const [roomId, setRoomId] = useState(null);
  const [players, setPlayers] = useState([]);
  const [myTurn, setMyTurn] = useState(false);
  const [playedCards, setPlayedCards] = useState([]);

  useEffect(() => {
    socket.on('roomCreated', setRoomId);
    socket.on('playerJoined', setPlayers);
    socket.on('gameStarted', ({ currentTurn, players }) => {
      setPlayers(players);
      setMyTurn(players[currentTurn] === socket.id);
    });
    socket.on('cardPlayed', ({ player, card }) => {
      setPlayedCards((prev) => [...prev, { player, card }]);
    });
    socket.on('nextTurn', (nextPlayer) => {
      setMyTurn(nextPlayer === socket.id);
    });
    socket.on('turnEnded', (cards) => {
      console.log('Turn ended. Cards:', cards);
      setPlayedCards([]);
    });
  }, []);

  const handleCreateRoom = () => {
    socket.emit('createRoom');
  };

  const handleJoinRoom = () => {
    const room = prompt('Enter room ID:');
    socket.emit('joinRoom', room);
    setRoomId(room);
  };

  const handleStartGame = () => {
    socket.emit('startGame', roomId);
  };

  const handlePlayCard = (card) => {
    if (myTurn) {
      socket.emit('playCard', { roomId, card });
    }
  };

  return (
    <div>
      {!roomId && (
        <>
          <button onClick={handleCreateRoom}>Crea Stanza</button>
          <button onClick={handleJoinRoom}>Entra in Stanza</button>
        </>
      )}
      {roomId && (
        <>
          <h3>Stanza: {roomId}</h3>
          <h4>Giocatori: {players.join(', ')}</h4>
          <button onClick={handleStartGame}>Inizia Partita</button>
          <div>
            <h4>Carte giocate:</h4>
            {playedCards.map((pc, i) => (
              <div key={i}>{pc.player}: {pc.card}</div>
            ))}
          </div>
          {myTurn && (
            <div>
              <h4>Tocca a te!</h4>
              {["🂡", "🂢", "🂣"].map((card, i) => (
                <button key={i} onClick={() => handlePlayCard(card)}>{card}</button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default App;
