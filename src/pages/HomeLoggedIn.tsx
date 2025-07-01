"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useAuthStore } from "../store/authStore"
import { useChatStore } from "../store/chatStore"
import { PlusCircle, User, MessageSquare, Settings, Network, Crown } from "lucide-react"
import { useNavigate, useLocation } from "react-router-dom"
import { supabase } from "../supabaseClient"
import { NewAccountSetup } from "../components/NewAccountSetup"
import { SuggestedUsers } from "../components/SuggestedUsers"
import { ProPopup } from "../components/ProPopup"
import Feed from "../components/Feed"

const HomeLoggedIn: React.FC = () => {
  const { user, setAvatarUrl: cacheAvatarUrl, avatarUrl: cachedAvatarUrl, setUser } = useAuthStore()
  const { getTotalUnreadCount, fetchConversations } = useChatStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [avatarUrl, setAvatarUrl] = useState<string | null>(cachedAvatarUrl)
  const [username, setUsername] = useState<string | null>(null)
  const [showNewAccountSetup, setShowNewAccountSetup] = useState(false)
  const [hasCompletedSetup, setHasCompletedSetup] = useState(false) // New state to prevent re-opening
  const [showProPopup, setShowProPopup] = useState(false)
  const [activeTab, setActiveTab] = useState<"for-you" | "following">("for-you")

  const unreadCount = getTotalUnreadCount()

  // Check if this is a new account from GoogleAuthButton redirect
  useEffect(() => {
    if (hasCompletedSetup) return // Prevent re-opening after setup is complete
    const isNewAccount = location.state?.isNewAccount
    if (isNewAccount && user && !showNewAccountSetup) {
      setShowNewAccountSetup(true)
    }
  }, [location.state, user, hasCompletedSetup])

  useEffect(() => {
    const fetchAvatar = async () => {
      if (user?.id) {
        const { data, error } = await supabase.from("profiles").select("avatar_url").eq("id", user.id).single()

        if (error) {
          console.error("Error fetching avatar:", error)
        } else {
          const fetchedAvatarUrl = data?.avatar_url || null
          if (fetchedAvatarUrl !== cachedAvatarUrl) {
            setAvatarUrl(fetchedAvatarUrl)
            cacheAvatarUrl(fetchedAvatarUrl)
          }
        }
      }
    }

    fetchAvatar()
  }, [user?.id, cachedAvatarUrl, cacheAvatarUrl])

  useEffect(() => {
    const fetchUsername = async () => {
      if (user?.id) {
        const { data, error } = await supabase.from("profiles").select("username").eq("id", user.id).single()

        if (error) {
          console.error("Error fetching username:", error)
        } else {
          setUsername(data?.username || null)
        }
      }
    }

    fetchUsername()
  }, [user?.id])

  // Fetch conversations to calculate unread count
  useEffect(() => {
    if (user?.id) {
      fetchConversations(true) // Skip auto-select since we're just getting unread counts
    }
  }, [user?.id, fetchConversations])

  const handleNewMapClick = () => {
    navigate("/mindmap", { state: { isCreating: true }, replace: true })
  }

  const handleAccountSetupComplete = async ({ username, fullName }: { username: string; fullName: string }) => {
    try {
      if (!user) return

      console.log("Updating profile with username:", username, "fullName:", fullName)

      setUser({
        id: user.id,
        username: username,
        avatar_url: avatarUrl || "",
      })

      setUsername(username)
      setShowNewAccountSetup(false) // Close the modal
      setHasCompletedSetup(true) // Prevent re-opening
      navigate(location.pathname, { replace: true, state: {} }) // Clear state

      console.log("Account setup completed successfully")
    } catch (error) {
      console.error("Error in handleAccountSetupComplete:", error)
      throw error
    }
  }
  return (
    <div className="flex flex-col min-h-screen text-slate-100">
      <main className="flex-1 w-full mx-auto flex">        {/* Enhanced Sidebar */}
        <aside className="w-64 hidden lg:block">
          <nav className="sticky top-20 space-y-2 pt-4 px-4 pb-4">            <button
              onClick={() => navigate(`/${username || ""}`)}
              className="group w-full text-left px-4 py-3 rounded-xl hover:bg-slate-800/50 transition-all duration-200 border border-transparent hover:border-slate-700/50 backdrop-blur-sm"
            >
              <User className="inline-block mr-3 h-5 w-5 text-slate-400 group-hover:text-slate-300 transition-colors -translate-y-0.5" />
              <span className="font-medium group-hover:text-white transition-colors">Profile</span>
            </button>            <button
              onClick={() => navigate("/chat")}
              className="group w-full text-left px-4 py-3 rounded-xl hover:bg-slate-800/50 transition-all duration-200 flex items-center border border-transparent hover:border-slate-700/50 backdrop-blur-sm"
            >
              <MessageSquare className="mr-3 h-5 w-5 text-slate-400 group-hover:text-slate-300 transition-colors" />
              <span className="font-medium group-hover:text-white transition-colors">Chat</span>
              {unreadCount > 0 && (
                <span className="ml-auto bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow-lg">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>            <button
              onClick={() => navigate("/settings")}
              className="group w-full text-left px-4 py-3 rounded-xl hover:bg-slate-800/50 transition-all duration-200 border border-transparent hover:border-slate-700/50 backdrop-blur-sm"
            >
              <Settings className="inline-block mr-3 h-5 w-5 text-slate-400 group-hover:text-slate-300 transition-colors -translate-y-0.5" />
              <span className="font-medium group-hover:text-white transition-colors">Settings</span>
            </button>            <button
              onClick={() => navigate("/mindmap")}
              className="group w-full text-left px-4 py-3 rounded-xl hover:bg-slate-800/50 transition-all duration-200 border border-transparent hover:border-slate-700/50 backdrop-blur-sm"
            >
              <Network className="inline-block mr-3 h-5 w-5 text-slate-400 group-hover:text-slate-300 transition-colors -translate-y-0.5" />
              <span className="font-medium group-hover:text-white transition-colors">Mindmaps</span>
            </button>            <button
              onClick={() => setShowProPopup(true)}
              className="group w-full text-left px-4 py-3 rounded-xl hover:bg-slate-800/50 transition-all duration-200 border border-transparent hover:border-slate-700/50 backdrop-blur-sm"
            >
              <Crown className="inline-block mr-3 h-5 w-5 text-blue-400 group-hover:text-blue-300 transition-colors -translate-y-0.5" />
              <span className="font-medium group-hover:text-white transition-colors">Pro</span>
            </button>
          </nav>
        </aside>

        <div className="flex-1">
          {/* Enhanced New Map Section */}
          <div className="space-y-6 p-4">
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl p-6 rounded-2xl shadow-2xl border border-slate-700/30">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center overflow-hidden ring-4 ring-slate-600/20">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl || "/placeholder.svg"}
                      alt="User Avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="h-6 w-6 text-slate-300" />
                  )}
                </div>
                <button
                  onClick={handleNewMapClick}
                  className="group px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-500 hover:to-purple-500 transition-all duration-200 flex items-center font-medium transform hover:scale-105 shadow-lg shadow-blue-500/25"
                >
                  <PlusCircle className="w-5 h-5 mr-2 transition-transform group-hover:scale-110" />
                  New Map
                </button>
              </div>
            </div>
          </div>          {/* Enhanced Feed Tabs */}
          <div className="sticky top-20 z-30 bg-gradient-to-r from-slate-950/80 to-slate-900/80 backdrop-blur-xl mx-4 mb-4 rounded-2xl border border-slate-700/30 shadow-lg overflow-hidden" style={{ top: 'calc(5rem - 8px)' }}>
            <div className="flex">
              <button
                onClick={() => setActiveTab("for-you")}
                className={`flex-1 px-6 py-4 text-sm font-medium transition-all duration-300 relative ${
                  activeTab === "for-you"
                    ? "text-blue-400 bg-slate-800/50"
                    : "text-slate-400 hover:text-slate-300 hover:bg-slate-800/30"
                }`}
              >
                For You
                {activeTab === "for-you" && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-t-full"></div>
                )}
              </button>
              <button
                onClick={() => setActiveTab("following")}
                className={`flex-1 px-6 py-4 text-sm font-medium transition-all duration-300 relative ${
                  activeTab === "following"
                    ? "text-blue-400 bg-slate-800/50"
                    : "text-slate-400 hover:text-slate-300 hover:bg-slate-800/30"
                }`}
              >
                Following
                {activeTab === "following" && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-t-full"></div>
                )}
              </button>
            </div>
          </div>

          <div className="px-4">
            <Feed filter={activeTab} />
          </div>
        </div>        {/* Enhanced Right Sidebar */}
        <aside className="w-64 hidden xl:block px-4">
          <div className="sticky top-20 pt-4">
            <SuggestedUsers currentUserId={user?.id} />
          </div>
        </aside>
      </main>

      {showNewAccountSetup && user && (
        <NewAccountSetup
          userId={user.id}
          initialEmail={user.email || ""}
          initialUsername={username || ""}
          initialAvatar={avatarUrl || ""}
          onComplete={handleAccountSetupComplete}
        />
      )}
      {showProPopup && <ProPopup isOpen={showProPopup} onClose={() => setShowProPopup(false)} />}
    </div>
  )
}

export default HomeLoggedIn
