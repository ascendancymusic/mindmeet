"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import {
  Keyboard,
  TextCursor,
  Link,
  Youtube,
  ImageIcon,
  Network,
  Instagram,
  Twitter,
  Facebook,
  AudioWaveform,
  ListMusic,
  Users,
  Mouse,
  Palette,
  Brain,
  Search,
  Copy,
  Trash2,
  RotateCcw,
  Move,
  ChevronLeft,
  ChevronRight,
  Settings,
  Pen,
  Hand,
  Save,
  MoreHorizontal,
} from "lucide-react"
import { Modal } from "./Modal"
import { TikTokIcon } from "./icons/TikTokIcon"
import { SpotifyIcon } from "./icons/SpotifyIcon"
import { SoundCloudIcon } from "./icons/SoundCloudIcon"

interface MindMapHelpModalProps {
  isOpen: boolean
  onClose: () => void
}

interface NodeTypeInfo {
  id: string
  icon: React.ReactNode
  label: string
  description: string
  usage: string
  category: "basic" | "music" | "social"
}

interface HelpSection {
  id: string
  title: string
  icon: React.ReactNode
  content: React.ReactNode
}

const nodeTypesInfo: NodeTypeInfo[] = [
  {
    id: "default",
    icon: <TextCursor className="w-5 h-5" />,
    label: "Text Node",
    description: "Add simple text content to your mind map.",
    usage: "Perfect for notes, ideas, and basic information. Click to edit the text directly.",
    category: "basic",
  },
  {
    id: "link",
    icon: <Link className="w-5 h-5" />,
    label: "Link Node",
    description: "Add clickable URLs to external websites.",
    usage: "Enter any URL and it will become a clickable link. Great for references and resources.",
    category: "basic",
  },
  {
    id: "youtube-video",
    icon: <Youtube className="w-5 h-5" />,
    label: "YouTube Video",
    description: "Embed YouTube videos directly in your mind map.",
    usage:
      "Simply search a video or paste YouTube URL to embed the video. Videos can be played without leaving your mindmap.",
    category: "basic",
  },
  {
    id: "image",
    icon: <ImageIcon className="w-5 h-5" />,
    label: "Image Node",
    description: "Upload and display images in your mind map.",
    usage:
      "Upload images from your device. You can also drag and drop images from your file explorer or from the internet.",
    category: "basic",
  },
  {
    id: "mindmap",
    icon: <Network className="w-5 h-5" />,
    label: "Mindmap Node",
    description: "Embed another mind map within your current one.",
    usage: "Create hierarchical mind maps by linking to other mind maps you've created.",
    category: "basic",
  },
  {
    id: "spotify",
    icon: <SpotifyIcon className="w-5 h-5" />,
    label: "Spotify song",
    description: "Embed Spotify songs",
    usage:
      "Simply search a song or paste a Spotify URL to embed playable song directly in your mindmap. NOTE: You must be logged in to Spotify to listen to the full song.",
    category: "music",
  },
  {
    id: "soundcloud",
    icon: <SoundCloudIcon className="w-5 h-5" />,
    label: "SoundCloud Track",
    description: "Embed SoundCloud audio tracks.",
    usage: "Share SoundCloud tracks and podcasts by pasting SoundCloud URLs.",
    category: "music",
  },
  {
    id: "audio",
    icon: <AudioWaveform className="w-5 h-5" />,
    label: "Audio File",
    description: "Upload and play audio files.",
    usage: "Upload MP3, WAV, or other audio files to create playable audio nodes. NOTE: Currently unstable",
    category: "music",
  },
  {
    id: "playlist",
    icon: <ListMusic className="w-5 h-5" />,
    label: "Playlist",
    description: "Create custom playlists with multiple tracks.",
    usage:
      'Combine multiple music tracks into organized playlists within your mind map. Click "+ Add" and then click on any audio, Spotify, SoundCloud, or YouTube video node to add it to the playlist.',
    category: "music",
  },
  {
    id: "instagram",
    icon: <Instagram className="w-5 h-5" />,
    label: "Instagram",
    description: "Link to Instagram profiles and posts.",
    usage: "Share Instagram profiles or specific posts by adding Instagram URLs.",
    category: "social",
  },
  {
    id: "twitter",
    icon: <Twitter className="w-5 h-5" />,
    label: "Twitter/X",
    description: "Link to Twitter/X profiles and tweets.",
    usage: "Share Twitter profiles or specific tweets by adding Twitter URLs.",
    category: "social",
  },
  {
    id: "facebook",
    icon: <Facebook className="w-5 h-5" />,
    label: "Facebook",
    description: "Link to Facebook profiles and pages.",
    usage: "Share Facebook profiles, pages, or posts by adding Facebook URLs.",
    category: "social",
  },
  {
    id: "youtube",
    icon: <Youtube className="w-5 h-5" />,
    label: "YouTube Channel",
    description: "Link to YouTube channels and profiles.",
    usage: "Share YouTube channels by adding channel URLs (different from video embedding).",
    category: "social",
  },
  {
    id: "tiktok",
    icon: <TikTokIcon className="w-5 h-5" />,
    label: "TikTok",
    description: "Link to TikTok profiles and videos.",
    usage: "Share TikTok profiles or specific videos by adding TikTok URLs.",
    category: "social",
  },
]

// Shared styles to keep consistency with your MindMapCustomization modal
const shell =
  "p-6 max-w-4xl bg-gradient-to-br from-slate-800/90 via-slate-900/90 to-purple-900/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/10 max-h-[90vh] overflow-hidden flex flex-col"
const tabsBar = "flex flex-wrap gap-1 mb-4 p-1 rounded-2xl border border-white/10 bg-white/5 shadow-sm"
const tabBase =
  "flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/50"
const tabActive = "bg-gradient-to-r from-blue-500/90 to-purple-600/90 text-white shadow-lg shadow-blue-500/25"
const tabIdle = "text-slate-300 hover:bg-white/10 hover:text-white"
const sectionCard = "bg-white/5 rounded-2xl p-4 border border-white/10"

export function MindMapHelpModal({ isOpen, onClose }: MindMapHelpModalProps) {
  const [selectedNodeType, setSelectedNodeType] = useState<NodeTypeInfo | null>(null)
  const [activeCategory, setActiveCategory] = useState<"basic" | "music" | "social">("basic")
  const [currentSection, setCurrentSection] = useState(0)
  const [contentHeight, setContentHeight] = useState<number | null>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  // Measure content height when section changes
  useEffect(() => {
    const measureHeight = () => {
      if (contentRef.current) {
        // Force a reflow to get accurate measurements
        contentRef.current.style.height = 'auto'
        const height = contentRef.current.scrollHeight
        setContentHeight(height)
      }
    }

    // Use requestAnimationFrame to ensure DOM has updated
    const timeoutId = setTimeout(measureHeight, 50)

    return () => clearTimeout(timeoutId)
  }, [currentSection, selectedNodeType, activeCategory])

  // Also measure on window resize
  useEffect(() => {
    const handleResize = () => {
      if (contentRef.current) {
        const height = contentRef.current.scrollHeight
        setContentHeight(height)
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Keyboard navigation for sections: Left/Right
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") nextSection()
      if (e.key === "ArrowLeft") prevSection()
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [isOpen, currentSection])

  const helpSections: HelpSection[] = [
    {
      id: "getting-started",
      title: "Getting Started",
      icon: <Hand className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <div className={sectionCard}>
            <h4 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2">
              <Move className="w-5 h-5 text-blue-300" />
              Basic Navigation
            </h4>
            <div className="space-y-3 text-slate-300 text-sm">
              {[
                {
                  color: "bg-blue-400",
                  label: (
                    <>
                      <strong className="text-blue-300">Moving Around:</strong> Click and drag on empty space to pan the
                      canvas
                    </>
                  ),
                },
                {
                  color: "bg-blue-400",
                  label: (
                    <>
                      <strong className="text-blue-300">Zooming:</strong> Use mouse wheel to zoom in/out, or use the
                      controls in bottom-left corner
                    </>
                  ),
                },
                {
                  color: "bg-blue-400",
                  label: (
                    <>
                      <strong className="text-blue-300">Adding Nodes:</strong> Use the vertical toolbar on the left to
                      drag and drop different node types
                    </>
                  ),
                },
                {
                  color: "bg-blue-400",
                  label: (
                    <>
                      <strong className="text-blue-300">Selecting Nodes:</strong> Click on any node to select and edit
                      it in the right panel
                    </>
                  ),
                },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className={`w-2 h-2 ${item.color} rounded-full mt-2`} />
                  <div>{item.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className={sectionCard}>
            <h4 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2">
              <Network className="w-5 h-5 text-green-300" />
              Connecting Nodes
            </h4>
            <div className="space-y-3 text-slate-300 text-sm">
              {[
                {
                  color: "bg-green-400",
                  label: (
                    <>
                      <strong className="text-green-300">Creating Connections:</strong> Drag from the bottom handle of a
                      node to the top handle of another node
                    </>
                  ),
                },
                {
                  color: "bg-green-400",
                  label: (
                    <>
                      <strong className="text-green-300">Auto-coloring:</strong> Child nodes automatically inherit their
                      parent's color (can be disabled in left toolbar)
                    </>
                  ),
                },
                {
                  color: "bg-green-400",
                  label: (
                    <>
                      <strong className="text-green-300">Reconnecting:</strong> Drag an existing connection to a
                      different node to reconnect it
                    </>
                  ),
                },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className={`w-2 h-2 ${item.color} rounded-full mt-2`} />
                  <div>{item.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl p-4 border border-blue-400/40 bg-gradient-to-r from-blue-900/20 to-purple-900/20">
            <div className="flex items-center gap-2 mb-2">
              <div className="text-2xl">💡</div>
              <h4 className="font-semibold text-blue-200">Pro Tip</h4>
            </div>
            <p className="text-blue-100 text-sm leading-relaxed">
              Start with the root node (center) and build outward. Use different node types to create rich, multimedia
              mind maps with videos, images, music, and links!
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "keyboard-shortcuts",
      title: "Keyboard Shortcuts",
      icon: <Keyboard className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <div className={sectionCard}>
            <h4 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-blue-300" />
              History & Editing
            </h4>
            <div className="space-y-2">
              {[
                ["Undo", "Ctrl + Z"],
                ["Redo", "Ctrl + Y"],
                ["Save Changes", "Ctrl + S"],
                ["Search Nodes", "Ctrl + F"],
              ].map(([label, keys]) => (
                <div key={label} className="flex justify-between items-center">
                  <span className="text-slate-300 text-sm">{label}</span>
                  <kbd className="px-2 py-1 bg-slate-800/70 rounded text-xs text-blue-300 border border-white/10">
                    {keys}
                  </kbd>
                </div>
              ))}
            </div>
          </div>

          <div className={sectionCard}>
            <h4 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2">
              <Copy className="w-5 h-5 text-green-300" />
              Selection & Clipboard
            </h4>
            <div className="space-y-2">
              {[
                ["Copy Selected Nodes", "Ctrl + C"],
                ["Cut Selected Nodes", "Ctrl + X"],
                ["Paste Nodes/Images", "Ctrl + V"],
                ["Multi-Select", "Shift + Drag"],
              ].map(([label, keys]) => (
                <div key={label} className="flex justify-between items-center">
                  <span className="text-slate-300 text-sm">{label}</span>
                  <kbd className="px-2 py-1 bg-slate-800/70 rounded text-xs text-green-300 border border-white/10">
                    {keys}
                  </kbd>
                </div>
              ))}
            </div>
          </div>

          <div className={sectionCard}>
            <h4 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-300" />
              Deletion & Movement
            </h4>
            <div className="space-y-2">
              {[
                ["Delete Selected (Non-cascading)", "Delete"],
                ["Delete Selected (Non-cascading)", "Backspace"],
                ["Move Node with Children", "Ctrl + Drag"],
                ["Override Snap to Grid", "Alt + Drag"],
              ].map(([label, keys]) => (
                <div key={label + keys} className="flex justify-between items-center">
                  <span className="text-slate-300 text-sm">{label}</span>
                  <kbd className="px-2 py-1 bg-slate-800/70 rounded text-xs text-red-300 border border-white/10">
                    {keys}
                  </kbd>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl p-4 border border-amber-400/40 bg-gradient-to-r from-amber-900/20 to-orange-900/20">
            <div className="flex items-center gap-2 mb-2">
              <div className="text-2xl">⚠️</div>
              <h4 className="font-semibold text-amber-200">Important Note</h4>
            </div>
            <p className="text-amber-100 text-sm leading-relaxed">
              <strong>Delete vs Cascading Delete:</strong> The Delete/Backspace keys perform non-cascading deletion
              (only selected nodes). For cascading deletion (node + all children), use the delete button in the node
              editor panel.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "mouse-controls",
      title: "Mouse Controls",
      icon: <Mouse className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <div className={sectionCard}>
            <h4 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2">
              <Mouse className="w-5 h-5 text-blue-300" />
              Basic Mouse Actions
            </h4>
            <div className="space-y-3 text-slate-300 text-sm">
              <div className="flex items-start gap-3">
                <div className="min-w-[90px] flex items-center gap-1 text-blue-300 font-medium">
                  <div className="w-4 h-4 bg-blue-500/20 rounded border border-blue-400 flex items-center justify-center">
                    <div className="w-1 h-1 bg-blue-400 rounded-full" />
                  </div>
                  Left Click
                </div>
                <div>Select nodes, click buttons, edit text fields</div>
              </div>
              <div className="flex items-start gap-3">
                <div className="min-w-[90px] flex items-center gap-1 text-green-300 font-medium">
                  <div className="w-4 h-4 bg-green-500/20 rounded border border-green-400 flex items-center justify-center">
                    <div className="w-1 h-1 bg-green-400 rounded-full" />
                  </div>
                  Right Click
                </div>
                <div>Open context menu on nodes. Open context menu on an empty area</div>
              </div>
              <div className="flex items-start gap-3">
                <div className="min-w-[90px] flex items-center gap-1 text-purple-300 font-medium">
                  <div className="w-4 h-4 bg-purple-500/20 rounded border border-purple-400 flex items-center justify-center">
                    <div className="w-2 h-1 bg-purple-400 rounded-full" />
                  </div>
                  Scroll
                </div>
                <div>Zoom in/out on the canvas</div>
              </div>
              <div className="flex items-start gap-3">
                <div className="min-w-[90px] flex items-center gap-1 text-orange-300 font-medium">
                  <Move className="w-4 h-4" />
                  Drag
                </div>
                <div>Move nodes, pan canvas, create connections, multi-select</div>
              </div>
            </div>
          </div>

          <div className={sectionCard}>
            <h4 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2">
              <MoreHorizontal className="w-5 h-5 text-green-300" />
              Context Menu Actions
            </h4>
            <div className="space-y-3 text-slate-300 text-sm">
              <div className="rounded-xl p-3 border border-green-400/40 bg-green-900/20">
                <p className="text-green-200 mb-2">
                  <strong>Right-click on any node</strong> to access these options:
                </p>
                <div className="space-y-2 ml-4">
                  {["Auto-layout children nodes", "Bold text", "Copy node"].map(
                    (item) => (
                      <div key={item} className="flex items-center gap-2">
                        <div className="w-1 h-1 bg-green-400 rounded-full" />
                        <span>{item}</span>
                      </div>
                    ),
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className={sectionCard}>
            <h4 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2">
              <Copy className="w-5 h-5 text-purple-300" />
              Clipboard Operations (wrong info)
            </h4>
            <div className="space-y-3 text-slate-300 text-sm">
              <div className="rounded-xl p-3 border border-purple-400/40 bg-purple-900/20">
                <p className="text-purple-200 mb-2">
                  <strong>Copy/Cut nodes:</strong> Finish this section
                </p>
                <p className="text-purple-200 mb-2">
                  <strong>Paste nodes:</strong> Finish
                </p>
                <p className="text-purple-200">
                  <strong>Paste images:</strong> Copy images from anywhere and paste with Ctrl+V
                </p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "node-types",
      title: "Node Types",
      icon: <Network className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <div className={sectionCard}>
            {/* Category Selector */}
            <div className="flex flex-wrap gap-2 mb-4">
              {(["basic", "music", "social"] as const).map((category) => (
                <button
                  key={category}
                  onClick={() => {
                    setActiveCategory(category)
                    setSelectedNodeType(null)
                  }}
                  className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/50 ${activeCategory === category
                      ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg"
                      : "bg-white/5 text-slate-300 hover:bg-white/10 border border-white/10"
                    }`}
                >
                  {category === "basic" && "Basic"}
                  {category === "music" && "Music"}
                  {category === "social" && "Social"}
                </button>
              ))}
            </div>

            {/* Node Types Grid and Details */}
            {activeCategory !== "social" ? (
              <>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {nodeTypesInfo
                    .filter((nodeType) => nodeType.category === activeCategory)
                    .map((nodeType) => (
                      <button
                        key={nodeType.id}
                        onClick={() => setSelectedNodeType(nodeType)}
                        className={`p-2.5 rounded-xl border transition-all duration-200 hover:scale-[1.02] ${selectedNodeType?.id === nodeType.id
                            ? "bg-blue-600/20 border-blue-400 ring-2 ring-blue-400/40"
                            : "bg-white/5 border-white/10 hover:border-blue-400/40"
                          }`}
                      >
                        <div className="flex flex-col items-center gap-1.5">
                          <div className="text-blue-300">{nodeType.icon}</div>
                          <span className="text-xs text-slate-300 text-center font-medium leading-tight">
                            {nodeType.label}
                          </span>
                        </div>
                      </button>
                    ))}
                </div>
                {selectedNodeType ? (
                  <div className="rounded-xl p-3 border border-white/10 bg-white/5">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="text-blue-300">{selectedNodeType.icon}</div>
                      <h4 className="font-semibold text-slate-100">{selectedNodeType.label}</h4>
                    </div>
                    <p className="text-slate-300 text-sm mb-2 leading-relaxed">{selectedNodeType.description}</p>
                    <div className="rounded-lg p-2 border-l-2 border-blue-400 bg-blue-900/20">
                      <p className="text-blue-100 text-sm leading-relaxed">
                        <strong>How to use:</strong> {selectedNodeType.usage}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 text-slate-400">
                    <div className="text-xl mb-1">👆</div>
                    <p className="text-sm">Click on any node type above to learn more about it</p>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {nodeTypesInfo
                    .filter((nodeType) => nodeType.category === "social")
                    .map((nodeType) => (
                      <div
                        key={nodeType.id}
                        className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex flex-col items-center gap-1.5"
                      >
                        <div className="text-blue-300">{nodeType.icon}</div>
                        <span className="text-xs text-slate-300 text-center font-medium leading-tight">
                          {nodeType.label}
                        </span>
                      </div>
                    ))}
                </div>
                <div className="rounded-xl p-3 border border-white/10 bg-white/5 text-center">
                  <div className="flex justify-center mb-2">
                    <Users className="w-7 h-7 text-blue-300" />
                  </div>
                  <p className="text-slate-300 text-sm leading-relaxed">
                    <strong className="text-blue-300">Social Nodes:</strong> <br />
                    Simply type the username of the selected platform without any @ symbol. The node will automatically
                    link to the correct profile.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      ),
    },
    {
      id: "advanced-features",
      title: "Advanced Features",
      icon: <Settings className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <div className={sectionCard}>
            <h4 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2">
              <Brain className="w-5 h-5 text-green-300" />
              AI Features
            </h4>
            <div className="space-y-3 text-slate-300 text-sm">
              {[
                ["AI Fill (Root Node):", "Generate entire mindmap structures automatically"],
                ["AI Fill (Any Node):", "Add AI-generated child nodes to expand branches"],
                ["Smart Expansion:", "AI considers existing structure when adding new content"],
              ].map(([title, body]) => (
                <div key={title} className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full mt-2" />
                  <div>
                    <strong className="text-green-300">{title}</strong> {body}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={sectionCard}>
            <h4 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2">
              <Pen className="w-5 h-5 text-purple-300" />
              Drawing Tools
            </h4>
            <div className="space-y-3 text-slate-300 text-sm">
              {[
                ["Pen Tool:", "Draw freehand annotations and sketches"],
                ["Shape Tools:", "Add rectangles, circles, triangles, and lines"],
                ["Eraser:", "Remove parts of drawings or entire strokes"],
                ["Customization:", "Adjust colors, line width, and opacity"],
              ].map(([title, body]) => (
                <div key={title} className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-purple-400 rounded-full mt-2" />
                  <div>
                    <strong className="text-purple-300">{title}</strong> {body}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={sectionCard}>
            <h4 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2">
              <Search className="w-5 h-5 text-blue-300" />
              Search & Navigation
            </h4>
            <div className="space-y-3 text-slate-300 text-sm">
              {[
                ["Node Search:", "Press Ctrl+F to search through all node content"],
                ["Navigation:", "Use Enter/Shift+Enter to jump between search results"],
                ["Auto-focus:", "Search automatically centers on found nodes"],
              ].map(([title, body]) => (
                <div key={title} className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-blue-400 rounded-full mt-2" />
                  <div>
                    <strong className="text-blue-300">{title}</strong> {body}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={sectionCard}>
            <h4 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2">
              <Palette className="w-5 h-5 text-pink-300" />
              Customization
            </h4>
            <div className="space-y-3 text-slate-300 text-sm">
              {[
                ["Node Colors:", "Change individual node colors or use auto-coloring"],
                ["Background:", "Customize canvas background color"],
                ["Connection Styles:", "Choose between default, straight, or smooth step edges"],
                ["Grid Dots:", "Customize the color of background grid dots"],
              ].map(([title, body]) => (
                <div key={title} className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-pink-400 rounded-full mt-2" />
                  <div>
                    <strong className="text-pink-300">{title}</strong> {body}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "collaboration",
      title: "Collaboration",
      icon: <Users className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <div className={sectionCard}>
            <h4 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-300" />
              Real-time Collaboration
            </h4>
            <div className="space-y-3 text-slate-300 text-sm">
              {[
                ["Live Cursors:", "See other collaborators' cursors moving in real-time"],
                ["Instant Updates:", "All changes are synchronized immediately across all users"],
                ["Collaborator List:", "View all active collaborators in the top-left area"],
                ["Chat Integration:", "Communicate with team members while editing"],
              ].map(([title, body]) => (
                <div key={title} className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-blue-400 rounded-full mt-2" />
                  <div>
                    <strong className="text-blue-300">{title}</strong> {body}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={sectionCard}>
            <h4 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2">
              <Save className="w-5 h-5 text-green-300" />
              Saving & Autosave
            </h4>
            <div className="space-y-3 text-slate-300 text-sm">
              {[
                ["Manual Save:", "Use Ctrl+S or the save button to save changes"],
                ["Autosave Options:", "Configure automatic saving at 5min, 10min, or custom intervals"],
                ["Unsaved Changes:", "Visual indicators show when you have unsaved changes"],
              ].map(([title, body]) => (
                <div key={title} className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full mt-2" />
                  <div>
                    <strong className="text-green-300">{title}</strong> {body}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl p-4 border border-amber-400/40 bg-gradient-to-r from-amber-900/20 to-orange-900/20">
            <div className="flex items-center gap-2 mb-2">
              <div className="text-2xl">⚠️</div>
              <h4 className="font-semibold text-amber-200">Collaboration Tips</h4>
            </div>
            <div className="space-y-2 text-amber-100 text-sm">
              <p>• Communicate with your team using the built-in chat feature</p>
              <p>• Be mindful that autosave prevents undo after saving</p>
              <p>• Use different areas of the mindmap to avoid conflicts</p>
              <p>• Save frequently when working on important changes</p>
            </div>
          </div>
        </div>
      ),
    },
  ]

  const nextSection = () => setCurrentSection((prev) => (prev + 1) % helpSections.length)
  const prevSection = () => setCurrentSection((prev) => (prev - 1 + helpSections.length) % helpSections.length)

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className={shell}>
        {/* Header */}
        <div className="flex items-center justify-between mb-5 flex-shrink-0">
          <h2 className="text-xl font-bold flex items-center gap-3 bg-gradient-to-r from-white to-slate-200 bg-clip-text text-transparent">
            <div className="p-2 rounded-2xl border border-white/10 bg-gradient-to-br from-blue-500/20 to-purple-500/20">
              {helpSections[currentSection].icon}
            </div>
            MindMap Help — {helpSections[currentSection].title}
          </h2>
        </div>

        {/* Navigation Tabs */}
        <div className={tabsBar} role="tablist" aria-label="Help sections">
          {helpSections.map((section, index) => {
            const active = currentSection === index
            return (
              <button
                key={section.id}
                role="tab"
                aria-selected={active}
                aria-controls={`section-${section.id}`}
                onClick={() => setCurrentSection(index)}
                className={`${tabBase} ${active ? tabActive : tabIdle}`}
              >
                {section.icon}
                <span className="hidden sm:inline">{section.title}</span>
              </button>
            )
          })}
        </div>

        {/* Content Area */}
        <div
          id={`section-${helpSections[currentSection].id}`}
          role="tabpanel"
          className="overflow-y-auto pr-1 -mr-1 scrollbar-thin scrollbar-thumb-slate-600/70 scrollbar-track-transparent transition-all duration-300 ease-in-out"
          style={{
            height: contentHeight ? `${Math.min(contentHeight + 20, window.innerHeight * 0.6)}px` : '400px',
            minHeight: '300px',
            maxHeight: '600px'
          }}
        >
          <div ref={contentRef}>
            {helpSections[currentSection].content}
          </div>
        </div>

        {/* Navigation Footer */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/10 flex-shrink-0">
          <button
            onClick={prevSection}
            className="flex items-center gap-2 px-4 py-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl border border-white/10 transition-all duration-200"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>

          <div className="flex items-center gap-2">
            {helpSections.map((_, index) => (
              <div
                key={index}
                className={`h-2 w-2 rounded-full transition-all duration-200 ${currentSection === index ? "bg-blue-400 shadow-[0_0_0_3px_rgba(59,130,246,0.25)]" : "bg-slate-600"
                  }`}
                aria-label={`Go to ${helpSections[index].title}`}
              />
            ))}
          </div>

          <button
            onClick={nextSection}
            className="flex items-center gap-2 px-4 py-2 text-white rounded-xl border border-white/10 bg-gradient-to-r from-slate-600/80 to-slate-700/80 shadow-lg transition-all duration-200 hover:from-slate-500/80 hover:to-slate-600/80"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </Modal>
  )
}
