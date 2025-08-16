import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import ReactFlow, { ReactFlowProvider, ReactFlowInstance } from 'reactflow';
import 'reactflow/dist/style.css';
import { Network, Eye, EyeOff, Link } from 'lucide-react';
import { useMindMapStore } from '../store/mindMapStore';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import { prepareNodesForRendering } from "../utils/reactFlowUtils";
import { processNodesForTextRendering } from "../utils/textNodeUtils";
import { supabase } from '../supabaseClient';
import { nodeTypes } from '../config/nodeTypes';

const CustomBackground = React.memo(() => {
  return (
    <div className="absolute inset-0 bg-gradient-to-br from-slate-900/60 via-slate-800/40 to-slate-900/60 rounded-lg backdrop-blur-sm" style={{zIndex: -1}}></div>
  );
});

interface MindMapNodeProps {
  id: string;
  data: {
    label: string;
    mapId?: string;
  };
  isConnectable: boolean;
}

const ChatMindMapNode: React.FC<MindMapNodeProps> = React.memo(({ data }) => {
  const { maps } = useMindMapStore();
  const { user } = useAuthStore();
  const [selectedMap, setSelectedMap] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [mapCreator, setMapCreator] = useState<string | null>(null);
  const [creatorUsername, setCreatorUsername] = useState<string | null>(null);
  const [creatorAvatarUrl, setCreatorAvatarUrl] = useState<string | null>(null);
  const reactFlowRef = useRef<ReactFlowInstance | null>(null);
  const navigate = useNavigate();
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);

  // Debounce refresh to prevent rapid updates
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const refreshMap = useCallback(async () => {
    if (!data.mapId || isLoading) return;

    // Clear any pending refresh
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }

    refreshTimeoutRef.current = setTimeout(async () => {
      try {
        setIsLoading(true);
        const { data: mapData, error } = await supabase
          .from('mindmaps')
          .select('permalink, title, json_data, visibility, creator, key')
          .eq('permalink', data.mapId)
          .single();

        if (!error && mapData) {
          const processedMap = {
            permalink: mapData.permalink,
            title: mapData.title,
            nodes: mapData.json_data.nodes || [],
            edges: mapData.json_data.edges || [],
            edgeType: mapData.json_data.edgeType || 'default',
            visibility: mapData.visibility || 'private',
            creator: mapData.creator
          };

          setSelectedMap(processedMap);
          console.log('Mindmap refreshed successfully:', mapData.permalink);
        }
      } catch (err) {
        console.error('Error refreshing mindmap:', err);
      } finally {
        setIsLoading(false);
      }
    }, 300); // 300ms debounce
  }, [data.mapId, isLoading]);

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
    const fetchMapData = async () => {
      if (!data.mapId) {
        setSelectedMap(null);
        setIsInitialized(true);
        return;
      }

      const localMap = maps.find(m => m.permalink === data.mapId);
      if (localMap) {
        setSelectedMap(localMap);

        try {
          const { data: mapData, error: mapError } = await supabase
            .from('mindmaps')
            .select('creator')
            .eq('permalink', data.mapId)
            .single();

          if (!mapError && mapData?.creator) {
            setMapCreator(mapData.creator);

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
        setIsInitialized(true);
        return;
      }

      setIsLoading(true);
      try {
        const { data: mapDataByKey, error: keyError } = await supabase
          .from('mindmaps')
          .select('permalink, title, json_data, visibility, creator, key')
          .eq('key', data.mapId)
          .single();

        if (!keyError && mapDataByKey) {
          const isAccessible = mapDataByKey.visibility === 'public' ||
                              (mapDataByKey.visibility === 'linkOnly') ||
                              (mapDataByKey.creator === user?.id);

          if (isAccessible) {
            const processedMap = {
              permalink: mapDataByKey.permalink,
              title: mapDataByKey.title,
              nodes: mapDataByKey.json_data.nodes || [],
              edges: mapDataByKey.json_data.edges || [],
              edgeType: mapDataByKey.json_data.edgeType || 'default',
              visibility: mapDataByKey.visibility || 'private',
              creator: mapDataByKey.creator
            };

            setSelectedMap(processedMap);
            setMapCreator(mapDataByKey.creator);

            if (mapDataByKey.creator) {
              const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('username, full_name, avatar_url')
                .eq('id', mapDataByKey.creator)
                .single();

              if (!profileError && profileData?.username) {
                setCreatorUsername(profileData.username);
                setCreatorAvatarUrl(profileData.avatar_url);
              }
            }
          } else {
            setSelectedMap({
              permalink: mapDataByKey.permalink,
              title: mapDataByKey.title,
              nodes: [],
              edges: [],
              visibility: 'private',
              creator: mapDataByKey.creator
            });
            setMapCreator(mapDataByKey.creator);
          }

          setIsLoading(false);
          setIsInitialized(true);
          return;
        }

        const { data: mapData, error } = await supabase
          .from('mindmaps')
          .select('permalink, title, json_data, visibility, creator')
          .eq('permalink', data.mapId)
          .single();

        if (error) {
          console.error('Error fetching mindmap:', error);
          setIsLoading(false);
          setIsInitialized(true);
          return;
        }

        if (mapData) {
          const isAccessible = mapData.visibility === 'public' ||
                              (mapData.visibility === 'linkOnly') ||
                              (mapData.creator === user?.id);

          if (isAccessible) {
            const processedMap = {
              permalink: mapData.permalink,
              title: mapData.title,
              nodes: mapData.json_data.nodes || [],
              edges: mapData.json_data.edges || [],
              edgeType: mapData.json_data.edgeType || 'default',
              visibility: mapData.visibility || 'private',
              creator: mapData.creator
            };

            setSelectedMap(processedMap);
            setMapCreator(mapData.creator);
          } else {
            setSelectedMap({
              permalink: mapData.permalink,
              title: mapData.title,
              nodes: [],
              edges: [],
              visibility: 'private',
              creator: mapData.creator
            });
            setMapCreator(mapData.creator);
          }

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
        setIsInitialized(true);
      }
    };

    fetchMapData();
  }, [data.mapId, maps, user?.id, refreshKey]);

  const handleResize = useCallback(() => {
    if (reactFlowRef.current && isInitialized) {
      setTimeout(() => {
        reactFlowRef.current?.fitView({ padding: 0.1 });
      }, 100);
    }
  }, [isInitialized]);

  useEffect(() => {
    window.addEventListener('resize', handleResize);

    const handleMindmapUpdated = (event: CustomEvent) => {
      const { mapId } = event.detail;
      if (mapId === data.mapId) {
        console.log('Detected mindmap update event for:', mapId);
        setRefreshKey(prev => prev + 1);
        refreshMap();
      }
    };

    window.addEventListener('mindmap-updated', handleMindmapUpdated as EventListener);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mindmap-updated', handleMindmapUpdated as EventListener);
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [handleResize, data.mapId, refreshMap]);

  const onInit = useCallback((instance: ReactFlowInstance) => {
    reactFlowRef.current = instance;
    // Fit view after initialization
    setTimeout(() => {
      instance.fitView({ padding: 0.1 });
    }, 100);
  }, []);

  // Fit view when nodes change, but debounced
  useEffect(() => {
    if (reactFlowRef.current && memoizedNodes.length > 0 && isInitialized) {
      const timeout = setTimeout(() => {
        reactFlowRef.current?.fitView({ padding: 0.1 });
      }, 200);
      return () => clearTimeout(timeout);
    }
  }, [memoizedNodes, isInitialized]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedMap) {
      if (user?.id === mapCreator && user?.username) {
        navigate(`/${user.username}/${selectedMap.permalink}/edit`);
      } else if (creatorUsername) {
        navigate(`/${creatorUsername}/${selectedMap.permalink}`);
      } else if (mapCreator) {
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
  }, [selectedMap, user?.id, user?.username, mapCreator, creatorUsername, navigate]);

  // Don't render anything until initialization is complete
  if (!isInitialized) {
    return (
      <ReactFlowProvider>
        <div className="relative min-w-[320px] bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl rounded-2xl overflow-hidden border border-slate-700/30">
          <div className="p-4">
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
                <div className="w-8 h-8 mb-2 rounded-full bg-slate-700/50 animate-pulse"></div>
                <div className="w-20 h-3 bg-slate-700/50 rounded animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
      </ReactFlowProvider>
    );
  }

  return (
    <ReactFlowProvider>
      <div className="relative min-w-[320px] bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl rounded-2xl overflow-hidden border border-slate-700/30 transition-all duration-300 hover:border-slate-600/50">
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
                  <div className="w-8 h-8 mb-2 rounded-full bg-slate-700/50 animate-pulse"></div>
                  <div className="w-20 h-3 bg-slate-700/50 rounded animate-pulse"></div>
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
                    key={`${selectedMap.id}-${refreshKey}`}
                  >
                    <CustomBackground />
                  </ReactFlow>
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
          ) : data.mapId ? (
            <>
              {/* Reserve exact space for header */}
              <div className="mb-4 p-3 border-b border-slate-700/30 bg-gradient-to-r from-slate-800/30 to-slate-700/20 rounded-xl -mx-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-700/50 flex items-center justify-center">
                      <EyeOff className="w-5 h-5 text-slate-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-slate-400">Private mindmap</div>
                      <div className="text-xs text-slate-500">Access restricted</div>
                    </div>
                  </div>
                  <EyeOff className="w-4 h-4 text-slate-400 flex-shrink-0" />
                </div>
              </div>
              {/* Reserve space for mindmap container */}
              <div className="h-[200px] border border-slate-700/50 rounded-xl overflow-hidden flex items-center justify-center bg-gradient-to-br from-slate-900/80 to-slate-800/80">
                <div className="flex flex-col items-center text-slate-400">
                  <EyeOff className="w-8 h-8 mb-2" />
                  <span>Access restricted</span>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Reserve exact space for header */}
              <div className="mb-4 p-3 border-b border-slate-700/30 bg-gradient-to-r from-slate-800/30 to-slate-700/20 rounded-xl -mx-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-700/50 flex items-center justify-center">
                      <Network className="w-5 h-5 text-slate-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-slate-400">No mindmap</div>
                      <div className="text-xs text-slate-500">Choose a mindmap to share</div>
                    </div>
                  </div>
                  <Network className="w-4 h-4 text-slate-400 flex-shrink-0" />
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
      </div>
    </ReactFlowProvider>
  );
});

export { ChatMindMapNode };

