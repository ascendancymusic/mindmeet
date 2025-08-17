import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { Handle, Position } from 'reactflow';
import ReactFlow, { ReactFlowProvider, ReactFlowInstance } from 'reactflow';
import 'reactflow/dist/style.css';
import { Network, Eye, EyeOff, Link } from 'lucide-react';
import { useMindMapStore } from '../store/mindMapStore';
import { useAuthStore } from '../store/authStore';
import { SpotifyLiteNode } from './SpotifyLiteNode';
import { SoundCloudLiteNode } from './SoundCloudLiteNode';
import { YouTubeLiteNode } from './YouTubeLiteNode';
import { ImageNode } from './ImageNode';
import { AudioLiteNode } from './AudioLiteNode';
import { PlaylistLiteNode } from './PlaylistLiteNode';
import { SocialMediaNode } from './SocialMediaNode';
import { LinkNode } from './LinkNode';
import { useNavigate } from 'react-router-dom';
import { TextNoBgNode } from "../components/TextNoBgNode";
import { prepareNodesForRendering } from "../utils/reactFlowUtils";
import { processNodesForTextRendering } from "../utils/textNodeUtils";
import { supabase } from '../supabaseClient';

const CustomBackground = React.memo(() => {
  return (
    <div className="absolute inset-0 bg-gradient-to-br from-slate-900/60 via-slate-800/40 to-slate-900/60 rounded-lg backdrop-blur-sm" style={{zIndex: -1}}></div>
  );
});

interface MindMapNodeProps {
  id: string;
  data: {
    label: string;
    mapId?: string; // Use mapId as the primary identifier
    mapKey?: string;  // Keep for backward compatibility (will be removed in future)
  };
  isConnectable: boolean;
  onContextMenu?: (event: React.MouseEvent, nodeId: string) => void;
}

const MindMapNode: React.FC<MindMapNodeProps> = ({ id, data, onContextMenu }) => {
  const { maps } = useMindMapStore();
  const { user } = useAuthStore();
  const [selectedMap, setSelectedMap] = useState<any>(null);
  const [mapCreator, setMapCreator] = useState<string | null>(null);
  const [creatorUsername, setCreatorUsername] = useState<string | null>(null);
  const [creatorAvatarUrl, setCreatorAvatarUrl] = useState<string | null>(null);
  const [isLoadingCreator, setIsLoadingCreator] = useState<boolean>(false);
  const reactFlowRef = useRef<ReactFlowInstance | null>(null);
  const navigate = useNavigate();

  // Memoized nodes and edges to prevent unnecessary ReactFlow re-renders
  const memoizedNodes = useMemo(() => {
    if (!selectedMap?.nodes || selectedMap.nodes.length === 0) return [];
    return processNodesForTextRendering(prepareNodesForRendering(selectedMap.nodes));
  }, [selectedMap?.nodes]);

  const memoizedEdges = useMemo(() => {
    if (!selectedMap?.edges) return [];

    // Get edgeType from selectedMap, default to 'default' if not valid
    const edgeType = ['default', 'straight', 'smoothstep'].includes(selectedMap.edgeType)
      ? selectedMap.edgeType
      : 'default';

    return selectedMap.edges.map((edge: any) => {
      // Find the source node to get its color
      const sourceNode = selectedMap.nodes.find((node: any) => node.id === edge.source);
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
  }, [selectedMap?.edges, selectedMap?.nodes, selectedMap?.edgeType]);

  useEffect(() => {
    // Simply find the map in the store without any fetching
    const useId = !!data.mapId;
    const mapIdentifier = data.mapId || data.mapKey;

    if (!mapIdentifier) {
      setSelectedMap(null);
      return;
    }

    // Find the map in the local store
    const localMap = useId
      ? maps.find(m => m.id === data.mapId)
      : maps.find(m => m.id === data.mapKey); // Changed from permalink to id

    if (localMap) {
      setSelectedMap(localMap);
      // Use existing map data that already includes creator info
      setMapCreator(localMap.creator || null);
    } else {
      setSelectedMap(null);
    }
  }, [data.mapId, data.mapKey, maps]);

  // Fetch creator profile info when we have a selected map with creator
  useEffect(() => {
    const fetchCreatorProfile = async () => {
      if (!selectedMap?.creator) {
        setCreatorUsername(null);
        setCreatorAvatarUrl(null);
        setIsLoadingCreator(false);
        return;
      }

      setIsLoadingCreator(true);
      try {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('username, full_name, avatar_url')
          .eq('id', selectedMap.creator)
          .single();

        if (!profileError && profileData?.username) {
          setCreatorUsername(profileData.username);
          setCreatorAvatarUrl(profileData.avatar_url);
        }
      } catch (err) {
        console.error('Error fetching creator profile:', err);
      } finally {
        setIsLoadingCreator(false);
      }
    };

    fetchCreatorProfile();
  }, [selectedMap?.creator]);

  const handleResize = useCallback(() => {
    if (reactFlowRef.current) {
      reactFlowRef.current.fitView();
    }
  }, []);

  useEffect(() => {
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

  const onInit = useCallback((instance: ReactFlowInstance) => {
    reactFlowRef.current = instance;
  }, []);

  useEffect(() => {
    if (reactFlowRef.current) {
      reactFlowRef.current.fitView();
    }
  }, [selectedMap]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedMap) {
      if (user?.id === mapCreator && user?.username) {
        // If current user is the creator, navigate to edit page
        navigate(`/${user.username}/${selectedMap.permalink}/edit`);
      } else if (creatorUsername) {
        // If we already have the creator's username, navigate directly
        navigate(`/${creatorUsername}/${selectedMap.permalink}`);
      } else if (mapCreator) {
        // Otherwise, fetch the creator's username and navigate to view page
        const fetchCreatorUsername = async () => {
          try {
            const { data: profileData, error } = await supabase
              .from('profiles')
              .select('username, full_name, avatar_url')
              .eq('id', mapCreator)
              .single();

            if (!error && profileData?.username) {
              setCreatorUsername(profileData.username);
              setCreatorAvatarUrl(profileData.avatar_url);
              navigate(`/${profileData.username}/${selectedMap.permalink}`);
            } else {
              console.error('Could not find username for creator:', mapCreator);
            }
          } catch (err) {
            console.error('Error fetching creator username:', err);
          }
        };
        fetchCreatorUsername();
      } else {
        console.error('No map creator information available');
      }
    }
  };

  const handleContextMenu = (event: React.MouseEvent) => {
    if (onContextMenu) {
      onContextMenu(event, id);
    }
  };

  return (
    <div className="relative min-w-[320px] bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl rounded-2xl overflow-visible border border-slate-700/30 transition-all duration-300 hover:border-slate-600/50" onContextMenu={handleContextMenu}>
      <Handle
        type="target"
        position={Position.Top}
        id={`${id}-target`}
        className="!top-[-12px] !bg-sky-400 !border-1 !border-gray-700 !w-3 !h-3"
      />
      <div className="p-4">
        {selectedMap ? (
          <>
            {/* Header with creator info */}
            <div className="mb-4 p-3 border-b border-slate-700/30 bg-gradient-to-r from-slate-800/30 to-slate-700/20 rounded-xl -mx-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 flex-shrink-0 overflow-hidden ring-2 ring-slate-600/50 transition-all duration-300">
                      {isLoadingCreator ? (
                        <div className="w-full h-full flex items-center justify-center animate-pulse bg-slate-700/60">
                          <div className="w-3 h-3 bg-slate-500 rounded-full"></div>
                        </div>
                      ) : creatorAvatarUrl ? (
                        <img src={creatorAvatarUrl} alt={creatorUsername || 'User'} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-200 font-semibold text-xs">
                          {(creatorUsername || 'U').charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-slate-200 truncate">
                      {selectedMap.title}
                    </h3>
                    {isLoadingCreator ? (
                      <div className="w-20 h-3 bg-slate-700/60 rounded animate-pulse mt-1"></div>
                    ) : creatorUsername ? (
                      <p className="text-xs text-slate-400">
                        @{creatorUsername}
                      </p>
                    ) : null}
                  </div>
                </div>
                {selectedMap.visibility === 'public' ? (
                  <Eye className="w-4 h-4 text-slate-400 flex-shrink-0" />
                ) : selectedMap.visibility === 'linkOnly' ? (
                  <Link className="w-4 h-4 text-slate-400 flex-shrink-0" />
                ) : (
                  <EyeOff className="w-4 h-4 text-slate-400 flex-shrink-0" />
                )}
              </div>
            </div>
            
            {memoizedNodes.length > 0 ? (
              <div
                className="h-[200px] border border-slate-700/50 rounded-xl overflow-hidden cursor-pointer hover:border-sky-500/50 transition-all duration-300 bg-gradient-to-br from-slate-900/80 to-slate-800/80 backdrop-blur-sm"
                onClick={handleClick}
              >
                <ReactFlowProvider>
                  <ReactFlow
                    nodes={memoizedNodes}
                    edges={memoizedEdges}
                    nodeTypes={nodeTypes as any}
                    fitView
                    nodesDraggable={false}
                    nodesConnectable={false}
                    elementsSelectable={false}
                    zoomOnScroll={false}
                    zoomOnDoubleClick={false}
                    minZoom={0.1}
                    maxZoom={2}
                    onInit={onInit}
                    proOptions={{ hideAttribution: true }}
                    className="react-flow-instance"
                  >
                    <CustomBackground />
                  </ReactFlow>
                </ReactFlowProvider>
              </div>
            ) : (
              <div
                className="h-[200px] border border-slate-700/50 rounded-xl overflow-hidden flex items-center justify-center cursor-pointer hover:border-sky-500/50 transition-all duration-300 bg-gradient-to-br from-slate-900/80 to-slate-800/80"
                onClick={handleClick}
              >
                <div className="flex flex-col items-center justify-center text-slate-400">
                  <EyeOff className="w-8 h-8 mb-2" />
                  <span>Private mindmap</span>
                  <span className="text-xs mt-1 text-slate-500">Click to request access</span>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Reserve exact space for header */}
            <div className="mb-4 p-3 border-b border-slate-700/30 bg-gradient-to-r from-slate-800/30 to-slate-700/20 rounded-xl -mx-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Network className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-slate-400">Choose a mindmap</span>
                  </div>
                </div>
              </div>
            </div>
            {/* Reserve space for mindmap container */}
            <div className="h-[200px] border border-slate-700/50 rounded-xl overflow-hidden flex items-center justify-center bg-gradient-to-br from-slate-900/80 to-slate-800/80">
              <div className="flex flex-col items-center text-slate-400">
                <Network className="w-8 h-8 mb-2" />
                <span>Choose a mindmap</span>
              </div>
            </div>
          </>
        )}
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        id={`${id}-source`}
        className="!bottom-[-12px] !bg-sky-400 !border-1 !border-gray-700 !w-3 !h-3"
      />
    </div>
  );
};

const nodeTypes = {
  spotify: SpotifyLiteNode,
  soundcloud: SoundCloudLiteNode,
  'youtube-video': YouTubeLiteNode,
  'text-no-bg':TextNoBgNode,
  image: ImageNode,
  audio: AudioLiteNode,
  playlist: PlaylistLiteNode,
  instagram: SocialMediaNode,
  twitter: SocialMediaNode,
  facebook: SocialMediaNode,
  youtube: SocialMediaNode,
  tiktok: SocialMediaNode,
  mindmeet: SocialMediaNode,
  link: LinkNode,
  mindmap: MindMapNode,
} as const;

export { MindMapNode, nodeTypes };

