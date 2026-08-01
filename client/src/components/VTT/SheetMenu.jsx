import React, { useState } from 'react';
import { parsePoiseFile } from '../../utils/poiseParser.js';

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

  // Extract character name (1st line of description or sheet.name)
  const getCharacterName = () => {
    if (!sheet) return 'Sem Personagem';
    const nameField = (sheet.fields || []).find((f) => f.id === 'nome_desc');
    if (nameField && nameField.value) {
      const firstLine = nameField.value.split('\n')[0].trim();
      if (firstLine) return firstLine;
    }
    return sheet.name || 'Personagem Poise';
  };

  // Extract attacks list from sheet fields (atq_row1 to atq_row5)
  const getCharacterAttacks = () => {
    if (!sheet || !Array.isArray(sheet.fields)) return [];
    const attacks = [];
    for (let i = 1; i <= 5; i++) {
      const descField = sheet.fields.find((f) => f.id === `atq_row${i}_desc`);
      const modsField = sheet.fields.find((f) => f.id === `atq_row${i}_mods`);
      const alcField = sheet.fields.find((f) => f.id === `atq_row${i}_alc`);

      const desc = descField?.value?.trim() || '';
      const mods = modsField?.value?.trim() || '';
      const alc = alcField?.value?.trim() || '';

      if (desc || mods || alc) {
        attacks.push({ id: `atq_${i}`, desc: desc || `Ataque ${i}`, mods, alc });
      }
    }
    return attacks;
  };

  // Generate 3 fixed slots
  const gridSlots = Array.from({ length: 3 }, (_, i) => stagingInventory[i] || null);
  const characterName = getCharacterName();
  const characterAttacks = getCharacterAttacks();

  return (
    <div className="sheet-container">
      {/* Top Section: Side-by-Side Action Buttons ('Abrir Editor' & 'Trocar Ficha') */}
      <div className="panel-section">
        <div className="panel-section-title">Controles da Planilha</div>
        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
          <button
            className="btn-primary"
            onClick={onOpenFullSheet}
            style={{ flex: 1, padding: '10px 8px', fontSize: '0.88rem', whiteSpace: 'nowrap' }}
          >
            Abrir Editor
          </button>

          {sheet ? (
            <button
              className="btn-danger"
              onClick={handleClearSheet}
              style={{ flex: 1, padding: '10px 8px', fontSize: '0.88rem', whiteSpace: 'nowrap' }}
            >
              Trocar Ficha
            </button>
          ) : (
            <label
              htmlFor="file-poise-upload-input"
              className="btn-secondary"
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                padding: '10px 8px',
                fontSize: '0.85rem',
                cursor: 'pointer',
                textAlign: 'center',
                boxSizing: 'border-box',
                whiteSpace: 'nowrap'
              }}
            >
              <span>📂</span> Selecionar .poise
            </label>
          )}

          <input
            id="file-poise-upload-input"
            type="file"
            accept=".poise,.json"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />
        </div>
        {errorMsg && <p style={{ color: 'var(--accent-red)', fontSize: '0.8rem', marginTop: '6px' }}>{errorMsg}</p>}
      </div>

      {/* Basic Character Information Summary (Name & Attacks) */}
      <div className="panel-section">
        <div className="panel-section-title">Informações Básicas</div>
        <div style={{ marginTop: '8px' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--parchment-muted)' }}>Nome do Personagem:</div>
          <div
            style={{
              fontFamily: 'var(--font-title)',
              fontSize: '1.1rem',
              fontWeight: 'bold',
              color: 'var(--metal-gold-bright)',
              marginTop: '2px'
            }}
          >
            {characterName}
          </div>
        </div>

        {/* Attacks List */}
        <div style={{ marginTop: '12px' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--parchment-muted)', marginBottom: '6px' }}>Ataques:</div>
          {characterAttacks.length === 0 ? (
            <div style={{ fontSize: '0.78rem', color: '#7a6452', fontStyle: 'italic' }}>
              Nenhum ataque preenchido na planilha.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {characterAttacks.map((atq) => (
                <div
                  key={atq.id}
                  style={{
                    backgroundColor: '#1b130e',
                    border: '1px solid var(--metal-bronze)',
                    borderRadius: '4px',
                    padding: '6px 8px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}
                >
                  <div style={{ fontWeight: 'bold', color: 'var(--sand-pastel)', fontSize: '0.85rem' }}>
                    {atq.desc}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', fontSize: '0.75rem', color: 'var(--parchment-muted)' }}>
                    {atq.mods && (
                      <span style={{ backgroundColor: '#2a1f18', padding: '1px 6px', borderRadius: '3px', border: '1px solid #4a3425' }}>
                        ATQ/PA: <strong style={{ color: 'var(--metal-gold-bright)' }}>{atq.mods}</strong>
                      </span>
                    )}
                    {atq.alc && (
                      <span style={{ backgroundColor: '#2a1f18', padding: '1px 6px', borderRadius: '3px', border: '1px solid #4a3425' }}>
                        Alc. E: <strong style={{ color: 'var(--metal-gold-bright)' }}>{atq.alc}</strong>
                      </span>
                    )}
                  </div>
                </div>
              ))}
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
