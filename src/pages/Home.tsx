"use client"

import { useState, useEffect, useCallback } from "react"
import { useLocation } from "react-router-dom"
import { usePageTitle } from "../hooks/usePageTitle"
import { LoginForm } from "../components/LoginForm"
import { ChatMindMapNode } from "../components/ChatMindMapNode"
import { supabase } from "../supabaseClient"
import "../styles/carousel.css"

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

        <div className="w-full max-w-md px-6 lg:px-8 relative z-10" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
          {/* Enhanced Brand Title */}
          <div className="text-center mb-12">
            <h1 className="text-5xl md:text-4xl sm:text-3xl font-bold mb-4 bg-gradient-to-r from-white via-blue-100 to-purple-200 bg-clip-text text-transparent drop-shadow-2xl">
              MindMeet
            </h1>
            <p className="text-slate-400 text-lg md:text-base sm:text-sm font-medium">Connect minds, create together</p>
          </div>

          {/* Enhanced Login Form Container */}
          <div className="bg-gradient-to-br from-slate-800/40 to-slate-900/40 backdrop-blur-xl rounded-2xl p-8 md:p-6 sm:p-4 border border-slate-700/30 shadow-2xl" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
            <LoginForm successMessage={successMessage} />
          </div>
        </div>
      </div>

      {/* Enhanced Right Panel */}
      {showCarousel && (
        <div className="w-full lg:w-1/2 flex items-center justify-center relative">
          <div className="w-full max-w-md px-6 lg:px-8 relative z-10" style={{ maxHeight: '95vh', overflowY: 'hidden' }}>
            {isLoading ? (
              <div className="text-slate-400 text-center flex items-center justify-center h-full">
                Loading public mindmaps...
              </div>
            ) : publicMaps.length === 0 ? (
              <div className="text-slate-400 text-center flex items-center justify-center h-full">
                No mindmaps available
              </div>
            ) : (
              <div className="h-full relative overflow-hidden">
                <div className="flex flex-col space-y-6 continuous-scroll">
                  {/* First set of mindmaps */}
                  {publicMaps.map((map) => (
                    <div key={`first-${map.id}`} className="w-full min-h-[280px] flex items-center justify-center flex-shrink-0">
                      <ChatMindMapNode id={map.id} data={{ label: map.title, mapId: map.id }} isConnectable={false} />
                    </div>
                  ))}
                  {/* Duplicate set for seamless loop */}
                  {publicMaps.map((map) => (
                    <div key={`second-${map.id}`} className="w-full min-h-[280px] flex items-center justify-center flex-shrink-0">
                      <ChatMindMapNode id={map.id} data={{ label: map.title, mapId: map.id }} isConnectable={false} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Decorative elements */}
          <div className="absolute -top-4 -right-4 w-24 h-24 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full blur-xl"></div>
          <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-full blur-xl"></div>
        </div>
      )}
    </div>
  )
}
