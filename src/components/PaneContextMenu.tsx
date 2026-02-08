import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Clipboard,
  Plus,
  Type,
  Link,
  Youtube,
  ImageIcon,
  Network,
  Music,
  Instagram,
  Twitter,
  Facebook,
  ChevronLeft,
  ChevronRight,
  Users,
  ListMusic,
} from 'lucide-react';
import { SpotifyIcon } from './icons/SpotifyIcon';
import { SoundCloudIcon } from './icons/SoundCloudIcon';
import { TikTokIcon } from './icons/TikTokIcon';

interface PaneContextMenuProps {
  isVisible: boolean;
  onClose: () => void;
  /** Initial screen (client) position where the context menu was invoked */
  position: { x: number; y: number };
  hasClipboard?: boolean; // whether there is data in custom clipboard
  onPasteAt?: (screenPosition: { x: number; y: number }) => void; // callback to perform paste
  onAddNode?: (nodeType: string, screenPosition: { x: number; y: number }) => void;
}

type Category = null | 'text' | 'media' | 'music' | 'social';

interface NodeOption {
  id: string;
  label: string;
  icon: React.ReactNode;
  category: Category;
  description?: string;
}

export const PaneContextMenu: React.FC<PaneContextMenuProps> = ({ isVisible, onClose, position, hasClipboard = false, onPasteAt, onAddNode }) => {
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

  // Menu navigation state
  const [view, setView] = useState<'main' | 'add-categories'>('main');
  const [activeCategory, setActiveCategory] = useState<Category>(null);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const categories: { id: Category; label: string; icon: React.ReactNode; color: string }[] = [
    { id: 'text', label: 'Text', icon: <Type className="w-4 h-4" />, color: 'from-blue-500/20 to-blue-600/20' },
    { id: 'media', label: 'Media', icon: <ImageIcon className="w-4 h-4" />, color: 'from-purple-500/20 to-purple-600/20' },
    { id: 'music', label: 'Music', icon: <Music className="w-4 h-4" />, color: 'from-pink-500/20 to-pink-600/20' },
    { id: 'social', label: 'Social', icon: <Users className="w-4 h-4" />, color: 'from-cyan-500/20 to-cyan-600/20' },
  ];

  const nodeOptions: NodeOption[] = [
    { id: 'link', label: 'Link', icon: <Link className="w-4 h-4" />, category: 'media', description: 'Embed a URL preview' },
    { id: 'video', label: 'Video', icon: <Youtube className="w-4 h-4" />, category: 'media', description: 'YouTube or video embed' },
    { id: 'image', label: 'Image', icon: <ImageIcon className="w-4 h-4" />, category: 'media', description: 'Upload or link an image' },
    { id: 'mindmap', label: 'Mindmap', icon: <Network className="w-4 h-4" />, category: 'media', description: 'Nested mindmap node' },
    { id: 'spotify', label: 'Spotify', icon: <SpotifyIcon className="w-4 h-4" />, category: 'music', description: 'Spotify track or playlist' },
    { id: 'soundcloud', label: 'SoundCloud', icon: <SoundCloudIcon className="w-4 h-4" />, category: 'music', description: 'SoundCloud audio embed' },
    { id: 'playlist', label: 'Playlist', icon: <ListMusic className="w-4 h-4" />, category: 'music', description: 'Audio playlist' },
    { id: 'instagram', label: 'Instagram', icon: <Instagram className="w-4 h-4" />, category: 'social', description: 'Instagram account' },
    { id: 'twitter', label: 'Twitter', icon: <Twitter className="w-4 h-4" />, category: 'social', description: 'Twitter/X account' },
    { id: 'facebook', label: 'Facebook', icon: <Facebook className="w-4 h-4" />, category: 'social', description: 'Facebook account' },
    { id: 'tiktok', label: 'TikTok', icon: <TikTokIcon className="w-4 h-4" />, category: 'social', description: 'TikTok video embed' },
  ];

  const filteredOptions = activeCategory
    ? nodeOptions.filter((o) => o.category === activeCategory)
    : [];

  const handlePaste = () => {
    if (!hasClipboard) return;
    if (onPasteAt) {
      onPasteAt(screenPosition);
    } else {
      console.log('Paste requested but no handler provided');
    }
    onClose();
  };

  const handleNodeSelect = (nodeId: string) => {
    if (onAddNode) {
      onAddNode(nodeId, screenPosition);
    }
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

    // Reset view state when opening
    setView('main');
    setActiveCategory(null);

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
        if (activeCategory) {
          setActiveCategory(null);
        } else if (view === 'add-categories') {
          setView('main');
        } else {
          onClose();
        }
      }
    };

    if (isVisible) {
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [isVisible, onClose, activeCategory, view]);

  if (!isVisible) return null;

  // Use portal to render at document level but position relative to click
  return createPortal(
    <div
      key={openCounter}
      ref={menuRef}
      className="fixed z-[1000]"
      style={{
        left: screenPosition.x,
        top: screenPosition.y,
      }}
    >
      <div 
        className="bg-gradient-to-br from-slate-800/95 via-slate-900/95 to-slate-800/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
        style={{
          minWidth: view === 'main' ? '180px' : (activeCategory ? '220px' : '180px'),
          animation: 'fadeInScale 0.15s ease-out',
        }}
      >
        {/* Header Logic */}
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-white/5">
          {view === 'main' ? (
             <div className="text-xs font-semibold text-slate-300 tracking-wide">
               Actions
             </div>
          ) : (
            <>
              <button
                onClick={() => {
                  if (activeCategory) setActiveCategory(null);
                  else setView('main');
                }}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs font-semibold text-slate-300 tracking-wide">
                {activeCategory
                  ? categories.find((c) => c.id === activeCategory)?.label
                  : 'Add Node'}
              </span>
            </>
          )}
        </div>

        {/* Content */}
        <div className="p-1.5">
          {view === 'main' ? (
            <div className="space-y-0.5">
              <button
                 onClick={handlePaste}
                 disabled={!hasClipboard}
                 onMouseEnter={() => setHoveredItem('paste')}
                 onMouseLeave={() => setHoveredItem(null)}
                 className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-all duration-150 group ${
                   hasClipboard 
                    ? (hoveredItem === 'paste' ? 'bg-white/10 border border-white/10' : 'hover:bg-white/5 border border-transparent')
                    : 'opacity-50 cursor-not-allowed border border-transparent'
                 }`}
              >
                <div className={`flex items-center justify-center w-7 h-7 rounded-lg transition-all duration-150 ${
                   hoveredItem === 'paste' && hasClipboard ? 'bg-white/10 text-white' : 'bg-white/5 text-slate-400'
                }`}>
                  <Clipboard className="w-4 h-4" />
                </div>
                <span className={`text-sm font-medium transition-colors ${
                  hoveredItem === 'paste' && hasClipboard ? 'text-white' : 'text-slate-300'
                }`}>
                  Paste
                </span>
              </button>

              <button
                 onClick={() => setView('add-categories')}
                 onMouseEnter={() => setHoveredItem('add-node')}
                 onMouseLeave={() => setHoveredItem(null)}
                 className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-all duration-150 group ${
                   hoveredItem === 'add-node' ? 'bg-white/10 border border-white/10' : 'hover:bg-white/5 border border-transparent'
                 }`}
              >
                <div className={`flex items-center justify-center w-7 h-7 rounded-lg transition-all duration-150 ${
                   hoveredItem === 'add-node' ? 'bg-white/10 text-white' : 'bg-white/5 text-slate-400'
                }`}>
                  <Plus className="w-4 h-4" />
                </div>
                <span className={`text-sm font-medium transition-colors ${
                  hoveredItem === 'add-node' ? 'text-white' : 'text-slate-300'
                }`}>
                  Add Node
                </span>
                 <ChevronRight className={`w-3.5 h-3.5 ml-auto transition-all duration-150 ${
                   hoveredItem === 'add-node' ? 'text-slate-300 translate-x-0.5' : 'text-slate-600'
                 }`} />
              </button>
            </div>
          ) : !activeCategory ? (
            /* Category Selection */
            <div className="space-y-0.5">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => {
                    if (cat.id === 'text') {
                      handleNodeSelect('text-bg');
                    } else {
                      setActiveCategory(cat.id);
                    }
                  }}
                  onMouseEnter={() => setHoveredItem(cat.id!)}
                  onMouseLeave={() => setHoveredItem(null)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-all duration-150 group ${
                    hoveredItem === cat.id
                      ? 'bg-gradient-to-r ' + cat.color + ' border border-white/10'
                      : 'hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <div className={`flex items-center justify-center w-7 h-7 rounded-lg transition-all duration-150 ${
                    hoveredItem === cat.id
                      ? 'bg-white/10 text-white'
                      : 'bg-white/5 text-slate-400'
                  }`}>
                    {cat.icon}
                  </div>
                  <span className={`text-sm font-medium transition-colors ${
                    hoveredItem === cat.id ? 'text-white' : 'text-slate-300'
                  }`}>
                    {cat.label}
                  </span>
                  {cat.id !== 'text' && (
                    <ChevronRight className={`w-3.5 h-3.5 ml-auto transition-all duration-150 ${
                      hoveredItem === cat.id ? 'text-slate-300 translate-x-0.5' : 'text-slate-600'
                    }`} />
                  )}
                </button>
              ))}
            </div>
          ) : (
            /* Node Options */
            <div className="space-y-0.5">
              {filteredOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => handleNodeSelect(option.id)}
                  onMouseEnter={() => setHoveredItem(option.id)}
                  onMouseLeave={() => setHoveredItem(null)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-all duration-150 group ${
                    hoveredItem === option.id
                      ? 'bg-white/10 border border-white/10'
                      : 'hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <div className={`flex items-center justify-center w-7 h-7 rounded-lg transition-all duration-150 ${
                    hoveredItem === option.id
                      ? 'bg-white/10 text-white'
                      : 'bg-white/5 text-slate-400'
                  }`}>
                    {option.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-medium transition-colors ${
                      hoveredItem === option.id ? 'text-white' : 'text-slate-300'
                    }`}>
                      {option.label}
                    </div>
                    {option.description && (
                      <div className={`text-[11px] leading-tight truncate transition-colors ${
                        hoveredItem === option.id ? 'text-slate-300' : 'text-slate-500'
                      }`}>
                        {option.description}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
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