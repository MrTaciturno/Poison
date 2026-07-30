import React, { useState } from 'react';

export default function MapMenu({ mapState, onUpdateMap }) {
  const [cols, setCols] = useState(mapState.gridColumns || 24);
  const [rows, setRows] = useState(mapState.gridRows || 24);
  const [bgUrlInput, setBgUrlInput] = useState('');

  const handleApplyDimensions = (e) => {
    e.preventDefault();
    onUpdateMap({
      gridColumns: parseInt(cols, 10),
      gridRows: parseInt(rows, 10)
    });
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      onUpdateMap({ bgImage: evt.target.result });
    };
    reader.readAsDataURL(file);
  };

  const handleApplyUrl = (e) => {
    e.preventDefault();
    if (!bgUrlInput.trim()) return;
    onUpdateMap({ bgImage: bgUrlInput.trim() });
    setBgUrlInput('');
  };

  const handleRemoveBg = () => {
    onUpdateMap({ bgImage: '' });
  };

  return (
    <div className="panel-section">
      <div className="panel-section-title">Gerenciamento do Grid</div>
      <form onSubmit={handleApplyDimensions} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div className="panel-row">
          <label>Colunas (Grid X):</label>
          <input
            type="number"
            min="5"
            max="100"
            style={{ width: '80px' }}
            value={cols}
            onChange={(e) => setCols(e.target.value)}
          />
        </div>
        <div className="panel-row">
          <label>Linhas (Grid Y):</label>
          <input
            type="number"
            min="5"
            max="100"
            style={{ width: '80px' }}
            value={rows}
            onChange={(e) => setRows(e.target.value)}
          />
        </div>
        <button type="submit">Atualizar Grid</button>
      </form>

      <div className="panel-section-title" style={{ marginTop: '16px' }}>Imagem de Fundo</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem' }}>Upload Imagem Local:</label>
          <input type="file" accept="image/*" onChange={handleImageUpload} />
        </div>

        <form onSubmit={handleApplyUrl} style={{ display: 'flex', gap: '6px' }}>
          <input
            type="text"
            placeholder="URL da Imagem..."
            value={bgUrlInput}
            onChange={(e) => setBgUrlInput(e.target.value)}
            style={{ flex: 1 }}
          />
          <button type="submit">Aplicar</button>
        </form>

        {mapState.bgImage && (
          <button className="btn-danger" onClick={handleRemoveBg} style={{ marginTop: '8px' }}>
            Remover Imagem de Fundo
          </button>
        )}
      </div>
    </div>
  );
}
