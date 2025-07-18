import React from "react"
import { useEffect, useState, useRef, useCallback, useMemo } from "react"
import ReactFlow, { ReactFlowProvider, type ReactFlowInstance } from "reactflow"
import "reactflow/dist/style.css"
import { Network, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react"
import { useMindMapStore } from "../store/mindMapStore"
import { usePreviewMindMapStore } from "../store/previewMindMapStore"
import { SpotifyLiteNode } from "./SpotifyLiteNode"
import { SoundCloudLiteNode } from "./SoundCloudLiteNode"
import { YouTubeLiteNode } from "./YouTubeLiteNode"
import { ImageNode } from "./ImageNode"
import { AudioLiteNode } from "./AudioLiteNode"
import { PlaylistLiteNode } from "./PlaylistLiteNode"
import { SocialMediaNode } from "./SocialMediaNode"
import { LinkNode } from "./LinkNode"
import { MindMapNode } from "./MindMapNode"
import { aiService } from "../services/aiService"
import { useChatStore } from "../store/chatStore"
import defaultNodeStyles from "../config/defaultNodeStyles";
import { processNodesForTextRendering } from "../utils/textNodeUtils";

const CustomBackground = React.memo(() => {
  return (
    <div className="absolute inset-0 bg-gradient-to-br from-slate-900/60 via-slate-800/40 to-slate-900/60 rounded-lg backdrop-blur-sm" style={{zIndex: -1}}></div>
  );
});

interface PreviewMindMapNodeProps {
  mapId: string
  conversationId?: number
  messageId?: number
}

const PreviewMindMapNode: React.FC<PreviewMindMapNodeProps> = React.memo(({ mapId, conversationId, messageId }) => {
  const { previewMaps, setCurrentVersionIndex, getCurrentVersion } = usePreviewMindMapStore()
  const { acceptAIChanges, rejectAIChanges, maps } = useMindMapStore()
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const reactFlowRef = useRef<ReactFlowInstance | null>(null)
  const { updateAIMessageAfterAction, updateAIMessageText } = useChatStore()

  // Get the setPreviewMapAction function from the store
  const { setPreviewMapAction} = usePreviewMindMapStore()

  // Get the current preview map and version
  const previewMap = previewMaps[mapId]
  const currentVersion = getCurrentVersion(mapId)

  // Calculate pagination info
  const totalVersions = previewMap?.versions.length || 0
  const currentVersionIndex = previewMap?.currentVersionIndex || 0

  // Memoized nodes to prevent unnecessary ReactFlow re-renders
  const memoizedNodes = useMemo(() => {
    if (!currentVersion?.nodes) return []

    const processedNodes = currentVersion.nodes.map((node: any) => ({
      ...node,
      style: {
        ...(defaultNodeStyles as any)[node.type], // Apply default styles based on node type
        ...node.style, // Override with existing styles if present
        background: node.background || node.style?.background || (defaultNodeStyles as any)[node.type]?.background, // Prioritize saved background
        width: node.type === "link" ? "auto" : node.style?.width || (defaultNodeStyles as any)[node.type]?.width,
      },
    }))

    return processNodesForTextRendering(processedNodes)
  }, [currentVersion?.nodes])

  // Memoized edges with source node colors and edge type
  const memoizedEdges = useMemo(() => {
    if (!currentVersion?.edges || !currentVersion?.nodes) return []

    // Get edgeType from currentVersion, default to 'default' if not valid
    const edgeType = ['default', 'straight', 'smoothstep'].includes(currentVersion.edgeType)
      ? currentVersion.edgeType
      : 'default';

    return currentVersion.edges.map((edge: any) => {
      // Find the source node to get its color
      const sourceNode = currentVersion.nodes.find((node: any) => node.id === edge.source);
      const sourceNodeColor = sourceNode
        ? (sourceNode.background || sourceNode.style?.background || "#374151")
        : "#374151";

      return {
        ...edge,
        type: edgeType === 'default' ? 'default' : edgeType,
        style: {
          ...edge.style,
          strokeWidth: 2,
          stroke: sourceNodeColor,
        },
      };
    });
  }, [currentVersion?.edges, currentVersion?.nodes, currentVersion?.edgeType])

  // Initialize component
  useEffect(() => {
    if (previewMap && currentVersion) {
      setIsInitialized(true)
    }
  }, [previewMap, currentVersion])

  // Debounced fit view when nodes change
  useEffect(() => {
    if (reactFlowRef.current && memoizedNodes.length > 0 && isInitialized) {
      const timeout = setTimeout(() => {
        reactFlowRef.current?.fitView({ padding: 0.1 })
      }, 200)
      return () => clearTimeout(timeout)
    }
  }, [memoizedNodes, isInitialized])

  const handleResize = useCallback(() => {
    if (reactFlowRef.current && isInitialized) {
      setTimeout(() => {
        reactFlowRef.current?.fitView({ padding: 0.1 })
      }, 100)
    }
  }, [isInitialized])

  useEffect(() => {
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [handleResize])

  const onInit = useCallback((instance: ReactFlowInstance) => {
    reactFlowRef.current = instance
    setTimeout(() => {
      if (reactFlowRef.current) {
        reactFlowRef.current.fitView({ padding: 0.1 })
      }
    }, 100)
  }, [])

  // Update the handleAcceptChanges function to update the message immediately before processing changes
  const handleAcceptChanges = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation()

    // Get the current version data to accept
    if (!currentVersion) return

    // Set the action taken in the preview store
    setPreviewMapAction(mapId, "accepted")

    // Update the AI message immediately if we have the messageId and conversationId
    if (messageId && conversationId) {
      // Update the message first for immediate UI feedback
      updateAIMessageAfterAction(messageId, "accepted")
    }

    // Then process the actual changes to the mindmap
    await acceptAIChanges(currentVersion.nodes, currentVersion.edges, currentVersion.title)

    // Dispatch a custom event to notify ChatMindMapNode components to refresh
    const refreshEvent = new CustomEvent('mindmap-updated', { detail: { mapId } });
    window.dispatchEvent(refreshEvent);
  }, [currentVersion, mapId, messageId, conversationId, setPreviewMapAction, updateAIMessageAfterAction, acceptAIChanges])

  const handleRejectChanges = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation()

    // Set the action taken in the preview store
    setPreviewMapAction(mapId, "rejected")

    // Update the AI message immediately if we have the messageId and conversationId
    if (messageId && conversationId) {
      // Update the message first for immediate UI feedback
      updateAIMessageAfterAction(messageId, "rejected")
    }

    // Then process the actual changes to the mindmap
    await rejectAIChanges()
  }, [mapId, messageId, conversationId, setPreviewMapAction, updateAIMessageAfterAction, rejectAIChanges])

  const handleRegenerate = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation()

    // Only allow regeneration if we have fewer than 3 versions
    if (totalVersions >= 3 || isRegenerating) return

    setIsRegenerating(true)

    try {
      // If we have messageId and conversationId, regenerate the entire AI message
      if (messageId && conversationId) {
        await useChatStore.getState().regenerateAIMessage(messageId)
      } else {
        // Fallback to the old behavior if we don't have message context
        const originalMap = maps.find((m) => m.id === mapId)

        if (originalMap) {
          // Generate a new version using AI service
          await aiService.generateResponse(
            "Please regenerate a different version of this mindmap with new ideas and layout.",
            -1, // Using -1 as a placeholder conversation ID
            originalMap,
          )
        }
      }
    } catch (error) {
      console.error("Error regenerating mindmap:", error)
    } finally {
      setIsRegenerating(false)
    }
  }, [totalVersions, isRegenerating, messageId, conversationId, maps, mapId])

  const handlePrevVersion = useCallback(() => {
    if (currentVersionIndex > 0) {
      const newIndex = currentVersionIndex - 1
      setCurrentVersionIndex(mapId, newIndex)
      
      // Update AI message text if we have messageId and the new version has response text
      if (messageId && previewMap?.versions[newIndex]?.aiResponseText) {
        updateAIMessageText(messageId, previewMap.versions[newIndex].aiResponseText)
      }
    }
  }, [currentVersionIndex, mapId, messageId, previewMap, setCurrentVersionIndex, updateAIMessageText])

  const handleNextVersion = useCallback(() => {
    if (currentVersionIndex < totalVersions - 1) {
      const newIndex = currentVersionIndex + 1
      setCurrentVersionIndex(mapId, newIndex)
      
      // Update AI message text if we have messageId and the new version has response text
      if (messageId && previewMap?.versions[newIndex]?.aiResponseText) {
        updateAIMessageText(messageId, previewMap.versions[newIndex].aiResponseText)
      }
    }
  }, [currentVersionIndex, totalVersions, mapId, messageId, previewMap, setCurrentVersionIndex, updateAIMessageText])

  if (!previewMap || !currentVersion) {
    return null
  }

  // Don't render ReactFlow until initialized
  if (!isInitialized) {
    return (
      <div className="mb-4">
        <div className="text-sm text-sky-400 mb-3 flex items-center gap-2 font-medium">
          <Network className="h-3.5 w-3.5" />
          <span>AI suggested changes to your mindmap:</span>
        </div>
        <div className="relative min-w-[320px] bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl rounded-2xl overflow-hidden border border-slate-700/30">
          <div className="p-4">
            <div className="h-[200px] border border-slate-700/50 rounded-xl overflow-hidden flex items-center justify-center bg-gradient-to-br from-slate-900/80 to-slate-800/80">
              <div className="text-slate-400">Initializing preview...</div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mb-4">
      <div className="text-sm text-sky-400 mb-3 flex items-center gap-2 font-medium">
        <Network className="h-3.5 w-3.5" />
        <span>AI suggested changes to your mindmap:</span>
      </div>
      <div className="relative min-w-[320px] bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl rounded-2xl overflow-hidden border border-slate-700/30 transition-all duration-300 hover:border-slate-600/50">
        <div className="p-4">
          {/* Header with title and preview badge */}
          <div className="mb-4 p-3 border-b border-slate-700/30 bg-gradient-to-r from-slate-800/30 to-slate-700/20 rounded-xl -mx-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-sky-500/20 to-blue-500/20 flex items-center justify-center border border-sky-500/30">
                  <Network className="w-3.5 h-3.5 text-sky-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-slate-200 truncate">{currentVersion.title}</h3>
                  <p className="text-xs text-slate-400">AI Generated Preview</p>
                </div>
              </div>
              <span className="text-xs text-sky-400 px-2 py-1 bg-sky-500/20 rounded-full border border-sky-500/30 font-medium">Preview</span>
            </div>
          </div>

          <div className="h-[200px] border border-slate-700/50 rounded-xl overflow-hidden hover:border-sky-500/50 transition-all duration-300 bg-gradient-to-br from-slate-900/80 to-slate-800/80 backdrop-blur-sm">
            <ReactFlowProvider>
              <ReactFlow
                nodes={memoizedNodes}
                edges={memoizedEdges}
                nodeTypes={nodeTypes as any}
                fitView
                nodesDraggable={false}
                nodesConnectable={false}
                elementsSelectable={false}
                zoomOnScroll={true}
                zoomOnDoubleClick={false}
                minZoom={0.1}
                maxZoom={2}
                onInit={onInit}
                proOptions={{ hideAttribution: true }}
                className="react-flow-instance"
                key={`${mapId}-${currentVersionIndex}`}
              >
                <CustomBackground />
              </ReactFlow>
            </ReactFlowProvider>
          </div>

          {/* Pagination controls */}
          {totalVersions > 1 && (
            <div className="flex justify-center items-center mt-4 mb-3">
              <div className="flex items-center bg-slate-800/50 rounded-xl border border-slate-700/30 p-1">
                <button
                  onClick={handlePrevVersion}
                  disabled={currentVersionIndex === 0}
                  className={`p-2 rounded-lg transition-all duration-200 ${
                    currentVersionIndex === 0
                      ? "text-slate-600 cursor-not-allowed"
                      : "hover:bg-slate-700/50 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <span className="mx-3 text-xs text-slate-300 font-medium min-w-[40px] text-center">
                  {currentVersionIndex + 1}/{totalVersions}
                </span>
                <button
                  onClick={handleNextVersion}
                  disabled={currentVersionIndex === totalVersions - 1}
                  className={`p-2 rounded-lg transition-all duration-200 ${
                    currentVersionIndex === totalVersions - 1
                      ? "text-slate-600 cursor-not-allowed"
                      : "hover:bg-slate-700/50 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="mt-4">
            <div className="flex justify-between gap-3">
              <button
                onClick={handleAcceptChanges}
                className="flex-1 text-sm bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-4 py-2.5 rounded-xl transition-all duration-200 font-medium shadow-lg hover:shadow-green-500/25 border border-green-500/20"
              >
                Accept
              </button>

              {totalVersions < 3 && (
                <button
                  onClick={handleRegenerate}
                  disabled={isRegenerating}
                  className={`flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl transition-all duration-200 font-medium shadow-lg border ${
                    isRegenerating
                      ? "bg-slate-700/50 text-slate-500 cursor-not-allowed border-slate-600/30"
                      : "bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white hover:shadow-sky-500/25 border-sky-500/20"
                  }`}
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isRegenerating ? "animate-spin" : ""}`} />
                  {isRegenerating ? "Regenerating..." : "Regenerate"}
                </button>
              )}

              <button
                onClick={handleRejectChanges}
                className="flex-1 text-sm bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white px-4 py-2.5 rounded-xl transition-all duration-200 font-medium shadow-lg hover:shadow-slate-500/25 border border-slate-500/20"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
})

const nodeTypes = {
  spotify: SpotifyLiteNode,
  soundcloud: SoundCloudLiteNode,
  "youtube-video": YouTubeLiteNode,
  image: ImageNode,
  audio: AudioLiteNode,
  playlist: PlaylistLiteNode,
  instagram: SocialMediaNode,
  twitter: SocialMediaNode,
  facebook: SocialMediaNode,
  youtube: SocialMediaNode,
  tiktok: SocialMediaNode,
  link: LinkNode,
  mindmap: MindMapNode,
} as const

export { PreviewMindMapNode }
