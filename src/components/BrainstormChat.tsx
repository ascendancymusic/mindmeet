"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { MessageCircle, Bot, Users, X, Move } from "lucide-react"

interface Collaborator {
  id: string
  username: string
  avatarUrl?: string
}

import { supabase } from "../supabaseClient";

interface BrainstormChatProps {
  isOpen: boolean
  onClose: () => void
  username?: string
  userId?: string
  collaborators?: Collaborator[]
}

const BrainstormChat: React.FC<BrainstormChatProps> = ({ isOpen, onClose, username, userId, collaborators }) => {
  const hasCollab = Array.isArray(collaborators) && collaborators.length > 0
  const [activeTab, setActiveTab] = useState<"collab" | "ai">(hasCollab ? "collab" : "ai")

  const [collabMessages, setCollabMessages] = useState<string[]>([])
  const [aiMessages, setAiMessages] = useState<{ user: string; text: string; time: string }[]>([
    {
      user: "Mystical nordic prophet",
      text: "How can I help you with this mindmap?",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ])

  const [collabInput, setCollabInput] = useState("")
  const [aiInput, setAiInput] = useState("")
  const chatEndRef = useRef<HTMLDivElement>(null)

  const panelRef = useRef<HTMLDivElement>(null)
  const [panelSize, setPanelSize] = useState({ width: 400, height: 350 })
  const [isResizing, setIsResizing] = useState(false)
  const [resizeStart, setResizeStart] = useState<{
    mouseX: number
    mouseY: number
    width: number
    height: number
    left: number
    top: number
  } | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState<{ mouseX: number; mouseY: number; left: number; top: number } | null>(null)
  const [panelPos, setPanelPos] = useState<{ left: number; top: number }>(() => {
    const padding = 24
    if (typeof window !== "undefined") {
      return {
        left: window.innerWidth - 400 - padding,
        top: window.innerHeight - 350 - padding,
      }
    }
    return { left: 100, top: 100 }
  })

  useEffect(() => {
    if (!isOpen) return
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [collabMessages, aiMessages, activeTab, isOpen])

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (isResizing && resizeStart) {
        const dx = e.clientX - resizeStart.mouseX
        const dy = e.clientY - resizeStart.mouseY
        const minWidth = 350
        const minHeight = 250
        const NAVBAR_HEIGHT = 56
        let newWidth = resizeStart.width - dx
        let newHeight = resizeStart.height - dy
        let newLeft = resizeStart.left + dx
        let newTop = resizeStart.top + dy

        if (newWidth < minWidth) {
          newLeft = resizeStart.left + (resizeStart.width - minWidth)
          newWidth = minWidth
          if (newLeft < 0) newLeft = 0
        }
        if (newHeight < minHeight) {
          newTop = resizeStart.top + (resizeStart.height - minHeight)
          newHeight = minHeight
        }

        if (newTop < NAVBAR_HEIGHT) {
          newHeight = newHeight - (NAVBAR_HEIGHT - newTop)
          newTop = NAVBAR_HEIGHT
          if (newHeight < minHeight) {
            newHeight = minHeight
          }
        }

        if (newLeft < 0) newLeft = 0
        if (newLeft + newWidth > window.innerWidth) {
          newLeft = window.innerWidth - newWidth
        }
        if (newTop + newHeight > window.innerHeight) {
          newTop = window.innerHeight - newHeight
        }

        setPanelSize({ width: newWidth, height: newHeight })
        setPanelPos({ left: newLeft, top: newTop })
      } else if (isDragging && dragStart) {
        const dx = e.clientX - dragStart.mouseX
        const dy = e.clientY - dragStart.mouseY
        const NAVBAR_HEIGHT = 56
        const newLeft = Math.max(0, Math.min(dragStart.left + dx, window.innerWidth - panelSize.width))
        const newTop = Math.max(NAVBAR_HEIGHT, Math.min(dragStart.top + dy, window.innerHeight - panelSize.height))
        setPanelPos({
          left: newLeft,
          top: newTop,
        })
      }
    }
    function onMouseUp() {
      setIsResizing(false)
      setIsDragging(false)
    }
    if (isResizing || isDragging) {
      window.addEventListener("mousemove", onMouseMove)
      window.addEventListener("mouseup", onMouseUp)
    }
    return () => {
      window.removeEventListener("mousemove", onMouseMove)
      window.removeEventListener("mouseup", onMouseUp)
    }
  }, [isResizing, resizeStart, isDragging, dragStart, panelSize.width, panelSize.height])

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (activeTab === "collab") {
      if (collabInput.trim() === "") return
      setCollabMessages([...collabMessages, collabInput])
      setCollabInput("")
    } else {
      if (aiInput.trim() === "") return
      setAiMessages([
        ...aiMessages,
        {
          user: username || "You",
          text: aiInput,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ])
      setAiInput("")
    }
  }


  // Track if avatar image failed to load
  const [avatarError, setAvatarError] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);

  // Fetch avatarUrl from Supabase profiles table when userId changes
  useEffect(() => {
    if (!userId) {
      setAvatarUrl(undefined);
      return;
    }
    let isMounted = true;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('avatar_url')
          .eq('id', userId)
          .single();
        if (isMounted) {
          if (!error && data?.avatar_url) {
            setAvatarUrl(data.avatar_url);
          } else {
            setAvatarUrl(undefined);
          }
        }
      } catch {
        if (isMounted) setAvatarUrl(undefined);
      }
    })();
    return () => { isMounted = false; };
  }, [userId]);

  if (!isOpen) return null

  return (
    <div
      className="fixed z-50"
      style={{ left: panelPos.left, top: panelPos.top, width: panelSize.width, height: panelSize.height }}
    >
      <div
        ref={panelRef}
        className="bg-gradient-to-br from-slate-800/95 via-slate-900/95 to-purple-900/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/10 flex flex-col overflow-hidden relative w-full h-full"
        style={{ minHeight: 250, minWidth: 350 }}
      >
        {/* Subtle glow effect */}
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-blue-500/5 to-purple-600/5 pointer-events-none" />

        {/* Custom resize handle at top left */}
        <div
          onMouseDown={e => {
            setIsResizing(true);
            setResizeStart({
              mouseX: e.clientX,
              mouseY: e.clientY,
              width: panelSize.width,
              height: panelSize.height,
              left: panelPos.left,
              top: panelPos.top,
            });
            e.preventDefault();
            e.stopPropagation();
          }}
          className="absolute top-0 left-0 w-4 h-4 cursor-nwse-resize z-10 rounded-tl-2xl flex items-center justify-center group"
          title="Resize"
        >
          {/* Classic resize handle: three diagonal lines */}
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
            <line x1="2" y1="12" x2="12" y2="2" stroke="currentColor" strokeWidth="1.2"/>
            <line x1="2" y1="8" x2="8" y2="2" stroke="currentColor" strokeWidth="1.2"/>
            <line x1="6" y1="12" x2="12" y2="6" stroke="currentColor" strokeWidth="1.2"/>
          </svg>
          <style>{`
            .group svg { color: #94a3b8; transition: color 0.15s; } /* text-slate-400 */
            .group:hover svg { color: #fff; }
          `}</style>
        </div>

        {/* Header (draggable) */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-gradient-to-r from-slate-800/60 to-slate-900/60 backdrop-blur-sm rounded-t-3xl select-none cursor-move"
          onMouseDown={(e) => {
            if ((e.target as HTMLElement).closest("button, .chat-tab")) return
            setIsDragging(true)
            setDragStart({
              mouseX: e.clientX,
              mouseY: e.clientY,
              left: panelPos.left,
              top: panelPos.top,
            })
            e.preventDefault()
          }}
        >
          <div className="flex items-center gap-1">
            {hasCollab && (
              <button
                className={`chat-tab px-4 py-2 rounded-xl font-medium text-sm transition-all flex items-center gap-2 ${
                  activeTab === "collab"
                    ? "bg-gradient-to-r from-blue-500/20 to-cyan-600/20 text-white border border-blue-400/30 shadow-lg shadow-blue-500/10"
                    : "text-slate-400 hover:text-white hover:bg-white/5 border border-transparent"
                }`}
                onClick={() => setActiveTab("collab")}
                type="button"
              >
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline">Collaboration</span>
              </button>
            )}
            <button
              className={`chat-tab px-4 py-2 rounded-xl font-medium text-sm transition-all flex items-center gap-2 ${
                activeTab === "ai"
                  ? "bg-gradient-to-r from-purple-500/20 to-blue-600/20 text-white border border-purple-400/30 shadow-lg shadow-purple-500/10"
                  : "text-slate-400 hover:text-white hover:bg-white/5 border border-transparent"
              }`}
              onClick={() => setActiveTab("ai")}
              type="button"
            >
              <Bot className="w-4 h-4" />
              <span className="hidden sm:inline">AI Chat</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Move className="w-4 h-4 text-slate-500" />
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all hover:scale-105"
              title="Close chat"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Chat messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-600/50 scrollbar-track-transparent">
          {activeTab === "collab" ? (
            collabMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-500/10 to-purple-600/10 border border-blue-400/20 mb-4">
                  <MessageCircle className="w-8 h-8 text-blue-300 mx-auto mb-2" />
                </div>
                <div className="text-slate-300 font-medium mb-1">Start brainstorming!</div>
                <div className="text-slate-500 text-sm">Share ideas with your team</div>
              </div>
            ) : (
              <div className="space-y-3">
                {collabMessages.map((msg, idx, arr) => {
                  // For demo: treat all messages as from current user, with fake timestamps
                  // In real app, use message.user and message.timestamp
                  const now = Date.now();
                  const fifteenMins = 15 * 60 * 1000;
                  // Simulate timestamps: oldest first
                  const msgTime = now - (arr.length - idx - 1) * 2 * 60 * 1000; // 2 min apart
                  let showHeader = true;
                  if (idx > 0) {
                    // Previous message time
                    const prevTime = now - (arr.length - idx) * 2 * 60 * 1000;
                    // If previous is same user and within 15 mins, group
                    showHeader = false;
                    if (msgTime - prevTime > fifteenMins) showHeader = true;
                  }
                  return (
                    <div key={idx} className="group">
                      <div className={`flex items-center gap-3 ${showHeader ? 'py-2' : 'py-0'} hover:bg-white/5 rounded-xl transition-all`}>
                        {showHeader && (
                          (typeof avatarUrl === "string" && avatarUrl.trim() !== "" && !avatarError) ? (
                            <img
                              src={avatarUrl}
                              alt={username || "User"}
                                className="w-8 h-8 rounded-full object-cover flex-shrink-0 bg-gradient-to-br from-blue-400 to-cyan-500"
                              onError={() => setAvatarError(true)}
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                              {(username || "U")[0].toUpperCase()}
                            </div>
                          )
                        )}
                        {!showHeader && (
                          <div className="w-8 h-8 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          {showHeader && (
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-semibold text-blue-300">{username}</span>
                              <span className="text-xs text-slate-500">(you)</span>
                              <span className="text-xs text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                {new Date(msgTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </div>
                          )}
                          <div className="flex items-center">
                            <div className="text-white text-sm leading-relaxed break-words">{msg}</div>
                            {!showHeader && (
                              <span className="text-xs text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                                {new Date(msgTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {/* Only show divider if next message is not grouped (i.e., next is a header) */}
                      {idx < collabMessages.length - 1 && (
                        <div className={`h-px bg-gradient-to-r from-transparent via-white/10 to-transparent ${showHeader ? 'my-2' : 'my-0.5'}`} />
                      )}
                    </div>
                  );
                })}
              </div>
            )
          ) : aiMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-500/10 to-blue-600/10 border border-purple-400/20 mb-4">
                <Bot className="w-8 h-8 text-purple-300 mx-auto mb-2" />
              </div>
              <div className="text-slate-300 font-medium mb-1">AI Assistant Ready</div>
              <div className="text-slate-500 text-sm">Ask me anything about your mindmap</div>
            </div>
          ) : (
            <div className="space-y-3">
              {aiMessages.map((msg, idx) => {
                const isAI = msg.user === "Mystical nordic prophet"
                const isMe = !isAI && msg.user === (username || "You")

                return (
                  <div key={idx} className="group">
                    <div className="flex items-center gap-3 py-2 hover:bg-white/5 rounded-xl transition-all">
                      {/* Avatar for user or AI */}
                      {isAI ? (
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 bg-gradient-to-br from-purple-400 to-blue-500">
                          <Bot className="w-4 h-4" />
                        </div>
                      ) : (typeof avatarUrl === "string" && avatarUrl.trim() !== "" && !avatarError) ? (
                        <img
                          src={avatarUrl}
                          alt={username || "User"}
                            className="w-8 h-8 rounded-full object-cover flex-shrink-0 bg-gradient-to-br from-blue-400 to-cyan-500"
                          onError={() => setAvatarError(true)}
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                          {(msg.user[0] || "U").toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-sm font-semibold ${isAI ? "text-purple-300" : "text-cyan-300"}`}>
                            {msg.user}
                          </span>
                          {isAI && <span className="text-xs text-slate-500">(AI)</span>}
                          {isMe && <span className="text-xs text-slate-500">(you)</span>}
                          <span className="text-xs text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">
                            {msg.time}
                          </span>
                        </div>
                        <div className="text-white text-sm leading-relaxed break-words">{msg.text}</div>
                      </div>
                    </div>
                    {idx < aiMessages.length - 1 && (
                      <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent my-2" />
                    )}
                  </div>
                )
              })}
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input */}
        <form
          onSubmit={handleSend}
          className="flex items-center gap-3 px-6 py-4 border-t border-white/10 bg-gradient-to-r from-slate-800/60 to-slate-900/60 backdrop-blur-sm rounded-b-3xl"
        >
          <div className="flex-1 relative">
            <input
              type="text"
              className="w-full px-4 py-3 rounded-2xl bg-white/5 backdrop-blur-sm text-white placeholder-slate-400 border border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/30 transition-all duration-200"
              placeholder={activeTab === "collab" ? "Share your thoughts..." : "Ask the AI assistant..."}
              value={activeTab === "collab" ? collabInput : aiInput}
              onChange={(e) => (activeTab === "collab" ? setCollabInput(e.target.value) : setAiInput(e.target.value))}
              autoFocus
            />
          </div>
          <button
            type="submit"
            className={`px-6 py-3 rounded-2xl font-medium transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 ${
              activeTab === "collab"
                ? "bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white shadow-lg shadow-blue-500/25 focus:ring-blue-400/50"
                : "bg-gradient-to-r from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700 text-white shadow-lg shadow-purple-500/25 focus:ring-purple-400/50"
            }`}
            disabled={activeTab === "collab" ? collabInput.trim() === "" : aiInput.trim() === ""}
          >
            Send
          </button>
        </form>
      </div>
    </div>
  )
}

export default BrainstormChat
