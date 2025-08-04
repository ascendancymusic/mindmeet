import type React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { usePageTitle } from '../hooks/usePageTitle'
import { Network, Plus, Clock, Edit2, Trash2, Link, MoreVertical, EyeOff, Eye, AlertTriangle, Pin, Star, Users } from 'lucide-react'
import ReactFlow, { type ReactFlowInstance, NodeTypes } from "reactflow"
import "reactflow/dist/style.css"
import { useMindMapStore } from "../store/mindMapStore"
import { nodeTypes } from "../config/nodeTypes"
import { prepareNodesForRendering } from "../utils/reactFlowUtils"
import { formatDateWithPreference } from "../utils/dateUtils"
import { useAuthStore } from "../store/authStore"
import EditDetailsModal from "../components/EditDetailsModal"
import PublishSuccessModal from "../components/PublishSuccessModal"
import { supabase } from "../supabaseClient"
import { processNodesForTextRendering } from "../utils/textNodeUtils"

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

const CustomBackground = ({ backgroundColor }: { backgroundColor?: string }) => {
  if (backgroundColor) {
    return (
      <>
        {/* Base background color */}
        <div
          className="absolute inset-0 rounded-lg"
          style={{ backgroundColor, zIndex: -2 }}
        />
        {/* Subtle gradient overlay for better visual appeal */}
        <div
          className="absolute inset-0 bg-gradient-to-br from-black/10 via-transparent to-black/20 rounded-lg"
          style={{ zIndex: -1 }}
        />
      </>
    )
  }

  // Default gradient when no custom background
  return (
    <div
      className="absolute inset-0 bg-gradient-to-br from-slate-900/60 via-slate-800/40 to-slate-900/60 rounded-lg backdrop-blur-sm"
      style={{ zIndex: -1 }}
    />
  )
}

const SkeletonLoader = () => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {[...Array(4)].map((_, index) => (
        <div
          key={index}
          className="bg-gradient-to-br from-slate-800/70 via-slate-900/90 to-slate-800/70 backdrop-blur-xl rounded-2xl p-5 border border-slate-700/30 shadow-xl animate-pulse"
          style={{ animationDelay: `${index * 150}ms` }}
        >
          {/* Header skeleton */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center space-x-3 flex-1">
              <div className="flex items-center gap-2">
                {/* Avatar skeleton */}
                <div className="w-8 h-8 rounded-full bg-slate-700/50"></div>
                {/* Pin badge skeleton */}
                <div className="w-8 h-4 bg-slate-700/50 rounded-full"></div>
              </div>
              <div className="flex-1 min-w-0">
                {/* Title skeleton */}
                <div className="h-6 bg-slate-700/50 rounded-lg w-3/4 mb-1"></div>
                {/* Username skeleton */}
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
        </div>
      ))}
    </div>
  )
}

/**
 * MindMapList Component
 *
 * Displays a grid of user's mindmaps with preview thumbnails and management options.
 * Features include:
 * - Sorting maps by various criteria (newest, oldest, alphabetical)
 * - Creating new mindmaps
 * - Editing map details (title, permalink, visibility)
 * - Pinning/unpinning maps for quick access
 * - Deleting maps with confirmation
 * - Interactive previews of each map using ReactFlow
 *
 * @returns {JSX.Element} The rendered MindMapList component
 */
export default function MindMapList(): JSX.Element {
  // Authentication and navigation
  const { user } = useAuthStore()
  const userId = user?.id
  const navigate = useNavigate()

  // Validate userId format (UUID v4)
  const isValidUserId = userId && /^[0-9a-fA-F-]{36}$/.test(userId)

  // Dynamic page title
  usePageTitle('My Mindmaps');

  // MindMap store actions and state
  const {
    maps,
    collaborationMaps,
    fetchMaps,
    fetchCollaborationMaps,
    addMap,
    deleteMap,
    toggleMapPin,
    updateMapId,
  } = useMindMapStore()
  // UI state management
  const location = useLocation()
  const [isCreating, setIsCreating] = useState(false)
  const [sortOption, setSortOption] = useState("newest")
  const [isSmallScreen, setIsSmallScreen] = useState(window.innerWidth < 1080)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [mapToDelete, setMapToDelete] = useState<string | null>(null)
  const [mapToEdit, setMapToEdit] = useState<string | null>(null)
  const [newMapTitle, setNewMapTitle] = useState("")
  const [viewMode, setViewMode] = useState<"owned" | "collaboration">("owned")
  const [showSuccessPopup, setShowSuccessPopup] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const reactFlowRef = useRef<ReactFlowInstance>(null)

  /**
   * Handle automatic opening of create map modal when navigated with state
   * This allows other components to trigger the create map modal
   */
  useEffect(() => {
    if (location.state?.isCreating) {
      setIsCreating(true)
      // Clear the isCreating state from location to prevent it from persisting on refresh
      window.history.replaceState({}, document.title)
    }
  }, [location.state])

  /**
   * Fetch user's mindmaps from Supabase when component mounts
   * or when user authentication changes
   */
  useEffect(() => {
    const fetchData = async () => {
      if (isValidUserId) {
        setIsLoading(true)
        try {
          await Promise.all([
            fetchMaps(userId),
            fetchCollaborationMaps(userId)
          ])
        } catch (error) {
          console.error("Error fetching maps:", error)
        } finally {
          setIsLoading(false)
        }
      } else {
        console.warn("User not authenticated or invalid userId. No maps to fetch.")
        setIsLoading(false)
      }
    }

    fetchData()
  }, [isValidUserId, userId, fetchMaps, fetchCollaborationMaps])


  const handleCreateMap = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMapTitle.trim() || !isValidUserId) {
      console.error("Invalid or undefined userId. Cannot create map.")
      return
    }

    const id = addMap(newMapTitle.trim().substring(0, 20), userId)
    setNewMapTitle("")
    setIsCreating(false)
    navigate(`/${user.username}/${id}/edit`)
  }

  const handleResize = useCallback(() => {
    reactFlowRef.current?.fitView()
    setIsSmallScreen(window.innerWidth < 1080)
  }, [])

  useEffect(() => {
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [handleResize])


  const onInit = useCallback((instance: ReactFlowInstance) => {
    (reactFlowRef as any).current = instance
  }, [])

  /**
   * Sort maps based on user selection while keeping pinned maps at the top
   * Creates a new sorted array without modifying the original maps array
   */
  const currentMaps = viewMode === "owned" ? maps : collaborationMaps
  const sortedMaps = [...currentMaps].sort((a, b) => {
    // First sort by pin status (pinned maps always appear first)
    if (a.isPinned && !b.isPinned) return -1
    if (!a.isPinned && b.isPinned) return 1

    // Then apply the selected sort option
    switch (sortOption) {
      case "newest":
        return b.updatedAt - a.updatedAt
      case "oldest":
        return a.updatedAt - b.updatedAt
      case "alphabeticalAsc":
        return a.title.localeCompare(b.title)
      case "alphabeticalDesc":
        return b.title.localeCompare(a.title)
      default:
        return b.updatedAt - a.updatedAt // Default to newest
    }
  })

  /**
   * Toggles the dropdown menu for a specific map
   * If the menu for this map is already open, it closes it
   *
   * @param {string} id - The ID of the map to toggle menu for
   */
  const toggleMenu = (id: string) => {
    setOpenMenuId(openMenuId === id ? null : id)
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

  /**
   * Opens the delete confirmation modal for a map
   *
   * @param {string} id - The ID of the map to delete
   */
  const handleDeleteMap = (id: string) => {
    setMapToDelete(id)
    setOpenMenuId(null)
  }


  const confirmDelete = async () => {
    if (mapToDelete && isValidUserId) {
      deleteMap(mapToDelete, userId)
      setMapToDelete(null)
    }
  }


  const handleTogglePin = async (id: string) => {
    const currentMap = maps.find((map) => map.id === id)
    if (currentMap) {
      toggleMapPin(id)
    }
  }


  const handleEditDetails = (id: string) => {
    setMapToEdit(id)
    setOpenMenuId(null)
  }


  /**
   * Saves updated map details including title, permalink, visibility, description, and collaborators
   * Handles permalink changes by updating the map ID in both local state and Supabase
   *
   * @param {Object} details - The updated map details
   * @param {string} details.title - The map title
   * @param {string} details.permalink - The map permalink (used as ID)
   * @param {"public" | "private" | "linkOnly"} details.visibility - The map visibility setting
   * @param {string} details.description - The map description
   * @param {boolean} details.is_main - Whether this is the user's main/featured map
   * @param {string[]} details.collaborators - Array of user IDs who can collaborate on this map
   * @throws {Error} If the permalink is already in use by another map
   */
  const saveMapDetails = async (details: {
    title: string;
    permalink: string;
    visibility: "public" | "private" | "linkOnly";
    description: string;
    is_main: boolean;
    collaborators: string[];
    published_at?: string | null;
  }) => {
    if (mapToEdit && isValidUserId) {
      const currentMap = maps.find((map) => map.id === mapToEdit);
      if (currentMap) {
        // Check if the new permalink already exists for the current user
        const conflictingMap = maps.find(
          (map) => map.id === details.permalink && map.id !== currentMap.id
        );

        if (conflictingMap) {
          throw new Error(`Permalink already in use in your mindmap "${conflictingMap.title}"`);
        }

        try {
          const isPermalinkChanged = currentMap.id !== details.permalink;
          const updatedMapData = {
            title: details.title,
            visibility: details.visibility,
            description: details.description || "",
            is_main: details.is_main,
            collaborators: details.collaborators,
            published_at: details.published_at
          };

          if (isPermalinkChanged) {
            const updatedMap = {
              ...currentMap,
              ...updatedMapData
            };

            // Save the map with updated details
            await useMindMapStore.getState().saveMapToSupabase(updatedMap, userId);

            // Then update the ID (this creates a new record and deletes the old one)
            await updateMapId(currentMap.id, details.permalink);
          } else {
            const updatedMap = {
              ...currentMap,
              ...updatedMapData
            };

            // Save the map with updated details
            await useMindMapStore.getState().saveMapToSupabase(updatedMap, userId);
          }

          // If this is a publish/republish action, notify followers
          // Only send notifications if published_at was just set (not if it already existed)
          const wasJustPublished = details.published_at &&
            details.visibility === "public" &&
            details.published_at !== currentMap.published_at;
          if (wasJustPublished && currentMap.key && user?.username) {
            try {
              console.log("Sending notifications to followers for published mindmap:", {
                creator_id: userId,
                mindmap_key: currentMap.key,
                mindmap_title: details.title,
                creator_username: user.username
              });

              const { data: notificationData, error: notificationError } = await supabase.rpc('notify_followers_on_publish', {
                p_creator_id: userId,
                p_mindmap_key: currentMap.key,
                p_mindmap_title: details.title,
                p_creator_username: user.username
              });

              if (notificationError) {
                console.error("Error sending follower notifications:", notificationError);
              } else {
                console.log("Successfully sent notifications to followers:", notificationData);
              }
            } catch (notifyError) {
              console.error("Failed to notify followers:", notifyError);
              // Don't throw here - we don't want to fail the publish because notifications failed
            }
          }

          // Update local state to reflect changes immediately
          const updatedMap = {
            ...currentMap,
            ...updatedMapData,
            id: isPermalinkChanged ? details.permalink : currentMap.id,
          };

          // Update the maps array in state
          useMindMapStore.getState().setMaps(
            maps.map((map) => (map.id === currentMap.id ? updatedMap : map))
          );

          // Show success popup if publishing/republishing
          if (wasJustPublished) {
            setShowSuccessPopup(true);
            // Hide the popup after 3 seconds
            setTimeout(() => {
              setShowSuccessPopup(false);
            }, 3000);
          }

          setMapToEdit(null);
        } catch (error) {
          console.error("Failed to update map details:", error);
          throw error;
        }
      }
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      {/* Enhanced Header */}
      <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/30 shadow-2xl mb-8">
        <div className="flex justify-between items-center">
          <div className="flex flex-col space-y-4">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
              {viewMode === "owned" ? "Your Mindmaps" : "Collaboration Maps"}
            </h1>

            {/* Enhanced View Toggle */}
            <div className="flex items-center space-x-1 bg-slate-800/50 backdrop-blur-sm rounded-xl p-1 border border-slate-700/30">
              <button
                onClick={() => setViewMode("owned")}
                className={`${isSmallScreen ? 'px-3 py-2' : 'px-4 py-2'} rounded-lg text-sm font-medium transition-all duration-200 ${viewMode === "owned"
                  ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg"
                  : "text-slate-400 hover:text-slate-300 hover:bg-slate-700/30"
                  }`}
              >
                {isSmallScreen ? (
                  <div className="flex items-center space-x-1">
                    <Network className="w-4 h-4" />
                    <span>({maps.length})</span>
                  </div>
                ) : (
                  `Your Maps (${maps.length})`
                )}
              </button>
              <button
                onClick={() => setViewMode("collaboration")}
                className={`${isSmallScreen ? 'px-3 py-2' : 'px-4 py-2'} rounded-lg text-sm font-medium transition-all duration-200 ${viewMode === "collaboration"
                  ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg"
                  : "text-slate-400 hover:text-slate-300 hover:bg-slate-700/30"
                  }`}
              >
                {isSmallScreen ? (
                  <div className="flex items-center space-x-1">
                    <Users className="w-4 h-4" />
                    <span>({collaborationMaps.length})</span>
                  </div>
                ) : (
                  `Collaborations (${collaborationMaps.length})`
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Enhanced Sort Dropdown */}
            <select
              value={sortOption}
              onChange={(e) =>
                setSortOption(e.target.value as "newest" | "oldest" | "alphabeticalAsc" | "alphabeticalDesc")
              }
              className={`bg-slate-900 text-slate-100 border border-slate-700/30 rounded-xl ${isSmallScreen ? 'px-3 py-2 text-xs' : 'px-4 py-2'} focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200`}
            >
              <option value="newest">{isSmallScreen ? 'Newest' : 'Newest First'}</option>
              <option value="oldest">{isSmallScreen ? 'Oldest' : 'Oldest First'}</option>
              <option value="alphabeticalAsc">{isSmallScreen ? 'A-Z' : 'Alphabetical (A-Z)'}</option>
              <option value="alphabeticalDesc">{isSmallScreen ? 'Z-A' : 'Alphabetical (Z-A)'}</option>
            </select>
            {viewMode === "owned" && (
              <button
                onClick={() => setIsCreating(true)}
                className="group flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-500 hover:to-purple-500 transition-all duration-200 transform hover:scale-105 shadow-lg shadow-blue-500/25"
              >
                {isSmallScreen ? (
                  <Plus className="w-5 h-5 transition-transform group-hover:scale-110" />
                ) : (
                  <>
                    <Plus className="w-5 h-5 transition-transform group-hover:scale-110" />
                    <span className="font-medium">Create New Map</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {!isValidUserId ? (
        <div className="bg-gradient-to-br from-slate-800/30 to-slate-900/30 backdrop-blur-xl rounded-2xl p-12 border border-slate-700/30 text-center">
          <Network className="w-16 h-16 mx-auto text-slate-500 mb-4" />
          <p className="text-slate-400">Please log in to view your mindmaps.</p>
        </div>
      ) : isLoading ? (
        <SkeletonLoader />
      ) : currentMaps.length === 0 ? (
        <div className="bg-gradient-to-br from-slate-800/30 to-slate-900/30 backdrop-blur-xl rounded-2xl p-12 border border-slate-700/30 text-center">
          <Network className="w-16 h-16 mx-auto text-slate-500 mb-4" />
          <p className="text-slate-400">
            {viewMode === "owned"
              ? "No mindmaps yet. Create your first one!"
              : "No collaboration maps yet. You'll see mindmaps here when someone adds you as a collaborator."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {sortedMaps.map((map, index) => (
            <div
              key={map.id}
              className="group relative bg-gradient-to-br from-slate-800/70 via-slate-900/90 to-slate-800/70 backdrop-blur-xl rounded-2xl p-5 border border-slate-700/30 shadow-xl"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="relative">
                {/* Enhanced Map Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3 flex-1">
                    <div className="flex items-center gap-2">
                      {viewMode === "collaboration" ? (
                        // For collaboration maps, show creator avatar
                        map.creatorAvatar ? (
                          <img
                            src={map.creatorAvatar || "/placeholder.svg"}
                            alt={map.creatorUsername || 'Creator'}
                            className="w-8 h-8 rounded-full object-cover ring-2 ring-slate-600/30"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center">
                            <span className="text-sm font-bold text-slate-300">
                              {map.creatorUsername?.charAt(0)?.toUpperCase() || '?'}
                            </span>
                          </div>
                        )
                      ) : (
                        // For owned maps, show user avatar
                        map.creatorAvatar ? (
                          <img
                            src={map.creatorAvatar || "/placeholder.svg"}
                            alt={user?.username || 'User'}
                            className="w-8 h-8 rounded-full object-cover ring-2 ring-slate-600/30"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center">
                            <span className="text-sm font-bold text-slate-300">
                              {user?.username?.charAt(0)?.toUpperCase() || '?'}
                            </span>
                          </div>
                        )
                      )}
                      {map.isPinned && viewMode === "owned" && (
                        <div className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-blue-500/20 to-blue-300/20 rounded-full border border-blue-500/30">
                          <Pin className="w-3 h-3 text-blue-400" />
                        </div>
                      )}
                      {map.is_main && (
                        <div className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-blue-500/20 to-blue-300/20 rounded-full border border-blue-500/30">
                          <Star className="w-3 h-3 text-blue-400 fill-current" />
                          <span className="text-xs font-medium text-blue-300">Main</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-white truncate">
                        {map.title}
                      </h3>
                      {viewMode === "collaboration" && map.creatorUsername && (
                        <p className="text-sm text-blue-400 mt-1 font-medium">
                          @{map.creatorUsername}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="relative visibility-container">
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="p-2 text-slate-500 cursor-default"
                      >
                        {map.visibility === "public" ? (
                          <Eye className="w-5 h-5" />
                        ) : map.visibility === "linkOnly" ? (
                          <Link className="w-5 h-5" />
                        ) : (
                          <EyeOff className="w-5 h-5" />
                        )}
                      </div>
                    </div>
                    <div className="relative menu-container">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleMenu(map.id)
                        }}
                        className="p-2 text-slate-500 hover:text-slate-300 transition-all duration-200 rounded-lg hover:bg-slate-700/50"
                      >
                        <MoreVertical className="w-5 h-5" />
                      </button>
                      {openMenuId === map.id && (
                        <div className="absolute right-0 mt-2 w-48 bg-slate-800/95 backdrop-blur-xl rounded-2xl shadow-2xl z-10 border border-slate-700/50 overflow-hidden">
                          <div className="py-2">
                            {viewMode === "owned" && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleEditDetails(map.id)
                                  toggleMenu(map.id)
                                }}
                                className="w-full text-left px-4 py-3 text-sm text-slate-300 hover:bg-slate-700/50 hover:text-white flex items-center gap-3 transition-all duration-200"
                              >
                                <Edit2 className="w-4 h-4" />
                                Edit Details
                              </button>
                            )}
                            {viewMode === "owned" && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleTogglePin(map.id)
                                  toggleMenu(map.id)
                                }}
                                className={`w-full text-left px-4 py-3 text-sm hover:bg-slate-700/50 hover:text-white flex items-center gap-3 transition-all duration-200 ${map.isPinned ? "text-blue-400" : "text-slate-300"}`}
                              >
                                <Pin className="w-4 h-4" />
                                {map.isPinned ? "Unpin" : "Pin"}
                              </button>
                            )}
                            {viewMode === "owned" && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeleteMap(map.id)
                                  toggleMenu(map.id)
                                }}
                                className="w-full text-left px-4 py-3 text-sm text-slate-300 hover:bg-slate-700/50 hover:text-red-500 flex items-center gap-3 transition-all duration-200"
                              >
                                <Trash2 className="w-4 h-4" />
                                Delete
                              </button>
                            )}
                            {viewMode === "collaboration" && (
                              <div className="px-4 py-3 text-sm text-slate-500 flex items-center gap-3">
                                <Users className="w-4 h-4" />
                                Collaboration Map
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Enhanced Timestamp and Stats */}
                <div className="flex items-center gap-2 text-sm text-slate-400 mb-3">
                  <Clock className="w-4 h-4" />
                  <span>
                    Last edited{" "}
                    {map.updatedAt && !isNaN(new Date(map.updatedAt).getTime())
                      ? formatDateWithPreference(new Date(map.updatedAt))
                      : "Unknown date"}
                  </span>
                </div>
                <div className="text-sm text-slate-500 mb-4">
                  {map.nodes?.length} nodes • {map.edges?.length} connections
                </div>

                {/* Enhanced Mind Map Preview */}
                <a
                  href={(() => {
                    if (viewMode === "collaboration" && map?.creatorUsername) {
                      return `/${map.creatorUsername}/${map.id}/edit`;
                    } else {
                      return `/${user?.username}/${map.id}/edit`;
                    }
                  })()}
                  className={`block h-56 border border-slate-700/50 hover:border-blue-500/50 rounded-xl overflow-hidden transition-all duration-50 hover:shadow-lg hover:shadow-blue-500/10 relative group/preview cursor-pointer ${isSmallScreen ? 'pointer-events-auto' : ''}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  {map.nodes?.length > 0 ? (
                    <ReactFlow
                      nodes={processNodesForTextRendering(prepareNodesForRendering(map.nodes))}
                      edges={map.edges.map((edge: any) => {
                        // Find the source node to get its color
                        const sourceNode = map.nodes.find((node: any) => node.id === edge.source);
                        const sourceNodeColor = sourceNode
                          ? (sourceNode.background || sourceNode.style?.background || "#374151")
                          : "#374151";

                        // Get edgeType from map, default to 'default' if not valid
                        const edgeType = ['default', 'straight', 'smoothstep'].includes(map.edgeType || '')
                          ? map.edgeType
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
                      nodeTypes={nodeTypes as unknown as NodeTypes}
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
                      ref={reactFlowRef as any}
                      proOptions={{ hideAttribution: true }}
                    >
                      <CustomBackground backgroundColor={map.backgroundColor} />
                    </ReactFlow>
                  ) : (
                    <div className="h-full flex items-center justify-center rounded-xl relative overflow-hidden">
                      {/* Base background */}
                      <div
                        className="absolute inset-0"
                        style={{
                          backgroundColor: map.backgroundColor || 'rgba(30, 41, 59, 0.3)' // fallback to bg-slate-800/30
                        }}
                      />
                      {/* Gradient overlay for better visual appeal */}
                      {map.backgroundColor && (
                        <div className="absolute inset-0 bg-gradient-to-br from-black/10 via-transparent to-black/20" />
                      )}
                      {/* Content */}
                      <div className="text-center text-slate-500 relative z-10">
                        <Network className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Empty mindmap</p>
                        <p className="text-xs opacity-75">Click to start editing</p>
                      </div>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/20 to-transparent opacity-0 group-hover/preview:opacity-100 transition-opacity duration-50 pointer-events-none"></div>
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {isCreating && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-xl rounded-2xl p-6 w-full max-w-md border border-slate-700/50 shadow-2xl">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent mb-6">Create a new mindmap</h2>
            <form onSubmit={handleCreateMap} className="space-y-6">
              <input
                type="text"
                value={newMapTitle}
                onChange={(e) => setNewMapTitle(e.target.value)}
                placeholder="Enter map title..."
                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-200"
                autoFocus
                maxLength={20}
              />
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-6 py-3 text-slate-400 hover:text-slate-300 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newMapTitle.trim()}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-500 hover:to-purple-500 transition-all duration-200 font-medium transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
              Are you sure you want to delete "{maps.find(map => map.id === mapToDelete)?.title}"?
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
      {mapToEdit && (
        <EditDetailsModal
          isOpen={!!mapToEdit}
          onClose={() => setMapToEdit(null)}
          mapData={{
            id: maps.find(map => map.id === mapToEdit)?.id || '',
            title: maps.find(map => map.id === mapToEdit)?.title || '',
            description: maps.find(map => map.id === mapToEdit)?.description || '',
            visibility: maps.find(map => map.id === mapToEdit)?.visibility as "public" | "private" | "linkOnly",
            is_main: maps.find(map => map.id === mapToEdit)?.is_main || false,
            collaborators: maps.find(map => map.id === mapToEdit)?.collaborators || [],
            published_at: maps.find(map => map.id === mapToEdit)?.published_at || null
          }}
          showMainMapOption={false}
          username={user?.username}
          onSave={saveMapDetails}
        />
      )}

      {/* Publish Success Modal */}
      <PublishSuccessModal isVisible={showSuccessPopup} />
    </div>
  )
}