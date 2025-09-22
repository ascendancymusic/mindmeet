"use client"

import type React from "react"
import { useState, useRef, useEffect, useMemo } from "react"
import { MessageCircle, Bot, Users, X, Move } from "lucide-react"
import ChatTypingIndicator from "./ChatTypingIndicator"
import MarkdownRenderer from "./MarkdownRenderer"
import { supabase } from "../supabaseClient"
import { aiBots } from "../config/aiBot"
import { useCollaborationStore } from "../store/collaborationStore"

interface Collaborator {
  id: string
  username: string
  avatarUrl?: string
}

interface ChatMessage {
  id: string
  user: string
  message: string
  timestamp: Date
  avatar?: string
}

interface UserProfile {
  username: string
  avatar_url?: string
}

interface BrainstormChatProps {
  isOpen: boolean
  onClose: () => void
  username?: string
  userId?: string
  collaborators?: Collaborator[]
  mindMapData?: any
  onGiveMindmapContext?: (mindMapData: any) => void
  mindMapId?: string
  onIncomingCollabMessage?: (msg: { id: string; user: string; message: string; timestamp: Date }) => void
}

const BrainstormChat: React.FC<BrainstormChatProps> = ({
  isOpen,
  onClose,
  username,
  // userId,
  collaborators,
  mindMapData,
  onGiveMindmapContext,
  mindMapId,
  onIncomingCollabMessage,
}) => {
  const [isChatOpen, setIsChatOpen] = useState(false)
  const hasCollab = Array.isArray(collaborators) && collaborators.length > 0
  const [activeTab, setActiveTab] = useState<"collab" | "ai">(hasCollab ? "collab" : "ai")

  useEffect(() => {
    if (!isOpen) return
    if (hasCollab && activeTab !== "collab") setActiveTab("collab")
    if (!hasCollab && activeTab !== "ai") setActiveTab("ai")
    // eslint-disable-next-line
  }, [isOpen, hasCollab])

  // Realtime collaboration chat state
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const messagesRef = useRef<ChatMessage[]>([])
  const [collabInput, setCollabInput] = useState("")
  const chatEndRef = useRef<HTMLDivElement>(null)
  const chatChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const [userProfiles, setUserProfiles] = useState<Record<string, UserProfile>>({})
  const [readReceipts, setReadReceipts] = useState<Record<string, string[]>>({})
  const lastReadSentRef = useRef<string | null>(null)
  const currentUserName = username || "Anonymous"
  const resolvedMindMapId = useMemo(
    () => mindMapId || useCollaborationStore.getState().currentMindMapId || undefined,
    [mindMapId]
  )

  // AI chat state
  const [aiMessages, setAiMessages] = useState<{ user: string; text: string; time: string }[]>([
    {
      user: "Mystical nordic prophet",
      text: "How can I help you with this mindmap?",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ])
  const [aiInput, setAiInput] = useState("")
  const [aiLoading, setAiLoading] = useState(false)
  const [aiStreamingText, setAiStreamingText] = useState<string | null>(null)
  const [currentUserAvatar, setCurrentUserAvatar] = useState<string | undefined>(undefined)

  // Panel UI state
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
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, aiMessages, activeTab, isOpen])

  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  // Prefetch current user's avatar for AI tab using the same cached fetch as collab
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      if (!username) return
      const avatar = await getUserAvatar(username)
      if (!cancelled) setCurrentUserAvatar(avatar)
    }
    load()
    return () => { cancelled = true }
  }, [username])

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
          if (newHeight < minHeight) newHeight = minHeight
        }

        if (newLeft < 0) newLeft = 0
        if (newLeft + newWidth > window.innerWidth) newLeft = window.innerWidth - newWidth
        if (newTop + newHeight > window.innerHeight) newTop = window.innerHeight - newHeight

        setPanelSize({ width: newWidth, height: newHeight })
        setPanelPos({ left: newLeft, top: newTop })
      } else if (isDragging && dragStart) {
        const dx = e.clientX - dragStart.mouseX
        const dy = e.clientY - dragStart.mouseY
        const NAVBAR_HEIGHT = 56
        const newLeft = Math.max(0, Math.min(dragStart.left + dx, window.innerWidth - panelSize.width))
        const newTop = Math.max(NAVBAR_HEIGHT, Math.min(dragStart.top + dy, window.innerHeight - panelSize.height))
        setPanelPos({ left: newLeft, top: newTop })
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

  // Profile helpers
  const fetchUserProfile = async (uname: string): Promise<UserProfile | null> => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("username, avatar_url")
        .eq("username", uname)
        .single()
      if (error) return null
      return data as unknown as UserProfile
    } catch {
      return null
    }
  }

  const getUserAvatar = async (uname: string): Promise<string | undefined> => {
    const cached = userProfiles[uname]
    if (cached) return cached.avatar_url
    const profile = await fetchUserProfile(uname)
    if (profile) {
      setUserProfiles((prev) => ({ ...prev, [uname]: profile }))
      return profile.avatar_url
    }
    return undefined
  }

  // Cleanup messages > 24h
  useEffect(() => {
    const cleanup = () => {
      const cutoff = Date.now() - 24 * 60 * 60 * 1000
      setMessages((prev) => prev.filter((m) => m.timestamp.getTime() > cutoff))
    }
    cleanup()
    const id = setInterval(cleanup, 60 * 60 * 1000)
    return () => clearInterval(id)
  }, [])

  // Realtime channel
  // Subscribe regardless of panel visibility so messages arrive even when closed
  useEffect(() => {
    if (!resolvedMindMapId) return
    const channel = supabase.channel(`chat:${resolvedMindMapId}`, { config: { broadcast: { self: false } } })
    chatChannelRef.current = channel

    channel.on("broadcast", { event: "chat_message" }, async (payload) => {
      const incoming = payload.payload as { id: string; user: string; message: string; timestamp: string }
      if (incoming.user === currentUserName) return
      const avatar = await getUserAvatar(incoming.user)
      setMessages((prev) => [
        ...prev,
        { id: incoming.id, user: incoming.user, message: incoming.message, timestamp: new Date(incoming.timestamp), avatar },
      ])
      // Notify parent about incoming collaborator message (for unread badge)
      try {
        onIncomingCollabMessage?.({
          id: incoming.id,
          user: incoming.user,
          message: incoming.message,
          timestamp: new Date(incoming.timestamp),
        })
      } catch {
        // no-op
      }
    })

    // Handle read receipts: other users broadcast their last read timestamp
    channel.on("broadcast", { event: "chat_read" }, (payload) => {
      const data = payload.payload as { user: string; lastReadTimestamp: string }
      if (!data || !data.user || data.user === currentUserName) return
      const reader = data.user
      const readUpTo = new Date(data.lastReadTimestamp).getTime()
      setReadReceipts((prev) => {
        const next: Record<string, string[]> = { ...prev }
        for (const m of messagesRef.current) {
          if (m.timestamp.getTime() <= readUpTo) {
            const list = next[m.id] ? [...next[m.id]] : []
            if (!list.includes(reader)) list.push(reader)
            next[m.id] = list
          }
        }
        return next
      })
    })

    channel.subscribe()
    return () => {
      chatChannelRef.current = null
      supabase.removeChannel(channel)
    }
  }, [resolvedMindMapId, currentUserName])

  // Broadcast our last read time when we view new messages
  useEffect(() => {
    if (!isOpen || activeTab !== 'collab') return
    const latestOther = messages
      .filter((m) => m.user !== currentUserName)
      .reduce((max: number, m) => Math.max(max, m.timestamp.getTime()), 0)
    if (!latestOther) return
    const iso = new Date(latestOther).toISOString()
    if (lastReadSentRef.current === iso) return
    lastReadSentRef.current = iso
    const ch = chatChannelRef.current ?? (resolvedMindMapId ? supabase.channel(`chat:${resolvedMindMapId}`) : null)
    if (ch) {
      ch.send({ type: 'broadcast', event: 'chat_read', payload: { user: currentUserName, lastReadTimestamp: iso } })
    }
  }, [messages, isOpen, activeTab, currentUserName, resolvedMindMapId])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (activeTab === "collab") {
      if (!collabInput.trim()) return
      const avatar = await getUserAvatar(currentUserName)
      const local: ChatMessage = {
        id: Date.now().toString(),
        user: currentUserName,
        message: collabInput.trim(),
        timestamp: new Date(),
        avatar,
      }
      setMessages((prev) => [...prev, local])
      setCollabInput("")
      const payload = { ...local, timestamp: local.timestamp.toISOString() }
      const ch = chatChannelRef.current ?? supabase.channel(`chat:${resolvedMindMapId}`)
      await ch.send({ type: "broadcast", event: "chat_message", payload })
      return
    }

    if (!aiInput.trim() || aiLoading) return
    const userMsg = {
      user: username || "You",
      text: aiInput,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    }
    setAiMessages((prev) => [...prev, userMsg])
    setAiInput("")
    setAiLoading(true)
    try {
      const mnp = aiBots.find((b) => b.id === "mnp")
      let systemPrompt = mnp?.systemPrompt || "You are a helpful AI assistant."
      if (isChatOpen && mindMapData) {
        systemPrompt += `\n\n[Mindmap Context]\n${JSON.stringify(mindMapData, null, 2)}`
      }
      const chatMessages = [
        { role: "system", content: systemPrompt },
        ...aiMessages.map((m) => ({ role: m.user === "Mystical nordic prophet" ? "assistant" : "user", content: m.text })),
        { role: "user", content: userMsg.text },
      ]
      const apiKey = mnp?.apiKey || import.meta.env.VITE_PORTKEY_API_KEY
      const model = "@google/gemini-2.5-flash"
      const response = await fetch("https://api.portkey.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(apiKey ? { "x-portkey-api-key": apiKey } : {}),
        },
        body: JSON.stringify({ model, messages: chatMessages, max_tokens: mnp?.maxTokens || 1024, temperature: mnp?.temperature || 0.7 }),
      })
      if (!response.ok) throw new Error("AI API error")
      const data = await response.json()
      const aiText = data.choices?.[0]?.message?.content || "(No response)"
      setAiStreamingText("")
      let i = 0
      const typeWriter = () => {
        setAiStreamingText(aiText.slice(0, i))
        if (i < aiText.length) {
          i++
          setTimeout(typeWriter, 14 + Math.random() * 30)
        } else {
          setAiMessages((prev) => [...prev, { user: "Mystical nordic prophet", text: aiText, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }])
          setAiStreamingText(null)
        }
      }
      typeWriter()
    } catch {
      setAiMessages((prev) => [...prev, { user: "Mystical nordic prophet", text: "Sorry, the AI is currently unavailable.", time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }])
    } finally {
      setTimeout(() => setAiLoading(false), 200)
    }
  }

  // Avatar for AI/user in AI tab is simplified to initials; no profile fetch

  // Scroll during AI streaming
  useEffect(() => {
    if (aiStreamingText !== null) chatEndRef.current?.scrollIntoView({ behavior: "auto" })
  }, [aiStreamingText])

  if (!isOpen) return null

  return (
    <div className="fixed z-50" style={{ left: panelPos.left, top: panelPos.top, width: panelSize.width, height: panelSize.height }}>
      <div
        ref={panelRef}
        className="bg-gradient-to-br from-slate-800/95 via-slate-900/95 to-purple-900/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/10 flex flex-col overflow-hidden relative w-full h-full"
        style={{ minHeight: 250, minWidth: 350 }}
      >
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-blue-500/5 to-purple-600/5 pointer-events-none" />

        {/* Custom resize handle at top left */}
        <div
          onMouseDown={(e) => {
            setIsResizing(true)
            setResizeStart({ mouseX: e.clientX, mouseY: e.clientY, width: panelSize.width, height: panelSize.height, left: panelPos.left, top: panelPos.top })
            e.preventDefault()
            e.stopPropagation()
          }}
          className="absolute top-0 left-0 w-4 h-4 cursor-nwse-resize z-10 rounded-tl-2xl flex items-center justify-center resize-handle-group"
          title="Resize"
        >
          <svg className="resize-handle-svg" width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
            <line x1="2" y1="12" x2="12" y2="2" stroke="currentColor" strokeWidth="1.2" />
            <line x1="2" y1="8" x2="8" y2="2" stroke="currentColor" strokeWidth="1.2" />
            <line x1="6" y1="12" x2="12" y2="6" stroke="currentColor" strokeWidth="1.2" />
          </svg>
          <style>{`
            .resize-handle-group .resize-handle-svg { color: #94a3b8; transition: color 0.15s; }
            .resize-handle-group:hover .resize-handle-svg { color: #fff; }
          `}</style>
        </div>

        {/* Header (draggable) */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-gradient-to-r from-slate-800/60 to-slate-900/60 backdrop-blur-sm rounded-t-3xl select-none cursor-move"
          onMouseDown={(e) => {
            if ((e.target as HTMLElement).closest("button, .chat-tab")) return
            setIsDragging(true)
            setDragStart({ mouseX: e.clientX, mouseY: e.clientY, left: panelPos.left, top: panelPos.top })
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
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all hover:scale-105" title="Close chat">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* AI context intro */}
        {activeTab === "ai" && !isChatOpen ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-500/10 to-blue-600/10 border border-purple-400/20 mb-4">
              <Bot className="w-12 h-12 text-purple-300 mx-auto" />
            </div>
            <button
              onClick={() => {
                if (onGiveMindmapContext && mindMapData) onGiveMindmapContext(mindMapData)
                else if (mindMapData) console.log("[BrainstormChat] Mindmap context:", mindMapData)
                else console.warn("[BrainstormChat] No mindMapData provided.")
                setIsChatOpen(true)
              }}
              className="px-6 py-3 rounded-2xl font-medium transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent bg-gradient-to-r from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700 text-white shadow-lg shadow-purple-500/25 focus:ring-purple-400/50"
            >
              Give mindmap context
            </button>
          </div>
        ) : (
          <>
            {/* Chat messages */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-600/50 scrollbar-track-transparent">
              {activeTab === "collab" ? (
                messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-500/10 to-purple-600/10 border border-blue-400/20 mb-4">
                      <MessageCircle className="w-8 h-8 text-blue-300 mx-auto mb-2" />
                    </div>
                    <div className="text-slate-300 font-medium mb-1">Start brainstorming!</div>
                    <div className="text-slate-500 text-sm">Share ideas with your team</div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {messages.map((m, idx) => {
                      const isMe = m.user === currentUserName
                      const prev = idx > 0 ? messages[idx - 1] : null
                      const next = idx < messages.length - 1 ? messages[idx + 1] : null
                      const within15Min = (a?: Date | null, b?: Date | null) =>
                        !!a && !!b && Math.abs(a.getTime() - b.getTime()) <= 15 * 60 * 1000
                      const sameAsPrev = prev && prev.user === m.user && within15Min(prev.timestamp, m.timestamp)
                      const showHeader = !sameAsPrev
                      const lastInGroup = !next || next.user !== m.user || !within15Min(next.timestamp, m.timestamp)

                      return (
                        <div key={m.id} className="group">
                          <div className={`flex items-start gap-3 ${showHeader ? 'py-2' : 'py-1'} hover:bg-white/5 rounded-xl transition-all`}>
                            {showHeader ? (
                              m.avatar ? (
                                <img
                                  src={m.avatar}
                                  alt={m.user}
                                  className="w-8 h-8 rounded-full object-cover flex-shrink-0 bg-gradient-to-br from-blue-400 to-cyan-500 mt-1.5"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0 mt-1.5">
                                  {(m.user[0] || 'U').toUpperCase()}
                                </div>
                              )
                            ) : (
                              <div className="w-8 h-8 mt-1.5 flex-shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              {showHeader && (
                                <div className="flex items-center gap-2 mb-1">
                                  <span className={`text-sm font-semibold ${isMe ? 'text-blue-300' : 'text-cyan-300'}`}>{m.user}</span>
                                  {isMe && <span className="text-xs text-slate-500">(you)</span>}
                                  <span className="text-xs text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                              )}
                              <div className="flex items-start">
                                <div className="flex-1 min-w-0 text-white text-sm leading-relaxed break-words whitespace-pre-line">{m.message}</div>
                                {!showHeader && (
                                  <span className="ml-2 text-xs text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity self-end">
                                    {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                )}
                              </div>
                              {isMe && lastInGroup && (
                                <div className="mt-1 text-[11px] text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                  {(readReceipts[m.id] && readReceipts[m.id].length > 0)
                                    ? `Seen by ${readReceipts[m.id].join(', ')}`
                                    : 'Delivered'}
                                </div>
                              )}
                            </div>
                          </div>
                          {lastInGroup && <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent my-2" />}
                        </div>
                      )
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
                        <div className="flex items-start gap-3 py-2 hover:bg-white/5 rounded-xl transition-all">
                          {isAI ? (
                            <img src={aiBots.find((b) => b.id === "mnp")?.avatar || "/assets/avatars/mnp.webp"} alt="Mystical nordic prophet" className="w-8 h-8 rounded-full object-cover flex-shrink-0 bg-gradient-to-br from-purple-400 to-blue-500 mt-1.5" />
                          ) : currentUserAvatar ? (
                            <img
                              src={currentUserAvatar}
                              alt={msg.user}
                              className="w-8 h-8 rounded-full object-cover flex-shrink-0 bg-gradient-to-br from-cyan-400 to-blue-500 mt-1.5"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0 mt-1.5">
                              {(msg.user[0] || "U").toUpperCase()}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-sm font-semibold ${isAI ? "text-purple-300" : "text-cyan-300"}`}>{msg.user}</span>
                              {isAI && <span className="text-xs text-slate-500">(AI)</span>}
                              {isMe && <span className="text-xs text-slate-500">(you)</span>}
                              <span className="text-xs text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">{msg.time}</span>
                            </div>
                            <MarkdownRenderer content={msg.text} className="text-white text-sm leading-relaxed break-words" />
                          </div>
                        </div>
                        {idx < aiMessages.length - 1 && <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent my-2" />}
                      </div>
                    )
                  })}
                  {aiStreamingText !== null && (
                    <div className="group">
                      <div className="flex items-start gap-3 py-2 hover:bg-white/5 rounded-xl transition-all">
                        <img src={aiBots.find((b) => b.id === "mnp")?.avatar || "/assets/avatars/mnp.webp"} alt="Mystical nordic prophet" className="w-8 h-8 rounded-full object-cover flex-shrink-0 bg-gradient-to-br from-purple-400 to-blue-500 mt-1.5" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-semibold text-purple-300">Mystical nordic prophet</span>
                            <span className="text-xs text-slate-500">(AI)</span>
                          </div>
                          <div className="text-white text-sm leading-relaxed break-words">
                            <MarkdownRenderer content={aiStreamingText ?? ""} className="inline" />
                            <span className="animate-pulse">▋</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  {aiLoading && aiStreamingText === null && activeTab === "ai" && (
                    <div className="flex items-center py-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-white text-sm leading-relaxed break-words">
                          <ChatTypingIndicator />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="flex items-center gap-3 px-6 py-4 border-t border-white/10 bg-gradient-to-r from-slate-800/60 to-slate-900/60 backdrop-blur-sm rounded-b-3xl">
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
                disabled={activeTab === "collab" ? collabInput.trim() === "" : aiInput.trim() === "" || aiLoading}
              >
                Send
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

export default BrainstormChat
