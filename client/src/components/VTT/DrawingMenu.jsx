import React from 'react';

export default function DrawingMenu({
  activeTool,
  onSelectTool,
  color,
  onChangeColor,
  strokeWidth,
  onChangeStrokeWidth,
  onClearDrawings
}) {
  const tools = [
    { id: 'ruler', name: 'Régua' },
    { id: 'cone', name: 'Cone' },
    { id: 'freehand', name: 'Linha Livre' },
    { id: 'straight_line', name: 'Linha Reta' },
    { id: 'rectangle', name: 'Retângulo' },
    { id: 'circle', name: 'Círculo' },
    { id: 'eraser', name: 'Borracha' }
  ];

  return (
    <div className="panel-section">
      <div className="panel-section-title">Ferramentas de Desenho no Grid</div>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '8px' }}>
        {tools.map((t) => (
          <button
            key={t.id}
            className={activeTool === t.id ? 'btn-primary' : ''}
            onClick={() => onSelectTool(t.id)}
          >
            {t.name}
          </button>
        ))}
      </div>

      <div className="panel-section-title" style={{ marginTop: '16px' }}>Estilo do Traço</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
        <div className="panel-row">
          <label>Cor do Desenho:</label>
          <input
            type="color"
            value={color}
            onChange={(e) => onChangeColor(e.target.value)}
          />
        </div>

        <div className="panel-row">
          <label>Espessura:</label>
          <input
            type="number"
            min="1"
            max="20"
            style={{ width: '60px' }}
            value={strokeWidth}
            onChange={(e) => onChangeStrokeWidth(parseInt(e.target.value, 10) || 3)}
          />
        </div>

        <button className="btn-danger" onClick={onClearDrawings} style={{ marginTop: '12px' }}>
          Limpar Todos os Desenhos
        </button>
      </div>
    </div>
  );
}
