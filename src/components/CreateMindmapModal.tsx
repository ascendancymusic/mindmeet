"use client"

import type React from "react"
import { useState, useEffect, useMemo } from "react"
import { X, Network, GitBranch, Workflow, Folder, Briefcase, Music, Heart, Lightbulb, Target, Zap, Coffee, Book, Palette, Users } from "lucide-react"
import { supabase } from "../supabaseClient"
import { useAuthStore } from "../store/authStore"

interface Group {
  id: string
  name: string
  icon: string
  createdAt: number
}

interface CreateMindmapModalProps {
  isOpen: boolean
  onClose: () => void
  onCreateMap: (title: string, customPermalink?: string, selectedGroupIds?: string[], templateId?: string) => Promise<void>
  groups: Group[]
}

export default function CreateMindmapModal({ isOpen, onClose, onCreateMap, groups }: CreateMindmapModalProps) {
  const [newMapTitle, setNewMapTitle] = useState("")
  const [customPermalink, setCustomPermalink] = useState("")
  const [isPermalinkCustomized, setIsPermalinkCustomized] = useState(false)
  const [permalinkError, setPermalinkError] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [selectedType, setSelectedType] = useState<"mindmap" | "decision" | "flowchart">("mindmap")
  const [selectedTemplate, setSelectedTemplate] = useState("empty")
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([])
  
  const { user } = useAuthStore()

  // Helper function to sanitize title into permalink
  const sanitizeTitle = (title: string): string => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
  }

  // Group icon mapping
  const groupIconComponents = {
    Folder,
    Briefcase,
    Music,
    Heart,
    Lightbulb,
    Target,
    Zap,
    Coffee,
    Book,
    Palette,
    Users,
    Network, // fallback
  }

  // Auto-generate permalink from title with conflict resolution
  const autoPermalink = useMemo(() => {
    if (!newMapTitle.trim()) return ""
    
    const basePermalink = sanitizeTitle(newMapTitle)
    if (!basePermalink) return ""
    
    // We'll use a simple approach - check for conflicts and increment
    // This mirrors the logic in mindMapStore but for preview purposes
    return basePermalink
  }, [newMapTitle])

  // Get available permalink (handles conflicts automatically)
  const [availablePermalink, setAvailablePermalink] = useState("")
  
  // Check and set available permalink
  useEffect(() => {
    const getAvailablePermalink = async () => {
      if (!autoPermalink || !user?.id) {
        setAvailablePermalink("")
        return
      }

      try {
        const { data: existingMaps, error } = await supabase
          .from("mindmaps")
          .select("permalink")
          .eq("creator", user.id)

        if (error) throw error

        const existingPermalinks = existingMaps?.map(m => m.permalink) || []
        
        // Find available permalink using same logic as addMap
        let permalink = autoPermalink
        let counter = 1
        
        while (existingPermalinks.includes(permalink)) {
          permalink = `${autoPermalink}-${counter}`
          counter++
        }
        
        setAvailablePermalink(permalink)
      } catch (error) {
        console.error("Error checking permalink availability:", error)
        setAvailablePermalink(autoPermalink)
      }
    }

    const timeoutId = setTimeout(getAvailablePermalink, 300)
    return () => clearTimeout(timeoutId)
  }, [autoPermalink, user?.id])

  // Current permalink to display (custom or available auto-generated)
  const currentPermalink = isPermalinkCustomized ? customPermalink : availablePermalink

  // Get base URL for permalink display
  const baseUrl = useMemo(() => {
    const url = window.location.origin
    return url.endsWith('/') ? url.slice(0, -1) : url
  }, [])

  // Check for permalink conflicts in real-time (only for custom permalinks)
  useEffect(() => {
    const checkPermalinkConflict = async () => {
      // Only check conflicts for custom permalinks
      if (!isPermalinkCustomized || !customPermalink.trim() || !user?.id) {
        setPermalinkError(null)
        return
      }

      try {
        const { data: existingMaps, error } = await supabase
          .from("mindmaps")
          .select("permalink, title")
          .eq("creator", user.id)
          .eq("permalink", customPermalink)

        if (error) throw error

        if (existingMaps && existingMaps.length > 0) {
          setPermalinkError(`Permalink already in use in your mindmap "${existingMaps[0].title}"`)
        } else {
          setPermalinkError(null)
        }
      } catch (error) {
        console.error("Error checking permalink:", error)
      }
    }

    // Debounce the check to avoid too many database calls
    const timeoutId = setTimeout(checkPermalinkConflict, 500)
    return () => clearTimeout(timeoutId)
  }, [isPermalinkCustomized, customPermalink, user?.id])

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMapTitle(e.target.value)
    // Reset customization when title changes (unless user has explicitly customized)
    if (!isPermalinkCustomized) {
      setCustomPermalink("")
    }
  }

  const handlePermalinkChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sanitizedValue = e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, '')
    setCustomPermalink(sanitizedValue)
    setIsPermalinkCustomized(sanitizedValue.length > 0)
  }

  const toggleGroupSelection = (groupId: string) => {
    setSelectedGroupIds(prev => 
      prev.includes(groupId) 
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    )
  }

  type Template = {
    id: string;
    name: string;
    enabled: boolean;
    icon?: typeof Palette;
  };

  const diagramTypes = [
    {
      id: "mindmap" as const,
      name: "Mindmap Tree",
      icon: Network,
      enabled: true,
      templates: [
        { id: "empty", name: "Empty", enabled: true },
        { id: "whiteboard", name: "Whiteboard", enabled: true, icon: Palette },
        { id: "project", name: "Project Planning", enabled: false },
      ] as Template[],
    },
    {
      id: "decision" as const,
      name: "Decision Tree",
      icon: GitBranch,
      enabled: false,
      templates: [
        { id: "empty", name: "Empty", enabled: false, icon: undefined },
        { id: "business", name: "Business Decision", enabled: false, icon: undefined },
        { id: "personal", name: "Personal Choice", enabled: false, icon: undefined },
      ] as Template[],
    },
    {
      id: "flowchart" as const,
      name: "Flowchart",
      icon: Workflow,
      enabled: false,
      templates: [
        { id: "empty", name: "Empty", enabled: false, icon: undefined },
        { id: "process", name: "Process Flow", enabled: false, icon: undefined },
        { id: "algorithm", name: "Algorithm", enabled: false, icon: undefined },
      ] as Template[],
    },
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMapTitle.trim() || isCreating || permalinkError) return

    setIsCreating(true)
    try {
      const finalPermalink = isPermalinkCustomized && customPermalink ? customPermalink : undefined
      await onCreateMap(newMapTitle.trim(), finalPermalink, selectedGroupIds.length > 0 ? selectedGroupIds : undefined, selectedTemplate)
      setNewMapTitle("")
      setCustomPermalink("")
      setIsPermalinkCustomized(false)
      setPermalinkError(null)
      setAvailablePermalink("")
      setSelectedGroupIds([])
      onClose()
    } catch (error) {
      console.error("Error creating mindmap:", error)
    } finally {
      setIsCreating(false)
    }
  }

  const handleClose = () => {
    if (!isCreating) {
      setNewMapTitle("")
      setCustomPermalink("")
      setIsPermalinkCustomized(false)
      setPermalinkError(null)
      setAvailablePermalink("")
      setSelectedGroupIds([])
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50">
      <div className="bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-xl rounded-2xl w-full max-w-2xl max-h-[95vh] border border-slate-700/50 shadow-2xl overflow-hidden flex flex-col">
        <div className="px-4 sm:px-6 py-4 sm:py-6 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 sm:space-x-4 min-w-0">
              <div className="p-2 sm:p-3 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-2xl border border-white/10 flex-shrink-0">
                <Network className="w-5 h-5 sm:w-6 sm:h-6 text-blue-300" />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-white via-blue-100 to-purple-200 bg-clip-text text-transparent">
                  Create New Diagram
                </h2>
                <p className="text-slate-400 text-xs sm:text-sm mt-1 hidden sm:block">Choose a diagram type and template to get started</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              disabled={isCreating}
              className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-6 space-y-3 overflow-y-auto flex-1">
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">Diagram Title</label>
            <input
              type="text"
              value={newMapTitle}
              onChange={handleTitleChange}
              placeholder="Enter a descriptive title for your diagram..."
              className="w-full px-3 py-2 bg-slate-800 border border-purple-900/20 rounded-lg text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400/20 transition-all duration-200 backdrop-blur-sm text-sm"
              autoFocus
              maxLength={50}
              disabled={isCreating}
            />
            <div className="flex justify-between items-center mt-1">
              <p className="text-xs text-slate-400">Give your diagram a clear, descriptive name</p>
              <p className="text-xs text-slate-300 font-mono">{newMapTitle.length}/50</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">Permalink</label>
            <div className="flex items-center min-w-0 overflow-hidden rounded-lg border border-purple-900/20 focus-within:border-purple-400/20 focus-within:ring-2 focus-within:ring-purple-500/20 transition-all duration-200">
              <span className="bg-slate-700/50 px-2 py-2 text-slate-400 text-xs whitespace-nowrap flex-shrink-0 max-w-[60%] sm:max-w-[70%] overflow-hidden text-ellipsis">
                {baseUrl}/{user?.username}/
              </span>
              <input
                type="text"
                value={currentPermalink}
                onChange={handlePermalinkChange}
                placeholder={availablePermalink || "auto-generated"}
                className={`w-0 flex-grow min-w-[60px] px-2 py-2 bg-slate-800 ${
                  permalinkError ? "border-l border-red-500/50" : "border-l border-slate-700/30"
                } text-slate-100 placeholder-slate-400 focus:outline-none text-xs backdrop-blur-sm`}
                disabled={isCreating}
              />
            </div>
            {permalinkError && (
              <p className="text-red-400 text-sm mt-1 flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-red-400"></span>
                {permalinkError}
              </p>
            )}
            <div className="flex justify-between items-center mt-1">
              <p className="text-xs text-slate-400">
                {isPermalinkCustomized 
                  ? "Custom permalink - only lowercase letters, numbers, hyphens, and underscores"
                  : "Auto-generated from title - edit to customize"
                }
              </p>
              {isPermalinkCustomized && (
                <button
                  type="button"
                  onClick={() => {
                    setCustomPermalink("")
                    setIsPermalinkCustomized(false)
                    setPermalinkError(null)
                  }}
                  className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
                  disabled={isCreating}
                >
                  Reset to auto
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">Diagram Type</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
              {diagramTypes.map((type) => {
                const Icon = type.icon
                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => type.enabled && setSelectedType(type.id)}
                    disabled={!type.enabled}
                    className={`p-2 sm:p-2.5 rounded-lg border transition-all duration-200 text-left relative backdrop-blur-sm ${
                      selectedType === type.id
                        ? "border-purple-400/50 bg-gradient-to-br from-purple-500/20 to-blue-500/20 text-purple-200 shadow-lg shadow-purple-500/20"
                        : type.enabled
                          ? "border-white/10 bg-gradient-to-br from-slate-800/90 to-purple-900/90 text-slate-300 hover:border-white/20 hover:bg-gradient-to-br hover:from-slate-700/90 hover:to-purple-800/90 hover:shadow-md"
                          : "border-white/5 bg-gradient-to-br from-slate-800/50 to-slate-900/50 text-slate-500 cursor-not-allowed"
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span className="font-medium text-sm">{type.name}</span>
                    </div>
                    {!type.enabled && (
                      <div className="absolute top-1.5 right-1.5">
                        <span className="text-xs bg-slate-700/80 text-slate-300 px-1.5 py-0.5 rounded-full border border-white/10">
                          Soon
                        </span>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">Template</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
              {diagramTypes
                .find((type) => type.id === selectedType)
                ?.templates.map((template) => {
                  // Palette icon for Whiteboard
                  const Icon = template.id === "whiteboard" && template.icon ? template.icon : null
                  return (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => template.enabled && setSelectedTemplate(template.id)}
                      disabled={!template.enabled}
                      className={`p-2 sm:p-2.5 rounded-lg border transition-all duration-200 text-left relative backdrop-blur-sm ${
                        selectedTemplate === template.id
                          ? "border-purple-400/50 bg-gradient-to-br from-purple-500/20 to-blue-500/20 text-purple-200 shadow-lg shadow-purple-500/20"
                          : template.enabled
                            ? "border-white/10 bg-gradient-to-br from-slate-900/90 to-slate-800/90 text-white hover:border-white/20 hover:bg-gradient-to-br hover:from-slate-800/90 hover:to-purple-800/90"
                            : "border-white/5 bg-gradient-to-br from-slate-900/80 to-slate-900/50 text-slate-600 cursor-not-allowed"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium flex items-center gap-2 text-sm">
                          {Icon && <Icon className="w-4 h-4 text-purple-300" />} {template.name}
                        </span>
                        {!template.enabled && template.id !== "empty" && (
                          <span className="text-xs bg-slate-700/80 text-slate-300 px-1.5 py-0.5 rounded-full border border-white/10">
                            Soon
                          </span>
                        )}
                      </div>
                      {template.id === "empty" && (
                        <p className="text-xs text-slate-400 mt-1.5">Start with a blank canvas</p>
                      )}
                      {template.id === "whiteboard" && (
                        <p className="text-xs text-slate-400 mt-1.5">For drawing and sketching on a white background</p>
                      )}
                    </button>
                  )
                })}
            </div>
          </div>

          {groups.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">
                Add to Groups
                <span className="text-slate-400 text-xs font-normal ml-2">(optional)</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-28 sm:max-h-32 overflow-y-auto">
                {groups.map((group) => {
                  const IconComponent = groupIconComponents[group.icon as keyof typeof groupIconComponents] || Network
                  const isSelected = selectedGroupIds.includes(group.id)
                  
                  return (
                    <button
                      key={group.id}
                      type="button"
                      onClick={() => toggleGroupSelection(group.id)}
                      className={`flex items-center space-x-2 p-2 rounded-lg border transition-all duration-200 text-left backdrop-blur-sm ${
                        isSelected
                          ? "border-purple-400/50 bg-gradient-to-br from-purple-500/20 to-blue-500/20 text-purple-200 shadow-lg shadow-purple-500/20"
                          : "border-white/10 bg-gradient-to-br from-slate-800/90 to-purple-900/90 text-slate-300 hover:border-white/20 hover:bg-gradient-to-br hover:from-slate-700/90 hover:to-purple-800/90"
                      }`}
                    >
                      <div className={`w-3 h-3 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
                        isSelected 
                          ? "border-purple-400 bg-purple-500" 
                          : "border-slate-400"
                      }`}>
                        {isSelected && (
                          <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <IconComponent className="w-3 h-3 flex-shrink-0" />
                      <span className="font-medium text-xs truncate">{group.name}</span>
                    </button>
                  )
                })}
              </div>
              {selectedGroupIds.length > 0 && (
                <p className="text-xs text-slate-400 mt-2">
                  {selectedGroupIds.length} group{selectedGroupIds.length === 1 ? '' : 's'} selected
                </p>
              )}
            </div>
          )}
        </div>

        <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-700/50 bg-slate-800/50 backdrop-blur-sm flex-shrink-0">
          <form onSubmit={handleSubmit}>
            <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3">
              <button
                type="button"
                onClick={handleClose}
                disabled={isCreating}
                className="px-4 py-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!newMapTitle.trim() || isCreating || selectedType !== "mindmap" || (selectedTemplate !== "empty" && selectedTemplate !== "whiteboard") || !!permalinkError}
                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-500 hover:to-purple-500 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-lg text-sm"
              >
                {isCreating ? "Creating..." : "Create Diagram"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
