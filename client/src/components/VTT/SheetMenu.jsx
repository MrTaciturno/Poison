import React, { useState } from 'react';
import { parsePoiseFile, exportPoiseFile } from '../../utils/poiseParser.js';

export default function SheetMenu({ currentUser, onUpdateSheet, onOpenFullSheet }) {
  const [sheet, setSheet] = useState(currentUser.sheetData || null);
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

  if (!sheet) {
    return (
      <div className="panel-section">
        <div className="panel-section-title">Upload de Planilha .poise</div>
        <p style={{ fontSize: '0.85rem', color: 'var(--parchment-muted)' }}>
          Selecione seu arquivo de personagem no formato <code>.poise</code> para carregar todas as suas estatísticas, imagem de fundo e campos na mesa.
        </p>
        <input type="file" accept=".poise,.json" onChange={handleFileUpload} style={{ marginTop: '8px' }} />
        {errorMsg && <p style={{ color: 'var(--accent-red)', fontSize: '0.85rem', marginTop: '8px' }}>{errorMsg}</p>}
      </div>
    );
  }

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

        {sheet.fields && (
          <div style={{ fontSize: '0.8rem', color: 'var(--sand-pastel)', marginTop: '4px' }}>
            Total de campos interativos carregados: <strong>{sheet.fields.length}</strong>
          </div>
        )}
      </div>
    </div>
  );
}
