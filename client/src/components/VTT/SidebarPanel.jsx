import React from 'react';
import MapMenu from './MapMenu.jsx';
import SheetMenu from './SheetMenu.jsx';
import TokensMenu from './TokensMenu.jsx';
import DrawingMenu from './DrawingMenu.jsx';
import DiceMenu from './DiceMenu.jsx';
import ItemsMenu from './ItemsMenu.jsx';
import ForgeMenu from './ForgeMenu.jsx';
import SettingsMenu from './SettingsMenu.jsx';

export default function SidebarPanel({
  activeTab,
  onClose,
  mapState,
  onUpdateMap,
  currentUser,
  socket,
  onUpdateSheet,
  onOpenFullSheet,
  tokens,
  selectedToken,
  players,
  arsenal = [],
  onAddToken,
  onUpdateToken,
  onDeleteToken,
  onToggleCoMaster,
  onInspectItem,
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

  const isMasterOrCoMaster = Boolean(currentUser?.isMaster || currentUser?.isCoMaster);

  const tabTitles = {
    map: 'Menu do Mapa',
    sheet: 'Planilha de Personagem',
    tokens: 'Menu de Tokens',
    drawing: 'Ferramentas de Desenho',
    dice: 'Rolagem de Dados',
    items: 'Menu de Equipamentos',
    forge: 'Forja do Mestre',
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
        {activeTab === 'map' && isMasterOrCoMaster && (
          <MapMenu mapState={mapState} onUpdateMap={onUpdateMap} />
        )}

        {activeTab === 'sheet' && (
          <SheetMenu
            currentUser={currentUser}
            socket={socket}
            onUpdateSheet={onUpdateSheet}
            onOpenFullSheet={onOpenFullSheet}
            onAddToken={onAddToken}
            onDeleteToken={onDeleteToken}
          />
        )}

        {activeTab === 'tokens' && isMasterOrCoMaster && (
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

        {activeTab === 'items' && isMasterOrCoMaster && (
          <ItemsMenu onAddToken={onAddToken} />
        )}

        {activeTab === 'forge' && isMasterOrCoMaster && (
          <ForgeMenu
            arsenal={arsenal}
            onAddToken={onAddToken}
            currentUser={currentUser}
            socket={socket}
            onInspectItem={onInspectItem}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsMenu
            mapState={mapState}
            onUpdateMap={onUpdateMap}
            players={players}
            currentUser={currentUser}
            onToggleCoMaster={onToggleCoMaster}
          />
        )}
      </div>
    </div>
  );
}
