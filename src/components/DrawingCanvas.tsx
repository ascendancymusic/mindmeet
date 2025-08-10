import React, { useRef, useEffect, useState, useCallback } from 'react';

export interface DrawingStroke {
  id: string;
  points: { x: number; y: number }[];
  color: string;
  width: number;
  timestamp: number;
  selected?: boolean;
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

export interface DrawingCanvasRef {
  clearStrokeSelection: () => void;
}

// Helper function to calculate bounds of drawing data
export const getDrawingBounds = (drawingData: DrawingData) => {
  if (!drawingData?.strokes?.length) {
    return null;
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  drawingData.strokes.forEach(stroke => {
    if (stroke?.points?.length) {
      stroke.points.forEach(point => {
        if (point && typeof point.x === 'number' && typeof point.y === 'number') {
          minX = Math.min(minX, point.x);
          minY = Math.min(minY, point.y);
          maxX = Math.max(maxX, point.x);
          maxY = Math.max(maxY, point.y);
        }
      });
    }
  });

  // Return null if no valid bounds found
  if (!isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY)) {
    return null;
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  };
};

export const DrawingCanvas = React.forwardRef<DrawingCanvasRef, DrawingCanvasProps>(({
  isDrawingMode,
  isEraserMode,
  drawingColor,
  lineWidth,
  onDrawingChange,
  initialDrawingData,
  reactFlowInstance,
  isFullscreen = false,
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStroke, setCurrentStroke] = useState<DrawingStroke | null>(null);
  const [strokes, setStrokes] = useState<DrawingStroke[]>([]);

  const [dataLoaded, setDataLoaded] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const isInitializingRef = useRef(false);

  // Stroke selection and dragging state
  const [selectedStrokeId, setSelectedStrokeId] = useState<string | null>(null);
  const [isDraggingStroke, setIsDraggingStroke] = useState(false);
  const [dragStartPoint, setDragStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [originalStrokePoints, setOriginalStrokePoints] = useState<{ x: number; y: number }[] | null>(null);
  const [isInteractingWithStroke, setIsInteractingWithStroke] = useState(false);
  const [isHoveringStroke, setIsHoveringStroke] = useState(false);
  const [strokeMovedDuringDrag, setStrokeMovedDuringDrag] = useState(false);

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

  // Helper function to check if a point is near a stroke
  const isPointNearStroke = useCallback((point: { x: number; y: number }, stroke: DrawingStroke, threshold: number = 10): boolean => {
    if (!stroke.points || stroke.points.length < 2) return false;

    for (let i = 0; i < stroke.points.length - 1; i++) {
      const p1 = stroke.points[i];
      const p2 = stroke.points[i + 1];
      
      if (!p1 || !p2 || typeof p1.x !== 'number' || typeof p1.y !== 'number' || 
          typeof p2.x !== 'number' || typeof p2.y !== 'number') continue;

      // Calculate distance from point to line segment
      const A = point.x - p1.x;
      const B = point.y - p1.y;
      const C = p2.x - p1.x;
      const D = p2.y - p1.y;

      const dot = A * C + B * D;
      const lenSq = C * C + D * D;
      
      if (lenSq === 0) continue;
      
      let param = dot / lenSq;
      param = Math.max(0, Math.min(1, param));

      const xx = p1.x + param * C;
      const yy = p1.y + param * D;

      const dx = point.x - xx;
      const dy = point.y - yy;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance <= threshold) {
        return true;
      }
    }
    return false;
  }, []);

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

      // Render strokes individually to handle selection highlighting
      strokes.forEach((stroke) => {
        if (!stroke || !stroke.points || stroke.points.length < 2) return;

        const isSelected = stroke.id === selectedStrokeId;
        
        // Set stroke style
        ctx.strokeStyle = stroke.color || '#ffffff';
        ctx.lineWidth = stroke.width || 3;
        
        // Add selection highlight
        if (isSelected && !isDrawingMode) {
          ctx.shadowColor = '#00bfff';
          ctx.shadowBlur = 8;
          ctx.lineWidth = (stroke.width || 3) + 2;
        } else {
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
        }

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

      // Draw current stroke if drawing
      if (currentStroke && currentStroke.points && currentStroke.points.length > 1) {
        ctx.strokeStyle = currentStroke.color || '#ffffff';
        ctx.lineWidth = currentStroke.width || 3;
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
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
  }, [strokes, currentStroke, reactFlowInstance, selectedStrokeId, isDrawingMode]);

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

      if (reactFlowInstance) {
        // Get mouse position relative to the canvas
        const canvasRect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - canvasRect.left;
        const mouseY = e.clientY - canvasRect.top;

        // Get current viewport
        const currentViewport = reactFlowInstance.getViewport();
        const { x: viewX, y: viewY, zoom: currentZoom } = currentViewport;

        // Calculate zoom delta (negative because wheel down should zoom out)
        const zoomDelta = -e.deltaY * 0.002;
        const newZoom = Math.max(0.1, Math.min(2, currentZoom * (1 + zoomDelta)));

        // Calculate the zoom factor
        const zoomFactor = newZoom / currentZoom;

        // Calculate new viewport position to zoom towards mouse position
        const newViewX = mouseX - (mouseX - viewX) * zoomFactor;
        const newViewY = mouseY - (mouseY - viewY) * zoomFactor;

        // Apply the new viewport
        reactFlowInstance.setViewport({
          x: newViewX,
          y: newViewY,
          zoom: newZoom
        });
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
      e.preventDefault();
      e.stopPropagation();

      const coords = getFlowCoordinates(e.clientX, e.clientY);
      userHasInteractedRef.current = true;

      if (isDrawingMode) {
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
      } else {
        // Normal mode - handle stroke selection and dragging
        const clickedStroke = strokes.find(stroke => 
          isPointNearStroke(coords, stroke, 15)
        );

        if (clickedStroke) {
          setSelectedStrokeId(clickedStroke.id);
          setIsDraggingStroke(true);
          setDragStartPoint(coords);
          // Store the original points of the stroke for accurate dragging
          setOriginalStrokePoints([...clickedStroke.points]);
          setStrokeMovedDuringDrag(false);
          setIsInteractingWithStroke(true);
        } else {
          // Clicked on empty space - deselect
          setSelectedStrokeId(null);
          setIsInteractingWithStroke(false);
        }
      }
    } catch (error) {
      // Skip mouse down on error
    }
  }, [isDrawingMode, isEraserMode, getFlowCoordinates, drawingColor, lineWidth, eraseAtPoint, strokes, isPointNearStroke]);



  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    try {
      const coords = getFlowCoordinates(e.clientX, e.clientY);

      if (isDrawingMode) {
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
      } else if (isDraggingStroke && selectedStrokeId && dragStartPoint && originalStrokePoints) {
        // Normal mode - handle stroke dragging
        // Calculate delta from the original drag start point
        const deltaX = coords.x - dragStartPoint.x;
        const deltaY = coords.y - dragStartPoint.y;

        // Check if stroke has moved significantly (1px threshold like node dragging)
        if (!strokeMovedDuringDrag && (Math.abs(deltaX) >= 1 || Math.abs(deltaY) >= 1)) {
          setStrokeMovedDuringDrag(true);
        }

        setStrokes(prevStrokes => {
          return prevStrokes.map(stroke => {
            if (stroke.id === selectedStrokeId) {
              return {
                ...stroke,
                // Apply delta to the original points, not the current points
                points: originalStrokePoints.map(originalPoint => ({
                  x: originalPoint.x + deltaX,
                  y: originalPoint.y + deltaY
                }))
              };
            }
            return stroke;
          });
        });

        // Don't update dragStartPoint - keep it as the original start point
      } else if (!isDrawingMode && strokes.length > 0) {
        // Check if hovering over any stroke for cursor feedback
        const hoveredStroke = strokes.find(stroke => 
          isPointNearStroke(coords, stroke, 15)
        );
        setIsHoveringStroke(!!hoveredStroke);
      }
    } catch (error) {
      // Skip mouse move on error
    }
  }, [isDrawingMode, isEraserMode, isDrawing, currentStroke, getFlowCoordinates, eraseAtPoint, isDraggingStroke, selectedStrokeId, dragStartPoint, strokes, isPointNearStroke]);

  const handleMouseUp = useCallback(() => {
    try {
      if (isDrawingMode && isDrawing) {
        if (currentStroke && currentStroke.points && currentStroke.points.length > 1) {
          setStrokes(prev => Array.isArray(prev) ? [...prev, currentStroke] : [currentStroke]);
        }
        setIsDrawing(false);
        setCurrentStroke(null);
      } else if (isDraggingStroke) {
        // End stroke dragging - create history entry if stroke actually moved
        if (strokeMovedDuringDrag) {
          // Trigger history creation by calling onDrawingChange
          onDrawingChange({ strokes });
        }
        
        setIsDraggingStroke(false);
        setDragStartPoint(null);
        setOriginalStrokePoints(null);
        setStrokeMovedDuringDrag(false);
        setIsInteractingWithStroke(false);
      }
    } catch (error) {
      // Reset states on error
      setIsDrawing(false);
      setCurrentStroke(null);
      setIsDraggingStroke(false);
      setDragStartPoint(null);
      setOriginalStrokePoints(null);
      setStrokeMovedDuringDrag(false);
      setIsInteractingWithStroke(false);
    }
  }, [isDrawingMode, isDrawing, currentStroke, isDraggingStroke]);

  const userHasInteractedRef = useRef(false);

  // Expose methods to parent component
  React.useImperativeHandle(ref, () => ({
    clearStrokeSelection: () => {
      setSelectedStrokeId(null);
    }
  }), []);

  // Notify parent when strokes change - but NOT during dragging
  useEffect(() => {
    // Only notify parent if:
    // 1. Data is loaded
    // 2. Not currently initializing  
    // 3. User has actually interacted with the canvas
    // 4. NOT currently dragging a stroke (to match node dragging behavior)
    if (dataLoaded && !isInitializingRef.current && userHasInteractedRef.current && !isDraggingStroke) {
      // Immediate update for all operations except dragging
      onDrawingChange({ strokes });
    }
  }, [strokes, onDrawingChange, dataLoaded, isDraggingStroke]);

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

  // Handle keyboard events for stroke deletion
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isDrawingMode && selectedStrokeId && (e.key === 'Delete' || e.key === 'Backspace')) {
        e.preventDefault();
        setStrokes(prevStrokes => prevStrokes.filter(stroke => stroke.id !== selectedStrokeId));
        setSelectedStrokeId(null);
        userHasInteractedRef.current = true;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isDrawingMode, selectedStrokeId]);

  // Global mouse move listener to detect stroke hovering when canvas doesn't have pointer events
  useEffect(() => {
    if (isDrawingMode || strokes.length === 0) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!canvasRef.current || !reactFlowInstance) return;

      try {
        const rect = canvasRef.current.getBoundingClientRect();
        const isOverCanvas = e.clientX >= rect.left && e.clientX <= rect.right && 
                            e.clientY >= rect.top && e.clientY <= rect.bottom;

        if (isOverCanvas) {
          const coords = getFlowCoordinates(e.clientX, e.clientY);
          const hoveredStroke = strokes.find(stroke => 
            isPointNearStroke(coords, stroke, 15)
          );
          setIsHoveringStroke(!!hoveredStroke);
        } else {
          setIsHoveringStroke(false);
        }
      } catch (error) {
        setIsHoveringStroke(false);
      }
    };

    document.addEventListener('mousemove', handleGlobalMouseMove);
    return () => document.removeEventListener('mousemove', handleGlobalMouseMove);
  }, [isDrawingMode, strokes, getFlowCoordinates, isPointNearStroke, reactFlowInstance]);

  // Render canvas
  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 ${isFullscreen ? '' : 'top-12'}`}
      style={{
        zIndex: isDrawingMode ? 10 : (strokes.length > 0 ? 2 : 1), // Above ReactFlow when drawing or when strokes exist
        cursor: isDrawingMode 
          ? (isEraserMode ? 'crosshair' : 'crosshair') 
          : (isDraggingStroke ? 'grabbing' : (isHoveringStroke ? 'grab' : 'default')),
        width: '100%',
        height: isFullscreen ? '100%' : 'calc(100% - 3rem)',
        // Only capture pointer events when drawing mode is active OR when actively interacting with strokes OR when hovering over strokes
        // Don't capture events just because a stroke is selected - allow normal mindmap interaction
        pointerEvents: (isDrawingMode || isInteractingWithStroke || isHoveringStroke) ? 'auto' : 'none',
        left: 0,
        opacity: 1, // Always visible
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    />
  );
});

DrawingCanvas.displayName = 'DrawingCanvas';