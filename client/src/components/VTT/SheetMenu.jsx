import React, { useState } from 'react';
import { parsePoiseFile, exportPoiseFile } from '../../utils/poiseParser.js';

export default function SheetMenu({ currentUser, socket, onUpdateSheet, onOpenFullSheet, onAddToken, onDeleteToken }) {
  const [sheet, setSheet] = useState(currentUser?.sheetData || null);
  const [errorMsg, setErrorMsg] = useState('');

  // 3-item limit staging inventory
  const stagingInventory = (currentUser?.stagingInventory || []).slice(0, 3);

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

  // Add Item to 3-item Staging Grid from Map or Drag
  const handleAddItemToStaging = (itemObj) => {
    if (stagingInventory.length >= 3) {
      alert('O grid temporário aceita no máximo 3 itens simultâneos.');
      return;
    }

    const newItem = {
      id: `equip_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      name: itemObj.baseName || itemObj.name || 'Equipamento',
      label: itemObj.baseName || itemObj.name || 'Equipamento',
      gridW: itemObj.gridW || 1,
      gridH: itemObj.gridH || 1,
      imageUrl: itemObj.imageUrl || `/Equip/${itemObj.name}.png`
    };

    const updatedStaging = [...stagingInventory, newItem].slice(0, 3);
    if (socket) {
      socket.emit('update_staging_inventory', updatedStaging);
    }

    // Remove item token from map if it came from the map
    if (itemObj.tokenId && onDeleteToken) {
      onDeleteToken(itemObj.tokenId);
    }
  };

  // Spawn item from 3-item Staging Grid onto VTT Map
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

    // Remove from staging inventory
    const updatedStaging = [...stagingInventory];
    updatedStaging.splice(index, 1);
    if (socket) {
      socket.emit('update_staging_inventory', updatedStaging);
    }
  };

  // HTML5 Drop on Staging Grid
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

  // Generate 3 fixed slots
  const gridSlots = Array.from({ length: 3 }, (_, i) => stagingInventory[i] || null);

  return (
    <div className="sheet-container">
      {/* Top Section: Open Editor Option & File Actions */}
      <div className="panel-section">
        <div className="panel-section-title">Editor da Planilha Poise</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
          <button className="btn-primary" onClick={onOpenFullSheet} style={{ padding: '10px', fontSize: '0.95rem' }}>
            Abrir Editor
          </button>

          {!sheet ? (
            <div>
              <p style={{ fontSize: '0.78rem', color: 'var(--parchment-muted)', margin: '6px 0 4px 0' }}>
                Carregar arquivo de personagem (.poise):
              </p>

              {/* Botão Bonito Personalizado */}
              <label 
                htmlFor="file-poise-upload-input" 
                className="btn-secondary"
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  gap: '6px',
                  padding: '8px 12px', 
                  fontSize: '0.85rem', 
                  cursor: 'pointer',
                  textAlign: 'center',
                  width: '100%',
                  boxSizing: 'border-box'
                }}
              >
                <span>📂</span> Selecionar Arquivo .poise
              </label>

              {/* Input Nativo Oculto */}
              <input 
                id="file-poise-upload-input"
                type="file" 
                accept=".poise,.json" 
                onChange={handleFileUpload} 
                style={{ display: 'none' }} 
              />

              {errorMsg && <p style={{ color: 'var(--accent-red)', fontSize: '0.8rem', marginTop: '4px' }}>{errorMsg}</p>}
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={handleSaveSheet} style={{ flex: 1 }}>Salvar .poise</button>
              <button className="btn-danger" onClick={handleClearSheet} style={{ flex: 1 }}>Trocar Ficha</button>
            </div>
          )}
        </div>
      </div>

      {/* ALWAYS VISIBLE 3-ITEM TEMPORARY EQUIPMENT GRID */}
      <div
        className="panel-section"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleStagingDrop}
      >
        <div className="panel-section-title">Grid Temporário de Equipamentos (3 Itens)</div>
        <p style={{ fontSize: '0.78rem', color: 'var(--parchment-muted)', marginBottom: '8px' }}>
          Este espaço guarda até 3 itens para transferir entre o VTT e a planilha. Clicar no item coloca-o no mapa.
        </p>

        {/* 3 Slots Grid */}
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
                height: '85px',
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
              title={item ? `${item.name} (${item.gridW}x${item.gridH}) - Clique para mapa / Arraste para o editor` : `Slot ${idx + 1}`}
            >
              {item ? (
                <>
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    style={{ maxHeight: '52px', maxWidth: '100%', objectFit: 'contain' }}
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                  <div
                    style={{
                      fontSize: '0.68rem',
                      fontWeight: 'bold',
                      color: 'var(--metal-gold-bright)',
                      textAlign: 'center',
                      lineHeight: '1.1',
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
                <span style={{ fontSize: '0.7rem', color: '#5a4636' }}>Slot {idx + 1}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
