import React, { useEffect, useState } from 'react';

export default function TokensMenu({
  tokens = [],
  selectedToken,
  players = [],
  onAddToken,
  onUpdateToken,
  onDeleteToken
}) {
  const [presetTokens, setPresetTokens] = useState([]);

  useEffect(() => {
    fetch('/api/tokens')
      .then((res) => res.json())
      .then((data) => setPresetTokens(data))
      .catch(() => setPresetTokens([]));
  }, []);

  const handleSpawnPreset = (token) => {
    onAddToken({
      baseName: token.name,
      imageUrl: token.url,
      x: 2,
      y: 2,
      hp: 20,
      maxHp: 20,
      mp: 10,
      maxMp: 10
    });
  };

  const handleDragStart = (e, token) => {
    const payload = JSON.stringify({
      baseName: token.name,
      imageUrl: token.url,
      gridW: 1,
      gridH: 1
    });
    e.dataTransfer.setData('text/plain', payload);
  };

  const handleCustomUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      onAddToken({
        baseName: file.name.replace(/\.[^/.]+$/, ''),
        imageUrl: evt.target.result,
        x: 2,
        y: 2,
        hp: 20,
        maxHp: 20,
        mp: 10,
        maxMp: 10
      });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="panel-section">
      {/* Selected Token Inspector */}
      {selectedToken ? (
        <div className="panel-section" style={{ border: '2px solid var(--metal-gold)' }}>
          <div className="panel-section-title">Propriedades do Token Selecionado</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <img
              src={selectedToken.imageUrl}
              alt={selectedToken.name}
              style={{ width: '50px', height: '50px', objectFit: 'contain', border: `2px solid ${selectedToken.borderColor || '#a67c52'}` }}
            />
            <div>
              <div style={{ fontWeight: 'bold', color: 'var(--metal-gold-bright)' }}>{selectedToken.name}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--parchment-muted)' }}>Posição Grid: ({selectedToken.x}, {selectedToken.y})</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div className="panel-row">
              <label>Nome:</label>
              <input
                type="text"
                value={selectedToken.name}
                onChange={(e) => onUpdateToken({ id: selectedToken.id, name: e.target.value })}
              />
            </div>

            <div className="panel-row">
              <label>Vida (HP):</label>
              <input
                type="number"
                style={{ width: '60px' }}
                value={selectedToken.hp}
                onChange={(e) => onUpdateToken({ id: selectedToken.id, hp: parseInt(e.target.value, 10) || 0 })}
              />
              <span>/</span>
              <input
                type="number"
                style={{ width: '60px' }}
                value={selectedToken.maxHp}
                onChange={(e) => onUpdateToken({ id: selectedToken.id, maxHp: parseInt(e.target.value, 10) || 0 })}
              />
            </div>

            <div className="panel-row">
              <label>Mana (MP):</label>
              <input
                type="number"
                style={{ width: '60px' }}
                value={selectedToken.mp}
                onChange={(e) => onUpdateToken({ id: selectedToken.id, mp: parseInt(e.target.value, 10) || 0 })}
              />
              <span>/</span>
              <input
                type="number"
                style={{ width: '60px' }}
                value={selectedToken.maxMp}
                onChange={(e) => onUpdateToken({ id: selectedToken.id, maxMp: parseInt(e.target.value, 10) || 0 })}
              />
            </div>

            <div className="panel-row">
              <label>Cor da Borda:</label>
              <input
                type="color"
                value={selectedToken.borderColor || '#a67c52'}
                onChange={(e) => onUpdateToken({ id: selectedToken.id, borderColor: e.target.value })}
              />
            </div>

            <div className="panel-row">
              <label>Aura (Cor):</label>
              <input
                type="color"
                value={selectedToken.auraColor === 'transparent' ? '#c5a059' : selectedToken.auraColor}
                onChange={(e) => onUpdateToken({ id: selectedToken.id, auraColor: e.target.value })}
              />
            </div>

            <div className="panel-row">
              <label>Aura (Raio em Q.):</label>
              <input
                type="number"
                min="0"
                max="10"
                style={{ width: '60px' }}
                value={selectedToken.auraRadius || 0}
                onChange={(e) => onUpdateToken({ id: selectedToken.id, auraRadius: parseInt(e.target.value, 10) || 0 })}
              />
            </div>

            <div className="panel-row">
              <label>Atribuir ao Jogador:</label>
              <select
                value={selectedToken.assignedPlayerId || ''}
                onChange={(e) => onUpdateToken({ id: selectedToken.id, assignedPlayerId: e.target.value || null })}
              >
                <option value="">Nenhum (Livre)</option>
                {players.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <button
              className="btn-danger"
              style={{ marginTop: '8px' }}
              onClick={() => onDeleteToken(selectedToken.id)}
            >
              Remover Token do Mapa
            </button>
          </div>
        </div>
      ) : (
        <p style={{ fontSize: '0.85rem', color: 'var(--sand-pastel)', marginBottom: '12px' }}>
          Arraste um token para o mapa ou clique nele para colocar no grid. Clique num token no mapa para editar suas propriedades.
        </p>
      )}

      {/* Preset Tokens Grid */}
      <div className="panel-section-title">Tokens da Biblioteca</div>
      <div className="panel-grid-list" style={{ marginTop: '8px' }}>
        {presetTokens.map((t) => (
          <div
            key={t.filename}
            className="asset-thumb-card"
            draggable="true"
            onDragStart={(e) => handleDragStart(e, t)}
            onClick={() => handleSpawnPreset(t)}
            title="Arraste para o mapa ou clique para colocar"
          >
            <img src={t.url} alt={t.name} className="asset-thumb-img" />
            <div className="asset-thumb-name">{t.name}</div>
          </div>
        ))}
      </div>

      {/* Temporary Custom Token Upload */}
      <div className="panel-section-title" style={{ marginTop: '16px' }}>Subir Token Temporário</div>
      <input type="file" accept="image/*" onChange={handleCustomUpload} style={{ marginTop: '8px' }} />
    </div>
  );
}
