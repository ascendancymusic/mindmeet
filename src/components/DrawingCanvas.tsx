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
  const [strokes, setStrokes] = useState<DrawingStroke[]>([]);
  
  const [dataLoaded, setDataLoaded] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const isInitializingRef = useRef(false);
  
  // Initialize with drawing data from parent
  useEffect(() => {
    if (initialDrawingData !== undefined) {
      const newStrokes = initialDrawingData?.strokes || [];
      isInitializingRef.current = true;
      setStrokes(newStrokes);
      setDataLoaded(true);
      // Reset the flag after state update
      setTimeout(() => {
        isInitializingRef.current = false;
      }, 0);
    }
  }, [initialDrawingData]);



  // Convert screen coordinates to ReactFlow coordinates
  const getFlowCoordinates = useCallback((clientX: number, clientY: number) => {
    try {
      if (!canvasRef.current || !reactFlowInstance) return { x: 0, y: 0 };
      
      const rect = canvasRef.current.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      
      const canvasX = clientX - rect.left;
      const canvasY = clientY - rect.top;
      
      // Convert canvas coordinates to ReactFlow coordinates
      const viewport = reactFlowInstance.getViewport();
      if (!viewport || typeof viewport.x !== 'number' || typeof viewport.y !== 'number' || typeof viewport.zoom !== 'number' || viewport.zoom === 0) {
        return { x: 0, y: 0 };
      }
      
      const flowX = (canvasX - viewport.x) / viewport.zoom;
      const flowY = (canvasY - viewport.y) / viewport.zoom;
      
      // Validate coordinates
      if (!isFinite(flowX) || !isFinite(flowY)) {
        return { x: 0, y: 0 };
      }
      
      return { x: flowX, y: flowY };
    } catch (error) {
      return { x: 0, y: 0 };
    }
  }, [reactFlowInstance]);

  // Canvas rendering
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !reactFlowInstance) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    try {
      // Get current ReactFlow viewport for coordinate transformation
      const viewport = reactFlowInstance.getViewport();
      
      // Validate viewport data
      if (!viewport || typeof viewport.x !== 'number' || typeof viewport.y !== 'number' || typeof viewport.zoom !== 'number') {
        return;
      }

      // Always clear canvas first
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Apply ReactFlow transformation
      ctx.save();
      ctx.translate(viewport.x, viewport.y);
      ctx.scale(viewport.zoom, viewport.zoom);

      // Set common stroke properties once for better performance
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Batch render all completed strokes
      strokes.forEach((stroke) => {
        if (!stroke || !stroke.points || stroke.points.length < 2) return;

        ctx.beginPath();
        ctx.strokeStyle = stroke.color || '#ffffff';
        ctx.lineWidth = Math.max((stroke.width || 3) / viewport.zoom, 0.5);
        
        // Use moveTo and lineTo for smooth lines
        const firstPoint = stroke.points[0];
        if (firstPoint && typeof firstPoint.x === 'number' && typeof firstPoint.y === 'number') {
          ctx.moveTo(firstPoint.x, firstPoint.y);
          
          for (let i = 1; i < stroke.points.length; i++) {
            const point = stroke.points[i];
            if (point && typeof point.x === 'number' && typeof point.y === 'number') {
              ctx.lineTo(point.x, point.y);
            }
          }
          ctx.stroke();
        }
      });

      // Draw current stroke if drawing
      if (currentStroke && currentStroke.points && currentStroke.points.length > 1) {
        ctx.beginPath();
        ctx.strokeStyle = currentStroke.color || '#ffffff';
        ctx.lineWidth = Math.max((currentStroke.width || 3) / viewport.zoom, 0.5);
        
        const firstPoint = currentStroke.points[0];
        if (firstPoint && typeof firstPoint.x === 'number' && typeof firstPoint.y === 'number') {
          ctx.moveTo(firstPoint.x, firstPoint.y);
          
          for (let i = 1; i < currentStroke.points.length; i++) {
            const point = currentStroke.points[i];
            if (point && typeof point.x === 'number' && typeof point.y === 'number') {
              ctx.lineTo(point.x, point.y);
            }
          }
          ctx.stroke();
        }
      }

      // Restore canvas transformation
      ctx.restore();
    } catch (error) {
      // Skip frame on error
    }
  }, [strokes, currentStroke, reactFlowInstance]);

  // Canvas resize handling
  const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const updateCanvasSize = () => {
      if (!canvasRef.current) return;
      
      const newWidth = window.innerWidth;
      const newHeight = isFullscreen ? window.innerHeight : window.innerHeight - 64; // 64px = 4rem header
      
      // Only update if dimensions actually changed
      if (canvasSize.width !== newWidth || canvasSize.height !== newHeight) {
        setCanvasSize({ width: newWidth, height: newHeight });
        
        // Set canvas dimensions
        canvasRef.current.width = newWidth;
        canvasRef.current.height = newHeight;
        
        // Debounce redraw during resize
        if (resizeTimeoutRef.current) {
          clearTimeout(resizeTimeoutRef.current);
        }
        
        resizeTimeoutRef.current = setTimeout(() => {
          redrawCanvas();
        }, 50); // 50ms debounce for resize
      }
    };

    // Initial size setup
    updateCanvasSize();
    
    // Resize listener
    const debouncedResize = () => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      resizeTimeoutRef.current = setTimeout(updateCanvasSize, 16);
    };

    window.addEventListener('resize', debouncedResize);
    
    return () => {
      window.removeEventListener('resize', debouncedResize);
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, [isFullscreen, canvasSize.width, canvasSize.height, redrawCanvas]);



  // Redraw canvas when strokes change
  useEffect(() => {
    redrawCanvas();
  }, [strokes, currentStroke, redrawCanvas]);

  // Viewport tracking
  const lastViewportRef = useRef<{ x: number; y: number; zoom: number } | null>(null);
  const viewportTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const debouncedRedraw = useCallback(() => {
    if (viewportTimeoutRef.current) {
      clearTimeout(viewportTimeoutRef.current);
    }
    
    viewportTimeoutRef.current = setTimeout(() => {
      redrawCanvas();
    }, 16); // 16ms debounce for 60fps
  }, [redrawCanvas]);

  // Listen for ReactFlow viewport changes
  useEffect(() => {
    if (!reactFlowInstance) return;

    const checkViewportChange = () => {
      if (!reactFlowInstance) return;
      
      const currentViewport = reactFlowInstance.getViewport();
      const lastViewport = lastViewportRef.current;
      
      if (!lastViewport || 
          Math.abs(currentViewport.x - lastViewport.x) > 0.1 ||
          Math.abs(currentViewport.y - lastViewport.y) > 0.1 ||
          Math.abs(currentViewport.zoom - lastViewport.zoom) > 0.001) {
        
        lastViewportRef.current = { ...currentViewport };
        debouncedRedraw();
      }
      
      animationFrameRef.current = requestAnimationFrame(checkViewportChange);
    };

    // Start checking for viewport changes
    animationFrameRef.current = requestAnimationFrame(checkViewportChange);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (viewportTimeoutRef.current) {
        clearTimeout(viewportTimeoutRef.current);
      }
    };
  }, [reactFlowInstance, debouncedRedraw]);

  // Handle eraser functionality
  const eraseAtPoint = useCallback((x: number, y: number) => {
    try {
      if (!isFinite(x) || !isFinite(y)) return;
      
      const eraserRadius = Math.max(lineWidth * 2, 5);
      
      setStrokes(prevStrokes => {
        if (!Array.isArray(prevStrokes)) return [];
        
        const newStrokes = prevStrokes.filter(stroke => {
          if (!stroke || !Array.isArray(stroke.points)) return false;
          
          // Check if stroke is within eraser radius
          return !stroke.points.some(point => {
            if (!point || typeof point.x !== 'number' || typeof point.y !== 'number') return false;
            
            const distance = Math.sqrt(
              Math.pow(point.x - x, 2) + Math.pow(point.y - y, 2)
            );
            return distance <= eraserRadius;
          });
        });
        
        return newStrokes;
      });
    } catch (error) {
      // Skip erase operation on error
    }
  }, [lineWidth]);

  // Mouse event handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    try {
      if (!isDrawingMode) return;
      
      e.preventDefault();
      e.stopPropagation();
      
      const coords = getFlowCoordinates(e.clientX, e.clientY);
      
      userHasInteractedRef.current = true;
      
      if (isEraserMode) {
        eraseAtPoint(coords.x, coords.y);
      } else {
        setIsDrawing(true);
        const newStroke: DrawingStroke = {
          id: `stroke-${Date.now()}-${Math.random()}`,
          points: [coords],
          color: drawingColor || '#ffffff',
          width: lineWidth || 3,
          timestamp: Date.now(),
        };
        setCurrentStroke(newStroke);
      }
    } catch (error) {
      // Skip mouse down on error
    }
  }, [isDrawingMode, isEraserMode, getFlowCoordinates, drawingColor, lineWidth, eraseAtPoint]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    try {
      if (!isDrawingMode) return;
      
      const coords = getFlowCoordinates(e.clientX, e.clientY);
      
      if (isEraserMode) {
        eraseAtPoint(coords.x, coords.y);
      } else if (isDrawing && currentStroke) {
        // Add point for smooth drawing
        setCurrentStroke(prev => prev ? {
          ...prev,
          points: [...prev.points, coords]
        } : null);
      }
    } catch (error) {
      // Skip mouse move on error
    }
  }, [isDrawingMode, isEraserMode, isDrawing, currentStroke, getFlowCoordinates, eraseAtPoint]);

  const handleMouseUp = useCallback(() => {
    try {
      if (!isDrawingMode || !isDrawing) return;
      
      if (currentStroke && currentStroke.points && currentStroke.points.length > 1) {
        setStrokes(prev => Array.isArray(prev) ? [...prev, currentStroke] : [currentStroke]);
      }
      
      setIsDrawing(false);
      setCurrentStroke(null);
    } catch (error) {
      // Reset drawing state on error
      setIsDrawing(false);
      setCurrentStroke(null);
    }
  }, [isDrawingMode, isDrawing, currentStroke]);

  const userHasInteractedRef = useRef(false);
  
  // Notify parent when strokes change
  useEffect(() => {
    // Only notify parent if:
    // 1. Data is loaded
    // 2. Not currently initializing  
    // 3. User has actually interacted with the canvas
    if (dataLoaded && !isInitializingRef.current && userHasInteractedRef.current) {
      onDrawingChange({ strokes });
    }
  }, [strokes, onDrawingChange, dataLoaded]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (viewportTimeoutRef.current) {
        clearTimeout(viewportTimeoutRef.current);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }

    };
  }, []);

  // Render canvas
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
        opacity: 1, // Always visible
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    />
  );
};