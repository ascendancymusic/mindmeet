import React, { useRef, useEffect, useState, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Folder, FileText, Network } from 'lucide-react';

interface NotesEdgeDropMenuProps {
  position: { x: number; y: number };
  onClose: () => void;
  onSelect: (type: 'folder' | 'note' | 'mindmap') => void;
  flowPosition: { x: number; y: number } | null;
  sourceType?: 'folder' | 'note' | 'mindmap';
}

export const NotesEdgeDropMenu: React.FC<NotesEdgeDropMenuProps> = ({
  position,
  onClose,
  onSelect,
  flowPosition,
  sourceType = 'folder',
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [screenPosition, setScreenPosition] = useState<{ x: number; y: number }>(position);
  const worldPositionRef = useRef<{ x: number; y: number } | null>(null);
  const lastTransformRef = useRef<string>('');
  const [openCounter, setOpenCounter] = useState(0);
  const lastOpenPositionRef = useRef<{ x: number; y: number } | null>(null);

  const parseTransform = (transform: string): { x: number; y: number; scale: number } => {
    let x = 0, y = 0, scale = 1;
    if (!transform) return { x, y, scale };
    const translateMatch = transform.match(/translate\(([-0-9.]+)px,\s*([-0-9.]+)px\)/);
    if (translateMatch) { x = parseFloat(translateMatch[1]); y = parseFloat(translateMatch[2]); }
    const scaleMatch = transform.match(/scale\(([-0-9.]+)\)/);
    if (scaleMatch) { scale = parseFloat(scaleMatch[1]); }
    return { x, y, scale };
  };

  const projectToScreen = (world: { x: number; y: number }, t: { x: number; y: number; scale: number }) => ({
    x: world.x * t.scale + t.x,
    y: world.y * t.scale + t.y,
  });

  const getViewportTransform = (): { x: number; y: number; scale: number } => {
    const viewport = document.querySelector('.react-flow__viewport') as HTMLElement | null;
    let transform = viewport?.style.transform;
    if (!transform) {
      const rf = document.querySelector('.react-flow');
      if (rf) {
        const transformed = rf.querySelector<HTMLElement>('*[style*="translate("]');
        transform = transformed?.style.transform;
      }
    }
    return parseTransform(transform || '');
  };

  useLayoutEffect(() => {
    if (!flowPosition) return;
    const openingNewSpot = !lastOpenPositionRef.current ||
      lastOpenPositionRef.current.x !== position.x ||
      lastOpenPositionRef.current.y !== position.y;
    if (openingNewSpot) {
      setOpenCounter((c) => c + 1);
      lastOpenPositionRef.current = { ...position };
    }
    const initialT = getViewportTransform();
    worldPositionRef.current = { x: flowPosition.x, y: flowPosition.y };
    lastTransformRef.current = `${initialT.x},${initialT.y},${initialT.scale}`;
    const projected = projectToScreen(worldPositionRef.current, initialT);
    setScreenPosition(projected);

    const frameRef = { id: 0 as number };
    const updatePosition = () => {
      if (!worldPositionRef.current) return;
      const t = getViewportTransform();
      const key = `${t.x},${t.y},${t.scale}`;
      if (key === lastTransformRef.current) return;
      lastTransformRef.current = key;
      const p = projectToScreen(worldPositionRef.current, t);
      setScreenPosition(p);
    };
    const scheduleUpdate = () => {
      if (frameRef.id) return;
      frameRef.id = requestAnimationFrame(() => { updatePosition(); frameRef.id = 0; });
    };
    const viewportEl = document.querySelector('.react-flow__viewport');
    let observer: MutationObserver | null = null;
    if (viewportEl) {
      observer = new MutationObserver(scheduleUpdate);
      observer.observe(viewportEl, { attributes: true, attributeFilter: ['style'] });
    }
    const wheelHandler = () => scheduleUpdate();
    const resizeHandler = () => scheduleUpdate();
    viewportEl?.addEventListener('wheel', wheelHandler, { passive: true });
    window.addEventListener('resize', resizeHandler);
    return () => {
      observer?.disconnect();
      viewportEl?.removeEventListener('wheel', wheelHandler);
      window.removeEventListener('resize', resizeHandler);
      if (frameRef.id) cancelAnimationFrame(frameRef.id);
    };
  }, [position, flowPosition]);

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
      key={openCounter}
      ref={menuRef}
      className="fixed z-[1000]"
      style={{ left: screenPosition.x + 220, top: screenPosition.y + 8 }}
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
            <>
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
              
              <button
                  onClick={() => { onSelect('mindmap'); onClose(); }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-all duration-150 hover:bg-white/5 border border-transparent group"
              >
                  <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-white/5 text-slate-400 group-hover:bg-white/10 group-hover:text-purple-400 transition-all">
                  <Network className="w-4 h-4" />
                  </div>
                  <div className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">
                  New Mind Map
                  </div>
              </button>
            </>
          )}
        </div>

      <style>{`
        @keyframes fadeInScale {
          from { opacity: 0; transform: scale(0.95) translateY(-4px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
      </div>
    </div>,
    document.body
  );
};