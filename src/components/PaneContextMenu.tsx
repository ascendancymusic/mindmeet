import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Clipboard } from 'lucide-react';

interface PaneContextMenuProps {
  isVisible: boolean;
  onClose: () => void;
  /** Initial screen (client) position where the context menu was invoked */
  position: { x: number; y: number };
}

export const PaneContextMenu: React.FC<PaneContextMenuProps> = ({ isVisible, onClose, position }) => {
  const menuRef = useRef<HTMLDivElement>(null);

  // Internal state for the on-screen (client) coordinates we render at.
  const [screenPosition, setScreenPosition] = useState<{ x: number; y: number }>(position);
  // Store the world (flow) coordinates so we can re-project them as the user pans / zooms
  const worldPositionRef = useRef<{ x: number; y: number } | null>(null);
  // Track last transform so we can avoid unnecessary recalcs
  const lastTransformRef = useRef<string>('');
  // Track number of openings to force new DOM node (prevents flash from prior position)
  const [openCounter, setOpenCounter] = useState(0);
  const lastOpenPositionRef = useRef<{ x: number; y: number } | null>(null);

  const handlePaste = () => {
    // TODO: Implement paste functionality (world position available in worldPositionRef.current)
    console.log('Paste at flow position:', worldPositionRef.current, 'screen:', screenPosition);
    onClose();
  };

  // Parse a CSS transform like: translate(xpx, ypx) scale(s)
  const parseTransform = (transform: string): { x: number; y: number; scale: number } => {
    // Defaults
    let x = 0, y = 0, scale = 1;
    if (!transform) return { x, y, scale };
    // Example patterns: translate(123px, 45px) scale(0.75)
    const translateMatch = transform.match(/translate\(([-0-9.]+)px,\s*([-0-9.]+)px\)/);
    if (translateMatch) {
      x = parseFloat(translateMatch[1]);
      y = parseFloat(translateMatch[2]);
    }
    const scaleMatch = transform.match(/scale\(([-0-9.]+)\)/);
    if (scaleMatch) {
      scale = parseFloat(scaleMatch[1]);
    }
    return { x, y, scale };
  };

  // Project world -> screen
  const projectToScreen = (world: { x: number; y: number }, t: { x: number; y: number; scale: number }) => {
    return {
      x: world.x * t.scale + t.x,
      y: world.y * t.scale + t.y,
    };
  };

  // Derive the current viewport transform from React Flow DOM
  const getViewportTransform = (): { x: number; y: number; scale: number } => {
    // React Flow (v11+) uses .react-flow__viewport or an inner div with transform
    const viewport = document.querySelector('.react-flow__viewport') as HTMLElement | null;
    let transform = viewport?.style.transform;
    if (!transform) {
      // fallback: search any transformed child within .react-flow
      const rf = document.querySelector('.react-flow');
      if (rf) {
        const transformed = rf.querySelector<HTMLElement>('*[style*="translate("]');
        transform = transformed?.style.transform;
      }
    }
    return parseTransform(transform || '');
  };

  // Initialize world position and set up sticky behavior when menu opens (layout effect to avoid paint jump)
  useLayoutEffect(() => {
    if (!isVisible) return;

    const openingNewSpot = !lastOpenPositionRef.current ||
      lastOpenPositionRef.current.x !== position.x ||
      lastOpenPositionRef.current.y !== position.y;
    if (openingNewSpot) {
      setOpenCounter(c => c + 1); // force remount for clean slate
      lastOpenPositionRef.current = { ...position };
    }

    const initialT = getViewportTransform();
    const worldX = initialT.scale !== 0 ? (position.x - initialT.x) / initialT.scale : position.x;
    const worldY = initialT.scale !== 0 ? (position.y - initialT.y) / initialT.scale : position.y;
    worldPositionRef.current = { x: worldX, y: worldY };
    lastTransformRef.current = `${initialT.x},${initialT.y},${initialT.scale}`;
    // Set immediate projected screen coords (sync before paint)
    const projected = projectToScreen(worldPositionRef.current, initialT);
    setScreenPosition(projected);

    // Throttled update via rAF to prevent flicker during rapid pan/zoom
    const frameRef = { id: 0 as number | 0 };
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
      frameRef.id = requestAnimationFrame(() => {
        updatePosition();
        frameRef.id = 0;
      });
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
  }, [isVisible, position.x, position.y]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as HTMLElement)) {
        onClose();
      }
    };

    if (isVisible) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
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

  // Use portal to render at document level but position relative to click
  return createPortal(
    <div
      key={openCounter}
      ref={menuRef}
      className="fixed bg-slate-800/95 backdrop-blur-sm border border-slate-600/50 rounded-xl shadow-2xl py-2 min-w-[120px] z-[1000]"
      style={{
        left: screenPosition.x,
        top: screenPosition.y,
      }}
    >
      <div className="px-3 py-1 text-xs text-slate-400 font-medium border-b border-slate-700/50 mb-1">
        Actions
      </div>
      <button
        onClick={handlePaste}
        className="w-full px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-700/50 transition-all duration-150 flex items-center gap-2.5 group"
      >
        <Clipboard className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-300 transition-colors" />
        Paste
      </button>
    </div>,
    document.body
  );
};