"use client"

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { createPortal } from "react-dom"
import { useNavigate, useLocation } from "react-router-dom"
import { usePageTitle } from "../hooks/usePageTitle"
import {
  Network,
  Plus,
  Clock,
  Edit2,
  Trash2,
  Link,
  MoreVertical,
  EyeOff,
  Eye,
  AlertTriangle,
  Pin,
  Star,
  Users,
  FolderPlus,
  Folder,
  FolderOpen,
  X,
  Check,
  Briefcase,
  Heart,
  Lightbulb,
  Target,
  Zap,
  Coffee,
  Book,
  Palette,
  Music,
  Search,
  Info,
} from "lucide-react"
import { type ReactFlowInstance } from "reactflow"
import "reactflow/dist/style.css"
import { useMindMapStore } from "../store/mindMapStore"
import { formatDateWithPreference } from "../utils/dateUtils"
import { useAuthStore } from "../store/authStore"
import { useToastStore } from "../store/toastStore"
import EditDetailsModal from "../components/EditDetailsModal"
import PublishSuccessModal from "../components/PublishSuccessModal"
import CloneSuccessModal from "../components/CloneSuccessModal"
import CreateMindmapModal from "../components/CreateMindmapModal"
import { supabase } from "../supabaseClient"
import { useNotificationStore } from '../store/notificationStore';
import InfoModal from "../components/InfoModal"
import MindMapRenderer from "../components/MindMapRenderer"

// Add shimmer animation styles
const shimmerStyles = `
  @keyframes shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }
  .animate-shimmer {
    animation: shimmer 2s infinite;
  }
`

// Inject styles into the document head
if (typeof document !== "undefined") {
  const styleSheet = document.createElement("style")
  styleSheet.type = "text/css"
  styleSheet.innerText = shimmerStyles
  document.head.appendChild(styleSheet)
}

interface Group {
  id: string
  name: string
  mindmapIds: string[] // stores mindmap permalinks (legacy name retained)
  createdAt: number
  icon: string
  color?: string // legacy optional color support for existing styling
}

// Memoized ReactFlow preview component to prevent unnecessary re-renders
const MindMapPreview = React.memo(({ map, isSmallScreen, onInit }: {
  map: any,
  isSmallScreen: boolean,
  onInit: (instance: any) => void
}) => {
  if (!map.nodes?.length) {
    return (
      <div className="h-full flex items-center justify-center rounded-xl relative overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            backgroundColor: map.backgroundColor || "rgba(30, 41, 59, 0.3)",
          }}
        />
        <div className="relative z-10 text-slate-400 text-center">
          <Network className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Empty mindmap</p>
        </div>
      </div>
    )
  }

  return (
    <MindMapRenderer
      mindMapData={{
        nodes: map.nodes || [],
        edges: map.edges || [],
        backgroundColor: map.backgroundColor,
        fontFamily: map.fontFamily,
        edgeType: map.edgeType as 'default' | 'straight' | 'smoothstep' | undefined,
      }}
      drawingData={map.drawingData}
      interactive={false}
      zoomable={!isSmallScreen}
      pannable={!isSmallScreen}
      doubleClickZoom={false}
      selectable={false}
      preventScrolling={isSmallScreen}
      minZoom={0.1}
      maxZoom={2}
      onInit={onInit}
      className="react-flow-instance"
    />
  )
}, (prevProps, nextProps) => {
  // Custom comparison function for React.memo
  return (
    prevProps.map.id === nextProps.map.id &&
    prevProps.map.updatedAt === nextProps.map.updatedAt &&
    prevProps.isSmallScreen === nextProps.isSmallScreen &&
    JSON.stringify(prevProps.map.nodes) === JSON.stringify(nextProps.map.nodes) &&
    JSON.stringify(prevProps.map.edges) === JSON.stringify(nextProps.map.edges) &&
    prevProps.map.backgroundColor === nextProps.map.backgroundColor &&
    prevProps.map.edgeType === nextProps.map.edgeType &&
    JSON.stringify(prevProps.map.drawingData) === JSON.stringify(nextProps.map.drawingData)
  )
})

const SkeletonLoader = () => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-[2vh]">
      {[...Array(4)].map((_, index) => (
        <div
          key={index}
          className="bg-gradient-to-br from-slate-800/70 via-slate-900/90 to-slate-800/70 backdrop-blur-xl rounded-2xl p-[2vh] border border-slate-700/30 shadow-xl animate-pulse"
          style={{ animationDelay: `${index * 150}ms` }}
        >
          {/* Header skeleton */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center space-x-3 flex-1">
              <div className="flex items-center gap-2">
                {/* Avatar skeleton */}
                <div className="w-8 h-8 rounded-full bg-slate-700/50"></div>
                {/* Pin badge skeleton */}
                <div className="w-8 h-4 bg-slate-700/50 rounded-full"></div>
              </div>
              <div className="flex-1 min-w-0">
                {/* Title skeleton */}
                <div className="h-6 bg-slate-700/50 rounded-lg w-3/4 mb-1"></div>
                {/* Username skeleton */}
                <div className="h-4 bg-slate-700/30 rounded w-1/2"></div>
              </div>
            </div>
            <div className="flex items-center space-x-1">
              {/* Visibility icon skeleton */}
              <div className="w-9 h-9 bg-slate-700/50 rounded-lg"></div>
              {/* Menu button skeleton */}
              <div className="w-9 h-9 bg-slate-700/50 rounded-lg"></div>
            </div>
          </div>

          {/* Timestamp skeleton */}
          <div className="flex items-center gap-2 mb-3">
            <div className="w-4 h-4 bg-slate-700/50 rounded"></div>
            <div className="h-4 bg-slate-700/50 rounded w-32"></div>
          </div>

          {/* Stats skeleton */}
          <div className="h-4 bg-slate-700/30 rounded w-24 mb-4"></div>

          {/* Preview skeleton */}
          <div className="h-56 bg-slate-800/50 rounded-xl border border-slate-700/50 relative overflow-hidden">
            {/* Animated shimmer effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-600/20 to-transparent animate-shimmer"></div>

            {/* Fake nodes */}
            <div className="absolute top-4 left-4 w-16 h-8 bg-slate-700/60 rounded"></div>
            <div className="absolute top-12 right-8 w-20 h-8 bg-slate-700/60 rounded"></div>
            <div className="absolute bottom-8 left-8 w-18 h-8 bg-slate-700/60 rounded"></div>
            <div className="absolute bottom-4 right-4 w-14 h-8 bg-slate-700/60 rounded"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-24 h-10 bg-slate-700/60 rounded"></div>

            {/* Fake connections */}
            <div className="absolute top-8 left-20 w-16 h-0.5 bg-slate-600/50 transform rotate-12"></div>
            <div className="absolute top-16 right-24 w-20 h-0.5 bg-slate-600/50 transform -rotate-45"></div>
            <div className="absolute bottom-12 left-24 w-12 h-0.5 bg-slate-600/50 transform rotate-45"></div>
          </div>
        </div>
      ))}
    </div>
  )
}

// Group icon options (Music icon inserted 3rd, Star removed per request)
const groupIcons = [
  { name: "Folder", component: Folder },
  { name: "Briefcase", component: Briefcase },
  { name: "Music", component: Music },
  { name: "Heart", component: Heart },
  { name: "Lightbulb", component: Lightbulb },
  { name: "Target", component: Target },
  { name: "Zap", component: Zap },
  { name: "Coffee", component: Coffee },
  { name: "Book", component: Book },
  { name: "Palette", component: Palette },
  { name: "Users", component: Users },
  { name: "Network", component: Network },
]

const GroupMenu = ({
  isOpen,
  position,
  groupId: _groupId,
  onEdit,
  onDelete,
  onClose: _onClose,
}: {
  isOpen: boolean
  position: { x: number; y: number } | null
  groupId: string
  onEdit: () => void
  onDelete: () => void
  onClose: () => void
}) => {
  if (!isOpen || !position) return null

  return createPortal(
    <div
      className="fixed w-48 bg-slate-800/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/50 overflow-hidden"
      style={{
        left: position.x,
        top: position.y,
        zIndex: 9999,
      }}
    >
      <div className="py-2">
        <button
          onClick={onEdit}
          className="w-full text-left px-4 py-3 text-xs text-slate-300 hover:bg-slate-700/50 hover:text-white flex items-center gap-3 transition-all duration-200"
        >
          <Edit2 className="w-4 h-4" />
          Edit Group
        </button>
        <button
          onClick={onDelete}
          className="w-full text-left px-4 py-3 text-xs text-slate-300 hover:bg-slate-700/50 hover:text-red-500 flex items-center gap-3 transition-all duration-200"
        >
          <Trash2 className="w-4 h-4" />
          Delete Group
        </button>
      </div>
    </div>,
    document.body
  )
}

const EditGroupModal = ({
  isOpen,
  onClose,
  group,
  availableMindmaps,
  onSave,
}: {
  isOpen: boolean
  onClose: () => void
  group: Group | null
  availableMindmaps: any[]
  onSave: (groupId: string, newName: string, selectedMindmapIds: string[], newIcon: string) => Promise<void>
}) => {
  const [groupName, setGroupName] = useState("")
  const [selectedMindmapIds, setSelectedMindmapIds] = useState<string[]>([])
  const [selectedIcon, setSelectedIcon] = useState("Folder")
  const [sortOption, setSortOption] = useState("newest")
  const [searchTerm, setSearchTerm] = useState('');
  // icon selection replaces legacy color selection

  // Initialize form when group changes
  useEffect(() => {
    if (group) {
      setGroupName(group.name)
      setSelectedMindmapIds(group.mindmapIds)
      setSelectedIcon(group.icon || "Folder")
    }
  }, [group])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (groupName.trim() && group) {
      await onSave(group.id, groupName.trim(), selectedMindmapIds, selectedIcon)
      onClose()
    }
  }

  const toggleMindmapSelection = (mindmapId: string) => {
    setSelectedMindmapIds((prev) =>
      prev.includes(mindmapId) ? prev.filter((id) => id !== mindmapId) : [...prev, mindmapId],
    )
  }

  // Sort mindmaps based on selected option
  const sortedMindmaps = [...availableMindmaps].sort((a, b) => {
    switch (sortOption) {
      case "newest":
        return b.updatedAt - a.updatedAt
      case "oldest":
        return a.updatedAt - b.updatedAt
      case "alphabeticalAsc":
        return a.title.localeCompare(b.title)
      case "alphabeticalDesc":
        return b.title.localeCompare(a.title)
      default:
        return b.updatedAt - a.updatedAt
    }
  })

  const filteredMindmaps = sortedMindmaps.filter(mindmap =>
    mindmap.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen || !group) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-xl rounded-2xl p-6 w-full max-w-2xl border border-slate-700/50 shadow-2xl max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
            Edit Group
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-300 transition-colors rounded-lg hover:bg-slate-700/50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Group Name Input */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Group Name</label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Enter group name..."
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-200"
              autoFocus
              maxLength={30}
            />
          </div>

          {/* Icon Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-3">Group Icon</label>
            <div className="flex flex-wrap gap-3">
              {groupIcons.map((icon) => {
                const IconComponent = icon.component
                return (
                  <button
                    key={icon.name}
                    type="button"
                    onClick={() => setSelectedIcon(icon.name)}
                    className={`w-10 h-10 rounded-lg border-2 flex items-center justify-center transition-all duration-200 ${selectedIcon === icon.name
                      ? "border-blue-500 bg-blue-500/20 text-blue-300 scale-110 shadow-lg"
                      : "border-slate-600 text-slate-400 hover:border-slate-400 hover:scale-105 hover:bg-slate-700/50 hover:text-slate-300"
                      }`}
                  >
                    <IconComponent className="w-5 h-5" />
                  </button>
                )
              })}
            </div>
          </div>

          {/* Mindmap Selection */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-slate-300">
                Mindmaps in Group ({selectedMindmapIds.length} selected)
              </label>
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as "newest" | "oldest" | "alphabeticalAsc" | "alphabeticalDesc")}
                className="bg-slate-800/50 text-slate-100 border border-slate-600/50 rounded-lg px-3 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-200"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="alphabeticalAsc">A-Z</option>
                <option value="alphabeticalDesc">Z-A</option>
              </select>
            </div>
            <div className="mb-3 relative">
              <input
                type="text"
                placeholder="Search mindmaps..."
                className="w-full px-4 py-2 bg-slate-800/50 border border-slate-600/50 rounded-xl text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-200 pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Search className="w-4 h-4 text-slate-400" />
              </div>
            </div>
            <div className="max-h-60 overflow-y-auto space-y-2 border border-slate-600/50 rounded-xl p-3 bg-slate-800/30">
              {filteredMindmaps.map((mindmap) => (
                <div
                  key={mindmap.permalink}
                  onClick={() => toggleMindmapSelection(mindmap.permalink)}
                  className={`flex items-center gap-3 p-4 rounded-xl transition-all duration-200 ${selectedMindmapIds.includes(mindmap.permalink)
                    ? "bg-blue-500/20 border border-blue-500/50 shadow-sm"
                    : "bg-slate-700/30 hover:bg-slate-700/50 border border-slate-600/30 hover:border-slate-500/50"
                    }`}
                >
                  <div
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center ${selectedMindmapIds.includes(mindmap.permalink) ? "bg-blue-500 border-blue-500" : "border-slate-500"
                      }`}
                  >
                    {selectedMindmapIds.includes(mindmap.permalink) && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-white">{mindmap.title}</h4>
                    <p className="text-xs text-slate-400">
                      {mindmap.nodes?.length || 0} nodes • {mindmap.edges?.length || 0} connections
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-700/50">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 text-slate-400 hover:text-slate-300 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!groupName.trim()}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-500 hover:to-purple-500 transition-all duration-200 font-medium transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const CreateGroupModal = ({
  isOpen,
  onClose,
  onCreateGroup,
  availableMindmaps,
}: {
  isOpen: boolean
  onClose: () => void
  onCreateGroup: (name: string, selectedMindmapIds: string[], icon: string) => Promise<void>
  availableMindmaps: any[]
}) => {
  const [groupName, setGroupName] = useState("")
  const [selectedMindmapIds, setSelectedMindmapIds] = useState<string[]>([])
  const [selectedIcon, setSelectedIcon] = useState("Folder")
  const [sortOption, setSortOption] = useState("newest")
  const [searchTerm, setSearchTerm] = useState('');



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (groupName.trim() && selectedMindmapIds.length > 0) {
      await onCreateGroup(groupName.trim(), selectedMindmapIds, selectedIcon)
      setGroupName("")
      setSelectedMindmapIds([])
      setSelectedIcon("Folder")
      onClose()
    }
  }

  const toggleMindmapSelection = (mindmapId: string) => {
    setSelectedMindmapIds((prev) =>
      prev.includes(mindmapId) ? prev.filter((id) => id !== mindmapId) : [...prev, mindmapId],
    )
  }

  // Sort mindmaps based on selected option
  const sortedMindmaps = [...availableMindmaps].sort((a, b) => {
    switch (sortOption) {
      case "newest":
        return b.updatedAt - a.updatedAt
      case "oldest":
        return a.updatedAt - b.updatedAt
      case "alphabeticalAsc":
        return a.title.localeCompare(b.title)
      case "alphabeticalDesc":
        return b.title.localeCompare(a.title)
      default:
        return b.updatedAt - a.updatedAt
    }
  })

  const filteredMindmaps = sortedMindmaps.filter(mindmap =>
    mindmap.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-xl rounded-2xl p-6 w-full max-w-2xl border border-slate-700/50 shadow-2xl max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
            Create New Group
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-300 transition-colors rounded-lg hover:bg-slate-700/50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Group Name Input */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Group Name</label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Enter group name..."
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-200"
              autoFocus
              maxLength={30}
            />
          </div>

          {/* Icon Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-3">Group Icon</label>
            <div className="flex flex-wrap gap-3">
              {groupIcons.map((icon) => {
                const IconComponent = icon.component
                return (
                  <button
                    key={icon.name}
                    type="button"
                    onClick={() => setSelectedIcon(icon.name)}
                    className={`w-10 h-10 rounded-lg border-2 flex items-center justify-center transition-all duration-200 ${selectedIcon === icon.name
                      ? "border-blue-500 bg-blue-500/20 text-blue-300 scale-110 shadow-lg"
                      : "border-slate-600 text-slate-400 hover:border-slate-400 hover:scale-105 hover:bg-slate-700/50 hover:text-slate-300"
                      }`}
                  >
                    <IconComponent className="w-5 h-5" />
                  </button>
                )
              })}
            </div>
          </div>

          {/* Mindmap Selection */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-slate-300">
                Select Mindmaps ({selectedMindmapIds.length} selected)
              </label>
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as "newest" | "oldest" | "alphabeticalAsc" | "alphabeticalDesc")}
                className="bg-slate-800/50 text-slate-100 border border-slate-600/50 rounded-lg px-3 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-200"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="alphabeticalAsc">A-Z</option>
                <option value="alphabeticalDesc">Z-A</option>
              </select>
            </div>
            <div className="mb-3 relative">
              <input
                type="text"
                placeholder="Search mindmaps..."
                className="w-full px-4 py-2 bg-slate-800/50 border border-slate-600/50 rounded-xl text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-200 pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Search className="w-4 h-4 text-slate-400" />
              </div>
            </div>
            <div className="max-h-60 overflow-y-auto space-y-2 border border-slate-600/50 rounded-xl p-3 bg-slate-800/30">
              {filteredMindmaps.map((mindmap) => (
                <div
                  key={mindmap.permalink}
                  onClick={() => toggleMindmapSelection(mindmap.permalink)}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200 ${selectedMindmapIds.includes(mindmap.permalink)
                    ? "bg-blue-500/20 border border-blue-500/50"
                    : "bg-slate-700/30 hover:bg-slate-700/50 border border-transparent"
                    }`}
                >
                  <div
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center ${selectedMindmapIds.includes(mindmap.permalink) ? "bg-blue-500 border-blue-500" : "border-slate-500"
                      }`}
                  >
                    {selectedMindmapIds.includes(mindmap.permalink) && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-white">{mindmap.title}</h4>
                    <p className="text-xs text-slate-400">
                      {mindmap.nodes?.length || 0} nodes • {mindmap.edges?.length || 0} connections
                    </p>
                  </div>
                </div>
              ))}
            </div>
            {selectedMindmapIds.length === 0 && (
              <p className="text-xs text-slate-500 mt-2">Select at least one mindmap to create a group</p>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-700/50">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 text-slate-400 hover:text-slate-300 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!groupName.trim() || selectedMindmapIds.length === 0}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-500 hover:to-purple-500 transition-all duration-200 font-medium transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              Create Group
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/**
 * MindMapList Component
 *
 * Displays a grid of user's mindmaps with preview thumbnails and management options.
 * Features include:
 * - Sorting maps by various criteria (newest, oldest, alphabetical)
 * - Creating new mindmaps
 * - Editing map details (title, permalink, visibility)
 * - Pinning/unpinning maps for quick access
 * - Deleting maps with confirmation
 * - Interactive previews of each map using ReactFlow
 * - Group management for organizing mindmaps
 */
export default function MindMapList() {
  // Authentication and navigation
  const { user } = useAuthStore()
  const userId = user?.id
  const navigate = useNavigate()

  // Validate userId format (UUID v4)
  const isValidUserId = userId && /^[0-9a-fA-F-]{36}$/.test(userId)

  // Dynamic page title
  usePageTitle("My Mindmaps")

  // MindMap store actions and state
  const {
    maps,
    collaborationMaps,
    fetchMaps,
    fetchCollaborationMaps,
    addMap,
    cloneMap,
    deleteMap,
    toggleMapPin,
  updateMapPermalink,
  } = useMindMapStore()

  const [groups, setGroups] = useState<Group[]>([])
  const [isLoadingGroups, setIsLoadingGroups] = useState(false)
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [isCreatingGroup, setIsCreatingGroup] = useState(false)
  const [groupToDelete, setGroupToDelete] = useState<string | null>(null)
  const [groupToEdit, setGroupToEdit] = useState<string | null>(null)
  const [addToGroupMapId, setAddToGroupMapId] = useState<string | null>(null)
  const [editingGroupSelections, setEditingGroupSelections] = useState<Record<string, string[]>>({})
  const [openGroupMenuId, setOpenGroupMenuId] = useState<string | null>(null)
  const [groupMenuPosition, setGroupMenuPosition] = useState<{ x: number; y: number } | null>(null)

  // UI state management
  const location = useLocation()
  const [isCreating, setIsCreating] = useState(false)
  const [sortOption, setSortOption] = useState("newest")
  const [searchTerm, setSearchTerm] = useState("")
  const [isSmallScreen, setIsSmallScreen] = useState(window.innerWidth < 1080)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [mapToDelete, setMapToDelete] = useState<string | null>(null)
  const [mapToEdit, setMapToEdit] = useState<string | null>(null)
  const [collaborationToLeave, setCollaborationToLeave] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<"owned" | "collaboration">("owned")
  // Sub-tab state for collaboration view (accepted vs pending invites)
  const [collaborationSubtab, setCollaborationSubtab] = useState<'all' | 'pending'>('all')
  const [showSuccessPopup, setShowSuccessPopup] = useState(false)
  const [showCloneSuccessPopup, setShowCloneSuccessPopup] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const reactFlowRef = useRef<ReactFlowInstance>(null)
  const [showInfoModal, setShowInfoModal] = useState(false)
  const [selectedMindmapForInfo, setSelectedMindmapForInfo] = useState<any>(null)

  // Pending collaboration invitations state
  interface PendingInvite {
    inviteId: string
    mindmapId: string
    inviterId: string
    inviterUsername?: string
    inviterAvatar?: string | null
    mindmapTitle?: string
    mindmapPermalink?: string
    createdAt?: string
  visibility?: string
  nodes?: any[]
  edges?: any[]
  edgeType?: string
  backgroundColor?: string
  updatedAt?: number
  }
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([])
  const [isLoadingPendingInvites, setIsLoadingPendingInvites] = useState(false)

  const fetchPendingInvites = useCallback(async () => {
    if (!isValidUserId) return
    setIsLoadingPendingInvites(true)
    try {
      const { data: inviteRows, error: inviteError } = await supabase
        .from('mindmap_collaborations')
        .select('id,mindmap_id,inviter_id,created_at')
        .eq('collaborator_id', userId)
        .eq('status', 'pending')

      if (inviteError) throw inviteError
      if (!inviteRows || inviteRows.length === 0) {
        setPendingInvites([])
        return
      }

      const mindmapIds = [...new Set(inviteRows.map(r => r.mindmap_id).filter(Boolean))]
      const inviterIds = [...new Set(inviteRows.map(r => r.inviter_id).filter(Boolean))]

      let mindmapsById: Record<string, any> = {}
      if (mindmapIds.length > 0) {
        const { data: mindmapsData, error: mindmapsError } = await supabase
          .from('mindmaps')
          .select('id,permalink,title,visibility,json_data,updated_at')
          .in('id', mindmapIds)
        if (mindmapsError) throw mindmapsError
        mindmapsData?.forEach(m => { mindmapsById[m.id] = m })
      }

      let profilesById: Record<string, any> = {}
      if (inviterIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id,username,avatar_url')
          .in('id', inviterIds)
        if (profilesError) throw profilesError
        profilesData?.forEach(p => { profilesById[p.id] = p })
      }

      const combined: PendingInvite[] = inviteRows.map(r => {
        const mm = mindmapsById[r.mindmap_id]
        let nodes: any[] = []
        let edges: any[] = []
        let edgeType: string | undefined
        let backgroundColor: string | undefined
        if (mm?.json_data) {
          try {
            const data = typeof mm.json_data === 'string' ? JSON.parse(mm.json_data) : mm.json_data
            nodes = data?.nodes || []
            edges = data?.edges || []
            edgeType = data?.edgeType
            backgroundColor = data?.backgroundColor
          } catch (err) {
            console.warn('Failed to parse json_data for pending invite mindmap', err)
          }
        }
        return {
          inviteId: r.id,
          mindmapId: r.mindmap_id,
          inviterId: r.inviter_id,
          inviterUsername: profilesById[r.inviter_id]?.username,
          inviterAvatar: profilesById[r.inviter_id]?.avatar_url,
          mindmapTitle: mm?.title,
          mindmapPermalink: mm?.permalink,
          visibility: mm?.visibility,
            nodes,
            edges,
            edgeType,
            backgroundColor,
            updatedAt: mm?.updated_at ? new Date(mm.updated_at).getTime() : undefined,
          createdAt: r.created_at,
        }
      })
      setPendingInvites(combined)
    } catch (e) {
      console.error('Error fetching pending invites:', e)
    } finally {
      setIsLoadingPendingInvites(false)
    }
  }, [isValidUserId, userId])

  const handleAcceptInvite = useCallback(async (invite: PendingInvite) => {
    const { showToast } = useToastStore.getState()
    try {
      const { error } = await supabase
        .from('mindmap_collaborations')
  // Update only existing columns: status and updated_at
  .update({ status: 'accepted', updated_at: new Date().toISOString() })
        .eq('id', invite.inviteId)
      if (error) throw error
      await fetchCollaborationMaps(userId!)
      setPendingInvites(prev => prev.filter(p => p.inviteId !== invite.inviteId))
      showToast('Invitation accepted', 'success')
    } catch (e) {
      console.error('Error accepting invite:', e)
      showToast('Failed to accept invitation', 'error')
    }
  }, [fetchCollaborationMaps, userId])

  const handleRejectInvite = useCallback(async (invite: PendingInvite) => {
    const { showToast } = useToastStore.getState()
    try {
      const { error } = await supabase
        .from('mindmap_collaborations')
        .delete()
        .eq('id', invite.inviteId)
      if (error) throw error
      setPendingInvites(prev => prev.filter(p => p.inviteId !== invite.inviteId))
      showToast('Invitation rejected', 'info')
    } catch (e) {
      console.error('Error rejecting invite:', e)
      showToast('Failed to reject invitation', 'error')
    }
  }, [])

  const createGroup = async (name: string, mindmapIds: string[], icon: string) => {
    if (!isValidUserId) return

    try {
      // Create group in database
      const { data: groupData, error: groupError } = await supabase
        .from('mindmap_groups')
        .insert({
          user_id: userId,
          name: name.trim(),
          icon
        })
        .select()
        .single()

      if (groupError) throw groupError

      // Create memberships for selected mindmaps
      if (mindmapIds.length > 0) {
        const memberships = mindmapIds.map(mindmapId => ({
          group_id: groupData.id,
          mindmap_id: maps.find(m => m.permalink === mindmapId)?.id || mindmapId
        }))

        const { error: membershipError } = await supabase
          .from('mindmap_group_memberships')
          .insert(memberships)

        if (membershipError) throw membershipError
      }

      // Update local state
      const newGroup: Group = {
        id: groupData.id,
        name: groupData.name,
        mindmapIds,
        createdAt: new Date(groupData.created_at).getTime(),
        icon: groupData.icon,
      }
      setGroups((prev) => [...prev, newGroup])

      useToastStore.getState().showToast("Group created successfully!", "success")
    } catch (error) {
      console.error("Error creating group:", error)
      useToastStore.getState().showToast("Failed to create group. Please try again.", "error")
    }
  }

  const deleteGroup = async (groupId: string) => {
    if (!isValidUserId) return

    try {
      // Delete from database (CASCADE will handle memberships)
      const { error } = await supabase
        .from('mindmap_groups')
        .delete()
        .eq('id', groupId)
        .eq('user_id', userId)

      if (error) throw error

      // Update local state
      setGroups((prev) => prev.filter((group) => group.id !== groupId))
      if (selectedGroupId === groupId) {
        setSelectedGroupId(null)
      }

      useToastStore.getState().showToast("Group deleted successfully!", "success")
    } catch (error) {
      console.error("Error deleting group:", error)
      useToastStore.getState().showToast("Failed to delete group. Please try again.", "error")
    }
  }

  const confirmDeleteGroup = () => {
    if (groupToDelete) {
      deleteGroup(groupToDelete)
      setGroupToDelete(null)
    }
  }

  const addMapToGroup = async (mapId: string, groupId: string) => {
    if (!isValidUserId) return

    try {
      const mindmapId = maps.find(m => m.permalink === mapId)?.id || mapId

      const { error } = await supabase
        .from('mindmap_group_memberships')
        .insert({
          group_id: groupId,
          mindmap_id: mindmapId
        })

      if (error) throw error

      // Update local state
      setGroups((prev) =>
        prev.map((group) =>
          group.id === groupId
            ? { ...group, mindmapIds: [...new Set([...group.mindmapIds, mapId])] }
            : group
        )
      )
    } catch (error) {
      console.error("Error adding map to group:", error)
      useToastStore.getState().showToast("Failed to add map to group.", "error")
    }
  }

  const removeMapFromGroup = async (mapId: string, groupId: string) => {
    if (!isValidUserId) return

    try {
      const mindmapId = maps.find(m => m.permalink === mapId)?.id || mapId

      const { error } = await supabase
        .from('mindmap_group_memberships')
        .delete()
        .eq('group_id', groupId)
        .eq('mindmap_id', mindmapId)

      if (error) throw error

      // Update local state
      setGroups((prev) =>
        prev.map((group) =>
          group.id === groupId
            ? { ...group, mindmapIds: group.mindmapIds.filter((id) => id !== mapId) }
            : group
        )
      )
    } catch (error) {
      console.error("Error removing map from group:", error)
      useToastStore.getState().showToast("Failed to remove map from group.", "error")
    }
  }

  const editGroup = async (groupId: string, newName: string, selectedMindmapIds: string[], newIcon: string) => {
    if (!isValidUserId) return

    try {
      // Update group name and icon
      const { error: groupError } = await supabase
        .from('mindmap_groups')
        .update({
          name: newName.trim(),
          icon: newIcon
        })
        .eq('id', groupId)
        .eq('user_id', userId)

      if (groupError) throw groupError

      // Get current memberships
      const currentGroup = groups.find(g => g.id === groupId)
      if (!currentGroup) return

  const currentMindmapIds = currentGroup.mindmapIds
  const toAdd = selectedMindmapIds.filter(id => !currentMindmapIds.includes(id))
  const toRemove = currentMindmapIds.filter(id => !selectedMindmapIds.includes(id))

      // Add new memberships
      if (toAdd.length > 0) {
        const memberships = toAdd.map(mindmapId => ({
          group_id: groupId,
          mindmap_id: maps.find(m => m.permalink === mindmapId)?.id || mindmapId
        }))

        const { error: addError } = await supabase
          .from('mindmap_group_memberships')
          .insert(memberships)

        if (addError) throw addError
      }

      // Remove old memberships
      if (toRemove.length > 0) {
        const idsToRemove = toRemove.map(mindmapId => maps.find(m => m.permalink === mindmapId)?.id || mindmapId)

        const { error: removeError } = await supabase
          .from('mindmap_group_memberships')
          .delete()
          .eq('group_id', groupId)
          .in('mindmap_id', idsToRemove)

        if (removeError) throw removeError
      }

      // Update local state
      setGroups((prev) =>
        prev.map((group) =>
          group.id === groupId
            ? { ...group, name: newName.trim(), icon: newIcon, mindmapIds: selectedMindmapIds }
            : group
        )
      )

      useToastStore.getState().showToast("Group updated successfully!", "success")
    } catch (error) {
      console.error("Error updating group:", error)
      useToastStore.getState().showToast("Failed to update group. Please try again.", "error")
    }
  }



  const getAllMaps = () => {
    return viewMode === "owned" ? maps : collaborationMaps
  }

  const fetchGroups = async () => {
    if (!isValidUserId) return

    setIsLoadingGroups(true)
    try {
      // Fetch groups with their memberships and mindmap data in a single optimized query
      const { data: groupsData, error: groupsError } = await supabase
        .from('mindmap_groups')
        .select(`
          id,
          name,
          icon,
          created_at,
          mindmap_group_memberships (
            mindmap_id,
            mindmaps (
                permalink,
                id
              )
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (groupsError) throw groupsError

      // Transform the data to match our Group interface
      const transformedGroups: Group[] = groupsData.map(group => ({
        id: group.id,
        name: group.name,
        icon: group.icon || 'Folder', // Default to Folder if no icon
        createdAt: new Date(group.created_at).getTime(),
        mindmapIds: group.mindmap_group_memberships.map((membership: any) => {
          // Use the mindmap permalink from the joined data if available, otherwise use the id
          return membership.mindmaps?.permalink || membership.mindmap_id
        }).filter(Boolean) // Remove any null/undefined values
      }))

      setGroups(transformedGroups)
    } catch (error) {
      console.error("Error fetching groups:", error)
      // Fallback to the original method if the optimized query fails
      try {
        const { data: fallbackGroupsData, error: fallbackError } = await supabase
          .from('mindmap_groups')
          .select(`
            id,
            name,
            icon,
            created_at,
            mindmap_group_memberships (
              mindmap_id
            )
          `)
          .eq('user_id', userId)
          .order('created_at', { ascending: false })

        if (fallbackError) throw fallbackError

        const fallbackGroups: Group[] = fallbackGroupsData.map(group => ({
          id: group.id,
          name: group.name,
          icon: group.icon || 'Folder',
          createdAt: new Date(group.created_at).getTime(),
          mindmapIds: group.mindmap_group_memberships.map((membership: any) => membership.mindmap_id)
        }))

        setGroups(fallbackGroups)
      } catch (fallbackError) {
        console.error("Error with fallback groups fetch:", fallbackError)
      }
    } finally {
      setIsLoadingGroups(false)
    }
  }

  /**
   * Handle automatic opening of create map modal when navigated with state
   * This allows other components to trigger the create map modal
   */
  useEffect(() => {
    if (location.state?.isCreating) {
      setIsCreating(true)
      // Clear the isCreating state from location to prevent it from persisting on refresh
      window.history.replaceState({}, document.title)
    }
  }, [location.state])

  /**
   * Fetch user's mindmaps and groups from Supabase when component mounts
   * or when user authentication changes
   */
  useEffect(() => {
    const fetchData = async () => {
      if (isValidUserId) {
        setIsLoading(true)
        try {
          await Promise.all([
            fetchMaps(userId),
            fetchCollaborationMaps(userId),
            fetchGroups(),
            fetchPendingInvites(),
          ])
        } catch (error) {
          console.error("Error fetching data:", error)
        } finally {
          setIsLoading(false)
        }
      } else {
        console.warn("User not authenticated or invalid userId. No data to fetch.")
        setIsLoading(false)
      }
    }
    fetchData()
  }, [isValidUserId, userId, fetchMaps, fetchCollaborationMaps, fetchPendingInvites])

  /**
   * Update group memberships when maps change
   * This ensures group mindmapIds are correctly mapped after maps are loaded
   */
  useEffect(() => {
    if (isValidUserId && maps.length > 0 && groups.length > 0) {
      // Re-map group memberships to ensure correct mindmap IDs
      const updatedGroups = groups.map(group => ({
        ...group,
        mindmapIds: group.mindmapIds.map(idOrKey => {
          // Try to find the mindmap by permalink first, then by id
          const mindmap = maps.find(m => m.permalink === idOrKey || m.id === idOrKey)
          return mindmap?.permalink || idOrKey
        })
      }))

      // Only update if there are actual changes
      const hasChanges = updatedGroups.some((group, index) =>
        JSON.stringify(group.mindmapIds) !== JSON.stringify(groups[index]?.mindmapIds)
      )

      if (hasChanges) {
        setGroups(updatedGroups)
      }
    }
  }, [maps.length, groups.length])

  const handleCreateMap = async (title: string, customPermalink?: string, selectedGroupIds?: string[]) => {
    if (!isValidUserId) {
      console.error("Invalid or undefined userId. Cannot create map.")
      return
    }

    const { showToast } = useToastStore.getState()

    try {
      const newPermalink = await addMap(title, userId, customPermalink)
      // Fetch the new mindmap directly from Supabase to get its id
      const { data: newMapData, error: fetchError } = await supabase
        .from("mindmaps")
        .select("id, permalink")
        .eq("permalink", newPermalink)
        .eq("creator", userId)
        .single()
      if (fetchError || !newMapData) {
        console.error("Could not fetch new mindmap from Supabase:", fetchError)
      }
      if (selectedGroupIds && selectedGroupIds.length > 0 && newMapData?.id) {
        console.log("Adding mindmap to groups:", { mindmapId: newMapData.id, groupIds: selectedGroupIds })
        for (const groupId of selectedGroupIds) {
          console.log(`Adding mindmap ${newMapData.id} to group ${groupId}`)
          await addMapToGroup(newMapData.id, groupId)
        }
      } else {
        console.log("No group assignment: newMapData", newMapData, "selectedGroupIds", selectedGroupIds)
      }
      showToast("Mindmap created successfully!", "success")
      navigate(`/${user.username}/${newPermalink}/edit`)
    } catch (error) {
      console.error("Error creating mindmap:", error)
      showToast("Failed to create mindmap. Please try again.", "error")
      throw error
    }
  }

  const handleResize = useCallback(() => {
    reactFlowRef.current?.fitView()
    setIsSmallScreen(window.innerWidth < 1080)
  }, [])

  useEffect(() => {
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [handleResize])

  const onInit = useCallback((instance: ReactFlowInstance) => {
    ; (reactFlowRef as any).current = instance
  }, [])

  /**
   * Memoized filtering and sorting to prevent expensive recalculations
   */
  const sortedMaps = useMemo(() => {
    const currentMaps = viewMode === "owned" ? maps : collaborationMaps

    // Apply group filtering for owned maps
    let filteredMaps = currentMaps
    if (viewMode === "owned" && selectedGroupId) {
      const selectedGroup = groups.find((group) => group.id === selectedGroupId)
      if (selectedGroup) {
        filteredMaps = currentMaps.filter((map) => selectedGroup.mindmapIds.includes(map.permalink))
      }
    }

    // Filter by search term (title)
    if (searchTerm.trim()) {
      const lowerSearch = searchTerm.trim().toLowerCase()
      filteredMaps = filteredMaps.filter(map => map.title?.toLowerCase().includes(lowerSearch))
    }

    // Sort the filtered maps
    return [...filteredMaps].sort((a, b) => {
      // First sort by pin status (pinned maps always appear first)
      if (a.isPinned && !b.isPinned) return -1
      if (!a.isPinned && b.isPinned) return 1

      // Then apply the selected sort option
      switch (sortOption) {
        case "newest":
          return b.updatedAt - a.updatedAt
        case "oldest":
          return a.updatedAt - b.updatedAt
        case "alphabeticalAsc":
          return a.title.localeCompare(b.title)
        case "alphabeticalDesc":
          return b.title.localeCompare(a.title)
        default:
          return b.updatedAt - a.updatedAt // Default to newest
      }
    })
  }, [maps, collaborationMaps, viewMode, selectedGroupId, groups, sortOption, searchTerm])

  /**
   * Toggles the dropdown menu for a specific map
   * If the menu for this map is already open, it closes it
   *
   * @param {string} id - The ID of the map to toggle menu for
   */
  const toggleMenu = (permalink: string) => {
    setOpenMenuId(openMenuId === permalink ? null : permalink)
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openMenuId && !(event.target as Element).closest(".menu-container")) {
        setOpenMenuId(null)
      }
      if (openGroupMenuId) {
        // Check if click is outside the portal menu
        const target = event.target as Element
        const isClickOnGroupButton = target.closest('[title="Group options"]')
        const isClickInPortalMenu = target.closest('[style*="zIndex: 9999"]')

        if (!isClickOnGroupButton && !isClickInPortalMenu) {
          setOpenGroupMenuId(null)
          setGroupMenuPosition(null)
        }
      }
    }

    document.addEventListener("click", handleClickOutside)
    return () => {
      document.removeEventListener("click", handleClickOutside)
    }
  }, [openMenuId, openGroupMenuId])

  /**
   * Opens the delete confirmation modal for a map
   *
   * @param {string} id - The ID of the map to delete
   */
  const handleDeleteMap = (permalink: string) => {
    setMapToDelete(permalink)
    setOpenMenuId(null)
  }

  const confirmDelete = async () => {
    if (mapToDelete && isValidUserId) {
      // Clean up group memberships when deleting a map
      const mapToDeleteData = maps.find(m => m.permalink === mapToDelete)
      if (mapToDeleteData?.id) {
        try {
          await supabase
            .from('mindmap_group_memberships')
            .delete()
            .eq('mindmap_id', mapToDeleteData.id)
        } catch (error) {
          console.error("Error cleaning up group memberships:", error)
        }
      }

      deleteMap(mapToDelete, userId)
      setMapToDelete(null)

      // Groups will be updated via the useEffect when maps change
    }
  }

  const handleTogglePin = async (permalink: string) => {
    const currentMap = maps.find((map) => map.permalink === permalink)
    if (currentMap) {
      toggleMapPin(permalink)
    }
  }

  const handleCloneMap = async (permalink: string) => {
    if (!isValidUserId) {
      console.error("Invalid or undefined userId. Cannot clone map.")
      return
    }

    // Close the menu immediately
    setOpenMenuId(null)

    const { showToast } = useToastStore.getState()

    try {
      await cloneMap(permalink, userId)
      setShowCloneSuccessPopup(true)
      // Hide the popup after 3 seconds
      setTimeout(() => {
        setShowCloneSuccessPopup(false)
      }, 3000)
      // Optionally navigate to the new cloned map
      // navigate(`/${user.username}/${newMapId}/edit`)
    } catch (error) {
      console.error("Error cloning mindmap:", error)
      showToast("Failed to clone mindmap. Please try again.", "error")
    }
  }

  const handleEditDetails = (permalink: string) => {
    setMapToEdit(permalink)
    setOpenMenuId(null)
  }

  const handleManageGroups = (permalink: string) => {
    setAddToGroupMapId(permalink)
    const currentGroupIds = groups
      .filter((g) => g.mindmapIds.includes(permalink))
      .map((g) => g.id)
    setEditingGroupSelections((prev) => ({
      ...prev,
      [permalink]: currentGroupIds,
    }))
  }

  const handleApplyGroupChanges = async (mapPermalink: string) => {
    const currentMapGroups = groups
      .filter((g) => g.mindmapIds.includes(mapPermalink))
      .map((g) => g.id)
    const newSelectedGroups = editingGroupSelections[mapPermalink] || []

    const groupsToAdd = newSelectedGroups.filter(
      (groupId) => !currentMapGroups.includes(groupId)
    )
    const groupsToRemove = currentMapGroups.filter(
      (groupId) => !newSelectedGroups.includes(groupId)
    )

    for (const groupId of groupsToAdd) {
      await addMapToGroup(mapPermalink, groupId)
    }

    for (const groupId of groupsToRemove) {
      await removeMapFromGroup(mapPermalink, groupId)
    }

    setAddToGroupMapId(null) // Close the modal
    setEditingGroupSelections((prev) => {
      const newState = { ...prev }
      delete newState[mapPermalink]
      return newState
    })
  }

  /**
   * Saves updated map details including title, permalink, visibility, description, and collaborators
   * Handles permalink changes by updating the map ID in both local state and Supabase
   *
   * @param {Object} details - The updated map details
   * @param {string} details.title - The map title
   * @param {string} details.permalink - The map permalink (used as ID)
   * @param {"public" | "private" | "linkOnly"} details.visibility - The map visibility setting
   * @param {string} details.description - The map description
   * @param {boolean} details.is_main - Whether this is the user's main/featured map
   * @param {string[]} details.collaborators - Array of user IDs who can collaborate on this map
   * @throws {Error} If the permalink is already in use by another map
   */
  const saveMapDetails = async (details: {
    title: string
    permalink: string
    visibility: "public" | "private" | "linkOnly"
    description: string
    is_main: boolean
    collaborators: string[]
    published_at?: string | null
  }) => {
    if (mapToEdit && isValidUserId) {
      const currentMap = maps.find((map) => map.permalink === mapToEdit)
      if (currentMap) {
        // Check if the new permalink already exists for the current user
        const conflictingMap = maps.find((map) => map.permalink === details.permalink && map.permalink !== currentMap.permalink)

        if (conflictingMap) {
          throw new Error(`Permalink already in use in your mindmap "${conflictingMap.title}"`)
        }

        try {
          const isPermalinkChanged = currentMap.permalink !== details.permalink
          const updatedMapData = {
            title: details.title,
            visibility: details.visibility,
            description: details.description || "",
            is_main: details.is_main,
            collaborators: details.collaborators,
            published_at: details.published_at,
          }

          if (isPermalinkChanged) {
            const updatedMap = {
              ...currentMap,
              ...updatedMapData,
            }

            // Save the map with updated details
            await useMindMapStore.getState().saveMapToSupabase(updatedMap, userId)

            // Then update the ID (this creates a new record and deletes the old one)
            await updateMapPermalink(currentMap.permalink, details.permalink)
          } else {
            const updatedMap = {
              ...currentMap,
              ...updatedMapData,
            }

            // Save the map with updated details
            await useMindMapStore.getState().saveMapToSupabase(updatedMap, userId)
          }

          // If this is a publish/republish action, notify followers
          // Only send notifications if published_at was just set (not if it already existed)
          const wasJustPublished =
            details.published_at && details.visibility === "public" && details.published_at !== currentMap.published_at
          if (wasJustPublished && currentMap.id && user?.username) {
            try {
              console.log("Sending notifications to followers for published mindmap:", {
                creator_id: userId,
                mindmap_id: currentMap.id,
                mindmap_title: details.title,
                creator_username: user.username,
              })

              const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('username')
                .eq('id', user.id)
                .single();
              if (profileError) throw profileError;
                      
              const username = profile?.username

              try {
                await useNotificationStore.getState().addNotification({
                  user_id: userId, // sender (publisher)
                  type: 'publish',
                  title: 'Mindmap Published',
                  message: `@${username} published a new mindmap: ${details.title}`,
                  mindmap_id: currentMap.id,
                })
                console.log("Successfully sent notifications to followers via notificationStore");
              } catch (notificationError) {
                console.error("Error sending follower notifications:", notificationError);
              }

            } catch (notifyError) {
              console.error("Failed to notify followers:", notifyError)
              // Don't throw here - we don't want to fail the publish because notifications failed
            }
          }

          // Update local state to reflect changes immediately
          const updatedMap = {
            ...currentMap,
            ...updatedMapData,
            permalink: isPermalinkChanged ? details.permalink : currentMap.permalink,
          }

          // Update the maps array in state
          useMindMapStore.getState().setMaps(maps.map((map) => (map.permalink === currentMap.permalink ? updatedMap : map)))

          // Show success popup if publishing/republishing
          if (wasJustPublished) {
            setShowSuccessPopup(true)
            // Hide the popup after 3 seconds
            setTimeout(() => {
              setShowSuccessPopup(false)
            }, 3000)
          }

          setMapToEdit(null)
        } catch (error) {
          console.error("Failed to update map details:", error)
          throw error
        }
      }
    }
  }

  // Leave collaboration (remove self as collaborator on a map)
  const handleLeaveCollaboration = useCallback(async () => {
    if (!collaborationToLeave || !isValidUserId) return
    const { showToast } = useToastStore.getState()
    try {
      // Find collaboration record for this user and mindmap id by joining via permalink -> id
      // First get mindmap id from permalink
      const target = collaborationMaps.find(m => m.permalink === collaborationToLeave)
      if (!target?.id) {
        showToast('Could not resolve mindmap', 'error')
        return
      }
      const { error: delError } = await supabase
        .from('mindmap_collaborations')
        .delete()
        .eq('mindmap_id', target.id)
        .eq('collaborator_id', userId)
        .eq('status', 'accepted')
      if (delError) throw delError
      await fetchCollaborationMaps(userId!)
      setCollaborationToLeave(null)
      showToast('Left collaboration', 'success')
    } catch (e) {
      console.error('Error leaving collaboration:', e)
      showToast('Failed to leave collaboration', 'error')
    }
  }, [collaborationToLeave, isValidUserId, userId, collaborationMaps, fetchCollaborationMaps])

  return (
    <div className="max-w-4xl xl:max-w-[50vw] mx-auto p-4 xl:p-[2vh]">
      {/* Enhanced Header with Integrated Groups */}
      <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl rounded-2xl p-[2vh] border border-slate-700/30 shadow-2xl mb-[3vh]">
        <div className="flex justify-between items-start mb-[1.5vh]">
          <div className="flex flex-col space-y-[1.5vh]">
            <h1 className="text-[2.5vh] font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
              {viewMode === "owned" ? "Your Mindmaps" : "Collaboration Maps"}
            </h1>

            {/* Enhanced View Toggle */}
            <div className="flex items-center space-x-[0.5vh] bg-slate-800/50 backdrop-blur-sm rounded-xl p-[0.5vh] border border-slate-700/30">
              <button
                onClick={() => setViewMode("owned")}
                className={`${isSmallScreen ? "px-[1vh] py-[0.8vh]" : "px-[1.5vh] py-[0.8vh]"} rounded-lg text-[1.4vh] font-medium transition-all duration-200 ${viewMode === "owned"
                  ? "bg-gradient-to-r from-blue-600/90 to-purple-600/90 text-white shadow-lg shadow-blue-500/25 backdrop-blur-sm border border-blue-500/30"
                  : "text-slate-400 hover:text-slate-300 hover:bg-slate-700/30 border border-transparent"
                  }`}
              >
                {isSmallScreen ? (
                  <div className="flex items-center space-x-[0.5vh]">
                    <Network className="w-[1.5vh] h-[1.5vh]" />
                    <span>({maps.length})</span>
                  </div>
                ) : (
                  `Your Maps (${maps.length})`
                )}
              </button>
              <button
                onClick={() => {
                  setViewMode("collaboration")
                  setSelectedGroupId(null) // Clear group selection when switching to collaboration view
                  setCollaborationSubtab('all') // reset to default
                }}
                className={`${isSmallScreen ? "px-[1vh] py-[0.8vh]" : "px-[1.5vh] py-[0.8vh]"} rounded-lg text-[1.4vh] font-medium transition-all duration-200 ${viewMode === "collaboration"
                  ? "bg-gradient-to-r from-blue-600/90 to-purple-600/90 text-white shadow-lg shadow-blue-500/25 backdrop-blur-sm border border-blue-500/30"
                  : "text-slate-400 hover:text-slate-300 hover:bg-slate-700/30 border border-transparent"
                  }`}
              >
                {isSmallScreen ? (
                  <div className="flex items-center space-x-[0.5vh]">
                    <Users className="w-[1.5vh] h-[1.5vh]" />
                    <span>({collaborationMaps.length})</span>
                    {pendingInvites.length > 0 && (
                      <span className="ml-0.5 inline-flex items-center justify-center min-w-[1.6vh] h-[1.6vh] px-[0.4vh] text-[1vh] font-semibold rounded-full bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow leading-none">
                        {pendingInvites.length}
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="flex items-center gap-2">Collaborations ({collaborationMaps.length}) {pendingInvites.length > 0 && (
                    <span className="inline-flex items-center justify-center min-w-[2vh] h-[2vh] px-[0.6vh] text-[1.1vh] font-semibold rounded-full bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow leading-none">
                      {pendingInvites.length}
                    </span>
                  )}</span>
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-[1vh]">
            {/* Compact Searchbar */}
            <div className="flex items-center space-x-2">
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Search maps..."
                  className={`bg-slate-900 text-slate-100 border border-slate-700/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 px-3 py-1 text-sm w-[120px] sm:w-[160px] lg:w-[180px] pl-8`}
                  style={{ minWidth: isSmallScreen ? 80 : 120 }}
                />
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                  <Search className="w-4 h-4" />
                </span>
              </div>
              <select
                value={sortOption}
                onChange={(e) =>
                  setSortOption(e.target.value as "newest" | "oldest" | "alphabeticalAsc" | "alphabeticalDesc")
                }
                className={`bg-slate-900 text-slate-100 border border-slate-700/30 rounded-xl ${isSmallScreen ? "px-[1vh] py-[0.8vh] text-[1.2vh]" : "px-[1.5vh] py-[0.8vh] text-[1.4vh]"} focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200`}
              >
                <option value="newest">{isSmallScreen ? "Newest" : "Newest First"}</option>
                <option value="oldest">{isSmallScreen ? "Oldest" : "Oldest First"}</option>
                <option value="alphabeticalAsc">{isSmallScreen ? "A-Z" : "Alphabetical (A-Z)"}</option>
                <option value="alphabeticalDesc">{isSmallScreen ? "Z-A" : "Alphabetical (Z-A)"}</option>
              </select>
              {viewMode === "owned" && (
                <button
                  onClick={() => setIsCreating(true)}
                  className="group flex items-center space-x-[0.8vh] px-[1.5vh] py-[0.8vh] bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-500 hover:to-purple-500 transition-all duration-200 transform hover:scale-105 shadow-lg shadow-blue-500/25"
                >
                  {isSmallScreen ? (
                    <Plus className="w-[2vh] h-[2vh] transition-transform group-hover:scale-110" />
                  ) : (
                    <>
                      <Plus className="w-[2vh] h-[2vh] transition-transform group-hover:scale-110" />
                      <span className="font-medium text-[1.4vh]">Create New Map</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Integrated Group Filter Tabs */}
        {viewMode === "owned" && (
          <div className="flex flex-wrap gap-[0.8vh] pt-[1vh] border-t border-slate-700/30">
            <button
              onClick={() => setSelectedGroupId(null)}
              className={`flex items-center space-x-[0.8vh] px-[1.2vh] py-[0.6vh] rounded-lg text-[1.3vh] font-medium transition-all duration-200 focus:outline-none border-0 ${selectedGroupId === null
                ? "bg-gradient-to-r from-blue-600/60 to-purple-600/60 text-white backdrop-blur-sm"
                : "bg-slate-700/30 text-slate-400 hover:bg-slate-700/50 hover:text-slate-300"
                }`}
              style={{ border: 'none', outline: 'none' }}
            >
              <Folder className="w-[1.4vh] h-[1.4vh]" />
              <span>All Maps ({maps.length})</span>
            </button>

            {isLoadingGroups ? (
              // Loading skeleton for groups
              <>
                {[...Array(3)].map((_, index) => (
                  <div
                    key={`group-skeleton-${index}`}
                    className="flex items-center space-x-[0.8vh] px-[1.2vh] py-[0.6vh] rounded-lg bg-slate-700/30 border border-slate-600/30 animate-pulse"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="w-[1.4vh] h-[1.4vh] bg-slate-600/50 rounded"></div>
                    <div className="h-[1.3vh] bg-slate-600/50 rounded w-16"></div>
                  </div>
                ))}
              </>
            ) : (
              groups.map((group) => (
                <div key={group.id} className="relative group/group">
                  <button
                    onClick={() => setSelectedGroupId(group.id)}
                    className={`flex items-center space-x-[0.8vh] px-[1.2vh] py-[0.6vh] rounded-lg text-[1.3vh] font-medium transition-all duration-200 focus:outline-none border-0 ${selectedGroupId === group.id
                      ? "bg-gradient-to-r from-blue-600/60 to-purple-600/60 text-white backdrop-blur-sm"
                      : "bg-slate-700/30 text-slate-300 hover:bg-slate-700/50 hover:text-white"
                      }`}
                    style={{ border: 'none', outline: 'none' }}
                  >
                  {(() => {
                      const IconComponent = groupIcons.find(i => i.name === group.icon)?.component || FolderOpen
                      return <IconComponent className="w-[1.4vh] h-[1.4vh]" />
                    })()}
                    <span>
                      {group.name} ({group.mindmapIds.length})
                    </span>
                  </button>

                  {/* Group Menu */}
                  <div className="absolute -top-[0.3vh] -right-[0.3vh] opacity-0 group-hover/group:opacity-100 transition-opacity duration-200">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        if (openGroupMenuId === group.id) {
                          setOpenGroupMenuId(null)
                          setGroupMenuPosition(null)
                        } else {
                          const rect = e.currentTarget.getBoundingClientRect()
                          setGroupMenuPosition({
                            x: rect.right - 192, // 192px = w-48 width
                            y: rect.bottom + 8
                          })
                          setOpenGroupMenuId(group.id)
                        }
                      }}
                      className="w-[1.8vh] h-[1.8vh] bg-slate-600 text-white rounded-full flex items-center justify-center text-[1vh] hover:bg-slate-500"
                      title="Group options"
                    >
                      <MoreVertical className="w-[1.2vh] h-[1.2vh]" />
                    </button>
                  </div>
                </div>
              ))
            )}

            {/* New Group Button - Integrated within group tabs */}
            <button
              onClick={() => setIsCreatingGroup(true)}
              className="flex items-center space-x-[0.8vh] px-[1.2vh] py-[0.6vh] bg-slate-700/20 text-slate-400 hover:bg-blue-600/20 hover:text-blue-300 border border-slate-600/30 hover:border-blue-500/50 rounded-lg text-[1.3vh] font-medium transition-all duration-200 group"
              title="Create new group"
            >
              <FolderPlus className="w-[1.4vh] h-[1.4vh] transition-transform group-hover:scale-110" />
              <span>New Group</span>
            </button>


          </div>
        )}
        {viewMode === "collaboration" && (
          <div className="flex flex-wrap gap-[0.8vh] pt-[1vh] border-t border-slate-700/30">
            <button
              onClick={() => setCollaborationSubtab('all')}
              className={`flex items-center space-x-[0.8vh] px-[1.2vh] py-[0.6vh] rounded-lg text-[1.3vh] font-medium transition-all duration-200 ${collaborationSubtab === 'all'
                ? 'bg-gradient-to-r from-blue-600/60 to-purple-600/60 text-white backdrop-blur-sm'
                : 'bg-slate-700/30 text-slate-400 hover:bg-slate-700/50 hover:text-slate-300'
                }`}
            >
              <Folder className="w-[1.4vh] h-[1.4vh]" />
              <span>All ({collaborationMaps.length})</span>
            </button>
            <button
              onClick={() => setCollaborationSubtab('pending')}
              className={`flex items-center space-x-[0.8vh] px-[1.2vh] py-[0.6vh] rounded-lg text-[1.3vh] font-medium transition-all duration-200 ${collaborationSubtab === 'pending'
                ? 'bg-gradient-to-r from-blue-600/60 to-purple-600/60 text-white backdrop-blur-sm'
                : 'bg-slate-700/30 text-slate-400 hover:bg-slate-700/50 hover:text-slate-300'
                }`}
            >
              <Users className="w-[1.4vh] h-[1.4vh]" />
              <span>Pending ({pendingInvites.length})</span>
            </button>
          </div>
        )}
      </div>



      {!isValidUserId ? (
        <div className="bg-gradient-to-br from-slate-800/30 to-slate-900/30 backdrop-blur-xl rounded-2xl p-[4vh] border border-slate-700/30 text-center">
          <Network className="w-[6vh] h-[6vh] mx-auto text-slate-500 mb-[1.5vh]" />
          <p className="text-slate-400 text-[1.6vh]">Please log in to view your mindmaps.</p>
        </div>
      ) : isLoading ? (
        <SkeletonLoader />
      ) : viewMode === 'collaboration' && collaborationSubtab === 'pending' ? (
        <>
          {isLoadingPendingInvites && pendingInvites.length === 0 && (
            <div className="bg-gradient-to-br from-slate-800/30 to-slate-900/30 backdrop-blur-xl rounded-2xl p-[4vh] border border-slate-700/30 text-center">
              <Network className="w-[6vh] h-[6vh] mx-auto text-slate-500 mb-[1.5vh]" />
              <p className="text-slate-400 text-[1.6vh]">Loading invitations...</p>
            </div>
          )}
          {!isLoadingPendingInvites && pendingInvites.length === 0 && (
            <div className="bg-gradient-to-br from-slate-800/30 to-slate-900/30 backdrop-blur-xl rounded-2xl p-[4vh] border border-slate-700/30 text-center">
              <Network className="w-[6vh] h-[6vh] mx-auto text-slate-500 mb-[1.5vh]" />
              <p className="text-slate-400 text-[1.6vh]">No pending collaboration invitations.</p>
            </div>
          )}
          {pendingInvites.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-[2vh]">
              {pendingInvites.map(invite => (
                <div key={invite.inviteId} className="relative bg-gradient-to-br from-slate-800/70 via-slate-900/90 to-slate-800/70 backdrop-blur-xl rounded-2xl p-[2vh] border border-blue-600/40 shadow-xl">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {invite.inviterAvatar ? (
                        <img src={invite.inviterAvatar} alt={invite.inviterUsername || 'Inviter'} className="w-8 h-8 rounded-full object-cover ring-2 ring-blue-500/40" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center ring-2 ring-blue-500/40">
                          <span className="text-xs font-bold text-white">{invite.inviterUsername?.charAt(0)?.toUpperCase() || '?'}</span>
                        </div>
                      )}
                      <div>
                        <h4 className="text-base font-bold text-white">{invite.mindmapTitle || 'Mindmap'}</h4>
                        {invite.inviterUsername && (
                          <p className="text-xs text-blue-300 mt-1 font-medium">Invited by @{invite.inviterUsername}</p>
                        )}
                      </div>
                    </div>
                    {invite.visibility && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full border border-blue-500/30 text-[0.7rem] text-blue-200 capitalize">
                        {invite.visibility === 'public' ? <Eye className="w-3 h-3" /> : invite.visibility === 'linkOnly' ? <Link className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                        {invite.visibility === 'linkOnly' ? 'Link' : invite.visibility}
                      </div>
                    )}
                  </div>
                  <div className="mb-4 h-40 border border-slate-700/50 rounded-lg overflow-hidden relative">
                    {invite.nodes && invite.nodes.length > 0 ? (
                      <MindMapPreview map={invite as any} isSmallScreen={isSmallScreen} onInit={onInit} />
                    ) : (
                      <div className="h-full flex items-center justify-center rounded-xl relative overflow-hidden">
                        {/* Base background */}
                        <div
                          className="absolute inset-0"
                          style={{
                            backgroundColor: invite.backgroundColor || "rgba(30, 41, 59, 0.3)", // fallback to bg-slate-800/30
                          }}
                        />
                        {/* Gradient overlay for better visual appeal */}
                        {invite.backgroundColor && (
                          <div className="absolute inset-0 bg-gradient-to-br from-black/10 via-transparent to-black/20" />
                        )}
                        {/* Content */}
                        <div className="text-center text-slate-500 relative z-10">
                          <Network className="w-12 h-12 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">Empty mindmap</p>
                          <p className="text-xs opacity-75">Click to start editing</p>
                        </div>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mb-4">Accept to start collaborating on this mindmap.</p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleAcceptInvite(invite)}
                      className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-500 hover:to-purple-500 text-sm font-medium transition-all duration-200"
                    >Accept</button>
                    <button
                      onClick={() => handleRejectInvite(invite)}
                      className="flex-1 px-4 py-2 bg-slate-700/60 text-slate-200 rounded-lg hover:bg-slate-700/80 text-sm font-medium transition-all duration-200"
                    >Reject</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : sortedMaps.length === 0 ? (
        <div className="bg-gradient-to-br from-slate-800/30 to-slate-900/30 backdrop-blur-xl rounded-2xl p-[4vh] border border-slate-700/30 text-center">
          <Network className="w-[6vh] h-[6vh] mx-auto text-slate-500 mb-[1.5vh]" />
          <p className="text-slate-400 text-[1.6vh]">
            {viewMode === "owned" && selectedGroupId
              ? `No mindmaps in "${groups.find((g) => g.id === selectedGroupId)?.name}" group yet.`
              : viewMode === "owned"
                ? "No mindmaps yet. Create your first one!"
                : pendingInvites.length > 0
                  ? "No accepted collaboration maps yet. Check the Pending tab to respond to invitations."
                  : "No collaboration maps yet. You'll see mindmaps here when someone adds you as a collaborator."}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-[2vh]">
          {sortedMaps.map((map, index) => (
            <div
              key={map.permalink}
              className="group relative bg-gradient-to-br from-slate-800/70 via-slate-900/90 to-slate-800/70 backdrop-blur-xl rounded-2xl p-[2vh] border border-slate-700/30 shadow-xl"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="relative">
                {/* Enhanced Map Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3 flex-1">
                    <div className="flex items-center gap-2">
                      {viewMode === "collaboration" ? (
                        // For collaboration maps, show creator avatar
                        map.creatorAvatar ? (
                          <img
                            src={map.creatorAvatar || "/placeholder.svg"}
                            alt={map.creatorUsername || "Creator"}
                            className="w-8 h-8 rounded-full object-cover ring-2 ring-slate-600/30"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center ring-2 ring-blue-500/40">
                            <span className="text-xs font-bold text-slate-300">
                              {map.creatorUsername?.charAt(0)?.toUpperCase() || "?"}
                            </span>
                          </div>
                        )
                      ) : // For owned maps, show user avatar
                        map.creatorAvatar ? (
                          <img
                            src={map.creatorAvatar || "/placeholder.svg"}
                            alt={user?.username || "User"}
                            className="w-8 h-8 rounded-full object-cover ring-2 ring-slate-600/30"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center">
                            <span className="text-xs font-bold text-slate-300">
                              {user?.username?.charAt(0)?.toUpperCase() || "?"}
                            </span>
                          </div>
                        )}
                      {map.isPinned && viewMode === "owned" && (
                        <div className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-blue-500/20 to-blue-300/20 rounded-full border border-blue-500/30">
                          <Pin className="w-3 h-3 text-blue-400" />
                        </div>
                      )}
                      {map.is_main && (
                        <div className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-blue-500/20 to-blue-300/20 rounded-full border border-blue-500/30">
                          <Star className="w-3 h-3 text-blue-400 fill-current" />
                          <span className="text-xs font-medium text-blue-300">Main</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-bold text-white truncate">
                        {(() => {
                          if (searchTerm.trim()) {
                            const lowerSearch = searchTerm.trim().toLowerCase();
                            const title = map.title || "";
                            const idx = title.toLowerCase().indexOf(lowerSearch);
                            if (idx !== -1) {
                              return <>
                                {title.slice(0, idx)}
                                <span className="bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded px-1 py-0.5 font-semibold shadow-sm">
                                  {title.slice(idx, idx + lowerSearch.length)}
                                </span>
                                {title.slice(idx + lowerSearch.length)}
                              </>;
                            }
                          }
                          return map.title;
                        })()}
                      </h3>
                      {viewMode === "collaboration" && map.creatorUsername && (
                        <p className="text-xs text-blue-400 mt-1 font-medium">@{map.creatorUsername}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="relative visibility-container">
                      <div onClick={(e) => e.stopPropagation()} className="p-2 text-slate-500 cursor-default">
                        {map.visibility === "public" ? (
                          <Eye className="w-5 h-5" />
                        ) : map.visibility === "linkOnly" ? (
                          <Link className="w-5 h-5" />
                        ) : (
                          <EyeOff className="w-5 h-5" />
                        )}
                      </div>
                    </div>
                    <div className="relative menu-container">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
              toggleMenu(map.permalink)
                        }}
                        className="p-2 text-slate-500 hover:text-slate-300 transition-all duration-200 rounded-lg hover:bg-slate-700/50"
                      >
                        <MoreVertical className="w-5 h-5" />
                      </button>
            {openMenuId === map.permalink && (
                        <div className="absolute right-0 mt-2 w-48 bg-slate-800/95 backdrop-blur-xl rounded-2xl shadow-2xl z-10 border border-slate-700/50 overflow-hidden">
                          <div className="py-2">
                            {viewMode === "owned" && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                  handleEditDetails(map.permalink)
                  toggleMenu(map.permalink)
                                }}
                                className="w-full text-left px-4 py-3 text-xs text-slate-300 hover:bg-slate-700/50 hover:text-white flex items-center gap-3 transition-all duration-200"
                              >
                                <Edit2 className="w-4 h-4" />
                                Edit Details
                              </button>
                            )}
                            {viewMode === "owned" && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                  handleTogglePin(map.permalink)
                  toggleMenu(map.permalink)
                                }}
                                className={`w-full text-left px-4 py-3 text-xs hover:bg-slate-700/50 hover:text-white flex items-center gap-3 transition-all duration-200 ${map.isPinned ? "text-blue-400" : "text-slate-300"}`}
                              >
                                <Pin className="w-4 h-4" />
                                {map.isPinned ? "Unpin" : "Pin"}
                              </button>
                            )}
                            {viewMode === "owned" && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                  handleCloneMap(map.permalink)
                  toggleMenu(map.permalink)
                                }}
                                className="w-full text-left px-4 py-3 text-xs text-slate-300 hover:bg-slate-700/50 hover:text-white flex items-center gap-3 transition-all duration-200"
                              >
                                <Network className="w-4 h-4" />
                                Clone
                              </button>
                            )}
                            {viewMode === "owned" && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                  handleManageGroups(map.permalink)
                  toggleMenu(map.permalink)
                                }}
                                className="w-full text-left px-4 py-3 text-xs text-slate-300 hover:bg-slate-700/50 hover:text-white flex items-center gap-3 transition-all duration-200"
                              >
                                <FolderPlus className="w-4 h-4" />
                                Manage Groups
                              </button>
                            )}
                            {viewMode === "owned" && selectedGroupId && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                  removeMapFromGroup(map.permalink, selectedGroupId)
                  toggleMenu(map.permalink)
                                }}
                                className="w-full text-left px-4 py-3 text-xs text-slate-300 hover:bg-slate-700/50 hover:text-orange-400 flex items-center gap-3 transition-all duration-200"
                              >
                                <X className="w-4 h-4" />
                                Remove from Group
                              </button>
                            )}
                            {viewMode === "owned" && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                  handleDeleteMap(map.permalink)
                  toggleMenu(map.permalink)
                                }}
                                className="w-full text-left px-4 py-3 text-xs text-slate-300 hover:bg-slate-700/50 hover:text-red-500 flex items-center gap-3 transition-all duration-200"
                              >
                                <Trash2 className="w-4 h-4" />
                                Delete
                              </button>
                            )}
                            {viewMode === "collaboration" && (
                              <>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setSelectedMindmapForInfo({
                                      username: map.creatorUsername,
                                      displayName: map.creatorUsername, // Assuming display name is same as username for now
                                      name: map.title,
                                      permalink: map.permalink,
                                      updatedAt: map.updatedAt,
                                      description: map.description,
                                      visibility: map.visibility,
                                      avatar_url: map.creatorAvatar,
                                      id: map.id,
                                      collaborators: map.collaborators,
                                      published_at: map.published_at,
                                      stats: {
                                        nodes: map.nodes?.length,
                                        edges: map.edges?.length,
                                        // Add other stats if available in map object
                                      }
                                    })
                                    setShowInfoModal(true)
                                    toggleMenu(map.permalink)
                                  }}
                                  className="w-full text-left px-4 py-3 text-xs text-slate-300 hover:bg-slate-700/50 hover:text-white flex items-center gap-3 transition-all duration-200"
                                >
                                  <Info className="w-4 h-4" />
                                  Info
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setCollaborationToLeave(map.permalink)
                                    toggleMenu(map.permalink)
                                  }}
                                  className="w-full text-left px-4 py-3 text-xs text-red-400 hover:bg-red-500/10 hover:text-red-300 flex items-center gap-3 transition-all duration-200"
                                >
                                  <X className="w-4 h-4" />
                                  Leave Collaboration
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Enhanced Timestamp and Stats */}
                <div className="flex items-center gap-2 text-xs text-slate-400 mb-3">
                  <Clock className="w-3 h-3" />
                  <span>
                    Last edited{" "}
                    {map.updatedAt && !isNaN(new Date(map.updatedAt).getTime())
                      ? formatDateWithPreference(new Date(map.updatedAt))
                      : "Unknown date"}
                  </span>
                </div>
                <div className="text-xs text-slate-500 mb-4">
                  {map.nodes?.length} nodes • {map.edges?.length} connections
                </div>

                {/* Enhanced Mind Map Preview */}
                  <a
                  href={(() => {
                    if (map?.creatorUsername) {
                      return `/${map.creatorUsername}/${map.permalink}/edit`
                    } else {
                      return `/${user?.username}/${map.permalink}/edit`
                    }
                  })()}
                  className={`block h-56 border border-slate-700/50 hover:border-blue-500/50 rounded-xl overflow-hidden transition-all duration-50 hover:shadow-lg hover:shadow-blue-500/10 relative group/preview cursor-pointer ${isSmallScreen ? "pointer-events-auto" : ""}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  {map.nodes?.length > 0 ? (
                    <MindMapPreview
                      map={map}
                      isSmallScreen={isSmallScreen}
                      onInit={onInit}
                    />
                  ) : (
                    <div className="h-full flex items-center justify-center rounded-xl relative overflow-hidden">
                      {/* Base background */}
                      <div
                        className="absolute inset-0"
                        style={{
                          backgroundColor: map.backgroundColor || "rgba(30, 41, 59, 0.3)", // fallback to bg-slate-800/30
                        }}
                      />
                      {/* Gradient overlay for better visual appeal */}
                      {map.backgroundColor && (
                        <div className="absolute inset-0 bg-gradient-to-br from-black/10 via-transparent to-black/20" />
                      )}
                      {/* Content */}
                      <div className="text-center text-slate-500 relative z-10">
                        <Network className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Empty mindmap</p>
                        <p className="text-xs opacity-75">Click to start editing</p>
                      </div>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/20 to-transparent opacity-0 group-hover/preview:opacity-100 transition-opacity duration-50 pointer-events-none"></div>
                </a>
              </div>
            </div>
          ))}
  </div>
  </>
      )}

      <CreateMindmapModal
        isOpen={isCreating}
        onClose={() => setIsCreating(false)}
        onCreateMap={handleCreateMap}
        groups={groups}
      />

      <GroupMenu
        isOpen={openGroupMenuId !== null}
        position={groupMenuPosition}
        groupId={openGroupMenuId || ''}
        onEdit={() => {
          if (openGroupMenuId) {
            setGroupToEdit(openGroupMenuId)
            setOpenGroupMenuId(null)
            setGroupMenuPosition(null)
          }
        }}
        onDelete={() => {
          if (openGroupMenuId) {
            setGroupToDelete(openGroupMenuId)
            setOpenGroupMenuId(null)
            setGroupMenuPosition(null)
          }
        }}
        onClose={() => {
          setOpenGroupMenuId(null)
          setGroupMenuPosition(null)
        }}
      />

      <CreateGroupModal
        isOpen={isCreatingGroup}
        onClose={() => setIsCreatingGroup(false)}
        onCreateGroup={createGroup}
        availableMindmaps={getAllMaps()}
      />

      <EditGroupModal
        isOpen={!!groupToEdit}
        onClose={() => setGroupToEdit(null)}
        group={groups.find(g => g.id === groupToEdit) || null}
        availableMindmaps={getAllMaps()}
        onSave={editGroup}
      />

      {/* Group Deletion Confirmation Dialog */}
      {groupToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-xl rounded-2xl p-6 w-full max-w-md border border-slate-700/50 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                Delete Group
              </h2>
              <button
                onClick={() => setGroupToDelete(null)}
                className="p-2 text-slate-400 hover:text-slate-300 transition-colors rounded-lg hover:bg-slate-700/50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-6">
              <div className="flex items-center gap-3 mb-3">
                <AlertTriangle className="w-6 h-6 text-amber-500" />
                <p className="text-slate-300 font-medium">Are you sure you want to delete this group?</p>
              </div>
              <p className="text-slate-400 text-sm">
                "{groups.find(g => g.id === groupToDelete)?.name}" will be permanently deleted. The mindmaps in this group will not be affected.
              </p>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setGroupToDelete(null)}
                className="px-4 py-2 text-slate-400 hover:text-slate-300 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteGroup}
                className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-500 hover:to-red-600 transition-all duration-200 font-medium"
              >
                Delete Group
              </button>
            </div>
          </div>
        </div>
      )}





      {/* Add to Group Dialog */}
      {addToGroupMapId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-xl rounded-2xl p-6 w-full max-w-md border border-slate-700/50 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                Add to Group
              </h2>
              <button
                onClick={() => setAddToGroupMapId(null)}
                className="p-2 text-slate-400 hover:text-slate-300 transition-colors rounded-lg hover:bg-slate-700/50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4">
              <p className="text-slate-300 text-sm mb-3">
                Select groups to add "{getAllMaps().find(m => m.permalink === addToGroupMapId)?.title}" to:
              </p>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {groups.map((group) => {
                  const isSelected = editingGroupSelections[addToGroupMapId]?.includes(group.id)
                  return (
                    <button
                      key={group.id}
                      onClick={() => {
                        const currentSelections = editingGroupSelections[addToGroupMapId] || []
                        const newSelections = isSelected
                          ? currentSelections.filter(id => id !== group.id)
                          : [...currentSelections, group.id]
                        setEditingGroupSelections(prev => ({ ...prev, [addToGroupMapId]: newSelections }))
                      }}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all duration-200 ${isSelected
                        ? "bg-blue-500/20 border border-blue-500/50 text-blue-300"
                        : "bg-slate-700/30 hover:bg-slate-700/50 border border-slate-600/30 text-slate-300"
                        }`}
                    >
                      <div
                        className={`w-4 h-4 rounded border-2 flex items-center justify-center ${isSelected ? "bg-blue-500 border-blue-500" : "border-slate-500"
                          }`}
                      >
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </div>
                      {group.color && <div className="w-3 h-3 rounded-full" style={{ backgroundColor: group.color }} />}
                      <span className="flex-1 text-left">{group.name}</span>
                      <span className="text-xs text-slate-500">({group.mindmapIds.length})</span>
                    </button>
                  )
                })}
                {groups.length === 0 && (
                  <p className="text-slate-500 text-sm text-center py-4">
                    No groups yet. Create a group first.
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setAddToGroupMapId(null)}
                className="px-4 py-2 text-slate-400 hover:text-slate-300 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => handleApplyGroupChanges(addToGroupMapId)}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-500 hover:to-purple-500 transition-all duration-200 font-medium"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {mapToDelete && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setMapToDelete(null)
            }
          }}
        >
          <div
            className="bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-xl rounded-2xl p-6 w-full max-w-md shadow-2xl border border-slate-700/30"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-red-400" />
              <h2 className="text-xl font-bold text-white">Delete Mindmap</h2>
            </div>
            <p className="text-slate-300 mb-2">
              Are you sure you want to delete "{maps.find((map) => map.permalink === mapToDelete)?.title}"?
            </p>
            <p className="text-slate-400 text-sm mb-6">
              This action cannot be undone and all data will be permanently lost.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setMapToDelete(null)}
                className="px-6 py-2.5 text-slate-400 hover:text-slate-100 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-6 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all duration-200 font-medium"
              >
                Delete Forever
              </button>
            </div>
          </div>
        </div>
      )}
      {mapToEdit && (
        <EditDetailsModal
          isOpen={!!mapToEdit}
          onClose={() => setMapToEdit(null)}
          mapData={{
            id: maps.find((map) => map.permalink === mapToEdit)?.id, // Add mindmap ID for collaboration functionality
            permalink: maps.find((map) => map.permalink === mapToEdit)?.permalink || "",
            title: maps.find((map) => map.permalink === mapToEdit)?.title || "",
            description: maps.find((map) => map.permalink === mapToEdit)?.description || "",
            visibility: maps.find((map) => map.permalink === mapToEdit)?.visibility as "public" | "private" | "linkOnly",
            is_main: maps.find((map) => map.permalink === mapToEdit)?.is_main || false,
            collaborators: maps.find((map) => map.permalink === mapToEdit)?.collaborators || [],
            published_at: maps.find((map) => map.permalink === mapToEdit)?.published_at || null,
          }}
          showMainMapOption={false}
          username={maps.find((map) => map.permalink === mapToEdit)?.creatorUsername || user?.username}
          onSave={saveMapDetails}
        />
      )}

      {/* Publish Success Modal */}
      <PublishSuccessModal isVisible={showSuccessPopup} />

      {/* Leave Collaboration Confirmation */}
      {collaborationToLeave && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={(e) => { if (e.target === e.currentTarget) setCollaborationToLeave(null) }}>
          <div className="bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-xl rounded-2xl p-6 w-full max-w-md shadow-2xl border border-slate-700/30" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-red-400" />
              <h2 className="text-xl font-bold text-white">Leave Collaboration</h2>
            </div>
            <p className="text-slate-300 mb-2">Are you sure you want to leave this collaboration?</p>
            <p className="text-slate-400 text-sm mb-6">You will lose editing access unless re-invited.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setCollaborationToLeave(null)} className="px-6 py-2.5 text-slate-400 hover:text-slate-100 transition-colors font-medium">Cancel</button>
              <button onClick={handleLeaveCollaboration} className="px-6 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all duration-200 font-medium">Leave</button>
            </div>
          </div>
        </div>
      )}

      {/* Clone Success Modal */}
      <CloneSuccessModal isVisible={showCloneSuccessPopup} />

      {showInfoModal && selectedMindmapForInfo && (
        <InfoModal
          mindmap={selectedMindmapForInfo}
          onClose={() => {
            setShowInfoModal(false)
            setSelectedMindmapForInfo(null)
          }}
        />
      )}
    </div>
  )
}
