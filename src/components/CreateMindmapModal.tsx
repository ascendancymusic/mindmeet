"use client"

import type React from "react"
import { useState } from "react"
import { X, Network, GitBranch, Workflow } from "lucide-react"

interface CreateMindmapModalProps {
  isOpen: boolean
  onClose: () => void
  onCreateMap: (title: string) => Promise<void>
}

export default function CreateMindmapModal({ isOpen, onClose, onCreateMap }: CreateMindmapModalProps) {
  const [newMapTitle, setNewMapTitle] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [selectedType, setSelectedType] = useState<"mindmap" | "decision" | "flowchart">("mindmap")
  const [selectedTemplate, setSelectedTemplate] = useState("empty")

  const diagramTypes = [
    {
      id: "mindmap" as const,
      name: "Mindmap Tree",
      icon: Network,
      enabled: true,
      templates: [
        { id: "empty", name: "Empty", enabled: true },
        { id: "brainstorm", name: "Brainstorming", enabled: false },
        { id: "project", name: "Project Planning", enabled: false },
      ],
    },
    {
      id: "decision" as const,
      name: "Decision Tree",
      icon: GitBranch,
      enabled: false,
      templates: [
        { id: "empty", name: "Empty", enabled: false },
        { id: "business", name: "Business Decision", enabled: false },
        { id: "personal", name: "Personal Choice", enabled: false },
      ],
    },
    {
      id: "flowchart" as const,
      name: "Flowchart",
      icon: Workflow,
      enabled: false,
      templates: [
        { id: "empty", name: "Empty", enabled: false },
        { id: "process", name: "Process Flow", enabled: false },
        { id: "algorithm", name: "Algorithm", enabled: false },
      ],
    },
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMapTitle.trim() || isCreating) return

    setIsCreating(true)
    try {
      await onCreateMap(newMapTitle.trim())
      setNewMapTitle("")
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
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-xl rounded-2xl w-full max-w-2xl border border-slate-700/50 shadow-2xl overflow-hidden">
        <div className="px-6 py-6 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-2xl border border-white/10">
                <Network className="w-6 h-6 text-blue-300" />
              </div>
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-white via-blue-100 to-purple-200 bg-clip-text text-transparent">
                  Create New Diagram
                </h2>
                <p className="text-slate-400 text-sm mt-1">Choose a diagram type and template to get started</p>
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

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-semibold text-slate-200 mb-3">Diagram Title</label>
            <input
              type="text"
              value={newMapTitle}
              onChange={(e) => setNewMapTitle(e.target.value)}
              placeholder="Enter a descriptive title for your diagram..."
              className="w-full px-4 py-3 bg-slate-800 border border-purple-900/20 rounded-2xl text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400/20 transition-all duration-200 backdrop-blur-sm shadow-[0_0_0_2px_rgba(128,90,213,0.04)]"
              autoFocus
              maxLength={50}
              disabled={isCreating}
            />
            <div className="flex justify-between items-center mt-2">
              <p className="text-xs text-slate-400">Give your diagram a clear, descriptive name</p>
              <p className="text-xs text-slate-300 font-mono">{newMapTitle.length}/50</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-200 mb-3">Diagram Type</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {diagramTypes.map((type) => {
                const Icon = type.icon
                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => type.enabled && setSelectedType(type.id)}
                    disabled={!type.enabled}
                    className={`p-5 rounded-2xl border transition-all duration-200 text-left relative backdrop-blur-sm ${
                      selectedType === type.id
                        ? "border-purple-400/50 bg-gradient-to-br from-purple-500/20 to-blue-500/20 text-purple-200 shadow-lg shadow-purple-500/20"
                        : type.enabled
                          ? "border-white/10 bg-gradient-to-br from-slate-800/90 to-purple-900/90 text-slate-300 hover:border-white/20 hover:bg-gradient-to-br hover:from-slate-700/90 hover:to-purple-800/90 hover:shadow-md"
                          : "border-white/5 bg-gradient-to-br from-slate-800/50 to-slate-900/50 text-slate-500 cursor-not-allowed"
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <Icon className="w-5 h-5" />
                      <span className="font-medium">{type.name}</span>
                    </div>
                    {!type.enabled && (
                      <div className="absolute top-3 right-3">
                        <span className="text-xs bg-slate-700/80 text-slate-300 px-2 py-1 rounded-full border border-white/10">
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
            <label className="block text-sm font-semibold text-slate-200 mb-3">Template</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {diagramTypes
                .find((type) => type.id === selectedType)
                ?.templates.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => template.enabled && setSelectedTemplate(template.id)}
                    disabled={!template.enabled}
                    className={`p-5 rounded-2xl border transition-all duration-200 text-left relative backdrop-blur-sm ${
                      selectedTemplate === template.id
                        ? "border-purple-400/50 bg-gradient-to-br from-purple-500/20 to-blue-500/20 text-purple-200 shadow-lg shadow-purple-500/20"
                        : template.enabled
                          ? "border-white/10 bg-gradient-to-br from-slate-800/90 to-purple-900/90 text-slate-300 hover:border-white/20 hover:bg-gradient-to-br hover:from-slate-700/90 hover:to-purple-800/90"
                          : "border-white/5 bg-gradient-to-br from-slate-800/50 to-slate-900/50 text-slate-500 cursor-not-allowed"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{template.name}</span>
                      {!template.enabled && template.id !== "empty" && (
                        <span className="text-xs bg-slate-700/80 text-slate-300 px-2 py-1 rounded-full border border-white/10">
                          Soon
                        </span>
                      )}
                    </div>
                    {template.id === "empty" && (
                      <p className="text-xs text-slate-400 mt-2">Start with a blank canvas</p>
                    )}
                  </button>
                ))}
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-700/50">
            <button
              type="button"
              onClick={handleClose}
              disabled={isCreating}
              className="px-6 py-3 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!newMapTitle.trim() || isCreating || selectedType !== "mindmap" || selectedTemplate !== "empty"}
              className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-500 hover:to-purple-500 transition-all duration-200 font-semibold transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-lg"
            >
              {isCreating ? "Creating..." : "Create Diagram"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
