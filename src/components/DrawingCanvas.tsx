import React, { useRef, useEffect, useState, useCallback } from 'react';

export interface DrawingStroke {
  id: string;
  points: { x: number; y: number }[];
  color: string;
  width: number;
  timestamp: number;
}

export interface DrawingData {
  strokes: DrawingStroke[];
}

interface DrawingCanvasProps {
  isDrawingMode: boolean;
  isEraserMode: boolean;
  drawingColor: string;
  lineWidth: number;
  onDrawingChange: (drawingData: DrawingData) => void;
  initialDrawingData?: DrawingData;
  reactFlowInstance: any;
  isFullscreen?: boolean;
}

export const DrawingCanvas: React.FC<DrawingCanvasProps> = ({
  isDrawingMode,
  isEraserMode,
  drawingColor,
  lineWidth,
  onDrawingChange,
  initialDrawingData,
  reactFlowInstance,
  isFullscreen = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStroke, setCurrentStroke] = useState<DrawingStroke | null>(null);
  const [strokes, setStrokes] = useState<DrawingStroke[]>(initialDrawingData?.strokes || []);

  // Update strokes when initialDrawingData changes
  useEffect(() => {
    if (initialDrawingData?.strokes) {
      setStrokes(initialDrawingData.strokes);
    }
  }, [initialDrawingData]);

  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  // Convert screen coordinates to ReactFlow coordinates
  const getFlowCoordinates = useCallback((clientX: number, clientY: number) => {
    if (!canvasRef.current || !reactFlowInstance) return { x: 0, y: 0 };
    
    const rect = canvasRef.current.getBoundingClientRect();
    const canvasX = clientX - rect.left;
    const canvasY = clientY - rect.top;
    
    // Convert canvas coordinates to ReactFlow coordinates
    const viewport = reactFlowInstance.getViewport();
    const flowX = (canvasX - viewport.x) / viewport.zoom;
    const flowY = (canvasY - viewport.y) / viewport.zoom;
    
    return { x: flowX, y: flowY };
  }, [reactFlowInstance]);

  // Redraw all strokes on canvas
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !reactFlowInstance) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Get current ReactFlow viewport for coordinate transformation
    const viewport = reactFlowInstance.getViewport();

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Skip drawing if there are no strokes and no current stroke
    if (strokes.length === 0 && !currentStroke) return;

    // Apply ReactFlow transformation
    ctx.save();
    ctx.translate(viewport.x, viewport.y);
    ctx.scale(viewport.zoom, viewport.zoom);

    // Set common stroke properties once
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Draw all completed strokes
    strokes.forEach((stroke) => {
      if (stroke.points.length < 2) return;

      ctx.beginPath();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = Math.max(stroke.width / viewport.zoom, 0.5);
      
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
    });

    // Draw current stroke if drawing
    if (currentStroke && currentStroke.points.length > 1) {
      ctx.beginPath();
      ctx.strokeStyle = currentStroke.color;
      ctx.lineWidth = Math.max(currentStroke.width / viewport.zoom, 0.5);
      
      ctx.moveTo(currentStroke.points[0].x, currentStroke.points[0].y);
      for (let i = 1; i < currentStroke.points.length; i++) {
        ctx.lineTo(currentStroke.points[i].x, currentStroke.points[i].y);
      }
      ctx.stroke();
    }

    // Restore canvas transformation
    ctx.restore();
  }, [strokes, currentStroke, reactFlowInstance]);

  // Update canvas size when window resizes
  useEffect(() => {
    const updateCanvasSize = () => {
      if (canvasRef.current) {
        const newWidth = window.innerWidth;
        const newHeight = isFullscreen ? window.innerHeight : window.innerHeight - 64; // 64px = 4rem header
        
        setCanvasSize({ width: newWidth, height: newHeight });
        canvasRef.current.width = newWidth;
        canvasRef.current.height = newHeight;
        
        // Redraw after resize
        setTimeout(() => redrawCanvas(), 0);
      }
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, [redrawCanvas, isFullscreen]);



  // Redraw canvas when strokes change
  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  // Listen for ReactFlow viewport changes to redraw canvas
  useEffect(() => {
    if (!reactFlowInstance) return;

    let lastViewport = reactFlowInstance.getViewport();
    let animationFrameId: number;
    
    const checkViewportChange = () => {
      const currentViewport = reactFlowInstance.getViewport();
      if (
        Math.abs(currentViewport.x - lastViewport.x) > 0.1 ||
        Math.abs(currentViewport.y - lastViewport.y) > 0.1 ||
        Math.abs(currentViewport.zoom - lastViewport.zoom) > 0.001
      ) {
        lastViewport = currentViewport;
        redrawCanvas();
      }
      
      animationFrameId = requestAnimationFrame(checkViewportChange);
    };

    // Start checking for viewport changes
    animationFrameId = requestAnimationFrame(checkViewportChange);

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [reactFlowInstance, redrawCanvas]);

  // Handle eraser functionality
  const eraseAtPoint = useCallback((x: number, y: number) => {
    const eraserRadius = lineWidth * 2; // Make eraser bigger than line width
    
    setStrokes(prevStrokes => {
      const newStrokes = prevStrokes.filter(stroke => {
        // Check if any point in the stroke is within eraser radius
        return !stroke.points.some(point => {
          const distance = Math.sqrt(
            Math.pow(point.x - x, 2) + Math.pow(point.y - y, 2)
          );
          return distance <= eraserRadius;
        });
      });
      
      return newStrokes;
    });
  }, [lineWidth]);

  // Mouse event handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!isDrawingMode) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const coords = getFlowCoordinates(e.clientX, e.clientY);
    
    if (isEraserMode) {
      eraseAtPoint(coords.x, coords.y);
    } else {
      setIsDrawing(true);
      const newStroke: DrawingStroke = {
        id: `stroke-${Date.now()}-${Math.random()}`,
        points: [coords],
        color: drawingColor,
        width: lineWidth,
        timestamp: Date.now(),
      };
      setCurrentStroke(newStroke);
    }
  }, [isDrawingMode, isEraserMode, getFlowCoordinates, drawingColor, lineWidth, eraseAtPoint]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDrawingMode) return;
    
    const coords = getFlowCoordinates(e.clientX, e.clientY);
    
    if (isEraserMode) {
      eraseAtPoint(coords.x, coords.y);
    } else if (isDrawing && currentStroke) {
      // Add every point for smooth drawing - no throttling
      setCurrentStroke(prev => prev ? {
        ...prev,
        points: [...prev.points, coords]
      } : null);
    }
  }, [isDrawingMode, isEraserMode, isDrawing, currentStroke, getFlowCoordinates, eraseAtPoint]);

  const handleMouseUp = useCallback(() => {
    if (!isDrawingMode || !isDrawing) return;
    
    if (currentStroke && currentStroke.points.length > 1) {
      setStrokes(prev => [...prev, currentStroke]);
    }
    
    setIsDrawing(false);
    setCurrentStroke(null);
  }, [isDrawingMode, isDrawing, currentStroke]);

  // Update parent component when strokes change
  useEffect(() => {
    onDrawingChange({ strokes });
  }, [strokes, onDrawingChange]);

  // Always render canvas to show existing drawings, but only enable interaction in drawing mode

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 ${isFullscreen ? '' : 'top-16'}`}
      style={{
        zIndex: 1000,
        cursor: isDrawingMode ? (isEraserMode ? 'crosshair' : 'crosshair') : 'default',
        width: '100%',
        height: isFullscreen ? '100%' : 'calc(100% - 4rem)',
        pointerEvents: isDrawingMode ? 'auto' : 'none',
        left: 0,
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    />
  );
};