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

  // Canvas rendering - optimized for smooth performance
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

      // Clear canvas efficiently
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Skip rendering if no strokes and no current stroke
      if (strokes.length === 0 && !currentStroke) {
        return;
      }

      // Apply ReactFlow transformation
      ctx.save();
      ctx.translate(viewport.x, viewport.y);
      ctx.scale(viewport.zoom, viewport.zoom);

      // Set common stroke properties once for better performance
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Optimized rendering: batch similar strokes together
      const strokesByColor = new Map<string, DrawingStroke[]>();

      // Group strokes by color and width for batch rendering
      strokes.forEach((stroke) => {
        if (!stroke || !stroke.points || stroke.points.length < 2) return;

        const key = `${stroke.color || '#ffffff'}-${stroke.width || 3}`;
        if (!strokesByColor.has(key)) {
          strokesByColor.set(key, []);
        }
        strokesByColor.get(key)!.push(stroke);
      });

      // Render strokes in batches by color/width
      strokesByColor.forEach((strokeGroup, key) => {
        const [color, width] = key.split('-');
        ctx.strokeStyle = color;
        ctx.lineWidth = parseFloat(width);

        strokeGroup.forEach((stroke) => {
          ctx.beginPath();
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
      });

      // Draw current stroke if drawing
      if (currentStroke && currentStroke.points && currentStroke.points.length > 1) {
        ctx.strokeStyle = currentStroke.color || '#ffffff';
        ctx.lineWidth = currentStroke.width || 3;
        ctx.beginPath();

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

  // Canvas resize handling - only debounce resize, not viewport changes
  const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const updateCanvasSize = () => {
      if (!canvasRef.current) return;

      const newWidth = window.innerWidth;
      const newHeight = isFullscreen ? window.innerHeight : window.innerHeight - 48; // 48px = 3rem header

      // Only update if dimensions actually changed
      if (canvasSize.width !== newWidth || canvasSize.height !== newHeight) {
        setCanvasSize({ width: newWidth, height: newHeight });

        // Set canvas dimensions
        canvasRef.current.width = newWidth;
        canvasRef.current.height = newHeight;

        // Immediate redraw after resize - no debouncing for better responsiveness
        redrawCanvas();
      }
    };

    // Initial size setup
    updateCanvasSize();

    // Resize listener with minimal debouncing
    const debouncedResize = () => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      resizeTimeoutRef.current = setTimeout(updateCanvasSize, 10); // Reduced to 10ms for faster response
    };

    window.addEventListener('resize', debouncedResize);

    return () => {
      window.removeEventListener('resize', debouncedResize);
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, [isFullscreen, canvasSize.width, canvasSize.height, redrawCanvas]);



  // Redraw canvas when strokes change - use requestAnimationFrame for smooth updates
  useEffect(() => {
    const frameId = requestAnimationFrame(() => {
      redrawCanvas();
    });

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [strokes, currentStroke, redrawCanvas]);

  // Viewport tracking - immediate updates for smooth movement
  const lastViewportRef = useRef<{ x: number; y: number; zoom: number } | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Listen for ReactFlow viewport changes with immediate updates
  useEffect(() => {
    if (!reactFlowInstance) return;

    const checkViewportChange = () => {
      if (!reactFlowInstance) return;

      try {
        const currentViewport = reactFlowInstance.getViewport();
        const lastViewport = lastViewportRef.current;

        // Check if viewport has changed (with smaller threshold for smoother updates)
        if (!lastViewport ||
          Math.abs(currentViewport.x - lastViewport.x) > 0.01 ||
          Math.abs(currentViewport.y - lastViewport.y) > 0.01 ||
          Math.abs(currentViewport.zoom - lastViewport.zoom) > 0.0001) {

          lastViewportRef.current = { ...currentViewport };
          // Immediate redraw for smooth movement - no debouncing
          redrawCanvas();
        }
      } catch (error) {
        // Skip frame on error
      }

      animationFrameRef.current = requestAnimationFrame(checkViewportChange);
    };

    // Start checking for viewport changes
    animationFrameRef.current = requestAnimationFrame(checkViewportChange);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [reactFlowInstance, redrawCanvas]);

  // Add native wheel event listener to handle wheel events properly
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isDrawingMode) return;

    const handleNativeWheel = (e: WheelEvent) => {
      // Prevent the canvas from handling the wheel event
      e.preventDefault();
      e.stopPropagation();

      // Find the ReactFlow container
      const reactFlowContainer = canvas.parentElement?.querySelector('.react-flow');
      if (reactFlowContainer && reactFlowInstance) {
        // Use ReactFlow's built-in zoom functionality
        const rect = reactFlowContainer.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Calculate zoom delta (negative because wheel down should zoom out)
        const zoomDelta = -e.deltaY * 0.002;
        const currentZoom = reactFlowInstance.getZoom();
        const newZoom = Math.max(0.1, Math.min(2, currentZoom * (1 + zoomDelta)));

        // Apply zoom to the mouse position
        reactFlowInstance.zoomTo(newZoom, { x, y });
      }
    };

    // Add the native event listener
    canvas.addEventListener('wheel', handleNativeWheel, { passive: false });

    return () => {
      canvas.removeEventListener('wheel', handleNativeWheel);
    };
  }, [isDrawingMode, reactFlowInstance]);

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
        // Optimize point addition - avoid unnecessary array spreading for better performance
        setCurrentStroke(prev => {
          if (!prev) return null;

          // Skip adding point if it's too close to the last point (reduces noise)
          const lastPoint = prev.points[prev.points.length - 1];
          if (lastPoint) {
            const distance = Math.sqrt(
              Math.pow(coords.x - lastPoint.x, 2) + Math.pow(coords.y - lastPoint.y, 2)
            );
            // Only add point if it's moved at least 1 unit (reduces redundant points)
            if (distance < 1) {
              return prev;
            }
          }

          return {
            ...prev,
            points: [...prev.points, coords]
          };
        });
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
      className={`absolute inset-0 ${isFullscreen ? '' : 'top-12'}`}
      style={{
        zIndex: isDrawingMode ? 1001 : -1, // Higher z-index when drawing, lower when not
        cursor: isDrawingMode ? (isEraserMode ? 'crosshair' : 'crosshair') : 'default',
        width: '100%',
        height: isFullscreen ? '100%' : 'calc(100% - 3rem)',
        // Capture all pointer events when drawing mode is active
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