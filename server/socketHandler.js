// Cosmos VTT Socket.io Handler
const rooms = new Map();

function getPublicRoomsList() {
  const list = [];
  rooms.forEach((room, id) => {
    const master = room.players.find(p => p.isMaster);
    list.push({
      roomId: id,
      name: room.mapState.name || 'Mesa sem Título',
      playerCount: room.players.length,
      masterName: master ? master.name : 'Desconhecido'
    });
  });
  return list;
}

export function setupSocketHandler(io) {
  io.on('connection', (socket) => {
    let currentRoom = null;
    let currentUser = null;

    // Send active rooms list upon request or connection
    socket.emit('rooms_list_updated', getPublicRoomsList());

    socket.on('get_rooms_list', () => {
      socket.emit('rooms_list_updated', getPublicRoomsList());
    });

    // Join or Create Room
    socket.on('join_room', ({ roomId, userName, createAsMaster }) => {
      socket.join(roomId);
      currentRoom = roomId;

      if (!rooms.has(roomId)) {
        rooms.set(roomId, {
          roomId,
          mapState: {
            name: 'Mapa sem Título',
            bgImage: '',
            gridColumns: 24,
            gridRows: 24,
            gridSquareSize: 60,
            gridColor: '#c8b080',
            gridOpacity: 0.4,
            showTrail: true
          },
          players: [],
          tokens: [],
          drawings: [],
          rollHistory: []
        });
      }

      const room = rooms.get(roomId);
      const isMaster = createAsMaster || room.players.length === 0;

      currentUser = {
        id: socket.id,
        name: userName,
        isMaster,
        sheetData: null,
        stagingInventory: []
      };

      room.players.push(currentUser);

      // Notify joining client of full state
      socket.emit('room_joined', {
        roomId,
        user: currentUser,
        roomState: room
      });

      // Notify other players in room
      io.to(roomId).emit('players_updated', room.players);
      
      // Broadcast updated rooms list to all lobby clients
      io.emit('rooms_list_updated', getPublicRoomsList());
    });

    // Master updates map settings
    socket.on('update_map', (newMapState) => {
      if (!currentRoom || !currentUser?.isMaster) return;
      const room = rooms.get(currentRoom);
      if (!room) return;

      room.mapState = { ...room.mapState, ...newMapState };
      io.to(currentRoom).emit('map_updated', room.mapState);
      io.emit('rooms_list_updated', getPublicRoomsList());
    });

    // Add new Token
    socket.on('add_token', (tokenData) => {
      if (!currentRoom || !currentUser?.isMaster) return;
      const room = rooms.get(currentRoom);
      if (!room) return;

      const baseName = tokenData.baseName || 'Token';
      const existingCount = room.tokens.filter(t => t.baseName === baseName).length;
      const tokenName = `${baseName}_${existingCount + 1}`;

      let gridW = tokenData.gridW || tokenData.cols || 0;
      let gridH = tokenData.gridH || tokenData.rows || 0;

      if (!gridW || !gridH) {
        const strToTest = `${tokenData.baseName || ''} ${tokenData.imageUrl || ''}`;
        const match = strToTest.match(/(\d+)x(\d+)/i);
        if (match) {
          gridW = gridW || parseInt(match[1], 10);
          gridH = gridH || parseInt(match[2], 10);
        }
      }

      const newToken = {
        id: `token_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        baseName,
        name: tokenName,
        imageUrl: tokenData.imageUrl,
        x: tokenData.x ?? 2,
        y: tokenData.y ?? 2,
        gridW: gridW || 1,
        gridH: gridH || 1,
        hp: tokenData.hp ?? 20,
        maxHp: tokenData.maxHp ?? 20,
        mp: tokenData.mp ?? 10,
        maxMp: tokenData.maxMp ?? 10,
        auraColor: tokenData.auraColor || 'transparent',
        auraRadius: tokenData.auraRadius || 0,
        borderColor: tokenData.borderColor || '#a67c52',
        conditions: tokenData.conditions || [],
        assignedPlayerId: tokenData.assignedPlayerId || null,
        prevPath: []
      };

      room.tokens.push(newToken);
      io.to(currentRoom).emit('tokens_updated', room.tokens);
    });

    // Move Token
    socket.on('move_token', ({ tokenId, newX, newY, waypoints }) => {
      if (!currentRoom) return;
      const room = rooms.get(currentRoom);
      if (!room) return;

      const token = room.tokens.find(t => t.id === tokenId);
      if (!token) return;

      const canControl = currentUser.isMaster || token.assignedPlayerId === currentUser.id;
      if (!canControl) return;

      token.prevPath = waypoints || [{ x: token.x, y: token.y }, { x: newX, y: newY }];
      token.x = newX;
      token.y = newY;

      io.to(currentRoom).emit('tokens_updated', room.tokens);
    });

    // Update Token properties (or assign token to player)
    socket.on('update_token', (updatedToken) => {
      if (!currentRoom) return;
      const room = rooms.get(currentRoom);
      if (!room) return;

      const index = room.tokens.findIndex(t => t.id === updatedToken.id);
      if (index === -1) return;

      const token = room.tokens[index];
      const canControl = currentUser.isMaster || token.assignedPlayerId === currentUser.id;
      if (!canControl) return;

      // If token is assigned to a player, check if it's an equipment item being assigned
      if (updatedToken.assignedPlayerId && updatedToken.assignedPlayerId !== token.assignedPlayerId) {
        const targetPlayer = room.players.find(p => p.id === updatedToken.assignedPlayerId);
        if (targetPlayer && (token.gridW > 1 || token.gridH > 1 || token.baseName.startsWith('IC'))) {
          // Transfer equipment to target player's 3x4 staging inventory
          if (!targetPlayer.stagingInventory) targetPlayer.stagingInventory = [];
          targetPlayer.stagingInventory.push({
            id: `equip_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            name: token.baseName || token.name,
            label: token.name,
            imageUrl: token.imageUrl,
            gridW: token.gridW || 1,
            gridH: token.gridH || 1
          });

          // Remove equipment token from map grid
          room.tokens = room.tokens.filter(t => t.id !== updatedToken.id);

          io.to(currentRoom).emit('tokens_updated', room.tokens);
          io.to(currentRoom).emit('players_updated', room.players);
          return;
        }
      }

      room.tokens[index] = { ...token, ...updatedToken };
      io.to(currentRoom).emit('tokens_updated', room.tokens);
    });

    // Assign Equipment Token to Player (Removes token from map, places into player's 3x4 staging inventory)
    socket.on('assign_equip_to_player', ({ tokenId, targetPlayerId }) => {
      if (!currentRoom) return;
      const room = rooms.get(currentRoom);
      if (!room) return;

      const token = room.tokens.find(t => t.id === tokenId);
      if (!token) return;

      const targetPlayer = room.players.find(p => p.id === targetPlayerId);
      if (!targetPlayer) return;

      if (!targetPlayer.stagingInventory) targetPlayer.stagingInventory = [];
      targetPlayer.stagingInventory.push({
        id: `equip_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        name: token.baseName || token.name,
        label: token.name,
        imageUrl: token.imageUrl,
        gridW: token.gridW || 1,
        gridH: token.gridH || 1
      });

      // Remove equipment token from map grid
      room.tokens = room.tokens.filter(t => t.id !== tokenId);

      io.to(currentRoom).emit('tokens_updated', room.tokens);
      io.to(currentRoom).emit('players_updated', room.players);
    });

    // Update Staging Inventory directly
    socket.on('update_staging_inventory', (stagingInventory) => {
      if (!currentRoom || !currentUser) return;
      const room = rooms.get(currentRoom);
      if (!room) return;

      currentUser.stagingInventory = stagingInventory;
      io.to(currentRoom).emit('players_updated', room.players);
    });

    // Delete Token (Master only)
    socket.on('delete_token', (tokenId) => {
      if (!currentRoom) return;
      const room = rooms.get(currentRoom);
      if (!room) return;

      const token = room.tokens.find(t => t.id === tokenId);
      if (!token) return;

      // Allow Master or Assigned Player to delete token (Delete key)
      const canDelete = currentUser.isMaster || token.assignedPlayerId === currentUser.id;
      if (!canDelete) return;

      room.tokens = room.tokens.filter(t => t.id !== tokenId);
      io.to(currentRoom).emit('tokens_updated', room.tokens);
    });

    // Add Drawing
    socket.on('add_drawing', (drawingData) => {
      if (!currentRoom) return;
      const room = rooms.get(currentRoom);
      if (!room) return;

      const newDrawing = {
        id: `draw_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        authorId: currentUser.id,
        authorName: currentUser.name,
        ...drawingData
      };

      room.drawings.push(newDrawing);
      io.to(currentRoom).emit('drawings_updated', room.drawings);
    });

    // Delete Single Drawing (Eraser)
    socket.on('delete_drawing', (drawingId) => {
      if (!currentRoom) return;
      const room = rooms.get(currentRoom);
      if (!room) return;

      room.drawings = room.drawings.filter(d => d.id !== drawingId);
      io.to(currentRoom).emit('drawings_updated', room.drawings);
    });

    // Clear Drawings
    socket.on('clear_drawings', () => {
      if (!currentRoom) return;
      const room = rooms.get(currentRoom);
      if (!room) return;

      room.drawings = [];
      io.to(currentRoom).emit('drawings_updated', room.drawings);
    });

    // Upload / Update Character Sheet
    socket.on('update_sheet', (sheetData) => {
      if (!currentRoom || !currentUser) return;
      const room = rooms.get(currentRoom);
      if (!room) return;

      currentUser.sheetData = sheetData;
      io.to(currentRoom).emit('players_updated', room.players);
    });

    // Dice Roll Event
    socket.on('roll_dice', ({ diceType, numDice = 1, bonus = 0, label = '' }) => {
      if (!currentRoom || !currentUser) return;
      const room = rooms.get(currentRoom);
      if (!room) return;

      let sides = 20;
      if (diceType === 'd%') sides = 100;
      else {
        const match = diceType.match(/d(\d+)/i);
        if (match) sides = parseInt(match[1], 10);
      }

      const rolls = [];
      let total = 0;
      for (let i = 0; i < numDice; i++) {
        const val = Math.floor(Math.random() * sides) + 1;
        rolls.push(val);
        total += val;
      }
      const finalResult = total + bonus;

      const assignedToken = room.tokens.find(t => t.assignedPlayerId === currentUser.id);
      const displayName = assignedToken ? `${currentUser.name} (${assignedToken.name})` : currentUser.name;

      const rollObj = {
        id: `roll_${Date.now()}`,
        userName: displayName,
        diceType: `${numDice}${diceType}`,
        bonus,
        label: label || 'Rolagem',
        rolls,
        total,
        finalResult,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      };

      room.rollHistory.unshift(rollObj);
      if (room.rollHistory.length > 50) room.rollHistory.pop();

      io.to(currentRoom).emit('dice_rolled', rollObj);
      io.to(currentRoom).emit('roll_history_updated', room.rollHistory);
    });

    // Disconnect
    socket.on('disconnect', () => {
      if (currentRoom && rooms.has(currentRoom)) {
        const room = rooms.get(currentRoom);
        room.players = room.players.filter(p => p.id !== socket.id);
        if (room.players.length === 0) {
          rooms.delete(currentRoom);
        } else {
          if (currentUser?.isMaster && room.players.length > 0) {
            room.players[0].isMaster = true;
          }
          io.to(currentRoom).emit('players_updated', room.players);
        }
        io.emit('rooms_list_updated', getPublicRoomsList());
      }
    });
  });
}
