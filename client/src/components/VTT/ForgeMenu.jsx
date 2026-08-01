import React, { useState } from 'react';

export default function ForgeMenu({
  arsenal = [],
  onAddToken,
  currentUser,
  socket,
  onInspectItem
}) {
  const isMasterOrCoMaster = Boolean(currentUser?.isMaster || currentUser?.isCoMaster);

  // Form State
  const [name, setName] = useState('');
  const [type, setType] = useState('Arma');
  const [iTam, setITam] = useState('1x1');
  const [val, setVal] = useState(0);
  const [dur, setDur] = useState(10);
  const [maxDur, setMaxDur] = useState(10);
  const [preReq, setPreReq] = useState('');
  const [modI, setModI] = useState('');
  const [alcE, setAlcE] = useState('');
  const [recarga, setRecarga] = useState('');
  const [bloq, setBloq] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  // Attack Modes (Up to 3)
  const [attacks, setAttacks] = useState([{ name: 'Ataque Principal', dice: '1d6', pa: '1' }]);

  const handleAddAttack = () => {
    if (attacks.length < 3) {
      setAttacks([...attacks, { name: `Ataque ${attacks.length + 1}`, dice: '1d6', pa: '1' }]);
    }
  };

  const handleUpdateAttack = (index, field, value) => {
    const updated = [...attacks];
    updated[index] = { ...updated[index], [field]: value };
    setAttacks(updated);
  };

  const handleRemoveAttack = (index) => {
    setAttacks(attacks.filter((_, i) => i !== index));
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setImageUrl(ev.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const parseITam = (str) => {
    const match = (str || '').match(/(\d+)x(\d+)/i);
    if (match) {
      return { w: parseInt(match[1], 10) || 1, h: parseInt(match[2], 10) || 1 };
    }
    return { w: 1, h: 1 };
  };

  const handleCreateItem = (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    const itemPayload = {
      name: name.trim(),
      type,
      iTam: iTam.trim() || '1x1',
      val: Number(val) || 0,
      dur: Number(dur) || 10,
      maxDur: Number(maxDur) || 10,
      preReq: preReq.trim(),
      modI: modI.trim(),
      attacks,
      alcE: alcE.trim(),
      recarga: recarga.trim(),
      bloq: bloq.trim(),
      description: description.trim(),
      imageUrl
    };

    socket.emit('add_item_to_arsenal', itemPayload);

    // Reset Form
    setName('');
    setITam('1x1');
    setVal(0);
    setDur(10);
    setMaxDur(10);
    setPreReq('');
    setModI('');
    setAlcE('');
    setRecarga('');
    setBloq('');
    setDescription('');
    setImageUrl('');
    setAttacks([{ name: 'Ataque Principal', dice: '1d6', pa: '1' }]);
  };

  const handleDeleteItem = (id) => {
    socket.emit('delete_item_from_arsenal', id);
  };

  // Export Arsenal to poise.arsenal file
  const handleExportArsenal = () => {
    const dataStr = JSON.stringify(arsenal, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'poise.arsenal';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Import Arsenal from poise.arsenal file
  const handleImportArsenal = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const importedData = JSON.parse(ev.target.result);
          if (Array.isArray(importedData)) {
            socket.emit('import_arsenal', importedData);
          } else {
            alert('Formato de arquivo poise.arsenal inválido!');
          }
        } catch (err) {
          alert('Erro ao ler o arquivo de compêndio.');
        }
      };
      reader.readAsText(file);
    }
  };

  // Place Item on VTT Map Grid
  const handlePlaceOnMap = (item) => {
    const dims = parseITam(item.iTam);
    onAddToken({
      baseName: item.name,
      imageUrl: item.imageUrl,
      gridW: dims.w,
      gridH: dims.h,
      x: 3,
      y: 3,
      hp: item.dur ?? 20,
      maxHp: item.maxDur ?? 20
    });
  };

  // Place Item into Player's Staging Inventory
  const handlePlaceInStaging = (item) => {
    const dims = parseITam(item.iTam);
    const currentInventory = currentUser?.stagingInventory || [];
    const updatedInventory = [
      ...currentInventory,
      {
        id: `equip_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        name: item.name,
        label: item.name,
        imageUrl: item.imageUrl,
        gridW: dims.w,
        gridH: dims.h,
        cols: dims.w,
        rows: dims.h,
        iTam: item.iTam
      }
    ];
    socket.emit('update_staging_inventory', updatedInventory);
  };

  return (
    <div className="panel-section">
      <div className="panel-section-title">Forja do Mestre (Compêndio de Itens)</div>

      {/* Compendium Import/Export Bar */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
        <button className="btn-primary" onClick={handleExportArsenal} style={{ flex: 1, fontSize: '0.78rem' }}>
          Salvar poise.arsenal
        </button>
        <label className="btn-primary" style={{ flex: 1, fontSize: '0.78rem', textAlign: 'center', cursor: 'pointer', margin: 0 }}>
          Carregar poise.arsenal
          <input type="file" accept=".arsenal,.json" onChange={handleImportArsenal} style={{ display: 'none' }} />
        </label>
      </div>

      {/* Item Creation Form */}
      {isMasterOrCoMaster && (
        <form onSubmit={handleCreateItem} style={{ border: '1px solid var(--metal-gold)', padding: '12px', borderRadius: '6px', backgroundColor: '#120c09', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ fontWeight: 'bold', color: 'var(--metal-gold-bright)', fontSize: '0.9rem' }}>+ Criar Novo Item</div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px', gap: '8px' }}>
            <input
              type="text"
              placeholder="Nome do Item *"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <input
              type="text"
              placeholder="iTAM (1x1, 2x2) *"
              value={iTam}
              onChange={(e) => setITam(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
            <select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="Arma">Arma</option>
              <option value="Escudo">Escudo</option>
              <option value="Traje">Traje</option>
              <option value="Consumível">Consumível</option>
              <option value="Acessório">Acessório</option>
              <option value="Outro">Outro</option>
            </select>

            <input type="number" placeholder="Val (Tesouros)" value={val} onChange={(e) => setVal(e.target.value)} />
            <input type="number" placeholder="DUR (Durab.)" value={dur} onChange={(e) => { setDur(e.target.value); setMaxDur(e.target.value); }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            <input type="text" placeholder="Pré-Req" value={preReq} onChange={(e) => setPreReq(e.target.value)} />
            <input type="text" placeholder="Mod.I" value={modI} onChange={(e) => setModI(e.target.value)} />
          </div>

          {/* Attacks (Max 3) */}
          <div style={{ border: '1px dashed var(--metal-bronze)', padding: '6px', borderRadius: '4px', backgroundColor: '#1b130e' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', marginBottom: '4px' }}>
              <span>Atq.D x PA (Até 3):</span>
              {attacks.length < 3 && (
                <button type="button" onClick={handleAddAttack} style={{ fontSize: '0.7rem', padding: '2px 4px' }}>+ Ataque</button>
              )}
            </div>
            {attacks.map((atk, idx) => (
              <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 50px 24px', gap: '4px', marginBottom: '4px' }}>
                <input type="text" placeholder="Nome" value={atk.name} onChange={(e) => handleUpdateAttack(idx, 'name', e.target.value)} style={{ padding: '4px', fontSize: '0.75rem' }} />
                <input type="text" placeholder="Dados (2d6)" value={atk.dice} onChange={(e) => handleUpdateAttack(idx, 'dice', e.target.value)} style={{ padding: '4px', fontSize: '0.75rem' }} />
                <input type="text" placeholder="PA" value={atk.pa} onChange={(e) => handleUpdateAttack(idx, 'pa', e.target.value)} style={{ padding: '4px', fontSize: '0.75rem' }} />
                <button type="button" className="btn-danger" onClick={() => handleRemoveAttack(idx)} style={{ padding: '0', fontSize: '0.7rem' }}>x</button>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
            <input type="text" placeholder="Alc.E" value={alcE} onChange={(e) => setAlcE(e.target.value)} />
            <input type="text" placeholder="Recarga" value={recarga} onChange={(e) => setRecarga(e.target.value)} />
            <input type="text" placeholder="BLOQ" value={bloq} onChange={(e) => setBloq(e.target.value)} />
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <label style={{ fontSize: '0.78rem', color: 'var(--parchment-muted)' }}>Imagem:</label>
            <input type="file" accept="image/*" onChange={handleImageUpload} style={{ fontSize: '0.75rem' }} />
          </div>

          <textarea
            placeholder="Descrição do item..."
            rows="2"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{ fontSize: '0.8rem', resize: 'vertical' }}
          />

          <button type="submit" className="btn-primary">
            + Adicionar Item ao Arsenal
          </button>
        </form>
      )}

      {/* Compendium Arsenal Items Grid Display */}
      <div className="panel-section-title">Compêndio de Itens ({arsenal.length})</div>
      
      {arsenal.length === 0 ? (
        <p style={{ fontSize: '0.82rem', color: 'var(--parchment-muted)', padding: '12px 0' }}>
          Nenhum item cadastrado no compêndio. Crie novos itens acima ou carregue um arquivo <code>poise.arsenal</code>.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px', maxHeight: '420px', overflowY: 'auto' }}>
          {arsenal.map((item) => {
            const dims = parseITam(item.iTam);
            const isSmall1x1 = dims.w === 1 && dims.h === 1;

            const curDur = item.dur ?? 10;
            const maxDur = item.maxDur ?? 10;
            const durPercent = Math.max(0, Math.min(100, (curDur / maxDur) * 100));

            return (
              <div
                key={item.id}
                style={{
                  backgroundColor: '#1b130e',
                  border: '1px solid var(--metal-bronze)',
                  borderRadius: '6px',
                  padding: '10px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  position: 'relative'
                }}
              >
                {/* Visual Card Representation based on iTAM */}
                {isSmall1x1 ? (
                  /* 1x1 Card: Name Only */
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {item.imageUrl && (
                      <img src={item.imageUrl} alt={item.name} style={{ width: '32px', height: '32px', objectFit: 'contain', borderRadius: '4px', backgroundColor: '#120c09', border: '1px solid var(--metal-bronze)' }} />
                    )}
                    <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: 'var(--sand-pastel)', flex: 1 }}>
                      {item.name} <code style={{ fontSize: '0.75rem', opacity: 0.8 }}>(1x1)</code>
                    </div>
                  </div>
                ) : (
                  /* Larger Card (1x2, 2x2, etc.): Top Center Name, Center Attacks, Bottom Left Durability */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', backgroundColor: '#120c09', padding: '8px', borderRadius: '4px', border: '1px solid var(--metal-bronze)' }}>
                    {/* Top Center: Name */}
                    <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '0.95rem', color: 'var(--metal-gold-bright)', borderBottom: '1px dashed var(--metal-bronze)', paddingBottom: '4px' }}>
                      {item.name} <code style={{ fontSize: '0.75rem', color: 'var(--parchment-muted)' }}>({item.iTam})</code>
                    </div>

                    {/* Center: Damage / Attacks Justified Left */}
                    <div style={{ textAlign: 'left', fontSize: '0.8rem', color: 'var(--parchment-base)', margin: '4px 0' }}>
                      {item.attacks && item.attacks.filter(a => a.name || a.dice).length > 0 ? (
                        item.attacks.filter(a => a.name || a.dice).map((atk, aIdx) => (
                          <div key={aIdx} style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>⚔️ {atk.name || `Atq ${aIdx + 1}`}: <strong>{atk.dice}</strong></span>
                            <span style={{ color: 'var(--metal-gold-bright)' }}>{atk.pa} PA</span>
                          </div>
                        ))
                      ) : (
                        <div style={{ color: 'var(--parchment-muted)', fontSize: '0.75rem' }}>Sem dados de ataque especificados</div>
                      )}
                    </div>

                    {/* Bottom Left: Durability Bar */}
                    <div style={{ alignSelf: 'flex-start', width: '60%', fontSize: '0.72rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                        <span>DUR:</span>
                        <span>{curDur}/{maxDur}</span>
                      </div>
                      <div style={{ width: '100%', height: '6px', backgroundColor: '#1b130e', border: '1px solid var(--metal-bronze)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${durPercent}%`, height: '100%', backgroundColor: durPercent > 30 ? '#486e42' : '#8b322c' }} />
                      </div>
                    </div>
                  </div>
                )}

                {/* Actions Toolbar */}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                  <button
                    className="btn-primary"
                    onClick={() => onInspectItem && onInspectItem(item)}
                    style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                  >
                    Inspecionar
                  </button>

                  <button
                    onClick={() => handlePlaceOnMap(item)}
                    style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                  >
                    Colocar no Mapa
                  </button>

                  <button
                    onClick={() => handlePlaceInStaging(item)}
                    style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                  >
                    + Grid Temporário
                  </button>

                  {isMasterOrCoMaster && (
                    <button
                      className="btn-danger"
                      onClick={() => handleDeleteItem(item.id)}
                      style={{ fontSize: '0.75rem', padding: '4px 8px', marginLeft: 'auto' }}
                    >
                      Excluir
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
