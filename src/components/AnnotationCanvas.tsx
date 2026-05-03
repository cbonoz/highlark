import React, { useRef, useEffect, useState } from 'react';
import { Drawing } from '../storage';

export interface CanvasProps {
  imageDataUrl: string;
  onSave: (annotatedImageDataUrl: string, drawings: Drawing[]) => void;
  onCancel: () => void;
}

type DrawingTool = 'text' | 'arrow' | 'rect' | 'circle' | 'line' | 'eraser' | 'pointer';

export function AnnotationCanvas({ imageDataUrl, onSave, onCancel }: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentTool, setCurrentTool] = useState<DrawingTool>('arrow');
  const [color, setColor] = useState('#FF0000');
  const [fontSize, setFontSize] = useState(16);
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const [textInput, setTextInput] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);
  const [textX, setTextX] = useState(0);
  const [textY, setTextY] = useState(0);

  // Load image on mount
  useEffect(() => {
    console.log('[Canvas] Mounting, imageDataUrl length:', imageDataUrl?.length || 0);
    console.log('[Canvas] imageDataUrl type:', typeof imageDataUrl);
    console.log('[Canvas] imageDataUrl first 100 chars:', imageDataUrl?.substring(0, 100) || 'EMPTY');
    
    if (!imageDataUrl) {
      console.warn('[Canvas] No imageDataUrl provided');
      return;
    }
    
    const canvas = canvasRef.current;
    if (!canvas) {
      console.error('[Canvas] Canvas ref not available');
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('[Canvas] Could not get canvas context');
      return;
    }

    const img = new Image();
    img.onload = () => {
      console.log('[Canvas] Image loaded successfully, dimensions:', img.width, 'x', img.height);
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      redrawCanvas(ctx, img, []);
      console.log('[Canvas] Image drawn to canvas');
    };
    img.onerror = (e) => {
      console.error('[Canvas] Image failed to load, error:', e);
    };
    img.onabort = () => {
      console.error('[Canvas] Image loading aborted');
    };
    console.log('[Canvas] Setting image src to:', imageDataUrl.substring(0, 80));
    img.src = imageDataUrl;
  }, [imageDataUrl]);

  const redrawCanvas = (ctx: CanvasRenderingContext2D, img: HTMLImageElement, drawnItems: Drawing[]) => {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.drawImage(img, 0, 0);

    drawnItems.forEach((drawing) => {
      drawItem(ctx, drawing);
    });
  };

  const drawItem = (ctx: CanvasRenderingContext2D, item: Drawing) => {
    ctx.strokeStyle = item.color || '#FF0000';
    ctx.fillStyle = item.color || '#FF0000';

    switch (item.type) {
      case 'text':
        ctx.font = `${item.fontSize || 16}px Arial`;
        ctx.fillStyle = item.color || '#FF0000';
        ctx.fillText(item.content || '', item.x, item.y);
        break;
      case 'arrow':
        drawArrow(ctx, item.x, item.y, item.x + item.width, item.y + item.height);
        break;
      case 'rect':
        ctx.strokeRect(item.x, item.y, item.width, item.height);
        break;
      case 'circle':
        ctx.beginPath();
        ctx.arc(item.x + item.width / 2, item.y + item.height / 2, item.width / 2, 0, Math.PI * 2);
        ctx.stroke();
        break;
      case 'line':
        ctx.beginPath();
        ctx.moveTo(item.x, item.y);
        ctx.lineTo(item.x + item.width, item.y + item.height);
        ctx.stroke();
        break;
    }
  };

  const drawArrow = (ctx: CanvasRenderingContext2D, fromX: number, fromY: number, toX: number, toY: number) => {
    const headlen = 15;
    const angle = Math.atan2(toY - fromY, toX - fromX);

    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - headlen * Math.cos(angle - Math.PI / 6), toY - headlen * Math.sin(angle - Math.PI / 6));
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - headlen * Math.cos(angle + Math.PI / 6), toY - headlen * Math.sin(angle + Math.PI / 6));
    ctx.stroke();
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (currentTool === 'text') {
      setTextX(x);
      setTextY(y);
      setShowTextInput(true);
      return;
    }

    setIsDrawing(true);
    setStartX(x);
    setStartY(y);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const img = new Image();
    img.onload = () => {
      redrawCanvas(ctx, img, drawings);

      ctx.strokeStyle = color;
      ctx.lineWidth = 2;

      switch (currentTool) {
        case 'arrow':
          drawArrow(ctx, startX, startY, x, y);
          break;
        case 'rect':
          ctx.strokeRect(startX, startY, x - startX, y - startY);
          break;
        case 'circle':
          ctx.beginPath();
          ctx.arc(startX, startY, Math.hypot(x - startX, y - startY), 0, Math.PI * 2);
          ctx.stroke();
          break;
        case 'line':
          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.lineTo(x, y);
          ctx.stroke();
          break;
      }
    };
    img.src = imageDataUrl;
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newDrawing: Drawing = {
      id: `${Date.now()}-${Math.random()}`,
      type: currentTool as any,
      x: startX,
      y: startY,
      width: x - startX,
      height: y - startY,
      color,
    };

    const updatedDrawings = [...drawings, newDrawing];
    setDrawings(updatedDrawings);
    setIsDrawing(false);
  };

  const addText = () => {
    if (!textInput.trim()) {
      setShowTextInput(false);
      return;
    }

    const newDrawing: Drawing = {
      id: `${Date.now()}-${Math.random()}`,
      type: 'text',
      x: textX,
      y: textY,
      width: 0,
      height: 0,
      content: textInput,
      color,
      fontSize,
    };

    const updatedDrawings = [...drawings, newDrawing];
    setDrawings(updatedDrawings);
    setTextInput('');
    setShowTextInput(false);
    redrawWithDrawings(updatedDrawings);
  };

  const redrawWithDrawings = (drawnItems: Drawing[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      redrawCanvas(ctx, img, drawnItems);
    };
    img.src = imageDataUrl;
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const annotatedDataUrl = canvas.toDataURL('image/png');
    onSave(annotatedDataUrl, drawings);
  };

  const handleUndo = () => {
    const updatedDrawings = drawings.slice(0, -1);
    setDrawings(updatedDrawings);
    redrawWithDrawings(updatedDrawings);
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-gray-900">
      <div className="bg-gray-800 p-4 flex gap-2 flex-wrap">
        <button
          onClick={() => setCurrentTool('arrow')}
          className={`px-3 py-2 rounded ${currentTool === 'arrow' ? 'bg-blue-600' : 'bg-gray-700'}`}
        >
          Arrow
        </button>
        <button
          onClick={() => setCurrentTool('rect')}
          className={`px-3 py-2 rounded ${currentTool === 'rect' ? 'bg-blue-600' : 'bg-gray-700'}`}
        >
          Rectangle
        </button>
        <button
          onClick={() => setCurrentTool('circle')}
          className={`px-3 py-2 rounded ${currentTool === 'circle' ? 'bg-blue-600' : 'bg-gray-700'}`}
        >
          Circle
        </button>
        <button
          onClick={() => setCurrentTool('line')}
          className={`px-3 py-2 rounded ${currentTool === 'line' ? 'bg-blue-600' : 'bg-gray-700'}`}
        >
          Line
        </button>
        <button
          onClick={() => setCurrentTool('text')}
          className={`px-3 py-2 rounded ${currentTool === 'text' ? 'bg-blue-600' : 'bg-gray-700'}`}
        >
          Text
        </button>

        <div className="ml-auto flex gap-2">
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-12 h-10 cursor-pointer"
          />
          <input
            type="range"
            min="8"
            max="32"
            value={fontSize}
            onChange={(e) => setFontSize(Number(e.target.value))}
            className="w-24"
          />
          <button onClick={handleUndo} className="px-3 py-2 bg-gray-700 rounded">
            Undo
          </button>
          <button onClick={handleSave} className="px-3 py-2 bg-green-600 rounded">
            Save
          </button>
          <button onClick={onCancel} className="px-3 py-2 bg-red-600 rounded">
            Cancel
          </button>
        </div>
      </div>

      {showTextInput && (
        <div className="absolute z-50 bg-gray-800 p-4 rounded shadow-lg" style={{ left: textX, top: textY }}>
          <input
            autoFocus
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') addText();
            }}
            className="px-2 py-1 rounded bg-gray-700 text-white"
            placeholder="Enter text..."
          />
          <button onClick={addText} className="ml-2 px-2 py-1 bg-blue-600 rounded">
            Add
          </button>
        </div>
      )}

      <div className="flex-1 overflow-auto flex items-center justify-center">
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          className="cursor-crosshair max-w-full max-h-full"
        />
      </div>
    </div>
  );
}
