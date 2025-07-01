import React, { useEffect, useCallback, useState, useMemo } from "react";
import ReactFlow, { ReactFlowProvider, ReactFlowInstance, NodeTypes } from "reactflow";
import "reactflow/dist/style.css";
import { supabase } from "../supabaseClient";
import { prepareNodesForRendering } from "../utils/reactFlowUtils";
import { nodeTypes } from "../config/nodeTypes";
import { Heart, MessageCircle, Bookmark, Share2, MoreVertical, Info } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useMindMapActions } from '../hooks/useMindMapActions';
import ShareModal from './ShareModal';
import InfoModal from './InfoModal';
import { formatDateWithPreference } from "../utils/dateUtils";

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

const CustomBackground = () => {
  return (
    <div className="absolute inset-0 bg-gradient-to-br from-slate-900/60 via-slate-800/40 to-slate-900/60 rounded-lg backdrop-blur-sm" style={{ zIndex: -1 }}></div>
  );
};

interface FeedMindMapNodeProps {
  mindmap: {
    id: string;
    key: string;
    title: string;
    json_data?: {
      nodes: any[];
      edges: any[];
    };
    creator: string;
    created_at?: string;
    likes?: number;
    liked_by?: string[];
    comment_count?: number;
    saves?: number;
    saved_by?: string[];
    description?: string;
    visibility?: 'public' | 'private';
    updated_at?: string;
  } | null;
}

const FeedMindMapNode: React.FC<FeedMindMapNodeProps> = ({ mindmap }) => {
  const { user } = useAuthStore();
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [username, setUsername] = useState<string>("unknown");
  const [fullName, setFullName] = useState<string>("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [localMindmap, setLocalMindmap] = useState<any>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSmallScreen, setIsSmallScreen] = useState(window.innerWidth < 1080);

  // Add mindmap actions hook
  const { handleLike: hookHandleLike, handleSave: hookHandleSave } = useMindMapActions({
    onLikeUpdate: (mapId, newLikes, newLikedBy) => {
      setLocalMindmap((prev: any) => 
        prev && prev.id === mapId ? { ...prev, likes: newLikes, liked_by: newLikedBy } : prev
      );
    },
    onSaveUpdate: (mapId, newSaves, newSavedBy) => {
      setLocalMindmap((prev: any) => 
        prev && prev.id === mapId ? { ...prev, saves: newSaves, saved_by: newSavedBy } : prev
      );
    }
  });

  // Memoize nodeTypes to prevent recreation on each render
  const memoizedNodeTypes = useMemo(() => nodeTypes as unknown as NodeTypes, []);

  // If mindmap is null, show skeleton immediately
  if (!mindmap) {
    return (
      <div className="bg-gradient-to-br from-slate-800/40 to-slate-900/40 backdrop-blur-xl rounded-2xl p-5 border border-slate-700/30 shadow-xl animate-pulse">
        {/* Header skeleton */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-3 flex-1">
            <div className="flex items-center gap-2">
              {/* Avatar skeleton */}
              <div className="w-8 h-8 rounded-full bg-slate-700/50"></div>
              {/* Badge skeleton */}
              <div className="w-8 h-4 bg-slate-700/50 rounded-full"></div>
              <div className="w-12 h-4 bg-slate-700/50 rounded-full"></div>
            </div>
            <div className="flex-1 min-w-0">
              {/* Title skeleton */}
              <div className="h-6 bg-slate-700/50 rounded-lg w-3/4 mb-1"></div>
              {/* Subtitle skeleton */}
              <div className="h-4 bg-slate-700/30 rounded w-1/2"></div>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            {/* Visibility icon skeleton */}
            <div className="w-9 h-9 bg-slate-700/50 rounded-lg"></div>
            {/* Menu button skeleton */}
            <div className="w-9 h-9 bg-slate-700/50 rounded-lg"></div>
          </div>
        </div>
        
        {/* Timestamp skeleton */}
        <div className="flex items-center gap-2 mb-3">
          <div className="w-4 h-4 bg-slate-700/50 rounded"></div>
          <div className="h-4 bg-slate-700/50 rounded w-32"></div>
        </div>
        
        {/* Stats skeleton */}
        <div className="h-4 bg-slate-700/30 rounded w-24 mb-4"></div>
        
        {/* Preview skeleton */}
        <div className="h-56 bg-slate-800/50 rounded-xl border border-slate-700/50 relative overflow-hidden">
          {/* Animated shimmer effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-600/20 to-transparent animate-shimmer"></div>
          
          {/* Fake nodes */}
          <div className="absolute top-4 left-4 w-16 h-8 bg-slate-700/60 rounded"></div>
          <div className="absolute top-12 right-8 w-20 h-8 bg-slate-700/60 rounded"></div>
          <div className="absolute bottom-8 left-8 w-18 h-8 bg-slate-700/60 rounded"></div>
          <div className="absolute bottom-4 right-4 w-14 h-8 bg-slate-700/60 rounded"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-24 h-10 bg-slate-700/60 rounded"></div>
          
          {/* Fake connections */}
          <div className="absolute top-8 left-20 w-16 h-0.5 bg-slate-600/50 transform rotate-12"></div>
          <div className="absolute top-16 right-24 w-20 h-0.5 bg-slate-600/50 transform -rotate-45"></div>
          <div className="absolute bottom-12 left-24 w-12 h-0.5 bg-slate-600/50 transform rotate-45"></div>
        </div>
        
        {/* Action buttons skeleton */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-700/30 mt-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-slate-700/50 rounded"></div>
              <div className="w-6 h-4 bg-slate-700/50 rounded"></div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-slate-700/50 rounded"></div>
              <div className="w-6 h-4 bg-slate-700/50 rounded"></div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-slate-700/50 rounded"></div>
              <div className="w-6 h-4 bg-slate-700/50 rounded"></div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-slate-700/50 rounded-lg"></div>
            <div className="w-8 h-8 bg-slate-700/50 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  // Fetch mindmap data from Supabase
  useEffect(() => {
    const fetchMindmapData = async () => {
      try {
        setIsLoading(true);
        if (!mindmap || !mindmap.key) {
          console.error("Missing mindmap key for:", mindmap?.title);
          setIsLoading(false);
          return;
        }
        const { data, error } = await supabase
          .from("mindmaps")
          .select("id, key, title, json_data, creator, created_at, likes, liked_by, comment_count, saves, saved_by, description, visibility, updated_at, collaborators, published_at")
          .eq("key", mindmap.key)
          .single();

        if (error) throw error;
        if (!data) {
          console.error("No mindmap found for key:", mindmap.key);
          setIsLoading(false);
          return;
        }

        setLocalMindmap({
          ...data,
          likes: data.likes ?? 0,
          liked_by: data.liked_by ?? [],
          comment_count: data.comment_count ?? 0,
          saves: data.saves ?? 0,
          saved_by: data.saved_by ?? [],
        });
      } catch (error) {
        console.error("Error fetching mindmap data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (mindmap && mindmap.key) {
      fetchMindmapData();
    } else {
      setIsLoading(false);
    }
  }, [mindmap?.key, mindmap?.title]);

  // Fetch user profile
  useEffect(() => {
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
        setFullName(profile?.full_name || profile?.username || "unknown");
        setAvatarUrl(profile?.avatar_url || null);
      }
    };
    fetchProfile();
  }, [mindmap.creator]);

  const handleResize = useCallback(() => {
    if (reactFlowInstance) reactFlowInstance.fitView();
    setIsSmallScreen(window.innerWidth < 1080);
  }, [reactFlowInstance]);

  useEffect(() => {
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [handleResize]);

  const onInit = useCallback((instance: ReactFlowInstance) => {
    setReactFlowInstance(instance);
    if (localMindmap?.json_data?.nodes?.length > 0) {
      instance.fitView();
    }
  }, [localMindmap]);

  // Fit view when nodes are available
  useEffect(() => {
    if (reactFlowInstance && localMindmap?.json_data?.nodes?.length > 0) {
      reactFlowInstance.fitView();
    }
  }, [localMindmap, reactFlowInstance]);





  function handleShare() {
    setIsShareModalOpen(true);
  }

  function toggleMenu() {
    setOpenMenuId(openMenuId === localMindmap?.key ? null : localMindmap?.key);
  }

  function handleOpenInfo() {
    if (localMindmap?.key && localMindmap?.title) {
      setIsInfoModalOpen(true);
      setOpenMenuId(null);
    } else {
      console.error("Missing data required for Info Modal");
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="bg-gradient-to-br from-slate-800/40 to-slate-900/40 backdrop-blur-xl rounded-2xl p-5 border border-slate-700/30 shadow-xl animate-pulse">
        {/* Header skeleton */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-3 flex-1">
            <div className="flex items-center gap-2">
              {/* Avatar skeleton */}
              <div className="w-8 h-8 rounded-full bg-slate-700/50"></div>
              {/* Badge skeletons */}
              <div className="w-8 h-4 bg-slate-700/50 rounded-full"></div>
              <div className="w-12 h-4 bg-slate-700/50 rounded-full"></div>
            </div>
            <div className="flex-1 min-w-0">
              {/* Title skeleton */}
              <div className="h-6 bg-slate-700/50 rounded-lg w-3/4 mb-1"></div>
              {/* Creator username skeleton */}
              <div className="h-4 bg-slate-700/30 rounded w-1/2"></div>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            {/* Visibility icon skeleton */}
            <div className="w-9 h-9 bg-slate-700/50 rounded-lg"></div>
            {/* Menu button skeleton */}
            <div className="w-9 h-9 bg-slate-700/50 rounded-lg"></div>
          </div>
        </div>
        
        {/* Timestamp skeleton */}
        <div className="flex items-center gap-2 mb-3">
          <div className="w-4 h-4 bg-slate-700/50 rounded"></div>
          <div className="h-4 bg-slate-700/50 rounded w-32"></div>
        </div>
        
        {/* Stats skeleton */}
        <div className="h-4 bg-slate-700/30 rounded w-24 mb-4"></div>
        
        {/* Preview skeleton */}
        <div className="h-56 bg-slate-800/50 rounded-xl border border-slate-700/50 relative overflow-hidden">
          {/* Animated shimmer effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-600/20 to-transparent animate-shimmer"></div>
          
          {/* Fake nodes */}
          <div className="absolute top-4 left-4 w-16 h-8 bg-slate-700/60 rounded"></div>
          <div className="absolute top-12 right-8 w-20 h-8 bg-slate-700/60 rounded"></div>
          <div className="absolute bottom-8 left-8 w-18 h-8 bg-slate-700/60 rounded"></div>
          <div className="absolute bottom-4 right-4 w-14 h-8 bg-slate-700/60 rounded"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-24 h-10 bg-slate-700/60 rounded"></div>
          
          {/* Fake connections */}
          <div className="absolute top-8 left-20 w-16 h-0.5 bg-slate-600/50 transform rotate-12"></div>
          <div className="absolute top-16 right-24 w-20 h-0.5 bg-slate-600/50 transform -rotate-45"></div>
          <div className="absolute bottom-12 left-24 w-12 h-0.5 bg-slate-600/50 transform rotate-45"></div>
        </div>
        
        {/* Action buttons skeleton */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-700/30 mt-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-slate-700/50 rounded"></div>
              <div className="w-6 h-4 bg-slate-700/50 rounded"></div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-slate-700/50 rounded"></div>
              <div className="w-6 h-4 bg-slate-700/50 rounded"></div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-slate-700/50 rounded"></div>
              <div className="w-6 h-4 bg-slate-700/50 rounded"></div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-slate-700/50 rounded-lg"></div>
            <div className="w-8 h-8 bg-slate-700/50 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  // Error or no data state
  if (!localMindmap || !localMindmap.json_data || localMindmap.json_data.nodes.length === 0) {
    return (
      <div className="group relative bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl rounded-2xl overflow-hidden border border-slate-700/30 shadow-2xl">
        {/* Header with creator info */}
        <div className="p-6 border-b border-slate-700/30 bg-gradient-to-r from-slate-800/50 to-slate-700/30">
          <div className="flex items-center justify-between">
            <a 
              href={`/${username}`} 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                window.location.href = `/${username}`;
              }}
              className="flex items-center space-x-3 hover:bg-slate-700/30 rounded-xl p-3 -m-3 transition-all duration-200 group/creator"
            >
              <div className="relative">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-800 flex-shrink-0 overflow-hidden ring-2 ring-slate-600/50 group-hover/creator:ring-blue-400/50 transition-all duration-300">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={username} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-200 font-semibold text-sm">
                      {username.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-200 group-hover/creator:text-white transition-colors">
                  {fullName}
                </p>
                <p className="text-xs text-slate-400 group-hover/creator:text-slate-300 transition-colors">
                  @{username}
                </p>
              </div>
            </a>
            
            <div className="flex items-center gap-3">
              <p className="text-xs text-slate-400">
                {formatDateWithPreference(localMindmap?.published_at)}
              </p>
            </div>
          </div>
        </div>
        
        {/* Title section */}
        <div className="px-6 py-4">
          <h3 className="text-xl font-bold text-slate-100 line-clamp-2 leading-tight">
            {mindmap.title}
          </h3>
        </div>

        {/* Mind map preview */}
        <div className="relative mx-6 mb-6">
          <div className="h-[280px] border border-slate-700/50 rounded-2xl bg-gradient-to-br from-slate-900/80 to-slate-800/80 backdrop-blur-sm flex items-center justify-center">
            <p className="text-slate-400">No nodes to display</p>
          </div>
        </div>

        {/* Action buttons placeholder */}
        <div className="px-6 pb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="px-4 py-3 rounded-xl bg-slate-700/50 border border-slate-600/50">
                <span className="text-sm font-medium text-slate-400">No actions available</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Helper to show relative time (minutes/hours/days ago)
  function formatDateRelative(dateString?: string) {
    if (!dateString) return '';
    const dateObj = new Date(dateString);
    if (isNaN(dateObj.getTime())) return '';
    const now = new Date();
    const diffMs = now.getTime() - dateObj.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)} minute${Math.floor(diffSec / 60) === 1 ? '' : 's'} ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} hour${Math.floor(diffSec / 3600) === 1 ? '' : 's'} ago`;
    if (diffSec < 604800) return `${Math.floor(diffSec / 86400)} day${Math.floor(diffSec / 86400) === 1 ? '' : 's'} ago`;
    return formatDateWithPreference(dateObj);
  }

  return (
    <ReactFlowProvider>
      <div className="relative bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl rounded-2xl overflow-hidden border border-slate-700/30 shadow-2xl transition-all duration-300 hover:shadow-3xl hover:border-slate-600/50">
        {/* Header with creator info */}
        <div className="p-6 border-b border-slate-700/30 bg-gradient-to-r from-slate-800/50 to-slate-700/30">
          <div className="flex items-center justify-between">
            <a 
              href={`/${username}`} 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                window.location.href = `/${username}`;
              }}
              className="flex items-center space-x-3 hover:bg-slate-700/30 rounded-xl p-3 -m-3 transition-all duration-200 group/creator"
            >
              <div className="relative">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-800 flex-shrink-0 overflow-hidden ring-2 ring-slate-600/50 group-hover/creator:ring-blue-400/50 transition-all duration-300">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={username} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-200 font-semibold text-sm">
                      {username.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-200 group-hover/creator:text-white transition-colors">
                  {fullName}
                </p>
                <p className="text-xs text-slate-400 group-hover/creator:text-slate-300 transition-colors">
                  @{username}
                </p>
              </div>
            </a>
            
            <div className="flex items-center gap-3">
              <p className="text-xs text-slate-400">
                {formatDateRelative(localMindmap?.published_at)}
              </p>
              {/* Three dot menu */}
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleMenu();
                  }}
                  className="p-2 rounded-xl hover:bg-slate-700/50 transition-all duration-200 opacity-60 hover:opacity-100"
                >
                  <MoreVertical className="w-5 h-5 text-slate-400" />
                </button>
                {openMenuId === localMindmap.key && (
                  <div className="absolute right-0 top-full mt-2 bg-slate-800/95 backdrop-blur-xl border border-slate-700/50 rounded-xl shadow-2xl z-50 min-w-[140px] overflow-hidden">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleOpenInfo();
                      }}
                      className="w-full px-4 py-3 text-left text-sm text-slate-300 hover:bg-gradient-to-r hover:from-blue-500/10 hover:to-purple-500/10 hover:text-white transition-all duration-200 flex items-center gap-3"
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
          <h3 className="text-xl font-bold text-slate-100 transition-colors duration-200 line-clamp-2 leading-tight">
            {localMindmap.title}
          </h3>
        </div>

        {/* Mind map preview */}
        <div className="relative mx-6 mb-6">
          <a href={`/${username}/${localMindmap.id}`} className="block group/preview">
            <div className="h-[280px] border border-slate-700/50 rounded-2xl overflow-hidden bg-gradient-to-br from-slate-900/80 to-slate-800/80 backdrop-blur-sm group-hover/preview:border-blue-400/30 group-hover/preview:shadow-lg group-hover/preview:shadow-blue-500/10 transition-all duration-300 relative">
              {/* Subtle grid background */}
              <div className="absolute inset-0 opacity-20" style={{
                backgroundImage: `
                  linear-gradient(rgba(59, 130, 246, 0.1) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(59, 130, 246, 0.1) 1px, transparent 1px)
                `,
                backgroundSize: '20px 20px'
              }}></div>
              
              <ReactFlow
                nodes={prepareNodesForRendering(localMindmap.json_data.nodes)}
                edges={localMindmap.json_data.edges.map((edge: any) => {
                  // Find the source node to get its color
                  const sourceNode = localMindmap.json_data.nodes.find((node: any) => node.id === edge.source);
                  const sourceNodeColor = sourceNode
                    ? (sourceNode.background || sourceNode.style?.background || "#374151")
                    : "#374151";

                  // Get edgeType from mindmap data, default to 'default' if not valid
                  const edgeType = ['default', 'straight', 'smoothstep'].includes(localMindmap.json_data.edgeType)
                    ? localMindmap.json_data.edgeType
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
                zoomOnDoubleClick={false}
                panOnDrag={!isSmallScreen}
                minZoom={0.1}
                maxZoom={2}
                onInit={onInit}
                proOptions={{ hideAttribution: true }}
              >
                <CustomBackground />
              </ReactFlow>
              
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover/preview:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
            </div>
          </a>
        </div>

        {/* Action buttons */}
        <div className="px-6 pb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <button
                onClick={(e) => hookHandleLike(e, localMindmap)}
                className="group/btn flex items-center gap-2 transition-all duration-200 hover:scale-105"
                disabled={!user}
              >
                <Heart
                  className={`w-5 h-5 transition-colors duration-200 ${
                    user?.id && localMindmap.liked_by?.includes(user.id)
                      ? 'fill-current text-blue-400'
                      : 'text-slate-400 group-hover/btn:text-blue-400'
                  }`}
                />
                <span className="text-sm font-medium text-slate-300 group-hover/btn:text-blue-400 transition-colors">
                  {localMindmap.likes > 0 ? localMindmap.likes : 'Like'}
                </span>
              </button>

              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  window.location.href = `/${username}/${localMindmap.id}#comments-section`;
                }}
                className="group/btn flex items-center gap-2 transition-all duration-200 hover:scale-105"
              >
                <MessageCircle className="w-5 h-5 text-slate-400 group-hover/btn:text-blue-400 transition-colors duration-200" />
                <span className="text-sm font-medium text-slate-300 group-hover/btn:text-blue-400 transition-colors">
                  {localMindmap.comment_count > 0 ? localMindmap.comment_count : 'Comment'}
                </span>
              </button>

              <button
                onClick={(e) => hookHandleSave(e, localMindmap)}
                className="group/btn flex items-center gap-2 transition-all duration-200 hover:scale-105"
              >
                <Bookmark
                  className={`w-5 h-5 transition-colors duration-200 ${
                    user?.id && localMindmap.saved_by?.includes(user.id)
                      ? 'fill-current text-blue-400'
                      : 'text-slate-400 group-hover/btn:text-blue-400'
                  }`}
                />
                <span className="text-sm font-medium text-slate-300 group-hover/btn:text-blue-400 transition-colors">
                  {localMindmap.saves > 0 ? localMindmap.saves : 'Save'}
                </span>
              </button>
            </div>

            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleShare();
              }}
              className="group/btn flex items-center gap-2 transition-all duration-200 hover:scale-105"
            >
              <Share2 className="w-5 h-5 text-slate-400 group-hover/btn:text-blue-400 transition-colors duration-200" />
              <span className="text-sm font-medium text-slate-300 group-hover/btn:text-blue-400 transition-colors">Share</span>
            </button>
          </div>
        </div>
      </div>
      {isShareModalOpen && (
        <ShareModal
          title={localMindmap.title}
          url={`${window.location.origin}/${username}/${localMindmap.id}`}
          creator={username || ''}
          onClose={() => setIsShareModalOpen(false)}
          mindmapId={localMindmap.id} // Use id instead of key for sharing
        />
      )}
      {isInfoModalOpen && (
        <InfoModal
          mindmap={{
            username: username,
            displayName: fullName,
            name: localMindmap.title,
            id: localMindmap.id,
            updatedAt: localMindmap.updated_at || new Date().toISOString(),
            description: localMindmap.description || 'No description provided.',
            avatar_url: avatarUrl,
            collaborators: localMindmap.collaborators || [],
            published_at: localMindmap.published_at,
            stats: {
              nodes: localMindmap.json_data?.nodes?.length || 0,
              edges: localMindmap.json_data?.edges?.length || 0,
              likes: localMindmap.likes || 0,
              comments: localMindmap.comment_count || 0,
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

export default FeedMindMapNode;