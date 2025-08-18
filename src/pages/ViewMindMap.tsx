"use client"

import type React from "react"
import { useEffect, useState, useCallback, useRef } from "react"
import { useParams, useNavigate } from "react-router-dom"
import ReactFlow, { Background, Controls, ReactFlowProvider, type ReactFlowInstance } from "reactflow"
import "reactflow/dist/style.css"
import { supabase } from "../supabaseClient"
import { useAuthStore } from "../store/authStore"
import { usePageTitle } from "../hooks/usePageTitle"
import { formatDateWithPreference } from "../utils/dateUtils"
import { SpotifyViewNode } from "../components/SpotifyViewNode"
import { SoundCloudViewNode } from "../components/SoundCloudViewNode"
import { YouTubeViewNode } from "../components/YouTubeViewNode"
import { ImageNode } from "../components/ImageNode"
import { AudioNode } from "../components/AudioNode"
import { PlaylistNode } from "../components/PlaylistNode"
import { SocialMediaNode } from "../components/SocialMediaNode"
import { LinkNode } from "../components/LinkNode"
import { MindMapNode } from "../components/MindMapNode"
import { DefaultTextNode } from "../components/TextNode"
import { TextNoBgNode } from "../components/TextNoBgNode";
import MarkdownRenderer from "../components/MarkdownRenderer"
import { prepareNodesForRendering } from "../utils/reactFlowUtils"
import { calculateTextNodeMinHeight, getNodeCurrentWidth } from "../utils/textNodeUtils"
import {
  ChevronDown,
  Maximize2,
  Heart,
  Share2,
  Edit2,
  Trash2,
  MoreHorizontal,
  X,
  Check,
  UserPlus,
  UserMinus,
  Flag,
  Clock,
  MessageCircle,
  Pin,
} from "lucide-react"
import SimilarMindMapNode, { SimilarMindMapNodeSkeleton } from "../components/SimilarMindMapNode"
import ShareModal from "../components/ShareModal"
import InfoModal from "../components/InfoModal"
import { SpotifyLoginModal } from "../components/SpotifyLoginModal"
import { useNotificationStore } from "../store/notificationStore"
import { useMindMapActions } from "../hooks/useMindMapActions"
import eventEmitter from "../services/eventService"
import defaultNodeStyles from "../config/defaultNodeStyles"

import type { NodeTypes, NodeProps } from "reactflow"

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
if (typeof document !== "undefined") {
  const styleSheet = document.createElement("style")
  styleSheet.type = "text/css"
  styleSheet.innerText = shimmerStyles
  document.head.appendChild(styleSheet)
}

const nodeTypes: NodeTypes = {
  default: DefaultTextNode,
  spotify: SpotifyViewNode,
  soundcloud: SoundCloudViewNode,
  "youtube-video": YouTubeViewNode,
  'text-no-bg': TextNoBgNode,
  image: ImageNode,
  audio: AudioNode,
  playlist: PlaylistNode,
  instagram: SocialMediaNode as unknown as React.FC<NodeProps>,
  twitter: SocialMediaNode as unknown as React.FC<NodeProps>,
  facebook: SocialMediaNode as unknown as React.FC<NodeProps>,
  youtube: SocialMediaNode as unknown as React.FC<NodeProps>,
  tiktok: SocialMediaNode as unknown as React.FC<NodeProps>,
  mindmeet: SocialMediaNode as unknown as React.FC<NodeProps>,
  link: LinkNode,
  mindmap: MindMapNode,
}

const SkeletonLoader = () => {
  return (
    <div className="fixed inset-0 w-screen h-screen overflow-auto">
      <div className="w-[90vw] max-w-none mx-auto pb-6 pt-[calc(5rem+0.5rem)] min-h-full">
        {/* Header Skeleton */}
        <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/30 shadow-2xl mb-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-1">
              <div className="w-16 h-16 rounded-2xl bg-slate-700/50 animate-pulse"></div>
              <div className="flex-1 min-w-0">
                <div className="h-8 bg-slate-700/50 rounded-lg w-3/4 mb-2 animate-pulse"></div>
                <div className="flex items-center gap-3">
                  <div className="h-5 bg-slate-700/30 rounded w-32 animate-pulse"></div>
                  <div className="h-5 bg-slate-700/30 rounded w-24 animate-pulse"></div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-11 w-24 bg-slate-700/50 rounded-xl animate-pulse"></div>
              <div className="h-11 w-28 bg-slate-700/50 rounded-xl animate-pulse"></div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-3 mb-3">
          {/* Mind Map Skeleton - 3 columns */}
          <div className="xl:col-span-3">
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl rounded-2xl border border-slate-700/30 shadow-2xl overflow-hidden">
              <div className="h-[70vh] lg:h-[75vh] relative bg-slate-800/30">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-600/10 to-transparent animate-shimmer"></div>

                {/* Fake nodes scattered around */}
                <div className="absolute top-8 left-8 w-20 h-10 bg-slate-700/60 rounded-lg animate-pulse"></div>
                <div className="absolute top-16 right-12 w-24 h-10 bg-slate-700/60 rounded-lg animate-pulse"></div>
                <div className="absolute bottom-12 left-16 w-18 h-10 bg-slate-700/60 rounded-lg animate-pulse"></div>
                <div className="absolute bottom-8 right-8 w-16 h-10 bg-slate-700/60 rounded-lg animate-pulse"></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-28 h-12 bg-slate-700/60 rounded-lg animate-pulse"></div>
                <div className="absolute top-1/4 left-1/4 w-22 h-10 bg-slate-700/60 rounded-lg animate-pulse"></div>
                <div className="absolute bottom-1/4 right-1/4 w-20 h-10 bg-slate-700/60 rounded-lg animate-pulse"></div>

                {/* Fake connections */}
                <div className="absolute top-12 left-28 w-20 h-0.5 bg-slate-600/40 transform rotate-12"></div>
                <div className="absolute top-20 right-32 w-24 h-0.5 bg-slate-600/40 transform -rotate-45"></div>
                <div className="absolute bottom-16 left-32 w-16 h-0.5 bg-slate-600/40 transform rotate-45"></div>

                {/* Fullscreen button skeleton */}
                <div className="absolute top-4 right-4 w-12 h-12 bg-slate-700/50 rounded-xl animate-pulse"></div>
              </div>
            </div>
          </div>

          {/* Sidebar Skeleton - 1 column */}
          <div className="hidden xl:block">
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl rounded-2xl border border-slate-700/30 shadow-2xl overflow-hidden h-[75vh]">
              <div className="p-4 border-b border-slate-700/30 bg-gradient-to-r from-slate-800/50 to-slate-700/50">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-slate-700/50 rounded animate-pulse"></div>
                  <div className="h-6 bg-slate-700/50 rounded w-20 animate-pulse"></div>
                </div>
              </div>
              <div className="p-4 space-y-4">
                {[...Array(3)].map((_, i) => (
                  <SimilarMindMapNodeSkeleton key={i} />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Action Bar Skeleton */}
        <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl rounded-2xl border border-slate-700/30 p-4 mb-3 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4 flex-wrap">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-6 py-3 rounded-xl bg-slate-700/50 border border-slate-600/50 animate-pulse">
                  <div className="w-5 h-5 bg-slate-600/50 rounded animate-pulse"></div>
                  <div className="h-4 bg-slate-600/50 rounded w-12 animate-pulse"></div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-slate-700/30 rounded animate-pulse"></div>
              <div className="h-4 bg-slate-700/30 rounded w-32 animate-pulse"></div>
            </div>
          </div>
        </div>

        {/* Mobile Suggested Section Skeleton */}
        <div className="xl:hidden mb-3">
          <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl rounded-2xl border border-slate-700/30 overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-slate-700/30 bg-gradient-to-r from-slate-800/50 to-slate-700/50 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 bg-slate-700/50 rounded animate-pulse"></div>
                <div className="h-6 bg-slate-700/50 rounded w-20 animate-pulse"></div>
              </div>
              <div className="w-5 h-5 bg-slate-700/50 rounded animate-pulse"></div>
            </div>
          </div>
        </div>

        {/* Comments Section Skeleton */}
        <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl rounded-2xl border border-slate-700/30 shadow-2xl overflow-hidden">
          <div className="p-6 border-b border-slate-700/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-slate-700/50 rounded animate-pulse"></div>
                <div>
                  <div className="h-6 bg-slate-700/50 rounded w-24 mb-1 animate-pulse"></div>
                  <div className="h-4 bg-slate-700/30 rounded w-16 animate-pulse"></div>
                </div>
              </div>
              <div className="h-8 w-24 bg-slate-700/50 rounded-lg animate-pulse"></div>
            </div>
          </div>

          {/* Comment Form Skeleton */}
          <div className="p-6 border-b border-slate-700/20">
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-full bg-slate-700/50 animate-pulse"></div>
              <div className="flex-1">
                <div className="h-24 bg-slate-700/30 rounded-xl mb-4 animate-pulse"></div>
                <div className="flex justify-end">
                  <div className="h-10 w-28 bg-slate-700/50 rounded-xl animate-pulse"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Comments List Skeleton */}
          <div className="p-6 space-y-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex gap-4">
                <div className="w-12 h-12 rounded-full bg-slate-700/50 animate-pulse"></div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-4 bg-slate-700/50 rounded w-20 animate-pulse"></div>
                    <div className="h-3 bg-slate-700/30 rounded w-16 animate-pulse"></div>
                  </div>
                  <div className="space-y-2 mb-3">
                    <div className="h-4 bg-slate-700/30 rounded w-full animate-pulse"></div>
                    <div className="h-4 bg-slate-700/30 rounded w-3/4 animate-pulse"></div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="h-4 bg-slate-700/30 rounded w-12 animate-pulse"></div>
                    <div className="h-4 bg-slate-700/30 rounded w-12 animate-pulse"></div>
                  </div>
                </div>
              </div>
            ))}          </div>
        </div>
      </div>
    </div>
  )
}

const ViewMindMap: React.FC = () => {
  const { username, id: permalink } = useParams<{ username: string; id: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [userProfile, setUserProfile] = useState<{ avatar_url: string | null } | null>(null)
  const [currentMap, setCurrentMap] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set())
  const reactFlowWrapperRef = useRef<HTMLDivElement>(null)
  const [similarMindmaps, setSimilarMindmaps] = useState<any[]>([])
  const [creatorProfile, setCreatorProfile] = useState<{
    avatar_url: string | null
    id?: string
    followed_by?: string[]
    followers?: number
    full_name?: string
  } | null>(null)
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)
  const [comments, setComments] = useState<any[]>([])
  const [newComment, setNewComment] = useState("")
  const [commentToDelete, setCommentToDelete] = useState<string | null>(null)
  const [commentSortBy, setCommentSortBy] = useState<"newest" | "likes">("likes")
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false)
  const [isSpotifyModalOpen, setIsSpotifyModalOpen] = useState(false)
  const [isFollowing, setIsFollowing] = useState(false)
  const [highlightedCommentId, setHighlightedCommentId] = useState<string | null>(null)
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null)
  const [similarMindmapsCollapsed, setSimilarMindmapsCollapsed] = useState(false)
  const [reportSuccessMessage, setReportSuccessMessage] = useState<string | null>(null)

  // Report comment handler
  const handleReportComment = () => {
    setReportSuccessMessage("Comment reported")
    setTimeout(() => setReportSuccessMessage(null), 3000) // Hide after 3 seconds
  }

  const isCreator = user?.username === username
  // Check if current user is a collaborator
  const isCollaborator = currentMap?.collaborators && user?.id ? currentMap.collaborators.includes(user.id) : false

  // Add mindmap actions hook
  const { handleLike: hookHandleLike, handleSave: hookHandleSave } = useMindMapActions({
    onLikeUpdate: (mapPermalink, newLikes, newLikedBy) => {
      setCurrentMap((prev: any) =>
        prev && (prev.permalink === mapPermalink || prev.id === mapPermalink)
          ? { ...prev, likes: newLikes, liked_by: newLikedBy, likedBy: newLikedBy }
          : prev,
      )
    },
    onSaveUpdate: (mapPermalink, newSaves, newSavedBy) => {
      setCurrentMap((prev: any) =>
        prev && (prev.permalink === mapPermalink || prev.id === mapPermalink)
          ? { ...prev, saves: newSaves, saved_by: newSavedBy, savedBy: newSavedBy }
          : prev,
      )
    },
  })

  // Dynamic page title
  usePageTitle(currentMap && username ? `${currentMap.title || "Untitled"} by @${username}` : "Loading...")

  // Listen for follow/unfollow events from other components
  useEffect(() => {
    const handleFollowToggle = (data: { action: 'follow' | 'unfollow', targetUserId: string, currentUserId: string }) => {
      if (!user?.id || !creatorProfile) return;

      // Update counts based on the follow action
      if (data.currentUserId === user.id && data.targetUserId === creatorProfile.id) {
        // Current user is following/unfollowing the creator - update isFollowing state
        setIsFollowing(data.action === 'follow');
      } else if (data.targetUserId === creatorProfile.id) {
        // Someone is following/unfollowing the creator - update followers count
        setCreatorProfile((prev) => {
          if (!prev) return prev;
          const currentFollowers = prev.followers || 0;
          return {
            ...prev,
            followers: data.action === 'follow'
              ? currentFollowers + 1
              : Math.max(currentFollowers - 1, 0)
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
  }, [user?.id, creatorProfile]);

  useEffect(() => {
    const fetchMindMap = async () => {
      setLoading(true)

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", username)
        .single()

      if (profileError || !profile) {
        console.error("Error fetching profile:", profileError || "Profile not found")
        if (username) {
          navigate(`/${username}`)
        } else {
          navigate("/mindmap")
        }
        return
      }
      const { data: map, error: mapError } = await supabase
        .from("mindmaps")
        .select(`
          id, permalink, title, json_data, updated_at, visibility, description, is_main, published_at,
          mindmap_like_counts (like_count),
          mindmap_save_counts (save_count)
        `)
        .eq("permalink", permalink)
        .eq("creator", profile.id)
        .single()

      if (mapError || !map) {
        console.error("Error fetching mind map:", mapError || "Mind map not found")
        if (mapError && mapError.code === "PGRST116") {
          console.log(`Redirecting to user profile: /${username}`)
          navigate(`/${username}`)
        } else {
          navigate(`/${username}`)
        }
        return
      }
      try {
        const processedNodes = prepareNodesForRendering(map.json_data?.nodes || []) || []

        const processedEdges =
          map.json_data?.edges.map((edge: any) => ({
            ...edge,
            id: edge.id || `e-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
            source: edge.source,
            target: edge.target,
            type: edge.type || "default",
          })) || []

        // Fetch user interaction status
        const likes = map.mindmap_like_counts?.[0]?.like_count || 0
        const saves = map.mindmap_save_counts?.[0]?.save_count || 0
        
        let likedBy: string[] = []
        let savedBy: string[] = []
        let collaborators: string[] = []
        
        if (user?.id) {
          const [{ data: likeData }, { data: saveData }, { data: collaborationData }] = await Promise.all([
            supabase
              .from("mindmap_likes")
              .select("id")
              .eq("mindmap_id", map.id)
              .eq("user_id", user.id)
              .single(),
            supabase
              .from("mindmap_saves")
              .select("id")
              .eq("mindmap_id", map.id)
              .eq("user_id", user.id)
              .single(),
            supabase
              .from("mindmap_collaborations")
              .select("collaborator_id")
              .eq("mindmap_id", map.id)
              .eq("status", "accepted")
          ])
          
          likedBy = likeData ? [user.id] : []
          savedBy = saveData ? [user.id] : []
          collaborators = collaborationData?.map(c => c.collaborator_id) || []
        }

        setCurrentMap({
          ...map,
          nodes: processedNodes,
          edges: processedEdges,
          edgeType: map.json_data?.edgeType || 'default',
          likes,
          likedBy,
          saves,
          savedBy,
          collaborators,
          creator: profile.id,
        })

        // Check for Spotify nodes and show modal if needed
        const hasSpotifyNodes = processedNodes.some((node: any) => node.type === 'spotify')
        const hasSeenSpotifyModal = localStorage.getItem('spotify-login-modal-dismissed') === 'true'

        if (hasSpotifyNodes && !hasSeenSpotifyModal) {
          // Show modal after a short delay to let the page load
          setTimeout(() => {
            setIsSpotifyModalOpen(true)
          }, 1500)
        }

        setTimeout(() => {
          setLoading(false)
        }, 300)
      } catch (error) {
        console.error("Error processing mindmap data:", error)
        if (username) {
          navigate(`/${username}`)
        } else {
          navigate("/mindmap")
        }
      }
    }

    if (user) {
      fetchMindMap()
    } else {
      navigate("/login")
    }
  }, [username, permalink, user, navigate])

  useEffect(() => {
    const fetchSimilarMindmaps = async () => {
      const { data: mindmaps, error } = await supabase
        .from("mindmaps")
        .select(`
          id, permalink, title, json_data, creator, updated_at,
          mindmap_like_counts (like_count),
          mindmap_save_counts (save_count)
        `)
        .eq("visibility", "public")

      if (error) {
        console.error("Error fetching similar mindmaps:", error)
      } else {
        const processedMindmaps = mindmaps?.map(mindmap => ({
          ...mindmap,
          likes: mindmap.mindmap_like_counts?.[0]?.like_count || 0,
          saves: mindmap.mindmap_save_counts?.[0]?.save_count || 0,
          liked_by: [],
          saved_by: []
        })) || []
        
        const shuffledMindmaps = processedMindmaps.sort(() => Math.random() - 0.5).slice(0, 5)
        setSimilarMindmaps(shuffledMindmaps || [])
      }
    }

    fetchSimilarMindmaps()
  }, [])

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user) {
        const { data: profile, error } = await supabase.from("profiles").select("avatar_url").eq("id", user.id).single()

        if (error) {
          console.error("Error fetching user profile:", error)
        } else {
          setUserProfile(profile)
        }
      }
    }

    fetchUserProfile()
  }, [user])

  useEffect(() => {
    const fetchCreatorProfile = async () => {
      // Fetch basic profile data
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("id, avatar_url, full_name")
        .eq("username", username)
        .single()

      if (error) {
        console.error("Error fetching creator profile:", error)
      } else {
        // Fetch follower count from new tables
        const [followerCountResult, isFollowingResult] = await Promise.all([
          supabase
            .from("user_followers_count")
            .select("followers_count")
            .eq("user_id", profile.id)
            .single(),
          user?.id ? supabase
            .from("user_follows")
            .select("follower_id")
            .eq("follower_id", user.id)
            .eq("followed_id", profile.id)
            .single() : Promise.resolve({ data: null, error: null })
        ]);

        const followersCount = followerCountResult.data?.followers_count || 0;
        const isCurrentlyFollowing = !!isFollowingResult.data;

        // Create profile data with count from new table
        const profileData = {
          ...profile,
          followers: followersCount,
          followed_by: [], // Deprecated, kept for compatibility
        };

        setCreatorProfile(profileData)
        setIsFollowing(isCurrentlyFollowing)
      }
    }

    if (username) {
      fetchCreatorProfile()
    }
  }, [username, user?.id])

  useEffect(() => {
    const fetchComments = async () => {
      if (!currentMap?.id) return

      try {
        const { data, error } = await supabase
          .from("comments")
          .select(
            "id, content, created_at, edited_at, user_id, parent_id, likes, liked_by, is_pinned, profiles(username, avatar_url, id)",
          )
          .eq("mindmap_id", currentMap.id)
          .order("created_at", { ascending: false })

        if (error) {
          console.error("Error fetching comments:", error)
        } else {
          const topLevelComments: any[] = []
          const replyMap: Record<string, any[]> = {}

          data.forEach((comment: any) => {
            if (!comment.parent_id) {
              topLevelComments.push({
                ...comment,
                replies: [],
                showReplies: false,
              })
            } else {
              if (!replyMap[comment.parent_id]) {
                replyMap[comment.parent_id] = []
              }
              replyMap[comment.parent_id].push(comment)
            }
          })

          topLevelComments.forEach((comment: any) => {
            if (replyMap[comment.id]) {
              comment.replies = replyMap[comment.id]
            }
          })

          setComments(topLevelComments)
        }
      } catch (error) {
        console.error("Unexpected error fetching comments:", error)
      }
    }

    fetchComments()
  }, [currentMap?.id])

  useEffect(() => {
    if (loading || comments.length === 0) return

    setTimeout(() => {
      const hash = window.location.hash

      if (hash.startsWith("#comment-")) {
        const commentId = hash.replace("#comment-", "")
        setHighlightedCommentId(commentId)

        const commentElement = document.getElementById(`comment-${commentId}`)
        if (commentElement) {
          commentElement.scrollIntoView({ behavior: "smooth" })

          setTimeout(() => {
            setHighlightedCommentId(null)
          }, 5000)

          const newUrl = window.location.pathname + window.location.search
          window.history.replaceState({}, document.title, newUrl)
        } else {
          let commentFound = false

          for (const comment of comments) {
            if (comment.replies && comment.replies.some((reply: any) => reply.id === commentId)) {
              setComments((prev) => prev.map((c) => (c.id === comment.id ? { ...c, showReplies: true } : c)))

              setTimeout(() => {
                const replyElement = document.getElementById(`comment-${commentId}`)
                if (replyElement) {
                  replyElement.scrollIntoView({ behavior: "smooth" })
                  commentFound = true
                }
              }, 100)

              break
            }
          }

          if (!commentFound) {
            const commentsSection = document.getElementById("comments-section")
            if (commentsSection) {
              commentsSection.scrollIntoView({ behavior: "smooth" })
            }
          }
        }
      } else if (hash === "#comments-section") {
        const commentsSection = document.getElementById("comments-section")
        if (commentsSection) {
          commentsSection.scrollIntoView({ behavior: "smooth" })

          const newUrl = window.location.pathname + window.location.search
          window.history.replaceState({}, document.title, newUrl)
        }
      }
    }, 500)
  }, [loading, comments])

  const totalCommentsCount = comments.reduce((count, comment) => count + 1 + (comment.replies?.length || 0), 0)

  const onInit = useCallback((instance: ReactFlowInstance) => {
    setReactFlowInstance(instance)
    setTimeout(() => {
      if (instance) {
        instance.fitView({ padding: 0.2 })
      }
    }, 300)
  }, [])

  const handleResize = useCallback(() => {
    if (reactFlowInstance) {
      reactFlowInstance.fitView({ padding: 0.2 })
    }
  }, [reactFlowInstance])

  useEffect(() => {
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [handleResize])

  useEffect(() => {
    if (!loading && reactFlowInstance && currentMap) {
      setTimeout(() => {
        reactFlowInstance.fitView({ padding: 0.2 })
      }, 300)
    }
  }, [loading, reactFlowInstance, currentMap])

  useEffect(() => {
    if (!loading && currentMap && currentMap.nodes && currentMap.nodes.length > 0) {
      const checkNodesVisibility = setTimeout(() => {
        if (reactFlowInstance) {
          const { x, y, zoom } = reactFlowInstance.getViewport()
          reactFlowInstance.setViewport({ x: x + 0.1, y, zoom })
          reactFlowInstance.fitView({ padding: 0.2 })
        }
      }, 1000)

      return () => clearTimeout(checkNodesVisibility)
    }
  }, [loading, currentMap, reactFlowInstance])

  const toggleNodeCollapse = useCallback((nodeId: string, event: React.MouseEvent) => {
    event.stopPropagation()
    setCollapsedNodes((prev) => {
      const newCollapsed = new Set(prev)
      if (newCollapsed.has(nodeId)) {
        newCollapsed.delete(nodeId)
      } else {
        newCollapsed.add(nodeId)
      }
      return newCollapsed
    })
  }, [])

  // Spotify modal handlers
  const handleSpotifyModalGotIt = useCallback(() => {
    localStorage.setItem('spotify-login-modal-dismissed', 'true')
    setIsSpotifyModalOpen(false)
  }, [])

  const handleSpotifyModalClose = useCallback(() => {
    setIsSpotifyModalOpen(false)
  }, [])

  const handleSpotifyLoginSuccess = useCallback(() => {
    // Show a temporary success message
    const successDiv = document.createElement('div')
    successDiv.innerHTML = `
      <div class="fixed top-4 right-4 z-50 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
        </svg>
        <span>Successfully logged in to Spotify! Refreshing mindmap...</span>
      </div>
    `
    document.body.appendChild(successDiv)

    // Remove the message and refresh after a short delay
    setTimeout(() => {
      document.body.removeChild(successDiv)
      window.location.reload()
    }, 2000)
  }, [])

  const handleFullscreen = () => {
    if (reactFlowWrapperRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen()
      } else {
        reactFlowWrapperRef.current.requestFullscreen({ navigationUI: "auto" })
        reactFlowWrapperRef.current.style.backgroundColor = "#0c1321"
        const dotElements = reactFlowWrapperRef.current.querySelectorAll(".react-flow__background-dots circle")
        dotElements.forEach((dot: Element) => {
          if (dot instanceof SVGElement) {
            dot.style.fill = "#374151"
          }
        })
      }
    }
  }

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && reactFlowWrapperRef.current) {
        reactFlowWrapperRef.current.style.backgroundColor = ""
        const dotElements = reactFlowWrapperRef.current.querySelectorAll(".react-flow__background-dots circle")
        dotElements.forEach((dot: Element) => {
          if (dot instanceof SVGElement) {
            dot.style.fill = ""
          }
        })
      }
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange)
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange)
    }
  }, [])

  const handleFollow = async () => {
    if (!user?.id || !creatorProfile?.id) return

    const isCurrentlyFollowing = isFollowing
    const currentFollowersCount = creatorProfile.followers || 0

    // Optimistically update UI
    setIsFollowing(!isCurrentlyFollowing)
    setCreatorProfile((prev) =>
      prev
        ? {
          ...prev,
          followers: isCurrentlyFollowing ? Math.max(currentFollowersCount - 1, 0) : currentFollowersCount + 1,
        }
        : null,
    )

    try {
      if (isCurrentlyFollowing) {
        // Unfollow: remove from user_follows table
        const { error } = await supabase
          .from('user_follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('followed_id', creatorProfile.id);

        if (error) throw error;
      } else {
        // Follow: add to user_follows table
        const { error } = await supabase
          .from('user_follows')
          .insert({
            follower_id: user.id,
            followed_id: creatorProfile.id
          });

        if (error) throw error;
      }

      // Send notification for follow/unfollow
      if (user?.username && creatorProfile.id !== user.id) {
        await useNotificationStore.getState().addNotification({
          user_id: creatorProfile.id,
          type: "follow",
          title: isCurrentlyFollowing ? "Lost Follower" : "New Follower",
          message: isCurrentlyFollowing
            ? `@${user.username} unfollowed you`
            : `@${user.username} started following you`,
          related_user: user.id,
        })
      }

      // Emit event for Profile component to update following count
      eventEmitter.emit("followToggle", {
        action: isCurrentlyFollowing ? "unfollow" : "follow",
        targetUserId: creatorProfile.id,
        currentUserId: user.id
      })
    } catch (error) {
      console.error("Error updating follow status:", error)
      // Revert UI changes on failure
      setIsFollowing(isCurrentlyFollowing)
      setCreatorProfile((prev) =>
        prev
          ? {
            ...prev,
            followers: currentFollowersCount,
          }
          : null,
      )
    }
  }

  const handlePostComment = async () => {
    if (!user?.id || !newComment.trim() || !currentMap?.id) {
      return
    }

    const comment = {
      mindmap_id: currentMap.id,
      user_id: user.id,
      content: newComment.trim(),
    }

    try {
      const { data, error } = await supabase
        .from("comments")
        .insert(comment)
        .select("id, content, created_at, user_id, profiles(username, avatar_url)")
        .single()

      if (error) {
        console.error("Error posting comment:", error)
      } else {
        setComments((prev) => [data, ...prev])
        setNewComment("")

        if (currentMap.creator !== user.id) {
          try {
            await useNotificationStore.getState().addNotification({
              user_id: currentMap.creator,
              type: "comment",
              title: "New Comment",
              message: `@${user.username} commented on your mindmap: ${currentMap.title}`,
              related_user: user.id,
              mindmap_id: currentMap.id,
              comment_id: data.id,
            })
            console.log("Comment notification sent successfully")
          } catch (notificationError) {
            console.error("Failed to send comment notification:", notificationError)
          }
        }
      }
    } catch (error) {
      console.error("Error posting comment:", error)
    }
  }

  const handlePostReply = async (parentId: string, replyContent: string) => {
    if (!user?.id || !replyContent.trim() || !currentMap?.id) return

    const reply = {
      mindmap_id: currentMap.id,
      user_id: user.id,
      content: replyContent.trim(),
      parent_id: parentId,
    }

    try {
      const { data, error } = await supabase
        .from("comments")
        .insert(reply)
        .select("id, content, created_at, user_id, parent_id, profiles(username, avatar_url)")
        .single()

      if (error) {
        console.error("Error posting reply:", error)
      } else {
        const parentComment = comments.find((c) => c.id === parentId)

        setComments((prev) => {
          const parentIndex = prev.findIndex((c) => c.id === parentId)
          if (parentIndex !== -1) {
            const updatedParent = {
              ...prev[parentIndex],
              replies: [...(prev[parentIndex].replies || []), data],
            }
            return [...prev.slice(0, parentIndex), updatedParent, ...prev.slice(parentIndex + 1)]
          }
          return prev
        })

        if (currentMap.creator !== user.id) {
          try {
            await useNotificationStore.getState().addNotification({
              user_id: currentMap.creator,
              type: "comment",
              title: "New Reply",
              message: `@${user.username} replied to a comment on your mindmap: ${currentMap.title}`,
              related_user: user.id,
              mindmap_id: currentMap.id,
              comment_id: data.id,
            })
            console.log("Reply notification sent to mindmap creator successfully")
          } catch (notificationError) {
            console.error("Failed to send reply notification to mindmap creator:", notificationError)
          }
        }

        if (parentComment && parentComment.user_id !== user.id && parentComment.user_id !== currentMap.creator) {
          try {
            await useNotificationStore.getState().addNotification({
              user_id: parentComment.user_id,
              type: "comment",
              title: "New Reply",
              message: `@${user.username} replied to your comment on mindmap: ${currentMap.title}`,
              related_user: user.id,
              mindmap_id: currentMap.id,
              comment_id: data.id,
            })
            console.log("Reply notification sent to comment creator successfully")
          } catch (notificationError) {
            console.error("Failed to send reply notification to comment creator:", notificationError)
          }
        }
      }
    } catch (error) {
      console.error("Unexpected error posting reply:", error)
    }
  }

  const handleLikeComment = async (commentId: string, isReply = false, parentCommentId?: string) => {
    if (!user?.id) {
      return
    }

    const updateCommentLikes = (commentList: any[]): any[] =>
      commentList.map((comment) => {
        if (comment.id === commentId) {
          const isLiked = comment.liked_by?.includes(user.id)
          const updatedLikes = (comment.likes || 0) + (isLiked ? -1 : 1)
          const updatedLikedBy = isLiked
            ? (comment.liked_by || []).filter((id: string) => id !== user.id)
            : [...(comment.liked_by || []), user.id]

          return { ...comment, likes: updatedLikes, liked_by: updatedLikedBy }
        }

        if (comment.replies && comment.replies.length > 0) {
          return { ...comment, replies: updateCommentLikes(comment.replies) }
        }

        return comment
      })

    const updatedComments = isReply
      ? comments.map((comment) =>
        comment.id === parentCommentId ? { ...comment, replies: updateCommentLikes(comment.replies || []) } : comment,
      )
      : updateCommentLikes(comments)

    setComments(updatedComments)

    try {
      const targetComment = isReply
        ? updatedComments.find((c: any) => c.id === parentCommentId)?.replies.find((r: any) => r.id === commentId)
        : updatedComments.find((c: any) => c.id === commentId)

      if (targetComment) {
        const { error } = await supabase
          .from("comments")
          .update({
            likes: targetComment.likes,
            liked_by: targetComment.liked_by,
          })
          .eq("id", commentId)

        if (error) {
          console.error("Error updating comment likes in Supabase:", error)
        }
      }
    } catch (error) {
      console.error("Unexpected error updating comment likes:", error)
    }
  }

  const handleEditComment = async (commentId: string, updatedContent: string) => {
    if (!user?.id || !updatedContent.trim()) return

    try {
      const { data, error } = await supabase
        .from("comments")
        .update({ content: updatedContent.trim(), edited_at: new Date().toISOString() })
        .eq("id", commentId)
        .select("id, content, created_at, edited_at, user_id, profiles(username, avatar_url)")
        .single()

      if (error) {
        console.error("Error editing comment:", error)
      } else {
        setComments((prev) =>
          prev.map((c) => (c.id === commentId ? { ...c, content: updatedContent, edited_at: data.edited_at } : c)),
        )
      }
    } catch (error) {
      console.error("Unexpected error editing comment:", error)
    }
  }

  const handleConfirmDeleteComment = async () => {
    if (!commentToDelete || !user?.id) return

    try {
      const { error } = await supabase.from("comments").delete().eq("id", commentToDelete)

      if (error) {
        console.error("Error deleting comment from Supabase:", error)
      } else {
        setComments((prev) => {
          const isTopLevel = prev.some((c) => c.id === commentToDelete)

          if (isTopLevel) {
            return prev.filter((c) => c.id !== commentToDelete)
          }
          return prev.map((comment) => ({
            ...comment,
            replies: (comment.replies || []).filter((reply: any) => reply.id !== commentToDelete),
          }))
        })
        setCommentToDelete(null)
      }
    } catch (error) {
      console.error("Unexpected error deleting comment:", error)
    }
  }

  const handlePinComment = async (commentId: string) => {
    if (!user?.id || !isCreator || !currentMap?.id) return

    try {
      // Find the current comment to check if it's already pinned
      const currentComment = comments.find((c) => c.id === commentId)
      const isCurrentlyPinned = currentComment?.is_pinned || false

      if (isCurrentlyPinned) {
        // Unpin the comment
        const { error } = await supabase
          .from("comments")
          .update({ is_pinned: false })
          .eq("id", commentId)

        if (error) {
          console.error("Error unpinning comment:", error)
          return
        }

        // Update local state
        setComments((prev) =>
          prev.map((comment) => ({
            ...comment,
            is_pinned: comment.id === commentId ? false : comment.is_pinned,
          }))
        )
      } else {
        // First, unpin any currently pinned comment for this mindmap
        const { error: unpinError } = await supabase
          .from("comments")
          .update({ is_pinned: false })
          .eq("mindmap_id", currentMap.id)
          .eq("is_pinned", true)

        if (unpinError) {
          console.error("Error unpinning existing comments:", unpinError)
          return
        }

        // Then pin the selected comment
        const { error: pinError } = await supabase
          .from("comments")
          .update({ is_pinned: true })
          .eq("id", commentId)

        if (pinError) {
          console.error("Error pinning comment:", pinError)
          return
        }

        // Update local state
        setComments((prev) =>
          prev.map((comment) => ({
            ...comment,
            is_pinned: comment.id === commentId ? true : false,
          }))
        )
      }
    } catch (error) {
      console.error("Unexpected error handling pin comment:", error)
    }
  }

  // Function to sort comments
  const getSortedComments = (comments: any[]) => {
    return [...comments].sort((a, b) => {
      // Always prioritize pinned comments first
      if (a.is_pinned && !b.is_pinned) return -1
      if (!a.is_pinned && b.is_pinned) return 1

      // If both are pinned or both are not pinned, sort by the selected criteria
      if (commentSortBy === "likes") {
        // Sort by likes count (descending), then by newest if likes are equal
        const likesA = a.likes || 0
        const likesB = b.likes || 0
        if (likesB !== likesA) {
          return likesB - likesA
        }
        // If likes are equal, sort by newest
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      } else {
        // Sort by newest (default)
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
    })
  }

  const getRelativeTime = (supabaseDate: string): string => {
    const now = new Date()
    const nowUTC = now.getTime() + now.getTimezoneOffset() * 60 * 1000
    const pastUTC = new Date(supabaseDate).getTime()

    const diffInSeconds = Math.floor((nowUTC - pastUTC) / 1000)

    if (diffInSeconds <= 0) return "Just now"

    if (diffInSeconds < 60) return `${diffInSeconds} ${diffInSeconds === 1 ? "second" : "seconds"} ago`
    const diffInMinutes = Math.floor(diffInSeconds / 60)
    if (diffInMinutes < 60) return `${diffInMinutes} ${diffInMinutes === 1 ? "minute" : "minutes"} ago`
    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) return `${diffInHours} ${diffInHours === 1 ? "hour" : "hours"} ago`
    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 30) return `${diffInDays} ${diffInDays === 1 ? "day" : "days"} ago`
    const diffInMonths = Math.floor(diffInDays / 30)
    if (diffInMonths < 12) return `${diffInMonths} ${diffInMonths === 1 ? "month" : "months"} ago`
    const diffInYears = Math.floor(diffInMonths / 12)
    return `${diffInYears} ${diffInYears === 1 ? "year" : "years"} ago`
  }

  if (loading || !currentMap || !currentMap.nodes || !currentMap.edges || currentMap.nodes.length === 0) {
    return <SkeletonLoader />
  } return (
    <div className="fixed inset-0 w-screen h-screen overflow-auto">
      {/* Success message for comment reporting */}
      {reportSuccessMessage && (
        <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
          <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl border border-slate-700/50 text-slate-200 px-6 py-4 rounded-2xl shadow-2xl animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center">
                <Check className="w-4 h-4 text-blue-400" />
              </div>
              <span className="text-sm font-medium">{reportSuccessMessage}</span>
            </div>
          </div>
        </div>
      )}
      {isInfoModalOpen && (<InfoModal
        mindmap={{
          username: username || "",
          displayName: creatorProfile?.full_name || username || "Unknown User",
          name: currentMap.title,
          permalink: currentMap.permalink,
          updatedAt: currentMap.updated_at,
          description: currentMap.description || "No description provided.",
          visibility: currentMap.visibility,
          avatar_url: creatorProfile?.avatar_url,
          collaborators: currentMap.collaborators || [],
          published_at: currentMap.published_at,
          stats: {
            nodes: currentMap.nodes?.length || 0,
            edges: currentMap.edges?.length || 0,
            likes: currentMap.likes || 0,
            comments: totalCommentsCount || 0,
            saves: currentMap.saves || 0,
          },
        }}
        onClose={() => setIsInfoModalOpen(false)}
      />
      )}
      {isShareModalOpen && (
        <ShareModal
          title={currentMap.title}
          url={window.location.href}
          creator={username || ""}
          onClose={() => setIsShareModalOpen(false)}
          isMainMap={currentMap.is_main || false}
          mindmapId={currentMap.id}
        />)}
      {isSpotifyModalOpen && (
        <SpotifyLoginModal
          isOpen={isSpotifyModalOpen}
          onClose={handleSpotifyModalClose}
          onGotIt={handleSpotifyModalGotIt}
          onLoginSuccess={handleSpotifyLoginSuccess}
        />
      )}      <div className="w-[90vw] max-w-none mx-auto pb-6 pt-[calc(5rem+0.5rem)] min-h-full">
        {" "}        {/* Enhanced Header Section */}
        <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/30 shadow-2xl mb-3">
          <div className="flex items-center justify-between gap-4">
            {/* Creator info and title */}
            <div className="flex items-center gap-4 min-w-0 flex-1">
              <div className="relative group">
                <a
                  href={`/${username}`}
                  className="block w-16 h-16 rounded-2xl overflow-hidden bg-gradient-to-br from-slate-700 to-slate-800 flex-shrink-0 transition-all duration-300 hover:scale-105 ring-4 ring-slate-600/20 group-hover:ring-slate-500/30"
                >
                  {creatorProfile?.avatar_url ? (
                    <img
                      src={creatorProfile.avatar_url || "/placeholder.svg"}
                      alt={username || "Creator"}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300 font-bold text-xl">
                      {username?.charAt(0).toUpperCase() || "C"}
                    </div>
                  )}
                </a>
              </div>{" "}              <div className="min-w-0 flex-1">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-2 truncate">
                  {currentMap.title}
                </h1>
                <div className="flex items-center gap-3 text-sm">
                  <a
                    href={`/${username}`}
                    className="text-blue-400 hover:text-blue-300 font-medium transition-colors hover:underline flex items-center gap-2"
                  >
                    @{username}
                  </a>
                  {creatorProfile?.followers !== undefined && creatorProfile.followers > 0 && (
                    <span className="text-slate-400 flex items-center gap-1 hidden sm:flex">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                          clipRule="evenodd"
                        />
                      </svg>
                      {creatorProfile.followers} {creatorProfile.followers === 1 ? "follower" : "followers"}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Enhanced Action buttons */}
            <div className="flex items-center gap-3 flex-shrink-0">              {(isCreator || isCollaborator) && (
              <a
                href={`/${username}/${permalink}/edit`}
                className="group inline-flex items-center gap-2 px-4 sm:px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:from-blue-500 hover:to-purple-500 transition-all duration-200 shadow-lg hover:shadow-blue-500/25 hover:scale-105"
              >
                <Edit2 className="w-4 h-4 transition-transform group-hover:scale-110" />
                <span className="hidden sm:inline">Edit</span>
              </a>
            )}              {!isCreator && user?.id && (
              <button
                onClick={handleFollow}
                className={`group inline-flex items-center gap-2 px-4 sm:px-6 py-3 rounded-xl font-medium transition-all duration-200 shadow-lg hover:scale-105 ${isFollowing
                    ? "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white hover:shadow-red-500/25"
                    : "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-lg shadow-blue-500/25"
                  }`}
              >
                {isFollowing ? (
                  <>
                    <UserMinus className="w-4 h-4 transition-transform group-hover:scale-110" />
                    <span className="hidden sm:inline">Unfollow</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 transition-transform group-hover:scale-110" />
                    <span className="hidden sm:inline">Follow</span>
                  </>
                )}
              </button>
            )}
            </div>
          </div>
        </div>        {/* Enhanced Main content area with full-width layout */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-3 mb-3">
          {/* Mind map visualization - spans 3 columns on xl screens */}
          <div className="xl:col-span-3">
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl rounded-2xl border border-slate-700/30 overflow-hidden shadow-2xl">
              <div ref={reactFlowWrapperRef} className="h-[70vh] lg:h-[75vh] relative">
                <ReactFlowProvider>
                  <ReactFlow
                    key={`reactflow-${currentMap.permalink || currentMap.id}`}
                    nodes={currentMap.nodes.map((node: any) => {
                      const hasChildren = currentMap.edges.some((edge: any) => edge.source === node.id)
                      const isHidden = (() => {
                        const findAncestors = (nodeId: string): string[] => {
                          const parentEdges = currentMap.edges.filter((edge: any) => edge.target === nodeId)
                          if (parentEdges.length === 0) return []
                          const parents = parentEdges.map((edge: any) => edge.source)
                          const grandparents = parents.flatMap(findAncestors)
                          return [...parents, ...grandparents]
                        }

                        const ancestors = findAncestors(node.id)
                        return ancestors.some((ancestorId) => collapsedNodes.has(ancestorId))
                      })()

                      const nodeLabel = hasChildren ? (
                        <div key={node.id} className="flex items-center justify-between w-full">
                          <div
                            className="break-words overflow-hidden"
                            style={{ wordBreak: "break-word", maxWidth: "calc(100% - 30px)" }}
                          >
                            {node.type === "default" && node.data.label === "" ? (
                              <span className="text-gray-400">Text...</span>
                            ) : node.type === "default" ? (
                              <MarkdownRenderer content={node.data.label} />
                            ) : (
                              node.data.label
                            )}
                          </div>
                          <button
                            className="ml-2 rounded-full hover:bg-slate-700 transition-colors flex-shrink-0 z-10"
                            onClick={(e) => toggleNodeCollapse(node.id, e)}
                            title={collapsedNodes.has(node.id) ? "Expand" : "Collapse"}
                          >
                            <ChevronDown
                              className={`w-4 h-4 text-slate-300 transition-transform ${collapsedNodes.has(node.id) ? "" : "transform rotate-180"
                                }`}
                            />
                          </button>
                        </div>
                      ) : node.type === "default" && node.data.label === "" ? (
                        <span className="text-gray-400">Text...</span>
                      ) : node.type === "default" ? (
                        <MarkdownRenderer content={node.data.label} />
                      ) : (
                        node.data.label
                      )

                      return {
                        ...node,
                        hidden: isHidden,
                        position: node.position || { x: 0, y: 0 },
                        style: {
                          ...node.style,
                          background:
                            node.background ||
                            node.style?.background ||
                            (node.type && defaultNodeStyles[node.type as keyof typeof defaultNodeStyles]?.background),
                          width: [
                            "link",
                            "mindmap",
                            "spotify",
                            "soundcloud",
                            "instagram",
                            "twitter",
                            "facebook",
                            "youtube",
                            "tiktok",
                          ].includes(node.type || "")
                            ? "auto"
                            : (node.type === "default") ?
                              (typeof node.width === 'number' ? `${node.width}px` :
                                typeof node.style?.width === 'number' ? `${node.style.width}px` :
                                  typeof node.style?.width === 'string' ? node.style.width :
                                    (node.type && defaultNodeStyles[node.type as keyof typeof defaultNodeStyles]?.width)) :
                              node.style?.width ||
                              (node.type && defaultNodeStyles[node.type as keyof typeof defaultNodeStyles]?.width),
                          height: (node.type === "default") ?
                            (typeof node.height === 'number' ? `${node.height}px` :
                              typeof node.style?.height === 'number' ? `${node.style.height}px` :
                                typeof node.style?.height === 'string' ? node.style.height :
                                  "auto") :
                            node.style?.height || "auto",
                          minHeight: node.type === "default" ?
                            calculateTextNodeMinHeight(
                              typeof node.data?.label === 'string' ? node.data.label : '',
                              getNodeCurrentWidth(node),
                              hasChildren
                            ) : "auto",
                          padding:
                            node.type === "image"
                              ? "0"
                              : node.style?.padding ||
                              (node.type && defaultNodeStyles[node.type as keyof typeof defaultNodeStyles]?.padding),
                        },
                        data: {
                          ...node.data,
                          label: nodeLabel,
                        },
                      }
                    })}
                    edges={currentMap.edges.map((edge: any) => {
                      // Find the source node to get its color
                      const sourceNode = currentMap.nodes.find((node: any) => node.id === edge.source);
                      const sourceNodeColor = sourceNode
                        ? (sourceNode.background || sourceNode.style?.background || "#374151")
                        : "#374151";

                      // Get edgeType from currentMap, default to 'default' if not valid
                      const edgeType = ['default', 'straight', 'smoothstep'].includes((currentMap as any).edgeType)
                        ? (currentMap as any).edgeType
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
                    nodeTypes={nodeTypes}
                    onInit={onInit}
                    fitView
                    nodesDraggable={false}
                    nodesConnectable={false}
                    elementsSelectable={true}
                    connectOnClick={false}
                    zoomOnScroll={true}
                    zoomOnDoubleClick={false}
                    minZoom={0.1}
                    maxZoom={2}
                    proOptions={{ hideAttribution: true }}
                  >
                    <Background color="#475569" gap={20} />
                    <Controls />
                  </ReactFlow>
                  <button
                    onClick={handleFullscreen}
                    className="absolute top-4 right-4 p-3 bg-slate-800/80 backdrop-blur-sm rounded-xl hover:bg-slate-700/80 transition-all duration-200 shadow-lg hover:scale-105 border border-slate-600/50"
                    style={{ zIndex: 10 }}
                  >
                    <Maximize2 className="w-5 h-5 text-slate-300" />
                  </button>
                </ReactFlowProvider>
              </div>
            </div>
          </div>

          {/* Enhanced Similar mindmaps sidebar - only visible on xl screens */}
          <div className="hidden xl:block">
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl rounded-2xl border border-slate-700/30 overflow-hidden shadow-2xl h-[75vh]">              <div className="p-4 border-b border-slate-700/30 bg-gradient-to-r from-slate-800/50 to-slate-700/50">
              <h3 className="font-semibold text-slate-200 flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                </svg>
                Suggested
              </h3>
            </div>
              <div className="p-4 space-y-4 overflow-y-auto h-[calc(75vh-72px)] flex-1">
                {similarMindmaps.map((mindmap, index) => (
                  <div
                    key={mindmap.permalink}
                    className={`transition-all duration-200 ${index > 0 ? "pt-4 border-t border-slate-700/30" : ""}`}
                  >
                    <SimilarMindMapNode mindmap={mindmap} />
                  </div>
                ))}
                {similarMindmaps.length === 0 && (
                  <div className="text-center text-slate-400 py-12">
                    <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <p className="text-sm">No similar mindmaps found</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>{" "}        {/* Enhanced Action buttons and stats */}
        <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl rounded-2xl border border-slate-700/30 p-4 mb-3 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4 flex-wrap">
              {" "}
              <button
                onClick={(e) => hookHandleLike(e, currentMap)}
                className="group flex items-center gap-3 px-6 py-3 rounded-xl bg-slate-700/50 hover:bg-sky-400/20 border border-slate-600/50 hover:border-sky-400/50 transition-all duration-200 hover:scale-105"
              >
                <Heart
                  className={`w-5 h-5 transition-all duration-200 group-hover:scale-110 ${user?.id && currentMap.likedBy?.includes(user.id)
                      ? "fill-current text-sky-400"
                      : "text-slate-300 group-hover:text-sky-400"
                    }`}
                />
                <span className="text-sm font-medium text-slate-200">
                  {currentMap.likes > 0 ? currentMap.likes : "Like"}
                </span>
              </button>{" "}
              <button
                onClick={(e) => hookHandleSave(e, currentMap)}
                className="group flex items-center gap-3 px-6 py-3 rounded-xl bg-slate-700/50 hover:bg-blue-400/20 border border-slate-600/50 hover:border-blue-400/50 transition-all duration-200 hover:scale-105"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill={user?.id && currentMap.savedBy?.includes(user.id) ? "currentColor" : "none"}
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`transition-all duration-200 group-hover:scale-110 ${user?.id && currentMap.savedBy?.includes(user.id)
                      ? "text-blue-400"
                      : "text-slate-300 group-hover:text-blue-400"
                    }`}
                >
                  <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
                </svg>
                <span className="text-sm font-medium text-slate-200">
                  {currentMap.saves > 0 ? currentMap.saves : "Save"}
                </span>
              </button>{" "}
              <button
                onClick={() => setIsInfoModalOpen(true)}
                className="group flex items-center gap-3 px-6 py-3 rounded-xl bg-slate-700/50 hover:bg-blue-600/20 border border-slate-600/50 hover:border-blue-600/50 transition-all duration-200 hover:scale-105"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-slate-300 group-hover:text-blue-600 transition-colors duration-200"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
                <span className="text-sm font-medium text-slate-200">Info</span>
              </button>{" "}
              <button
                onClick={() => setIsShareModalOpen(true)}
                className="group flex items-center gap-3 px-6 py-3 rounded-xl bg-slate-700/50 hover:bg-blue-800/20 border border-slate-600/50 hover:border-blue-800/50 transition-all duration-200 hover:scale-105"
              >
                <Share2 className="w-5 h-5 text-slate-300 group-hover:text-blue-800 transition-colors duration-200" />
                <span className="text-sm font-medium text-slate-200">Share</span>
              </button>
            </div>{" "}
            {currentMap.updated_at && (
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Clock className="w-4 h-4" />
                <span>Edited {formatDateWithPreference(new Date(currentMap.updated_at))}</span>
              </div>
            )}
          </div>
        </div>{" "}        {/* Mobile similar mindmaps with improved design */}
        <div className="xl:hidden mb-3">
          <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl rounded-2xl border border-slate-700/30 overflow-hidden shadow-2xl">
            <div
              className="p-4 border-b border-slate-700/30 bg-gradient-to-r from-slate-800/50 to-slate-700/50 flex justify-between items-center cursor-pointer hover:bg-slate-700/30 transition-colors duration-200"
              onClick={() => setSimilarMindmapsCollapsed(!similarMindmapsCollapsed)}
            >              <h3 className="font-semibold text-slate-200 flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                </svg>
                Suggested
              </h3>
              <ChevronDown
                className={`w-5 h-5 text-slate-300 transition-transform duration-200 ${similarMindmapsCollapsed ? "" : "transform rotate-180"
                  }`}
              />
            </div>
            {!similarMindmapsCollapsed && (
              <div className="p-4 max-h-[400px] overflow-y-auto space-y-4">
                {similarMindmaps.map((mindmap, index) => (
                  <div
                    key={mindmap.permalink}
                    className={`transition-all duration-200 ${index > 0 ? "pt-4 border-t border-slate-700/30" : ""}`}
                  >
                    <SimilarMindMapNode mindmap={mindmap} />
                  </div>
                ))}
                {similarMindmaps.length === 0 && (
                  <div className="text-center text-slate-400 py-12">
                    <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <p className="text-sm">No similar mindmaps found</p>
                  </div>
                )}
              </div>
            )}
          </div>{" "}
        </div>{" "}        {/* Enhanced Comments section */}
        <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl rounded-2xl border border-slate-700/30 shadow-2xl overflow-hidden">
          <div id="comments-section">
            {" "}
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-700/30 p-6">
              <div className="flex items-center gap-3">
                <MessageCircle className="w-6 h-6 text-blue-400" />
                <div>
                  <h3 className="text-xl font-bold text-slate-200">Comments</h3>
                  <p className="text-sm text-slate-400">
                    {totalCommentsCount} {totalCommentsCount === 1 ? "comment" : "comments"}
                  </p>
                </div>
              </div>

              {/* Sort dropdown */}
              <div className="relative">
                <select
                  value={commentSortBy}
                  onChange={(e) => setCommentSortBy(e.target.value as "newest" | "likes")}
                  className="appearance-none bg-slate-700/50 border border-slate-600/50 rounded-lg px-3 py-2 pr-8 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 cursor-pointer"
                  style={{ backgroundImage: "none" }}
                >
                  <option value="likes">Most Likes</option>
                  <option value="newest">Newest</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"
                    />
                  </svg>
                </div>
              </div>
            </div>
            {/* New comment form - enhanced */}
            <div className="flex items-start gap-4 mb-6 pb-6 border-b border-slate-700/20 px-6">
              <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-700 flex-shrink-0">
                {userProfile?.avatar_url ? (
                  <img
                    src={userProfile.avatar_url || "/placeholder.svg"}
                    alt={user?.username || "User"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300 font-bold">
                    {user?.username?.charAt(0).toUpperCase() || "U"}{" "}
                  </div>
                )}
              </div>
              <div className="flex-1">
                <div className="text-sm text-slate-400 mb-3 flex items-center gap-2">
                  <span>Comment as</span>
                  <span className="text-blue-400 font-medium">@{user?.username || "username"}</span>
                </div>
                <textarea
                  className="w-full bg-slate-800/50 border border-slate-600/50 rounded-xl p-4 text-sm min-h-[120px] focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 placeholder-slate-400 resize-none"
                  placeholder="Share your thoughts about this mindmap..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                />
                <div className="flex justify-end mt-4">
                  <button
                    onClick={handlePostComment}
                    disabled={!newComment.trim()}
                    className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 text-sm font-medium shadow-lg hover:shadow-blue-500/25 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    Post Comment
                  </button>
                </div>
              </div>{" "}
            </div>
            {/* Comments list - enhanced */}
            <div className="space-y-6 px-6 pb-6">
              {" "}
              {getSortedComments(comments).map((comment) => (
                <div
                  key={comment.id}
                  id={`comment-${comment.id}`}
                  className={`p-4 border-b border-slate-700/20 transition-all duration-300 rounded-lg ${comment.is_pinned
                      ? "bg-gradient-to-r from-blue-900/20 to-purple-900/20 border-blue-500/30 ring-1 ring-blue-500/20"
                      : highlightedCommentId === comment.id
                        ? "bg-blue-900/20 border-blue-500/30"
                        : "hover:bg-slate-800/30"
                    }`}
                >
                  {" "}                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <a
                            href={`/${comment.profiles?.username}`}
                            className="flex items-center gap-3 hover:bg-slate-800/30 rounded-lg p-2 -m-2 transition-all duration-200 cursor-pointer group"
                          >
                            <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-700 flex-shrink-0 group-hover:ring-2 group-hover:ring-slate-500/50 transition-all duration-200">
                              {comment.profiles?.avatar_url ? (
                                <img
                                  src={comment.profiles.avatar_url || "/placeholder.svg"}
                                  alt={comment.profiles.username || "User"}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-300 font-bold">
                                  {comment.profiles?.username?.charAt(0).toUpperCase() || "U"}
                                </div>
                              )}
                            </div>                            <span className={`text-sm font-semibold transition-colors ${comment.profiles?.username === username
                                ? "text-white group-hover:text-slate-300 px-2 py-1 rounded-lg bg-gradient-to-r from-blue-600/60 to-purple-600/60"
                                : "text-white group-hover:text-slate-300"
                              }`}>
                              @{comment.profiles?.username}
                            </span>
                          </a>
                          {comment.is_pinned && (
                            <div className="flex items-center gap-1 px-2 py-1 bg-blue-500/20 rounded-full">
                              <Pin className="w-3 h-3 text-blue-400" />
                              <span className="text-xs text-blue-400 font-medium">Pinned</span>
                            </div>
                          )}
                          <span className="text-xs text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {getRelativeTime(comment.created_at)}
                            {comment.edited_at && <span className="text-slate-500 ml-1">(edited)</span>}
                          </span>
                        </div>
                        <div className="relative">
                          <button
                            className="text-slate-400 hover:text-slate-300 p-2 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 transition-colors duration-200"
                            onClick={() =>
                              setComments((prev) =>
                                prev.map((c) => (c.id === comment.id ? { ...c, isMenuOpen: !c.isMenuOpen } : c)),
                              )
                            }
                          >
                            <MoreHorizontal className="w-5 h-5" />
                          </button>
                          {comment.isMenuOpen && (
                            <div className="absolute right-0 mt-2 w-40 bg-slate-800 rounded-lg shadow-xl border border-slate-700 z-10">
                              {comment.user_id === user?.id && (
                                <button
                                  className="flex items-center gap-2 w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 rounded-t-lg transition-colors"
                                  onClick={() =>
                                    setComments((prev) =>
                                      prev.map((c) =>
                                        c.id === comment.id ? { ...c, isEditing: true, isMenuOpen: false } : c,
                                      ),
                                    )
                                  }
                                >
                                  <Edit2 className="w-4 h-4" />
                                  Edit
                                </button>
                              )}{" "}
                              {/* Pin option - only for mindmap creator */}
                              {isCreator && (
                                <button
                                  className="flex items-center gap-2 w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 transition-colors"
                                  onClick={() => {
                                    handlePinComment(comment.id)
                                    setComments((prev) =>
                                      prev.map((c) => (c.id === comment.id ? { ...c, isMenuOpen: false } : c)),
                                    )
                                  }}
                                >
                                  <Pin className="w-4 h-4" />
                                  {comment.is_pinned ? "Unpin" : "Pin"}
                                </button>
                              )}
                              {(comment.user_id === user?.id || currentMap.creator === user?.id) && (
                                <button
                                  className={`flex items-center gap-2 w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-slate-700 transition-colors ${comment.user_id === user?.id ? "" : "rounded-b-lg"
                                    }`}
                                  onClick={() => setCommentToDelete(comment.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                  Delete
                                </button>
                              )}
                              {/* Report option - available to all users except comment author */}
                              {comment.user_id !== user?.id && (
                                <button
                                  className="flex items-center gap-2 w-full px-4 py-2 text-left text-sm text-slate-400 hover:bg-slate-700 rounded-b-lg transition-colors"
                                  onClick={() => {
                                    handleReportComment()
                                    setComments((prev) =>
                                      prev.map((c) => (c.id === comment.id ? { ...c, isMenuOpen: false } : c)),
                                    )
                                  }}
                                >
                                  <Flag className="w-4 h-4" />
                                  Report
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      {comment.isEditing ? (
                        <div className="mt-2">
                          <textarea
                            className="w-full bg-slate-800/50 border border-slate-600/50 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200"
                            defaultValue={comment.content}
                            onChange={(e) =>
                              setComments((prev) =>
                                prev.map((c) => (c.id === comment.id ? { ...c, draftContent: e.target.value } : c)),
                              )
                            } autoFocus
                          />                          <div className="flex justify-end mt-3 gap-3">                            <button
                            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
                            onClick={() => {
                              const updatedContent = comment.draftContent?.trim()
                              if (updatedContent && updatedContent !== comment.content) {
                                handleEditComment(comment.id, updatedContent)
                                setComments((prev) =>
                                  prev.map((c) =>
                                    c.id === comment.id
                                      ? { ...c, content: updatedContent, isEditing: false, isEdited: true }
                                      : c,
                                  ),
                                )
                              } else {
                                setComments((prev) =>
                                  prev.map((c) => (c.id === comment.id ? { ...c, isEditing: false } : c)),
                                )
                              }
                            }}
                          >
                            <Check className="w-4 h-4 inline mr-1" />
                            Save
                          </button>
                            <button
                              className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors text-sm"
                              onClick={() =>
                                setComments((prev) =>
                                  prev.map((c) => (c.id === comment.id ? { ...c, isEditing: false } : c)),
                                )
                              }
                            >
                              <X className="w-4 h-4 inline mr-1" />
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-slate-200 leading-relaxed mb-4">{comment.content}</p>
                      )}
                      <div className="flex items-center gap-6">
                        {" "}
                        <button
                          onClick={() => handleLikeComment(comment.id)}
                          className="flex items-center gap-2 text-xs text-slate-400 hover:text-slate-300 transition-colors"
                        >
                          <Heart
                            className={`w-4 h-4 transition-colors ${user?.id && comment.liked_by?.includes(user.id)
                                ? "fill-current text-sky-400"
                                : "text-slate-400 hover:text-sky-400"
                              }`}
                          />
                          {comment.likes > 0 && <span>{comment.likes}</span>}
                        </button>
                        <button
                          onClick={() =>
                            setComments((prev) =>
                              prev.map((c) => (c.id === comment.id ? { ...c, isReplying: !c.isReplying } : c)),
                            )
                          }
                          className="text-xs text-slate-400 hover:text-blue-400 transition-colors"
                        >
                          Reply
                        </button>
                        {comment.replies && comment.replies.length > 0 && (
                          <button
                            onClick={() =>
                              setComments((prev) =>
                                prev.map((c) => (c.id === comment.id ? { ...c, showReplies: !c.showReplies } : c)),
                              )
                            }
                            className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                          >
                            {comment.showReplies
                              ? "Hide replies"
                              : `${comment.replies.length} ${comment.replies.length === 1 ? "reply" : "replies"}`}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>{" "}
                  {comment.isReplying && (
                    <div className="flex items-start gap-3 ml-16 mt-4 bg-slate-800/30 rounded-lg p-4 border border-slate-600/30">
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-700 flex-shrink-0">
                        {userProfile?.avatar_url ? (
                          <img
                            src={userProfile.avatar_url || "/placeholder.svg"}
                            alt={user?.username || "User"}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-300 font-bold text-xs">
                            {user?.username?.charAt(0).toUpperCase() || "U"}
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <textarea
                          className="w-full bg-slate-800/50 border border-slate-600/50 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 placeholder-slate-400"
                          placeholder="Write a reply..."
                          value={comment.replyDraft || ""}
                          onChange={(e) =>
                            setComments((prev) =>
                              prev.map((c) => (c.id === comment.id ? { ...c, replyDraft: e.target.value } : c)),
                            )
                          }
                        />
                        <div className="flex justify-end mt-3 gap-2">
                          <button
                            onClick={() => {
                              if (comment.replyDraft?.trim()) {
                                handlePostReply(comment.id, comment.replyDraft)
                                setComments((prev) =>
                                  prev.map((c) =>
                                    c.id === comment.id
                                      ? { ...c, isReplying: false, replyDraft: "", showReplies: true }
                                      : c,
                                  ),
                                )
                              }
                            }}
                            disabled={!comment.replyDraft?.trim()}
                            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Reply
                          </button>
                          <button
                            onClick={() =>
                              setComments((prev) =>
                                prev.map((c) =>
                                  c.id === comment.id ? { ...c, isReplying: false, replyDraft: "" } : c,
                                ),
                              )
                            }
                            className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors text-sm font-medium"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                  {comment.replies && comment.replies.length > 0 && comment.showReplies && (
                    <div className="ml-16 mt-4 space-y-4 border-l-2 border-blue-500/30 pl-4">
                      {comment.replies.map((reply: any) => (
                        <div
                          key={reply.id}
                          id={`comment-${reply.id}`}
                          className={`group bg-slate-800/30 rounded-lg p-4 border border-slate-600/30 transition-all duration-500 ${highlightedCommentId === reply.id ? "bg-blue-900/30 border-blue-500/50" : ""}`}
                        >
                          {" "}
                          {/* Reply content similar to comment but more compact */}                          <div className="flex items-start gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <a
                                    href={`/${reply.profiles?.username}`}
                                    className="flex items-center gap-2 hover:bg-slate-800/30 rounded-lg p-1 -m-1 transition-all duration-200 cursor-pointer group"
                                  >
                                    <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-700 flex-shrink-0 group-hover:ring-2 group-hover:ring-slate-500/50 transition-all duration-200">
                                      {reply.profiles?.avatar_url ? (
                                        <img
                                          src={reply.profiles.avatar_url || "/placeholder.svg"}
                                          alt={reply.profiles.username || "User"}
                                          className="w-full h-full object-cover"
                                        />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-300 font-bold text-xs">
                                          {reply.profiles?.username?.charAt(0).toUpperCase() || "U"}
                                        </div>
                                      )}
                                    </div>                                    <span className={`text-sm font-semibold transition-colors ${reply.profiles?.username === username
                                        ? "text-white group-hover:text-slate-300 px-2 py-1 rounded-lg bg-gradient-to-r from-blue-600/60 to-purple-600/60"
                                        : "text-white group-hover:text-slate-300"
                                      }`}>
                                      @{reply.profiles?.username}
                                    </span></a>
                                  <span className="text-xs text-slate-400 flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {getRelativeTime(reply.created_at)}
                                    {reply.edited_at && <span className="text-slate-500 ml-1">(edited)</span>}
                                  </span>
                                </div>
                                {/* Reply three-dot menu */}
                                <div className="relative">
                                  <button
                                    className="p-1 rounded-full hover:bg-slate-700 transition-colors opacity-0 group-hover:opacity-100"
                                    onClick={() => {
                                      setComments((prev) =>
                                        prev.map((c) =>
                                          c.id === comment.id
                                            ? {
                                              ...c,
                                              replies: c.replies?.map((r: any) =>
                                                r.id === reply.id ? { ...r, isMenuOpen: !r.isMenuOpen } : r,
                                              ),
                                            }
                                            : c,
                                        ),
                                      )
                                    }}
                                  >
                                    <MoreHorizontal className="w-4 h-4" />
                                  </button>
                                  {reply.isMenuOpen && (
                                    <div className="absolute right-0 mt-2 w-40 bg-slate-800 rounded-lg shadow-xl border border-slate-700 z-10">
                                      {reply.user_id === user?.id && (
                                        <button
                                          className="flex items-center gap-2 w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 rounded-t-lg transition-colors"
                                          onClick={() =>
                                            setComments((prev) =>
                                              prev.map((c) =>
                                                c.id === comment.id
                                                  ? {
                                                    ...c,
                                                    replies: c.replies?.map((r: any) =>
                                                      r.id === reply.id
                                                        ? { ...r, isEditing: true, isMenuOpen: false }
                                                        : r,
                                                    ),
                                                  }
                                                  : c,
                                              ),
                                            )
                                          }
                                        >
                                          <Edit2 className="w-4 h-4" />
                                          Edit
                                        </button>
                                      )}
                                      {(reply.user_id === user?.id || currentMap.creator === user?.id) && (
                                        <button
                                          className={`flex items-center gap-2 w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-slate-700 transition-colors ${reply.user_id !== user?.id ? "" : "rounded-b-lg"}`}
                                          onClick={() => setCommentToDelete(reply.id)}
                                        >
                                          <Trash2 className="w-4 h-4" />
                                          Delete
                                        </button>
                                      )}
                                      {/* Report option for replies - available to all users except reply author */}
                                      {reply.user_id !== user?.id && (
                                        <button
                                          className="flex items-center gap-2 w-full px-4 py-2 text-left text-sm text-slate-400 hover:bg-slate-700 rounded-b-lg transition-colors"
                                          onClick={() => {
                                            handleReportComment()
                                            setComments((prev) =>
                                              prev.map((c) =>
                                                c.id === comment.id
                                                  ? {
                                                    ...c,
                                                    replies: c.replies?.map((r: any) =>
                                                      r.id === reply.id ? { ...r, isMenuOpen: false } : r,
                                                    ),
                                                  }
                                                  : c,
                                              ),
                                            )
                                          }}
                                        >
                                          <Flag className="w-4 h-4" />
                                          Report
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>{" "}
                              </div>
                              {reply.isEditing ? (
                                <div className="mt-2">
                                  <textarea
                                    className="w-full bg-slate-800/50 border border-slate-600/50 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200"
                                    defaultValue={reply.content}
                                    onChange={(e) =>
                                      setComments((prev) =>
                                        prev.map((c) =>
                                          c.id === comment.id
                                            ? {
                                              ...c,
                                              replies: c.replies?.map((r: any) =>
                                                r.id === reply.id ? { ...r, draftContent: e.target.value } : r,
                                              ),
                                            }
                                            : c,
                                        ),
                                      )
                                    } autoFocus
                                  />
                                  <div className="flex justify-end gap-3 mt-3">
                                    <button
                                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
                                      onClick={async () => {
                                        const draftContent = reply.draftContent || reply.content
                                        if (draftContent.trim()) {
                                          try {
                                            const { error } = await supabase
                                              .from("comments")
                                              .update({
                                                content: draftContent.trim(),
                                                edited_at: new Date().toISOString(),
                                              })
                                              .eq("id", reply.id)

                                            if (error) throw error

                                            setComments((prev) =>
                                              prev.map((c) =>
                                                c.id === comment.id
                                                  ? {
                                                    ...c,
                                                    replies: c.replies?.map((r: any) =>
                                                      r.id === reply.id
                                                        ? {
                                                          ...r,
                                                          content: draftContent.trim(),
                                                          edited_at: new Date().toISOString(),
                                                          isEditing: false,
                                                          draftContent: undefined,
                                                        }
                                                        : r,
                                                    ),
                                                  }
                                                  : c,
                                              ),
                                            )
                                          } catch (error) {
                                            console.error("Error updating reply:", error)
                                          }
                                        }
                                      }}
                                    >
                                      <Check className="w-4 h-4 inline mr-1" />
                                      Save
                                    </button>
                                    <button
                                      className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors text-sm"
                                      onClick={() =>
                                        setComments((prev) =>
                                          prev.map((c) =>
                                            c.id === comment.id
                                              ? {
                                                ...c,
                                                replies: c.replies?.map((r: any) =>
                                                  r.id === reply.id
                                                    ? { ...r, isEditing: false, draftContent: undefined }
                                                    : r,
                                                ),
                                              }
                                              : c,
                                          ),
                                        )
                                      }
                                    >
                                      <X className="w-4 h-4 inline mr-1" />
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-sm text-slate-200 leading-relaxed">{reply.content}</p>
                              )}
                              <div className="flex items-center gap-4 mt-2">
                                <button
                                  onClick={() => handleLikeComment(reply.id, true, comment.id)}
                                  className="flex items-center gap-2 text-xs text-slate-400 hover:text-slate-300 transition-colors"
                                >
                                  <Heart
                                    className={`w-4 h-4 transition-colors ${user?.id && reply.liked_by?.includes(user.id)
                                        ? "fill-current text-sky-400"
                                        : "text-slate-400 hover:text-sky-400"
                                      }`}
                                  />
                                  <span>{reply.likes || 0}</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            {/* Delete confirmation modal */}
            {commentToDelete && (
              <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50">
                <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 w-[90%] max-w-md border border-slate-700 shadow-2xl">
                  {" "}
                  <div className="text-center">
                    <div className="w-12 h-12 mx-auto mb-4 bg-red-500/20 rounded-full flex items-center justify-center">
                      <Trash2 className="w-6 h-6 text-red-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-200 mb-2">Delete Comment</h3>
                    <p className="text-slate-400 mb-6">
                      Are you sure you want to delete this comment? This action cannot be undone.
                    </p>
                    <div className="flex justify-center gap-3">
                      <button
                        onClick={handleConfirmDeleteComment}
                        className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => setCommentToDelete(null)}
                        className="px-6 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors font-medium"
                      >
                        Cancel
                      </button>                    </div>
                  </div>
                </div>              </div>
            )}{" "}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ViewMindMap
