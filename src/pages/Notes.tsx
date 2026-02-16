import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import LinkExtension from '@tiptap/extension-link'
import UnderlineExtension from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import Placeholder from '@tiptap/extension-placeholder'
import { useNotesStore } from '../store/notesStore'
import { useAuthStore } from '../store/authStore'
import { useMindMapStore } from '../store/mindMapStore'

const ToolbarBtn = ({ children, onClick, active, title, disabled }: any) => (
  <button
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={`p-1.5 rounded-lg transition-all duration-200 ${
      active 
        ? "bg-blue-500/20 text-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.15)] ring-1 ring-blue-500/30" 
        : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
    } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
  >
    {children}
  </button>
)

import { v4 as uuidv4 } from "uuid"
import {
  Trash2,
  Plus,
  ChevronRight,
  FileText,
  Search,
  MoreHorizontal,
  FolderPlus,
  Folder,
  FolderOpen,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Heading1,
  Heading2,
  Quote,
  Code,
  Share2,
  GripVertical,
  X,
  Check,
  AlertTriangle,
  Maximize2,
  Grid3x3,
  GitBranch,
  Network,
  Globe,
  Lock,
  Link,
} from "lucide-react"

import ReactFlow, {
  Background,
  Edge,
  Node as RFNode,
  BackgroundVariant,
  Connection,
  ReactFlowProvider,
  useReactFlow,
  OnConnectStart,
  OnConnectEnd,
  reconnectEdge,
} from "reactflow"
import "reactflow/dist/style.css"
import { NotesEdgeDropMenu } from "../components/NotesEdgeDropMenu"
import { NotesNodeContextMenu } from "../components/NotesNodeContextMenu"
import { NotesPaneContextMenu } from "../components/NotesPaneContextMenu"
import { FolderMindNode } from "../components/flow/FolderMindNode"
import { NoteMindNode } from "../components/flow/NoteMindNode"
import { MindMapMindNode } from "../components/flow/MindMapMindNode"
import { useMindMapSync } from "../hooks/useMindMapSync"
import { useAutoLayout } from "../hooks/useAutoLayout"
import { getChildPosition } from "../utils/nodePositioning"

/* --- types --- */
export interface NoteItem {
  id: string
  title: string
  content: string
  updatedAt: number
  color: string
  folderId: string | null
  position?: { x: number; y: number }
}

export interface FolderItem {
  id: string
  name: string
  collapsed: boolean
  color: string
  parentId: string | null
  position?: { x: number; y: number }
}

export interface MindMapItem {
  id: string
  title: string
  updatedAt: number
  color: string
  folderId: string | null
  position?: { x: number; y: number }
  visibility?: 'public' | 'private' | 'linkOnly'
}

const ACCENT_COLORS = [
  "#3b82f6",
  "#8b5cf6",
  "#6366f1",
  "#06b6d4",
  "#ec4899",
  "#f59e0b",
]

const nodeTypes = {
  folder: FolderMindNode,
  note: NoteMindNode,
  mindmap: MindMapMindNode,
}

/* --- mindmap view component --- */
const NotesMindMapContent = ({
  notes,
  folders,
  mindmaps,
  onNoteClick,
  onFolderClick,
  onConnectNode,
  onAddNode,
  onCreateFirstNote,
  onAddRootFolder,
  onAddRootNote,
  onDeleteNode,
  onRenameNode,
  onPositionChange,
  onDisconnectNode
}: {
  notes: NoteItem[]
  folders: FolderItem[]
  mindmaps: MindMapItem[]
  onNoteClick: (noteId: string) => void
  onFolderClick?: (folderId: string) => void
  onConnectNode?: (sourceId: string, targetId: string, sourceHandle?: string | null, targetHandle?: string | null) => void
  onDisconnectNode?: (nodeId: string) => void
  onAddNode?: (type: 'folder' | 'note' | 'mindmap', parentId: string, position?: { x: number; y: number }, handleId?: string | null) => void
  onCreateFirstNote?: () => void
  onAddRootFolder?: (position?: { x: number; y: number }) => void
  onAddRootNote?: (position?: { x: number; y: number }) => void
  onDeleteNode?: (id: string, type: 'folder' | 'note' | 'mindmap', label: string) => void
  onRenameNode?: (id: string, type: 'folder' | 'note' | 'mindmap', newName: string) => void
  onPositionChange?: (id: string, position: { x: number; y: number }, type: 'folder' | 'note' | 'mindmap') => void
}) => {
  const {
    nodes,
    setNodes,
    onNodesChange,
    edges,
    setEdges,
    onEdgesChange,
    isCtrlPressed,
    moveWithChildren,
    setMoveWithChildren,
    snapToGrid,
    setSnapToGrid
  } = useMindMapSync({ notes, folders, mindmaps, onPositionChange })

  const { handleAutoLayout } = useAutoLayout({
     nodes, 
     edges, 
     setNodes, 
     onPositionChange 
  });
  
  const { screenToFlowPosition, fitView } = useReactFlow()
  const edgeReconnectSuccessful = useRef(true);
  
  const [contextMenu, setContextMenu] = useState<{
    isVisible: boolean;
    nodeId: string;
  }>({
    isVisible: false,
    nodeId: ''
  });

  const [paneContextMenu, setPaneContextMenu] = useState<{
    isVisible: boolean;
    position: { x: number; y: number };
  }>({
    isVisible: false,
    position: { x: 0, y: 0 }
  });

  const [menuState, setMenuState] = useState<{
    isOpen: boolean
    position: { x: number; y: number }
    flowPosition: { x: number; y: number } | null
    sourceNodeId: string | null
    tempNodeId: string | null
    tempEdgeId: string | null
    handleType: string | null
    handleId: string | null
  }>({
    isOpen: false,
    position: { x: 0, y: 0 },
    flowPosition: null,
    sourceNodeId: null,
    tempNodeId: null,
    tempEdgeId: null,
    handleType: null,
    handleId: null,
  })
  
  // Track connection start
  const connectionStartRef = useRef<{ nodeId: string | null; handleId: string | null; handleType: string | null }>({ nodeId: null, handleId: null, handleType: null })
  // Track menu opening to prevent immediate dismissal
  const menuOpenTimeStampRef = useRef<number>(0)

  const cleanUpTempConnection = useCallback(() => {
    setNodes((nds) => nds.filter((n) => !n.id.startsWith('temp-node-')))
    setEdges((eds) => eds.filter((e) => !e.id.startsWith('temp-edge-')))
  }, [setNodes, setEdges])

  const handlePaneContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    setPaneContextMenu({
        isVisible: true,
        position: { x: event.clientX, y: event.clientY },
    });
  }, []);

  const onConnectStart: OnConnectStart = useCallback((_, { nodeId, handleId, handleType }) => {
    connectionStartRef.current = { nodeId, handleId, handleType }
  }, [])
  
  const onConnectEnd: OnConnectEnd = useCallback(
    (event) => {
      const { nodeId, handleId, handleType } = connectionStartRef.current
      if (!nodeId) return

      const targetIsPane = (event.target as Element).classList.contains('react-flow__pane')
      
      if (targetIsPane && onAddNode) {
        // Calculate position
        const { clientX, clientY } = 'changedTouches' in event ? (event as any).changedTouches[0] : (event as MouseEvent)
        const position = screenToFlowPosition({ x: clientX, y: clientY })
        
        // Create temp node
        const tempNodeId = `temp-node-${Date.now()}`
        const tempNode: RFNode = {
          id: tempNodeId,
          type: 'default', // Invisible default node
          position,
          data: { label: '' },
          style: { opacity: 0, width: 1, height: 1, pointerEvents: 'none' },
          draggable: false,
          selectable: false,
        }
        
        setNodes((nds) => [...nds, tempNode])
        
        // Create temp edge
        const tempEdgeId = `temp-edge-${Date.now()}`
        
        let newEdge: Edge;

        // Determine edge direction based on handle type dragged
        if (handleType === 'target') {
             // Dragged from target -> Incoming edge
             newEdge = {
              id: tempEdgeId,
              source: tempNodeId,
              target: nodeId,
              targetHandle: handleId || undefined, // Ensure undefined if null/empty string
              style: { stroke: '#475569', strokeWidth: 2, strokeDasharray: '5,5' },
              animated: true,
            }
        } else {
             // Dragged from source -> Outgoing edge
             newEdge = {
              id: tempEdgeId,
              source: nodeId,
              target: tempNodeId,
              sourceHandle: handleId || undefined, // Ensure undefined if null/empty string
              style: { stroke: '#475569', strokeWidth: 2, strokeDasharray: '5,5' },
              animated: true,
            }
        }
        
        setEdges((eds) => [...eds, newEdge])
        
        setMenuState({
          isOpen: true,
          position: { x: clientX, y: clientY },
          flowPosition: position,
          sourceNodeId: nodeId,
          tempNodeId, 
          tempEdgeId,
          handleType,
          handleId,
        })
        menuOpenTimeStampRef.current = Date.now()
      }
    },
    [screenToFlowPosition, onAddNode, setNodes, setEdges]
  )
  
  const onConnect = useCallback((params: Connection) => {
    if (onConnectNode && params.source && params.target) {
       onConnectNode(params.source, params.target, params.sourceHandle, params.targetHandle)
    }
  }, [onConnectNode])

  const isValidConnection = useCallback((connection: Connection) => {
    // Prevent self-connections
    if (connection.source === connection.target) return false;
    
    const sourceHandle = connection.sourceHandle;
    const targetHandle = connection.targetHandle;
    
    // TOP source handles should only connect to BOTTOM target handles
    if (sourceHandle === 'top-source') {
      return targetHandle === 'bottom-target' || targetHandle === 'bottom';
    }
    
    // BOTTOM source handles should only connect to TOP target handles
    if (sourceHandle === 'bottom-source') {
      return !targetHandle || targetHandle === 'top' || targetHandle === 'top-target' || !targetHandle.includes('bottom');
    }
    
    // Default behavior for handles without specific IDs
    return true;
  }, [])

  const onReconnectStart = useCallback(() => {
    edgeReconnectSuccessful.current = false;
  }, []);

  const onReconnect = useCallback(
    (oldEdge: Edge, newConnection: Connection) => {
      edgeReconnectSuccessful.current = true;
      
      // First, disconnect the old relationship by removing the child's parent reference
      if (onDisconnectNode) {
        onDisconnectNode(oldEdge.target);
      }
      
      // Then, create the new connection using the existing handler
      if (onConnectNode && newConnection.source && newConnection.target) {
        onConnectNode(newConnection.source, newConnection.target, newConnection.sourceHandle, newConnection.targetHandle);
      }
      
      setEdges((eds) => reconnectEdge(oldEdge, newConnection, eds));
    },
    [setEdges, onDisconnectNode, onConnectNode]
  );

  const onReconnectEnd = useCallback(
    (_: unknown, edge: Edge) => {
      if (!edgeReconnectSuccessful.current) {
        // Instead of just deleting the edge, disconnect the node (move to root)
        if (onDisconnectNode) {
          onDisconnectNode(edge.target);
        }
        setEdges((eds) => eds.filter((e) => e.id !== edge.id));
      }
      edgeReconnectSuccessful.current = true;
    },
    [setEdges, onDisconnectNode]
  );



  return (
    <div className="w-full h-full bg-[#0c1220] relative overflow-hidden">
      {/* Grid pattern background */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay"></div>
      
      {notes.length === 0 && folders.length === 0 && (
        <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="text-center pointer-events-auto animate-in fade-in zoom-in duration-500">
             <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-blue-500/10 border border-blue-500/20 mb-6 shadow-2xl shadow-blue-500/10">
               <Plus className="w-10 h-10 text-blue-400" />
             </div>
             <h3 className="text-2xl font-bold text-white mb-3">
               Start Mapping Your Ideas
             </h3>
             <p className="text-slate-400 mb-8 max-w-sm mx-auto leading-relaxed">
               create your first note to begin visualizing your thoughts in a beautiful mind map.
             </p>
             <button
               onClick={onCreateFirstNote}
               className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium transition-all shadow-lg hover:shadow-blue-500/25 active:scale-95"
             >
               <Plus className="w-5 h-5" />
               Create First Note
             </button>
          </div>
        </div>
      ) }

      <ReactFlow
         nodes={nodes}
         edges={edges}
         onNodesChange={onNodesChange}
         onEdgesChange={onEdgesChange}
         onConnect={onConnect}
         isValidConnection={isValidConnection}
         fitView
         onConnectStart={onConnectStart}
         onConnectEnd={onConnectEnd}
         onReconnectStart={onReconnectStart}
         onReconnect={onReconnect}
         onReconnectEnd={onReconnectEnd}
         onPaneContextMenu={handlePaneContextMenu}
         onPaneClick={() => {
            if (menuState.isOpen && Date.now() - menuOpenTimeStampRef.current > 200) {
               cleanUpTempConnection()
               setMenuState((prev) => ({ ...prev, isOpen: false }))
            }
            if (contextMenu.isVisible) {
               setContextMenu(prev => ({ ...prev, isVisible: false }));
            }
            if (paneContextMenu.isVisible) {
               setPaneContextMenu(prev => ({ ...prev, isVisible: false }));
            }
         }}
         onNodeContextMenu={(event, node) => {
            event.preventDefault();
            setContextMenu({
               isVisible: true,
               nodeId: node.id
            });
         }}
         nodeTypes={nodeTypes}
         onNodeClick={(_, node) => {
            const isNote = node.type === 'note'
            const isMindMap = node.type === 'mindmap'
            if (isNote) {
                onNoteClick(node.id)
            } else if (isMindMap) {
                // Mindmap navigation is now handled by the node itself via Link
                return
            } else {
                onFolderClick?.(node.id)
            }
         }}
         proOptions={{ hideAttribution: true }}
         minZoom={0.2}
         maxZoom={2}
         snapToGrid={snapToGrid}
         snapGrid={[15, 15]}
         connectionRadius={50}
      >
        <Background gap={24} size={1} color="#334155" variant={BackgroundVariant.Dots} />
        
        {/* Custom Control Panel */}
        <div className="absolute bottom-4 left-4 z-10 group">
          <div className="bg-gradient-to-br from-slate-800/95 via-slate-900/95 to-slate-800/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-2">
            {/* Glow effect */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-blue-600/20 rounded-2xl blur opacity-50"></div>
            
            <div className="relative flex flex-col-reverse gap-2">
              {/* Fit View Button - Always visible at bottom */}
              <button
                onClick={() => fitView({ duration: 400, padding: 0.2 })}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-blue-500/50 text-slate-400 hover:text-blue-400 transition-all duration-200 relative overflow-hidden"
                title="Fit View"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-blue-500/0 group-hover:from-blue-500/10 group-hover:to-purple-500/10 transition-all duration-200"></div>
                <Maximize2 className="w-5 h-5 relative z-10" />
              </button>

              {/* Hidden buttons container - emerges on hover */}
              <div className="flex flex-col gap-2 max-h-0 overflow-hidden opacity-0 group-hover:max-h-40 group-hover:opacity-100 transition-all duration-300 ease-out">
                {/* Divider */}
                <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

                {/* Move with Children Toggle */}
                <button
                  onClick={() => setMoveWithChildren(!moveWithChildren)}
                  className={`w-10 h-10 flex items-center justify-center rounded-xl border transition-all duration-200 relative overflow-hidden ${
                    (isCtrlPressed || moveWithChildren)
                      ? 'bg-purple-500/20 border-purple-500/50 text-purple-400'
                      : 'bg-white/5 hover:bg-white/10 border-white/10 hover:border-purple-500/30 text-slate-400 hover:text-purple-400'
                  }`}
                  title={`Move with Children${(isCtrlPressed && !moveWithChildren) ? ' (Ctrl)' : ''}`}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br transition-all duration-200 ${
                    (isCtrlPressed || moveWithChildren)
                      ? 'from-purple-500/20 to-pink-500/20'
                      : 'from-purple-500/0 to-purple-500/0 hover:from-purple-500/10 hover:to-pink-500/10'
                  }`}></div>
                  <GitBranch className="w-5 h-5 relative z-10" />
                  {(isCtrlPressed || moveWithChildren) && (
                    <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-purple-400 rounded-full shadow-lg shadow-purple-500/50 animate-pulse"></div>
                  )}
                </button>

                {/* Snap to Grid Toggle */}
                <button
                  onClick={() => setSnapToGrid(!snapToGrid)}
                  className={`w-10 h-10 flex items-center justify-center rounded-xl border transition-all duration-200 relative overflow-hidden ${
                    snapToGrid
                      ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                      : 'bg-white/5 hover:bg-white/10 border-white/10 hover:border-blue-500/30 text-slate-400 hover:text-blue-400'
                  }`}
                  title="Snap to Grid"
                >
                  <div className={`absolute inset-0 bg-gradient-to-br transition-all duration-200 ${
                    snapToGrid
                      ? 'from-blue-500/20 to-purple-500/20'
                      : 'from-blue-500/0 to-blue-500/0 hover:from-blue-500/10 hover:to-purple-500/10'
                  }`}></div>
                  <Grid3x3 className="w-5 h-5 relative z-10" />
                  {snapToGrid && (
                    <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-blue-400 rounded-full shadow-lg shadow-blue-500/50"></div>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </ReactFlow>

      {menuState.isOpen && menuState.flowPosition && (
        <NotesEdgeDropMenu
          position={menuState.position}
          flowPosition={menuState.flowPosition}
          sourceType={nodes.find(n => n.id === menuState.sourceNodeId)?.type as 'note' | 'folder'}
          onClose={() => {
            cleanUpTempConnection()
            setMenuState((prev) => ({ ...prev, isOpen: false }))
          }}
          onSelect={(type) => {
            if (menuState.sourceNodeId && onAddNode) {
              onAddNode(type, menuState.sourceNodeId, menuState.flowPosition || undefined, menuState.handleId)
              // No need to explicitly clean up temp nodes here if adding triggers
              // a full re-render/re-layout via the useEffect, which wipes local state.
              // But cleaning up explicitly is safer/cleaner UI state management.
              cleanUpTempConnection() 
            }
          }}
        />
      )}

      <NotesNodeContextMenu
        isVisible={contextMenu.isVisible}
        onClose={() => setContextMenu(prev => ({ ...prev, isVisible: false }))}
        nodeId={contextMenu.nodeId}
        nodes={nodes}
        edges={edges}
        onDelete={(nodeId) => {
           const node = nodes.find(n => n.id === nodeId);
           if (node && onDeleteNode) {
              onDeleteNode(nodeId, node.type as 'folder' | 'note', node.data.label);
           }
        }}
        onRename={(nodeId, newName) => {
           const node = nodes.find(n => n.id === nodeId);
           if (node && onRenameNode) {
               onRenameNode(nodeId, node.type as 'folder' | 'note', newName);
           }
        }}
        onAutoLayout={handleAutoLayout}
      />

      <NotesPaneContextMenu
         isVisible={paneContextMenu.isVisible}
         onClose={() => setPaneContextMenu(prev => ({ ...prev, isVisible: false }))}
         position={paneContextMenu.position}
         onAddFolder={() => {
            if (onAddRootFolder) {
                // Convert screen coordinates to flow coordinates
                const flowPos = screenToFlowPosition({ x: paneContextMenu.position.x, y: paneContextMenu.position.y });
                onAddRootFolder(flowPos);
            }
         }}
         onAddNote={() => {
            if (onAddRootNote) {
                const flowPos = screenToFlowPosition({ x: paneContextMenu.position.x, y: paneContextMenu.position.y });
                onAddRootNote(flowPos);
            }
         }}
      />
    </div>
  )
}

const NotesMindMap = (props: React.ComponentProps<typeof NotesMindMapContent>) => (
  <ReactFlowProvider>
    <NotesMindMapContent {...props} />
  </ReactFlowProvider>
)

/* --- delete confirmation modal --- */
function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
}: {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
}) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div 
        className="bg-[#0f172a] border border-red-500/20 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-red-500" />
            </div>
            <h3 className="text-lg font-semibold text-white">
              {title}
            </h3>
          </div>
          
          <p className="text-slate-300 text-sm leading-relaxed mb-6">
            {message}
          </p>

          <div className="flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white hover:bg-white/[0.06] rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onConfirm()
                onClose()
              }}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 active:bg-red-800 rounded-lg transition-colors shadow-lg shadow-red-500/20"
            >
              Delete Forever
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function pickColor(): string {
  return ACCENT_COLORS[Math.floor(Math.random() * ACCENT_COLORS.length)]
}

/* --- main component --- */
const Notes = () => {
  const { user } = useAuthStore()
  const { 
    notes, 
    folders, 
    saveStatus, 
    fetchNotes, 
    fetchFolders, 
    saveNote, 
    saveFolder, 
    saveNotePosition,
    saveFolderPosition,
    deleteNote: deleteNoteFromDB, 
    deleteFolder: deleteFolderFromDB,
    updateNoteLocal,
    updateFolderLocal,
    migrateFromLocalStorage 
  } = useNotesStore()
  
  const { maps, fetchMaps, saveMindmapPosition, saveMindmapFolder, saveMindmapTitle, updateMindmapLocal } = useMindMapStore()
  
  // Convert mindmaps from store to local format
  const [mindmaps, setMindmaps] = useState<MindMapItem[]>([])
  
  // Sync mindmaps from store when maps change
  useEffect(() => {
    const processedMindmaps: MindMapItem[] = []
    const startX = 800 // Position mindmaps to the right of typical content
    const startY = 50
    const spacingY = 120 // Vertical spacing between mindmaps
    
    maps.forEach((map, index) => {
      const mindmapItem: MindMapItem = {
        id: map.id || map.permalink,
        title: map.title,
        updatedAt: map.updatedAt,
        color: map.backgroundColor || pickColor(),
        folderId: map.folderId || null,
        // Use position from DB if available, otherwise assign default position
        position: map.position || { x: startX, y: startY + (index * spacingY) },
        visibility: map.visibility || 'private'
      }
      
      processedMindmaps.push(mindmapItem)
    })
    
    setMindmaps(processedMindmaps)
  }, [maps])
  
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [showNoteMenu, setShowNoteMenu] = useState<string | null>(null)
  const [sidebarWidth, setSidebarWidth] = useState(280)
  const [isResizing, setIsResizing] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [renamingFolder, setRenamingFolder] = useState<string | null>(null)
  const [activeFormats, setActiveFormats] = useState<Record<string, boolean>>({})
  const [wordCount, setWordCount] = useState(0)
  const [charCount, setCharCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  
  const activeNote = notes.find((n) => n.id === activeNoteId)
  
  const editor = useEditor({
    extensions: [
      StarterKit,
      LinkExtension.configure({
        openOnClick: false, // We'll handle this
        autolink: true,
        defaultProtocol: 'https',
      }),
      UnderlineExtension,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Placeholder.configure({
        placeholder: 'Start writing...',
      })
    ],
    editorProps: {
      attributes: {
        class: 'min-h-full outline-none text-[15px] leading-relaxed text-slate-200 caret-blue-400 [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:text-white [&_h1]:mb-3 [&_h1]:mt-6 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-white [&_h2]:mb-2 [&_h2]:mt-5 [&_blockquote]:border-l-2 [&_blockquote]:border-blue-500/40 [&_blockquote]:pl-4 [&_blockquote]:text-slate-400 [&_blockquote]:italic [&_blockquote]:my-3 [&_pre]:bg-white/[0.04] [&_pre]:border [&_pre]:border-white/[0.06] [&_pre]:rounded-lg [&_pre]:px-4 [&_pre]:py-3 [&_pre]:my-3 [&_pre]:font-mono [&_pre]:text-sm [&_pre]:text-slate-300 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-2 [&_li]:my-1 [&_a]:text-blue-400 [&_a]:underline',
      },
      handleDOMEvents: {
          mouseover: (_view, event) => {
              const target = event.target as HTMLElement;
              const link = target.closest('a');
              if (link) {
                  const rect = link.getBoundingClientRect();
                  setLinkTooltip({ x: rect.left, y: rect.bottom + 5, show: true });
              }
              return false;
          },
          mouseout: () => {
             setLinkTooltip(null);
             return false;
          },
          click: (_view, event) => {
             const target = event.target as HTMLElement;
             const link = target.closest('a');
             if (link && (event.ctrlKey || event.metaKey)) {
                 window.open(link.href, '_blank');
                 return true;
             }
             return false;
          }
      },
      // Override default link click
      handleClickOn: (_view, _pos, node, _nodePos, event) => {
         // Prevent default opening unless Ctrl is held
         if (node.type.name === 'link' && !(event.ctrlKey || event.metaKey)) {
             return true; // Handled
         }
         return false;
      }
    },
    onUpdate: ({ editor }) => {
       // Skip save if we're programmatically setting content
       if (isSettingContentRef.current) return;
       
       const text = editor.getText();
       setCharCount(text.replace(/\n/g, "").length);
       const words = text.trim().split(/\s+/);
       setWordCount(text.trim() === "" ? 0 : words.length);
       
       if (savingTimeout.current) clearTimeout(savingTimeout.current)
       savingTimeout.current = setTimeout(saveContent, 300)
    },
    onSelectionUpdate: () => {
       checkActiveFormats();
    }
  });

  // Sync content when note changes
  useEffect(() => {
     if (editor && activeNote && editor.getHTML() !== activeNote.content) {
         isSettingContentRef.current = true;
         editor.commands.setContent(activeNote.content);
         // Reset flag after a brief delay to allow the update to complete
         setTimeout(() => {
           isSettingContentRef.current = false;
         }, 50);
     }
  }, [activeNoteId, editor]);

  // Update word/char count when active note changes
  useEffect(() => {
    if (editor && activeNote) {
      const text = editor.getText();
      setCharCount(text.replace(/\n/g, "").length);
      const words = text.trim().split(/\s+/);
      setWordCount(text.trim() === "" ? 0 : words.length);
    } else {
      setWordCount(0);
      setCharCount(0);
    }
  }, [activeNoteId, editor]); // activeNote dependencies handled by ID
  
  // Save Content Override
  const saveContent = useCallback(() => {
      if (!activeNoteId || !editor) return;
      const currentNote = notes.find((n) => n.id === activeNoteId);
      if (!currentNote) return;
      const html = editor.getHTML();
      
      // Update local state immediately (optimistic)
      updateNoteLocal(activeNoteId, { content: html });
      
      // Debounced save to Supabase
      if (!user?.id) return;
      if (saveNoteTimeoutRef.current) {
        clearTimeout(saveNoteTimeoutRef.current);
      }
      saveNoteTimeoutRef.current = setTimeout(() => {
        if (user?.id) {
          saveNote({ ...currentNote, content: html, updatedAt: Date.now() }, user.id);
        }
      }, 2000);
  }, [activeNoteId, editor, notes, updateNoteLocal, user, saveNote]);
  
  // Toolbar Actions
  const checkActiveFormats = useCallback(() => {
      if (!editor) return;
      setActiveFormats({
          bold: editor.isActive('bold'),
          italic: editor.isActive('italic'),
          underline: editor.isActive('underline'),
          h1: editor.isActive('heading', { level: 1 }),
          h2: editor.isActive('heading', { level: 2 }),
          blockquote: editor.isActive('blockquote'),
          insertUnorderedList: editor.isActive('bulletList'),
          insertOrderedList: editor.isActive('orderedList'),
          justifyLeft: editor.isActive({ textAlign: 'left' }),
          justifyCenter: editor.isActive({ textAlign: 'center' }),
          justifyRight: editor.isActive({ textAlign: 'right' }),
          pre: editor.isActive('codeBlock')
      });
  }, [editor]);

  const execCommand = (command: string, arg?: any) => {
      if (!editor) return;
      
      switch (command) {
          case 'bold': editor.chain().focus().toggleBold().run(); break;
          case 'italic': editor.chain().focus().toggleItalic().run(); break;
          case 'underline': editor.chain().focus().toggleUnderline().run(); break;
          case 'formatBlock': 
             if (arg === 'h1') editor.chain().focus().toggleHeading({ level: 1 }).run();
             if (arg === 'h2') editor.chain().focus().toggleHeading({ level: 2 }).run();
             if (arg === 'blockquote') editor.chain().focus().toggleBlockquote().run();
             if (arg === 'pre') editor.chain().focus().toggleCodeBlock().run();
             break;
         case 'insertUnorderedList': editor.chain().focus().toggleBulletList().run(); break;
         case 'insertOrderedList': editor.chain().focus().toggleOrderedList().run(); break;
         case 'justifyLeft': editor.chain().focus().setTextAlign('left').run(); break;
         case 'justifyCenter': editor.chain().focus().setTextAlign('center').run(); break;
         case 'justifyRight': editor.chain().focus().setTextAlign('right').run(); break;
      }
  };


  const [linkTooltip, setLinkTooltip] = useState<{ x: number; y: number; show: boolean } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null)
  const headerMenuRef = useRef<HTMLDivElement>(null)
  const sidebarRef = useRef<HTMLDivElement>(null)
  const [showHeaderMenu, setShowHeaderMenu] = useState(false)
  const titleRef = useRef<HTMLInputElement>(null)
  const savingTimeout = useRef<NodeJS.Timeout | null>(null)
  const isSettingContentRef = useRef(false) // Track programmatic content updates

  // Selection state
  const [selectedNotes, setSelectedNotes] = useState<Set<string>>(new Set())
  const [showBulkMoveMenu, setShowBulkMoveMenu] = useState(false)
  
  // Delete Confirmation State
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean
    type: 'note' | 'folder' | 'selection'
    id?: string
    title?: string
    count?: number
  }>({
    isOpen: false,
    type: 'note',
  })

  // Create folder modal state
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false)
  const [newFolderName, setNewFolderName] = useState("New Folder")
  const [createFolderParentId, setCreateFolderParentId] = useState<string | null>(null)

  // Debounced save refs
  const saveNoteTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const saveFolderTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Debounced save function for notes
  const debouncedSaveNote = useCallback((note: NoteItem) => {
    if (!user?.id) return
    
    if (saveNoteTimeoutRef.current) {
      clearTimeout(saveNoteTimeoutRef.current)
    }
    
    saveNoteTimeoutRef.current = setTimeout(() => {
      saveNote(note, user.id)
    }, 2000) // 2 second delay
  }, [user, saveNote])

  // Debounced save function for folders
  const debouncedSaveFolder = useCallback((folder: FolderItem) => {
    if (!user?.id) return
    
    if (saveFolderTimeoutRef.current) {
      clearTimeout(saveFolderTimeoutRef.current)
    }
    
    saveFolderTimeoutRef.current = setTimeout(() => {
      saveFolder(folder, user.id)
    }, 500) // 500ms delay for structure changes
  }, [user, saveFolder])

  // Load data on mount and handle migration
  useEffect(() => {
    if (!user?.id) return

    const initializeNotes = async () => {
      // Check if there's data in localStorage to migrate
      const hasLocalData = localStorage.getItem("notes_wysiwyg_v1") || localStorage.getItem("notes_folders_v1")
      
      if (hasLocalData) {
        // Migrate from localStorage
        await migrateFromLocalStorage(user.id)
      } else {
        // Just fetch from Supabase
        await fetchNotes(user.id)
        await fetchFolders(user.id)
      }
      
      // Fetch mindmaps from database
      await fetchMaps(user.id)
      
      // Don't auto-select any note - show mindmap view by default
      setIsLoading(false)
    }

    initializeNotes()
  }, [user?.id])

  // Close menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowNoteMenu(null)
        setShowBulkMoveMenu(false)
      }
      if (headerMenuRef.current && !headerMenuRef.current.contains(e.target as Node) && !(e.target as Element).closest('[data-header-trigger]')) {
        setShowHeaderMenu(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const handleResize = useCallback((e: MouseEvent) => {
    if (isResizing && sidebarRef.current) {
       // Direct DOM update for performance (avoids re-rendering during drag)
       const newWidth = Math.max(200, Math.min(600, e.clientX))
       sidebarRef.current.style.width = `${newWidth}px`
    }
  }, [isResizing])

  // Resize handler
  useEffect(() => {
    const handleMouseUp = () => {
      if (isResizing) {
        setIsResizing(false)
        if (sidebarRef.current) {
          // Sync final width to React state
          setSidebarWidth(parseInt(sidebarRef.current.style.width, 10))
        }
        document.body.style.cursor = "default"
        document.body.style.userSelect = "auto"
      }
    }

    if (isResizing) {
      window.addEventListener("mousemove", handleResize)
      window.addEventListener("mouseup", handleMouseUp)
      document.body.style.cursor = "col-resize"
      document.body.style.userSelect = "none"
    }
    return () => {
      window.removeEventListener("mousemove", handleResize)
      window.removeEventListener("mouseup", handleMouseUp)
    }
  }, [isResizing, handleResize])

  const addNote = (folderId: string | null = null, position?: { x: number; y: number }) => {
    if (!user?.id) return
    const finalPosition = position || getChildPosition(folderId, folders, notes, mindmaps)
    const newNote: NoteItem = {
      id: uuidv4(),
      title: "New Note",
      content: "",
      updatedAt: Date.now(),
      color: pickColor(),
      folderId,
      position: finalPosition,
    }
    
    // Update local state
    useNotesStore.setState({ notes: [newNote, ...notes] })
    setActiveNoteId(newNote.id)
    
    // Save to Supabase immediately
    saveNote(newNote, user.id)
    
    setTimeout(() => titleRef.current?.focus(), 50)
  }

  const deleteNote = (id: string, title?: string) => {
    setDeleteConfirm({
      isOpen: true,
      type: 'note',
      id,
      title: title || 'Untitled Note',
    })
    setShowNoteMenu(null)
  }

  const handleDeleteNoteConfirm = () => {
    if (!deleteConfirm.id || !user?.id) return
    
    // Delete from Supabase
    deleteNoteFromDB(deleteConfirm.id, user.id)
    
    // Update active note if needed
    if (activeNoteId === deleteConfirm.id) {
      const remaining = notes.filter((n) => n.id !== deleteConfirm.id)
      setActiveNoteId(remaining.length > 0 ? remaining[0].id : null)
    }
  }

  const handleDeleteFolderConfirm = () => {
    if (!deleteConfirm.id || !user?.id) return
    const folderId = deleteConfirm.id
    
    // Find all descendant folders
    const foldersToDelete = new Set<string>()
    foldersToDelete.add(folderId)

    const findDescendants = (id: string, allFolders: FolderItem[]) => {
      const children = allFolders.filter((f) => f.parentId === id)
      children.forEach((child) => {
        foldersToDelete.add(child.id)
        findDescendants(child.id, allFolders)
      })
    }

    findDescendants(folderId, folders)

    // Delete all folders from Supabase
    foldersToDelete.forEach(id => {
      deleteFolderFromDB(id, user.id)
    })
    
    // Update notes that were in deleted folders (move to root)
    notes.forEach(note => {
      if (note.folderId && foldersToDelete.has(note.folderId)) {
        const updatedNote = { ...note, folderId: null }
        updateNoteLocal(note.id, { folderId: null })
        saveNote(updatedNote, user.id)
      }
    })
  }

  const handleDeleteSelectionConfirm = () => {
    if (!user?.id) return
    
    // Delete each selected note from Supabase
    selectedNotes.forEach(noteId => {
      deleteNoteFromDB(noteId, user.id)
    })
    
    setSelectedNotes(new Set())
    
    // Update active note if it was deleted
    if (activeNoteId && selectedNotes.has(activeNoteId)) {
      const remaining = notes.filter((n) => !selectedNotes.has(n.id))
      setActiveNoteId(remaining.length > 0 ? remaining[0].id : null)
    }
  }

  const addFolder = (
    parentId: string | null = null,
    position?: { x: number; y: number },
    name?: string,
    options?: { renameOnCreate?: boolean }
  ) => {
    if (!user?.id) return
    const finalName = getNextFolderName(name)
    const finalPosition = position || getChildPosition(parentId, folders, notes, mindmaps)
    const folder: FolderItem = {
      id: uuidv4(),
      name: finalName,
      collapsed: false,
      color: pickColor(),
      parentId: parentId || null,
      position: finalPosition,
    }
    
    // Update local state
    useNotesStore.setState({ folders: [...folders, folder] })
    
    // Save to Supabase immediately
    saveFolder(folder, user.id)
    
    if (options?.renameOnCreate !== false) {
      setRenamingFolder(folder.id)
    }
  }

  const deleteFolder = (folderId: string, name?: string) => {
    setDeleteConfirm({
      isOpen: true,
      type: 'folder',
      id: folderId,
      title: name || 'Untitled Folder',
    })
  }

  const toggleFolder = (folderId: string) => {
    if (!user?.id) return
    const folder = folders.find(f => f.id === folderId)
    if (!folder) return
    
    // Update local state immediately
    updateFolderLocal(folderId, { collapsed: !folder.collapsed })
    
    // Save to Supabase with short debounce
    debouncedSaveFolder({ ...folder, collapsed: !folder.collapsed })
  }

  const updateNoteTitle = (title: string) => {
    if (!activeNoteId || !user?.id) return
    const note = notes.find(n => n.id === activeNoteId)
    if (!note) return
    
    // Update local state immediately
    updateNoteLocal(activeNoteId, { title })
    
    // Debounced save to Supabase (1 second for title changes)
    if (saveNoteTimeoutRef.current) {
      clearTimeout(saveNoteTimeoutRef.current)
    }
    saveNoteTimeoutRef.current = setTimeout(() => {
      saveNote({ ...note, title, updatedAt: Date.now() }, user.id)
    }, 1000)
  }

  const moveNoteToFolder = (noteId: string, folderId: string | null) => {
    if (!user?.id) return
    const note = notes.find(n => n.id === noteId)
    if (!note) return
    
    // Update local state immediately
    updateNoteLocal(noteId, { folderId })
    
    // Save to Supabase immediately (structure changes don't need debounce)
    saveNote({ ...note, folderId, updatedAt: Date.now() }, user.id)
    
    setShowNoteMenu(null)
  }

  const getNextFolderName = useCallback(
    (proposed?: string) => {
      const base = (proposed?.trim() || "New Folder").trim()
      const existing = new Set(folders.map((f) => f.name))
      if (!existing.has(base)) return base
      let i = 2
      let candidate = `${base} ${i}`
      while (existing.has(candidate)) {
        i += 1
        candidate = `${base} ${i}`
      }
      return candidate
    },
    [folders],
  )

  const deleteSelectedNotes = () => {
    setDeleteConfirm({
      isOpen: true,
      type: 'selection',
      count: selectedNotes.size,
    })
  }

  const moveSelectedNotes = (folderId: string | null) => {
    if (!user?.id) return
    
    // Update each selected note
    selectedNotes.forEach(noteId => {
      const note = notes.find(n => n.id === noteId)
      if (note) {
        updateNoteLocal(noteId, { folderId })
        saveNote({ ...note, folderId, updatedAt: Date.now() }, user.id)
      }
    })
    
    setSelectedNotes(new Set())
    setShowBulkMoveMenu(false)
  }

  const toggleNoteSelection = (e: React.MouseEvent, noteId: string) => {
    e.stopPropagation()
    const newSet = new Set(selectedNotes)
    if (newSet.has(noteId)) {
      newSet.delete(noteId)
    } else {
      newSet.add(noteId)
    }
    setSelectedNotes(newSet)
  }

  const handleConnectNode = useCallback((sourceId: string, targetId: string, sourceHandle?: string | null, _targetHandle?: string | null) => {
    if (!user?.id) return
    
    // Determine types of source and target
    const sourceNote = notes.find(n => n.id === sourceId)
    const sourceFolder = folders.find(f => f.id === sourceId)
    const sourceMindMap = mindmaps.find(m => m.id === sourceId)
    const targetNote = notes.find(n => n.id === targetId)
    const targetFolder = folders.find(f => f.id === targetId)
    const targetMindMap = mindmaps.find(m => m.id === targetId)

    // CASE 1: Dragging Note (Source) -> Folder (Target)
    // User wants Note to be CHILD of Folder.
    if (sourceNote && targetFolder) {
       updateNoteLocal(sourceId, { folderId: targetId })
       saveNote({ ...sourceNote, folderId: targetId, updatedAt: Date.now() }, user.id)
       return;
    }

    // CASE 2: Dragging Folder (Source) -> Note (Target)
    // User dragged from Folder to Note. Likely implies Folder should be Parent of Note.
    if (sourceFolder && targetNote) {
       updateNoteLocal(targetId, { folderId: sourceId })
       saveNote({ ...targetNote, folderId: sourceId, updatedAt: Date.now() }, user.id)
       return;
    }
    
    // CASE 3: Dragging MindMap (Source) -> Folder (Target)
    // User wants MindMap to be CHILD of Folder.
    if (sourceMindMap && targetFolder) {
       updateMindmapLocal(sourceId, { folderId: targetId })
       saveMindmapFolder(sourceId, targetId, user.id)
       return;
    }

    // CASE 4: Dragging Folder (Source) -> MindMap (Target)
    // User dragged from Folder to MindMap. Likely implies Folder should be Parent of MindMap.
    if (sourceFolder && targetMindMap) {
       updateMindmapLocal(targetId, { folderId: sourceId })
       saveMindmapFolder(targetId, sourceId, user.id)
       return;
    }
    
    // CASE 5: Dragging Note (Source) -> MindMap (Target) or vice versa
    // These don't make hierarchical sense, so we'll just log for now
    if ((sourceNote && targetMindMap) || (sourceMindMap && targetNote)) {
       console.log('Cannot connect notes and mindmaps directly')
       return;
    }
    
    // CASE 6: Dragging MindMap (Source) -> MindMap (Target)
    // Currently not supported for hierarchies, just log
    if (sourceMindMap && targetMindMap) {
       console.log('MindMap to MindMap connections not yet supported')
       return;
    }
    
    // CASE 3: Dragging Folder (Source) -> Folder (Target)
    // IMPORTANT: The user expects standard ReactFlow behavior:
    // Dragging from Folder A (Source/Parent) -> Folder B (Target/Child) means A becomes PARENT of B.
    // BUT drag direction is usually: drag from source handle (bottom of parent usually) to target handle (top of child usually).
    // The user states: "When I try to connect a child folder to a folder I want to be its parent, it flips it and the child becomes parent."
    // This implies they are dragging FROM Child TO Parent.
    // If they drag from Child (Source) -> Parent (Target), physically that's a connection. 
    // Usually Child->Parent implies moving Child INTO Parent.
    // BUT standard graph logic is Source->Target means Parent->Child.
    
    // Let's look at the handles.
    // FolderMindNode has Top (Target) and Bottom (Source).
    // Dragging FROM a folder requires dragging from specific handle.
    // If user drags from Child's TOP handle? No, Top handle is Target (input only by default).
    // User must be dragging from Child's BOTTOM handle (Source).
    // User drags from Child Bottom -> Parent Top (Target).
    // This creates edge source(Child) -> target(Parent).
    // Hierarchically, this means Child is PARENT of Parent. This is indeed "flipped" behavior for a "move into" action.
    
    // Use Case A: Dragging from Parent Bottom -> Child Top.
    // Action: Set Child's parentId = Parent.
    
    // Use Case B: Dragging from Child Bottom -> Parent Top?
    // Wait, physically that's weird. Child Bottom is below Child. Parent Top is above Parent. 
    // If user drags UPWARDS from detailed node to a general node, they probably mean "Child belongs to Parent".
    
    // To resolve ambiguity, we can check vertical position? Or adhere to standard flow: Source IS Parent.
    // If Source is Parent, then dragging from A to B makes A the parent of B.
    // If the user wants B to be parent of A, they should drag from B to A.
    
    // The user says: "Top connector should only connect to other node bottom and bottom to other node top."
    // This means they want valid edges to run Bottom->Top.
    // And "this messed up completely... when I try to connect a child folder to a folder a want to be its parent... it flips".
    // If they drag Child -> Parent, they are creating Child -> Parent edge.
    // If they want Child to be inside Parent, they should have dragged Parent -> Child OR we need to inverse the logic for that specific gesture?
    // NO, if strict handle logic is enforced (Bottom Source -> Top Target), then Source MUST be Parent.
    // The user might be confused about direction. "connect a child folder to a folder i want to be its parent".
    // If they drag from Child, they are making Child the source.
    
    // However, if the user CLAIMS "it flips it", it implies they dragged A->B expecting B to be parent, but A became parent.
    // This means currently A->B makes A parent (standard). User wants B parent?
    // This implies user wants to drag FROM Child TO Parent to link them up (like drawing a line "this belongs to that").
    
    // BUT, standard node editors (like ReactFlow) work Source->Target = Parent->Child.
    // If we want to support "Draw line to Parent", we'd inverse it. 
    // But then "Draw line to Child" becomes impossible?
    
    // WAIT. If I dragged from Folder A (Source) to Folder B (Target).
    // Current code: `setFolders(... parentId: targetId ...)`.
    // Wait, look at the code I wrote before:
    // `setFolders(prev => prev.map(f => f.id === sourceId ? { ...f, parentId: targetId } : f))`
    // This sets Source's parentId to Target. 
    // This means Source becomes Child of Target.
    // So Source(Child) -> Target(Parent).
    // This MATCHES "Draw line to Parent".
    // So if user drags A -> B, A becomes child of B.
    
    // User says: "when I try to connect a child folder to a folder a want to be its parent, it flips it and the child becomes parent."
    // This means my CURRENT logic (A becomes child of B) is actually what they WANT?
    // "child folder [Source] to a folder [Target]... child becomes parent".
    // This means currently A becomes Parent of B?
    // Let's check the code:
    // `setFolders(prev => prev.map(f => f.id === sourceId ? { ...f, parentId: targetId } : f))`
    // -> Source ID is modified. Source's parent becomes Target.
    // -> Source is Child. Target is Parent.
    
    // So if user drags A -> B, A becomes Child of B.
    // IF the user says "it flips it and child becomes parent", that means currently A becomes Parent of B?
    // That would happen if code was: `setFolders(... f.id === targetId ? { ...f, parentId: sourceId } ...)`
    
    // Let's look at the actual code in file again.
    // Code in file:
    // `if (!isCycle) { setFolders(prev => prev.map(f => f.id === sourceId ? { ...f, parentId: targetId } : f)) }`
    // This says: Find Source Folder. Set its Parent to Target Folder.
    // Result: Source is Child. Target is Parent.
    
    // If user experiences "Child becomes Parent", it means currently Source is becoming Parent.
    // But my code does the opposite (Source becomes Child).
    
    // UNLESS... The user is dragging from PARENT to CHILD (TopDown) and expects PARENT -> CHILD relation.
    // If they drag Parent (Source) -> Child (Target).
    // My code sets Parent's parent to Child.
    // So Parent becomes Child of Child.
    // This is "Child becomes Parent" (Child is now parent of user's intended Parent).
    // YES. This is the bug.
    
    // If standard flow is Parent (Top) -> Child (Bottom), then Source (TopNode) connects to Target (BottomNode).
    // Source should be Parent. Target should be Child.
    // My code does: Source becomes Child.
    
    // FIX:
    // When dragging Source -> Target:
    // We should make Target the CHILD of Source.
    
    if (sourceFolder && targetFolder) {
       // Prevent self-reference
       if (sourceId === targetId) return

       let isCycle = false;
       
       // Cycle check depends on which handle was used
       if (sourceHandle === 'top-source') {
          // Source will become child of Target
          // Check if Target is already a descendant of Source
          let temp = folders.find(f => f.id === targetId);
          while(temp && temp.parentId) {
              if (temp.parentId === sourceId) {
                  isCycle = true;
                  break;
              }
              temp = folders.find(f => f.id === temp?.parentId);
          }
       } else {
          // Target will become child of Source (standard)
          // Check if Source is already a descendant of Target
          let temp = folders.find(f => f.id === sourceId);
          while(temp && temp.parentId) {
              if (temp.parentId === targetId) {
                  isCycle = true;
                  break;
              }
              temp = folders.find(f => f.id === temp?.parentId);
          }
       }

       if (!isCycle) {
          // Check if dragging from top handle - if so, reverse the relationship
          // Dragging from top-source means "I want to be a child"
          if (sourceHandle === 'top-source') {
             // Source becomes child of Target
             console.log(`Linking Folder (from top): Parent ${targetId} -> Child ${sourceId}`);
             const folder = folders.find(f => f.id === sourceId)
             if (folder) {
               updateFolderLocal(sourceId, { parentId: targetId })
               saveFolder({ ...folder, parentId: targetId }, user.id)
             }
          } else {
             // Standard Behavior: Source (Start of line) is PARENT. Target (End of line) is CHILD.
             // Update Target's parentId to be SourceId.
             console.log(`Linking Folder: Parent ${sourceId} -> Child ${targetId}`);
             const folder = folders.find(f => f.id === targetId)
             if (folder) {
               updateFolderLocal(targetId, { parentId: sourceId })
               saveFolder({ ...folder, parentId: sourceId }, user.id)
             }
          }
       }
    }
  }, [notes, folders, mindmaps, user, updateNoteLocal, updateFolderLocal, saveNote, saveFolder, setMindmaps])



  const handleAddNode = useCallback((type: 'folder' | 'note' | 'mindmap', parentId: string, position?: { x: number; y: number }, handleId?: string | null) => {
    if (!user?.id) return
    
    // 1. Check if source is a NOTE
    // If dragging from a Note, we are creating a PARENT folder for it (putting the note inside the new folder)
    const sourceNote = notes.find(n => n.id === parentId);
    if (sourceNote) {
        if (type === 'folder') {
            const newFolder: FolderItem = {
                id: uuidv4(),
                name: "New Folder",
                collapsed: false,
                color: ACCENT_COLORS[Math.floor(Math.random() * ACCENT_COLORS.length)],
                parentId: sourceNote.folderId || null,
                position,
            }
            
            useNotesStore.setState({ folders: [...folders, newFolder] })
            saveFolder(newFolder, user.id)
            
            updateNoteLocal(sourceNote.id, { folderId: newFolder.id })
            saveNote({ ...sourceNote, folderId: newFolder.id, updatedAt: Date.now() }, user.id)
        }
        return;
    }
    
    // 1b. Check if source is a MINDMAP
    const sourceMindMap = mindmaps.find(m => m.id === parentId);
    if (sourceMindMap) {
        if (type === 'folder') {
            const newFolder: FolderItem = {
                id: uuidv4(),
                name: "New Folder",
                collapsed: false,
                color: ACCENT_COLORS[Math.floor(Math.random() * ACCENT_COLORS.length)],
                parentId: null,
                position,
            }
            
            useNotesStore.setState({ folders: [...folders, newFolder] })
            saveFolder(newFolder, user.id)
            
            updateMindmapLocal(parentId, { folderId: newFolder.id })
            saveMindmapFolder(parentId, newFolder.id, user.id)
        }
        return;
    }

    // 2. Check if source is a FOLDER
    const sourceFolder = folders.find(f => f.id === parentId);
    
    // Determine if we should create a parent or child based on handleId
    // top-source = dragging from top = create parent for the folder
    // bottom-source = dragging from bottom = create child of the folder
    const isDraggingFromTop = handleId === 'top-source';
    
    if (sourceFolder && isDraggingFromTop) {
        // Create a parent folder for the source folder
        if (type === 'folder') {
            const newFolder: FolderItem = {
                id: uuidv4(),
                name: "New Folder",
                collapsed: false,
                color: ACCENT_COLORS[Math.floor(Math.random() * ACCENT_COLORS.length)],
                parentId: sourceFolder.parentId, // Same parent as source folder (becomes sibling)
                position,
            }
            
            useNotesStore.setState({ folders: [...folders, newFolder] })
            saveFolder(newFolder, user.id)
            
            updateFolderLocal(sourceFolder.id, { parentId: newFolder.id })
            saveFolder({ ...sourceFolder, parentId: newFolder.id }, user.id)
        } else if (type === 'note') {
            // Create a note as sibling of the folder (same parent)
            const newNote: NoteItem = {
                id: uuidv4(),
                title: "New Note",
                content: "",
                updatedAt: Date.now(),
                color: ACCENT_COLORS[Math.floor(Math.random() * ACCENT_COLORS.length)],
                folderId: sourceFolder.parentId,
                position,
            }
            
            useNotesStore.setState({ notes: [...notes, newNote] })
            saveNote(newNote, user.id)
            setActiveNoteId(newNote.id)
        }
        return;
    }
    
    // Standard logic: create child of the source folder
    let targetFolderId = parentId;
    
    if (type === 'note') {
        const newNote: NoteItem = {
            id: uuidv4(),
            title: "New Note",
            content: "",
            updatedAt: Date.now(),
            color: ACCENT_COLORS[Math.floor(Math.random() * ACCENT_COLORS.length)],
            folderId: targetFolderId, // Add into the source folder
            position,
        }
        
        useNotesStore.setState({ notes: [...notes, newNote] })
        saveNote(newNote, user.id)
        setActiveNoteId(newNote.id)
    } else if (type === 'mindmap') {
        const newMindMap: MindMapItem = {
            id: uuidv4(),
            title: "New Mind Map",
            updatedAt: Date.now(),
            color: ACCENT_COLORS[Math.floor(Math.random() * ACCENT_COLORS.length)],
            folderId: targetFolderId,
            position,
        }
        
        setMindmaps(prev => [...prev, newMindMap])
    } else {
        const newFolder: FolderItem = {
            id: uuidv4(),
            name: "New Folder",
            collapsed: false,
            color: ACCENT_COLORS[Math.floor(Math.random() * ACCENT_COLORS.length)],
            parentId: targetFolderId, // Add as child of source folder
            position,
        }
        
        useNotesStore.setState({ folders: [...folders, newFolder] })
        saveFolder(newFolder, user.id)
    }
  }, [folders, notes, mindmaps, user, saveNote, saveFolder, updateNoteLocal, updateFolderLocal, setMindmaps])

  const formatDate = (ts: number) => {
    const d = new Date(ts)
    const now = new Date()
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    }
    return d.toLocaleDateString([], { month: "short", day: "numeric" })
  }

  const getPreview = (html: string) => {
    const tmp = document.createElement("div")
    tmp.innerHTML = html
    const text = tmp.textContent || ""
    return text.slice(0, 60) || "Empty note"
  }

  const filteredNotes = searchQuery
    ? notes.filter(
        (n) =>
          (n.title || "Untitled").toLowerCase().includes(searchQuery.toLowerCase()) ||
          getPreview(n.content).toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : notes

  const rootNotes = filteredNotes.filter((n) => !n.folderId)
  const notesInFolder = (fId: string) => filteredNotes.filter((n) => n.folderId === fId)
  const rootMindmaps = mindmaps.filter((m) => !m.folderId)
  const mindmapsInFolder = (fId: string) => mindmaps.filter((m) => m.folderId === fId)

  // Recursive folder renderer
  const renderFolder = (folder: FolderItem) => {
    const childFolders = folders.filter((f) => f.parentId === folder.id)
    const folderNotes = notesInFolder(folder.id)
    const folderMindmaps = mindmapsInFolder(folder.id)

    return (
      <div key={folder.id} className="mb-1">
        <div className="group/folder flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-white/[0.04] transition-colors relative">
          {/* Indentation line for hierarchy visualization could be added here if needed */}
          <button
            onClick={() => toggleFolder(folder.id)}
            className="flex-shrink-0"
          >
            <ChevronRight
              className="w-3 h-3 text-slate-600 transition-transform duration-200"
              style={{
                transform: folder.collapsed ? "rotate(0deg)" : "rotate(90deg)",
              }}
            />
          </button>
          {folder.collapsed ? (
            <Folder
              className="w-4 h-4 flex-shrink-0"
              style={{ color: folder.color }}
            />
          ) : (
            <FolderOpen
              className="w-4 h-4 flex-shrink-0"
              style={{ color: folder.color }}
            />
          )}

          {renamingFolder === folder.id ? (
            <input
              autoFocus
              defaultValue={folder.name === "New Folder" ? "" : folder.name}
              placeholder={folder.name || "New Folder"}
              onFocus={(e) => {
                if (folder.name === "New Folder") {
                  e.target.select()
                }
              }}
              onBlur={(e) => {
                if (!user?.id) return
                const newName = e.target.value || "Untitled"
                updateFolderLocal(folder.id, { name: newName })
                debouncedSaveFolder({ ...folder, name: newName })
                setRenamingFolder(null)
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  ;(e.target as HTMLInputElement).blur()
                }
                if (e.key === "Escape") {
                  setRenamingFolder(null)
                }
              }}
              className="flex-1 bg-white/[0.06] text-sm text-slate-200 outline-none border border-blue-500/40 rounded px-1.5 py-0.5 min-w-0"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span
              className="text-sm text-slate-400 truncate flex-1 cursor-text"
              onDoubleClick={(e) => {
                e.stopPropagation()
                setRenamingFolder(folder.id)
              }}
              title="Double-click to rename"
            >
              {folder.name}
            </span>
          )}

          <span className="text-[10px] text-slate-600 flex-shrink-0 group-hover/folder:hidden">
            {folderNotes.length + folderMindmaps.length + childFolders.length}
          </span>
          
          <div className="items-center gap-0.5 hidden group-hover/folder:flex flex-shrink-0">
             <button
              onClick={(e) => {
                e.stopPropagation()
                setRenamingFolder(folder.id)
              }}
              className="w-5 h-5 flex items-center justify-center rounded text-slate-600 hover:text-slate-300 hover:bg-white/[0.06] transition-colors"
              title="Rename folder"
            >
              <FileText className="w-3 h-3" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                addFolder(folder.id)
              }}
              className="w-5 h-5 flex items-center justify-center rounded text-slate-600 hover:text-slate-300 hover:bg-white/[0.06] transition-colors"
              title="Add subfolder"
            >
              <FolderPlus className="w-3 h-3" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                addNote(folder.id)
              }}
              className="w-5 h-5 flex items-center justify-center rounded text-slate-600 hover:text-slate-300 hover:bg-white/[0.06] transition-colors"
              title="Add note to folder"
            >
              <Plus className="w-3 h-3" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                deleteFolder(folder.id, folder.name)
              }}
              className="w-5 h-5 flex items-center justify-center rounded text-slate-600 hover:text-red-400 hover:bg-white/[0.06] transition-colors"
              title="Delete folder"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>

        {!folder.collapsed && (
          <div className="ml-4 border-l border-white/[0.04] pl-1">
            
            {/* Render Subfolders */}
            {childFolders.map((child) => renderFolder(child))}

            {/* Render Notes */}
            {folderNotes.map((note) => (
               <NoteListItem key={note.id} note={note} />
            ))}
            
            {/* Render Mindmaps */}
            {folderMindmaps.map((mindmap) => (
               <MindMapListItem key={mindmap.id} mindmap={mindmap} />
            ))}
            
            {folderNotes.length === 0 && folderMindmaps.length === 0 && childFolders.length === 0 && (
                 <p className="text-[11px] text-slate-700 px-3 py-2">
                   Empty
                 </p>
            )}
          </div>
        )}

      </div>
    )
  }

  /* --- note list item --- */
  const NoteListItem = ({ note }: { note: NoteItem }) => {
    const isActive = activeNoteId === note.id
    const isSelected = selectedNotes.has(note.id)

    return (
      <div className="relative group/note">
        <button
          onClick={() => {
            setActiveNoteId(note.id)
          }}
          className={`w-full text-left px-3 py-2.5 rounded-xl mb-0.5 transition-all duration-200 ${
            isActive
              ? "bg-gradient-to-r from-blue-500/10 via-purple-500/5 to-transparent border border-white/[0.08]"
              : isSelected
                ? "bg-blue-500/10 border border-blue-500/20"
                : "hover:bg-white/[0.04] border border-transparent"
          }`}
        >
          <div className="flex items-start gap-2.5">
            <div
              onClick={(e) => toggleNoteSelection(e, note.id)}
              className={`w-4 h-4 mt-1 flex-shrink-0 flex items-center justify-center rounded border transition-all cursor-pointer ${
                isSelected
                  ? "bg-blue-500 border-blue-500 text-white opacity-100"
                  : "border-slate-500 bg-transparent opacity-0 group-hover/note:opacity-100 hover:border-slate-300"
              }`}
            >
              {isSelected && <Check className="w-3 h-3 pointer-events-none" />}
            </div>
            <FileText className="w-4 h-4 mt-1 flex-shrink-0" style={{ color: note.color }} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span
                  className={`text-sm font-medium truncate ${
                    isActive ? "text-white" : "text-slate-400"
                  }`}
                >
                  {note.title || "Untitled"}
                </span>
                <span className="text-[11px] text-slate-600 flex-shrink-0 ml-2 group-hover/note:hidden transition-opacity">
                  {formatDate(note.updatedAt)}
                </span>
              </div>
              <p className="text-[12px] text-slate-600 truncate mt-0.5">
                {getPreview(note.content)}
              </p>
            </div>
          </div>
        </button>

        {!isSelected && (
          <div className="absolute right-2 top-2.5">
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowNoteMenu(showNoteMenu === note.id ? null : note.id)
              }}
              className={`w-6 h-6 flex items-center justify-center rounded-md transition-all duration-150 ${
                showNoteMenu === note.id
                  ? "opacity-100 bg-white/[0.08]"
                  : "opacity-0 group-hover/note:opacity-100 hover:bg-white/[0.08]"
              } text-slate-500 hover:text-slate-300`}
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {showNoteMenu === note.id && (
          <div
            ref={menuRef}
            className="absolute right-1 top-9 z-50 bg-gradient-to-br from-slate-800/95 via-slate-900/95 to-slate-800/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden min-w-[180px]"
            style={{ animation: 'fadeInScale 0.15s ease-out' }}
          >
            <div className="p-1.5">
              {/* Move to folder options */}
              {folders.length > 0 && (
                <>
                  <div className="px-3 py-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                    Move to
                  </div>
                  {note.folderId && (
                    <button
                      onClick={() => moveNoteToFolder(note.id, null)}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-all duration-150 hover:bg-white/[0.06] border border-transparent hover:border-white/[0.08] group"
                    >
                      <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-white/[0.05] group-hover:bg-white/10 transition-all">
                        <FileText className="w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-colors" />
                      </div>
                      <span className="text-sm text-slate-300 group-hover:text-white transition-colors">Root</span>
                    </button>
                  )}
                  {folders
                    .filter((f) => f.id !== note.folderId)
                    .map((f) => (
                      <button
                        key={f.id}
                        onClick={() => moveNoteToFolder(note.id, f.id)}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-all duration-150 hover:bg-white/[0.06] border border-transparent hover:border-white/[0.08] group"
                      >
                        <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-white/[0.05] group-hover:bg-white/10 transition-all">
                          <Folder className="w-3.5 h-3.5 transition-colors" style={{ color: f.color }} />
                        </div>
                        <span className="text-sm text-slate-300 group-hover:text-white transition-colors">{f.name}</span>
                      </button>
                    ))}
                  <div className="my-1 mx-2 border-t border-white/[0.06]" />
                </>
              )}
              <button
                onClick={() => setShowNoteMenu(null)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-all duration-150 border border-transparent cursor-not-allowed opacity-40"
                disabled
                title="Coming soon"
              >
                <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-white/[0.05]">
                  <Share2 className="w-3.5 h-3.5 text-slate-400" />
                </div>
                <span className="text-sm text-slate-400">Turn into Mindmap</span>
              </button>
              <button
                onClick={() => deleteNote(note.id, note.title)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-all duration-150 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 group"
              >
                <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-white/[0.05] group-hover:bg-red-500/10 transition-all">
                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                </div>
                <span className="text-sm text-red-400 group-hover:text-red-300 transition-colors">Delete</span>
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  /* --- mindmap list item --- */
  const MindMapListItem = ({ mindmap }: { mindmap: MindMapItem }) => {
    const getVisibilityIcon = () => {
      const visibility = mindmap.visibility || 'private'
      const iconClass = "w-3 h-3"
      
      switch (visibility) {
        case 'public':
          return <Globe className={iconClass} />
        case 'linkOnly':
          return <Link className={iconClass} />
        default:
          return <Lock className={iconClass} />
      }
    }

    // Find the actual map to get its permalink
    const map = maps.find(m => m.id === mindmap.id || m.permalink === mindmap.id)
    const permalink = map?.permalink || mindmap.id
    const targetPath = user?.username ? `/${user.username}/${permalink}/edit` : '#'

    return (
      <div className="relative group/mindmap">
        <RouterLink
          to={targetPath}
          className="block w-full text-left px-3 py-2.5 rounded-xl mb-0.5 transition-all duration-200 hover:bg-white/[0.04] border border-transparent hover:border-purple-500/20"
        >
          <div className="flex items-start gap-2.5">
            <Network className="w-4 h-4 mt-1 flex-shrink-0 text-purple-400" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  <span className="text-sm font-medium truncate text-slate-400">
                    {mindmap.title || "Untitled Mindmap"}
                  </span>
                  <div className="text-slate-600 opacity-70 shrink-0">
                    {getVisibilityIcon()}
                  </div>
                </div>
                <span className="text-[11px] text-slate-600 flex-shrink-0 ml-2">
                  {formatDate(mindmap.updatedAt)}
                </span>
              </div>
            </div>
          </div>
        </RouterLink>
      </div>
    )
  }

  return (
    <div className="flex flex-1 w-full bg-[#0c1220] text-slate-100 overflow-hidden">
      {isLoading ? (
        // Loading Skeleton
        <div className="flex flex-1 w-full">
          {/* Sidebar Skeleton */}
          <div style={{ width: 280 }} className="flex-shrink-0 border-r border-white/[0.08] bg-gradient-to-b from-slate-800/60 via-slate-900/60 to-slate-800/60 backdrop-blur-xl p-4">
            <div className="space-y-3 animate-pulse">
              {/* Search bar skeleton */}
              <div className="h-10 bg-slate-700/30 rounded-xl"></div>
              {/* Note items skeleton */}
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-16 bg-slate-700/20 rounded-xl"></div>
              ))}
            </div>
          </div>
          {/* Main content skeleton */}
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center animate-pulse">
              <div className="w-16 h-16 bg-blue-500/20 rounded-2xl mx-auto mb-4"></div>
              <div className="h-6 w-48 bg-slate-700/30 rounded mx-auto mb-2"></div>
              <div className="h-4 w-64 bg-slate-700/20 rounded mx-auto"></div>
            </div>
          </div>
        </div>
      ) : (
        <>
      {/* Sidebar */}
      <div
        ref={sidebarRef}
        style={{ width: sidebarCollapsed ? 0 : sidebarWidth }}
        className={`flex-shrink-0 flex flex-col h-full border-r border-white/[0.08] bg-gradient-to-b from-slate-800/60 via-slate-900/60 to-slate-800/60 backdrop-blur-xl relative ${
          sidebarCollapsed ? "overflow-hidden border-r-0" : ""
        }`}
      >
        {/* Resize Handle */}
        <div 
           className="absolute right-[-2px] top-0 bottom-0 w-2 cursor-col-resize hover:bg-blue-500/50 z-20 transition-colors"
           onMouseDown={(e) => {
             e.preventDefault()
             e.stopPropagation()
             setIsResizing(true)
           }}
        />
        {/* Header */}
        {selectedNotes.size > 0 ? (
          <div className="p-4 flex items-center justify-between bg-blue-500/10 border-b border-blue-500/20">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedNotes(new Set())}
                className="text-slate-400 hover:text-white transition-colors"
                title="Clear selection"
              >
                <X className="w-4 h-4" />
              </button>
              <span className="text-sm font-medium text-blue-400">
                {selectedNotes.size} selected
              </span>
            </div>
            <div className="flex items-center gap-1 relative">
              <button
                onClick={() => setShowBulkMoveMenu(!showBulkMoveMenu)}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/[0.1] text-slate-300 transition-colors"
                title="Move selected"
              >
                <Folder className="w-4 h-4" />
              </button>
              <button
                onClick={deleteSelectedNotes}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-500/20 text-red-400 transition-colors"
                title="Delete selected"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              {/* Bulk Move Menu */}
            {showBulkMoveMenu && (
              <div
                ref={menuRef}
                className="absolute right-0 top-9 z-50 bg-gradient-to-br from-slate-800/95 via-slate-900/95 to-slate-800/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden min-w-[180px]"
                style={{ animation: 'fadeInScale 0.15s ease-out' }}
              >
                <div className="flex items-center gap-2 px-3 py-2.5 border-b border-white/5">
                  <Folder className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-xs font-semibold text-slate-300 tracking-wide">Move to</span>
                </div>
                <div className="p-1.5">
                  <button
                    onClick={() => moveSelectedNotes(null)}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-all duration-150 hover:bg-white/[0.06] border border-transparent hover:border-white/[0.08] group"
                  >
                    <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-white/[0.05] group-hover:bg-white/10 transition-all">
                      <FileText className="w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-colors" />
                    </div>
                    <span className="text-sm text-slate-300 group-hover:text-white transition-colors">Root</span>
                  </button>
                  {folders.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => moveSelectedNotes(f.id)}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-all duration-150 hover:bg-white/[0.06] border border-transparent hover:border-white/[0.08] group"
                    >
                      <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-white/[0.05] group-hover:bg-white/10 transition-all">
                        <Folder className="w-3.5 h-3.5 transition-colors" style={{ color: f.color }} />
                      </div>
                      <span className="text-sm text-slate-300 group-hover:text-white transition-colors">{f.name}</span>
                    </button>
                  ))}
                </div>
              </div>
              )}
            </div>
          </div>
        ) : (
          <div className="p-4 flex items-center justify-between border-b border-white/[0.06]">
            <h2 className="text-sm font-semibold text-slate-200 tracking-wide uppercase">
              Notes
            </h2>
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  setNewFolderName("New Folder")
                  setCreateFolderParentId(null)
                  setShowCreateFolderModal(true)
                  setTimeout(() => {
                    const input = document.getElementById('create-folder-input') as HTMLInputElement | null
                    input?.focus()
                    input?.select()
                  }, 0)
                }}
                className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/[0.05] hover:bg-gradient-to-br hover:from-blue-500/20 hover:to-purple-500/20 border border-white/[0.06] hover:border-white/[0.12] transition-all duration-200 text-slate-400 hover:text-white"
                title="New folder"
              >
                <FolderPlus className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => addNote(null)}
                className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/[0.05] hover:bg-gradient-to-br hover:from-blue-500/20 hover:to-purple-500/20 border border-white/[0.06] hover:border-white/[0.12] transition-all duration-200 text-slate-400 hover:text-white"
                title="New note"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="px-3 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notes..."
              className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl py-2 pl-9 pr-3 text-sm text-slate-300 placeholder-slate-600 outline-none focus:border-blue-500/30 focus:bg-white/[0.06] transition-all duration-200"
            />
          </div>
        </div>

        {/* Note list */}
        <div className="flex-1 overflow-y-auto px-2 pb-2 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
          {notes.length === 0 && folders.length === 0 ? (
            <div className="px-3 py-8 text-center">
              <FileText className="w-8 h-8 text-slate-700 mx-auto mb-3" />
              <p className="text-sm text-slate-600">No notes yet</p>
              <button
                onClick={() => addNote(null)}
                className="mt-3 text-xs text-blue-400/80 hover:text-blue-400 transition-colors"
              >
                Create your first note
              </button>
            </div>
          ) : (
            <>
              {/* Folders */}
              {folders
                .filter((folder) => !folder.parentId)
                .map((folder) => renderFolder(folder))}

              {/* Root notes */}
              {rootNotes.map((note) => (
                <NoteListItem key={note.id} note={note} />
              ))}
              
              {/* Root mindmaps */}
              {rootMindmaps.map((mindmap) => (
                <MindMapListItem key={mindmap.id} mindmap={mindmap} />
              ))}
            </>
          )}
        </div>
      </div>

      {/* Editor area */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative">
        {activeNote ? (
          <>
            {/* Header */}
            <div className="flex items-center px-8 py-3 border-b border-white/[0.06] bg-gradient-to-r from-slate-800/30 via-transparent to-slate-800/30">
              
               <button
                  onClick={() => {
                    setActiveNoteId(null)
                  }}
                  className="mr-4 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/[0.06] text-slate-500 hover:text-slate-300 transition-all"
                  title="Close note & View Mindmap"
                >
                  <ChevronRight className={`w-4 h-4 transition-transform duration-300 ${sidebarCollapsed ? "rotate-0" : "rotate-180"}`} />
                </button>

              <div
                className="w-2 h-2 rounded-full mr-3 flex-shrink-0"
                style={{ backgroundColor: activeNote.color }}
              />
              <input
                ref={titleRef}
                type="text"
                value={activeNote.title}
                onChange={(e) => updateNoteTitle(e.target.value)}
                placeholder="Untitled note"
                className="flex-1 bg-transparent text-lg font-semibold text-white placeholder-slate-600 outline-none"
              />
              <button
                className="ml-3 px-3 py-1.5 text-xs rounded-xl bg-white/[0.04] border border-white/[0.08] text-slate-500 flex items-center gap-1.5 cursor-not-allowed opacity-40 transition-all"
                disabled
                title="Coming soon"
              >
                <Share2 className="w-3 h-3" />
                Turn into Mindmap
              </button>

              <div className="relative ml-4" ref={headerMenuRef}>
                 <button
                   data-header-trigger
                   onClick={() => setShowHeaderMenu(!showHeaderMenu)}
                   className={`w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/[0.06] transition-colors ${showHeaderMenu ? "bg-white/[0.06] text-white" : "text-slate-400"}`}
                 >
                   <MoreHorizontal className="w-4 h-4" />
                 </button>
                 
                 {showHeaderMenu && (
                  <div
                    className="absolute right-0 top-9 z-50 bg-gradient-to-br from-slate-800/95 via-slate-900/95 to-slate-800/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden min-w-[210px]"
                    style={{ animation: 'fadeInScale 0.15s ease-out' }}
                  >
                    <div className="flex items-center gap-2 px-3 py-2.5 border-b border-white/5">
                      <MoreHorizontal className="w-3.5 h-3.5 text-blue-400" />
                      <span className="text-xs font-semibold text-slate-300 tracking-wide">Options</span>
                    </div>
                    <div className="p-1.5">
                      {folders.length > 0 && (
                        <>
                          <div className="px-3 py-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                            Move to folder
                          </div>
                          <button
                            onClick={() => {
                              moveNoteToFolder(activeNote.id, null)
                              setShowHeaderMenu(false)
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-all duration-150 hover:bg-white/[0.06] border border-transparent hover:border-white/[0.08] group"
                          >
                            <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-white/[0.05] group-hover:bg-white/10 transition-all">
                              <FileText className="w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-colors" />
                            </div>
                            <span className="text-sm text-slate-300 group-hover:text-white transition-colors">Root</span>
                          </button>
                          {folders.map((f) => (
                            <button
                              key={f.id}
                              onClick={() => {
                                moveNoteToFolder(activeNote.id, f.id)
                                setShowHeaderMenu(false)
                              }}
                              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-all duration-150 hover:bg-white/[0.06] border border-transparent hover:border-white/[0.08] group"
                            >
                              <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-white/[0.05] group-hover:bg-white/10 transition-all">
                                <Folder className="w-3.5 h-3.5 transition-colors" style={{ color: f.color }} />
                              </div>
                              <span className="text-sm text-slate-300 group-hover:text-white transition-colors">{f.name}</span>
                            </button>
                          ))}
                          <div className="my-1 mx-2 border-t border-white/[0.06]" />
                        </>
                      )}
                      <button
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-all duration-150 border border-transparent cursor-not-allowed opacity-40"
                        disabled
                        title="Coming soon"
                      >
                        <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-white/[0.05]">
                          <Share2 className="w-3.5 h-3.5 text-slate-400" />
                        </div>
                        <span className="text-sm text-slate-400">Turn into Mindmap</span>
                      </button>
                      <button
                        onClick={() => {
                           deleteNote(activeNote.id, activeNote.title)
                           setShowHeaderMenu(false)
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-all duration-150 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 group"
                      >
                        <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-white/[0.05] group-hover:bg-red-500/10 transition-all">
                          <Trash2 className="w-3.5 h-3.5 text-red-400" />
                        </div>
                        <span className="text-sm text-red-400 group-hover:text-red-300 transition-colors">Delete note</span>
                      </button>
                    </div>
                  </div>
                 )}
              </div>
            </div>

            {/* Toolbar */}
            <div className="flex items-center gap-0.5 px-8 py-2 border-b border-white/[0.06] bg-gradient-to-r from-slate-800/40 via-slate-900/40 to-slate-800/40 backdrop-blur-sm flex-wrap">
              <ToolbarBtn onClick={() => execCommand("bold")} active={activeFormats.bold} title="Bold (Ctrl+B)">
                <Bold className="w-3.5 h-3.5" />
              </ToolbarBtn>
              <ToolbarBtn onClick={() => execCommand("italic")} active={activeFormats.italic} title="Italic (Ctrl+I)">
                <Italic className="w-3.5 h-3.5" />
              </ToolbarBtn>
              <ToolbarBtn onClick={() => execCommand("underline")} active={activeFormats.underline} title="Underline (Ctrl+U)">
                <Underline className="w-3.5 h-3.5" />
              </ToolbarBtn>

              <div className="w-px h-5 bg-white/[0.06] mx-1.5" />

              <ToolbarBtn
                onClick={() => execCommand("formatBlock", "h1")}
                active={activeFormats.h1}
                title="Heading 1"
              >
                <Heading1 className="w-3.5 h-3.5" />
              </ToolbarBtn>
              <ToolbarBtn
                onClick={() => execCommand("formatBlock", "h2")}
                active={activeFormats.h2}
                title="Heading 2"
              >
                <Heading2 className="w-3.5 h-3.5" />
              </ToolbarBtn>

              <div className="w-px h-5 bg-white/[0.06] mx-1.5" />

              <ToolbarBtn
                onClick={() => execCommand("insertUnorderedList")}
                active={activeFormats.insertUnorderedList}
                title="Bullet list"
              >
                <List className="w-3.5 h-3.5" />
              </ToolbarBtn>
              <ToolbarBtn
                onClick={() => execCommand("insertOrderedList")}
                active={activeFormats.insertOrderedList}
                title="Numbered list"
              >
                <ListOrdered className="w-3.5 h-3.5" />
              </ToolbarBtn>
              <ToolbarBtn
                onClick={() => execCommand("formatBlock", "blockquote")}
                active={activeFormats.blockquote}
                title="Quote"
              >
                <Quote className="w-3.5 h-3.5" />
              </ToolbarBtn>
              <ToolbarBtn
                onClick={() => execCommand("formatBlock", "pre")}
                active={activeFormats.pre}
                title="Code block"
              >
                <Code className="w-3.5 h-3.5" />
              </ToolbarBtn>

              <div className="w-px h-5 bg-white/[0.06] mx-1.5" />

              <ToolbarBtn
                onClick={() => execCommand("justifyLeft")}
                active={activeFormats.justifyLeft}
                title="Align left"
              >
                <AlignLeft className="w-3.5 h-3.5" />
              </ToolbarBtn>
              <ToolbarBtn
                onClick={() => execCommand("justifyCenter")}
                active={activeFormats.justifyCenter}
                title="Align center"
              >
                <AlignCenter className="w-3.5 h-3.5" />
              </ToolbarBtn>
              <ToolbarBtn
                onClick={() => execCommand("justifyRight")}
                active={activeFormats.justifyRight}
                title="Align right"
              >
                <AlignRight className="w-3.5 h-3.5" />
              </ToolbarBtn>
            </div>

            {/* Editor */}
            <div className="flex-1 overflow-y-auto bg-[#0c1220] scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
              <div className="w-full min-h-full px-12 py-8 tiptap-editor-wrapper">
                 <EditorContent 
                   editor={editor} 
                   className="min-h-full outline-none text-[15px] leading-relaxed text-slate-200 caret-blue-400
                    [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:text-white [&_h1]:mb-3 [&_h1]:mt-6
                    [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-white [&_h2]:mb-2 [&_h2]:mt-5
                    [&_blockquote]:border-l-2 [&_blockquote]:border-blue-500/40 [&_blockquote]:pl-4 [&_blockquote]:text-slate-400 [&_blockquote]:italic [&_blockquote]:my-3
                    [&_pre]:bg-white/[0.04] [&_pre]:border [&_pre]:border-white/[0.06] [&_pre]:rounded-lg [&_pre]:px-4 [&_pre]:py-3 [&_pre]:my-3 [&_pre]:font-mono [&_pre]:text-sm [&_pre]:text-slate-300
                    [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-2
                    [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-2
                    [&_li]:my-1
                    [&_a]:text-blue-400 [&_a]:underline"
                 />
              </div>
            </div>

            {/* Footer / Status Bar - Character Count */}
            <div className="flex-shrink-0 flex items-center justify-between px-6 h-12 border-t border-white/[0.06] text-xs text-slate-500 select-none bg-gradient-to-r from-slate-800/40 via-slate-900/40 to-slate-800/40 backdrop-blur-xl">
               <div className="flex items-center gap-2">
                 {saveStatus === 'saving' && (
                   <span className="text-blue-400 flex items-center gap-1.5">
                     <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                       <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                       <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                     </svg>
                     Saving...
                   </span>
                 )}
                 {saveStatus === 'saved' && activeNote?.updatedAt && (
                   <span className="text-slate-500">
                     Updated {new Date(activeNote.updatedAt).toLocaleString([], {
                       month: "short",
                       day: "numeric",
                       hour: "2-digit",
                       minute: "2-digit",
                     })}
                   </span>
                 )}
                 {saveStatus === 'error' && (
                   <span className="text-red-400">Failed to save</span>
                 )}
                 {saveStatus === 'offline' && (
                   <span className="text-yellow-400">Offline mode</span>
                 )}
               </div>
               <div className="flex gap-6 font-medium">
                 <span>{wordCount} words</span>
                 <span>{charCount} characters</span>
               </div>
            </div>
          </>
        ) : (
          <div className="flex-1 h-full relative">
            {/* Mindmap View Header / Sidebar Toggle */}
            <div className={`absolute top-4 left-4 z-50 transition-transform duration-300 ${sidebarCollapsed ? 'translate-x-0' : 'translate-x-[0px]'}`}>
              {sidebarCollapsed ? (
                <button
                  onClick={() => setSidebarCollapsed(false)}
                  className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-800/90 backdrop-blur-xl border border-white/10 hover:bg-slate-700 hover:border-white/20 text-slate-400 hover:text-white transition-all shadow-lg"
                  title="Expand Sidebar"
                >
                  <GripVertical className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={() => setSidebarCollapsed(true)}
                  className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-800/90 backdrop-blur-xl border border-white/10 hover:bg-slate-700 hover:border-white/20 text-slate-400 hover:text-white transition-all shadow-lg"
                  title="Collapse Sidebar"
                >
                  <ChevronRight className="w-4 h-4 rotate-180" />
                </button>
              )}
            </div>

             <NotesMindMap
              notes={notes}
              folders={folders}
              mindmaps={mindmaps}
              onNoteClick={(id) => setActiveNoteId(id)}
              onFolderClick={(id) => toggleFolder(id)}
              onConnectNode={(source, target, sourceHandle, targetHandle) => handleConnectNode(source, target, sourceHandle, targetHandle)}
              onDisconnectNode={(nodeId) => {
                if (!user?.id) return
                const note = notes.find(n => n.id === nodeId);
                const folder = folders.find(f => f.id === nodeId);
                const mindmap = mindmaps.find(m => m.id === nodeId);
                if (note) {
                  updateNoteLocal(nodeId, { folderId: null });
                  saveNote({ ...note, folderId: null, updatedAt: Date.now() }, user.id);
                }
                if (folder) {
                  updateFolderLocal(nodeId, { parentId: null });
                  saveFolder({ ...folder, parentId: null }, user.id);
                }
                if (mindmap) {
                  updateMindmapLocal(nodeId, { folderId: null });
                  saveMindmapFolder(nodeId, null, user.id);
                }
              }}
              onAddNode={(type, sourceId, position, handleId) => handleAddNode(type, sourceId, position, handleId)}
              onCreateFirstNote={() => addNote(null)}
              onAddRootFolder={(position) => addFolder(null, position)}
              onAddRootNote={(position) => addNote(null, position)}
              onDeleteNode={(id, type, label) => {
                 if (type === 'folder') deleteFolder(id, label);
                 if (type === 'note') deleteNote(id, label);
                 if (type === 'mindmap') {
                   console.log('Delete mindmap:', id);
                   setMindmaps(prev => prev.filter(m => m.id !== id));
                 }
              }}
              onRenameNode={(id, type, newName) => {
                 if (!user?.id) return
                 if (type === 'folder') {
                    const folder = folders.find(f => f.id === id);
                    if (folder) {
                      updateFolderLocal(id, { name: newName });
                      debouncedSaveFolder({ ...folder, name: newName });
                    }
                 }
                 if (type === 'note') {
                    const note = notes.find(n => n.id === id);
                    if (note) {
                      updateNoteLocal(id, { title: newName });
                      debouncedSaveNote({ ...note, title: newName, updatedAt: Date.now() });
                    }
                 }
                 if (type === 'mindmap') {
                    const mindmap = mindmaps.find(m => m.id === id);
                    if (mindmap) {
                      updateMindmapLocal(id, { title: newName, updatedAt: Date.now() });
                      saveMindmapTitle(id, newName, user.id);
                    }
                 }
              }}
              onPositionChange={(id, position, type) => {
                  if (!user?.id) return
                  if (type === 'folder') {
                      const folder = folders.find(f => f.id === id);
                      if (folder) {
                        updateFolderLocal(id, { position });
                        saveFolderPosition(id, position, user.id);
                      }
                  }
                  if (type === 'note') {
                      const note = notes.find(n => n.id === id);
                      if (note) {
                        updateNoteLocal(id, { position });
                        saveNotePosition(id, position, user.id);
                      }
                  }
                  if (type === 'mindmap') {
                      const mindmap = mindmaps.find(m => m.id === id);
                      if (mindmap) {
                        updateMindmapLocal(id, { position });
                        saveMindmapPosition(id, position, user.id);
                      }
                  }
              }}
            />
          </div>
        )}
      </div>

      {/* Modal */}
      <DeleteConfirmModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={() => {
          if (deleteConfirm.type === 'note') handleDeleteNoteConfirm()
          if (deleteConfirm.type === 'folder') handleDeleteFolderConfirm()
          if (deleteConfirm.type === 'selection') handleDeleteSelectionConfirm()
        }}
        title={`Delete ${
          deleteConfirm.type === 'selection'
            ? 'Notes' // "Delete Notes"
            : deleteConfirm.type === 'folder'
            ? 'Folder' // "Delete Folder"
            : 'Note' // "Delete Note"
        }`}
        message={`Are you sure you want to delete ${
          deleteConfirm.type === 'selection'
            ? `${deleteConfirm.count} selected notes`
            : `"${deleteConfirm.title}"`
        }? This action cannot be undone and all data will be permanently lost.`}
      />

      {/* Create Folder Modal */}
      {showCreateFolderModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowCreateFolderModal(false)}>
          <div
            className="bg-[#0f172a] border border-white/10 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/25 flex items-center justify-center">
                  <FolderPlus className="w-5 h-5 text-blue-300" />
                </div>
                <div>
                  <div className="text-lg font-semibold text-slate-100">Create Folder</div>
                  <div className="text-sm text-slate-500">Choose a name and confirm to add it.</div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wide text-slate-500 font-semibold">Folder Name</label>
                <input
                  id="create-folder-input"
                  autoFocus
                  value={newFolderName}
                  placeholder="New Folder"
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      addFolder(createFolderParentId, undefined, newFolderName, { renameOnCreate: false })
                      setShowCreateFolderModal(false)
                    }
                    if (e.key === 'Escape') {
                      setShowCreateFolderModal(false)
                    }
                  }}
                  className="w-full bg-white/[0.04] border border-white/[0.08] focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 outline-none transition-all"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowCreateFolderModal(false)}
                  className="px-3.5 py-2 rounded-lg text-sm text-slate-300 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    addFolder(createFolderParentId, undefined, newFolderName, { renameOnCreate: false })
                    setShowCreateFolderModal(false)
                  }}
                  className="px-3.5 py-2 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-400 hover:to-purple-400 shadow-lg shadow-blue-500/20 transition-colors"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Link Tooltip */}
      {linkTooltip?.show && (
        <div 
          className="fixed z-[9999] px-2 py-1 text-xs text-white bg-slate-900 border border-slate-700 rounded shadow-xl pointer-events-none"
          style={{ left: linkTooltip.x, top: linkTooltip.y }}
        >
          Ctrl + Click to open
        </div>
      )}
        </>
      )}
    </div>
  )
}

// Inject keyframe animation and TipTap placeholder styles
if (typeof document !== 'undefined' && !document.getElementById('notes-menu-anim')) {
  const style = document.createElement('style')
  style.id = 'notes-menu-anim'
  style.textContent = `
    @keyframes fadeInScale {
      from { opacity: 0; transform: scale(0.95) translateY(-4px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }
    
    /* TipTap Placeholder */
    .ProseMirror p.is-editor-empty:first-child::before,
    .ProseMirror p.is-empty:first-child::before {
      content: attr(data-placeholder);
      float: left;
      color: rgb(71 85 105);
      pointer-events: none;
      height: 0;
    }
  `
  document.head.appendChild(style)
}

export default Notes
