import React, { useRef, useEffect, useState, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Trash2, FileText, Copy, FolderInput, Network } from 'lucide-react';
import { Node } from 'reactflow';

interface NotesNodeContextMenuProps {
  isVisible: boolean;
  onClose: () => void;
  nodeId: string;
  nodes: Node[];
  onRename: (nodeId: string, newName: string) => void;
  onDelete: (nodeId: string) => void;
  onAutoLayout: (nodeId: string) => void;
}

export const NotesNodeContextMenu: React.FC<NotesNodeContextMenuProps> = ({
  isVisible,
  onClose,
  nodeId,
  nodes,
  onRename,
  onDelete,
  onAutoLayout
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [openCounter, setOpenCounter] = useState(0);
  const lastNodeIdRef = useRef<string | null>(null);
  const frameRef = useRef<number | null>(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');

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

  if (!isVisible) return null;

  const node = nodes.find(n => n.id === nodeId);
  const isFolder = node?.type === 'folder';

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
                onClick={() => {/* Placeholder for copy */}} 
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-all duration-150 opacity-50 cursor-not-allowed border border-transparent group"
                disabled
              >
                  <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-white/5 text-slate-400">
                    <Copy className="w-4 h-4" />
                  </div>
                  <div className="text-sm font-medium text-slate-300">
                    Copy
                  </div>
              </button>

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
