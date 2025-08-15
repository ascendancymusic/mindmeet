"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { SuggestedPerson } from "./SuggestedPerson"
import { supabase } from "../supabaseClient"

interface UserProfile {
  id: string
  username: string
  full_name?: string
  avatar_url?: string | null
}

interface SuggestedUsersProps {
  currentUserId: string | undefined
}

export const SuggestedUsers: React.FC<SuggestedUsersProps> = ({ currentUserId }) => {
  const [isLoading, setIsLoading] = useState(true)
  const [ceoProfile, setCeoProfile] = useState<UserProfile | null>(null)
  const [suggestedUsers, setSuggestedUsers] = useState<UserProfile[]>([])
  const [lastUpdateTime, setLastUpdateTime] = useState<number>(0)
  useEffect(() => {
    const fetchSuggestedUsers = async () => {
      if (!currentUserId) return

      // Check if an hour has passed since the last update
      const currentTime = Date.now()
      const oneHour = 60 * 60 * 1000 // 1 hour in milliseconds

      // If we have users and it's been less than an hour, don't update
      if (suggestedUsers.length > 0 && currentTime - lastUpdateTime < oneHour) {
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      try {
        // First, fetch the CEO profile (could be a specific user ID or username)
        const { data: ceoData, error: ceoError } = await supabase
          .from("profiles")
          .select("id, full_name, username, avatar_url")
          .eq("username", "ceo")
          .single()

        if (ceoError && ceoError.code !== "PGRST116") {
          // PGRST116 is "no rows returned"
          console.error("Error fetching CEO profile:", ceoError)
        } else if (ceoData) {
          setCeoProfile(ceoData)
        }        // Get current user's following list to exclude from suggestions
        const { data: followingData, error: followingError } = await supabase
          .from("user_follows")
          .select("followed_id")
          .eq("follower_id", currentUserId)

        if (followingError) {
          console.error("Error fetching current user following:", followingError)
        }

        const followingList = followingData?.map(f => f.followed_id) || []

        // Then fetch random users for suggestions
        // This is where you could implement different algorithms in the future
        let query = supabase
          .from("profiles")
          .select("id, full_name, username, avatar_url")
          .neq("id", currentUserId)
          .neq("username", "ceo") // Exclude CEO from random suggestions
          .limit(20)

        // Only add the exclusion filter if there are users being followed
        if (followingList.length > 0) {
          query = query.not("id", "in", `(${followingList.join(',')})`)
        }

        const { data, error } = await query

        if (error) {
          console.error("Error fetching suggested users:", error)
          return
        }

        if (data && data.length > 0) {
          // Currently using random selection - this can be replaced with a more sophisticated algorithm later
          const shuffled = [...data].sort(() => 0.5 - Math.random())
          setSuggestedUsers(shuffled.slice(0, 2)) // Get two random users
          setLastUpdateTime(currentTime)
        }
      } catch (error) {
        console.error("Error in fetchSuggestedUsers:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchSuggestedUsers()
  }, [currentUserId, suggestedUsers.length, lastUpdateTime])
  return (
    <div className="sticky top-20 bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl rounded-2xl border border-slate-700/30 shadow-2xl p-5">
      <h2 className="text-lg font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent mb-4">Suggested Users</h2>
      <div className="space-y-4">
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, index) => (
              <SuggestedPerson key={index} user={null} isLoading={true} />
            ))}
          </div>
        ) : (
          <>            {/* CEO is always first */}
            <SuggestedPerson user={ceoProfile} isCEO={true} />

            {/* Random suggested users */}
            {suggestedUsers.map((user) => (
              <SuggestedPerson key={user.id} user={user} />
            ))}
          </>
        )}
      </div>
    </div>
  )
}

