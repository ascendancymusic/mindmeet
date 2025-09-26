"use client"

import React, { useEffect, useState, useCallback } from "react"
import { useParams } from "react-router-dom"
import { supabase } from "../supabaseClient"
import {
  Calendar,
  Network,
  Heart,
  MessageCircle,
  Bookmark,
  UserPlus,
  UserMinus,
  Share2,
  MoreVertical,
  Info,
  Star,
  Clock,
  Users,
  Lock,
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
import { useAuthStore } from "../store/authStore"
import { useNotificationStore } from "../store/notificationStore"
import { useMindMapActions } from "../hooks/useMindMapActions"
import MindMapRenderer from "../components/MindMapRenderer"
import { formatDateWithPreference } from "../utils/dateUtils"
import UserListModal from "../components/UserListModal"
import ShareModal from "../components/ShareModal"
import InfoModal from "../components/InfoModal"
import { usePageTitle } from "../hooks/usePageTitle"
import eventEmitter from "../services/eventService"

// Memoized ReactFlow preview component to prevent unnecessary re-renders
const UserProfileMindMapPreview = React.memo(({ map, isSmallScreen }: { map: any, isSmallScreen: boolean }) => {
  // Parse the mindmap data for the renderer
  const mindMapData = {
    nodes: map.json_data?.nodes || [],
    edges: map.json_data?.edges || [],
    backgroundColor: map.json_data?.backgroundColor,
    fontFamily: map.json_data?.fontFamily,
    edgeType: map.json_data?.edgeType
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
    prevProps.map.updated_at === nextProps.map.updated_at &&
    JSON.stringify(prevProps.map.json_data?.nodes) === JSON.stringify(nextProps.map.json_data?.nodes) &&
    JSON.stringify(prevProps.map.json_data?.edges) === JSON.stringify(nextProps.map.json_data?.edges) &&
    prevProps.map.json_data?.backgroundColor === nextProps.map.json_data?.backgroundColor &&
    prevProps.map.json_data?.fontFamily === nextProps.map.json_data?.fontFamily &&
    prevProps.map.json_data?.edgeType === nextProps.map.json_data?.edgeType &&
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
          className="bg-gradient-to-br from-slate-800/40 to-slate-900/40 backdrop-blur-xl rounded-2xl p-[2vh] compact-card border border-slate-700/30 shadow-xl animate-pulse"
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

const UserProfile: React.FC = () => {
  const { username } = useParams<{ username: string }>()
  const { user } = useAuthStore()
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [publicMaps, setPublicMaps] = useState<any[]>([])
  const [collaborationMaps, setCollaborationMaps] = useState<any[]>([])
  const [savedMaps, setSavedMaps] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<"mindmaps" | "collaborations" | "saves">("mindmaps")
  const [isFollowing, setIsFollowing] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalTitle, setModalTitle] = useState("")
  const [modalUserIds, setModalUserIds] = useState<string[]>([])
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)
  const [shareMapData, setShareMapData] = useState<{
    permalink: string
    title: string
    is_main: boolean
    creatorUsername: string
    id?: string
  } | null>(null)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false)
  const [infoMapData, setInfoMapData] = useState<any>(null)

  // Track screen size to control preview interactions
  const [isSmallScreen, setIsSmallScreen] = useState(typeof window !== 'undefined' ? window.innerWidth < 1080 : false)
  const handleResize = useCallback(() => {
    setIsSmallScreen(window.innerWidth < 1080)
  }, [])
  useEffect(() => {
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [handleResize])

  // Add mindmap actions hook
  const { handleLike: hookHandleLike, handleSave: hookHandleSave } = useMindMapActions({
    onLikeUpdate: (mapPermalink, newLikes, newLikedBy) => {
      setPublicMaps((prevMaps) =>
        prevMaps.map((map) => (map.permalink === mapPermalink ? { 
          ...map, 
          likes: newLikes, 
          liked_by: user?.id && newLikedBy.includes(user.id) ? [user.id] : []
        } : map)),
      )
    },
    onSaveUpdate: (mapPermalink, newSaves, newSavedBy) => {
      setPublicMaps((prevMaps) =>
        prevMaps.map((map) => (map.permalink === mapPermalink ? { 
          ...map, 
          saves: newSaves, 
          saved_by: user?.id && newSavedBy.includes(user.id) ? [user.id] : []
        } : map)),
      )
    },
    sendNotifications: true,
  })

  // Add separate handlers for collaboration maps with notifications enabled
  const { handleLike: collabHandleLike, handleSave: collabHandleSave } = useMindMapActions({
    onLikeUpdate: (mapPermalink, newLikes, newLikedBy) => {
      setCollaborationMaps((prevMaps) =>
        prevMaps.map((map) => (map.permalink === mapPermalink ? { 
          ...map, 
          likes: newLikes, 
          liked_by: user?.id && newLikedBy.includes(user.id) ? [user.id] : []
        } : map)),
      )
    },
    onSaveUpdate: (mapPermalink, newSaves, newSavedBy) => {
      setCollaborationMaps((prevMaps) =>
        prevMaps.map((map) => (map.permalink === mapPermalink ? { 
          ...map, 
          saves: newSaves, 
          saved_by: user?.id && newSavedBy.includes(user.id) ? [user.id] : []
        } : map)),
      )
    },
    sendNotifications: true,
  })

  // Add handlers for saved maps with notifications enabled
  const { handleLike: savedHandleLike, handleSave: savedHandleSave } = useMindMapActions({
    onLikeUpdate: (mapPermalink, newLikes, newLikedBy) => {
      setSavedMaps((prevMaps) =>
        prevMaps.map((map) => (map.permalink === mapPermalink ? { 
          ...map, 
          likes: newLikes, 
          liked_by: user?.id && newLikedBy.includes(user.id) ? [user.id] : []
        } : map)),
      )
    },
    onSaveUpdate: (mapPermalink, newSaves, newSavedBy) => {
      setSavedMaps((prevMaps) => {
        // Only remove from saved maps list if we're viewing our own profile and we unsaved it
        if (user?.id && profile?.id === user.id && !newSavedBy.includes(user.id)) {
          return prevMaps.filter((map) => map.permalink !== mapPermalink)
        }
        // Otherwise, just update the save count
        return prevMaps.map((map) => (map.permalink === mapPermalink ? { 
          ...map, 
          saves: newSaves, 
          saved_by: user?.id && newSavedBy.includes(user.id) ? [user.id] : []
        } : map))
      })
    },
    sendNotifications: true,
  })

  if (loading) {
    usePageTitle("Loading...");
  } else if (!profile) {
    usePageTitle("Not Found");
  } else {
    usePageTitle(`${profile.full_name || profile.username}`);
  }

  // Listen for follow/unfollow events from UserListModal
  useEffect(() => {
    const handleFollowToggle = (data: { action: 'follow' | 'unfollow', targetUserId: string, currentUserId: string }) => {
      if (!user?.id || !profile) return;

      // Update counts based on the follow action
      if (data.currentUserId === user.id) {
        // Current user is following/unfollowing someone else
        if (data.targetUserId === profile.id) {
          // Current user is following/unfollowing the profile user - update isFollowing state
          setIsFollowing(data.action === 'follow');
        }
      } else if (data.targetUserId === profile.id) {
        // Someone is following/unfollowing the profile user - update followers count
        setProfile((prevProfile: any) => {
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

  // Reusable function to fetch saved maps (needed for followers-only post-follow fetch)
  const fetchSavedMaps = useCallback(async (userId: string) => {
    try {
      // Get saved map IDs
      const { data: userSaves, error: savesError } = await supabase
        .from("mindmap_saves")
        .select("mindmap_id")
        .eq("user_id", userId)

      if (savesError) {
        console.error("Error fetching user saves:", savesError)
        setSavedMaps([])
        return
      }

      const savedMapIds = userSaves?.map(save => save.mindmap_id) || []
      if (savedMapIds.length === 0) {
        setSavedMaps([])
        return
      }

      // Fetch full map data
      const { data: savedMapsData, error: savedMapsError } = await supabase
        .from("mindmaps")
        .select("permalink, id, title, json_data, drawing_data, updated_at, visibility, comment_count, description, is_main, creator")
        .in("id", savedMapIds)
        .eq("visibility", "public")

      if (savedMapsError) {
        console.error("Error fetching saved maps:", savedMapsError)
        setSavedMaps([])
        return
      }

      if (!savedMapsData || savedMapsData.length === 0) {
        setSavedMaps([])
        return
      }

      const mapIds = savedMapsData.map(m => m.id)
      const [likeCountsResult, userLikesResult, saveCountsResult, userSavesResult, collaborationsResult] = await Promise.all([
        supabase.from("mindmap_like_counts").select("mindmap_id, like_count").in("mindmap_id", mapIds),
        user?.id ? supabase.from("mindmap_likes").select("mindmap_id").eq("user_id", user.id).in("mindmap_id", mapIds) : Promise.resolve({ data: [], error: null }),
        supabase.from("mindmap_save_counts").select("mindmap_id, save_count").in("mindmap_id", mapIds),
        user?.id ? supabase.from("mindmap_saves").select("mindmap_id").eq("user_id", user.id).in("mindmap_id", mapIds) : Promise.resolve({ data: [], error: null }),
        supabase.from("mindmap_collaborations").select("mindmap_id, collaborator_id, status").in("mindmap_id", mapIds).eq("status", "accepted")
      ])

      const likeCountMap = new Map(likeCountsResult.data?.map(i => [i.mindmap_id, i.like_count]) || [])
      const userLikedSet = new Set(userLikesResult.data?.map(i => i.mindmap_id) || [])
      const saveCountMap = new Map(saveCountsResult.data?.map(i => [i.mindmap_id, i.save_count]) || [])
      const userSavedSet = new Set(userSavesResult.data?.map(i => i.mindmap_id) || [])
      const collaboratorsMap = new Map()
      collaborationsResult.data?.forEach(collab => {
        if (!collaboratorsMap.has(collab.mindmap_id)) collaboratorsMap.set(collab.mindmap_id, [])
        collaboratorsMap.get(collab.mindmap_id).push(collab.collaborator_id)
      })

      // Creator profiles
      const creatorIds = [...new Set(savedMapsData.map(m => m.creator))]
      const { data: savedProfilesData } = await supabase
        .from("profiles")
        .select("id, avatar_url, username, full_name")
        .in("id", creatorIds)

      const creatorAvatars = new Map()
      const creatorUsernames = new Map()
      const creatorFullNames = new Map()
      savedProfilesData?.forEach(p => {
        creatorAvatars.set(p.id, p.avatar_url)
        creatorUsernames.set(p.id, p.username)
        creatorFullNames.set(p.id, p.full_name)
      })

      const processed = savedMapsData.map(map => ({
        ...map,
        nodes: map.json_data?.nodes || [],
        edges: map.json_data?.edges || [],
        edgeType: map.json_data?.edgeType || 'default',
        updatedAt: map.updated_at ? new Date(map.updated_at).getTime() : Date.now(),
        description: map.description || "",
        comment_count: map.comment_count || 0,
        createdAt: Date.now(),
        is_main: map.is_main || false,
        creatorUsername: creatorUsernames.get(map.creator) || "Unknown",
        creatorFull_name: creatorFullNames.get(map.creator) || creatorUsernames.get(map.creator) || "Unknown",
        creatorAvatar: creatorAvatars.get(map.creator) || null,
        likes: likeCountMap.get(map.id) || 0,
        liked_by: userLikedSet.has(map.id) ? [user?.id] : [],
        saves: saveCountMap.get(map.id) || 0,
        saved_by: userSavedSet.has(map.id) ? [user?.id] : [],
        collaborators: collaboratorsMap.get(map.id) || []
      })).sort((a, b) => b.updatedAt - a.updatedAt)

      setSavedMaps(processed)
    } catch (err) {
      console.error('Error fetching saved maps (reusable):', err)
      setSavedMaps([])
    }
  }, [user?.id])

  useEffect(() => {
    const fetchUserProfile = async () => {
      setLoading(true)

      // Check if this is an @username format and redirect to main map if needed
      if (username && username.startsWith("@")) {
        const usernameWithoutAt = username.substring(1)

        // First, get the user's ID from their username
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("id")
          .eq("username", usernameWithoutAt)

        if (!profileError && profileData && profileData.length > 0) {
          // Then, get the user's main map
          const { data: mapData, error: mapError } = await supabase
            .from("mindmaps")
            .select("permalink")
            .eq("creator", profileData[0].id)
            .eq("is_main", true)
            .eq("visibility", "public")

          if (!mapError && mapData && mapData.length > 0) {
            window.location.href = `/${usernameWithoutAt}/${mapData[0].permalink}`
            return
          }
        }

        // If we couldn't find a main map or there was an error, continue to show the profile
        // but update the URL to remove the @ symbol
        window.history.replaceState({}, "", `/${usernameWithoutAt}`)
      }

      // Fetch basic profile data
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, full_name, join_date, avatar_url, description, save_visibility")
        .eq("username", username?.replace("@", ""))
        .single()

      if (error || !data) {
        console.error("Error fetching user profile:", error || "User not found")
        setProfile(null)
      } else {
        // Fetch follower and following counts from new tables
        const [followerCountResult, followingCountResult, isFollowingResult] = await Promise.all([
          supabase
            .from("user_followers_count")
            .select("followers_count")
            .eq("user_id", data.id)
            .single(),
          supabase
            .from("user_following_count")
            .select("following_count")
            .eq("user_id", data.id)
            .single(),
          user?.id ? supabase
            .from("user_follows")
            .select("follower_id")
            .eq("follower_id", user.id)
            .eq("followed_id", data.id)
            .single() : Promise.resolve({ data: null, error: null })
        ]);

        const followersCount = followerCountResult.data?.followers_count || 0;
        const followingCount = followingCountResult.data?.following_count || 0;
        const isCurrentlyFollowing = !!isFollowingResult.data;

        // Create profile data with counts from new tables
        const profileData = {
          ...data,
          followers: followersCount,
          following_count: followingCount,
          followed_by: [], // Deprecated, kept for compatibility
          following: [] // Deprecated, kept for compatibility
        };

        setProfile(profileData)
        setIsFollowing(isCurrentlyFollowing)
        fetchPublicMaps(data.id)
        fetchCollaborationMaps(data.id)
        const isOwner = user?.id === data.id
        if (isOwner) {
          fetchSavedMaps(data.id)
        } else if (data.save_visibility === 'followers') {
          if (isCurrentlyFollowing) fetchSavedMaps(data.id)
        } else if (data.save_visibility !== 'private') {
          // public or undefined
          fetchSavedMaps(data.id)
        }
      }
      setLoading(false)
    }

    const fetchPublicMaps = async (creatorId: string) => {
      const { data, error } = await supabase
        .from("mindmaps")
        .select(
          "permalink, id, title, json_data, drawing_data, updated_at, comment_count, visibility, is_main, creator, published_at",
        )
        .eq("creator", creatorId)
        .eq("visibility", "public")

      if (error) {
        console.error("Error fetching public maps:", error)
        setPublicMaps([])
      } else {
        console.log("Fetched public maps with ids:", data?.map((map) => ({ permalink: map.permalink, id: map.id })))
        
        // Fetch like counts and user likes for these maps
        const mapIds = data?.map(map => map.id) || []
        const [likeCountsResult, userLikesResult, saveCountsResult, userSavesResult, collaborationsResult] = await Promise.all([
          // Get like counts
          supabase
            .from("mindmap_like_counts")
            .select("mindmap_id, like_count")
            .in("mindmap_id", mapIds),
          // Get user likes (if user is logged in)
          user?.id ? supabase
            .from("mindmap_likes")
            .select("mindmap_id")
            .eq("user_id", user.id)
            .in("mindmap_id", mapIds) : Promise.resolve({ data: [], error: null }),
          // Get save counts
          supabase
            .from("mindmap_save_counts")
            .select("mindmap_id, save_count")
            .in("mindmap_id", mapIds),
          // Get user saves (if user is logged in)
          user?.id ? supabase
            .from("mindmap_saves")
            .select("mindmap_id")
            .eq("user_id", user.id)
            .in("mindmap_id", mapIds) : Promise.resolve({ data: [], error: null }),
          // Get collaborations
          supabase
            .from("mindmap_collaborations")
            .select("mindmap_id, collaborator_id, status")
            .in("mindmap_id", mapIds)
            .eq("status", "accepted")
        ])

        // Create lookup maps
        const likeCountMap = new Map(likeCountsResult.data?.map(item => [item.mindmap_id, item.like_count]) || [])
        const userLikedSet = new Set(userLikesResult.data?.map(item => item.mindmap_id) || [])
        const saveCountMap = new Map(saveCountsResult.data?.map(item => [item.mindmap_id, item.save_count]) || [])
        const userSavedSet = new Set(userSavesResult.data?.map(item => item.mindmap_id) || [])
        const collaboratorsMap = new Map()
        collaborationsResult.data?.forEach(collab => {
          if (!collaboratorsMap.has(collab.mindmap_id)) {
            collaboratorsMap.set(collab.mindmap_id, [])
          }
          collaboratorsMap.get(collab.mindmap_id).push(collab.collaborator_id)
        })

        const mapsWithCreator =
          data
            ?.map((map) => ({
              ...map,
              creator: creatorId,
              updatedAt: map.updated_at ? new Date(map.updated_at).getTime() : Date.now(),
              creatorUsername: username,
              creatorAvatar: profile?.avatar_url,
              // Use new optimized data
              likes: likeCountMap.get(map.id) || 0,
              liked_by: userLikedSet.has(map.id) ? [user?.id] : [],
              saves: saveCountMap.get(map.id) || 0,
              saved_by: userSavedSet.has(map.id) ? [user?.id] : [],
              collaborators: collaboratorsMap.get(map.id) || []
            }))
            .sort((a, b) => {
              if (a.is_main && !b.is_main) return -1
              if (!a.is_main && b.is_main) return 1
              return b.updatedAt - a.updatedAt
            }) || []
        setPublicMaps(mapsWithCreator)
      }
    }

    const fetchCollaborationMaps = async (creatorId: string) => {
      try {
        // First get collaboration records for this user
        const { data: collaborations, error: collabError } = await supabase
          .from("mindmap_collaborations")
          .select("mindmap_id")
          .eq("collaborator_id", creatorId)
          .eq("status", "accepted")

        if (collabError) {
          console.error("Error fetching collaborations:", collabError)
          setCollaborationMaps([])
          return
        }

        const collaborationMapIds = collaborations?.map(collab => collab.mindmap_id) || []
        if (collaborationMapIds.length === 0) {
          setCollaborationMaps([])
          return
        }

        // Then get the mindmap data for those collaborations
        const { data: collabData, error: mindmapsError } = await supabase
          .from("mindmaps")
          .select(
            "permalink, id, title, json_data, drawing_data, updated_at, visibility, comment_count, description, is_main, creator",
          )
          .in("id", collaborationMapIds)
          .eq("visibility", "public")

        if (mindmapsError) {
          console.error("Error fetching collaboration mindmaps:", mindmapsError)
          setCollaborationMaps([])
          return
        }

        if (collabData && collabData.length > 0) {
          const mapIds = collabData.map(map => map.id)
          
          // Fetch like counts, user likes, save counts, user saves, and collaborations for these maps
          const [likeCountsResult, userLikesResult, saveCountsResult, userSavesResult, allCollaborationsResult] = await Promise.all([
            // Get like counts
            supabase
              .from("mindmap_like_counts")
              .select("mindmap_id, like_count")
              .in("mindmap_id", mapIds),
            // Get user likes (if user is logged in)
            user?.id ? supabase
              .from("mindmap_likes")
              .select("mindmap_id")
              .eq("user_id", user.id)
              .in("mindmap_id", mapIds) : Promise.resolve({ data: [], error: null }),
            // Get save counts
            supabase
              .from("mindmap_save_counts")
              .select("mindmap_id, save_count")
              .in("mindmap_id", mapIds),
            // Get user saves (if user is logged in)
            user?.id ? supabase
              .from("mindmap_saves")
              .select("mindmap_id")
              .eq("user_id", user.id)
              .in("mindmap_id", mapIds) : Promise.resolve({ data: [], error: null }),
            // Get all collaborations for these maps
            supabase
              .from("mindmap_collaborations")
              .select("mindmap_id, collaborator_id, status")
              .in("mindmap_id", mapIds)
              .eq("status", "accepted")
          ])

          // Create lookup maps
          const likeCountMap = new Map(likeCountsResult.data?.map(item => [item.mindmap_id, item.like_count]) || [])
          const userLikedSet = new Set(userLikesResult.data?.map(item => item.mindmap_id) || [])
          const saveCountMap = new Map(saveCountsResult.data?.map(item => [item.mindmap_id, item.save_count]) || [])
          const userSavedSet = new Set(userSavesResult.data?.map(item => item.mindmap_id) || [])
          const collaboratorsMap = new Map()
          allCollaborationsResult.data?.forEach(collab => {
            if (!collaboratorsMap.has(collab.mindmap_id)) {
              collaboratorsMap.set(collab.mindmap_id, [])
            }
            collaboratorsMap.get(collab.mindmap_id).push(collab.collaborator_id)
          })

          // Get creator profiles
          const creatorIds = [...new Set(collabData.map((map) => map.creator))]
          const { data: profilesData, error: profilesError } = await supabase
            .from("profiles")
            .select("id, avatar_url, username, full_name")
            .in("id", creatorIds)

          if (profilesError) {
            console.error("Error fetching creator profiles:", profilesError)
          }

          const creatorAvatars = new Map()
          const creatorUsernames = new Map()
          const creatorFullNames = new Map()
          profilesData?.forEach((profile) => {
            creatorAvatars.set(profile.id, profile.avatar_url)
            creatorUsernames.set(profile.id, profile.username)
            creatorFullNames.set(profile.id, profile.full_name)
          })

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
              creatorUsername: creatorUsernames.get(map.creator) || "Unknown",
              creatorFull_name: creatorFullNames.get(map.creator) || creatorUsernames.get(map.creator) || "Unknown",
              creatorAvatar: creatorAvatars.get(map.creator) || null,
              // Use new optimized data
              likes: likeCountMap.get(map.id) || 0,
              liked_by: userLikedSet.has(map.id) ? [user?.id] : [],
              saves: saveCountMap.get(map.id) || 0,
              saved_by: userSavedSet.has(map.id) ? [user?.id] : [],
              collaborators: collaboratorsMap.get(map.id) || []
            }))
            .sort((a, b) => b.updatedAt - a.updatedAt)
          setCollaborationMaps(processedCollabMaps)
        } else {
          setCollaborationMaps([])
        }
      } catch (error) {
        console.error("Error in collaboration maps fetch:", error)
        setCollaborationMaps([])
      }
    }

    if (username) {
      fetchUserProfile()
    }
  }, [username, user?.id])

  // Secondary effect: when user follows a followers-only profile, fetch saves once
  useEffect(() => {
    if (!profile?.id) return
    if (profile.save_visibility === 'followers' && user?.id !== profile.id && isFollowing && savedMaps.length === 0) {
      fetchSavedMaps(profile.id)
    }
  }, [isFollowing, profile?.id, profile?.save_visibility, fetchSavedMaps, user?.id, savedMaps.length])

  const handleFollow = async () => {
    if (!user?.id || !profile?.id) return

    const isCurrentlyFollowing = isFollowing

    // Optimistically update UI
    setProfile((prev: any) => ({
      ...prev,
      followers: isCurrentlyFollowing ? prev.followers - 1 : prev.followers + 1,
    }))
    setIsFollowing(!isCurrentlyFollowing)

    try {
      if (isCurrentlyFollowing) {
        // Unfollow: remove from user_follows table
        const { error } = await supabase
          .from('user_follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('followed_id', profile.id);

        if (error) throw error;
      } else {
        // Follow: add to user_follows table
        const { error } = await supabase
          .from('user_follows')
          .insert({
            follower_id: user.id,
            followed_id: profile.id
          });

        if (error) throw error;
      }

      // Send notification
      if (user?.username && profile.id !== user.id) {
        await useNotificationStore.getState().addNotification({
          user_id: profile.id,
          type: "follow",
          title: isCurrentlyFollowing ? "Lost Follower" : "New Follower",
          message: isCurrentlyFollowing
            ? `@${user.username} unfollowed you`
            : `@${user.username} started following you`,
          related_user: user.id,
        })
      }
    } catch (error) {
      console.error("Error updating follow status:", error)
      // Revert UI changes on failure
      setProfile((prev: any) => ({
        ...prev,
        followers: isCurrentlyFollowing ? prev.followers + 1 : prev.followers - 1,
      }))
      setIsFollowing(isCurrentlyFollowing)
    }
  }

  const openModal = (title: string, userIds: string[]) => {
    setModalTitle(title)
    setModalUserIds(userIds)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setModalTitle("")
    setModalUserIds([])
  }

  const handleShare = (mapPermalink: string, mapTitle: string, isMain: boolean, creatorUsername: string, mapId?: string) => {
    setShareMapData({ permalink: mapPermalink, title: mapTitle, is_main: isMain, creatorUsername, id: mapId })
    setIsShareModalOpen(true)
  }

  const closeShareModal = () => {
    setIsShareModalOpen(false)
    setShareMapData(null)
  }

  const toggleMenu = (mapPermalink: string) => {
    setOpenMenuId(openMenuId === mapPermalink ? null : mapPermalink)
  }
  const handleOpenInfo = (map: any) => {
    let updatedAt = map.updated_at
    if (!updatedAt || isNaN(new Date(updatedAt).getTime())) {
      updatedAt = new Date().toISOString()
    } const mapCreatorUsername = map.creatorUsername || username
    const mapCreatorDisplayName = map.creatorFull_name || map.creator_full_name || profile?.full_name || map.creatorUsername || username
    const mapCreatorAvatar = map.creatorAvatar || profile?.avatar_url

    setInfoMapData({
      username: mapCreatorUsername,
      displayName: mapCreatorDisplayName,
      name: map.title,
  permalink: map.permalink,
      updatedAt: updatedAt,
      description: map.description || "No description provided.",
      avatar_url: mapCreatorAvatar,
      collaborators: map.collaborators || [],
      published_at: map.published_at,
      stats: {
        nodes: map.json_data?.nodes?.length || 0,
        edges: map.json_data?.edges?.length || 0,
        likes: map.likes || 0,
        comments: map.comment_count || 0,
        saves: map.saves || 0,
      },
    })
    setIsInfoModalOpen(true)
    setOpenMenuId(null)
  }

  const closeInfoModal = () => {
    setIsInfoModalOpen(false)
    setInfoMapData(null)
  }
  if (loading) {
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
                    <div className="h-6 w-40 bg-slate-700/50 rounded-lg animate-pulse"></div>
                    <div className="h-4 w-24 bg-slate-700/50 rounded animate-pulse"></div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-9 w-24 bg-slate-700/50 rounded-xl animate-pulse"></div>
                    <div className="h-9 w-20 bg-slate-700/50 rounded-xl animate-pulse"></div>
                  </div>
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
            <div className="mt-3 grid grid-cols-3 gap-1 border-t border-slate-700/50 pt-2">
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
    )
  }

  if (!profile) {
    return (
      <div className="fixed inset-0 h-screen w-screen flex items-center justify-center bg-transparent z-50">
        <div className="rounded-2xl p-12 border border-slate-700/30 shadow-2xl max-w-lg w-full text-center bg-slate-900/90">
          <div className="mb-8">
            <div className="w-24 h-24 mx-auto rounded-2xl flex items-center justify-center bg-slate-800">
              <Network className="w-12 h-12 text-slate-400" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white mb-4">Page not found</h1>
          <p className="text-slate-400 mb-8 leading-relaxed">
            The page you're looking for doesn't exist or has been moved.
          </p>
          <a
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium hover:from-blue-500 hover:to-purple-500 transition-all duration-200 transform hover:scale-105"
          >
            <Network className="w-4 h-4" />
            Return home
          </a>
        </div>
      </div>
    )
  }

  const joinDate = profile?.join_date ? new Date(profile.join_date) : new Date()
  const isOwnProfile = user?.id === profile?.id
  const isSavesPrivate = profile?.save_visibility === 'private' && !isOwnProfile
  const isSavesFollowersRestricted = profile?.save_visibility === 'followers' && !isOwnProfile
  const isSavesLocked = (isSavesPrivate) || (isSavesFollowersRestricted && !isFollowing)

  return (
    <div className="min-h-screen">
      <div className="max-w-4xl xl:max-w-[50vw] mx-auto p-4 xl:p-[2vh]">        {/* Enhanced Profile Header */}
        <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl rounded-2xl p-[2vh] compact-card border border-slate-700/30 shadow-2xl">
          <div className="flex gap-4 items-start">
            {/* Enhanced Avatar */}
            <div className="relative group">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center overflow-hidden ring-4 ring-slate-600/20 transition-all duration-300 group-hover:ring-slate-500/30">
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url || "/placeholder.svg"}
                    alt={profile.username}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                  />
                ) : (
                  <span className="text-2xl font-bold text-slate-300">{profile.username.charAt(0).toUpperCase()}</span>
                )}
              </div>
            </div>            {/* Enhanced User Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-3">
                <div className="space-y-1">
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                    {profile.full_name || profile.username}
                  </h1>
                  <p className="text-slate-400 font-medium text-sm">@{profile.username}</p>
                </div>                {/* Enhanced Action Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => (window.location.href = `/chat?user=${profile.username}`)}
                    className="group flex items-center gap-2 px-3 py-2 bg-slate-700/50 hover:bg-slate-600/50 text-white rounded-xl transition-all duration-200 border border-slate-600/30 hover:border-slate-500/50"
                  >
                    <MessageCircle className="w-4 h-4 transition-transform group-hover:scale-110" />
                    <span className="font-medium hidden sm:inline text-sm">Message</span>
                  </button>
                  <button
                    onClick={handleFollow}
                    className={`group flex items-center gap-2 px-3 py-2 rounded-xl font-medium transition-all duration-200 transform hover:scale-105 ${isFollowing
                        ? "bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-400 hover:to-pink-500 text-white shadow-lg shadow-red-500/25"
                        : "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-lg shadow-blue-500/25"
                      }`}
                  >
                    {isFollowing ? (
                      <UserMinus className="w-4 h-4 transition-transform group-hover:scale-110" />
                    ) : (
                      <UserPlus className="w-4 h-4 transition-transform group-hover:scale-110" />
                    )}
                    <span className="hidden sm:inline">{isFollowing ? "Unfollow" : "Follow"}</span>
                  </button>
                </div>
              </div>              {/* Enhanced Bio */}
              <div className="mb-3">
                <p className="text-slate-300 leading-relaxed text-sm">{profile.description || "No bio yet"}</p>
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
          <div className="mt-3 grid grid-cols-3 gap-1 border-t border-slate-700/50 pt-2">            <div className="text-center group cursor-default hover:bg-slate-700/30 rounded-lg p-1 transition-all duration-200">
            <div className="text-base font-bold text-white mb-0.5 transition-colors group-hover:text-blue-400">
              {publicMaps.length}
            </div>
            <div className="text-xs text-slate-400 font-medium group-hover:text-slate-300">Mindmaps</div>
          </div>
            <div
              className="text-center group cursor-pointer hover:bg-slate-700/30 rounded-lg p-1 transition-all duration-200"
              onClick={() => openModal("Followers", [])}
            >
              <div className="text-base font-bold text-white mb-0.5 transition-colors group-hover:text-blue-400">
                {profile.followers || 0}
              </div>
              <div className="text-xs text-slate-400 font-medium group-hover:text-slate-300">Followers</div>
            </div>
            <div
              className="text-center group cursor-pointer hover:bg-slate-700/30 rounded-lg p-1 transition-all duration-200"
              onClick={() => openModal("Following", [])}
            >
              <div className="text-base font-bold text-white mb-0.5 transition-colors group-hover:text-blue-400">
                {profile.following_count || 0}
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
                { key: "saves", icon: Bookmark, label: "Saves", count: isSavesLocked ? 0 : savedMaps.length, private: isSavesLocked },
              ].map((tab: any, index) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`flex-1 flex items-center justify-center gap-3 px-6 py-4 transition-all duration-300 relative group ${activeTab === tab.key
                      ? "text-blue-400 bg-slate-700/50"
                      : "text-slate-400 hover:text-slate-300 hover:bg-slate-700/30"
                    } ${index === 0 ? "rounded-l-2xl" : ""} ${index === 2 ? "rounded-r-2xl" : ""}`}
                >
                  <span className="relative inline-flex items-center">
                    <tab.icon
                      className={`w-5 h-5 transition-all duration-300 ${activeTab === tab.key ? "scale-110" : "group-hover:scale-105"}`}
                    />
                    {tab.private && (
                      <>
                        <Lock
                          className="w-3 h-3 text-slate-400 absolute -top-1 -right-1"
                          aria-label="Private saves"
                        />
                        <span className="sr-only">Saves are private</span>
                      </>
                    )}
                  </span>
                  <span className="font-medium hidden sm:inline text-sm">{tab.label}</span>
                  {!tab.private && tab.count > 0 && (
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
            <>              {publicMaps.length > 0 ? (
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
                          {profile?.avatar_url ? (
                            <img
                              src={profile.avatar_url || "/placeholder.svg"}
                              alt={profile.username}
                              className="w-8 h-8 rounded-full object-cover ring-2 ring-slate-600/30"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center">
                              <span className="text-sm font-bold text-slate-300">
                                {profile?.username?.charAt(0)?.toUpperCase() || "?"}
                              </span>
                            </div>
                          )}
                          {map.is_main && (
                            <div className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-blue-500/20 to-blue-300/20 rounded-full border border-blue-500/30">
                              <Star className="w-3 h-3 text-blue-400 fill-current" />
                              <span className="text-xs font-medium text-blue-300">Main</span>
                            </div>
                          )}
                        </div>                          <h3 className="text-base font-bold text-white truncate">
                          {map.title}
                        </h3>
                      </div>

                      {/* Enhanced Menu */}
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleMenu(map.permalink)
                          }}
                          className="p-2 text-slate-500 hover:text-slate-300 transition-all duration-200 rounded-lg hover:bg-slate-700/50"
                        >
                          <MoreVertical className="w-5 h-5" />
                        </button>
                        {openMenuId === map.permalink && (
                          <div className="absolute right-0 mt-2 w-48 bg-slate-800/95 backdrop-blur-xl rounded-xl shadow-2xl z-10 border border-slate-700/50 overflow-hidden">
                            <div className="py-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleOpenInfo(map)
                                }}
                                className="w-full text-left px-4 py-3 text-sm text-slate-300 hover:bg-slate-700/50 hover:text-white flex items-center gap-3 transition-all duration-200"
                              >
                                <Info className="w-4 h-4" />
                                View Info
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
                        {map.updated_at && !isNaN(new Date(map.updated_at).getTime())
                          ? formatDateWithPreference(new Date(map.updated_at))
                          : "Unknown date"}
                      </span>
                    </div>                      {/* Enhanced Mind Map Preview */}
                    {map.json_data?.nodes?.length > 0 && (
                      <a
                        href={`/${username}/${map.permalink}`}
                        className="block mb-5 compact-preview h-56 border border-slate-700/50 hover:border-blue-500/50 rounded-xl overflow-hidden transition-all duration-50 hover:shadow-lg hover:shadow-blue-500/10 relative group/preview"
                      >
                        <UserProfileMindMapPreview map={map} isSmallScreen={isSmallScreen} />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/20 to-transparent opacity-0 group-hover/preview:opacity-100 transition-opacity duration-50"></div>
                      </a>
                    )}

                    {/* Enhanced Action Bar */}
                    <div className="flex items-center justify-between">                        <div className="flex items-center gap-6">                          <button
                      onClick={(e) => hookHandleLike(e, map)}
                      className="group/action flex items-center gap-2 text-slate-400 hover:text-blue-500 transition-all duration-200"
                    >
                      <Heart
                        className={`w-5 h-5 transition-all duration-200 group-hover/action:scale-110 ${user?.id && map.liked_by && map.liked_by.length > 0 ? "fill-current text-blue-500" : ""
                          }`}
                      />
                      {map.likes > 0 && <span className="font-medium">{map.likes}</span>}
                    </button>
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          window.location.href = `/${username}/${map.permalink}#comments-section`
                        }}
                        className="group/action flex items-center gap-2 text-slate-400 hover:text-blue-500 transition-all duration-200"
                      >
                        <MessageCircle className="w-5 h-5 transition-all duration-200 group-hover/action:scale-110" />
                        {map.comment_count > 0 && <span className="font-medium">{map.comment_count}</span>}
                      </button>
                      <button
                        onClick={(e) => hookHandleSave(e, map)}
                        className="group/action flex items-center gap-2 text-slate-400 hover:text-blue-500 transition-all duration-200"
                      >
                        <Bookmark
                          className={`w-5 h-5 transition-all duration-200 group-hover/action:scale-110 ${user?.id && map.saved_by && map.saved_by.length > 0 ? "fill-current text-blue-500" : ""
                            }`}
                        />
                        {map.saves > 0 && <span className="font-medium">{map.saves}</span>}
                      </button>
                    </div>
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          handleShare(map.permalink, map.title, map.is_main || false, username || "", map.id)
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
                <p className="text-slate-400">This user hasn't created any public mindmaps.</p>
              </div>
            )}
            </>
          )}

          {/* Collaborations Tab */}          {activeTab === "collaborations" && (
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
                              e.stopPropagation()
                              window.location.href = `/${map.creatorUsername}`
                            }}
                          >
                            {map.creatorAvatar ? (
                              <img
                                src={map.creatorAvatar || "/placeholder.svg"}
                                alt={map.creatorUsername}
                                className="w-8 h-8 rounded-full object-cover ring-2 ring-slate-600/30"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center">
                                <span className="text-sm font-bold text-slate-300">
                                  {map.creatorUsername?.charAt(0)?.toUpperCase() || "?"}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-xl font-bold text-white truncate">
                              {map.title}
                            </h3>
                            <p
                              className="text-sm text-blue-400 hover:text-blue-300 transition-colors cursor-pointer font-medium"
                              onClick={(e) => {
                                e.stopPropagation()
                                window.location.href = `/${map.creatorUsername}`
                              }}
                            >
                              @{map.creatorUsername}
                            </p>
                          </div>
                        </div>

                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleMenu(map.permalink)
                            }}
                            className="p-2 text-slate-500 hover:text-slate-300 transition-all duration-200 rounded-lg hover:bg-slate-700/50"
                          >
                            <MoreVertical className="w-5 h-5" />
                          </button>
                          {openMenuId === map.permalink && (
                            <div className="absolute right-0 mt-2 w-48 bg-slate-800/95 backdrop-blur-xl rounded-xl shadow-2xl z-10 border border-slate-700/50 overflow-hidden">
                              <div className="py-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleOpenInfo(map)
                                  }}
                                  className="w-full text-left px-4 py-3 text-sm text-slate-300 hover:bg-slate-700/50 hover:text-white flex items-center gap-3 transition-all duration-200"
                                >
                                  <Info className="w-4 h-4" />
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
                          {map.updated_at && !isNaN(new Date(map.updated_at).getTime())
                            ? formatDateWithPreference(new Date(map.updated_at))
                            : "Unknown date"}
                        </span>
                      </div>                      {map.json_data?.nodes?.length > 0 && (
                        <a
                          href={`/${username}/${map.permalink}`}
                          className="block mb-5 compact-preview h-56 border border-slate-700/50 hover:border-blue-500/50 rounded-xl overflow-hidden transition-all duration-50 hover:shadow-lg hover:shadow-blue-500/10 relative group/preview"
                        >
                          <UserProfileMindMapPreview map={map} isSmallScreen={isSmallScreen} />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/20 to-transparent opacity-0 group-hover/preview:opacity-100 transition-opacity duration-50"></div>
                        </a>
                      )}

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-6">                          <button
                          onClick={(e) => collabHandleLike(e, map)}
                          className="group/action flex items-center gap-2 text-slate-400 hover:text-blue-500 transition-all duration-200"
                        >
                          <Heart
                            className={`w-5 h-5 transition-all duration-200 group-hover/action:scale-110 ${user?.id && map.liked_by && map.liked_by.length > 0 ? "fill-current text-blue-500" : ""
                              }`}
                          />
                          {map.likes > 0 && <span className="font-medium">{map.likes}</span>}
                        </button>
                          <button
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              window.location.href = `/${map.creatorUsername}/${map.permalink}#comments-section`
                            }}
                            className="group/action flex items-center gap-2 text-slate-400 hover:text-blue-500 transition-all duration-200"
                          >
                            <MessageCircle className="w-5 h-5 transition-all duration-200 group-hover/action:scale-110" />
                            {map.comment_count > 0 && <span className="font-medium">{map.comment_count}</span>}
                          </button>
                          <button
                            onClick={(e) => collabHandleSave(e, map)}
                            className="group/action flex items-center gap-2 text-slate-400 hover:text-blue-500 transition-all duration-200"
                          >
                            <Bookmark
                              className={`w-5 h-5 transition-all duration-200 group-hover/action:scale-110 ${user?.id && map.saved_by && map.saved_by.length > 0 ? "fill-current text-blue-500" : ""
                                }`}
                            />
                            {map.saves > 0 && <span className="font-medium">{map.saves}</span>}
                          </button>
                        </div>
                        <button
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            handleShare(map.permalink, map.title, map.is_main || false, map.creatorUsername, map.id)
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
                  <p className="text-slate-400">This user hasn't collaborated on any public mindmaps.</p>
                </div>
              )}
            </>
          )}

          {/* Saves Tab */}
          {activeTab === "saves" && (
            <>
              {isSavesLocked ? (
                <div className="bg-gradient-to-br from-slate-800/30 to-slate-900/30 backdrop-blur-xl rounded-2xl p-12 border border-slate-700/30 text-center">
                  <div className="flex items-center justify-center mb-4">
                    <div className="relative">
                      <Bookmark className="w-16 h-16 text-slate-600" />
                      <Lock className="w-8 h-8 text-slate-400 absolute -top-2 -right-2" />
                    </div>
                  </div>
                  {profile?.save_visibility === 'private' && (
                    <>
                      <h3 className="text-xl font-semibold text-slate-300 mb-2">Saves are private</h3>
                      <p className="text-slate-400">This user has chosen to keep their saved mindmaps hidden.</p>
                    </>
                  )}
                  {profile?.save_visibility === 'followers' && (
                    <>
                      <h3 className="text-xl font-semibold text-slate-300 mb-2">Followers-only saves</h3>
                      <p className="text-slate-400">Follow this user to view the mindmaps they've saved.</p>
                    </>
                  )}
                </div>
              ) : savedMaps.length > 0 ? (
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
                            e.stopPropagation()
                            window.location.href = `/${map.creatorUsername}`
                          }}
                        >
                          {map.creatorAvatar ? (
                            <img
                              src={map.creatorAvatar || "/placeholder.svg"}
                              alt={map.creatorUsername}
                              className="w-8 h-8 rounded-full object-cover ring-2 ring-slate-600/30"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center">
                              <span className="text-sm font-bold text-slate-300">
                                {map.creatorUsername?.charAt(0)?.toUpperCase() || "?"}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-xl font-bold text-white truncate">
                            {map.title}
                          </h3>
                          <p
                            className="text-sm text-blue-400 hover:text-blue-300 transition-colors cursor-pointer font-medium"
                            onClick={(e) => {
                              e.stopPropagation()
                              window.location.href = `/${map.creatorUsername}`
                            }}
                          >
                            @{map.creatorUsername}
                          </p>
                        </div>
                      </div>

                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleMenu(map.permalink)
                          }}
                          className="p-2 text-slate-500 hover:text-slate-300 transition-all duration-200 rounded-lg hover:bg-slate-700/50"
                        >
                          <MoreVertical className="w-5 h-5" />
                        </button>
                        {openMenuId === map.permalink && (
                          <div className="absolute right-0 mt-2 w-48 bg-slate-800/95 backdrop-blur-xl rounded-xl shadow-2xl z-10 border border-slate-700/50 overflow-hidden">
                            <div className="py-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleOpenInfo(map)
                                }}
                                className="w-full text-left px-4 py-3 text-sm text-slate-300 hover:bg-slate-700/50 hover:text-white flex items-center gap-3 transition-all duration-200"
                              >
                                <Info className="w-4 h-4" />
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
                        {map.updated_at && !isNaN(new Date(map.updated_at).getTime())
                          ? formatDateWithPreference(new Date(map.updated_at))
                          : "Unknown date"}
                      </span>
                    </div>                      {map.json_data?.nodes?.length > 0 && (
                      <a
                        href={`/${username}/${map.permalink}`}
                        className="block mb-5 compact-preview h-56 border border-slate-700/50 hover:border-blue-500/50 rounded-xl overflow-hidden transition-all duration-50 hover:shadow-lg hover:shadow-blue-500/10 relative group/preview"
                      >
                        <UserProfileMindMapPreview map={map} isSmallScreen={isSmallScreen} />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/20 to-transparent opacity-0 group-hover/preview:opacity-100 transition-opacity duration-50"></div>                        </a>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-6">

                        <button
                          onClick={(e) => savedHandleLike(e, map)}
                          className="group/action flex items-center gap-2 text-slate-400 hover:text-blue-500 transition-all duration-200"
                        >
                          <Heart
                            className={`w-5 h-5 transition-all duration-200 group-hover/action:scale-110 ${user?.id && map.liked_by && map.liked_by.length > 0 ? "fill-current text-blue-500" : ""
                              }`}
                          />
                          {map.likes > 0 && <span className="font-medium">{map.likes}</span>}
                        </button>
                        <button
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            window.location.href = `/${map.creatorUsername}/${map.permalink}#comments-section`
                          }}
                          className="group/action flex items-center gap-2 text-slate-400 hover:text-blue-500 transition-all duration-200"
                        >
                          <MessageCircle className="w-5 h-5 transition-all duration-200 group-hover/action:scale-110" />
                          {map.comment_count > 0 && <span className="font-medium">{map.comment_count}</span>}
                        </button>
                        <button
                          onClick={(e) => savedHandleSave(e, map)}
                          className="group/action flex items-center gap-2 text-slate-400 hover:text-blue-500 transition-all duration-200"
                        >
                          <Bookmark
                            className={`w-5 h-5 transition-all duration-200 group-hover/action:scale-110 ${user?.id && map.saved_by && map.saved_by.length > 0 ? "fill-current text-blue-500" : ""
                              }`}
                          />
                          {map.saves > 0 && <span className="font-medium">{map.saves}</span>}
                        </button>
                      </div>
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          handleShare(map.permalink, map.title, map.is_main || false, map.creatorUsername, map.id)
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
                  <p className="text-slate-400">This user hasn't saved any mindmaps.</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modals */}
        <UserListModal 
          isOpen={isModalOpen} 
          onClose={closeModal} 
          title={modalTitle} 
          userIds={modalUserIds}
          profileUserId={profile?.id}
        />

        {isShareModalOpen && shareMapData && (
          <ShareModal
            title={shareMapData.title}
            url={`${window.location.origin}/${shareMapData.creatorUsername}/${shareMapData.permalink}`}
            creator={shareMapData.creatorUsername}
            onClose={closeShareModal}
            isMainMap={shareMapData.is_main}
            mindmapId={shareMapData.id as string}
          />
        )}

        {isInfoModalOpen && infoMapData && <InfoModal mindmap={infoMapData} onClose={closeInfoModal} hideVisibility={true} />}
      </div>
    </div>
  )
}

export default UserProfile
