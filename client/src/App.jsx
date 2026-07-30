import React, { useEffect, useState } from 'react';
import WelcomeScreen from './components/WelcomeScreen.jsx';
import LobbyScreen from './components/LobbyScreen.jsx';
import VTTCanvas from './components/VTT/VTTCanvas.jsx';
import TopHeader from './components/VTT/TopHeader.jsx';
import SidebarPanel from './components/VTT/SidebarPanel.jsx';
import RollToast from './components/VTT/RollToast.jsx';
import { socket } from './utils/socket.js';

export default function App() {
  const [screen, setScreen] = useState('welcome'); // 'welcome' | 'lobby' | 'vtt'
  const [userName, setUserName] = useState('');
  const [roomId, setRoomId] = useState('');

  // VTT Room State
  const [currentUser, setCurrentUser] = useState(null);
  const [players, setPlayers] = useState([]);
  const [mapState, setMapState] = useState({
    name: 'Mapa sem Título',
    bgImage: '',
    gridColumns: 24,
    gridRows: 24,
    gridSquareSize: 60,
    gridColor: '#c8b080',
    gridOpacity: 0.4,
    showTrail: true
  });
  const [tokens, setTokens] = useState([]);
  const [drawings, setDrawings] = useState([]);
  const [rollHistory, setRollHistory] = useState([]);

  // UI Active Sidebar Tab & Selection
  const [activeTab, setActiveTab] = useState(null);
  const [selectedTokenId, setSelectedTokenId] = useState(null);

  // Active Drawing Tool State
  const [activeDrawingTool, setActiveDrawingTool] = useState('ruler');
  const [drawingColor, setDrawingColor] = useState('#a65d47');
  const [strokeWidth, setStrokeWidth] = useState(3);

  useEffect(() => {
    socket.on('room_joined', ({ roomId, user, roomState }) => {
      setRoomId(roomId);
      setCurrentUser(user);
      setMapState(roomState.mapState);
      setPlayers(roomState.players);
      setTokens(roomState.tokens);
      setDrawings(roomState.drawings);
      setRollHistory(roomState.rollHistory);
      setScreen('vtt');
    });

    socket.on('players_updated', (updatedPlayers) => {
      setPlayers(updatedPlayers);
      // Keep currentUser state in sync
      const me = updatedPlayers.find((p) => p.id === socket.id);
      if (me) setCurrentUser(me);
    });

    socket.on('map_updated', (updatedMap) => {
      setMapState(updatedMap);
    });

    socket.on('tokens_updated', (updatedTokens) => {
      setTokens(updatedTokens);
    });

    socket.on('drawings_updated', (updatedDrawings) => {
      setDrawings(updatedDrawings);
    });

    socket.on('roll_history_updated', (updatedHistory) => {
      setRollHistory(updatedHistory);
    });

    return () => {
      socket.off('room_joined');
      socket.off('players_updated');
      socket.off('map_updated');
      socket.off('tokens_updated');
      socket.off('drawings_updated');
      socket.off('roll_history_updated');
    };
  }, []);

  const handleStartName = (name) => {
    setUserName(name);
    setScreen('lobby');
  };

  const handleCreateRoom = (newRoomId) => {
    socket.emit('join_room', { roomId: newRoomId, userName, createAsMaster: true });
  };

  const handleJoinRoom = (targetRoomId) => {
    socket.emit('join_room', { roomId: targetRoomId, userName, createAsMaster: false });
  };

  const handleLeaveRoom = () => {
    window.location.reload();
  };

  // VTT Actions
  const handleUpdateMap = (newMapState) => {
    socket.emit('update_map', newMapState);
  };

  const handleAddToken = (tokenData) => {
    socket.emit('add_token', tokenData);
  };

  const handleMoveToken = (tokenId, newX, newY, waypoints) => {
    socket.emit('move_token', { tokenId, newX, newY, waypoints });
  };

  const handleUpdateToken = (updatedToken) => {
    socket.emit('update_token', updatedToken);
  };

  const handleDeleteToken = (tokenId) => {
    socket.emit('delete_token', tokenId);
    if (selectedTokenId === tokenId) setSelectedTokenId(null);
  };

  const handleUpdateSheet = (sheetData) => {
    socket.emit('update_sheet', sheetData);
  };

  const handleClearDrawings = () => {
    socket.emit('clear_drawings');
  };

  const handleRollDice = (rollData) => {
    socket.emit('roll_dice', rollData);
  };

  const selectedToken = tokens.find((t) => t.id === selectedTokenId) || null;

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
      {screen === 'welcome' && <WelcomeScreen onStart={handleStartName} />}

      {screen === 'lobby' && (
        <LobbyScreen
          userName={userName}
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
        />
      )}

      {screen === 'vtt' && currentUser && (
        <div className="vtt-container">
          {/* Fullscreen Pixi.js Canvas */}
          <VTTCanvas
            mapState={mapState}
            tokens={tokens}
            drawings={drawings}
            selectedTokenId={selectedTokenId}
            onSelectToken={(token) => {
              setSelectedTokenId(token.id);
              if (currentUser.isMaster) setActiveTab('tokens');
            }}
            onMoveToken={handleMoveToken}
            activeDrawingTool={activeDrawingTool}
            drawingColor={drawingColor}
            drawingWidth={strokeWidth}
            currentUser={currentUser}
            socket={socket}
          />

          {/* Top Header Bar */}
          <TopHeader
            mapState={mapState}
            onUpdateMapName={(name) => handleUpdateMap({ name })}
            players={players}
            currentUser={currentUser}
            activeTab={activeTab}
            onSelectTab={(tab) => setActiveTab(tab)}
            onLeaveRoom={handleLeaveRoom}
          />

          {/* Right Floating Sidebar Menu */}
          <SidebarPanel
            activeTab={activeTab}
            onClose={() => setActiveTab(null)}
            mapState={mapState}
            onUpdateMap={handleUpdateMap}
            currentUser={currentUser}
            onUpdateSheet={handleUpdateSheet}
            tokens={tokens}
            selectedToken={selectedToken}
            players={players}
            onAddToken={handleAddToken}
            onUpdateToken={handleUpdateToken}
            onDeleteToken={handleDeleteToken}
            activeDrawingTool={activeDrawingTool}
            onSelectTool={setActiveDrawingTool}
            drawingColor={drawingColor}
            onChangeColor={setDrawingColor}
            strokeWidth={strokeWidth}
            onChangeStrokeWidth={setStrokeWidth}
            onClearDrawings={handleClearDrawings}
            onRollDice={handleRollDice}
            rollHistory={rollHistory}
          />

          {/* Discrete Dice Roll Toast Popup */}
          <RollToast socket={socket} />
        </div>
      )}
    </div>
  );
}
