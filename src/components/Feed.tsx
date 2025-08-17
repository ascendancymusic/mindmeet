import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabaseClient";
import FeedMindMapNode from "./FeedMindMapNode";
import { Loader } from "lucide-react";
import { useInView } from "react-intersection-observer";
import { useAuthStore } from "../store/authStore";

interface MindMap {
  permalink: string;
  id: string;
  title: string;
  json_data: {
    nodes: any[];
    edges: any[];
  };
  creator: string;
  created_at: string;
  likes?: number;
  liked_by?: string[];
  comment_count?: number;
  saves?: number;
  saved_by?: string[];
  description?: string;
  visibility?: "public" | "private";
  is_main?: boolean;
}

interface FeedProps {
  filter?: 'for-you' | 'following';
}

const Feed: React.FC<FeedProps> = ({ filter = 'for-you' }) => {
  const { user } = useAuthStore();
  const [mindmaps, setMindmaps] = useState<MindMap[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const { ref, inView } = useInView({
    threshold: 0, // Trigger as soon as the element enters the viewport
    triggerOnce: false // Keep observing
  });

  // Handle mindmap deletion
  const handleMindmapDelete = useCallback((mindmapId: string) => {
    setMindmaps(prev => prev.filter(mindmap => mindmap.permalink !== mindmapId));
  }, []);

  // Fetch user's following list
  const fetchFollowingIds = async () => {
    if (!user?.id) return [];

    try {
      const { data, error } = await supabase
        .from("user_follows")
        .select("followed_id")
        .eq("follower_id", user.id);

      if (error) {
        console.error("Error fetching following:", error);
        return [];
      }

      return data?.map(follow => follow.followed_id) || [];
    } catch (err) {
      console.error("Error fetching following:", err);
      return [];
    }
  };

  const fetchPublicMindmaps = useCallback(async (pageNumber: number, isLoadingMore: boolean = false) => {
    try {
      if (isLoadingMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      const pageSize = 5;
      const from = (pageNumber - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from("mindmaps")
        .select("permalink, id, title, json_data, likes, liked_by, comment_count, saves, saved_by, creator, created_at, description, visibility, is_main, collaborators, published_at")
        .eq("visibility", "public")
        .not("published_at", "is", null)
        .order("published_at", { ascending: false });

      // Apply filter based on tab selection
      if (filter === 'following') {
        if (followingIds.length > 0) {
          query = query.in("creator", followingIds);
        } else {
          // If no following IDs, return empty result to show appropriate message
          setHasMore(false);
          if (isLoadingMore) {
            setMindmaps(prev => [...prev]);
          } else {
            setMindmaps([]);
          }
          return;
        }
      }

      const { data, error } = await query.range(from, to);

      if (error) {
        throw error;
      }

      // Check if we have more data to load
      setHasMore(data.length === pageSize);

      if (isLoadingMore) {
        setMindmaps(prev => [...prev, ...data]);
      } else {
        setMindmaps(data || []);
      }
    } catch (err: any) {
      console.error("Error fetching public mindmaps:", err);
      setError(err.message || "Failed to load mindmaps");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [filter, followingIds]);

  // Initial load and when filter changes
  useEffect(() => {
    const initializeFeed = async () => {
      // Reset pagination when filter changes
      setPage(1);
      setHasMore(true);

      if (filter === 'following') {
        const following = await fetchFollowingIds();
        setFollowingIds(following);
        // Don't call fetchPublicMindmaps here, let the followingIds useEffect handle it
      } else {
        fetchPublicMindmaps(1);
      }
    };

    initializeFeed();
  }, [filter]);

  // Fetch mindmaps when followingIds change (for following tab)
  useEffect(() => {
    if (filter === 'following' && followingIds.length >= 0) {
      // Reset pagination and fetch mindmaps with the updated following IDs
      setPage(1);
      setHasMore(true);
      fetchPublicMindmaps(1);
    }
  }, [followingIds, filter]);

  // Handle loading more
  const handleLoadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchPublicMindmaps(nextPage, true);
    }
  }, [loadingMore, hasMore, page, fetchPublicMindmaps]);

  // Effect for infinite scrolling
  useEffect(() => {
    if (inView && hasMore && !loadingMore) {
      handleLoadMore();
    }
  }, [inView, hasMore, loadingMore, handleLoadMore]);

  if (loading) {
    return (
      <div className="w-full space-y-6">
        {Array.from({ length: 3 }, (_, index) => (
          <FeedMindMapNode key={`skeleton-${index}`} mindmap={null} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-xl rounded-2xl border border-slate-700/50 shadow-xl p-6 text-center">
        <p className="text-red-400 mb-2 font-medium">Error loading feed</p>
        <p className="text-slate-300">{error}</p>
      </div>
    );
  }

  if (mindmaps.length === 0) {
    const emptyMessage = filter === 'following'
      ? "No mindmaps from users you follow yet. Start following users to see their content here!"
      : "Your feed is empty. Start creating mind maps or follow other users to see their mind maps here!";

    return (
      <div className="w-full bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-xl rounded-2xl border border-slate-700/50 shadow-xl p-8 text-center">
        <p className="text-lg font-medium text-slate-200 mb-6 leading-relaxed">
          {emptyMessage}
        </p>
        <button className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-xl transition-all duration-200 font-medium transform hover:scale-105 shadow-lg">
          Discover Users
        </button>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="space-y-4">
        {mindmaps.map((mindmap) => (
          <FeedMindMapNode key={mindmap.permalink} mindmap={mindmap} onDelete={handleMindmapDelete} />
        ))}
      </div>

      {/* Intersection Observer Trigger */}
      <div ref={ref} className="h-10" />

      {/* Loading indicator at the bottom */}
      {loadingMore && (
        <div className="flex justify-center py-6">
          <div className="bg-gradient-to-br from-slate-800/40 to-slate-900/40 backdrop-blur-xl rounded-2xl p-4 border border-slate-700/30 shadow-xl">
            <div className="flex items-center gap-3">
              <Loader className="w-5 h-5 text-blue-400 animate-spin" />
              <span className="text-slate-300 font-medium">Loading more mindmaps...</span>
            </div>
          </div>
        </div>
      )}

      {/* Message when no more items */}
      {!hasMore && mindmaps.length > 0 && (
        <div className="flex justify-center py-6">
          <div className="bg-gradient-to-br from-slate-800/40 to-slate-900/40 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/30 shadow-xl text-center">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center mx-auto mb-3">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-500"></div>
            </div>
            <p className="text-slate-300 font-medium mb-1">You've reached the end!</p>
            <p className="text-slate-400 text-sm">Check back later for more amazing mindmaps</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Feed;
