"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useSearchParams } from "react-router-dom"
import { supabase } from "../supabaseClient"
import { User, Network, Search, Users, FileText, Sparkles, ArrowUpDown, UserPlus } from "lucide-react"

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

const SearchPage: React.FC = () => {
  const [searchParams] = useSearchParams()
  const query = searchParams.get("q")
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [activeFilter, setActiveFilter] = useState<"all" | "profiles" | "mindmaps">("all")

  useEffect(() => {
    const handleSearch = async () => {
      if (!query || query.trim() === "") {
        setSearchResults([])
        return
      }

      setLoading(true)

      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, full_name")
        .ilike("username", `%${query}%`)

      const { data: mindmapsData, error: mindmapsError } = await supabase
        .from("mindmaps")
        .select("id, title, username, permalink")
        .ilike("title", `%${query}%`)

      if (profilesError || mindmapsError) {
        console.error("Error searching:", profilesError || mindmapsError)
        setSearchResults([])
      } else {
        setSearchResults([
          ...(profilesData || []).map((profile) => ({ type: "profile", ...profile })),
          ...(mindmapsData || []).map((mindmap) => ({ type: "mindmap", ...mindmap })),
        ])
      }
      setLoading(false)
    }

    handleSearch()
  }, [query])

  const getResultUrl = (result: any) => {
    if (result.type === "profile" && result.username) {
      return `/${result.username}`
    } else if (result.type === "mindmap" && result.username && result.permalink) {
      return `/${result.username}/${result.permalink}`
    }
    return "#"
  }

  const filteredResults = searchResults.filter((result) => {
    if (activeFilter === "all") return true
    if (activeFilter === "profiles") return result.type === "profile"
    if (activeFilter === "mindmaps") return result.type === "mindmap"
    return true
  })

  const profileCount = searchResults.filter((r) => r.type === "profile").length
  const mindmapCount = searchResults.filter((r) => r.type === "mindmap").length

  const getMockFollowers = (username: string) => {
    const followers = [
      { username: "alice_dev", count: 1234 },
      { username: "bob_designer", count: 567 },
      { username: "charlie_pm", count: 2890 },
      { username: "diana_writer", count: 445 },
      { username: "eve_artist", count: 1567 },
    ]
    const mockData = followers.find((f) => f.username === username) || { count: Math.floor(Math.random() * 1000) + 50 }
    return mockData.count
  }

  const LoadingSkeleton = () => (
    <div className="space-y-[2vh]">
      {[...Array(6)].map((_, index) => (
        <div
          key={index}
          className="bg-gradient-to-br from-slate-800/70 via-slate-900/90 to-slate-800/70 backdrop-blur-xl rounded-2xl p-[2vh] border border-slate-700/30 shadow-xl animate-pulse"
          style={{ animationDelay: `${index * 100}ms` }}
        >
          <div className="flex items-center space-x-[1.5vh]">
            <div className="w-[5vh] h-[5vh] rounded-full bg-slate-700/50 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-600/20 to-transparent animate-shimmer"></div>
            </div>
            <div className="flex-1 space-y-[0.8vh]">
              <div className="h-[2vh] bg-slate-700/50 rounded-lg w-3/4 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-600/20 to-transparent animate-shimmer"></div>
              </div>
              <div className="h-[1.5vh] bg-slate-700/30 rounded w-1/2 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-600/20 to-transparent animate-shimmer"></div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )

  const EmptyState = () => (
    <div className="text-center py-[8vh]">
      <div className="w-[8vh] h-[8vh] mx-auto mb-[3vh] bg-gradient-to-br from-slate-700/50 to-slate-800/50 rounded-2xl flex items-center justify-center border border-slate-600/30">
        <Search className="w-[4vh] h-[4vh] text-slate-400" />
      </div>
      <h3 className="text-[2vh] font-semibold text-slate-300 mb-[1vh]">No results found</h3>
      <p className="text-[1.4vh] text-slate-400 max-w-md mx-auto leading-relaxed">
        We couldn't find any {activeFilter === "all" ? "results" : activeFilter} matching "{query}". Try adjusting your
        search terms or explore different categories.
      </p>
      <div className="mt-[3vh] flex items-center justify-center space-x-[1vh] text-[1.2vh] text-slate-500">
        <Sparkles className="w-[1.5vh] h-[1.5vh]" />
        <span>Try searching for usernames or mindmap titles</span>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen p-[2vh]">
      <div className="max-w-4xl mx-auto">
        <div className="mb-[3vh]">
          <div className="flex items-center space-x-[1vh] mb-[2vh]">
            <div className="p-[1vh] bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-2xl border border-white/10">
              <Search className="w-[2.5vh] h-[2.5vh] text-blue-300" />
            </div>
            <div>
              <h1 className="text-[3vh] font-bold bg-gradient-to-r from-white via-blue-100 to-purple-200 bg-clip-text text-transparent">
                Search Results
              </h1>
              <p className="text-[1.4vh] text-slate-400 mt-[0.5vh]">
                {query && (
                  <>
                    Found {filteredResults.length} result{filteredResults.length !== 1 ? "s" : ""} for "
                    <span className="text-blue-300 font-medium">{query}</span>"
                  </>
                )}
              </p>
            </div>
          </div>

          {query && !loading && searchResults.length > 0 && (
            <div className="flex items-center justify-between bg-slate-800/50 backdrop-blur-sm rounded-2xl p-[0.8vh] border border-slate-700/30">
              <div className="flex items-center space-x-[1vh]">
                <button
                  onClick={() => setActiveFilter("all")}
                  className={`flex items-center space-x-[0.8vh] px-[1.5vh] py-[0.8vh] rounded-xl text-[1.3vh] font-medium transition-all duration-200 ${
                    activeFilter === "all"
                      ? "bg-gradient-to-r from-blue-600/90 to-purple-600/90 text-white shadow-lg shadow-blue-500/25 backdrop-blur-sm border border-blue-500/30"
                      : "text-slate-400 hover:text-slate-300 hover:bg-slate-700/30 border border-transparent"
                  }`}
                >
                  <FileText className="w-[1.5vh] h-[1.5vh]" />
                  <span>All ({searchResults.length})</span>
                </button>
                <button
                  onClick={() => setActiveFilter("profiles")}
                  className={`flex items-center space-x-[0.8vh] px-[1.5vh] py-[0.8vh] rounded-xl text-[1.3vh] font-medium transition-all duration-200 ${
                    activeFilter === "profiles"
                      ? "bg-gradient-to-r from-blue-600/90 to-purple-600/90 text-white shadow-lg shadow-blue-500/25 backdrop-blur-sm border border-blue-500/30"
                      : "text-slate-400 hover:text-slate-300 hover:bg-slate-700/30 border border-transparent"
                  }`}
                >
                  <Users className="w-[1.5vh] h-[1.5vh]" />
                  <span>People ({profileCount})</span>
                </button>
                <button
                  onClick={() => setActiveFilter("mindmaps")}
                  className={`flex items-center space-x-[0.8vh] px-[1.5vh] py-[0.8vh] rounded-xl text-[1.3vh] font-medium transition-all duration-200 ${
                    activeFilter === "mindmaps"
                      ? "bg-gradient-to-r from-blue-600/90 to-purple-600/90 text-white shadow-lg shadow-blue-500/25 backdrop-blur-sm border border-blue-500/30"
                      : "text-slate-400 hover:text-slate-300 hover:bg-slate-700/30 border border-transparent"
                  }`}
                >
                  <Network className="w-[1.5vh] h-[1.5vh]" />
                  <span>Mindmaps ({mindmapCount})</span>
                </button>
              </div>

              <div className="relative">
                <button className="flex items-center space-x-[0.8vh] px-[1.5vh] py-[0.8vh] rounded-xl text-[1.3vh] font-medium text-slate-400 hover:text-slate-300 hover:bg-slate-700/30 border border-transparent transition-all duration-200">
                  <ArrowUpDown className="w-[1.5vh] h-[1.5vh]" />
                  <span>Sort</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {loading && <LoadingSkeleton />}

        {!loading && query && filteredResults.length === 0 && <EmptyState />}

        {!loading && filteredResults.length > 0 && (
          <div className="space-y-[1.5vh]">
            {filteredResults.map((result, index) => (
              <a
                key={`${result.type}-${result.id}`}
                href={getResultUrl(result)}
                className="group block bg-gradient-to-br from-slate-800/70 via-slate-900/90 to-slate-800/70 backdrop-blur-xl rounded-2xl p-[2vh] border border-slate-700/30 hover:border-slate-600/50 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] hover:bg-gradient-to-br hover:from-slate-800/80 hover:via-slate-900/95 hover:to-slate-800/80 no-underline"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-center space-x-[2vh]">
                  {result.type === "profile" ? (
                    <>
                      <div className="relative">
                        {result.avatar_url ? (
                          <img
                            src={result.avatar_url || "/placeholder.svg"}
                            alt={result.username}
                            className="w-[5vh] h-[5vh] rounded-full border-2 border-slate-600/50 group-hover:border-blue-400/50 transition-all duration-300 shadow-lg"
                          />
                        ) : (
                          <div className="w-[5vh] h-[5vh] rounded-full bg-gradient-to-br from-slate-700/80 to-slate-800/80 flex items-center justify-center border-2 border-slate-600/50 group-hover:border-blue-400/50 transition-all duration-300 shadow-lg">
                            <User className="w-[2.5vh] h-[2.5vh] text-slate-400 group-hover:text-blue-400 transition-colors duration-300" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-[1.8vh] font-semibold text-white group-hover:text-blue-300 transition-colors duration-300 truncate mb-[0.5vh]">
                          @{result.username}
                        </h3>
                        {result.full_name && (
                          <p className="text-[1.4vh] text-slate-400 group-hover:text-slate-300 transition-colors duration-300 truncate mb-[0.5vh]">
                            {result.full_name}
                          </p>
                        )}
                        <div className="flex items-center space-x-[1vh] text-[1.2vh] text-slate-500 group-hover:text-slate-400">
                          <div className="flex items-center space-x-[0.5vh]">
                            <Users className="w-[1.2vh] h-[1.2vh]" />
                            <span>{getMockFollowers(result.username).toLocaleString()} followers</span>
                          </div>
                        </div>
                      </div>
                      <div className="ml-auto pl-4 self-center">
                        <button className="flex items-center space-x-[0.8vh] px-[1.2vh] py-[0.8vh] rounded-xl bg-slate-700/50 hover:bg-slate-700/80 text-slate-300 hover:text-white font-medium text-[1.3vh] transition-all duration-200 border border-slate-600/50 opacity-0 group-hover:opacity-100 -translate-x-4 group-hover:translate-x-0">
                          <UserPlus className="w-[1.5vh] h-[1.5vh]" />
                          <span>Follow</span>
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="relative">
                        <div className="w-[5vh] h-[5vh] rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center border border-white/10 group-hover:border-blue-400/50 transition-all duration-300 shadow-lg">
                          <Network className="w-[2.5vh] h-[2.5vh] text-blue-400 group-hover:text-blue-300 transition-colors duration-300" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-[1.8vh] font-semibold text-white group-hover:text-purple-300 transition-colors duration-300 truncate mb-[0.5vh]">
                          {result.title}
                        </h3>
                        <p className="text-[1.4vh] text-slate-400 group-hover:text-slate-300 transition-colors duration-300 truncate">
                          Created by @{result.username}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </a>
            ))}
          </div>
        )}

        {!query && (
          <div className="text-center py-[8vh]">
            <div className="w-[8vh] h-[8vh] mx-auto mb-[3vh] bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-2xl flex items-center justify-center border border-white/10">
              <Search className="w-[4vh] h-[4vh] text-blue-400" />
            </div>
            <h3 className="text-[2vh] font-semibold text-slate-300 mb-[1vh]">Start your search</h3>
            <p className="text-[1.4vh] text-slate-400 max-w-md mx-auto leading-relaxed">
              Search for people, mindmaps, and discover amazing content from the community.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default SearchPage
