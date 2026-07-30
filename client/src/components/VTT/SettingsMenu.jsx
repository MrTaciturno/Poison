import React from 'react';

export default function SettingsMenu({ mapState, onUpdateMap }) {
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
    </div>
  );
}
