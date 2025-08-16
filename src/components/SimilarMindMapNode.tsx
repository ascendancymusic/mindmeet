import React, { useEffect, useCallback, useState, useMemo } from "react";
import ReactFlow, { ReactFlowProvider, ReactFlowInstance, NodeTypes } from "reactflow";
import "reactflow/dist/style.css";
import { supabase } from "../supabaseClient";
import { prepareNodesForRendering } from "../utils/reactFlowUtils";
import { processNodesForTextRendering } from "../utils/textNodeUtils";
import { formatDateWithPreference } from "../utils/dateUtils";
import { nodeTypes } from "../config/nodeTypes";
import { Info, Heart, MessageCircle, Bookmark, Share2, MoreHorizontal } from "lucide-react";
import InfoModal from "./InfoModal";
import ShareModal from "./ShareModal";
import { useAuthStore } from "../store/authStore";
import { useMindMapActions } from "../hooks/useMindMapActions";

const CustomBackground = () => {
  return (
    <div
      className="absolute inset-0 bg-gradient-to-br from-slate-900/60 via-slate-800/40 to-slate-900/60 rounded-lg backdrop-blur-sm"
      style={{ zIndex: -1 }}
    />
  )
}

// Add shimmer animation styles
const shimmerStyles = `
  @keyframes shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }
  .animate-shimmer {
    animation: shimmer 2s infinite;
  }
`

// Inject styles into the document head
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style')
  styleSheet.type = 'text/css'
  styleSheet.innerText = shimmerStyles
  document.head.appendChild(styleSheet)
}

// Skeleton loader component for SimilarMindMapNode
export const SimilarMindMapNodeSkeleton: React.FC = () => {
  return (
    <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl rounded-2xl overflow-hidden border border-slate-700/30 shadow-2xl">
      {/* Header skeleton */}
      <div className="px-4 py-3 border-b border-slate-700/30 bg-gradient-to-r from-slate-800/50 to-slate-700/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-full bg-slate-700/50 animate-pulse"></div>
            <div className="space-y-1">
              <div className="h-4 bg-slate-700/50 rounded w-20 animate-pulse"></div>
              <div className="h-3 bg-slate-700/30 rounded w-16 animate-pulse"></div>
            </div>
          </div>
          <div className="w-4 h-4 bg-slate-700/50 rounded animate-pulse"></div>
        </div>
      </div>

      {/* Title skeleton */}
      <div className="px-6 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="h-6 bg-slate-700/50 rounded w-3/4 animate-pulse"></div>
          <div className="h-4 bg-slate-700/30 rounded w-16 animate-pulse"></div>
        </div>
      </div>

      {/* Mind map preview skeleton - matching h-[280px] */}
      <div className="relative mx-6 mb-6">
        <div className="h-[280px] border border-slate-700/50 rounded-2xl overflow-hidden bg-gradient-to-br from-slate-900/80 to-slate-800/80 backdrop-blur-sm relative">
          {/* Subtle grid background */}
          <div className="absolute inset-0 opacity-20" style={{
            backgroundImage: `
              linear-gradient(rgba(59, 130, 246, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(59, 130, 246, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '20px 20px'
          }}></div>

          {/* Fake nodes scattered around */}
          <div className="absolute top-8 left-8 w-20 h-8 bg-slate-700/60 rounded-lg animate-pulse"></div>
          <div className="absolute top-16 right-12 w-24 h-8 bg-slate-700/60 rounded-lg animate-pulse"></div>
          <div className="absolute bottom-12 left-16 w-18 h-8 bg-slate-700/60 rounded-lg animate-pulse"></div>
          <div className="absolute bottom-8 right-8 w-16 h-8 bg-slate-700/60 rounded-lg animate-pulse"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-28 h-10 bg-slate-700/60 rounded-lg animate-pulse"></div>
          <div className="absolute top-1/4 left-1/4 w-22 h-8 bg-slate-700/60 rounded-lg animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-20 h-8 bg-slate-700/60 rounded-lg animate-pulse"></div>

          {/* Fake connections */}
          <div className="absolute top-12 left-28 w-20 h-0.5 bg-slate-600/40 transform rotate-12"></div>
          <div className="absolute top-20 right-32 w-24 h-0.5 bg-slate-600/40 transform -rotate-45"></div>
          <div className="absolute bottom-16 left-32 w-16 h-0.5 bg-slate-600/40 transform rotate-45"></div>

          {/* Shimmer overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-600/10 to-transparent animate-shimmer"></div>
        </div>
      </div>

      {/* Action buttons skeleton */}
      <div className="px-6 pb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-slate-700/50 rounded animate-pulse"></div>
              <div className="h-4 bg-slate-700/30 rounded w-6 animate-pulse"></div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-slate-700/50 rounded animate-pulse"></div>
              <div className="h-4 bg-slate-700/30 rounded w-6 animate-pulse"></div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-slate-700/50 rounded animate-pulse"></div>
              <div className="h-4 bg-slate-700/30 rounded w-6 animate-pulse"></div>
            </div>
          </div>
          <div className="w-5 h-5 bg-slate-700/50 rounded animate-pulse"></div>
        </div>
      </div>
    </div>
  )
}

interface SimilarMindMapNodeProps {
  mindmap: {
    key: string; // The actual key used for saving
    permalink: string;
    title: string;
    json_data: {
      nodes: any[];
      edges: any[];
    };
    creator: string; // Use creator ID to fetch the username and avatar
    updated_at?: string; // Add updated_at field
    saves?: number;
    saved_by?: string[];
    likes?: number;
    liked_by?: string[];
  };
}

const SimilarMindMapNode: React.FC<SimilarMindMapNodeProps> = ({ mindmap }) => {
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [username, setUsername] = useState<string>("unknown");
  const [fullName, setFullName] = useState<string>("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [localMindmap, setLocalMindmap] = useState<any>(mindmap);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false); const [commentsCount, setCommentsCount] = useState<number>(0);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [isSmallScreen, setIsSmallScreen] = useState(window.innerWidth < 1080);

  const { user } = useAuthStore();

  // Add mindmap actions hook with enhanced handling
  const { handleLike: hookHandleLike, handleSave: hookHandleSave } = useMindMapActions({
    onLikeUpdate: (mapPermalink, newLikes, newLikedBy) => {
      setLocalMindmap((prev: any) =>
        prev && (prev.permalink === mapPermalink || prev.key === mapPermalink) ? { ...prev, likes: newLikes, liked_by: newLikedBy } : prev
      );
    },
    onSaveUpdate: (mapPermalink, newSaves, newSavedBy) => {
      setLocalMindmap((prev: any) =>
        prev && (prev.permalink === mapPermalink || prev.key === mapPermalink) ? { ...prev, saves: newSaves, saved_by: newSavedBy } : prev
      );
    },
    sendNotifications: true
  });

  // Memoize nodeTypes to prevent recreation on each render
  const memoizedNodeTypes = useMemo(() => nodeTypes as unknown as NodeTypes, []); useEffect(() => {
    const fetchProfile = async () => {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("username, full_name, avatar_url")
        .eq("id", mindmap.creator)
        .single();

      if (error) {
        console.error("Error fetching profile:", error);
      } else {
        setUsername(profile?.username || "unknown");
        setFullName(profile?.full_name || "");
        setAvatarUrl(profile?.avatar_url || null);
      }
    };
    fetchProfile();
  }, [mindmap.creator]);

  // Fetch comments count for this mindmap
  useEffect(() => {
    const fetchCommentsCount = async () => {
      if (!mindmap.key) return;

      try {
        const { count, error } = await supabase
          .from("comments")
          .select("*", { count: 'exact', head: true })
          .eq("mindmap_id", mindmap.key);

        if (error) {
          console.error("Error fetching comments count:", error);
        } else {
          setCommentsCount(count || 0);
        }
      } catch (error) {
        console.error("Error fetching comments count:", error);
      }
    };

    fetchCommentsCount();
  }, [mindmap.key]);

  const handleResize = useCallback(() => {
    if (reactFlowInstance) {
      reactFlowInstance.fitView();
    }
    setIsSmallScreen(window.innerWidth < 1080);
  }, [reactFlowInstance]);

  useEffect(() => {
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [handleResize]); const onInit = useCallback((instance: ReactFlowInstance) => {
    setReactFlowInstance(instance);
  }, []);

  // Handle clicking outside to close menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openMenuId && !(event.target as Element).closest('.relative')) {
        setOpenMenuId(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [openMenuId]);

  function handleLike(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    hookHandleLike(e, localMindmap);
  }

  function handleSave(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    hookHandleSave(e, localMindmap);
  }

  function handleShare(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation(); setIsShareModalOpen(true);
  }

  return (
    <ReactFlowProvider>      <div className="relative bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl rounded-2xl overflow-hidden border border-slate-700/30 shadow-2xl transition-all duration-300 hover:shadow-3xl hover:border-slate-600/50">
      {/* Header with creator info */}
      <div className="px-4 py-3 border-b border-slate-700/30 bg-gradient-to-r from-slate-800/50 to-slate-700/30">
        <div className="flex items-center justify-between">
          <a
            href={`/${username}`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              window.location.href = `/${username}`;
            }}
            className="flex items-center space-x-2.5 hover:bg-slate-700/30 rounded-xl p-2 -m-2 transition-all duration-200 group/creator"
          >
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex-shrink-0 overflow-hidden ring-2 ring-slate-600/50 group-hover/creator:ring-blue-400/50 transition-all duration-300">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={username}
                    className="w-full h-full object-cover"
                  />) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-200 font-semibold text-base">
                    {username.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            </div>
            <div className="min-w-0">
              {fullName && (
                <p className="text-base font-bold text-slate-100 group-hover/creator:text-blue-200 transition-colors truncate">
                  {fullName}
                </p>
              )}                <div className="flex items-center gap-2">
                <p className="text-xs text-slate-400 group-hover/creator:text-blue-300 transition-colors">
                  @{username}
                </p>
              </div>
            </div>
          </a>
          <div className="flex items-center gap-3">
            {/* Three dot menu */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setOpenMenuId(openMenuId === localMindmap?.key ? null : localMindmap?.key);
                }}
                className="p-2 rounded-lg hover:bg-slate-700/50 transition-colors opacity-60 hover:opacity-100"
              >
                <MoreHorizontal className="w-4 h-4 text-slate-400" />
              </button>                {openMenuId === localMindmap?.key && (
                <div className="absolute right-0 top-full mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-lg z-50 min-w-[120px]">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsInfoModalOpen(true);
                      setOpenMenuId(null);
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 rounded-lg flex items-center gap-2"
                  >
                    <Info className="w-4 h-4" />
                    View Info
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* Title section */}
      <div className="px-6 py-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-xl font-bold text-slate-100 transition-colors duration-200 line-clamp-2 leading-tight flex-1 min-w-0">
            {mindmap.title}
          </h3>
          {mindmap.updated_at && (
            <div className="flex items-center gap-1 flex-shrink-0">
              <svg className="w-3 h-3 text-slate-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
              </svg>
              <span className="text-xs text-slate-500 whitespace-nowrap">
                {formatDateWithPreference(new Date(mindmap.updated_at))}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Mind map preview */}
      <div className="relative mx-6 mb-6">
        <a href={`/${username}/${mindmap.permalink}`} className="block group/preview">
          <div
            className={`h-[280px] border border-slate-700/50 rounded-2xl overflow-hidden bg-gradient-to-br from-slate-900/80 to-slate-800/80 backdrop-blur-sm group-hover/preview:border-blue-400/30 group-hover/preview:shadow-lg group-hover/preview:shadow-blue-500/10 transition-all duration-300 relative ${isSmallScreen ? "pointer-events-none" : ""
              }`}
          >
            {/* Subtle grid background */}
            <div className="absolute inset-0 opacity-20" style={{
              backgroundImage: `
                  linear-gradient(rgba(59, 130, 246, 0.1) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(59, 130, 246, 0.1) 1px, transparent 1px)
                `,
              backgroundSize: '20px 20px'
            }}></div>

            <ReactFlow
              nodes={processNodesForTextRendering(prepareNodesForRendering(mindmap.json_data.nodes))}
              edges={mindmap.json_data.edges.map((edge: any) => {
                // Find the source node to get its color
                const sourceNode = mindmap.json_data.nodes.find((node: any) => node.id === edge.source);
                const sourceNodeColor = sourceNode
                  ? (sourceNode.background || sourceNode.style?.background || "#374151")
                  : "#374151";

                // Get edgeType from mindmap data, default to 'default' if not valid
                const edgeType = ['default', 'straight', 'smoothstep'].includes(mindmap.json_data.edgeType)
                  ? mindmap.json_data.edgeType
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
              nodeTypes={memoizedNodeTypes}
              fitView
              nodesDraggable={false}
              nodesConnectable={false}
              elementsSelectable={false}
              zoomOnScroll={!isSmallScreen}
              panOnScroll={false}
              zoomOnDoubleClick={false}
              preventScrolling={isSmallScreen}
              minZoom={0.1}
              maxZoom={2}
              onInit={onInit}
              proOptions={{ hideAttribution: true }}
              className="react-flow-instance"
            >
              <CustomBackground />
            </ReactFlow>

            {/* Hover overlay */}
            <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover/preview:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
          </div>
        </a>
      </div>

      {/* Action buttons */}
      <div className="px-6 pb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            {/* Like button */}
            <button
              onClick={handleLike}
              className="group/btn flex items-center gap-2 transition-all duration-200 hover:scale-105"
            >
              <Heart
                className={`w-5 h-5 transition-all duration-200 group-hover/btn:scale-110 ${localMindmap.liked_by?.includes(user?.id || '')
                  ? 'text-blue-400 fill-blue-400'
                  : 'text-slate-400 group-hover/btn:text-blue-400'
                  }`}
              />
              <span className={`text-sm font-medium transition-colors duration-200 ${localMindmap.liked_by?.includes(user?.id || '')
                ? 'text-blue-400'
                : 'text-slate-400 group-hover/btn:text-blue-400'
                }`}>
                {localMindmap.likes || 0}
              </span>
            </button>

            {/* Comment button */}
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                window.location.href = `/${username}/${mindmap.permalink}`;
              }}
              className="group/btn flex items-center gap-2 transition-all duration-200 hover:scale-105"
            >
              <MessageCircle className="w-5 h-5 text-slate-400 group-hover/btn:text-blue-400 transition-colors duration-200" />
              <span className="text-sm font-medium text-slate-400 group-hover/btn:text-blue-400 transition-colors duration-200">
                {commentsCount}
              </span>
            </button>

            {/* Save button */}
            <button
              onClick={handleSave}
              className="group/btn flex items-center gap-2 transition-all duration-200 hover:scale-105"
            >
              <Bookmark
                className={`w-5 h-5 transition-all duration-200 group-hover/btn:scale-110 ${localMindmap.saved_by?.includes(user?.id || '')
                  ? 'text-blue-400 fill-blue-400'
                  : 'text-slate-400 group-hover/btn:text-blue-400'
                  }`}
              />
              <span className={`text-sm font-medium transition-colors duration-200 ${localMindmap.saved_by?.includes(user?.id || '')
                ? 'text-blue-400'
                : 'text-slate-400 group-hover/btn:text-blue-400'
                }`}>
                {localMindmap.saves || 0}
              </span>
            </button>
          </div>            <div className="flex items-center gap-2">
            {/* Share button */}
            <button
              onClick={handleShare}
              className="group/btn flex items-center gap-2 transition-all duration-200 hover:scale-105"
            >
              <Share2 className="w-5 h-5 text-slate-400 group-hover/btn:text-blue-400 transition-colors duration-200" />
            </button>
          </div>
        </div>
      </div>
    </div>

      {/* Share Modal */}
      {isShareModalOpen && (
        <ShareModal
          title={mindmap.title}
          url={`${window.location.origin}/${username}/${mindmap.permalink}`}
          creator={username || ''}
          onClose={() => setIsShareModalOpen(false)}
          mindmapPermalink={mindmap.permalink} // Use permalink instead of key for sharing
        />
      )}

      {/* Info Modal */}
      {isInfoModalOpen && (
        <InfoModal
          mindmap={{
            username: username,
            displayName: fullName || username,
            name: mindmap.title,
            permalink: mindmap.permalink,
            updatedAt: mindmap.updated_at || new Date().toISOString(),
            description: '', // Similar mindmaps don't have description in the interface
            visibility: 'public', // Assuming similar mindmaps are public
            avatar_url: avatarUrl,
            collaborators: [], // Similar mindmaps don't have collaborator info
            published_at: null,
            stats: {
              nodes: mindmap.json_data.nodes?.length || 0,
              edges: mindmap.json_data.edges?.length || 0,
              likes: localMindmap.likes || 0,
              comments: commentsCount,
              saves: localMindmap.saves || 0,
            }
          }}
          onClose={() => setIsInfoModalOpen(false)}
          hideVisibility={true}
        />
      )}
    </ReactFlowProvider>
  );
};

export default SimilarMindMapNode;
