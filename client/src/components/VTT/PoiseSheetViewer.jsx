import React, { useState } from 'react';
import { exportPoiseFile } from '../../utils/poiseParser.js';

export default function PoiseSheetViewer({ sheet, onUpdateSheet, onClose }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isEditing, setIsEditing] = useState(true);
  const [fields, setFields] = useState(sheet.fields || []);
  const [zoom, setZoom] = useState(1.0);

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
      const delta = e.deltaY < 0 ? 0.1 : -0.1;
      setZoom((prev) => Math.min(Math.max(0.4, prev + delta), 2.5));
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: isExpanded ? '30px' : '70px',
        left: isExpanded ? '3vw' : '15vw',
        width: isExpanded ? '94vw' : '70vw',
        height: isExpanded ? '90vh' : '80vh',
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
          padding: '10px 16px',
          backgroundColor: 'var(--bg-panel-wood)',
          borderBottom: '2px solid var(--metal-bronze)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap'
        }}
      >
        <div style={{ fontFamily: 'var(--font-title)', fontSize: '1.2rem', color: 'var(--metal-gold-bright)' }}>
          Planilha Poise: {sheet.name || 'Personagem'}
        </div>

        {/* Zoom Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--sand-pastel)' }}>Zoom:</span>
          <button onClick={() => setZoom((z) => Math.max(0.4, z - 0.1))} style={{ padding: '4px 8px' }}>-</button>
          <span style={{ minWidth: '45px', textAlign: 'center', fontWeight: 'bold' }}>{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom((z) => Math.min(2.5, z + 0.1))} style={{ padding: '4px 8px' }}>+</button>
          <button onClick={() => setZoom(1.0)} style={{ padding: '4px 8px' }}>Reset</button>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => setIsEditing(!isEditing)}>
            {isEditing ? 'Travar Edição' : 'Habilitar Edição'}
          </button>
          <button onClick={handleSave}>Salvar .poise</button>
          <button onClick={() => setIsExpanded(!isExpanded)}>
            {isExpanded ? 'Reduzir Janela' : 'Expandir Janela'}
          </button>
          <button className="btn-danger" onClick={onClose}>
            Fechar Planilha
          </button>
        </div>
      </div>

      {/* Main Interactive Sheet Viewport (Scrollable with Proportional Aspect Ratio) */}
      <div
        onWheel={handleWheelZoom}
        style={{
          flex: 1,
          position: 'relative',
          overflow: 'auto',
          backgroundColor: '#120c09',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
          padding: '32px'
        }}
      >
        <div
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: 'top center',
            transition: 'transform 0.15s ease-out'
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
      </div>
    </div>
  );
}
