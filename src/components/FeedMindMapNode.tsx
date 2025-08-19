import React, { useEffect, useCallback, useState, useMemo } from "react";
import ReactFlow, { ReactFlowProvider, ReactFlowInstance, NodeTypes } from "reactflow";
import "reactflow/dist/style.css";
import { supabase } from "../supabaseClient";
import { prepareNodesForRendering } from "../utils/reactFlowUtils";
import { nodeTypes } from "../config/nodeTypes";
import { Heart, MessageCircle, Bookmark, Share2, MoreVertical, Info, Edit2, Trash2, AlertTriangle } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useMindMapActions } from '../hooks/useMindMapActions';
import ShareModal from './ShareModal';
import InfoModal from './InfoModal';
import EditDetailsModal from './EditDetailsModal';
import { formatDateWithPreference } from "../utils/dateUtils";
import { useMindMapStore } from '../store/mindMapStore';
import { processNodesForTextRendering } from '../utils/textNodeUtils';

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
    permalink: string;
    id: string;
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
  onDelete?: (mindmapKey: string) => void;
}

const FeedMindMapNode: React.FC<FeedMindMapNodeProps> = ({ mindmap, onDelete }) => {
  const { user } = useAuthStore();
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [username, setUsername] = useState<string>("unknown");
  const [fullName, setFullName] = useState<string>("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [localMindmap, setLocalMindmap] = useState<any>(mindmap);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(!mindmap);
  const [isSmallScreen, setIsSmallScreen] = useState(window.innerWidth < 1080);
  const [mapToDelete, setMapToDelete] = useState<string | null>(null);

  // Add mindmap actions hook
  const { handleLike: hookHandleLike, handleSave: hookHandleSave } = useMindMapActions({
    onLikeUpdate: (mapKey, newLikes, newLikedBy) => {
      setLocalMindmap((prev: any) =>
        prev && prev.permalink === mapKey ? { ...prev, likes: newLikes, liked_by: newLikedBy } : prev
      );
    },
    onSaveUpdate: (mapKey, newSaves, newSavedBy) => {
      setLocalMindmap((prev: any) =>
        prev && prev.permalink === mapKey ? { ...prev, saves: newSaves, saved_by: newSavedBy } : prev
      );
    }
  });

  const { deleteMap } = useMindMapStore();

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

  // When mindmap prop changes, update localMindmap state
  useEffect(() => {
    setLocalMindmap(mindmap);
    setIsLoading(!mindmap);
  }, [mindmap]);

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
  }, [mindmap?.creator]);

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
    setOpenMenuId(openMenuId === localMindmap?.id ? null : localMindmap?.id);
  }

  function handleOpenInfo() {
    if (localMindmap?.id && localMindmap?.title) {
      setIsInfoModalOpen(true);
      setOpenMenuId(null);
    } else {
      console.error("Missing data required for Info Modal");
    }
  }

  function handleEditDetails() {
    setIsEditModalOpen(true);
    setOpenMenuId(null);
  }

  function handleDeleteMap() {
    setMapToDelete(localMindmap?.permalink || null);
    setOpenMenuId(null);
  }

  const confirmDelete = async () => {
    if (mapToDelete && user?.id && localMindmap) {
      try {
        await deleteMap(mapToDelete, user.id);
        setMapToDelete(null);
        // Immediately remove from feed UI
        onDelete?.(mapToDelete);
      } catch (error) {
        console.error('Error deleting mindmap:', error);
        alert('Failed to delete mindmap. Please try again.');
      }
    }
  };

  const saveMapDetails = async (details: {
    title: string;
    permalink: string;
    visibility: "public" | "private" | "linkOnly";
    description: string;
    is_main: boolean;
    collaborators: string[];
    published_at?: string | null;
  }) => {
    if (!localMindmap || !user?.id) return;

    try {
      const { error } = await supabase
        .from('mindmaps')
        .update({
          title: details.title,
          permalink: details.permalink,
          visibility: details.visibility,
          description: details.description,
          is_main: details.is_main,
          collaborators: details.collaborators,
          published_at: details.published_at,
          updated_at: new Date().toISOString()
        })
        .eq('permalink', localMindmap.permalink)
        .eq('creator', user.id);

      if (error) throw error;

      // Update local state
      setLocalMindmap((prev: any) => prev ? {
        ...prev,
        title: details.title,
        permalink: details.permalink,
        visibility: details.visibility,
        description: details.description,
        is_main: details.is_main,
        collaborators: details.collaborators,
        published_at: details.published_at,
        updated_at: new Date().toISOString()
      } : null);

    } catch (error) {
      console.error('Error updating mindmap details:', error);
      throw error;
    }
  };

  // Loading state
  if (isLoading || !localMindmap) {
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
                {formatDateWithPreference(mindmap?.created_at)}
              </p>
            </div>
          </div>
        </div>

        {/* Title section */}
        <div className="px-6 py-4">
          <h3 className="text-xl font-bold text-slate-100 line-clamp-2 leading-tight">
            {localMindmap.title}
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
                {openMenuId === localMindmap.id && (
                  <div className="absolute right-0 top-full mt-2 bg-slate-800/95 backdrop-blur-xl border border-slate-700/50 rounded-xl shadow-2xl z-50 min-w-[140px] overflow-hidden">
                    {/* Show edit and info options, with delete at the end if user owns the mindmap */}
                    {user?.id === localMindmap.creator && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleEditDetails();
                        }}
                        className="w-full px-4 py-3 text-left text-sm text-slate-300 hover:bg-gradient-to-r hover:from-blue-500/10 hover:to-purple-500/10 hover:text-white transition-all duration-200 flex items-center gap-3"
                      >
                        <Edit2 className="w-4 h-4" />
                        Edit Details
                      </button>
                    )}
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
                    {user?.id === localMindmap.creator && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDeleteMap();
                        }}
                        className="w-full px-4 py-3 text-left text-sm text-slate-300 hover:bg-gradient-to-r hover:from-red-500/10 hover:to-red-600/10 hover:text-red-400 transition-all duration-200 flex items-center gap-3"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    )}
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
          <a href={`/${username}/${localMindmap.permalink}`} className="block group/preview">
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
                nodes={processNodesForTextRendering(prepareNodesForRendering(localMindmap.json_data.nodes))}
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
                  className={`w-5 h-5 transition-colors duration-200 ${user?.id && localMindmap.liked_by?.includes(user.id)
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
                  window.location.href = `/${username}/${localMindmap.permalink}#comments-section`;
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
                  className={`w-5 h-5 transition-colors duration-200 ${user?.id && localMindmap.saved_by?.includes(user.id)
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
      {isShareModalOpen && localMindmap && (
        <ShareModal
          title={localMindmap.title}
          url={`${window.location.origin}/${username}/${localMindmap.permalink}`}
          creator={username || ''}
          onClose={() => setIsShareModalOpen(false)}
          mindmapId={localMindmap.id}
        />
      )}
      {isInfoModalOpen && (
        <InfoModal
          mindmap={{
            id: localMindmap.id,
            username: username,
            displayName: fullName,
            name: localMindmap.title,
            permalink: localMindmap.permalink,
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
      {isEditModalOpen && localMindmap && (
        <EditDetailsModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          mapData={{
            id: localMindmap.id, // Add mindmap ID for collaboration functionality
            permalink: localMindmap.permalink,
            title: localMindmap.title,
            description: localMindmap.description || '',
            visibility: localMindmap.visibility as "public" | "private" | "linkOnly",
            is_main: localMindmap.is_main || false,
            collaborators: localMindmap.collaborators || [],
            published_at: localMindmap.published_at || null
          }}
          username={username}
          onSave={saveMapDetails}
          showMainMapOption={false}
        />
      )}
      {mapToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-xl rounded-2xl p-6 w-full max-w-md shadow-2xl border border-slate-700/30">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-red-400" />
              <h2 className="text-xl font-bold text-white">
                Delete Mindmap
              </h2>
            </div>
            <p className="text-slate-300 mb-2">
              Are you sure you want to delete "{localMindmap?.title}"?
            </p>
            <p className="text-slate-400 text-sm mb-6">
              This action cannot be undone and all data will be permanently lost.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setMapToDelete(null)}
                className="px-6 py-2.5 text-slate-400 hover:text-slate-100 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-6 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all duration-200 font-medium"
              >
                Delete Forever
              </button>
            </div>
          </div>
        </div>
      )}
    </ReactFlowProvider>
  );
};

export default FeedMindMapNode;