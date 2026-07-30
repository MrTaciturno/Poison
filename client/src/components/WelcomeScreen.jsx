import React, { useState } from 'react';

export default function WelcomeScreen({ onStart }) {
  const [name, setName] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onStart(name.trim());
  };

  return (
    <div className="screen-container">
      <div className="welcome-box">
        <div className="welcome-title">COSMOS VTT</div>
        <div className="welcome-subtitle">Mesa Virtual para o Sistema Poise</div>
        
        <form onSubmit={handleSubmit} className="welcome-input-group">
          <label htmlFor="user-name-input">Seu Nome de Jogador</label>
          <input
            id="user-name-input"
            type="text"
            placeholder="Digite seu nome ou alcunha..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            required
          />
          <button type="submit" className="btn-primary" style={{ marginTop: '12px' }}>
            Entrar na Taverna
          </button>
        </form>
      </div>
    </div>
  );
}
