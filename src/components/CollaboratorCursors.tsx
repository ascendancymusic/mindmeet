import React, { useMemo } from 'react';
import { useCollaborationStore } from '../store/collaborationStore';
import { useViewport } from 'reactflow';

// Memoized cursor component to prevent unnecessary re-renders
const CollaboratorCursor = React.memo(({ cursor, viewport }: {
  cursor: any,
  viewport: { x: number, y: number, zoom: number }
}) => {
  const screenPosition = useMemo(() => {
    // Convert world coordinates back to screen coordinates for this user's viewport
    const screenX = cursor.position.x * viewport.zoom + viewport.x;
    const screenY = cursor.position.y * viewport.zoom + viewport.y;
    return { x: screenX, y: screenY };
  }, [cursor.position.x, cursor.position.y, viewport.x, viewport.y, viewport.zoom]);

  // Check if cursor is within visible area (with some buffer) - memoized for performance
  const isVisible = useMemo(() => {
    return screenPosition.x >= -50 && screenPosition.x <= window.innerWidth + 50 && 
           screenPosition.y >= -50 && screenPosition.y <= window.innerHeight + 50;
  }, [screenPosition.x, screenPosition.y]);

  if (!isVisible) return null;

  const isDragging = !!cursor.isDragging;

  return (
    <div
      className="absolute pointer-events-none z-50"
      style={{
        left: screenPosition.x,
        top: screenPosition.y,
        transform: 'translate(-2px, -50px)',
        willChange: 'transform'
      }}
    >
      <div className="relative">
        {isDragging ? (
          // Drag (move) icon
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            className="drop-shadow-md"
          >
            <path d="M12 2l3 3h-2v4h4V7l3 3-3 3v-2h-4v4h2l-3 3-3-3h2v-4H8v2l-3-3 3-3v2h4V5H9l3-3z" fill="#3B82F6" stroke="white" strokeWidth="1" />
          </svg>
        ) : (
          // Regular pointer arrow
          <svg width="20" height="24" viewBox="0 0 20 24" fill="none" className="drop-shadow-md">
            <path
              d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19841L11.7841 12.3673H5.65376Z"
              fill="#3B82F6" stroke="white" strokeWidth="1"
            />
          </svg>
        )}
        <div className="absolute top-5 left-2.5 whitespace-nowrap text-[11px] leading-none px-2 py-1 rounded border font-sans select-none shadow-md backdrop-blur-sm bg-gray-900/90 border-gray-700 text-white">
          {cursor.user_name}
        </div>
      </div>
    </div>
  );
});

export const CollaboratorCursors: React.FC = React.memo(() => {
  const { collaboratorCursors } = useCollaborationStore();
  // Reactive viewport hook ensures rerender on pan / zoom
  const { x, y, zoom } = useViewport();
  const viewport = { x, y, zoom };

  const cursorList = useMemo(() => Object.values(collaboratorCursors), [collaboratorCursors]);

  return (
    <>
      {cursorList.map(cursor => (
        cursor.position ? (
          <CollaboratorCursor key={cursor.user_id} cursor={cursor} viewport={viewport} />
        ) : null
      ))}
    </>
  );
});
