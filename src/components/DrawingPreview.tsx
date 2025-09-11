import React, { useRef, useEffect } from 'react';
import { useStore } from 'reactflow';
import { DrawingData, DrawingStroke } from './DrawingCanvas';

interface DrawingPreviewProps {
  drawingData?: DrawingData;
  className?: string;
}

/**
 * DrawingPreview Component
 * 
 * A lightweight component for rendering drawing data in read-only mode
 * Used in mindmap previews to show drawing overlays without editing capabilities
 * Positioned within ReactFlow coordinate system to move/zoom with nodes
 */
export const DrawingPreview: React.FC<DrawingPreviewProps> = ({
  drawingData,
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Get ReactFlow viewport information
  const { x, y, zoom } = useStore((store) => ({
    x: store.transform[0],
    y: store.transform[1],
    zoom: store.transform[2],
  }));

  // Render strokes on canvas
  const renderStrokes = React.useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !drawingData?.strokes?.length) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    try {
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Apply ReactFlow transformation
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(zoom, zoom);

      // Set common stroke properties
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Render each stroke
      drawingData.strokes.forEach((stroke: DrawingStroke) => {
        if (!stroke || !stroke.points || stroke.points.length < 2) return;

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
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;

        // Render stroke based on its type
        if (stroke.type === 'rectangle') {
          // For rectangles, draw a proper rectangle shape
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
          // For circles, extract bounds from generated points
          if (stroke.points.length >= 4) {
            let circleMinX = Infinity, circleMinY = Infinity, circleMaxX = -Infinity, circleMaxY = -Infinity;
            stroke.points.forEach(point => {
              circleMinX = Math.min(circleMinX, point.x);
              circleMinY = Math.min(circleMinY, point.y);
              circleMaxX = Math.max(circleMaxX, point.x);
              circleMaxY = Math.max(circleMaxY, point.y);
            });

            const centerX = (circleMinX + circleMaxX) / 2;
            const centerY = (circleMinY + circleMaxY) / 2;
            const radiusX = (circleMaxX - circleMinX) / 2;
            const radiusY = (circleMaxY - circleMinY) / 2;

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

        // Restore the transformation
        ctx.restore();
      });

      // Restore canvas transformation
      ctx.restore();
    } catch (error) {
      console.warn('Error rendering drawing preview:', error);
    }
  }, [drawingData, x, y, zoom]);

  // Update canvas size when container resizes
  useEffect(() => {
    const updateCanvasSize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const container = canvas.parentElement;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const { devicePixelRatio = 1 } = window;

      // Set actual size in memory (scaled to account for extra pixel density)
      canvas.width = rect.width * devicePixelRatio;
      canvas.height = rect.height * devicePixelRatio;

      // Scale the drawing context so everything draws at the correct size
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(devicePixelRatio, devicePixelRatio);
      }

      // Set display size (CSS pixels)
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;

      // Re-render after size change
      renderStrokes();
    };

    updateCanvasSize();
    
    // Set up resize observer
    const resizeObserver = new ResizeObserver(updateCanvasSize);
    const canvas = canvasRef.current;
    if (canvas?.parentElement) {
      resizeObserver.observe(canvas.parentElement);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [renderStrokes]);

  // Re-render when drawing data or viewport changes
  useEffect(() => {
    renderStrokes();
  }, [renderStrokes]);

  // Re-render when viewport changes (for smooth panning/zooming)
  useEffect(() => {
    const animationFrame = requestAnimationFrame(renderStrokes);
    return () => cancelAnimationFrame(animationFrame);
  }, [x, y, zoom, renderStrokes]);

  // Don't render anything if no drawing data
  if (!drawingData?.strokes?.length) {
    return null;
  }

  return (
    <div
      className={`absolute inset-0 pointer-events-none ${className}`}
      style={{
        zIndex: 5, // Above ReactFlow nodes but below UI elements
      }}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
        }}
      />
    </div>
  );
};

export default DrawingPreview;
