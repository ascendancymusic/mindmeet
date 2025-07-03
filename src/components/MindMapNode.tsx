import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { Handle, Position } from 'reactflow';
import ReactFlow, { ReactFlowProvider, ReactFlowInstance } from 'reactflow';
import 'reactflow/dist/style.css';
import { Network, Eye, EyeOff, Loader, Link } from 'lucide-react';
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
import { prepareNodesForRendering } from "../utils/reactFlowUtils";
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
    mapKey?: string; // Use mapKey as the primary identifier
    mapId?: string;  // Keep for backward compatibility (will be removed in future)
  };
  isConnectable: boolean;
}

const MindMapNode: React.FC<MindMapNodeProps> = ({ id, data }) => {
  const { maps } = useMindMapStore();
  const { user } = useAuthStore();
  const [selectedMap, setSelectedMap] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [mapCreator, setMapCreator] = useState<string | null>(null);
  const [creatorUsername, setCreatorUsername] = useState<string | null>(null);
  const [creatorAvatarUrl, setCreatorAvatarUrl] = useState<string | null>(null);
  const reactFlowRef = useRef<ReactFlowInstance | null>(null);
  const navigate = useNavigate();

  // Memoized nodes and edges to prevent unnecessary ReactFlow re-renders
  const memoizedNodes = useMemo(() => {
    if (!selectedMap?.nodes || selectedMap.nodes.length === 0) return [];
    return prepareNodesForRendering(selectedMap.nodes);
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
    const fetchMapData = async () => {
      // Determine which identifier to use (prioritize mapKey, fallback to mapId for backward compatibility)
      const useKey = !!data.mapKey;
      const mapIdentifier = data.mapKey || data.mapId;

      if (!mapIdentifier) {
        setSelectedMap(null);
        return;
      }

      // First try to find the map in the local store
      const localMap = useKey
        ? maps.find(m => m.key === data.mapKey)
        : maps.find(m => m.id === data.mapId);

      if (localMap) {
        setSelectedMap(localMap);

        // For maps from the local store, we need to fetch the creator info from Supabase
        try {
          const { data: mapData, error: mapError } = await supabase
            .from('mindmaps')
            .select('creator')
            .eq(useKey ? 'key' : 'id', mapIdentifier)
            .single();

          if (!mapError && mapData?.creator) {
            setMapCreator(mapData.creator);

            // Fetch the creator's username
            const { data: profileData, error: profileError } = await supabase
              .from('profiles')
              .select('username, full_name, avatar_url')
              .eq('id', mapData.creator)
              .single();

            if (!profileError && profileData?.username) {
              setCreatorUsername(profileData.username);
              setCreatorAvatarUrl(profileData.avatar_url);
            }
          }
        } catch (err) {
          console.error('Error fetching creator info for local map:', err);
        }
        return;
      }

      // If not found locally, fetch from Supabase
      setIsLoading(true);
      try {
        const { data: mapData, error } = await supabase
          .from('mindmaps')
          .select('id, key, title, json_data, visibility, creator')
          .eq(useKey ? 'key' : 'id', mapIdentifier)
          .single();

        if (error) {
          console.error(`Error fetching mindmap by ${useKey ? 'key' : 'id'}:`, error);
          setIsLoading(false);
          return;
        }

        if (mapData) {
          const processedMap = {
            id: mapData.id,
            key: mapData.key,
            title: mapData.title,
            nodes: mapData.json_data.nodes || [],
            edges: mapData.json_data.edges || [],
            edgeType: mapData.json_data.edgeType || 'default',
            visibility: mapData.visibility || 'private',
            creator: mapData.creator
          };

          setSelectedMap(processedMap);
          setMapCreator(mapData.creator);

          // Fetch the creator's username
          if (mapData.creator) {
            const { data: profileData, error: profileError } = await supabase
              .from('profiles')
              .select('username, full_name, avatar_url')
              .eq('id', mapData.creator)
              .single();

            if (!profileError && profileData?.username) {
              setCreatorUsername(profileData.username);
              setCreatorAvatarUrl(profileData.avatar_url);
            }
          }
        }
      } catch (err) {
        console.error('Error in fetchMapData:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMapData();
  }, [data.mapKey, data.mapId, maps]);

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
        navigate(`/${user.username}/${selectedMap.id}/edit`);
      } else if (creatorUsername) {
        // If we already have the creator's username, navigate directly
        navigate(`/${creatorUsername}/${selectedMap.id}`);
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
              navigate(`/${profileData.username}/${selectedMap.id}`);
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

  return (
    <div className="relative min-w-[320px] bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl rounded-2xl overflow-visible border border-slate-700/30 transition-all duration-300 hover:border-slate-600/50">
      <Handle
        type="target"
        position={Position.Top}
        id={`${id}-target`}
        className="!top-[-12px] !bg-sky-400 !border-1 !border-gray-700 !w-3 !h-3"
      />
      <div className="p-4">
        {isLoading ? (
          <>
            {/* Reserve exact space for header to prevent layout shift */}
            <div className="mb-4 p-3 border-b border-slate-700/30 bg-gradient-to-r from-slate-800/30 to-slate-700/20 rounded-xl -mx-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-700/50 animate-pulse"></div>
                  <div className="flex-1 min-w-0">
                    <div className="w-24 h-4 bg-slate-700/50 rounded animate-pulse mb-1"></div>
                    <div className="w-16 h-3 bg-slate-700/50 rounded animate-pulse"></div>
                  </div>
                </div>
                <div className="w-4 h-4 bg-slate-700/50 rounded animate-pulse"></div>
              </div>
            </div>
            {/* Reserve space for mindmap container */}
            <div className="h-[200px] border border-slate-700/50 rounded-xl overflow-hidden flex items-center justify-center bg-gradient-to-br from-slate-900/80 to-slate-800/80">
              <div className="flex flex-col items-center text-slate-400">
                <Loader className="w-8 h-8 mb-2 animate-spin" />
                <span>Loading mindmap...</span>
              </div>
            </div>
          </>
        ) : selectedMap ? (
          <>
            {/* Header with creator info */}
            <div className="mb-4 p-3 border-b border-slate-700/30 bg-gradient-to-r from-slate-800/30 to-slate-700/20 rounded-xl -mx-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 flex-shrink-0 overflow-hidden ring-2 ring-slate-600/50 transition-all duration-300">
                      {creatorAvatarUrl ? (
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
                    {creatorUsername && (
                      <p className="text-xs text-slate-400">
                        @{creatorUsername}
                      </p>
                    )}
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
} as const;

export { MindMapNode, nodeTypes };

