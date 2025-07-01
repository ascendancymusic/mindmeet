import React from "react"
import { useState, useCallback, useEffect, useRef, useLayoutEffect, useMemo } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { usePageTitle } from '../hooks/usePageTitle'
import ReactFlow,
{
  addEdge,
  Background,
  Controls,
  ReactFlowProvider,
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
import { Trash2, Unlink, Music, Save, ArrowLeft, ImageIcon, Maximize2, AlertCircle, Palette, Check, X, Network, ChevronDown, Loader, HelpCircle, AudioWaveform, ListMusic, Plus, Brain, Youtube } from 'lucide-react'
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
import MindMapSelector from "../components/MindMapSelector"
import { ConditionalLoginPrompt } from "../components/LoginPrompt";
import { useAuthStore } from "../store/authStore";
import defaultNodeStyles from "../config/defaultNodeStyles";
import { supabase } from "../supabaseClient";
import { MindMapHelpModal } from "../components/MindMapHelpModal";
import SelectionToolbarWrapper from "../components/SelectionToolbarWrapper";
import { aiService } from "../services/aiService";
import { useCollaborationStore } from "../store/collaborationStore";
import { CollaboratorCursors } from "../components/CollaboratorCursors";
import { CollaboratorsList } from "../components/CollaboratorsList";


interface HistoryAction {
  type: "add_node" | "move_node" | "connect_nodes" | "disconnect_nodes" | "delete_node" | "update_node" | "update_title" | "resize_node" | "change_edge_type"
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
    edgeType?: 'default' | 'straight' | 'smoothstep'
  }
  previousState?: {
    nodes: Node[]
    edges: Edge[]
    title?: string
    edgeType?: 'default' | 'straight' | 'smoothstep'
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
  const { maps, updateMap, setMaps, acceptAIChanges } = useMindMapStore()  // Node types for ReactFlow
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
  }), [])

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

  // Dynamic page title
  usePageTitle(currentMap ? `Editing: ${currentMap.title || 'Untitled'}` : 'Loading...');
  const [multiDragStartPosition, setMultiDragStartPosition] = useState<Record<string, { x: number; y: number }> | null>(null)
  const [showUnsavedChangesModal, setShowUnsavedChangesModal] = useState(false)
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [selectedColor, setSelectedColor] = useState<string>("#1f2937")
  const [previewColor, setPreviewColor] = useState<string | null>(null)
  const colorPickerRef = useRef<HTMLDivElement>(null)
  const edgeTypeDropdownRef = useRef<HTMLDivElement>(null)
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const user = useAuthStore((state) => state.user);
  const [showHelpModal, setShowHelpModal] = useState(false);  // Collaboration store for real-time features
  const {
    initializeCollaboration,
    cleanupCollaboration,
    updateCursorPosition,
    broadcastCursorPosition,
    broadcastLiveChange,
    currentMindMapId
  } = useCollaborationStore();

  // State for playlist song selection mode
  const [isAddingToPlaylist, setIsAddingToPlaylist] = useState(false);
  const [activePlaylistNodeId, setActivePlaylistNodeId] = useState<string | null>(null);
  const [clipboardNodes, setClipboardNodes] = useState<Node[]>([]);
  const [clipboardEdges, setClipboardEdges] = useState<Edge[]>([]);
  const [selectionBounds, setSelectionBounds] = useState<{ x: number, y: number, width: number, height: number } | null>(null);
  const [showPasteToolbox, setShowPasteToolbox] = useState(false);
  const [pasteToolboxPosition, setPasteToolboxPosition] = useState({ x: 0, y: 0 });  const [isShiftPressed, setIsShiftPressed] = useState(false);
  const [isHoveringPlaylist, setIsHoveringPlaylist] = useState(false);
  const setIsAnimatingGeneration: React.Dispatch<React.SetStateAction<boolean>> = useState(false)[1];
  // AI Fill state
  const [showAIFillModal, setShowAIFillModal] = useState(false);
  const [aiFillPrompt, setAIFillPrompt] = useState("");
  const [isAIFillLoading, setIsAIFillLoading] = useState(false);
    // AI Generation Progress State
  const [generationProgress, setGenerationProgress] = useState({
    stage: 'idle' as 'idle' | 'analyzing' | 'generating' | 'processing' | 'animating' | 'complete' | 'error',
    message: '',
    progress: 0, // 0-100
    estimatedTime: 0,
    nodesGenerated: 0,
    totalNodes: 0,
    isError: false
  });  const [isHoveringAudioVolume, setIsHoveringAudioVolume] = useState(false);
  
  const [dragResistance, setDragResistance] = useState<{
    isResisting: boolean;
    resistanceStrength: number;
    nearbyNodes: string[];
  }>({
    isResisting: false,
    resistanceStrength: 0,
    nearbyNodes: []
  });
  
  // MindMap selector state
  const [showMindMapSelector, setShowMindMapSelector] = useState(false);
  const [mindMapSearchTerm, setMindMapSearchTerm] = useState("");
  const [mindMapSortBy, setMindMapSortBy] = useState<'alphabetical' | 'lastEdited'>('lastEdited');
  const [showCreateMindMapForm, setShowCreateMindMapForm] = useState(false);
  const [newMindMapTitle, setNewMindMapTitle] = useState("");

  // Edge type state
  const [edgeType, setEdgeType] = useState<'default' | 'straight' | 'smoothstep'>('default');
  const [showEdgeTypeDropdown, setShowEdgeTypeDropdown] = useState(false);

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
      }      const { data: map, error: mapError } = await supabase
        .from("mindmaps")
        .select("key, id, title, json_data, likes, liked_by, updated_at, visibility, description, creator, created_at, comment_count, saves, is_pinned, collaborators")
        .eq("id", id)
        .eq("creator", profile.id)
        .single();

      if (mapError || !map) {
        setLoadError("Could not find the requested mind map.");
        setIsLoading(false);
        return;
      }      const { data: { user } } = await supabase.auth.getUser();

      // Check if user is creator or collaborator
      const isCreator = user?.id === map.creator;
      const isCollaborator = map.collaborators && user?.id ? 
        map.collaborators.includes(user.id) : false;

      if (!isCreator && !isCollaborator) {
        // Redirect to view-only mode if user is neither creator nor collaborator
        navigate(`/${username}/${id}`);
        return;
      }      const processedMap = {
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
        edgeType: map.json_data?.edgeType || 'default',
        createdAt: new Date(map.created_at).getTime(),
        updatedAt: new Date(map.updated_at).getTime(),
        likes: map.likes || 0,
        comment_count: map.comment_count || 0,
        saves: map.saves || 0,
        likedBy: map.liked_by || [],
        isPinned: map.is_pinned || false,
        visibility: map.visibility || 'private',
        description: map.description || '',
        creator: map.creator,
        collaborators: map.collaborators || [],
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
      // Load edgeType from JSON data, default to 'default' if not present
      setEdgeType((processedMap as any).edgeType || 'default');
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
      // Load edgeType from JSON data, default to 'default' if not present
      setEdgeType((currentMap as any).edgeType || 'default');
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
    }  }, [currentMap, navigate, reactFlowInstance, fetchMindMapFromSupabase])
  // Initialize collaboration when component mounts with valid user and mind map
  useEffect(() => {
    if (id && user?.id && user.username && isLoggedIn) {
      initializeCollaboration(id, user.id, user.username, user.avatar_url);
    }

    // Cleanup collaboration when component unmounts
    return () => {
      cleanupCollaboration();
    };
  }, [id, user?.id, user?.username, user?.avatar_url, isLoggedIn, initializeCollaboration, cleanupCollaboration]);

  // Handle receiving live changes from other collaborators
  useEffect(() => {
    if (!currentMindMapId) return;    const handleLiveChange = (event: CustomEvent) => {
      const { id: changeId, type, action, data, user_id } = event.detail;
      
      // Don't apply changes if we're the one who made them
      if (user_id === user?.id) return;

      if (type === 'node') {
        if (action === 'update') {
          setNodes(currentNodes => 
            currentNodes.map(node => 
              node.id === changeId ? { ...node, ...data } : node
            )
          );
        } else if (action === 'create') {
          setNodes(currentNodes => {
            // Check if node already exists to prevent duplicates
            const nodeExists = currentNodes.some(node => node.id === changeId);
            if (!nodeExists) {
              return [...currentNodes, data];
            }
            return currentNodes;
          });
        } else if (action === 'delete') {
          setNodes(currentNodes => 
            currentNodes.filter(node => node.id !== changeId)
          );
          setEdges(currentEdges => 
            currentEdges.filter(edge => 
              edge.source !== changeId && edge.target !== changeId
            )
          );
        }
      } else if (type === 'edge') {
        if (action === 'create') {
          setEdges(currentEdges => {
            // Check if edge already exists to prevent duplicates
            const edgeExists = currentEdges.some(edge => edge.id === data.id);
            if (!edgeExists) {
              return [...currentEdges, data];
            }
            return currentEdges;
          });
        } else if (action === 'delete') {
          setEdges(currentEdges => 
            currentEdges.filter(edge => edge.id !== changeId)
          );
        }
      }
    };

    // Subscribe to live change events
    window.addEventListener('collaboration-live-change', handleLiveChange as EventListener);

    return () => {
      window.removeEventListener('collaboration-live-change', handleLiveChange as EventListener);
    };
  }, [currentMindMapId, user?.id]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (colorPickerRef.current && !colorPickerRef.current.contains(event.target as Element)) {
        setShowColorPicker(false)
        setPreviewColor(null)
      }
      if (edgeTypeDropdownRef.current && !edgeTypeDropdownRef.current.contains(event.target as Element)) {
        setShowEdgeTypeDropdown(false)
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

  const checkNodeProximity = useCallback((draggedNode: Node, allNodes: Node[]) => {
    const RESISTANCE_DISTANCE = 80; // Distance at which resistance starts
    const MAX_RESISTANCE_DISTANCE = 40; // Distance at which resistance is maximum
    
    let nearbyNodes: string[] = [];
    let maxResistance = 0;
    
    allNodes.forEach(node => {
      if (node.id === draggedNode.id) return;
      
      const distance = Math.sqrt(
        Math.pow(node.position.x - draggedNode.position.x, 2) + 
        Math.pow(node.position.y - draggedNode.position.y, 2)
      );
      
      if (distance < RESISTANCE_DISTANCE) {
        nearbyNodes.push(node.id);
        
        // Calculate resistance strength (0 to 1)
        const resistanceStrength = Math.max(0, 
          (RESISTANCE_DISTANCE - distance) / (RESISTANCE_DISTANCE - MAX_RESISTANCE_DISTANCE)
        );
        maxResistance = Math.max(maxResistance, resistanceStrength);
      }
    });
    
    return {
      nearbyNodes,
      resistanceStrength: Math.min(maxResistance, 1),
      isResisting: nearbyNodes.length > 0
    };
  }, []);

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
      previousEdges: Edge[] = edges,
      previousEdgeType?: 'default' | 'straight' | 'smoothstep'
    ): HistoryAction => {
      return {
        type,
        data: actionData,
        previousState: {
          nodes: previousNodes,
          edges: previousEdges,
          edgeType: previousEdgeType,
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

  // Handle edge type changes with history tracking
  const handleEdgeTypeChange = useCallback(
    (newEdgeType: 'default' | 'straight' | 'smoothstep') => {
      const previousEdgeType = edgeType;

      // Create history action for edge type change
      const action = createHistoryAction(
        "change_edge_type",
        { edgeType: newEdgeType },
        nodes,
        edges,
        previousEdgeType
      );

      addToHistory(action);
      setEdgeType(newEdgeType);
      setShowEdgeTypeDropdown(false);

      if (!isInitialLoad) {
        setHasUnsavedChanges(true);
      }
    },
    [edgeType, nodes, edges, createHistoryAction, addToHistory, isInitialLoad]
  );

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

      if (selectedNodes.length === 1 && deselectedNodes.length === 0) {
        const nodeId = selectedNodes[0].id;
        setSelectedNodeId(nodeId);

        // Update color picker
        const selectedNode = nodes.find((node) => node.id === nodeId);
        if (selectedNode) {
          setSelectedColor(String((selectedNode as any).background || selectedNode.style?.background || "#1f2937"));
        }
      }
      else if (deselectedNodes.length > 0 && selectedNodes.length === 0) {
        setSelectedNodeId(null);
        setVisuallySelectedNodeId(null);
      }
      else if (selectedNodes.length > 1) {
        setSelectedNodeId(null);
        setVisuallySelectedNodeId(null);
      }

      return;
    }

    // Handle position changes with resistance
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

      // Apply resistance to position changes during dragging
      const resistanceAdjustedChanges = positionChanges.map(change => {
        const posChange = change as { id: string; position: { x: number; y: number }; dragging?: boolean };
        
        // Only apply resistance during active dragging
        if (!posChange.dragging || !posChange.position) {
          return change;
        }

        const draggedNode = nodes.find(n => n.id === posChange.id);
        if (!draggedNode) return change;

        // Create a temporary node with the new position to check proximity
        const tempNode = { ...draggedNode, position: posChange.position };
        const otherNodes = nodes.filter(n => n.id !== posChange.id);
        
        const proximityCheck = checkNodeProximity(tempNode, otherNodes);
        
        // Update resistance state for visual feedback
        if (proximityCheck.isResisting) {
          setDragResistance(proximityCheck);
        } else {
          setDragResistance({ isResisting: false, resistanceStrength: 0, nearbyNodes: [] });
        }

        // Apply resistance by reducing movement speed
        if (proximityCheck.isResisting && proximityCheck.resistanceStrength > 0) {
          const resistanceFactor = 1 - (proximityCheck.resistanceStrength * 0.7); // Max 70% resistance
          const originalDelta = {
            x: posChange.position.x - draggedNode.position.x,
            y: posChange.position.y - draggedNode.position.y
          };
          
          const resistedPosition = {
            x: draggedNode.position.x + (originalDelta.x * resistanceFactor),
            y: draggedNode.position.y + (originalDelta.y * resistanceFactor)
          };

          return {
            ...change,
            position: resistedPosition
          };
        }

        return change;
      });

      // Apply changes to nodes
      if (moveWithChildren && !isMultiSelectionDrag) {
        // This is a single node with children being moved
        const updatedChanges = resistanceAdjustedChanges.flatMap((change) => {
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
                      dragging: posChange.dragging,
                    }
                  : null
              })
              .filter(Boolean),
          ]
        })

        setNodes((nds) => {
          const updatedNodes = applyNodeChanges([...updatedChanges, ...selectionChanges] as NodeChange[], nds);

          const isDragStop = updatedChanges.some(change =>
            (change as any).type === 'position' && !(change as any).dragging
          );

          if (isDragStop) {
            // Clear resistance when drag stops
            setDragResistance({ isResisting: false, resistanceStrength: 0, nearbyNodes: [] });
            setTimeout(() => {
              setEdges(currentEdges => [...currentEdges]);
            }, 0);
          }

          return updatedNodes;
        });
      } else {
        // This is either a multi-selection drag or a single node without children
        setNodes((nds) => {
          const updatedNodes = applyNodeChanges([...resistanceAdjustedChanges, ...selectionChanges] as NodeChange[], nds);
          
          // Clear resistance when drag stops
          const isDragStop = resistanceAdjustedChanges.some(change =>
            (change as any).type === 'position' && !(change as any).dragging
          );
          
          if (isDragStop) {
            setDragResistance({ isResisting: false, resistanceStrength: 0, nearbyNodes: [] });
          }
          
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
          const action = createHistoryAction(
            "move_node",
            {
              nodeId: selectedNodeIds[0],
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

          if (!isInitialLoad) {
            setHasUnsavedChanges(true);
          }
        }

        // Reset multi-drag state and clear resistance
        setIsMultiDragging(false);
        setMultiDragStartPosition(null);
        setDragResistance({ isResisting: false, resistanceStrength: 0, nearbyNodes: [] });
      }

      if (!isInitialLoad && !isDragging && !isMultiDragging) {
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
    
    // Broadcast changes to collaborators if we're in a collaborative session
    if (currentMindMapId && changes.length > 0) {
      changes.forEach(change => {
        if (change.type === 'position') {
          const positionChange = change as any;
          const nodeData = nodes.find(n => n.id === change.id);
          
          if (nodeData) {
            const updatedNodeData = {
              ...nodeData,
              position: positionChange.position
            };
            
            broadcastLiveChange({
              id: change.id,
              type: 'node',
              action: 'update',
              data: updatedNodeData
            });
          }
        } else if (change.type === 'remove') {
          broadcastLiveChange({
            id: change.id,
            type: 'node',
            action: 'delete',
            data: { id: change.id }
          });
        } else if (change.type === 'add') {
          const addChange = change as any;
          if (addChange.item) {
            broadcastLiveChange({
              id: addChange.item.id,
              type: 'node',
              action: 'create',
              data: addChange.item
            });
          }
        }
      });
    }
  },
  [nodes, moveWithChildren, isInitialLoad, getNodeDescendants, isMultiDragging, multiDragStartPosition, edges, addToHistory, isDragging, currentMindMapId, broadcastLiveChange, checkNodeProximity],
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
      
      // Broadcast edge changes to collaborators
      if (currentMindMapId && significantChanges.length > 0) {
        significantChanges.forEach(change => {
          if (change.type === 'remove') {
            broadcastLiveChange({
              id: change.id,
              type: 'edge',
              action: 'delete',
              data: { id: change.id }
            });
          }
        });
      }
    },
    [isInitialLoad, currentMindMapId, broadcastLiveChange],
  )
  const onConnect = useCallback(
    (params: Connection) => {
      // Prevent self-referential connections which would create invalid graph structures
      if (params.source === params.target) {
        return;
      }

      setEdges((eds) => {
        const newEdges = addEdge(params, eds)
        
        // Broadcast new edge creation to collaborators
        if (currentMindMapId) {
          const newEdge = newEdges.find(edge => 
            edge.source === params.source && edge.target === params.target
          );
          if (newEdge) {
            broadcastLiveChange({
              id: newEdge.id,
              type: 'edge',
              action: 'create',
              data: newEdge
            });
          }
        }
        
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
    [nodes, isInitialLoad, addToHistory, currentMindMapId, broadcastLiveChange],
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
  const SOCIAL_MEDIA_NODE_TYPES = useMemo(() => ["instagram", "twitter", "facebook", "youtube", "tiktok"], []);
  // Define default placeholder texts for different node types
  const DEFAULT_NODE_LABELS = useMemo(() => ({
    "default": "",
    "spotify": "Select a song...",
    "soundcloud": "Enter SoundCloud URL...",
    "youtube-video": "Search for a video...",
    "image": "Click to add image",
    "link": "Link",
    "audio": "Audio",
    "playlist": "Playlist"
  } as Record<string, string>), []);

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
      }      const nodeType = event.dataTransfer.getData("application/reactflow-type")
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

        // Broadcast live node creation to collaborators
        if (currentMindMapId && broadcastLiveChange) {
          broadcastLiveChange({
            id: newNode.id,
            type: 'node',
            action: 'create',
            data: newNode as Node
          });
        }

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
    [reactFlowInstance, isInitialLoad, edges, addToHistory, currentMindMapId, broadcastLiveChange],
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

      // Broadcast live node deletions to collaborators
      if (currentMindMapId && broadcastLiveChange) {
        allNodesToDelete.forEach(deletedNodeId => {
          broadcastLiveChange({
            id: deletedNodeId,
            type: 'node',
            action: 'delete',
            data: { id: deletedNodeId }
          });
        });
      }

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
    [nodes, edges, selectedNodeId, visuallySelectedNodeId, isInitialLoad, addToHistory, getNodeDescendants, currentMindMapId, broadcastLiveChange],
  )// Helper function to format time in MM:SS format
  const formatTime = (timeInSeconds: number): string => {
    if (isNaN(timeInSeconds) || !isFinite(timeInSeconds) || timeInSeconds < 0) return '00:00';
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };  // Simple AI Generation Animation Function
  const createGenerationAnimation = async (
    existingNodes: Node[], 
    newNodes: Node[], 
    newEdges: Edge[], 
    onProgress?: (currentIndex: number, total: number) => void
  ) => {
    if (newNodes.length === 0) return { finalNodes: existingNodes, finalEdges: edges };
    
    // Start with existing nodes
    let currentNodes = [...existingNodes];
    let currentEdges = [...edges];
    
    // Add new nodes one by one with simple animation
    for (let i = 0; i < newNodes.length; i++) {
      const nodeToAdd = newNodes[i];
      
      // Call progress callback if provided
      if (onProgress) {
        onProgress(i, newNodes.length);
      }
      
      // Add the node with a simple fade-in effect
      const newNode = {
        ...nodeToAdd,
        style: {
          ...nodeToAdd.style,
          opacity: 0,
          transition: 'opacity 0.3s ease-in-out',
        }
      };
      
      currentNodes = [...currentNodes, newNode];
      setNodes(currentNodes);
      
      // Wait a brief moment
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Fade in the node
      const visibleNode = {
        ...nodeToAdd,
        style: {
          ...nodeToAdd.style,
          opacity: 1,
          transition: 'opacity 0.3s ease-in-out',
        }
      };
      
      currentNodes = currentNodes.map(n => 
        n.id === nodeToAdd.id ? visibleNode : n
      );
      setNodes(currentNodes);
      
      // Add connected edges
      const nodeEdges = newEdges.filter(edge => 
        edge.source === nodeToAdd.id || edge.target === nodeToAdd.id
      );
      
      if (nodeEdges.length > 0) {
        currentEdges = [...currentEdges, ...nodeEdges];
        setEdges(currentEdges);
      }
      
      // Brief pause between nodes
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    // Final cleanup
    setIsAnimatingGeneration(false);
    
    return { finalNodes: currentNodes, finalEdges: currentEdges };
  };
  // Removed complex pulsing indicator - using simple animation instead
  // Enhanced progress tracking helper functions
  const updateProgress = (stage: 'idle' | 'analyzing' | 'generating' | 'processing' | 'animating' | 'complete' | 'error', message: string, progress: number, estimatedTime?: number, nodesGenerated?: number, totalNodes?: number) => {
    setGenerationProgress(prev => ({
      ...prev,
      stage,
      message,
      progress: Math.min(100, Math.max(0, progress)),
      estimatedTime: estimatedTime ?? prev.estimatedTime,
      nodesGenerated: nodesGenerated ?? prev.nodesGenerated,
      totalNodes: totalNodes ?? prev.totalNodes,
      isError: stage === 'error'
    }));
  };
  const resetProgress = () => {
    setGenerationProgress({
      stage: 'idle',
      message: '',
      progress: 0,
      estimatedTime: 0,
      nodesGenerated: 0,
      totalNodes: 0,
      isError: false
    });
  };

  // Handle AI Fill functionality with comprehensive progress tracking
  const handleAIFill = async () => {
    if (!isLoggedIn) {
      setShowLoginPrompt(true);
      return;
    }

    setIsAIFillLoading(true);
    resetProgress();
    
    try {
      const isRootNode = selectedNodeId === "1";
      
      // Stage 1: Analyzing mindmap structure
      updateProgress('analyzing', 'Analyzing mindmap structure...', 5);
      await new Promise(resolve => setTimeout(resolve, 500)); // Give user visual feedback
      
      // Prepare mindmap data for AI service
      let mindMapData;
      let prompt;
      
      if (isRootNode) {
        updateProgress('analyzing', 'Preparing for full mindmap generation...', 10);
        
        // For root node, send entire mindmap for full regeneration
        mindMapData = {
          id: id || '',
          title: editedTitle,
          nodes,
          edges,
          isFullGeneration: true
        };
        
        prompt = aiFillPrompt.trim() || "Generate a comprehensive mindmap structure with relevant nodes and connections.";
        
        // Estimate total nodes for full generation
        updateProgress('analyzing', 'Ready to generate complete mindmap', 15, 15000, 0, 12);
      } else {
        updateProgress('analyzing', 'Analyzing selected branch...', 10);
        
        // For specific node, send COMPLETE mindmap context with expansion target info
        if (!selectedNodeId) {
          console.error("No node selected for hierarchical AI Fill");
          return;
        }
        
        const selectedNode = nodes.find(node => node.id === selectedNodeId);
        const descendantIds = getNodeDescendants(selectedNodeId);
        const relevantNodeIds = [selectedNodeId, ...descendantIds];
        
        // Get branch-specific nodes for analysis but send complete mindmap
        const branchNodes = nodes.filter(node => relevantNodeIds.includes(node.id));
        const branchEdges = edges.filter(edge => 
          relevantNodeIds.includes(edge.source) && relevantNodeIds.includes(edge.target)
        );

        // Analyze existing structure for better AI context
        const childNodes = branchNodes.filter(node => 
          branchEdges.some(edge => edge.source === selectedNodeId && edge.target === node.id)
        );
        const hasExistingChildren = childNodes.length > 0;
        
        // Estimate expansion nodes based on existing structure
        const estimatedNewNodes = hasExistingChildren ? Math.max(3, childNodes.length * 2) : 6;
        updateProgress('analyzing', `Analyzing "${selectedNode?.data?.label}" branch...`, 12, 8000, 0, estimatedNewNodes);
        
        mindMapData = {
          id: id || '',
          title: editedTitle,
          nodes: nodes, // Send COMPLETE mindmap nodes
          edges: edges, // Send COMPLETE mindmap edges
          selectedNodeId: selectedNodeId,
          selectedNodeLabel: selectedNode?.data?.label || "Selected Node",
          isFullGeneration: false,
          // Enhanced context for better AI understanding
          fullMindmapContext: {
            totalNodes: nodes.length,
            mainTitle: editedTitle,
            selectedNodeHasChildren: hasExistingChildren,
            existingChildrenCount: childNodes.length,
            existingChildrenLabels: childNodes.map(child => child.data?.label).filter(Boolean)
          },
          // Branch-specific context for targeted expansion
          branchContext: {
            branchNodeIds: relevantNodeIds,
            branchNodes: branchNodes,
            branchEdges: branchEdges,
            directChildNodes: childNodes
          }
        };
        
        // Enhance the prompt based on existing structure
        let basePrompt = aiFillPrompt.trim();
        if (!basePrompt) {
          if (hasExistingChildren) {
            basePrompt = `Expand the "${selectedNode?.data?.label}" branch by adding complementary content to the existing ${childNodes.length} child node(s): ${childNodes.map(child => `"${child.data?.label}"`).join(', ')}. You can add sibling nodes, grandchildren, or new sub-branches that enhance the overall structure.`;
          } else {
            basePrompt = `Add relevant child nodes and content to the "${selectedNode?.data?.label}" branch of this mindmap. Create a hierarchical structure that breaks down this topic into logical subtopics.`;
          }
        } else {
          // User provided custom prompt - enhance it with context
          if (hasExistingChildren) {
            basePrompt = `${basePrompt}\n\nNote: This node already has ${childNodes.length} existing child node(s): ${childNodes.map(child => `"${child.data?.label}"`).join(', ')}. Consider this existing structure when adding new content.`;
          }
        }
        
        prompt = basePrompt;
      }

      updateProgress('analyzing', 'Mindmap analysis complete', 20);
      await new Promise(resolve => setTimeout(resolve, 300));

      console.log("Calling AI service with mindmap data:", mindMapData);
      console.log("AI Fill prompt:", prompt);
      console.log("Is full generation:", isRootNode);

      // Stage 2: AI Generation
      updateProgress('generating', 'Sending request to AI...', 25);
      await new Promise(resolve => setTimeout(resolve, 200));
      
      updateProgress('generating', 'AI is analyzing your mindmap...', 35);
      
      // Generate AI response using the dedicated mindmap method with progress simulation
      const generationPromise = aiService.generateMindMapContent(prompt, mindMapData);
      
      // Simulate progress during AI generation
      const progressInterval = setInterval(() => {
        setGenerationProgress(prev => {
          if (prev.stage === 'generating' && prev.progress < 70) {
            const increment = Math.random() * 3 + 1;
            return {
              ...prev,
              progress: Math.min(70, prev.progress + increment),
              message: prev.progress < 50 ? 'AI is creating new nodes...' : 'AI is establishing connections...'
            };
          }
          return prev;
        });
      }, 800);
      
      await generationPromise;
      clearInterval(progressInterval);
      
      updateProgress('generating', 'AI generation complete', 75);
      
      // Stage 3: Processing results
      updateProgress('processing', 'Retrieving generated content...', 80);
      
      // Retrieve the generated content from the preview store
      const { usePreviewMindMapStore } = await import("../store/previewMindMapStore");
      const previewStore = usePreviewMindMapStore.getState();
      const generatedVersion = previewStore.getCurrentVersion(mindMapData.id);
      
      if (generatedVersion) {
        console.log("Retrieved generated content from preview store:", generatedVersion);
        
        const totalNewNodes = isRootNode 
          ? generatedVersion.nodes.filter((node: any) => node.id !== "1").length
          : generatedVersion.nodes.filter((node: any) => !nodes.some(existing => existing.id === node.id)).length;
        
        updateProgress('processing', `Processing ${totalNewNodes} new nodes...`, 85, undefined, 0, totalNewNodes);
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Stage 4: Animation
        updateProgress('animating', 'Starting mindmap animation...', 90);
        
        if (isRootNode) {
          // For root node, replace entire mindmap with animation
          const existingNodes = nodes.filter(node => node.id === "1"); // Keep only root
          const newNodes = generatedVersion.nodes.filter((node: any) => node.id !== "1");
          
          updateProgress('animating', `Animating ${newNodes.length} new nodes...`, 92, undefined, 0, newNodes.length);
          
          // Animate the generation of new nodes with progress updates
          const { finalNodes, finalEdges } = await createGenerationAnimation(
            existingNodes, 
            newNodes, 
            generatedVersion.edges,
            (currentIndex, total) => {
              const animationProgress = 92 + (currentIndex / total) * 6;
              updateProgress('animating', `Animating node ${currentIndex + 1} of ${total}...`, animationProgress, undefined, currentIndex + 1, total);
            }
          );
          
          // Apply the final state
          await acceptAIChanges(finalNodes, finalEdges, generatedVersion.title);
          setEditedTitle(generatedVersion.title);
        } else {
          // For hierarchical expansion with live animation
          const existingNodeIds = new Set(nodes.map(node => node.id));
          const returnedNodeIds = new Set(generatedVersion.nodes.map((node: any) => node.id));
          
          // Check if all existing nodes are preserved
          const allExistingNodesPreserved = Array.from(existingNodeIds).every(id => returnedNodeIds.has(id));
          
          if (allExistingNodesPreserved) {
            // Separate existing and new nodes for animation
            const existingNodes = generatedVersion.nodes.filter((node: any) => existingNodeIds.has(node.id));
            const newNodes = generatedVersion.nodes.filter((node: any) => !existingNodeIds.has(node.id));
            const newEdges = generatedVersion.edges.filter((edge: any) => 
              !edges.some(existingEdge => existingEdge.id === edge.id)
            );
            
            console.log(`Starting live animation for ${newNodes.length} new nodes`);
            updateProgress('animating', `Animating ${newNodes.length} new nodes...`, 92, undefined, 0, newNodes.length);
            
            // Animate the generation of new content with progress tracking
            const { finalNodes, finalEdges } = await createGenerationAnimation(
              existingNodes, 
              newNodes, 
              newEdges,
              (currentIndex, total) => {
                const animationProgress = 92 + (currentIndex / total) * 6;
                updateProgress('animating', `Animating node ${currentIndex + 1} of ${total}...`, animationProgress, undefined, currentIndex + 1, total);
              }
            );
            
            // Apply final changes
            await acceptAIChanges(finalNodes, finalEdges, editedTitle);
            console.log("Applied complete AI-enhanced mindmap structure with animation");
          } else {
            // Fallback: merge only new content with animation
            console.warn("AI didn't preserve all existing nodes, falling back to merge approach");
            const newNodes = generatedVersion.nodes.filter((node: any) => !existingNodeIds.has(node.id));
            const newEdges = generatedVersion.edges.filter((edge: any) => 
              !edges.some(existingEdge => existingEdge.id === edge.id)
            );
            
            updateProgress('animating', `Animating ${newNodes.length} new nodes...`, 92, undefined, 0, newNodes.length);
            
            // Animate the generation of new content
            const { finalNodes, finalEdges } = await createGenerationAnimation(
              nodes, 
              newNodes, 
              newEdges,
              (currentIndex, total) => {
                const animationProgress = 92 + (currentIndex / total) * 6;
                updateProgress('animating', `Animating node ${currentIndex + 1} of ${total}...`, animationProgress, undefined, currentIndex + 1, total);
              }
            );
            
            await acceptAIChanges(finalNodes, finalEdges, editedTitle);
          }
        }
        
        // Mark as having unsaved changes
        if (!isInitialLoad) {
          setHasUnsavedChanges(true);
        }
          // Stage 5: Complete
        updateProgress('complete', 'AI Fill completed successfully!', 100);
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        console.log("AI Fill applied successfully to mindmap");
      } else {
        updateProgress('complete', 'No content generated', 100);
        console.warn("No generated content found in preview store");      }
      
      // Close modal and reset state after successful completion
      setTimeout(() => {
        setShowAIFillModal(false);
        setAIFillPrompt("");
        resetProgress();
      }, 2000); // Give user time to see success message
      
    } catch (error) {
      console.error("Error generating AI content:", error);
      
      // Determine error type and provide appropriate user message
      let errorMessage = 'An unexpected error occurred during generation';
      
      if (error instanceof Error) {
        if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = 'Network error - Please check your connection and try again';
        } else if (error.message.includes('quota') || error.message.includes('limit')) {
          errorMessage = 'AI service quota exceeded - Please try again later';
        } else if (error.message.includes('timeout')) {
          errorMessage = 'Request timed out - Please try again with a simpler prompt';
        } else if (error.message.includes('authentication') || error.message.includes('unauthorized')) {
          errorMessage = 'Authentication error - Please refresh and try again';
        } else {
          errorMessage = error.message || errorMessage;
        }
      }
      
      updateProgress('error', errorMessage, 100);
      setGenerationProgress(prev => ({
        ...prev,
        isError: true
      }));
      
      // Show error state for longer to give user time to read
      setTimeout(() => {
        resetProgress();
        // Don't auto-close modal on error - let user decide
      }, 5000);
      
    } finally {
      setIsAIFillLoading(false);
    }
  };

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

      const updatedNode = { ...selectedNode, ...updateFn(selectedNode) };

      setNodes((nds) =>
        nds.map((node) => (node.id === nodeId ? updatedNode : node))
      );

      // Broadcast live changes to collaborators if we're in a collaborative session
      if (currentMindMapId && broadcastLiveChange) {
        broadcastLiveChange({
          id: nodeId,
          type: 'node',
          action: 'update',
          data: updatedNode
        });
      }

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
    [nodes, isInitialLoad, addToHistory, createHistoryAction, currentMindMapId, broadcastLiveChange]
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

  // MindMap selector helper functions
  const handleSelectMindMap = (mapId: string) => {
    if (selectedNodeId) {
      updateNodeMapId(selectedNodeId, mapId);
    }
    setShowMindMapSelector(false);
  }

  const handleCreateMindMapAccept = () => {
    setShowCreateMindMapForm(false);
    setNewMindMapTitle("");
    setShowMindMapSelector(false);
  }

  const handleCreateMindMapReject = () => {
    setShowCreateMindMapForm(false);
    setNewMindMapTitle("");
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
      updateMap(id, nodes, edges, editedTitle, user?.id || '', edgeType)
      setHasUnsavedChanges(false)
      setOriginalTitle(editedTitle)

      setLastSavedHistoryIndex(currentHistoryIndex)
    } else if (id) {
      setEditedTitle(originalTitle)
      setHasUnsavedChanges(false)
    }
    setCanUndo(false)
    setCanRedo(false)
  }, [id, nodes, edges, editedTitle, updateMap, originalTitle, isLoggedIn, user?.id, currentHistoryIndex, edgeType]);

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

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && reactFlowWrapperRef.current) {
        reactFlowWrapperRef.current.style.backgroundColor = ""
        const dotElements = reactFlowWrapperRef.current.querySelectorAll(".react-flow__background-dots circle")
        dotElements.forEach((dot: Element) => {
          if (dot instanceof SVGElement) {
            dot.style.fill = ""
          }
        })
      }
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange)
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange)
    }
  }, [])

  const handleFullscreen = () => {
    if (reactFlowWrapperRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen()
      } else {
        reactFlowWrapperRef.current.requestFullscreen({ navigationUI: "auto" })
        reactFlowWrapperRef.current.style.backgroundColor = "#0c1321"
        const dotElements = reactFlowWrapperRef.current.querySelectorAll(".react-flow__background-dots circle")
        dotElements.forEach((dot: Element) => {
          if (dot instanceof SVGElement) {
            dot.style.fill = "#374151"
          }
        })
      }
    }
  }

  const undo = useCallback(() => {
    // Only allow undo if we're not trying to go back beyond the last save point
    if (currentHistoryIndex >= 0 && canUndo && currentHistoryIndex > lastSavedHistoryIndex) {
      const action = history[currentHistoryIndex]
      // Validate action structure before processing undo
      if (!action || !action.data) {
        return;
      }

      if (action.previousState) {
        if (action.type === "move_node") {
          setNodes((nodes) =>
            nodes.map((node) => {
              const previousPosition = action.previousState?.nodes?.find((n) => n.id === node.id)?.position
              if (previousPosition) {
                return { ...node, position: previousPosition }
              }
              return node
            }),
          )
        } else if (action.type === "resize_node") {
          // Handle undo for resize actions
          setNodes((nodes) =>
            nodes.map((node) => {
              const previousNode = action.previousState?.nodes?.find((n) => n.id === node.id)
              if (previousNode && node.id === action.data.nodeId) {
                // For image nodes, handle width/height properly
                if (node.type === 'image') {
                  return {
                    ...node,
                    width: typeof previousNode.width === 'number' ? previousNode.width : undefined,
                    height: typeof previousNode.height === 'number' ? previousNode.height : undefined,
                    style: {
                      ...node.style,
                      width: typeof previousNode.style?.width === 'number' ? previousNode.style.width + 'px' : previousNode.style?.width,
                      height: typeof previousNode.style?.height === 'number' ? previousNode.style.height + 'px' : previousNode.style?.height
                    }
                  }
                } else {
                  return {
                    ...node,
                    style: {
                      ...node.style,
                      width: typeof previousNode.style?.width === 'number' ? previousNode.style.width + 'px' : previousNode.style?.width,
                      height: typeof previousNode.style?.height === 'number' ? previousNode.style.height + 'px' : previousNode.style?.height
                    }
                  }
                }
              }
              return node
            }),
          )
        } else if (action.type === "update_node") {
          // Reset preview color when undoing a color change
          if (action.data.color) {
            setPreviewColor(null);
          }

          setNodes((nodes) =>
            nodes.map((node) => {
              const previousNode = action.previousState?.nodes?.find((n) => n.id === node.id)
              if (previousNode) {
                return {
                  ...node,
                  // Restore both background properties
                  background: (previousNode as any).background,
                  style: {
                    ...node.style,
                    background: previousNode.style?.background
                  },

                  data: {
                    ...node.data,
                    label: previousNode.data?.label,
                    username: previousNode.data?.username,
                    displayText: previousNode.data?.displayText,
                    videoUrl: previousNode.data?.videoUrl,
                    spotifyUrl: previousNode.data?.spotifyUrl,
                    soundCloudUrl: previousNode.data?.soundCloudUrl,
                    url: previousNode.data?.url,
                    mapKey: previousNode.data?.mapKey,
                  },
                }
              }
              return node
            }),
          )
          if (selectedNodeId && action.previousState?.nodes) {
            const previousNode = action.previousState.nodes.find((n) => n.id === selectedNodeId)
            if (previousNode) {
              setSelectedColor(String((previousNode as any).background || previousNode.style?.background || "#1f2937"))
            }
          }
        } else if (action.type === "update_title" && action.previousState && 'title' in action.previousState) {
          setEditedTitle(action.previousState.title || '')
        } else if (action.type === "change_edge_type" && action.previousState && 'edgeType' in action.previousState) {
          setEdgeType(action.previousState.edgeType || 'default')
        } else if (action.previousState?.nodes) {
          setNodes(action.previousState.nodes)
        }

        if (action.previousState?.edges) {
          setEdges(action.previousState.edges)
        }        const newHistoryIndex = currentHistoryIndex - 1
        setCurrentHistoryIndex(newHistoryIndex)
        // Check if we've reached the last saved point
        const reachedSavePoint = newHistoryIndex === lastSavedHistoryIndex
        setHasUnsavedChanges(!reachedSavePoint)
        setCanRedo(true)
        setCanUndo(newHistoryIndex > lastSavedHistoryIndex)        // Broadcast undo changes to collaborators
        // This allows other users to see the mindmap changes without affecting their own undo/redo history
        if (broadcastLiveChange && action.previousState) {
          // Handle different action types during undo
          if (action.type === "delete_node" && action.previousState.nodes) {
            // For delete operations, when undoing we're restoring nodes, so broadcast 'create' actions
            const currentNodeIds = new Set(nodes.map(n => n.id));
            action.previousState.nodes.forEach(node => {
              // Only broadcast nodes that were actually restored (not already present)
              if (!currentNodeIds.has(node.id)) {
                broadcastLiveChange({
                  id: node.id,
                  type: 'node',
                  action: 'create',
                  data: node
                });
              }
            });
          } else if (action.type === "add_node") {
            // For add operations, when undoing we're removing nodes, so broadcast 'delete' actions
            const currentNodes = nodes;
            const previousNodes = action.previousState.nodes || [];
            
            // Find nodes that were in current state but not in previous state (i.e., were added)
            currentNodes.forEach(currentNode => {
              const wasInPrevious = previousNodes.some(prevNode => prevNode.id === currentNode.id);
              if (!wasInPrevious) {
                broadcastLiveChange({
                  id: currentNode.id,
                  type: 'node',
                  action: 'delete',
                  data: { id: currentNode.id }
                });
              }
            });
          } else {
            // For other operations (move, update, resize), broadcast node updates
            if (action.previousState.nodes) {
              action.previousState.nodes.forEach(node => {
                broadcastLiveChange({
                  id: node.id,
                  type: 'node',
                  action: 'update',
                  data: node
                });
              });
            }
          }
          
          // Handle edge changes during undo
          if (action.type === "delete_node" && action.previousState.edges) {
            // For delete operations, when undoing we're restoring edges, so broadcast 'create' actions
            const currentEdgeIds = new Set(edges.map(e => e.id));
            action.previousState.edges.forEach(edge => {
              // Only broadcast edges that were actually restored (not already present)
              if (!currentEdgeIds.has(edge.id)) {
                broadcastLiveChange({
                  id: edge.id,
                  type: 'edge',
                  action: 'create',
                  data: edge
                });
              }
            });
          } else if (action.type === "connect_nodes" && action.previousState.edges) {
            // For connect operations, when undoing we're removing edges, so broadcast 'delete' actions
            const currentEdges = edges;
            const previousEdges = action.previousState.edges || [];
            
            // Find edges that were in current state but not in previous state (i.e., were added)
            currentEdges.forEach(currentEdge => {
              const wasInPrevious = previousEdges.some(prevEdge => prevEdge.id === currentEdge.id);
              if (!wasInPrevious) {
                broadcastLiveChange({
                  id: currentEdge.id,
                  type: 'edge',
                  action: 'delete',
                  data: { id: currentEdge.id }
                });
              }
            });
          } else if (action.type === "disconnect_nodes" && action.previousState.edges) {
            // For disconnect operations, when undoing we're restoring edges, so broadcast 'create' actions
            const currentEdgeIds = new Set(edges.map(e => e.id));
            action.previousState.edges.forEach(edge => {
              // Only broadcast edges that were actually restored (not already present)
              if (!currentEdgeIds.has(edge.id)) {
                broadcastLiveChange({
                  id: edge.id,
                  type: 'edge',
                  action: 'create',
                  data: edge
                });
              }
            });
          } else if (action.previousState.edges) {
            // For other operations, broadcast edge updates
            action.previousState.edges.forEach(edge => {
              broadcastLiveChange({
                id: edge.id,
                type: 'edge',
                action: 'update',
                data: edge
              });
            });
          }
        }
      } else {
        console.warn("Action has no previousState:", action);
      }
    }
  }, [history, currentHistoryIndex, selectedNodeId, canUndo, lastSavedHistoryIndex, broadcastLiveChange])

  const redo = useCallback(() => {
    if (currentHistoryIndex < history.length - 1 && canRedo) {
      const nextAction = history[currentHistoryIndex + 1]
      // Validate action structure before processing redo
      if (!nextAction || !nextAction.data) {
        return;
      }

      switch (nextAction.type) {
        case "move_node":
          if (nextAction.data.position && typeof nextAction.data.position === "object") {
            setNodes((nodes) =>
              nodes.map((node) => {

                const positionMap = nextAction.data.position as Record<string, {x: number, y: number}>
                const newPosition = positionMap[node.id]
                if (newPosition) {
                  return { ...node, position: newPosition }
                }
                return node
              }),
            )
          }
          break
        case "resize_node":
          // Handle redo for resize actions
          setNodes((nodes) =>
            nodes.map((node) => {
              if (node.id === nextAction.data.nodeId) {
                // For image nodes, handle width/height properly
                if (node.type === 'image') {
                  return {
                    ...node,
                    width: typeof nextAction.data.width === 'number' ? nextAction.data.width : undefined,
                    height: typeof nextAction.data.height === 'number' ? nextAction.data.height : undefined,
                    style: {
                      ...node.style,
                      width: nextAction.data.width,
                      height: nextAction.data.height
                    }
                  }
                } else {
                  return {
                    ...node,
                    style: {
                      ...node.style,
                      width: nextAction.data.width,
                      height: nextAction.data.height
                    }
                  }
                }
              }
              return node
            }),
          )
          break
        case "connect_nodes":
          setEdges((edges) => addEdge(nextAction.data.connection!, edges))
          break
        case "disconnect_nodes":
          setEdges((edges) =>
            edges.filter((edge) => edge.source !== nextAction.data.nodeId && edge.target !== nextAction.data.nodeId),
          )
          break
        case "delete_node":
          const allNodesToDelete = [nextAction.data.nodeId || '', ...getNodeDescendants(nextAction.data.nodeId || '')]
          setNodes((nodes) => nodes.filter((node) => !allNodesToDelete.includes(node.id)))
          setEdges((edges) =>
            edges.filter((edge) => !allNodesToDelete.includes(edge.source) && !allNodesToDelete.includes(edge.target)),
          )
          break
        case "update_node":
          setNodes((nodes) =>
            nodes.map((node) => {
              if (
                nextAction.data.nodeId === node.id ||
                (nextAction.data.affectedNodes && nextAction.data.affectedNodes.includes(node.id))
              ) {
                if (nextAction.data.color) {
                  return {
                    ...node,
                    background: nextAction.data.color, // Update the background property
                    style: {
                      ...node.style,
                      background: nextAction.data.color,
                    },
                  }
                } else {
                  const updatedData = {
                    ...node.data,
                  }

                  if (nextAction.data.label !== undefined) {
                    // For social media nodes, update username property
                    if (["instagram", "twitter", "facebook", "youtube", "tiktok"].includes(node.type || '')) {
                      updatedData.username = nextAction.data.label
                    } else {
                      // For other node types, update label as before
                      updatedData.label = nextAction.data.label
                      if (node.type === "youtube-video") {
                        updatedData.videoUrl = nextAction.data.label
                      } else if (node.type === "spotify") {
                        updatedData.spotifyUrl = nextAction.data.spotifyUrl || nextAction.data.label
                      } else if (node.type === "soundcloud") {
                        updatedData.soundCloudUrl = nextAction.data.label
                      } else if (node.type === "link") {
                        updatedData.url = nextAction.data.label
                      } else if (node.type === "mindmap") {
                        // Find the map to get its key
                        const selectedMap = maps.find(map => map.id === nextAction.data.label);
                        updatedData.mapKey = selectedMap?.key; // Only use mapKey
                      }
                    }
                  }

                  if (nextAction.data.displayText !== undefined) {
                    updatedData.displayText = nextAction.data.displayText
                  }

                  return {
                    ...node,
                    data: updatedData,
                  }
                }
              }
              return node
            }),
          )
          if (selectedNodeId && nextAction.data.color) {
            setSelectedColor(String(nextAction.data.color))
            // Reset preview color when redoing a color change
            setPreviewColor(null);
          }
          break
        case "add_node":
          if (nextAction.data.nodes) {
            setNodes(nextAction.data.nodes)
          }
          break
        case "update_title":
          setEditedTitle(nextAction.data.label || "")
          break
        case "change_edge_type":
          setEdgeType(nextAction.data.edgeType || 'default')
          break
        default:
          break
      }      const newHistoryIndex = currentHistoryIndex + 1
      setCurrentHistoryIndex(newHistoryIndex)
      // Check if we've reached the last saved point
      const reachedSavePoint = newHistoryIndex === lastSavedHistoryIndex
      setHasUnsavedChanges(!reachedSavePoint)
      setCanUndo(newHistoryIndex > lastSavedHistoryIndex)
      setCanRedo(newHistoryIndex + 1 < history.length)      // Broadcast redo changes to collaborators
      // This allows other users to see the mindmap changes without affecting their own undo/redo history
      if (broadcastLiveChange && nextAction) {
        // For node-based actions, broadcast the current state of affected nodes
        if (nextAction.type === "move_node" || nextAction.type === "update_node" || nextAction.type === "resize_node") {
          // Get current nodes state and broadcast affected nodes
          const currentNodes = nodes;
          if (nextAction.type === "move_node" && nextAction.data.position) {
            const positionMap = nextAction.data.position as Record<string, {x: number, y: number}>;
            Object.keys(positionMap).forEach(nodeId => {
              const node = currentNodes.find(n => n.id === nodeId);
              if (node) {
                broadcastLiveChange({
                  id: nodeId,
                  type: 'node',
                  action: 'update',
                  data: { ...node, position: positionMap[nodeId] }
                });
              }
            });
          } else if ((nextAction.type === "update_node" || nextAction.type === "resize_node") && nextAction.data.nodeId) {
            const nodeId = nextAction.data.nodeId;
            const node = currentNodes.find(n => n.id === nodeId);
            if (node) {
              broadcastLiveChange({
                id: nodeId,
                type: 'node',
                action: 'update',
                data: node
              });
            }
          }        } else if (nextAction.type === "add_node" && nextAction.data.nodes) {
          // Broadcast new nodes from add_node actions
          nextAction.data.nodes.forEach((node: Node) => {
            broadcastLiveChange({
              id: node.id,
              type: 'node',
              action: 'create',
              data: node
            });
          });
        } else if (nextAction.type === "connect_nodes" && nextAction.data.connection) {
          // Broadcast new edge creation
          const connection = nextAction.data.connection;
          const newEdge = edges.find(edge => 
            edge.source === connection.source && 
            edge.target === connection.target
          );
          if (newEdge) {
            broadcastLiveChange({
              id: newEdge.id,
              type: 'edge',
              action: 'create',
              data: newEdge
            });
          }
        } else if (nextAction.type === "disconnect_nodes" && nextAction.data.nodeId) {
          // For disconnect operations, broadcast the removal of edges connected to the node
          const nodeId = nextAction.data.nodeId;
          const currentEdges = edges;
          
          // Find edges that are connected to this node and should be removed
          const edgesToRemove = currentEdges.filter(edge => 
            edge.source === nodeId || edge.target === nodeId
          );
          
          edgesToRemove.forEach(edge => {
            broadcastLiveChange({
              id: edge.id,
              type: 'edge',
              action: 'delete',
              data: { id: edge.id }
            });
          });
        } else if (nextAction.type === "delete_node" && nextAction.data.nodeId) {
          // Broadcast node deletion for both the main node and its children
          const nodeId = nextAction.data.nodeId;
          const allNodesToDelete = [nodeId, ...getNodeDescendants(nodeId)];
          
          allNodesToDelete.forEach(deletedNodeId => {
            broadcastLiveChange({
              id: deletedNodeId,
              type: 'node',
              action: 'delete',
              data: { id: deletedNodeId }
            });
          });
        }
      }
    }
  }, [history, currentHistoryIndex, getNodeDescendants, selectedNodeId, canRedo, lastSavedHistoryIndex, broadcastLiveChange, nodes, edges])

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key === "z") {
        event.preventDefault()
        if (canUndo) {
          undo()
        }
      } else if (event.ctrlKey && event.key === "y") {
        event.preventDefault()
        if (canRedo) {
          redo()
        }
      } else if (event.ctrlKey && event.key === "s") {
        event.preventDefault()
        if (hasUnsavedChanges) {
          handleSave()
        }
      }
    },
    [undo, redo, hasUnsavedChanges, handleSave, canUndo, canRedo],
  )

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [handleKeyDown])

  // Handle image node resize events
  const handleImageNodeResize = useCallback((event: CustomEvent) => {
    const { nodeId, previousWidth, previousHeight, width, height } = event.detail;

    // Create a history action for the resize
    const action: HistoryAction = {
      type: "resize_node",
      data: {
        nodeId,
        width,
        height
      },
      previousState: {
        nodes: nodes.map(node => {
          if (node.id === nodeId) {
            return {
              ...node,
              width: typeof previousWidth === 'number' ? previousWidth : undefined,
              height: typeof previousHeight === 'number' ? previousHeight : undefined,
              style: {
                ...node.style,
                width: typeof previousWidth === 'number' ? previousWidth + 'px' : previousWidth,
                height: typeof previousHeight === 'number' ? previousHeight + 'px' : previousHeight
              }
            };
          }
          return node;
        }),
        edges
      }
    };

    // Update the nodes with the new width and height
    setNodes(nodes =>
      nodes.map(node => {
        if (node.id === nodeId) {
          return {
            ...node,
            width: typeof width === 'number' ? width : undefined,

            height: typeof height === 'number' ? height : undefined,
            style: {
              ...node.style,
              width: typeof width === 'number' ? width + 'px' : width,
              height: typeof height === 'number' ? height + 'px' : height
            }
          };
        }
        return node;
      })
    );

    addToHistory(action);
    if (!isInitialLoad) {
      setHasUnsavedChanges(true);
    }
    setIsInitialLoad(false);
  }, [nodes, edges, addToHistory, isInitialLoad]);

  // Handle image node dimensions set when image is loaded
  const handleImageNodeDimensionsSet = useCallback((event: CustomEvent) => {
    const { nodeId, width, height, isNewUpload } = event.detail;

    setNodes(nodes =>
      nodes.map(node => {
                             if (node.id === nodeId) {
          // For new uploads, always update the dimensions
          // For existing images, only update if the node doesn't have dimensions yet
          const shouldUpdateDimensions = isNewUpload ||
            !(typeof node.width === 'number' && typeof node.height === 'number');

          if (!shouldUpdateDimensions) {
            return node;
          }

          return {
            ...node,

            width: typeof width === 'number' ? width : undefined,
            height: typeof height === 'number' ? height : undefined,
            style: {
              ...node.style,
              width: typeof width === 'number' ? `${width}px` : width,
              height: typeof height === 'number' ? `${height}px` : height
            }
          };
        }
        return node;
      })
    );


    if (!isInitialLoad) {
      setHasUnsavedChanges(true);
    }
  }, [nodes, isInitialLoad]);

  // Handle audio node compression
  const handleAudioNodeCompressed = useCallback((event: CustomEvent) => {
    const { nodeId, compressedFile } = event.detail;

    // Update the nodes with the compressed audio file
    setNodes(nodes =>
      nodes.map(node => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              file: compressedFile, // Update with the compressed file
            }
          };
        }
        return node;
      })
    );

    // Mark as having unsaved changes
    if (!isInitialLoad) {
      setHasUnsavedChanges(true);
    }
  }, [nodes, isInitialLoad]);

  // Handle audio node duration
  const handleAudioNodeDuration = useCallback((event: CustomEvent) => {
    const { nodeId, duration } = event.detail;

    // Update the nodes with the audio duration
    setNodes(nodes =>
      nodes.map(node => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              duration: duration, // Save the duration in the node data
            }
          };
        }
        return node;
      })
    );

    // Mark as having unsaved changes
    if (!isInitialLoad) {
      setHasUnsavedChanges(true);
    }
  }, [nodes, isInitialLoad]);

  // Handle playlist playback actions
  const handlePlaylistPlaybackAction = useCallback((event: CustomEvent) => {
    // This function intentionally does nothing with the event
    // Its purpose is to intercept playback actions to prevent them from affecting the save state
    console.log('Playlist playback action:', event.detail);

    // We don't need to update any state here, just intercept the event
    // This prevents the default behavior that would mark the mindmap as having unsaved changes
  }, []);

  // Handle playlist hover events to disable/enable zooming
  const handlePlaylistHover = useCallback((event: CustomEvent) => {
    if (event.detail && typeof event.detail.hovering === 'boolean') {
      setIsHoveringPlaylist(event.detail.hovering);
    }
  }, []);

  // Handle audio volume hover events to disable/enable zooming
  const handleAudioVolumeHover = useCallback((event: CustomEvent) => {
    if (event.detail && typeof event.detail.hovering === 'boolean') {
      setIsHoveringAudioVolume(event.detail.hovering);
    }
  }, []);

  useEffect(() => {
    document.addEventListener('image-node-resized', handleImageNodeResize as EventListener);
    document.addEventListener('image-node-dimensions-set', handleImageNodeDimensionsSet as EventListener);
    document.addEventListener('audio-node-compressed', handleAudioNodeCompressed as EventListener);
    document.addEventListener('audio-node-duration', handleAudioNodeDuration as EventListener);
    document.addEventListener('playlist-playback-action', handlePlaylistPlaybackAction as EventListener);
    document.addEventListener('playlist-hover', handlePlaylistHover as EventListener);
    document.addEventListener('audio-volume-hover', handleAudioVolumeHover as EventListener);
    return () => {
      document.removeEventListener('image-node-resized', handleImageNodeResize as EventListener);
      document.removeEventListener('image-node-dimensions-set', handleImageNodeDimensionsSet as EventListener);
      document.removeEventListener('audio-node-compressed', handleAudioNodeCompressed as EventListener);
      document.removeEventListener('audio-node-duration', handleAudioNodeDuration as EventListener);
      document.removeEventListener('playlist-playback-action', handlePlaylistPlaybackAction as EventListener);
      document.removeEventListener('playlist-hover', handlePlaylistHover as EventListener);
      document.removeEventListener('audio-volume-hover', handleAudioVolumeHover as EventListener);
    };
  }, [handleImageNodeResize, handleImageNodeDimensionsSet, handleAudioNodeCompressed, handleAudioNodeDuration, handlePlaylistPlaybackAction, handlePlaylistHover, handleAudioVolumeHover])

  const handleBeforeUnload = useCallback(
    (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        // Prevent browser from navigating away without confirmation
        e.preventDefault()
        setShowUnsavedChangesModal(true)
        return false
      }
    },
    [hasUnsavedChanges],
  )
  useEffect(() => {
    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [handleBeforeUnload])

  // Click outside handler for MindMapSelector
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showMindMapSelector && !(event.target as Element).closest('.mindmap-selector')) {
        setShowMindMapSelector(false);
      }
    };

    if (showMindMapSelector) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMindMapSelector]);

  const handleModalResponse = (response: "yes" | "no" | "cancel") => {
    setShowUnsavedChangesModal(false)
    if (response === "yes") {
      handleSave()
      navigate("/mindmap")
    } else if (response === "no") {
      setHasUnsavedChanges(false)
      navigate("/mindmap")
    }
  }
  const handleColorChange = (nodeId: string, color: string) => {
    const descendantIds = getNodeDescendants(nodeId);
    const allNodesToUpdate = [nodeId, ...descendantIds];

    setNodes((nds) =>
      nds.map((node) => {
        if (allNodesToUpdate.includes(node.id)) {
          const updatedNode = {
            ...node,
            // Apply color to both background properties for consistent styling
            background: color,
            style: {
              ...node.style,
              background: color,
              textShadow: "0 1px 2px rgba(0, 0, 0, 1)",
            },
          };

          // Broadcast live color changes to collaborators for each affected node
          if (currentMindMapId && broadcastLiveChange) {
            broadcastLiveChange({
              id: node.id,
              type: 'node',
              action: 'update',
              data: updatedNode
            });
          }

          return updatedNode;
        }
        return node;
      })
    );

    setSelectedColor(color);
    if (!isInitialLoad) {
      setHasUnsavedChanges(true);
    }
    setIsInitialLoad(false);
  };
  const handleColorPickerChange = (nodeId: string, color: string) => {
    setPreviewColor(color);
    
    // Broadcast live color preview changes to collaborators
    if (currentMindMapId && broadcastLiveChange) {
      const selectedNode = nodes.find(node => node.id === nodeId);
      if (selectedNode) {
        const descendantIds = getNodeDescendants(nodeId);
        const allNodesToUpdate = [nodeId, ...descendantIds];
        
        // Broadcast preview color for all affected nodes
        allNodesToUpdate.forEach(affectedNodeId => {
          const affectedNode = nodes.find(node => node.id === affectedNodeId);
          if (affectedNode) {
            const previewNode = {
              ...affectedNode,
              background: color,
              style: {
                ...affectedNode.style,
                background: color,
                textShadow: "0 1px 2px rgba(0, 0, 0, 1)",
              },
            };
            
            broadcastLiveChange({
              id: affectedNodeId,
              type: 'node',
              action: 'update',
              data: previewNode
            });
          }
        });
      }
    }
  }

  const handleColorPickerConfirm = (nodeId: string) => {
    if (previewColor) {
      handleColorChange(nodeId, previewColor)

      const descendantIds = getNodeDescendants(nodeId)
      const allNodesToUpdate = [nodeId, ...descendantIds]

      // Create a snapshot of current node states for history
      const previousState = nodes.map((node) => ({
        id: node.id,
        background: (node as any).background,
        style: {
          ...node.style,
          background: node.style?.background
        },
        data: node.data,
      }))

      // Create history action for color change
      const action = createHistoryAction(
        "update_node",
        {
          nodeId,
          label: previewColor,
          affectedNodes: allNodesToUpdate,
          color: previewColor,
        },
        previousState as unknown as Node[]
      )
      addToHistory(action)

    }
    setShowColorPicker(false)
    setPreviewColor(null)
  }

  const handleDefaultColorChange = (nodeId: string) => {
    const defaultColor = "#1f2937"
    handleColorChange(nodeId, defaultColor)

    const descendantIds = getNodeDescendants(nodeId)
    const allNodesToUpdate = [nodeId, ...descendantIds]

    // Create a snapshot of current node states for history
    const previousState = nodes.map((node) => ({
      id: node.id,
      background: (node as any).background,
      style: node.style,
      data: node.data,
    }))

    // Create history action for default color change
    const action = createHistoryAction(
      "update_node",
      {
        nodeId,
        label: defaultColor,
        affectedNodes: allNodesToUpdate,
        color: defaultColor,
      },
      previousState as unknown as Node[]
    )
    addToHistory(action)

    setShowColorPicker(false)
    setPreviewColor(null)
  }

  const handleColorPickerCancel = (nodeId: string) => {
    const selectedNode = nodes.find((node) => node.id === nodeId)
    if (selectedNode) {
      // Reset color picker to the node's current color
      setSelectedColor(String((selectedNode as any).background || selectedNode.style?.background || "#1f2937"))
    }

    setPreviewColor(null)
    setShowColorPicker(false)
  }

  useEffect(() => {
    if (selectedNodeId) {
      const inputElement = document.querySelector(`input[data-node-id="${selectedNodeId}"]`) as HTMLInputElement
      if (inputElement) {
        inputElement.focus()
      }
    }
  }, [selectedNodeId])

  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      if (reactFlowWrapperRef.current?.contains(e.target as Element)) {
        e.preventDefault()
      }
    }

    document.addEventListener("contextmenu", handleContextMenu)
    return () => {
      document.removeEventListener("contextmenu", handleContextMenu)
    }
  }, [])

  // Manages paste toolbox UI interactions and clipboard operations  // Handles cursor tracking, visual feedback, and paste/cancel actions
  useEffect(() => {
    let lastBroadcastTime = 0;
    let animationFrameId: number | null = null;
    let pendingBroadcast: { x: number; y: number } | null = null;    // Throttled broadcast function to reduce network traffic
    const throttledBroadcast = (position: { x: number; y: number }) => {
      const now = Date.now();
      const timeSinceLastBroadcast = now - lastBroadcastTime;
      
      // Throttle to maximum 60 FPS (16.67ms between broadcasts)
      if (timeSinceLastBroadcast >= 16.67) {
        broadcastCursorPosition(position);
        lastBroadcastTime = now;
        pendingBroadcast = null;
      } else {
        // Store the latest position for deferred broadcast
        pendingBroadcast = position;
        
        // Cancel previous animation frame if exists
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
        }
        
        // Schedule broadcast for next available frame
        animationFrameId = requestAnimationFrame(() => {
          if (pendingBroadcast) {
            broadcastCursorPosition(pendingBroadcast);
            lastBroadcastTime = Date.now();
            pendingBroadcast = null;
          }
          animationFrameId = null;
        });
      }
    };

    // Update paste toolbox position to follow cursor and track collaboration cursor
    const handleMouseMove = (e: MouseEvent) => {
      if (showPasteToolbox) {
        setPasteToolboxPosition({ x: e.clientX, y: e.clientY });
      }
        // Track cursor position for collaboration if we're in a collaborative session
      if (currentMindMapId && reactFlowInstance && reactFlowWrapperRef.current?.contains(e.target as Element)) {
        const rect = reactFlowWrapperRef.current.getBoundingClientRect();
        const clientX = e.clientX - rect.left;
        const clientY = e.clientY - rect.top;
        
        // Get current viewport state
        const viewport = reactFlowInstance.getViewport();
        
        // Convert to viewport-independent coordinates (world coordinates)
        // This accounts for zoom and pan so coordinates work across different viewports
        const worldX = (clientX - viewport.x) / viewport.zoom;
        const worldY = (clientY - viewport.y) / viewport.zoom;
        
        const worldPosition = { x: worldX, y: worldY };
        
        // Update local cursor position immediately (no throttling for local updates)
        updateCursorPosition(worldPosition);
        
        // Throttle network broadcasts to reduce lag
        throttledBroadcast(worldPosition);
      }
    };

    // Provide visual feedback when mouse buttons are pressed
    const handleMouseDown = (e: MouseEvent) => {
      if (showPasteToolbox) {
        if (e.button === 0) { // Left mouse button
          // Highlight confirm button with green
          const leftButton = document.querySelector('.paste-button-left');
          if (leftButton) {
            leftButton.classList.add('bg-green-600');
            leftButton.classList.remove('bg-gray-700');
          }
        } else if (e.button === 2) { // Right mouse button
          // Highlight cancel button with red
          const rightButton = document.querySelector('.paste-button-right');
          if (rightButton) {
            rightButton.classList.add('bg-red-600');
            rightButton.classList.remove('bg-gray-700');
          }
        }
      }
    };

    // Restore button colors when mouse is released
    const handleMouseUp = () => {
      if (showPasteToolbox) {

        const leftButton = document.querySelector('.paste-button-left');
        const rightButton = document.querySelector('.paste-button-right');

        if (leftButton) {
          leftButton.classList.remove('bg-green-600');
          leftButton.classList.add('bg-gray-700');
        }

        if (rightButton) {
          rightButton.classList.remove('bg-red-600');
          rightButton.classList.add('bg-gray-700');
        }
      }
    };

    // Execute paste operation on left mouse click
    const handleMouseClick = (e: MouseEvent) => {
      // Verify paste toolbox is active and clipboard has content
      if (showPasteToolbox && clipboardNodes.length > 0 && e.button === 0) { // Left mouse button
        e.preventDefault();
        e.stopPropagation();

        if (!reactFlowInstance) {
          return;
        }        const { newNodes, newEdges } = createPasteAction(
          clipboardNodes,
          clipboardEdges,
          pasteToolboxPosition,
          reactFlowInstance
        );

        setNodes(nds => {
          const updatedNodes = [...nds, ...newNodes];

          // Broadcast live node creation to collaborators for pasted nodes
          if (currentMindMapId && broadcastLiveChange) {
            newNodes.forEach(newNode => {
              broadcastLiveChange({
                id: newNode.id,
                type: 'node',
                action: 'create',
                data: newNode
              });
            });
          }

          // Create history action for pasting nodes
          const action = createHistoryAction(
            "add_node",
            { nodes: updatedNodes },
            nds
          );
          addToHistory(action);

          return updatedNodes;
        });

        setEdges(eds => {
          const updatedEdges = [...eds, ...newEdges];

          // Broadcast live edge creation to collaborators for pasted edges
          if (currentMindMapId && broadcastLiveChange) {
            newEdges.forEach(newEdge => {
              broadcastLiveChange({
                id: newEdge.id,
                type: 'edge',
                action: 'create',
                data: newEdge
              });
            });
          }

          return updatedEdges;
        });

        if (!isInitialLoad) {
          setHasUnsavedChanges(true);
        }
        setIsInitialLoad(false);



        // Clean up UI state and clear clipboard after successful paste
        setShowPasteToolbox(false);
        setClipboardNodes([]);
        setClipboardEdges([]);
      }
    };

    // Cancel paste operation on right-click
    const handleContextMenu = (e: MouseEvent) => {
      if (showPasteToolbox) {
        e.preventDefault();
        // Cancel paste operation and clear clipboard
        setShowPasteToolbox(false);
        setClipboardNodes([]);
        setClipboardEdges([]);

      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('click', handleMouseClick);
    document.addEventListener('contextmenu', handleContextMenu);    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('click', handleMouseClick);
      document.removeEventListener('contextmenu', handleContextMenu);
      
      // Clean up animation frame if exists
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [showPasteToolbox, clipboardNodes, clipboardEdges, reactFlowInstance, pasteToolboxPosition, edges, isInitialLoad, addToHistory]);

  // Manages keyboard shortcuts and modifier key states
  // Handles clipboard operations and selection modifiers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Monitor shift key state for multi-selection functionality
      if (e.key === 'Shift') {
        setIsShiftPressed(true);
      }

      // Global keyboard shortcut for paste operation (Ctrl+V)
      // Works throughout the application regardless of focus state
      if (e.ctrlKey && e.key === 'v' && clipboardNodes.length > 0) {
        e.preventDefault();

        // Validate clipboard and instance availability
        if (clipboardNodes.length === 0 || !reactFlowInstance) {
          return;
        }        // Generate new elements at cursor position
        const { newNodes, newEdges } = createPasteAction(
          clipboardNodes,
          clipboardEdges,
          pasteToolboxPosition,
          reactFlowInstance
        );

        // Update mindmap with new elements and record in history
        setNodes(nds => {
          const updatedNodes = [...nds, ...newNodes];

          // Broadcast live node creation to collaborators for pasted nodes
          if (currentMindMapId && broadcastLiveChange) {
            newNodes.forEach(newNode => {
              broadcastLiveChange({
                id: newNode.id,
                type: 'node',
                action: 'create',
                data: newNode
              });
            });
          }

          // Create history action for pasting nodes
          const action = createHistoryAction(
            "add_node",
            { nodes: updatedNodes },
            nds
          );
          addToHistory(action);

          return updatedNodes;
        });

        setEdges(eds => {
          const updatedEdges = [...eds, ...newEdges];

          // Broadcast live edge creation to collaborators for pasted edges
          if (currentMindMapId && broadcastLiveChange) {
            newEdges.forEach(newEdge => {
              broadcastLiveChange({
                id: newEdge.id,
                type: 'edge',
                action: 'create',
                data: newEdge
              });
            });
          }

          return updatedEdges;
        });

        if (!isInitialLoad) {
          setHasUnsavedChanges(true);
        }
        setIsInitialLoad(false);



        // Reset UI state and clear clipboard after paste operation
        setShowPasteToolbox(false);
        setClipboardNodes([]);
        setClipboardEdges([]);
      }

      // Cancel paste operation with Escape key
      if (e.key === 'Escape' && showPasteToolbox) {
        // Cancel paste operation and clear clipboard
        setShowPasteToolbox(false);
        setClipboardNodes([]);
        setClipboardEdges([]);
      }
    };

    // Reset shift key state when released
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        setIsShiftPressed(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [clipboardNodes, clipboardEdges, edges, isInitialLoad, addToHistory, reactFlowInstance, pasteToolboxPosition, showPasteToolbox]);

  const nodeEditorClass = isSmallScreen ? "w-full max-w-[160px]" : "w-full max-w-[250px]"
  const selectedNode = nodes.find((node) => node.id === selectedNodeId)
  // Loading screen
  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/50 p-8 text-slate-100">
          <div className="flex flex-col items-center">
            <Loader className="w-12 h-12 text-gradient-to-r from-blue-400 to-purple-500 animate-spin mb-4" />
            <p className="text-xl text-slate-200">Loading mind map...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error screen
  if (loadError) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/50 p-8 text-slate-100 max-w-md">
          <div className="flex flex-col items-center text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
            <p className="text-xl mb-4 text-slate-200">{loadError}</p>
            <button
              onClick={() => navigate("/mindmap")}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              Back to Maps
            </button>
          </div>
        </div>
      </div>
    );
  }  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 pt-8">
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
      
      <div className="h-[90vh] bg-gradient-to-br from-slate-800/40 to-slate-900/40 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/30 p-6 text-slate-100 w-[95vw] relative">
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
            className="flex items-center text-slate-400 hover:text-white transition-all duration-200 hover:bg-slate-700/30 rounded-lg px-3 py-2"
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
              className="text-2xl font-bold text-center bg-transparent border-b border-slate-500 focus:outline-none focus:border-blue-500 text-white inline-block"
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
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
              hasUnsavedChanges
                ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white transform hover:scale-105 shadow-lg"
                : "bg-slate-700/50 text-slate-400 cursor-not-allowed"
            }`}
            disabled={!hasUnsavedChanges}
          >
            <Save className="w-5 h-5" />
            {isSmallScreen ? null : <span>Save Changes</span>}
          </button>        </div>

        {/* Banner for playlist selection mode */}
        {isAddingToPlaylist && (
          <div className="mb-2 px-4 py-2 bg-blue-600/20 border border-blue-500/30 rounded-xl text-sm text-blue-300 flex items-center justify-between backdrop-blur-sm">
            <div className="flex items-center">
              <ListMusic className="w-5 h-5 mr-2" />
              <span>Click on any audio, Spotify, SoundCloud, or YouTube video node to add it to the playlist</span>
            </div>
            <button
              onClick={() => toggleAddToPlaylistMode(null)}
              className="px-3 py-1 bg-slate-700/50 text-white rounded-lg hover:bg-slate-600/50 transition-colors text-xs"
            >
              Cancel
            </button>
          </div>
        )}        <div
          ref={reactFlowWrapperRef}
          className={`h-[calc(100%-2rem)] w-full border border-slate-700/50 rounded-xl overflow-hidden relative backdrop-blur-sm ${isShiftPressed ? 'no-text-select' : ''}`}
        ><ReactFlowProvider>
            <ReactFlow
              key={`reactflow-${currentMap?.id || 'default'}`}
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
                  ...node.style,
                  width: node.type === "image" ?
                    (typeof node.width === 'number' ? `${node.width}px` :
                     typeof node.style?.width === 'number' ? `${node.style.width}px` :
                     typeof node.style?.width === 'string' ? node.style.width :
                     "100px") :
                    nodeTypeStyle.width,
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
      ? "#4ade80"
      : dragResistance.isResisting && dragResistance.nearbyNodes.includes(node.id)
        ? "#f59e0b" // Amber color for nodes causing resistance
        : "#374151",
  borderWidth: (isAddingToPlaylist && ((node.type === 'audio' && nodeData.audioUrl) || 
                                       (node.type === 'spotify' && nodeData.spotifyUrl) || 
                                       (node.type === 'soundcloud' && nodeData.soundCloudUrl) ||
                                       (node.type === 'youtube-video' && nodeData.videoUrl)))
    ? "3px"
    : dragResistance.isResisting && dragResistance.nearbyNodes.includes(node.id)
      ? "3px" // Thicker border for nodes causing resistance
      : "2px",
                  border: (node.type === 'audio' || node.type === 'playlist' || node.type === 'spotify' || node.type === 'youtube-video')
                    ? "solid" // Ensure audio, playlist, spotify, and youtube-video nodes always have a border
                    : node.style?.border || nodeTypeStyle.border,
                  whiteSpace: "normal",
                  wordWrap: "break-word",
                  overflowWrap: "break-word",
                  // Add subtle shake animation when resistance is high
                  animation: dragResistance.isResisting && dragResistance.nearbyNodes.includes(node.id) && dragResistance.resistanceStrength > 0.5
                    ? "shake 0.3s ease-in-out infinite"
                    : undefined,
                },
              } as Node;
            })}
            edges={edges.map(edge => {
              // Find the source node to get its color
              const sourceNode = nodes.find(node => node.id === edge.source);
              const sourceNodeColor = sourceNode
                ? ((sourceNode as any).background || sourceNode.style?.background || "#374151")
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
            })}
            nodeTypes={nodeTypes}
            defaultEdgeOptions={{
              type: edgeType === 'default' ? 'default' : edgeType,
              style: {
                strokeWidth: 2,
              },
            }}
            connectionLineStyle={{
              strokeWidth: 2,
            }}
            connectionRadius={8}
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
            minZoom={0.1}
            maxZoom={2}
            elementsSelectable={true}
            selectNodesOnDrag={false}
            zoomOnScroll={!isHoveringPlaylist && !isHoveringAudioVolume}          >            <Background color="#1e293b" gap={20} />
            <Controls />
              {/* Real-time collaboration cursors */}
            <CollaboratorCursors />
            
            {/* Simple animation system - no visual indicators needed */}

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
                  left: pasteToolboxPosition.x - 200,
                  top: pasteToolboxPosition.y - 300,
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
                    <img src="/assets/click/leftclick.svg" alt="Left Click" width="18" height="18" style={{ filter: 'brightness(0) invert(1)' }} />
                  </div>
                  <div
                    className="flex items-center bg-gray-700 transition-colors duration-150 rounded-md px-3 py-1.5 ml-4 cursor-pointer paste-button-right"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                    <img src="/assets/click/rightclick.svg" alt="Right Click" width="18" height="18" style={{ filter: 'brightness(0) invert(1)' }} />
                  </div>
                </div>
              </div>            )}          </ReactFlow>
          </ReactFlowProvider>
          <button
            onClick={handleFullscreen}
            className="absolute top-2 right-2 p-1 bg-gray-700 rounded-full hover:bg-gray-600 transition-colors"
            style={{ zIndex: 10 }}
          >
            <Maximize2 className="w-4 h-4 text-gray-300" />
          </button>

          {/* Edge type dropdown */}
          <div ref={edgeTypeDropdownRef} className="absolute bottom-2 right-12" style={{ zIndex: 10 }}>
            <button
              onClick={() => setShowEdgeTypeDropdown(!showEdgeTypeDropdown)}
              className="p-1 bg-gray-700 rounded-full hover:bg-gray-600 transition-colors"
              title="Edge Type"
            >
              <Network className="w-4 h-4 text-gray-300" />
            </button>

            {showEdgeTypeDropdown && (
              <div className="absolute bottom-full mb-2 right-0 bg-gray-800 border border-gray-600 rounded-lg shadow-lg py-1 min-w-[120px]" style={{ zIndex: 20 }}>
                <button
                  onClick={() => handleEdgeTypeChange('default')}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-700 transition-colors ${
                    edgeType === 'default' ? 'text-sky-400 bg-gray-700/50' : 'text-gray-300'
                  }`}
                >
                  Bezier (Default)
                </button>
                <button
                  onClick={() => handleEdgeTypeChange('smoothstep')}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-700 transition-colors ${
                    edgeType === 'smoothstep' ? 'text-sky-400 bg-gray-700/50' : 'text-gray-300'
                  }`}
                >
                  Smooth Step
                </button>
                <button
                  onClick={() => handleEdgeTypeChange('straight')}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-700 transition-colors ${
                    edgeType === 'straight' ? 'text-sky-400 bg-gray-700/50' : 'text-gray-300'
                  }`}
                >
                  Straight
                </button>
              </div>
            )}
          </div>

          <button
            onClick={() => setShowHelpModal(true)}
            className="absolute bottom-2 right-2 p-1 bg-gray-700 rounded-full hover:bg-gray-600 transition-colors"
            style={{ zIndex: 0 }}
            title="Help"
          >
            <HelpCircle className="w-4 h-4 text-gray-300" />
          </button>
            {/* Collaborators List - positioned in top left area */}
          {currentMap && currentMap.creator && (
            <div className="absolute top-2 left-2" style={{ zIndex: 10 }}>
              <CollaboratorsList
                mindmapId={currentMap.id}
                collaboratorIds={currentMap.collaborators || []}
                creatorId={currentMap.creator}
                className="max-w-xs"
              />
            </div>
          )}
        </div>

        {selectedNodeId && selectedNode && (
          <div className={`fixed bottom-8 right-8 ${nodeEditorClass}`}>
            <div className="relative flex flex-col bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/30 shadow-2xl space-y-4">
              {selectedNode.type === "spotify" ? (
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-green-500/10 rounded-xl">
                      <Music className="w-5 h-5 text-green-400" />
                    </div>
                    <span className="text-slate-200 font-medium">Select a song</span>
                  </div>
                  <SpotifySearch onSelect={(track) => handleSpotifyTrackSelect(selectedNodeId, track)} />
                </div>
              ) : selectedNode.type === "soundcloud" ? (
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-orange-500/10 rounded-xl">
                      <Music className="w-5 h-5 text-orange-400" />
                    </div>
                    <span className="text-slate-200 font-medium">{isSmallScreen ? "SoundCloud" : "SoundCloud URL"}</span>
                  </div>
                  <input
                    type="text"
                    placeholder={isSmallScreen ? "URL" : "Enter SoundCloud URL"}
                    value={selectedNode.data.soundCloudUrl || ""}
                    onChange={(e) => updateNodeLabel(selectedNodeId, e.target.value)}
                    className="px-4 py-3 bg-slate-800/50 text-white border border-slate-600/30 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200"
                  />
                </div>
              ) : selectedNode.type === "youtube-video" ? (
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-red-500/10 rounded-xl">
                      <Youtube className="w-5 h-5 text-red-400" />
                    </div>
                    <span className="text-slate-200 font-medium">Search YouTube Video</span>
                  </div>
                  <YouTubeSearch onSelect={(video) => handleYouTubeVideoSelect(selectedNodeId, video)} />
                </div>
              ) : selectedNode.type === "image" ? (
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-slate-500/10 rounded-xl">
                      <ImageIcon className="w-5 h-5 text-slate-400" />
                    </div>
                    <span className="text-slate-200 font-medium">Change image</span>
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full px-4 py-3 bg-gradient-to-r from-slate-700/50 to-slate-600/50 hover:from-slate-600/50 hover:to-slate-500/50 text-white rounded-xl transition-all duration-200 font-medium border border-slate-600/30 hover:border-slate-500/50"
                  >
                    {selectedNode.data.imageUrl ? 'Replace Image' : 'Choose Image'}
                  </button>
                </div>
              ) : selectedNode.type === "audio" ? (
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-purple-500/10 rounded-xl">
                      <AudioWaveform className="w-5 h-5 text-purple-400" />
                    </div>
                    <span className="text-slate-200 font-medium">
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
                      className="px-4 py-3 bg-slate-800/50 text-white border border-slate-600/30 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200"
                    />
                  ) : (
                    <button
                      onClick={() => audioFileInputRef.current?.click()}
                      className="w-full px-4 py-3 bg-gradient-to-r from-slate-700/50 to-slate-600/50 hover:from-slate-600/50 hover:to-slate-500/50 text-white rounded-xl transition-all duration-200 font-medium border border-slate-600/30 hover:border-slate-500/50"
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
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <ListMusic className="w-4 h-4 text-slate-400" />
                    </div>
                    <input
                      autoFocus
                      type="text"
                      placeholder="Playlist name"
                      value={selectedNode.data.label || ""}
                      onChange={(e) => updateNodeLabel(selectedNodeId, e.target.value)}
                      className="pl-12 pr-4 py-3 bg-slate-800/50 text-white border border-slate-600/30 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200"
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="text-sm text-slate-300 font-medium">Audio tracks:</div>
                    <div
                      className="max-h-[140px] overflow-y-auto bg-slate-800/30 rounded-xl p-2 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent border border-slate-700/30"
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
                        <div className="text-slate-500 text-xs p-3 text-center bg-slate-800/20 rounded-lg border border-slate-700/30">
                          No tracks added to playlist
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Add song button */}
                  <div>
                    {isAddingToPlaylist && activePlaylistNodeId === selectedNodeId ? (
                      <div className="flex flex-col space-y-3">
                        <div className="px-4 py-3 bg-blue-500/10 border border-blue-500/30 rounded-xl text-sm text-blue-300">
                          <p>Click on any audio, Spotify, SoundCloud, or YouTube video node to add it to the playlist</p>
                        </div>
                        <button
                          onClick={() => toggleAddToPlaylistMode(null)}
                          className="w-full px-4 py-3 bg-gradient-to-r from-slate-700/50 to-slate-600/50 hover:from-slate-600/50 hover:to-slate-500/50 text-white rounded-xl transition-all duration-200 font-medium border border-slate-600/30 hover:border-slate-500/50"
                        >
                          Cancel Selection
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => toggleAddToPlaylistMode(selectedNodeId)}
                        className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-xl transition-all duration-200 font-medium flex items-center justify-center shadow-lg shadow-blue-500/25"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add
                      </button>
                    )}
                  </div>
                </div>
              ) : selectedNode.type === "link" ? (
                <div className="space-y-4">
                  <input
                    autoFocus
                    type="text"
                    placeholder="URL"
                    value={selectedNode.data.url || ''}
                    onChange={(e) => updateNodeLabel(selectedNodeId, e.target.value)}
                    className="px-4 py-3 bg-slate-800/50 text-white border border-slate-600/30 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200"
                  />
                  <input
                    type="text"
                    placeholder="Display Text"
                    value={selectedNode.data.displayText || ""}
                    onChange={(e) => updateNodeDisplayText(selectedNodeId, e.target.value)}
                    className="px-4 py-3 bg-slate-800/50 text-white border border-slate-600/30 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200"
                  />
                </div>
              ) : selectedNode.type === "mindmap" ? (
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-500/10 rounded-xl">
                      <Network className="w-5 h-5 text-blue-400" />
                    </div>
                    <span className="text-slate-200 font-medium">Select a Mind Map</span>
                  </div>
                  {!showMindMapSelector ? (
                    <button
                      onClick={() => setShowMindMapSelector(true)}
                      className="w-full px-4 py-3 bg-gradient-to-r from-slate-700/50 to-slate-600/50 hover:from-slate-600/50 hover:to-slate-500/50 text-white rounded-xl text-left transition-all duration-200 font-medium border border-slate-600/30 hover:border-slate-500/50"
                    >
                      {selectedNode.data.mapKey
                        ? maps.find(m => m.key === selectedNode.data.mapKey)?.title || "Select a map"
                        : "Select a map"
                      }
                    </button>                  ) : (                    <MindMapSelector
                      searchTerm={mindMapSearchTerm}
                      setSearchTerm={setMindMapSearchTerm}
                      sortBy={mindMapSortBy}
                      setSortBy={setMindMapSortBy}
                      showCreateForm={showCreateMindMapForm}
                      setShowCreateForm={setShowCreateMindMapForm}
                      newMapTitle={newMindMapTitle}
                      setNewMapTitle={setNewMindMapTitle}
                      onSelectMindMap={handleSelectMindMap}                      onCreateMindMap={handleCreateMindMapAccept}
                      onCancelCreate={handleCreateMindMapReject}
                      isAIConversation={false}
                      onClose={() => setShowMindMapSelector(false)}
                      title="Choose a mindmap"
                      mode="inline"
                      excludeMapId={currentMap?.id}
                    />
                  )}
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
                  className={`px-4 py-3 bg-slate-800/50 text-white border rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 ${
                    selectedNodeId === "1"
                      ? "border-2 border-gradient-to-r from-blue-400 to-blue-600 shadow-lg shadow-blue-500/25"
                      : "border-slate-600/30"
                  }`}
                  style={
                    selectedNodeId === "1"
                      ? {
                          background: "linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(147, 51, 234, 0.1))",
                          borderImage: "linear-gradient(90deg, #60a5fa, #3b82f6)",
                          borderImageSlice: 1,
                        }
                      : {}
                  }
                />
              )}              {/* Root node controls */}
              {selectedNodeId === "1" && (
                <div className="flex justify-center items-center gap-2 pt-2 border-t border-slate-700/30">
                  <button
                    onClick={() => handleDetachConnections(selectedNodeId)}
                    className="p-3 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-xl transition-all duration-200"
                    title="Detach node's connections"
                  >
                    <Unlink className="w-5 h-5" />
                  </button>

                  <div className="relative" ref={colorPickerRef}>
                    <button
                      onClick={() => setShowColorPicker(!showColorPicker)}
                      className="p-3 text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 rounded-xl transition-all duration-200"
                      title="Change node color"
                    >
                      <Palette className="w-5 h-5" />
                    </button>

                    {showColorPicker && (
                      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-[82.5%] mb-2 p-4 bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/30 z-50">
                        <div className="space-y-3">
                          <button
                            onClick={() => {
                              handleDefaultColorChange(selectedNodeId)
                              setShowColorPicker(false)
                            }}
                            className="w-full px-3 py-2 text-sm text-slate-300 hover:bg-slate-700/50 rounded-xl flex items-center space-x-2 transition-all duration-200"
                          >
                            <div className="w-4 h-4 rounded bg-slate-700 border border-slate-600"></div>
                            <span>Default</span>
                          </button>

                          <HexColorPicker
                            color={selectedColor}
                            onChange={(color) => handleColorPickerChange(selectedNodeId, color)}
                            className="w-full h-8 cursor-pointer rounded-xl border border-slate-600/50"
                          />
                          <div className="flex justify-between gap-2">
                            <button
                              onClick={() => handleColorPickerConfirm(selectedNodeId)}
                              className="p-2 text-green-400 hover:text-green-300 hover:bg-green-500/10 rounded-xl transition-all duration-200"
                              title="Confirm color change"
                            >
                              <Check className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleColorPickerCancel(selectedNodeId)}
                              className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-all duration-200"
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
                    onClick={() => setShowAIFillModal(true)}
                    className="p-3 text-green-400 hover:text-green-300 hover:bg-green-500/10 rounded-xl transition-all duration-200"
                    title="AI fill - Generate the entire mindmap automatically"
                  >
                    <Brain className="w-5 h-5" />
                  </button>
                </div>
              )}

              {selectedNodeId !== "1" && (
                <div className="flex justify-center items-center gap-2 pt-2 border-t border-slate-700/30">
                  <button
                    onClick={() => handleDetachConnections(selectedNodeId)}
                    className="p-3 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-xl transition-all duration-200"
                    title="Detach node's connections"
                  >
                    <Unlink className="w-5 h-5" />
                  </button>

                  <div className="relative" ref={colorPickerRef}>
                    <button
                      onClick={() => setShowColorPicker(!showColorPicker)}
                      className="p-3 text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 rounded-xl transition-all duration-200"
                      title="Change node color"
                    >
                      <Palette className="w-5 h-5" />
                    </button>

                    {showColorPicker && (
                      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-[82.5%] mb-2 p-4 bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/30 z-50">
                        <div className="space-y-3">
                          <button
                            onClick={() => {
                              handleDefaultColorChange(selectedNodeId)
                              setShowColorPicker(false)
                            }}
                            className="w-full px-3 py-2 text-sm text-slate-300 hover:bg-slate-700/50 rounded-xl flex items-center space-x-2 transition-all duration-200"
                          >
                            <div className="w-4 h-4 rounded bg-slate-700 border border-slate-600"></div>
                            <span>Default</span>
                          </button>

                          <HexColorPicker
                            color={selectedColor}
                            onChange={(color) => handleColorPickerChange(selectedNodeId, color)}
                            className="w-full h-8 cursor-pointer rounded-xl border border-slate-600/50"
                          />
                          <div className="flex justify-between gap-2">
                            <button
                              onClick={() => handleColorPickerConfirm(selectedNodeId)}
                              className="p-2 text-green-400 hover:text-green-300 hover:bg-green-500/10 rounded-xl transition-all duration-200"
                              title="Confirm color change"
                            >
                              <Check className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleColorPickerCancel(selectedNodeId)}
                              className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-all duration-200"
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
                    onClick={() => setShowAIFillModal(true)}
                    className="p-3 text-green-400 hover:text-green-300 hover:bg-green-500/10 rounded-xl transition-all duration-200"
                    title="AI fill - Add AI-generated child nodes"
                  >
                    <Brain className="w-5 h-5" />
                  </button>

                  <button
                    onClick={() => deleteNodeAndChildren(selectedNodeId)}
                    className="p-3 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-all duration-200"
                    title="Delete node and its children"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
        <ProPopup isOpen={showErrorModal} onClose={() => setShowErrorModal(false)} />        {showUnsavedChangesModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/50 p-8 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center space-x-3 text-amber-400 mb-6">
                <div className="p-2 bg-amber-400/10 rounded-xl">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent">Unsaved Changes</h2>
              </div>
              <p className="text-slate-300 mb-8 leading-relaxed">You have unsaved changes to your mind map. Would you like to save them before leaving?</p>              <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
                <button
                  type="button"
                  onClick={() => handleModalResponse("yes")}
                  className={`px-4 py-2 rounded-xl font-medium transition-all duration-200 ${
                    hasUnsavedChanges 
                      ? "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white shadow-lg hover:shadow-green-500/25 transform hover:scale-105" 
                      : "bg-slate-700/50 text-slate-500 cursor-not-allowed"
                  }`}
                  disabled={!hasUnsavedChanges}
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => handleModalResponse("no")}
                  className="px-4 py-2 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-400 hover:to-rose-500 text-white rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-red-500/25 transform hover:scale-105"
                >
                  Discard Changes
                </button>
                <button
                  type="button"
                  onClick={() => handleModalResponse("cancel")}
                  className="px-4 py-2 text-slate-400 hover:text-slate-100 hover:bg-slate-700/30 rounded-xl font-medium transition-all duration-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
        {showLoginPrompt && (
          <ConditionalLoginPrompt onClose={() => setShowLoginPrompt(false)} />
        )}        {/* AI Fill Modal */}
        {showAIFillModal && (
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onKeyDown={(e) => {
              if (e.key === 'Escape' && !isAIFillLoading) {
                setShowAIFillModal(false);
                setAIFillPrompt("");
                resetProgress();
              }
              if (e.key === 'Enter' && e.ctrlKey && !isAIFillLoading) {
                e.preventDefault();
                handleAIFill();
              }
            }}
          >
            <div className="bg-gray-900 rounded-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center space-x-3 text-green-500 mb-4">
                <Brain className="w-6 h-6" />
                <h2 className="text-xl font-semibold text-gray-100">AI Fill</h2>
              </div>
              
              {/* Progress Display - Only show when loading */}
              {isAIFillLoading && (
                <div className="mb-6">
                  {/* Progress Bar */}
                  <div className="mb-4">                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-300">
                        {generationProgress.stage === 'idle' ? 'Preparing...' : 
                         generationProgress.stage === 'analyzing' ? 'Analyzing' :
                         generationProgress.stage === 'generating' ? 'Generating' :
                         generationProgress.stage === 'processing' ? 'Processing' :
                         generationProgress.stage === 'animating' ? 'Animating' :
                         generationProgress.stage === 'error' ? 'Error' :
                         'Complete'}
                      </span>
                      <span className="text-sm text-gray-400">{Math.round(generationProgress.progress)}%</span>
                    </div>
                    
                    {/* Animated Progress Bar */}
                    <div className="w-full bg-gray-700 rounded-full h-2.5 overflow-hidden">
                      <div                        className={`h-full rounded-full transition-all duration-500 ease-out relative ${
                          generationProgress.isError 
                            ? 'bg-gradient-to-r from-red-500 to-red-600' 
                            : 'bg-gradient-to-r from-sky-400 to-blue-600'
                        }`}
                        style={{ width: `${generationProgress.progress}%` }}
                      >
                        {/* Animated shimmer effect */}
                        <div className={`absolute inset-0 animate-pulse ${
                          generationProgress.isError
                            ? 'bg-gradient-to-r from-transparent via-red-200/20 to-transparent'
                            : 'bg-gradient-to-r from-transparent via-white/20 to-transparent'
                        }`}></div>
                      </div>
                    </div>
                  </div>
                    {/* Status Message */}
                  <div className="text-center">
                    <p className={`mb-2 ${generationProgress.isError ? 'text-red-400' : 'text-gray-300'}`}>
                      {generationProgress.message}
                    </p>
                    
                    {/* Error Recovery Options */}
                    {generationProgress.isError && (
                      <div className="mt-4 p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
                        <div className="text-sm text-red-300 mb-3">
                          Suggestions to resolve this issue:
                        </div>
                        <div className="space-y-2 text-xs text-red-200">
                          <div>• Try a simpler or shorter prompt</div>
                          <div>• Check your internet connection</div>
                          <div>• Wait a moment and try again</div>
                          <div>• Clear the prompt and use automatic generation</div>
                        </div>
                        <button
                          onClick={() => {
                            resetProgress();
                            setIsAIFillLoading(false);
                          }}
                          className="mt-3 px-3 py-1 bg-red-600/20 hover:bg-red-600/30 border border-red-500/50 rounded text-xs text-red-300 transition-colors"
                        >
                          Try Again
                        </button>
                      </div>
                    )}
                      {/* Node Progress Display */}
                    {!generationProgress.isError && generationProgress.totalNodes > 0 && (
                      <div className="text-sm text-gray-400">
                        {generationProgress.stage === 'animating' ? (
                          <>Animated {generationProgress.nodesGenerated} of {generationProgress.totalNodes} nodes</>
                        ) : generationProgress.stage === 'processing' && generationProgress.totalNodes > 0 ? (
                          <>Processing {generationProgress.totalNodes} new nodes</>
                        ) : null}
                      </div>
                    )}
                  </div>{/* Loading Animation */}
                  <div className="flex justify-center mt-4">
                    {generationProgress.isError ? (
                      <div className="relative">
                        {/* Error icon */}
                        <div className="rounded-full h-8 w-8 border-2 border-red-500 bg-red-500/10 flex items-center justify-center">
                          <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </div>
                      </div>
                    ) : generationProgress.stage === 'complete' && generationProgress.progress === 100 ? (
                      <div className="relative">
                        {/* Success checkmark with celebration animation */}
                        <div className="rounded-full h-8 w-8 border-2 border-green-500 bg-green-500/10 flex items-center justify-center animate-pulse">
                          <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        {/* Celebration particles */}
                        <div className="absolute inset-0 pointer-events-none">
                          {[...Array(6)].map((_, i) => (
                            <div
                              key={i}
                              className="absolute w-1 h-1 bg-green-400 rounded-full animate-ping"
                              style={{
                                left: `${50 + 25 * Math.cos((i * 60) * Math.PI / 180)}%`,
                                top: `${50 + 25 * Math.sin((i * 60) * Math.PI / 180)}%`,
                                animationDelay: `${i * 0.1}s`,
                                animationDuration: '1s'
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="relative">
                        {/* Spinning brain icon */}
                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
                        <Brain className="w-4 h-4 text-blue-400 absolute inset-0 m-auto animate-pulse" />
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Form Content - Hide when loading */}
              {!isAIFillLoading && (
                <>
                  <p className="text-gray-300 mb-4">
                    {(() => {
                      if (selectedNodeId === "1") {
                        return "Generate an entire mindmap structure automatically";
                      } else {
                        const selectedNode = nodes.find(n => n.id === selectedNodeId);
                        const childNodes = nodes.filter(node => 
                          edges.some(edge => edge.source === selectedNodeId && edge.target === node.id)
                        );
                        const hasChildren = childNodes.length > 0;
                        
                        if (hasChildren) {
                          return `Add AI-generated content to the "${selectedNode?.data?.label}" branch. This node already has ${childNodes.length} child node(s). AI will intelligently expand the existing structure.`;
                        } else {
                          return `Add AI-generated child nodes to the "${selectedNode?.data?.label}" branch`;
                        }
                      }
                    })()}
                  </p>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Instructions (optional)
                    </label>
                    <textarea
                      value={aiFillPrompt}
                      onChange={(e) => setAIFillPrompt(e.target.value)}
                      placeholder={(() => {
                        if (selectedNodeId === "1") {
                          return "Describe what kind of mindmap you want to create...";
                        } else {
                          const selectedNode = nodes.find(n => n.id === selectedNodeId);
                          const childNodes = nodes.filter(node => 
                            edges.some(edge => edge.source === selectedNodeId && edge.target === node.id)
                          );
                          const hasChildren = childNodes.length > 0;
                          
                          if (hasChildren) {
                            return `Describe how to expand the existing structure under "${selectedNode?.data?.label}" (currently has ${childNodes.length} child nodes)...`;
                          } else {
                            return `Describe what content should be added to the "${selectedNode?.data?.label}" branch...`;
                          }
                        }
                      })()}
                      className="w-full px-3 py-2 bg-gray-800 text-white border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                      rows={3}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Leave empty for automatic content generation
                    </p>
                  </div>
                  
                  {/* Context information for hierarchical expansion */}
                  {selectedNodeId !== "1" && (() => {
                    const selectedNode = nodes.find(n => n.id === selectedNodeId);
                    const childNodes = nodes.filter(node => 
                      edges.some(edge => edge.source === selectedNodeId && edge.target === node.id)
                    );
                    const hasChildren = childNodes.length > 0;
                    
                    if (hasChildren) {
                      return (
                        <div className="mb-4 p-3 bg-gray-800 rounded-lg border border-gray-700">
                          <div className="text-sm text-gray-300 mb-2">
                            <span className="font-medium text-blue-400">Context:</span> Current structure under "{selectedNode?.data?.label}"
                          </div>
                          <div className="text-xs text-gray-400">
                            Existing children: {childNodes.map(child => `"${child.data?.label}"`).join(', ')}
                          </div>
                          <div className="text-xs text-gray-500 mt-2">
                            AI will intelligently expand this structure by adding complementary content
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </>
              )}
              
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAIFillModal(false);
                    setAIFillPrompt("");
                    resetProgress();
                  }}
                  className="px-4 py-2 text-gray-400 hover:text-gray-100 transition-colors"
                  disabled={isAIFillLoading}
                >
                  {isAIFillLoading ? 'Processing...' : 'Cancel'}
                </button>
                
                {!isAIFillLoading && (
                  <button
                    type="button"
                    onClick={handleAIFill}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    <Brain className="w-4 h-4 mr-2" />
                    Generate
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        <MindMapHelpModal isOpen={showHelpModal} onClose={() => setShowHelpModal(false)} />
      </div>
    </div>
  )
}
