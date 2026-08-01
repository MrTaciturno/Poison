import React, { useState, useRef } from 'react';
import { exportPoiseFile } from '../../utils/poiseParser.js';

const CELL_W = 6.70; // Base width percentage for 1x1 grid cell (per user measurement)
const CELL_H = 5.177; // Base height percentage for 1x1 grid cell (maintains 1:1 square ratio on 1020x1320 container)

const gridZones = [
  { id: 'destra', name: 'Destra', x: 5.8, y: 54.5, w: 3 * CELL_W, h: 4 * CELL_H, cols: 3, rows: 4 },
  { id: 'carga_l', name: 'Carga (Esquerda)', x: 23.6, y: 54.5, w: 3 * CELL_W, h: 4 * CELL_H, cols: 3, rows: 4 },
  { id: 'traje', name: 'Traje', x: 41.0, y: 54.5, w: 3 * CELL_W, h: 4 * CELL_H, cols: 3, rows: 4 },
  { id: 'carga_r', name: 'Carga (Direita)', x: 58.8, y: 54.5, w: 3 * CELL_W, h: 4 * CELL_H, cols: 3, rows: 4 },
  { id: 'sinistra', name: 'Sinistra', x: 76.4, y: 54.5, w: 3 * CELL_W, h: 4 * CELL_H, cols: 3, rows: 4 },
  { id: 'carga_1', name: 'Carga 1', x: 5.8, y: 72.54, w: 5 * CELL_W, h: 4 * CELL_H, cols: 5, rows: 4 },
  { id: 'carga_2', name: 'Carga 2', x: 35.2, y: 72.54, w: 5 * CELL_W, h: 4 * CELL_H, cols: 5, rows: 4 },
  { id: 'carga_3', name: 'Carga 3', x: 64.8, y: 72.54, w: 5 * CELL_W, h: 4 * CELL_H, cols: 5, rows: 4 }
];

export default function PoiseSheetViewer({ sheet, currentUser, socket, onUpdateSheet, onClose }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [fields, setFields] = useState(sheet?.fields || []);
  const [items, setItems] = useState(sheet?.items || []);
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [zoom, setZoom] = useState(0.48);
  const [snapPreview, setSnapPreview] = useState(null);

  const stagingInventory = (currentUser?.stagingInventory || []).slice(0, 3);
  const stagingSlots = Array.from({ length: 3 }, (_, i) => stagingInventory[i] || null);

  const sheetRef = useRef(null);

  if (!sheet) return null;

  const handleFieldChange = (fieldId, newValue) => {
    const updatedFields = fields.map((f) => {
      if (f.id === fieldId) {
        return { ...f, value: newValue };
      }
      return f;
    });
    setFields(updatedFields);
    onUpdateSheet({ ...sheet, fields: updatedFields, items });
  };

  const handleBubbleToggle = (fieldId, index) => {
    const field = fields.find((f) => f.id === fieldId);
    if (!field || !Array.isArray(field.value)) return;

    const newValues = [...field.value];
    newValues[index] = !newValues[index];
    handleFieldChange(fieldId, newValues);
  };

  const handleSave = () => {
    const updatedSheet = { ...sheet, fields, items };
    exportPoiseFile(updatedSheet, `${sheet.name || 'personagem'}.poise`);
  };

  const handleClearValues = () => {
    if (!window.confirm('Deseja limpar todos os dados preenchidos da planilha?')) return;
    const clearedFields = fields.map((f) => {
      if (f.type === 'checkbox') return { ...f, value: false };
      if (f.type === 'bubble-group') return { ...f, value: Array(f.bubblesCount || 6).fill(false) };
      return { ...f, value: '' };
    });
    setFields(clearedFields);
    setItems([]);
    onUpdateSheet({ ...sheet, fields: clearedFields, items: [] });
  };

  const handleWheelZoom = (e) => {
    if (e.ctrlKey || e.altKey) {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.08 : -0.08;
      setZoom((prev) => Math.min(Math.max(0.3, prev + delta), 2.2));
    }
  };

  // Drop item on Sheet (From Staging Grid OR moving item inside Sheet Inventory)
  const handleDropOnSheet = (e) => {
    e.preventDefault();
    setSnapPreview(null);
    const dataStr = e.dataTransfer.getData('text/plain');
    if (!dataStr || !sheetRef.current) return;

    try {
      const payload = JSON.parse(dataStr);
      const itemToPlace = payload.item || payload;
      const source = payload.source || 'staging';
      const stagingIdx = payload.index;

      const rect = sheetRef.current.getBoundingClientRect();
      const dropX = ((e.clientX - rect.left) / rect.width) * 100;
      const dropY = ((e.clientY - rect.top) / rect.height) * 100;

      // Find matching grid zone
      let foundZone = null;
      for (const zone of gridZones) {
        if (dropX >= zone.x && dropX <= zone.x + zone.w && dropY >= zone.y && dropY <= zone.y + zone.h) {
          foundZone = zone;
          break;
        }
      }

      const cols = itemToPlace.cols || itemToPlace.gridW || 1;
      const rows = itemToPlace.rows || itemToPlace.gridH || 1;

      let updatedItemProps;
      if (foundZone) {
        const cellW_zone = foundZone.w / foundZone.cols;
        const cellH_zone = foundZone.h / foundZone.rows;
        let col = Math.floor((dropX - foundZone.x) / cellW_zone);
        let row = Math.floor((dropY - foundZone.y) / cellH_zone);

        col = Math.max(0, Math.min(foundZone.cols - cols, col));
        row = Math.max(0, Math.min(foundZone.rows - rows, row));

        updatedItemProps = {
          x: parseFloat((foundZone.x + col * cellW_zone).toFixed(2)),
          y: parseFloat((foundZone.y + row * cellH_zone).toFixed(2)),
          w: parseFloat((cols * CELL_W).toFixed(2)),
          h: parseFloat((rows * CELL_H).toFixed(2)),
          snapped: true,
          zoneId: foundZone.id,
          col,
          row
        };
      } else {
        updatedItemProps = {
          x: Math.max(2, Math.min(80, dropX)),
          y: Math.max(2, Math.min(80, dropY)),
          w: parseFloat((cols * CELL_W).toFixed(2)),
          h: parseFloat((rows * CELL_H).toFixed(2)),
          snapped: false,
          zoneId: null,
          col: 0,
          row: 0
        };
      }

      let updatedItems;
      if (source === 'sheet' && itemToPlace.id) {
        // Move existing item inside sheet
        updatedItems = items.map((it) => (it.id === itemToPlace.id ? { ...it, ...updatedItemProps } : it));
      } else {
        // Add new item from staging grid
        const newItem = {
          id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          name: itemToPlace.name,
          desc: itemToPlace.desc || '',
          cols,
          rows,
          imageUrl: itemToPlace.imageUrl,
          ...updatedItemProps
        };
        updatedItems = [...items, newItem];
      }

      setItems(updatedItems);
      onUpdateSheet({ ...sheet, fields, items: updatedItems });

      // If came from staging grid, remove from staging inventory
      if (source === 'staging' && stagingIdx !== undefined && stagingIdx >= 0) {
        const updatedStaging = [...stagingInventory];
        updatedStaging.splice(stagingIdx, 1);
        if (socket) {
          socket.emit('update_staging_inventory', updatedStaging);
        }
      }
    } catch (err) {
      console.error('Erro ao soltar item na planilha:', err);
    }
  };

  const handleDragOverSheet = (e) => {
    e.preventDefault();
    if (!sheetRef.current) return;
    const rect = sheetRef.current.getBoundingClientRect();
    const dropX = ((e.clientX - rect.left) / rect.width) * 100;
    const dropY = ((e.clientY - rect.top) / rect.height) * 100;

    for (const zone of gridZones) {
      if (dropX >= zone.x && dropX <= zone.x + zone.w && dropY >= zone.y && dropY <= zone.y + zone.h) {
        const cellW_zone = zone.w / zone.cols;
        const cellH_zone = zone.h / zone.rows;
        let col = Math.floor((dropX - zone.x) / cellW_zone);
        let row = Math.floor((dropY - zone.y) / cellH_zone);
        col = Math.max(0, Math.min(zone.cols - 1, col));
        row = Math.max(0, Math.min(zone.rows - 1, row));

        setSnapPreview({
          x: zone.x + col * cellW_zone,
          y: zone.y + row * cellH_zone,
          w: CELL_W,
          h: CELL_H
        });
        return;
      }
    }
    setSnapPreview(null);
  };

  const handleDetachItem = (itemId) => {
    const updatedItems = items.filter((it) => it.id !== itemId);
    const itemToDetach = items.find((it) => it.id === itemId);

    setItems(updatedItems);
    onUpdateSheet({ ...sheet, fields, items: updatedItems });

    if (itemToDetach && stagingInventory.length < 3) {
      const updatedStaging = [...stagingInventory, {
        id: itemToDetach.id,
        name: itemToDetach.name,
        label: itemToDetach.name,
        imageUrl: itemToDetach.imageUrl,
        gridW: itemToDetach.cols || 1,
        gridH: itemToDetach.rows || 1
      }].slice(0, 3);

      if (socket) {
        socket.emit('update_staging_inventory', updatedStaging);
      }
    }
    setSelectedItemId(null);
  };

  const handleDeleteItem = (itemId) => {
    const updatedItems = items.filter((it) => it.id !== itemId);
    setItems(updatedItems);
    onUpdateSheet({ ...sheet, fields, items: updatedItems });
    if (selectedItemId === itemId) setSelectedItemId(null);
  };

  const selectedItem = items.find((it) => it.id === selectedItemId);

  return (
    <div
      style={{
        position: 'fixed',
        top: isExpanded ? '20px' : '65px',
        left: isExpanded ? '2vw' : '10vw',
        width: isExpanded ? '96vw' : '80vw',
        height: isExpanded ? '92vh' : '82vh',
        zIndex: 100,
        backgroundColor: 'var(--bg-dark-wood)',
        border: '3px solid var(--metal-gold)',
        borderRadius: '12px',
        boxShadow: 'var(--box-shadow-heavy)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      {/* Header Controls */}
      <div
        style={{
          padding: '8px 14px',
          backgroundColor: 'var(--bg-panel-wood)',
          borderBottom: '2px solid var(--metal-bronze)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '10px',
          flexWrap: 'wrap'
        }}
      >
        <div style={{ fontFamily: 'var(--font-title)', fontSize: '1.1rem', color: 'var(--metal-gold-bright)' }}>
          Editor de Planilha Poise: {sheet.name || 'Personagem'}
        </div>

        {/* Zoom Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--sand-pastel)' }}>Zoom:</span>
          <button onClick={() => setZoom((z) => Math.max(0.3, z - 0.1))} style={{ padding: '2px 7px' }}>-</button>
          <span style={{ minWidth: '45px', textAlign: 'center', fontWeight: 'bold', fontSize: '0.85rem' }}>{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom((z) => Math.min(2.2, z + 0.1))} style={{ padding: '2px 7px' }}>+</button>
          <button onClick={() => setZoom(0.48)} style={{ padding: '2px 7px' }}>Ajustar</button>
          <button onClick={() => setZoom(1.0)} style={{ padding: '2px 7px' }}>100%</button>
        </div>

        <div style={{ display: 'flex', gap: '6px' }}>
          <button onClick={handleSave} style={{ fontSize: '0.8rem', padding: '4px 10px' }}>Salvar Ficha (.poise)</button>
          <button onClick={() => window.print()} style={{ fontSize: '0.8rem', padding: '4px 10px' }}>Exportar PDF</button>
          <button onClick={handleClearValues} className="btn-danger" style={{ fontSize: '0.8rem', padding: '4px 10px' }}>Limpar Dados</button>
          <button onClick={() => setIsExpanded(!isExpanded)} style={{ fontSize: '0.8rem', padding: '4px 10px' }}>
            {isExpanded ? 'Reduzir' : 'Expandir'}
          </button>
          <button className="btn-danger" onClick={onClose} style={{ fontSize: '0.8rem', padding: '4px 10px' }}>
            Fechar
          </button>
        </div>
      </div>

      {/* Body: Left Sidebar (Staging & Inspector) + Right Canvas Viewport */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Editor Sidebar Panel */}
        <div
          style={{
            width: '280px',
            flexShrink: 0,
            backgroundColor: '#1b130e',
            borderRight: '2px solid var(--metal-bronze)',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            overflowY: 'auto'
          }}
        >
          {/* ALWAYS VISIBLE 3-ITEM TEMPORARY GRID */}
          <div className="panel-section">
            <div className="panel-section-title">Grid Temporário (3 Itens)</div>
            <p style={{ fontSize: '0.76rem', color: 'var(--parchment-muted)', marginBottom: '8px' }}>
              Arraste daqui para as áreas da planilha (Destra, Traje, Sinistra, Carga 1, 2 ou 3).
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
              {stagingSlots.map((item, idx) => (
                <div
                  key={idx}
                  draggable={!!item}
                  onDragStart={(e) => {
                    if (item) {
                      e.dataTransfer.setData('text/plain', JSON.stringify({ item, source: 'staging', index: idx }));
                    }
                  }}
                  style={{
                    height: '75px',
                    backgroundColor: item ? '#2a1f18' : '#120d09',
                    border: item ? '1.5px solid var(--metal-gold)' : '1px dashed var(--metal-bronze)',
                    borderRadius: '4px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '2px',
                    cursor: item ? 'grab' : 'default'
                  }}
                  title={item ? `${item.name} - Arraste para a planilha` : `Slot ${idx + 1}`}
                >
                  {item ? (
                    <>
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        style={{ maxHeight: '42px', maxWidth: '100%', objectFit: 'contain' }}
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                      <div style={{ fontSize: '0.64rem', fontWeight: 'bold', color: 'var(--metal-gold-bright)', textAlign: 'center' }}>
                        {item.name}
                      </div>
                    </>
                  ) : (
                    <span style={{ fontSize: '0.65rem', color: '#5a4636' }}>Slot {idx + 1}</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Selected Item Inspector Panel */}
          {selectedItem && (
            <div className="panel-section" style={{ borderColor: 'var(--metal-gold)' }}>
              <div className="panel-section-title">Item Selecionado</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--sand-pastel)' }}>Nome do Item:</label>
                  <input
                    type="text"
                    value={selectedItem.name || ''}
                    onChange={(e) => {
                      const newName = e.target.value;
                      const updated = items.map((it) => (it.id === selectedItem.id ? { ...it, name: newName } : it));
                      setItems(updated);
                      onUpdateSheet({ ...sheet, fields, items: updated });
                    }}
                    style={{ width: '100%', marginTop: '2px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--sand-pastel)' }}>Descrição/Propriedades:</label>
                  <textarea
                    rows="3"
                    value={selectedItem.desc || ''}
                    onChange={(e) => {
                      const newDesc = e.target.value;
                      const updated = items.map((it) => (it.id === selectedItem.id ? { ...it, desc: newDesc } : it));
                      setItems(updated);
                      onUpdateSheet({ ...sheet, fields, items: updated });
                    }}
                    style={{ width: '100%', marginTop: '2px', resize: 'vertical' }}
                    placeholder="Ex: Dano, peso..."
                  />
                </div>

                <div style={{ fontSize: '0.75rem', color: 'var(--parchment-muted)' }}>
                  Tamanho: {selectedItem.cols}x{selectedItem.rows} | Status: {selectedItem.snapped ? `Acoplado (${selectedItem.zoneId})` : 'Flutuante'}
                </div>

                <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                  <button onClick={() => handleDetachItem(selectedItem.id)} style={{ flex: 1, fontSize: '0.78rem' }}>
                    Desacoplar
                  </button>
                  <button onClick={() => handleDeleteItem(selectedItem.id)} className="btn-danger" style={{ flex: 1, fontSize: '0.78rem' }}>
                    Excluir
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Main Canvas Viewport (Scrolls in X & Y without hiding behind sidebar or showing unneeded vertical scroll) */}
        <div
          onWheel={handleWheelZoom}
          style={{
            flex: 1,
            minWidth: 0,
            position: 'relative',
            overflow: 'auto',
            backgroundColor: '#120c09',
            padding: '24px'
          }}
        >
          {/* Scaled Sizing Outer Box (Original 1020px x 1320px paper container dimensions - no vertical stretch!) */}
          <div
            style={{
              width: `${1020 * zoom}px`,
              height: `${1320 * zoom}px`,
              margin: '0 auto',
              position: 'relative',
              flexShrink: 0,
              transition: 'width 0.12s ease-out, height 0.12s ease-out'
            }}
          >
            {/* Sheet Canvas Container */}
            <div
              ref={sheetRef}
              onDragOver={handleDragOverSheet}
              onDrop={handleDropOnSheet}
              style={{
                position: 'relative',
                width: '1020px',
                height: '1320px',
                transform: `scale(${zoom})`,
                transformOrigin: 'top left',
                transition: 'transform 0.12s ease-out',
                backgroundImage: sheet.bgImage ? `url(${sheet.bgImage})` : 'none',
                backgroundSize: '100% 100%',
                backgroundRepeat: 'no-repeat',
                backgroundColor: '#2a1f18',
                boxShadow: '0 12px 40px rgba(0,0,0,0.85)',
                borderRadius: '4px'
              }}
            >
              {/* Dynamically Overlay All Poise Fields by Percentage (x, y, w, h) */}
              {fields.map((f) => {
                const left = `${f.x}%`;
                const top = `${f.y}%`;
                const width = `${f.w}%`;
                const height = `${f.h}%`;
                const fontSize = f.fontSize ? `${f.fontSize * 0.8}px` : '13px';
                const fieldName = f.name === 'Grupo de EXP' ? 'Pontos de Ação' : f.name || 'Pontos de Ação';

                if (f.type === 'checkbox') {
                  return (
                    <div
                      key={f.id}
                      style={{
                        position: 'absolute',
                        left,
                        top,
                        width,
                        height,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      title={fieldName}
                    >
                      <div
                        onClick={() => handleFieldChange(f.id, !f.value)}
                        style={{
                          width: '62px',
                          height: '62px',
                          maxWidth: '100%',
                          maxHeight: '100%',
                          borderRadius: '50%',
                          border: '2px solid #4a3425',
                          backgroundColor: f.value ? '#8b322c' : 'transparent',
                          cursor: 'pointer',
                          boxShadow: f.value ? '0 0 8px #8b322c' : 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                  );
                }

                if (f.type === 'bubble-group' && Array.isArray(f.value)) {
                  return (
                    <div
                      key={f.id}
                      style={{
                        position: 'absolute',
                        left,
                        top,
                        width,
                        height,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-around'
                      }}
                      title={fieldName}
                    >
                      {f.value.map((checked, bIdx) => (
                        <div
                          key={bIdx}
                          onClick={() => handleBubbleToggle(f.id, bIdx)}
                          style={{
                            width: '62px',
                            height: '62px',
                            maxWidth: '100%',
                            maxHeight: '100%',
                            borderRadius: '50%',
                            border: '2px solid #4a3425',
                            backgroundColor: checked ? '#8b322c' : 'transparent',
                            cursor: 'pointer',
                            boxShadow: checked ? '0 0 8px #8b322c' : 'none',
                            boxSizing: 'border-box'
                          }}
                        />
                      ))}
                    </div>
                  );
                }

                const isTextarea = f.type === 'textarea' || f.id === 'nome_desc' || f.id === 'modificadores';

                if (isTextarea) {
                  return (
                    <div
                      key={f.id}
                      style={{
                        position: 'absolute',
                        left,
                        top,
                        width,
                        height
                      }}
                    >
                      <textarea
                        value={f.value !== undefined ? f.value : ''}
                        onChange={(e) => handleFieldChange(f.id, e.target.value)}
                        style={{
                          width: '100%',
                          height: '100%',
                          background: 'rgba(255, 255, 255, 0.18)',
                          border: '1px solid rgba(166, 124, 82, 0.4)',
                          color: '#1a1410',
                          fontWeight: 'bold',
                          fontSize,
                          textAlign: 'justify',
                          padding: '4px 6px',
                          borderRadius: '2px',
                          resize: 'none',
                          outline: 'none',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                          boxSizing: 'border-box'
                        }}
                        title={fieldName}
                      />
                    </div>
                  );
                }

                return (
                  <div
                    key={f.id}
                    style={{
                      position: 'absolute',
                      left,
                      top,
                      width,
                      height,
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    <input
                      type={f.type === 'number' ? 'number' : 'text'}
                      value={f.value !== undefined ? f.value : ''}
                      onChange={(e) => handleFieldChange(f.id, e.target.value)}
                      style={{
                        width: '100%',
                        height: '100%',
                        background: 'rgba(255, 255, 255, 0.18)',
                        border: '1px solid rgba(166, 124, 82, 0.4)',
                        color: '#1a1410',
                        fontWeight: 'bold',
                        fontSize,
                        textAlign: f.align || 'center',
                        padding: '0 2px',
                        borderRadius: '2px'
                      }}
                      title={fieldName}
                    />
                  </div>
                );
              })}

              {/* Snap Preview Box when Dragging Over Grid Zones */}
              {snapPreview && (
                <div
                  style={{
                    position: 'absolute',
                    left: `${snapPreview.x}%`,
                    top: `${snapPreview.y}%`,
                    width: `${snapPreview.w}%`,
                    height: `${snapPreview.h}%`,
                    border: '2px dashed var(--metal-gold-bright)',
                    backgroundColor: 'rgba(212, 175, 55, 0.25)',
                    borderRadius: '4px',
                    pointerEvents: 'none',
                    zIndex: 25
                  }}
                />
              )}

              {/* Render Snapped & Placed Equipment Card Items */}
              {items.map((item) => (
                <div
                  key={item.id}
                  draggable={true}
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/plain', JSON.stringify({ item, source: 'sheet', itemId: item.id }));
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedItemId(item.id);
                  }}
                  style={{
                    position: 'absolute',
                    left: `${item.x}%`,
                    top: `${item.y}%`,
                    width: `${(item.cols || item.gridW || 1) * CELL_W}%`,
                    height: `${(item.rows || item.gridH || 1) * CELL_H}%`,
                    backgroundImage: item.imageUrl ? `url(${item.imageUrl})` : 'none',
                    backgroundColor: 'rgba(42, 31, 24, 0.9)',
                    backgroundSize: '100% 100%',
                    border: selectedItemId === item.id ? '2px solid var(--metal-gold-bright)' : '1.5px solid var(--metal-bronze)',
                    borderRadius: '4px',
                    boxShadow: selectedItemId === item.id ? '0 0 12px var(--metal-gold)' : '0 4px 12px rgba(0,0,0,0.6)',
                    cursor: 'grab',
                    zIndex: 20,
                    padding: '2px',
                    boxSizing: 'border-box'
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      top: '4%',
                      left: '6%',
                      width: '88%',
                      fontSize: '0.72rem',
                      fontWeight: 'bold',
                      color: '#1a1410',
                      textAlign: 'center',
                      lineHeight: '1.1',
                      wordBreak: 'break-word',
                      pointerEvents: 'none'
                    }}
                  >
                    {item.name}
                  </div>

                  {item.desc && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '30%',
                        left: '8%',
                        width: '84%',
                        height: '60%',
                        fontSize: '0.62rem',
                        color: '#2a1f18',
                        overflow: 'hidden',
                        lineHeight: '1.1',
                        textAlign: 'left',
                        pointerEvents: 'none'
                      }}
                    >
                      {item.desc}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
