import React, { useState } from 'react';

export default function DiceMenu({ onRollDice, rollHistory = [] }) {
  const [bonus, setBonus] = useState(0);
  const [label, setLabel] = useState('');
  const [numDice, setNumDice] = useState(1);

  const diceTypes = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd%'];

  const handleRoll = (diceType) => {
    const count = parseInt(numDice, 10) || 1;
    const b = parseInt(bonus, 10) || 0;
    const formulaStr = `${count}${diceType}${b !== 0 ? (b > 0 ? `+${b}` : `${b}`) : ''}`;

    onRollDice({
      formula: formulaStr,
      label: label.trim() || 'Rolagem de Dados',
      diceType,
      numDice: count,
      bonus: b
    });
  };

  return (
    <div className="panel-section">
      <div className="panel-section-title">Rolagem de Dados</div>
      
      {/* Dice Selection Grid */}
      <div className="dice-buttons-grid" style={{ marginTop: '8px' }}>
        {diceTypes.map((d) => (
          <button key={d} className="dice-btn btn-primary" onClick={() => handleRoll(d)}>
            {d}
          </button>
        ))}
      </div>

      {/* Modifiers & Label */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '14px' }}>
        <div className="panel-row">
          <label>Qtd. Dados:</label>
          <input
            type="number"
            min="1"
            max="10"
            style={{ width: '60px' }}
            value={numDice}
            onChange={(e) => setNumDice(e.target.value)}
          />
        </div>

        <div className="panel-row">
          <label>Bônus / Modificador:</label>
          <input
            type="number"
            style={{ width: '80px' }}
            value={bonus}
            onChange={(e) => setBonus(e.target.value)}
          />
        </div>

        <div className="panel-row">
          <label>Nome da Rolagem:</label>
          <input
            type="text"
            placeholder="ex: Ataque com Espada"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
        </div>
      </div>

      {/* Roll Feed History */}
      <div className="panel-section-title" style={{ marginTop: '16px' }}>Histórico de Rolagens</div>
      <div className="roll-feed" style={{ marginTop: '8px' }}>
        {rollHistory.length === 0 ? (
          <p style={{ fontSize: '0.8rem', color: 'var(--parchment-muted)' }}>Nenhuma rolagem realizada nesta sessão.</p>
        ) : (
          rollHistory.map((item) => {
            if (!item) return null;

            // Safe text extraction
            const userName = typeof item.userName === 'string' ? item.userName : 'Jogador';
            const timestamp = typeof item.timestamp === 'string' ? item.timestamp : '';
            const rollLabel = typeof item.label === 'string' ? item.label : 'Rolagem';
            const formulaDisplay = typeof item.formula === 'string' ? item.formula : (item.diceType ? `${item.numDice || 1}${item.diceType}` : '');
            const resultText = typeof item.resultText === 'string' ? item.resultText : String(item.total ?? 0);
            const rollsDisplay = Array.isArray(item.rolls) ? item.rolls.join(', ') : '';

            return (
              <div key={item.id || Math.random()} className="roll-feed-item">
                <div className="roll-feed-header">
                  <strong>{userName}</strong>
                  <span>{timestamp}</span>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--sand-pastel)' }}>
                  {rollLabel} {formulaDisplay ? `(${formulaDisplay})` : ''}
                </div>
                <div className="roll-feed-result">
                  {resultText} {rollsDisplay && !resultText.includes('[') ? <span style={{ fontSize: '0.75rem', color: 'var(--parchment-muted)' }}>[{rollsDisplay}]</span> : null}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
