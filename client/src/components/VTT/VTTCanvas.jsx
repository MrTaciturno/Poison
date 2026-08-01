import React, { useEffect, useRef, useState } from 'react';
import * as PIXI from 'pixi.js';

// Geometry Helper for Eraser Collision Detection
function distToSegment(px, py, x1, y1, x2, y2) {
  const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
  if (l2 === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
}

function isPointNearDrawing(px, py, d, radius = 20) {
  if (!d) return false;
  if (d.type === 'straight_line' || d.type === 'ruler') {
    return distToSegment(px, py, d.startX || 0, d.startY || 0, d.endX || 0, d.endY || 0) <= radius;
  }
  if (d.type === 'freehand' && Array.isArray(d.points)) {
    for (let i = 0; i < d.points.length - 1; i++) {
      if (distToSegment(px, py, d.points[i].x, d.points[i].y, d.points[i + 1].x, d.points[i + 1].y) <= radius) {
        return true;
      }
    }
  }
  if (d.type === 'rectangle') {
    const nearTop = distToSegment(px, py, d.x, d.y, d.x + d.w, d.y) <= radius;
    const nearBottom = distToSegment(px, py, d.x, d.y + d.h, d.x + d.w, d.y + d.h) <= radius;
    const nearLeft = distToSegment(px, py, d.x, d.y, d.x, d.y + d.h) <= radius;
    const nearRight = distToSegment(px, py, d.x + d.w, d.y, d.x + d.w, d.y + d.h) <= radius;
    return nearTop || nearBottom || nearLeft || nearRight;
  }
  if (d.type === 'circle') {
    const distFromCenter = Math.hypot(px - (d.cx || 0), py - (d.cy || 0));
    return Math.abs(distFromCenter - (d.radius || 0)) <= radius || distFromCenter <= radius;
  }
  if (d.type === 'cone') {
    const nearLeft = distToSegment(px, py, d.originX, d.originY, d.leftX, d.leftY) <= radius;
    const nearRight = distToSegment(px, py, d.originX, d.originY, d.rightX, d.rightY) <= radius;
    const nearBase = distToSegment(px, py, d.leftX, d.leftY, d.rightX, d.rightY) <= radius;
    return nearLeft || nearRight || nearBase;
  }
  return false;
}

export default function VTTCanvas({
  mapState = {},
  tokens = [],
  drawings = [],
  selectedTokenId,
  onSelectToken,
  onMoveToken,
  onAddToken,
  onDeleteToken,
  onAddDrawing,
  onDeleteDrawing,
  activeDrawingTool,
  drawingColor,
  drawingWidth,
  currentUser = {},
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

  // Active Drawing In-Progress State
  const isDrawingRef = useRef(false);
  const drawStartRef = useRef(null);
  const freehandPointsRef = useRef([]);

  // Keep props in refs for event listeners
  const drawingToolRef = useRef(activeDrawingTool);
  const drawingColorRef = useRef(drawingColor);
  const drawingWidthRef = useRef(drawingWidth);
  const drawingsRef = useRef(drawings);
  const selectedTokenIdRef = useRef(selectedTokenId);
  const onDeleteTokenRef = useRef(onDeleteToken);

  useEffect(() => {
    drawingToolRef.current = activeDrawingTool;
    drawingColorRef.current = drawingColor;
    drawingWidthRef.current = drawingWidth;
    drawingsRef.current = drawings;
    selectedTokenIdRef.current = selectedTokenId;
    onDeleteTokenRef.current = onDeleteToken;
  }, [activeDrawingTool, drawingColor, drawingWidth, drawings, selectedTokenId, onDeleteToken]);

  useEffect(() => {
    if (!containerRef.current) return;

    // Clear any stale child elements
    containerRef.current.innerHTML = '';

    const width = containerRef.current.clientWidth || window.innerWidth;
    const height = containerRef.current.clientHeight || window.innerHeight;

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
    const drawingsContainer = new PIXI.Container();
    const tokensContainer = new PIXI.Container();
    const interactionLayer = new PIXI.Container();

    viewport.addChild(bgContainer);
    viewport.addChild(trailContainer);
    viewport.addChild(gridContainer);
    viewport.addChild(drawingsContainer);
    viewport.addChild(tokensContainer);
    viewport.addChild(interactionLayer);

    const clearInteractionLayer = () => {
      interactionLayer.removeChildren();
    };

    const handleResize = () => {
      if (!containerRef.current || !pixiAppRef.current) return;
      const newW = containerRef.current.clientWidth || window.innerWidth;
      const newH = containerRef.current.clientHeight || window.innerHeight;
      pixiAppRef.current.renderer.resize(newW, newH);
    };
    window.addEventListener('resize', handleResize);

    const checkAndEraseAtPoint = (localPos) => {
      if (!onDeleteDrawing || !drawingsRef.current) return;
      const radius = 25;
      drawingsRef.current.forEach((d) => {
        if (isPointNearDrawing(localPos.x, localPos.y, d, radius)) {
          onDeleteDrawing(d.id);
        }
      });
    };

    let isPanning = false;
    let panStart = { x: 0, y: 0 };

    const onPointerDown = (e) => {
      if (e.button === 1 || (e.button === 0 && e.altKey)) {
        isPanning = true;
        panStart = { x: e.clientX - viewport.position.x, y: e.clientY - viewport.position.y };
        return;
      }

      if (e.button === 0 && drawingToolRef.current === 'eraser') {
        const localPos = viewport.toLocal({ x: e.clientX, y: e.clientY });
        isDrawingRef.current = true;
        checkAndEraseAtPoint(localPos);
        return;
      }

      if (e.button === 0 && drawingToolRef.current && !draggingTokenRef.current) {
        const localPos = viewport.toLocal({ x: e.clientX, y: e.clientY });
        isDrawingRef.current = true;
        drawStartRef.current = { x: localPos.x, y: localPos.y };
        freehandPointsRef.current = [{ x: localPos.x, y: localPos.y }];
      }
    };

    const onPointerMove = (e) => {
      if (isPanning) {
        viewport.position.x = e.clientX - panStart.x;
        viewport.position.y = e.clientY - panStart.y;
        setPanPos({ x: viewport.position.x, y: viewport.position.y });
        return;
      }

      if (drawingToolRef.current === 'eraser') {
        const localPos = viewport.toLocal({ x: e.clientX, y: e.clientY });
        clearInteractionLayer();
        const gfx = new PIXI.Graphics();
        gfx.lineStyle(2, 0x8b322c, 0.8);
        gfx.drawCircle(localPos.x, localPos.y, 15);
        interactionLayer.addChild(gfx);

        if (isDrawingRef.current) {
          checkAndEraseAtPoint(localPos);
        }
        return;
      }

      if (isDrawingRef.current && drawingToolRef.current) {
        const localPos = viewport.toLocal({ x: e.clientX, y: e.clientY });
        const start = drawStartRef.current;
        if (!start) return;

        const colorHex = parseInt((drawingColorRef.current || '#a65d47').replace('#', ''), 16) || 0xa65d47;
        const strokeW = drawingWidthRef.current || 3;
        const squareSize = mapState?.gridSquareSize || 60;

        clearInteractionLayer();
        const gfx = new PIXI.Graphics();
        interactionLayer.addChild(gfx);

        if (drawingToolRef.current === 'freehand') {
          freehandPointsRef.current.push({ x: localPos.x, y: localPos.y });
          gfx.lineStyle(strokeW, colorHex, 0.9);
          gfx.moveTo(freehandPointsRef.current[0].x, freehandPointsRef.current[0].y);
          freehandPointsRef.current.forEach(pt => gfx.lineTo(pt.x, pt.y));
        } else if (drawingToolRef.current === 'straight_line') {
          gfx.lineStyle(strokeW, colorHex, 0.9);
          gfx.moveTo(start.x, start.y);
          gfx.lineTo(localPos.x, localPos.y);
        } else if (drawingToolRef.current === 'ruler') {
          gfx.lineStyle(strokeW, colorHex, 0.9);
          gfx.moveTo(start.x, start.y);
          gfx.lineTo(localPos.x, localPos.y);

          const dx = (localPos.x - start.x) / squareSize;
          const dy = (localPos.y - start.y) / squareSize;
          const distanceInSquares = Math.hypot(dx, dy);
          const distanceInMeters = distanceInSquares * 1.5;

          const textLabel = new PIXI.Text(
            `${distanceInSquares.toFixed(1)} q. (${distanceInMeters.toFixed(1)}m)`,
            {
              fontFamily: 'Cinzel',
              fontSize: 14,
              fontWeight: 'bold',
              fill: colorHex,
              stroke: 0x000000,
              strokeThickness: 4
            }
          );
          textLabel.position.set((start.x + localPos.x) / 2 + 10, (start.y + localPos.y) / 2 - 10);
          interactionLayer.addChild(textLabel);
        } else if (drawingToolRef.current === 'rectangle') {
          gfx.lineStyle(strokeW, colorHex, 0.9);
          const rx = Math.min(start.x, localPos.x);
          const ry = Math.min(start.y, localPos.y);
          const rw = Math.abs(localPos.x - start.x);
          const rh = Math.abs(localPos.y - start.y);
          gfx.drawRect(rx, ry, rw, rh);
        } else if (drawingToolRef.current === 'circle') {
          gfx.lineStyle(strokeW, colorHex, 0.9);
          const radius = Math.hypot(localPos.x - start.x, localPos.y - start.y);
          gfx.drawCircle(start.x, start.y, radius);
        } else if (drawingToolRef.current === 'cone') {
          gfx.lineStyle(strokeW, colorHex, 0.9);
          const dx = localPos.x - start.x;
          const dy = localPos.y - start.y;
          const angle = Math.atan2(dy, dx);
          const len = Math.hypot(dx, dy);
          const coneAngle = Math.PI / 4;

          const leftX = start.x + len * Math.cos(angle - coneAngle / 2);
          const leftY = start.y + len * Math.sin(angle - coneAngle / 2);
          const rightX = start.x + len * Math.cos(angle + coneAngle / 2);
          const rightY = start.y + len * Math.sin(angle + coneAngle / 2);

          gfx.beginFill(colorHex, 0.2);
          gfx.moveTo(start.x, start.y);
          gfx.lineTo(leftX, leftY);
          gfx.lineTo(rightX, rightY);
          gfx.lineTo(start.x, start.y);
          gfx.endFill();
        }
      }
    };

    const onPointerUp = (e) => {
      if (isPanning) {
        isPanning = false;
        return;
      }

      if (isDrawingRef.current && drawingToolRef.current && drawingToolRef.current !== 'eraser') {
        isDrawingRef.current = false;
        clearInteractionLayer();
        const start = drawStartRef.current;
        if (!start) return;

        const color = drawingColorRef.current || '#a65d47';
        const width = drawingWidthRef.current || 3;
        const localPos = viewport.toLocal({ x: e.clientX, y: e.clientY });

        if (drawingToolRef.current === 'freehand') {
          onAddDrawing({ type: 'freehand', points: freehandPointsRef.current, color, width });
        } else if (drawingToolRef.current === 'straight_line') {
          onAddDrawing({ type: 'straight_line', startX: start.x, startY: start.y, endX: localPos.x, endY: localPos.y, color, width });
        } else if (drawingToolRef.current === 'rectangle') {
          const rx = Math.min(start.x, localPos.x);
          const ry = Math.min(start.y, localPos.y);
          const rw = Math.abs(localPos.x - start.x);
          const rh = Math.abs(localPos.y - start.y);
          onAddDrawing({ type: 'rectangle', x: rx, y: ry, w: rw, h: rh, color, width });
        } else if (drawingToolRef.current === 'circle') {
          const radius = Math.hypot(localPos.x - start.x, localPos.y - start.y);
          onAddDrawing({ type: 'circle', cx: start.x, cy: start.y, radius, color, width });
        } else if (drawingToolRef.current === 'cone') {
          const dx = localPos.x - start.x;
          const dy = localPos.y - start.y;
          const angle = Math.atan2(dy, dx);
          const len = Math.hypot(dx, dy);
          const coneAngle = Math.PI / 4;

          const leftX = start.x + len * Math.cos(angle - coneAngle / 2);
          const leftY = start.y + len * Math.sin(angle - coneAngle / 2);
          const rightX = start.x + len * Math.cos(angle + coneAngle / 2);
          const rightY = start.y + len * Math.sin(angle + coneAngle / 2);

          onAddDrawing({ type: 'cone', originX: start.x, originY: start.y, leftX, leftY, rightX, rightY, color, width });
        }
      }
    };

    const onWheel = (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
      const newScale = Math.min(Math.max(viewport.scale.x * zoomFactor, 0.2), 4.0);

      const rect = containerRef.current.getBoundingClientRect();
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

    const onKeyDown = (e) => {
      const isTyping = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);

      if ((e.code === 'Delete' || e.code === 'Backspace') && selectedTokenIdRef.current && !isTyping) {
        e.preventDefault();
        if (onDeleteTokenRef.current) {
          onDeleteTokenRef.current(selectedTokenIdRef.current);
        }
        return;
      }

      if (e.code === 'Space' && draggingTokenRef.current) {
        e.preventDefault();
        const t = draggingTokenRef.current;
        waypointsRef.current.push({ x: t.x, y: t.y });
      }
    };

    const canvasElement = app.view;
    canvasElement.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    canvasElement.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (canvasElement) {
        canvasElement.removeEventListener('pointerdown', onPointerDown);
        canvasElement.removeEventListener('wheel', onWheel);
      }
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('keydown', onKeyDown);

      if (pixiAppRef.current) {
        try {
          pixiAppRef.current.destroy(true, { children: true });
        } catch (err) {}
        pixiAppRef.current = null;
      }
    };
  }, []);

  // Update Canvas Content when Props Change
  useEffect(() => {
    if (!pixiAppRef.current || !viewportRef.current) return;
    const viewport = viewportRef.current;

    const bgContainer = viewport.children[0];
    const trailContainer = viewport.children[1];
    const gridGraphics = viewport.children[2];
    const drawingsContainer = viewport.children[3];
    const tokensContainer = viewport.children[4];
    const interactionLayer = viewport.children[5];

    const squareSize = mapState?.gridSquareSize || 60;
    const cols = mapState?.gridColumns || 24;
    const rows = mapState?.gridRows || 24;
    const totalW = cols * squareSize;
    const totalH = rows * squareSize;

    // 1. Background Image
    bgContainer.removeChildren();
    if (mapState?.bgImage) {
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
    const hexColor = parseInt((mapState?.gridColor || '#c8b080').replace('#', ''), 16) || 0xc8b080;
    gridGraphics.lineStyle(1, hexColor, mapState?.gridOpacity ?? 0.4);

    for (let c = 0; c <= cols; c++) {
      gridGraphics.moveTo(c * squareSize, 0);
      gridGraphics.lineTo(c * squareSize, totalH);
    }
    for (let r = 0; r <= rows; r++) {
      gridGraphics.moveTo(0, r * squareSize);
      gridGraphics.lineTo(totalW, r * squareSize);
    }

    // 3. Movement Trail Layer
    trailContainer.removeChildren();
    if (mapState?.showTrail !== false) {
      (tokens || []).forEach(t => {
        if (t?.prevPath && t.prevPath.length > 1) {
          const trailGraphics = new PIXI.Graphics();
          const trailColor = parseInt((t.borderColor || '#a67c52').replace('#', ''), 16) || 0xa67c52;
          trailGraphics.lineStyle(2, trailColor, 0.6);

          let prevPt = t.prevPath[0];
          trailGraphics.moveTo(prevPt.x * squareSize + squareSize / 2, prevPt.y * squareSize + squareSize / 2);

          for (let i = 1; i < t.prevPath.length; i++) {
            const pt = t.prevPath[i];
            trailGraphics.lineTo(pt.x * squareSize + squareSize / 2, pt.y * squareSize + squareSize / 2);
            trailGraphics.drawCircle(pt.x * squareSize + squareSize / 2, pt.y * squareSize + squareSize / 2, 3);
          }
          trailContainer.addChild(trailGraphics);
        }
      });
    }

    // 4. Drawings Layer
    drawingsContainer.removeChildren();
    const drawingsGraphics = new PIXI.Graphics();
    drawingsContainer.addChild(drawingsGraphics);

    (drawings || []).forEach(d => {
      if (!d) return;
      const color = parseInt((d.color || '#a65d47').replace('#', ''), 16) || 0xa65d47;
      const strokeW = d.width || 3;

      if (d.type === 'freehand' && d.points && d.points.length > 0) {
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
      }
    });

    // 5. Tokens Layer
    tokensContainer.removeChildren();
    (tokens || []).forEach(t => {
      if (!t) return;
      try {
        const tokenGroup = new PIXI.Container();
        const gridX = typeof t.x === 'number' ? t.x : 0;
        const gridY = typeof t.y === 'number' ? t.y : 0;
        tokenGroup.position.set(gridX * squareSize, gridY * squareSize);
        tokenGroup.eventMode = 'static';
        tokenGroup.cursor = 'pointer';

        const gridW = typeof t.gridW === 'number' && t.gridW > 0 ? t.gridW : 1;
        const gridH = typeof t.gridH === 'number' && t.gridH > 0 ? t.gridH : 1;
        const tokenW = gridW * squareSize;
        const tokenH = gridH * squareSize;

        // Aura
        if (t.auraRadius > 0 && typeof t.auraColor === 'string' && t.auraColor !== 'transparent') {
          const auraGraphic = new PIXI.Graphics();
          const auraColorHex = parseInt(t.auraColor.replace('#', ''), 16) || 0xc5a059;
          const auraPx = (t.auraRadius || 1) * squareSize;
          auraGraphic.beginFill(auraColorHex, 0.25);
          auraGraphic.drawCircle(tokenW / 2, tokenH / 2, auraPx);
          auraGraphic.endFill();
          tokenGroup.addChild(auraGraphic);
        }

        // Border & Background
        const borderGraphic = new PIXI.Graphics();
        const rawBorderColor = typeof t.borderColor === 'string' ? t.borderColor : '#a67c52';
        const borderColorHex = parseInt(rawBorderColor.replace('#', ''), 16) || 0xa67c52;
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
          sprite.width = Math.max(10, tokenW - 4);
          sprite.height = Math.max(10, tokenH - 4);
          sprite.position.set(2, 2);
          tokenGroup.addChild(sprite);
        }

        // Name Label
        const nameText = new PIXI.Text(t.name || t.baseName || 'Token', {
          fontFamily: 'Inter',
          fontSize: 11,
          fontWeight: 'bold',
          fill: 0xffffff,
          stroke: 0x000000,
          strokeThickness: 3
        });
        nameText.position.set(Math.max(0, tokenW / 2 - nameText.width / 2), tokenH + 2);
        tokenGroup.addChild(nameText);

        // HP Bar
        if (typeof t.maxHp === 'number' && t.maxHp > 0) {
          const hpBar = new PIXI.Graphics();
          const currentHp = typeof t.hp === 'number' ? t.hp : t.maxHp;
          const hpRatio = Math.max(0, Math.min(1, currentHp / t.maxHp));
          hpBar.beginFill(0x221a14);
          hpBar.drawRect(2, -8, Math.max(1, tokenW - 4), 5);
          hpBar.endFill();

          hpBar.beginFill(0x486e42);
          hpBar.drawRect(2, -8, Math.max(1, (tokenW - 4) * hpRatio), 5);
          hpBar.endFill();
          tokenGroup.addChild(hpBar);
        }

        // Click & Drag Token Events
        let isDragging = false;
        let startGridPos = { x: gridX, y: gridY };

        tokenGroup.on('pointerdown', (e) => {
          if (e.button !== 0 || drawingToolRef.current) return;
          e.stopPropagation();
          if (onSelectToken) onSelectToken(t);

          isDragging = true;
          draggingTokenRef.current = t;
          waypointsRef.current = [{ x: gridX, y: gridY }];
          startGridPos = { x: gridX, y: gridY };
        });

        const onGlobalPointerMove = (e) => {
          if (!isDragging) return;
          const localPos = viewport.toLocal(e.global);
          const currentGridX = Math.floor(localPos.x / squareSize);
          const currentGridY = Math.floor(localPos.y / squareSize);

          interactionLayer.removeChildren();
          const gfx = new PIXI.Graphics();
          gfx.lineStyle(3, 0xe2c077, 0.9);
          interactionLayer.addChild(gfx);

          let currentPt = { x: startGridPos.x * squareSize + squareSize / 2, y: startGridPos.y * squareSize + squareSize / 2 };
          gfx.moveTo(currentPt.x, currentPt.y);

          let totalSquares = 0;
          let prevGridPos = { x: startGridPos.x, y: startGridPos.y };

          waypointsRef.current.forEach(wp => {
            const dx = wp.x - prevGridPos.x;
            const dy = wp.y - prevGridPos.y;
            totalSquares += Math.hypot(dx, dy);
            prevGridPos = { x: wp.x, y: wp.y };

            const wpPx = { x: wp.x * squareSize + squareSize / 2, y: wp.y * squareSize + squareSize / 2 };
            gfx.lineTo(wpPx.x, wpPx.y);
            gfx.drawCircle(wpPx.x, wpPx.y, 4);
            currentPt = wpPx;
          });

          const targetPx = { x: currentGridX * squareSize + squareSize / 2, y: currentGridY * squareSize + squareSize / 2 };
          gfx.lineTo(targetPx.x, targetPx.y);

          const lastDx = currentGridX - prevGridPos.x;
          const lastDy = currentGridY - prevGridPos.y;
          totalSquares += Math.hypot(lastDx, lastDy);

          const angle = Math.atan2(targetPx.y - currentPt.y, targetPx.x - currentPt.x);
          gfx.beginFill(0xe2c077, 1);
          gfx.drawPolygon([
            targetPx.x, targetPx.y,
            targetPx.x - 12 * Math.cos(angle - Math.PI / 6), targetPx.y - 12 * Math.sin(angle - Math.PI / 6),
            targetPx.x - 12 * Math.cos(angle + Math.PI / 6), targetPx.y - 12 * Math.sin(angle + Math.PI / 6)
          ]);
          gfx.endFill();

          // Live Movement Distance Badge Text Label
          const distText = new PIXI.Text(`${totalSquares.toFixed(1)} q. (${(totalSquares * 1.5).toFixed(1)}m)`, {
            fontFamily: 'Cinzel',
            fontSize: 14,
            fontWeight: 'bold',
            fill: 0xe2c077,
            stroke: 0x000000,
            strokeThickness: 4
          });
          distText.position.set(targetPx.x + 14, targetPx.y - 14);
          interactionLayer.addChild(distText);
        };

        const onGlobalPointerUp = (e) => {
          if (!isDragging) return;
          isDragging = false;
          draggingTokenRef.current = null;

          interactionLayer.removeChildren();

          const localPos = viewport.toLocal(e.global);
          const finalGridX = Math.max(0, Math.min(cols - 1, Math.floor(localPos.x / squareSize)));
          const finalGridY = Math.max(0, Math.min(rows - 1, Math.floor(localPos.y / squareSize)));

          const fullPath = [...waypointsRef.current, { x: finalGridX, y: finalGridY }];
          waypointsRef.current = [];

          if (onMoveToken) {
            onMoveToken(t.id, finalGridX, finalGridY, fullPath);
          }
        };

        pixiAppRef.current.stage.eventMode = 'static';
        pixiAppRef.current.stage.on('pointermove', onGlobalPointerMove);
        pixiAppRef.current.stage.on('pointerup', onGlobalPointerUp);

        tokensContainer.addChild(tokenGroup);
      } catch (err) {
        console.error('Erro ao renderizar token:', err, t);
      }
    });

  }, [mapState, tokens, drawings, selectedTokenId]);

  // HTML5 Drag & Drop from Sidebar to Canvas
  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const dataStr = e.dataTransfer.getData('text/plain');
    if (!dataStr || !viewportRef.current) return;

    try {
      const payload = JSON.parse(dataStr);
      const squareSize = mapState?.gridSquareSize || 60;
      const rect = containerRef.current.getBoundingClientRect();
      const dropMousePos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      const localPos = viewportRef.current.toLocal(dropMousePos);

      const gridX = Math.max(0, Math.floor(localPos.x / squareSize));
      const gridY = Math.max(0, Math.floor(localPos.y / squareSize));

      if (onAddToken) {
        onAddToken({
          baseName: payload.baseName || 'Token',
          imageUrl: payload.imageUrl,
          gridW: payload.gridW || 1,
          gridH: payload.gridH || 1,
          x: gridX,
          y: gridY,
          hp: 20,
          maxHp: 20,
          mp: 10,
          maxMp: 10
        });
      }
    } catch (err) {
      console.error('Erro ao soltar item no mapa:', err);
    }
  };

  return (
    <div
      className="vtt-canvas-wrapper"
      ref={containerRef}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    />
  );
}
