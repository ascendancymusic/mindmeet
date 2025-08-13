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
  ImageIcon,
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
  Edit3,
  MousePointer,
  Type,
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

// Text node variants
const textNodeVariants: NodeType[] = [
  {
    id: "default",
    icon: <TextCursor className="w-5 h-5" />,
    label: "Text with Background",
    type: "default",
  },
  {
    id: "text-no-bg",
    icon: <Type className="w-5 h-5" />,
    label: "Text without Background",
    type: "text-no-bg",
  },
]

const nodeTypes: NodeType[] = [
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
    icon: <ImageIcon className="w-5 h-5" />,
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
  {
    id: "mindmeet",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-5 h-5"
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M16 8c2.828 0 4-1.172 4-4" />
        <path d="M8 8C5.172 8 4 6.828 4 4" />
        <path d="M8 16c-2.828 0-4 1.172-4 4" />
        <path d="M16 16c2.828 0 4 1.172 4 4" />
      </svg>
    ),
    label: "MindMeet",
    type: "mindmeet",
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
  const [isPenMode, setIsPenMode] = useState(false)
  const [selectedTextVariant, setSelectedTextVariant] = useState(0) // 0 = with background, 1 = no background

  // Load tooltip setting from localStorage
  useEffect(() => {
    const savedShowTooltips = localStorage.getItem("showTooltips")
    if (savedShowTooltips !== null) {
      setTooltipsEnabled(savedShowTooltips === "true")
    }

    // Load selected text variant from localStorage
    const savedTextVariant = localStorage.getItem("selectedTextVariant")
    if (savedTextVariant !== null) {
      setSelectedTextVariant(Number.parseInt(savedTextVariant, 10))
    }
  }, [])

  // Handle screen height changes for compact mode
  useEffect(() => {
    const handleResize = () => {
      setIsCompactMode(window.innerHeight < 1090)
    }

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  // Listen for pen mode changes from DrawModal
  useEffect(() => {
    const handlePenModeChange = (event: CustomEvent) => {
      const { isPenMode } = event.detail
      setIsPenMode(isPenMode)
    }

    document.addEventListener("pen-mode-changed", handlePenModeChange as EventListener)

    return () => {
      document.removeEventListener("pen-mode-changed", handlePenModeChange as EventListener)
    }
  }, [])

  // Calculate effective states for visual feedback
  const effectiveSnapToGrid = snapToGrid && !isAltPressed
  const effectiveMoveWithChildren = moveWithChildren || (!moveWithChildren && isCtrlPressed)

  // Tooltip handlers
  const showTooltip = useCallback(
    (content: React.ReactNode, element: HTMLElement) => {
      if (tooltipsEnabled) {
        setActiveTooltip({ content, element })
      }
    },
    [tooltipsEnabled],
  )

  const hideTooltip = useCallback(() => {
    setActiveTooltip(null)
  }, [])

  const handleDragStart = (event: React.DragEvent, type: string) => {
    onDragStart(type)
    event.dataTransfer.setData("application/reactflow-type", type)
    event.dataTransfer.effectAllowed = "move"
  }

  const handleTextVariantChange = (variantIndex: number) => {
    setSelectedTextVariant(variantIndex)
    localStorage.setItem("selectedTextVariant", variantIndex.toString())

    // Update tooltip immediately if it's currently showing for this button
    if (activeTooltip && activeTooltip.element) {
      const nextVariant = variantIndex === 0 ? 1 : 0
      const tooltipContent = (
        <div className="text-center">
          <div className="font-medium">{textNodeVariants[variantIndex].label}</div>
          <div className="text-xs text-slate-400 mt-1">
            Click to switch to: {textNodeVariants[nextVariant].label}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">Drag to add to canvas</div>
        </div>
      )
      setActiveTooltip({ content: tooltipContent, element: activeTooltip.element })
    }

    // Dispatch event for any systems that need to know about the change
    const event = new CustomEvent("text-variant-changed", {
      detail: {
        variant: variantIndex,
        type: textNodeVariants[variantIndex].type,
        label: textNodeVariants[variantIndex].label,
      },
    })
    document.dispatchEvent(event)
  }

  // Tooltip component that renders to document.body
  const renderTooltip = () => {
    if (!activeTooltip || !tooltipsEnabled) return null

    const rect = activeTooltip.element.getBoundingClientRect()
    const tooltipStyle = {
      position: "fixed" as const,
      left: rect.right + 8,
      top: rect.top + rect.height / 2,
      transform: "translateY(-50%)",
      zIndex: 10000,
    }

    return createPortal(
      <div
        className="px-3 py-1.5 bg-gradient-to-br from-slate-800/95 via-slate-900/95 to-purple-900/95 backdrop-blur-xl border border-white/10 shadow-2xl text-white text-sm rounded-xl"
        style={tooltipStyle}
      >
        {activeTooltip.content}
      </div>,
      document.body,
    )
  }

  return (
    <div className="relative" style={{ isolation: "isolate", zIndex: 1000 }}>
      <div
        className={`${isCompactMode ? "space-y-1 p-1.5" : "space-y-2 p-2"} rounded-2xl shadow-2xl overflow-y-auto transition-all duration-300 ease-in-out ${isMinimized ? "w-0 p-0 opacity-0" : "w-auto opacity-100"
          } bg-gradient-to-br from-slate-800/95 via-slate-900/95 to-purple-900/95 backdrop-blur-xl border border-white/10`}
        style={{
          maxHeight,
          scrollbarColor: "rgb(147, 34, 192) rgb(34, 34, 44)",
          scrollbarWidth: "thin",
          overflowX: "hidden",
        }}
      >
        <div className={`flex justify-between items-center ${isCompactMode ? "mb-1" : "mb-2"}`}>
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className={`${isCompactMode ? "p-0.5" : "p-1"} rounded-xl hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${!canUndo ? "text-gray-400" : "text-white"}`}
            onMouseEnter={(e) =>
              showTooltip(
                <span>
                  Undo (<span className="font-mono">Ctrl+Z</span>)
                </span>,
                e.currentTarget,
              )
            }
            onMouseLeave={hideTooltip}
          >
            <Undo className={`${isCompactMode ? "w-4 h-4" : "w-5 h-5"}`} />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className={`${isCompactMode ? "p-0.5" : "p-1"} rounded-xl hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${!canRedo ? "text-gray-400" : "text-white"}`}
            onMouseEnter={(e) =>
              showTooltip(
                <span>
                  Redo (<span className="font-mono">Ctrl+Y</span>)
                </span>,
                e.currentTarget,
              )
            }
            onMouseLeave={hideTooltip}
          >
            <Redo className={`${isCompactMode ? "w-4 h-4" : "w-5 h-5"}`} />
          </button>
        </div>

        {/* Text Node Variants Section - Integrated Toggle */}
        <div className="relative">
          <div
            draggable
            onDragStart={(e) => handleDragStart(e, textNodeVariants[selectedTextVariant].type)}
            className={`${isCompactMode ? "w-8 h-8" : "w-9 h-10"} flex items-center justify-center text-white rounded-xl cursor-move shadow-md transition-all duration-300 bg-gradient-to-br from-slate-700/80 to-slate-800/80 backdrop-blur-sm border border-slate-600/30 hover:from-slate-600/80 hover:to-slate-700/80 hover:border-slate-500/50 shadow-lg shadow-slate-900/25 group relative overflow-hidden ${selectedTextVariant === 0 ? "ring-1 ring-blue-400/40" : "ring-1 ring-purple-400/40"
              }`}
          >
            <div className={`${isCompactMode ? "scale-90" : ""} relative z-10`}>
              {textNodeVariants[selectedTextVariant].icon}
            </div>

            {/* Integrated toggle indicator */}
            <div className="absolute bottom-0.5 right-0.5 w-2 h-2 flex items-center justify-center">
              <div
                className={`w-1.5 h-1.5 rounded-full transition-all duration-200 ${selectedTextVariant === 0
                    ? "bg-blue-400 shadow-[0_0_4px_rgba(59,130,246,0.6)]"
                    : "bg-purple-400 shadow-[0_0_4px_rgba(168,85,247,0.6)]"
                  }`}
              />
            </div>

            {/* Click overlay for toggling */}
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                handleTextVariantChange(selectedTextVariant === 0 ? 1 : 0)
              }}
              className="absolute inset-0 w-full h-full bg-transparent hover:bg-white/5 transition-colors rounded-xl z-20"
              onMouseEnter={(e) => {
                e.stopPropagation()
                const nextVariant = selectedTextVariant === 0 ? 1 : 0
                showTooltip(
                  <div className="text-center">
                    <div className="font-medium">{textNodeVariants[selectedTextVariant].label}</div>
                    <div className="text-xs text-slate-400 mt-1">
                      Click to switch to: {textNodeVariants[nextVariant].label}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">Drag to add to canvas</div>
                  </div>,
                  e.currentTarget,
                )
              }}
              onMouseLeave={hideTooltip}
            />

            {/* Subtle gradient overlay for depth */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-xl pointer-events-none" />
          </div>
        </div>

        {nodeTypes.map((nodeType) => (
          <div
            key={nodeType.id}
            draggable
            onDragStart={(e) => handleDragStart(e, nodeType.type)}
            onMouseEnter={(e) => showTooltip(nodeType.label, e.currentTarget)}
            onMouseLeave={hideTooltip}
            className={`${isCompactMode ? "w-8 h-8" : "w-9 h-10"} flex items-center justify-center text-white rounded-xl cursor-move shadow-md transition-all duration-300 bg-gradient-to-br from-slate-700/80 to-slate-800/80 backdrop-blur-sm border border-slate-600/30 hover:from-slate-600/80 hover:to-slate-700/80 hover:border-slate-500/50 shadow-lg shadow-slate-900/25`}
          >
            <div className={`${isCompactMode ? "scale-90" : ""}`}>{nodeType.icon}</div>
          </div>
        ))}

        <div className="relative">
          <button
            onClick={() => setIsMusicDropdownOpen((prev) => !prev)}
            onMouseEnter={(e) => showTooltip("Music", e.currentTarget)}
            onMouseLeave={hideTooltip}
            className={`${isCompactMode ? "w-8 h-8" : "w-9 h-10"} flex items-center justify-center text-white rounded-xl shadow-md transition-all duration-300 ${isMusicDropdownOpen ? "ring-2 ring-slate-500/50" : ""
              } bg-gradient-to-br from-slate-700/80 to-slate-800/80 backdrop-blur-sm border border-slate-600/30 hover:from-slate-600/80 hover:to-slate-700/80 hover:border-slate-500/50`}
          >
            <div className={`flex items-center ${isCompactMode ? "scale-90" : ""}`}>
              <Music className="w-5 h-5" />
              <ChevronDown
                className={`w-3 h-3 ml-0.5 transition-transform duration-200 ${isMusicDropdownOpen ? "rotate-180" : ""}`}
              />
            </div>
          </button>
          {isMusicDropdownOpen && (
            <div
              className={`${isCompactMode ? "mt-1 max-h-28 p-1.5" : "mt-2 max-h-36 p-2"} overflow-y-auto rounded-xl shadow-lg bg-gradient-to-br from-slate-800/95 via-slate-900/95 to-purple-900/95 backdrop-blur-xl border border-white/10`}
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
                  className={`${isCompactMode ? "w-8 h-8 mb-1" : "w-9 h-10 mb-2"} flex items-center justify-center text-white rounded-xl cursor-move shadow transition-all duration-300 bg-gradient-to-br from-slate-700/80 to-slate-800/80 backdrop-blur-sm border border-slate-600/30 hover:from-slate-600/80 hover:to-slate-700/80 hover:border-slate-500/50 shadow-lg shadow-slate-900/25`}
                >
                  <div className={`${isCompactMode ? "scale-90" : ""}`}>{musicType.icon}</div>
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
            className={`${isCompactMode ? "w-8 h-8" : "w-9 h-10"} flex items-center justify-center text-white rounded-xl shadow-md transition-all duration-300 ${isSocialDropdownOpen ? "ring-2 ring-slate-500/50" : ""
              } bg-gradient-to-br from-slate-700/80 to-slate-800/80 backdrop-blur-sm border border-slate-600/30 hover:from-slate-600/80 hover:to-slate-700/80 hover:border-slate-500/50`}
          >
            <div className={`flex items-center ${isCompactMode ? "scale-90" : ""}`}>
              <Users className="w-5 h-5" />
              <ChevronDown
                className={`w-3 h-3 ml-0.5 transition-transform duration-200 ${isSocialDropdownOpen ? "rotate-180" : ""}`}
              />
            </div>
          </button>
          {isSocialDropdownOpen && (
            <div
              className={`${isCompactMode ? "mt-1 max-h-28 p-1.5" : "mt-2 max-h-36 p-2"} overflow-y-auto rounded-xl shadow-lg bg-gradient-to-br from-slate-800/95 via-slate-900/95 to-purple-900/95 backdrop-blur-xl border border-white/10`}
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
                  className={`${isCompactMode ? "w-8 h-8 mb-1" : "w-9 h-10 mb-2"} flex items-center justify-center text-white rounded-xl cursor-move shadow transition-all duration-300 bg-gradient-to-br from-slate-700/80 to-slate-800/80 backdrop-blur-sm border border-slate-600/30 hover:from-slate-600/80 hover:to-slate-700/80 hover:border-slate-500/50 shadow-lg shadow-slate-900/25`}
                >
                  <div className={`${isCompactMode ? "scale-90" : ""}`}>{socialType.icon}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Separator line between draggable nodes and clickable options */}
        <div className={`${isCompactMode ? "my-2" : "my-3"} border-t border-white/10`}></div>

        <button
          onClick={() => {
            setMoveWithChildren(!moveWithChildren)
            // Update tooltip immediately if it's currently showing for this button
            if (activeTooltip && activeTooltip.element) {
              const tooltipText = !effectiveMoveWithChildren ? "Subnodes Moving: On" : "Subnodes Moving: Off"
              const modifierText = moveWithChildren && isCtrlPressed ? " (Ctrl)" : ""
              const tooltipContent = (
                <div>
                  <div>{tooltipText + modifierText}</div>
                  <div className="text-xs text-gray-400 mt-1">
                    Hold <span className="font-mono">Ctrl</span> to temporarily enable
                  </div>
                </div>
              )
              setActiveTooltip({ content: tooltipContent, element: activeTooltip.element })
            }
          }}
          onMouseEnter={(e) => {
            const tooltipText = effectiveMoveWithChildren ? "Subnodes Moving: On" : "Subnodes Moving: Off"
            const modifierText = !moveWithChildren && isCtrlPressed ? " (Ctrl)" : ""
            const tooltipContent = (
              <div>
                <div>{tooltipText + modifierText}</div>
                <div className="text-xs text-gray-400 mt-1">
                  Hold <span className="font-mono">Ctrl</span> to temporarily enable
                </div>
              </div>
            )
            showTooltip(tooltipContent, e.currentTarget)
          }}
          onMouseLeave={hideTooltip}
          className={`${isCompactMode ? "w-8 h-8" : "w-9 h-10"} flex items-center justify-center rounded-xl shadow-lg transition-colors ${effectiveMoveWithChildren
              ? "bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg shadow-blue-500/25 text-white"
              : "bg-white/5 text-white hover:bg-white/10 border border-white/10"
            }`}
        >
          <GitBranch className={`${isCompactMode ? "w-4 h-4" : "w-5 h-5"}`} />
        </button>
        <button
          onClick={() => {
            setSnapToGrid(!snapToGrid)
            // Update tooltip immediately if it's currently showing for this button
            if (activeTooltip && activeTooltip.element) {
              const tooltipText = !effectiveSnapToGrid ? "Snap to Grid: On" : "Snap to Grid: Off"
              const modifierText = !snapToGrid && isAltPressed ? " (Alt)" : ""
              const tooltipContent = (
                <div>
                  <div>{tooltipText + modifierText}</div>
                  <div className="text-xs text-gray-400 mt-1">
                    Hold <span className="font-mono">Alt</span> to temporarily disable
                  </div>
                </div>
              )
              setActiveTooltip({ content: tooltipContent, element: activeTooltip.element })
            }
          }}
          onMouseEnter={(e) => {
            const tooltipText = effectiveSnapToGrid ? "Snap to Grid: On" : "Snap to Grid: Off"
            const modifierText = snapToGrid && isAltPressed ? " (Alt)" : ""
            const tooltipContent = (
              <div>
                <div>{tooltipText + modifierText}</div>
                <div className="text-xs text-gray-400 mt-1">
                  Hold <span className="font-mono">Alt</span> to temporarily disable
                </div>
              </div>
            )
            showTooltip(tooltipContent, e.currentTarget)
          }}
          onMouseLeave={hideTooltip}
          className={`${isCompactMode ? "mt-1 w-8 h-8" : "mt-2 w-9 h-10"} flex items-center justify-center rounded-xl shadow-lg transition-colors ${effectiveSnapToGrid
              ? "bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg shadow-blue-500/25 text-white"
              : "bg-white/5 text-white hover:bg-white/10 border border-white/10"
            }`}
        >
          <Grid3X3 className={`${isCompactMode ? "w-4 h-4" : "w-5 h-5"}`} />
        </button>
        <button
          onClick={() => {
            setAutocolorSubnodes(!autocolorSubnodes)
            // Update tooltip immediately if it's currently showing for this button
            if (activeTooltip && activeTooltip.element) {
              const tooltipText = !autocolorSubnodes ? "Autocolor Subnodes: On" : "Autocolor Subnodes: Off"
              setActiveTooltip({ content: tooltipText, element: activeTooltip.element })
            }
          }}
          onMouseEnter={(e) => {
            const tooltipText = autocolorSubnodes ? "Autocolor Subnodes: On" : "Autocolor Subnodes: Off"
            showTooltip(tooltipText, e.currentTarget)
          }}
          onMouseLeave={hideTooltip}
          className={`${isCompactMode ? "mt-1 w-8 h-8" : "mt-2 w-9 h-10"} flex items-center justify-center rounded-xl shadow-lg transition-colors ${autocolorSubnodes
              ? "bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg shadow-blue-500/25 text-white"
              : "bg-white/5 text-white hover:bg-white/10 border border-white/10"
            }`}
        >
          <Palette className={`${isCompactMode ? "w-4 h-4" : "w-5 h-5"}`} />
        </button>
        <button
          onClick={() => {
            const newPenMode = !isPenMode
            setIsPenMode(newPenMode)

            // Dispatch custom event to notify MindMap component
            const event = new CustomEvent("pen-mode-changed", {
              detail: { isPenMode: newPenMode },
            })
            document.dispatchEvent(event)
          }}
          onMouseEnter={(e) => showTooltip(isPenMode ? "Switch to Cursor Mode" : "Switch to Pen Mode", e.currentTarget)}
          onMouseLeave={hideTooltip}
          className={`${isCompactMode ? "mt-1 w-8 h-8" : "mt-2 w-9 h-10"} flex items-center justify-center rounded-xl shadow-lg transition-colors ${isPenMode
              ? "bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg shadow-blue-500/25 text-white"
              : "bg-white/5 text-white hover:bg-white/10 border border-white/10"
            }`}
        >
          {isPenMode ? (
            <Edit3 className={`${isCompactMode ? "w-4 h-4" : "w-5 h-5"}`} />
          ) : (
            <MousePointer className={`${isCompactMode ? "w-4 h-4" : "w-5 h-5"}`} />
          )}
        </button>
      </div>
      <button
        onClick={() => setIsMinimized(!isMinimized)}
        className="absolute -right-4 top-1/2 -translate-y-1/2 w-8 h-12 flex items-center justify-center shadow-lg transition-transform hover:scale-105 bg-gradient-to-r from-slate-700 to-slate-800 border border-slate-600/30 rounded-r-xl"
      >
        <ChevronRight
          className={`w-4 h-4 text-white transform transition-transform duration-300 ${isMinimized ? "" : "rotate-180"
            }`}
        />
      </button>
      {renderTooltip()}
    </div>
  )
}
