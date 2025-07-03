import React, { useEffect, useState, useRef, useCallback } from 'react';
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
import defaultNodeStyles from "../config/defaultNodeStyles";
import { supabase } from '../supabaseClient';

const CustomBackground = () => {
  return (
    <div className="absolute inset-0 bg-gray-900/50 rounded-lg" style={{zIndex: -1}}></div>
  );
};

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
  const reactFlowRef = useRef<ReactFlowInstance | null>(null);
  const navigate = useNavigate();

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
              .select('username')
              .eq('id', mapData.creator)
              .single();

            if (!profileError && profileData?.username) {
              setCreatorUsername(profileData.username);
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
              .select('username')
              .eq('id', mapData.creator)
              .single();

            if (!profileError && profileData?.username) {
              setCreatorUsername(profileData.username);
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
              .select('username')
              .eq('id', mapCreator)
              .single();

            if (!error && profileData?.username) {
              setCreatorUsername(profileData.username);
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
    <div className="relative w-[300px] bg-gray-800/50 rounded-lg overflow-visible">
      <Handle
        type="target"
        position={Position.Top}
        id={`${id}-target`}
        className="!top-[-12px] !bg-sky-400 !border-1 !border-gray-700 !w-3 !h-3"
      />
      <div className="p-2">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-[230px] text-gray-500">
            <Loader className="w-8 h-8 mb-2 animate-spin" />
            <span>Loading mindmap...</span>
          </div>
        ) : selectedMap ? (
          <>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Network className="w-4 h-4 text-sky-400" />
                <h3 className="text-sm font-medium text-gray-200 truncate">
                  {selectedMap.title}
                </h3>
              </div>
              {selectedMap.visibility === 'public' ? (
                <Eye className="w-4 h-4 text-gray-400" />
              ) : selectedMap.visibility === 'linkOnly' ? (
                <Link className="w-4 h-4 text-gray-400" />
              ) : (
                <EyeOff className="w-4 h-4 text-gray-400" />
              )}
            </div>
            <div
              className="h-[200px] border border-gray-700 rounded-lg overflow-hidden cursor-pointer hover:border-sky-500/50 transition-all duration-300"
              onClick={handleClick}
            >
              <ReactFlowProvider>
                <ReactFlow
                  nodes={selectedMap.nodes.map((node: any) => ({
                    ...node,
                    style: {
                      ...(defaultNodeStyles[node.type as keyof typeof defaultNodeStyles] || defaultNodeStyles.default), // Apply default styles based on node type
                      ...node.style, // Override with existing styles if present
                      background: node.background || node.style?.background ||
                        (defaultNodeStyles[node.type as keyof typeof defaultNodeStyles] || defaultNodeStyles.default).background, // Prioritize saved background
                      width: node.type === 'link' ? 'auto' : node.style?.width ||
                        (defaultNodeStyles[node.type as keyof typeof defaultNodeStyles] || defaultNodeStyles.default).width,
                    },
                  }))}
                  edges={selectedMap.edges.map((edge: any) => {
                    // Find the source node to get its color
                    const sourceNode = selectedMap.nodes.find((node: any) => node.id === edge.source);
                    const sourceNodeColor = sourceNode
                      ? (sourceNode.background || sourceNode.style?.background || "#374151")
                      : "#374151";

                    // Get edgeType from selectedMap, default to 'default' if not valid
                    const edgeType = ['default', 'straight', 'smoothstep'].includes(selectedMap.edgeType)
                      ? selectedMap.edgeType
                      : 'default';

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
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-[230px] text-gray-500">
            <Network className="w-8 h-8 mb-2" />
            <span>Choose a mindmap</span>
          </div>
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
