import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { Search, Bell, User, Network, LogOut, Settings, Menu, X, MessageCircle, MessageSquare } from "lucide-react"
import NotificationsDropdown from "./NotificationsDropdown"
import { useAuthStore } from "../store/authStore"
import { supabase } from "../supabaseClient"
import { useNotificationStore } from "../store/notificationStore"
import { useChatStore } from "../store/chatStore"

const LoggedInNavigation: React.FC = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { logout, user, setAvatarUrl: cacheAvatarUrl, avatarUrl: cachedAvatarUrl } = useAuthStore()
  const { notifications, fetchNotifications, markAllAsRead } = useNotificationStore()
  const { getTotalUnreadCount, fetchConversations } = useChatStore()
  const unreadCount = notifications
    .filter(n => n.user_id === user?.id && !n.read)
    .length
  const chatUnreadCount = getTotalUnreadCount()
  const [showDropdown, setShowDropdown] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(cachedAvatarUrl)
  const [avatarVersion, setAvatarVersion] = useState(0) // Add a versioning mechanism
  const dropdownRef = useRef<HTMLDivElement>(null)
  const notificationRef = useRef<HTMLDivElement>(null)
  const [searchQuery, setSearchQuery] = useState("") // State for search input
  const [searchResults, setSearchResults] = useState<any[]>([]) // State for search results
  const [showSearchResults, setShowSearchResults] = useState(false) // State to toggle search results dropdown
  const [username, setUsername] = useState<string | null>(null) // Add state for username
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const mobileMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768)
    }

    // Initial check
    checkScreenSize()

    // Add event listener
    window.addEventListener("resize", checkScreenSize)

    // Cleanup
    return () => window.removeEventListener("resize", checkScreenSize)
  }, [])

  // Prevent body scrolling when menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }

    return () => {
      document.body.style.overflow = ""
    }
  }, [mobileMenuOpen])
  const isActive = (path: string): string =>
    location.pathname === path
      ? "bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-blue-400 cursor-default border border-blue-500/30"
      : "text-slate-400 hover:bg-gradient-to-r hover:from-blue-500/10 hover:to-purple-500/10 hover:text-blue-300 border border-transparent"

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showDropdown && dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
      if (showNotifications && notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false)
      }
      if (
        mobileMenuOpen &&
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(event.target as Node) &&
        !(event.target as Element).closest(".mobile-menu-button")
      ) {
        setMobileMenuOpen(false)
      }
    }

    document.addEventListener("click", handleClickOutside)
    return () => document.removeEventListener("click", handleClickOutside)
  }, [showDropdown, showNotifications, mobileMenuOpen])

  // Close mobile menu on escape key
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && mobileMenuOpen) {
        setMobileMenuOpen(false)
      }
    }

    document.addEventListener("keydown", handleEscKey)
    return () => document.removeEventListener("keydown", handleEscKey)
  }, [mobileMenuOpen])

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
            cacheAvatarUrl(fetchedAvatarUrl) // Update the cache if the avatar has changed
            setAvatarVersion((prev) => prev + 1) // Increment version to trigger re-render
          }
        }
      }
    }

    fetchAvatar()
  }, [user?.id, cachedAvatarUrl, cacheAvatarUrl, avatarVersion]) // Add avatarVersion as a dependency

  useEffect(() => {
    const fetchUsername = async () => {
      if (user?.id) {
        const { data, error } = await supabase.from("profiles").select("username").eq("id", user.id).single()

        if (error) {
          console.error("Error fetching username:", error)
        } else {
          setUsername(data?.username || null) // Set the fetched username
        }
      }
    }

    fetchUsername()
  }, [user?.id])

  useEffect(() => {
    if (user?.id) {
      // Initial fetch
      fetchNotifications(user.id);

      // Set up periodic refresh
      const interval = setInterval(() => {
        fetchNotifications(user.id);
      }, 30000); // Refresh every 30 seconds

      return () => clearInterval(interval);
    } else {
      // Reset notifications when no user is logged in
      notifications.length = 0;
    }
  }, [user?.id]);

  // Fetch chat conversations for unread count
  useEffect(() => {
    if (user?.id) {
      // Initial fetch
      fetchConversations(true); // Skip auto-select to avoid interfering with current chat state

      // Set up periodic refresh for chat conversations
      const interval = setInterval(() => {
        fetchConversations(true);
      }, 30000); // Refresh every 30 seconds

      return () => clearInterval(interval);
    }
  }, [user?.id, fetchConversations]);

  const handleLinkClick = () => {
    setShowDropdown(false)
    setMobileMenuOpen(false)
  }

  const handleSearch = async (query: string) => {
    if (query.trim() === "") {
      setSearchResults([])
      setShowSearchResults(false)
      return
    }
  
    const { data: profilesData, error: profilesError } = await supabase
      .from("profiles")
      .select("id, username, avatar_url")
      .ilike("username", `%${query}%`) // Case-insensitive search for profiles
  
    const { data: mindmapsData, error: mindmapsError } = await supabase
      .from("mindmaps")
      .select("id, title, username") // Join with profiles to get the username
      .ilike("title", `%${query}%`) // Case-insensitive search for mindmaps
  
    if (profilesError || mindmapsError) {
      console.error("Error searching:", profilesError || mindmapsError)
      setSearchResults([])
    } else {
      setSearchResults([
        ...(profilesData || []).map((profile) => ({ type: "profile", ...profile })),
        ...(mindmapsData || []).map((mindmap) => ({ type: "mindmap", ...mindmap })),
      ])
      setShowSearchResults(true)
    }
  }
  
  const handleSearchResultClick = (result: any) => {
    if (result.type === "profile" && result.username) {
      navigate(`/${result.username}`)
    } else if (result.type === "mindmap" && result.username && result.id) {
      navigate(`/${result.username}/${result.id}`)
    }
    setSearchQuery("")
    setSearchResults([])
    setShowSearchResults(false)
    setMobileMenuOpen(false)
  }

  const handleSearchInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const query = event.target.value
    setSearchQuery(query)
    handleSearch(query)
  }

  const handleNotificationsClick = async () => {
    setShowNotifications(!showNotifications);
    if (!showNotifications && user?.id) {
      await fetchNotifications(user.id);
      if (notifications.some(n => n.user_id === user.id && !n.read)) {
        await markAllAsRead(user.id);
      }
    }
  };
  return (
    <header className="sticky top-0 z-50 bg-gradient-to-r from-slate-800/95 to-slate-900/95 backdrop-blur-xl border-b border-slate-700/50 shadow-lg">
      <div className="max-w-9xl mx-auto flex justify-between items-center px-4 py-3">
        {/* Left section with hamburger and logo */}
        <div className="flex items-center">
          {isMobile && (
            <button
              className="mr-3 p-2 text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all duration-200 mobile-menu-button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          )}
          <h1
            className="text-2xl font-bold bg-gradient-to-r from-blue-400 via-purple-500 to-purple-600 bg-clip-text text-transparent cursor-pointer transition-all duration-300 hover:from-blue-500 hover:via-purple-600 hover:to-purple-700"
            onClick={() => navigate("/")}
          >
            MindMeet
          </h1>
        </div>        {/* Search bar - visible on desktop, hidden on mobile */}
        <div className={`flex-1 max-w-xl px-4 ${isMobile ? "hidden" : "block"}`}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="search"
              value={searchQuery}
              onChange={handleSearchInputChange}
              placeholder="Search MindMeet"
              className="w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-purple-500/50 text-slate-200 placeholder:text-slate-400 transition-all duration-200"
            />
            {showSearchResults && searchResults.length > 0 && (
              <div className="absolute mt-2 w-full bg-slate-800/95 backdrop-blur-xl border border-slate-700/50 rounded-xl shadow-2xl z-10 overflow-hidden">
                {searchResults.map((result) => (
                  <div
                    key={result.id}
                    className="px-4 py-3 text-sm text-slate-300 hover:bg-gradient-to-r hover:from-blue-500/10 hover:to-purple-500/10 cursor-pointer flex items-center transition-all duration-200 border-b border-slate-700/30 last:border-b-0"
                    onClick={() => handleSearchResultClick(result)}
                  >
                    {result.type === "profile" ? (
                      <>
                        {result.avatar_url ? (
                          <img
                            src={result.avatar_url || "/placeholder.svg"}
                            alt={result.username}
                            className="w-8 h-8 rounded-full mr-3 border border-slate-600/50"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center mr-3">
                            <User className="w-4 h-4 text-slate-400" />
                          </div>
                        )}
                        <span className="font-medium">{result.username}</span>
                      </>
                    ) : (
                      <>
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center mr-3">
                          <Network className="w-4 h-4 text-blue-400" />
                        </div>
                        <span className="font-medium">{result.title}</span>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>        {/* Right section with navigation icons - always visible */}
        <nav className="flex items-center gap-2">
          {!isMobile && (
            <>
              <Link
                to="/mindmap"
                className={`flex items-center justify-center px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${isActive("/mindmap")}`}
              >
                <Network className="w-5 h-5 mx-auto" />
              </Link>
              <Link
                to="/chat"
                className={`flex items-center justify-center px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 relative ${isActive("/chat")}`}
                aria-label="Chat"
              >
                <MessageSquare className="w-5 h-5 mx-auto" />
                {chatUnreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center border border-slate-700 shadow-lg">
                    {chatUnreadCount > 9 ? '9+' : chatUnreadCount}
                  </span>
                )}
              </Link>
            </>
          )}
          <div className="relative" ref={notificationRef}>
            <button
              className={`p-2 rounded-xl transition-all duration-200 relative ${
                showNotifications 
                  ? "bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-blue-400 border border-blue-500/30" 
                  : "text-slate-300 hover:text-white hover:bg-gradient-to-r hover:from-blue-500/10 hover:to-purple-500/10 border border-transparent"
              }`}
              onClick={handleNotificationsClick}
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center border border-slate-700 shadow-lg">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            <NotificationsDropdown isOpen={showNotifications} onClose={() => setShowNotifications(false)} />
          </div>
          <div className="relative" ref={dropdownRef}>
            <button
              className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center hover:from-slate-600 hover:to-slate-700 transition-all duration-200 border border-slate-600/50 hover:border-slate-500/50"
              onClick={() => setShowDropdown(!showDropdown)}
            >
              {avatarUrl ? (
                <img src={avatarUrl || "/placeholder.svg"} alt="User Avatar" className="w-full h-full rounded-xl object-cover" />
              ) : (
                <User className="h-5 w-5 text-slate-300" />
              )}
            </button>
            {showDropdown && (
              <div className="absolute right-0 mt-2 w-52 bg-slate-800/95 backdrop-blur-xl rounded-xl shadow-2xl py-2 z-10 border border-slate-700/50 overflow-hidden">
                <Link
                  to={`/${username || ""}`}
                  onClick={handleLinkClick}
                  className="flex items-center px-4 py-3 text-sm text-slate-300 hover:bg-gradient-to-r hover:from-blue-500/10 hover:to-purple-500/10 hover:text-white transition-all duration-200 border-b border-slate-700/30"
                >
                  <User className="w-4 h-4 mr-3 text-slate-400" />
                  Profile
                </Link>
                <Link
                  to="/settings"
                  onClick={handleLinkClick}
                  className="flex items-center px-4 py-3 text-sm text-slate-300 hover:bg-gradient-to-r hover:from-blue-500/10 hover:to-purple-500/10 hover:text-white transition-all duration-200 border-b border-slate-700/30"
                >
                  <Settings className="w-4 h-4 mr-3 text-slate-400" />
                  Settings
                </Link>
                <button
                  onClick={() => {
                    logout()
                    navigate("/")
                  }}
                  className="flex items-center px-4 py-3 text-sm text-slate-300 hover:bg-gradient-to-r hover:from-red-500/10 hover:to-red-600/10 hover:text-red-400 transition-all duration-200 w-full text-left"
                >
                  <LogOut className="w-4 h-4 mr-3 text-slate-400" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </nav>
      </div>

      {/* Mobile menu overlay */}
      {isMobile && (
        <>
          {/* Backdrop - darkened background that covers the entire screen */}
          <div            className={`fixed inset-0 bg-black transition-opacity duration-300 z-40 ${
              mobileMenuOpen ? "opacity-50" : "opacity-0 pointer-events-none"
            }`}
            onClick={() => setMobileMenuOpen(false)}
          />          {/* Slide-out menu */}          <div
            ref={mobileMenuRef}            className={`fixed top-0 left-0 h-full w-72 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out border-r border-slate-700 ${
              mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
            }`}
            style={{ 
              backgroundColor: '#0f172a !important',
              background: 'solid #0f172a !important',
              backgroundImage: 'none !important',
              opacity: '1 !important'
            }}
          >            {/* Menu header with close button */}
            <div className="flex items-center justify-between p-4 border-b border-slate-700/50" style={{ backgroundColor: '#0f172a' }}>
              <h2 className="text-lg font-bold bg-gradient-to-r from-blue-400 via-purple-500 to-purple-600 bg-clip-text text-transparent">Menu</h2>
              <button
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all duration-200"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Search bar in mobile menu */}
            <div className="p-4 border-b border-slate-700/50" style={{ backgroundColor: '#0f172a' }}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={handleSearchInputChange}
                  placeholder="Search MindMeet"
                  className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-purple-500/50 text-slate-200 placeholder:text-slate-400 transition-all duration-200"
                />
                {showSearchResults && searchResults.length > 0 && (
                  <div className="absolute mt-2 w-full bg-slate-800/95 backdrop-blur-xl border border-slate-700/50 rounded-xl shadow-2xl z-10 overflow-hidden">
                    {searchResults.map((result) => (
                      <div
                        key={result.id}
                        className="px-4 py-3 text-sm text-slate-300 hover:bg-gradient-to-r hover:from-blue-500/10 hover:to-purple-500/10 cursor-pointer flex items-center transition-all duration-200 border-b border-slate-700/30 last:border-b-0"
                        onClick={() => handleSearchResultClick(result)}
                      >
                        {result.type === "profile" ? (
                          <>
                            {result.avatar_url ? (
                              <img
                                src={result.avatar_url || "/placeholder.svg"}
                                alt={result.username}
                                className="w-8 h-8 rounded-full mr-3 border border-slate-600/50"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center mr-3">
                                <User className="w-4 h-4 text-slate-400" />
                              </div>
                            )}
                            <span className="font-medium">{result.username}</span>
                          </>
                        ) : (
                          <>
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center mr-3">
                              <Network className="w-4 h-4 text-blue-400" />
                            </div>
                            <span className="font-medium">{result.title}</span>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>            {/* Navigation links in mobile menu */}
            <nav className="p-4" style={{ backgroundColor: '#0f172a' }}>
              <ul className="space-y-2">
                <li>
                  <Link
                    to="/mindmap"
                    className={`flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${isActive("/mindmap")}`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Network className="w-5 h-5 mr-3" />
                    Mindmap
                  </Link>
                </li>
                <li>
                  <Link
                    to="/chat"
                    className={`flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 relative ${isActive("/chat")}`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <MessageCircle className="w-5 h-5 mr-3" />
                    Chat
                    {chatUnreadCount > 0 && (
                      <span className="ml-auto bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow-lg">
                        {chatUnreadCount > 99 ? "99+" : chatUnreadCount}
                      </span>
                    )}
                  </Link>
                </li>
                <li>
                  <Link
                    to="/settings"
                    className={`flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${isActive("/settings")}`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Settings className="w-5 h-5 mr-3" />
                    Settings
                  </Link>
                </li>
                {username && (
                  <li>
                    <Link
                      to={`/${username}`}
                      className={`flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${isActive(`/${username}`)}`}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <User className="w-5 h-5 mr-3" />
                      Profile
                    </Link>
                  </li>
                )}
              </ul>
            </nav>
          </div>
        </>
      )}
    </header>
  )
}

export default LoggedInNavigation

