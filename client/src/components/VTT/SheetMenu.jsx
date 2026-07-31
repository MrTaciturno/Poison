import React, { useState } from 'react';
import { parsePoiseFile, exportPoiseFile } from '../../utils/poiseParser.js';

export default function SheetMenu({ currentUser, socket, onUpdateSheet, onOpenFullSheet, onAddToken, onDeleteToken }) {
  const [sheet, setSheet] = useState(currentUser?.sheetData || null);
  const [errorMsg, setErrorMsg] = useState('');

  const stagingInventory = currentUser?.stagingInventory || [];

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const result = parsePoiseFile(evt.target.result);
      if (result.success) {
        const loadedData = { ...result.data };
        setSheet(loadedData);
        onUpdateSheet(loadedData);
        setErrorMsg('');
      } else {
        setErrorMsg(result.error);
      }
    };
    reader.readAsText(file);
  };

  const handleSaveSheet = () => {
    if (!sheet) return;
    exportPoiseFile(sheet, sheet.name || 'personagem.poise');
  };

  const handleClearSheet = () => {
    setSheet(null);
    onUpdateSheet(null);
  };

  // Add Item to 3x4 Staging Grid from Map or Drag
  const handleAddItemToStaging = (itemObj) => {
    const newItem = {
      id: `equip_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      name: itemObj.baseName || itemObj.name || 'Equipamento',
      label: itemObj.baseName || itemObj.name || 'Equipamento',
      gridW: itemObj.gridW || 1,
      gridH: itemObj.gridH || 1,
      imageUrl: itemObj.imageUrl || `/Equip/${itemObj.name}.png`
    };

    const updatedStaging = [...stagingInventory, newItem];
    if (socket) {
      socket.emit('update_staging_inventory', updatedStaging);
    }

    // Remove item token from map if it came from the map
    if (itemObj.tokenId && onDeleteToken) {
      onDeleteToken(itemObj.tokenId);
    }
  };

  // Spawn item from 3x4 Staging Grid onto VTT Map
  const handlePlaceItemOnMap = (item, index) => {
    if (onAddToken) {
      onAddToken({
        baseName: item.name || 'Equipamento',
        imageUrl: item.imageUrl,
        gridW: item.gridW || 1,
        gridH: item.gridH || 1,
        x: 3,
        y: 3
      });
    }

    // Remove from 3x4 staging inventory
    const updatedStaging = [...stagingInventory];
    updatedStaging.splice(index, 1);
    if (socket) {
      socket.emit('update_staging_inventory', updatedStaging);
    }
  };

  // HTML5 Drop on 3x4 Staging Grid
  const handleStagingDrop = (e) => {
    e.preventDefault();
    const dataStr = e.dataTransfer.getData('text/plain');
    if (!dataStr) return;

    try {
      const payload = JSON.parse(dataStr);
      handleAddItemToStaging(payload);
    } catch (err) {
      console.error('Erro ao soltar no grid temporário:', err);
    }
  };

  // Generate 12 fixed slots (3 columns x 4 rows)
  const gridSlots = Array.from({ length: 12 }, (_, i) => stagingInventory[i] || null);

  return (
    <div className="sheet-container">
      {/* 1. Sheet Upload or Actions Section */}
      {!sheet ? (
        <div className="panel-section">
          <div className="panel-section-title">Upload de Planilha .poise</div>
          <p style={{ fontSize: '0.82rem', color: 'var(--parchment-muted)' }}>
            Selecione seu arquivo de personagem no formato <code>.poise</code> para carregar todas as suas estatísticas.
          </p>
          <input type="file" accept=".poise,.json" onChange={handleFileUpload} style={{ marginTop: '8px' }} />
          {errorMsg && <p style={{ color: 'var(--accent-red)', fontSize: '0.85rem', marginTop: '8px' }}>{errorMsg}</p>}
        </div>
      ) : (
        <div className="panel-section">
          <div className="panel-section-title">Planilha: {sheet.name || 'Personagem'}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
            <button className="btn-primary" onClick={onOpenFullSheet}>
              Abrir Planilha Completa (Janela)
            </button>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={handleSaveSheet} style={{ flex: 1 }}>Salvar .poise</button>
              <button className="btn-danger" onClick={handleClearSheet} style={{ flex: 1 }}>Trocar Arquivo</button>
            </div>
          </div>
        </div>
      )}

      {/* 2. ALWAYS VISIBLE 3x4 Temporary Equipment Grid (12 Slots) */}
      <div
        className="panel-section"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleStagingDrop}
      >
        <div className="panel-section-title">Grid Temporário de Equipamentos (3x4)</div>
        <p style={{ fontSize: '0.78rem', color: 'var(--parchment-muted)', marginBottom: '8px' }}>
          Este grid serve para manipular itens entre o mapa VTT e a planilha. Clicar no item coloca-o no mapa. Arraste para a planilha aberta.
        </p>

        {/* 3 columns x 4 rows visual grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '6px',
            backgroundColor: '#1b130e',
            padding: '8px',
            borderRadius: '6px',
            border: '2px solid var(--metal-bronze)'
          }}
        >
          {gridSlots.map((item, idx) => (
            <div
              key={idx}
              draggable={!!item}
              onDragStart={(e) => {
                if (item) {
                  e.dataTransfer.setData('text/plain', JSON.stringify({ item, index: idx }));
                }
              }}
              onClick={() => item && handlePlaceItemOnMap(item, idx)}
              style={{
                width: '100%',
                height: '75px',
                backgroundColor: item ? '#2a1f18' : '#120d09',
                border: item ? '1.5px solid var(--metal-gold)' : '1px dashed var(--metal-bronze)',
                borderRadius: '4px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: item ? 'grab' : 'default',
                padding: '2px',
                position: 'relative',
                overflow: 'hidden'
              }}
              title={item ? `${item.name} (${item.gridW}x${item.gridH}) - Clique para mapa / Arraste para planilha` : `Slot ${idx + 1}`}
            >
              {item ? (
                <>
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    style={{ maxHeight: '48px', maxWidth: '100%', objectFit: 'contain' }}
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                  <div
                    style={{
                      fontSize: '0.65rem',
                      fontWeight: 'bold',
                      color: 'var(--metal-gold-bright)',
                      textAlign: 'center',
                      lineHeight: '1',
                      marginTop: '2px',
                      whiteSpace: 'nowrap',
                      textOverflow: 'ellipsis',
                      overflow: 'hidden',
                      width: '100%'
                    }}
                  >
                    {item.name} ({item.gridW}x{item.gridH})
                  </div>
                </>
              ) : (
                <span style={{ fontSize: '0.65rem', color: '#5a4636' }}>{idx + 1}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
