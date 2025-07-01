"use client"

import type React from "react"
import { useState, useEffect } from "react"
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
  maxHeight: string
  onUndo: () => void
  onRedo: () => void
  canUndo: boolean
  canRedo: boolean
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
    label: "Add Mind Map",
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
  maxHeight,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}: NodeTypesMenuProps) {
  const [isMusicDropdownOpen, setIsMusicDropdownOpen] = useState(false)
  const [isSocialDropdownOpen, setIsSocialDropdownOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  //const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Control") {
        setMoveWithChildren(true)
      }
    }

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === "Control") {
        setMoveWithChildren(false)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
    }
  }, [setMoveWithChildren])

  const handleDragStart = (event: React.DragEvent, type: string) => {
    onDragStart(type)
    event.dataTransfer.setData("application/reactflow-type", type)
    event.dataTransfer.effectAllowed = "move"
  }

  return (
    <div className="relative" style={{ isolation: "isolate" }}>
      <div
        className={`space-y-2 p-2 rounded-lg shadow-lg overflow-y-auto transition-all duration-300 ease-in-out ${
          isMinimized ? "w-0 p-0 opacity-0" : "w-auto opacity-100"
        } bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-xl border border-slate-700/50 shadow-xl`}
        style={{
          maxHeight,
          scrollbarColor: "rgb(147, 34, 192) rgb(34, 34, 44)",
          scrollbarWidth: "thin",
          overflowX: "hidden",
        }}
      >
        <div className="flex justify-between items-center mb-2">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className={`p-1 rounded-lg hover:bg-slate-700/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${!canUndo ? "text-gray-400" : "text-white"}`}
          >
            <Undo className="w-5 h-5" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className={`p-1 rounded-lg hover:bg-slate-700/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${!canRedo ? "text-gray-400" : "text-white"}`}
          >
            <Redo className="w-5 h-5" />
          </button>
        </div>

        {nodeTypes.map((nodeType) => (
          <div key={nodeType.id} className="relative">
            <div
              draggable
              onDragStart={(e) => handleDragStart(e, nodeType.type)}
              className="group w-9 h-10 flex items-center justify-center text-white rounded-lg cursor-move shadow-md transition-all duration-300 bg-gradient-to-br from-slate-700/80 to-slate-800/80 backdrop-blur-sm border border-slate-600/30 hover:from-slate-600/80 hover:to-slate-700/80 hover:border-slate-500/50 shadow-lg shadow-slate-900/25"
            >
              {nodeType.icon}
            </div>
            <div
              className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-3 py-1.5 bg-slate-800/95 backdrop-blur-xl border border-slate-700/50 shadow-xl text-white text-sm rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap"
              style={{ zIndex: 9999 }}
            >
              {nodeType.label}
            </div>
          </div>
        ))}

        <div className="relative">
          <button
            onClick={() => setIsMusicDropdownOpen((prev) => !prev)}
            className={`group w-9 h-10 flex items-center justify-center text-white rounded-lg shadow-md transition-all duration-300 ${
              isMusicDropdownOpen ? "ring-2 ring-slate-500/50" : ""
            } bg-gradient-to-br from-slate-700/80 to-slate-800/80 backdrop-blur-sm border border-slate-600/30 hover:from-slate-600/80 hover:to-slate-700/80 hover:border-slate-500/50`}
          >
            <div className="flex items-center">
              <Music className="w-5 h-5" />
              <ChevronDown
                className={`w-3 h-3 ml-0.5 transition-transform duration-200 ${isMusicDropdownOpen ? "rotate-180" : ""}`}
              />
            </div>
          </button>
          <div
            className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-3 py-1.5 bg-slate-800/95 backdrop-blur-xl border border-slate-700/50 shadow-xl text-white text-sm rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap"
            style={{ zIndex: 9999 }}
          >
            Add Music
          </div>
          {isMusicDropdownOpen && (
            <div
              className="mt-2 max-h-36 overflow-y-auto p-2 rounded-lg shadow-lg bg-slate-800/95 backdrop-blur-xl border border-slate-700/50"
              style={{
                scrollbarColor: "rgb(147, 34, 192) rgb(34, 34, 44)",
                scrollbarWidth: "thin",
                overflowX: "hidden",
              }}
            >
              {musicTypes.map((musicType) => (
                <div key={musicType.id} className="relative">
                  <div
                    draggable
                    onDragStart={(e) => handleDragStart(e, musicType.type)}
                    className="group w-9 h-10 flex items-center justify-center text-white rounded-lg cursor-move shadow transition-all duration-300 mb-2 bg-gradient-to-br from-slate-700/80 to-slate-800/80 backdrop-blur-sm border border-slate-600/30 hover:from-slate-600/80 hover:to-slate-700/80 hover:border-slate-500/50 shadow-lg shadow-slate-900/25"
                  >
                    {musicType.icon}
                  </div>
                  <div
                    className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-3 py-1.5 bg-slate-800/95 backdrop-blur-xl border border-slate-700/50 shadow-xl text-white text-sm rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap"
                    style={{ zIndex: 9999 }}
                  >
                    {musicType.label}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => setIsSocialDropdownOpen((prev) => !prev)}
            className={`group w-9 h-10 flex items-center justify-center text-white rounded-lg shadow-md transition-all duration-300 ${
              isSocialDropdownOpen ? "ring-2 ring-slate-500/50" : ""
            } bg-gradient-to-br from-slate-700/80 to-slate-800/80 backdrop-blur-sm border border-slate-600/30 hover:from-slate-600/80 hover:to-slate-700/80 hover:border-slate-500/50`}
          >
            <div className="flex items-center">
              <Users className="w-5 h-5" />
              <ChevronDown
                className={`w-3 h-3 ml-0.5 transition-transform duration-200 ${isSocialDropdownOpen ? "rotate-180" : ""}`}
              />
            </div>
          </button>
          <div
            className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-3 py-1.5 bg-slate-800/95 backdrop-blur-xl border border-slate-700/50 shadow-xl text-white text-sm rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap"
            style={{ zIndex: 9999 }}
          >
            Social Media
          </div>
          {isSocialDropdownOpen && (
            <div
              className="mt-2 max-h-36 overflow-y-auto p-2 rounded-lg shadow-lg bg-slate-800/95 backdrop-blur-xl border border-slate-700/50"
              style={{
                scrollbarColor: "rgb(59, 130, 246) rgb(34, 34, 44)",
                scrollbarWidth: "thin",
                overflowX: "hidden",
              }}
            >
              {socialMediaTypes.map((socialType) => (
                <div key={socialType.id} className="relative">
                  <div
                    draggable
                    onDragStart={(e) => handleDragStart(e, socialType.type)}
                    className="group w-9 h-10 flex items-center justify-center text-white rounded-lg cursor-move shadow transition-all duration-300 mb-2 bg-gradient-to-br from-slate-700/80 to-slate-800/80 backdrop-blur-sm border border-slate-600/30 hover:from-slate-600/80 hover:to-slate-700/80 hover:border-slate-500/50 shadow-lg shadow-slate-900/25"
                  >
                    {socialType.icon}
                  </div>
                  <div
                    className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-3 py-1.5 bg-slate-800/95 backdrop-blur-xl border border-slate-700/50 shadow-xl text-white text-sm rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap"
                    style={{ zIndex: 9999 }}
                  >
                    {socialType.label}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="relative">
          <button
            onClick={() => setMoveWithChildren(!moveWithChildren)}
            className={`mt-4 w-9 h-10 flex items-center justify-center rounded-lg shadow-lg transition-colors ${
              moveWithChildren
                ? "bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg shadow-blue-500/25 text-white"
                : "bg-slate-700/50 text-white hover:bg-slate-600/50"
            } group`}
            title={moveWithChildren ? "Disable moving subnodes together" : "Enable moving subnodes together"}
          >
            <GitBranch className="w-5 h-5" />
          </button>
          <div
            className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-3 py-1.5 bg-slate-800/95 backdrop-blur-xl border border-slate-700/50 shadow-xl text-white text-sm rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap"
            style={{ zIndex: 9999 }}
          >
            {moveWithChildren ? "Subnodes Moving: On" : "Subnodes Moving: Off"}
          </div>
        </div>
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
    </div>
  )
}
