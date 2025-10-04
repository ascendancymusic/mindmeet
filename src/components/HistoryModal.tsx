"use client"

import React from "react"
// Helper to format time ago
function formatTimeAgo(date: Date | string | undefined): string {
  if (!date) return "";
  const now = new Date();
  const d = typeof date === 'string' ? new Date(date) : date;
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
  return d.toLocaleDateString();
}
import { createPortal } from "react-dom"
import { Clock, X, ChevronDown, ChevronRight } from "lucide-react"

interface HistoryAction {
  type: "add_node" | "move_node" | "connect_nodes" | "disconnect_nodes" | "delete_node" | "update_node" | "update_title" | "resize_node" | "change_edge_type" | "change_background_color" | "change_dot_color" | "drawing_change" | "move_stroke" | "update_customization"
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
  onJumpToHistory?: (index: number) => void
}

export function HistoryModal({ isOpen, onClose, history, currentHistoryIndex, buttonRef, onJumpToHistory }: HistoryModalProps) {
  const [expandedGroups, setExpandedGroups] = React.useState<Set<number>>(new Set())
  const [visibleCount, setVisibleCount] = React.useState(15)

  // Use currentHistoryIndex as the source of truth instead of separate state
  const selectedIndex = currentHistoryIndex

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
      move_stroke: "Moved Stroke",
      update_customization: "Updated Customization"
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

    // For node-related actions, also check if they affect the same node
    const nodeRelatedActions = ['move_node', 'update_node', 'resize_node', 'delete_node'];
    if (nodeRelatedActions.includes(action1.type)) {
      // Check if both actions affect the same node
      const nodeId1 = action1.data.nodeId;
      const nodeId2 = action2.data.nodeId;

      // Only group if they affect the same node
      if (nodeId1 && nodeId2 && nodeId1 === nodeId2) {
        return true;
      }

      // For move_node actions, also check if they're part of the same multi-node move
      if (action1.type === 'move_node' && action2.type === 'move_node') {
        // Check if the position data contains the same set of nodes
        const positions1 = action1.data.position;
        const positions2 = action2.data.position;

        if (positions1 && positions2 && typeof positions1 === 'object' && typeof positions2 === 'object') {
          const nodeIds1 = Object.keys(positions1).sort();
          const nodeIds2 = Object.keys(positions2).sort();

          // Group if they affect the same set of nodes (multi-selection moves)
          if (nodeIds1.length === nodeIds2.length &&
            nodeIds1.every((id, index) => id === nodeIds2[index])) {
            return true;
          }
        }
      }

      // Don't group if they affect different nodes
      return false;
    }

    // For edge-related actions, check if they affect the same connection
    const edgeRelatedActions = ['connect_nodes', 'disconnect_nodes'];
    if (edgeRelatedActions.includes(action1.type)) {
      const connection1 = action1.data.connection;
      const connection2 = action2.data.connection;

      if (connection1 && connection2) {
        // Group if they affect the same source-target pair
        return connection1.source === connection2.source &&
          connection1.target === connection2.target;
      }

      return false;
    }

    // For drawing actions, group consecutive drawing changes
    const drawingActions = ['drawing_change', 'move_stroke'];
    if (drawingActions.includes(action1.type)) {
      return true; // Group all consecutive drawing actions
    }

    // For global actions (title, colors, edge types), group consecutive changes
    const globalActions = ['update_title', 'change_edge_type', 'change_background_color', 'change_dot_color'];
    if (globalActions.includes(action1.type)) {
      return true; // Group consecutive global changes
    }

    // For add_node actions, don't group (each node addition is distinct)
    if (action1.type === 'add_node') {
      return false;
    }

    // Default: don't group
    return false;
  }

  // Group consecutive similar actions
  const groupActions = (actionsWithIndices: Array<{ action: HistoryAction, actualIndex: number }>) => {
    if (actionsWithIndices.length === 0) return []

    const groups: Array<{
      type: 'single' | 'group'
      actions: HistoryAction[]
      startIndex: number
      endIndex: number
      actionIndices?: number[] // Store individual indices for grouped actions
    }> = []

    let currentGroup: Array<{ action: HistoryAction, actualIndex: number }> = [actionsWithIndices[0]]

    for (let i = 1; i < actionsWithIndices.length; i++) {
      const prevItem = actionsWithIndices[i - 1]
      const currentItem = actionsWithIndices[i]

      if (shouldGroupActions(prevItem.action, currentItem.action)) {
        currentGroup.push(currentItem)
      } else {
        // Finalize current group
        const groupIndices = currentGroup.map(item => item.actualIndex)
        if (currentGroup.length > 1) {
          groups.push({
            type: 'group',
            actions: currentGroup.map(item => item.action),
            startIndex: Math.min(...groupIndices),
            endIndex: Math.max(...groupIndices),
            actionIndices: groupIndices
          })
        } else {
          groups.push({
            type: 'single',
            actions: currentGroup.map(item => item.action),
            startIndex: currentGroup[0].actualIndex,
            endIndex: currentGroup[0].actualIndex
          })
        }

        // Start new group
        currentGroup = [currentItem]
      }
    }

    // Add final group
    const groupIndices = currentGroup.map(item => item.actualIndex)
    if (currentGroup.length > 1) {
      groups.push({
        type: 'group',
        actions: currentGroup.map(item => item.action),
        startIndex: Math.min(...groupIndices),
        endIndex: Math.max(...groupIndices),
        actionIndices: groupIndices
      })
    } else {
      groups.push({
        type: 'single',
        actions: currentGroup.map(item => item.action),
        startIndex: currentGroup[0].actualIndex,
        endIndex: currentGroup[0].actualIndex
      })
    }

    return groups
  }

  // Get recent history items (show full history up to visibleCount, including undone actions)
  const startIndex = Math.max(0, history.length - visibleCount)
  const recentHistory = history.slice(startIndex).reverse()

  // Map each action to its actual history index
  const actionsWithIndices = recentHistory.map((action, reversedIndex) => ({
    action,
    actualIndex: history.length - 1 - reversedIndex
  }))

  const groupedHistory = groupActions(actionsWithIndices)

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
        className="fixed z-[10000] w-96 max-h-96 bg-gradient-to-br from-slate-800/95 via-slate-900/95 to-purple-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden flex flex-col"
        style={{
          left: position.left,
          top: position.top,
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-white/10 shrink-0">
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
        <div className="p-2 flex-1 min-h-0 overflow-y-auto" style={{
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

                  // Determine if this action has been undone (is ahead of current position)
                  // Grey out actions that are ahead of the current history position
                  const isUndone = actualIndex > selectedIndex;
                  return (
                    <button
                      key={`single-${actualIndex}-${action.type}`}
                      className={`w-full text-left p-2 rounded-lg transition-all duration-200 flex items-center border-none outline-none focus:outline-none focus-visible:outline-none focus-visible:border-none ${selectedIndex === actualIndex
                        ? "bg-gradient-to-br from-purple-700/40 via-purple-900/50 to-blue-900/40 border border-purple-400/40 shadow-lg"
                        : isUndone
                          ? "bg-gradient-to-br from-slate-800/60 via-slate-900/70 to-purple-900/60 text-white/40 opacity-60 hover:opacity-80 hover:text-white/70"
                          : "hover:bg-gradient-to-br hover:from-purple-700/20 hover:via-purple-900/30 hover:to-blue-900/20"
                        }`}
                      style={{ border: 'none', outline: 'none' }}
                      onClick={() => onJumpToHistory?.(actualIndex)}
                      title={isUndone ? "Jump to this point (redo)" : "Jump to this point in history"}
                    >
                      <div className="flex-1 min-w-0 flex flex-col">
                        <div className="flex items-center space-x-2 justify-between">
                          <div className={`text-xs font-medium truncate ${selectedIndex === actualIndex ? "text-blue-100" : isUndone ? "text-white/40" : "text-white/90"
                            }`}>
                            {formatActionType(action.type)}
                          </div>
                          <div className="text-[10px] text-white/40 font-normal ml-2 whitespace-nowrap">
                            {formatTimeAgo((action as any).timestamp)}
                          </div>
                        </div>
                        {details && (
                          <div className={`text-xs truncate mt-0.5 ${isUndone ? "text-white/30" : "text-white/60"}`}>
                            {details}
                          </div>
                        )}
                      </div>
                    </button>
                  )
                } else {
                  // Group of actions
                  const isExpanded = expandedGroups.has(groupIndex)
                  const firstAction = group.actions[0]

                  return (
                    <div key={`group-${groupIndex}`} className="space-y-1">
                      {/* Group Header */}
                      <div className="flex items-center w-full">
                        <button
                          className="px-2 py-1 rounded-lg border-none outline-none focus:outline-none focus-visible:outline-none focus-visible:border-none bg-gradient-to-br from-slate-900/60 via-purple-900/40 to-blue-900/30 hover:bg-purple-900/40 transition-colors"
                          style={{ border: 'none', outline: 'none', height: '2rem' }}
                          onClick={() => {
                            if (isExpanded) {
                              expandedGroups.delete(groupIndex);
                              setExpandedGroups(new Set(expandedGroups));
                            } else {
                              setExpandedGroups(prev => new Set(prev).add(groupIndex));
                            }
                          }}
                          title={isExpanded ? "Collapse group" : "Expand group"}
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-white/60" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-white/60" />
                          )}
                        </button>
                        <button
                          className={`flex-1 text-left p-2 rounded-lg transition-all duration-200 flex items-center border-none outline-none focus:outline-none focus-visible:outline-none focus-visible:border-none ${selectedIndex >= group.startIndex && selectedIndex <= group.endIndex
                            ? "bg-gradient-to-br from-purple-700/40 via-purple-900/50 to-blue-900/40 border border-purple-400/40 shadow-lg"
                            : selectedIndex < group.endIndex
                              ? "bg-gradient-to-br from-slate-800/60 via-slate-900/70 to-purple-900/60 text-white/40 opacity-60 hover:opacity-80 hover:text-white/70"
                              : "hover:bg-gradient-to-br hover:from-purple-700/20 hover:via-purple-900/30 hover:to-blue-900/20"
                            }`}
                          style={{ cursor: 'pointer', border: 'none', outline: 'none' }}
                          onClick={() => onJumpToHistory?.(group.endIndex)}
                          title="Jump to this point in history"
                        >
                          <span className={`text-xs font-medium truncate ${selectedIndex < group.endIndex ? "text-white/40" : "text-white/90"}`}>{formatActionType(firstAction.type)} ({group.actions.length}×)</span>
                        </button>
                      </div>
                      {/* No sub text for grouped actions */}

                      {/* Expanded Group Items */}
                      {isExpanded && (
                        <div className="ml-4 space-y-1 border-l border-white/10 pl-2">
                          {group.actions.map((action, actionIndex) => {
                            const actualIndex = group.actionIndices ? group.actionIndices[actionIndex] : group.startIndex + actionIndex;
                            const details = getActionDetails(action);
                            // Determine if this action has been undone (is ahead of current position)
                            const isUndone = actualIndex > selectedIndex;
                            return (
                              <button
                                key={`group-item-${actualIndex}-${action.type}`}
                                className={`w-full text-left p-1.5 rounded-md transition-all duration-200 flex items-center border-none outline-none focus:outline-none focus-visible:outline-none focus-visible:border-none ${selectedIndex === actualIndex
                                  ? "bg-gradient-to-br from-purple-700/40 via-purple-900/50 to-blue-900/40 border border-purple-400/40 shadow-lg"
                                  : isUndone
                                    ? "bg-gradient-to-br from-slate-800/60 via-slate-900/70 to-purple-900/60 text-white/40 opacity-60 hover:opacity-80 hover:text-white/70"
                                    : "hover:bg-white/5"
                                  }`}
                                style={{ border: 'none', outline: 'none' }}
                                onClick={() => onJumpToHistory?.(actualIndex)}
                                title={isUndone ? "Jump to this point (redo)" : "Jump to this point in history"}
                              >
                                <div className="flex-1 min-w-0 flex flex-col">
                                  <div className="flex items-center space-x-2 justify-between">
                                    <div className={`text-xs truncate ${selectedIndex === actualIndex ? "text-blue-100 font-medium" : isUndone ? "text-white/40" : "text-white/80"}`}>{formatActionType(action.type)}</div>
                                    <div className="text-[10px] text-white/40 font-normal ml-2 whitespace-nowrap">
                                      {formatTimeAgo((action as any).timestamp)}
                                    </div>
                                  </div>
                                  {details && (
                                    <div className={`text-xs truncate mt-0.5 ${isUndone ? "text-white/30" : "text-white/50"}`}>
                                      {details}
                                    </div>
                                  )}
                                </div>
                              </button>
                            );
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
        <div className="p-2 border-t border-white/10 bg-white/5 shrink-0">
          <div className="flex items-center justify-between">
            <div className="text-[11px] text-white/50">ESC to close</div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                title="Undo all changes and jump to start"
                className="px-3 py-1.5 text-xs rounded-md bg-gradient-to-r from-purple-600 via-purple-700 to-blue-600 text-white shadow-md hover:shadow-lg hover:brightness-105 transition disabled:opacity-40 disabled:cursor-not-allowed"
                disabled={selectedIndex === -1}
                onClick={() => onJumpToHistory?.(-1)}
              >
                Undo all
              </button>
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body
  )
}