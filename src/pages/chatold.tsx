import React, { useState, useRef, useEffect, useCallback } from "react"
import { aiService } from "../services/aiService"
import { useAuthStore } from "../store/authStore"
import { useChatStore } from "../store/chatStore"
import { usePageTitle } from '../hooks/usePageTitle'
import AISettingsModal from "../components/AISettingsModal"
import MindMapSelector from "../components/MindMapSelector"
import "../styles/messageReactions.css"
import { useNavigate, useSearchParams } from "react-router-dom"
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
  Reply,
  ChevronLeft,
  User,
  Heart,
  Image,
  Eye,   
  EyeOff,
  Link,  
} from "lucide-react"
import { useMindMapStore } from "../store/mindMapStore"
import { ChatMindMapNode } from "../components/ChatMindMapNode"
import EmojiPicker, { type EmojiClickData } from "emoji-picker-react"
import emojiRegex from "emoji-regex"
import ReactMarkdown from "react-markdown"
import { useMediaQuery } from "../hooks/use-media-query"
import { FixedSizeList as List } from "react-window"
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div ref={modalRef} className="bg-gray-800 rounded-lg shadow-lg w-full max-w-md overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <h3 className="text-lg font-medium text-gray-200">New Conversation</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-200 p-1 rounded-full hover:bg-gray-700">
            <X size={20} />
          </button>
        </div>
        <div className="p-4">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 py-2 rounded-md bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-sky-500 text-gray-200 placeholder:text-gray-400"
            />
          </div>
          <div className="max-h-60 overflow-y-auto">
            {isLoading ? (
              <div className="flex justify-center items-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
              </div>
            ) : searchResults.length > 0 ? (
              <div className="space-y-2">
                {searchResults.map((user) => (
                  <button
                    key={user.id}
                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-700/70 text-gray-200 transition-colors"
                    onClick={() => onCreateConversation(user.id, user.username || user.full_name, user.online || false)}
                  >
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {user.avatar_url ? (
                          <img src={user.avatar_url} alt={user.username} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-sm text-gray-300">{(user.username || user.full_name || "?").charAt(0)}</span>
                        )}
                      </div>
                      {user.online && (
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-800"></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="font-medium">@{user.username}</p>
                      {user.full_name && <p className="text-sm text-gray-400">{user.full_name}</p>}
                    </div>
                    <UserPlus className="h-5 w-5 text-blue-400" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No users found</p>
                <p className="text-sm mt-1">Try a different search term</p>
              </div>
            )}
          </div>
        </div>
        <div className="p-4 border-t border-gray-700 bg-gray-800/50">
          <p className="text-sm text-gray-400 mb-4">Start a conversation with a user to chat with them.</p>
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-md text-gray-300 hover:bg-gray-700 transition-colors mr-2"
            >
              Cancel
            </button>
            <button
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors"
              disabled
            >
              Create Group Chat
            </button>
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div ref={modalRef} className="bg-gray-800 rounded-lg shadow-lg w-full max-w-md overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <h3 className="text-lg font-medium text-gray-200">Chat with AI</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-200 p-1 rounded-full hover:bg-gray-700">
            <X size={20} />
          </button>
        </div>
        <div className="p-4">
          <div className="max-h-60 overflow-y-auto">
            {bots.length > 0 ? (
              <div className="space-y-2">
                {bots.map((bot) => (
                  <button
                    key={bot.id}
                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-700/70 text-gray-200 transition-colors"
                    onClick={() => onSelectBot(bot.id)}
                  >
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
                        {bot.avatar ? (
                          <img
                            src={bot.avatar || "/placeholder.svg"}
                            alt={bot.name}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <Bot className="h-5 w-5 text-blue-400" />
                        )}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="font-medium">{bot.name}</p>
                      <p className="text-sm text-gray-400">{bot.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <Bot className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No bots available</p>
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
}> = ({ isPinned, onClose, onDelete, onTogglePin }) => {
  const menuRef = useRef<HTMLDivElement>(null)

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
    <div
      ref={menuRef}
      className="absolute w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-lg overflow-hidden z-[200] pointer-events-auto"
      style={{ top: "160%", right: "0" }}
    >
      <div className="py-1">
        <button
          className="w-full text-left px-4 py-2 text-gray-200 hover:bg-gray-700 flex items-center gap-2"
          onClick={onTogglePin}
        >
          <Pin className={`h-4 w-4 ${isPinned ? "text-blue-400" : "text-gray-400"}`} />
          <span>{isPinned ? "Unpin conversation" : "Pin conversation"}</span>
        </button>
        <button
          className="w-full text-left px-4 py-2 text-gray-200 hover:bg-gray-700 flex items-center gap-2"
          onClick={onDelete}
        >
          <X className="h-4 w-4 text-red-400" />
          <span>Delete conversation</span>
        </button>
      </div>
    </div>
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

      <div className="fixed inset-0 bg-black/50 z-[999]"></div>
      <div
        ref={menuRef}
        className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-[1000] p-3"
      >
      <div className="flex flex-col gap-2">
        <div className="flex gap-3">
          {reactions.map((reaction) => {
            const isSelected = userReaction === reaction.type
            return (
              <button
                key={reaction.type}
                className={`p-3 ${isSelected ? 'bg-blue-600/50' : 'hover:bg-gray-700'} rounded-full transition-colors flex flex-col items-center`}
                onClick={() => {
                  onReact(messageId, reaction.type)
                  onClose()
                }}
                title={reaction.label}
              >
                <div className="reaction-menu-images">
                  <img src={reaction.imagePath} alt={reaction.label} />
                </div>
                {isSelected && <div className="w-2 h-2 bg-blue-400 rounded-full mt-1"></div>}
              </button>
            )
          })}
        </div>

        {userReaction && (
          <button
            className="text-xs text-blue-300 hover:text-blue-100 py-1 px-2 hover:bg-blue-600/30 rounded transition-colors text-center"
            onClick={() => {

              onReact(messageId, userReaction)
              onClose()
            }}
          >
            Remove reaction
          </button>
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
  onReply: (messageId: number) => void
  onReact: (messageId: number, reactionType: string) => void
  onEmphasize: (messageId: number) => void
  isEmphasized: boolean
  onClose: () => void
  messageReactions: {[messageId: number]: {[reactionType: string]: string[]}}
  setReactingToMessageId: (messageId: number | null) => void
  openReactionMenu: () => void
}> = ({ messageId, text, isUserMessage, onEdit, onDelete, onReply, onEmphasize, isEmphasized, onClose, setReactingToMessageId, openReactionMenu }) => {
  const menuRef = useRef<HTMLDivElement>(null)

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
      className={`absolute ${isUserMessage ? "left-0" : "right-0"} top-full mt-2 w-32 bg-gray-800 border border-gray-700 rounded-lg shadow-lg overflow-hidden z-[200]`}
    >
      <div className="py-1">
        <button
          className="w-full text-left px-4 py-1.5 text-gray-200 hover:bg-gray-700 flex items-center gap-2 text-sm"
          onClick={() => {
            onReply(messageId)
            onClose()
          }}
        >
          <Reply className="h-3.5 w-3.5 text-gray-400" />
          <span>Reply</span>
        </button>
        <button
          className="w-full text-left px-4 py-1.5 text-gray-200 hover:bg-gray-700 flex items-center gap-2 text-sm"
          onClick={() => {
            setReactingToMessageId(messageId)
            openReactionMenu()
            onClose()
          }}
        >
          <Heart className="h-3.5 w-3.5 text-gray-400" />
          <span>React</span>
        </button>
        <button
          className="w-full text-left px-4 py-1.5 text-gray-200 hover:bg-gray-700 flex items-center gap-2 text-sm"
          onClick={() => {
            onEmphasize(messageId)
            onClose()
          }}
        >
          <span className={`h-3.5 w-3.5 rounded-full ${isEmphasized ? 'bg-blue-400' : 'bg-gray-400'} flex-shrink-0`}></span>
          <span>{isEmphasized ? 'Remove emphasis' : 'Emphasize'}</span>
        </button>
        {isUserMessage && (
          <>
            <button
              className="w-full text-left px-3 py-1.5 text-gray-200 hover:bg-gray-700 flex items-center gap-2 text-sm"
              onClick={() => {
                onEdit(messageId, text)
                onClose()
              }}
            >
              <Edit className="h-3.5 w-3.5 text-gray-400" />
              <span>Edit</span>
            </button>
            <button
              className="w-full text-left px-3 py-1.5 text-gray-200 hover:bg-gray-700 flex items-center gap-2 text-sm"
              onClick={() => {
                onDelete(messageId)
                onClose()
              }}
            >
              <X className="h-3.5 w-3.5 text-red-400" />
              <span>Delete</span>
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
        </div>
        <p className="text-sm text-gray-200 truncate max-w-full overflow-hidden text-ellipsis">{truncatedText}</p>
      </div>
      <button
        type="button"
        onClick={onCancel}
        className="text-gray-400 hover:text-gray-200 p-1 rounded-full hover:bg-gray-700/70"
      >
        <X className="h-4 w-4" />
      </button>
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

  const [avatarUrl, setAvatarUrl] = useState<string | null>(cachedAvatarUrl)
  // Add a state variable to track conversations updates
  const [conversationsVersion, setConversationsVersion] = useState(0)
  const [isLoadingConversations, setIsLoadingConversations] = useState(true)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
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
    formatLastSeen
  } = useChatStore()
  const { maps } = useMindMapStore()
  const [showConversations, setShowConversations] = useState(true)
  const isMobile = useMediaQuery("(max-width: 768px)")
  const { previewMaps } = usePreviewMindMapStore()

  const [message, setMessage] = useState<string>("")
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showGifMenu, setShowGifMenu] = useState(false)

  // Dynamic page title
  usePageTitle('Chat');
  const [showNewConversationModal, setShowNewConversationModal] = useState(false)
  const [showConversationMenu, setShowConversationMenu] = useState(false)
  const [showAISettingsModal, setShowAISettingsModal] = useState(false)
  const [showBotMenu, setShowBotMenu] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isAITyping, setIsAITyping] = useState(false)
  const [showMindMapSelector, setShowMindMapSelector] = useState(false)
  // Maps are already fetched above
  const [selectedMindMap, setSelectedMindMap] = useState<{ id: string; title: string; visibility?: string } | null>(null)
  const [showCreateMindMapForm, setShowCreateMindMapForm] = useState(false)
  const [newMindMapTitle, setNewMindMapTitle] = useState("")
  const [mindMapSearchTerm, setMindMapSearchTerm] = useState("")
  const [mindMapSortBy, setMindMapSortBy] = useState<'alphabetical' | 'lastEdited'>('lastEdited')
  const [editingMessageId, setEditingMessageId] = useState<number | null>(null)
  const [editingAnimationId, setEditingAnimationId] = useState<number | null>(null)
  const [editText, setEditText] = useState("")
  const editTextareaRef = useRef<HTMLTextAreaElement>(null)
  const [showMessageMenu, setShowMessageMenu] = useState<number | null>(null)
  const [showThinkingIndicator, setShowThinkingIndicator] = useState(false)
  const [messageReactions, setMessageReactions] = useState<{[messageId: number]: {[reactionType: string]: string[]}}>({})
  const [emphasizedMessages, setEmphasizedMessages] = useState<Set<number>>(new Set())
  const [reactingToMessageId, setReactingToMessageId] = useState<number | null>(null)
  const [showReactionMenu, setShowReactionMenu] = useState(false)
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false)

  const pickerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const inputContainerRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const [isAtBottom, setIsAtBottom] = useState(true)
  const messageRefs = useRef<Map<number, HTMLDivElement>>(new Map())
  const [isMounted, setIsMounted] = useState(false)
  const lastProcessedMessagesRef = useRef<string | null>(null)

  // Ref for the intersection observer
  const observerRef = useRef<IntersectionObserver | null>(null)


  const [handleClickOutsideEmojiPicker, setHandleClickOutsideEmojiPicker] = useState<
    ((event: MouseEvent) => void) | null
  >(null)
  const [handleClickOutsideGifMenu, setHandleClickOutsideGifMenu] = useState<
    ((event: MouseEvent) => void) | null
  >(null)
  const [handleClickOutsideMindMapSelector, setHandleClickOutsideMindMapSelector] = useState<
    ((event: MouseEvent) => void) | null
  >(null)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Presence tracking: Update last_seen when component mounts and set up interval
  useEffect(() => {
    if (!user?.id) return

    // Update last_seen immediately when entering chat
    updateLastSeen(user.id)

    // Set up interval to update last_seen every 1 minute while in chat
    const interval = setInterval(() => {
      updateLastSeen(user.id)
    }, 1 * 60 * 1000) // 1 minute

    // Update last_seen on page visibility change (when user comes back to tab)
    const handleVisibilityChange = () => {
      if (!document.hidden && user?.id) {
        updateLastSeen(user.id)
      } else if (document.hidden && user?.id) {
        // When tab becomes hidden, mark as slightly less active
        // but not completely offline
        markUserOffline(user.id)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Mark as offline when leaving the chat page
    const handleBeforeUnload = () => {
      if (user?.id) {
        markUserOffline(user.id)
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('beforeunload', handleBeforeUnload)
      
      // Mark as offline when component unmounts (leaving chat page)
      if (user?.id) {
        markUserOffline(user.id)
      }
    }
  }, [user?.id])

  // Refresh online statuses periodically
  useEffect(() => {
    if (!user?.id) return

    // Refresh online statuses every 15 seconds (more frequent due to 1-minute threshold)
    const interval = setInterval(() => {
      useChatStore.getState().refreshOnlineStatuses()
    }, 15 * 1000) // 15 seconds

    return () => clearInterval(interval)
  }, [user?.id])

  // Handle user query parameter from URL
  useEffect(() => {
    const userParam = searchParams.get('user')

    if (userParam && user?.id) {
      // First fetch all users to ensure we have the latest data
      useChatStore.getState().fetchUsers().then(async () => {
        // Find the user by username
        const users = useChatStore.getState().users
        let targetUser = users.find(u => u.username === userParam)

        // If user not found in initial list, search for them
        if (!targetUser) {
          const searchResults = await useChatStore.getState().searchUsers(userParam)
          targetUser = searchResults.find(u => u.username === userParam)
        }

        if (targetUser) {
          // Check if a conversation with this user already exists
          await useChatStore.getState().fetchConversations()
          const conversations = useChatStore.getState().conversations
          const existingConversation = conversations.find(c =>
            !c.isAI && c.userId === targetUser.id
          )

          if (existingConversation) {
            // If conversation exists, set it as active
            useChatStore.getState().setActiveConversation(existingConversation.id)
          } else {
            // Create a new conversation with this user
            useChatStore.getState().createConversation(
              targetUser.id,
              targetUser.username || targetUser.full_name || "User",
              false
            )
          }

          // Clean up the URL by removing the query parameter
          navigate('/chat', { replace: true })
        }
      })
    }
  }, [searchParams, user?.id, navigate])

  // Fetch conversations when component mounts and set up real-time subscriptions
  useEffect(() => {
    const fetchData = async () => {
      setIsLoadingConversations(true)
      await useChatStore.getState().fetchConversations()
      
      // Refresh online statuses after fetching conversations
      await useChatStore.getState().refreshOnlineStatuses()
      
      setIsLoadingConversations(false)

      // If there's an active conversation, fetch its messages
      const activeId = useChatStore.getState().activeConversationId
      if (activeId) {
        setIsLoadingMessages(true)
        await useChatStore.getState().fetchMessages(activeId)
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

  // Update conversationsVersion when conversations change to force re-render
  useEffect(() => {
    // Increment the version to trigger re-renders of components that depend on conversations
    setConversationsVersion(prev => prev + 1)
  }, [conversations])

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
      textareaRef.current.style.height = "32px"
      const newHeight = Math.min(textareaRef.current.scrollHeight, 200)
      textareaRef.current.style.height = `${newHeight}px`
      textareaRef.current.style.overflowY = newHeight >= 200 ? "auto" : "hidden"

      // Set typing status based on whether there's text in the input
      // Skip for AI conversations
      if (activeConversationId && activeConversation && !activeConversation.isAI) {
        const hasText = textareaRef.current.value.trim().length > 0
        setTypingStatus(activeConversationId, hasText)
      }
    }
  }

  useEffect(() => {
    handleInput()

    // Update typing status whenever message changes
    // Skip for AI conversations
    if (activeConversationId && activeConversation && !activeConversation.isAI) {
      const hasText = message.trim().length > 0
      setTypingStatus(activeConversationId, hasText)
    }
  }, [message, activeConversationId])

  // Initialize textarea height when component mounts
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "32px"
    }

    // Clean up typing status when component unmounts
    return () => {
      // Clear typing status when unmounting (skip for AI conversations)
      if (activeConversationId && activeConversation && !activeConversation.isAI) {
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

  const messages = getMessagesForActiveConversation()
  const activeConversation = getActiveConversation()

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
    if (activeConversationId) {
      setIsLoadingMessages(true);
      useChatStore.getState().fetchMessages(activeConversationId)
        .then(() => {
          // After fetching messages, check if there are unread messages
          const currentMessages = useChatStore.getState().getMessagesForActiveConversation();
          const unreadMessages = currentMessages.filter(m => m.senderId !== "me" && m.status !== "read");

          // Set hasUnreadMessages if there are unread messages
          setHasUnreadMessages(unreadMessages.length > 0);

          if (unreadMessages.length > 0) {
            // If there are unread messages, scroll to the first unread message
            const firstUnreadMessage = unreadMessages[0];
            setTimeout(() => {
              const messageElement = messageRefs.current.get(firstUnreadMessage.id);
              if (messageElement) {
                messageElement.scrollIntoView({ behavior: "smooth", block: "center" });
                messageElement.classList.add("bg-gray-700/30");
                setTimeout(() => messageElement.classList.remove("bg-gray-700/30"), 1500);
              }
            }, 100);
          } else {
            // If no unread messages, scroll to bottom
            setIsAtBottom(true);
            if (messagesContainerRef.current) {
              setTimeout(() => scrollToBottom(), 0);
            }
          }
          setIsLoadingMessages(false);
        });

      // Set up real-time subscription for messages
      const unsubscribe = useChatStore.getState().subscribeToMessages(activeConversationId);

      // Mark all messages as read when conversation is opened
      useChatStore.getState().markMessagesAsRead(activeConversationId);

      // Clean up subscription when component unmounts or conversation changes
      return () => {
        // Clear typing status for the previous conversation (skip for AI conversations)
        const currentConversation = useChatStore.getState().conversations.find(c => c.id === activeConversationId);
        if (currentConversation && !currentConversation.isAI) {
          setTypingStatus(activeConversationId, false).catch(err =>
            console.error("Error clearing typing status on conversation change:", err)
          );
        }

        unsubscribe();
      };
    }
  }, [activeConversationId])

  // Check if the messages container is scrollable
  const isScrollable = useCallback(() => {
    const container = messagesContainerRef.current
    if (!container) return false

    // If the scroll height is greater than the client height, it's scrollable
    return container.scrollHeight > container.clientHeight
  }, [])

  // Separate useEffect for scrolling
  useEffect(() => {
    if (isAtBottom && messagesContainerRef.current) {
      scrollToBottom()
    }

    // If the container is not scrollable, hide the "New messages" indicator
    if (hasUnreadMessages && !isScrollable()) {
      setHasUnreadMessages(false)
    }
  }, [isAtBottom, hasUnreadMessages, isScrollable])

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

    if (lastProcessedMessagesRef.current !== messagesSignature) {
      lastProcessedMessagesRef.current = messagesSignature
      setMessageReactions(newReactions)
      setEmphasizedMessages(newEmphasized)
    }
  }, [messages, isAtBottom])

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

  const handleNewAIConversation = () => {
    const currentBot = aiService.getCurrentBot()
    useChatStore.getState().createAIConversation(currentBot.name)
  }

  const handleBotChange = (botId: string) => {
    aiService.setCurrentBot(botId)
    if (activeConversation?.isAI && activeConversation.botId === aiService.getCurrentBot().id) {
      const newBot = aiService.getCurrentBot()
      useChatStore.getState().updateConversationName(activeConversationId!, newBot.name)
    }
  }

  const handleCreateConversation = (userId: string, userName: string, isOnline: boolean) => {
    createConversation(userId, userName, isOnline)
    setShowNewConversationModal(false)
  }

  const handleDeleteConversation = async () => {
    if (activeConversationId) {
      try {
        // Show loading state if needed
        await deleteConversation(activeConversationId)
        setShowConversationMenu(false)
      } catch (error) {
        console.error("Error deleting conversation:", error)
      }
    }
  }

  const handleEmojiSelect = (emojiData: EmojiClickData) => {
    setMessage((prev) => prev + emojiData.emoji)
    setShowEmojiPicker(false)
  }

  const handleGifSelect = (gifUrl: string) => {
    // Create a message with the GIF URL
    useChatStore.getState().sendMessage(`![GIF](${gifUrl})`, undefined)
    setShowGifMenu(false)
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  const formatDate = (date: Date) => {
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    if (date.toDateString() === today.toDateString()) return "Today"
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday"
    return date.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })
  }

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

  const handleCancelEdit = () => {
    setEditingMessageId(null)
    setEditText("")
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
      const newHeight = Math.min(editTextareaRef.current.scrollHeight, 200)
      editTextareaRef.current.style.height = `${newHeight}px`
    }
  }

  useEffect(() => {
    handleEditInput()
  }, [editText])

  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>, messageId: number) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSaveEdit(messageId)
    } else if (e.key === "Escape") {
      e.preventDefault()
      handleCancelEdit()
    }
  }

  const handleMessageMenuToggle = (e: React.MouseEvent, messageId: number) => {
    e.stopPropagation()
    setShowMessageMenu((prev) => (prev === messageId ? null : messageId))
  }



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
              className={`${userHasReacted ? 'bg-blue-600/40' : 'bg-gray-700/80'} rounded-full px-1 py-0.5 flex items-center gap-0.5 text-sm border ${userHasReacted ? 'border-blue-500/30' : 'border-gray-600/30'} cursor-pointer hover:bg-blue-500/40 transition-colors shadow-md`}
              title={`${userHasReacted ? 'Remove your reaction' : 'Add your reaction'} (${users.length} ${users.length === 1 ? 'person' : 'people'})`}
              onClick={(e) => {
                e.stopPropagation();
                handleReactToMessage(messageId, type);
              }}
            >
              <img src={imagePath} alt={type} className="w-5 h-5 object-contain" />
              {users.length > 1 && <span className="text-blue-100">{users.length}</span>}
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
      console.log('Reply message not found:', replyToId)
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
            setAvatarUrl(fetchedAvatarUrl)
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
    <div className="flex h-[calc(100vh-4rem)] bg-gray-900 overflow-hidden">
      <style dangerouslySetInnerHTML={{ __html: `
        .user-first-message::after {
          content: '';
          position: absolute;
          right: -10px;
          top: 8px;
          width: 0;
          height: 0;
          border-top: 10px solid transparent;
          border-bottom: 10px solid transparent;
          border-left: 10px solid rgb(59, 130, 246);
          z-index: 1;
        }

        .other-first-message::after {
          content: '';
          position: absolute;
          left: -10px;
          top: 8px;
          width: 0;
          height: 0;
          border-top: 10px solid transparent;
          border-bottom: 10px solid transparent;
          border-right: 10px solid rgba(31, 41, 55, 0.7);
          z-index: 1;
        }

        /* Special styling for accepted mindmap messages */
        .other-first-message.bg-green-500\/20::after {
          border-right-color: rgba(34, 197, 94, 0.2);
        }

        /* Special styling for rejected mindmap messages */
        .other-first-message.bg-red-500\/20::after {
          border-right-color: rgba(239, 68, 68, 0.2);
        }

        .emphasized-message.user-first-message::after {
          filter: drop-shadow(0 0 3px rgba(59,130,246,0.7));
          border-left-color: rgb(59, 130, 246);
        }

        .emphasized-message.other-first-message::after {
          filter: drop-shadow(0 0 3px rgba(59,130,246,0.7));
          border-right-color: rgba(31, 41, 55, 0.7);
        }

        /* Special styling for emphasized accepted mindmap messages */
        .emphasized-message.other-first-message.bg-green-500\/20::after {
          border-right-color: rgba(34, 197, 94, 0.2);
        }

        /* Special styling for emphasized rejected mindmap messages */
        .emphasized-message.other-first-message.bg-red-500\/20::after {
          border-right-color: rgba(239, 68, 68, 0.2);
        }

        /* Styling for deleted messages */
        .deleted-message {
          opacity: 0.7;
          pointer-events: none;
        }

        .deleted-message::after {
          opacity: 0.5;
        }
      ` }} />
      <main className="flex-1 max-w-9xl mx-auto w-full h-full">
        <div className="flex h-full relative">
          {/* Conversations List */}
          <div
            className={`${
              isMobile
                ? `absolute inset-y-0 left-0 z-20 w-full md:w-72 transform transition-transform duration-200 ease-in-out ${
                    showConversations ? "translate-x-0" : "-translate-x-full"
                  }`
                : "w-72"
            } border-r border-gray-700/50 flex flex-col h-full bg-gray-900`}
          >
            <div className="p-4 border-b border-gray-700/50 bg-gray-800/50 backdrop-blur-sm sticky top-0 z-10">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold bg-gradient-to-r from-blue-400 to-blue-500 bg-clip-text text-transparent">
                  Messages
                </h2>
                <div className="flex gap-2">
                  <div className="relative">
                    <button
                      type="button"
                      className="p-2 rounded-full hover:bg-blue-500/20 text-blue-400 transition-colors"
                      onClick={handleBotMenuToggle}
                      title="Chat with AI"
                    >
                      <Bot className="h-5 w-5" />
                    </button>
                  </div>
                  <button
                    type="button"
                    className="p-2 rounded-full hover:bg-blue-500/20 text-blue-400 transition-colors"
                    onClick={handleNewConversation}
                    title="New conversation"
                  >
                    <PlusCircle className="h-5 w-5" />
                  </button>
                </div>
              </div>
              <div className="mt-3 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  placeholder="Search conversations..."
                  className="w-full pl-9 py-2 rounded-md bg-gray-800/70 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-200 placeholder:text-gray-400"
                />
              </div>
            </div>
            <div className="flex-1 overflow-hidden py-3 px-2">
              {isLoadingConversations && conversations.length === 0 ? (
                // Show skeleton loaders when loading and no conversations are available yet
                <div className="space-y-2">
                  {Array(5).fill(0).map((_, index) => (
                    <ConversationSkeletonLoader key={`skeleton-${index}`} />
                  ))}
                </div>
              ) : conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-center p-4">
                  <div className="w-12 h-12 rounded-full bg-gray-800/70 flex items-center justify-center mb-3">
                    <PlusCircle className="h-6 w-6 text-gray-500" />
                  </div>
                  <h3 className="text-md font-medium text-gray-400 mb-2">No conversations yet</h3>
                  <p className="text-sm text-gray-500 max-w-xs">
                    Start a new conversation by clicking the + button above.
                  </p>
                </div>
              ) : (
                // Virtualized conversation list
                <VirtualizedConversationList
                  conversations={[...conversations].sort((a, b) => {
                    if (a.pinned && !b.pinned) return -1
                    if (!a.pinned && b.pinned) return 1
                    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
                  })}
                  activeConversationId={activeConversationId}
                  setActiveConversation={setActiveConversation}
                  isMobile={isMobile}
                  setShowConversations={setShowConversations}
                  getTypingStatus={getTypingStatus}
                  version={conversationsVersion} // Add version prop to force re-render
                  isLoading={isLoadingConversations && conversations.length > 0} // Pass loading state
                />
              )}
            </div>
            <div className="p-2 border-t border-gray-700/50 bg-gray-800/50">
              <button
                type="button"
                className="w-full flex items-center gap-2 px-4 py-2 rounded-md text-gray-300 hover:bg-gray-800 hover:text-gray-100 transition-colors"
              >
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </button>
            </div>
          </div>

          {/* Chat Area */}
          <div className="flex-1 flex flex-col h-full">
            {activeConversation && (
              <div className="p-4 border-b border-gray-700/50 bg-gray-800/50 backdrop-blur-sm sticky top-0 z-10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {isMobile && (
                      <button
                        type="button"
                        onClick={() => setShowConversations(true)}
                        className="p-2 rounded-full text-gray-400 hover:text-gray-200 hover:bg-gray-800/70 transition-colors md:hidden"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                    )}
                    <div className="relative">
                      <div
                        className={`w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center flex-shrink-0 ${!activeConversation.isAI ? "cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all" : ""}`}
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
                              "/src/assets/avatars/bigglesmooth.jpg" ||
                              "/placeholder.svg"
                            }
                            alt={activeConversation.name}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : activeConversation.avatar ? (
                          <img
                            src={activeConversation.avatar}
                            alt={activeConversation.name}
                            className="w-full h-full rounded-full object-cover"
                            onError={(e) => {
                              // If image fails to load, show the fallback
                              (e.target as HTMLImageElement).style.display = 'none';
                              const parent = (e.target as HTMLImageElement).parentElement;
                              if (parent) {
                                const span = document.createElement('span');
                                span.className = 'text-sm text-gray-300';
                                span.textContent = activeConversation.name.charAt(0);
                                parent.appendChild(span);
                              }
                            }}
                          />
                        ) : (
                          <span className="text-sm text-gray-300">{activeConversation.name.charAt(0)}</span>
                        )}
                      </div>
                      {activeConversation.online && (
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-900"></div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3
                        className={`font-medium text-gray-200 ${!activeConversation.isAI ? "cursor-pointer hover:text-blue-400 transition-colors" : ""}`}
                        onClick={() => {
                          if (!activeConversation.isAI && activeConversation.userId) {
                            navigate(`/${activeConversation.name}`);
                          }
                        }}
                      >
                        {activeConversation.name}
                      </h3>
                      <p className="text-sm text-gray-400">
                        {activeConversation.isAI 
                          ? "AI Assistant" 
                          : activeConversation.online 
                            ? "Online" 
                            : `Last seen ${formatLastSeen(activeConversation.lastSeen || null)}`
                        }
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 relative">
                    {activeConversation?.isAI && (
                      <button
                        type="button"
                        className="p-2 rounded-full text-blue-400 hover:text-blue-300 hover:bg-gray-800/70 transition-colors"
                        onClick={() => setShowAISettingsModal(true)}
                        title="AI Memory Settings"
                      >
                        <Settings className="h-5 w-5" />
                      </button>
                    )}
                    <button
                      type="button"
                      className="p-2 rounded-full text-gray-400 hover:text-gray-200 hover:bg-gray-800/70 transition-colors menu-button"
                      onClick={handleMenuToggle}
                    >
                      <MoreVertical className="h-5 w-5" />
                    </button>
                    {showConversationMenu && activeConversationId && (
                      <ConversationMenu
                        conversationId={activeConversationId}
                        isPinned={activeConversation?.pinned || false}
                        onClose={() => setShowConversationMenu(false)}
                        onDelete={handleDeleteConversation}
                        onTogglePin={handleTogglePin}
                      />
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Messages */}
            <div
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto py-4 px-2 md:px-4 space-y-2 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent relative z-0"
            >
              {/* New Messages Indicator */}
              {activeConversation && hasUnreadMessages && isScrollable() && (
                <div className="sticky top-0 z-10 flex justify-center mb-4">
                  <div
                    className="bg-blue-500/90 text-white px-4 py-2 rounded-full shadow-md flex items-center gap-2 cursor-pointer hover:bg-blue-600/90 transition-colors"
                    onClick={scrollToBottom}
                  >
                    <span className="font-medium">New messages</span>
                    <ChevronDown className="h-4 w-4 animate-bounce" />
                  </div>
                </div>
              )}

              {!activeConversation && (
                <div className="flex flex-col items-center justify-center h-full text-center p-6">
                  <div className="w-16 h-16 rounded-full bg-gray-800/70 flex items-center justify-center mb-4">
                    <Users className="h-8 w-8 text-gray-500" />
                  </div>
                  <h3 className="text-xl font-medium text-gray-400 mb-2">No conversation selected</h3>
                  <p className="text-gray-500 max-w-md">
                    Select an existing conversation from the sidebar or start a new one by clicking the + button.
                  </p>
                </div>
              )}

              {/* Show skeleton loaders when loading messages */}
              {isLoadingMessages && activeConversation && (
                <div className="space-y-4 px-2">
                  <MessageSkeletonLoader isUser={false} />
                  <MessageSkeletonLoader isUser={true} />
                  <MessageSkeletonLoader isUser={false} />
                  <MessageSkeletonLoader isUser={true} />
                  <MessageSkeletonLoader isUser={false} />
                </div>
              )}

              {/* Show actual messages when not loading */}
              {!isLoadingMessages && activeConversation && messages.map((msg, i) => {

                const isUser = msg.senderId === "me"
                const showTimestamp =
                  i === 0 || new Date(messages[i - 1].timestamp).getTime() - new Date(msg.timestamp).getTime() > 300000
                const isConsecutive = i > 0 && messages[i - 1].senderId === msg.senderId && !messages[i - 1].deleted
                const isEditing = editingMessageId === msg.id

                // Check if this is the last message from the current user
                const isLastUserMessage = isUser && !messages.slice(i + 1).some(m => m.senderId === "me" && !m.deleted)

                return (
                  <React.Fragment key={msg.id}>
                    {showTimestamp && (
                      <div className="flex justify-center my-1">
                        <span className="text-xs text-gray-500 bg-gray-800/50 px-2 py-1 rounded-full">
                          {formatDate(new Date(msg.timestamp))} at {formatTime(new Date(msg.timestamp))}
                        </span>
                      </div>
                    )}


                    <div
                      ref={(el) => {
                        if (el) messageRefs.current.set(msg.id, el)
                      }}
                      data-message-id={msg.id}
                      data-sender-id={msg.senderId}
                      className={`${isConsecutive ? "mt-0.5" : "mt-2"} transition-colors duration-300 ${
                        reactingToMessageId === msg.id
                          ? "bg-gray-700/50 rounded-lg p-2"
                          : !isUser && msg.status !== "read"
                            ? "bg-blue-500/5 rounded-lg p-1"
                            : ""
                      }`}
                    >
                      <div className={`flex items-start gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
                      {!isUser && !isConsecutive && (
                        <div
                          className={`w-8 h-8 rounded-full bg-gray-800 flex-shrink-0 flex items-center justify-center ${!activeConversation?.isAI ? "cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all" : ""}`}
                          onClick={() => {
                            if (!activeConversation?.isAI && activeConversation?.userId) {
                              navigate(`/${activeConversation.name}`);
                            }
                          }}
                        >
                          {activeConversation?.isAI ? (
                            <img
                              src={
                                aiService.getAllBots().find((bot) => bot.id === activeConversation.botId)?.avatar ||
                                "/src/assets/avatars/bigglesmooth.jpg" ||
                                "/placeholder.svg"
                              }
                              alt={activeConversation.name}
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : activeConversation?.avatar ? (
                            <img
                              src={activeConversation.avatar}
                              alt={activeConversation.name}
                              className="w-full h-full rounded-full object-cover"
                              onError={(e) => {
                                // If image fails to load, show the fallback
                                (e.target as HTMLImageElement).style.display = 'none';
                                const parent = (e.target as HTMLImageElement).parentElement;
                                if (parent) {
                                  const span = document.createElement('span');
                                  span.className = 'text-sm text-gray-300';
                                  span.textContent = activeConversation.name.charAt(0);
                                  parent.appendChild(span);
                                }
                              }}
                            />
                          ) : (
                            <span className="text-sm text-gray-300">
                              {activeConversation.name.charAt(0)}
                            </span>
                          )}
                        </div>
                      )}
                      {!isUser && isConsecutive && <div className="w-8 flex-shrink-0" />}
                      {!isUser && (
                        <div className="max-w-[85%] md:max-w-[65%] flex-shrink-0 relative message-container">
                          {isAITyping && i === messages.length - 1 ? (
                            <div className="bg-gray-800/70 text-gray-200 rounded-lg p-3 relative flex items-center gap-1">
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                            </div>
                          ) : (
                            <div
                              className={`message-container p-3 ${
                                msg.type === "accepted-mindmap"
                                  ? "bg-green-500/20 text-green-200"
                                  : msg.type === "rejected-mindmap"
                                    ? "bg-red-500/20 text-red-200"
                                    : "bg-gray-800/70 text-gray-200"
                              } rounded-lg p-3 relative group/message ${
                                !isUser && !isConsecutive ? "first-in-sequence other-first-message" : ""
                              } transition-all duration-200 mb-2 ${
                                emphasizedMessages.has(msg.id) ? "ring-2 ring-blue-500 ring-opacity-70 shadow-[0_0_10px_rgba(59,130,246,0.5)] emphasized-message" : ""
                              } ${msg.deleted ? "deleted-message" : ""} ${messageReactions[msg.id] && Object.keys(messageReactions[msg.id]).some(type => messageReactions[msg.id][type].length > 0) ? "has-reactions" : ""}`}
                              style={!isConsecutive ? { position: "relative", transition: "padding 0.3s ease-out", paddingRight: msg.deleted ? "12px" : "12px" } : { transition: "padding 0.3s ease-out", paddingRight: msg.deleted ? "12px" : "12px" }}
                              onMouseEnter={(e) => !msg.deleted && (e.currentTarget.style.paddingRight = "70px")}
                              onMouseLeave={(e) => !msg.deleted && (e.currentTarget.style.paddingRight = "12px")}
                            >

                              {!msg.deleted && msg.replyToId && renderReplyContext(msg.replyToId)}

                              {!msg.deleted && !activeConversation?.isAI && !isConsecutive && (
                                <div
                                  className="text-xs font-medium text-blue-300 mb-1 cursor-pointer hover:text-blue-200 transition-colors"
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
                                  <div className="flex items-center gap-1.5 text-gray-400/70 italic pr-2">
                                    <X className="h-4 w-4" />
                                    <span>Message deleted</span>
                                  </div>
                                ) : (
                                  <>
                                    {activeConversation?.isAI &&
                                      i > 0 &&
                                      messages[i - 1].senderId === "me" &&
                                      messages[i - 1].mindMapId &&
                                      messages[i - 1].mindMapId && previewMaps[messages[i - 1].mindMapId || ''] &&
                                      previewMaps[messages[i - 1].mindMapId || '']?.actionTaken === null &&
                                      msg.type !== "accepted-mindmap" &&
                                      msg.type !== "rejected-mindmap" && (
                                        <PreviewMindMapNode
                                          mapId={messages[i - 1].mindMapId || ''}
                                          conversationId={msg.conversationId}
                                          messageId={msg.id}
                                        />
                                      )}
                                    {msg.type === "accepted-mindmap" ? (
                                      <>
                                        <div className="flex items-center gap-2">
                                          <Check className="h-5 w-5 text-green-400" />
                                          <span className="font-medium">{msg.text}</span>
                                        </div>

                                        {renderMessageReactions(msg.id, false)}
                                      </>
                                    ) : msg.type === "rejected-mindmap" ? (
                                      <>
                                        <div className="flex items-center gap-2">
                                          <X className="h-5 w-5 text-red-400" />
                                          <span className="font-medium">{msg.text}</span>
                                        </div>

                                        {renderMessageReactions(msg.id, false)}
                                      </>
                                    ) : msg.type === "mindmap" && msg.mindMapId ? (
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
                                            className="text-sm text-gray-200 mt-2 border-t border-gray-700/20 pt-2 break-words whitespace-pre-wrap"
                                            style={{ wordBreak: "break-word", overflowWrap: "break-word" }}
                                          >
                                            {msg.text}
                                          </div>
                                        )}

                                        {renderMessageReactions(msg.id, false)}
                                      </div>
                                    ) : (
                                      <>
                                        <MessageText text={msg.text} />
                                        {msg.edited && (
                                          <span className="text-xs text-gray-400 ml-1 inline-block">(edited)</span>
                                        )}


                                        {renderMessageReactions(msg.id, false)}
                                      </>
                                    )}
                                  </>
                                )}
                              </div>
                              {!msg.deleted && (
                                <div
                                  className={`absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover/message:opacity-100 transition-opacity flex items-center gap-1.5 whitespace-nowrap z-10`}
                                >
                                <span className="text-xs text-gray-500 whitespace-nowrap">
                                  {formatTime(new Date(msg.timestamp))}
                                </span>
                                <button
                                  className="p-1 rounded-full bg-gray-800/70 text-gray-300 hover:text-white hover:bg-gray-700 message-menu-trigger"
                                  onClick={(e) => handleMessageMenuToggle(e, msg.id)}
                                >
                                  <ChevronDown className="h-4 w-4" />
                                </button>
                                {showMessageMenu === msg.id && (
                                  <MessageMenu
                                    messageId={msg.id}
                                    text={msg.text}
                                    isUserMessage={false}
                                    onEdit={handleStartEdit}
                                    onDelete={handleDeleteMessage}
                                    onReply={handleReplyMessage}
                                    onReact={handleReactToMessage}
                                    onEmphasize={handleEmphasizeMessage}
                                    isEmphasized={emphasizedMessages.has(msg.id)}
                                    onClose={() => setShowMessageMenu(null)}
                                    messageReactions={messageReactions}
                                    setReactingToMessageId={setReactingToMessageId}
                                    openReactionMenu={() => setShowReactionMenu(true)}
                                  />
                                )}


                              </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                      {isUser && (
                        <div
                          className={`relative p-3 rounded-lg message-container user-message transition-all duration-300 ${editingAnimationId === msg.id ? "scale-[1.02] bg-blue-500/10" : ""} ${editingMessageId === msg.id ? "bg-gray-800/50" : msg.senderId === "me" ? "bg-blue-500 text-white" : "bg-gray-800/30"} ${!msg.deleted ? "group/message" : ""} max-w-[85%] md:max-w-[65%] flex-shrink-0 ${
                            isUser && !isConsecutive ? "first-in-sequence user-first-message" : ""
                          } transition-all duration-200 mb-2 ${
                            emphasizedMessages.has(msg.id) ? "ring-2 ring-blue-500 ring-opacity-70 shadow-[0_0_10px_rgba(59,130,246,0.5)] emphasized-message" : ""
                          } ${messageReactions[msg.id] && Object.keys(messageReactions[msg.id]).some(type => messageReactions[msg.id][type].length > 0) ? "has-reactions" : ""}`}
                          style={!isConsecutive ? { position: "relative", transition: "padding 0.3s ease-out", paddingLeft: "12px" } : { transition: "padding 0.3s ease-out", paddingLeft: "12px" }}
                          onMouseEnter={(e) => !msg.deleted && (e.currentTarget.style.paddingLeft = "70px")}
                          onMouseLeave={(e) => !msg.deleted && (e.currentTarget.style.paddingLeft = "12px")}
                        >
                          {/* Triangle is now handled by CSS ::after pseudo-element */}
                          {isEditing ? (
                            <div className="w-full">
                              <textarea
                                ref={editTextareaRef}
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                onKeyDown={(e) => handleEditKeyDown(e, msg.id)}
                                onInput={handleEditInput}
                                className="w-full bg-blue-600/50 border border-blue-400/30 rounded p-2 text-white resize-none focus:outline-none focus:ring-1 focus:ring-blue-300"
                                style={{ minHeight: "32px", maxHeight: "200px" }}
                              />
                              <div className="flex justify-end gap-2 mt-2">
                                <button
                                  onClick={() => handleCancelEdit()}
                                  className="text-blue-200 hover:text-white text-xs"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => handleSaveEdit(msg.id)}
                                  className="bg-blue-600 hover:bg-blue-700 text-white rounded px-2 py-1 text-xs flex items-center gap-1"
                                >
                                  <Check className="h-3 w-3" />
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

                                      {renderMessageReactions(msg.id, isUser)}
                                    </div>
                                  ) : (
                                    <>
                                      <MessageText text={msg.text} />
                                      {msg.edited && (
                                        <span className="text-xs text-blue-200/70 ml-1 inline-block">(edited)</span>
                                      )}


                                      {renderMessageReactions(msg.id, isUser)}
                                    </>
                                  )}
                                  {!msg.deleted && (
                                    <div
                                      className={`absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover/message:opacity-100 transition-opacity flex items-center gap-1.5 whitespace-nowrap z-10`}
                                    >
                                      <button
                                        className="p-1 rounded-full bg-blue-600/70 text-blue-200 hover:text-white hover:bg-blue-700/70 message-menu-trigger"
                                        onClick={(e) => handleMessageMenuToggle(e, msg.id)}
                                      >
                                        <ChevronDown className="h-4 w-4" />
                                      </button>
                                      <span className="text-xs text-blue-200 whitespace-nowrap">
                                        {formatTime(new Date(msg.timestamp))}
                                      </span>
                                      {showMessageMenu === msg.id && (
                                        <MessageMenu
                                          messageId={msg.id}
                                          text={msg.text}
                                          isUserMessage={true}
                                          onEdit={handleStartEdit}
                                          onDelete={handleDeleteMessage}
                                          onReply={handleReplyMessage}
                                          onReact={handleReactToMessage}
                                          onEmphasize={handleEmphasizeMessage}
                                          isEmphasized={emphasizedMessages.has(msg.id)}
                                          onClose={() => setShowMessageMenu(null)}
                                          messageReactions={messageReactions}
                                          setReactingToMessageId={setReactingToMessageId}
                                          openReactionMenu={() => setShowReactionMenu(true)}
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
                      {isUser && !isConsecutive && (
                        <div className="w-8 h-8 rounded-full bg-gray-800 flex-shrink-0 flex items-center justify-center">
                          {avatarUrl ? (
                            <img
                              src={avatarUrl}
                              alt={"User"}
                              className="w-full h-full rounded-full object-cover"
                              onError={(e) => {

                                (e.target as HTMLImageElement).style.display = 'none';
                                const parent = (e.target as HTMLImageElement).parentElement;
                                if (parent) {
                                  const userIcon = document.createElement('span');
                                  userIcon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5 text-gray-300"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>';
                                  parent.appendChild(userIcon);
                                }
                              }}
                            />
                          ) : (
                            <User className="h-5 w-5 text-gray-300" />
                          )}
                        </div>
                      )}
                      {isUser && isConsecutive && <div className="w-8 flex-shrink-0" />}
                      </div>
                    </div>


                    {isUser && msg.status === 'read' && isLastUserMessage && msg.readAt && (
                      <div className="flex justify-end pr-8 mt-1 mb-2">
                        <div className="text-xs text-blue-400">
                          Read {formatTimeElapsed(msg.readAt)}
                        </div>
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
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
              <div className="absolute bottom-16 right-4 z-50">
                <button
                  onClick={scrollToBottom}
                  className="w-9 h-9 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center"
                  aria-label="Scroll to bottom"
                >
                  <ChevronDown className="h-5 w-5" />
                </button>
              </div>
            )}


            {activeConversation ? (
            <div className="p-1 md:p-2 border-t border-gray-700/50 bg-gray-800/50 backdrop-blur-sm">
              <form onSubmit={handleSendMessage} className="flex flex-col">
                {replyingToMessage && (
                  <ReplyPreview message={replyingToMessage} onCancel={() => setReplyingToMessage(null)} />
                )}
                <div className="flex gap-1 items-center">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowMindMapSelector((prev) => !prev)}
                      className="p-1 rounded-full text-gray-400 hover:text-gray-200 hover:bg-gray-800/70 transition-colors mindmap-button"
                    >
                      <Network className="h-5 w-5" />
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
                  <div ref={inputContainerRef} className="flex-1 relative">
                    <div className="w-full min-h-[32px] py-0 px-3 pr-20 rounded-md bg-gray-800/70 border border-gray-700 focus-within:ring-2 focus-within:ring-blue-500 text-gray-200 overflow-hidden">
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
                        className="w-full bg-transparent border-none focus:outline-none resize-none overflow-hidden"
                        style={{ height: "32px", minHeight: "32px", maxHeight: "200px" }}
                      />
                    </div>
                    <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
                      <button
                        type="button"
                        className="text-gray-400 hover:text-gray-200 p-1 rounded-full hover:bg-gray-700/50 gif-button"
                        onClick={handleGifMenuToggle}
                      >
                        <Image className="h-5 w-5" />
                      </button>
                      <button
                        type="button"
                        className="text-gray-400 hover:text-gray-200 p-1 rounded-full hover:bg-gray-700/50 emoji-button"
                        onClick={handleEmojiPickerToggle}
                      >
                        <Smile className="h-5 w-5" />
                      </button>
                      {showEmojiPicker && (
                        <div ref={pickerRef} className="absolute bottom-12 right-0">
                          <EmojiPicker onEmojiClick={handleEmojiSelect} lazyLoadEmojis={true} theme={"dark" as any} />
                        </div>
                      )}
                      {showGifMenu && (
                        <GifMenu onSelectGif={handleGifSelect} onClose={() => setShowGifMenu(false)} />
                      )}
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="flex items-center gap-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors"
                  >
                    <Send className="h-5 w-5" />
                  </button>
                </div>
              </form>
            </div>
            ) : null}
          </div>
        </div>
      </main>
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
  )
}


const ConversationSkeletonLoader: React.FC = () => {
  return (
    <div className="px-1 py-0.5">
      <div className="w-full flex items-center gap-3 p-3 rounded-lg bg-gray-800/70">
        <div className="w-10 h-10 rounded-full bg-gray-700/70 animate-pulse"></div>
        <div className="flex-1 min-w-0">
          <div className="h-4 w-3/4 bg-gray-700/70 rounded animate-pulse mb-2"></div>
          <div className="h-3 w-1/2 bg-gray-700/70 rounded animate-pulse"></div>
        </div>
        <div className="w-2 h-2 rounded-full bg-gray-700/70 animate-pulse"></div>
      </div>
    </div>
  );
};


const MessageSkeletonLoader: React.FC<{ isUser?: boolean }> = ({ isUser = false }) => {
  return (
    <div className={`flex items-start gap-3 ${isUser ? "justify-end" : "justify-start"} mt-2`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-gray-800/70 animate-pulse flex-shrink-0"></div>
      )}
      <div
        className={`${
          isUser
            ? "bg-blue-500/30 text-white"
            : "bg-gray-800/50 text-gray-200"
        } rounded-lg p-3 relative animate-pulse max-w-[85%] md:max-w-[65%]`}
        style={{ minWidth: "120px", minHeight: "40px" }}
      >
        <div className="h-3 w-full bg-gray-700/70 rounded mb-2"></div>
        <div className="h-3 w-3/4 bg-gray-700/70 rounded mb-2"></div>
        <div className="h-3 w-1/2 bg-gray-700/70 rounded"></div>
      </div>
    </div>
  );
};


const VirtualizedConversationList: React.FC<{
  conversations: any[]
  activeConversationId: number | null
  setActiveConversation: (id: number) => void
  isMobile: boolean
  setShowConversations: (show: boolean) => void
  getTypingStatus: (id: number) => boolean
  version?: number // Optional version prop to force re-render
  isLoading?: boolean // Add loading prop
}> = ({ conversations, activeConversationId, setActiveConversation, isMobile, setShowConversations, getTypingStatus, version, isLoading }) => {
  const listRef = useRef<List>(null)
  const [listHeight, setListHeight] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)


  useEffect(() => {
    if (!containerRef.current) return

    const updateHeight = () => {
      if (containerRef.current) {
        setListHeight(containerRef.current.clientHeight)
      }
    }


    updateHeight()


    const resizeObserver = new ResizeObserver(updateHeight)
    resizeObserver.observe(containerRef.current)

    return () => {
      if (containerRef.current) {
        resizeObserver.unobserve(containerRef.current)
      }
    }
  }, [])


  useEffect(() => {
    if (activeConversationId && listRef.current) {
      const index = conversations.findIndex(c => c.id === activeConversationId)
      if (index !== -1) {
        listRef.current.scrollToItem(index, 'smart')
      }
    }


    if (listRef.current) {
      listRef.current.forceUpdate()
    }
  }, [activeConversationId, conversations, version])


  const renderConversation = useCallback(({ index, style }: { index: number, style: React.CSSProperties }) => {

    if (index < 0 || index >= conversations.length) {
      return <div style={style} className="px-1 py-0.5"></div>
    }

    const conversation = conversations[index]


    if (!conversation || typeof conversation.id === 'undefined') {
      console.error('Invalid conversation object at index', index, conversation)
      return <div style={style} className="px-1 py-0.5"></div>
    }

    return (
      <div style={style} className="px-1 py-0.5">
        <button
          key={conversation.id}
          type="button"
          className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
            activeConversationId === conversation.id
              ? "bg-blue-500/20 text-blue-100"
              : (conversation.unread || 0) > 0
                ? "bg-blue-500/10 hover:bg-blue-500/20 text-gray-100"
                : "hover:bg-gray-800/70 text-gray-200"
          }`}
          onClick={() => {
            setActiveConversation(conversation.id)
            if (isMobile) setShowConversations(false)
          }}
        >
          <div className="relative">
            <div
              className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center flex-shrink-0"
            >
              {conversation.isAI ? (
                <img
                  src={
                    aiService.getAllBots().find((bot) => bot.id === conversation.botId)?.avatar ||
                    "/src/assets/avatars/bigglesmooth.jpg" ||
                    "/placeholder.svg"
                  }
                  alt={conversation.name}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : conversation.avatar ? (
                <img
                  src={conversation.avatar}
                  alt={conversation.name}
                  className="w-full h-full rounded-full object-cover"
                  onError={(e) => {

                    (e.target as HTMLImageElement).style.display = 'none';
                    const parent = (e.target as HTMLImageElement).parentElement;
                    if (parent) {
                      const span = document.createElement('span');
                      span.className = 'text-sm text-gray-300';
                      span.textContent = conversation.name.charAt(0) + (conversation.name.split(" ")[1]?.charAt(0) || "");
                      parent.appendChild(span);
                    }
                  }}
                />
              ) : (
                <span className="text-sm text-gray-300">
                  {conversation.name.charAt(0) + (conversation.name.split(" ")[1]?.charAt(0) || "")}
                </span>
              )}
            </div>
            {conversation.online && (
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-900"></div>
            )}
            {conversation.pinned && (
              <div className="absolute -top-1 -right-1 text-blue-400">
                <Pin className="h-4 w-4" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0 text-left">
            <div className="flex justify-between items-center">
              <p className="font-medium truncate">
                {conversation.name}
              </p>
              {(conversation.unread || 0) > 0 && (
                <span className="bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {conversation.unread}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 text-sm text-gray-400">
              {getTypingStatus(conversation.id) ? (
                <div className="flex items-center gap-1 text-gray-400">
                  <div className="flex space-x-1">
                  </div>
                  <span className="text-xs text-gray-400">typing...</span>
                </div>
              ) : (
                <>

                  {conversation.lastMessageSentBy && (
                    conversation.isAI ? (
                      <span className="text-xs text-gray-500">{conversation.name.split(" ")[0]}: </span>
                    ) : (
                      conversation.lastMessageSentBy === useAuthStore.getState().user?.username ?
                        <span className="text-xs text-gray-500">You: </span> :
                        <span className="text-xs text-gray-500">{conversation.lastMessageSentBy.split(" ")[0]}: </span>
                    )
                  )}
                  {conversation.lastMessage && conversation.lastMessage.match(/!\[GIF\]\((https?:\/\/[^\s)]+)\)/) ? (
                    <div className="flex items-center gap-1">
                      <Image className="h-3.5 w-3.5" />
                      <span>GIF</span>
                    </div>
                  ) : conversation.lastMessageType === "mindmap" ? (
                    <div className="flex items-center gap-1">
                      <Network className="h-3.5 w-3.5 text-sky-400" />
                      {conversation.mindmapTitle && <span className="text-sky-400 truncate">{conversation.mindmapTitle}</span>}
                    </div>
                  ) : (
                    <p className="truncate">{conversation.lastMessage}</p>
                  )}
                </>
              )}
            </div>
          </div>
        </button>
      </div>
    )
  }, [activeConversationId, isMobile, setActiveConversation, setShowConversations, getTypingStatus, version])


  const renderSkeletons = () => {
    return Array(5).fill(0).map((_, index) => (
      <ConversationSkeletonLoader key={`skeleton-${index}`} />
    ));
  };

  return (
    <div ref={containerRef} className="h-full w-full">
      {isLoading ? (
        renderSkeletons()
      ) : (
        listHeight > 0 && (
          <List
            ref={listRef}
            height={listHeight}
            width="100%"
            itemCount={conversations.length}
            itemSize={80}
            overscanCount={5}
          >
            {renderConversation}
          </List>
        )
      )}
    </div>
  )
}

export default Chat