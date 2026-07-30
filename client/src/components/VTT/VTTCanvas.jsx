import React, { useEffect, useRef, useState } from 'react';
import * as PIXI from 'pixi.js';

export default function VTTCanvas({
  mapState,
  tokens = [],
  drawings = [],
  selectedTokenId,
  onSelectToken,
  onMoveToken,
  onAddDrawing,
  activeDrawingTool,
  drawingColor,
  drawingWidth,
  currentUser,
  socket
}) {
  const containerRef = useRef(null);
  const pixiAppRef = useRef(null);
  const viewportRef = useRef(null);

  // Interaction State
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panPos, setPanPos] = useState({ x: 0, y: 0 });

  // Dragging Token State
  const draggingTokenRef = useRef(null);
  const waypointsRef = useRef([]);

  // Drawing in progress
  const drawingInProgressRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Create Pixi.js Application
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const app = new PIXI.Application({
      width,
      height,
      backgroundColor: 0x120c09,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true
    });

    containerRef.current.appendChild(app.view);
    pixiAppRef.current = app;

    // Viewport Container (Handles Pan & Zoom)
    const viewport = new PIXI.Container();
    app.stage.addChild(viewport);
    viewportRef.current = viewport;

    // Containers inside Viewport
    const bgContainer = new PIXI.Container();
    const trailContainer = new PIXI.Container();
    const gridContainer = new PIXI.Graphics();
    const drawingsContainer = new PIXI.Graphics();
    const tokensContainer = new PIXI.Container();
    const interactionLayer = new PIXI.Graphics();

    viewport.addChild(bgContainer);
    viewport.addChild(trailContainer);
    viewport.addChild(gridContainer);
    viewport.addChild(drawingsContainer);
    viewport.addChild(tokensContainer);
    viewport.addChild(interactionLayer);

    // Dynamic Window Resize Listener
    const handleResize = () => {
      if (!containerRef.current || !pixiAppRef.current) return;
      const newW = containerRef.current.clientWidth;
      const newH = containerRef.current.clientHeight;
      pixiAppRef.current.renderer.resize(newW, newH);
    };
    window.addEventListener('resize', handleResize);

    // Pan & Zoom Event Listeners
    let isPanning = false;
    let panStart = { x: 0, y: 0 };

    const canvasElement = app.view;

    const onPointerDown = (e) => {
      // Middle click (button 1) or background drag with space or non-token click
      if (e.button === 1 || (e.button === 0 && e.altKey)) {
        isPanning = true;
        panStart = { x: e.clientX - viewport.position.x, y: e.clientY - viewport.position.y };
      }
    };

    const onPointerMove = (e) => {
      if (isPanning) {
        viewport.position.x = e.clientX - panStart.x;
        viewport.position.y = e.clientY - panStart.y;
        setPanPos({ x: viewport.position.x, y: viewport.position.y });
      }
    };

    const onPointerUp = (e) => {
      if (e.button === 1 || e.button === 0) {
        isPanning = false;
      }
    };

    const onWheel = (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
      const newScale = Math.min(Math.max(viewport.scale.x * zoomFactor, 0.2), 4.0);

      // Zoom centered on cursor
      const rect = canvasElement.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const worldPos = {
        x: (mouseX - viewport.position.x) / viewport.scale.x,
        y: (mouseY - viewport.position.y) / viewport.scale.y
      };

      viewport.scale.set(newScale);
      viewport.position.x = mouseX - worldPos.x * newScale;
      viewport.position.y = mouseY - worldPos.y * newScale;

      setZoomLevel(newScale);
      setPanPos({ x: viewport.position.x, y: viewport.position.y });
    };

    canvasElement.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    canvasElement.addEventListener('wheel', onWheel, { passive: false });

    // Handle Spacebar Waypoints during Token Dragging
    const onKeyDown = (e) => {
      if (e.code === 'Space' && draggingTokenRef.current) {
        e.preventDefault();
        const mousePos = pixiAppRef.current.renderer.events.pointer.global;
        const localPos = viewportRef.current.toLocal(mousePos);
        const squareSize = mapState.gridSquareSize || 60;
        const currentGridX = Math.floor(localPos.x / squareSize);
        const currentGridY = Math.floor(localPos.y / squareSize);

        waypointsRef.current.push({ x: currentGridX, y: currentGridY });
      }
    };

    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('resize', handleResize);
      canvasElement.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      canvasElement.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKeyDown);
      app.destroy(true, { children: true, texture: true, baseTexture: true });
    };
  }, []);

  // Update Canvas Content when Props Change
  useEffect(() => {
    if (!pixiAppRef.current || !viewportRef.current) return;
    const viewport = viewportRef.current;

    const bgContainer = viewport.children[0];
    const trailContainer = viewport.children[1];
    const gridGraphics = viewport.children[2];
    const drawingsGraphics = viewport.children[3];
    const tokensContainer = viewport.children[4];
    const interactionLayer = viewport.children[5];

    const squareSize = mapState.gridSquareSize || 60;
    const cols = mapState.gridColumns || 24;
    const rows = mapState.gridRows || 24;
    const totalW = cols * squareSize;
    const totalH = rows * squareSize;

    // 1. Background Image
    bgContainer.removeChildren();
    if (mapState.bgImage) {
      const texture = PIXI.Texture.from(mapState.bgImage);
      const bgSprite = new PIXI.Sprite(texture);
      bgSprite.width = totalW;
      bgSprite.height = totalH;
      bgContainer.addChild(bgSprite);
    } else {
      const bgRect = new PIXI.Graphics();
      bgRect.beginFill(0x221a14);
      bgRect.drawRect(0, 0, totalW, totalH);
      bgRect.endFill();
      bgContainer.addChild(bgRect);
    }

    // 2. Grid Graphics
    gridGraphics.clear();
    const hexColor = parseInt((mapState.gridColor || '#c8b080').replace('#', ''), 16);
    gridGraphics.lineStyle(1, hexColor, mapState.gridOpacity ?? 0.4);

    for (let c = 0; c <= cols; c++) {
      gridGraphics.moveTo(c * squareSize, 0);
      gridGraphics.lineTo(c * squareSize, totalH);
    }
    for (let r = 0; r <= rows; r++) {
      gridGraphics.moveTo(0, r * squareSize);
      gridGraphics.lineTo(totalW, r * squareSize);
    }

    // 3. Movement Trails (Faint dashed lines from last move)
    trailContainer.removeChildren();
    if (mapState.showTrail !== false) {
      tokens.forEach(token => {
        if (token.prevPath && token.prevPath.length > 1) {
          const trailGraphics = new PIXI.Graphics();
          trailGraphics.lineStyle(2, 0xd8c29d, 0.4);

          const startX = token.prevPath[0].x * squareSize + squareSize / 2;
          const startY = token.prevPath[0].y * squareSize + squareSize / 2;
          trailGraphics.moveTo(startX, startY);

          for (let i = 1; i < token.prevPath.length; i++) {
            const ptX = token.prevPath[i].x * squareSize + squareSize / 2;
            const ptY = token.prevPath[i].y * squareSize + squareSize / 2;
            trailGraphics.lineTo(ptX, ptY);
          }
          trailContainer.addChild(trailGraphics);
        }
      });
    }

    // 4. Drawings Layer
    drawingsGraphics.clear();
    drawings.forEach(d => {
      const color = parseInt((d.color || '#a65d47').replace('#', ''), 16);
      const strokeW = d.width || 3;

      if (d.type === 'freehand' && d.points) {
        drawingsGraphics.lineStyle(strokeW, color, 0.9);
        drawingsGraphics.moveTo(d.points[0].x, d.points[0].y);
        d.points.forEach(pt => drawingsGraphics.lineTo(pt.x, pt.y));
      } else if (d.type === 'straight_line') {
        drawingsGraphics.lineStyle(strokeW, color, 0.9);
        drawingsGraphics.moveTo(d.startX, d.startY);
        drawingsGraphics.lineTo(d.endX, d.endY);
      } else if (d.type === 'rectangle') {
        drawingsGraphics.lineStyle(strokeW, color, 0.9);
        drawingsGraphics.drawRect(d.x, d.y, d.w, d.h);
      } else if (d.type === 'circle') {
        drawingsGraphics.lineStyle(strokeW, color, 0.9);
        drawingsGraphics.drawCircle(d.cx, d.cy, d.radius);
      } else if (d.type === 'cone') {
        drawingsGraphics.lineStyle(strokeW, color, 0.9);
        drawingsGraphics.beginFill(color, 0.2);
        drawingsGraphics.moveTo(d.originX, d.originY);
        drawingsGraphics.lineTo(d.leftX, d.leftY);
        drawingsGraphics.lineTo(d.rightX, d.rightY);
        drawingsGraphics.lineTo(d.originX, d.originY);
        drawingsGraphics.endFill();
      } else if (d.type === 'ruler') {
        drawingsGraphics.lineStyle(2, 0xc5a059, 1);
        drawingsGraphics.moveTo(d.startX, d.startY);
        drawingsGraphics.lineTo(d.endX, d.endY);

        // Distance text
        const distPx = Math.hypot(d.endX - d.startX, d.endY - d.startY);
        const distSquares = (distPx / squareSize).toFixed(1);
        const text = new PIXI.Text(`${distSquares} q. (${(distSquares * 1.5).toFixed(1)}m)`, {
          fontFamily: 'Cinzel',
          fontSize: 14,
          fill: 0xe2c077,
          stroke: 0x000000,
          strokeThickness: 3
        });
        text.position.set((d.startX + d.endX) / 2, (d.startY + d.endY) / 2 - 10);
        drawingsGraphics.addChild(text);
      }
    });

    // 5. Tokens Layer
    tokensContainer.removeChildren();
    tokens.forEach(t => {
      const tokenGroup = new PIXI.Container();
      tokenGroup.position.set(t.x * squareSize, t.y * squareSize);
      tokenGroup.eventMode = 'static';
      tokenGroup.cursor = 'pointer';

      const tokenW = (t.gridW || 1) * squareSize;
      const tokenH = (t.gridH || 1) * squareSize;

      // Aura (Radius in squares)
      if (t.auraRadius > 0 && t.auraColor && t.auraColor !== 'transparent') {
        const auraGraphic = new PIXI.Graphics();
        const auraColorHex = parseInt(t.auraColor.replace('#', ''), 16);
        const auraPx = t.auraRadius * squareSize;
        auraGraphic.beginFill(auraColorHex, 0.25);
        auraGraphic.drawCircle(tokenW / 2, tokenH / 2, auraPx);
        auraGraphic.endFill();
        tokenGroup.addChild(auraGraphic);
      }

      // Token Border & Background
      const borderGraphic = new PIXI.Graphics();
      const borderColorHex = parseInt((t.borderColor || '#a67c52').replace('#', ''), 16);
      const isSelected = t.id === selectedTokenId;

      borderGraphic.beginFill(0x382b22);
      borderGraphic.lineStyle(isSelected ? 4 : 2, isSelected ? 0xe2c077 : borderColorHex, 1);
      borderGraphic.drawRect(0, 0, tokenW, tokenH);
      borderGraphic.endFill();
      tokenGroup.addChild(borderGraphic);

      // Token Image
      if (t.imageUrl) {
        const imgTexture = PIXI.Texture.from(t.imageUrl);
        const sprite = new PIXI.Sprite(imgTexture);
        sprite.width = tokenW - 4;
        sprite.height = tokenH - 4;
        sprite.position.set(2, 2);
        tokenGroup.addChild(sprite);
      }

      // Token Name Label
      const nameText = new PIXI.Text(t.name, {
        fontFamily: 'Inter',
        fontSize: 11,
        fontWeight: 'bold',
        fill: 0xffffff,
        stroke: 0x000000,
        strokeThickness: 3
      });
      nameText.position.set(tokenW / 2 - nameText.width / 2, tokenH + 2);
      tokenGroup.addChild(nameText);

      // HP Bar over Token
      if (t.maxHp > 0) {
        const hpBar = new PIXI.Graphics();
        const hpRatio = Math.max(0, Math.min(1, t.hp / t.maxHp));
        hpBar.beginFill(0x221a14);
        hpBar.drawRect(2, -8, tokenW - 4, 5);
        hpBar.endFill();

        hpBar.beginFill(0x486e42);
        hpBar.drawRect(2, -8, (tokenW - 4) * hpRatio, 5);
        hpBar.endFill();
        tokenGroup.addChild(hpBar);
      }

      // Click & Drag Events for Token
      let isDragging = false;
      let startGridPos = { x: t.x, y: t.y };

      tokenGroup.on('pointerdown', (e) => {
        if (e.button !== 0) return;
        e.stopPropagation();
        onSelectToken(t);

        isDragging = true;
        draggingTokenRef.current = t;
        waypointsRef.current = [{ x: t.x, y: t.y }];
        startGridPos = { x: t.x, y: t.y };
      });

      // Pointer movement while dragging token
      const onGlobalPointerMove = (e) => {
        if (!isDragging) return;
        const localPos = viewport.toLocal(e.global);
        const currentGridX = Math.floor(localPos.x / squareSize);
        const currentGridY = Math.floor(localPos.y / squareSize);

        // Render Vector Arrow and Waypoints preview on Interaction Layer
        interactionLayer.clear();
        interactionLayer.lineStyle(3, 0xe2c077, 0.9);

        let currentPt = { x: startGridPos.x * squareSize + squareSize / 2, y: startGridPos.y * squareSize + squareSize / 2 };
        interactionLayer.moveTo(currentPt.x, currentPt.y);

        waypointsRef.current.forEach(wp => {
          const wpPx = { x: wp.x * squareSize + squareSize / 2, y: wp.y * squareSize + squareSize / 2 };
          interactionLayer.lineTo(wpPx.x, wpPx.y);
          interactionLayer.drawCircle(wpPx.x, wpPx.y, 4);
          currentPt = wpPx;
        });

        // Arrow to current mouse grid position
        const targetPx = { x: currentGridX * squareSize + squareSize / 2, y: currentGridY * squareSize + squareSize / 2 };
        interactionLayer.lineTo(targetPx.x, targetPx.y);

        // Arrow head
        const angle = Math.atan2(targetPx.y - currentPt.y, targetPx.x - currentPt.x);
        interactionLayer.beginFill(0xe2c077, 1);
        interactionLayer.drawPolygon([
          targetPx.x, targetPx.y,
          targetPx.x - 12 * Math.cos(angle - Math.PI / 6), targetPx.y - 12 * Math.sin(angle - Math.PI / 6),
          targetPx.x - 12 * Math.cos(angle + Math.PI / 6), targetPx.y - 12 * Math.sin(angle + Math.PI / 6)
        ]);
        interactionLayer.endFill();
      };

      const onGlobalPointerUp = (e) => {
        if (!isDragging) return;
        isDragging = false;
        draggingTokenRef.current = null;
        interactionLayer.clear();

        const localPos = viewport.toLocal(e.global);
        const finalGridX = Math.max(0, Math.min(cols - 1, Math.floor(localPos.x / squareSize)));
        const finalGridY = Math.max(0, Math.min(rows - 1, Math.floor(localPos.y / squareSize)));

        const fullPath = [...waypointsRef.current, { x: finalGridX, y: finalGridY }];
        waypointsRef.current = [];

        // Snap to grid on release
        onMoveToken(t.id, finalGridX, finalGridY, fullPath);
      };

      pixiAppRef.current.stage.eventMode = 'static';
      pixiAppRef.current.stage.on('pointermove', onGlobalPointerMove);
      pixiAppRef.current.stage.on('pointerup', onGlobalPointerUp);

      tokensContainer.addChild(tokenGroup);
    });

  }, [mapState, tokens, drawings, selectedTokenId]);

  return (
    <div className="vtt-canvas-wrapper" ref={containerRef} />
  );
}
