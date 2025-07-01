import React, { useMemo } from 'react';
import { useCollaborationStore } from '../store/collaborationStore';
import { useReactFlow } from 'reactflow';

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

  return (
    <div
      className="absolute pointer-events-none z-50 transition-all duration-25"
      style={{
        left: screenPosition.x,
        top: screenPosition.y,
        transform: 'translate(-2px, -2px)',
        willChange: 'transform', // Optimize for frequent position changes
      }}
    >
      {/* Cursor pointer */}
      <div className="relative">
        <svg
          width="20"
          height="24"
          viewBox="0 0 20 24"
          fill="none"
          className="drop-shadow-md"
        >
          <path
            d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19841L11.7841 12.3673H5.65376Z"
            fill="#3B82F6"
            stroke="white"
            strokeWidth="1"
          />
        </svg>
          {/* User name label */}
        <div className="absolute top-5 left-2.5 whitespace-nowrap">
          <div className="bg-gray-900 text-white text-xs px-2 py-1 rounded-md shadow-lg border border-gray-700">
            <span>{cursor.user_name}</span>
          </div>
        </div>
      </div>
    </div>
  );
});

export const CollaboratorCursors: React.FC = React.memo(() => {
  const { collaboratorCursors } = useCollaborationStore();
  const reactFlowInstance = useReactFlow();

  // Memoize viewport to prevent unnecessary recalculations
  const viewport = useMemo(() => reactFlowInstance.getViewport(), [
    reactFlowInstance.getViewport().x,
    reactFlowInstance.getViewport().y, 
    reactFlowInstance.getViewport().zoom
  ]);

  // Memoize cursor list to prevent unnecessary re-renders
  const cursorList = useMemo(() => Object.values(collaboratorCursors), [collaboratorCursors]);

  return (
    <>
      {cursorList.map((cursor) => {
        if (!cursor.position) return null;
        
        return (
          <CollaboratorCursor 
            key={cursor.user_id} 
            cursor={cursor} 
            viewport={viewport}
          />
        );
      })}
    </>
  );
});
