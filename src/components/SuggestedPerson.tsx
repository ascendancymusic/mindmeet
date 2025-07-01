"use client"

import React from "react"
import { useState } from "react"
import { UserPlus, UserCheck } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../supabaseClient"
import { useAuthStore } from "../store/authStore"
import { useNotificationStore } from "../store/notificationStore"

interface UserProfile {
  id: string
  username: string
  full_name?: string
  avatar_url?: string | null
}

interface SuggestedPersonProps {
  user: UserProfile | null
  isLoading?: boolean
  isCEO?: boolean
}

export const SuggestedPerson: React.FC<SuggestedPersonProps> = ({ user, isLoading = false, isCEO = false }) => {
  const navigate = useNavigate()
  const { user: currentUser } = useAuthStore()
  const [isFollowing, setIsFollowing] = useState(false)
  const [isFollowLoading, setIsFollowLoading] = useState(false)

  // Check if current user is following this user
  React.useEffect(() => {
    const checkFollowStatus = async () => {
      if (!currentUser?.id || !user?.id) return

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("following")
          .eq("id", currentUser.id)
          .single()

        if (!error && data) {
          setIsFollowing((data.following || []).includes(user.id))
        }
      } catch (error) {
        console.error("Error checking follow status:", error)
      }
    }

    checkFollowStatus()
  }, [currentUser?.id, user?.id])

  const handleFollow = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!currentUser?.id || !user?.id || isFollowLoading) return

    setIsFollowLoading(true)
    const wasFollowing = isFollowing

    // Optimistically update UI
    setIsFollowing(!wasFollowing)

    try {
      // Get current user's following list
      const { data: currentUserProfile, error: currentUserError } = await supabase
        .from("profiles")
        .select("following")
        .eq("id", currentUser.id)
        .single()

      if (currentUserError) throw currentUserError

      // Update current user's following list
      const updatedFollowing = wasFollowing
        ? (currentUserProfile.following || []).filter((id: string) => id !== user.id)
        : [...(currentUserProfile.following || []), user.id]

      const { error: followingError } = await supabase
        .from("profiles")
        .update({ following: updatedFollowing })
        .eq("id", currentUser.id)

      if (followingError) throw followingError

      // Get target user's profile to update their followed_by list
      const { data: targetUserProfile, error: targetUserError } = await supabase
        .from("profiles")
        .select("followed_by, followers")
        .eq("id", user.id)
        .single()

      if (targetUserError) throw targetUserError

      // Update target user's followed_by list and followers count
      const updatedFollowedBy = wasFollowing
        ? (targetUserProfile.followed_by || []).filter((id: string) => id !== currentUser.id)
        : [...(targetUserProfile.followed_by || []), currentUser.id]

      const updatedFollowersCount = wasFollowing
        ? Math.max((targetUserProfile.followers || 0) - 1, 0)
        : (targetUserProfile.followers || 0) + 1

      const { error: targetError } = await supabase
        .from("profiles")
        .update({
          followed_by: updatedFollowedBy,
          followers: updatedFollowersCount
        })
        .eq("id", user.id)

      if (targetError) throw targetError

      // Send notification
      if (currentUser?.username && user.id !== currentUser.id) {
        await useNotificationStore.getState().addNotification({
          user_id: user.id,
          type: 'follow',
          title: wasFollowing ? 'Lost Follower' : 'New Follower',
          message: wasFollowing
            ? `@${currentUser.username} unfollowed you`
            : `@${currentUser.username} started following you`,
          related_user: currentUser.id
        })
      }
    } catch (error) {
      console.error("Error updating follow status:", error)
      // Revert UI changes on failure
      setIsFollowing(wasFollowing)
    } finally {
      setIsFollowLoading(false)
    }
  }
  if (isLoading) {
    return (
      <div className="flex items-center space-x-4 animate-pulse">
        <div className="w-10 h-10 rounded-full bg-slate-700"></div>
        <div className="flex-1">
          <div className="h-4 bg-slate-700 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-slate-700 rounded w-1/2"></div>
        </div>
      </div>
    )
  }
  // For CEO or if no user is provided
  const displayName = isCEO ? "CEO" : user?.full_name || "User"
  const username = isCEO ? "ceo" : user?.username || "user"
  const profilePath = `/${username}`

  return (
    <div className="relative flex w-full">
      <div
        className="flex items-center space-x-3 cursor-pointer hover:bg-slate-700/30 p-2 rounded-xl transition-all duration-200 w-full pr-12 group"
        onClick={() => navigate(profilePath)}
      >
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex-shrink-0 flex items-center justify-center ring-2 ring-slate-600/30 group-hover:ring-blue-500/30 transition-all duration-200">
          {user?.avatar_url ? (
            <img
              src={user.avatar_url || "/placeholder.svg"}
              alt={`${displayName} Avatar`}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            <span className="text-slate-300 font-medium">{displayName.charAt(0)}</span>
          )}
        </div>
        <div className="min-w-0 overflow-hidden flex-1">
          <p
            className="font-medium text-sm text-white break-words max-h-[3rem] overflow-hidden group-hover:text-blue-300 transition-colors"
            style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}
            title={displayName}
          >
            {displayName}
          </p>
          <p
            className="text-sm text-slate-400 break-words max-h-[3rem] overflow-hidden group-hover:text-slate-300 transition-colors"
            style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}
            title={`@${username}`}
          >
            @{username}
          </p>
        </div>
      </div>      <button
        onClick={handleFollow}
        disabled={isFollowLoading}
        className={`absolute right-1 top-1/2 transform -translate-y-1/2 p-2 text-sm border rounded-xl transition-all duration-200 ${
          isFollowing
            ? "border-blue-500/50 bg-gradient-to-r from-blue-600/20 to-purple-600/20 hover:from-blue-500/30 hover:to-purple-500/30"
            : "border-slate-600/50 hover:bg-slate-700/30 hover:border-slate-500/50"
        } ${isFollowLoading ? "opacity-50 cursor-not-allowed" : ""}`}
        aria-label={isFollowing ? "Unfollow" : "Follow"}
      >
        {isFollowing ? (
          <UserCheck className="w-4 h-4 text-blue-400" />
        ) : (
          <UserPlus className="w-4 h-4 text-slate-300" />
        )}
      </button>
    </div>
  )
}

