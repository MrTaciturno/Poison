import React, { useState, useEffect } from 'react';

export default function TopHeader({
  mapState = {},
  onUpdateMapName,
  players = [],
  currentUser = {},
  activeTab,
  onSelectTab,
  onLeaveRoom
}) {
  const safeMapState = mapState || {};
  const safeUser = currentUser || {};
  const safePlayers = Array.isArray(players) ? players : [];

  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(safeMapState.name || 'Mapa sem Título');

  useEffect(() => {
    if (safeMapState.name) {
      setTempName(safeMapState.name);
    }
  }, [safeMapState.name]);

  const isMasterOrCoMaster = Boolean(safeUser.isMaster || safeUser.isCoMaster);

  const handleSaveName = () => {
    setIsEditingName(false);
    if (tempName.trim() && isMasterOrCoMaster && onUpdateMapName) {
      onUpdateMapName(tempName.trim());
    }
  };

  return (
    <div className="vtt-top-header">
      {/* Left: Map Name */}
      <div className="header-left">
        {isMasterOrCoMaster && isEditingName ? (
          <input
            className="header-map-input"
            type="text"
            value={tempName}
            onChange={(e) => setTempName(e.target.value)}
            onBlur={handleSaveName}
            onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
            autoFocus
          />
        ) : (
          <div
            className="header-map-name"
            onClick={() => isMasterOrCoMaster && setIsEditingName(true)}
            style={{ cursor: isMasterOrCoMaster ? 'pointer' : 'default' }}
            title={isMasterOrCoMaster ? 'Clique para editar o nome do mapa' : ''}
          >
            {safeMapState.name || 'Mapa sem Título'}
          </div>
        )}
      </div>

      {/* Center: Connected Players */}
      <div className="header-center">
        <div className="header-players">
          {safePlayers.map((p) => {
            if (!p) return null;
            return (
              <div key={p.id || Math.random()} className={`player-badge ${p.isMaster ? 'is-master' : p.isCoMaster ? 'is-comaster' : ''}`}>
                {p.isMaster && <span className="master-icon-text">[Mestre]</span>}
                {p.isCoMaster && !p.isMaster && <span className="master-icon-text" style={{ color: 'var(--metal-gold-bright)' }}>[Co-Mestre]</span>}
                <span>{p.name || 'Jogador'}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right: Navigation Menus & Leave Button */}
      <div className="header-right">
        {isMasterOrCoMaster && (
          <button
            className={`menu-nav-btn ${activeTab === 'map' ? 'active' : ''}`}
            onClick={() => onSelectTab(activeTab === 'map' ? null : 'map')}
          >
            Mapa
          </button>
        )}

        <button
          className={`menu-nav-btn ${activeTab === 'sheet' ? 'active' : ''}`}
          onClick={() => onSelectTab(activeTab === 'sheet' ? null : 'sheet')}
        >
          Planilha
        </button>

        {isMasterOrCoMaster && (
          <button
            className={`menu-nav-btn ${activeTab === 'tokens' ? 'active' : ''}`}
            onClick={() => onSelectTab(activeTab === 'tokens' ? null : 'tokens')}
          >
            Tokens
          </button>
        )}

        <button
          className={`menu-nav-btn ${activeTab === 'drawing' ? 'active' : ''}`}
          onClick={() => onSelectTab(activeTab === 'drawing' ? null : 'drawing')}
        >
          Desenho
        </button>

        <button
          className={`menu-nav-btn ${activeTab === 'dice' ? 'active' : ''}`}
          onClick={() => onSelectTab(activeTab === 'dice' ? null : 'dice')}
        >
          Dados
        </button>

        {isMasterOrCoMaster && (
          <button
            className={`menu-nav-btn ${activeTab === 'items' ? 'active' : ''}`}
            onClick={() => onSelectTab(activeTab === 'items' ? null : 'items')}
          >
            Equipamentos
          </button>
        )}

        {isMasterOrCoMaster && (
          <button
            className={`menu-nav-btn ${activeTab === 'forge' ? 'active' : ''}`}
            onClick={() => onSelectTab(activeTab === 'forge' ? null : 'forge')}
          >
            Forja
          </button>
        )}

        <button
          className={`menu-nav-btn ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => onSelectTab(activeTab === 'settings' ? null : 'settings')}
        >
          Configurações
        </button>

        <button className="btn-danger" onClick={onLeaveRoom} style={{ marginLeft: '12px' }}>
          Sair
        </button>
      </div>
    </div>
  );
}
