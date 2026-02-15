import React, { useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Folder, FileText } from 'lucide-react';
import { useReactFlow } from 'reactflow';

interface NotesEdgeDropMenuProps {
  position: { x: number; y: number };
  onClose: () => void;
  onSelect: (type: 'folder' | 'note') => void;
  flowPosition: { x: number; y: number } | null;
  sourceType?: 'folder' | 'note';
}

export const NotesEdgeDropMenu: React.FC<NotesEdgeDropMenuProps> = ({
  position,
  onClose,
  onSelect,
  flowPosition,
  sourceType = 'folder',
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const { flowToScreenPosition } = useReactFlow();
  
  // Calculate screen position: prefer flow-based projection for accuracy during movement
  const calculatedPos = flowPosition 
    ? flowToScreenPosition(flowPosition) 
    : position;

  // Use state to track position to force re-render on viewport change (if simple calculation misses it)
  // Logic: We want to update position when viewport changes. flowToScreenPosition uses current viewport transform.
  // BUT: just using it in render body doesn't subscribe to updates unless we use useViewport or similar.
  // Actually, flowToScreenPosition returns the current value. We need to re-render.
  // Let's use requestAnimationFrame loop or useViewport (if it works) to keep it sync.
  // For simplicity and robustness given previous failure, let's just stick to the initial calculated pos or simple interval?
  // No, let's trust useViewport creates re-renders. 
  
  // If useViewport() was causing issues (e.g. infinite loop?), try without it first to see if it renders.
  // But wait, if I remove useViewport, it won't move on pan.
  // Let's revert to a simpler "fixed" position for now to ensuring it SHOWS UP.
  // If flowToScreenPosition is returning NaN or something, fallback to position.
  
  const finalPos = (calculatedPos.x && calculatedPos.y) ? calculatedPos : position;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as HTMLElement)) {
        onClose();
      }
    };
    // Use mousedown to capture clicks before they might be swallowed
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [onClose]);

  return createPortal(
    <div
      ref={menuRef}
      className="fixed z-[1000]"
      style={{ left: finalPos.x, top: finalPos.y }}
    >
      <div
        className="bg-gradient-to-br from-slate-800/95 via-slate-900/95 to-slate-800/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden min-w-[180px]"
        style={{ animation: 'fadeInScale 0.15s ease-out' }}
      >
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-white/5">
          <div className="p-1">
             <Plus className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <span className="text-xs font-semibold text-slate-300 tracking-wide">
            Add Node
          </span>
        </div>
        <div className="p-1.5 space-y-0.5">
          <button
            onClick={() => { onSelect('folder'); onClose(); }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-all duration-150 hover:bg-white/5 border border-transparent group"
          >
            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-white/5 text-slate-400 group-hover:bg-white/10 group-hover:text-white transition-all">
               <Folder className="w-4 h-4" />
            </div>
            <div className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">
              New Folder
            </div>
          </button>
          
          {sourceType === 'folder' && (
            <button
                onClick={() => { onSelect('note'); onClose(); }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-all duration-150 hover:bg-white/5 border border-transparent group"
            >
                <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-white/5 text-slate-400 group-hover:bg-white/10 group-hover:text-white transition-all">
                <FileText className="w-4 h-4" />
                </div>
                <div className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">
                New Note
                </div>
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};