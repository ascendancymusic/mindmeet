import React, { useRef, useEffect, useState, useCallback } from 'react';

export interface DrawingStroke {
  id: string;
  points: { x: number; y: number }[];
  color: string;
  width: number;
  timestamp: number;
  selected?: boolean;
  rotation?: number; // Rotation angle in radians
  type?: 'pen' | 'rectangle' | 'circle' | 'triangle' | 'line'; // Shape type
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
  drawingTool?: 'pen' | 'eraser' | 'rectangle' | 'circle' | 'triangle' | 'line';
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
  drawingTool = 'pen',
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

  // Stroke resizing state
  const [isResizingStroke, setIsResizingStroke] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w' | null>(null);
  const [originalStrokeBounds, setOriginalStrokeBounds] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [originalStrokeWidth, setOriginalStrokeWidth] = useState<number | null>(null);
  const [isHoveringResizeHandle, setIsHoveringResizeHandle] = useState<string | null>(null);

  // Stroke rotation state
  const [isRotatingStroke, setIsRotatingStroke] = useState(false);
  const [rotationStartAngle, setRotationStartAngle] = useState<number | null>(null);
  const [rotationCenter, setRotationCenter] = useState<{ x: number; y: number } | null>(null);
  const [originalRotation, setOriginalRotation] = useState<number | null>(null);
  const [rotationChanged, setRotationChanged] = useState(false);
  const [isHoveringRotateHandle, setIsHoveringRotateHandle] = useState(false);

  // Shape drawing state
  const [isDrawingShape, setIsDrawingShape] = useState(false);
  const [shapeStartPoint, setShapeStartPoint] = useState<{ x: number; y: number } | null>(null);

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

  // Helper function to get stroke bounds
  const getStrokeBounds = useCallback((stroke: DrawingStroke) => {
    if (!stroke.points || stroke.points.length === 0) return null;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    stroke.points.forEach(point => {
      if (point && typeof point.x === 'number' && typeof point.y === 'number') {
        minX = Math.min(minX, point.x);
        minY = Math.min(minY, point.y);
        maxX = Math.max(maxX, point.x);
        maxY = Math.max(maxY, point.y);
      }
    });

    if (!isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY)) {
      return null;
    }

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  }, []);

  // Helper function to transform a point by inverse rotation
  const transformPointInverse = useCallback((point: { x: number; y: number }, center: { x: number; y: number }, rotation: number): { x: number; y: number } => {
    if (!rotation) return point;

    // Apply inverse rotation
    const cos = Math.cos(-rotation);
    const sin = Math.sin(-rotation);
    const dx = point.x - center.x;
    const dy = point.y - center.y;

    return {
      x: center.x + dx * cos - dy * sin,
      y: center.y + dx * sin + dy * cos
    };
  }, []);

  // Helper function to check if a point is near a stroke
  const isPointNearStroke = useCallback((point: { x: number; y: number }, stroke: DrawingStroke, threshold: number = 10): boolean => {
    if (!stroke.points || stroke.points.length < 2) return false;

    // If stroke is rotated, transform the point to the stroke's local space
    let testPoint = point;
    if (stroke.rotation) {
      const bounds = getStrokeBounds(stroke);
      if (bounds) {
        const center = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
        testPoint = transformPointInverse(point, center, stroke.rotation);
      }
    }

    for (let i = 0; i < stroke.points.length - 1; i++) {
      const p1 = stroke.points[i];
      const p2 = stroke.points[i + 1];

      if (!p1 || !p2 || typeof p1.x !== 'number' || typeof p1.y !== 'number' ||
        typeof p2.x !== 'number' || typeof p2.y !== 'number') continue;

      // Calculate distance from point to line segment
      const A = testPoint.x - p1.x;
      const B = testPoint.y - p1.y;
      const C = p2.x - p1.x;
      const D = p2.y - p1.y;

      const dot = A * C + B * D;
      const lenSq = C * C + D * D;

      if (lenSq === 0) continue;

      let param = dot / lenSq;
      param = Math.max(0, Math.min(1, param));

      const xx = p1.x + param * C;
      const yy = p1.y + param * D;

      const dx = testPoint.x - xx;
      const dy = testPoint.y - yy;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance <= threshold) {
        return true;
      }
    }
    return false;
  }, [getStrokeBounds, transformPointInverse]);

  // Helper function to check if a point is near a resize handle
  const getResizeHandleAtPoint = useCallback((point: { x: number; y: number }, stroke: DrawingStroke): string | null => {
    const bounds = getStrokeBounds(stroke);
    if (!bounds) return null;

    // Use smaller handles for very small strokes (like dots)
    const strokeSize = Math.max(bounds.width, bounds.height);
    const isSmallStroke = strokeSize < 30;
    const handleSize = isSmallStroke ? 6 : 10;
    const threshold = handleSize / 2;
    const center = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };

    // Transform point to stroke's local space if rotated
    let testPoint = point;
    if (stroke.rotation) {
      testPoint = transformPointInverse(point, center, stroke.rotation);
    }

    // Define handle positions in local space
    const handles: { [key: string]: { x: number; y: number } } = {
      nw: { x: bounds.x, y: bounds.y },
      ne: { x: bounds.x + bounds.width, y: bounds.y },
      sw: { x: bounds.x, y: bounds.y + bounds.height },
      se: { x: bounds.x + bounds.width, y: bounds.y + bounds.height }
    };

    // Add side resize handles if stroke has enough space (minimum 60px width/height)
    const minSizeForSideHandles = 60;
    if (bounds.width >= minSizeForSideHandles) {
      // When width is large enough, show top/bottom handles
      handles.n = { x: bounds.x + bounds.width / 2, y: bounds.y };
      handles.s = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height };
    }
    if (bounds.height >= minSizeForSideHandles) {
      // When height is large enough, show left/right handles
      handles.w = { x: bounds.x, y: bounds.y + bounds.height / 2 };
      handles.e = { x: bounds.x + bounds.width, y: bounds.y + bounds.height / 2 };
    }

    // Check each handle
    for (const [handleName, handlePos] of Object.entries(handles)) {
      const distance = Math.sqrt(
        Math.pow(testPoint.x - handlePos.x, 2) + Math.pow(testPoint.y - handlePos.y, 2)
      );
      if (distance <= threshold) {
        return handleName;
      }
    }

    return null;
  }, [getStrokeBounds, transformPointInverse]);

  // Helper function to resize stroke points
  const resizeStrokePoints = useCallback((
    originalPoints: { x: number; y: number }[],
    originalBounds: { x: number; y: number; width: number; height: number },
    newBounds: { x: number; y: number; width: number; height: number },
    flipX: boolean = false,
    flipY: boolean = false
  ): { x: number; y: number }[] => {
    if (originalBounds.width === 0 || originalBounds.height === 0) return originalPoints;

    const scaleX = newBounds.width / originalBounds.width;
    const scaleY = newBounds.height / originalBounds.height;

    return originalPoints.map(point => {
      // Calculate relative position within original bounds (0 to 1)
      let relativeX = (point.x - originalBounds.x) / originalBounds.width;
      let relativeY = (point.y - originalBounds.y) / originalBounds.height;

      // Apply mirroring if needed
      if (flipX) {
        relativeX = 1 - relativeX;
      }
      if (flipY) {
        relativeY = 1 - relativeY;
      }

      // Scale to new bounds
      return {
        x: newBounds.x + relativeX * newBounds.width,
        y: newBounds.y + relativeY * newBounds.height
      };
    });
  }, []);

  // Helper function to get rotation handle position (top-right corner + offset)
  const getRotationHandlePosition = useCallback((bounds: { x: number; y: number; width: number; height: number }) => {
    const handleX = bounds.x + bounds.width + 15; // 15px to the right of the top-right corner
    const handleY = bounds.y - 15; // 15px above the top-right corner
    return { x: handleX, y: handleY };
  }, []);

  // Helper function to check if a point is near the rotation handle
  const isPointNearRotationHandle = useCallback((point: { x: number; y: number }, stroke: DrawingStroke): boolean => {
    const bounds = getStrokeBounds(stroke);
    if (!bounds) return false;

    const center = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };

    // Transform point to stroke's local space if rotated
    let testPoint = point;
    if (stroke.rotation) {
      testPoint = transformPointInverse(point, center, stroke.rotation);
    }

    // Use smaller threshold for very small strokes (like dots)
    const strokeSize = Math.max(bounds.width, bounds.height);
    const isSmallStroke = strokeSize < 30;
    const threshold = isSmallStroke ? 4 : 6; // Smaller threshold for small strokes

    const handlePos = getRotationHandlePosition(bounds);
    const distance = Math.sqrt(
      Math.pow(testPoint.x - handlePos.x, 2) + Math.pow(testPoint.y - handlePos.y, 2)
    );
    return distance <= threshold;
  }, [getStrokeBounds, getRotationHandlePosition, transformPointInverse]);

  // Helper function to calculate angle between two points
  const calculateAngle = useCallback((center: { x: number; y: number }, point: { x: number; y: number }): number => {
    return Math.atan2(point.y - center.y, point.x - center.x);
  }, []);

  // Helper functions for creating shape points
  const createRectanglePoints = useCallback((start: { x: number; y: number }, end: { x: number; y: number }): { x: number; y: number }[] => {
    return [
      { x: start.x, y: start.y },
      { x: end.x, y: start.y },
      { x: end.x, y: end.y },
      { x: start.x, y: end.y },
      { x: start.x, y: start.y } // Close the rectangle
    ];
  }, []);

  const createCirclePoints = useCallback((start: { x: number; y: number }, end: { x: number; y: number }): { x: number; y: number }[] => {
    const centerX = (start.x + end.x) / 2;
    const centerY = (start.y + end.y) / 2;
    const radiusX = Math.abs(end.x - start.x) / 2;
    const radiusY = Math.abs(end.y - start.y) / 2;

    const points: { x: number; y: number }[] = [];
    const numPoints = 64; // Number of points to create smooth circle

    for (let i = 0; i <= numPoints; i++) {
      const angle = (i / numPoints) * 2 * Math.PI;
      points.push({
        x: centerX + radiusX * Math.cos(angle),
        y: centerY + radiusY * Math.sin(angle)
      });
    }

    return points;
  }, []);

  const createTrianglePoints = useCallback((start: { x: number; y: number }, end: { x: number; y: number }): { x: number; y: number }[] => {
    const centerX = (start.x + end.x) / 2;
    const topY = Math.min(start.y, end.y);
    const bottomY = Math.max(start.y, end.y);

    return [
      { x: centerX, y: topY }, // Top point
      { x: start.x, y: bottomY }, // Bottom left
      { x: end.x, y: bottomY }, // Bottom right
      { x: centerX, y: topY } // Close the triangle
    ];
  }, []);

  const createLinePoints = useCallback((start: { x: number; y: number }, end: { x: number; y: number }): { x: number; y: number }[] => {
    return [start, end];
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

        // Calculate stroke bounds for rotation center
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        stroke.points.forEach(point => {
          if (point && typeof point.x === 'number' && typeof point.y === 'number') {
            minX = Math.min(minX, point.x);
            minY = Math.min(minY, point.y);
            maxX = Math.max(maxX, point.x);
            maxY = Math.max(maxY, point.y);
          }
        });

        if (!isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY)) return;

        const bounds = { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
        const center = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };

        // Apply rotation transform if stroke has rotation
        ctx.save();
        if (stroke.rotation) {
          ctx.translate(center.x, center.y);
          ctx.rotate(stroke.rotation);
          ctx.translate(-center.x, -center.y);
        }

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

        // Render stroke based on its type
        if (stroke.type === 'rectangle') {
          // For rectangles, we need to draw a proper rectangle shape
          if (stroke.points.length >= 4) {
            ctx.beginPath();
            ctx.rect(
              Math.min(stroke.points[0].x, stroke.points[2].x),
              Math.min(stroke.points[0].y, stroke.points[2].y),
              Math.abs(stroke.points[2].x - stroke.points[0].x),
              Math.abs(stroke.points[2].y - stroke.points[0].y)
            );
            ctx.stroke();
          }
        } else if (stroke.type === 'circle') {
          // For circles, we need to extract the original bounds from the generated points
          // The circle points are generated around the circumference, so we need to find the bounding box
          if (stroke.points.length >= 4) {
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            stroke.points.forEach(point => {
              minX = Math.min(minX, point.x);
              minY = Math.min(minY, point.y);
              maxX = Math.max(maxX, point.x);
              maxY = Math.max(maxY, point.y);
            });

            const centerX = (minX + maxX) / 2;
            const centerY = (minY + maxY) / 2;
            const radiusX = (maxX - minX) / 2;
            const radiusY = (maxY - minY) / 2;

            ctx.beginPath();
            ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
            ctx.stroke();
          }
        } else {
          // For pen, triangle, line, and other stroke types, draw as connected lines
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
        }

        // Draw resize handles and rotation handle for selected stroke
        if (isSelected && !isDrawingMode) {
          // Use smaller handles for very small strokes (like dots)
          const strokeSize = Math.max(bounds.width, bounds.height);
          const isSmallStroke = strokeSize < 30; // Consider strokes smaller than 30px as "small"
          const handleSize = isSmallStroke ? 6 : 10; // Smaller handles for small strokes

          const handles = [
            { x: bounds.x, y: bounds.y, name: 'nw' },
            { x: bounds.x + bounds.width, y: bounds.y, name: 'ne' },
            { x: bounds.x, y: bounds.y + bounds.height, name: 'sw' },
            { x: bounds.x + bounds.width, y: bounds.y + bounds.height, name: 'se' }
          ];

          // Add side resize handles if stroke has enough space (minimum 60px width/height)
          const minSizeForSideHandles = 60;
          if (bounds.width >= minSizeForSideHandles) {
            // When width is large enough, show top/bottom handles
            handles.push(
              { x: bounds.x + bounds.width / 2, y: bounds.y, name: 'n' },
              { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height, name: 's' }
            );
          }
          if (bounds.height >= minSizeForSideHandles) {
            // When height is large enough, show left/right handles
            handles.push(
              { x: bounds.x, y: bounds.y + bounds.height / 2, name: 'w' },
              { x: bounds.x + bounds.width, y: bounds.y + bounds.height / 2, name: 'e' }
            );
          }

          // Draw resize handles (these will be rotated with the stroke)
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
          handles.forEach(handle => {
            ctx.fillStyle = isHoveringResizeHandle === handle.name ? '#ffffff' : '#00bfff';
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 1;

            ctx.beginPath();
            ctx.rect(
              handle.x - handleSize / 2,
              handle.y - handleSize / 2,
              handleSize,
              handleSize
            );
            ctx.fill();
            ctx.stroke();
          });

          // Draw rotation handle (this will also be rotated with the stroke)
          const rotateHandlePos = getRotationHandlePosition(bounds);
          const rotateHandleSize = isSmallStroke ? 8 : 12; // Smaller rotation handle for small strokes

          // Draw connection line from top-right corner to rotation handle
          ctx.strokeStyle = '#00bfff';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(bounds.x + bounds.width, bounds.y);
          ctx.lineTo(rotateHandlePos.x, rotateHandlePos.y);
          ctx.stroke();

          // Draw rotation handle (circle)
          ctx.fillStyle = isHoveringRotateHandle ? '#ffffff' : '#00bfff';
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(rotateHandlePos.x, rotateHandlePos.y, rotateHandleSize / 2, 0, 2 * Math.PI);
          ctx.fill();
          ctx.stroke();

          // Draw rotation icon inside the handle
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 1;
          const iconRadius = rotateHandleSize / 4;
          ctx.beginPath();
          ctx.arc(rotateHandlePos.x, rotateHandlePos.y, iconRadius, 0, Math.PI * 1.5);
          ctx.stroke();
          // Add arrow tip
          ctx.beginPath();
          ctx.moveTo(rotateHandlePos.x + iconRadius * 0.7, rotateHandlePos.y - iconRadius * 0.7);
          ctx.lineTo(rotateHandlePos.x + iconRadius, rotateHandlePos.y - iconRadius);
          ctx.lineTo(rotateHandlePos.x + iconRadius * 0.7, rotateHandlePos.y - iconRadius * 1.3);
          ctx.stroke();
        }

        // Restore the transformation
        ctx.restore();
      });

      // Draw current stroke if drawing
      if (currentStroke && currentStroke.points && currentStroke.points.length > 1) {
        ctx.strokeStyle = currentStroke.color || '#ffffff';
        ctx.lineWidth = currentStroke.width || 3;
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;

        // Render current stroke based on its type
        if (currentStroke.type === 'rectangle') {
          // For rectangles, draw a proper rectangle shape
          if (currentStroke.points.length >= 4) {
            ctx.beginPath();
            ctx.rect(
              Math.min(currentStroke.points[0].x, currentStroke.points[2].x),
              Math.min(currentStroke.points[0].y, currentStroke.points[2].y),
              Math.abs(currentStroke.points[2].x - currentStroke.points[0].x),
              Math.abs(currentStroke.points[2].y - currentStroke.points[0].y)
            );
            ctx.stroke();
          }
        } else if (currentStroke.type === 'circle') {
          // For circles, we need to extract the original bounds from the generated points
          if (currentStroke.points.length >= 4) {
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            currentStroke.points.forEach(point => {
              minX = Math.min(minX, point.x);
              minY = Math.min(minY, point.y);
              maxX = Math.max(maxX, point.x);
              maxY = Math.max(maxY, point.y);
            });

            const centerX = (minX + maxX) / 2;
            const centerY = (minY + maxY) / 2;
            const radiusX = (maxX - minX) / 2;
            const radiusY = (maxY - minY) / 2;

            ctx.beginPath();
            ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
            ctx.stroke();
          }
        } else {
          // For pen, triangle, line, and other stroke types, draw as connected lines
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
      }

      // Restore canvas transformation
      ctx.restore();
    } catch (error) {
      // Skip frame on error
    }
  }, [strokes, currentStroke, reactFlowInstance, selectedStrokeId, isDrawingMode, isHoveringResizeHandle, isHoveringRotateHandle, getRotationHandlePosition]);

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
        } else if (drawingTool === 'pen') {
          setIsDrawing(true);
          const newStroke: DrawingStroke = {
            id: `stroke-${Date.now()}-${Math.random()}`,
            points: [coords],
            color: drawingColor || '#ffffff',
            width: lineWidth || 3,
            timestamp: Date.now(),
            type: 'pen',
          };
          setCurrentStroke(newStroke);
        } else {
          // Shape tools (rectangle, circle, triangle, line)
          setIsDrawingShape(true);
          setShapeStartPoint(coords);
          const newStroke: DrawingStroke = {
            id: `stroke-${Date.now()}-${Math.random()}`,
            points: [coords, coords], // Start with same point twice
            color: drawingColor || '#ffffff',
            width: lineWidth || 3,
            timestamp: Date.now(),
            type: drawingTool === 'eraser' ? 'pen' : drawingTool,
          };
          setCurrentStroke(newStroke);
        }
      } else {
        // Normal mode - handle stroke selection, resizing, and dragging
        const selectedStroke = selectedStrokeId ? strokes.find(s => s.id === selectedStrokeId) : null;

        // Check if clicking on rotation handle first
        if (selectedStroke && isPointNearRotationHandle(coords, selectedStroke)) {
          setIsRotatingStroke(true);
          setDragStartPoint(coords);
          const bounds = getStrokeBounds(selectedStroke);
          if (bounds) {
            const center = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
            const initialAngle = calculateAngle(center, coords);
            setRotationStartAngle(initialAngle);
            setRotationCenter(center);
            setOriginalRotation(selectedStroke.rotation || 0);
            setRotationChanged(false);
          }
          setIsInteractingWithStroke(true);
          return;
        }

        // Check if clicking on a resize handle
        if (selectedStroke) {
          const handleName = getResizeHandleAtPoint(coords, selectedStroke);
          if (handleName) {
            setIsResizingStroke(true);
            setResizeHandle(handleName as 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w');
            setDragStartPoint(coords);
            const bounds = getStrokeBounds(selectedStroke);
            if (bounds) {
              setOriginalStrokeBounds(bounds);
              setOriginalStrokePoints([...selectedStroke.points]);
              setOriginalStrokeWidth(selectedStroke.width);
            }
            setIsInteractingWithStroke(true);
            return;
          }
        }

        // Check for stroke selection
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
  }, [isDrawingMode, isEraserMode, getFlowCoordinates, drawingColor, lineWidth, eraseAtPoint, strokes, isPointNearStroke, selectedStrokeId, getResizeHandleAtPoint, getStrokeBounds, drawingTool]);



  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    try {
      const coords = getFlowCoordinates(e.clientX, e.clientY);

      if (isDrawingMode) {
        if (isEraserMode) {
          eraseAtPoint(coords.x, coords.y);
        } else if (isDrawing && currentStroke && drawingTool === 'pen') {
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
        } else if (isDrawingShape && currentStroke && shapeStartPoint) {
          // Update shape as user drags
          setCurrentStroke(prev => {
            if (!prev || !shapeStartPoint) return prev;

            let newPoints: { x: number; y: number }[] = [];

            switch (drawingTool) {
              case 'rectangle':
                newPoints = createRectanglePoints(shapeStartPoint, coords);
                break;
              case 'circle':
                newPoints = createCirclePoints(shapeStartPoint, coords);
                break;
              case 'triangle':
                newPoints = createTrianglePoints(shapeStartPoint, coords);
                break;
              case 'line':
                newPoints = createLinePoints(shapeStartPoint, coords);
                break;
              default:
                newPoints = prev.points;
            }

            return {
              ...prev,
              points: newPoints
            };
          });
        }
      } else if (isRotatingStroke && selectedStrokeId && dragStartPoint && rotationStartAngle !== null && rotationCenter && originalRotation !== null) {
        // Handle stroke rotation using transform approach
        const currentAngle = calculateAngle(rotationCenter, coords);
        const rotationAngle = currentAngle - rotationStartAngle;
        const newRotation = originalRotation + rotationAngle;

        // Check if rotation has changed significantly (threshold of ~1 degree)
        if (!rotationChanged && Math.abs(rotationAngle) >= 0.017) { // 0.017 radians ≈ 1 degree
          setRotationChanged(true);
        }

        // Apply rotation transform to stroke
        setStrokes(prevStrokes => {
          return prevStrokes.map(stroke => {
            if (stroke.id === selectedStrokeId) {
              return {
                ...stroke,
                rotation: newRotation
              };
            }
            return stroke;
          });
        });
      } else if (isResizingStroke && selectedStrokeId && dragStartPoint && originalStrokeBounds && originalStrokePoints && originalStrokeWidth && resizeHandle) {
        // Handle stroke resizing
        const deltaX = coords.x - dragStartPoint.x;
        const deltaY = coords.y - dragStartPoint.y;

        let newBounds = { ...originalStrokeBounds };

        // Calculate new bounds based on resize handle
        switch (resizeHandle) {
          case 'nw':
            newBounds.x = originalStrokeBounds.x + deltaX;
            newBounds.y = originalStrokeBounds.y + deltaY;
            newBounds.width = originalStrokeBounds.width - deltaX;
            newBounds.height = originalStrokeBounds.height - deltaY;
            break;
          case 'ne':
            newBounds.y = originalStrokeBounds.y + deltaY;
            newBounds.width = originalStrokeBounds.width + deltaX;
            newBounds.height = originalStrokeBounds.height - deltaY;
            break;
          case 'sw':
            newBounds.x = originalStrokeBounds.x + deltaX;
            newBounds.width = originalStrokeBounds.width - deltaX;
            newBounds.height = originalStrokeBounds.height + deltaY;
            break;
          case 'se':
            newBounds.width = originalStrokeBounds.width + deltaX;
            newBounds.height = originalStrokeBounds.height + deltaY;
            break;
          case 'n':
            newBounds.y = originalStrokeBounds.y + deltaY;
            newBounds.height = originalStrokeBounds.height - deltaY;
            break;
          case 's':
            newBounds.height = originalStrokeBounds.height + deltaY;
            break;
          case 'w':
            newBounds.x = originalStrokeBounds.x + deltaX;
            newBounds.width = originalStrokeBounds.width - deltaX;
            break;
          case 'e':
            newBounds.width = originalStrokeBounds.width + deltaX;
            break;
        }

        // Handle mirroring when dimensions become negative
        let flipX = false;
        let flipY = false;

        if (newBounds.width < 0) {
          newBounds.x = newBounds.x + newBounds.width;
          newBounds.width = Math.abs(newBounds.width);
          flipX = true;
        }

        if (newBounds.height < 0) {
          newBounds.y = newBounds.y + newBounds.height;
          newBounds.height = Math.abs(newBounds.height);
          flipY = true;
        }

        // Ensure minimum size after mirroring
        const minSize = 10;
        if (newBounds.width < minSize) {
          newBounds.width = minSize;
        }
        if (newBounds.height < minSize) {
          newBounds.height = minSize;
        }

        // Calculate scale factor for line width based on stretch direction
        const scaleX = newBounds.width / originalStrokeBounds.width;
        const scaleY = newBounds.height / originalStrokeBounds.height;

        // For stretch effect, determine which dimension is being stretched more
        // and scale the line width based on the perpendicular dimension
        let widthScale;

        if (Math.abs(scaleX - 1) > Math.abs(scaleY - 1)) {
          // X dimension is being stretched more, so scale width by Y dimension
          widthScale = scaleY;
        } else {
          // Y dimension is being stretched more, so scale width by X dimension  
          widthScale = scaleX;
        }

        // If both dimensions are being scaled equally, use the average
        if (Math.abs(scaleX - scaleY) < 0.1) {
          widthScale = (scaleX + scaleY) / 2;
        }

        const newLineWidth = Math.max(1, Math.min(50, (originalStrokeWidth || 3) * widthScale)); // Clamp between 1 and 50

        // Apply resize to stroke
        setStrokes(prevStrokes => {
          return prevStrokes.map(stroke => {
            if (stroke.id === selectedStrokeId) {
              return {
                ...stroke,
                points: resizeStrokePoints(originalStrokePoints, originalStrokeBounds, newBounds, flipX, flipY),
                width: newLineWidth
              };
            }
            return stroke;
          });
        });

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
        // Check if hovering over rotation handle, resize handles, or strokes for cursor feedback
        const selectedStroke = selectedStrokeId ? strokes.find(s => s.id === selectedStrokeId) : null;

        if (selectedStroke) {
          // Check rotation handle first
          const isNearRotateHandle = isPointNearRotationHandle(coords, selectedStroke);
          setIsHoveringRotateHandle(isNearRotateHandle);

          if (isNearRotateHandle) {
            setIsHoveringStroke(false);
            setIsHoveringResizeHandle(null);
            return;
          }

          // Check resize handles
          const handleName = getResizeHandleAtPoint(coords, selectedStroke);
          setIsHoveringResizeHandle(handleName);

          if (handleName) {
            setIsHoveringStroke(false);
            return;
          }
        }

        // Check if hovering over any stroke for cursor feedback
        const hoveredStroke = strokes.find(stroke =>
          isPointNearStroke(coords, stroke, 15)
        );
        setIsHoveringStroke(!!hoveredStroke);
        setIsHoveringResizeHandle(null);
      }
    } catch (error) {
      // Skip mouse move on error
    }
  }, [isDrawingMode, isEraserMode, isDrawing, currentStroke, getFlowCoordinates, eraseAtPoint, isRotatingStroke, selectedStrokeId, dragStartPoint, rotationStartAngle, rotationCenter, originalRotation, rotationChanged, calculateAngle, getStrokeBounds, isResizingStroke, originalStrokeBounds, originalStrokeWidth, resizeHandle, resizeStrokePoints, isDraggingStroke, strokes, isPointNearStroke, getResizeHandleAtPoint, isPointNearRotationHandle, drawingTool, isDrawingShape, shapeStartPoint, createRectanglePoints, createCirclePoints, createTrianglePoints, createLinePoints]);

  const handleMouseUp = useCallback(() => {
    try {
      if (isDrawingMode && (isDrawing || isDrawingShape)) {
        if (currentStroke && currentStroke.points && currentStroke.points.length > 1) {
          setStrokes(prev => Array.isArray(prev) ? [...prev, currentStroke] : [currentStroke]);
        }
        setIsDrawing(false);
        setIsDrawingShape(false);
        setShapeStartPoint(null);
        setCurrentStroke(null);
      } else if (isRotatingStroke) {
        // End stroke rotation - only create history entry if rotation actually changed
        if (rotationChanged) {
          onDrawingChange({ strokes });
        }

        setIsRotatingStroke(false);
        setRotationStartAngle(null);
        setRotationCenter(null);
        setOriginalRotation(null);
        setRotationChanged(false);
        setDragStartPoint(null);
        setOriginalStrokePoints(null);
        setIsInteractingWithStroke(false);
      } else if (isResizingStroke) {
        // End stroke resizing - always create history entry for resize operations
        onDrawingChange({ strokes });

        setIsResizingStroke(false);
        setResizeHandle(null);
        setDragStartPoint(null);
        setOriginalStrokeBounds(null);
        setOriginalStrokePoints(null);
        setOriginalStrokeWidth(null);
        setIsInteractingWithStroke(false);
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
      setIsDrawingShape(false);
      setShapeStartPoint(null);
      setCurrentStroke(null);
      setIsRotatingStroke(false);
      setRotationStartAngle(null);
      setRotationCenter(null);
      setOriginalRotation(null);
      setRotationChanged(false);
      setIsResizingStroke(false);
      setResizeHandle(null);
      setIsDraggingStroke(false);
      setDragStartPoint(null);
      setOriginalStrokeBounds(null);
      setOriginalStrokePoints(null);
      setOriginalStrokeWidth(null);
      setStrokeMovedDuringDrag(false);
      setIsInteractingWithStroke(false);
    }
  }, [isDrawingMode, isDrawing, isDrawingShape, currentStroke, isRotatingStroke, rotationChanged, isResizingStroke, isDraggingStroke, strokes, onDrawingChange]);

  const userHasInteractedRef = useRef(false);

  // Expose methods to parent component
  React.useImperativeHandle(ref, () => ({
    clearStrokeSelection: () => {
      setSelectedStrokeId(null);
    }
  }), []);

  // Notify parent when strokes change - but NOT during dragging, resizing, or rotating
  useEffect(() => {
    // Only notify parent if:
    // 1. Data is loaded
    // 2. Not currently initializing  
    // 3. User has actually interacted with the canvas
    // 4. NOT currently dragging, resizing, or rotating a stroke (to match node dragging behavior)
    if (dataLoaded && !isInitializingRef.current && userHasInteractedRef.current && !isDraggingStroke && !isResizingStroke && !isRotatingStroke) {
      // Immediate update for all operations except dragging, resizing, and rotating
      onDrawingChange({ strokes });
    }
  }, [strokes, onDrawingChange, dataLoaded, isDraggingStroke, isResizingStroke, isRotatingStroke]);

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

          // Check for rotation and resize handles first
          const selectedStroke = selectedStrokeId ? strokes.find(s => s.id === selectedStrokeId) : null;
          if (selectedStroke) {
            // Check rotation handle first
            const isNearRotateHandle = isPointNearRotationHandle(coords, selectedStroke);
            setIsHoveringRotateHandle(isNearRotateHandle);

            if (isNearRotateHandle) {
              setIsHoveringStroke(false);
              setIsHoveringResizeHandle(null);
              return;
            }

            // Check resize handles
            const handleName = getResizeHandleAtPoint(coords, selectedStroke);
            setIsHoveringResizeHandle(handleName);

            if (handleName) {
              setIsHoveringStroke(false);
              return;
            }
          }

          // Check for stroke hovering
          const hoveredStroke = strokes.find(stroke =>
            isPointNearStroke(coords, stroke, 15)
          );
          setIsHoveringStroke(!!hoveredStroke);
          setIsHoveringResizeHandle(null);
        } else {
          setIsHoveringStroke(false);
          setIsHoveringResizeHandle(null);
          setIsHoveringRotateHandle(false);
        }
      } catch (error) {
        setIsHoveringStroke(false);
        setIsHoveringResizeHandle(null);
        setIsHoveringRotateHandle(false);
      }
    };

    document.addEventListener('mousemove', handleGlobalMouseMove);
    return () => document.removeEventListener('mousemove', handleGlobalMouseMove);
  }, [isDrawingMode, strokes, getFlowCoordinates, isPointNearStroke, reactFlowInstance, selectedStrokeId, getResizeHandleAtPoint, isPointNearRotationHandle]);

  // Get cursor style based on current state
  const getCursorStyle = () => {
    if (isDrawingMode) {
      if (isEraserMode) {
        return 'crosshair';
      }
      switch (drawingTool) {
        case 'pen':
          return 'crosshair';
        case 'rectangle':
        case 'circle':
        case 'triangle':
        case 'line':
          return 'crosshair';
        default:
          return 'crosshair';
      }
    }

    if (isRotatingStroke) {
      return 'grabbing';
    }

    if (isResizingStroke) {
      // Return appropriate resize cursor based on handle
      switch (resizeHandle) {
        case 'nw':
        case 'se':
          return 'nw-resize';
        case 'ne':
        case 'sw':
          return 'ne-resize';
        case 'n':
        case 's':
          return 'ns-resize';
        case 'e':
        case 'w':
          return 'ew-resize';
        default:
          return 'default';
      }
    }

    if (isDraggingStroke) {
      return 'grabbing';
    }

    if (isHoveringRotateHandle) {
      return 'grab';
    }

    if (isHoveringResizeHandle) {
      // Return appropriate resize cursor based on hovered handle
      switch (isHoveringResizeHandle) {
        case 'nw':
        case 'se':
          return 'nw-resize';
        case 'ne':
        case 'sw':
          return 'ne-resize';
        case 'n':
        case 's':
          return 'ns-resize';
        case 'e':
        case 'w':
          return 'ew-resize';
        default:
          return 'default';
      }
    }

    if (isHoveringStroke) {
      return 'grab';
    }

    return 'default';
  };

  // Render canvas
  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 ${isFullscreen ? '' : 'top-12'}`}
      style={{
        zIndex: isDrawingMode ? 10 : (strokes.length > 0 ? 2 : 1), // Above ReactFlow when drawing or when strokes exist
        cursor: getCursorStyle(),
        width: '100%',
        height: isFullscreen ? '100%' : 'calc(100% - 3rem)',
        // Only capture pointer events when drawing mode is active OR when actively interacting with strokes OR when hovering over strokes/handles
        // Don't capture events just because a stroke is selected - allow normal mindmap interaction
        pointerEvents: (isDrawingMode || isInteractingWithStroke || isHoveringStroke || isHoveringResizeHandle || isHoveringRotateHandle) ? 'auto' : 'none',
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