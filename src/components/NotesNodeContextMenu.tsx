import React, { useRef, useEffect, useState, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Trash2, FileText, Copy, FolderInput, Network } from 'lucide-react';
import { Node, Edge } from 'reactflow';
import { HexColorPicker } from "react-colorful";
import { useMindMapStore } from '../store/mindMapStore';
import { useNotesStore } from '../store/notesStore';
import { useAuthStore } from '../store/authStore';

interface NotesNodeContextMenuProps {
  isVisible: boolean;
  onClose: () => void;
  nodeId: string;
  nodes: Node[];
  edges: Edge[];
  onRename: (nodeId: string, newName: string) => void;
  onDelete: (nodeId: string) => void;
  onAutoLayout: (nodeId: string) => void;
  autocolorSubnodes?: boolean;
}

export const NotesNodeContextMenu: React.FC<NotesNodeContextMenuProps> = ({
  isVisible,
  onClose,
  nodeId,
  nodes,
  edges,
  onRename,
  onDelete,
  onAutoLayout,
  autocolorSubnodes = false
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [openCounter, setOpenCounter] = useState(0);
  const lastNodeIdRef = useRef<string | null>(null);
  const frameRef = useRef<number | null>(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [isColorPickerVisible, setIsColorPickerVisible] = useState(false);
  const [tempColor, setTempColor] = useState("#334155");
  const { updateMindMapColor } = useMindMapStore();
  // Helper to compute current on-screen coordinates for the node
  const computeNodeScreenPosition = () => {
    if (!nodeId) return null;
    const nodeElement = document.querySelector(`[data-id="${nodeId}"]`);
    if (!nodeElement) return null;
    const rect = (nodeElement as HTMLElement).getBoundingClientRect();
    return { x: rect.right + 6, y: rect.top };
  };

  useLayoutEffect(() => {
    if (!isVisible || !nodeId) return;
    
    // Reset renaming state when opening for a new node or reopening
    setIsRenaming(false);
    
    const isNewNode = lastNodeIdRef.current !== nodeId;
    if (isNewNode) {
      setOpenCounter(c => c + 1);
      lastNodeIdRef.current = nodeId;
    }
    const pos = computeNodeScreenPosition();
    if (pos) {
      setPosition(pos);
    } else {
      requestAnimationFrame(() => {
        const retry = computeNodeScreenPosition();
        if (retry) setPosition(retry);
      });
    }
    
    // Initialize rename value
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      setRenameValue(node.data.label || '');
      setTempColor(node.data.color || "#334155");
    }
  }, [isVisible, nodeId, nodes]);

  // Observer Logic (same as NodeContextMenu)
  useEffect(() => {
    if (!isVisible || !nodeId) return;

    const updatePosition = () => {
      const pos = computeNodeScreenPosition();
      if (pos) setPosition(pos);
    };

    const scheduleUpdate = () => {
      if (frameRef.current != null) return;
      frameRef.current = requestAnimationFrame(() => {
        frameRef.current = null;
        updatePosition();
      });
    };

    const viewportEl = document.querySelector('.react-flow__viewport');
    let viewportObserver: MutationObserver | null = null;
    if (viewportEl) {
      viewportObserver = new MutationObserver(scheduleUpdate);
      viewportObserver.observe(viewportEl, { attributes: true, attributeFilter: ['style'] });
    }

    const nodeElement = document.querySelector(`[data-id="${nodeId}"]`);
    let resizeObserver: ResizeObserver | null = null;
    if (nodeElement) {
      resizeObserver = new ResizeObserver(scheduleUpdate);
      resizeObserver.observe(nodeElement);
    }

    viewportEl?.addEventListener('wheel', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate);

    return () => {
      viewportObserver?.disconnect();
      resizeObserver?.disconnect();
      viewportEl?.removeEventListener('wheel', scheduleUpdate);
      window.removeEventListener('resize', scheduleUpdate);
      if (frameRef.current != null) cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    };
  }, [isVisible, nodeId]);

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

  const handleRenameSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (renameValue.trim()) {
      onRename(nodeId, renameValue.trim());
      onClose();
    }
  };

  const { updateNoteLocal, updateFolderLocal, saveNote, saveFolder } = useNotesStore();
  const { user } = useAuthStore();

  // Get all descendants of a node (children, grandchildren, etc.)
  const getNodeDescendants = (startNodeId: string): string[] => {
    const descendants: string[] = [];
    const visited = new Set<string>();
    const traverse = (currentId: string) => {
      if (visited.has(currentId)) return;
      visited.add(currentId);
      const childEdges = edges.filter((edge) => edge.source === currentId);
      childEdges.forEach((edge) => {
        descendants.push(edge.target);
        traverse(edge.target);
      });
    };
    traverse(startNodeId);
    return descendants;
  };

  // Apply color to a single node by id
  const applyColorToNode = (targetNodeId: string, color: string) => {
    const node = nodes.find((n) => n.id === targetNodeId);
    if (!node || !user?.id) return;

    // Update local ReactFlow state immediately for responsiveness
    node.data.color = color;

    if (node.type === 'mindmap') {
      updateMindMapColor(node.id, color);
    } else if (node.type === 'note') {
      const note = useNotesStore.getState().notes.find(n => n.id === targetNodeId);
      if (note) {
        updateNoteLocal(targetNodeId, { color });
        saveNote({ ...note, color }, user.id);
      }
    } else if (node.type === 'folder') {
      const folder = useNotesStore.getState().folders.find(f => f.id === targetNodeId);
      if (folder) {
        updateFolderLocal(targetNodeId, { color });
        saveFolder({ ...folder, color }, user.id);
      }
    }
  };

  const handleColorChange = () => {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node || !user?.id) {
      onClose();
      return;
    }
    
    // Apply color to the selected node
    applyColorToNode(nodeId, tempColor);

    // If autocolor subnodes is enabled, apply same color to all descendants
    if (autocolorSubnodes) {
      const descendants = getNodeDescendants(nodeId);
      descendants.forEach((descendantId) => {
        applyColorToNode(descendantId, tempColor);
      });
    }
    
    onClose();
  };

  if (!isVisible) return null;

  const node = nodes.find(n => n.id === nodeId);
  const isFolder = node?.type === 'folder';
  const hasChildren = edges.some(edge => edge.source === nodeId);

  return createPortal(
    <div
      key={openCounter}
      ref={menuRef}
      className="fixed z-[1000]"
      style={{
        left: position.x,
        top: position.y,
      }}
    >
      <div 
        className="bg-gradient-to-br from-slate-800/95 via-slate-900/95 to-slate-800/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
        style={{
          minWidth: '180px',
          animation: 'fadeInScale 0.15s ease-out',
        }}
      >
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-white/5">
          {isFolder ? <FolderInput className="w-3.5 h-3.5 text-blue-400" /> : <FileText className="w-3.5 h-3.5 text-blue-400" />}
          <span className="text-xs font-semibold text-slate-300 tracking-wide">
             {isRenaming ? 'Rename' : 'Options'}
          </span>
        </div>

        <div className="p-1.5 space-y-0.5">
          {isRenaming ? (
            <div className="px-2 py-1">
              <form onSubmit={handleRenameSubmit}>
                <input
                  autoFocus
                  type="text"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-md px-2 py-1 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50"
                  placeholder={isFolder ? "Folder Name" : "Note Title"}
                  onKeyDown={(e) => e.stopPropagation()} 
                />
                <div className="flex justify-end gap-2 mt-2">
                   <button 
                     type="button"
                     onClick={() => setIsRenaming(false)}
                     className="text-xs text-slate-400 hover:text-white px-2 py-1"
                   >
                     Cancel
                   </button>
                   <button 
                     type="submit"
                     className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded"
                   >
                     Save
                   </button>
                </div>
              </form>
            </div>
          ) : (
            <>
              {hasChildren && (
                <button
                  onClick={() => {
                     onAutoLayout(nodeId);
                     onClose();
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-all duration-150 hover:bg-white/5 border border-transparent group"
                >
                  <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-white/5 text-slate-400 group-hover:bg-white/10 group-hover:text-white transition-all">
                    <Network className="w-4 h-4" />
                  </div>
                  <div className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">
                    Auto Layout
                  </div>
                </button>
              )}

              <button
                onClick={() => setIsRenaming(true)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-all duration-150 hover:bg-white/5 border border-transparent group"
              >
                <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-white/5 text-slate-400 group-hover:bg-white/10 group-hover:text-white transition-all">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">
                  Rename
                </div>
              </button>

              <button
                onClick={() => setIsColorPickerVisible(!isColorPickerVisible)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-all duration-150 hover:bg-white/5 border border-transparent group"
              >
                <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-white/5 text-slate-400 group-hover:bg-white/10 group-hover:text-white transition-all">
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: tempColor }}
                  ></div>
                </div>
                <div className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">
                  Change Color
                </div>
              </button>

              {isColorPickerVisible && (
                <div className="p-3">
                  <HexColorPicker
                    color={tempColor}
                    onChange={setTempColor}
                  />
                  <div className="flex justify-end gap-2 mt-2">
                    <button
                      onClick={handleColorChange}
                      className="px-3 py-1 text-xs text-white bg-blue-600 rounded-lg"
                    >
                      Apply
                    </button>
                    <button
                      onClick={() => setIsColorPickerVisible(false)}
                      className="px-3 py-1 text-xs text-slate-400 bg-slate-700 rounded-lg"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              <div className="my-1 border-t border-white/5"></div>

              <button
                onClick={() => {
                    onDelete(nodeId);
                    onClose();
                }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-all duration-150 hover:bg-red-500/10 border border-transparent group"
              >
                <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-white/5 text-red-400 group-hover:bg-red-500/20 group-hover:text-red-300 transition-all">
                  <Trash2 className="w-4 h-4" />
                </div>
                <div className="text-sm font-medium text-red-400 group-hover:text-red-300 transition-colors">
                  Delete
                </div>
              </button>
            </>
          )}
        </div>
      </div>
      <style>{`
        @keyframes fadeInScale {
          from { opacity: 0; transform: scale(0.95) translateY(-4px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>,
    document.body
  );
};
