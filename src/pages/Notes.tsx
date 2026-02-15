"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
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
} from "lucide-react"

import ReactFlow, {
  Background,
  Controls,
  Edge,
  Node as RFNode,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  NodeProps,
  BackgroundVariant,
  Connection,
  ReactFlowProvider,
  useReactFlow,
  OnConnectStart,
  OnConnectEnd,
  NodeChange,
} from "reactflow"
import "reactflow/dist/style.css"
import { NotesEdgeDropMenu } from "../components/NotesEdgeDropMenu"
import { NotesNodeContextMenu } from "../components/NotesNodeContextMenu"
import { NotesPaneContextMenu } from "../components/NotesPaneContextMenu"
import { autoLayoutNode } from "../utils/autoLayout"

/* --- types --- */
interface NoteItem {
  id: string
  title: string
  content: string
  updatedAt: number
  color: string
  folderId: string | null
  position?: { x: number; y: number }
}

interface FolderItem {
  id: string
  name: string
  collapsed: boolean
  color: string
  parentId: string | null
  position?: { x: number; y: number }
}

const ACCENT_COLORS = [
  "#3b82f6",
  "#8b5cf6",
  "#6366f1",
  "#06b6d4",
  "#ec4899",
  "#f59e0b",
]

/* --- custom node types --- */
// Optimized node types to prevent drag lag (removed conflicting transitions)
const FolderMindNode = React.memo(({ data }: NodeProps) => {
  return (
    <div className="relative group">
      {/* Glow effect - removing transition to prevent drag lag */}
      <div 
        className="absolute -inset-0.5 rounded-xl opacity-20 group-hover:opacity-40"
        style={{ background: data.color || '#3b82f6' }}
      ></div>
      
      {/* Removed backdrop-blur-xl which can be performance heavy during drag */}
      <div className="relative flex items-center gap-3 bg-[#0f172a] border border-slate-700/50 rounded-xl p-3 min-w-[180px] shadow-xl">
        <Handle type="target" position={Position.Top} className="!w-1 !h-1 !min-w-0 !min-h-0 !bg-transparent !border-none !top-0" />
        {/* Add source handle to top to allow dragging from top to create parent folder */}
        <Handle 
           type="source" 
           position={Position.Top} 
           id="top-source"
           className="!w-2 !h-2 !min-w-0 !min-h-0 !bg-transparent !border-none !top-0 z-50 cursor-crosshair" 
           style={{ background: 'transparent' }}
        />
        
        <div 
          className="w-10 h-10 rounded-lg flex items-center justify-center border border-white/5 shadow-inner" 
          style={{ 
            backgroundColor: data.color ? `${data.color}15` : '#1e293b',
            borderColor: data.color ? `${data.color}30` : 'rgba(255,255,255,0.05)'
          }}
        >
          {data.collapsed ? (
            <Folder className="w-5 h-5" style={{ color: data.color || '#64748b' }} />
          ) : (
            <FolderOpen className="w-5 h-5" style={{ color: data.color || '#64748b' }} />
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-slate-200 truncate">{data.label}</div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">{data.count || 0} ITEMS</span>
            {data.collapsed && <span className="w-1.5 h-1.5 rounded-full bg-blue-500/50" />}
          </div>
        </div>

        {/* Both source and target handles at bottom to allow connecting TO folder (as parent) and FROM folder (to child) */}
        {/* We use specific IDs and positioning to prevent overlap issues */}
        {/* We make the source handle larger (z-index) to ensure it catches the drag start */}
        <Handle 
           type="source" 
           position={Position.Bottom} 
           id="bottom-source"
           className="!w-2 !h-2 !min-w-0 !min-h-0 !bg-transparent !border-none !bottom-0 z-50 cursor-crosshair" 
           style={{ background: 'transparent' }}
        />
        <Handle 
           type="target" 
           position={Position.Bottom} 
           id="bottom-target"
           className="!w-2 !h-2 !min-w-0 !min-h-0 !bg-transparent !border-none !bottom-0 z-40" 
           style={{ background: 'transparent' }}
        />
      </div>
    </div>
  )
})

const NoteMindNode = React.memo(({ data }: NodeProps) => {
  return (
    <div className="relative group hover:z-10">
       <div className="absolute -inset-px bg-blue-500/20 rounded-xl opacity-0 group-hover:opacity-100"></div>
       <div className="relative flex items-center gap-2.5 bg-[#1e293b] border border-slate-700/50 group-hover:border-blue-500/30 rounded-xl p-2.5 min-w-[160px] max-w-[220px] shadow-lg hover:bg-[#1e293b]">
          <Handle type="target" position={Position.Top} className="!w-1 !h-1 !min-w-0 !min-h-0 !bg-transparent !border-none !top-0" />
          {/* Add source handle to top as well, so we can drag from top to create parent folder */}
          {/* Make source handle accessible effectively */}
          <Handle 
              type="source" 
              position={Position.Top} 
              className="!w-2 !h-2 !min-w-0 !min-h-0 !bg-transparent !border-none !top-0 z-50 cursor-crosshair" 
              style={{ background: 'transparent' }}
          />
          
          <div 
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ backgroundColor: data.color ? `${data.color}15` : '#334155' }}
          >
            <FileText className="w-4 h-4" style={{ color: data.color || '#94a3b8' }} />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-slate-300 truncate group-hover:text-blue-200">{data.label}</div>
            <div className="text-[10px] text-slate-500 truncate">{data.preview || "No content"}</div>
          </div>
       </div>
    </div>
  )
})

const nodeTypes = {
  folder: FolderMindNode,
  note: NoteMindNode,
}

/* --- mindmap view component --- */
const NotesMindMapContent = ({
  notes,
  folders,
  onNoteClick,
  onFolderClick,
  onConnectNode,
  onAddNode,
  onCreateFirstNote,
  onAddRootFolder,
  onAddRootNote,
  onDeleteNode,
  onRenameNode,
  onPositionChange
}: {
  notes: NoteItem[]
  folders: FolderItem[]
  onNoteClick: (noteId: string) => void
  onFolderClick?: (folderId: string) => void
  onConnectNode?: (sourceId: string, targetId: string, sourceHandle?: string | null, targetHandle?: string | null) => void
  onAddNode?: (type: 'folder' | 'note', parentId: string, position?: { x: number; y: number }, handleId?: string | null) => void
  onCreateFirstNote?: () => void
  onAddRootFolder?: (position?: { x: number; y: number }) => void
  onAddRootNote?: (position?: { x: number; y: number }) => void
  onDeleteNode?: (id: string, type: 'folder' | 'note', label: string) => void
  onRenameNode?: (id: string, type: 'folder' | 'note', newName: string) => void
  onPositionChange?: (id: string, position: { x: number; y: number }, type: 'folder' | 'note') => void
}) => {
  const [nodes, setNodes, onNodesChangeInternal] = useNodesState([])
  const nodesRef = useRef<RFNode[]>([]); // Ref to track nodes without triggering re-renders
  
  // Sync ref with state
  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const { screenToFlowPosition } = useReactFlow()

  
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      onNodesChangeInternal(changes)
      if (onPositionChange) {
        changes.forEach(change => {
            if (change.type === 'position' && change.position && !change.dragging) {
               // When dragging ends or explicit position set
               const node = nodes.find(n => n.id === change.id)
               if (node) {
                  onPositionChange(change.id, change.position, node.type as 'folder' | 'note')
               }
            }
        });
      }
    },
    [onNodesChangeInternal, onPositionChange, nodes]
  )
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

  // Helper to extract plain text preview
  const getPreview = (html: string) => {
    if (typeof document === 'undefined') return ""
    const tmp = document.createElement("div")
    tmp.innerHTML = html
    return tmp.textContent?.slice(0, 30) || "Empty"
  }


  const handleAutoLayout = useCallback((nodeId: string) => {
    // Basic auto-layout logic for a subtree
    try {
      const result = autoLayoutNode(nodes, edges, nodeId, {
        nodeSpacing: 20,
        subtreeSpacing: 60,
        levelSpacing: 120,
        childrenPerRow: 3,
        minRowSpacing: 60,
      });

      // Update positions
      setNodes((nds) => {
        const updated = nds.map((n) => {
          if (result.positions[n.id]) {
            const newPos = result.positions[n.id];
            // Notify parent about change to persist
            if (onPositionChange) {
                 // Optimization: batch this if there are many nodes? 
                 // For now, simple loop is fine unless huge.
            }
            return {
              ...n,
              position: newPos,
            };
          }
          return n;
        });
        
        // After layout, persist all changed positions
        if (onPositionChange) {
             Object.keys(result.positions).forEach(id => {
                 const node = nodes.find(n => n.id === id);
                 if (node) {
                     onPositionChange(id, result.positions[id], node.type as 'folder' | 'note');
                 }
             });
        }
        
        return updated;
      });
    } catch (error) {
       console.error("Auto layout failed", error);
    }
  }, [nodes, edges, onPositionChange, setNodes])

  useEffect(() => {
    // Basic auto-layout logic
    const newNodes: RFNode[] = []
    const newEdges: Edge[] = [] 


    // Helper to process hierarchy
    const processHierarchy = (
      parentId: string | null,
      x: number,
      y: number,
      level: number,
    ) => {
      const childFolders = folders.filter((f) => f.parentId === parentId)
      const childNotes = notes.filter((n) => n.folderId === parentId)

      const items = [...childFolders, ...childNotes]
      
      // We only care about layout calculation for items WITHOUT stored position
      // For items with stored position, we just place them there.
      // But to avoid overlap, maybe we should track occupied space? 
      // Simplified approach: Just place them.
      
      const spacingX = 220 
      const levelYOffset = 150 
      
      // Calculate starting X to center children beneath parent
      const totalItems = items.length
      let currentX = x - ((totalItems - 1) * spacingX) / 2

      items.forEach((item) => {
        const isFolder = "name" in item
        const id = item.id
        
        // Count items if folder
        let count = 0
        if (isFolder) {
            const fId = item.id
            const subNotes = notes.filter(n => n.folderId === fId).length
            const subFolders = folders.filter(f => f.parentId === fId).length
            count = subNotes + subFolders
        }
        
        // Logic:
        // 1. If persisted position exists in data (item.position), ALWAYS use it.
        // 2. If NOT persisted, check if node exists in ReactFlow state (nodesRef). Use that visual position to be stable.
        // 3. If NEITHER (brand new node, no drag drop pos), use calculated 'currentX'.

        let position: { x: number; y: number } = item.position || { x: currentX, y };

        if (!item.position) {
           // Try to find status from previous nodes to avoid jumping
           const existing = nodesRef.current.find(n => n.id === id);
           if (existing) {
               // Reuse existing position effectively freezing auto-layout for this node
               position = existing.position;
           }
        }

        newNodes.push({
          id,
          type: isFolder ? 'folder' : 'note',
          position,
          data: { 
            label: isFolder ? (item as FolderItem).name : (item as NoteItem).title || "Untitled",
            color: (item as any).color,
            count,
            collapsed: isFolder ? (item as FolderItem).collapsed : false,
            preview: !isFolder ? getPreview((item as NoteItem).content) : undefined
          },
        })





        // Add Edge from parent (if not root)
        if (parentId) {
          // If parent is a folder, use "bottom-source" handle explicitly
          // If parent is note (shouldn't happen in this structure but possible in data), use default
          const parentIsFolder = folders.some(f => f.id === parentId);
          
          newEdges.push({
            id: `e-${parentId}-${id}`,
            source: parentId,
            sourceHandle: parentIsFolder ? "bottom-source" : undefined,
            target: id,
            // If child is folder, target top (default). If note, target top (default).
            // But dragging TO folder involves targeting "bottom-target", but hierarchically edges are top-down.
            // Rendering edges should connect Parent(Bottom) -> Child(Top).
            style: { stroke: '#475569', strokeWidth: 2 },
            type: 'default', // Bezier curve for smoother visuals
            animated: false,
          })
        }

        // Recursively process children if it's a folder AND NOT COLLAPSED
        if (isFolder && !(item as FolderItem).collapsed) {
          // Pass new coordinates for next level (increment Y, centered X will be calculated)
          processHierarchy(id, currentX, y + levelYOffset, level + 1)
        }

        currentX += spacingX
      })
    }


    // Start with root items
    // Center logic handles by fitView
    processHierarchy(null, 0, 50, 0)
    
    // Only update if something changed?
    // For now, always update to keep sync
    setNodes(() => {
        return newNodes
    })
    setEdges(newEdges)
  }, [notes, folders, setNodes, setEdges]) // Removed 'nodes' dependency to prevent loops, use ref instead


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
         onConnectStart={onConnectStart}
         onConnectEnd={onConnectEnd}
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
            if (isNote) {
                onNoteClick(node.id)
            } else {
                onFolderClick?.(node.id)
            }
         }}
         fitView
         minZoom={0.2}
         maxZoom={2}
      >
        <Background gap={24} size={1} color="#334155" variant={BackgroundVariant.Dots} />
        <Controls className="bg-slate-800 border-slate-700 fill-slate-400 !m-4" />
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

/* --- toolbar button --- */
function ToolbarBtn({
  onClick,
  active,
  title,
  children,
}: {
  onClick: () => void
  active?: boolean
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      onMouseDown={(e) => {
        e.preventDefault()
        onClick()
      }}
      title={title}
      className={`w-7 h-7 flex items-center justify-center rounded-md transition-all duration-150 ${
        active
          ? "bg-blue-500/20 text-blue-400"
          : "text-slate-500 hover:text-slate-300 hover:bg-white/[0.06]"
      }`}
    >
      {children}
    </button>
  )
}

/* --- main component --- */
const Notes = () => {
  const [notes, setNotes] = useState<NoteItem[]>([])
  const [folders, setFolders] = useState<FolderItem[]>([])
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
  const editorRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const headerMenuRef = useRef<HTMLDivElement>(null)
  const sidebarRef = useRef<HTMLDivElement>(null)
  const [showHeaderMenu, setShowHeaderMenu] = useState(false)
  const titleRef = useRef<HTMLInputElement>(null)
  const savingTimeout = useRef<NodeJS.Timeout | null>(null)

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

  // Load
  useEffect(() => {
    try {
      const savedNotes = localStorage.getItem("notes_wysiwyg_v1")
      const savedFolders = localStorage.getItem("notes_folders_v1")
      if (savedNotes) {
        const parsed = JSON.parse(savedNotes)
        setNotes(parsed)
        if (parsed.length > 0) setActiveNoteId(parsed[0].id)
      }
      if (savedFolders) setFolders(JSON.parse(savedFolders))
    } catch {
      /* ignore */
    }
  }, [])

  // Save
  useEffect(() => {
    if (notes.length > 0 || localStorage.getItem("notes_wysiwyg_v1")) {
      localStorage.setItem("notes_wysiwyg_v1", JSON.stringify(notes))
    }
  }, [notes])

  useEffect(() => {
    if (folders.length > 0 || localStorage.getItem("notes_folders_v1")) {
      localStorage.setItem("notes_folders_v1", JSON.stringify(folders))
    }
  }, [folders])

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

  const activeNote = notes.find((n) => n.id === activeNoteId)

  const updateCounts = useCallback(() => {
    if (!editorRef.current) return
    const text = editorRef.current.innerText || ""
    setCharCount(text.replace(/\n/g, "").length)
    const words = text.trim().split(/\s+/)
    setWordCount(text.trim() === "" ? 0 : words.length)
  }, [])

  // Sync editor content when switching notes
  useEffect(() => {
    if (editorRef.current && activeNote) {
      editorRef.current.innerHTML = activeNote.content
      updateCounts()
    }
  }, [activeNoteId]) // eslint-disable-line react-hooks/exhaustive-deps

  const saveContent = useCallback(() => {
    if (!activeNoteId || !editorRef.current) return
    const html = editorRef.current.innerHTML
    setNotes((prev) =>
      prev.map((n) =>
        n.id === activeNoteId ? { ...n, content: html, updatedAt: Date.now() } : n,
      ),
    )
  }, [activeNoteId])

  const handleEditorInput = useCallback(() => {
    if (savingTimeout.current) clearTimeout(savingTimeout.current)
    updateCounts()
    savingTimeout.current = setTimeout(saveContent, 300)
  }, [saveContent, updateCounts])

  const checkActiveFormats = useCallback(() => {
    const formats: Record<string, boolean> = {}
    formats.bold = document.queryCommandState("bold")
    formats.italic = document.queryCommandState("italic")
    formats.underline = document.queryCommandState("underline")
    formats.insertUnorderedList = document.queryCommandState("insertUnorderedList")
    formats.insertOrderedList = document.queryCommandState("insertOrderedList")
    formats.justifyLeft = document.queryCommandState("justifyLeft")
    formats.justifyCenter = document.queryCommandState("justifyCenter")
    formats.justifyRight = document.queryCommandState("justifyRight")
    // Check block format
    const block = document.queryCommandValue("formatBlock")
    formats.h1 = block === "h1"
    formats.h2 = block === "h2"
    formats.blockquote = block === "blockquote"
    formats.pre = block === "pre"
    setActiveFormats(formats)
  }, [])

  // Listen for selection changes to update toolbar state
  useEffect(() => {
    const handler = () => checkActiveFormats()
    document.addEventListener("selectionchange", handler)
    return () => document.removeEventListener("selectionchange", handler)
  }, [checkActiveFormats])

  const execCommand = (command: string, value?: string) => {
    // Check if we are trying to set a format that is already active (toggle behavior)
    if (command === "formatBlock" && value) {
      const currentBlock = document.queryCommandValue("formatBlock")
      if (currentBlock === value) {
        // Toggle off by setting to default paragraph
        document.execCommand("formatBlock", false, "p")
        editorRef.current?.focus()
        setTimeout(checkActiveFormats, 10)
        return
      }
    }

    document.execCommand(command, false, value)
    editorRef.current?.focus()
    // Update toolbar state immediately after command
    setTimeout(checkActiveFormats, 10)
  }

  const addNote = (folderId: string | null = null, position?: { x: number; y: number }) => {
    const newNote: NoteItem = {
      id: uuidv4(),
      title: "New Note",
      content: "",
      updatedAt: Date.now(),
      color: pickColor(),
      folderId,
      position,
    }
    setNotes((prev) => [newNote, ...prev])
    setActiveNoteId(newNote.id)
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
    if (!deleteConfirm.id) return
    const filtered = notes.filter((n) => n.id !== deleteConfirm.id)
    setNotes(filtered)
    if (activeNoteId === deleteConfirm.id) {
      setActiveNoteId(filtered.length > 0 ? filtered[0].id : null)
    }
  }

  const handleDeleteFolderConfirm = () => {
    if (!deleteConfirm.id) return
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

    setFolders((prev) => prev.filter((f) => !foldersToDelete.has(f.id)))
    setNotes((prev) =>
      prev.map((n) =>
        n.folderId && foldersToDelete.has(n.folderId) ? { ...n, folderId: null } : n,
      ),
    )
  }

  const handleDeleteSelectionConfirm = () => {
    const remainingNotes = notes.filter((n) => !selectedNotes.has(n.id))
    setNotes(remainingNotes)
    setSelectedNotes(new Set())
    if (activeNoteId && selectedNotes.has(activeNoteId)) {
      setActiveNoteId(remainingNotes.length > 0 ? remainingNotes[0].id : null)
    }
  }

  const addFolder = (parentId: string | null = null, position?: { x: number; y: number }) => {
    const folder: FolderItem = {
      id: uuidv4(),
      name: "New Folder",
      collapsed: false,
      color: pickColor(),
      parentId: parentId || null,
      position,
    }
    setFolders((prev) => [...prev, folder])
    setRenamingFolder(folder.id)
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
    setFolders((prev) =>
      prev.map((f) =>
        f.id === folderId ? { ...f, collapsed: !f.collapsed } : f,
      ),
    )
  }

  const updateNoteTitle = (title: string) => {
    if (!activeNoteId) return
    setNotes((prev) =>
      prev.map((n) =>
        n.id === activeNoteId ? { ...n, title, updatedAt: Date.now() } : n,
      ),
    )
  }

  const moveNoteToFolder = (noteId: string, folderId: string | null) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === noteId ? { ...n, folderId } : n)),
    )
    setShowNoteMenu(null)
  }

  const deleteSelectedNotes = () => {
    setDeleteConfirm({
      isOpen: true,
      type: 'selection',
      count: selectedNotes.size,
    })
  }

  const moveSelectedNotes = (folderId: string | null) => {
    const updatedNotes = notes.map((n) =>
      selectedNotes.has(n.id) ? { ...n, folderId } : n,
    )
    setNotes(updatedNotes)
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
    // Determine types of source and target
    const sourceNote = notes.find(n => n.id === sourceId)
    const sourceFolder = folders.find(f => f.id === sourceId)
    const targetNote = notes.find(n => n.id === targetId)
    const targetFolder = folders.find(f => f.id === targetId)

    // CASE 1: Dragging Note (Source) -> Folder (Target)
    // User wants Note to be CHILD of Folder.
    if (sourceNote && targetFolder) {
       setNotes(prev => prev.map(n => n.id === sourceId ? { ...n, folderId: targetId } : n))
       return;
    }

    // CASE 2: Dragging Folder (Source) -> Note (Target)
    // User dragged from Folder to Note. Likely implies Folder should be Parent of Note.
    if (sourceFolder && targetNote) {
       setNotes(prev => prev.map(n => n.id === targetId ? { ...n, folderId: sourceId } : n))
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
             setFolders(prev => prev.map(f => f.id === sourceId ? { ...f, parentId: targetId } : f))
          } else {
             // Standard Behavior: Source (Start of line) is PARENT. Target (End of line) is CHILD.
             // Update Target's parentId to be SourceId.
             console.log(`Linking Folder: Parent ${sourceId} -> Child ${targetId}`);
             setFolders(prev => prev.map(f => f.id === targetId ? { ...f, parentId: sourceId } : f))
          }
       }
    }
  }, [notes, folders])



  const handleAddNode = useCallback((type: 'folder' | 'note', parentId: string, position?: { x: number; y: number }, handleId?: string | null) => {
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
            // If the note was already in a folder, the new folder becomes a sibling in that folder (optional behavior), 
            // OR we just move the note to the NEW folder. 
            // The user said: "creating a new folder that the note is inside" -> Implies moving the note.
            
            setFolders(prev => [...prev, newFolder])
            setNotes(prev => prev.map(n => n.id === sourceNote.id ? { ...n, folderId: newFolder.id } : n))
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
            // Move source folder to be a child of the new folder
            setFolders(prev => [
                ...prev.map(f => f.id === sourceFolder.id ? { ...f, parentId: newFolder.id } : f),
                newFolder
            ])
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
            setNotes(prev => [...prev, newNote])
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
        setNotes(prev => [...prev, newNote])
        setActiveNoteId(newNote.id)
    } else {
        const newFolder: FolderItem = {
            id: uuidv4(),
            name: "New Folder",
            collapsed: false,
            color: ACCENT_COLORS[Math.floor(Math.random() * ACCENT_COLORS.length)],
            parentId: targetFolderId, // Add as child of source folder
            position,
        }
        setFolders(prev => [...prev, newFolder])
    }
  }, [folders, notes])

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

  // Recursive folder renderer
  const renderFolder = (folder: FolderItem) => {
    const childFolders = folders.filter((f) => f.parentId === folder.id)
    const folderNotes = notesInFolder(folder.id)

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
              defaultValue={folder.name}
              onBlur={(e) => {
                setFolders((prev) =>
                  prev.map((f) =>
                    f.id === folder.id
                      ? { ...f, name: e.target.value || "Untitled" }
                      : f,
                  ),
                )
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
            {folderNotes.length + childFolders.length}
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
            
            {folderNotes.length === 0 && childFolders.length === 0 && (
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

  return (
    <div className="flex flex-1 w-full bg-[#0c1220] text-slate-100 overflow-hidden">
      {/* Sidebar */}
      <div
        ref={sidebarRef}
        style={{ width: sidebarCollapsed ? 0 : sidebarWidth }}
        className={`flex-shrink-0 flex flex-col h-full border-r border-white/[0.08] bg-gradient-to-b from-slate-800/60 via-slate-900/60 to-slate-800/60 backdrop-blur-xl relative ${
          sidebarCollapsed ? "overflow-hidden border-r-0" : ""
        } ${isResizing ? "" : "transition-all duration-300"}`}
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
                onClick={() => addFolder(null)}
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
              <span className="text-[11px] text-slate-600 ml-4 flex-shrink-0">
                {new Date(activeNote.updatedAt).toLocaleString([], {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>

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
            <div className="flex-1 overflow-y-auto bg-[#0c1220] scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent" onClick={() => editorRef.current?.focus()}>
              <div className="w-full min-h-full px-12 py-8">
                <div
                  ref={editorRef}
                  contentEditable
                  suppressContentEditableWarning
                  onInput={handleEditorInput}
                  className="min-h-full outline-none text-[15px] leading-relaxed text-slate-200 caret-blue-400
                    [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:text-white [&_h1]:mb-3 [&_h1]:mt-6
                    [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-white [&_h2]:mb-2 [&_h2]:mt-5
                    [&_blockquote]:border-l-2 [&_blockquote]:border-blue-500/40 [&_blockquote]:pl-4 [&_blockquote]:text-slate-400 [&_blockquote]:italic [&_blockquote]:my-3
                    [&_pre]:bg-white/[0.04] [&_pre]:border [&_pre]:border-white/[0.06] [&_pre]:rounded-lg [&_pre]:px-4 [&_pre]:py-3 [&_pre]:my-3 [&_pre]:font-mono [&_pre]:text-sm [&_pre]:text-slate-300
                    [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-2
                    [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-2
                    [&_li]:my-1
                    [&_a]:text-blue-400 [&_a]:underline
                    empty:before:content-[attr(data-placeholder)] empty:before:text-slate-600"
                  data-placeholder="Start writing..."
                />
              </div>
            </div>

            {/* Footer / Status Bar - Character Count */}
            <div className="flex-shrink-0 flex items-center justify-between px-6 h-12 border-t border-white/[0.06] text-xs text-slate-500 select-none bg-gradient-to-r from-slate-800/40 via-slate-900/40 to-slate-800/40 backdrop-blur-xl">
               <div>{/* Left side usually file path or breadcrumbs, keeping empty for now */}</div>
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
              onNoteClick={(id) => setActiveNoteId(id)}
              onFolderClick={(id) => toggleFolder(id)}
              onConnectNode={(source, target, sourceHandle, targetHandle) => handleConnectNode(source, target, sourceHandle, targetHandle)}
              onAddNode={(type, sourceId, position, handleId) => handleAddNode(type, sourceId, position, handleId)}
              onCreateFirstNote={() => addNote(null)}
              onAddRootFolder={(position) => addFolder(null, position)}
              onAddRootNote={(position) => addNote(null, position)}
              onDeleteNode={(id, type, label) => {
                 if (type === 'folder') deleteFolder(id, label);
                 if (type === 'note') deleteNote(id, label);
              }}
              onRenameNode={(id, type, newName) => {
                 if (type === 'folder') {
                    setFolders(prev => prev.map(f => f.id === id ? { ...f, name: newName } : f));
                 }
                 if (type === 'note') {
                    setNotes(prev => prev.map(n => n.id === id ? { ...n, title: newName, updatedAt: Date.now() } : n));
                 }
              }}
              onPositionChange={(id, position, type) => {
                  if (type === 'folder') {
                      setFolders(prev => prev.map(f => f.id === id ? { ...f, position } : f));
                  }
                  if (type === 'note') {
                      setNotes(prev => prev.map(n => n.id === id ? { ...n, position } : n));
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
    </div>
  )
}

// Inject keyframe animation
if (typeof document !== 'undefined' && !document.getElementById('notes-menu-anim')) {
  const style = document.createElement('style')
  style.id = 'notes-menu-anim'
  style.textContent = `
    @keyframes fadeInScale {
      from { opacity: 0; transform: scale(0.95) translateY(-4px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }
  `
  document.head.appendChild(style)
}

export default Notes
