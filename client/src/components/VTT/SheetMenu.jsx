import React, { useState } from 'react';
import { parsePoiseFile, exportPoiseFile } from '../../utils/poiseParser.js';

export default function SheetMenu({ currentUser, onUpdateSheet }) {
  const [sheet, setSheet] = useState(currentUser.sheetData || null);
  const [isEditing, setIsEditing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const result = parsePoiseFile(evt.target.result);
      if (result.success) {
        setSheet(result.data);
        onUpdateSheet(result.data);
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

  if (!sheet) {
    return (
      <div className="panel-section">
        <div className="panel-section-title">Upload de Planilha .poise</div>
        <p style={{ fontSize: '0.85rem', color: 'var(--parchment-muted)' }}>
          Selecione seu arquivo de personagem no formato <code>.poise</code> para carregar suas estatísticas e inventário na mesa.
        </p>
        <input type="file" accept=".poise,.json" onChange={handleFileUpload} style={{ marginTop: '8px' }} />
        {errorMsg && <p style={{ color: 'var(--accent-red)', fontSize: '0.85rem', marginTop: '8px' }}>{errorMsg}</p>}
      </div>
    );
  }

  return (
    <div className="sheet-container">
      {/* Action Buttons Header */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
        <button onClick={() => setIsEditing(!isEditing)}>
          {isEditing ? 'Visualizar' : 'Editar Planilha'}
        </button>
        <button onClick={handleSaveSheet}>Salvar .poise</button>
        <button className="btn-danger" onClick={handleClearSheet}>Trocar Arquivo</button>
      </div>

      {/* Sheet Fields View / Edit */}
      <div className="panel-section">
        <div className="panel-section-title">Dados do Personagem</div>
        
        <div className="sheet-field-group">
          <label className="sheet-field-label">Nome do Personagem:</label>
          {isEditing ? (
            <input
              type="text"
              value={sheet.name || ''}
              onChange={(e) => setSheet({ ...sheet, name: e.target.value })}
            />
          ) : (
            <div style={{ fontWeight: 'bold', color: 'var(--metal-gold-bright)' }}>{sheet.name || 'Sem Nome'}</div>
          )}
        </div>

        <div className="panel-row">
          <div className="sheet-field-group">
            <label className="sheet-field-label">Pontos de Vida (HP):</label>
            {isEditing ? (
              <input
                type="number"
                value={sheet.hp || 18}
                onChange={(e) => setSheet({ ...sheet, hp: parseInt(e.target.value, 10) })}
              />
            ) : (
              <div>{sheet.hp || 18}</div>
            )}
          </div>

          <div className="sheet-field-group">
            <label className="sheet-field-label">Pontos de Mana (MP):</label>
            {isEditing ? (
              <input
                type="number"
                value={sheet.mp || 46}
                onChange={(e) => setSheet({ ...sheet, mp: parseInt(e.target.value, 10) })}
              />
            ) : (
              <div>{sheet.mp || 46}</div>
            )}
          </div>
        </div>

        <div className="panel-row">
          <div className="sheet-field-group">
            <label className="sheet-field-label">Nível:</label>
            <div>{sheet.level || 13}</div>
          </div>
          <div className="sheet-field-group">
            <label className="sheet-field-label">Tier:</label>
            <div>{sheet.tier || 'IV'}</div>
          </div>
        </div>
      </div>

      {/* Bottom Inventory / Items Grid Section */}
      <div className="panel-section">
        <div className="panel-section-title">Inventário & Equipamentos do Grid</div>
        <p style={{ fontSize: '0.8rem', color: 'var(--parchment-muted)' }}>
          Itens equipados respeitam os limites de espaço no grid da planilha.
        </p>
        <div className="sheet-equipment-grid">
          {(sheet.inventory || [
            { name: 'IC1x1', label: 'Adaga' },
            { name: 'IC1x2', label: 'Espada Curta' }
          ]).map((item, idx) => (
            <div key={idx} className="asset-thumb-card" title={item.label}>
              <img src={`/Equip/${item.name}.png`} alt={item.label} className="asset-thumb-img" onError={(e) => e.target.style.display = 'none'} />
              <div className="asset-thumb-name">{item.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
