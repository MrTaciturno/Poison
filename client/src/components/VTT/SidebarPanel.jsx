import React from 'react';
import MapMenu from './MapMenu.jsx';
import SheetMenu from './SheetMenu.jsx';
import TokensMenu from './TokensMenu.jsx';
import DrawingMenu from './DrawingMenu.jsx';
import DiceMenu from './DiceMenu.jsx';
import ItemsMenu from './ItemsMenu.jsx';
import SettingsMenu from './SettingsMenu.jsx';

export default function SidebarPanel({
  activeTab,
  onClose,
  mapState,
  onUpdateMap,
  currentUser,
  onUpdateSheet,
  onOpenFullSheet,
  tokens,
  selectedToken,
  players,
  onAddToken,
  onUpdateToken,
  onDeleteToken,
  activeDrawingTool,
  onSelectTool,
  drawingColor,
  onChangeColor,
  strokeWidth,
  onChangeStrokeWidth,
  onClearDrawings,
  onRollDice,
  rollHistory
}) {
  if (!activeTab) return null;

  const tabTitles = {
    map: 'Menu do Mapa',
    sheet: 'Planilha de Personagem',
    tokens: 'Menu de Tokens',
    drawing: 'Ferramentas de Desenho',
    dice: 'Rolagem de Dados',
    items: 'Menu de Equipamentos',
    settings: 'Configurações'
  };

  return (
    <div className="vtt-sidebar">
      <div className="sidebar-header">
        <div className="sidebar-title">{tabTitles[activeTab] || 'Menu'}</div>
        <button className="sidebar-close-btn" onClick={onClose}>
          Fechar
        </button>
      </div>

      <div className="sidebar-content">
        {activeTab === 'map' && currentUser.isMaster && (
          <MapMenu mapState={mapState} onUpdateMap={onUpdateMap} />
        )}

        {activeTab === 'sheet' && (
          <SheetMenu currentUser={currentUser} onUpdateSheet={onUpdateSheet} onOpenFullSheet={onOpenFullSheet} />
        )}

        {activeTab === 'tokens' && currentUser.isMaster && (
          <TokensMenu
            tokens={tokens}
            selectedToken={selectedToken}
            players={players}
            onAddToken={onAddToken}
            onUpdateToken={onUpdateToken}
            onDeleteToken={onDeleteToken}
          />
        )}

        {activeTab === 'drawing' && (
          <DrawingMenu
            activeTool={activeDrawingTool}
            onSelectTool={onSelectTool}
            color={drawingColor}
            onChangeColor={onChangeColor}
            strokeWidth={strokeWidth}
            onChangeStrokeWidth={onChangeStrokeWidth}
            onClearDrawings={onClearDrawings}
          />
        )}

        {activeTab === 'dice' && (
          <DiceMenu onRollDice={onRollDice} rollHistory={rollHistory} />
        )}

        {activeTab === 'items' && currentUser.isMaster && (
          <ItemsMenu onAddToken={onAddToken} />
        )}

        {activeTab === 'settings' && (
          <SettingsMenu mapState={mapState} onUpdateMap={onUpdateMap} />
        )}
      </div>
    </div>
  );
}
