"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { MessageCircle, Bot, Users } from "lucide-react"
import { supabase } from "../supabaseClient";

interface Collaborator {
  id: string
  username: string
  avatarUrl?: string
}



interface Chat2PageProps {
  username?: string
  userId?: string
  collaborators?: Collaborator[]
}

const Chat2Page: React.FC<Chat2PageProps> = ({ username, userId, collaborators }) => {
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

  // Remove panel/modal/drag/resize logic for full page

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [collabMessages, aiMessages, activeTab])

  // Remove drag/resize effect

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
        setAvatarUrl(undefined);
      }
    })();
    return () => { isMounted = false; };
  }, [userId]);

  // --- RENDER ---
  return (
    <div
      className="fixed inset-0 z-40 flex flex-col bg-gradient-to-br from-slate-800/95 via-slate-900/95 to-purple-900/95 backdrop-blur-xl"
      style={{ minHeight: '100vh', minWidth: '100vw' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-gradient-to-r from-slate-800/60 to-slate-900/60 backdrop-blur-sm select-none">
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
        <div className="flex-1" />
        {/* Optionally, add a logo or title here */}
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
        className="flex items-center gap-3 px-6 py-4 border-t border-white/10 bg-gradient-to-r from-slate-800/60 to-slate-900/60 backdrop-blur-sm"
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
  );
}

export default Chat2Page;
