import React from 'react';

export default function SettingsMenu({
  mapState,
  onUpdateMap,
  players = [],
  currentUser,
  onToggleCoMaster
}) {
  return (
    <div className="panel-section">
      <div className="panel-section-title">Configurações do VTT</div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
        <div className="panel-row">
          <label>Cor das Linhas do Grid:</label>
          <input
            type="color"
            value={mapState.gridColor || '#c8b080'}
            onChange={(e) => onUpdateMap({ gridColor: e.target.value })}
          />
        </div>

        <div className="panel-row">
          <label>Opacidade do Grid:</label>
          <input
            type="range"
            min="0.05"
            max="1.0"
            step="0.05"
            value={mapState.gridOpacity ?? 0.4}
            onChange={(e) => onUpdateMap({ gridOpacity: parseFloat(e.target.value) })}
          />
          <span>{Math.round((mapState.gridOpacity ?? 0.4) * 100)}%</span>
        </div>

        <div className="panel-row">
          <label>Tamanho do Quadrado (px):</label>
          <input
            type="number"
            min="20"
            max="150"
            style={{ width: '70px' }}
            value={mapState.gridSquareSize || 60}
            onChange={(e) => onUpdateMap({ gridSquareSize: parseInt(e.target.value, 10) || 60 })}
          />
        </div>

        <div className="panel-row">
          <label>Exibir Rastro de Movimento (Tracejado):</label>
          <input
            type="checkbox"
            checked={mapState.showTrail !== false}
            onChange={(e) => onUpdateMap({ showTrail: e.target.checked })}
          />
        </div>
      </div>

      {/* Players & Co-Master Management Section */}
      <div className="panel-section" style={{ marginTop: '16px', border: '1px solid var(--metal-gold)' }}>
        <div className="panel-section-title">Jogadores & Cargos na Mesa</div>
        <p style={{ fontSize: '0.78rem', color: 'var(--parchment-muted)', marginBottom: '8px' }}>
          O Mestre principal pode promover jogadores a Co-Mestre, garantindo acesso completo aos menus e ferramentas de controle.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {players.map((p) => {
            const isMe = p.id === currentUser?.id;
            const canManage = currentUser?.isMaster && !p.isMaster;

            return (
              <div
                key={p.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: '#1b130e',
                  padding: '8px 10px',
                  borderRadius: '4px',
                  border: '1px solid var(--metal-bronze)'
                }}
              >
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '0.88rem', color: 'var(--sand-pastel)' }}>
                    {p.name} {isMe ? '(Você)' : ''}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--parchment-muted)' }}>
                    Cargo: {p.isMaster ? 'Mestre (Criador)' : p.isCoMaster ? 'Co-Mestre' : 'Jogador'}
                  </div>
                </div>

                {canManage && (
                  <button
                    className={p.isCoMaster ? 'btn-danger' : 'btn-primary'}
                    onClick={() => onToggleCoMaster && onToggleCoMaster(p.id)}
                    style={{ fontSize: '0.78rem', padding: '4px 8px', whiteSpace: 'nowrap' }}
                  >
                    {p.isCoMaster ? 'Remover Co-Mestre' : 'Promover Co-Mestre'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
