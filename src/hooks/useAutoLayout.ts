
import { useCallback } from 'react';
import { Node, Edge, useReactFlow } from 'reactflow';
import { autoLayoutNode } from '../utils/autoLayout';

interface UseAutoLayoutProps {
  nodes: Node[];
  edges: Edge[];
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  onPositionChange?: (id: string, position: { x: number; y: number }, type: 'folder' | 'note') => void;
}

export const useAutoLayout = ({ nodes, edges, setNodes, onPositionChange }: UseAutoLayoutProps) => {
  const { fitView } = useReactFlow();

  const handleAutoLayout = useCallback((nodeId: string) => {
    // Basic auto-layout logic for a subtree
    try {
      const result = autoLayoutNode(nodes, edges, nodeId, {
        nodeSpacing: 20,
        subtreeSpacing: 60,
        levelSpacing: 120,
        childrenPerRow: 3,
        minRowSpacing: 60,
      });

      // Update positions
      setNodes((nds) => {
        const updated = nds.map((n) => {
          if (result.positions[n.id]) {
            const newPos = result.positions[n.id];
            return {
              ...n,
              position: newPos,
            };
          }
          return n;
        });
        
        // After layout, persist all changed positions
        if (onPositionChange) {
             Object.keys(result.positions).forEach(id => {
                 const node = nodes.find(n => n.id === id);
                 if (node) {
                     onPositionChange(id, result.positions[id], node.type as 'folder' | 'note');
                 }
             });
        }
        
        return updated;
      });
    } catch (error) {
       console.error("Auto layout failed", error);
    }
  }, [nodes, edges, onPositionChange, setNodes]);

  return { handleAutoLayout };
};
