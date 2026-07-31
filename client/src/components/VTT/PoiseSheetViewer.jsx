import React, { useState } from 'react';
import { exportPoiseFile } from '../../utils/poiseParser.js';

export default function PoiseSheetViewer({ sheet, currentUser, socket, onUpdateSheet, onClose }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(true);
  const [fields, setFields] = useState(sheet?.fields || []);
  const [zoom, setZoom] = useState(0.48);

  const stagingInventory = currentUser?.stagingInventory || [];
  const gridSlots = Array.from({ length: 12 }, (_, i) => stagingInventory[i] || null);

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
    const updatedSheet = { ...sheet, fields };
    exportPoiseFile(updatedSheet, `${sheet.name || 'personagem'}.poise`);
  };

  const handleWheelZoom = (e) => {
    if (e.ctrlKey || e.altKey) {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.08 : -0.08;
      setZoom((prev) => Math.min(Math.max(0.3, prev + delta), 2.2));
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
          <div style={{ fontFamily: 'var(--font-title)', fontSize: '1rem', color: 'var(--metal-gold-bright)', marginBottom: '6px', textAlign: 'center' }}>
            Grid Temporário de Equipamentos do Personagem (3x4)
          </div>
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
                style={{
                  height: '70px',
                  backgroundColor: item ? '#2a1f18' : '#120d09',
                  border: item ? '1.5px solid var(--metal-gold)' : '1px dashed var(--metal-bronze)',
                  borderRadius: '4px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '2px'
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
