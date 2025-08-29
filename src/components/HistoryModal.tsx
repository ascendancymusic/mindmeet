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
  const [visibleCount, setVisibleCount] = React.useState(15)

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

  // Get recent history items (last visibleCount actions for dropdown, then group them)
  const recentHistory = history.slice(Math.max(0, currentHistoryIndex - (visibleCount - 1)), currentHistoryIndex + 1).reverse()
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
          overflowX: "hidden"
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
                      className={`p-2 rounded-lg transition-all duration-200 flex items-center hover:bg-gradient-to-br hover:from-purple-700/20 hover:via-purple-900/30 hover:to-blue-900/20`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <div className={`text-xs font-medium text-white/90 truncate ${
                            isCurrentAction ? "text-blue-100" : ""
                          }`}>
                            {formatActionType(action.type)}
                          </div>
                          {/* Removed blue dot for current action */}
                        </div>
                        {details && (
                          <div className="text-xs text-white/60 truncate mt-0.5">
                            {details}
                          </div>
                        )}
                      </div>
                      <div className="relative flex items-center justify-center ml-2">
                        <button
                          className="group flex items-center justify-center w-7 h-7 rounded-full border border-purple-400/30 bg-gradient-to-br from-purple-700/30 via-purple-900/40 to-blue-900/30 backdrop-blur-md text-white/70 hover:text-white/90 hover:from-purple-700/50 hover:to-blue-900/50 transition-all overflow-hidden"
                          tabIndex={-1}
                          type="button"
                          // onClick: not implemented yet
                          style={{ minWidth: 28 }}
                        >
                          <X className="w-4 h-4 z-10 transition-all" />
                        </button>
                        <span className="pointer-events-none select-none absolute left-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 group-hover:left-10 transition-all bg-gradient-to-br from-purple-700/80 via-purple-900/90 to-blue-900/80 px-2 py-0.5 rounded text-xs text-white/90 shadow-lg border border-purple-400/30 ml-1" style={{whiteSpace:'nowrap'}}>
                          Undo
                        </span>
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
                      <div
                        className="w-full p-2 rounded-lg transition-all duration-200 flex items-center hover:bg-gradient-to-br hover:from-purple-700/20 hover:via-purple-900/30 hover:to-blue-900/20"
                        style={{ cursor: 'pointer' }}
                        onClick={() => toggleGroup(groupIndex)}
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-3 h-3 text-white/60 flex-shrink-0 mr-2" />
                        ) : (
                          <ChevronRight className="w-3 h-3 text-white/60 flex-shrink-0 mr-2" />
                        )}
                        <span className="text-xs font-medium text-white/90 truncate">{formatActionType(firstAction.type)} ({group.actions.length}×)</span>
                        {/* No highlight or blue dot for current action in group row */}
                        <div className="flex-1" />
                        <div className="relative flex items-center justify-center ml-2">
                          <button
                            className="group flex items-center justify-center w-7 h-7 rounded-full border border-purple-400/30 bg-gradient-to-br from-purple-700/30 via-purple-900/40 to-blue-900/30 backdrop-blur-md text-white/70 hover:text-white/90 hover:from-purple-700/50 hover:to-blue-900/50 transition-all overflow-hidden"
                            tabIndex={-1}
                            type="button"
                            // onClick: not implemented yet
                            style={{ minWidth: 28 }}
                            onClick={e => e.stopPropagation()}
                          >
                            <X className="w-4 h-4 z-10 transition-all" />
                          </button>
                          <span className="pointer-events-none select-none absolute left-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 group-hover:left-10 transition-all bg-gradient-to-br from-purple-700/80 via-purple-900/90 to-blue-900/80 px-2 py-0.5 rounded text-xs text-white/90 shadow-lg border border-purple-400/30 ml-1" style={{whiteSpace:'nowrap'}}>
                            Undo All
                          </span>
                        </div>
                      </div>
                      {/* No sub text for grouped actions */}
                      
                      {/* Expanded Group Items */}
                      {isExpanded && (
                        <div className="ml-4 space-y-1 border-l border-white/10 pl-2">
                          {group.actions.map((action, actionIndex) => {
                            const actualIndex = group.startIndex + actionIndex
                            const details = getActionDetails(action)
                            return (
                              <div
                                key={`group-item-${actualIndex}-${action.type}`}
                                className="p-1.5 rounded-md transition-all duration-200 hover:bg-white/5"
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center space-x-2">
                                      <div className="text-xs text-white/80 truncate">
                                        {formatActionType(action.type)}
                                      </div>
                                    </div>
                                    {details && (
                                      <div className="text-xs text-white/50 truncate mt-0.5">
                                        {details}
                                      </div>
                                    )}
                                  </div>
                                  {/* Removed #number and highlight for group items */}
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
          
          {history.length > visibleCount && (
            <div className="mt-2 pt-2 border-t border-white/10 text-center">
              <button
                className="px-3 py-1 text-xs rounded bg-gradient-to-br from-purple-700/60 via-purple-900/70 to-blue-900/60 text-white/80 hover:bg-purple-700/80 transition-colors shadow"
                onClick={() => setVisibleCount(v => Math.min(v + 15, history.length))}
              >
                Show more
              </button>
              <p className="text-xs text-white/40 mt-1">
                Showing last {Math.min(visibleCount, history.length)} of {history.length} actions
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