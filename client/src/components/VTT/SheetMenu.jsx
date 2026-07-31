import React, { useState } from 'react';
import { parsePoiseFile, exportPoiseFile } from '../../utils/poiseParser.js';

export default function SheetMenu({ currentUser, onUpdateSheet, onOpenFullSheet, onAddToken, onDeleteToken }) {
  const [sheet, setSheet] = useState(currentUser.sheetData || null);
  const [errorMsg, setErrorMsg] = useState('');

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const result = parsePoiseFile(evt.target.result);
      if (result.success) {
        const loadedData = {
          ...result.data,
          inventory: result.data.inventory || [
            { id: 'item_1', name: 'IC1x1', label: 'Adaga (1x1)', gridW: 1, gridH: 1, imageUrl: '/Equip/IC1x1.png' },
            { id: 'item_2', name: 'IC1x2', label: 'Espada Curta (1x2)', gridW: 1, gridH: 2, imageUrl: '/Equip/IC1x2.png' }
          ]
        };
        setSheet(loadedData);
        onUpdateSheet(loadedData);
        setErrorMsg('');
        if (onOpenFullSheet) onOpenFullSheet();
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

  // Add Item to Inventory from Map or Presets
  const handleAddItemToInventory = (itemObj) => {
    if (!sheet) return;
    const currentInv = sheet.inventory || [];
    const newItem = {
      id: `inv_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      name: itemObj.baseName || itemObj.name || 'Equipamento',
      label: itemObj.baseName || itemObj.name || 'Equipamento',
      gridW: itemObj.gridW || 1,
      gridH: itemObj.gridH || 1,
      imageUrl: itemObj.imageUrl || itemObj.url || `/Equip/${itemObj.name}.png`
    };

    const updatedSheet = { ...sheet, inventory: [...currentInv, newItem] };
    setSheet(updatedSheet);
    onUpdateSheet(updatedSheet);

    // If item came from map token, remove it from map
    if (itemObj.tokenId && onDeleteToken) {
      onDeleteToken(itemObj.tokenId);
    }
  };

  // Move Item from Inventory back to Map Grid
  const handlePlaceItemOnMap = (item, index) => {
    if (!sheet) return;
    // Spawn onto map grid
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

    // Remove from inventory grid
    const currentInv = [...(sheet.inventory || [])];
    currentInv.splice(index, 1);
    const updatedSheet = { ...sheet, inventory: currentInv };
    setSheet(updatedSheet);
    onUpdateSheet(updatedSheet);
  };

  // HTML5 Drop handler on Inventory Grid
  const handleInventoryDrop = (e) => {
    e.preventDefault();
    const dataStr = e.dataTransfer.getData('text/plain');
    if (!dataStr) return;

    try {
      const payload = JSON.parse(dataStr);
      handleAddItemToInventory(payload);
    } catch (err) {
      console.error('Erro ao soltar item no inventário:', err);
    }
  };

  if (!sheet) {
    return (
      <div className="panel-section">
        <div className="panel-section-title">Upload de Planilha .poise</div>
        <p style={{ fontSize: '0.85rem', color: 'var(--parchment-muted)' }}>
          Selecione seu arquivo de personagem no formato <code>.poise</code> para carregar todas as suas estatísticas e inventário do personagem.
        </p>
        <input type="file" accept=".poise,.json" onChange={handleFileUpload} style={{ marginTop: '8px' }} />
        {errorMsg && <p style={{ color: 'var(--accent-red)', fontSize: '0.85rem', marginTop: '8px' }}>{errorMsg}</p>}
      </div>
    );
  }

  const inventoryList = sheet.inventory || [];

  return (
    <div className="sheet-container">
      {/* Action Buttons Header */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '8px' }}>
        <button className="btn-primary" onClick={onOpenFullSheet}>
          Abrir Planilha Completa (Janela)
        </button>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={handleSaveSheet} style={{ flex: 1 }}>Salvar .poise</button>
          <button className="btn-danger" onClick={handleClearSheet} style={{ flex: 1 }}>Trocar Arquivo</button>
        </div>
      </div>

      {/* Sheet Summary */}
      <div className="panel-section">
        <div className="panel-section-title">Resumo do Personagem</div>
        <div className="sheet-field-group">
          <label className="sheet-field-label">Nome:</label>
          <div style={{ fontWeight: 'bold', color: 'var(--metal-gold-bright)' }}>{sheet.name || 'Personagem Poise'}</div>
        </div>
      </div>

      {/* Interactive Inventory Grid Section */}
      <div className="panel-section" onDragOver={(e) => e.preventDefault()} onDrop={handleInventoryDrop}>
        <div className="panel-section-title">Inventário da Planilha (Grid de Itens)</div>
        <p style={{ fontSize: '0.78rem', color: 'var(--parchment-muted)', marginBottom: '8px' }}>
          Arraste um equipamento do mapa para esta área para guardá-lo. Clique em um item guardado para colocá-lo de volta no mapa.
        </p>

        <div className="sheet-equipment-grid" style={{ minHeight: '120px' }}>
          {inventoryList.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', textWrap: 'pretty', textAlign: 'center', color: 'var(--parchment-dark)', fontSize: '0.8rem', padding: '16px 0' }}>
              Nenhum item no inventário. Arraste itens para guardar aqui.
            </div>
          ) : (
            inventoryList.map((item, idx) => (
              <div
                key={item.id || idx}
                className="asset-thumb-card"
                onClick={() => handlePlaceItemOnMap(item, idx)}
                title="Clique para colocar no mapa VTT"
                style={{ cursor: 'pointer', border: '1px solid var(--metal-gold)' }}
              >
                <img
                  src={item.imageUrl || `/Equip/${item.name}.png`}
                  alt={item.label || item.name}
                  className="asset-thumb-img"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
                <div className="asset-thumb-name">{item.label || item.name} ({item.gridW || 1}x{item.gridH || 1})</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
