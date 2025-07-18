import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Network } from 'lucide-react';
import { Node as FlowNode, Edge } from 'reactflow';

interface NodeContextMenuProps {
  isVisible: boolean;
  onClose: () => void;
  nodeId: string;
  nodes: FlowNode[];
  edges: Edge[];
  onNodesChange: (nodes: FlowNode[]) => void;
  onAutoLayout: (nodeId: string, originalNodes: FlowNode[], updatedNodes: FlowNode[]) => void;
}

export const NodeContextMenu: React.FC<NodeContextMenuProps> = ({
  isVisible,
  onClose,
  nodeId,
  nodes,
  edges,
  onNodesChange,
  onAutoLayout
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleAutoLayout = () => {
    // Find the parent node
    const parentNode = nodes.find(node => node.id === nodeId);
    if (!parentNode) return;

    // Helper function to snap to grid (20px grid)
    const snapToGrid = (value: number) => Math.round(value / 20) * 20;

    // Helper function to get all children of a node
    const getChildren = (parentId: string): string[] => {
      return edges
        .filter(edge => edge.source === parentId)
        .map(edge => edge.target);
    };

    // Configuration
    const nodeSpacing = 20; // Horizontal spacing between sibling nodes
    const subtreeSpacing = 60; // Extra spacing between different subtrees (for visual grouping)
    const levelSpacing = 120; // Vertical spacing between levels
    const rowSpacing = 60; // Vertical spacing between rows when stacking

    // Calculate the required width for each subtree (bottom-up approach)
    const calculateSubtreeWidth = (nodeId: string): number => {
      const children = getChildren(nodeId);

      if (children.length === 0) {
        // Leaf node: width is just the node's own width
        const node = nodes.find(n => n.id === nodeId);
        return node?.width || 200;
      }

      // Calculate total width needed for all children's subtrees
      const childrenWidths = children.map(childId => calculateSubtreeWidth(childId));

      let childrenLayoutWidth: number;

      // Check if any children have their own children (grandchildren exist)
      const hasGrandchildren = children.some(childId => getChildren(childId).length > 0);

      if (children.length >= 4 && !hasGrandchildren) {
        // For stacked layout, calculate width based on the widest row
        // Use 3 children per row for better organization
        const childrenPerRow = Math.min(3, Math.ceil(children.length / Math.ceil(children.length / 3)));
        const rows: number[][] = [];

        // Distribute children into rows
        for (let i = 0; i < children.length; i += childrenPerRow) {
          const rowWidths = childrenWidths.slice(i, i + childrenPerRow);
          rows.push(rowWidths);
        }

        // Calculate width of each row and find the maximum
        const rowWidths = rows.map(rowWidths =>
          rowWidths.reduce((sum, width) => sum + width, 0) + (rowWidths.length - 1) * nodeSpacing
        );

        childrenLayoutWidth = Math.max(...rowWidths);
      } else {
        // Single row layout (for 1-3 children OR when grandchildren exist)
        const totalChildrenWidth = childrenWidths.reduce((sum, width) => sum + width, 0);

        // Calculate spacing: use subtreeSpacing between children that have descendants, nodeSpacing for others
        let totalGapsWidth = 0;
        for (let i = 0; i < children.length - 1; i++) {
          const currentChildHasChildren = getChildren(children[i]).length > 0;
          const nextChildHasChildren = getChildren(children[i + 1]).length > 0;

          // Use larger spacing if either child has descendants (for visual grouping)
          if (currentChildHasChildren || nextChildHasChildren) {
            totalGapsWidth += subtreeSpacing;
          } else {
            totalGapsWidth += nodeSpacing;
          }
        }

        childrenLayoutWidth = totalChildrenWidth + totalGapsWidth;
      }

      // The subtree width is the maximum of:
      // 1. The node's own width
      // 2. The total width needed for its children
      const nodeWidth = nodes.find(n => n.id === nodeId)?.width || 200;
      return Math.max(nodeWidth, childrenLayoutWidth);
    };

    // Position nodes - each parent centers over its direct children only
    const positionSubtree = (nodeId: string, centerX: number, topY: number, isRootNode: boolean = false): { [nodeId: string]: { x: number; y: number } } => {
      const positions: { [nodeId: string]: { x: number; y: number } } = {};
      const node = nodes.find(n => n.id === nodeId);
      if (!node) return positions;

      const nodeWidth = node.width || 200;
      const nodeHeight = node.height || 40;

      // Position the current node at the given center
      positions[nodeId] = {
        x: snapToGrid(centerX - nodeWidth / 2),
        y: snapToGrid(topY)
      };

      // Position children
      const children = getChildren(nodeId);
      if (children.length > 0) {
        const childrenWidths = children.map(childId => calculateSubtreeWidth(childId));

        // Check if any children have their own children (grandchildren exist)
        const hasGrandchildren = children.some(childId => getChildren(childId).length > 0);

        // Calculate the layout of direct children first
        let childrenCenterX: number;
        let childrenLayoutWidth: number;

        // Determine if we should stack children:
        // - 4 or more children AND no grandchildren (to avoid cramped layouts when children have descendants)
        if (children.length >= 4 && !hasGrandchildren) {
          // Stack children in multiple rows (3 per row for better organization)
          const childrenPerRow = Math.min(3, Math.ceil(children.length / Math.ceil(children.length / 3)));
          const rows: string[][] = [];

          // Distribute children into rows
          for (let i = 0; i < children.length; i += childrenPerRow) {
            rows.push(children.slice(i, i + childrenPerRow));
          }

          // Calculate width of each row and find the maximum
          const rowWidths = rows.map(rowChildren => {
            const rowChildWidths = rowChildren.map(childId => calculateSubtreeWidth(childId));
            return rowChildWidths.reduce((sum, width) => sum + width, 0) + (rowChildWidths.length - 1) * nodeSpacing;
          });

          childrenLayoutWidth = Math.max(...rowWidths);

          // For stacked layout, center the parent over the widest row
          childrenCenterX = centerX;

          // Start the first row at the proper level spacing distance from parent
          // Use dynamic spacing based on parent node height
          const dynamicLevelSpacing = Math.max(levelSpacing, nodeHeight + 40);
          const startY = topY + dynamicLevelSpacing;

          // Position each row with dynamic spacing based on node heights
          let currentRowY = startY;
          rows.forEach((rowChildren, rowIndex) => {
            const rowChildWidths = rowChildren.map(childId => calculateSubtreeWidth(childId));
            const rowTotalWidth = rowChildWidths.reduce((sum, width) => sum + width, 0) + (rowChildren.length - 1) * nodeSpacing;
            let rowCurrentX = childrenCenterX - rowTotalWidth / 2;

            // Calculate the maximum height of nodes in this row
            const rowMaxHeight = Math.max(...rowChildren.map(childId => {
              const childNode = nodes.find(n => n.id === childId);
              return childNode?.height || 40;
            }));

            const rowY = currentRowY;

            rowChildren.forEach((childId, childIndex) => {
              const childSubtreeWidth = rowChildWidths[childIndex];
              const childCenterX = rowCurrentX + childSubtreeWidth / 2;
              const childPositions = positionSubtree(childId, childCenterX, rowY, false);
              Object.assign(positions, childPositions);
              rowCurrentX += childSubtreeWidth + nodeSpacing;
            });

            // Update currentRowY for next row based on this row's height
            currentRowY += Math.max(60, rowMaxHeight + 20); // Use minimum 60px or node height + 20px padding
          });
        } else {
          // Single row layout (for 1-3 children OR when grandchildren exist)
          const totalChildrenWidth = childrenWidths.reduce((sum, width) => sum + width, 0);

          // Calculate spacing: use subtreeSpacing between children that have descendants, nodeSpacing for others
          let totalGapsWidth = 0;
          for (let i = 0; i < children.length - 1; i++) {
            const currentChildHasChildren = getChildren(children[i]).length > 0;
            const nextChildHasChildren = getChildren(children[i + 1]).length > 0;

            // Use larger spacing if either child has descendants (for visual grouping)
            if (currentChildHasChildren || nextChildHasChildren) {
              totalGapsWidth += subtreeSpacing;
            } else {
              totalGapsWidth += nodeSpacing;
            }
          }

          childrenLayoutWidth = totalChildrenWidth + totalGapsWidth;

          // Position children first using a temporary layout, then calculate their actual center
          let currentX = centerX - childrenLayoutWidth / 2;
          const childCenters: number[] = [];

          children.forEach((childId, index) => {
            const childSubtreeWidth = childrenWidths[index];
            const childCenterX = currentX + childSubtreeWidth / 2;

            // Store the child's center position
            childCenters.push(childCenterX);

            // Move to next child position
            currentX += childSubtreeWidth;

            // Add appropriate spacing for next child
            if (index < children.length - 1) {
              const currentChildHasChildren = getChildren(childId).length > 0;
              const nextChildHasChildren = getChildren(children[index + 1]).length > 0;

              if (currentChildHasChildren || nextChildHasChildren) {
                currentX += subtreeSpacing;
              } else {
                currentX += nodeSpacing;
              }
            }
          });

          // Calculate the actual center of the direct children
          const leftmostChild = Math.min(...childCenters);
          const rightmostChild = Math.max(...childCenters);
          childrenCenterX = (leftmostChild + rightmostChild) / 2;

          // Now position children using their calculated centers
          // Use dynamic spacing based on parent node height
          const dynamicLevelSpacing = Math.max(levelSpacing, nodeHeight + 40);
          children.forEach((childId, index) => {
            const childCenterX = childCenters[index];
            const childSubtreePositions = positionSubtree(childId, childCenterX, topY + dynamicLevelSpacing, false);
            Object.assign(positions, childSubtreePositions);
          });
        }

        // For root node, keep it in place. For child nodes, center them over their children
        const nodeWidth = node.width || 200;
        if (isRootNode) {
          // Root node stays in its original position - don't add it to positions
          // (it will be excluded from updates)
        } else {
          // For child nodes, center them over their children
          positions[nodeId] = {
            x: snapToGrid(childrenCenterX - nodeWidth / 2),
            y: snapToGrid(topY)
          };
        }
      }

      return positions;
    };

    // Store original nodes for history
    const originalNodes = [...nodes];

    // First, position all children without considering the root node's position
    // This will give us the natural layout of the children
    const tempRootCenterX = 0; // Temporary center, we'll adjust later
    const allPositions = positionSubtree(nodeId, tempRootCenterX, parentNode.position.y, true);

    // Now find the actual center of the direct children
    const directChildren = getChildren(nodeId);
    if (directChildren.length > 0) {
      const childPositions = directChildren.map(childId => {
        const pos = allPositions[childId];
        const childNode = nodes.find(n => n.id === childId);
        const childWidth = childNode?.width || 200;
        return pos ? { ...pos, width: childWidth } : null;
      }).filter((pos): pos is { x: number; y: number; width: number } => pos !== null);

      if (childPositions.length > 0) {
        const leftmostChild = Math.min(...childPositions.map(pos => pos.x));
        const rightmostChild = Math.max(...childPositions.map(pos => pos.x + pos.width));
        const childrenCenter = (leftmostChild + rightmostChild) / 2;

        // Calculate the offset needed to center the root over its direct children
        const rootCenterX = parentNode.position.x + (parentNode.width || 200) / 2;
        const offset = rootCenterX - childrenCenter;

        // Apply the offset to all positioned nodes
        Object.keys(allPositions).forEach(nodeId => {
          allPositions[nodeId].x += offset;
        });
      }
    }

    // Apply calculated positions to children only (exclude the root node)
    const updatedNodes = nodes.map(node => {
      if (allPositions[node.id] && node.id !== nodeId) {
        return {
          ...node,
          position: allPositions[node.id]
        };
      }
      return node;
    });

    // Call the callback with original and updated nodes for history/collaboration handling
    onAutoLayout(nodeId, originalNodes, updatedNodes);
    onClose();
  };

  // Update position when menu becomes visible or node moves
  useEffect(() => {
    if (isVisible && nodeId) {
      const updatePosition = () => {
        const nodeElement = document.querySelector(`[data-id="${nodeId}"]`);
        if (nodeElement) {
          const nodeRect = nodeElement.getBoundingClientRect();
          setPosition({
            x: nodeRect.right + 6,
            y: nodeRect.top
          });
        }
      };

      updatePosition();

      // Update position when the viewport changes (pan/zoom)
      const reactFlowElement = document.querySelector('.react-flow');
      if (reactFlowElement) {
        const observer = new MutationObserver(updatePosition);
        observer.observe(reactFlowElement, {
          attributes: true,
          subtree: true,
          attributeFilter: ['style', 'transform']
        });

        // Also listen for transform changes
        const handleTransform = () => updatePosition();
        reactFlowElement.addEventListener('wheel', handleTransform);
        window.addEventListener('resize', handleTransform);

        return () => {
          observer.disconnect();
          reactFlowElement.removeEventListener('wheel', handleTransform);
          window.removeEventListener('resize', handleTransform);
        };
      }
    }
  }, [isVisible, nodeId]);

  // Close menu when clicking outside or on ReactFlow
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as HTMLElement)) {
        onClose();
      }
    };

    const handleReactFlowClick = (event: MouseEvent) => {
      const target = event.target as Element;
      if (target.closest('.react-flow') || target.classList.contains('react-flow__pane')) {
        onClose();
      }
    };

    if (isVisible) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('click', handleReactFlowClick);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('click', handleReactFlowClick);
      };
    }
  }, [isVisible, onClose]);

  // Close menu on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isVisible) {
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [isVisible, onClose]);



  if (!isVisible) return null;

  // Use portal to render at document level but position relative to node
  return createPortal(
    <div
      ref={menuRef}
      className="fixed bg-slate-800/95 backdrop-blur-sm border border-slate-600/50 rounded-xl shadow-2xl py-2 min-w-[140px] z-[1000]"
      style={{
        left: position.x,
        top: position.y,
      }}
    >
      <div className="px-3 py-1 text-xs text-slate-400 font-medium border-b border-slate-700/50 mb-1">
        Node Actions
      </div>
      <button
        onClick={handleAutoLayout}
        className="w-full px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-700/50 transition-all duration-150 flex items-center gap-2.5 group"
      >
        <Network className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-300 transition-colors" />
        Autolayout
      </button>
    </div>,
    document.body
  );
};
