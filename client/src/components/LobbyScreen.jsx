import React, { useEffect, useState } from 'react';
import { socket } from '../utils/socket.js';

export default function LobbyScreen({ userName, onCreateRoom, onJoinRoom }) {
  const [roomIdInput, setRoomIdInput] = useState('');
  const [newRoomName, setNewRoomName] = useState('Mesa Poise');
  const [publicRooms, setPublicRooms] = useState([]);

  useEffect(() => {
    socket.emit('get_rooms_list');

    socket.on('rooms_list_updated', (roomsList) => {
      setPublicRooms(roomsList);
    });

    return () => {
      socket.off('rooms_list_updated');
    };
  }, []);

  const handleCreate = (e) => {
    e.preventDefault();
    const id = newRoomName.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Math.floor(1000 + Math.random() * 9000);
    onCreateRoom(id);
  };

  const handleJoinManual = (e) => {
    e.preventDefault();
    if (!roomIdInput.trim()) return;
    onJoinRoom(roomIdInput.trim());
  };

  return (
    <div className="screen-container">
      <div className="lobby-box" style={{ width: '680px' }}>
        <div className="lobby-header">
          <div className="welcome-title" style={{ fontSize: '1.5rem' }}>COSMOS LOBBY</div>
          <div className="lobby-user-info">Viajante: <strong>{userName}</strong></div>
        </div>

        {/* Active Rooms Available */}
        <div className="panel-section" style={{ border: '2px solid var(--metal-gold)' }}>
          <div className="panel-section-title">Salas Ativas na Taverna</div>
          {publicRooms.length === 0 ? (
            <p style={{ fontSize: '0.85rem', color: 'var(--parchment-muted)', padding: '8px 0' }}>
              Nenhuma sala aberta no momento. Crie a primeira sala abaixo para começar!
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px', maxHeight: '160px', overflowY: 'auto' }}>
              {publicRooms.map((r) => (
                <div key={r.roomId} className="panel-row" style={{ background: 'var(--bg-deep-wood)', padding: '10px', borderRadius: '4px', border: '1px solid var(--metal-bronze)' }}>
                  <div>
                    <div style={{ fontWeight: 'bold', color: 'var(--metal-gold-bright)' }}>{r.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--parchment-muted)' }}>
                      Mestre: {r.masterName} | Jogadores: {r.playerCount} | Código: <code>{r.roomId}</code>
                    </div>
                  </div>
                  <button className="btn-primary" onClick={() => onJoinRoom(r.roomId)}>
                    Entrar nesta Sala
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lobby-options">
          {/* Create Game */}
          <div className="lobby-card">
            <div className="lobby-card-title">Criar Nova Partida</div>
            <p style={{ fontSize: '0.85rem', color: 'var(--parchment-muted)' }}>
              Ao criar a sala, você assumirá a coroa de <strong>Mestre da Partida</strong>.
            </p>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input
                type="text"
                placeholder="Nome da Sala"
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                required
              />
              <button type="submit" className="btn-primary">
                Iniciar como Mestre
              </button>
            </form>
          </div>

          {/* Join Game by Code */}
          <div className="lobby-card">
            <div className="lobby-card-title">Entrar por Código</div>
            <p style={{ fontSize: '0.85rem', color: 'var(--parchment-muted)' }}>
              Insira o código direto fornecido pelo Mestre.
            </p>
            <form onSubmit={handleJoinManual} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input
                type="text"
                placeholder="Código da Sala..."
                value={roomIdInput}
                onChange={(e) => setRoomIdInput(e.target.value)}
                required
              />
              <button type="submit">
                Entrar na Mesa
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
