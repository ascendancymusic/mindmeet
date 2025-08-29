"use client"

import React from "react"
import { createPortal } from "react-dom"
import { Clock, X, ChevronDown, ChevronRight } from "lucide-react"

interface HistoryAction {
  type: "add_node" | "move_node" | "connect_nodes" | "disconnect_nodes" | "delete_node" | "update_node" | "update_title" | "resize_node" | "change_edge_type" | "change_background_color" | "change_dot_color" | "drawing_change" | "move_stroke"
  data: {
    nodes?: any[]
    edges?: any[]
    nodeId?: string
    position?: { x: number; y: number } | Record<string, { x: number; y: number }>
    connection?: any
    label?: string
    width?: number
    height?: number
    videoUrl?: string
    spotifyUrl?: string
    displayText?: string
    color?: string
    affectedNodes?: string[]
    edgeType?: 'default' | 'straight' | 'smoothstep'
    backgroundColor?: string
    dotColor?: string
    replacedEdgeId?: string
    drawingData?: any
    strokeId?: string
  }
  previousState?: {
    nodes: any[]
    edges: any[]
    title?: string
    edgeType?: 'default' | 'straight' | 'smoothstep'
    backgroundColor?: string
    dotColor?: string
    drawingData?: any
  }
}

interface HistoryModalProps {
  isOpen: boolean
  onClose: () => void
  history: HistoryAction[]
  currentHistoryIndex: number
  buttonRef: React.RefObject<HTMLButtonElement>
}

export function HistoryModal({ isOpen, onClose, history, currentHistoryIndex, buttonRef }: HistoryModalProps) {
  const [expandedGroups, setExpandedGroups] = React.useState<Set<number>>(new Set())

  // Helper function to format history action types for display
  const formatActionType = (type: string): string => {
    const actionMap: Record<string, string> = {
      add_node: "Added Node",
      move_node: "Moved Node",
      connect_nodes: "Connected Nodes",
      disconnect_nodes: "Disconnected Nodes",
      delete_node: "Deleted Node",
      update_node: "Updated Node",
      update_title: "Updated Title",
      resize_node: "Resized Node",
      change_edge_type: "Changed Edge Type",
      change_background_color: "Changed Background",
      change_dot_color: "Changed Dot Color",
      drawing_change: "Drawing Change",
      move_stroke: "Moved Stroke"
    }
    return actionMap[type] || type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  // Helper function to get action details for tooltip
  const getActionDetails = (action: HistoryAction): string => {
    switch (action.type) {
      case "add_node":
        return action.data.label ? `"${action.data.label}"` : "New node"
      case "delete_node":
        return action.data.affectedNodes ? `${action.data.affectedNodes.length} node(s)` : "Node"
      case "update_node":
        if (action.data.color) return "Color change"
        if (action.data.label) return `"${action.data.label}"`
        return "Node properties"
      case "move_node":
        return action.data.affectedNodes ? `${action.data.affectedNodes.length} node(s)` : "Node position"
      case "connect_nodes":
      case "disconnect_nodes":
        return "Node connection"
      case "update_title":
        return action.data.label ? `"${action.data.label}"` : "Title"
      case "resize_node":
        return `${action.data.width}×${action.data.height}`
      default:
        return ""
    }
  }

  // Helper function to check if two actions should be grouped
  const shouldGroupActions = (action1: HistoryAction, action2: HistoryAction): boolean => {
    // Group same action types - this is the main criteria
    if (action1.type !== action2.type) return false
    
    // For most action types, just group by type (consecutive same actions)
    // This will group all consecutive "move_node", "update_node", etc. together
    return true
  }

  // Group consecutive similar actions
  const groupActions = (actions: HistoryAction[]) => {
    if (actions.length === 0) return []
    
    const groups: Array<{
      type: 'single' | 'group'
      actions: HistoryAction[]
      startIndex: number
      endIndex: number
    }> = []
    
    let currentGroup: HistoryAction[] = [actions[0]]
    let groupStartIndex = currentHistoryIndex - (actions.length - 1)
    
    for (let i = 1; i < actions.length; i++) {
      const prevAction = actions[i - 1]
      const currentAction = actions[i]
      
      if (shouldGroupActions(prevAction, currentAction)) {
        currentGroup.push(currentAction)
      } else {
        // Finalize current group
        if (currentGroup.length > 1) {
          groups.push({
            type: 'group',
            actions: currentGroup,
            startIndex: groupStartIndex,
            endIndex: groupStartIndex + currentGroup.length - 1
          })
        } else {
          groups.push({
            type: 'single',
            actions: currentGroup,
            startIndex: groupStartIndex,
            endIndex: groupStartIndex
          })
        }
        
        // Start new group
        currentGroup = [currentAction]
        groupStartIndex = groupStartIndex + groups[groups.length - 1].actions.length
      }
    }
    
    // Add final group
    if (currentGroup.length > 1) {
      groups.push({
        type: 'group',
        actions: currentGroup,
        startIndex: groupStartIndex,
        endIndex: groupStartIndex + currentGroup.length - 1
      })
    } else {
      groups.push({
        type: 'single',
        actions: currentGroup,
        startIndex: groupStartIndex,
        endIndex: groupStartIndex
      })
    }
    
    return groups
  }

  // Get recent history items (last 15 actions for dropdown, then group them)
  const recentHistory = history.slice(Math.max(0, currentHistoryIndex - 14), currentHistoryIndex + 1).reverse()
  const groupedHistory = groupActions(recentHistory)

  const toggleGroup = (groupIndex: number) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev)
      if (newSet.has(groupIndex)) {
        newSet.delete(groupIndex)
      } else {
        newSet.add(groupIndex)
      }
      return newSet
    })
  }

  if (!isOpen) return null

  // Calculate position based on button
  const getPosition = () => {
    if (!buttonRef.current) return { left: 80, top: 200 }
    
    const buttonRect = buttonRef.current.getBoundingClientRect()
    return {
      left: buttonRect.right + 8, // 8px gap from button
      top: buttonRect.top - 8, // Slight offset up
    }
  }

  const position = getPosition()

  return createPortal(
    <>
      {/* Invisible backdrop for click-outside */}
      <div 
        className="fixed inset-0 z-[9999]"
        onClick={onClose}
      />
      
      {/* Dropdown Panel */}
      <div 
        className="fixed z-[10000] w-72 max-h-96 bg-gradient-to-br from-slate-800/95 via-slate-900/95 to-purple-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden"
        style={{
          left: position.left,
          top: position.top,
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-white/10">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-white/90" />
            <div>
              <h3 className="text-sm font-semibold text-white/90">Recent Actions</h3>
              <p className="text-xs text-white/60">
                {currentHistoryIndex + 1} of {history.length}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 transition-colors text-white/70 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-2 max-h-80 overflow-y-auto" style={{
          scrollbarColor: "rgb(147, 34, 192) rgb(34, 34, 44)",
          scrollbarWidth: "thin",
        }}>
          {groupedHistory.length === 0 ? (
            <div className="p-6 text-center text-white/50">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm font-medium mb-1">No History Available</p>
              <p className="text-xs">Start making changes to see history.</p>
            </div>
          ) : (
            <div className="space-y-1">
              {groupedHistory.map((group, groupIndex) => {
                if (group.type === 'single') {
                  const action = group.actions[0]
                  const actualIndex = group.startIndex
                  const isCurrentAction = actualIndex === currentHistoryIndex
                  const details = getActionDetails(action)
                  
                  return (
                    <div
                      key={`single-${actualIndex}-${action.type}`}
                      className={`p-2 rounded-lg transition-all duration-200 ${
                        isCurrentAction 
                          ? "bg-blue-500/20 border border-blue-400/30" 
                          : "hover:bg-white/5"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <div className={`text-xs font-medium text-white/90 truncate ${
                              isCurrentAction ? "text-blue-100" : ""
                            }`}>
                              {formatActionType(action.type)}
                            </div>
                            {isCurrentAction && (
                              <div className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
                            )}
                          </div>
                          {details && (
                            <div className="text-xs text-white/60 truncate mt-0.5">
                              {details}
                            </div>
                          )}
                        </div>
                        <div className="text-xs text-white/40 ml-2 flex-shrink-0 font-mono">
                          #{actualIndex + 1}
                        </div>
                      </div>
                    </div>
                  )
                } else {
                  // Group of actions
                  const isExpanded = expandedGroups.has(groupIndex)
                  const firstAction = group.actions[0]
                  const hasCurrentAction = group.startIndex <= currentHistoryIndex && currentHistoryIndex <= group.endIndex
                  const groupDetails = getActionDetails(firstAction)
                  
                  return (
                    <div key={`group-${groupIndex}`} className="space-y-1">
                      {/* Group Header */}
                      <button
                        onClick={() => toggleGroup(groupIndex)}
                        className={`w-full p-2 rounded-lg transition-all duration-200 text-left ${
                          hasCurrentAction 
                            ? "bg-blue-500/20 border border-blue-400/30" 
                            : "hover:bg-white/5 bg-white/3"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              {isExpanded ? (
                                <ChevronDown className="w-3 h-3 text-white/60 flex-shrink-0" />
                              ) : (
                                <ChevronRight className="w-3 h-3 text-white/60 flex-shrink-0" />
                              )}
                              <div className={`text-xs font-medium text-white/90 truncate ${
                                hasCurrentAction ? "text-blue-100" : ""
                              }`}>
                                {formatActionType(firstAction.type)} ({group.actions.length}×)
                              </div>
                              {hasCurrentAction && (
                                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
                              )}
                            </div>
                            {groupDetails && (
                              <div className="text-xs text-white/60 truncate mt-0.5 ml-5">
                                {groupDetails}
                              </div>
                            )}
                          </div>
                          <div className="text-xs text-white/40 ml-2 flex-shrink-0 font-mono">
                            #{group.startIndex + 1}-#{group.endIndex + 1}
                          </div>
                        </div>
                      </button>
                      
                      {/* Expanded Group Items */}
                      {isExpanded && (
                        <div className="ml-4 space-y-1 border-l border-white/10 pl-2">
                          {group.actions.map((action, actionIndex) => {
                            const actualIndex = group.startIndex + actionIndex
                            const isCurrentAction = actualIndex === currentHistoryIndex
                            const details = getActionDetails(action)
                            
                            return (
                              <div
                                key={`group-item-${actualIndex}-${action.type}`}
                                className={`p-1.5 rounded-md transition-all duration-200 ${
                                  isCurrentAction 
                                    ? "bg-blue-500/30 border border-blue-400/40" 
                                    : "hover:bg-white/5"
                                }`}
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center space-x-2">
                                      <div className={`text-xs text-white/80 truncate ${
                                        isCurrentAction ? "text-blue-100 font-medium" : ""
                                      }`}>
                                        {formatActionType(action.type)}
                                      </div>
                                      {isCurrentAction && (
                                        <div className="w-1 h-1 bg-blue-400 rounded-full" />
                                      )}
                                    </div>
                                    {details && (
                                      <div className="text-xs text-white/50 truncate mt-0.5">
                                        {details}
                                      </div>
                                    )}
                                  </div>
                                  <div className="text-xs text-white/30 ml-2 flex-shrink-0 font-mono">
                                    #{actualIndex + 1}
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                }
              })}
            </div>
          )}
          
          {history.length > 15 && (
            <div className="mt-2 pt-2 border-t border-white/10 text-center">
              <p className="text-xs text-white/50">
                Showing last 15 of {history.length} actions
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-2 border-t border-white/10 bg-white/5">
          <div className="text-xs text-white/60 text-center">
            Ctrl+Z/Y to undo/redo • ESC to close
          </div>
        </div>
      </div>
    </>,
    document.body
  )
}