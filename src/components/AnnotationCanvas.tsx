import React, { useRef, useEffect, useState } from 'react';
import { Drawing } from '../storage';

export interface CanvasProps {
  imageDataUrl: string;
  onSave: (annotatedImageDataUrl: string, drawings: Drawing[]) => void;
  onCancel: () => void;
}

type DrawingTool = 'text' | 'arrow' | 'rect' | 'circle' | 'line' | 'eraser' | 'pointer' | 'crop' | 'blur';

export function AnnotationCanvas({ imageDataUrl, onSave, onCancel }: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentTool, setCurrentTool] = useState<DrawingTool>('arrow');
  const [color, setColor] = useState('#FF0000');
  const [fontSize, setFontSize] = useState(16);
  const [lineWidth, setLineWidth] = useState(2);
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const [textInput, setTextInput] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);
  const [textX, setTextX] = useState(0);
  const [textY, setTextY] = useState(0);
  const [draggingAnnotationId, setDraggingAnnotationId] = useState<string | null>(null);
  const [dragOffsetX, setDragOffsetX] = useState(0);
  const [dragOffsetY, setDragOffsetY] = useState(0);
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
  const [isCropping, setIsCropping] = useState(false);
  const [cropArea, setCropArea] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [isBlurring, setIsBlurring] = useState(false);
  const [blurArea, setBlurArea] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [invertBlur, setInvertBlur] = useState(false);
  const [currentImageDataUrl, setCurrentImageDataUrl] = useState(imageDataUrl);
  const [textPageX, setTextPageX] = useState(0);
  const [textPageY, setTextPageY] = useState(0);
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 0, height: 0 });

  // History management for undo/redo
  const historyRef = useRef<Drawing[][]>([[]]);
  const historyIndexRef = useRef<number>(0);
  const imageHistoryRef = useRef<string[]>([imageDataUrl]);
  const imageHistoryIndexRef = useRef<number>(0);

  // Helper to save image to history (for crop/blur operations)
  const saveImageToHistory = (imageUrl: string) => {
    // Remove any future history if we're not at the latest state
    imageHistoryRef.current = imageHistoryRef.current.slice(0, imageHistoryIndexRef.current + 1);
    // Add new state to history
    imageHistoryRef.current.push(imageUrl);
    imageHistoryIndexRef.current = imageHistoryRef.current.length - 1;
  };

  // Helper to save state to history
  const saveToHistory = (newDrawings: Drawing[]) => {
    // Remove any future history if we're not at the latest state
    historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    // Add new state to history
    historyRef.current.push([...newDrawings]);
    historyIndexRef.current = historyRef.current.length - 1;
  };

  const handleUndo = () => {
    // First check if there's image history to undo (crop/blur)
    if (imageHistoryIndexRef.current > 0) {
      imageHistoryIndexRef.current--;
      const previousImage = imageHistoryRef.current[imageHistoryIndexRef.current];
      setCurrentImageDataUrl(previousImage);

      // Redraw canvas with the previous image
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        if (canvas) {
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            redrawCanvas(ctx, img, drawings);
          }
        }
      };
      img.src = previousImage;
    } else if (historyIndexRef.current > 0) {
      // Otherwise undo annotation
      historyIndexRef.current--;
      const previousState = historyRef.current[historyIndexRef.current];
      setDrawings([...previousState]);
      redrawWithDrawings([...previousState]);
    }
  };

  const handleRedo = () => {
    // First check if there's image history to redo (crop/blur)
    if (imageHistoryIndexRef.current < imageHistoryRef.current.length - 1) {
      imageHistoryIndexRef.current++;
      const nextImage = imageHistoryRef.current[imageHistoryIndexRef.current];
      setCurrentImageDataUrl(nextImage);

      // Redraw canvas with the next image
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        if (canvas) {
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            redrawCanvas(ctx, img, drawings);
          }
        }
      };
      img.src = nextImage;
    } else if (historyIndexRef.current < historyRef.current.length - 1) {
      // Otherwise redo annotation
      historyIndexRef.current++;
      const nextState = historyRef.current[historyIndexRef.current];
      setDrawings([...nextState]);
      redrawWithDrawings([...nextState]);
    }
  };

  // Helper to update drawings and save to history
  const updateDrawings = (newDrawings: Drawing[]) => {
    setDrawings(newDrawings);
    saveToHistory(newDrawings);
  };

  // Load image on mount
  useEffect(() => {
    console.log('[Canvas] Mounting, imageDataUrl length:', imageDataUrl?.length || 0);
    console.log('[Canvas] imageDataUrl type:', typeof imageDataUrl);
    console.log('[Canvas] imageDataUrl first 100 chars:', imageDataUrl?.substring(0, 100) || 'EMPTY');

    if (!imageDataUrl) {
      console.warn('[Canvas] No imageDataUrl provided');
      return;
    }

    setCurrentImageDataUrl(imageDataUrl);
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
      setCanvasDimensions({ width: img.width, height: img.height });
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

  // Redraw blur preview when invert toggle is clicked
  useEffect(() => {
    if (currentTool === 'blur' && isBlurring && blurArea !== null) {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const img = new Image();
      img.onload = () => {
        redrawCanvas(ctx, img, drawings);

        if (invertBlur) {
          // Blur everything except the selected area
          ctx.filter = 'blur(15px)';
          ctx.drawImage(img, 0, 0);
          ctx.filter = 'none';

          // Draw unblurred area on top
          ctx.drawImage(
            img,
            blurArea.x,
            blurArea.y,
            blurArea.width,
            blurArea.height,
            blurArea.x,
            blurArea.y,
            blurArea.width,
            blurArea.height
          );
        } else {
          // Apply blur effect to the selected area for preview
          ctx.filter = 'blur(15px)';
          ctx.drawImage(
            img,
            blurArea.x,
            blurArea.y,
            blurArea.width,
            blurArea.height,
            blurArea.x,
            blurArea.y,
            blurArea.width,
            blurArea.height
          );
          ctx.filter = 'none';
        }

        // Redraw annotations on top
        drawings.forEach((drawing) => {
          drawItem(ctx, drawing);
        });

        // Draw blur border in blue
        ctx.strokeStyle = '#3B82F6';
        ctx.lineWidth = 2;
        ctx.strokeRect(blurArea.x, blurArea.y, blurArea.width, blurArea.height);
      };
      img.src = currentImageDataUrl;
    }
  }, [invertBlur, currentTool, isBlurring, blurArea, currentImageDataUrl, drawings]);

  const redrawCanvas = (ctx: CanvasRenderingContext2D, img: HTMLImageElement, drawnItems: Drawing[], selectedId?: string | null) => {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.drawImage(img, 0, 0);

    drawnItems.forEach((drawing) => {
      drawItem(ctx, drawing, drawing.id === selectedId);
    });
  };

  const drawItem = (ctx: CanvasRenderingContext2D, item: Drawing, isSelected: boolean = false) => {
    ctx.strokeStyle = item.color || '#FF0000';
    ctx.fillStyle = item.color || '#FF0000';
    ctx.lineWidth = item.lineWidth || 2;

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

    // Draw selection highlight
    if (isSelected) {
      ctx.strokeStyle = '#00FF00';
      ctx.lineWidth = 3;
      const padding = 4;

      switch (item.type) {
        case 'text':
          const textWidth = (item.content || '').length * (item.fontSize || 16) * 0.6;
          const textHeight = item.fontSize || 16;
          ctx.strokeRect(item.x - padding, item.y - textHeight - padding, textWidth + padding * 2, textHeight + padding * 2);
          break;
        case 'rect':
          ctx.strokeRect(item.x - padding, item.y - padding, item.width + padding * 2, item.height + padding * 2);
          break;
        case 'circle':
          const centerX = item.x + item.width / 2;
          const centerY = item.y + item.height / 2;
          const radius = item.width / 2;
          ctx.beginPath();
          ctx.arc(centerX, centerY, radius + padding, 0, Math.PI * 2);
          ctx.stroke();
          break;
        case 'arrow':
        case 'line':
          ctx.strokeRect(
            Math.min(item.x, item.x + item.width) - padding,
            Math.min(item.y, item.y + item.height) - padding,
            Math.abs(item.width) + padding * 2,
            Math.abs(item.height) + padding * 2
          );
          break;
      }
    }
  };

  const drawArrow = (ctx: CanvasRenderingContext2D, fromX: number, fromY: number, toX: number, toY: number) => {
    const headlen = Math.max(8, ctx.lineWidth * 4);
    const angle = Math.atan2(toY - fromY, toX - fromX);

    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();

    // Draw arrow head with fill for better appearance
    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - headlen * Math.cos(angle - Math.PI / 6), toY - headlen * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(toX - headlen * 0.6 * Math.cos(angle), toY - headlen * 0.6 * Math.sin(angle));
    ctx.lineTo(toX - headlen * Math.cos(angle + Math.PI / 6), toY - headlen * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();
  };

  // Hit detection: check if a point is on an annotation
  const getAnnotationAtPoint = (x: number, y: number): Drawing | null => {
    // Check in reverse order so topmost annotations are selected first
    for (let i = drawings.length - 1; i >= 0; i--) {
      const drawing = drawings[i];
      const padding = 8; // Hit box padding for easier selection

      switch (drawing.type) {
        case 'text':
          // For text, use rough bounding box
          const textWidth = (drawing.content || '').length * (drawing.fontSize || 16) * 0.6;
          const textHeight = drawing.fontSize || 16;
          if (
            x >= drawing.x - padding &&
            x <= drawing.x + textWidth + padding &&
            y >= drawing.y - textHeight + padding &&
            y <= drawing.y + padding
          ) {
            return drawing;
          }
          break;

        case 'rect':
          if (
            x >= drawing.x - padding &&
            x <= drawing.x + drawing.width + padding &&
            y >= drawing.y - padding &&
            y <= drawing.y + drawing.height + padding
          ) {
            return drawing;
          }
          break;

        case 'circle':
          const centerX = drawing.x + drawing.width / 2;
          const centerY = drawing.y + drawing.height / 2;
          const radius = drawing.width / 2;
          const distance = Math.hypot(x - centerX, y - centerY);
          if (distance <= radius + padding) {
            return drawing;
          }
          break;

        case 'arrow':
        case 'line':
          // Check if point is near the line
          const x1 = drawing.x;
          const y1 = drawing.y;
          const x2 = drawing.x + drawing.width;
          const y2 = drawing.y + drawing.height;
          const lineDistance = Math.abs(
            (y2 - y1) * x - (x2 - x1) * y + x2 * y1 - y2 * x1
          ) / Math.hypot(y2 - y1, x2 - x1);
          if (lineDistance <= padding + 3) {
            return drawing;
          }
          break;
      }
    }
    return null;
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    // Handle crop tool
    if (currentTool === 'crop') {
      setIsCropping(true);
      setStartX(x);
      setStartY(y);
      setCropArea({ x: Math.floor(x), y: Math.floor(y), width: 0, height: 0 });
      return;
    }

    // Handle blur tool
    if (currentTool === 'blur') {
      setIsBlurring(true);
      setStartX(x);
      setStartY(y);
      setBlurArea({ x: Math.floor(x), y: Math.floor(y), width: 0, height: 0 });
      return;
    }

    // Handle pointer tool - check for existing annotations to drag
    if (currentTool === 'pointer') {
      const annotation = getAnnotationAtPoint(x, y);
      if (annotation) {
        setDraggingAnnotationId(annotation.id);
        setSelectedAnnotationId(annotation.id);
        setDragOffsetX(x - annotation.x);
        setDragOffsetY(y - annotation.y);
        redrawWithDrawings(drawings);
        return;
      }
      // Click on empty space deselects
      setSelectedAnnotationId(null);
      redrawWithDrawings(drawings);
      return;
    }

    if (currentTool === 'text') {
      setTextX(x);
      setTextY(y);
      // Calculate page-relative coordinates for proper positioning
      setTextPageX(e.clientX);
      setTextPageY(e.clientY);
      setShowTextInput(true);
      // Redraw to ensure clean state while text input is open
      redrawWithDrawings(drawings);
      return;
    }

    setIsDrawing(true);
    setStartX(x);
    setStartY(y);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // Don't render if text input is open
    if (showTextInput) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    // Handle crop mode
    if (currentTool === 'crop' && isCropping && cropArea !== null) {
      const width = Math.abs(x - startX);
      const height = Math.abs(y - startY);
      const left = Math.min(x, startX);
      const top = Math.min(y, startY);

      setCropArea({
        x: Math.floor(left),
        y: Math.floor(top),
        width: Math.floor(width),
        height: Math.floor(height),
      });

      // Visualize crop area
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const img = new Image();
      img.onload = () => {
        redrawCanvas(ctx, img, drawings);

        // Draw semi-transparent overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Clear the crop area (show unblurred)
        ctx.clearRect(left, top, width, height);

        // Draw the uncropped image in the crop area
        ctx.drawImage(img, 0, 0);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, left, canvas.height);
        ctx.fillRect(left + width, 0, canvas.width - left - width, canvas.height);
        ctx.fillRect(left, 0, width, top);
        ctx.fillRect(left, top + height, width, canvas.height - top - height);

        // Redraw annotations on top of everything
        drawings.forEach((drawing) => {
          drawItem(ctx, drawing);
        });

        // Draw crop border
        ctx.strokeStyle = '#00FF00';
        ctx.lineWidth = 2;
        ctx.strokeRect(left, top, width, height);
      };
      img.src = currentImageDataUrl;
      return;
    }

    // Handle blur mode
    if (currentTool === 'blur' && isBlurring && blurArea !== null) {
      const width = Math.abs(x - startX);
      const height = Math.abs(y - startY);
      const left = Math.min(x, startX);
      const top = Math.min(y, startY);

      setBlurArea({
        x: Math.floor(left),
        y: Math.floor(top),
        width: Math.floor(width),
        height: Math.floor(height),
      });

      // Visualize blur area
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const img = new Image();
      img.onload = () => {
        redrawCanvas(ctx, img, drawings);

        if (invertBlur) {
          // Blur everything except the selected area
          ctx.filter = 'blur(15px)';
          ctx.drawImage(img, 0, 0);
          ctx.filter = 'none';

          // Draw unblurred area on top
          ctx.drawImage(
            img,
            left,
            top,
            width,
            height,
            left,
            top,
            width,
            height
          );
        } else {
          // Apply blur effect to the selected area for preview
          ctx.filter = 'blur(15px)';
          ctx.drawImage(
            img,
            left,
            top,
            width,
            height,
            left,
            top,
            width,
            height
          );
          ctx.filter = 'none';
        }

        // Redraw annotations on top
        drawings.forEach((drawing) => {
          drawItem(ctx, drawing);
        });

        // Draw blur border in blue
        ctx.strokeStyle = '#3B82F6';
        ctx.lineWidth = 2;
        ctx.strokeRect(left, top, width, height);
      };
      img.src = currentImageDataUrl;
      return;
    }

    // Update cursor based on tool and hover state
    if (currentTool === 'pointer') {
      const annotation = getAnnotationAtPoint(x, y);
      canvas.style.cursor = annotation ? 'grab' : 'default';

      // Handle dragging
      if (draggingAnnotationId) {
        canvas.style.cursor = 'grabbing';
        const updatedDrawings = drawings.map(drawing =>
          drawing.id === draggingAnnotationId
            ? { ...drawing, x: x - dragOffsetX, y: y - dragOffsetY }
            : drawing
        );
        setDrawings(updatedDrawings);
        redrawWithDrawings(updatedDrawings);
        return;
      }
    } else if (currentTool === 'text') {
      canvas.style.cursor = 'text';
    } else if (currentTool === 'crop') {
      canvas.style.cursor = 'crosshair';
    } else {
      canvas.style.cursor = 'crosshair';
    }

    if (!isDrawing) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      redrawCanvas(ctx, img, drawings);

      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;

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
    img.src = currentImageDataUrl;
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // Handle crop mode
    if (currentTool === 'crop') {
      setIsCropping(false);
      return;
    }

    // Handle blur mode
    if (currentTool === 'blur') {
      setIsBlurring(false);
      return;
    }

    // Handle pointer tool drag end
    if (currentTool === 'pointer') {
      if (draggingAnnotationId) {
        setDraggingAnnotationId(null);
        saveToHistory(drawings);
        redrawWithDrawings(drawings);
      }
      return;
    }

    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const newDrawing: Drawing = {
      id: `${Date.now()}-${Math.random()}`,
      type: currentTool as any,
      x: startX,
      y: startY,
      width: x - startX,
      height: y - startY,
      color,
      lineWidth: currentTool !== 'text' ? lineWidth : undefined,
    };

    const updatedDrawings = [...drawings, newDrawing];
    updateDrawings(updatedDrawings);
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
    updateDrawings(updatedDrawings);
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
      redrawCanvas(ctx, img, drawnItems, selectedAnnotationId);
    };
    img.src = currentImageDataUrl;
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const annotatedDataUrl = canvas.toDataURL('image/png');
    onSave(annotatedDataUrl, drawings);
  };

  const applyCrop = () => {
    if (!cropArea) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const img = new Image();
    img.onload = () => {
      // Create a new canvas for the cropped image
      const croppedCanvas = document.createElement('canvas');
      croppedCanvas.width = cropArea.width;
      croppedCanvas.height = cropArea.height;

      const ctx = croppedCanvas.getContext('2d');
      if (!ctx) return;

      // Draw the cropped portion
      ctx.drawImage(
        img,
        cropArea.x,
        cropArea.y,
        cropArea.width,
        cropArea.height,
        0,
        0,
        cropArea.width,
        cropArea.height
      );

      const croppedDataUrl = croppedCanvas.toDataURL('image/png');

      // Save to image history for undo
      saveImageToHistory(croppedDataUrl);

      // Adjust annotation coordinates to fit the cropped image
      const adjustedDrawings = drawings
        .filter(drawing => {
          // Keep annotations that are at least partially within the crop area
          const annotationRight = drawing.x + drawing.width;
          const annotationBottom = drawing.y + drawing.height;
          return (
            drawing.x < cropArea.x + cropArea.width &&
            annotationRight > cropArea.x &&
            drawing.y < cropArea.y + cropArea.height &&
            annotationBottom > cropArea.y
          );
        })
        .map(drawing => ({
          ...drawing,
          x: drawing.x - cropArea.x,
          y: drawing.y - cropArea.y,
        }));

      // Reset crop mode and update image and drawings
      setIsCropping(false);
      setCropArea(null);
      setCurrentImageDataUrl(croppedDataUrl);
      updateDrawings(adjustedDrawings);

      // Update canvas dimensions and redraw
      const newImg = new Image();
      newImg.onload = () => {
        canvas.width = newImg.width;
        canvas.height = newImg.height;
        setCanvasDimensions({ width: newImg.width, height: newImg.height });

        // Redraw canvas with the new cropped image and adjusted drawings
        const ctx = canvas.getContext('2d');
        if (ctx) {
          redrawCanvas(ctx, newImg, adjustedDrawings);
        }
      };
      newImg.src = croppedDataUrl;
    };
    img.src = currentImageDataUrl;
  };

  const cancelCrop = () => {
    setIsCropping(false);
    setCropArea(null);
    redrawWithDrawings(drawings);
  };

  const applyBlur = () => {
    if (!blurArea) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const img = new Image();
    img.onload = () => {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;

      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) return;

      // Draw the original image
      tempCtx.drawImage(img, 0, 0);

      if (invertBlur) {
        // Blur everything except the selected area
        tempCtx.filter = 'blur(20px)';
        tempCtx.drawImage(img, 0, 0);
        tempCtx.filter = 'none';

        // Draw unblurred area on top
        tempCtx.drawImage(
          img,
          blurArea.x,
          blurArea.y,
          blurArea.width,
          blurArea.height,
          blurArea.x,
          blurArea.y,
          blurArea.width,
          blurArea.height
        );
      } else {
        // Blur only the selected area
        tempCtx.filter = 'blur(20px)';
        tempCtx.drawImage(
          img,
          blurArea.x,
          blurArea.y,
          blurArea.width,
          blurArea.height,
          blurArea.x,
          blurArea.y,
          blurArea.width,
          blurArea.height
        );
        tempCtx.filter = 'none';
      }

      const blurredDataUrl = tempCanvas.toDataURL('image/png');

      // Save to image history for undo
      saveImageToHistory(blurredDataUrl);

      // Reset blur mode and update image
      setIsBlurring(false);
      setBlurArea(null);
      setInvertBlur(false);
      setCurrentImageDataUrl(blurredDataUrl);

      // Redraw canvas with new image
      const newImg = new Image();
      newImg.onload = () => {
        canvas.width = newImg.width;
        canvas.height = newImg.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          redrawCanvas(ctx, newImg, drawings);
        }
      };
      newImg.src = blurredDataUrl;
    };
    img.src = currentImageDataUrl;
  };


  const cancelBlur = () => {
    setIsBlurring(false);
    setBlurArea(null);
    setInvertBlur(false);
    redrawWithDrawings(drawings);
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-gray-900">
    <div className="bg-gray-800 p-4 flex gap-2 flex-wrap">
        <button
          onClick={() => {
            setCurrentTool('pointer');
            redrawWithDrawings(drawings);
          }}
          className={`px-3 py-2 rounded ${currentTool === 'pointer' ? 'bg-blue-600' : 'bg-gray-700'}`}
          title="Select and drag annotations"
        >
          Pointer
        </button>
        <button
          onClick={() => {
            setCurrentTool('arrow');
            setSelectedAnnotationId(null);
          }}
          className={`px-3 py-2 rounded ${currentTool === 'arrow' ? 'bg-blue-600' : 'bg-gray-700'}`}
        >
          Arrow
        </button>
        <button
          onClick={() => {
            setCurrentTool('rect');
            setSelectedAnnotationId(null);
          }}
          className={`px-3 py-2 rounded ${currentTool === 'rect' ? 'bg-blue-600' : 'bg-gray-700'}`}
        >
          Rectangle
        </button>
        <button
          onClick={() => {
            setCurrentTool('circle');
            setSelectedAnnotationId(null);
          }}
          className={`px-3 py-2 rounded ${currentTool === 'circle' ? 'bg-blue-600' : 'bg-gray-700'}`}
        >
          Circle
        </button>
        <button
          onClick={() => {
            setCurrentTool('line');
            setSelectedAnnotationId(null);
          }}
          className={`px-3 py-2 rounded ${currentTool === 'line' ? 'bg-blue-600' : 'bg-gray-700'}`}
        >
          Line
        </button>
        <button
          onClick={() => {
            setCurrentTool('text');
            setSelectedAnnotationId(null);
          }}
          className={`px-3 py-2 rounded ${currentTool === 'text' ? 'bg-blue-600' : 'bg-gray-700'}`}
        >
          Text
        </button>
        <button
          onClick={() => {
            setCurrentTool('crop');
            setSelectedAnnotationId(null);
          }}
          className={`px-3 py-2 rounded ${currentTool === 'crop' ? 'bg-blue-600' : 'bg-gray-700'}`}
        >
          Crop
        </button>
        <button
          onClick={() => {
            setCurrentTool('blur');
            setSelectedAnnotationId(null);
          }}
          className={`px-3 py-2 rounded ${currentTool === 'blur' ? 'bg-blue-600' : 'bg-gray-700'}`}
        >
          Blur
        </button>

        <div className="px-3 py-2 bg-gray-700 rounded text-white text-sm flex items-center">
          {canvasDimensions.width > 0 ? `${canvasDimensions.width} × ${canvasDimensions.height} px` : 'Loading...'}
        </div>

        <div className="ml-auto flex gap-2">
          <input
            type="color"
            value={color}
            onChange={(e) => {
              const newColor = e.target.value;
              setColor(newColor);
              // If an annotation is selected, update its color
              if (selectedAnnotationId) {
                const updatedDrawings = drawings.map(drawing =>
                  drawing.id === selectedAnnotationId
                    ? { ...drawing, color: newColor }
                    : drawing
                );
                updateDrawings(updatedDrawings);
              }
            }}
            className="w-12 h-10 cursor-pointer"
            title={selectedAnnotationId ? "Change selected annotation color" : "Color for new annotations"}
          />
          <input
            type="range"
            min="4"
            max="72"
            value={selectedAnnotationId ? (drawings.find(d => d.id === selectedAnnotationId)?.fontSize || drawings.find(d => d.id === selectedAnnotationId)?.lineWidth || 16) : fontSize}
            onChange={(e) => {
              const newSize = Number(e.target.value);

              if (selectedAnnotationId) {
                const selectedDrawing = drawings.find(d => d.id === selectedAnnotationId);
                if (selectedDrawing?.type === 'text') {
                  setFontSize(newSize);
                  const updatedDrawings = drawings.map(drawing =>
                    drawing.id === selectedAnnotationId
                      ? { ...drawing, fontSize: newSize }
                      : drawing
                  );
                  setDrawings(updatedDrawings);
                  redrawWithDrawings(updatedDrawings);
                } else {
                  setLineWidth(newSize);
                  const updatedDrawings = drawings.map(drawing =>
                    drawing.id === selectedAnnotationId
                      ? { ...drawing, lineWidth: newSize }
                      : drawing
                  );
                  setDrawings(updatedDrawings);
                  redrawWithDrawings(updatedDrawings);
                }
              } else {
                setFontSize(newSize);
                setLineWidth(newSize);
              }
              // Save updated state to history
              saveToHistory(updatedDrawings);
            }}
            className="w-24"
            title={selectedAnnotationId ? (drawings.find(d => d.id === selectedAnnotationId)?.type === 'text' ? "Font size" : "Border width") : "Size for new annotations"}
          />
          {selectedAnnotationId && (
            <button
              onClick={() => {
                setSelectedAnnotationId(null);
                redrawWithDrawings(drawings);
              }}
              className="px-3 py-2 bg-green-600 rounded text-white text-sm flex items-center hover:bg-green-700 cursor-pointer"
              title="Click to deselect"
            >
              ✓ Selected
            </button>
          )}
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
        <div className="fixed z-50 bg-gray-800 p-4 rounded shadow-lg" style={{ left: textPageX, top: textPageY }}>
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

      {cropArea && currentTool === 'crop' && (
        <div className="absolute z-50 bottom-4 left-1/2 transform -translate-x-1/2 bg-gray-800 p-4 rounded shadow-lg flex gap-2">
          <div className="text-white text-sm mr-4">
            {cropArea.width} x {cropArea.height}
          </div>
          <button onClick={applyCrop} className="px-4 py-2 bg-green-600 rounded hover:bg-green-700">
            Apply Crop
          </button>
          <button onClick={cancelCrop} className="px-4 py-2 bg-red-600 rounded hover:bg-red-700">
            Cancel
          </button>
        </div>
      )}

      {blurArea && currentTool === 'blur' && (
        <div className="absolute z-50 bottom-4 left-1/2 transform -translate-x-1/2 bg-gray-800 p-4 rounded shadow-lg flex gap-2 items-center">
          <div className="text-white text-sm mr-4">
            {blurArea.width} x {blurArea.height}
          </div>
          <button
            onClick={() => setInvertBlur(!invertBlur)}
            className={`px-3 py-2 rounded text-sm ${
              invertBlur ? 'bg-purple-600 hover:bg-purple-700' : 'bg-gray-600 hover:bg-gray-700'
            }`}
          >
            {invertBlur ? '⟲ Invert ON' : 'Invert'}
          </button>
          <button onClick={applyBlur} className="px-4 py-2 bg-green-600 rounded hover:bg-green-700">
            Apply Blur
          </button>
          <button onClick={cancelBlur} className="px-4 py-2 bg-red-600 rounded hover:bg-red-700">
            Cancel
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
