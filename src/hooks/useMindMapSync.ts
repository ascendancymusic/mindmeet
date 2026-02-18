import { useEffect, useRef, useCallback, useMemo, useState } from 'react';
import { useNodesState, useEdgesState, Node, Edge, NodeChange } from 'reactflow';
import { NoteItem, FolderItem, MindMapItem } from '../pages/Notes';

interface UseMindMapSyncProps {
  notes: NoteItem[];
  folders: FolderItem[];
  mindmaps?: MindMapItem[];
  onPositionChange?: (id: string, position: { x: number; y: number }, type: 'folder' | 'note' | 'mindmap') => void;
  onMindMapClick?: (mindmapId: string) => void;
}

export const useMindMapSync = ({ notes, folders, mindmaps = [], onPositionChange, onMindMapClick }: UseMindMapSyncProps) => {
  const [nodes, setNodes, onNodesChangeInternal] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  
  const nodesRef = useRef<Node[]>([]);
  const [isCtrlPressed, setIsCtrlPressed] = useState(false);
  // Use same localStorage keys as MindMapViewer for shared cache
  const [moveWithChildren, setMoveWithChildren] = useState(() => {
    const saved = localStorage.getItem('mindmap-moveWithChildren');
    return saved !== null ? JSON.parse(saved) : false;
  });
  const [snapToGrid, setSnapToGrid] = useState(() => {
    const saved = localStorage.getItem('mindmap-snapToGrid');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [autocolorSubnodes, setAutocolorSubnodes] = useState(() => {
    const saved = localStorage.getItem('mindmap-autocolorSubnodes');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [isControlPanelPinned, setIsControlPanelPinned] = useState(() => {
    const saved = localStorage.getItem('mindmap-controlPanelPinned');
    return saved !== null ? JSON.parse(saved) : false;
  });

  // Save control panel states to localStorage (shared with MindMapViewer)
  useEffect(() => {
    localStorage.setItem('mindmap-moveWithChildren', JSON.stringify(moveWithChildren));
  }, [moveWithChildren]);
  useEffect(() => {
    localStorage.setItem('mindmap-snapToGrid', JSON.stringify(snapToGrid));
  }, [snapToGrid]);
  useEffect(() => {
    localStorage.setItem('mindmap-autocolorSubnodes', JSON.stringify(autocolorSubnodes));
  }, [autocolorSubnodes]);
  useEffect(() => {
    localStorage.setItem('mindmap-controlPanelPinned', JSON.stringify(isControlPanelPinned));
  }, [isControlPanelPinned]);

  // Sync ref with state
  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  // Memoized node descendants calculation with caching
  const nodeDescendantsCache = useMemo(() => new Map<string, string[]>(), [edges]);

  const getNodeDescendants = useCallback(
    (nodeId: string): string[] => {
      // Check cache first
      if (nodeDescendantsCache.has(nodeId)) {
        return nodeDescendantsCache.get(nodeId)!;
      }

      const descendants: string[] = []
      const visited = new Set<string>()

      const traverse = (currentId: string) => {
        if (visited.has(currentId)) return
        visited.add(currentId)

        // Get child edges (source is parent, target is child)
        const childEdges = edges.filter((edge) => edge.source === currentId)
        childEdges.forEach((edge) => {
          descendants.push(edge.target)
          traverse(edge.target)
        })
      }

      traverse(nodeId)

      // Cache the result
      nodeDescendantsCache.set(nodeId, descendants);

      return descendants
    },
    [edges, nodeDescendantsCache],
  );

  // Ctrl key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Control') setIsCtrlPressed(true);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Control') setIsCtrlPressed(false);
    };
    const handleWindowBlur = () => setIsCtrlPressed(false);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, []);

  // Helper to extract plain text preview
  const getPreview = (html: string) => {
    if (typeof document === 'undefined') return ""
    const tmp = document.createElement("div")
    tmp.innerHTML = html
    return tmp.textContent?.slice(0, 30) || "Empty"
  }

  // Handle node changes (including movement with children)
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const positionChanges = changes.filter(c => c.type === 'position') as any[];
      
      if ((isCtrlPressed || moveWithChildren) && positionChanges.length > 0) {
        // Move node with children when CTRL is pressed
        const updatedChanges = positionChanges.flatMap((change) => {
          const posChange = change as { id: string; position: { x: number; y: number }; dragging?: boolean }
          const nodeId = posChange.id
          const descendants = getNodeDescendants(nodeId)
          const node = nodes.find((n) => n.id === nodeId)

          if (!node) return [change];

          const deltaX = posChange.position?.x - node.position.x
          const deltaY = posChange.position?.y - node.position.y

          const hasMovement = Math.abs(deltaX) >= 0.1 || Math.abs(deltaY) >= 0.1;
          if (!hasMovement) return [change];

          return [
            change,
            ...descendants
              .map((descendantId) => {
                const descendantNode = nodes.find((n) => n.id === descendantId)
                return descendantNode
                  ? {
                      id: descendantId,
                      type: 'position' as const,
                      position: {
                        x: descendantNode.position.x + deltaX,
                        y: descendantNode.position.y + deltaY,
                      },
                      dragging: posChange.dragging,
                    }
                  : null
              })
              .filter((c): c is NonNullable<typeof c> => c !== null),
          ]
        })

        const allChanges = [
          ...changes.filter(c => c.type !== 'position'),
          ...updatedChanges
        ];
        onNodesChangeInternal(allChanges);
        
        if (onPositionChange) {
          allChanges.forEach(change => {
            if (change.type === 'position' && (change as any).position) {
              const node = nodes.find(n => n.id === (change as any).id)
              if (node) {
                onPositionChange((change as any).id, (change as any).position, node.type as 'folder' | 'note')
              }
            }
          });
        }
      } else {
        onNodesChangeInternal(changes)
        if (onPositionChange) {
          changes.forEach(change => {
            if (change.type === 'position' && (change as any).position) {
              const node = nodes.find(n => n.id === (change as any).id)
              if (node) {
                onPositionChange((change as any).id, (change as any).position, node.type as 'folder' | 'note' | 'mindmap')
              }
            }
          });
        }
      }
    },
    [onNodesChangeInternal, onPositionChange, nodes, isCtrlPressed, moveWithChildren, getNodeDescendants]
  );

  // Main sync effect
  useEffect(() => {
    // Helper to check if a node should be visible
    const isNodeVisible = (_itemId: string, _itemIsFolder: boolean, itemParentId: string | null): boolean => {
      let currentParentId = itemParentId
      
      while (currentParentId) {
        const parentFolder = folders.find(f => f.id === currentParentId)
        if (!parentFolder) break
        
        if (parentFolder.collapsed) {
          return false
        }
        
        currentParentId = parentFolder.parentId
      }
      
      return true
    }
    
    setNodes((currentNodes) => {
      const allItems = [...folders, ...notes, ...mindmaps]
      const allItemIds = new Set(allItems.map(item => item.id))
      
      const filteredNodes = currentNodes.filter(node => allItemIds.has(node.id))
      
      const updatedNodes = filteredNodes.map(node => {
        const folder = folders.find(f => f.id === node.id)
        const note = notes.find(n => n.id === node.id)
        const mindmap = mindmaps.find(m => m.id === node.id)
        const item = folder || note || mindmap
        
        if (!item) return node
        
        const isFolder = !!folder
        const isMindMap = !!mindmap
        let count = 0
        if (isFolder && folder) {
          count = notes.filter(n => n.folderId === folder.id).length + 
                  folders.filter(f => f.parentId === folder.id).length + 
                  mindmaps.filter(m => m.folderId === folder.id).length
        }
        
        const position = item.position || node.position
        
        return {
          ...node,
          type: isFolder ? 'folder' : (isMindMap ? 'mindmap' : 'note'),
          position,
          data: {
            label: isFolder ? folder!.name : (isMindMap ? mindmap!.title : ((note as NoteItem)!.title || "Untitled")),
            color: item.color,
            count,
            collapsed: isFolder ? folder!.collapsed : false,
            preview: !isFolder && !isMindMap && note ? getPreview((note as NoteItem).content) : undefined,
            visibility: isMindMap && mindmap ? mindmap.visibility : undefined,
            onClick: isMindMap && onMindMapClick ? () => onMindMapClick(node.id) : undefined
          }
        }
      })
      
      const existingIds = new Set(updatedNodes.map(n => n.id))
      const newItems = allItems.filter(item => !existingIds.has(item.id))
      
      newItems.forEach(item => {
        const isFolder = "name" in item
        const isMindMap = "title" in item && "folderId" in item && !("content" in item)
        const id = item.id
        
        let count = 0
        if (isFolder) {
          count = notes.filter(n => n.folderId === id).length + 
                  folders.filter(f => f.parentId === id).length + 
                  mindmaps.filter(m => m.folderId === id).length
        }
        
        let position = item.position
        if (!position) {
          const previousNode = nodesRef.current.find(n => n.id === id)
          position = previousNode ? previousNode.position : { x: 0, y: 50 }
        }
        
        updatedNodes.push({
          id,
          type: isFolder ? 'folder' : (isMindMap ? 'mindmap' : 'note'),
          position,
          data: {
            label: isFolder ? (item as FolderItem).name : (item as any).title || "Untitled",
            color: item.color,
            count,
            collapsed: isFolder ? (item as FolderItem).collapsed : false,
            preview: !isFolder && !isMindMap ? getPreview((item as NoteItem).content) : undefined,
            visibility: isMindMap ? (item as any).visibility : undefined,
            onClick: isMindMap && onMindMapClick ? () => onMindMapClick(id) : undefined
          }
        })
      })
      
      return updatedNodes.map(node => {
        const folder = folders.find(f => f.id === node.id)
        const note = notes.find(n => n.id === node.id)
        const mindmap = mindmaps.find(m => m.id === node.id)
        
        let hidden = false
        if (folder) {
          hidden = !isNodeVisible(folder.id, true, folder.parentId)
        } else if (note) {
          hidden = !isNodeVisible(note.id, false, note.folderId)
        } else if (mindmap) {
          hidden = !isNodeVisible(mindmap.id, false, mindmap.folderId)
        }
        
        return {
          ...node,
          hidden
        }
      })
    })
    
    // Update edges
    const newEdges: Edge[] = []
    
    folders.forEach(folder => {
      if (folder.parentId && isNodeVisible(folder.id, true, folder.parentId)) {
        const parentIsFolder = folders.some(f => f.id === folder.parentId)
        // Get parent folder color
        const parentFolder = folders.find(f => f.id === folder.parentId)
        const edgeColor = parentFolder?.color || '#475569'
        newEdges.push({
          id: `e-${folder.parentId}-${folder.id}`,
          source: folder.parentId,
          sourceHandle: parentIsFolder ? "bottom-source" : undefined,
          target: folder.id,
          targetHandle: "top-target",
          style: { stroke: edgeColor, strokeWidth: 2 },
          type: 'default',
          animated: false,
        })
      }
    })
    
    notes.forEach(note => {
      if (note.folderId && isNodeVisible(note.id, false, note.folderId)) {
        // Get parent folder color
        const parentFolder = folders.find(f => f.id === note.folderId)
        const edgeColor = parentFolder?.color || '#475569'
        newEdges.push({
          id: `e-${note.folderId}-${note.id}`,
          source: note.folderId,
          sourceHandle: "bottom-source",
          target: note.id,
          targetHandle: "top-target",
          style: { stroke: edgeColor, strokeWidth: 2 },
          type: 'default',
          animated: false,
        })
      }
    })
    
    mindmaps.forEach(mindmap => {
      if (mindmap.folderId && isNodeVisible(mindmap.id, false, mindmap.folderId)) {
        // Get parent folder color
        const parentFolder = folders.find(f => f.id === mindmap.folderId)
        const edgeColor = parentFolder?.color || '#8b5cf6'
        newEdges.push({
          id: `e-${mindmap.folderId}-${mindmap.id}`,
          source: mindmap.folderId,
          sourceHandle: "bottom-source",
          target: mindmap.id,
          targetHandle: "top-target",
          style: { stroke: edgeColor, strokeWidth: 2 },
          type: 'default',
          animated: false,
        })
      }
    })
    
    setEdges(newEdges)
  }, [notes, folders, mindmaps, setNodes, setEdges]);

  return {
    nodes,
    setNodes,
    onNodesChange,
    edges,
    setEdges,
    onEdgesChange,
    isCtrlPressed,
    moveWithChildren,
    setMoveWithChildren,
    snapToGrid,
    setSnapToGrid,
    autocolorSubnodes,
    setAutocolorSubnodes,
    isControlPanelPinned,
    setIsControlPanelPinned
  };
};
