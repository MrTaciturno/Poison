import React, { useState } from 'react';
import { exportPoiseFile } from '../../utils/poiseParser.js';

export default function PoiseSheetViewer({ sheet, currentUser, socket, onUpdateSheet, onClose }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(true);
  const [fields, setFields] = useState(sheet?.fields || []);
  const [zoom, setZoom] = useState(0.48);

  const stagingInventory = currentUser?.stagingInventory || [];
  const gridSlots = Array.from({ length: 12 }, (_, i) => stagingInventory[i] || null);

  const placedSheetItems = sheet?.equipmentGrid || [];

  if (!sheet) return null;

  const handleFieldChange = (fieldId, newValue) => {
    const updatedFields = fields.map((f) => {
      if (f.id === fieldId) {
        return { ...f, value: newValue };
      }
      return f;
    });
    setFields(updatedFields);

    const updatedSheet = { ...sheet, fields: updatedFields };
    onUpdateSheet(updatedSheet);
  };

  const handleBubbleToggle = (fieldId, index) => {
    const field = fields.find((f) => f.id === fieldId);
    if (!field || !Array.isArray(field.value)) return;

    const newValues = [...field.value];
    newValues[index] = !newValues[index];
    handleFieldChange(fieldId, newValues);
  };

  const handleSave = () => {
    const updatedSheet = { ...sheet, fields, equipmentGrid: placedSheetItems };
    exportPoiseFile(updatedSheet, `${sheet.name || 'personagem'}.poise`);
  };

  const handleWheelZoom = (e) => {
    if (e.ctrlKey || e.altKey) {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.08 : -0.08;
      setZoom((prev) => Math.min(Math.max(0.3, prev + delta), 2.2));
    }
  };

  // Drop item from 3x4 Staging Grid into 15x8 Sheet Grid at (col, row)
  const handleDropOnSheetGrid = (e, col, row) => {
    e.preventDefault();
    const dataStr = e.dataTransfer.getData('text/plain');
    if (!dataStr) return;

    try {
      const payload = JSON.parse(dataStr);
      const itemToPlace = payload.item || payload;
      const stagingIdx = payload.index;

      const newItem = {
        id: itemToPlace.id || `placed_${Date.now()}`,
        name: itemToPlace.name,
        imageUrl: itemToPlace.imageUrl,
        gridW: itemToPlace.gridW || 1,
        gridH: itemToPlace.gridH || 1,
        col,
        row
      };

      // Add to sheet equipmentGrid
      const updatedEquipmentGrid = [...placedSheetItems, newItem];
      const updatedSheet = { ...sheet, fields, equipmentGrid: updatedEquipmentGrid };
      onUpdateSheet(updatedSheet);

      // Remove from staging inventory if it came from staging
      if (stagingIdx !== undefined && stagingIdx >= 0) {
        const updatedStaging = [...stagingInventory];
        updatedStaging.splice(stagingIdx, 1);
        if (socket) {
          socket.emit('update_staging_inventory', updatedStaging);
        }
      }
    } catch (err) {
      console.error('Erro ao soltar item no grid da planilha:', err);
    }
  };

  // Remove item from 15x8 Sheet Grid and return to 3x4 Staging Inventory
  const handleRemoveFromSheetGrid = (itemIndex) => {
    const itemToRemove = placedSheetItems[itemIndex];
    if (!itemToRemove) return;

    // Remove from sheet equipmentGrid
    const updatedEquipmentGrid = [...placedSheetItems];
    updatedEquipmentGrid.splice(itemIndex, 1);
    const updatedSheet = { ...sheet, fields, equipmentGrid: updatedEquipmentGrid };
    onUpdateSheet(updatedSheet);

    // Add back to staging inventory
    const updatedStaging = [...stagingInventory, {
      id: itemToRemove.id,
      name: itemToRemove.name,
      label: itemToRemove.name,
      imageUrl: itemToRemove.imageUrl,
      gridW: itemToRemove.gridW,
      gridH: itemToRemove.gridH
    }];

    if (socket) {
      socket.emit('update_staging_inventory', updatedStaging);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: isExpanded ? '30px' : '75px',
        left: isExpanded ? '3vw' : '22vw',
        width: isExpanded ? '94vw' : '56vw',
        height: isExpanded ? '90vh' : '72vh',
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
          Planilha Poise: {sheet.name || 'Personagem'}
        </div>

        {/* Zoom Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--sand-pastel)' }}>Zoom:</span>
          <button onClick={() => setZoom((z) => Math.max(0.3, z - 0.1))} style={{ padding: '2px 7px' }}>-</button>
          <span style={{ minWidth: '45px', textAlign: 'center', fontWeight: 'bold', fontSize: '0.85rem' }}>{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom((z) => Math.min(2.2, z + 0.1))} style={{ padding: '2px 7px' }}>+</button>
          <button onClick={() => setZoom(0.48)} style={{ padding: '2px 7px' }}>Ajustar</button>
        </div>

        <div style={{ display: 'flex', gap: '6px' }}>
          <button onClick={() => setIsEditing(!isEditing)} style={{ fontSize: '0.8rem', padding: '4px 10px' }}>
            {isEditing ? 'Travar Edição' : 'Editar'}
          </button>
          <button onClick={handleSave} style={{ fontSize: '0.8rem', padding: '4px 10px' }}>Salvar .poise</button>
          <button onClick={() => setIsExpanded(!isExpanded)} style={{ fontSize: '0.8rem', padding: '4px 10px' }}>
            {isExpanded ? 'Reduzir' : 'Expandir'}
          </button>
          <button className="btn-danger" onClick={onClose} style={{ fontSize: '0.8rem', padding: '4px 10px' }}>
            Fechar
          </button>
        </div>
      </div>

      {/* Main Interactive Sheet Viewport & Bottom Staging Inventory */}
      <div
        onWheel={handleWheelZoom}
        style={{
          flex: 1,
          position: 'relative',
          overflow: 'auto',
          backgroundColor: '#120c09',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '16px 16px 24px 16px'
        }}
      >
        <div
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: 'top center',
            transition: 'transform 0.12s ease-out'
          }}
        >
          <div
            style={{
              position: 'relative',
              width: '1020px',
              height: '1320px',
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
                    title={f.name}
                  >
                    {f.value.map((checked, bIdx) => (
                      <div
                        key={bIdx}
                        onClick={() => isEditing && handleBubbleToggle(f.id, bIdx)}
                        style={{
                          width: '13px',
                          height: '13px',
                          borderRadius: '50%',
                          border: '1.5px solid #4a3425',
                          backgroundColor: checked ? '#8b322c' : 'transparent',
                          cursor: isEditing ? 'pointer' : 'default',
                          boxShadow: checked ? '0 0 4px #8b322c' : 'none'
                        }}
                      />
                    ))}
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
                  {isEditing ? (
                    <input
                      type={f.type === 'number' ? 'number' : 'text'}
                      value={f.value !== undefined ? f.value : ''}
                      onChange={(e) => handleFieldChange(f.id, e.target.value)}
                      style={{
                        width: '100%',
                        height: '100%',
                        background: 'rgba(255, 255, 255, 0.2)',
                        border: '1px solid rgba(166, 124, 82, 0.4)',
                        color: '#1a1410',
                        fontWeight: 'bold',
                        fontSize,
                        textAlign: f.align || 'center',
                        padding: '0 2px',
                        borderRadius: '2px'
                      }}
                      title={f.name}
                    />
                  ) : (
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: f.align === 'left' ? 'flex-start' : f.align === 'right' ? 'flex-end' : 'center',
                        color: '#2a1a0e',
                        fontWeight: 'bold',
                        fontSize
                      }}
                    >
                      {f.value}
                    </div>
                  )}
                </div>
              );
            })}

            {/* 15x8 Interactive Sheet Inventory Overlay Grid */}
            <div
              style={{
                position: 'absolute',
                left: '6.2%',
                top: '52.5%',
                width: '87.6%',
                height: '36.8%',
                display: 'grid',
                gridTemplateColumns: 'repeat(15, 1fr)',
                gridTemplateRows: 'repeat(8, 1fr)',
                zIndex: 10
              }}
            >
              {/* Render 15x8 = 120 slot drop targets */}
              {Array.from({ length: 120 }).map((_, slotIdx) => {
                const col = slotIdx % 15;
                const row = Math.floor(slotIdx / 15);
                return (
                  <div
                    key={slotIdx}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleDropOnSheetGrid(e, col, row)}
                    style={{
                      border: '0.5px dashed rgba(166, 124, 82, 0.25)',
                      boxSizing: 'border-box'
                    }}
                  />
                );
              })}

              {/* Render Placed Sheet Items */}
              {placedSheetItems.map((item, idx) => {
                const left = `${(item.col * 100) / 15}%`;
                const top = `${(item.row * 100) / 8}%`;
                const width = `${(item.gridW * 100) / 15}%`;
                const height = `${(item.gridH * 100) / 8}%`;

                return (
                  <div
                    key={item.id || idx}
                    onClick={() => handleRemoveFromSheetGrid(idx)}
                    title={`${item.name} - Clique para devolver ao grid temporário`}
                    style={{
                      position: 'absolute',
                      left,
                      top,
                      width,
                      height,
                      border: '1.5px solid var(--metal-gold)',
                      backgroundColor: 'rgba(42, 31, 24, 0.88)',
                      borderRadius: '3px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.7)',
                      zIndex: 15,
                      padding: '1px',
                      overflow: 'hidden'
                    }}
                  >
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      style={{ maxHeight: '75%', maxWidth: '95%', objectFit: 'contain' }}
                    />
                    <span style={{ fontSize: '0.58rem', fontWeight: 'bold', color: 'var(--metal-gold-bright)', whiteSpace: 'nowrap' }}>
                      {item.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Lower Portion: 3x4 Temporary Staging Inventory Grid */}
        <div
          style={{
            marginTop: '24px',
            width: '100%',
            maxWidth: '680px',
            backgroundColor: 'var(--bg-panel-wood)',
            border: '2px solid var(--metal-gold)',
            borderRadius: '8px',
            padding: '12px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.6)'
          }}
        >
          <div style={{ fontFamily: 'var(--font-title)', fontSize: '1rem', color: 'var(--metal-gold-bright)', marginBottom: '4px', textAlign: 'center' }}>
            Grid Temporário de Equipamentos do Personagem (3x4)
          </div>
          <p style={{ fontSize: '0.76rem', color: 'var(--parchment-muted)', textAlign: 'center', marginBottom: '8px' }}>
            Arraste um item daqui para as regiões da planilha acima (Destra, Carga 0, Traje, Sinistra, Carga 1, 2 ou 3).
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '8px',
              backgroundColor: '#1b130e',
              padding: '8px',
              borderRadius: '6px'
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
                style={{
                  height: '70px',
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
              >
                {item ? (
                  <>
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      style={{ maxHeight: '42px', maxWidth: '100%', objectFit: 'contain' }}
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                    <div style={{ fontSize: '0.68rem', fontWeight: 'bold', color: 'var(--metal-gold-bright)' }}>
                      {item.name} ({item.gridW}x{item.gridH})
                    </div>
                  </>
                ) : (
                  <span style={{ fontSize: '0.65rem', color: '#5a4636' }}>Slot {idx + 1}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
