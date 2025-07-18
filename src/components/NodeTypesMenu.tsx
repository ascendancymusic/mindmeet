"use client"

import type React from "react"
import { useState, useCallback, useEffect } from "react"
import { createPortal } from "react-dom"
import {
  TextCursor,
  Instagram,
  Twitter,
  Facebook,
  Youtube,
  ChevronDown,
  Image,
  Users,
  Music,
  GitBranch,
  Undo,
  Redo,
  ChevronRight,
  Link,
  Network,
  AudioWaveform,
  ListMusic,
  Grid3X3,
  Palette,
} from "lucide-react"
import { TikTokIcon } from "./icons/TikTokIcon"
import { SpotifyIcon } from "./icons/SpotifyIcon"
import { SoundCloudIcon } from "./icons/SoundCloudIcon"

interface NodeType {
  id: string
  icon: React.ReactNode
  label: string
  type: string
}

interface NodeTypesMenuProps {
  onDragStart: (type: string) => void
  moveWithChildren: boolean
  setMoveWithChildren: (moveWithChildren: boolean) => void
  snapToGrid: boolean
  setSnapToGrid: (snapToGrid: boolean) => void
  isAltPressed: boolean
  isCtrlPressed: boolean
  maxHeight: string
  onUndo: () => void
  onRedo: () => void
  canUndo: boolean
  canRedo: boolean
  autocolorSubnodes: boolean
  setAutocolorSubnodes: (autocolorSubnodes: boolean) => void
}

const nodeTypes: NodeType[] = [
  {
    id: "default",
    icon: <TextCursor className="w-5 h-5" />,
    label: "Add Text",
    type: "default",
  },
  {
    id: "link",
    icon: <Link className="w-5 h-5" />,
    label: "Add Link",
    type: "link",
  },
  {
    id: "youtube-video",
    icon: <Youtube className="w-5 h-5" />,
    label: "Add Video",
    type: "youtube-video",
  },
  {
    id: "image",
    icon: <Image className="w-5 h-5" />,
    label: "Add Image",
    type: "image",
  },
  {
    id: "mindmap",
    icon: <Network className="w-5 h-5" />,
    label: "Add Mindmap",
    type: "mindmap",
  },
]

const musicTypes: NodeType[] = [
  {
    id: "spotify",
    icon: <SpotifyIcon className="w-5 h-5" />,
    label: "Spotify",
    type: "spotify",
  },
  {
    id: "soundcloud",
    icon: <SoundCloudIcon className="w-5 h-5" />,
    label: "SoundCloud",
    type: "soundcloud",
  },
  {
    id: "audio",
    icon: <AudioWaveform className="w-5 h-5" />,
    label: "Audio",
    type: "audio",
  },
  {
    id: "playlist",
    icon: <ListMusic className="w-5 h-5" />,
    label: "Playlist",
    type: "playlist",
  },
]

const socialMediaTypes: NodeType[] = [
  {
    id: "instagram",
    icon: <Instagram className="w-5 h-5" />,
    label: "Instagram",
    type: "instagram",
  },
  {
    id: "twitter",
    icon: <Twitter className="w-5 h-5" />,
    label: "Twitter",
    type: "twitter",
  },
  {
    id: "facebook",
    icon: <Facebook className="w-5 h-5" />,
    label: "Facebook",
    type: "facebook",
  },
  {
    id: "youtube",
    icon: <Youtube className="w-5 h-5" />,
    label: "YouTube",
    type: "youtube",
  },
  {
    id: "tiktok",
    icon: <TikTokIcon className="w-5 h-5" />,
    label: "TikTok",
    type: "tiktok",
  },
]

export function NodeTypesMenu({
  onDragStart,
  moveWithChildren,
  setMoveWithChildren,
  snapToGrid,
  setSnapToGrid,
  isAltPressed,
  isCtrlPressed,
  maxHeight,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  autocolorSubnodes,
  setAutocolorSubnodes,
}: NodeTypesMenuProps) {
  const [isMusicDropdownOpen, setIsMusicDropdownOpen] = useState(false)
  const [isSocialDropdownOpen, setIsSocialDropdownOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [activeTooltip, setActiveTooltip] = useState<{ content: React.ReactNode; element: HTMLElement } | null>(null)
  const [tooltipsEnabled, setTooltipsEnabled] = useState(true)
  const [isCompactMode, setIsCompactMode] = useState(window.innerHeight < 1090)

  // Load tooltip setting from localStorage
  useEffect(() => {
    const savedShowTooltips = localStorage.getItem('showTooltips');
    if (savedShowTooltips !== null) {
      setTooltipsEnabled(savedShowTooltips === 'true');
    }
  }, []);

  // Handle screen height changes for compact mode
  useEffect(() => {
    const handleResize = () => {
      setIsCompactMode(window.innerHeight < 1090);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Calculate effective states for visual feedback
  const effectiveSnapToGrid = snapToGrid && !isAltPressed
  const effectiveMoveWithChildren = moveWithChildren || (!moveWithChildren && isCtrlPressed)

  // Tooltip handlers
  const showTooltip = useCallback((content: React.ReactNode, element: HTMLElement) => {
    if (tooltipsEnabled) {
      setActiveTooltip({ content, element })
    }
  }, [tooltipsEnabled])

  const hideTooltip = useCallback(() => {
    setActiveTooltip(null)
  }, [])



  const handleDragStart = (event: React.DragEvent, type: string) => {
    onDragStart(type)
    event.dataTransfer.setData("application/reactflow-type", type)
    event.dataTransfer.effectAllowed = "move"
  }

  // Tooltip component that renders to document.body
  const renderTooltip = () => {
    if (!activeTooltip || !tooltipsEnabled) return null

    const rect = activeTooltip.element.getBoundingClientRect()
    const tooltipStyle = {
      position: 'fixed' as const,
      left: rect.right + 8,
      top: rect.top + (rect.height / 2),
      transform: 'translateY(-50%)',
      zIndex: 9999,
    }

    return createPortal(
      <div
        className="px-3 py-1.5 bg-slate-800/95 backdrop-blur-xl border border-slate-700/50 shadow-xl text-white text-sm rounded-md"
        style={tooltipStyle}
      >
        {activeTooltip.content}
      </div>,
      document.body
    )
  }

  return (
    <div className="relative" style={{ isolation: "isolate" }}>
      <div
        className={`${isCompactMode ? 'space-y-1 p-1.5' : 'space-y-2 p-2'} rounded-lg shadow-lg overflow-y-auto transition-all duration-300 ease-in-out ${
          isMinimized ? "w-0 p-0 opacity-0" : "w-auto opacity-100"
        } bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-xl border border-slate-700/50 shadow-xl`}
        style={{
          maxHeight,
          scrollbarColor: "rgb(147, 34, 192) rgb(34, 34, 44)",
          scrollbarWidth: "thin",
          overflowX: "hidden",
        }}
      >
        <div className={`flex justify-between items-center ${isCompactMode ? 'mb-1' : 'mb-2'}`}>
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className={`${isCompactMode ? 'p-0.5' : 'p-1'} rounded-lg hover:bg-slate-700/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${!canUndo ? "text-gray-400" : "text-white"}`}
            onMouseEnter={(e) => showTooltip(<span>Undo (<span className="font-mono">Ctrl+Z</span>)</span>, e.currentTarget)}
            onMouseLeave={hideTooltip}
          >
            <Undo className={`${isCompactMode ? 'w-4 h-4' : 'w-5 h-5'}`} />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className={`${isCompactMode ? 'p-0.5' : 'p-1'} rounded-lg hover:bg-slate-700/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${!canRedo ? "text-gray-400" : "text-white"}`}
            onMouseEnter={(e) => showTooltip(<span>Redo (<span className="font-mono">Ctrl+Y</span>)</span>, e.currentTarget)}
            onMouseLeave={hideTooltip}
          >
            <Redo className={`${isCompactMode ? 'w-4 h-4' : 'w-5 h-5'}`} />
          </button>
        </div>

        {nodeTypes.map((nodeType) => (
          <div
            key={nodeType.id}
            draggable
            onDragStart={(e) => handleDragStart(e, nodeType.type)}
            onMouseEnter={(e) => showTooltip(nodeType.label, e.currentTarget)}
            onMouseLeave={hideTooltip}
            className={`${isCompactMode ? 'w-8 h-8' : 'w-9 h-10'} flex items-center justify-center text-white rounded-lg cursor-move shadow-md transition-all duration-300 bg-gradient-to-br from-slate-700/80 to-slate-800/80 backdrop-blur-sm border border-slate-600/30 hover:from-slate-600/80 hover:to-slate-700/80 hover:border-slate-500/50 shadow-lg shadow-slate-900/25`}
          >
            <div className={`${isCompactMode ? 'scale-90' : ''}`}>
              {nodeType.icon}
            </div>
          </div>
        ))}

        <div className="relative">
          <button
            onClick={() => setIsMusicDropdownOpen((prev) => !prev)}
            onMouseEnter={(e) => showTooltip("Add Music", e.currentTarget)}
            onMouseLeave={hideTooltip}
            className={`${isCompactMode ? 'w-8 h-8' : 'w-9 h-10'} flex items-center justify-center text-white rounded-lg shadow-md transition-all duration-300 ${
              isMusicDropdownOpen ? "ring-2 ring-slate-500/50" : ""
            } bg-gradient-to-br from-slate-700/80 to-slate-800/80 backdrop-blur-sm border border-slate-600/30 hover:from-slate-600/80 hover:to-slate-700/80 hover:border-slate-500/50`}
          >
            <div className={`flex items-center ${isCompactMode ? 'scale-90' : ''}`}>
              <Music className="w-5 h-5" />
              <ChevronDown
                className={`w-3 h-3 ml-0.5 transition-transform duration-200 ${isMusicDropdownOpen ? "rotate-180" : ""}`}
              />
            </div>
          </button>
          {isMusicDropdownOpen && (
            <div
              className={`${isCompactMode ? 'mt-1 max-h-28 p-1.5' : 'mt-2 max-h-36 p-2'} overflow-y-auto rounded-lg shadow-lg bg-slate-800/95 backdrop-blur-xl border border-slate-700/50`}
              style={{
                scrollbarColor: "rgb(147, 34, 192) rgb(34, 34, 44)",
                scrollbarWidth: "thin",
                overflowX: "hidden",
              }}
            >
              {musicTypes.map((musicType) => (
                <div
                  key={musicType.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, musicType.type)}
                  onMouseEnter={(e) => showTooltip(musicType.label, e.currentTarget)}
                  onMouseLeave={hideTooltip}
                  className={`${isCompactMode ? 'w-8 h-8 mb-1' : 'w-9 h-10 mb-2'} flex items-center justify-center text-white rounded-lg cursor-move shadow transition-all duration-300 bg-gradient-to-br from-slate-700/80 to-slate-800/80 backdrop-blur-sm border border-slate-600/30 hover:from-slate-600/80 hover:to-slate-700/80 hover:border-slate-500/50 shadow-lg shadow-slate-900/25`}
                >
                  <div className={`${isCompactMode ? 'scale-90' : ''}`}>
                    {musicType.icon}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => setIsSocialDropdownOpen((prev) => !prev)}
            onMouseEnter={(e) => showTooltip("Social Media", e.currentTarget)}
            onMouseLeave={hideTooltip}
            className={`${isCompactMode ? 'w-8 h-8' : 'w-9 h-10'} flex items-center justify-center text-white rounded-lg shadow-md transition-all duration-300 ${
              isSocialDropdownOpen ? "ring-2 ring-slate-500/50" : ""
            } bg-gradient-to-br from-slate-700/80 to-slate-800/80 backdrop-blur-sm border border-slate-600/30 hover:from-slate-600/80 hover:to-slate-700/80 hover:border-slate-500/50`}
          >
            <div className={`flex items-center ${isCompactMode ? 'scale-90' : ''}`}>
              <Users className="w-5 h-5" />
              <ChevronDown
                className={`w-3 h-3 ml-0.5 transition-transform duration-200 ${isSocialDropdownOpen ? "rotate-180" : ""}`}
              />
            </div>
          </button>
          {isSocialDropdownOpen && (
            <div
              className={`${isCompactMode ? 'mt-1 max-h-28 p-1.5' : 'mt-2 max-h-36 p-2'} overflow-y-auto rounded-lg shadow-lg bg-slate-800/95 backdrop-blur-xl border border-slate-700/50`}
              style={{
                scrollbarColor: "rgb(59, 130, 246) rgb(34, 34, 44)",
                scrollbarWidth: "thin",
                overflowX: "hidden",
              }}
            >
              {socialMediaTypes.map((socialType) => (
                <div
                  key={socialType.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, socialType.type)}
                  onMouseEnter={(e) => showTooltip(socialType.label, e.currentTarget)}
                  onMouseLeave={hideTooltip}
                  className={`${isCompactMode ? 'w-8 h-8 mb-1' : 'w-9 h-10 mb-2'} flex items-center justify-center text-white rounded-lg cursor-move shadow transition-all duration-300 bg-gradient-to-br from-slate-700/80 to-slate-800/80 backdrop-blur-sm border border-slate-600/30 hover:from-slate-600/80 hover:to-slate-700/80 hover:border-slate-500/50 shadow-lg shadow-slate-900/25`}
                >
                  <div className={`${isCompactMode ? 'scale-90' : ''}`}>
                    {socialType.icon}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Separator line between draggable nodes and clickable options */}
        <div className={`${isCompactMode ? 'my-2' : 'my-3'} border-t border-slate-600/50`}></div>

        <button
          onClick={() => {
            setMoveWithChildren(!moveWithChildren);
            // Update tooltip immediately if it's currently showing for this button
            if (activeTooltip && activeTooltip.element) {
              const tooltipText = !effectiveMoveWithChildren ? "Subnodes Moving: On" : "Subnodes Moving: Off";
              const modifierText = moveWithChildren && isCtrlPressed ? " (Ctrl)" : "";
              const tooltipContent = (
                <div>
                  <div>{tooltipText + modifierText}</div>
                  <div className="text-xs text-gray-400 mt-1">Hold <span className="font-mono">Ctrl</span> to temporarily enable</div>
                </div>
              );
              setActiveTooltip({ content: tooltipContent, element: activeTooltip.element });
            }
          }}
          onMouseEnter={(e) => {
            const tooltipText = effectiveMoveWithChildren ? "Subnodes Moving: On" : "Subnodes Moving: Off";
            const modifierText = !moveWithChildren && isCtrlPressed ? " (Ctrl)" : "";
            const tooltipContent = (
              <div>
                <div>{tooltipText + modifierText}</div>
                <div className="text-xs text-gray-400 mt-1">Hold <span className="font-mono">Ctrl</span> to temporarily enable</div>
              </div>
            );
            showTooltip(tooltipContent, e.currentTarget);
          }}
          onMouseLeave={hideTooltip}
          className={`${isCompactMode ? 'w-8 h-8' : 'w-9 h-10'} flex items-center justify-center rounded-lg shadow-lg transition-colors ${
            effectiveMoveWithChildren
              ? "bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg shadow-blue-500/25 text-white"
              : "bg-slate-700/50 text-white hover:bg-slate-600/50"
          }`}
        >
          <GitBranch className={`${isCompactMode ? 'w-4 h-4' : 'w-5 h-5'}`} />
        </button>
        <button
          onClick={() => {
            setSnapToGrid(!snapToGrid);
            // Update tooltip immediately if it's currently showing for this button
            if (activeTooltip && activeTooltip.element) {
              const tooltipText = !effectiveSnapToGrid ? "Snap to Grid: On" : "Snap to Grid: Off";
              const modifierText = !snapToGrid && isAltPressed ? " (Alt)" : "";
              const tooltipContent = (
                <div>
                  <div>{tooltipText + modifierText}</div>
                  <div className="text-xs text-gray-400 mt-1">Hold <span className="font-mono">Alt</span> to temporarily disable</div>
                </div>
              );
              setActiveTooltip({ content: tooltipContent, element: activeTooltip.element });
            }
          }}
          onMouseEnter={(e) => {
            const tooltipText = effectiveSnapToGrid ? "Snap to Grid: On" : "Snap to Grid: Off";
            const modifierText = snapToGrid && isAltPressed ? " (Alt)" : "";
            const tooltipContent = (
              <div>
                <div>{tooltipText + modifierText}</div>
                <div className="text-xs text-gray-400 mt-1">Hold <span className="font-mono">Alt</span> to temporarily disable</div>
              </div>
            );
            showTooltip(tooltipContent, e.currentTarget);
          }}
          onMouseLeave={hideTooltip}
          className={`${isCompactMode ? 'mt-1 w-8 h-8' : 'mt-2 w-9 h-10'} flex items-center justify-center rounded-lg shadow-lg transition-colors ${
            effectiveSnapToGrid
              ? "bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg shadow-blue-500/25 text-white"
              : "bg-slate-700/50 text-white hover:bg-slate-600/50"
          }`}
        >
          <Grid3X3 className={`${isCompactMode ? 'w-4 h-4' : 'w-5 h-5'}`} />
        </button>
        <button
          onClick={() => {
            setAutocolorSubnodes(!autocolorSubnodes);
            // Update tooltip immediately if it's currently showing for this button
            if (activeTooltip && activeTooltip.element) {
              const tooltipText = !autocolorSubnodes ? "Autocolor Subnodes: On" : "Autocolor Subnodes: Off";
              setActiveTooltip({ content: tooltipText, element: activeTooltip.element });
            }
          }}
          onMouseEnter={(e) => {
            const tooltipText = autocolorSubnodes ? "Autocolor Subnodes: On" : "Autocolor Subnodes: Off";
            showTooltip(tooltipText, e.currentTarget);
          }}
          onMouseLeave={hideTooltip}
          className={`${isCompactMode ? 'mt-1 w-8 h-8' : 'mt-2 w-9 h-10'} flex items-center justify-center rounded-lg shadow-lg transition-colors ${
            autocolorSubnodes
              ? "bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg shadow-blue-500/25 text-white"
              : "bg-slate-700/50 text-white hover:bg-slate-600/50"
          }`}
        >
          <Palette className={`${isCompactMode ? 'w-4 h-4' : 'w-5 h-5'}`} />
        </button>
      </div>
      <button
        onClick={() => setIsMinimized(!isMinimized)}
        className="absolute -right-4 top-1/2 -translate-y-1/2 w-8 h-12 flex items-center justify-center shadow-lg transition-transform hover:scale-105 bg-gradient-to-r from-slate-700 to-slate-800 border border-slate-600/30 rounded-r-lg"
      >
        <ChevronRight
          className={`w-4 h-4 text-white transform transition-transform duration-300 ${
            isMinimized ? "" : "rotate-180"
          }`}
        />
      </button>
      {renderTooltip()}
    </div>
  )
}
