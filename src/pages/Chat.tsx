import React, { useState, useRef, useEffect, useCallback, useMemo } from "react"
import { aiService } from "../services/aiService"
import { useAuthStore } from "../store/authStore"
import { useChatStore } from "../store/chatStore"
import { usePageTitle } from '../hooks/usePageTitle'
import AISettingsModal from "../components/AISettingsModal"
import AIHelpModal from "../components/AIHelpModal"
import MindMapSelector from "../components/MindMapSelector"
import "../styles/messageReactions.css"
import { useNavigate, useSearchParams, useParams } from "react-router-dom"
import { format } from 'date-fns'
import {
  PlusCircle,
  Send,
  Smile,
  MoreVertical,
  Search,
  Settings,
  X,
  Users,
  UserPlus,
  Pin,
  Bot,
  Network,
  XCircle,
  ChevronDown,
  Edit,
  Check,
  CheckCheck,
  Reply,
  ChevronLeft,
  Heart,
  Image,
  Eye,   
  EyeOff,
  Link,
  Zap,
  MessageSquarePlus,
  User,
} from "lucide-react"
import { useMindMapStore } from "../store/mindMapStore"
import { ChatMindMapNode } from "../components/ChatMindMapNode"
import Portal from "../components/Portal"
import EmojiPicker, { type EmojiClickData } from "emoji-picker-react"
import emojiRegex from "emoji-regex"
import ReactMarkdown from "react-markdown"
import { useMediaQuery } from "../hooks/use-media-query"
import { usePreviewMindMapStore } from "../store/previewMindMapStore"
import { PreviewMindMapNode } from "../components/PreviewMindMapNode"
import { supabase } from "../supabaseClient"


const MESSAGE_REACTIONS = [
  { type: "love", imagePath: "/images/reactions/love.png", label: "Love" },
  { type: "laugh", imagePath: "/images/reactions/laugh.webp", label: "Laugh" },
  { type: "wow", imagePath: "/images/reactions/wow.jpg", label: "Wow" },
  { type: "happy", imagePath: "/images/reactions/happy.png", label: "Happy" },
  { type: "sad", imagePath: "/images/reactions/sad.webp", label: "Sad" },
  { type: "angry", imagePath: "/images/reactions/angry.png", label: "Angry" }
]


const getReactionImagePath = (type: string): string => {
  const reaction = MESSAGE_REACTIONS.find(r => r.type === type)
  return reaction?.imagePath || "/images/reactions/thumbsup.png"
}


const getUnifiedCode = (emoji: string) => {
  const codePoints = Array.from(emoji).map((char) => char.codePointAt(0)!.toString(16))
  return codePoints.join("-").toLowerCase()
}

const formatConversationPreview = (message: string | undefined, messageType?: string, mindmapTitle?: string): string => {
  if (!message) {
    // If it's a mindmap message without text, show the mindmap title
    if (messageType === "mindmap" && mindmapTitle) {
      return mindmapTitle
    }
    return "No messages yet"
  }
  
  // Check if the message is a GIF
  const gifRegex = /!\[GIF\]\((https?:\/\/[^\s)]+)\)/
  if (gifRegex.test(message)) {
    return "GIF"
  }
  
  // If it's a mindmap message and there's no text (empty string), show the mindmap title
  if (messageType === "mindmap" && (!message.trim() || message.trim() === "") && mindmapTitle) {
    return mindmapTitle
  }
  
  // Return the original message for non-GIF messages
  return message
}

// Helper function to highlight search matches in text
const highlightSearchMatch = (text: string, searchTerm: string) => {
  if (!searchTerm.trim()) return text

  const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  const parts = text.split(regex)
  
  return parts.map((part, index) => {
    if (part.toLowerCase() === searchTerm.toLowerCase()) {
      return (
        <span key={index} className="bg-blue-500/30 text-blue-200 rounded px-0.5">
          {part}
        </span>
      )
    }
    return part
  })
}

// Helper function to filter conversations based on search term
const filterConversations = (conversations: any[], searchTerm: string) => {
  if (!searchTerm.trim()) return conversations
  
  const lowercaseSearch = searchTerm.toLowerCase()
  return conversations.filter(conversation => 
    conversation.name.toLowerCase().includes(lowercaseSearch) ||
    (conversation.lastMessage && conversation.lastMessage.toLowerCase().includes(lowercaseSearch))
  )
}


const formatTimeElapsed = (date: Date | string): string => {
  const readDate = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - readDate.getTime();

  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60) {
    return 'just now';
  }

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) {
    return `${diffMin} ${diffMin === 1 ? 'minute' : 'minutes'} ago`;
  }

  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) {
    return `${diffHour} ${diffHour === 1 ? 'hour' : 'hours'} ago`;
  }

  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) {
    return `${diffDay} ${diffDay === 1 ? 'day' : 'days'} ago`;
  }


  return readDate.toLocaleDateString();
}


const MessageText: React.FC<{ text: string | undefined }> = ({ text }) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [shouldShowMore, setShouldShowMore] = useState(false)
  const messageRef = useRef<HTMLDivElement>(null)

  if (typeof text !== "string") {
    console.error("Invalid text:", text)
    return <span>[Invalid message]</span>
  }

  useEffect(() => {

    const lines = text.split("\n")

    // A rough estimate: if the text is longer than 300 characters, it's likely to span multiple lines
    const isLongText = text.length > 300

    setShouldShowMore(lines.length > 5 || isLongText)
  }, [text])

  const regex = emojiRegex()

  const renderTextWithEmojisAndLinks = (line: string, lineIndex: number) => {
    const elements = []
    let lastIndex = 0
    for (const match of line.matchAll(regex)) {
      const emoji = match[0]
      const index = match.index!
      if (index > lastIndex) {
        const textPart = line.slice(lastIndex, index)
        elements.push(...renderTextWithLinks(textPart, lineIndex))
      }
      const unified = getUnifiedCode(emoji)
      const url = `https://cdn.jsdelivr.net/npm/emoji-datasource-apple/img/apple/64/${unified}.png`
      elements.push(
        <img
          key={`emoji-${lineIndex}-${index}`}
          src={url || "/placeholder.svg"}
          alt={emoji}
          className="inline-block h-5 align-middle mx-[1px]"
        />,
      )
      lastIndex = index + emoji.length
    }
    if (lastIndex < line.length) {
      const textPart = line.slice(lastIndex)
      elements.push(...renderTextWithLinks(textPart, lineIndex))
    }
    return elements
  }

  const renderTextWithLinks = (textPart: string, lineIndex: number) => {

    const gifRegex = /!\[GIF\]\((https?:\/\/[^\s)]+)\)/
    const gifMatch = textPart.match(gifRegex)

    if (gifMatch && gifMatch[1]) {
      const gifUrl = gifMatch[1]
      return [
        <div key={`gif-${lineIndex}`} className="my-2 rounded-lg overflow-hidden max-w-full">
          <img src={gifUrl} alt="GIF" className="max-w-full max-h-[300px] object-contain rounded-md" />
        </div>
      ]
    }

    const urlRegex = /(https?:\/\/[^\s)]+)|(www\.[^\s)]+)/g
    const parts = textPart.split(urlRegex)
    return parts.map((part, index) => {
      if (part && part.match(urlRegex)) {
        const href = part.startsWith("www.") ? `https://${part}` : part
        return (
          <a
            key={`link-${lineIndex}-${index}-${part}`}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-300 hover:underline break-words"
            style={{ wordBreak: "break-word", overflowWrap: "break-word", maxWidth: "100%" }}
          >
            {part}
          </a>
        )
      }
      return (
        <ReactMarkdown
          key={`md-${lineIndex}-${index}-${Date.now()}-${Math.random()}`}
          components={{
            p: ({ children }) => (
              <span
                className="break-words"
                style={{
                  wordBreak: "break-word",
                  overflowWrap: "break-word",
                  maxWidth: "100%",
                  display: "inline-block",
                }}
              >
                {children}
              </span>
            ),
            strong: ({ children }) => <span className="font-bold">{children}</span>,
            em: ({ children }) => <span className="italic">{children}</span>,
            code: ({ children }) => <code className="bg-gray-700/50 rounded px-1 py-0.5 text-sm">{children}</code>,
            img: ({ src, alt }) => {

              return (
                <img src={src} alt={alt} className="max-w-full max-h-[300px] object-contain rounded-lg my-2" />
              )
            }
          }}
        >
          {part}
        </ReactMarkdown>
      )
    })
  }

  const lines = text.split("\n")


  const isLongText = text.length > 300 && lines.length <= 5


  let displayedText = text
  if (!isExpanded && isLongText) {
    displayedText = text.substring(0, 300) + "..."
  }


  const displayedLines = isExpanded ? lines : lines.slice(0, 5)

  return (
    <div
      className="whitespace-pre-wrap break-words max-w-full"
      style={{ wordBreak: "break-word", overflowWrap: "break-word" }}
    >
      <div ref={messageRef} className="leading-normal break-words w-full">
        {isLongText && !isExpanded ? (

          <div className="leading-normal break-words w-full">
            {renderTextWithEmojisAndLinks(displayedText, 0)}
          </div>
        ) : (

          displayedLines.map((line, index) => (
            <div key={index} className="leading-normal break-words w-full">
              {line ? renderTextWithEmojisAndLinks(line, index) : <br />}
            </div>
          ))
        )}
      </div>
      {shouldShowMore && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-sky-400 hover:text-sky-300 text-sm font-medium mt-1 transition-colors"
        >
          {isExpanded ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  )
}


const MindMapChip: React.FC<{
  mapId: string
  mapTitle: string
  visibility?: string
  onRemove: () => void
}> = ({ mapTitle, visibility, onRemove }) => {
  return (
    <div className="inline-flex items-center gap-1.5 bg-blue-600/80 text-white rounded-md py-1 px-2 mr-2 my-1">
      {visibility === 'public' ? (
        <Eye className="h-3.5 w-3.5" />
      ) : visibility === 'linkOnly' ? (
        <Link className="h-3.5 w-3.5" />
      ) : (
        <EyeOff className="h-3.5 w-3.5" />
      )}
      <span className="text-sm font-medium">{mapTitle}</span>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault()
          onRemove()
        }}
        className="text-blue-200 hover:text-white transition-colors"
      >
        <XCircle className="h-4 w-4" />
      </button>
    </div>
  )
}


const NewConversationModal: React.FC<{
  onClose: () => void
  onCreateConversation: (userId: string, userName: string, isOnline: boolean) => void
}> = ({ onClose, onCreateConversation }) => {
  const [searchTerm, setSearchTerm] = useState("")
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const modalRef = useRef<HTMLDivElement>(null)
  const { user } = useAuthStore()

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose()
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [onClose])

  useEffect(() => {
    const loadInitialUsers = async () => {
      await useChatStore.getState().fetchUsers()
      const allUsers = useChatStore.getState().users
      setSearchResults(allUsers.filter(u => u.id !== user?.id))
    }
    loadInitialUsers()
  }, [user?.id])

  useEffect(() => {
    const searchUsers = async () => {
      if (searchTerm.length < 2) {
        const allUsers = useChatStore.getState().users
        setSearchResults(allUsers.filter(u => u.id !== user?.id))
        return
      }

      setIsLoading(true)
      const results = await useChatStore.getState().searchUsers(searchTerm)
      setSearchResults(results.filter(u => u.id !== user?.id))
      setIsLoading(false)
    }

    const debounce = setTimeout(() => {
      searchUsers()
    }, 300)

    return () => clearTimeout(debounce)
  }, [searchTerm, user?.id])

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div 
        ref={modalRef} 
        className="bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/50 w-full max-w-lg overflow-hidden transform transition-all duration-300 scale-100"
      >
        {/* Enhanced Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-700/30 bg-gradient-to-r from-slate-800/60 to-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center border border-blue-500/30">
              <MessageSquarePlus className="h-4 w-4 text-blue-400" />
            </div>
            <h3 className="text-xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
              New Conversation
            </h3>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-all duration-200 border border-transparent hover:border-slate-600/30"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Enhanced Content */}
        <div className="p-6">
          {/* Search Section */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-slate-600/30 rounded-xl text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200"
              />
            </div>
          </div>

          {/* Direct Messages Section */}
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
              <User className="h-4 w-4 text-slate-400" />
              Direct Messages
            </h4>
            <div className="max-h-64 overflow-y-auto space-y-2">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400"></div>
                </div>
              ) : searchResults.length > 0 ? (
                searchResults.map((user) => (
                  <button
                    key={user.id}
                    className="group w-full flex items-center gap-3 p-3 rounded-xl bg-slate-700/30 hover:bg-slate-600/40 border border-slate-600/20 hover:border-slate-500/40 text-slate-200 transition-all duration-200 hover:shadow-lg"
                    onClick={() => onCreateConversation(user.id, user.username || user.full_name, user.online || false)}
                  >
                    <div className="relative flex-shrink-0">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-600/50 to-slate-700/50 flex items-center justify-center overflow-hidden border border-slate-600/30">
                        {user.avatar_url ? (
                          <img src={user.avatar_url} alt={user.username} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-sm text-slate-300 font-medium">
                            {(user.username || user.full_name || "?").charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      {user.online && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-slate-800"></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="font-medium text-slate-200 group-hover:text-white transition-colors truncate">
                        @{user.username}
                      </p>
                      {user.full_name && (
                        <p className="text-xs text-slate-400 group-hover:text-slate-300 transition-colors truncate">
                          {user.full_name}
                        </p>
                      )}
                    </div>
                    <UserPlus className="h-4 w-4 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                  </button>
                ))
              ) : (
                <div className="text-center py-8">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-700/50 to-slate-800/50 flex items-center justify-center mx-auto mb-3 border border-slate-600/30">
                    <Users className="h-6 w-6 text-slate-400" />
                  </div>
                  <p className="text-sm text-slate-400">
                    {searchTerm.length >= 2 ? "No users found" : "No users available"}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {searchTerm.length >= 2 ? "Try a different search term" : "Search for users to start a conversation"}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Group Conversations Section - Placeholder for future implementation */}
          <div className="border-t border-slate-700/30 pt-6">
            <h4 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
              <Users className="h-4 w-4 text-slate-400" />
              Group Conversations
            </h4>
            <div className="text-center py-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-700/50 to-slate-800/50 flex items-center justify-center mx-auto mb-3 border border-slate-600/30">
                <Users className="h-6 w-6 text-slate-400" />
              </div>
              <p className="text-sm text-slate-400 mb-2">Group conversations coming soon</p>
              <p className="text-xs text-slate-500">Create group chats with multiple users</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


const AIChatMenu: React.FC<{
  onClose: () => void
  onSelectBot: (botId: string) => void
}> = ({ onClose, onSelectBot }) => {
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose()
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [onClose])

  const bots = aiService.getAllBots()

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div 
        ref={modalRef} 
        className="bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/50 w-full max-w-md overflow-hidden transform transition-all duration-300 scale-100"
      >
        {/* Enhanced Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-700/30 bg-gradient-to-r from-slate-800/60 to-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center border border-blue-500/30">
              <Bot className="h-4 w-4 text-blue-400" />
            </div>
            <h3 className="text-xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
              Chat with AI
            </h3>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-all duration-200 border border-transparent hover:border-slate-600/30"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Enhanced Content */}
        <div className="p-6">
          <div className="overflow-y-auto">
            {bots.length > 0 ? (
              <div className="space-y-3">
                {bots.map((bot) => (
                  <button
                    key={bot.id}
                    className="group w-full flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-br from-slate-700/40 to-slate-800/40 hover:from-slate-600/50 hover:to-slate-700/50 border border-slate-600/30 hover:border-slate-500/50 text-slate-200 transition-all duration-200 hover:shadow-lg backdrop-blur-sm"
                    onClick={() => onSelectBot(bot.id)}
                  >
                    <div className="relative flex-shrink-0">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-700/60 to-slate-800/60 flex items-center justify-center border border-slate-600/30 overflow-hidden group-hover:border-blue-500/30 transition-all duration-200">
                        {bot.avatar ? (
                          <img
                            src={bot.avatar || "/placeholder.svg"}
                            alt={bot.name}
                            className="w-full h-full rounded-2xl object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                              const parent = (e.target as HTMLImageElement).parentElement;
                              if (parent) {
                                const botIcon = document.createElement('div');
                                botIcon.innerHTML = '<svg class="h-6 w-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>';
                                parent.appendChild(botIcon);
                              }
                            }}
                          />
                        ) : (
                          <Bot className="h-6 w-6 text-blue-400" />
                        )}
                      </div>
                      {/* AI Status Indicator */}
                      <div className="absolute -bottom-1 -right-1">
                        <Bot className="w-4 h-4 text-blue-400" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="font-semibold text-slate-200 group-hover:text-white transition-colors">
                        {bot.name}
                      </p>
                      <p className="text-sm text-slate-400 group-hover:text-slate-300 transition-colors mt-1">
                        {bot.description}
                      </p>
                    </div>
                    {/* Arrow indicator */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <ChevronDown className="h-4 w-4 text-slate-400 rotate-[-90deg]" />
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-700/50 to-slate-800/50 flex items-center justify-center mx-auto mb-4 border border-slate-600/30">
                  <Bot className="h-8 w-8 text-slate-400" />
                </div>
                <h4 className="text-lg font-semibold text-slate-300 mb-2">No AI Bots Available</h4>
                <p className="text-sm text-slate-400 max-w-xs mx-auto leading-relaxed">
                  AI chat bots are not configured. Please check your settings.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}


const ConversationMenu: React.FC<{
  conversationId: number
  isPinned: boolean
  onClose: () => void
  onDelete: () => void
  onTogglePin: () => void
  triggerRef?: React.RefObject<HTMLElement>
}> = ({ isPinned, onClose, onDelete, onTogglePin, triggerRef }) => {
  const menuRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState<{ top: number; left: number; right?: number }>({ top: 0, left: 0 })
  const [isPositioned, setIsPositioned] = useState(false)

  // Calculate position based on trigger element
  useEffect(() => {
    if (triggerRef?.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect()
      const menuWidth = 192 // w-48 = 192px
      const menuHeight = 80 // approximate height for 2 items
      
      let top = triggerRect.bottom + 8 // 8px margin
      let left = triggerRect.left
      let right: number | undefined = undefined

      // For conversation menu, prefer to show it below and to the right
      // But adjust if it would go off screen
      left = triggerRect.right - menuWidth
      if (left < 8) {
        // If it would go off the left edge, align with trigger left
        left = triggerRect.left
      }

      // Adjust vertical position if it would go off the bottom
      if (top + menuHeight > window.innerHeight - 8) {
        top = triggerRect.top - menuHeight - 8
      }

      setPosition({ top, left, right })
      setIsPositioned(true)
    }
  }, [triggerRef])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        !(event.target instanceof Element && event.target.closest(".menu-button"))
      ) {
        onClose()
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [onClose])

  return (
    <Portal>
      {isPositioned && (
        <div
          ref={menuRef}
          className="conversation-menu fixed w-48 bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-xl border border-slate-600/30 rounded-xl shadow-2xl overflow-hidden z-[9999] pointer-events-auto"
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`,
            right: position.right ? `${position.right}px` : undefined
          }}
        >
          <div className="py-1.5">
          <button
            className={`w-full text-left px-4 py-2.5 hover:bg-gradient-to-r hover:from-slate-700/50 hover:to-slate-600/50 transition-all duration-200 flex items-center gap-3 text-sm ${
              isPinned ? 'text-blue-400' : 'text-slate-200'
            }`}
            onClick={onTogglePin}
          >
            <Pin className={`h-5 w-5 ${isPinned ? "text-blue-400" : "text-slate-400"}`} />
            <span className="font-medium">{isPinned ? "Unpin conversation" : "Pin conversation"}</span>
          </button>
          <button
            className="w-full text-left px-4 py-2.5 text-slate-200 hover:bg-gradient-to-r hover:from-red-900/30 hover:to-red-800/30 transition-all duration-200 flex items-center gap-3 text-sm"
            onClick={onDelete}
          >
            <X className="h-4 w-4 text-red-400" />
            <span className="font-medium">Delete conversation</span>
          </button>
        </div>
        </div>
      )}
    </Portal>
  )
}


const ReactionMenu: React.FC<{
  messageId: number
  onReact: (messageId: number, reactionType: string) => void
  onClose: () => void
  messageReactions: {[messageId: number]: {[reactionType: string]: string[]}}
}> = ({ messageId, onReact, onClose, messageReactions }) => {
  const menuRef = useRef<HTMLDivElement>(null)
  const { user } = useAuthStore()
  const currentUserId = user?.id || 'anonymous'


  const reactions = MESSAGE_REACTIONS


  const userReaction = messageReactions[messageId] ?
    Object.entries(messageReactions[messageId])
      .find(([_, users]) => users.includes(currentUserId))?.[0] : undefined

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        !(event.target instanceof Element && event.target.closest(".reaction-menu-trigger"))
      ) {
        onClose()
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [onClose])

  return (
    <>
      {/* Enhanced backdrop with blur */}
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[999]" onClick={onClose}></div>
      <div
        ref={menuRef}
        className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-xl border border-slate-600/30 rounded-2xl shadow-2xl z-[1000] p-4"
      >
        <div className="flex flex-col gap-3">
          {/* Reaction options */}
          <div className="flex gap-2">
            {reactions.map((reaction) => {
              const isSelected = userReaction === reaction.type
              return (
                <button
                  key={reaction.type}
                  className={`group relative p-3 rounded-xl transition-all duration-200 flex flex-col items-center hover:scale-110 ${
                    isSelected 
                      ? 'bg-gradient-to-br from-blue-500/30 to-purple-500/30 border border-blue-400/50 shadow-lg shadow-blue-500/25' 
                      : 'hover:bg-slate-700/50 border border-transparent hover:border-slate-600/50'
                  }`}
                  onClick={() => {
                    onReact(messageId, reaction.type)
                    onClose()
                  }}
                  title={reaction.label}
                >
                  <div className="reaction-menu-images w-8 h-8 overflow-hidden rounded-lg">
                    <img 
                      src={reaction.imagePath} 
                      alt={reaction.label} 
                      className="w-full h-full object-cover transition-transform group-hover:scale-110"
                    />
                  </div>
                  {isSelected && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full border-2 border-slate-800 shadow-lg"></div>
                  )}
                </button>
              )
            })}
          </div>

          {/* Remove reaction option */}
          {userReaction && (
            <div className="border-t border-slate-700/50 pt-3">
              <button
                className="w-full text-sm text-slate-400 hover:text-red-400 py-2 px-3 hover:bg-red-500/10 hover:border-red-500/30 rounded-xl transition-all duration-200 border border-transparent"
                onClick={() => {
                  onReact(messageId, userReaction)
                  onClose()
                }}
              >
                Remove reaction
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}


const MessageMenu: React.FC<{
  messageId: number
  text: string
  isUserMessage: boolean
  onEdit: (messageId: number, text: string) => void
  onDelete: (messageId: number) => void
  onEmphasize: (messageId: number) => void
  isEmphasized: boolean
  onClose: () => void
  triggerRef?: React.RefObject<HTMLElement>
}> = ({ messageId, text, isUserMessage, onEdit, onDelete, onEmphasize, isEmphasized, onClose}) => {
  const menuRef = useRef<HTMLDivElement>(null)
  // Position relative to the trigger button
  const getMenuPosition = () => {
    const menuWidth = 144 // w-36 = 144px

    // Position relative to the trigger button
    let top = 44 // Height of button + small gap
    let left = 0

    // Adjust horizontal position
    if (isUserMessage) {
      // For user messages, show menu to the left of the trigger
      left = -menuWidth + 8 // Align right edge with button, small offset
    } else {
      // For other user messages, show menu to the right of the trigger
      left = 8 // Small offset to the right
    }

    return { top, left }
  }

  const position = getMenuPosition()

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        !(event.target instanceof Element && event.target.closest(".message-menu-trigger"))
      ) {
        onClose()
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [onClose])

  return (
    <div
      ref={menuRef}
      className="message-menu absolute w-36 bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-xl border border-slate-600/30 rounded-xl shadow-2xl overflow-hidden z-[9999]"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`
      }}
    >
          <div className="py-1.5">
          <button
            className={`w-full text-left px-4 py-2.5 hover:bg-gradient-to-r hover:from-slate-700/50 hover:to-slate-600/50 transition-all duration-200 flex items-center gap-3 text-sm ${
              isEmphasized ? 'text-yellow-400' : 'text-slate-200'
            }`}
            onClick={() => {
              onEmphasize(messageId)
              onClose()
            }}
          >
            <Zap className={`h-4 w-4 ${isEmphasized ? 'text-yellow-400' : 'text-slate-400'}`} />
            <span className="font-medium">{isEmphasized ? 'Remove emphasis' : 'Emphasize'}</span>
          </button>
          {isUserMessage && (
            <>
              <button
                className="w-full text-left px-4 py-2.5 text-slate-200 hover:bg-gradient-to-r hover:from-slate-700/50 hover:to-slate-600/50 transition-all duration-200 flex items-center gap-3 text-sm"
                onClick={() => {
                  onEdit(messageId, text)
                  onClose()
                }}
              >
                <Edit className="h-4 w-4 text-slate-400" />
                <span className="font-medium">Edit</span>
              </button>
              <button
                className="w-full text-left px-4 py-2.5 text-slate-200 hover:bg-gradient-to-r hover:from-red-900/30 hover:to-red-800/30 transition-all duration-200 flex items-center gap-3 text-sm"
                onClick={() => {
                  onDelete(messageId)
                  onClose()
                }}
              >
                <X className="h-4 w-4 text-red-400" />
                <span className="font-medium">Delete</span>
              </button>
            </>
          )}
        </div>
    </div>
  )
}


type MessageForPreview = {
  id: number;
  text: string;
  timestamp: string | Date;
  senderId: string | number;
  conversationId: number;
  replyToId?: number;
  mindMapId?: string;
  type?: string;
  deleted?: boolean;
  edited?: boolean;
  reactions?: { [key: string]: string[] }; // Map of reaction type to array of user IDs
};


const ReplyPreview: React.FC<{
  message: MessageForPreview | null
  onCancel: () => void
}> = ({ message, onCancel }) => {
  if (!message) return null

  // Check if the message is a GIF
  const isGif = message.text.match(/!\[GIF\]\((https?:\/\/[^\s)]+)\)/);
  
  // Check if it's a mindmap message
  const isMindmap = message.type === "mindmap" && message.mindMapId;
  
  // Find the mindmap title if it's a mindmap message
  const mindmapTitle = isMindmap && message.mindMapId ? 
    useMindMapStore.getState().maps.find(m => m.id === message.mindMapId)?.title || "Mindmap" : 
    null;

  // If it's a GIF, show a special preview
  if (isGif) {
    return (
      <div className="flex items-center gap-2 p-2 bg-gray-700/50 rounded-t-md border-b border-gray-600 w-full">
        <div className="flex-1 min-w-0 max-w-full overflow-hidden">
          <div className="flex items-center gap-1.5">
            <Reply className="h-3.5 w-3.5 text-blue-400 flex-shrink-0" />
            <span className="text-xs text-gray-300 whitespace-nowrap">Replying to</span>
          </div>
          <div className="reply-gif-label">
            <Image className="h-4 w-4" />
            <span>GIF</span>
          </div>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="text-gray-400 hover:text-gray-200 p-1 rounded-full hover:bg-gray-700/70"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }
  
  // If it's a mindmap, show a special preview with network icon and title
  if (isMindmap) {
    return (
      <div className="flex items-center gap-2 p-2 bg-gray-700/50 rounded-t-md border-b border-gray-600 w-full">
        <div className="flex-1 min-w-0 max-w-full overflow-hidden">
          <div className="flex items-center gap-1.5">
            <Reply className="h-3.5 w-3.5 text-blue-400 flex-shrink-0" />
            <span className="text-xs text-gray-300 whitespace-nowrap">Replying to</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Network className="h-4 w-4 text-sky-400" />
            <span className="text-sky-400">{mindmapTitle}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="text-gray-400 hover:text-gray-200 p-1 rounded-full hover:bg-gray-700/70"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  // For regular messages
  const truncatedText = message.text.length > 175 ? `${message.text.slice(0, 175)}...` : message.text

  return (
    <div className="flex items-center gap-2 p-2 bg-gray-700/50 rounded-t-md border-b border-gray-600 w-full">
      <div className="flex-1 min-w-0 max-w-full overflow-hidden">
        <div className="flex items-center gap-1.5">
          <Reply className="h-3.5 w-3.5 text-blue-400 flex-shrink-0" />
          <span className="text-xs text-gray-300 whitespace-nowrap">Replying to</span>
          <button
            type="button"
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-200 p-0.5 rounded-full hover:bg-gray-700/70 ml-1"
            title="Cancel reply"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
        <p className="text-sm text-gray-200 truncate max-w-full overflow-hidden text-ellipsis">{truncatedText}</p>
      </div>
    </div>
  )
}


const GifMenu: React.FC<{
  onSelectGif: (gifUrl: string) => void
  onClose: () => void
}> = ({ onSelectGif, onClose }) => {
  const menuRef = useRef<HTMLDivElement>(null)

  // Custom GIFs collection
  const customGifs = [
    "https://64.media.tumblr.com/9e34a8fc62eb9a7ca2b64abba9f9ea3b/066b6d0996b65c47-2f/s500x750/981b67bd6f1761a9476e3ce1542fa218088f0082.gifv",
    "https://media.tenor.com/ApnnCpFErvoAAAAi/angry-wojak.gif",
    "https://media.tenor.com/CizjPak3OXsAAAAi/soyjak.gif",
    "https://media1.tenor.com/m/b_ElccO6WBgAAAAC/soyjak-soyjak-dancing.gif",
    "https://media1.tenor.com/m/EtBSbdnsA3YAAAAC/heart-beating-heart.gif",
    "https://media1.tenor.com/m/2HWWgVz998oAAAAC/doomer-wojak.gif"
  ]

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        !(event.target instanceof Element && event.target.closest(".gif-button"))
      ) {
        onClose()
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [onClose])

  return (
    <div
      ref={menuRef}
      className="absolute bottom-12 right-0 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-[200] p-3 w-72 gif-menu"
    >
      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-sm font-medium text-gray-200">GIFs</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200 p-1 rounded-full hover:bg-gray-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
          {customGifs.map((gif, index) => (
            <button
              key={index}
              className="relative overflow-hidden rounded-md hover:ring-2 hover:ring-blue-500 transition-all"
              onClick={() => {
                onSelectGif(gif)
                onClose()
              }}
            >
              <img src={gif} alt={`GIF ${index + 1}`} className="w-full h-24 object-cover" />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}


const ThinkingIndicator: React.FC<{ name: string; avatar?: string }> = ({ name, avatar }) => {
  const [seconds, setSeconds] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds((prev) => prev + 1)
    }, 1150)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-full bg-gray-800 flex-shrink-0 flex items-center justify-center mt-1">
        {avatar ? (
          <img src={avatar || "/placeholder.svg"} alt={name} className="w-full h-full rounded-full object-cover" />
        ) : (
          <span className="text-sm text-gray-300">{name.charAt(0)}</span>
        )}
      </div>
      <div className="bg-gray-800/70 text-gray-200 rounded-lg p-3 relative flex items-center gap-2">
        <div className="flex items-center">
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: "0ms" }}></div>
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: "300ms" }}></div>
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: "600ms" }}></div>
          </div>
          <div className="ml-3 flex items-center">
            <span className="text-xs bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600 bg-clip-text text-transparent font-medium">
              Thinking
            </span>
            <div className="ml-2 px-1.5 py-0.5 bg-gray-700/50 rounded text-xs text-gray-300 font-mono">{seconds}s</div>
          </div>
        </div>
      </div>
    </div>
  )
}


const TypingIndicator: React.FC<{ name: string; avatar?: string }> = ({ name, avatar }) => {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-full bg-gray-800 flex-shrink-0 flex items-center justify-center mt-1">
        {avatar ? (
          <img src={avatar || "/placeholder.svg"} alt={name} className="w-full h-full rounded-full object-cover" />
        ) : (
          <span className="text-sm text-gray-300">{name.charAt(0)}</span>
        )}
      </div>
      <div className="bg-gray-800/70 text-gray-200 rounded-lg p-3 relative flex items-center gap-2">
        <div className="flex items-center">
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: "0ms" }}></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: "300ms" }}></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: "600ms" }}></div>
          </div>
          <div className="ml-3 flex items-center">
            <span className="text-xs text-gray-300 font-medium">
              {name} is typing...
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}


const Chat: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { supabaseId: urlSupabaseId } = useParams<{ supabaseId: string }>()
  const { user, avatarUrl: cachedAvatarUrl, setAvatarUrl: cacheAvatarUrl } = useAuthStore()
  const { fetchMaps } = useMindMapStore() // Import fetchMaps from mindMapStore
  const userId = user?.id // Extract user ID

  // Presence tracking utility functions
  const updateLastSeen = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ last_seen: new Date().toISOString() })
        .eq('id', userId)
      
      if (error) {
        console.error('Error updating last_seen:', error)
      }
    } catch (error) {
      console.error('Error in updateLastSeen:', error)
    }
  }

  const markUserOffline = async (userId: string) => {
    try {
      // Set last_seen to a time that's older than our online threshold (1 minute)
      const offlineTime = new Date(Date.now() - 2 * 60 * 1000) // 2 minutes ago
      const { error } = await supabase
        .from('profiles')
        .update({ last_seen: offlineTime.toISOString() })
        .eq('id', userId)
      
      if (error) {
        console.error('Error marking user offline:', error)
      }
    } catch (error) {
      console.error('Error in markUserOffline:', error)
    }
  }

  useEffect(() => {
    if (userId) {
      fetchMaps(userId) // Fetch mindmaps for the authenticated user
    }
  }, [userId, fetchMaps])

  const [isLoadingConversations, setIsLoadingConversations] = useState(true)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [isInitialLoadComplete, setIsInitialLoadComplete] = useState(false)
  const [isConversationTransitioning, setIsConversationTransitioning] = useState(false)
  const [isFetchingMessages, setIsFetchingMessages] = useState(false)
  const [messagesLoaded, setMessagesLoaded] = useState(false)
  const {
    conversations,
    activeConversationId,
    setActiveConversation,
    getMessagesForActiveConversation,
    getActiveConversation,
    replyingToMessage,
    setReplyingToMessage,
    getMessageById,
    createConversation,
    deleteConversation,
    setTypingStatus,
    getTypingStatus,
    formatLastSeen,
    typingUsers
  } = useChatStore()
  const { maps } = useMindMapStore()
  const [showConversations, setShowConversations] = useState(true)
  const isMobile = useMediaQuery("(max-width: 768px)")
  const { previewMaps } = usePreviewMindMapStore()

  const [message, setMessage] = useState<string>("")
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showGifMenu, setShowGifMenu] = useState(false)
  
  // Additional state
  const [showMindMapSelector, setShowMindMapSelector] = useState(false)
  const [showNewConversationModal, setShowNewConversationModal] = useState(false)
  const [showConversationMenu, setShowConversationMenu] = useState(false)
  const [showCreateMindMapForm, setShowCreateMindMapForm] = useState(false)
  const [showAIChatMenu, setShowAIChatMenu] = useState(false)
  const [selectedMindMap, setSelectedMindMap] = useState<any>(null)
  const [editingMessageId, setEditingMessageId] = useState<number | null>(null)
  const [editingAnimationId, setEditingAnimationId] = useState<number | null>(null)
  const [editText, setEditText] = useState("")
  const [showMessageMenu, setShowMessageMenu] = useState<number | null>(null)
  const [showThinkingIndicator, setShowThinkingIndicator] = useState(false)
  const [messageReactions, setMessageReactions] = useState<{[messageId: number]: {[reactionType: string]: string[]}}>({})
  const [emphasizedMessages, setEmphasizedMessages] = useState<Set<number>>(new Set())
  const [reactingToMessageId, setReactingToMessageId] = useState<number | null>(null)
  const [showReactionMenu, setShowReactionMenu] = useState(false)
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false)
  const [isAITyping, setIsAITyping] = useState(false)
  const [conversationSearchTerm, setConversationSearchTerm] = useState("")
  
  // Additional missing state
  const [newMindMapTitle, setNewMindMapTitle] = useState("")
  const [showBotMenu, setShowBotMenu] = useState(false)
  const [filteredConversations, setFilteredConversations] = useState<any[]>([])
  const [showAIHelpModal, setShowAIHelpModal] = useState(false)
  const [showAISettingsModal, setShowAISettingsModal] = useState(false)
  const [mindMapSearchTerm, setMindMapSearchTerm] = useState("")
  const [mindMapSortBy, setMindMapSortBy] = useState<"alphabetical" | "lastEdited">("lastEdited")
  
  // Additional refs
  const conversationMenuTriggerRef = useRef<HTMLButtonElement>(null)

  // Refs
  const pickerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const editTextareaRef = useRef<HTMLTextAreaElement>(null)
  const inputContainerRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const messageRefs = useRef<Map<number, HTMLDivElement>>(new Map())
  const observerRef = useRef<IntersectionObserver | null>(null)
  const isTypingRef = useRef<boolean>(false)
  const lastProcessedMessagesRef = useRef<string | null>(null)
  const initiallyFetchedConversationRef = useRef<number | null>(null)
  
  // State for tracking scroll position
  const [isAtBottom, setIsAtBottom] = useState(true)
  const [isMounted, setIsMounted] = useState(false)
  
  // Click outside handlers
  const [handleClickOutsideEmojiPicker, setHandleClickOutsideEmojiPicker] = useState<
    ((event: MouseEvent) => void) | null
  >(null)
  const [handleClickOutsideGifMenu, setHandleClickOutsideGifMenu] = useState<
    ((event: MouseEvent) => void) | null
  >(null)
  const [handleClickOutsideMindMapSelector, setHandleClickOutsideMindMapSelector] = useState<
    ((event: MouseEvent) => void) | null
  >(null)

  // Get current messages and active conversation
  const messages = getMessagesForActiveConversation()
  const activeConversation = getActiveConversation()

  // Set page title based on active conversation
  const pageTitle = activeConversation 
    ? `Chat - ${activeConversation.name}` 
    : "Chat"
  usePageTitle(pageTitle)

  // Handle URL conversation parameter
  useEffect(() => {
    if (urlSupabaseId) {
      // Check both regular conversations and pending conversation
      const pendingConversation = useChatStore.getState().pendingConversation
      let conversation = conversations.find(c => c.supabaseId === urlSupabaseId)
      
      // If not found in regular conversations, check pending conversation
      if (!conversation && pendingConversation && pendingConversation.supabaseId === urlSupabaseId) {
        conversation = pendingConversation
      }
      
      if (conversation && conversation.id !== activeConversationId) {
        setIsFetchingMessages(true) // Set fetching state when loading from URL
        setActiveConversation(conversation.id)
      }
    }
  }, [urlSupabaseId, conversations, activeConversationId, setActiveConversation])

  // Simple conversation selection function that handles pending conversations
  const selectConversation = useCallback((conversationId: number) => {
    setIsConversationTransitioning(true)
    setIsFetchingMessages(true) // Immediately set fetching state
    setMessagesLoaded(false) // Reset messages loaded state
    setActiveConversation(conversationId)
    
    // Check both regular conversations and pending conversation
    const pendingConversation = useChatStore.getState().pendingConversation
    const conversation = pendingConversation && conversationId === pendingConversation.id 
      ? pendingConversation 
      : conversations.find(c => c.id === conversationId)
    
    if (conversation?.supabaseId) {
      // Navigate to the conversation using its supabaseId (works for both pending and real conversations)
      navigate(`/chat/${conversation.supabaseId}`, { replace: true })
    } else {
      // Fallback - this shouldn't happen anymore since all conversations have supabaseId
      navigate('/chat', { replace: true })
    }
    
    // Clear transitioning state after a short delay, but keep fetching state
    setTimeout(() => {
      setIsConversationTransitioning(false)
    }, 200)
  }, [setActiveConversation, navigate, conversations])

  // Filter conversations based on search term
  useEffect(() => {
    if (conversationSearchTerm) {
      const filtered = conversations.filter(conv => 
        conv.name.toLowerCase().includes(conversationSearchTerm.toLowerCase()) ||
        conv.lastMessage.toLowerCase().includes(conversationSearchTerm.toLowerCase())
      )
      setFilteredConversations(filtered)
    } else {
      setFilteredConversations(conversations)
    }
  }, [conversations, conversationSearchTerm])

  // Set mounted flag
  useEffect(() => {
    setIsMounted(true)
    return () => setIsMounted(false)
  }, [])

  // Fetch conversations when component mounts and set up real-time subscriptions
  useEffect(() => {
    const fetchData = async () => {
      setIsLoadingConversations(true)
      setIsInitialLoadComplete(false)
      
      try {
        // Fetch conversations first
        await useChatStore.getState().fetchConversations()
        
        // Small delay to ensure conversations are fully loaded in state
        await new Promise(resolve => setTimeout(resolve, 50))
        
        // Refresh online statuses after fetching conversations
        await useChatStore.getState().refreshOnlineStatuses()

        // If there's an active conversation, fetch its messages
        const activeId = useChatStore.getState().activeConversationId
        if (activeId) {
          setIsLoadingMessages(true)
          await useChatStore.getState().fetchMessages(activeId)
          setIsLoadingMessages(false)
          
          // Track that we've fetched this conversation during initial load
          initiallyFetchedConversationRef.current = activeId
          
          // Ensure we scroll to bottom for the initial conversation load
          setTimeout(() => {
            if (messagesContainerRef.current) {
              setIsAtBottom(true)
              messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
            }
          }, 200)
          
          // Ensure conversations are fully loaded before showing content
          setTimeout(() => {
            setIsLoadingConversations(false)
            setIsInitialLoadComplete(true)
          }, 150)
        } else {
          // Even without active conversation, ensure conversations are loaded
          setTimeout(() => {
            setIsLoadingConversations(false)
            setIsInitialLoadComplete(true)
          }, 100)
        }
      } catch (error) {
        console.error("Error loading data:", error)
        setIsLoadingConversations(false)
        setIsInitialLoadComplete(true)
        setIsLoadingMessages(false)
      }
    }

    fetchData()

    // Set up real-time subscription for conversations
    const unsubscribeFromConversations = useChatStore.getState().subscribeToConversations()

    // Clean up subscription when component unmounts
    return () => {
      unsubscribeFromConversations()
    }
  }, [])

  // Listen for conversation creation events to update URL
  useEffect(() => {
    const handleConversationCreated = (event: CustomEvent) => {
      const { conversationId, supabaseId } = event.detail
      
      // Only update URL if this is the currently active conversation
      if (conversationId === activeConversationId && supabaseId) {
        console.log('[DEBUG] Updating URL for new conversation:', supabaseId)
        navigate(`/chat/${supabaseId}`, { replace: true })
      }
    }

    window.addEventListener('conversationCreated', handleConversationCreated as EventListener)
    
    return () => {
      window.removeEventListener('conversationCreated', handleConversationCreated as EventListener)
    }
  }, [activeConversationId, navigate])



  const handleClickOutsideEmojiPickerFn = useCallback((event: MouseEvent) => {
    if (
      pickerRef.current &&
      !pickerRef.current.contains(event.target as Node) &&
      !(event.target instanceof Element && event.target.closest(".emoji-button"))
    ) {
      setShowEmojiPicker(false)
    }
  }, [])

  const handleClickOutsideGifMenuFn = useCallback((event: MouseEvent) => {
    if (
      !(event.target instanceof Element && event.target.closest(".gif-button")) &&
      !(event.target instanceof Element && event.target.closest(".gif-menu"))
    ) {
      setShowGifMenu(false)
    }
  }, [])

  const handleClickOutsideMindMapSelectorFn = useCallback((event: MouseEvent) => {
    const mindMapSelector = document.querySelector(".mindmap-selector")
    if (
      mindMapSelector &&
      !mindMapSelector.contains(event.target as Node) &&
      !(event.target instanceof Element && event.target.closest(".mindmap-button"))
    ) {
      setShowMindMapSelector(false)
    }
  }, [])

  useEffect(() => {
    setHandleClickOutsideEmojiPicker(() => handleClickOutsideEmojiPickerFn)
    setHandleClickOutsideGifMenu(() => handleClickOutsideGifMenuFn)
    setHandleClickOutsideMindMapSelector(() => handleClickOutsideMindMapSelectorFn)

    if (isMounted) {
      document.addEventListener("mousedown", handleClickOutsideEmojiPickerFn)
      document.addEventListener("mousedown", handleClickOutsideGifMenuFn)
      document.addEventListener("mousedown", handleClickOutsideMindMapSelectorFn)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutsideEmojiPickerFn)
      document.removeEventListener("mousedown", handleClickOutsideGifMenuFn)
      document.removeEventListener("mousedown", handleClickOutsideMindMapSelectorFn)
    }
  }, [isMounted, handleClickOutsideEmojiPickerFn, handleClickOutsideGifMenuFn, handleClickOutsideMindMapSelectorFn])

  useEffect(() => {
    if (showEmojiPicker && handleClickOutsideEmojiPicker) {
      document.addEventListener("mousedown", handleClickOutsideEmojiPicker)
      return () => document.removeEventListener("mousedown", handleClickOutsideEmojiPicker)
    }
    return () => {}
  }, [showEmojiPicker, handleClickOutsideEmojiPicker])

  useEffect(() => {
    if (showGifMenu && handleClickOutsideGifMenu) {
      document.addEventListener("mousedown", handleClickOutsideGifMenu)
      return () => document.removeEventListener("mousedown", handleClickOutsideGifMenu)
    }
    return () => {}
  }, [showGifMenu, handleClickOutsideGifMenu])

  useEffect(() => {
    if (showMindMapSelector && handleClickOutsideMindMapSelector) {
      document.addEventListener("mousedown", handleClickOutsideMindMapSelector)
      return () => document.removeEventListener("mousedown", handleClickOutsideMindMapSelector)
    }
    return () => {}
  }, [showMindMapSelector, handleClickOutsideMindMapSelector])



  const handleInput = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "24px"
      const newHeight = Math.min(textareaRef.current.scrollHeight, 120)
      textareaRef.current.style.height = `${newHeight}px`
      textareaRef.current.style.overflowY = newHeight >= 120 ? "auto" : "hidden"
    }
  }

  useEffect(() => {
    handleInput()
  }, [message])

  // Debounced typing status effect - only for non-AI conversations
  useEffect(() => {
    // Skip for AI conversations or if no active conversation
    if (!activeConversationId || !activeConversation || activeConversation.isAI) {
      // Clear typing status if switching from non-AI to AI conversation
      if (isTypingRef.current) {
        isTypingRef.current = false
      }
      return
    }

    const hasText = message.trim().length > 0
    
    // Only update if typing status actually changed
    if (isTypingRef.current === hasText) return
    
    // Debounce typing status updates to prevent spam
    const timeoutId = setTimeout(async () => {
      // Double-check that the conversation hasn't changed and status is still different
      if (isTypingRef.current !== hasText && activeConversationId && activeConversation && !activeConversation.isAI) {
        isTypingRef.current = hasText
        try {
          await setTypingStatus(activeConversationId, hasText)
        } catch (error) {
          console.error("Error updating typing status:", error)
          // Revert local state if broadcast failed
          isTypingRef.current = !hasText
        }
      }
    }, 150) // 150ms debounce for better UX

    return () => clearTimeout(timeoutId)
  }, [message, activeConversationId, activeConversation?.isAI, setTypingStatus])

  // Cleanup typing status when conversation changes
  useEffect(() => {
    // Clear typing status for previous conversation when switching
    return () => {
      if (isTypingRef.current && activeConversationId && activeConversation && !activeConversation.isAI) {
        isTypingRef.current = false
        setTypingStatus(activeConversationId, false).catch(err =>
          console.error("Error clearing typing status on conversation change:", err)
        )
      }
    }
  }, [activeConversationId])

  // Initialize textarea height when component mounts
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "24px"
    }

    // Clean up typing status when component unmounts
    return () => {
      // Clear typing status when unmounting (skip for AI conversations)
      if (activeConversationId && activeConversation && !activeConversation.isAI && isTypingRef.current) {
        isTypingRef.current = false
        setTypingStatus(activeConversationId, false).catch(err =>
          console.error("Error clearing typing status on unmount:", err)
        )
      }
    }
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        if (
          document.activeElement === textareaRef.current &&
          textareaRef.current?.selectionStart === 0 &&
          selectedMindMap
        ) {
          setSelectedMindMap(null)
          e.preventDefault()
        }
      }
    }
    const container = inputContainerRef.current
    if (container) {
      container.addEventListener("keydown", handleKeyDown)
      return () => container.removeEventListener("keydown", handleKeyDown)
    }
  }, [selectedMindMap])



  const scrollToMessage = (messageId: number) => {
    const messageElement = messageRefs.current.get(messageId)
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: "smooth", block: "center" })
      messageElement.classList.add("bg-gray-700/50")
      setTimeout(() => messageElement.classList.remove("bg-gray-700/50"), 1500)
    }
  }

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      // Scroll to bottom immediately
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight

      // Force update isAtBottom state to true
      setTimeout(() => {
        setIsAtBottom(true)
      }, 50)
    }
  }

  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container
      const isBottom = scrollHeight - scrollTop - clientHeight < 1

      // Only update state if it's changed to avoid unnecessary re-renders
      if (isBottom !== isAtBottom) {
        setIsAtBottom(isBottom)

        // If we're at the bottom, hide the new messages indicator
        if (isBottom) {
          setHasUnreadMessages(false)
        }
      }
    }

    // Add scroll event listener with passive option for better performance
    container.addEventListener("scroll", handleScroll, { passive: true })

    // Initial check
    handleScroll()

    // If the container is not scrollable, make sure the new messages indicator is hidden
    if (!isScrollable()) {
      setHasUnreadMessages(false)
    }

    return () => container.removeEventListener("scroll", handleScroll)
  }, [isAtBottom])

  useEffect(() => {
    // Fetch messages for the active conversation
    // Remove the isInitialLoadComplete condition to ensure scrolling works even during initial load
    if (activeConversationId) {
      setIsLoadingMessages(true);
      setMessagesLoaded(false); // Reset messages loaded state
      
      // Reset scroll position state when switching conversations
      setIsAtBottom(true);
      setHasUnreadMessages(false);
      lastProcessedMessagesRef.current = null; // Reset to ensure first load behavior

      const fetchAndSetupConversation = async () => {
        try {
          // Skip fetching if we already fetched this conversation during initial load
          const alreadyFetched = initiallyFetchedConversationRef.current === activeConversationId
          
          if (!alreadyFetched) {
            // Fetch messages
            await useChatStore.getState().fetchMessages(activeConversationId);

            // Longer delay to ensure state is fully updated
            await new Promise(resolve => setTimeout(resolve, 100));
          } else {
            // Clear the ref since this is now a regular conversation change
            initiallyFetchedConversationRef.current = null
          }

          // Always scroll to bottom when first opening a conversation
          // This provides consistent behavior and users can manually scroll up if needed
          setIsAtBottom(true);
          if (messagesContainerRef.current) {
            setTimeout(() => scrollToBottom(), 150);
          }

          // Also add additional scroll attempts to ensure it works
          setTimeout(() => {
            if (messagesContainerRef.current) {
              messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
              setIsAtBottom(true);
            }
          }, 300);

          // One more attempt after a longer delay to handle any DOM updates
          setTimeout(() => {
            if (messagesContainerRef.current) {
              messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
              setIsAtBottom(true);
            }
          }, 500);

          // After fetching messages, check if there are unread messages for indicator
          const currentMessages = useChatStore.getState().getMessagesForActiveConversation();
          const unreadMessages = currentMessages.filter(m => m.senderId !== "me" && m.status !== "read");

          // Set hasUnreadMessages if there are unread messages (but don't scroll to them initially)
          setHasUnreadMessages(unreadMessages.length > 0);
          
          // Mark messages as loaded
          setMessagesLoaded(true);
        } catch (error) {
          console.error("Error fetching messages:", error);
          setMessagesLoaded(true); // Still mark as loaded even on error
        } finally {
          // Clear both loading states with proper timing
          setTimeout(() => {
            setIsLoadingMessages(false);
            setIsFetchingMessages(false);
          }, 150);
        }
      };

      fetchAndSetupConversation();

      // Set up real-time subscription for messages
      const unsubscribe = useChatStore.getState().subscribeToMessages(activeConversationId);

      // Clean up subscription when component unmounts or conversation changes
      return () => {
        // Clear typing status for the previous conversation (skip for AI conversations)
        const currentConversation = useChatStore.getState().conversations.find(c => c.id === activeConversationId);
        if (currentConversation && !currentConversation.isAI && isTypingRef.current) {
          isTypingRef.current = false
          setTypingStatus(activeConversationId, false).catch(err =>
            console.error("Error clearing typing status on conversation change:", err)
          );
        }

        unsubscribe();
      };
    }
  }, [activeConversationId, setTypingStatus])

  // Additional effect to handle first-time conversation selection
  // This specifically handles the case when going from no conversation to selecting one
  useEffect(() => {
    if (activeConversationId && messagesContainerRef.current) {
      // Add multiple scroll attempts with different delays to ensure it works
      const scrollAttempts = [100, 300, 500, 800];
      
      scrollAttempts.forEach(delay => {
        setTimeout(() => {
          if (messagesContainerRef.current && activeConversationId) {
            messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
            setIsAtBottom(true);
          }
        }, delay);
      });
    }
  }, [activeConversationId]) // Only depend on activeConversationId to trigger when conversation changes

  // Check if the messages container is scrollable
  const isScrollable = useCallback(() => {
    const container = messagesContainerRef.current
    if (!container) return false

    // If the scroll height is greater than the client height, it's scrollable
    return container.scrollHeight > container.clientHeight
  }, [])

  // Separate useEffect for managing unread messages indicator
  useEffect(() => {
    // If the container is not scrollable, hide the "New messages" indicator
    if (hasUnreadMessages && !isScrollable()) {
      setHasUnreadMessages(false)
    }
  }, [hasUnreadMessages, isScrollable])

  // Set up Intersection Observer to detect when messages are visible
  useEffect(() => {
    // Only set up observer if we have an active conversation
    if (!activeConversationId) return;

    // Create a new IntersectionObserver
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Get the message ID from the data attribute
            const messageId = entry.target.getAttribute('data-message-id');
            const senderId = entry.target.getAttribute('data-sender-id');

            // Only mark messages from other users as read
            if (messageId && senderId && senderId !== 'me') {
              const id = parseInt(messageId, 10);
              // Mark the message as read
              useChatStore.getState().updateMessageStatus(id, 'read');
              // Stop observing this message
              observerRef.current?.unobserve(entry.target);
            }
          }
        });
      },
      {
        root: messagesContainerRef.current,
        threshold: 0.5, // Message is considered visible when 50% is in view
      }
    );

    // Clean up observer when component unmounts or conversation changes
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [activeConversationId]);

  // Observe new messages as they are added to the DOM
  useEffect(() => {
    // Skip if no observer or no messages
    if (!observerRef.current || !messages.length) return;

    // Get all message elements that need to be observed
    const messageElements = document.querySelectorAll('[data-message-id]');

    // Observe each message element
    messageElements.forEach((element) => {
      const senderId = element.getAttribute('data-sender-id');
      // Only observe messages from other users
      if (senderId && senderId !== 'me') {
        observerRef.current?.observe(element);
      }
    });
  }, [messages]);

  // Separate useEffect for reactions, emphasis, and unread messages that only runs when messages change
  useEffect(() => {
    // Create a deep copy of the messages to prevent reference issues
    const currentMessages = [...messages]

    // Load reactions and emphasized messages from the fetched messages
    const newReactions: {[messageId: number]: {[reactionType: string]: string[]}} = {}
    const newEmphasized = new Set<number>()

    currentMessages.forEach(msg => {
      // Load reactions
      if (msg.reactions && Object.keys(msg.reactions).length > 0) {
        newReactions[msg.id] = JSON.parse(JSON.stringify(msg.reactions))
      }

      // Load emphasized messages
      if (msg.emphasized) {
        newEmphasized.add(msg.id)
      }
    })

    // Check for unread messages and update the indicator if we're not at the bottom and the container is scrollable
    const hasUnread = currentMessages.some(m => m.senderId !== "me" && m.status !== "read");
    if (hasUnread && !isAtBottom && isScrollable()) {
      setHasUnreadMessages(true);
    }

    // Use a ref to track if we've already processed these exact messages
    const messagesSignature = JSON.stringify(currentMessages.map(m => ({
      id: m.id,
      reactions: m.reactions,
      emphasized: m.emphasized
    })))

    // Auto-scroll to bottom only if user is already at bottom (standard chat behavior)
    // This handles new messages from both the current user and other users
    if (lastProcessedMessagesRef.current !== messagesSignature) {
      const wasAtBottom = isAtBottom
      const isFirstLoad = lastProcessedMessagesRef.current === null
      lastProcessedMessagesRef.current = messagesSignature
      setMessageReactions(newReactions)
      setEmphasizedMessages(newEmphasized)

      // If user was at bottom when new messages arrived, keep them at bottom
      // Also scroll to bottom on first load of messages for a conversation
      if ((wasAtBottom || isFirstLoad) && messagesContainerRef.current) {
        setTimeout(() => scrollToBottom(), 0)
        
        // For first loads, add additional scroll attempts to ensure it works
        if (isFirstLoad) {
          setTimeout(() => {
            if (messagesContainerRef.current) {
              messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
              setIsAtBottom(true);
            }
          }, 100);
          
          setTimeout(() => {
            if (messagesContainerRef.current) {
              messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
              setIsAtBottom(true);
            }
          }, 300);
        }
      }
    }
  }, [messages, isAtBottom])

  // Auto-scroll when thinking indicator appears/disappears (only if already at bottom)
  useEffect(() => {
    if (showThinkingIndicator && isAtBottom && messagesContainerRef.current) {
      // Use a longer timeout to ensure the thinking indicator is fully rendered
      setTimeout(() => scrollToBottom(), 100)
    }
  }, [showThinkingIndicator, isAtBottom])

  // Auto-scroll when typing indicator appears/disappears (only if already at bottom)
  useEffect(() => {
    if (activeConversation && !activeConversation.isAI && isAtBottom && messagesContainerRef.current) {
      const isTyping = getTypingStatus(activeConversation.id)
      if (isTyping) {
        // Use a longer timeout to ensure the typing indicator is fully rendered
        setTimeout(() => scrollToBottom(), 100)
      }
    }
  }, [activeConversation, isAtBottom, typingUsers, getTypingStatus])

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (message.trim() || selectedMindMap) {
      if (activeConversation?.isAI) {
        setShowThinkingIndicator(true)
        setIsAITyping(true)
      }

      const mindMapId = selectedMindMap?.id
      const textToSend = message.trim()


      useChatStore.getState().sendMessage(textToSend, mindMapId)

      if (activeConversation?.isAI) {
        const currentConvId = activeConversationId
        const initialMessageCount = useChatStore
          .getState()
          .messages.filter((m) => m.conversationId === currentConvId).length

        const checkForResponse = () => {
          const currentMessages = useChatStore.getState().messages.filter((m) => m.conversationId === currentConvId)
          if (currentMessages.length > initialMessageCount) {
            const newestMessage = currentMessages[currentMessages.length - 1]
            if (newestMessage.senderId !== "me") {
              setShowThinkingIndicator(false)
              setIsAITyping(false)
              return true
            }
          }
          return false
        }

        const checkInterval = setInterval(() => {
          if (checkForResponse()) {
            clearInterval(checkInterval)
          }
        }, 100)

        setTimeout(() => {
          clearInterval(checkInterval)
          setShowThinkingIndicator(false)
          setIsAITyping(false)
        }, 30000)
      }

      setMessage("")
      setSelectedMindMap(null)
      if (textareaRef.current) {
        textareaRef.current.style.height = "32px"
      }

      // Clear typing status after sending a message
      if (activeConversationId) {
        isTypingRef.current = false
        setTypingStatus(activeConversationId, false).catch(err =>
          console.error("Error clearing typing status after sending message:", err)
        )
      }

      // AI preview functionality is handled elsewhere
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && e.shiftKey) {
      e.preventDefault()
      setMessage((prev) => prev + "\n")
      setTimeout(() => {
        handleInput()
        if (textareaRef.current) {
          textareaRef.current.scrollTop = textareaRef.current.scrollHeight
        }
      }, 0)
    } else if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage(e)
    } else if (e.key === "Escape" && replyingToMessage) {
      e.preventDefault()
      setReplyingToMessage(null)
    }
  }

  const handleSelectMindMap = (mapId: string) => {
    const selectedMap = maps.find((m) => m.id === mapId)
    if (selectedMap) {
      setSelectedMindMap({ 
        id: mapId, 
        title: selectedMap.title,
        visibility: selectedMap.visibility || 'private'
      })
    }
    setShowMindMapSelector(false)
  }

  const handleRemoveMindMap = () => {
    setSelectedMindMap(null)
    if (textareaRef.current) {
      textareaRef.current.focus()
    }
  }

  const handleCreateMindMapAccept = () => {
    setShowCreateMindMapForm(false)
    setNewMindMapTitle("")
    setShowMindMapSelector(false)
  }

  const handleCreateMindMapReject = () => {
    setShowCreateMindMapForm(false)
    setNewMindMapTitle("")
  }

  const handleBotMenuToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowBotMenu((prev) => !prev)
  }

  const handleNewConversation = () => {
    setShowNewConversationModal(true
    )
  }

  const handleNewAIConversation = async () => {
    try {
      const currentBot = aiService.getCurrentBot()
      const conversationId = await useChatStore.getState().createAIConversation(currentBot.name)
      
      // Ensure the conversation is properly selected with URL navigation
      if (conversationId && conversationId !== -1) {
        selectConversation(conversationId)
      }
    } catch (error) {
      console.error("Error creating AI conversation:", error)
    }
  }

  const handleBotChange = (botId: string) => {
    aiService.setCurrentBot(botId)
    if (activeConversation?.isAI && activeConversation.botId === aiService.getCurrentBot().id) {
      const newBot = aiService.getCurrentBot()
      useChatStore.getState().updateConversationName(activeConversationId!, newBot.name)
    }
  }

  const handleCreateConversation = useCallback(async (userId: string, userName: string, isOnline: boolean) => {
    try {
      console.log('[DEBUG] Creating conversation with user:', userName)
      const conversationId = await createConversation(userId, userName, isOnline)
      console.log('[DEBUG] Conversation created, ID:', conversationId)
      
      setShowNewConversationModal(false)
      
      // Ensure the conversation is properly selected with URL navigation
      if (conversationId && conversationId !== -1) {
        selectConversation(conversationId)
      }
    } catch (error) {
      console.error("Error creating conversation:", error)
      setShowNewConversationModal(false)
    }
  }, [createConversation, selectConversation])

  const handleDeleteConversation = useCallback(async () => {
    if (activeConversationId) {
      try {
        // Show loading state if needed
        await deleteConversation(activeConversationId)
        setShowConversationMenu(false)
      } catch (error) {
        console.error("Error deleting conversation:", error)
      }
    }
  }, [activeConversationId, deleteConversation])

  const handleEmojiSelect = (emojiData: EmojiClickData) => {
    setMessage((prev) => prev + emojiData.emoji)
    setShowEmojiPicker(false)
  }

  const handleGifSelect = (gifUrl: string) => {
    // Create a message with the GIF URL
    useChatStore.getState().sendMessage(`![GIF](${gifUrl})`, undefined)
    setShowGifMenu(false)
  }

  const formatTime = useCallback((date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }, [])

  const formatDate = useCallback((date: Date) => {
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    if (date.toDateString() === today.toDateString()) return "Today"
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday"

    // Get user's preferred date format from localStorage
    const savedDateFormat = localStorage.getItem('dateFormat') as 'month-day-year' | 'day-month-year' | null
    const dateFormat = savedDateFormat || 'month-day-year'

    if (dateFormat === 'day-month-year') {
      return format(date, 'dd.MM.yyyy')
    } else {
      return format(date, 'MMM d, yyyy')
    }
  }, [])

  const handleMenuToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowConversationMenu((prev) => !prev)
  }

  const handleEmojiPickerToggle = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setShowEmojiPicker((prev) => !prev)
    setShowGifMenu(false) // Close GIF menu when opening emoji picker
  }

  const handleGifMenuToggle = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setShowGifMenu((prev) => !prev)
    setShowEmojiPicker(false) // Close emoji picker when opening GIF menu
  }

  const handleTogglePin = async () => {
    if (activeConversationId) {
      try {
        // Show loading state if needed
        await useChatStore.getState().togglePin(activeConversationId)
        setShowConversationMenu(false)
      } catch (error) {
        console.error("Error toggling pin status:", error)
      }
    }
  }

  const handleStartEdit = (messageId: number, text: string) => {
    setEditingMessageId(messageId)
    setEditText(text)
    setEditingAnimationId(messageId)
    setTimeout(() => {
      setEditingAnimationId(null)
    }, 300)
    setTimeout(() => {
      if (editTextareaRef.current) {
        editTextareaRef.current.focus()
      }
    }, 0)
  }



  const handleSaveEdit = (messageId: number) => {
    if (editText.trim()) {
      useChatStore.getState().editMessage(messageId, editText.trim())
      setEditingMessageId(null)
      setEditText("")
    }
  }

  const handleEditInput = () => {
    if (editTextareaRef.current) {
      editTextareaRef.current.style.height = "20px"
      const newHeight = Math.min(editTextareaRef.current.scrollHeight, 120)
      editTextareaRef.current.style.height = `${newHeight}px`
    }
  }

  useEffect(() => {
    handleEditInput()
  }, [editText])

  const handleDeleteMessage = async (messageId: number) => {
    // Find the message element and reset its padding before marking as deleted
    const messageElement = messageRefs.current.get(messageId);
    if (messageElement) {
      // Reset the padding to default
      const userMessageElement = messageElement.querySelector('.user-message');
      if (userMessageElement) {
        (userMessageElement as HTMLElement).style.paddingLeft = '12px';
      }
    }

    try {
      // Mark the message as deleted (not actually deleted from the database)
      await useChatStore.getState().deleteMessage(messageId);
    } catch (error) {
      console.error("Error marking message as deleted:", error);
    }
  }

  const handleReplyMessage = (messageId: number) => {
    const messageToReply = getMessageById(messageId)
    if (messageToReply) {
      setReplyingToMessage(messageToReply)
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus()
        }
      }, 0)
    }
  }

  const handleReactToMessage = (messageId: number, reactionType: string) => {
    // Get current user ID
    const currentUserId = user?.id || 'anonymous'

    // Clear the reactingToMessageId when a reaction is selected
    setReactingToMessageId(null)

    setMessageReactions(prevReactions => {
      const messageReactions = prevReactions[messageId] || {}
      const currentReactionUsers = messageReactions[reactionType] || []

      // Check if user already has this reaction
      const hasThisReaction = currentReactionUsers.includes(currentUserId)

      // Create a new message reactions object with user removed from all reactions
      const newMessageReactions = Object.fromEntries(
        Object.entries(messageReactions).map(([type, users]) => [
          type,
          users.filter(id => id !== currentUserId)
        ])
      )

      // If user didn't have this reaction before, add them to it
      // If they did have it, they'll be removed from all reactions (including this one)
      if (!hasThisReaction) {
        if (!newMessageReactions[reactionType]) {
          newMessageReactions[reactionType] = []
        }
        newMessageReactions[reactionType] = [...newMessageReactions[reactionType], currentUserId]
      }

      // Save reactions to Supabase
      useChatStore.getState().saveMessageReactions(messageId, newMessageReactions)

      return {
        ...prevReactions,
        [messageId]: newMessageReactions
      }
    })
  }

  const handleEmphasizeMessage = (messageId: number) => {
    setEmphasizedMessages(prevEmphasized => {
      const newEmphasized = new Set(prevEmphasized)
      const isCurrentlyEmphasized = newEmphasized.has(messageId)

      if (isCurrentlyEmphasized) {
        newEmphasized.delete(messageId)
      } else {
        newEmphasized.add(messageId)
      }

      // Save emphasized status to Supabase
      useChatStore.getState().saveEmphasizedMessage(messageId, !isCurrentlyEmphasized)

      return newEmphasized
    })
  }

  // Render message reactions
  const renderMessageReactions = (messageId: number, isUserMessage: boolean = false) => {
    if (!messageReactions[messageId] || Object.keys(messageReactions[messageId]).length === 0) {
      return null;
    }

    return (
      <div className={`absolute flex gap-1 ${isUserMessage ? 'right-2' : 'left-2'} bottom-0 translate-y-[calc(100%-4px)] message-reactions z-10`}>
        {Object.entries(messageReactions[messageId]).map(([type, users]) => {
          if (users.length === 0) return null;
          const imagePath = getReactionImagePath(type);

          const currentUserId = user?.id || 'anonymous';
          const userHasReacted = users.includes(currentUserId);

          return (
            <div
              key={`${messageId}-${type}`}
              className={`${
                userHasReacted 
                  ? 'bg-gradient-to-r from-blue-500/30 to-purple-500/30 border-blue-400/50' 
                  : 'bg-black/20 border-white/20'
              } backdrop-blur-md rounded-full px-2 py-1 flex items-center gap-1 text-sm cursor-pointer hover:bg-gradient-to-r hover:from-blue-500/40 hover:to-purple-500/40 hover:border-blue-400/60 transition-all duration-200 shadow-lg`}
              title={`${userHasReacted ? 'Remove your reaction' : 'Add your reaction'} (${users.length} ${users.length === 1 ? 'person' : 'people'})`}
              onClick={(e) => {
                e.stopPropagation();
                handleReactToMessage(messageId, type);
              }}
            >
              <img src={imagePath} alt={type} className="w-6 h-6 object-contain" />
              {users.length > 1 && <span className="text-white font-medium">{users.length}</span>}
            </div>
          );
        })}
      </div>
    );
  };

  const renderReplyContext = (replyToId: number | undefined) => {
    if (!replyToId) return null
    const replyToMessage = getMessageById(replyToId)
    if (!replyToMessage) {
      // If we can't find the message being replied to, show a placeholder
      return (
        <div className="mb-1 text-xs">
          <div className="flex items-center gap-1 text-gray-400">
            <Reply className="h-3 w-3" />
            <span>Replying to message</span>
          </div>
        </div>
      )
    }
    const isReplyToUserMessage = replyToMessage.senderId === "me"
    const replyToName = isReplyToUserMessage ? "You" : activeConversation?.name || "User"

    // Check if the message is a GIF
    const isGif = replyToMessage.text.match(/!\[GIF\]\((https?:\/\/[^\s)]+)\)/);
    
    // Check if it's a mindmap
    const isMindmap = replyToMessage.type === "mindmap" && replyToMessage.mindMapId;
    
    // Find the mindmap title if it's a mindmap message
    const mindmapTitle = isMindmap && replyToMessage.mindMapId ? 
      useMindMapStore.getState().maps.find(m => m.id === replyToMessage.mindMapId)?.title || "Mindmap" : 
      null;

    return (
      <div className="mb-1 text-xs">
        <div
          className="flex items-center gap-1 text-gray-400 cursor-pointer hover:text-gray-300 transition-colors"
          onClick={(e) => {
            e.stopPropagation()
            scrollToMessage(replyToId)
          }}
        >
          <Reply className="h-3 w-3" />
          <span>Replying to </span>
          <span className={isReplyToUserMessage ? "text-blue-400" : "text-gray-300"}>{replyToName}</span>
        </div>
        <div
          className="pl-4 border-l-2 border-gray-700 mt-1 cursor-pointer hover:border-gray-500 transition-colors"
          onClick={(e) => {
            e.stopPropagation()
            scrollToMessage(replyToId)
          }}
        >
          {isGif ? (
            <div className="flex items-center gap-1 text-gray-400">
              <Image className="h-3 w-3" />
              <span>GIF</span>
            </div>
          ) : isMindmap ? (
            <div className="flex items-center gap-1 text-sky-400">
              <Network className="h-3 w-3 text-sky-400" />
              <span className="text-sky-400">{mindmapTitle}</span>
            </div>
          ) : (
            <div className="text-gray-400 truncate max-w-[250px]">
              {replyToMessage.deleted ? <span className="italic">Message deleted</span> : replyToMessage.text}
            </div>
          )}
        </div>
      </div>
    )
  }

  useEffect(() => {
    const fetchAvatar = async () => {
      if (user?.id) {
        const { data, error } = await supabase
          .from("profiles")
          .select("avatar_url")
          .eq("id", user.id)
          .single()

        if (error) {
          console.error("Error fetching avatar:", error)
        } else {
          const fetchedAvatarUrl = data?.avatar_url || null
          if (fetchedAvatarUrl !== cachedAvatarUrl) {
            cacheAvatarUrl(fetchedAvatarUrl) // Update the cache if the avatar has changed
          }
        }
      }
    }

    fetchAvatar()
  }, [user?.id, cachedAvatarUrl, cacheAvatarUrl])

  // Presence tracking effect
  useEffect(() => {
    const handleOnlineStatus = async () => {
      if (user?.id) {
        // Update last_seen timestamp in the database
        await updateLastSeen(user.id)
      }
    }

    handleOnlineStatus()

    // Set up a timer to update the last_seen timestamp periodically
    const interval = setInterval(handleOnlineStatus, 5 * 60 * 1000) // 5 minutes interval

    return () => clearInterval(interval)
  }, [user?.id])


  return (
    <div className="fixed inset-0 w-screen h-screen overflow-auto">
      <style dangerouslySetInnerHTML={{ __html: `
        /* Modern message bubble design - uniform styling for all messages */

        /* Enhanced consecutive message styling */
        .consecutive-message {
          margin-top: 3px !important;
        }

        /* Improved emphasized message styling */
        .emphasized-message {
          animation: emphasize-pulse 2s ease-in-out;
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.4), 
                      0 0 20px rgba(59, 130, 246, 0.3);
        }

        @keyframes emphasize-pulse {
          0%, 100% { 
            box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.4), 0 0 20px rgba(59, 130, 246, 0.3); 
          }
          50% { 
            box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.6), 0 0 30px rgba(59, 130, 246, 0.5); 
          }
        }

        /* Deleted message styling */
        .deleted-message {
          opacity: 0.6;
          pointer-events: none;
          filter: grayscale(0.5);
          transform: scale(0.98);
        }

        /* Performance optimized scrollbar */
        .scrollbar-thin {
          scrollbar-width: thin;
          scrollbar-color: rgba(71, 85, 105, 0.6) transparent;
        }
        
        .scrollbar-thin::-webkit-scrollbar {
          width: 6px;
        }
        .scrollbar-thin::-webkit-scrollbar-track {
          background: transparent;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: rgba(71, 85, 105, 0.6);
          border-radius: 3px;
          transition: background 0.2s ease;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: rgba(100, 116, 139, 0.8);
        }

        /* Message transition animations */
        .message-enter {
          opacity: 0;
          transform: translateY(10px) scale(0.98);
        }
        
        .message-enter-active {
          opacity: 1;
          transform: translateY(0) scale(1);
          transition: all 0.25s ease-out;
        }

        /* Enhanced hover effects for better UX */
        .message-container {
          transition: all 0.2s ease-out;
        }
        
        .message-container:hover {
          transform: translateY(-0.5px);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
        }

        /* Typing indicator animation */
        .typing-dot {
          animation: typing 1.4s infinite ease-in-out;
        }
        
        .typing-dot:nth-child(1) { animation-delay: -0.32s; }
        .typing-dot:nth-child(2) { animation-delay: -0.16s; }
        
        @keyframes typing {
          0%, 80%, 100% { 
            transform: scale(0.8); 
            opacity: 0.5; 
          }
          40% { 
            transform: scale(1); 
            opacity: 1; 
          }
        }

        /* Enhanced bubble design for special message types */
        .accepted-mindmap-bubble {
          background: linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(34, 197, 94, 0.25)) !important;
          border: 1px solid rgba(34, 197, 94, 0.3) !important;
          box-shadow: 0 0 20px rgba(34, 197, 94, 0.1);
        }

        .rejected-mindmap-bubble {
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(239, 68, 68, 0.25)) !important;
          border: 1px solid rgba(239, 68, 68, 0.3) !important;
          box-shadow: 0 0 20px rgba(239, 68, 68, 0.1);
        }

        /* Modern glassmorphism effect for message containers */
        .message-glassmorphism {
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        /* Improved focus states for accessibility */
        .message-container:focus-within {
          outline: 2px solid rgba(59, 130, 246, 0.5);
          outline-offset: 2px;
        }

        /* Ensure message menu appears above everything */
        .message-menu {
          z-index: 9999 !important;
          position: absolute !important;
        }

        /* Ensure message containers don't create new stacking contexts that interfere with menu */
        .message-container {
          position: relative;
          z-index: 1;
        }
      ` }} />
      
      <div className="w-[98vw] max-w-none mx-auto pb-6 pt-[calc(5rem+0.5rem)] min-h-full">
        <div className="h-[calc(100vh-7rem)]">
          <div className="flex h-full">
          {/* Enhanced Conversations List */}
          <div
            className={`${
              isMobile
                ? `absolute inset-0 z-50 transform transition-transform duration-300 ease-in-out ${
                    showConversations ? "translate-x-0" : "-translate-x-full"
                  }`
                : "w-96"
            } bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl rounded-2xl border border-slate-700/30 shadow-2xl flex flex-col h-full overflow-hidden`}
          >
            {/* Enhanced Header */}
            <div className="p-6 border-b border-slate-700/30 bg-gradient-to-r from-slate-800/60 to-slate-900/60 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  Messages
                </h2>
                <div className="flex gap-2">
                  <div className="relative">
                    <button
                      type="button"
                      className="group p-2.5 rounded-xl bg-gradient-to-r from-slate-700/50 to-slate-800/50 hover:from-blue-500/20 hover:to-purple-500/20 text-slate-300 hover:text-blue-400 transition-all duration-200 border border-slate-600/30 hover:border-blue-500/50 hover:scale-105"
                      onClick={handleBotMenuToggle}
                      title="Chat with AI"
                    >
                      <Bot className="h-5 w-5 transition-transform group-hover:scale-110" />
                    </button>
                  </div>
                  <button
                    type="button"
                    className="group p-2.5 rounded-xl bg-gradient-to-r from-slate-700/50 to-slate-800/50 hover:from-blue-500/20 hover:to-purple-500/20 text-slate-300 hover:text-blue-400 transition-all duration-200 border border-slate-600/30 hover:border-blue-500/50 hover:scale-105"
                    onClick={handleNewConversation}
                    title="New conversation"
                  >
                    <PlusCircle className="h-5 w-5 transition-transform group-hover:scale-110" />
                  </button>
                </div>
              </div>
              
              {/* Enhanced Search Bar */}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  placeholder="Search conversations..."
                  value={conversationSearchTerm}
                  onChange={(e) => setConversationSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-12 py-3 rounded-xl bg-slate-800/60 border border-slate-600/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 text-slate-200 placeholder:text-slate-400 transition-all duration-200"
                />
                {conversationSearchTerm && (
                  <button
                    onClick={() => setConversationSearchTerm("")}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
            
            {/* Enhanced Conversations List Content */}
            <div className="flex-1 overflow-hidden py-4 px-4">
              {isLoadingConversations || !isInitialLoadComplete ? (
                <div className="space-y-3">
                  {Array(5).fill(0).map((_, index) => (
                    <ConversationSkeletonLoader key={`skeleton-${index}`} />
                  ))}
                </div>
              ) : (
                <div className="h-full">
                  {conversations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-center p-6">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-700/50 to-slate-800/50 flex items-center justify-center mb-4 border border-slate-600/30">
                        <PlusCircle className="h-8 w-8 text-slate-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-slate-300 mb-2">No conversations yet</h3>
                      <p className="text-sm text-slate-400 max-w-xs leading-relaxed">
                        Start a new conversation by clicking the + button above.
                      </p>
                    </div>
                  ) : filteredConversations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-center p-6">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-700/50 to-slate-800/50 flex items-center justify-center mb-4 border border-slate-600/30">
                        <Search className="h-8 w-8 text-slate-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-slate-300 mb-2">No matches found</h3>
                      <p className="text-sm text-slate-400 max-w-xs leading-relaxed">
                        Try a different search term or clear the search to see all conversations.
                      </p>
                    </div>
                  ) : (
                    <VirtualizedConversationList
                      conversations={filteredConversations}
                      activeConversationId={activeConversationId}
                      setActiveConversation={selectConversation}
                      isMobile={isMobile}
                      setShowConversations={setShowConversations}
                      getTypingStatus={getTypingStatus}
                      typingUsers={typingUsers}
                      isLoading={false}
                      searchTerm={conversationSearchTerm}
                    />
                  )}
                </div>
              )}
            </div>
            
            {/* Enhanced Settings Footer */}
            <div className="p-4 border-t border-slate-700/30 bg-gradient-to-r from-slate-800/40 to-slate-900/40">
              <button
                type="button"
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-300 hover:text-white hover:bg-slate-700/50 transition-all duration-200 border border-transparent hover:border-slate-600/30"
              >
                <Settings className="h-5 w-5" />
                <span className="font-medium">Settings</span>
              </button>
            </div>
          </div>

          {/* Enhanced Chat Area */}
          <div className="flex-1 flex flex-col bg-gradient-to-br from-slate-800/30 to-slate-900/30 backdrop-blur-xl rounded-2xl border border-slate-700/30 shadow-2xl overflow-hidden">
            {activeConversation && (
              <div className="p-6 border-b border-slate-700/30 bg-gradient-to-r from-slate-800/60 to-slate-900/60 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {isMobile && (
                      <button
                        type="button"
                        onClick={() => setShowConversations(true)}
                        className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-all duration-200 md:hidden"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                    )}
                    <div className="relative group">
                      <div
                        className={`w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-700/60 to-slate-800/60 flex items-center justify-center flex-shrink-0 border border-slate-600/30 transition-all duration-200 ${
                          !activeConversation.isAI 
                            ? "cursor-pointer hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/25 hover:scale-105" 
                            : ""
                        }`}
                        onClick={() => {
                          if (!activeConversation.isAI && activeConversation.userId) {
                            navigate(`/${activeConversation.name}`);
                          }
                        }}
                      >
                        {activeConversation.isAI ? (
                          <img
                            src={
                              aiService.getAllBots().find((bot) => bot.id === activeConversation.botId)?.avatar ||
                              "/assets/avatars/bigglesmooth.jpg"
                            }
                            alt={activeConversation.name}
                            className="w-full h-full rounded-2xl object-cover"
                          />
                        ) : activeConversation.avatar ? (
                          <img
                            src={activeConversation.avatar}
                            alt={activeConversation.name}
                            className="w-full h-full rounded-2xl object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                              const parent = (e.target as HTMLImageElement).parentElement;
                              if (parent) {
                                const span = document.createElement('span');
                                span.className = 'text-lg font-semibold text-slate-300';
                                span.textContent = activeConversation.name.charAt(0).toUpperCase();
                                parent.appendChild(span);
                              }
                            }}
                          />
                        ) : (
                          <span className="text-lg font-semibold text-slate-300">
                            {activeConversation.name.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      {activeConversation.online && (
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-slate-800 shadow-lg"></div>
                      )}
                    </div>
                    
                    {/* Enhanced User Info */}
                    <div className="min-w-0 flex-1">
                      <h3
                        className={`text-xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent ${
                          !activeConversation.isAI ? "cursor-pointer hover:from-blue-400 hover:to-purple-400 transition-all duration-200" : ""
                        }`}
                        onClick={() => {
                          if (!activeConversation.isAI && activeConversation.userId) {
                            navigate(`/${activeConversation.name}`);
                          }
                        }}
                      >
                        {activeConversation.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        {activeConversation.isAI ? (
                          <div className="flex items-center gap-2">
                            <Bot className="w-4 h-4 text-blue-400" />
                            <span className="text-sm text-slate-400 font-medium">AI Assistant</span>
                          </div>
                        ) : activeConversation.online ? (
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span className="text-sm text-green-400 font-medium">Online</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-slate-500 rounded-full"></div>
                            <span className="text-sm text-slate-400">
                              Last seen {formatLastSeen(activeConversation.lastSeen || null)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Enhanced Action Buttons */}

                  <div className="flex items-center gap-2 relative">
                    {activeConversation?.isAI && (
                      <>
                        {/* Subtle "?" Help Button, first in order, no background */}
                        <button
                          type="button"
                          className="text-slate-400 hover:text-blue-400 transition-colors duration-200 font-bold text-lg leading-none px-2"
                          title="Help"
                          style={{ background: "none", boxShadow: "none", border: "none" }}
                          onClick={() => setShowAIHelpModal(true)}
                        >
                          ?
                        </button>
                        <button
                          type="button"
                          className="group p-2.5 rounded-xl bg-gradient-to-r from-slate-700/50 to-slate-800/50 hover:from-blue-500/20 hover:to-purple-500/20 text-slate-300 hover:text-blue-400 transition-all duration-200 border border-slate-600/30 hover:border-blue-500/50 hover:scale-105"
                          onClick={() => setShowAISettingsModal(true)}
                          title="AI Memory Settings"
                        >
                          <Settings className="h-5 w-5 transition-transform group-hover:scale-110" />
                        </button>
                      </>
                    )}
                    <button
                      ref={conversationMenuTriggerRef}
                      type="button"
                      className="group p-2.5 rounded-xl bg-gradient-to-r from-slate-700/50 to-slate-800/50 hover:from-slate-600/50 hover:to-slate-700/50 text-slate-300 hover:text-white transition-all duration-200 border border-slate-600/30 hover:border-slate-500/50 hover:scale-105 menu-button"
                      onClick={handleMenuToggle}
                    >
                      <MoreVertical className="h-5 w-5 transition-transform group-hover:scale-110" />
                    </button>
                    {showConversationMenu && activeConversationId && (
                      <ConversationMenu
                        conversationId={activeConversationId}
                        isPinned={activeConversation?.pinned || false}
                        onClose={() => setShowConversationMenu(false)}
                        onDelete={handleDeleteConversation}
                        onTogglePin={handleTogglePin}
                        triggerRef={conversationMenuTriggerRef}
                      />
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Enhanced Messages Area */}
            <div
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto py-6 px-6 space-y-4 scrollbar-thin relative z-0"
            >
              {/* Enhanced New Messages Indicator */}
              {activeConversation && hasUnreadMessages && isScrollable() && (
                <div className="sticky top-0 z-10 flex justify-center mb-6">
                  <div
                    className="bg-gradient-to-r from-blue-500/90 to-purple-500/90 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 cursor-pointer hover:from-blue-600/90 hover:to-purple-600/90 transition-all duration-200 backdrop-blur-sm border border-blue-400/30"
                    onClick={scrollToBottom}
                  >
                    <ChevronDown className="h-5 w-5 animate-bounce" />
                    <span className="font-medium">New messages</span>
                  </div>
                </div>
              )}

              {/* Enhanced No Conversation State */}
              {!activeConversation && (
                <div className="flex flex-col items-center justify-center h-full text-center p-8">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-700/50 to-slate-800/50 flex items-center justify-center mb-6 border border-slate-600/30">
                    <Users className="h-10 w-10 text-slate-400" />
                  </div>
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent mb-3">
                    No conversation selected
                  </h3>
                  <p className="text-slate-400 max-w-md leading-relaxed">
                    Select an existing conversation from the sidebar or start a new one by clicking the + button.
                  </p>
                </div>
              )}

              {/* Enhanced Loading State */}
              {(isLoadingMessages || isConversationTransitioning || isFetchingMessages || !messagesLoaded) && activeConversation && (
                <div className="space-y-6 px-4">
                  <MessageSkeletonLoader isUser={false} />
                  <MessageSkeletonLoader isUser={true} />
                  <MessageSkeletonLoader isUser={false} />
                  <MessageSkeletonLoader isUser={true} />
                  <MessageSkeletonLoader isUser={false} />
                </div>
              )}

              {/* Enhanced Messages with Performance Optimizations */}
              {!isLoadingMessages && !isConversationTransitioning && !isFetchingMessages && messagesLoaded && activeConversation && (
                <>
                  {messages.map((msg: any, i: number) => {
                    const isUser = msg.senderId === "me"
                    // Show date stamp if it's the first message or if the date is different from the previous message
                    const showTimestamp = i === 0 || new Date(messages[i - 1].timestamp).toDateString() !== new Date(msg.timestamp).toDateString()
                    const isConsecutive = i > 0 && messages[i - 1].senderId === msg.senderId && !messages[i - 1].deleted
                    const isLastUserMessage = isUser && !messages.slice(i + 1).some((m: any) => m.senderId === "me" && !m.deleted)

                    return (
                      <React.Fragment key={msg.id}>
                        {showTimestamp && (
                          <div className="flex justify-center my-6">
                            <div className="bg-slate-800/60 text-slate-400 text-xs px-4 py-2 rounded-full border border-slate-700/30 backdrop-blur-sm">
                              {formatDate(new Date(msg.timestamp))}
                            </div>
                          </div>
                        )}
                        <MessageBubble
                          msg={msg}
                          index={i}
                          isUser={isUser}
                          isConsecutive={isConsecutive}
                          isEditing={editingMessageId === msg.id}
                          showTimestamp={showTimestamp}
                          isLastUserMessage={isLastUserMessage}
                          activeConversation={activeConversation}
                          messageRefs={messageRefs}
                          reactingToMessageId={reactingToMessageId}
                          emphasizedMessages={emphasizedMessages}
                          messageReactions={messageReactions}
                          formatTime={formatTime}
                          handleReplyMessage={handleReplyMessage}
                          handleEmphasizeMessage={handleEmphasizeMessage}
                          renderReplyContext={renderReplyContext}
                          renderMessageReactions={renderMessageReactions}
                          navigate={navigate}
                          isAITyping={isAITyping}
                          editingAnimationId={editingAnimationId}
                          setEditText={setEditText}
                          editText={editText}
                          editTextareaRef={editTextareaRef}
                          handleSaveEdit={handleSaveEdit}
                          setEditingMessageId={setEditingMessageId}
                          setReactingToMessageId={setReactingToMessageId}
                          setShowReactionMenu={setShowReactionMenu}
                          aiService={aiService}
                          previewMaps={previewMaps}
                          messages={messages}
                          showMessageMenu={showMessageMenu}
                          setShowMessageMenu={setShowMessageMenu}
                          handleStartEdit={handleStartEdit}
                          handleDeleteMessage={handleDeleteMessage}
                        />
                      </React.Fragment>
                    )
                  })}
                </>
              )}
              {showThinkingIndicator && activeConversation?.isAI && (
                <ThinkingIndicator
                  name={activeConversation.name}
                  avatar={aiService.getAllBots().find((bot) => bot.id === activeConversation.botId)?.avatar}
                />
              )}
              {activeConversation && !activeConversation.isAI && getTypingStatus(activeConversation.id) && (
                <TypingIndicator
                  name={activeConversation.name}
                  avatar={activeConversation.avatar}
                />
              )}
            </div>


            {!isAtBottom && (
              <div className="absolute bottom-20 right-6 z-50">
                <button
                  onClick={scrollToBottom}
                  className="w-9 h-9 bg-slate-600/80 hover:bg-slate-500/80 text-slate-200 hover:text-white rounded-xl shadow-lg flex items-center justify-center transition-all duration-200"
                  aria-label="Scroll to bottom"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>
            )}


            {/* Enhanced Message Input Area */}
            {activeConversation ? (
              <div className="p-3 border-t border-slate-700/30 bg-gradient-to-r from-slate-800/60 to-slate-900/60 backdrop-blur-sm">
                <form onSubmit={handleSendMessage} className="flex flex-col gap-2">
                  {replyingToMessage && (
                    <ReplyPreview message={replyingToMessage} onCancel={() => setReplyingToMessage(null)} />
                  )}
                  
                  <div className="flex gap-2 items-end">
                    {/* Enhanced Action Buttons */}
                    <div className="flex gap-2">
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setShowMindMapSelector((prev) => !prev)}
                          className="group h-[36px] w-[36px] rounded-xl bg-gradient-to-r from-slate-700/50 to-slate-800/50 hover:from-blue-500/20 hover:to-purple-500/20 text-slate-300 hover:text-blue-400 transition-all duration-200 border border-slate-600/30 hover:border-blue-500/50 hover:scale-105 mindmap-button flex items-center justify-center"
                          title="Share a mindmap"
                        >
                          <Network className="h-4 w-4 transition-transform group-hover:scale-110" />
                        </button>
                        {showMindMapSelector && (
                          <MindMapSelector
                            searchTerm={mindMapSearchTerm}
                            setSearchTerm={setMindMapSearchTerm}
                            sortBy={mindMapSortBy}
                            setSortBy={setMindMapSortBy}
                            showCreateForm={showCreateMindMapForm}
                            setShowCreateForm={setShowCreateMindMapForm}
                            newMapTitle={newMindMapTitle}
                            setNewMapTitle={setNewMindMapTitle}
                            onSelectMindMap={handleSelectMindMap}
                            onCreateMindMap={handleCreateMindMapAccept}
                            onCancelCreate={handleCreateMindMapReject}
                            isAIConversation={activeConversation?.isAI}
                            onClose={() => setShowMindMapSelector(false)}
                            title="Share a mindmap"
                            mode="overlay"
                          />
                        )}
                      </div>
                    </div>

                    {/* Enhanced Input Container */}
                    <div ref={inputContainerRef} className="flex-1 relative">
                      <div className="w-full min-h-[36px] p-3 pr-20 rounded-xl bg-gradient-to-br from-slate-700/60 to-slate-800/60 backdrop-blur-sm border border-slate-600/30 focus-within:border-blue-500/50 focus-within:ring-2 focus-within:ring-blue-500/25 text-slate-200 transition-all duration-200 shadow-lg">
                        {selectedMindMap && (
                          <MindMapChip
                            mapId={selectedMindMap.id}
                            mapTitle={selectedMindMap.title}
                            visibility={selectedMindMap.visibility}
                            onRemove={handleRemoveMindMap}
                          />
                        )}
                        <textarea
                          ref={textareaRef}
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          onKeyDown={handleKeyDown}
                          onInput={handleInput}
                          placeholder={
                            replyingToMessage
                              ? "Type your reply..."
                              : selectedMindMap
                                ? "Add a message..."
                                : "Type a message..."
                          }
                          className="w-full bg-transparent border-none focus:outline-none resize-none overflow-hidden placeholder:text-slate-400 text-slate-200"
                          style={{ height: "24px", minHeight: "24px", maxHeight: "120px" }}
                        />
                      </div>
                      
                      {/* Enhanced Action Buttons */}
                      <div className="absolute right-2 bottom-2 flex items-center gap-1">
                        <button
                          type="button"
                          className="group p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-600/50 transition-all duration-200 gif-button"
                          onClick={handleGifMenuToggle}
                          title="Add GIF"
                        >
                          <Image className="h-4 w-4 transition-transform group-hover:scale-110" />
                        </button>
                        <button
                          type="button"
                          className="group p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-600/50 transition-all duration-200 emoji-button"
                          onClick={handleEmojiPickerToggle}
                          title="Add emoji"
                        >
                          <Smile className="h-4 w-4 transition-transform group-hover:scale-110" />
                        </button>
                        {showEmojiPicker && (
                          <div ref={pickerRef} className="absolute bottom-14 right-0 z-50">
                            <EmojiPicker onEmojiClick={handleEmojiSelect} lazyLoadEmojis={true} theme={"dark" as any} />
                          </div>
                        )}
                        {showGifMenu && (
                          <GifMenu onSelectGif={handleGifSelect} onClose={() => setShowGifMenu(false)} />
                        )}
                      </div>
                    </div>

                    {/* Enhanced Send Button */}
                    <button
                      type="submit"
                      className="group flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-xl font-semibold transition-all duration-200 shadow-xl hover:shadow-blue-500/25 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                      disabled={!message.trim() && !selectedMindMap}
                    >
                      <Send className="h-4 w-4 transition-transform group-hover:scale-110" />
                      <span>Send</span>
                    </button>
                  </div>
                </form>
              </div>
            ) : null}
          </div>
        </div>
      </div>
      
      {/* Enhanced Modals */}
      {showNewConversationModal && (
        <NewConversationModal
          onClose={() => setShowNewConversationModal(false)}
          onCreateConversation={handleCreateConversation}
        />
      )}
      
      {showBotMenu && (
        <AIChatMenu
          onClose={() => setShowBotMenu(false)}
          onSelectBot={(botId) => {
            handleBotChange(botId)
            handleNewAIConversation()
            setShowBotMenu(false)
          }}
        />
      )}
      
      {showAISettingsModal && activeConversation && (
        <AISettingsModal
          isOpen={showAISettingsModal}
          onClose={() => setShowAISettingsModal(false)}
          conversationId={activeConversationId}
        />
      )}

      {showAIHelpModal && (
        <AIHelpModal isOpen={showAIHelpModal} onClose={() => setShowAIHelpModal(false)} />
      )}

      {showReactionMenu && reactingToMessageId && (
        <ReactionMenu
          messageId={reactingToMessageId}
          onReact={(messageId, reactionType) => {
            handleReactToMessage(messageId, reactionType)
            setShowReactionMenu(false)
            setReactingToMessageId(null)
          }}
          onClose={() => {
            setShowReactionMenu(false)
            setReactingToMessageId(null)
          }}
          messageReactions={messageReactions}
        />
      )}
      </div>
    </div>
  )
}


const ConversationSkeletonLoader: React.FC = () => {
  return (
    <div className="px-2 py-1">
      <div className="w-full flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-br from-slate-800/40 to-slate-900/40 animate-pulse border border-slate-700/30">
        <div className="w-12 h-12 rounded-2xl bg-slate-700/50"></div>
        <div className="flex-1 min-w-0">
          <div className="h-4 w-3/4 bg-slate-700/50 rounded-lg mb-2"></div>
          <div className="h-3 w-1/2 bg-slate-600/40 rounded-lg"></div>
        </div>
        <div className="w-3 h-3 rounded-full bg-slate-700/50"></div>
      </div>
    </div>
  );
};


const MessageSkeletonLoader: React.FC<{ isUser?: boolean }> = ({ isUser = false }) => {
  return (
    <div className={`flex items-start gap-4 ${isUser ? "justify-end" : "justify-start"} mb-6`}>
      {!isUser && (
        <div className="w-10 h-10 rounded-2xl bg-slate-700/50 animate-pulse flex-shrink-0"></div>
      )}
      <div
        className={`${
          isUser
            ? "bg-gradient-to-br from-blue-500/30 to-purple-500/30 border border-blue-500/30"
            : "bg-gradient-to-br from-slate-700/40 to-slate-800/40 border border-slate-600/30"
        } rounded-2xl p-4 relative animate-pulse max-w-[75%] md:max-w-[55%] shadow-xl`}
        style={{ minWidth: "120px", minHeight: "60px" }}
      >
        <div className="space-y-2">
          <div className="h-4 w-full bg-slate-600/50 rounded-lg"></div>
          <div className="h-4 w-3/4 bg-slate-600/50 rounded-lg"></div>
          <div className="h-4 w-1/2 bg-slate-600/50 rounded-lg"></div>
        </div>
      </div>
    </div>
  );
};


// VirtualizedMessageList component removed - caused layout issues with fixed height
// Using direct rendering instead to maintain proper flex layout

// Extracted MessageBubble component for better reusability and performance
const MessageBubble: React.FC<{
  msg: any
  index: number
  isUser: boolean
  isConsecutive: boolean
  isEditing: boolean
  showTimestamp: boolean
  isLastUserMessage: boolean
  activeConversation: any
  messageRefs: React.MutableRefObject<Map<number, HTMLDivElement>>
  reactingToMessageId: number | null
  emphasizedMessages: Set<number>
  messageReactions: {[messageId: number]: {[reactionType: string]: string[]}}
  formatTime: (date: Date) => string
  handleReplyMessage: (messageId: number) => void
  handleEmphasizeMessage: (messageId: number) => void
  renderReplyContext: (replyToId: number | undefined) => React.ReactNode
  renderMessageReactions: (messageId: number, isUser?: boolean) => React.ReactNode
  navigate: (path: string) => void
  isAITyping: boolean
  editingAnimationId: number | null
  setEditText: (text: string) => void
  editText: string
  editTextareaRef: React.RefObject<HTMLTextAreaElement>
  handleSaveEdit: (messageId: number) => void
  setEditingMessageId: (id: number | null) => void
  setReactingToMessageId: (id: number | null) => void
  setShowReactionMenu: (show: boolean) => void
  aiService: any
  previewMaps: any
  messages: any[]
  showMessageMenu: number | null
  setShowMessageMenu: (id: number | null) => void
  handleStartEdit: (messageId: number, text: string) => void
  handleDeleteMessage: (messageId: number) => void
}> = React.memo(({ 
  msg, index, isUser, isConsecutive, isEditing,
  activeConversation, messageRefs, reactingToMessageId, emphasizedMessages,  messageReactions, formatTime, handleReplyMessage,
  handleEmphasizeMessage,
  renderReplyContext, renderMessageReactions, navigate,
  isAITyping, editingAnimationId, setEditText, editText, editTextareaRef,
  handleSaveEdit, setEditingMessageId, setReactingToMessageId, setShowReactionMenu, aiService, previewMaps, messages,
  showMessageMenu, setShowMessageMenu, handleStartEdit, handleDeleteMessage
}) => {
  const menuTriggerRef = useRef<HTMLButtonElement>(null)
  
  return (
    <div
      ref={(el) => {
        if (el) messageRefs.current.set(msg.id, el)
      }}
      data-message-id={msg.id}
      data-sender-id={msg.senderId}
      className={`${isConsecutive ? "consecutive-message" : "mt-6"} transition-all duration-300 ${
        reactingToMessageId === msg.id
          ? "bg-slate-700/30 rounded-2xl p-4 border border-slate-600/50"
          : !isUser && msg.status !== "read"
            ? "bg-blue-500/10 rounded-2xl p-2 border border-blue-500/20"
            : ""
      }`}
    >
      <div className={`flex items-start gap-4 ${isUser ? "justify-end" : "justify-start"}`}>
        {/* Enhanced Avatar for Other Users */}
        {!isUser && !isConsecutive && (
          <div
            className={`w-10 h-10 rounded-2xl bg-gradient-to-br from-slate-700/60 to-slate-800/60 flex-shrink-0 flex items-center justify-center border border-slate-600/30 transition-all duration-200 hover:shadow-lg hover:scale-105 ${
              !activeConversation?.isAI ? "cursor-pointer hover:border-blue-500/50 hover:shadow-blue-500/25" : ""
            }`}
            onClick={() => {
              if (!activeConversation?.isAI && activeConversation?.userId) {
                navigate(`/${activeConversation.name}`);
              }
            }}
          >
            {activeConversation?.isAI ? (
              <img
                src={aiService.getAllBots().find((bot: any) => bot.id === activeConversation.botId)?.avatar || "/placeholder.svg"}
                alt={activeConversation.name}
                className="w-full h-full rounded-2xl object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  const parent = (e.target as HTMLImageElement).parentElement;
                  if (parent) {
                    const span = document.createElement('span');
                    span.className = 'text-sm font-semibold text-slate-300';
                    span.textContent = activeConversation.name.charAt(0).toUpperCase();
                    parent.appendChild(span);
                  }
                }}
              />
            ) : activeConversation.avatar ? (
              <img
                src={activeConversation.avatar}
                alt={activeConversation.name}
                className="w-full h-full rounded-2xl object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  const parent = (e.target as HTMLImageElement).parentElement;
                  if (parent) {
                    const span = document.createElement('span');
                    span.className = 'text-sm font-semibold text-slate-300';
                    span.textContent = activeConversation.name.charAt(0).toUpperCase();
                    parent.appendChild(span);
                  }
                }}
              />
            ) : (
              <span className="text-sm font-semibold text-slate-300">
                {activeConversation.name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
        )}
        {!isUser && isConsecutive && <div className="w-10 flex-shrink-0" />}

        {/* Enhanced Other User Messages */}
        {!isUser && (
          <div className="max-w-[70%] md:max-w-[50%] flex-shrink-0 relative group/hover-area">
            {/* Extended hover area */}
            <div className="absolute -right-16 top-0 bottom-0 w-16 pointer-events-none"></div>
            {isAITyping && index === messages.length - 1 ? (
              <div className="bg-gradient-to-br from-slate-700/60 to-slate-800/60 backdrop-blur-sm text-slate-200 rounded-2xl p-4 border border-slate-600/30 shadow-lg relative flex items-center gap-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-slate-400 rounded-full typing-dot"></div>
                  <div className="w-2 h-2 bg-slate-400 rounded-full typing-dot"></div>
                  <div className="w-2 h-2 bg-slate-400 rounded-full typing-dot"></div>
                </div>
                <span className="text-sm text-slate-400">AI is thinking...</span>
              </div>
            ) : (
              <div
                className={`message-container p-4 rounded-2xl relative group/message shadow-xl transition-all duration-300 hover:shadow-2xl ${
                  msg.type === "accepted-mindmap"
                    ? "bg-gradient-to-br from-green-500/20 to-green-600/20 text-green-200 border border-green-500/30"
                    : msg.type === "rejected-mindmap"
                      ? "bg-gradient-to-br from-red-500/20 to-red-600/20 text-red-200 border border-red-500/30"
                      : "bg-gradient-to-br from-slate-700/60 to-slate-800/60 backdrop-blur-sm text-slate-200 border border-slate-600/30"
                } ${
                  emphasizedMessages.has(msg.id) ? "emphasized-message" : ""
                } ${msg.deleted ? "deleted-message" : ""} ${
                  messageReactions[msg.id] && Object.keys(messageReactions[msg.id]).some(type => messageReactions[msg.id][type].length > 0) ? "has-reactions" : ""
                }`}
              >
                {!msg.deleted && msg.replyToId && renderReplyContext(msg.replyToId)}

                {!msg.deleted && !activeConversation?.isAI && !isConsecutive && (
                  <div
                    className="text-xs font-medium text-blue-300 mb-2 cursor-pointer hover:text-blue-200 transition-colors"
                    onClick={() => {
                      if (!activeConversation?.isAI && activeConversation?.userId) {
                        navigate(`/${activeConversation.name}`);
                      }
                    }}
                  >
                    {activeConversation?.name}
                  </div>
                )}

                <div className="overflow-hidden break-words whitespace-pre-wrap w-full">
                  {msg.deleted ? (
                    <div className="flex items-center gap-2 text-slate-400/70 italic">
                      <X className="h-4 w-4" />
                      <span>Message deleted</span>
                    </div>
                  ) : (
                    <>
                      {/* Message content rendering logic */}
                      {activeConversation?.isAI &&
                        index > 0 &&
                        messages[index - 1].senderId === "me" &&
                        messages[index - 1].mindMapId &&
                        previewMaps[messages[index - 1].mindMapId || ''] &&
                        previewMaps[messages[index - 1].mindMapId || '']?.actionTaken === null &&
                        msg.type !== "accepted-mindmap" &&
                        msg.type !== "rejected-mindmap" && (
                          <PreviewMindMapNode
                            mapId={messages[index - 1].mindMapId || ''}
                            conversationId={msg.conversationId}
                            messageId={msg.id}
                          />
                        )}

                      {msg.type === "accepted-mindmap" ? (
                        <div className="flex items-center gap-2">
                          <Check className="h-5 w-5 text-green-400" />
                          <span className="font-medium">{msg.text}</span>
                        </div>
                      ) : msg.type === "rejected-mindmap" ? (
                        <div className="flex items-center gap-2">
                          <X className="h-5 w-5 text-red-400" />
                          <span className="font-medium">{msg.text}</span>
                        </div>
                      ) : msg.type === "mindmap" && msg.mindMapId ? (
                        <div>
                          <div className="mb-3">
                            <ChatMindMapNode
                              id={msg.mindMapId}
                              data={{ label: msg.text, mapId: msg.mindMapId }}
                              isConnectable={false}
                            />
                          </div>
                          {msg.text && (
                            <div className="text-sm text-slate-200 mt-3 border-t border-slate-700/20 pt-3 break-words whitespace-pre-wrap">
                              {msg.text}
                            </div>
                          )}
                          <div className="flex items-center justify-start gap-2 mt-1">
                            {msg.edited && (
                              <span className="text-xs text-slate-400/70">(edited)</span>
                            )}
                            <span className="text-xs text-slate-400/70">
                              {formatTime(new Date(msg.timestamp))}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col">
                          {msg.error ? (
                            <div className="flex flex-col space-y-2">
                              <MessageText text={msg.text} />
                              <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                                <X className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                                <div className="text-sm text-red-300">
                                  <span className="font-medium">Error:</span> {msg.error}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <MessageText text={msg.text} />
                          )}
                          <div className="flex items-center justify-start gap-2 mt-1">
                            {msg.edited && (
                              <span className="text-xs text-slate-400/70">(edited)</span>
                            )}
                            <span className="text-xs text-slate-400/70">
                              {formatTime(new Date(msg.timestamp))}
                            </span>
                          </div>
                        </div>
                      )}

                      {renderMessageReactions(msg.id, false)}
                    </>
                  )}
                </div>

                {/* WhatsApp-style hover icons for other user messages */}
                {!msg.deleted && (
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full opacity-0 group-hover/hover-area:opacity-100 transition-all duration-200 flex items-center gap-1 z-[9998] ml-4">
                    <button
                      className="p-2 rounded-full text-slate-400 hover:text-red-400 hover:bg-slate-800/80 transition-all duration-200 shadow-lg border border-slate-700/50 backdrop-blur-sm"
                      onClick={() => {
                        setReactingToMessageId(msg.id)
                        setShowReactionMenu(true)
                      }}
                      title="React"
                    >
                      <Heart className="h-4 w-4" />
                    </button>
                    <button
                      className="p-2 rounded-full text-slate-400 hover:text-blue-400 hover:bg-slate-800/80 transition-all duration-200 shadow-lg border border-slate-700/50 backdrop-blur-sm"
                      onClick={() => handleReplyMessage(msg.id)}
                      title="Reply"
                    >
                      <Reply className="h-4 w-4" />
                    </button>
                    <button
                      className={`p-2 rounded-full transition-all duration-200 shadow-lg border border-slate-700/50 backdrop-blur-sm ${
                        emphasizedMessages.has(msg.id)
                          ? "text-yellow-400 bg-yellow-400/20 hover:bg-yellow-400/30 border-yellow-400/50"
                          : "text-slate-400 hover:text-yellow-400 hover:bg-slate-800/80"
                      }`}
                      onClick={() => handleEmphasizeMessage(msg.id)}
                      title={emphasizedMessages.has(msg.id) ? "Remove emphasis" : "Emphasize"}
                    >
                      <Zap className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Enhanced User Messages */}
        {isUser && (
          <div
            className={`relative p-4 rounded-2xl message-container user-message group/hover-area transition-all duration-300 shadow-xl border ${
              editingAnimationId === msg.id ? "scale-[1.02] bg-blue-500/20 border-blue-400/50" : ""
            } ${
              isEditing 
                ? "bg-gradient-to-br from-slate-700/50 to-slate-800/50 border-slate-600/50" 
                : msg.senderId === "me" 
                  ? "bg-gradient-to-br from-blue-500 to-purple-600 text-white border-blue-400/30" 
                  : "bg-gradient-to-br from-slate-700/40 to-slate-800/40 border-slate-600/30"
            } ${
              emphasizedMessages.has(msg.id) ? "ring-2 ring-blue-500/70 shadow-[0_0_20px_rgba(59,130,246,0.4)] emphasized-message" : ""
            } ${
              messageReactions[msg.id] && Object.keys(messageReactions[msg.id]).some(type => messageReactions[msg.id][type].length > 0) ? "has-reactions" : ""
            }`}
            style={{
              position: "relative",
              transition: "all 0.3s ease-out"
            }}
          >
            {/* Extended hover area */}
            <div className="absolute -left-16 top-0 bottom-0 w-16 pointer-events-none"></div>
            {isEditing ? (
              <div className="space-y-3">
                <textarea
                  ref={editTextareaRef}
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="w-full bg-slate-800/60 border border-slate-600/50 rounded-xl p-3 text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 resize-none min-h-[100px] backdrop-blur-sm"
                  placeholder="Edit your message..."
                  autoFocus
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setEditingMessageId(null)}
                    className="bg-slate-700/60 hover:bg-slate-600/60 text-slate-300 hover:text-white rounded-xl px-4 py-2 text-sm flex items-center gap-2 font-medium transition-all duration-200 border border-slate-600/50"
                  >
                    <X className="h-4 w-4" />
                    Cancel
                  </button>
                  <button
                    onClick={() => handleSaveEdit(msg.id)}
                    className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-xl px-4 py-2 text-sm flex items-center gap-2 font-medium transition-all duration-200 shadow-lg hover:shadow-blue-500/25"
                  >
                    <Check className="h-4 w-4" />
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <div className="overflow-hidden break-words whitespace-pre-wrap w-full">
                {msg.deleted ? (
                  <div className="flex items-center gap-1.5 text-blue-200/70 italic pr-2">
                    <X className="h-4 w-4" />
                    <span>Message deleted</span>
                  </div>
                ) : (
                  <>
                    {msg.replyToId && renderReplyContext(msg.replyToId)}
                    {msg.type === "mindmap" && msg.mindMapId ? (
                      <div>
                        <div className="mb-2">
                          <ChatMindMapNode
                            id={msg.mindMapId}
                            data={{ label: msg.text, mapId: msg.mindMapId }}
                            isConnectable={false}
                          />
                        </div>
                        {msg.text && (
                          <div
                            className="text-sm text-white mt-2 border-t border-blue-400/20 pt-2 break-words whitespace-pre-wrap"
                            style={{ wordBreak: "break-word", overflowWrap: "break-word" }}
                          >
                            {msg.text}
                          </div>
                        )}
                        <div className="flex items-center justify-end gap-2 mt-1">
                          {msg.edited && (
                            <span className="text-xs text-blue-200/50">(edited)</span>
                          )}
                          <span className="text-xs text-blue-200/50">
                            {formatTime(new Date(msg.timestamp))}
                          </span>
                          {/* WhatsApp-style status indicators for user messages (only for real users, not AI) */}
                          {msg.senderId === "me" && !activeConversation?.isAI && (
                            <div className="flex items-center ml-1">
                              {msg.status === "sent" && (
                                <Check className="h-3 w-3 text-blue-200/60" />
                              )}
                              {msg.status === "delivered" && (
                                <CheckCheck className="h-3 w-3 text-white/60" />
                              )}
                              {msg.status === "read" && (
                                <CheckCheck className="h-3 w-3 text-blue-400" />
                              )}
                            </div>
                          )}
                        </div>

                        {renderMessageReactions(msg.id, isUser)}
                      </div>
                    ) : (
                      <div className="flex flex-col">
                        <MessageText text={msg.text} />
                        <div className="flex items-center justify-end gap-2 mt-1">
                          {msg.edited && (
                            <span className="text-xs text-blue-200/50">(edited)</span>
                          )}
                          <span className="text-xs text-blue-200/50">
                            {formatTime(new Date(msg.timestamp))}
                          </span>
                          {/* WhatsApp-style status indicators for user messages (only for real users, not AI) */}
                          {msg.senderId === "me" && !activeConversation?.isAI && (
                            <div className="flex items-center ml-1">
                              {msg.status === "sent" && (
                                <Check className="h-3 w-3 text-blue-200/60" />
                              )}
                              {msg.status === "delivered" && (
                                <CheckCheck className="h-3 w-3 text-white/60" />
                              )}
                              {msg.status === "read" && (
                                <CheckCheck className="h-3 w-3 text-blue-400" />
                              )}
                            </div>
                          )}
                        </div>
                        {renderMessageReactions(msg.id, isUser)}
                      </div>
                    )}

                    {/* WhatsApp-style hover icons for user messages */}
                    {!msg.deleted && (
                      <div className={`absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full transition-all duration-200 flex items-center gap-1 z-[9998] mr-4 ${
                        showMessageMenu === msg.id ? 'opacity-100' : 'opacity-0 group-hover/hover-area:opacity-100'
                      }`}>
                        <button
                          ref={menuTriggerRef}
                          className={`p-2 rounded-full transition-all duration-200 shadow-lg border backdrop-blur-sm message-menu-trigger ${
                            showMessageMenu === msg.id
                              ? 'text-slate-200 bg-slate-700/90 border-slate-600/70'
                              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 border-slate-700/50'
                          }`}
                          onClick={(e) => {
                            e.stopPropagation()
                            setShowMessageMenu(showMessageMenu === msg.id ? null : msg.id)
                          }}
                          title="More options"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                        <button
                          className="p-2 rounded-full text-slate-400 hover:text-blue-400 hover:bg-slate-800/80 transition-all duration-200 shadow-lg border border-slate-700/50 backdrop-blur-sm"
                          onClick={() => handleReplyMessage(msg.id)}
                          title="Reply"
                        >
                          <Reply className="h-4 w-4" />
                        </button>
                        <button
                          className="p-2 rounded-full text-slate-400 hover:text-red-400 hover:bg-slate-800/80 transition-all duration-200 shadow-lg border border-slate-700/50 backdrop-blur-sm"
                          onClick={() => {
                            setReactingToMessageId(msg.id)
                            setShowReactionMenu(true)
                          }}
                          title="React"
                        >
                          <Heart className="h-4 w-4" />
                        </button>
                        {showMessageMenu === msg.id && (
                          <MessageMenu
                            messageId={msg.id}
                            text={msg.text}
                            isUserMessage={true}
                            onEdit={handleStartEdit}
                            onDelete={handleDeleteMessage}
                            onEmphasize={handleEmphasizeMessage}
                            isEmphasized={emphasizedMessages.has(msg.id)}
                            onClose={() => setShowMessageMenu(null)}
                            triggerRef={menuTriggerRef}
                          />
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
})

const VirtualizedConversationList: React.FC<{
  conversations: any[]
  activeConversationId: number | null
  setActiveConversation: (id: number) => void
  isMobile: boolean
  setShowConversations: (show: boolean) => void
  getTypingStatus: (id: number) => boolean
  typingUsers: Record<number, string[]>
  isLoading?: boolean
  searchTerm?: string
}> = React.memo(({ conversations, activeConversationId, setActiveConversation, isMobile, setShowConversations, getTypingStatus, typingUsers, searchTerm = "" }) => {
  const listRef = useRef<HTMLDivElement>(null)
  const [listHeight, setListHeight] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  // Optimize height calculation with ResizeObserver
  useEffect(() => {
    if (!containerRef.current) return

    // Set initial height immediately to prevent layout issues
    const initialHeight = containerRef.current.getBoundingClientRect().height
    if (initialHeight > 0) {
      setListHeight(initialHeight)
    }

    const resizeObserver = new ResizeObserver(entries => {
      for (let entry of entries) {
        const newHeight = entry.contentRect.height
        // Ensure minimum height to prevent container collapse
        const minHeight = 200
        const finalHeight = Math.max(newHeight, minHeight)
        setListHeight(finalHeight)
      }
    })

    resizeObserver.observe(containerRef.current)
    
    return () => resizeObserver.disconnect()
  }, [])

  // Force height recalculation when conversations change to prevent confusion
  useEffect(() => {
    if (containerRef.current) {
      const currentHeight = containerRef.current.getBoundingClientRect().height
      const minHeight = 200
      const finalHeight = Math.max(currentHeight, minHeight)
      
      // Only update if height is significantly different
      if (Math.abs(listHeight - finalHeight) > 10) {
        setListHeight(finalHeight)
      }
    }
  }, [conversations.length, activeConversationId])

  // Memoize conversation items to prevent unnecessary re-renders
  const conversationItems = useMemo(() => 
    conversations.map(conversation => {
      const isTyping = getTypingStatus(conversation.id)
      return {
        ...conversation,
        isActive: conversation.id === activeConversationId,
        isTyping: isTyping
      }
    }), [conversations, activeConversationId, getTypingStatus, typingUsers]
  )

  const handleConversationClick = useCallback((conversationId: number) => {
    setActiveConversation(conversationId)
    if (isMobile) {
      setShowConversations(false)
    }
  }, [setActiveConversation, isMobile, setShowConversations])

  const renderConversationItem = useCallback(({ index, style }: { index: number; style: any }) => {
    if (index < 0 || index >= conversationItems.length) {
      return <div style={style} className="px-2 py-1"></div>
    }

    const conversation = conversationItems[index]
    
    if (!conversation || typeof conversation.id === 'undefined') {
      return <div style={style} className="px-2 py-1"></div>
    }
    
    return (
      <div style={style} key={conversation.id}>
        <div className="px-2 py-1">
          <div
            onClick={() => handleConversationClick(conversation.id)}
            className={`group cursor-pointer transition-all duration-300 ease-out transform hover:scale-[1.02] ${
              conversation.isActive
                ? "bg-gradient-to-r from-blue-500/30 to-purple-500/30 border-blue-400/50 shadow-lg shadow-blue-500/20"
                : "bg-gradient-to-br from-slate-800/40 to-slate-900/40 hover:from-slate-700/50 hover:to-slate-800/50 border-slate-700/30 hover:border-slate-600/50"
            } rounded-2xl p-4 border backdrop-blur-sm`}
          >
            <div className="flex items-center gap-4">
              {/* Enhanced Avatar */}
              <div className="relative flex-shrink-0">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-700/60 to-slate-800/60 flex items-center justify-center border border-slate-600/30 overflow-hidden">
                  {conversation.isAI ? (
                    <img
                      src={aiService.getAllBots().find((bot) => bot.id === conversation.botId)?.avatar || "/placeholder.svg"}
                      alt={conversation.name}
                      className="w-full h-full object-cover rounded-2xl"
                    />
                  ) : conversation.avatar ? (
                    <img
                      src={conversation.avatar}
                      alt={conversation.name}
                      className="w-full h-full object-cover rounded-2xl"
                    />
                  ) : (
                    <span className="text-sm font-semibold text-slate-300">
                      {conversation.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                
                {/* Enhanced Status Indicators */}
                {conversation.isAI ? (
                  <div className="absolute -bottom-1 -right-1">
                    <Bot className="w-4 h-4 text-blue-400" />
                  </div>
                ) : conversation.online ? (
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-slate-800"></div>
                ) : null}
                
                {conversation.pinned && (
                  <div className="absolute -top-1 -left-1 flex items-center justify-center">
                    <Pin className="w-4 h-4 text-blue-400" />
                  </div>
                )}
              </div>

              {/* Enhanced Conversation Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className={`font-semibold truncate transition-colors ${
                    conversation.isActive 
                      ? "text-white" 
                      : "text-slate-200 group-hover:text-white"
                  }`}>
                    {highlightSearchMatch(conversation.name, searchTerm)}
                  </h3>
                  <span className={`text-xs transition-colors ${
                    conversation.isActive 
                      ? "text-blue-200" 
                      : "text-slate-400 group-hover:text-slate-300"
                  }`}>
                    {formatTimeElapsed(new Date(conversation.timestamp))}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    {conversation.isTyping ? (
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-blue-400 rounded-full typing-dot animate-pulse"></div>
                          <div className="w-2 h-2 bg-blue-400 rounded-full typing-dot animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                          <div className="w-2 h-2 bg-blue-400 rounded-full typing-dot animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                        </div>
                        <span className="text-xs text-blue-400 font-medium">typing...</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        {/* Check if message is a GIF and show icon */}
                        {conversation.lastMessage && /!\[GIF\]\((https?:\/\/[^\s)]+)\)/.test(conversation.lastMessage) && (
                          <Image className="h-3 w-3 text-slate-400" />
                        )}
                        {/* Check if message is a mindmap and show network icon */}
                        {conversation.lastMessageType === "mindmap" && (
                          <Network className="h-3 w-3 text-slate-400" />
                        )}
                        <p className={`text-sm truncate transition-colors ${
                          conversation.isActive 
                            ? "text-blue-100" 
                            : "text-slate-400 group-hover:text-slate-300"
                        }`}>
                          {highlightSearchMatch(
                            formatConversationPreview(conversation.lastMessage, conversation.lastMessageType, conversation.mindmapTitle),
                            searchTerm
                          )}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {/* Read receipt checkmark for user-sent messages (only for real users, not AI) */}
                    {conversation.lastMessageSentBy === useAuthStore.getState().user?.username && !conversation.isAI && conversation.lastMessageStatus && (
                      <div className="flex items-center">
                        {conversation.lastMessageStatus === "sent" && (
                          <Check className="h-3 w-3 text-blue-200/60" />
                        )}
                        {conversation.lastMessageStatus === "delivered" && (
                          <CheckCheck className="h-3 w-3 text-white/60" />
                        )}
                        {conversation.lastMessageStatus === "read" && (
                          <CheckCheck className="h-3 w-3 text-blue-400" />
                        )}
                      </div>
                    )}

                    {/* Unread indicator */}
                    {(conversation.unreadCount || conversation.unread) > 0 && (
                      <div className="px-2 py-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xs font-bold rounded-full min-w-[20px] text-center shadow-lg">
                        {(conversation.unreadCount || conversation.unread) > 99 ? "99+" : (conversation.unreadCount || conversation.unread)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }, [conversationItems, handleConversationClick])

  const itemSize = 88 // Optimized size for new design

  return (
    <div ref={containerRef} className="h-full min-h-[200px]">
      {listHeight > 0 ? (
        <div
          ref={listRef}
          className="h-full overflow-y-auto scrollbar-thin"
          style={{ minHeight: '200px' }}
        >
          {conversationItems.map((_, index) => renderConversationItem({ index, style: {} }))}
        </div>
      ) : (
        // Fallback while height is being calculated
        <div 
          className="h-full min-h-[200px] overflow-y-auto scrollbar-thin"
          style={{ height: '400px' }}
        >
          {conversationItems.map((conversation) => (
            <div key={conversation.id} className="px-2 py-1">
              <div
                onClick={() => handleConversationClick(conversation.id)}
                className={`group cursor-pointer transition-all duration-300 ease-out transform hover:scale-[1.02] ${
                  conversation.isActive
                    ? "bg-gradient-to-r from-blue-500/30 to-purple-500/30 border-blue-400/50 shadow-lg shadow-blue-500/20"
                    : "bg-gradient-to-br from-slate-800/40 to-slate-900/40 hover:from-slate-700/50 hover:to-slate-800/50 border-slate-700/30 hover:border-slate-600/50"
                } rounded-2xl p-4 border backdrop-blur-sm`}
                style={{ height: `${itemSize - 8}px` }}
              >
                <div className="flex items-center gap-4 h-full">
                  {/* Simplified fallback rendering - just show name */}
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-700/60 to-slate-800/60 flex items-center justify-center border border-slate-600/30 flex-shrink-0">
                    {conversation.isAI ? (
                      <img
                        src={aiService.getAllBots().find((bot) => bot.id === conversation.botId)?.avatar || "/placeholder.svg"}
                        alt={conversation.name}
                        className="w-full h-full object-cover rounded-2xl"
                      />
                    ) : conversation.avatar ? (
                      <img
                        src={conversation.avatar}
                        alt={conversation.name}
                        className="w-full h-full object-cover rounded-2xl"
                      />
                    ) : (
                      <span className="text-sm font-semibold text-slate-300">
                        {conversation.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className={`font-semibold truncate ${
                      conversation.isActive ? "text-white" : "text-slate-200"
                    }`}>
                      {conversation.name}
                    </h3>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
})

export default Chat