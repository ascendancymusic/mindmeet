import React, { useEffect, useState, useRef } from 'react';
import { useReactFlow, useStore } from 'reactflow';
import SelectionToolbar from './SelectionToolbar';

interface SelectionToolbarWrapperProps {
  selectionBounds: { x: number, y: number, width: number, height: number } | null;
  onCut: () => void;
  onCopy: () => void;
  onDelete: () => void;
}

const SelectionToolbarWrapper: React.FC<SelectionToolbarWrapperProps> = ({
  selectionBounds,
  onCut,
  onCopy,
  onDelete,
}) => {
  const reactFlowInstance = useReactFlow();
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [toolbarWidth, setToolbarWidth] = useState(120); // Default estimate

  // Get transform to trigger re-renders when panning/zooming
  const transform = useStore((state) => state.transform);

  // Get selected nodes directly from the store for real-time updates during dragging
  const selectedNodes = useStore((state) =>
    state.nodeInternals ?
    Array.from(state.nodeInternals.values()).filter(node => node.selected) :
    []
  );

  // Track if we're currently dragging nodes
  const isDragging = useStore((state) =>
    state.nodeInternals ?
    Array.from(state.nodeInternals.values()).some(node => node.selected && node.dragging) :
    false
  );

  // Measure the actual toolbar width once it's rendered
  useEffect(() => {
    if (toolbarRef.current) {
      setToolbarWidth(toolbarRef.current.offsetWidth);
    }
  }, [selectedNodes.length]);

  // If no selection or only one node selected, don't show the toolbar
  if (!selectionBounds || selectedNodes.length <= 1) {
    return null;
  }

  // Calculate the bounds of the selection in real-time
  // This ensures the toolbar follows the selection during dragging
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  selectedNodes.forEach(node => {
    minX = Math.min(minX, node.position.x);
    minY = Math.min(minY, node.position.y);
    maxX = Math.max(maxX, node.position.x + (node.width || 100));
    maxY = Math.max(maxY, node.position.y + (node.height || 50));
  });

  // Calculate the center top position of the selection in flow coordinates
  const centerX = minX + (maxX - minX) / 2;
  const topY = minY;

  // Apply the current transform to position the toolbar
  // This ensures it stays attached to the selection when panning/zooming
  const [tx, ty, tScale] = transform;
  const posX = centerX * tScale + tx;
  const posY = topY * tScale + ty;

  return (
    <div
      ref={toolbarRef}
      className="absolute pointer-events-none"
      style={{
        transform: `translate(-50%, -100%)`, // Center horizontally and position above
        left: posX,
        top: posY - 10, // Small offset from the selection
        zIndex: 1000,
        transition: isDragging ? 'none' : 'transform 0.1s ease', // No transition during drag for real-time updates
      }}
    >
      <div className="bg-gray-900 bg-opacity-50 p-1 rounded-lg">
        <SelectionToolbar
          isVisible={true}
          onCut={onCut}
          onCopy={onCopy}
          onDelete={onDelete}
        />
      </div>
    </div>
  );
};

export default SelectionToolbarWrapper;
