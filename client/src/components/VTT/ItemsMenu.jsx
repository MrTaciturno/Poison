import React, { useEffect, useState } from 'react';

export default function ItemsMenu({ onAddToken }) {
  const [equipList, setEquipList] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [customName, setCustomName] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    fetch('/api/equip')
      .then((res) => res.json())
      .then((data) => setEquipList(data))
      .catch(() => setEquipList([]));
  }, []);

  const getDimensions = (item) => {
    if (!item) return { gridW: 1, gridH: 1 };
    let gridW = item.gridW || item.cols || 0;
    let gridH = item.gridH || item.rows || 0;
    if (!gridW || !gridH) {
      const strToTest = `${item.name || ''} ${item.filename || ''} ${item.url || ''}`;
      const match = strToTest.match(/(\d+)x(\d+)/i);
      if (match) {
        gridW = gridW || parseInt(match[1], 10);
        gridH = gridH || parseInt(match[2], 10);
      }
    }
    return { gridW: gridW || 1, gridH: gridH || 1 };
  };

  const handleSelectItem = (item) => {
    setSelectedItem(item);
    setCustomName(item.name);
    const { gridW, gridH } = getDimensions(item);
    setDescription(`Equipamento ocupando ${gridW}x${gridH} quadrados no grid.`);
  };

  const handleDragStart = (e, item) => {
    const { gridW, gridH } = getDimensions(item);
    const payload = JSON.stringify({
      baseName: item.name,
      imageUrl: item.url,
      gridW,
      gridH
    });
    e.dataTransfer.setData('text/plain', payload);
  };

  const handleSpawnItemOnMap = (itemToSpawn) => {
    const item = itemToSpawn || selectedItem;
    if (!item) return;

    const { gridW, gridH } = getDimensions(item);
    const nameToUse = itemToSpawn ? itemToSpawn.name : (customName || item.name);

    onAddToken({
      baseName: nameToUse,
      imageUrl: item.url || item.imageUrl,
      x: 3,
      y: 3,
      gridW,
      gridH,
      hp: 10,
      maxHp: 10
    });
  };

  return (
    <div className="panel-section">
      <div className="panel-section-title">Equipamentos & Itens do Grid</div>
      <p style={{ fontSize: '0.8rem', color: 'var(--parchment-muted)', marginBottom: '8px' }}>
        Arraste um equipamento para o mapa ou clique para colocá-lo no grid. Eles mantêm suas dimensões exatas (1x1, 1x2, 2x2, etc.) sem esticar.
      </p>

      {/* Grid of Equipment Presets */}
      <div className="panel-grid-list">
        {equipList.map((eq) => {
          const dims = getDimensions(eq);
          return (
            <div
              key={eq.filename}
              className={`asset-thumb-card ${selectedItem?.filename === eq.filename ? 'selected' : ''}`}
              draggable="true"
              onDragStart={(e) => handleDragStart(e, eq)}
              onClick={() => {
                handleSelectItem(eq);
                handleSpawnItemOnMap(eq);
              }}
              style={{
                borderColor: selectedItem?.filename === eq.filename ? 'var(--metal-gold)' : 'var(--metal-bronze)'
              }}
              title="Arraste para o mapa ou clique para colocar"
            >
              <img src={eq.url} alt={eq.name} className="asset-thumb-img" />
              <div className="asset-thumb-name">{eq.name} ({dims.gridW}x{dims.gridH})</div>
            </div>
          );
        })}
      </div>

      {/* Selected Item Properties & Inspector */}
      {selectedItem && (
        <div className="panel-section" style={{ marginTop: '16px', border: '1px solid var(--metal-gold)' }}>
          <div className="panel-section-title">Detalhes do Item</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div className="panel-row">
              <label>Nome do Item:</label>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
              />
            </div>

            <div className="panel-row">
              <label>Dimensões Grid:</label>
              <div>{getDimensions(selectedItem).gridW} x {getDimensions(selectedItem).gridH} quadrados</div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.85rem' }}>Descrição / Notas:</label>
              <textarea
                rows="3"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Insira detalhes adicionais do item..."
              />
            </div>

            <button className="btn-primary" onClick={() => handleSpawnItemOnMap(selectedItem)} style={{ marginTop: '8px' }}>
              Colocar no Mapa
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
