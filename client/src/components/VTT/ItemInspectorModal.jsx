import React, { useState } from 'react';

export default function ItemInspectorModal({ item, currentUser, onClose, onUpdateItem }) {
  if (!item) return null;

  const isMasterOrCoMaster = Boolean(currentUser?.isMaster || currentUser?.isCoMaster);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    ...item,
    attacks: item.attacks && item.attacks.length > 0 ? item.attacks : [{ name: '', dice: '', pa: '' }]
  });

  const handleSave = () => {
    if (onUpdateItem) {
      onUpdateItem(formData);
    }
    setIsEditing(false);
  };

  const handleAddAttack = () => {
    if (formData.attacks.length < 3) {
      setFormData({
        ...formData,
        attacks: [...formData.attacks, { name: '', dice: '', pa: '' }]
      });
    }
  };

  const handleUpdateAttack = (index, field, value) => {
    const updatedAttacks = [...formData.attacks];
    updatedAttacks[index] = { ...updatedAttacks[index], [field]: value };
    setFormData({ ...formData, attacks: updatedAttacks });
  };

  const handleRemoveAttack = (index) => {
    const updatedAttacks = formData.attacks.filter((_, i) => i !== index);
    setFormData({ ...formData, attacks: updatedAttacks });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        setFormData({ ...formData, imageUrl: uploadEvent.target.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const curDur = formData.dur ?? 10;
  const maxDur = formData.maxDur ?? 10;
  const durPercent = Math.max(0, Math.min(100, (curDur / maxDur) * 100));

  const compactInputStyle = {
    boxSizing: 'border-box',
    padding: '4px 8px',
    fontSize: '0.8rem',
    height: '30px'
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '520px',
          maxWidth: '92vw',
          maxHeight: '90vh',
          overflowY: 'auto',
          backgroundColor: '#1b130e',
          border: '2px solid var(--metal-gold)',
          borderRadius: '8px',
          padding: '18px',
          color: 'var(--parchment-base)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.8)',
          position: 'relative',
          boxSizing: 'border-box'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--metal-bronze)', paddingBottom: '8px', marginBottom: '12px' }}>
          <div style={{ fontFamily: 'var(--font-title)', fontSize: '1.2rem', color: 'var(--metal-gold-bright)' }}>
            {isEditing ? 'Editar Item no Arsenal' : item.name}
          </div>
          <button className="sidebar-close-btn" onClick={onClose} style={{ padding: '4px 8px' }}>
            Fechar
          </button>
        </div>

        {/* View Mode */}
        {!isEditing ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Top row: Image & Primary info */}
            <div style={{ display: 'flex', gap: '14px' }}>
              <div
                style={{
                  width: '100px',
                  height: '100px',
                  backgroundColor: '#120c09',
                  border: '1px solid var(--metal-bronze)',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  flexShrink: 0
                }}
              >
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                ) : (
                  <span style={{ fontSize: '0.75rem', color: 'var(--parchment-muted)' }}>Sem Imagem</span>
                )}
              </div>

              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.85rem' }}>
                <div><strong>Tipo:</strong> {item.type || 'Item'}</div>
                <div><strong>iTAM (Grid):</strong> <code>{item.iTam || '1x1'}</code></div>
                <div><strong>Valor (Tesouros):</strong> {item.val ?? 0}</div>
                {item.preReq && <div><strong>Pré-Req:</strong> {item.preReq}</div>}
                {item.modI && <div><strong>Mod.I:</strong> {item.modI}</div>}
              </div>
            </div>

            {/* Durability Bar */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '3px' }}>
                <span>Durabilidade (DUR):</span>
                <span>{curDur} / {maxDur}</span>
              </div>
              <div style={{ width: '100%', height: '8px', backgroundColor: '#120c09', border: '1px solid var(--metal-bronze)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${durPercent}%`, height: '100%', backgroundColor: durPercent > 30 ? '#486e42' : '#8b322c', transition: 'width 0.3s ease' }} />
              </div>
            </div>

            {/* Attack Modes */}
            {item.attacks && item.attacks.filter(a => a.name || a.dice).length > 0 && (
              <div style={{ backgroundColor: '#120c09', padding: '8px', borderRadius: '6px', border: '1px solid var(--metal-bronze)' }}>
                <div style={{ fontWeight: 'bold', fontSize: '0.82rem', color: 'var(--sand-pastel)', marginBottom: '4px' }}>Modos de Ataque (Atq.D x PA):</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  {item.attacks.filter(a => a.name || a.dice).map((atk, idx) => (
                    <div key={idx} style={{ fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #2a1f18', paddingBottom: '2px' }}>
                      <span><strong>{atk.name || `Ataque ${idx + 1}`}:</strong> {atk.dice || '1d6'}</span>
                      <span style={{ color: 'var(--metal-gold-bright)' }}>{atk.pa || 1} PA</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Secondary Attributes */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', fontSize: '0.78rem', backgroundColor: '#120c09', padding: '8px', borderRadius: '6px' }}>
              <div><strong>Alc.E:</strong> {item.alcE || '-'}</div>
              <div><strong>Recarga:</strong> {item.recarga || '-'}</div>
              <div><strong>BLOQ:</strong> {item.bloq || '-'}</div>
            </div>

            {/* Description */}
            {item.description && (
              <div style={{ fontSize: '0.82rem', textAlign: 'justify', lineHeight: '1.35', backgroundColor: '#120c09', padding: '8px', borderRadius: '6px', border: '1px dashed var(--metal-bronze)' }}>
                <strong>Descrição:</strong>
                <p style={{ marginTop: '3px', whiteSpace: 'pre-wrap' }}>{item.description}</p>
              </div>
            )}

            {/* Actions for Master */}
            {isMasterOrCoMaster && (
              <button
                className="btn-primary"
                onClick={() => setIsEditing(true)}
                style={{ marginTop: '6px', width: '100%', padding: '6px', fontSize: '0.8rem' }}
              >
                Editar Informações do Item
              </button>
            )}
          </div>
        ) : (
          /* Edit Form */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.82rem' }}>
            <div style={{ display: 'flex', gap: '6px' }}>
              <input
                type="text"
                placeholder="Nome do Item"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                style={{ ...compactInputStyle, flex: 1 }}
                required
              />
              <input
                type="text"
                placeholder="iTAM (1x1)"
                value={formData.iTam}
                onChange={(e) => setFormData({ ...formData, iTam: e.target.value })}
                style={{ ...compactInputStyle, width: '80px' }}
                required
              />
            </div>

            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                style={{ ...compactInputStyle, flex: 1 }}
              >
                <option value="Arma">Arma</option>
                <option value="Escudo">Escudo</option>
                <option value="Traje">Traje / Armadura</option>
                <option value="Consumível">Consumível</option>
                <option value="Acessório">Acessório</option>
                <option value="Outro">Outro</option>
              </select>

              <input
                type="number"
                placeholder="Val"
                title="Valor em Tesouros"
                value={formData.val}
                onChange={(e) => setFormData({ ...formData, val: parseInt(e.target.value, 10) || 0 })}
                style={{ ...compactInputStyle, width: '55px' }}
              />
              <input
                type="number"
                placeholder="DUR"
                title="Durabilidade"
                value={formData.dur}
                onChange={(e) => setFormData({ ...formData, dur: parseInt(e.target.value, 10) || 0 })}
                style={{ ...compactInputStyle, width: '55px' }}
              />
              <input
                type="number"
                placeholder="Max"
                title="DUR Máxima"
                value={formData.maxDur}
                onChange={(e) => setFormData({ ...formData, maxDur: parseInt(e.target.value, 10) || 0 })}
                style={{ ...compactInputStyle, width: '55px' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '6px' }}>
              <input
                type="text"
                placeholder="Pré-Req"
                value={formData.preReq}
                onChange={(e) => setFormData({ ...formData, preReq: e.target.value })}
                style={{ ...compactInputStyle, flex: 1 }}
              />
              <input
                type="text"
                placeholder="Mod.I"
                value={formData.modI}
                onChange={(e) => setFormData({ ...formData, modI: e.target.value })}
                style={{ ...compactInputStyle, flex: 1 }}
              />
            </div>

            {/* Attacks Editing */}
            <div style={{ border: '1px solid var(--metal-bronze)', padding: '6px', borderRadius: '6px', backgroundColor: '#120c09' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', fontSize: '0.75rem' }}>
                <span style={{ fontWeight: 'bold' }}>Ataques (Atq.D x PA) - máx 3:</span>
                {formData.attacks.length < 3 && (
                  <button type="button" onClick={handleAddAttack} style={{ fontSize: '0.68rem', padding: '1px 4px' }}>+ Ataque</button>
                )}
              </div>

              {formData.attacks.map((atk, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '4px', marginBottom: '4px', alignItems: 'center' }}>
                  <input type="text" placeholder="Nome" value={atk.name} onChange={(e) => handleUpdateAttack(idx, 'name', e.target.value)} style={{ ...compactInputStyle, flex: 1 }} />
                  <input type="text" placeholder="Dados (2d6)" value={atk.dice} onChange={(e) => handleUpdateAttack(idx, 'dice', e.target.value)} style={{ ...compactInputStyle, width: '85px' }} />
                  <input type="text" placeholder="PA" value={atk.pa} onChange={(e) => handleUpdateAttack(idx, 'pa', e.target.value)} style={{ ...compactInputStyle, width: '40px' }} />
                  <button type="button" className="btn-danger" onClick={() => handleRemoveAttack(idx)} style={{ padding: '0 4px', height: '30px', fontSize: '0.68rem' }}>x</button>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '6px' }}>
              <input type="text" placeholder="Alc.E" value={formData.alcE} onChange={(e) => setFormData({ ...formData, alcE: e.target.value })} style={{ ...compactInputStyle, flex: 1 }} />
              <input type="text" placeholder="Recarga" value={formData.recarga} onChange={(e) => setFormData({ ...formData, recarga: e.target.value })} style={{ ...compactInputStyle, flex: 1 }} />
              <input type="text" placeholder="BLOQ" value={formData.bloq} onChange={(e) => setFormData({ ...formData, bloq: e.target.value })} style={{ ...compactInputStyle, width: '60px' }} />
            </div>

            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--parchment-muted)', whiteSpace: 'nowrap' }}>Trocar Imagem:</label>
              <input type="file" accept="image/*" onChange={handleImageChange} style={{ fontSize: '0.72rem', width: '100%' }} />
            </div>

            <input
              type="text"
              placeholder="Descrição do item"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              style={{ ...compactInputStyle, width: '100%' }}
            />

            <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
              <button className="btn-primary" onClick={handleSave} style={{ flex: 1, padding: '6px' }}>
                Salvar Alterações
              </button>
              <button onClick={() => setIsEditing(false)} style={{ flex: 1, padding: '6px' }}>
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
