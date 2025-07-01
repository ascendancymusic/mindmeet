import type React from "react"
import { useState, useCallback, useEffect, useRef, useLayoutEffect, useMemo } from "react"
import { useNavigate, useParams } from "react-router-dom"
import ReactFlow,
{
  addEdge,
  Background,
  Controls,
  applyNodeChanges,
  applyEdgeChanges,
  type ReactFlowInstance,
  type NodeChange,
  type EdgeChange,
  type Connection,
  type Edge,
  type Node
} from "reactflow"
import "reactflow/dist/style.css"
import {
  Trash2,
  Unlink,
  Music,
  Save,
  ArrowLeft,
  ImageIcon,
  Maximize2,
  AlertCircle,
  Palette,
  Check,
  X,
  Network,
  ChevronDown,
  Loader,
  HelpCircle,
  AudioWaveform,
  ListMusic,
  Plus
} from "lucide-react"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { NodeTypesMenu } from "../components/NodeTypesMenu"
import { SpotifyNode } from "../components/SpotifyNode"
import { SoundCloudNode } from "../components/SoundCloudNode"
import { SpotifySearch } from "../components/SpotifySearch"
import { SocialMediaNode } from "../components/SocialMediaNode"
import { YouTubeNode } from "../components/YouTubeNode"
import { YouTubeSearch } from "../components/YouTubeSearch"
import { ImageNode } from "../components/ImageNode"
import { AudioNode } from "../components/AudioNode"
import { PlaylistNode } from "../components/PlaylistNode"
import { useMindMapStore } from "../store/mindMapStore"
import type { SpotifyTrack } from "../services/spotifySearch"
import { ProPopup } from "../components/ProPopup"
import { HexColorPicker } from "react-colorful"
import { LinkNode } from "../components/LinkNode"
import { MindMapNode } from "../components/MindMapNode"
import { ConditionalLoginPrompt } from "../components/LoginPrompt";
import { useAuthStore } from "../store/authStore";
import defaultNodeStyles from "../config/defaultNodeStyles";
import { supabase } from "../supabaseClient";
import { MindMapHelpModal } from "../components/MindMapHelpModal";
import SelectionToolbarWrapper from "../components/SelectionToolbarWrapper";
import leftClickIcon from "../assets/click/leftclick.svg";
import rightClickIcon from "../assets/click/rightclick.svg";

interface HistoryAction {
  type: "add_node" | "move_node" | "connect_nodes" | "disconnect_nodes" | "delete_node" | "update_node" | "update_title" | "resize_node"
  data: {
    nodes?: Node[]
    edges?: Edge[]
    nodeId?: string
    position?: { x: number; y: number } | Record<string, { x: number; y: number }>
    connection?: Connection
    label?: string
    width?: number
    height?: number

    videoUrl?: string
    spotifyUrl?: string
    displayText?: string
    color?: string
    affectedNodes?: string[]
  }
  previousState?: {
    nodes: Node[]
    edges: Edge[]
    title?: string
  }
}

export interface YouTubeVideo {
  id: string
  title: string
  url: string
}

export default function MindMap() {
  const { username, id } = useParams()
  const navigate = useNavigate()
  const { maps, updateMap, setMaps } = useMindMapStore()
  const currentMap = maps.find((map) => map.id === id)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const audioFileInputRef = useRef<HTMLInputElement>(null)
  const reactFlowWrapperRef = useRef<HTMLDivElement>(null)
  const [nodes, setNodes] = useState<Node[]>(() => currentMap?.nodes || [])
  const [edges, setEdges] = useState<Edge[]>(() => currentMap?.edges || [])
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [visuallySelectedNodeId, setVisuallySelectedNodeId] = useState<string | null>(null)
  const [moveWithChildren, setMoveWithChildren] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [isSmallScreen, setIsSmallScreen] = useState(window.innerWidth < 1080)
  const [mindMapHeight, setMindMapHeight] = useState<number>(0)
  const [showErrorModal, setShowErrorModal] = useState(false)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editedTitle, setEditedTitle] = useState(currentMap?.title || "")
  const [originalTitle, setOriginalTitle] = useState(currentMap?.title || "")
  const titleRef = useRef<HTMLInputElement>(null)
  const [history, setHistory] = useState<HistoryAction[]>([])
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState(-1)
  const [lastSavedHistoryIndex, setLastSavedHistoryIndex] = useState(-1)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStartPosition, setDragStartPosition] = useState<Record<string, { x: number; y: number }> | null>(null)
  const [isMultiDragging, setIsMultiDragging] = useState(false)
  const [multiDragStartPosition, setMultiDragStartPosition] = useState<Record<string, { x: number; y: number }> | null>(null)
  const [showUnsavedChangesModal, setShowUnsavedChangesModal] = useState(false)
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [selectedColor, setSelectedColor] = useState<string>("#1f2937")
  const [previewColor, setPreviewColor] = useState<string | null>(null)
  const colorPickerRef = useRef<HTMLDivElement>(null)
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set())
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const user = useAuthStore((state) => state.user);
  const [showHelpModal, setShowHelpModal] = useState(false);

  // State for playlist song selection mode
  const [isAddingToPlaylist, setIsAddingToPlaylist] = useState(false);
  const [activePlaylistNodeId, setActivePlaylistNodeId] = useState<string | null>(null);
  const [clipboardNodes, setClipboardNodes] = useState<Node[]>([]);
  const [clipboardEdges, setClipboardEdges] = useState<Edge[]>([]);
  const [selectionBounds, setSelectionBounds] = useState<{ x: number, y: number, width: number, height: number } | null>(null);
  const [showPasteToolbox, setShowPasteToolbox] = useState(false);
  const [pasteToolboxPosition, setPasteToolboxPosition] = useState({ x: 0, y: 0 });
  const [isShiftPressed, setIsShiftPressed] = useState(false);
  const [isHoveringPlaylist, setIsHoveringPlaylist] = useState(false);
  const [isHoveringAudioVolume, setIsHoveringAudioVolume] = useState(false);

  // Set up sensors for drag and drop functionality
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useLayoutEffect(() => {
    const handleResize = () => setIsSmallScreen(window.innerWidth < 1080)
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  useEffect(() => {
    const updateHeight = () => {
      if (reactFlowWrapperRef.current) {
        setMindMapHeight(reactFlowWrapperRef.current.clientHeight)
      }
    }

    updateHeight()
    window.addEventListener("resize", updateHeight)
    return () => window.removeEventListener("resize", updateHeight)
  }, [])

    useEffect(() => {
    if (nodes.length > 0 && reactFlowWrapperRef.current) {
      setTimeout(() => {
        setMindMapHeight(reactFlowWrapperRef.current?.clientHeight || 0)
      }, 100)
    }
  }, [nodes.length])

  // Fetches mindmap data from Supabase database
  // Retrieves the complete mindmap structure including nodes, edges, and metadata
  // Handles authentication, error states, and data processing
  const fetchMindMapFromSupabase = useCallback(async () => {
    if (!username || !id || !isLoggedIn) return;

    setIsLoading(true);
    setLoadError(null);

    try {

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", username)
        .single();

      if (profileError || !profile) {
        setLoadError("Could not find the user profile.");
        setIsLoading(false);
        return;
      }


      const { data: map, error: mapError } = await supabase
        .from("mindmaps")
        .select("key, id, title, json_data, likes, liked_by, updated_at, visibility, description, creator, created_at, comment_count, saves, is_pinned")
        .eq("id", id)
        .eq("creator", profile.id)
        .single();

      if (mapError || !map) {
        setLoadError("Could not find the requested mind map.");
        setIsLoading(false);
        return;
      }


      const { data: { user } } = await supabase.auth.getUser();

      if (user?.id !== map.creator) {
        // Redirect to view-only mode if user is not the creator
        navigate(`/${username}/${id}`);
        return;
      }


      const processedMap = {
        id: map.id,
        title: map.title,
        nodes: map.json_data?.nodes.map((node: { type: keyof typeof defaultNodeStyles; [key: string]: any }) => {

          if (node.type === 'image') {
            // Extract width and height from node properties or style
            // Handle different formats (string with px, number, etc.)
            const width = node.width || (node.style?.width ?
              (typeof node.style.width === 'string' && node.style.width.endsWith('px') ?
                parseInt(node.style.width) : node.style.width) : undefined);

            const height = node.height || (node.style?.height ?
              (typeof node.style.height === 'string' && node.style.height.endsWith('px') ?
                parseInt(node.style.height) : node.style.height) : undefined);

            return {
              ...node,
              background: node.background || node.style?.background || defaultNodeStyles[node.type]?.background,
              style: {
                ...defaultNodeStyles[node.type],
                ...node.style,
                background: node.background || node.style?.background || defaultNodeStyles[node.type]?.background,
                width: typeof width === 'number' ? `${width}px` : width,
                height: typeof height === 'number' ? `${height}px` : height
              },
              width: typeof width === 'number' ? width : undefined,
              height: typeof height === 'number' ? height : undefined,
              data: {
                ...node,
                label: node.data.label || "Image",
              }
            };
          }

          return {
            ...node,
            background: node.background || node.style?.background || defaultNodeStyles[node.type]?.background,
            style: {
              ...defaultNodeStyles[node.type],
              ...node.style,
              background: node.background || node.style?.background || defaultNodeStyles[node.type]?.background,
              width: ["link", "mindmap"].includes(node.type)
                ? "auto"
                : node.style?.width || (defaultNodeStyles[node.type] as any)?.width || "auto",
            },
          };
        }) || [],
        edges: map.json_data?.edges || [],
        createdAt: new Date(map.created_at).getTime(),
        updatedAt: new Date(map.updated_at).getTime(),
        likes: map.likes || 0,
        comments: map.comment_count || 0,
        saves: map.saves || 0,
        likedBy: map.liked_by || [],
        isPinned: map.is_pinned || false,
        visibility: map.visibility || 'private',
        description: map.description || '',
        creator: map.creator,
      };


      const existingMapIndex = maps.findIndex(m => m.id === id);
      if (existingMapIndex >= 0) {
        // Update existing map in the store
        const updatedMaps = [...maps];
        updatedMaps[existingMapIndex] = processedMap;
        setMaps(updatedMaps);
      } else {
        // Add new map to the store
        setMaps([...maps, processedMap]);
      }


      setNodes(processedMap.nodes);
      setEdges(processedMap.edges);
      setEditedTitle(processedMap.title);
      setOriginalTitle(processedMap.title);
      setIsInitialLoad(true);
      setHistory([]);
      setCurrentHistoryIndex(-1);
      setLastSavedHistoryIndex(-1);
      setHasUnsavedChanges(false);

      if (reactFlowInstance) {
        setTimeout(() => {
          reactFlowInstance.setViewport({ x: 0, y: 0, zoom: 1 });
          reactFlowInstance.fitView({ padding: 0.2 });
        }, 50);
      }
    } catch (error) {
      setLoadError("An unexpected error occurred while loading the mind map.");
    } finally {
      setIsLoading(false);
    }
  }, [username, id, isLoggedIn, maps, setMaps, reactFlowInstance]);

  // Initializes mindmap data when component mounts or URL parameters change
  // Uses cached data from store when available or fetches from database
  // Resets view, history state, and unsaved changes tracking
  useEffect(() => {

    if (currentMap) {
      setNodes(currentMap.nodes);
      setEdges(currentMap.edges);
      setEditedTitle(currentMap.title);
      setOriginalTitle(currentMap.title);
      setIsInitialLoad(true);
      setHistory([]);
      setCurrentHistoryIndex(-1);
      setLastSavedHistoryIndex(-1);
      setHasUnsavedChanges(false);

      if (reactFlowInstance) {
        setTimeout(() => {
          reactFlowInstance.setViewport({ x: 0, y: 0, zoom: 1 });
          reactFlowInstance.fitView({ padding: 0.2 });
        }, 50);
      }
    } else {

      fetchMindMapFromSupabase();
    }
  }, [currentMap, navigate, reactFlowInstance, fetchMindMapFromSupabase])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (colorPickerRef.current && !colorPickerRef.current.contains(event.target as Element)) {
        setShowColorPicker(false)
        setPreviewColor(null)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  useEffect(() => {
    const handleMouseBackButton = (event: MouseEvent) => {
      if (event.button === 3 && hasUnsavedChanges) {
        event.preventDefault()
        setShowUnsavedChangesModal(true)
      }
    }

    window.addEventListener("mouseup", handleMouseBackButton)
    return () => {
      window.removeEventListener("mouseup", handleMouseBackButton)
    }
  }, [hasUnsavedChanges])

  const getNodeDescendants = useCallback(
    (nodeId: string): string[] => {
      const descendants: string[] = []
      const visited = new Set<string>()

      const traverse = (currentId: string) => {
        if (visited.has(currentId)) return
        visited.add(currentId)

        const childEdges = edges.filter((edge) => edge.source === currentId)
        childEdges.forEach((edge) => {
          descendants.push(edge.target)
          traverse(edge.target)
        })
      }

      traverse(nodeId)
      return descendants
    },
    [edges],
  )

  const toggleNodeCollapse = useCallback((nodeId: string, event: React.MouseEvent) => {
    event.stopPropagation()
    setCollapsedNodes((prev) => {
      const newCollapsed = new Set(prev)
      if (newCollapsed.has(nodeId)) {
        newCollapsed.delete(nodeId)
      } else {
        newCollapsed.add(nodeId)
      }
      return newCollapsed
    })
  }, [])

  // Helper function to create a history action with proper structure
  const createHistoryAction = useCallback(
    (
      type: HistoryAction['type'],
      actionData: Partial<HistoryAction['data']>,
      previousNodes: Node[] = nodes,
      previousEdges: Edge[] = edges
    ): HistoryAction => {
      return {
        type,
        data: actionData,
        previousState: {
          nodes: previousNodes,
          edges: previousEdges,
        },
      };
    },
    [nodes, edges]
  );

  const addToHistory = useCallback(
    (action: HistoryAction) => {
      // Validate action structure before adding to history
      if (!action || !action.data) {
        return;
      }

      if (!action.previousState || !action.previousState.nodes) {
        return;
      }

      setHistory((prev) => {
        const newHistory = prev.slice(0, currentHistoryIndex + 1);
        return [...newHistory, action];
      });

      const newHistoryIndex = currentHistoryIndex + 1;
      setCurrentHistoryIndex(newHistoryIndex);

      setCanUndo(newHistoryIndex > lastSavedHistoryIndex);
      setCanRedo(false);
    },
    [currentHistoryIndex, lastSavedHistoryIndex],
  )

  const onNodeDragStart = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      setIsDragging(true)
      const descendants = moveWithChildren ? getNodeDescendants(node.id) : []
      const initialPositions = new Map()
      initialPositions.set(node.id, node.position)

      if (moveWithChildren) {
        descendants.forEach((descendantId) => {
          const descendantNode = nodes.find((n) => n.id === descendantId)
          if (descendantNode) {
            initialPositions.set(descendantId, descendantNode.position)
          }
        })
      }

      setDragStartPosition(Object.fromEntries(initialPositions))
    },
    [nodes, moveWithChildren, getNodeDescendants],
  )

  const onNodeDragStop = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (isDragging && dragStartPosition) {
        const descendants = moveWithChildren ? getNodeDescendants(node.id) : []
        const finalPositions = new Map()
        finalPositions.set(node.id, node.position)

        if (moveWithChildren) {
          descendants.forEach((descendantId) => {
            const descendantNode = nodes.find((n) => n.id === descendantId)
            if (descendantNode) {
              finalPositions.set(descendantId, descendantNode.position)
            }
          })
        }

        const hasPositionChanged = Array.from(finalPositions.entries()).some(([id, pos]) => {
          const initialPos = dragStartPosition[id]
          // Apply threshold of 1px to prevent recording insignificant movements
          return initialPos && (
            Math.abs(initialPos.x - pos.x) >= 1 ||
            Math.abs(initialPos.y - pos.y) >= 1
          )
        })

        if (hasPositionChanged) {
          // First, update the nodes to their final positions
          setNodes((nds) => {
            // Create a new array with updated positions
            return nds.map(n => {
              if (finalPositions.has(n.id)) {
                return {
                  ...n,
                  position: finalPositions.get(n.id) || n.position
                };
              }
              return n;
            });
          });

          // Force edge re-rendering to ensure proper connection visualization
          // This addresses ReactFlow edge rendering inconsistencies after node position changes
          setTimeout(() => {
            setEdges(currentEdges => [...currentEdges]);
          }, 0);

          // Create history action for node movement
          const action = createHistoryAction(
            "move_node",
            {
              nodeId: node.id,
              position: Object.fromEntries(finalPositions),
            },
            nodes.map((n) => {
              if (dragStartPosition[n.id]) {
                return { ...n, position: dragStartPosition[n.id] }
              }
              return n
            })
          );
          addToHistory(action)

          // Mark document as modified only for meaningful position changes
          if (!isInitialLoad) {
            setHasUnsavedChanges(true);
          }
        }
      }
      setIsDragging(false)
      setDragStartPosition(null)
    },
    [isDragging, dragStartPosition, nodes, edges, addToHistory, moveWithChildren, getNodeDescendants],
  )

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const positionChanges = changes.filter((change) => change.type === "position")
      const draggingChanges = positionChanges.filter((change) => (change as any).dragging)
      const selectionChanges = changes.filter((change) => change.type === "select")

      // Handle selection changes
      if (positionChanges.length === 0 && selectionChanges.length > 0) {
        // Apply the selection changes to the nodes
        setNodes((nds) => {
          const updatedNodes = applyNodeChanges(changes, nds);
          return updatedNodes;
        });

        // Update our custom selection state based on the selection changes
        const selectedNodes = selectionChanges.filter(change => change.type === 'select' && change.selected);
        const deselectedNodes = selectionChanges.filter(change => change.type === 'select' && !change.selected);

        // Maintain separate selection tracking systems:
        // - selectedNodeId: Tracks the node for property editing (updated by both direct clicks and selection box)
        // - visuallySelectedNodeId: Controls visual highlighting (only updated by direct clicks)
        // This separation allows multi-select functionality without disrupting the UI
        if (selectedNodes.length === 1 && deselectedNodes.length === 0) {
          const nodeId = selectedNodes[0].id;
          setSelectedNodeId(nodeId);

          // Update color picker
          const selectedNode = nodes.find((node) => node.id === nodeId);
          if (selectedNode) {
            setSelectedColor(String((selectedNode as any).background || selectedNode.style?.background || "#1f2937"));
          }
        }
        // If all nodes are being deselected, clear our selection
        else if (deselectedNodes.length > 0 && selectedNodes.length === 0) {
          setSelectedNodeId(null);
          setVisuallySelectedNodeId(null);
        }
        // If multiple nodes are being selected (via selection box or shift+click)
        else if (selectedNodes.length > 1) {
          // For multi-selection, maintain property panel state without visual highlighting
          // Preserves clean UI during multi-node operations
          setSelectedNodeId(null);
          setVisuallySelectedNodeId(null);
        }

        return;
      }

      // Handle position changes
      if (positionChanges.length > 0) {
        // Get all selected nodes before applying changes
        const selectedNodeIds = nodes
          .filter(node => node.selected)
          .map(node => node.id);

        // Check if this is a multi-selection drag
        const isMultiSelectionDrag = selectedNodeIds.length > 1;

        // Check if this is a drag start (first position change with dragging=true)
        const isMultiDragStart = draggingChanges.length > 0 && !isMultiDragging && isMultiSelectionDrag;

        // Check if this is a drag stop (position change with dragging=false after a drag)
        const isMultiDragStop = draggingChanges.length === 0 && isMultiDragging && isMultiSelectionDrag;

        // On multi-selection drag start, store initial positions
        if (isMultiDragStart) {
          setIsMultiDragging(true);

          // Store initial positions for all selected nodes
          const initialPositions: Record<string, { x: number; y: number }> = {};
          nodes.forEach(node => {
            if (selectedNodeIds.includes(node.id)) {
              initialPositions[node.id] = { ...node.position };
            }
          });

          setMultiDragStartPosition(initialPositions);
        }

        // Apply changes to nodes
        if (moveWithChildren && !isMultiSelectionDrag) {
          // This is a single node with children being moved
          const updatedChanges = positionChanges.flatMap((change) => {

            const posChange = change as { id: string; position: { x: number; y: number }; dragging?: boolean }
            const nodeId = posChange.id
            const descendants = getNodeDescendants(nodeId)
            const node = nodes.find((n) => n.id === nodeId)

            if (!node) return [change];

            const deltaX = posChange.position?.x - node.position.x
            const deltaY = posChange.position?.y - node.position.y

            // Only create changes for descendants if there's actual movement
            if (Math.abs(deltaX) < 0.1 && Math.abs(deltaY) < 0.1) {
              return [change];
            }

            return [
              change,
              ...descendants
                .map((descendantId) => {
                  const descendantNode = nodes.find((n) => n.id === descendantId)
                  return descendantNode
                    ? {
                        type: "position" as const,
                        id: descendantId,
                        position: {
                          x: descendantNode.position.x + deltaX,
                          y: descendantNode.position.y + deltaY,
                        },
                        // Synchronize dragging state with parent to maintain consistent visual feedback
                        dragging: posChange.dragging,
                      }
                    : null
                })
                .filter(Boolean),
            ]
          })


          setNodes((nds) => {
            // Apply the changes to get the updated nodes
            const updatedNodes = applyNodeChanges([...updatedChanges, ...selectionChanges] as NodeChange[], nds);

            // If this is a drag stop (dragging=false), force an edge update
            const isDragStop = updatedChanges.some(change =>
              (change as any).type === 'position' && !(change as any).dragging
            );

            if (isDragStop) {
              // Defer edge update to next event loop to ensure correct rendering after position changes
              setTimeout(() => {
                setEdges(currentEdges => [...currentEdges]);
              }, 0);
            }

            // Return the updated nodes
            return updatedNodes;
          });
        } else {
          // This is either a multi-selection drag or a single node without children
          setNodes((nds) => {
            const updatedNodes = applyNodeChanges(changes, nds);
            return updatedNodes;
          });
        }

        // On multi-selection drag stop, record the history action
        if (isMultiDragStop && multiDragStartPosition) {

          // Get final positions after changes
          const finalPositions: Record<string, { x: number; y: number }> = {};
          nodes.forEach(node => {
            if (selectedNodeIds.includes(node.id)) {
              finalPositions[node.id] = { ...node.position };
            }
          });

          // Check if positions actually changed by at least 1 pixel
          const hasPositionChanged = Object.keys(finalPositions).some(id => {
            const initialPos = multiDragStartPosition[id];
            const finalPos = finalPositions[id];
            return initialPos && finalPos && (
              Math.abs(initialPos.x - finalPos.x) >= 1 ||
              Math.abs(initialPos.y - finalPos.y) >= 1
            );
          });

          if (hasPositionChanged) {
            // Create history action for multi-node movement
            const action = createHistoryAction(
              "move_node",
              {
                nodeId: selectedNodeIds[0], // Use the first selected node as the primary node
                position: finalPositions,
              },
              nodes.map(n => {
                if (multiDragStartPosition[n.id]) {
                  return { ...n, position: multiDragStartPosition[n.id] };
                }
                return n;
              })
            );
            addToHistory(action);

            // Only set hasUnsavedChanges when there's an actual position change
            if (!isInitialLoad) {
              setHasUnsavedChanges(true);
            }
          }

          // Reset multi-drag state
          setIsMultiDragging(false);
          setMultiDragStartPosition(null);
        }

        // Only set hasUnsavedChanges if there's an actual position change (not just a selection)
        // We'll handle this in onNodeDragStop and for multi-selection in the isMultiDragStop section
        if (!isInitialLoad && !isDragging && !isMultiDragging) {
          // Check if any position change has dragging=false AND we're not in a controlled drag state
          const hasNonDraggingPositionChanges = positionChanges.some(change => !(change as any).dragging);
          const shouldMarkUnsaved = hasNonDraggingPositionChanges && !isDragging && !isMultiDragging && !isMultiDragStop;

          if (shouldMarkUnsaved) {
            setHasUnsavedChanges(true);
          }
        }
      } else {
        setNodes((nds) => applyNodeChanges(changes, nds));
      }

      setIsInitialLoad(false);
    },
    [nodes, moveWithChildren, isInitialLoad, getNodeDescendants, isMultiDragging, multiDragStartPosition, edges, addToHistory, isDragging],
  )

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      // Filter for structural changes (add/remove) and ignore cosmetic changes like selections
      const significantChanges = changes.filter(change =>
        change.type === 'remove'
      )

      setEdges((eds) => applyEdgeChanges(changes, eds))

      // Track document modifications only for meaningful structural changes
      if (significantChanges.length > 0 && !isInitialLoad) {
        setHasUnsavedChanges(true)
      }
      
      setIsInitialLoad(false)
    },
    [isInitialLoad],
  )

  const onConnect = useCallback(
    (params: Connection) => {
      // Prevent self-referential connections which would create invalid graph structures
      if (params.source === params.target) {
        return;
      }

      setEdges((eds) => {
        const newEdges = addEdge(params, eds)
        // Create history action for connecting nodes
        const action = createHistoryAction(
          "connect_nodes",
          { connection: params },
          nodes,
          eds
        )
        addToHistory(action)
        return newEdges
      })

      if (!isInitialLoad) {
        setHasUnsavedChanges(true)
      }
      
      setIsInitialLoad(false)
    },
    [nodes, isInitialLoad, addToHistory],
  )

  const onDragStart = () => {
    // Function required for NodeTypesMenu drag interface
  }

  const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = "move"
  }, [])

  // Node types with auto width are defined in defaultNodeStyles.ts

  // Define social media node types for consistent handling
  const SOCIAL_MEDIA_NODE_TYPES = ["instagram", "twitter", "facebook", "youtube", "tiktok"];

  // Define default placeholder texts for different node types
  const DEFAULT_NODE_LABELS: Record<string, string> = {
    "default": "",
    "spotify": "Select a song...",
    "soundcloud": "Enter SoundCloud URL...",
    "youtube-video": "Search for a video...",
    "image": "Click to add image",
    "link": "Link",
    "audio": "Audio",
    "playlist": "Playlist"
  };

  const getInitialNodeData = (nodeType: string) => {
    // Common properties shared across all node types
    const baseData = {
      spotifyUrl: nodeType === "spotify" ? "" : undefined,
      soundCloudUrl: nodeType === "soundcloud" ? "" : undefined,
      videoUrl: nodeType === "youtube-video" ? "" : undefined,
      url: nodeType === "link" ? "" : undefined,
      file: undefined,
      type: nodeType,
    }

    // Social media nodes use username field instead of label for consistent data structure
    if (SOCIAL_MEDIA_NODE_TYPES.includes(nodeType)) {
      return {
        ...baseData,
        username: "" // Empty username for social media nodes
      }
    }

    // Standard nodes use label property with type-specific default placeholder text
    return {
      ...baseData,
      label: DEFAULT_NODE_LABELS[nodeType] || "",
    }
  }

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault()

      if (!reactFlowInstance) return

      const imageFile = event.dataTransfer.files?.[0]
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })

      if (imageFile?.type.startsWith("image/")) {
        const newNode = {
          id: Date.now().toString(),
          type: "image",
          position,
          // Omit initial dimensions to enable automatic sizing based on image aspect ratio
          data: {
            label: "Image",
            file: imageFile,
            type: "image",
          },
          style: defaultNodeStyles["image"],
        }

        setNodes((nds) => {
          const updatedNodes = [...nds, newNode as Node]
          if (updatedNodes.filter((node) => node.type === "image").length > 10) {
            setShowErrorModal(true)
            return nds
          }
          setShowErrorModal(false)

          // Create history action for adding image node
          const action = createHistoryAction(
            "add_node",
            { nodes: updatedNodes },
            nds
          )
          addToHistory(action)

          return updatedNodes
        })
        setSelectedNodeId(newNode.id)
        setVisuallySelectedNodeId(newNode.id)
        if (!isInitialLoad) setHasUnsavedChanges(true)
        setIsInitialLoad(false)
        return
      }

      const nodeType = event.dataTransfer.getData("application/reactflow-type")
      if (!nodeType) return

      const newNode = {
        id: Date.now().toString(),
        type: nodeType,
        position,
        data: getInitialNodeData(nodeType),
        style: defaultNodeStyles[nodeType as keyof typeof defaultNodeStyles] || defaultNodeStyles.default,
      }

      setNodes((nds) => {
        const updatedNodes = [...nds, newNode as Node]
        if (nodeType === "image" && updatedNodes.filter((node) => node.type === "image").length > 10) {
          setShowErrorModal(true)
          return nds
        }
        setShowErrorModal(false)

        // Create history action for adding node
        const action = createHistoryAction(
          "add_node",
          { nodes: updatedNodes },
          nds
        )
        addToHistory(action)

        return updatedNodes
      })
      setSelectedNodeId(newNode.id)
      setVisuallySelectedNodeId(newNode.id)
      if (!isInitialLoad) {
        setHasUnsavedChanges(true)
      }
      setIsInitialLoad(false)
    },
    [reactFlowInstance, isInitialLoad, edges, addToHistory],
  )

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && selectedNodeId) {
      // Reset dimensions when replacing an image to ensure proper sizing
      // This allows the new image to be displayed with its natural aspect ratio
      // rather than being constrained by the previous image's dimensions
      setNodes((nds) =>
        nds.map((node) =>
          node.id === selectedNodeId
            ? {
                ...node,
                // Remove dimension constraints to enable responsive sizing
                width: undefined,
                height: undefined,
                style: {
                  ...node.style,
                  width: undefined,
                  height: undefined
                },
                data: {
                  ...node.data,
                  file,
                  label: "Image",
                  // Preserve original remote URL while prioritizing local file
                  // This enables reverting changes and maintains reference for upload replacement
                  originalImageUrl: node.data.imageUrl,
                  imageUrl: undefined,
                },
              }
            : node,
        ),
      )
      if (!isInitialLoad) {
        setHasUnsavedChanges(true)
      }
      setIsInitialLoad(false)
    }
  }

  const handleAudioFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && selectedNodeId) {
      setNodes((nds) =>
        nds.map((node) =>
          node.id === selectedNodeId
            ? {
                ...node,
                data: {
                  ...node.data,
                  file,
                  // Preserve custom labels but apply default for new or unmodified nodes
                  label: !node.data.label || node.data.label === "Audio" ? "Audio" : node.data.label,
                  // Preserve remote audio reference while prioritizing local file
                  // Enables undo functionality and maintains server-side reference
                  originalAudioUrl: node.data.audioUrl,
                  audioUrl: undefined,
                },
              }
            : node,
        ),
      )
      if (!isInitialLoad) {
        setHasUnsavedChanges(true)
      }
      setIsInitialLoad(false)
    }
  }

  const deleteNodeAndChildren = useCallback(
    (nodeId: string) => {
      if (nodeId === "1") return

      const descendantIds = getNodeDescendants(nodeId)
      const allNodesToDelete = [nodeId, ...descendantIds]

      // Create history action for deleting node and its children
      const action = createHistoryAction(
        "delete_node",
        { nodeId }
      )
      addToHistory(action)

      setNodes((nodes) => nodes.filter((node) => !allNodesToDelete.includes(node.id)))
      setEdges((edges) =>
        edges.filter((edge) => !allNodesToDelete.includes(edge.source) && !allNodesToDelete.includes(edge.target)),
      )

      if (!isInitialLoad) {
        setHasUnsavedChanges(true)
      }
      setIsInitialLoad(false)

      if (selectedNodeId === nodeId) {
        setSelectedNodeId(null)
      }
      if (visuallySelectedNodeId === nodeId) {
        setVisuallySelectedNodeId(null)
      }
    },
    [nodes, edges, selectedNodeId, visuallySelectedNodeId, isInitialLoad, addToHistory, getNodeDescendants],
  )

  // Helper function to format time in MM:SS format
  interface SortableTrackItemProps {
    id: string; // Unique ID for the track instance (trackId-index)
    trackId: string; // The actual audio node ID
    index: number; // The index of this track in the playlist
    label: string;
    duration: number;
    onRemove: (trackId: string, index: number) => void;
  }

  function SortableTrackItem({ id, trackId, index, label, duration, onRemove }: SortableTrackItemProps) {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging
    } = useSortable({ id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
      zIndex: isDragging ? 1 : 0,
    };

    return (
      <div
        ref={setNodeRef}
        {...attributes}
        {...listeners}
        style={style}
        className={`flex items-center p-1 rounded text-xs text-gray-300 hover:bg-gray-800/50 ${isDragging ? 'bg-gray-800/70' : ''} cursor-grab active:cursor-grabbing select-none`}
      >
        <div className="w-5 text-center text-gray-500 mr-1 flex-shrink-0">
          {index + 1}.
        </div>
        <div className="flex-1 truncate">{label || "Audio"}</div>
        <div className="text-gray-500 ml-1 flex-shrink-0">
          {formatTime(duration || 0)}
        </div>
        <button
          className="ml-1 p-1 text-gray-500 hover:text-red-500 rounded-full"
          onClick={(e) => {
            e.stopPropagation(); // Prevent drag when clicking remove button
            onRemove(trackId, index);
          }}
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    );
  }

  // Helper function to add an audio track to a playlist
  const handleAddTrackToPlaylist = useCallback((playlistNodeId: string, audioNode: Node) => {
    setNodes(nds => {
      return nds.map(node => {
        if (node.id === playlistNodeId) {
          // Get existing track IDs or create an empty array
          const trackIds = node.data.trackIds ? [...node.data.trackIds] : [];

          // Always add the track ID, even if it already exists in the playlist
          trackIds.push(audioNode.id);

          return {
            ...node,
            data: {
              ...node.data,
              trackIds
            }
          };
        }
        return node;
      });
    });

    // Exit "add to playlist" mode after adding a track
    setIsAddingToPlaylist(false);
    setActivePlaylistNodeId(null);

    if (!isInitialLoad) {
      setHasUnsavedChanges(true);
    }
    
    setIsInitialLoad(false);
  }, [isInitialLoad]);

  // Toggle "add to playlist" mode
  const toggleAddToPlaylistMode = useCallback((playlistNodeId: string | null) => {
    if (playlistNodeId) {
      setIsAddingToPlaylist(true);
      setActivePlaylistNodeId(playlistNodeId);
    } else {
      setIsAddingToPlaylist(false);
      setActivePlaylistNodeId(null);
    }
  }, []);

  // Helper function to remove a track from a playlist
  const handleRemoveTrackFromPlaylist = useCallback((playlistNodeId: string, _trackId: string, trackIndex: number) => {
    setNodes(nds => {
      return nds.map(node => {
        if (node.id === playlistNodeId && node.data.trackIds) {
          // Create a copy of the trackIds array
          const updatedTrackIds = [...node.data.trackIds];

          // Remove the track at the specific index
          if (trackIndex >= 0 && trackIndex < updatedTrackIds.length) {
            updatedTrackIds.splice(trackIndex, 1);
          }

          return {
            ...node,
            data: {
              ...node.data,
              trackIds: updatedTrackIds
            }
          };
        }
        return node;
      });
    });

    if (!isInitialLoad) {
      setHasUnsavedChanges(true);
    }
    setIsInitialLoad(false);
  }, [isInitialLoad]);

  // Helper function to reorder tracks in a playlist
  const handleReorderPlaylistTracks = useCallback((playlistNodeId: string, oldIndex: number, newIndex: number) => {
    setNodes(nds => {
      return nds.map(node => {
        if (node.id === playlistNodeId && node.data.trackIds) {
          const trackIds = [...node.data.trackIds];
          const [movedItem] = trackIds.splice(oldIndex, 1);
          trackIds.splice(newIndex, 0, movedItem);

          return {
            ...node,
            data: {
              ...node.data,
              trackIds
            }
          };
        }
        return node;
      });
    });

    if (!isInitialLoad) {
      setHasUnsavedChanges(true);
    }
    setIsInitialLoad(false);
  }, [isInitialLoad]);

  // Helper function to handle clipboard operations (copy/cut)
  const handleClipboardOperation = useCallback(
    (operation: 'copy' | 'cut') => {
      // Get all selected nodes
      const selectedNodes = nodes.filter(node => node.selected);
      if (selectedNodes.length === 0) return;

      // Get all edges between selected nodes
      const selectedNodeIds = selectedNodes.map(node => node.id);
      const selectedEdges = edges.filter(
        edge => selectedNodeIds.includes(edge.source) && selectedNodeIds.includes(edge.target)
      );

      // Store in clipboard state
      setClipboardNodes(selectedNodes);
      setClipboardEdges(selectedEdges);

      // Show the paste toolbox
      setShowPasteToolbox(true);

      if (operation === 'cut') {
        // Create history action for cutting nodes
        const action = createHistoryAction(
          "delete_node",
          {
            nodeId: selectedNodeIds[0], // Use the first node ID as reference
            affectedNodes: selectedNodeIds,
          }
        );
        addToHistory(action);

        // Remove the selected nodes
        setNodes(nodes => nodes.filter(node => !selectedNodeIds.includes(node.id)));

        // Remove any edges connected to the selected nodes
        setEdges(edges => edges.filter(
          edge => !selectedNodeIds.includes(edge.source) && !selectedNodeIds.includes(edge.target)
        ));

        // Update state
        if (!isInitialLoad) {
          setHasUnsavedChanges(true);
        }
        setIsInitialLoad(false);

        // Clear selection state
        setSelectedNodeId(null);
        setVisuallySelectedNodeId(null);
      } else {
        // Clear the selection to close the selection box
        setNodes(nds => nds.map(node => ({
          ...node,
          selected: false
        })));

        // Clear selection bounds
        setSelectionBounds(null);
      }
    },
    [nodes, edges, isInitialLoad, addToHistory, createHistoryAction]
  );

  // Copies selected nodes and their interconnecting edges to clipboard
  // Prepares data for paste operations and activates the paste toolbox
  // Clears selection state to provide visual feedback to the user
  const handleCopySelectedNodes = useCallback(() => {
    handleClipboardOperation('copy');
  }, [handleClipboardOperation]);

  // Cuts selected nodes from the mindmap and copies them to clipboard
  // Combines copy and delete operations with proper history tracking
  // Maintains connected edges between copied nodes for paste operations
  const handleCutSelectedNodes = useCallback(() => {
    handleClipboardOperation('cut');
  }, [handleClipboardOperation]);

  // Helper function for delete operations (without clipboard)
  const handleDeleteOperation = useCallback(() => {
    const selectedNodes = nodes.filter(node => node.selected);
    if (selectedNodes.length === 0) return;

    // Get all selected node IDs
    const selectedNodeIds = selectedNodes.map(node => node.id);

    // Create history action for deleting nodes
    const action = createHistoryAction(
      "delete_node",
      {
        nodeId: selectedNodeIds[0], // Use the first node ID as reference
        affectedNodes: selectedNodeIds,
      }
    );
    addToHistory(action);

    // Remove the selected nodes
    setNodes(nodes => nodes.filter(node => !selectedNodeIds.includes(node.id)));

    // Remove any edges connected to the selected nodes
    setEdges(edges => edges.filter(
      edge => !selectedNodeIds.includes(edge.source) && !selectedNodeIds.includes(edge.target)
    ));

    // Update state
    if (!isInitialLoad) {
      setHasUnsavedChanges(true);
    }
    setIsInitialLoad(false);
    setSelectedNodeId(null);
    setVisuallySelectedNodeId(null);

    // Clear selection bounds
    setSelectionBounds(null);
  }, [nodes, edges, isInitialLoad, addToHistory, createHistoryAction]);

  // Permanently removes selected nodes from the mindmap
  // Records deletion in history for undo functionality
  // Cleans up associated edges and selection state
  const handleDeleteSelectedNodes = useCallback(() => {
    handleDeleteOperation();
  }, [handleDeleteOperation]);

  // Creates new nodes and edges from clipboard data at the specified position
  // Handles ID remapping, position calculations, and maintains relative node positions
  // Returns newly created elements ready to be added to the mindmap
  const createPasteAction = (
    clipboardNodes: Node[],

    clipboardEdges: Edge[],
    cursorPosition: { x: number, y: number },
    reactFlowInstance: ReactFlowInstance
  ) => {
    // Create a mapping from old IDs to new IDs
    const idMapping: Record<string, string> = {};

    // Calculate the center position of the clipboard nodes
    let centerX = 0;
    let centerY = 0;

    clipboardNodes.forEach(node => {
      centerX += node.position.x;
      centerY += node.position.y;
    });

    centerX /= clipboardNodes.length;
    centerY /= clipboardNodes.length;

    // Transform screen coordinates to ReactFlow's internal coordinate system
    const mousePos = reactFlowInstance.screenToFlowPosition(cursorPosition);

    // Calculate the offset from the original center to the new paste position
    const offsetX = mousePos.x - centerX;
    const offsetY = mousePos.y - centerY;



    const baseTimestamp = Date.now();

    const newNodes = clipboardNodes.map((node, index) => {
      // Create timestamp-based unique IDs with index offset
      const newId = (baseTimestamp + index).toString();
      idMapping[node.id] = newId;

      // Preserve relative positioning between nodes while centering at cursor
      const newPosition = {
        x: node.position.x + offsetX,
        y: node.position.y + offsetY
      };

      return {
        ...node,
        id: newId,
        position: newPosition,
        selected: true,
      };
    });

    // Create new edges that connect the new nodes
    const newEdges = clipboardEdges.map(edge => {
      // Filter for edges that connect only within the copied selection
      if (idMapping[edge.source] && idMapping[edge.target]) {
        return {
          ...edge,
          id: `${idMapping[edge.source]}-${idMapping[edge.target]}`,
          source: idMapping[edge.source],
          target: idMapping[edge.target]
        };
      }
      return null;
    }).filter(Boolean) as Edge[];

    return { newNodes, newEdges };
  };

  // Calculates bounding box coordinates for multi-selected nodes
  // Used to position the selection toolbar and provide visual feedback
  // Handles edge cases like single node or empty selections
  const updateSelectionBounds = useCallback((selectedNodes: Node[]) => {
    if (selectedNodes.length <= 1) {
      setSelectionBounds(null);
      return;
    }

    // Calculate the bounds of the selection
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    selectedNodes.forEach(node => {
      minX = Math.min(minX, node.position.x);
      minY = Math.min(minY, node.position.y);
      maxX = Math.max(maxX, node.position.x + (node.width || 100));
      maxY = Math.max(maxY, node.position.y + (node.height || 50));
    });

    setSelectionBounds({
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    });
  }, []);

  // Helper function to update nodes with proper history tracking
  const updateNodeData = useCallback(
    (
      nodeId: string,
      updateFn: (node: Node) => Partial<Node>,
      historyData: Partial<HistoryAction['data']>
    ) => {
      const selectedNode = nodes.find((node) => node.id === nodeId);
      if (!selectedNode) return;

      setNodes((nds) =>
        nds.map((node) => (node.id === nodeId ? { ...node, ...updateFn(node) } : node))
      );

      // Create history action for the update
      const action = createHistoryAction("update_node", {
        nodeId,
        ...historyData,
      });

      addToHistory(action);

      if (!isInitialLoad) {
        setHasUnsavedChanges(true);
      }
      
      setIsInitialLoad(false);
    },
    [nodes, isInitialLoad, addToHistory, createHistoryAction]
  );

  const updateNodeLabel = (nodeId: string, newLabel: string) => {
    const selectedNode = nodes.find((node) => node.id === nodeId)
    if (!selectedNode) return

    const labelLimit =
      selectedNode &&
      selectedNode.type &&
      SOCIAL_MEDIA_NODE_TYPES.includes(selectedNode.type)
        ? 25
        : 200
    const truncatedLabel = newLabel.slice(0, labelLimit)

    updateNodeData(
      nodeId,
      (node) => {
        // Clone data to avoid mutation of shared references
        const updatedData = { ...node.data };

        // Handle different data models based on node type
        if (SOCIAL_MEDIA_NODE_TYPES.includes(node.type || '')) {
          updatedData.username = truncatedLabel;
        } else {
          // Standard nodes use the label property for primary content
          updatedData.label = truncatedLabel;

          // Synchronize label with type-specific URL fields for consistency
          if (node.type === "soundcloud") {
            updatedData.soundCloudUrl = truncatedLabel;
          } else if (node.type === "link") {
            updatedData.url = truncatedLabel;
          }
        }

        return {
          data: updatedData,
          style: {
            ...node.style,
            width: node.type === "spotify" || node.type === "soundcloud" ? "auto" : node.style?.width,
            minWidth:
              node.type === "spotify" || node.type === "soundcloud"
                ? updatedData.soundCloudUrl || updatedData.spotifyUrl
                  ? "200px"
                  : "80px"
                : node.style?.minWidth,
            color: truncatedLabel === "" ? "#6B7280" : "#FFFFFF",
          },
        };
      },
      { label: truncatedLabel }
    );
  }

  const handleYouTubeVideoSelect = (nodeId: string, video: YouTubeVideo) => {
    const selectedNode = nodes.find((node) => node.id === nodeId)
    if (!selectedNode) return

    const newLabel = video.title || "Search for a video..."
    const newVideoUrl = video.url

    updateNodeData(
      nodeId,
      (node) => ({
        data: {
          ...node.data,
          label: newLabel,
          videoUrl: newVideoUrl,
        },
      }),
      {
        label: newLabel,
        videoUrl: newVideoUrl,
      }
    );
  }

  const updateNodeDisplayText = (nodeId: string, newDisplayText: string) => {
    const selectedNode = nodes.find((node) => node.id === nodeId)
    if (!selectedNode) return

    updateNodeData(
      nodeId,
      (node) => ({
        data: {
          ...node.data,
          displayText: newDisplayText,
          label: node.data.label,
        },
      }),
      { displayText: newDisplayText }
    );
  }

  const updateNodeMapId = (nodeId: string, mapId: string) => {
    // Retrieve the unique mapKey from the selected map for cross-user compatibility
    const selectedMap = maps.find(map => map.id === mapId);
    const mapKey = selectedMap?.key;

    updateNodeData(
      nodeId,
      (node) => ({
        data: {
          ...node.data,
          mapKey: mapId === "" ? "" : mapKey, // Only save mapKey, not mapId
        },
      }),
      { label: mapId }
    );
  }

  const handleSpotifyTrackSelect = (nodeId: string, track: SpotifyTrack) => {
    const selectedNode = nodes.find((node) => node.id === nodeId)
    if (!selectedNode) return

    const newLabel = `${track.artists[0].name} - ${track.name}`
    const newSpotifyUrl = track.external_urls.spotify

    updateNodeData(
      nodeId,
      (node) => ({
        data: {
          ...node.data,
          label: newLabel,
          spotifyUrl: newSpotifyUrl,
        },
      }),
      {
        label: newLabel,
        spotifyUrl: newSpotifyUrl,
      }
    );
  }

  const selectNode = useCallback(
    (event: React.MouseEvent, nodeId: string) => {
      // Let ReactFlow handle multi-selection with modifier keys
      if (event.shiftKey || event.ctrlKey) {
        return
      }

      // Check if we're in "add to playlist" mode
      if (isAddingToPlaylist && activePlaylistNodeId) {
        const clickedNode = nodes.find((node) => node.id === nodeId);

        // If the clicked node is an audio, spotify, soundcloud, or youtube-video node, add it to the playlist
        if (clickedNode && (
            (clickedNode.type === 'audio' && clickedNode.data.audioUrl) || 
            (clickedNode.type === 'spotify' && clickedNode.data.spotifyUrl) ||
            (clickedNode.type === 'soundcloud' && clickedNode.data.soundCloudUrl) ||
            (clickedNode.type === 'youtube-video' && clickedNode.data.videoUrl)
          )) {
          handleAddTrackToPlaylist(activePlaylistNodeId, clickedNode);
          return;
        }
      }

      // Handle direct node selection while preserving editor state
      setSelectedNodeId(nodeId)
      setVisuallySelectedNodeId(nodeId)
      const selectedNode = nodes.find((node) => node.id === nodeId)
      if (selectedNode) {
        setSelectedColor(String((selectedNode as any).background || selectedNode.style?.background || "#1f2937"))
      }
    },
    [nodes, isAddingToPlaylist, activePlaylistNodeId, handleAddTrackToPlaylist],
  )

  const handleDetachConnections = (nodeId: string) => {
    setEdges((edges) => {
      const updatedEdges = edges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId)
      // Create history action for detaching connections
      const action = createHistoryAction(
        "disconnect_nodes",
        { nodeId },
        nodes,
        edges
      )
      addToHistory(action)
      return updatedEdges
    })
    if (!isInitialLoad) {
      setHasUnsavedChanges(true)
    }
    setIsInitialLoad(false)
  }

  const handleSave = useCallback(() => {
    if (!isLoggedIn) {
      setShowLoginPrompt(true);
      return;
    }

    if (id && editedTitle.trim() !== "") {
      updateMap(id, nodes, edges, editedTitle, user?.id || '')
      setHasUnsavedChanges(false)
      setOriginalTitle(editedTitle)

      setLastSavedHistoryIndex(currentHistoryIndex)
    } else if (id) {
      setEditedTitle(originalTitle)
      setHasUnsavedChanges(false)
    }
    setCanUndo(false)
    setCanRedo(false)
  }, [id, nodes, edges, editedTitle, updateMap, originalTitle, isLoggedIn, user?.id, currentHistoryIndex]);

  const handleTitleChange = (newTitle: string) => {
    const prevTitle = editedTitle
    const truncatedTitle = newTitle.substring(0, 20)
    setEditedTitle(truncatedTitle)

    if (Math.abs(truncatedTitle.length - prevTitle.length) === 1 || truncatedTitle.length === prevTitle.length) {
      // Create history action for title update
      const action = createHistoryAction(
        "update_title",
        { label: truncatedTitle }
      );

      // Add title to previous state
      if (action.previousState) {
        action.previousState.title = prevTitle;
      }

      addToHistory(action)
    }

    if (!isInitialLoad) {
      setHasUnsavedChanges(true)
    }
    setIsInitialLoad(false)
  }

  // Helper function to format SoundCloud URLs into readable text
  const formatSoundCloudUrl = (url?: string, fallbackLabel: string = 'SoundCloud Track'): string => {
    if (!url) return fallbackLabel;
    
    try {
      // Improved regex to remove protocol, www prefix, and domain completely
      let path = url.replace(/^(?:https?:\/\/)?(?:www\.)?soundcloud\.com\//, '');
      
      // Split artist and song parts
      const [artist, ...songParts] = path.split('/');
      const song = songParts.join('-');
      
      if (artist && song) {
        return `${artist} - ${song}`;
      } else if (artist) {
        return artist;
      }
      return fallbackLabel;
    } catch (error) {
      return fallbackLabel;
    }
  };

  // Memoized nodeTypes object to prevent recreation on each render
  const nodeTypes = useMemo(() => ({
    spotify: SpotifyNode,
    soundcloud: SoundCloudNode,
    instagram: (props: any) => <SocialMediaNode {...props} type="instagram" />,
    twitter: (props: any) => <SocialMediaNode {...props} type="twitter" />,
    facebook: (props: any) => <SocialMediaNode {...props} type="facebook" />,
    youtube: (props: any) => <SocialMediaNode {...props} type="youtube" />,
    tiktok: (props: any) => <SocialMediaNode {...props} type="tiktok" />,
    "youtube-video": YouTubeNode,
    image: ImageNode,
    link: LinkNode,
    mindmap: MindMapNode,
    audio: AudioNode,
    playlist: PlaylistNode,
  }), []);

  // Memoized computed values to reduce recalculations
  const canUndo = useMemo(() => currentHistoryIndex >= 0 && currentHistoryIndex > lastSavedHistoryIndex, [currentHistoryIndex, lastSavedHistoryIndex]);
  const canRedo = useMemo(() => currentHistoryIndex < history.length - 1, [currentHistoryIndex, history.length]);
  const selectedNodesCount = useMemo(() => nodes.filter(node => node.selected).length, [nodes]);
  const hasSelectedNodes = useMemo(() => selectedNodesCount > 0, [selectedNodesCount]);

  // Loading screen
  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gray-900">
        <div className="flex flex-col items-center">
          <Loader className="w-12 h-12 text-blue-500 animate-spin mb-4" />
          <p className="text-xl text-white">Loading mind map...</p>
        </div>
      </div>
    );
  }

  // Error screen
  if (loadError) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gray-900">
        <div className="flex flex-col items-center max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
          <p className="text-xl mb-4 text-white">{loadError}</p>
          <button
            onClick={() => navigate("/mindmap")}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Maps
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4">
      <div className="h-[90vh] bg-gray-900 rounded-xl shadow-lg p-6 text-gray-100 w-[95vw] relative">
        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
        <input type="file" ref={audioFileInputRef} onChange={handleAudioFileChange} accept="audio/*" className="hidden" />





        <div className="flex justify-between items-center mb-4">
          <button
            onClick={() => {
              if (hasUnsavedChanges) {
                setShowUnsavedChangesModal(true)
              } else {
                navigate("/mindmap")
              }
            }}
            className="flex items-center text-gray-400 hover:text-white transition"
          >
            {isSmallScreen ? (
              <ArrowLeft className="w-5 h-5" />
            ) : (
              <>
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back to Maps
              </>
            )}
          </button>
          {isEditingTitle ? (
            <input
              type="text"
              ref={titleRef}
              value={editedTitle}
              onChange={(e) => handleTitleChange(e.target.value)}
              onBlur={() => {
                setIsEditingTitle(false)
                if (editedTitle.trim() === "") {
                  setEditedTitle(originalTitle)
                  setHasUnsavedChanges(false)
                }
              }}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                setIsEditingTitle(false)
                if (editedTitle.trim() === "") {
                  setEditedTitle(originalTitle)
                  setHasUnsavedChanges(false)
                }
              }}
              className="text-2xl font-bold text-center bg-transparent border-b border-gray-500 focus:outline-none focus:border-blue-500 text-white inline-block"
              autoFocus
            />
          ) : (
            <h1
              className="text-2xl font-bold text-center cursor-pointer hover:text-blue-400 transition-colors inline-block"
              onClick={() => setIsEditingTitle(true)}
            >
              {editedTitle}
            </h1>
          )}
          <button
            onClick={handleSave}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              hasUnsavedChanges
                ? "bg-green-600 hover:bg-green-700 text-white"
                : "bg-gray-700 text-gray-400 cursor-not-allowed"
            }`}
            disabled={!hasUnsavedChanges}
          >
            <Save className="w-5 h-5" />
            {isSmallScreen ? null : <span>Save Changes</span>}
          </button>
        </div>

        <div className="fixed left-0 z-10" style={{ top: reactFlowWrapperRef.current ? reactFlowWrapperRef.current.getBoundingClientRect().top + 'px' : '120px' }}>
          <NodeTypesMenu
            moveWithChildren={moveWithChildren}
            setMoveWithChildren={setMoveWithChildren}
            onDragStart={onDragStart}
            maxHeight={`${mindMapHeight}px`}
            onUndo={undo}
            onRedo={redo}
            canUndo={canUndo}
            canRedo={canRedo}
          />
        </div>

        {/* Banner for playlist selection mode */}
        {isAddingToPlaylist && (
          <div className="mb-2 px-4 py-2 bg-blue-600/20 border border-blue-500/30 rounded-lg text-sm text-blue-300 flex items-center justify-between">
            <div className="flex items-center">
              <ListMusic className="w-5 h-5 mr-2" />
              <span>Click on any audio, Spotify, SoundCloud, or YouTube video node to add it to the playlist</span>
            </div>
            <button
              onClick={() => toggleAddToPlaylistMode(null)}
              className="px-3 py-1 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors text-xs"
            >
              Cancel
            </button>
          </div>
        )}

        <div
          ref={reactFlowWrapperRef}
          className={`h-[calc(100%-2rem)] w-full border border-gray-700 rounded-lg overflow-hidden relative ${isShiftPressed ? 'no-text-select' : ''}`}
        >
          <ReactFlow
            nodes={nodes.map((node) => {
              // Check if this node has children
              const hasChildren = edges.some((edge) => edge.source === node.id);
              // Get descendants (not used directly but keeping for future use)
              getNodeDescendants(node.id);
              // Check if this node should be hidden (if its parent is collapsed)
              const isHidden = (() => {
                const findAncestors = (nodeId: string, visited: Set<string> = new Set()): string[] => {
                  // If we've already visited this node, return empty array to prevent infinite recursion
                  if (visited.has(nodeId)) return [];

                  // Mark this node as visited
                  visited.add(nodeId);

                  const parentEdges = edges.filter((edge) => edge.target === nodeId);
                  if (parentEdges.length === 0) return [];

                  const parents = parentEdges.map((edge) => edge.source);

                  // Pass the visited set to recursive calls to track all visited nodes
                  const grandparents = parents.flatMap(parentId => findAncestors(parentId, visited));

                  return [...parents, ...grandparents];
                };

                const ancestors = findAncestors(node.id, new Set<string>());
                return ancestors.some((ancestorId) => collapsedNodes.has(ancestorId));
              })();

              // Ensure node has proper data structure with fallbacks
              const nodeData = node.data || {};
              const nodeLabel = nodeData.label || "";

              // Create the node label with chevron if it has children
              const displayLabel = hasChildren ? (
                <div className="flex items-center justify-between w-full">
                  <div
                    className="break-words overflow-hidden"
                    style={{ wordBreak: "break-word", maxWidth: "calc(100% - 30px)" }}
                  >
                    {node.type === "default" && nodeLabel === "" ? <span className="text-gray-400">Text...</span> : nodeLabel}
                  </div>
                  <button
                    className="ml-2 p-1 rounded-full hover:bg-gray-700 transition-colors flex-shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleNodeCollapse(node.id, e);
                    }}
                    title={collapsedNodes.has(node.id) ? "Expand" : "Collapse"}
                    key={node.id}
                  >
                    <ChevronDown
                      className={`w-4 h-4 text-gray-300 transition-transform ${
                        collapsedNodes.has(node.id) ? "" : "transform rotate-180"
                      }`}
                    />
                  </button>
                </div>
              ) : node.type === "default" && nodeLabel === "" ? (
                <span className="text-gray-400">Text...</span>
              ) : (
                nodeLabel
              );

              // Merge default styles with node-specific styles
              const nodeTypeStyle = defaultNodeStyles[node.type as keyof typeof defaultNodeStyles] || defaultNodeStyles.default;

              // Create a properly typed node object with all required properties
              return {
                ...node,
                hidden: isHidden,
                // Keep ReactFlow's selection state separate from our visual selection
                selected: node.selected,
                data: {
                  ...nodeData,
                  label: displayLabel,
                },
                style: {
                  ...nodeTypeStyle,
                  ...node.style, // Override defaults with existing style if present
                  width: node.type === "image" ?
                    (typeof node.width === 'number' ? `${node.width}px` :
                     typeof node.style?.width === 'number' ? `${node.style.width}px` :
                     typeof node.style?.width === 'string' ? node.style.width :
                     "100px") :
                    nodeTypeStyle.width, // Ensure resizing works for ImageNode
                  height: node.type === "image" ?
                    (typeof node.height === 'number' ? `${node.height}px` :
                     typeof node.style?.height === 'number' ? `${node.style.height}px` :
                     typeof node.style?.height === 'string' ? node.style.height :
                     "auto") :
                    (nodeTypeStyle as any).height || 'auto',
                  minWidth: "auto",
                  background:

                    (node.id === selectedNodeId || (selectedNodeId && getNodeDescendants(selectedNodeId).includes(node.id))) && previewColor
                      ? previewColor
                      : ((node as any).background as string) || (node.style?.background as string) || nodeTypeStyle.background,

                  borderColor: node.id === visuallySelectedNodeId
                    ? "skyblue"
                    : (isAddingToPlaylist && ((node.type === 'audio' && nodeData.audioUrl) || 
                                            (node.type === 'spotify' && nodeData.spotifyUrl) || 
                                            (node.type === 'soundcloud' && nodeData.soundCloudUrl) ||
                                            (node.type === 'youtube-video' && nodeData.videoUrl)))
                      ? "#4ade80" // Highlight audio, spotify, soundcloud and YouTube nodes with green border when in add to playlist mode
                      : "#374151",
                  borderWidth: (isAddingToPlaylist && ((node.type === 'audio' && nodeData.audioUrl) || 
                                                       (node.type === 'spotify' && nodeData.spotifyUrl) || 
                                                       (node.type === 'soundcloud' && nodeData.soundCloudUrl) ||
                                                       (node.type === 'youtube-video' && nodeData.videoUrl)))
                    ? "3px" // Thicker border for audio, spotify, soundcloud and YouTube nodes when in add to playlist mode
                    : "2px", // Always show a border for all nodes

                  border: (node.type === 'audio' || node.type === 'playlist' || node.type === 'spotify' || node.type === 'youtube-video')
                    ? "solid" // Ensure audio, playlist, spotify, and youtube-video nodes always have a border
                    : node.style?.border || nodeTypeStyle.border,

                  wordWrap: undefined,
                },
              } as Node;
            })}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={setReactFlowInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onNodeClick={(event, node) => selectNode(event, node.id)}
            onNodeDragStart={onNodeDragStart}
            onNodeDragStop={onNodeDragStop}
            onPaneContextMenu={(event) => {
              event.preventDefault()
              setSelectedNodeId(null)
              setVisuallySelectedNodeId(null)
            }}
            onPaneClick={() => {
              // Exit "add to playlist" mode when clicking on the pane
              if (isAddingToPlaylist) {
                setIsAddingToPlaylist(false);
                setActivePlaylistNodeId(null);
              }

              // Clear node selection
              setSelectedNodeId(null);
              setVisuallySelectedNodeId(null);
            }}
            onEdgeClick={(event) => {
              // Prevent edge selection from interfering with node selection
              event.preventDefault()
              event.stopPropagation()
            }}
            onSelectionStart={() => {
              // Selection start is handled by ReactFlow internally
            }}
            onSelectionEnd={() => {
              // Update selection bounds for toolbar positioning
              const selectedNodes = nodes.filter(node => node.selected);
              updateSelectionBounds(selectedNodes);
            }}
            onSelectionChange={({ nodes }) => {
              // Clear selection bounds when no nodes are selected
              if (nodes.length === 0) {
                setSelectionBounds(null);
              }
            }}
            onSelectionDragStart={(_, selectedNodes) => {
              if (selectedNodes.length > 1) {
                // Store initial positions for all selected nodes
                const initialPositions: Record<string, { x: number; y: number }> = {};
                selectedNodes.forEach(node => {
                  initialPositions[node.id] = { ...node.position };
                });

                setIsMultiDragging(true);
                setMultiDragStartPosition(initialPositions);

                // Update selection bounds for the toolbar
                updateSelectionBounds(selectedNodes);
              }
            }}
            onSelectionDrag={(_, selectedNodes) => {
              // Update selection bounds during drag
              if (selectedNodes.length > 1) {
                updateSelectionBounds(selectedNodes);
              }
            }}
            onSelectionDragStop={(_, selectedNodes) => {
              // Update selection bounds after multi-drag operation completes
              if (selectedNodes.length > 1 && isMultiDragging) {
                updateSelectionBounds(selectedNodes);
              }
            }}
            fitView
            proOptions={{ hideAttribution: true }}
            deleteKeyCode="null"
            multiSelectionKeyCode="Shift"
            selectionOnDrag={true}
            elementsSelectable={true}
            selectNodesOnDrag={false}
            zoomOnScroll={!isHoveringPlaylist && !isHoveringAudioVolume}
          >
            <Background color="#374151" gap={20} />
            <Controls />

            {/* Selection Toolbar */}
            <SelectionToolbarWrapper
              selectionBounds={selectionBounds}
              onCut={handleCutSelectedNodes}
              onCopy={handleCopySelectedNodes}
              onDelete={handleDeleteSelectedNodes}
            />



            {/* Paste toolbox that follows the cursor */}
            {showPasteToolbox && clipboardNodes.length > 0 && (
              <div
                className="fixed bg-gray-800 text-white px-4 py-3 rounded-lg shadow-lg flex flex-col pointer-events-none border border-gray-700"
                style={{
                  left: pasteToolboxPosition.x + 15,
                  top: pasteToolboxPosition.y + 15,
                  zIndex: 9999,
                  transform: 'translate(0, 0)',
                  transition: 'none',
                  backdropFilter: 'blur(4px)',
                  backgroundColor: 'rgba(31, 41, 55, 0.95)'
                }}
              >
                <div className="flex items-center space-x-2 mb-1 pb-2 border-b border-gray-700">
                  <div className="bg-blue-500 p-1 rounded-md">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                      <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
                    </svg>
                  </div>
                  <span className="font-medium">Paste {clipboardNodes.length} node{clipboardNodes.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="flex justify-between mt-2 px-4">
                  <div
                    className="flex items-center bg-gray-700 transition-colors duration-150 rounded-md px-3 py-1.5 cursor-pointer paste-button-left"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                      <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                    <img src={leftClickIcon} alt="Left Click" width="18" height="18" style={{ filter: 'brightness(0) invert(1)' }} />
                  </div>
                  <div
                    className="flex items-center bg-gray-700 transition-colors duration-150 rounded-md px-3 py-1.5 ml-4 cursor-pointer paste-button-right"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                    <img src={rightClickIcon} alt="Right Click" width="18" height="18" style={{ filter: 'brightness(0) invert(1)' }} />
                  </div>
                </div>
              </div>
            )}
          </ReactFlow>
          <button
            onClick={handleFullscreen}
            className="absolute top-2 right-2 p-1 bg-gray-700 rounded-full hover:bg-gray-600 transition-colors"
            style={{ zIndex: 10 }}
          >
            <Maximize2 className="w-4 h-4 text-gray-300" />
          </button>
          <button
            onClick={() => setShowHelpModal(true)}
            className="absolute bottom-2 right-2 p-1 bg-gray-700 rounded-full hover:bg-gray-600 transition-colors"
            style={{ zIndex: 0 }}
            title="Help"
          >
            <HelpCircle className="w-4 h-4 text-gray-300" />
          </button>
        </div>

        {selectedNodeId && selectedNode && (
          <div className={`fixed bottom-8 right-8 ${nodeEditorClass}`}>
            <div className="relative flex flex-col bg-gray-800 p-4 rounded-lg space-y-3">
              {selectedNode.type === "spotify" ? (
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Music className="w-5 h-5 text-green-500" />
                    <span className="text-gray-300">Select a song</span>
                  </div>
                  <SpotifySearch onSelect={(track) => handleSpotifyTrackSelect(selectedNodeId, track)} />
                </div>
              ) : selectedNode.type === "soundcloud" ? (
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Music className="w-5 h-5 text-orange-500" />
                    <span className="text-gray-300">{isSmallScreen ? "SoundCloud" : "SoundCloud URL"}</span>
                  </div>
                  <input
                    type="text"
                    placeholder={isSmallScreen ? "URL" : "Enter SoundCloud URL"}
                    value={selectedNode.data.soundCloudUrl || ""}
                    onChange={(e) => updateNodeLabel(selectedNodeId, e.target.value)}
                    className="px-4 py-2 bg-gray-900 text-white border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ) : selectedNode.type === "youtube-video" ? (
                <div className="space-y-4">
                  <h3 className="text-white text-sm font-medium">Search YouTube Video</h3>
                  <YouTubeSearch onSelect={(video) => handleYouTubeVideoSelect(selectedNodeId, video)} />
                </div>
              ) : selectedNode.type === "image" ? (
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <ImageIcon className="w-5 h-5 text-gray-400" />
                    <span className="text-gray-300">Change image</span>
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    {selectedNode.data.imageUrl ? 'Replace Image' : 'Choose Image'}
                  </button>
                </div>
              ) : selectedNode.type === "audio" ? (
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <AudioWaveform className="w-5 h-5 text-gray-400" />
                    <span className="text-gray-300">
                      {selectedNode.data.audioUrl || selectedNode.data.file ? 'Edit audio label' : 'Change audio'}
                    </span>
                  </div>
                  {selectedNode.data.audioUrl || selectedNode.data.file ? (
                    <input
                      autoFocus
                      type="text"
                      placeholder="Audio label"
                      value={selectedNode.data.label || ""}
                      onChange={(e) => updateNodeLabel(selectedNodeId, e.target.value)}
                      className="px-4 py-2 bg-gray-900 text-white border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <button
                      onClick={() => audioFileInputRef.current?.click()}
                      className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                    >
                      Choose Audio
                    </button>
                  )}
                  <input
                    ref={audioFileInputRef}
                    type="file"
                    accept="audio/*"
                    onChange={handleAudioFileChange}
                    className="hidden"
                  />
                </div>
              ) : selectedNode.type === "playlist" ? (
                <div className="space-y-4">
                  <div className="relative mb-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <ListMusic className="w-4 h-4 text-gray-400" />
                    </div>
                    <input
                      autoFocus
                      type="text"
                      placeholder="Playlist name"
                      value={selectedNode.data.label || ""}
                      onChange={(e) => updateNodeLabel(selectedNodeId, e.target.value)}
                      className="pl-10 px-4 py-2 bg-gray-900 text-white border border-gray-700 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="mt-2">
                    <div className="text-sm text-gray-300 mb-2">Audio tracks:</div>
                    <div
                      className="max-h-[140px] overflow-y-auto bg-gray-900/30 rounded p-1 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent"
                      onMouseEnter={() => setIsHoveringPlaylist(true)}
                      onMouseLeave={() => setIsHoveringPlaylist(false)}
                      ref={(el) => {
                        // Add non-passive wheel event listener to the element
                        if (el) {
                          const wheelHandler = (e: WheelEvent) => {
                            // When hovering over tracks, we want to scroll the tracks, not zoom the mindmap
                            if (isHoveringPlaylist) {
                              e.preventDefault();
                              e.stopPropagation();

                              // Manually handle scrolling
                              el.scrollTop += e.deltaY;
                            }
                          };

                          // Remove any existing listener first to avoid duplicates
                          el.removeEventListener('wheel', wheelHandler);
                          // Add the event listener with passive: false to allow preventDefault
                          el.addEventListener('wheel', wheelHandler, { passive: false });
                        }
                      }}
                    >
                      {selectedNode.data.trackIds && selectedNode.data.trackIds.length > 0 ? (
                        <DndContext
                          sensors={sensors}
                          collisionDetection={closestCenter}
                          onDragEnd={(event: DragEndEvent) => {
                            const { active, over } = event;
                            if (over && active.id !== over.id) {
                              // Extract the indices from the IDs (format: "trackId-index")
                              const oldIndex = parseInt(active.id.toString().split('-')[1]);
                              const newIndex = parseInt(over.id.toString().split('-')[1]);
                              handleReorderPlaylistTracks(selectedNodeId, oldIndex, newIndex);
                            }
                          }}
                        >
                          <SortableContext
                            items={selectedNode.data.trackIds.map((id: string, index: number) => `${id}-${index}`)}
                            strategy={verticalListSortingStrategy}
                          >
                            <div className="space-y-1">
                              {selectedNode.data.trackIds.map((trackId: string, index: number) => {
                                // Find the audio, spotify, soundcloud, or youtube-video node with this ID
                                const trackNode = nodes.find(node => node.id === trackId && 
                                  (node.type === 'audio' || node.type === 'spotify' || 
                                   node.type === 'soundcloud' || node.type === 'youtube-video'));
                                if (!trackNode) return null;

                                // Count occurrences of this track ID before this index
                                const trackOccurrences = selectedNode.data.trackIds
                                  .slice(0, index)
                                  .filter((id: string) => id === trackId).length;

                                // Create a label with counter for duplicate tracks
                                let displayLabel = trackNode.data.label || (
                                  trackNode.type === 'audio' ? "Audio" : 
                                  trackNode.type === 'spotify' ? "Spotify Track" : 
                                  trackNode.type === 'soundcloud' ? "SoundCloud Track" :
                                  trackNode.type === 'youtube-video' ? "YouTube Video" :
                                  "Track"
                                );
                                
                                // Format SoundCloud URLs into readable labels
                                if (trackNode.type === 'soundcloud' && trackNode.data.soundCloudUrl) {
                                  displayLabel = formatSoundCloudUrl(trackNode.data.soundCloudUrl, displayLabel);
                                }
                                
                                if (trackOccurrences > 0) {
                                  displayLabel = `${displayLabel} (${trackOccurrences + 1})`;
                                }

                                // Determine duration based on node type
                                const duration = trackNode.data.duration || 0;


                                return (
                                  <SortableTrackItem
                                    key={`${trackId}-${index}`}
                                    id={`${trackId}-${index}`}
                                    trackId={trackId}
                                    index={index}
                                    label={displayLabel}
                                    duration={duration}
                                    onRemove={(trackId, index) => handleRemoveTrackFromPlaylist(selectedNodeId, trackId, index)}
                                  />
                                );
                              })}
                            </div>
                          </SortableContext>
                        </DndContext>
                      ) : (
                        <div className="text-gray-500 text-xs p-2 text-center">
                          No tracks added to playlist
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Add song button */}
                  <div className="mt-4">
                    {isAddingToPlaylist && activePlaylistNodeId === selectedNodeId ? (
                      <div className="flex flex-col space-y-2">
                        <div className="px-3 py-2 bg-blue-600/20 border border-blue-500/30 rounded-lg text-xs text-blue-300">
                          <p>Click on any audio, Spotify, SoundCloud, or YouTube video node to add it to the playlist</p>
                        </div>
                        <button
                          onClick={() => toggleAddToPlaylistMode(null)}
                          className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                        >
                          Cancel Selection
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => toggleAddToPlaylistMode(selectedNodeId)}
                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors flex items-center justify-center"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add
                      </button>
                    )}
                  </div>
                </div>
              ) : selectedNode.type === "link" ? (
                <>
                  <input
                    autoFocus
                    type="text"
                    placeholder="URL"
                    value={selectedNode.data.url || ''}
                    onChange={(e) => updateNodeLabel(selectedNodeId, e.target.value)}
                    className="px-4 py-2 bg-gray-900 text-white border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="Display Text"
                    value={selectedNode.data.displayText || ""}
                    onChange={(e) => updateNodeDisplayText(selectedNodeId, e.target.value)}
                    className="px-4 py-2 bg-gray-900 text-white border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </>
              ) : selectedNode.type === "mindmap" ? (
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Network className="w-5 h-5 text-gray-400" />
                    <span className="text-gray-300">Select a Mind Map</span>
                  </div>
                  <select
                    value={selectedNode.data.mapKey ? maps.find(m => m.key === selectedNode.data.mapKey)?.id || "" : ""}
                    onChange={(e) => updateNodeMapId(selectedNodeId, e.target.value)}
                    className="w-full px-2 py-1 bg-gray-700 text-white rounded-lg"
                  >
                    <option value="" className="text-gray-500">
                      Select a map
                    </option>
                    {maps.map((map) => (
                      <option key={map.id} value={map.id} disabled={map.id === id}>
                        {map.title}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <input
                  autoFocus
                  data-node-id={selectedNodeId}
                  type="text"
                  placeholder={
                    selectedNode.type === "default"
                      ? "Text..."
                      : selectedNode.type === "instagram"
                        ? "username"
                        : selectedNode.type === "twitter"
                          ? "username"
                          : selectedNode.type === "facebook"
                            ? "username"
                            : selectedNode.type === "youtube"
                              ? "username"
                              : selectedNode.type === "tiktok"
                                ? "username"
                                : "Text..."
                  }
                  value={["instagram", "twitter", "facebook", "youtube", "tiktok"].includes(selectedNode.type || '') ? (selectedNode.data.username || "") : (selectedNode.data.label || "")}
                  onChange={(e) => updateNodeLabel(selectedNodeId, e.target.value)}
                  className={`px-4 py-2 bg-gray-900 text-white border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    selectedNodeId === "1"
                      ? "border-4 border-transparent border-image-gradient"
                      : "border border-gray-700"
                  }`}
                  style={
                    selectedNodeId === "1"
                      ? {
                          borderImage: "linear-gradient(90deg, #38bdf8, #3b82f6)",
                          borderImageSlice: 1,
                        }
                      : {}
                  }
                />
              )}

              {selectedNodeId !== "1" && (
                <div className="flex justify-between items-center">
                  <button
                    onClick={() => handleDetachConnections(selectedNodeId)}
                    className="p-2 text-blue-500 hover:bg-blue-500/10 rounded-lg"
                    title="Detach node's connections"
                  >
                    <Unlink className="w-5 h-5" />
                  </button>

                  <div className="relative" ref={colorPickerRef}>
                    <button
                      onClick={() => setShowColorPicker(!showColorPicker)}
                      className="p-2 text-purple-500 hover:bg-purple-500/10 rounded-lg"
                      title="Change node color"
                    >
                      <Palette className="w-5 h-5" />
                    </button>

                    {showColorPicker && (
                      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-[82.5%] mb-2 p-4 bg-gray-800 rounded-lg shadow-lg z-50">
                        <div className="space-y-2">
                          <button
                            onClick={() => {
                              handleDefaultColorChange(selectedNodeId)
                              setShowColorPicker(false)
                            }}
                            className="w-full px-3 py-1 text-sm text-gray-300 hover:bg-gray-700 rounded flex items-center space-x-2"
                          >
                            <div className="w-4 h-4 rounded bg-[#1f2937] border border-gray-600"></div>
                            <span>Default</span>
                          </button>

                          <HexColorPicker
                            color={selectedColor}
                            onChange={(color) => handleColorPickerChange(selectedNodeId, color)}
                            className="w-full h-8 cursor-pointer rounded border border-gray-600"
                          />
                          <div className="flex justify-between mt-2">
                            <button
                              onClick={() => handleColorPickerConfirm(selectedNodeId)}
                              className="p-2 text-green-500 hover:bg-green-500/10 rounded-lg"
                              title="Confirm color change"
                            >
                              <Check className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleColorPickerCancel(selectedNodeId)}
                              className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg"
                              title="Cancel color change"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => deleteNodeAndChildren(selectedNodeId)}
                    className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg"
                    title="Delete node and its children"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
        <ProPopup isOpen={showErrorModal} onClose={() => setShowErrorModal(false)} />
        {showUnsavedChangesModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-gray-900 rounded-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center space-x-3 text-yellow-500 mb-4">
                <AlertCircle className="w-6 h-6" />
                <h2 className="text-xl font-semibold text-gray-100">Unsaved Changes</h2>
              </div>
              <p className="text-gray-300 mb-6">You have unsaved changes. Do you want to save before leaving?</p>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => handleModalResponse("yes")}
                  className={`px-4 py-2 rounded-lg transition-colors ${hasUnsavedChanges ? "bg-green-500 text-white hover:bg-green-600" : "bg-gray-700 text-gray-400 cursor-not-allowed"}`}
                  disabled={!hasUnsavedChanges}
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => handleModalResponse("no")}
                  className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Discard
                </button>
                <button
                  type="button"
                  onClick={() => handleModalResponse("cancel")}
                  className="px-4 py-2 text-gray-400 hover:text-gray-100 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
        {showLoginPrompt && (
          <ConditionalLoginPrompt onClose={() => setShowLoginPrompt(false)} />
        )}
        <MindMapHelpModal isOpen={showHelpModal} onClose={() => setShowHelpModal(false)} />
      </div>
    </div>
  )
}
