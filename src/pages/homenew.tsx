"use client"

import { useState, useEffect, useCallback, useRef } from "react"
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
  const [scrollPosition, setScrollPosition] = useState(0)
  const animationRef = useRef<number>()
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
          // Duplicate the maps to create seamless loop
          const duplicatedMaps = [...data, ...data]
          setPublicMaps(duplicatedMaps)
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
  }, [])

  // Continuous scrolling animation
  useEffect(() => {
    if (publicMaps.length === 0) return

    const animate = () => {
      setScrollPosition((prev) => {
        const itemHeight = 500
        const maxScroll = (publicMaps.length / 2) * itemHeight

        if (prev >= maxScroll) {
          return 0
        }
        return prev + 0.5
      })

      animationRef.current = requestAnimationFrame(animate)
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [publicMaps.length])

  // Pause/resume handlers
  const handleMouseEnter = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
    }
  }, [])

  const handleMouseLeave = useCallback(() => {
    if (publicMaps.length === 0) return

    const animate = () => {
      setScrollPosition((prev) => {
        const itemHeight = 500
        const maxScroll = (publicMaps.length / 2) * itemHeight

        if (prev >= maxScroll) {
          return 0
        }
        return prev + 0.5
      })

      animationRef.current = requestAnimationFrame(animate)
    }

    animationRef.current = requestAnimationFrame(animate)
  }, [publicMaps.length])

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Enhanced Left Panel */}
      <div className="w-full lg:w-2/5 flex items-center justify-center relative">
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

      {/* Enhanced Right Panel - Much Larger */}
      {showCarousel && (
        <div className="hidden lg:flex lg:w-3/5 items-center justify-center px-8 relative">
          {/* Background gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-l from-slate-900/60 to-transparent"></div>

          <div className="w-full max-w-2xl h-[700px] relative z-10 flex flex-col items-center">
            {/* Carousel container */}
            {isLoading ? (
              <div className="text-slate-400 text-center flex items-center justify-center h-full">
                <div className="animate-pulse text-xl">Loading public mindmaps...</div>
              </div>
            ) : publicMaps.length === 0 ? (
              <div className="text-slate-400 text-center flex items-center justify-center h-full">
                <div className="text-xl">No mindmaps available</div>
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-semibold text-white mb-3">Explore Public Mindmaps</h3>
                  <p className="text-slate-400 text-base">Auto-scrolling showcase</p>
                </div>

                {/* Continuous scrolling container */}
                <div
                  className="flex-1 w-full overflow-hidden relative mask-gradient"
                  onMouseEnter={handleMouseEnter}
                  onMouseLeave={handleMouseLeave}
                >
                  <div
                    className="flex flex-col"
                    style={{
                      transform: `translateY(-${scrollPosition}px)`,
                    }}
                  >
                    {publicMaps.map((map, index) => (
                      <div
                        key={`${map.id}-${index}`}
                        className="bg-gradient-to-br from-slate-800/30 to-slate-900/30 backdrop-blur-sm rounded-3xl p-8 border border-slate-700/30 shadow-2xl w-full h-[450px] flex items-center justify-center mb-12 flex-shrink-0"
                      >
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="w-[400px] h-full flex items-center justify-center">
                            <ChatMindMapNode
                              id={map.id}
                              data={{ label: map.title, mapId: map.id }}
                              isConnectable={false}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Status indicator */}
                <div className="mt-6 flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full bg-green-500 animate-pulse`} />
                    <span className="text-slate-400 text-sm">Auto-scrolling</span>
                  </div>
                  <span className="text-slate-500 text-sm">•</span>
                  <span className="text-slate-400 text-sm">{publicMaps.length / 2} mindmaps</span>
                </div>

                {/* Hover instruction */}
                <div className="mt-2 text-slate-500 text-sm opacity-70">Hover to pause</div>
              </>
            )}

            {/* Decorative elements */}
            <div className="absolute -top-6 -right-6 w-32 h-32 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full blur-xl"></div>
            <div className="absolute -bottom-6 -left-6 w-40 h-40 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-full blur-xl"></div>
          </div>
        </div>
      )}

      <style jsx>{`
        .mask-gradient {
          mask-image: linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%);
          -webkit-mask-image: linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%);
        }
      `}</style>
    </div>
  )
}
