import React, { useState } from 'react';

export default function TopHeader({
  mapState,
  onUpdateMapName,
  players = [],
  currentUser,
  activeTab,
  onSelectTab,
  onLeaveRoom
}) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(mapState.name || 'Mapa sem Título');

  const handleSaveName = () => {
    setIsEditingName(false);
    if (tempName.trim() && currentUser.isMaster) {
      onUpdateMapName(tempName.trim());
    }
  };

  return (
    <div className="vtt-top-header">
      {/* Left: Map Name */}
      <div className="header-left">
        {currentUser.isMaster && isEditingName ? (
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
            onClick={() => currentUser.isMaster && setIsEditingName(true)}
            style={{ cursor: currentUser.isMaster ? 'pointer' : 'default' }}
            title={currentUser.isMaster ? 'Clique para editar o nome do mapa' : ''}
          >
            {mapState.name || 'Mapa sem Título'}
          </div>
        )}
      </div>

      {/* Center: Connected Players */}
      <div className="header-center">
        <div className="header-players">
          {players.map((p) => (
            <div key={p.id} className={`player-badge ${p.isMaster ? 'is-master' : ''}`}>
              {p.isMaster && <span className="master-icon-text">[Mestre]</span>}
              <span>{p.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right: Navigation Menus & Leave Button */}
      <div className="header-right">
        {currentUser.isMaster && (
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
          {currentUser.sheetData ? 'Planilha' : 'Menu Planilha'}
        </button>

        {currentUser.isMaster && (
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

        {currentUser.isMaster && (
          <button
            className={`menu-nav-btn ${activeTab === 'items' ? 'active' : ''}`}
            onClick={() => onSelectTab(activeTab === 'items' ? null : 'items')}
          >
            Equipamentos
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
