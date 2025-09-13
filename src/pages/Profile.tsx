/**
 * Profile.tsx - User Profile Page
 * 
 * IMPORTANT: This component has been migrated to use optimized database tables instead of 
 * array/JSONB columns for better performance and scalability.
 * 
 * Database Migration Details:
 * - LIKES: Uses mindmap_likes + mindmap_like_counts tables instead of mindmaps.liked_by array
 * - SAVES: Uses mindmap_saves + mindmap_save_counts tables instead of mindmaps.saved_by array and profiles.saves
 * - COLLABORATIONS: Uses mindmap_collaborations table instead of mindmaps.collaborators array
 * 
 * Client-side arrays (liked_by, saved_by) are now simplified for UI state management:
 * - Contains user ID only when user has liked/saved (for icon highlighting)
 * - Actual counts come from dedicated count tables
 * - Database operations handled by useMindMapActions hook
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react"
import { supabase } from "../supabaseClient"
import { useAuthStore } from "../store/authStore"
import { usePageTitle } from '../hooks/usePageTitle'
import MindMapRenderer from "../components/MindMapRenderer"
import { formatDateWithPreference } from "../utils/dateUtils"
import eventEmitter from "../services/eventService"
import {
  Calendar,
  Edit2,
  Network,
  MoreVertical,
  Trash2,
  AlertTriangle,
  Heart,
  MessageCircle,
  Bookmark,
  Camera,
  X,
  Check,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Share2,
  Star,
  Users,
  Info,
} from "lucide-react"

// Add shimmer animation styles and responsive height classes
const shimmerStyles = `
  @keyframes shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }
  .animate-shimmer {
    animation: shimmer 2s infinite;
  }
  
  /* Custom responsive height classes */
  @media (max-height: 1090px) {
    .compact-container { padding: 1rem !important; }
    .compact-card { padding: 1rem !important; }
    .compact-gap { gap: 1rem !important; }
    .compact-gap-sm { gap: 0.75rem !important; }
    .compact-margin { margin-top: 1rem !important; }
    .compact-padding { padding-top: 0.75rem !important; }
    .compact-preview { height: 12rem !important; margin-bottom: 1rem !important; }
  }
`

// Inject styles into the document head
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style')
  styleSheet.type = 'text/css'
  styleSheet.innerText = shimmerStyles
  document.head.appendChild(styleSheet)
}
import { format } from "date-fns"
import { useMindMapStore } from "../store/mindMapStore"
import { useMindMapActions } from "../hooks/useMindMapActions"
import AvatarEditor from "react-avatar-editor"
import UserListModal from '../components/UserListModal'
import EditDetailsModal from '../components/EditDetailsModal'
import ShareModal from '../components/ShareModal'
import InfoModal from '../components/InfoModal'
import PublishSuccessModal from '../components/PublishSuccessModal'
import { Toast } from '../components/Toast'
import { useToastStore } from '../store/toastStore'
import { useNotificationStore } from '../store/notificationStore';

// Memoized ReactFlow preview component to prevent unnecessary re-renders
const ProfileMindMapPreview = React.memo(({ map, isSmallScreen }: { map: any, isSmallScreen: boolean }) => {
  // Parse the mindmap data for the renderer
  const mindMapData = {
    nodes: map.nodes || [],
    edges: map.edges || [],
    backgroundColor: map.json_data?.backgroundColor,
    fontFamily: map.json_data?.fontFamily,
    edgeType: map.edgeType
  }

  return (
    <MindMapRenderer
      mindMapData={mindMapData}
      drawingData={map.drawing_data}
      interactive={false}
      zoomable={!isSmallScreen}
      pannable={!isSmallScreen}
      doubleClickZoom={false}
      selectable={false}
      preventScrolling={!isSmallScreen}
      minZoom={0.1}
      maxZoom={2}
    />
  )
}, (prevProps, nextProps) => {
  // Custom comparison function for React.memo
  return (
    prevProps.map.permalink === nextProps.map.permalink &&
    prevProps.map.updatedAt === nextProps.map.updatedAt &&
    JSON.stringify(prevProps.map.nodes) === JSON.stringify(nextProps.map.nodes) &&
    JSON.stringify(prevProps.map.edges) === JSON.stringify(nextProps.map.edges) &&
    prevProps.map.json_data?.backgroundColor === nextProps.map.json_data?.backgroundColor &&
    prevProps.map.json_data?.fontFamily === nextProps.map.json_data?.fontFamily &&
    prevProps.map.edgeType === nextProps.map.edgeType &&
    prevProps.map.drawing_data === nextProps.map.drawing_data &&
    prevProps.isSmallScreen === nextProps.isSmallScreen
  )
})

const SkeletonLoader = () => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-[2vh] compact-gap">
      {[...Array(4)].map((_, index) => (
        <div
          key={index}
          className="bg-gradient-to-br from-slate-800/70 via-slate-900/90 to-slate-800/70 backdrop-blur-xl rounded-2xl p-[2vh] compact-card border border-slate-700/30 shadow-xl animate-pulse"
          style={{ animationDelay: `${index * 150}ms` }}
        >
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
          <div className="h-56 compact-preview bg-slate-800/50 rounded-xl border border-slate-700/50 relative overflow-hidden">
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
      ))}
    </div>
  )
}


interface ProfileData {
  username: string
  full_name: string
  join_date: string
  description: string
  avatar_url?: string
  followers: number // Fetched from user_followers_count table
  following_count: number // Fetched from user_following_count table
}

// Username availability status
type UsernameStatus = "checking" | "available" | "taken" | "invalid" | "unavailable" | "unchanged" | "empty" | `wait_${number}`

export default function Profile() {
  const { user } = useAuthStore()
  const { message: toastMessage, type: toastType, isVisible: toastVisible, hideToast } = useToastStore()

  // Add local state for maps instead of using mindMapStore
  const [userMaps, setUserMaps] = useState<any[]>([])
  const [collaborationMaps, setCollaborationMaps] = useState<any[]>([])
  const [savedMaps, setSavedMaps] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<"mindmaps" | "collaborations" | "saves">("mindmaps")

  // Add mindmap actions hook with enhanced save handling for saves tab
  const { handleLike: hookHandleLike, handleSave: hookHandleSave } = useMindMapActions({
    onLikeUpdate: (mapPermalink, newLikes, newLikedBy) => {
      const updatedMaps = userMaps.map((map) =>
        map.id === mapPermalink || map.permalink === mapPermalink ? { ...map, likes: newLikes, liked_by: newLikedBy } : map
      );
      setUserMaps(updatedMaps);
    },
    onSaveUpdate: (mapPermalink, newSaves, newSavedBy) => {
      const updatedMaps = userMaps.map((map) =>
        map.id === mapPermalink || map.permalink === mapPermalink ? { ...map, saves: newSaves, saved_by: newSavedBy } : map
      );
      setUserMaps(updatedMaps);

      // Also update savedMaps when saving/unsaving from mindmaps tab
      const mapToUpdate = userMaps.find(map => map.id === mapPermalink || map.permalink === mapPermalink);
      if (mapToUpdate && user?.id) {
        if (newSavedBy.length > 0) {
          // Map was saved - add it to savedMaps if not already there
          setSavedMaps((prevSavedMaps) => {
            const exists = prevSavedMaps.find(savedMap => savedMap.id === mapToUpdate.id);
            let updatedSavedMaps;
            if (!exists) {
              // Add creator info since userMaps don't have it (they're user's own maps)
              const mapWithCreatorInfo = {
                ...mapToUpdate,
                saves: newSaves,
                saved_by: newSavedBy,
                creatorUsername: profile?.username || user?.username || 'Unknown',
                creatorFull_name: profile?.full_name || user?.full_name || profile?.username || user?.username || 'Unknown',
                creatorAvatar: profile?.avatar_url || user?.avatar_url || null
              };
              updatedSavedMaps = [...prevSavedMaps, mapWithCreatorInfo];
            } else {
              updatedSavedMaps = prevSavedMaps.map(savedMap =>
                savedMap.id === mapToUpdate.id ? { ...savedMap, saves: newSaves, saved_by: newSavedBy } : savedMap
              );
            }
            return updatedSavedMaps;
          });
        } else {
          // Map was unsaved - remove it from savedMaps
          setSavedMaps((prevSavedMaps) => {
            const updatedSavedMaps = prevSavedMaps.filter(savedMap => savedMap.id !== mapToUpdate.id);
            return updatedSavedMaps;
          });
        }
      }
    },
    sendNotifications: false // Disable notifications for user's own profile
  });

  // Add separate handlers for collaboration maps with notifications enabled
  const { handleLike: collabHandleLike, handleSave: collabHandleSave } = useMindMapActions({
    onLikeUpdate: (mapPermalink, newLikes, newLikedBy) => {
      const updatedCollabMaps = collaborationMaps.map((map) =>
        map.id === mapPermalink || map.permalink === mapPermalink ? { ...map, likes: newLikes, liked_by: newLikedBy } : map
      );
      setCollaborationMaps(updatedCollabMaps);
    },
    onSaveUpdate: (mapPermalink, newSaves, newSavedBy) => {
      const updatedCollabMaps = collaborationMaps.map((map) =>
        map.id === mapPermalink || map.permalink === mapPermalink ? { ...map, saves: newSaves, saved_by: newSavedBy } : map
      );
      setCollaborationMaps(updatedCollabMaps);

      // Also update savedMaps when saving/unsaving from collaborations tab
      const mapToUpdate = collaborationMaps.find(map => map.id === mapPermalink || map.permalink === mapPermalink);
      if (mapToUpdate && user?.id) {
        if (newSavedBy.length > 0) {
          // Map was saved - add it to savedMaps if not already there
          setSavedMaps((prevSavedMaps) => {
            const exists = prevSavedMaps.find(savedMap => savedMap.id === mapToUpdate.id);
            if (!exists) {
              return [...prevSavedMaps, { ...mapToUpdate, saves: newSaves, saved_by: newSavedBy }];
            } else {
              return prevSavedMaps.map(savedMap =>
                savedMap.id === mapToUpdate.id ? { ...savedMap, saves: newSaves, saved_by: newSavedBy } : savedMap
              );
            }
          });
        } else {
          // Map was unsaved - remove it from savedMaps
          setSavedMaps((prevSavedMaps) => {
            return prevSavedMaps.filter(savedMap => savedMap.id !== mapToUpdate.id);
          });
        }
      }
    },
    sendNotifications: true // Enable notifications for collaboration maps
  });

  // Add handlers for saved maps with notifications enabled
  const { handleLike: savedHandleLike, handleSave: savedHandleSave } = useMindMapActions({
    onLikeUpdate: (mapPermalink, newLikes, newLikedBy) => {
      const updatedSavedMaps = savedMaps.map((map) =>
        map.id === mapPermalink || map.permalink === mapPermalink ? { ...map, likes: newLikes, liked_by: newLikedBy } : map
      );
      setSavedMaps(updatedSavedMaps);
    },
    onSaveUpdate: (mapPermalink, newSaves, newSavedBy) => {
      // Update savedMaps state
      setSavedMaps((prevMaps) => {
        if (user?.id && newSavedBy.length === 0) {
          // Map was unsaved - remove it from savedMaps
          return prevMaps.filter(map => map.id !== mapPermalink && map.permalink !== mapPermalink);
        } else {
          // Map was saved or liked count changed - update it
          return prevMaps.map((map) =>
            map.id === mapPermalink || map.permalink === mapPermalink ? { ...map, saves: newSaves, saved_by: newSavedBy } : map
          );
        }
      });

      // Also update userMaps if this map belongs to the user
      const updatedUserMaps = userMaps.map((map) =>
        map.id === mapPermalink || map.permalink === mapPermalink ? { ...map, saves: newSaves, saved_by: newSavedBy } : map
      );
      if (updatedUserMaps !== userMaps) {
        setUserMaps(updatedUserMaps);
      }

      // Also update collaborationMaps if this map is in collaborations
      const updatedCollabMaps = collaborationMaps.map((map) =>
        map.id === mapPermalink || map.permalink === mapPermalink ? { ...map, saves: newSaves, saved_by: newSavedBy } : map
      );
      if (updatedCollabMaps !== collaborationMaps) {
        setCollaborationMaps(updatedCollabMaps);
      }
    },
    sendNotifications: true // Enable notifications for saved maps
  });

  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  const [mapToDelete, setMapToDelete] = useState<string | null>(null)
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false)
  const [editProfileData, setEditProfileData] = useState({
    username: "",
    full_name: "",
    description: "",
  })

  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [countsLoaded, setCountsLoaded] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Username availability state
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>("empty")
  const usernameCheckTimeout = useRef<NodeJS.Timeout | null>(null)
  const originalUsername = useRef<string>("")

  // Avatar editor state
  const [isAvatarEditorOpen, setIsAvatarEditorOpen] = useState(false)
  const [avatarImage, setAvatarImage] = useState<File | null>(null)
  const [avatarScale, setAvatarScale] = useState(1)
  const [isUploading, setIsUploading] = useState(false)
  const avatarEditorRef = useRef<AvatarEditor | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [mapToEdit, setMapToEdit] = useState<string | null>(null) // Add missing state for mapToEdit

  // Dynamic page title
  usePageTitle('My Profile');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalUserIds, setModalUserIds] = useState<string[]>([]);

  // Share modal state
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareMapData, setShareMapData] = useState<{ id: string, title: string, is_main: boolean, creatorUsername: string, mindmapId?: string } | null>(null);

  // Info modal state
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [infoMapData, setInfoMapData] = useState<any>(null);

  // Success popup state
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);

  // Track screen size to control preview interactions
  const [isSmallScreen, setIsSmallScreen] = useState(typeof window !== 'undefined' ? window.innerWidth < 1080 : false);
  const handleResize = useCallback(() => {
    setIsSmallScreen(window.innerWidth < 1080);
  }, []);
  useEffect(() => {
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

  const openModal = (title: string, userIds: string[]) => {
    setModalTitle(title);
    setModalUserIds(userIds);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setModalTitle('');
    setModalUserIds([]);
  };

  // Function to handle sharing a map
  const handleShare = (mapPermalink: string, mapTitle: string, isMain: boolean, creatorUsername: string, mapId?: string) => {
    setShareMapData({ id: mapPermalink, title: mapTitle, is_main: isMain, creatorUsername, mindmapId: mapId });
    setIsShareModalOpen(true);
  };

  // Function to close the share modal
  const closeShareModal = () => {
    setIsShareModalOpen(false);
    setShareMapData(null);
  };

  // Function to handle opening info modal
  const handleOpenInfo = (map: any) => {
    setInfoMapData(map);
    setIsInfoModalOpen(true);
  };

  // Function to close the info modal
  const closeInfoModal = () => {
    setIsInfoModalOpen(false);
    setInfoMapData(null);
  };

  // Listen for follow/unfollow events from UserListModal
  useEffect(() => {
    const handleFollowToggle = (data: { action: 'follow' | 'unfollow', targetUserId: string, currentUserId: string }) => {
      if (!user?.id || !profile) return;

      // Update counts based on the follow action
      if (data.currentUserId === user.id) {
        // Current user is following/unfollowing someone else - update following count
        setProfile(prevProfile => {
          if (!prevProfile) return prevProfile;
          return {
            ...prevProfile,
            following_count: data.action === 'follow'
              ? prevProfile.following_count + 1
              : Math.max(prevProfile.following_count - 1, 0)
          };
        });
      } else if (data.targetUserId === user.id) {
        // Someone is following/unfollowing the current user - update followers count
        setProfile(prevProfile => {
          if (!prevProfile) return prevProfile;
          return {
            ...prevProfile,
            followers: data.action === 'follow'
              ? prevProfile.followers + 1
              : Math.max(prevProfile.followers - 1, 0)
          };
        });
      }
    };

    // Subscribe to follow toggle events
    eventEmitter.on('followToggle', handleFollowToggle);

    // Cleanup
    return () => {
      eventEmitter.off('followToggle', handleFollowToggle);
    };
  }, [user?.id, profile]);

  // Load profile data and maps
  useEffect(() => {
    const fetchProfileAndMaps = async () => {
      if (!user?.id) {
        setIsLoading(false)
        return
      }

      setIsLoading(true)

      // Fetch profile data
      let profileData = null;
      try {
        // Fetch all data in parallel for better performance
        const [profileResult, followerCountResult, followingCountResult] = await Promise.all([
          supabase
            .from("profiles")
            .select("username, full_name, join_date, description, avatar_url")
            .eq("id", user.id)
            .single(),
          supabase
            .from("user_followers_count")
            .select("followers_count")
            .eq("user_id", user.id)
            .single(),
          supabase
            .from("user_following_count")
            .select("following_count")
            .eq("user_id", user.id)
            .single()
        ]);

        if (profileResult.error) {
          console.error("Error fetching profile:", profileResult.error)
          return;
        }

        const data = profileResult.data;
        const followersCount = followerCountResult.data?.followers_count || 0;
        const followingCount = followingCountResult.data?.following_count || 0;

        // Log any errors for the count queries (but don't fail)
        if (followerCountResult.error) {
          console.log("No follower count record found, defaulting to 0");
        }
        if (followingCountResult.error) {
          console.log("No following count record found, defaulting to 0");
        }

        // Set profile data with counts from new tables only
        profileData = {
          username: data.username,
          full_name: data.full_name,
          join_date: data.join_date,
          description: data.description,
          avatar_url: data.avatar_url,
          followers: followersCount, // Always use count from user_followers_count table
          following_count: followingCount // Always use count from user_following_count table
        }

        setProfile(profileData)
        setCountsLoaded(true)
        setEditProfileData({
          username: data.username || "",
          full_name: data.full_name || "",
          description: data.description || "",
        })
      } catch (error) {
        console.error("Error in profile fetch:", error)
      }

      // Fetch user's own mindmaps with optimized database queries
      try {
        const { data: mapsData, error: mapsError } = await supabase
          .from("mindmaps")
          .select("permalink, id, title, json_data, drawing_data, updated_at, visibility, comment_count, description, is_main, published_at")
          .eq("creator", user.id)

        if (mapsError) {
          console.error("Error fetching mind maps:", mapsError)
          setUserMaps([])
        } else if (mapsData) {
          // Get map IDs for efficient batch queries
          const mapIds = mapsData.map(map => map.id);

          // Fetch likes data for all maps using optimized batch queries
          const [likesResult, savesResult, collaborationsResult] = await Promise.all([
            // Get like counts from aggregated table (more efficient than counting rows)
            supabase
              .from("mindmap_like_counts")
              .select("mindmap_id, like_count")
              .in("mindmap_id", mapIds),
            // Get save counts from aggregated table
            supabase
              .from("mindmap_save_counts")
              .select("mindmap_id, save_count")
              .in("mindmap_id", mapIds),
            // Get collaborations from dedicated table
            supabase
              .from("mindmap_collaborations")
              .select("mindmap_id, collaborator_id, status")
              .in("mindmap_id", mapIds)
              .eq("status", "accepted")
          ]);

          // Get user's specific likes and saves
          const [userLikesResult, userSavesResult] = await Promise.all([
            supabase
              .from("mindmap_likes")
              .select("mindmap_id")
              .in("mindmap_id", mapIds)
              .eq("user_id", user.id),
            supabase
              .from("mindmap_saves")
              .select("mindmap_id")
              .in("mindmap_id", mapIds)
              .eq("user_id", user.id)
          ]);

          // Create lookup maps for efficient data access
          const likeCountsMap = new Map(
            likesResult.data?.map(item => [item.mindmap_id, item.like_count]) || []
          );
          const saveCountsMap = new Map(
            savesResult.data?.map(item => [item.mindmap_id, item.save_count]) || []
          );
          const collaborationsMap = new Map<string, string[]>();
          collaborationsResult.data?.forEach(collab => {
            const existing = collaborationsMap.get(collab.mindmap_id) || [];
            existing.push(collab.collaborator_id);
            collaborationsMap.set(collab.mindmap_id, existing);
          });

          // Create sets for quick user status lookup
          const userLikedSet = new Set(userLikesResult.data?.map(item => item.mindmap_id) || []);
          const userSavedSet = new Set(userSavesResult.data?.map(item => item.mindmap_id) || []);

          const processedMaps = mapsData.map((map) => ({
            ...map,
            nodes: map.json_data?.nodes || [],
            edges: map.json_data?.edges || [],
            edgeType: map.json_data?.edgeType || 'default',
            updatedAt: map.updated_at ? new Date(map.updated_at).getTime() : Date.now(),
            description: map.description || "",
            comment_count: map.comment_count || 0,
            createdAt: Date.now(),
            is_main: map.is_main || false,
            // Use new optimized data structure - counts from dedicated tables
            likes: likeCountsMap.get(map.id) || 0,
            saves: saveCountsMap.get(map.id) || 0,
            liked_by: userLikedSet.has(map.id) ? [user.id] : [], // Simplified for client-side UI state
            saved_by: userSavedSet.has(map.id) ? [user.id] : [], // Simplified for client-side UI state
            collaborators: collaborationsMap.get(map.id) || [],
            creatorUsername: profileData?.username || user?.username || 'Unknown',
            creatorFull_name: profileData?.full_name || user?.full_name || 'Unknown',
            creatorAvatar: profileData?.avatar_url || user?.avatar_url || null,
          })).sort((a, b) => b.updatedAt - a.updatedAt);
          
          setUserMaps(processedMaps);
        }
      } catch (error) {
        console.error("Error in mind maps fetch:", error)
        setUserMaps([])
      }

      // Fetch collaboration maps using new mindmap_collaborations table
      try {
        // First get collaboration records for the current user
        const { data: userCollaborations, error: collaborationsError } = await supabase
          .from("mindmap_collaborations")
          .select("mindmap_id")
          .eq("collaborator_id", user.id)
          .eq("status", "accepted");

        if (collaborationsError) {
          console.error("Error fetching collaborations:", collaborationsError);
          setCollaborationMaps([]);
        } else if (userCollaborations && userCollaborations.length > 0) {
          const collaborationMapIds = userCollaborations.map(collab => collab.mindmap_id);

          // Fetch the actual mindmap data for collaborated maps
          const { data: collabData, error: collabError } = await supabase
            .from("mindmaps")
            .select("permalink, id, title, json_data, drawing_data, updated_at, visibility, comment_count, description, is_main, creator, published_at")
            .in("id", collaborationMapIds)
            .eq("visibility", "public");

          if (collabError) {
            console.error("Error fetching collaboration maps data:", collabError);
            setCollaborationMaps([]);
          } else if (collabData && collabData.length > 0) {
            // Get additional data for collaboration maps
            const mapIds = collabData.map(map => map.id);
            const creatorIds = [...new Set(collabData.map((map) => map.creator))];

            const [likesResult, savesResult, collaborationsResult, profilesResult] = await Promise.all([
              // Get like counts
              supabase
                .from("mindmap_like_counts")
                .select("mindmap_id, like_count")
                .in("mindmap_id", mapIds),
              // Get save counts
              supabase
                .from("mindmap_save_counts")
                .select("mindmap_id, save_count")
                .in("mindmap_id", mapIds),
              // Get all collaborations for these maps
              supabase
                .from("mindmap_collaborations")
                .select("mindmap_id, collaborator_id, status")
                .in("mindmap_id", mapIds)
                .eq("status", "accepted"),
              // Get creator profiles
              supabase
                .from("profiles")
                .select("id, avatar_url, username, full_name")
                .in("id", creatorIds)
            ]);

            // Get user's specific likes and saves
            const [userLikesResult, userSavesResult] = await Promise.all([
              supabase
                .from("mindmap_likes")
                .select("mindmap_id")
                .in("mindmap_id", mapIds)
                .eq("user_id", user.id),
              supabase
                .from("mindmap_saves")
                .select("mindmap_id")
                .in("mindmap_id", mapIds)
                .eq("user_id", user.id)
            ]);

            // Create lookup maps
            const likeCountsMap = new Map(
              likesResult.data?.map(item => [item.mindmap_id, item.like_count]) || []
            );
            const saveCountsMap = new Map(
              savesResult.data?.map(item => [item.mindmap_id, item.save_count]) || []
            );
            const collaborationsMap = new Map<string, string[]>();
            collaborationsResult.data?.forEach(collab => {
              const existing = collaborationsMap.get(collab.mindmap_id) || [];
              existing.push(collab.collaborator_id);
              collaborationsMap.set(collab.mindmap_id, existing);
            });

            const creatorAvatars = new Map();
            const creatorUsernames = new Map();
            const creatorFullNames = new Map();
            profilesResult.data?.forEach((profile) => {
              creatorAvatars.set(profile.id, profile.avatar_url);
              creatorUsernames.set(profile.id, profile.username);
              creatorFullNames.set(profile.id, profile.full_name);
            });

            // Create sets for quick user status lookup
            const userLikedSet = new Set(userLikesResult.data?.map(item => item.mindmap_id) || []);
            const userSavedSet = new Set(userSavesResult.data?.map(item => item.mindmap_id) || []);

            const processedCollabMaps = collabData
              .map((map) => ({
                ...map,
                nodes: map.json_data?.nodes || [],
                edges: map.json_data?.edges || [],
                edgeType: map.json_data?.edgeType || 'default',
                updatedAt: map.updated_at ? new Date(map.updated_at).getTime() : Date.now(),
                description: map.description || "",
                comment_count: map.comment_count || 0,
                createdAt: Date.now(),
                is_main: map.is_main || false,
                // Use new optimized data structure
                likes: likeCountsMap.get(map.id) || 0,
                saves: saveCountsMap.get(map.id) || 0,
                liked_by: userLikedSet.has(map.id) ? [user.id] : [],
                saved_by: userSavedSet.has(map.id) ? [user.id] : [],
                collaborators: collaborationsMap.get(map.id) || [],
                creatorUsername: creatorUsernames.get(map.creator) || "Unknown",
                creatorFull_name: creatorFullNames.get(map.creator) || creatorUsernames.get(map.creator) || "Unknown",
                creatorAvatar: creatorAvatars.get(map.creator) || null,
              }))
              .sort((a, b) => b.updatedAt - a.updatedAt);
            
            setCollaborationMaps(processedCollabMaps);
          } else {
            setCollaborationMaps([]);
          }
        } else {
          setCollaborationMaps([]);
        }
      } catch (error) {
        console.error("Error in collaboration maps fetch:", error);
        setCollaborationMaps([]);
      }

      // Fetch saved maps using new mindmap_saves table
      try {
        // Get maps saved by the current user
        const { data: userSaves, error: savesError } = await supabase
          .from("mindmap_saves")
          .select("mindmap_id")
          .eq("user_id", user.id);

        if (savesError) {
          console.error("Error fetching user saves:", savesError);
          setSavedMaps([]);
        } else if (userSaves && userSaves.length > 0) {
          const savedMapIds = userSaves.map(save => save.mindmap_id);

          // Fetch the actual mindmap data for saved maps
          const { data: savedMapsData, error: savedMapsError } = await supabase
            .from("mindmaps")
            .select("permalink, id, title, json_data, drawing_data, updated_at, visibility, comment_count, description, is_main, creator")
            .in("id", savedMapIds)
            .eq("visibility", "public");

          if (savedMapsError) {
            console.error("Error fetching saved maps:", savedMapsError);
            setSavedMaps([]);
          } else if (savedMapsData && savedMapsData.length > 0) {
            // Get additional data for saved maps
            const mapIds = savedMapsData.map(map => map.id);
            const creatorIds = [...new Set(savedMapsData.map((map) => map.creator))];

            const [likesResult, savesResult, collaborationsResult, profilesResult] = await Promise.all([
              // Get like counts
              supabase
                .from("mindmap_like_counts")
                .select("mindmap_id, like_count")
                .in("mindmap_id", mapIds),
              // Get save counts
              supabase
                .from("mindmap_save_counts")
                .select("mindmap_id, save_count")
                .in("mindmap_id", mapIds),
              // Get collaborations
              supabase
                .from("mindmap_collaborations")
                .select("mindmap_id, collaborator_id, status")
                .in("mindmap_id", mapIds)
                .eq("status", "accepted"),
              // Get creator profiles
              supabase
                .from("profiles")
                .select("id, avatar_url, username, full_name")
                .in("id", creatorIds)
            ]);

            // Get user's specific likes and saves
            const [userLikesResult, userSavesResult] = await Promise.all([
              supabase
                .from("mindmap_likes")
                .select("mindmap_id")
                .in("mindmap_id", mapIds)
                .eq("user_id", user.id),
              supabase
                .from("mindmap_saves")
                .select("mindmap_id")
                .in("mindmap_id", mapIds)
                .eq("user_id", user.id)
            ]);

            // Create lookup maps
            const likeCountsMap = new Map(
              likesResult.data?.map(item => [item.mindmap_id, item.like_count]) || []
            );
            const saveCountsMap = new Map(
              savesResult.data?.map(item => [item.mindmap_id, item.save_count]) || []
            );
            const collaborationsMap = new Map<string, string[]>();
            collaborationsResult.data?.forEach(collab => {
              const existing = collaborationsMap.get(collab.mindmap_id) || [];
              existing.push(collab.collaborator_id);
              collaborationsMap.set(collab.mindmap_id, existing);
            });

            const creatorAvatars = new Map();
            const creatorUsernames = new Map();
            const creatorFullNames = new Map();
            profilesResult.data?.forEach((profile) => {
              creatorAvatars.set(profile.id, profile.avatar_url);
              creatorUsernames.set(profile.id, profile.username);
              creatorFullNames.set(profile.id, profile.full_name);
            });

            // Create sets for quick user status lookup
            const userLikedSet = new Set(userLikesResult.data?.map(item => item.mindmap_id) || []);
            const userSavedSet = new Set(userSavesResult.data?.map(item => item.mindmap_id) || []);

            const processedSavedMaps = savedMapsData
              .map((map) => ({
                ...map,
                nodes: map.json_data?.nodes || [],
                edges: map.json_data?.edges || [],
                edgeType: map.json_data?.edgeType || 'default',
                updatedAt: map.updated_at ? new Date(map.updated_at).getTime() : Date.now(),
                description: map.description || "",
                comment_count: map.comment_count || 0,
                createdAt: Date.now(),
                is_main: map.is_main || false,
                // Use new optimized data structure
                likes: likeCountsMap.get(map.id) || 0,
                saves: saveCountsMap.get(map.id) || 0,
                liked_by: userLikedSet.has(map.id) ? [user.id] : [],
                saved_by: userSavedSet.has(map.id) ? [user.id] : [], // Should always include user.id since these are saved maps
                collaborators: collaborationsMap.get(map.id) || [],
                creatorUsername: creatorUsernames.get(map.creator) || "Unknown",
                creatorFull_name: creatorFullNames.get(map.creator) || creatorUsernames.get(map.creator) || "Unknown",
                creatorAvatar: creatorAvatars.get(map.creator) || null,
              }))
              .sort((a, b) => b.updatedAt - a.updatedAt);
            
            setSavedMaps(processedSavedMaps);
          } else {
            setSavedMaps([]);
          }
        } else {
          setSavedMaps([]);
        }
      } catch (error) {
        console.error("Error in saved maps fetch:", error);
        setSavedMaps([]);
      }

      setIsLoading(false)
    }

    if (user?.id) {
      fetchProfileAndMaps()
    }
  }, [user?.id])

  // Check username availability
  const checkUsernameAvailability = async (username: string) => {
    // If username is empty, set status to empty
    if (!username.trim()) {
      setUsernameStatus("empty")
      return
    }

    // If username is the same as original, set status to unchanged
    if (username === originalUsername.current) {
      setUsernameStatus("unchanged")
      return
    }

    // Check if username is valid (3-20 chars, only letters, numbers, underscores)
    if (username.length < 3 || !/^[a-z0-9_]+$/.test(username)) {
      setUsernameStatus("invalid")
      return
    }

    // Check if username is reserved
    const reservedUsernames = [
      'admin', 'root', 'user', 'guest', 'support',
      'test', 'moderator', 'superuser', 'administrator',
      'info', 'contact', 'help', 'service', 'feedback',
      'abuse', 'signup', 'settings', 'profile', 'chat',
      'mindmap', 'login', 'reset-password'
    ];

    if (reservedUsernames.includes(username.toLowerCase())) {
      setUsernameStatus("unavailable")
      return
    }

    // Check if username can be updated (14-day restriction)
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("username_updated_at")
        .eq("id", user?.id)
        .single()

      if (error) throw error

      const lastUpdated = data?.username_updated_at ? new Date(data.username_updated_at) : null
      const now = new Date()

      if (lastUpdated && now.getTime() - lastUpdated.getTime() < 14 * 24 * 60 * 60 * 1000) {
        const daysRemaining = Math.ceil(
          (14 * 24 * 60 * 60 * 1000 - (now.getTime() - lastUpdated.getTime())) / (24 * 60 * 60 * 1000)
        )
        setUsernameStatus(`wait_${daysRemaining}`)
        return
      }
    } catch (error) {
      console.error("Error checking username update restriction:", error)
      setUsernameStatus("invalid")
      return
    }

    // Set status to checking and start the actual check
    setUsernameStatus("checking")

    try {
      // Check if username exists in database
      const { data, error } = await supabase.from("profiles").select("username").eq("username", username).limit(1)

      if (error) throw error

      // If data exists and has length, username is taken
      if (data && data.length > 0) {
        setUsernameStatus("taken")
      } else {
        setUsernameStatus("available")
      }
    } catch (error) {
      console.error("Error checking username:", error)
      // In case of error, assume username is invalid
      setUsernameStatus("invalid")
    } finally {
      // Checking complete
    }
  }

  // Debounced username check
  const debouncedUsernameCheck = (username: string) => {
    // Clear any existing timeout
    if (usernameCheckTimeout.current) {
      clearTimeout(usernameCheckTimeout.current)
    }

    // Set a new timeout
    usernameCheckTimeout.current = setTimeout(() => {
      checkUsernameAvailability(username)
    }, 500) // 500ms debounce
  }

  const handleUpdateProfile = async () => {
    if (!user?.id) return

    // Don't allow update if username is taken, invalid, or unavailable
    if (usernameStatus === "taken" || usernameStatus === "invalid" || usernameStatus === "unavailable") {
      alert("Please choose a valid username that is not already taken.")
      return
    }

    // Create updated profile data
    const updatedProfile = {
      ...profile,
      username: editProfileData.username,
      full_name: editProfileData.full_name,
      description: editProfileData.description,
      join_date: profile?.join_date || new Date().toISOString().split('T')[0], // Ensure join_date is set
      followers: profile?.followers || 0, // Ensure followers is set
      following_count: profile?.following_count || 0, // Ensure following_count is set
    }

    // Optimistically update UI
    setProfile(updatedProfile)

    try {
      // Check if username has actually changed
      const usernameChanged = profile?.username !== editProfileData.username;

      // Prepare update data
      const updateData: any = {
        username: editProfileData.username,
        full_name: editProfileData.full_name,
        description: editProfileData.description,
      };

      // Only update username_updated_at if the username has actually changed
      if (usernameChanged) {
        updateData.username_updated_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("id", user.id)

      if (error) throw error;

      if (usernameChanged) {
        setIsRefreshing(true);
        setTimeout(() => {
          window.location.href = `/${editProfileData.username}`;
        }, 1000);
      } else {
        setIsEditProfileOpen(false)
      }
    } catch (error) {
      console.error("Error updating profile:", error)
      // If there was an error, revert to the previous state by refetching
      if (user?.id) {
        // Could refetch profile here if needed
      }
    }
  }

  // Username validation - only allow alphanumeric and underscore, force lowercase
  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toLowerCase()
    const sanitized = value.replace(/[^a-z0-9_]/g, "")

    setEditProfileData((prev) => ({
      ...prev,
      username: sanitized.substring(0, 20),
    }))

    // Trigger debounced username check
    debouncedUsernameCheck(sanitized)
  }

  // Fetch username restriction status when opening the editor
  const fetchUsernameRestriction = async () => {
    if (!user?.id) return

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("username_updated_at")
        .eq("id", user.id)
        .single()

      if (error) throw error

      const lastUpdated = data?.username_updated_at ? new Date(data.username_updated_at) : null
      const now = new Date()

      if (lastUpdated && now.getTime() - lastUpdated.getTime() < 14 * 24 * 60 * 60 * 1000) {
        const daysRemaining = Math.ceil(
          (14 * 24 * 60 * 60 * 1000 - (now.getTime() - lastUpdated.getTime())) / (24 * 60 * 60 * 1000)
        )
        setUsernameStatus(`wait_${daysRemaining}`)
      } else {
        setUsernameStatus("unchanged")
      }
    } catch (error) {
      console.error("Error fetching username restriction:", error)
      setUsernameStatus("invalid")
    }
  }

  // Set up original username and fetch restriction when opening edit modal
  useEffect(() => {
    if (isEditProfileOpen && profile?.username) {
      originalUsername.current = profile.username
      fetchUsernameRestriction()
    }
  }, [isEditProfileOpen, profile?.username])

  // Avatar upload handlers
  const handleAvatarClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0]

      // Check file size (3MB max)
      if (file.size > 3 * 1024 * 1024) {
        alert("Image size must be less than 3MB")
        return
      }

      setAvatarImage(file)
      setIsAvatarEditorOpen(true)
    }
  }

  const handleSaveAvatar = async () => {
    if (!avatarEditorRef.current || !user?.id) return

    setIsUploading(true)

    try {
      // Get canvas with cropped image
      const canvas = avatarEditorRef.current.getImageScaledToCanvas()

      // Convert to blob
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob)
          },
          "image/jpeg",
          0.95,
        )
      })

      // Create a consistent filename based on user ID
      const fileName = `user-${user.id}.jpg`
      const avatarFile = new File([blob], fileName, { type: "image/jpeg" })

      // Upload to Supabase Storage with upsert to replace existing file
      const { error } = await supabase.storage.from("avatars").upload(fileName, avatarFile, {
        cacheControl: "3600",
        upsert: true, // This will replace the existing file with the same name
      })

      if (error) throw error

      // Get public URL
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(fileName)

      // Add cache busting parameter to force browser to reload the image
      const timestamp = new Date().getTime()
      const avatarUrl = `${urlData.publicUrl}?t=${timestamp}`

      // Update profile with new avatar URL
      const { error: updateError } = await supabase.from("profiles").update({ avatar_url: avatarUrl }).eq("id", user.id)

      if (updateError) throw updateError

      // Update local state and cache
      const updatedProfile = {
        ...profile,
        avatar_url: avatarUrl,
      } as ProfileData

      setProfile(updatedProfile)

      setIsRefreshing(true);
      setTimeout(() => {
        window.location.reload();
      }, 1000);

    } catch (error) {
      console.error("Error uploading avatar:", error)
      alert("Failed to upload avatar. Please try again.")
    } finally {
      setIsUploading(false)
    }
  }

  const joinDate = profile?.join_date ? new Date(profile.join_date) : new Date()
  const bio = profile?.description || "No bio yet"
  const username = profile?.username || user?.username || "username"

  // Memoized public maps computation to prevent expensive recalculations
  const publicMaps = useMemo(() => {
    return userMaps
      .map((map) => ({
        ...map,
        comment_count: map.comment_count || 0, // Use comment_count from database
      }))
      .filter((map) => map.visibility === "public") // Filter maps with public visibility
      .sort((a, b) => {
        // Main map comes first
        if (a.is_main && !b.is_main) return -1;
        if (!a.is_main && b.is_main) return 1;
        // If both are main or both are not main, sort by updatedAt descending
        return b.updatedAt - a.updatedAt;
      })
  }, [userMaps])

  const toggleMenu = (id: string) => {
    setOpenMenuId(openMenuId === id ? null : id)
  }



  const handleDeleteMap = (permalink: string) => {
    setMapToDelete(permalink)
    setOpenMenuId(null)
  }

  const confirmDelete = async () => {
    if (mapToDelete && user?.id) {
      try {
        // Delete from database
        const { error } = await supabase
          .from('mindmaps')
          .delete()
          .eq('permalink', mapToDelete)
          .eq('creator', user.id);

        if (error) throw error;

        // Remove from local state
        const updatedMaps = userMaps.filter(map => map.permalink !== mapToDelete);
        setUserMaps(updatedMaps);
        setMapToDelete(null);
      } catch (error) {
        console.error('Error deleting map:', error);
        alert('Failed to delete mindmap. Please try again.');
      }
    }
  }


  const handleEditDetails = (permalink: string) => {
    setMapToEdit(permalink)
    setOpenMenuId(null) // Close the menu
  }

  const saveMapDetails = async (details: {
    title: string;
    permalink: string;
    visibility: "public" | "private" | "linkOnly";
    description: string;
    is_main: boolean;
    collaborators: string[];
    published_at?: string | null;
  }) => {
    if (mapToEdit && user?.id) {
      const currentMap = userMaps.find((map) => map.permalink === mapToEdit)
      if (currentMap) {
        const conflictingMap = userMaps.find(
          (map) => map.permalink === details.permalink && map.permalink !== currentMap.permalink
        );
        if (conflictingMap) {
          throw new Error(`Permalink already in use in your mindmap "${conflictingMap.title}"`);
        }
        try {
          const isPermalinkChanged = currentMap.permalink !== details.permalink;
          // Only update modal fields, never touch drawing_data or json_data
          // Always send the full map object, only overwrite modal fields
          const updatedMap = {
            ...currentMap,
            title: details.title,
            visibility: details.visibility,
            description: details.description,
            is_main: details.is_main,
            collaborators: details.collaborators,
            published_at: details.published_at,
            permalink: isPermalinkChanged ? details.permalink : currentMap.permalink,
          };
          // Defensive: ensure drawing_data and json_data are present
          if (!updatedMap.hasOwnProperty('drawing_data')) {
            updatedMap.drawing_data = currentMap.drawing_data;
          }
          if (!updatedMap.hasOwnProperty('json_data')) {
            updatedMap.json_data = currentMap.json_data;
          }
          await useMindMapStore.getState().saveMapToSupabase(updatedMap, user.id);
          if (isPermalinkChanged) {
            await useMindMapStore.getState().updateMapPermalink(currentMap.permalink, details.permalink);
          }
          // Update the maps array in state, ensuring only one map is set as main
          const updatedMapsArray = userMaps.map((map) => {
            if (map.permalink === currentMap.permalink) {
              return updatedMap;
            }
            if (details.is_main && map.is_main) {
              return { ...map, is_main: false };
            }
            return map;
          });
          setUserMaps(updatedMapsArray);
          // If this is a publish/republish action, notify followers
          const wasJustPublished =
            details.published_at && details.visibility === "public" && details.published_at !== currentMap.published_at;
          if (wasJustPublished && currentMap.id && user?.username) {
            try {
              const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('username')
                .eq('id', user.id)
                .single();
              if (profileError) throw profileError;
              const username = profile?.username;
              try {
                await useNotificationStore.getState().addNotification({
                  user_id: user.id,
                  type: 'publish',
                  title: 'Mindmap Published',
                  message: `@${username} published a new mindmap: ${details.title}`,
                  mindmap_id: currentMap.id,
                });
              } catch (notificationError) {
                console.error("Error sending follower notifications:", notificationError);
              }
            } catch (notifyError) {
              console.error("Failed to notify followers:", notifyError);
            }
          }
          if (wasJustPublished) {
            setShowSuccessPopup(true);
            setTimeout(() => {
              setShowSuccessPopup(false);
            }, 3000);
          }
          setMapToEdit(null);
        } catch (error) {
          console.error("Error saving map details:", error);
          throw error;
        }
      }
    }
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openMenuId && !(event.target as Element).closest(".menu-container")) {
        setOpenMenuId(null)
      }

    }

    document.addEventListener("click", handleClickOutside)
    return () => {
      document.removeEventListener("click", handleClickOutside)
    }
  }, [openMenuId])

  // Render username status indicator
  const renderUsernameStatus = () => {
    switch (usernameStatus) {
      case "checking":
        return (
          <div className="flex items-center text-gray-400">
            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            <span className="text-xs">Checking...</span>
          </div>
        )
      case "available":
        return (
          <div className="flex items-center text-green-500">
            <CheckCircle2 className="w-4 h-4 mr-1" />
            <span className="text-xs">Available</span>
          </div>
        )
      case "taken":
        return (
          <div className="flex items-center text-red-500">
            <XCircle className="w-4 h-4 mr-1" />
            <span className="text-xs">Already taken</span>
          </div>
        )
      case "unavailable":
        return (
          <div className="flex items-center text-red-500">
            <XCircle className="w-4 h-4 mr-1" />
            <span className="text-xs">Username unavailable</span>
          </div>
        )
      case "invalid":
        return (
          <div className="flex items-center text-amber-500">
            <AlertTriangle className="w-4 h-4 mr-1" />
            <span className="text-xs">Username must be at least 3 characters</span>
          </div>
        )
      case "unchanged":
        return (
          <div className="flex items-center text-blue-400">
            <Check className="w-4 h-4 mr-1" />
            <span className="text-xs">Current username</span>
          </div>
        )
      default:
        if (usernameStatus.startsWith("wait_")) {
          const daysRemaining = usernameStatus.split("_")[1]
          return (
            <div className="flex items-center text-yellow-500">
              <AlertTriangle className="w-4 h-4 mr-1" />
              <span className="text-xs">You can change your username in {daysRemaining} days</span>
            </div>
          )
        }
        return null
    }
  }

  // Show skeleton loader while loading
  if (isLoading) {
    return (
      <div className="min-h-screen">
        <div className="max-w-4xl xl:max-w-[50vw] mx-auto p-4 xl:p-[2vh]">
          {/* Skeleton Profile Header */}
          <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl rounded-2xl p-[2vh] compact-card border border-slate-700/30 shadow-2xl">
            <div className="flex gap-4 items-start">
              {/* Skeleton Avatar */}
              <div className="w-20 h-20 rounded-2xl bg-slate-700/50 animate-pulse"></div>

              {/* Skeleton User Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-3">
                  <div className="space-y-2">
                    <div className="h-6 w-32 bg-slate-700/50 rounded-lg animate-pulse"></div>
                    <div className="h-4 w-24 bg-slate-700/50 rounded animate-pulse"></div>
                  </div>
                  <div className="h-9 w-20 bg-slate-700/50 rounded-xl animate-pulse"></div>
                </div>

                {/* Skeleton Bio */}
                <div className="mb-3 space-y-2">
                  <div className="h-4 w-full bg-slate-700/50 rounded animate-pulse"></div>
                  <div className="h-4 w-3/4 bg-slate-700/50 rounded animate-pulse"></div>
                </div>

                {/* Skeleton Meta */}
                <div className="h-4 w-32 bg-slate-700/50 rounded animate-pulse"></div>
              </div>
            </div>
            {/* Skeleton Stats */}
            <div className="mt-3 compact-margin grid grid-cols-3 gap-1 compact-gap-sm border-t border-slate-700/50 pt-2 compact-padding">
              {[1, 2, 3].map((i) => (
                <div key={i} className="text-center p-1">
                  <div className="h-5 w-8 bg-slate-700/50 rounded mx-auto mb-1 animate-pulse"></div>
                  <div className="h-3 w-16 bg-slate-700/50 rounded mx-auto animate-pulse"></div>
                </div>
              ))}
            </div>
          </div>

          {/* Skeleton Navigation Tabs */}
          <div className="mt-5">
            <div className="bg-gradient-to-r from-slate-800/50 to-slate-900/50 backdrop-blur-xl rounded-2xl border border-slate-700/30 shadow-xl overflow-hidden">
              <div className="flex">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex-1 flex items-center justify-center gap-3 px-6 py-4">
                    <div className="w-5 h-5 bg-slate-700/50 rounded animate-pulse"></div>
                    <div className="h-4 w-20 bg-slate-700/50 rounded animate-pulse"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Skeleton Content */}
          <div className="mt-5">
            <SkeletonLoader />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-4xl xl:max-w-[50vw] mx-auto p-4 xl:p-[2vh]">
        {/* Enhanced Profile Header */}
        <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl rounded-2xl p-[2vh] compact-card border border-slate-700/30 shadow-2xl">
          <div className="flex gap-4 items-start">
            {/* Enhanced Avatar */}
            <div className="relative group">
              <div
                className="w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center overflow-hidden ring-4 ring-slate-600/20 transition-all duration-300 group-hover:ring-slate-500/30 cursor-pointer"
                onClick={handleAvatarClick}
              >
                {profile?.avatar_url || user?.avatar_url ? (
                  <img
                    src={profile?.avatar_url || user?.avatar_url || "/placeholder.svg"}
                    alt={user?.full_name || "Profile"}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                  />
                ) : (
                  <span className="text-2xl font-bold text-slate-300">{user?.full_name?.charAt(0) || "?"}</span>
                )}

                {/* Enhanced hover overlay with camera icon */}
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="w-6 h-6 text-white" />
                </div>

                {/* Hidden file input */}
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
              </div>
            </div>

            {/* Enhanced User Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-3">
                <div className="space-y-1">
                  {isLoading ? (
                    <>
                      <div className="h-8 w-48 bg-gradient-to-r from-slate-700 to-slate-600 rounded-lg animate-pulse"></div>
                      <div className="h-5 w-32 bg-slate-700 rounded-md animate-pulse"></div>
                    </>
                  ) : (
                    <>
                      <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                        {profile?.full_name || user?.full_name}
                      </h1>
                      <p className="text-slate-400 font-medium text-sm">@{username}</p>
                    </>
                  )}
                </div>

                {/* Enhanced Edit Button */}
                <button
                  onClick={() => {
                    // Reset form data to current profile values when opening the modal
                    if (profile) {
                      setEditProfileData({
                        username: profile.username || "",
                        full_name: profile.full_name || "",
                        description: profile.description || "",
                      })
                    }
                    setIsEditProfileOpen(true)
                  }}
                  className="group flex items-center gap-2 px-[1.5vh] py-[0.8vh] bg-slate-700/50 hover:bg-slate-600/50 text-white rounded-xl transition-all duration-200 border border-slate-600/30 hover:border-slate-500/50 transform hover:scale-105"
                  disabled={isLoading}
                >
                  <Edit2 className="w-4 h-4 transition-transform group-hover:scale-110" />
                  <span className="font-medium hidden sm:inline text-sm">Edit Profile</span>
                </button>
              </div>

              {/* Enhanced Bio */}
              <div className="mb-3">
                {isLoading ? (
                  <div className="space-y-2">
                    <div className="h-4 w-full bg-slate-700 rounded animate-pulse"></div>
                    <div className="h-4 w-3/4 bg-slate-700 rounded animate-pulse"></div>
                  </div>
                ) : (
                  <p className="text-slate-300 leading-relaxed text-sm">{bio || "No bio yet"}</p>
                )}
              </div>

              {/* Enhanced Meta Information */}
              <div className="flex flex-wrap gap-4 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-500" />
                  <span>Joined {format(joinDate, "MMMM yyyy")}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Stats */}
          <div className="mt-3 compact-margin grid grid-cols-3 gap-1 compact-gap-sm border-t border-slate-700/50 pt-2 compact-padding">
            <div className="text-center group cursor-default hover:bg-slate-700/30 rounded-lg p-1 transition-all duration-200">
              <div className="text-base font-bold text-white mb-0.5 transition-colors group-hover:text-blue-400">
                {publicMaps.length}
              </div>
              <div className="text-xs text-slate-400 font-medium group-hover:text-slate-300">Mindmaps</div>
            </div>
            <div
              className="text-center group cursor-pointer hover:bg-slate-700/30 rounded-lg p-1 transition-all duration-200"
              onClick={() => openModal('Followers', [])}
            >
              <div className="text-base font-bold text-white mb-0.5 transition-colors group-hover:text-blue-400">
                {countsLoaded ? (profile?.followers || 0) : 0}
              </div>
              <div className="text-xs text-slate-400 font-medium group-hover:text-slate-300">Followers</div>
            </div>
            <div
              className="text-center group cursor-pointer hover:bg-slate-700/30 rounded-lg p-1 transition-all duration-200"
              onClick={() => openModal('Following', [])}
            >
              <div className="text-base font-bold text-white mb-0.5 transition-colors group-hover:text-blue-400">
                {countsLoaded ? (profile?.following_count || 0) : 0}
              </div>
              <div className="text-xs text-slate-400 font-medium group-hover:text-slate-300">Following</div>
            </div>
          </div>
        </div>

        {/* Enhanced Navigation Tabs */}
        <div className="mt-5">
          <div className="bg-gradient-to-r from-slate-800/50 to-slate-900/50 backdrop-blur-xl rounded-2xl border border-slate-700/30 shadow-xl overflow-hidden">
            <div className="flex">
              {[
                { key: "mindmaps", icon: Network, label: "Mindmaps", count: publicMaps.length },
                { key: "collaborations", icon: Users, label: "Collaborations", count: collaborationMaps.length },
                { key: "saves", icon: Bookmark, label: "Saves", count: savedMaps.length },
              ].map((tab, index) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`flex-1 flex items-center justify-center gap-3 px-6 py-4 transition-all duration-300 relative group ${activeTab === tab.key
                    ? "text-blue-400 bg-slate-700/50"
                    : "text-slate-400 hover:text-slate-300 hover:bg-slate-700/30"
                    } ${index === 0 ? "rounded-l-2xl" : ""} ${index === 2 ? "rounded-r-2xl" : ""}`}
                >
                  <tab.icon
                    className={`w-5 h-5 transition-all duration-300 ${activeTab === tab.key ? "scale-110" : "group-hover:scale-105"}`}
                  />
                  <span className="font-medium hidden sm:inline text-sm">{tab.label}</span>
                  {tab.count > 0 && (
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-bold transition-all duration-300 ${activeTab === tab.key ? "bg-blue-500/20 text-blue-300" : "bg-slate-600/50 text-slate-300"
                        }`}
                    >
                      {tab.count}
                    </span>
                  )}
                  {activeTab === tab.key && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Enhanced Content Section */}
        <div className="mt-5">
          {/* Mindmaps Tab */}
          {activeTab === "mindmaps" && (
            <>
              {publicMaps.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-[2vh] compact-gap">
                  {publicMaps.map((map, index) => (
                    <div
                      key={map.permalink}
                      className="group relative bg-gradient-to-br from-slate-800/70 via-slate-900/90 to-slate-800/70 backdrop-blur-xl rounded-2xl p-5 compact-card border border-slate-700/30 shadow-xl"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      {/* Enhanced Map Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            {profile?.avatar_url || user?.avatar_url ? (
                              <img
                                src={profile?.avatar_url || user?.avatar_url}
                                alt={profile?.username || user?.username}
                                className="w-8 h-8 rounded-full object-cover ring-2 ring-slate-600/30"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center">
                                <span className="text-xs text-slate-300">{(profile?.username || user?.username)?.charAt(0)?.toUpperCase() || '?'}</span>
                              </div>
                            )}
                            {map.is_main && (
                              <div className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-blue-500/20 to-blue-300/20 rounded-full border border-blue-500/30">
                                <Star className="w-3 h-3 text-blue-400 fill-current" />
                                <span className="text-xs text-blue-300 font-medium">Main</span>
                              </div>
                            )}
                          </div>
                          <h3 className="text-base font-bold text-white truncate">
                            {map.title}
                          </h3>
                        </div>

                        {/* Enhanced Menu */}
                        <div className="relative menu-container">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleMenu(map.permalink || map.id)
                            }}
                            className="p-2 text-slate-500 hover:text-slate-300 transition-all duration-200 rounded-lg hover:bg-slate-700/50"
                          >
                            <MoreVertical className="w-5 h-5" />
                          </button>
                          {openMenuId === (map.permalink || map.id) && (
                            <div className="absolute right-0 mt-2 w-48 bg-slate-800/95 backdrop-blur-xl rounded-xl shadow-2xl z-10 border border-slate-700/50 overflow-hidden">
                              <div className="py-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleEditDetails(map.permalink || map.id)
                                    toggleMenu(map.permalink || map.id)
                                  }}
                                  className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white flex items-center transition-colors"
                                >
                                  <Edit2 className="w-4 h-4 mr-2" />
                                  Edit Details
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenInfo(map);
                                    setOpenMenuId(null);
                                  }}
                                  className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white flex items-center transition-colors"
                                >
                                  <Info className="w-4 h-4 mr-2" />
                                  View Info
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleDeleteMap(map.permalink || map.id)
                                  }}
                                  className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-red-500 flex items-center transition-colors"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Enhanced Timestamp */}
                      <div className="flex items-center gap-2 text-xs text-slate-400 mb-3">
                        <Clock className="w-3 h-3" />
                        <span>
                          Last edited{" "}
                          {map.updatedAt && !isNaN(new Date(map.updatedAt).getTime())
                            ? formatDateWithPreference(new Date(map.updatedAt))
                            : "Unknown date"}
                        </span>
                      </div>

                      {/* Enhanced Mind Map Preview */}
                      <a
                        href={`/${map.creatorUsername}/${map.permalink || map.id}`}
                        className="block mb-5 compact-preview h-56 border border-slate-700/50 hover:border-blue-500/50 rounded-xl overflow-hidden transition-all duration-50 hover:shadow-lg hover:shadow-blue-500/10 relative group/preview"
                      >
                        <ProfileMindMapPreview map={map} isSmallScreen={isSmallScreen} />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/20 to-transparent opacity-0 group-hover/preview:opacity-100 transition-opacity duration-50 pointer-events-none"></div>
                      </a>

                      {/* Enhanced Action Bar */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-6">
                          <button
                            onClick={(e) => hookHandleLike(e, map)}
                            className="group/action flex items-center gap-2 text-slate-400 hover:text-blue-500 transition-all duration-200"
                          >
                            <Heart
                              className={`w-5 h-5 transition-all duration-200 group-hover/action:scale-110 ${user?.id && map.liked_by?.length > 0 ? "fill-current text-blue-500" : ""
                                }`}
                            />
                            {map.likes > 0 && <span className="font-medium">{map.likes}</span>}
                          </button>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              window.location.href = `/${username}/${map.permalink}#comments-section`;
                            }}
                            className="group/action flex items-center gap-2 text-slate-400 hover:text-blue-500 transition-all duration-200"
                          >
                            <MessageCircle className="w-5 h-5 transition-all duration-200 group-hover/action:scale-110" />
                            {(map.comment_count || 0) > 0 && <span className="font-medium">{map.comment_count}</span>}
                          </button>
                          <button
                            onClick={(e) => hookHandleSave(e, map)}
                            className="group/action flex items-center gap-2 text-slate-400 hover:text-blue-500 transition-all duration-200"
                          >
                            <Bookmark
                              className={`w-5 h-5 transition-all duration-200 group-hover/action:scale-110 ${user?.id && map.saved_by?.length > 0 ? 'fill-current text-blue-500' : ''
                                }`}
                            />
                            {map.saves > 0 && <span className="font-medium">{map.saves}</span>}
                          </button>
                        </div>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleShare(map.permalink, map.title, map.is_main || false, username || '', map.id);
                          }}
                          className="group/action p-2 text-slate-400 hover:text-slate-300 transition-all duration-200 rounded-lg hover:bg-slate-700/50"
                        >
                          <Share2 className="w-5 h-5 transition-all duration-200 group-hover/action:scale-110" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-gradient-to-br from-slate-800/30 to-slate-900/30 backdrop-blur-xl rounded-2xl p-12 border border-slate-700/30 text-center">
                  <Network className="w-16 h-16 text-slate-500 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-slate-300 mb-2">No mindmaps yet</h3>
                  <p className="text-slate-400">Start creating your first mindmap to see it here.</p>
                </div>
              )}
            </>
          )}

          {/* Collaborations Tab */}
          {activeTab === "collaborations" && (
            <>
              {collaborationMaps.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 compact-gap">
                  {collaborationMaps.map((map, index) => (
                    <div
                      key={map.permalink}
                      className="group relative bg-gradient-to-br from-slate-800/70 via-slate-900/90 to-slate-800/70 backdrop-blur-xl rounded-2xl p-5 compact-card border border-slate-700/30 shadow-xl"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div
                            className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.location.href = `/${map.creatorUsername}`;
                            }}
                          >
                            {map.creatorAvatar ? (
                              <img
                                src={map.creatorAvatar}
                                alt={map.creatorUsername}
                                className="w-8 h-8 rounded-full object-cover ring-2 ring-slate-600/30"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center">
                                <span className="text-xs text-slate-300">{map.creatorUsername?.charAt(0)?.toUpperCase() || '?'}</span>
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-bold text-white truncate">
                              {map.title}
                            </h3>
                            <p
                              className="text-sm text-blue-400 hover:text-blue-300 transition-colors cursor-pointer font-medium"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.location.href = `/${map.creatorUsername}`;
                              }}
                            >
                              @{map.creatorUsername}
                            </p>
                          </div>
                        </div>

                        <div className="relative menu-container">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleMenu(map.permalink || map.key)
                            }}
                            className="p-2 text-slate-500 hover:text-slate-300 transition-all duration-200 rounded-lg hover:bg-slate-700/50"
                          >
                            <MoreVertical className="w-5 h-5" />
                          </button>
                          {openMenuId === (map.permalink || map.key) && (
                            <div className="absolute right-0 mt-2 w-48 bg-slate-800/95 backdrop-blur-xl rounded-xl shadow-2xl z-10 border border-slate-700/50 overflow-hidden">
                              <div className="py-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenInfo(map);
                                    setOpenMenuId(null);
                                  }}
                                  className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white flex items-center transition-colors"
                                >
                                  <Info className="w-4 h-4 mr-2" />
                                  View Info
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-slate-400 mb-4">
                        <Clock className="w-4 h-4" />
                        <span>
                          Last edited{" "}
                          {map.updatedAt && !isNaN(new Date(map.updatedAt).getTime())
                            ? formatDateWithPreference(new Date(map.updatedAt))
                            : "Unknown date"}
                        </span>
                      </div>

                      {map.nodes?.length > 0 && (
                        <a
                          href={`/${map.creatorUsername}/${map.permalink || map.key}`}
                          className="block mb-5 compact-preview h-56 border border-slate-700/50 hover:border-blue-500/50 rounded-xl overflow-hidden transition-all duration-50 hover:shadow-lg hover:shadow-blue-500/10 relative group/preview"
                        >
                          <ProfileMindMapPreview map={map} isSmallScreen={isSmallScreen} />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/20 to-transparent opacity-0 group-hover/preview:opacity-100 transition-opacity duration-50"></div>
                        </a>
                      )}

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-6">
                          <button
                            onClick={(e) => collabHandleLike(e, map)}
                            className="group/action flex items-center gap-2 text-slate-400 hover:text-blue-500 transition-all duration-200"
                          >
                            <Heart
                              className={`w-5 h-5 transition-all duration-200 group-hover/action:scale-110 ${user?.id && map.liked_by?.length > 0 ? "fill-current text-blue-500" : ""
                                }`}
                            />
                            {map.likes > 0 && <span className="font-medium">{map.likes}</span>}
                          </button>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              window.location.href = `/${map.creatorUsername}/${map.permalink || map.key}#comments-section`;
                            }}
                            className="group/action flex items-center gap-2 text-slate-400 hover:text-blue-500 transition-all duration-200"
                          >
                            <MessageCircle className="w-5 h-5 transition-all duration-200 group-hover/action:scale-110" />
                            {(map.comment_count || 0) > 0 && <span className="font-medium">{map.comment_count}</span>}
                          </button>
                          <button
                            onClick={(e) => collabHandleSave(e, map)}
                            className="group/action flex items-center gap-2 text-slate-400 hover:text-blue-500 transition-all duration-200"
                          >
                            <Bookmark
                              className={`w-5 h-5 transition-all duration-200 group-hover/action:scale-110 ${user?.id && map.saved_by?.length > 0 ? 'fill-current text-blue-500' : ''
                                }`}
                            />
                            {map.saves > 0 && <span className="font-medium">{map.saves}</span>}
                          </button>
                        </div>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleShare(map.permalink || map.id, map.title, map.is_main || false, map.creatorUsername, map.id);
                          }}
                          className="group/action p-2 text-slate-400 hover:text-slate-300 transition-all duration-200 rounded-lg hover:bg-slate-700/50"
                        >
                          <Share2 className="w-5 h-5 transition-all duration-200 group-hover/action:scale-110" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-gradient-to-br from-slate-800/30 to-slate-900/30 backdrop-blur-xl rounded-2xl p-12 border border-slate-700/30 text-center">
                  <Users className="w-16 h-16 text-slate-500 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-slate-300 mb-2">No collaborations yet</h3>
                  <p className="text-slate-400">Collaborate on mindmaps with other users to see them here.</p>
                </div>
              )}
            </>
          )}

          {/* Saves Tab */}
          {activeTab === "saves" && (
            <>
              {savedMaps.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 compact-gap">
                  {savedMaps.map((map, index) => (
                    <div
                      key={map.permalink}
                      className="group relative bg-gradient-to-br from-slate-800/70 via-slate-900/90 to-slate-800/70 backdrop-blur-xl rounded-2xl p-5 compact-card border border-slate-700/30 shadow-xl"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div
                            className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.location.href = `/${map.creatorUsername}`;
                            }}
                          >
                            {map.creatorAvatar ? (
                              <img
                                src={map.creatorAvatar}
                                alt={map.creatorUsername}
                                className="w-8 h-8 rounded-full object-cover ring-2 ring-slate-600/30"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center">
                                <span className="text-xs text-slate-300">{map.creatorUsername?.charAt(0)?.toUpperCase() || '?'}</span>
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-bold text-white truncate">
                              {map.title}
                            </h3>
                            <p
                              className="text-sm text-blue-400 hover:text-blue-300 transition-colors cursor-pointer font-medium"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.location.href = `/${map.creatorUsername}`;
                              }}
                            >
                              @{map.creatorUsername}
                            </p>
                          </div>
                        </div>

                        <div className="relative menu-container">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleMenu(map.permalink || map.key)
                            }}
                            className="p-2 text-slate-500 hover:text-slate-300 transition-all duration-200 rounded-lg hover:bg-slate-700/50"
                          >
                            <MoreVertical className="w-5 h-5" />
                          </button>
                          {openMenuId === (map.permalink || map.key) && (
                            <div className="absolute right-0 mt-2 w-48 bg-slate-800/95 backdrop-blur-xl rounded-xl shadow-2xl z-10 border border-slate-700/50 overflow-hidden">
                              <div className="py-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenInfo(map);
                                    setOpenMenuId(null);
                                  }}
                                  className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white flex items-center transition-colors"
                                >
                                  <Info className="w-4 h-4 mr-2" />
                                  View Info
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-slate-400 mb-4">
                        <Clock className="w-4 h-4" />
                        <span>
                          Last edited{" "}
                          {map.updatedAt && !isNaN(new Date(map.updatedAt).getTime())
                            ? formatDateWithPreference(new Date(map.updatedAt))
                            : "Unknown date"}
                        </span>
                      </div>

                      {map.nodes?.length > 0 && (
                        <a
                          href={`/${map.creatorUsername}/${map.permalink || map.key}`}
                          className="block mb-5 compact-preview h-56 border border-slate-700/50 hover:border-blue-500/50 rounded-xl overflow-hidden transition-all duration-50 hover:shadow-lg hover:shadow-blue-500/10 relative group/preview"
                        >
                          <ProfileMindMapPreview map={map} isSmallScreen={isSmallScreen} />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/20 to-transparent opacity-0 group-hover/preview:opacity-100 transition-opacity duration-50"></div>
                        </a>
                      )}

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-6">
                          <button
                            onClick={(e) => savedHandleLike(e, map)}
                            className="group/action flex items-center gap-2 text-slate-400 hover:text-blue-500 transition-all duration-200"
                          >
                            <Heart
                              className={`w-5 h-5 transition-all duration-200 group-hover/action:scale-110 ${user?.id && map.liked_by?.length > 0 ? "fill-current text-blue-500" : ""
                                }`}
                            />
                            {map.likes > 0 && <span className="font-medium">{map.likes}</span>}
                          </button>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              window.location.href = `/${map.creatorUsername}/${map.permalink || map.id}#comments-section`;
                            }}
                            className="group/action flex items-center gap-2 text-slate-400 hover:text-blue-500 transition-all duration-200"
                          >
                            <MessageCircle className="w-5 h-5 transition-all duration-200 group-hover/action:scale-110" />
                            {(map.comment_count || 0) > 0 && <span className="font-medium">{map.comment_count}</span>}
                          </button>
                          <button
                            onClick={(e) => savedHandleSave(e, map)}
                            className="group/action flex items-center gap-2 text-slate-400 hover:text-blue-500 transition-all duration-200"
                          >
                            <Bookmark
                              className={`w-5 h-5 transition-all duration-200 group-hover/action:scale-110 ${user?.id && map.saved_by?.length > 0 ? 'fill-current text-blue-500' : ''
                                }`}
                            />
                            {map.saves > 0 && <span className="font-medium">{map.saves}</span>}
                          </button>
                        </div>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleShare(map.permalink || map.id, map.title, map.is_main || false, map.creatorUsername, map.id);
                          }}
                          className="group/action p-2 text-slate-400 hover:text-slate-300 transition-all duration-200 rounded-lg hover:bg-slate-700/50"
                        >
                          <Share2 className="w-5 h-5 transition-all duration-200 group-hover/action:scale-110" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-gradient-to-br from-slate-800/30 to-slate-900/30 backdrop-blur-xl rounded-2xl p-12 border border-slate-700/30 text-center">
                  <Bookmark className="w-16 h-16 text-slate-500 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-slate-300 mb-2">No saved mindmaps yet</h3>
                  <p className="text-slate-400">Save mindmaps from other users to see them here.</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Enhanced Edit Profile Modal */}
        {isEditProfileOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-xl rounded-2xl p-6 w-full max-w-md border border-slate-700/50 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent mb-6">Edit Profile</h2>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Username</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={editProfileData.username}
                      onChange={handleUsernameChange}
                      className={`w-full px-4 py-3 border rounded-xl text-slate-100 focus:outline-none focus:ring-2 pr-12 transition-all duration-200 ${usernameStatus.startsWith("wait_")
                        ? "bg-slate-800/50 border-slate-600 text-slate-500 cursor-not-allowed"
                        : usernameStatus === "available"
                          ? "bg-slate-800/50 border-green-500/50 focus:ring-green-500/30 focus:border-green-500"
                          : usernameStatus === "taken" || usernameStatus === "invalid"
                            ? "bg-slate-800/50 border-red-500/50 focus:ring-red-500/30 focus:border-red-500"
                            : "bg-slate-800/50 border-slate-600/50 focus:ring-blue-500/30 focus:border-blue-500"
                        }`}
                      maxLength={20}
                      placeholder="username (letters, numbers, underscore only)"
                      disabled={usernameStatus.startsWith("wait_")}
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                      {usernameStatus === "available" && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                      {usernameStatus === "taken" && <XCircle className="w-5 h-5 text-red-500" />}
                      {usernameStatus === "checking" && <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />}
                      {usernameStatus === "invalid" && <AlertTriangle className="w-5 h-5 text-amber-500" />}
                      {usernameStatus === "unchanged" && <Check className="w-5 h-5 text-blue-400" />}
                    </div>
                  </div>
                  <div className="mt-2 min-h-6">{renderUsernameStatus()}</div>
                  <p className="mt-1 text-xs text-slate-500">
                    You can only change username once every 14 days.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Full Name</label>
                  <input
                    type="text"
                    value={editProfileData.full_name}
                    onChange={(e) =>
                      setEditProfileData((prev) => ({ ...prev, full_name: e.target.value.substring(0, 25) }))
                    }
                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all duration-200"
                    maxLength={25}
                    placeholder="Your display name"
                  />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-slate-300">Bio</label>
                    <span className="text-xs text-slate-400">{editProfileData.description.length}/50</span>
                  </div>
                  <textarea
                    value={editProfileData.description}
                    onChange={(e) =>
                      setEditProfileData((prev) => ({
                        ...prev,
                        description: e.target.value.substring(0, 50),
                      }))
                    }
                    rows={3}
                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 resize-none transition-all duration-200"
                    maxLength={50}
                    placeholder="Tell us about yourself..."
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-8">
                <button
                  onClick={() => {
                    // Reset form data to current profile values when canceling
                    if (profile) {
                      setEditProfileData({
                        username: profile.username || "",
                        full_name: profile.full_name || "",
                        description: profile.description || "",
                      })
                    }
                    setIsEditProfileOpen(false)
                  }}
                  className="px-6 py-3 text-slate-400 hover:text-slate-300 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateProfile}
                  className={`px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-500 hover:to-purple-500 transition-all duration-200 font-medium transform hover:scale-105 ${usernameStatus === "taken" || usernameStatus === "invalid" || usernameStatus === "unavailable" || usernameStatus === "empty" || isRefreshing ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                  disabled={usernameStatus === "taken" || usernameStatus === "invalid" || usernameStatus === "unavailable" || usernameStatus === "empty" || isRefreshing}
                >
                  {isRefreshing ? "Refreshing..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Avatar Editor Modal */}
        {isAvatarEditorOpen && avatarImage && (
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => !isUploading && setIsAvatarEditorOpen(false)}
          >
            <div
              className="bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-xl rounded-2xl p-6 w-full max-w-md flex flex-col items-center border border-slate-700/50 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent mb-6">Edit Profile Picture</h2>

              <div className="mb-6 rounded-full overflow-hidden border-4 border-slate-600/30">
                <AvatarEditor
                  ref={avatarEditorRef}
                  image={avatarImage}
                  width={250}
                  height={250}
                  border={0}
                  borderRadius={125}
                  color={[0, 0, 0, 0.6]} // RGBA
                  scale={avatarScale}
                  rotate={0}
                />
              </div>

              <div className="w-full mb-6">
                <label className="block text-sm font-medium text-slate-300 mb-3">Zoom</label>
                <input
                  type="range"
                  min="1"
                  max="2"
                  step="0.01"
                  value={avatarScale}
                  onChange={(e) => setAvatarScale(Number.parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                  disabled={isUploading}
                />
              </div>

              <div className="flex justify-center space-x-4 w-full">
                <button
                  onClick={() => !isUploading && setIsAvatarEditorOpen(false)}
                  className="px-6 py-3 bg-slate-700/50 text-white rounded-xl hover:bg-slate-600/50 transition-all duration-200 flex items-center disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  disabled={isUploading}
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </button>
                <button
                  onClick={handleSaveAvatar}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-500 hover:to-purple-500 transition-all duration-200 flex items-center disabled:opacity-50 disabled:cursor-not-allowed font-medium transform hover:scale-105"
                  disabled={isUploading || isRefreshing}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : isRefreshing ? (
                    "Refreshing..."
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Save
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Delete Map Confirmation Modal */}
        {mapToDelete && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setMapToDelete(null)
              }
            }}
          >
            <div className="bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-xl rounded-2xl p-6 w-full max-w-md shadow-2xl border border-slate-700/30" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="w-6 h-6 text-red-400" />
                <h2 className="text-xl font-bold text-white">
                  Delete Mindmap
                </h2>
              </div>
              <p className="text-slate-300 mb-2">
                Are you sure you want to delete "{userMaps.find(map => map.permalink === mapToDelete)?.title}"?
              </p>
              <p className="text-slate-400 text-sm mb-6">
                This action cannot be undone and all data will be permanently lost.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setMapToDelete(null)}
                  className="px-6 py-2.5 text-slate-400 hover:text-slate-100 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  className="px-6 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all duration-200 font-medium"
                >
                  Delete Forever
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Map Details Modal */}
        {mapToEdit && (
          <EditDetailsModal
            isOpen={!!mapToEdit}
            onClose={() => {
              setMapToEdit(null)
            }}
            mapData={{
              id: userMaps.find(map => map.permalink === mapToEdit)?.id, // Add mindmap ID for collaboration functionality
              permalink: userMaps.find(map => map.permalink === mapToEdit)?.permalink || '',
              title: userMaps.find(map => map.permalink === mapToEdit)?.title || '',
              description: userMaps.find(map => map.permalink === mapToEdit)?.description || '',
              visibility: userMaps.find(map => map.permalink === mapToEdit)?.visibility as "public" | "private" | "linkOnly",
              is_main: userMaps.find(map => map.permalink === mapToEdit)?.is_main || false,
              collaborators: userMaps.find(map => map.permalink === mapToEdit)?.collaborators || [],
              published_at: userMaps.find(map => map.permalink === mapToEdit)?.published_at || null
            }}
            username={profile?.username}
            onSave={saveMapDetails}
            showMainMapOption={true}
          />
        )}

        {/* User List Modal */}
        <UserListModal
          isOpen={isModalOpen}
          onClose={closeModal}
          title={modalTitle}
          userIds={modalUserIds}
          profileUserId={user?.id}
        />

        {/* Share Modal */}
        {isShareModalOpen && shareMapData && (
          <ShareModal
            title={shareMapData.title}
            url={`${window.location.origin}/${shareMapData.creatorUsername}/${shareMapData.id}`}
            creator={shareMapData.creatorUsername}
            onClose={closeShareModal}
            isMainMap={shareMapData.is_main}
            mindmapId={shareMapData.mindmapId as string}
          />
        )}

        {/* Info Modal */}
        {isInfoModalOpen && infoMapData && (
          <InfoModal
            mindmap={{
              username: infoMapData.creatorUsername || profile?.username || '',
              displayName: infoMapData.creatorFull_name || infoMapData.creatorUsername || '',
              name: infoMapData.title,
              permalink: infoMapData.permalink,
              updatedAt: infoMapData.updated_at || infoMapData.updatedAt,
              description: infoMapData.description || '',
              avatar_url: infoMapData.creatorAvatar || profile?.avatar_url,
              collaborators: infoMapData.collaborators || [],
              published_at: infoMapData.published_at,
              stats: {
                nodes: infoMapData.nodes?.length || 0,
                edges: infoMapData.edges?.length || 0,
                likes: infoMapData.likes || 0,
                comments: infoMapData.comment_count || 0,
                saves: infoMapData.saves || 0,
              }
            }}
            onClose={closeInfoModal}
            hideVisibility={true}
          />
        )}

        {/* Publish Success Modal */}
        <PublishSuccessModal isVisible={showSuccessPopup} />

        {/* Toast Notification */}
        <Toast
          message={toastMessage}
          type={toastType}
          isVisible={toastVisible}
          onClose={hideToast}
        />
      </div>
    </div>
  )
}
