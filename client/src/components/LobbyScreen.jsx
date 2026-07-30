import React, { useState } from 'react';

export default function LobbyScreen({ userName, onCreateRoom, onJoinRoom }) {
  const [roomIdInput, setRoomIdInput] = useState('');
  const [newRoomName, setNewRoomName] = useState('Mesa Poise');

  const handleCreate = (e) => {
    e.preventDefault();
    const id = newRoomName.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Math.floor(1000 + Math.random() * 9000);
    onCreateRoom(id);
  };

  const handleJoin = (e) => {
    e.preventDefault();
    if (!roomIdInput.trim()) return;
    onJoinRoom(roomIdInput.trim());
  };

  return (
    <div className="screen-container">
      <div className="lobby-box">
        <div className="lobby-header">
          <div className="welcome-title" style={{ fontSize: '1.5rem' }}>COSMOS LOBBY</div>
          <div className="lobby-user-info">Viajante: <strong>{userName}</strong></div>
        </div>

        <div className="lobby-options">
          {/* Create Game */}
          <div className="lobby-card">
            <div className="lobby-card-title">Criar Nova Partida</div>
            <p style={{ fontSize: '0.85rem', color: 'var(--parchment-muted)' }}>
              Ao criar a sala, você assumirá a coroa de <strong>Mestre da Partida</strong> com poderes de gerenciamento de mapa, tokens e itens.
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

          {/* Join Game */}
          <div className="lobby-card">
            <div className="lobby-card-title">Entrar em Partida</div>
            <p style={{ fontSize: '0.85rem', color: 'var(--parchment-muted)' }}>
              Insira o código ou identificador fornecido pelo Mestre da mesa para se juntar à aventura.
            </p>
            <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input
                type="text"
                placeholder="Código da Sala (ex: mesa-poise-1234)"
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
