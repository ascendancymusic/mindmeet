'use client';

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
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
  Users,
  ListMusic,
} from 'lucide-react';
import { SpotifyIcon } from './icons/SpotifyIcon';
import { SoundCloudIcon } from './icons/SoundCloudIcon';
import { TikTokIcon } from './icons/TikTokIcon';

interface EdgeDropContextMenuProps {
  position: { x: number; y: number };
  onClose: () => void;
  sourceScreenPosition?: { x: number; y: number } | null;
  targetScreenPosition?: { x: number; y: number } | null;
  flowPosition?: { x: number; y: number } | null;
  onNodeSelect: (nodeType: string) => void;
}

type Category = null | 'text' | 'media' | 'music' | 'social';

interface NodeOption {
  id: string;
  label: string;
  icon: React.ReactNode;
  category: Category;
  description?: string;
}

export const EdgeDropContextMenu: React.FC<EdgeDropContextMenuProps> = ({
  position,
  onClose,
  sourceScreenPosition: _sourceScreenPosition,
  targetScreenPosition: _targetScreenPosition,
  flowPosition,
  onNodeSelect,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [screenPosition, setScreenPosition] = useState<{ x: number; y: number }>(position);
  const worldPositionRef = useRef<{ x: number; y: number } | null>(null);
  const lastTransformRef = useRef<string>('');
  const [openCounter, setOpenCounter] = useState(0);
  const lastOpenPositionRef = useRef<{ x: number; y: number } | null>(null);
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
  }, [position, flowPosition]); // Updated dependency array

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as HTMLElement)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (activeCategory) setActiveCategory(null);
        else onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose, activeCategory]);

  const handleNodeSelect = (nodeId: string) => {
    onNodeSelect(nodeId);
    onClose();
  };

  return createPortal(
    <div
      key={openCounter}
      ref={menuRef}
      className="fixed z-[1000]"
      style={{ left: screenPosition.x, top: screenPosition.y }}
    >
      <div
        className="bg-gradient-to-br from-slate-800/95 via-slate-900/95 to-slate-800/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
        style={{
          minWidth: activeCategory ? '220px' : '180px',
          animation: 'fadeInScale 0.15s ease-out',
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-white/5">
          {activeCategory ? (
            <button
              onClick={() => setActiveCategory(null)}
              className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          ) : (
            <div className="p-1">
              <Plus className="w-3.5 h-3.5 text-blue-400" />
            </div>
          )}
          <span className="text-xs font-semibold text-slate-300 tracking-wide">
            {activeCategory
              ? categories.find((c) => c.id === activeCategory)?.label
              : 'Add Node'}
          </span>
        </div>

        {/* Content */}
        <div className="p-1.5">
          {!activeCategory ? (
            /* Category Selection */
            <div className="space-y-0.5">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => {
                    // If it's text category, directly create text node
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
                    <ChevronLeft className={`w-3 h-3 ml-auto rotate-180 transition-all duration-150 ${
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
