"use client"

import { useState, useEffect, useCallback } from "react"
import { useLocation } from "react-router-dom"
import { usePageTitle } from "../hooks/usePageTitle"
import { LoginForm } from "../components/LoginForm"
import { ChatMindMapNode } from "../components/ChatMindMapNode"
import { supabase } from "../supabaseClient"

// Move mindmap keys outside component to prevent recreation
const MINDMAP_KEYS = [
  "844c2fbc-9ae6-450b-8d08-e7de8bf6a149",
  "deaeed19-6dc9-431a-aa02-60268061a459",
  "5d4670ec-35ec-40f5-b68c-d95654611d26",
  "7e78558b-257e-4ddf-857c-3c5bfb64faa6",
  "ea24ec26-5c63-4628-af85-c5cfabdabb07",
]

export default function Home() {
  const [showCarousel, setShowCarousel] = useState(true)
  const [publicMaps, setPublicMaps] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const location = useLocation()
  const successMessage = location.state?.successMessage || ""

  usePageTitle("Welcome")

  // Memoize resize handler to prevent recreation
  const handleResize = useCallback(() => {
    setShowCarousel(window.innerWidth >= 1024)
  }, [])

  useEffect(() => {
    window.addEventListener("resize", handleResize)
    handleResize()

    return () => window.removeEventListener("resize", handleResize)
  }, [handleResize])

  // Fetch mindmaps only once on mount
  useEffect(() => {
    let isMounted = true

    const fetchMaps = async () => {
      try {
        setIsLoading(true)
        const { data, error } = await supabase.from("mindmaps").select("id, title, key").in("key", MINDMAP_KEYS)

        if (isMounted && !error && data) {
          setPublicMaps(data)
        }
      } catch (error) {
        console.error("Error fetching mindmaps:", error)
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    fetchMaps()

    return () => {
      isMounted = false
    }
  }, []) // Remove mindmapKeys dependency

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Enhanced Left Panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center relative">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/20 to-slate-800/20 backdrop-blur-3xl"></div>

        <div className="w-full max-w-md px-6 lg:px-8 relative z-10">
          {/* Enhanced Brand Title */}
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-white via-blue-100 to-purple-200 bg-clip-text text-transparent drop-shadow-2xl">
              MindMeet
            </h1>
            <p className="text-slate-400 text-lg font-medium">Connect minds, create together</p>
          </div>

          {/* Enhanced Login Form Container */}
          <div className="bg-gradient-to-br from-slate-800/40 to-slate-900/40 backdrop-blur-xl rounded-2xl p-8 border border-slate-700/30 shadow-2xl">
            <LoginForm successMessage={successMessage} />
          </div>
        </div>
      </div>

      {/* Enhanced Right Panel */}
      {showCarousel && (
        <div className="hidden lg:flex lg:w-1/2 items-center justify-center px-8 relative">
          {/* Background gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-l from-slate-900/60 to-transparent"></div>

          <div className="w-[400px] h-[600px] relative z-10 flex flex-col items-center">
            {/* Carousel container */}
            {isLoading ? (
              <div className="text-slate-400 text-center flex items-center justify-center h-full">
                Loading public mindmaps...
              </div>
            ) : publicMaps.length === 0 ? (
              <div className="text-slate-400 text-center flex items-center justify-center h-full">
                No mindmaps available
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="text-center mb-4">
                  <h3 className="text-xl font-semibold text-white mb-2">Explore Public Mindmaps</h3>
                  <p className="text-slate-400 text-sm">Scroll to discover more</p>
                </div>

                {/* Scrollable container */}
                <div className="flex-1 w-full overflow-y-auto scrollbar-hide scroll-smooth">
                  <div className="space-y-6 pb-4">
                    {publicMaps.map((map, index) => (
                      <div
                        key={map.id}
                        className="bg-gradient-to-br from-slate-800/20 to-slate-900/20 backdrop-blur-sm rounded-2xl p-4 border border-slate-700/20 shadow-2xl w-full min-h-[280px] flex items-center justify-center scroll-snap-align-start"
                      >
                        <ChatMindMapNode id={map.id} data={{ label: map.title, mapId: map.id }} isConnectable={false} />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Scroll indicator */}
                <div className="mt-4 flex items-center gap-2">
                  <div className="w-1 h-8 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="w-full bg-gradient-to-b from-blue-500 to-purple-500 rounded-full transition-all duration-300"
                      style={{ height: `${Math.min(100, (2 / publicMaps.length) * 100)}%` }}
                    ></div>
                  </div>
                  <span className="text-slate-400 text-xs">{publicMaps.length} mindmaps</span>
                </div>
              </>
            )}

            {/* Decorative elements */}
            <div className="absolute -top-4 -right-4 w-24 h-24 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full blur-xl"></div>
            <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-full blur-xl"></div>
          </div>
        </div>
      )}
    </div>
  )
}
