import React, { useEffect, useState } from 'react';
import WelcomeScreen from './components/WelcomeScreen.jsx';
import LobbyScreen from './components/LobbyScreen.jsx';
import VTTCanvas from './components/VTT/VTTCanvas.jsx';
import TopHeader from './components/VTT/TopHeader.jsx';
import SidebarPanel from './components/VTT/SidebarPanel.jsx';
import RollToast from './components/VTT/RollToast.jsx';
import PoiseSheetViewer from './components/VTT/PoiseSheetViewer.jsx';
import { socket } from './utils/socket.js';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("React ErrorBoundary caught an error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '24px', color: '#ff6b6b', backgroundColor: '#120c09', height: '100vh', overflow: 'auto', fontFamily: 'monospace' }}>
          <h2 style={{ color: '#ffd166' }}>Erro no VTT Detectado:</h2>
          <pre style={{ whiteSpace: 'pre-wrap', color: '#ff6b6b', fontSize: '1rem' }}>
            {this.state.error && this.state.error.toString()}
          </pre>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.8rem', color: '#a67c52', marginTop: '12px' }}>
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </pre>
          <button onClick={() => window.location.reload()} style={{ marginTop: '20px', padding: '10px 20px', cursor: 'pointer' }}>
            Recarregar Página
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

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
  const [isSheetModalOpen, setIsSheetModalOpen] = useState(false);

  // Active Drawing Tool State (Default: null)
  const [activeDrawingTool, setActiveDrawingTool] = useState(null);
  const [drawingColor, setDrawingColor] = useState('#a65d47');
  const [strokeWidth, setStrokeWidth] = useState(3);

  useEffect(() => {
    socket.on('room_joined', ({ roomId, user, roomState }) => {
      setRoomId(roomId);
      setCurrentUser(user);
      if (roomState) {
        if (roomState.mapState) setMapState(roomState.mapState);
        if (Array.isArray(roomState.players)) setPlayers(roomState.players);
        if (Array.isArray(roomState.tokens)) setTokens(roomState.tokens);
        if (Array.isArray(roomState.drawings)) setDrawings(roomState.drawings);
        if (Array.isArray(roomState.rollHistory)) setRollHistory(roomState.rollHistory);
      }
      setScreen('vtt');
    });

    socket.on('players_updated', (updatedPlayers) => {
      if (Array.isArray(updatedPlayers)) {
        setPlayers(updatedPlayers);
        const me = updatedPlayers.find((p) => p.id === socket.id);
        if (me) setCurrentUser(me);
      }
    });

    socket.on('map_updated', (updatedMap) => {
      if (updatedMap) setMapState(updatedMap);
    });

    socket.on('tokens_updated', (updatedTokens) => {
      if (Array.isArray(updatedTokens)) setTokens(updatedTokens);
    });

    socket.on('drawings_updated', (updatedDrawings) => {
      if (Array.isArray(updatedDrawings)) setDrawings(updatedDrawings);
    });

    socket.on('roll_history_updated', (updatedHistory) => {
      if (Array.isArray(updatedHistory)) setRollHistory(updatedHistory);
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

  const handleAddDrawing = (drawingData) => {
    socket.emit('add_drawing', drawingData);
  };

  const handleDeleteDrawing = (drawingId) => {
    socket.emit('delete_drawing', drawingId);
  };

  const handleUpdateSheet = (sheetData) => {
    socket.emit('update_sheet', sheetData);
  };

  const handleClearDrawings = () => {
    socket.emit('clear_drawings');
  };

  const handleToggleCoMaster = (targetUserId) => {
    socket.emit('toggle_co_master', { targetUserId });
  };

  const handleRollDice = (formula, label) => {
    socket.emit('roll_dice', { formula, label });
  };

  const handleSelectTab = (tab) => {
    if (tab !== 'drawing') {
      setActiveDrawingTool(null);
    }
    setActiveTab(tab);
  };

  const selectedToken = tokens.find((t) => t?.id === selectedTokenId) || null;

  return (
    <ErrorBoundary>
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
                setSelectedTokenId(token ? (token.id || token) : null);
              }}
              onMoveToken={handleMoveToken}
              onAddToken={handleAddToken}
              onDeleteToken={handleDeleteToken}
              onAddDrawing={handleAddDrawing}
              onDeleteDrawing={handleDeleteDrawing}
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
              onSelectTab={handleSelectTab}
              onLeaveRoom={handleLeaveRoom}
            />

            {/* Right Floating Sidebar Menu */}
            <SidebarPanel
              activeTab={activeTab}
              onClose={() => {
                setActiveTab(null);
                setActiveDrawingTool(null);
              }}
              mapState={mapState}
              onUpdateMap={handleUpdateMap}
              currentUser={currentUser}
              socket={socket}
              onUpdateSheet={handleUpdateSheet}
              onOpenFullSheet={() => setIsSheetModalOpen(true)}
              tokens={tokens}
              selectedToken={selectedToken}
              players={players}
              onAddToken={handleAddToken}
              onUpdateToken={handleUpdateToken}
              onDeleteToken={handleDeleteToken}
              onToggleCoMaster={handleToggleCoMaster}
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

            {/* Full Interactive Poise Character Sheet Modal */}
            {isSheetModalOpen && currentUser.sheetData && (
              <PoiseSheetViewer
                sheet={currentUser.sheetData}
                currentUser={currentUser}
                socket={socket}
                onUpdateSheet={handleUpdateSheet}
                onClose={() => setIsSheetModalOpen(false)}
              />
            )}

            {/* Discrete Dice Roll Toast Popup */}
            <RollToast socket={socket} />
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}
