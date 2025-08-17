import { create } from "zustand"
import { aiService } from "../services/aiService"
import { useMindMapStore } from "./mindMapStore"
import { supabase } from "../supabaseClient"
import { useAuthStore } from "./authStore"

// Centralized function to determine if a user is online
const isUserOnline = (lastSeen: string | null, thresholdMinutes: number = 3): boolean => {
  if (!lastSeen) return false
  
  try {
    const lastSeenDate = new Date(lastSeen)
    const now = new Date()
    const diffMinutes = (now.getTime() - lastSeenDate.getTime()) / (1000 * 60)
    
    // Consider user online if they were seen within the threshold
    return diffMinutes <= thresholdMinutes
  } catch (error) {
    console.error('Error parsing last seen date:', error)
    return false
  }
}

const TYPING_INDICATOR_TIMEOUT = 3000 // 3 seconds

export interface Conversation {
  id: number
  name: string
  lastMessage: string
  timestamp: Date
  avatar?: string
  online: boolean
  unread?: number
  lastMessageSentBy?: string
  lastMessageStatus?: "sent" | "delivered" | "read"
  pinned?: boolean
  isAI?: boolean
  botId?: string
  userId?: string
  supabaseId?: string
  lastSeen?: string | null
  lastMessageType?: string
  mindmapTitle?: string
  pendingCreation?: boolean
}

export interface Message {
  id: number
  conversationId: number
  senderId: string
  text: string
  timestamp: Date
  // Human-readable public identifier of shared mindmap
  mindmapPermalink?: string
  // Internal storage id (DB mindmaps.id) if resolved
  mindmapId?: string
  type?: "text" | "mindmap" | "accepted-mindmap" | "rejected-mindmap" | string
  edited?: boolean
  editedAt?: Date
  deleted?: boolean
  emphasized?: boolean
  replyToId?: number
  reactions?: Record<string, string[]>
  ai_map_status?: "accepted" | "rejected" | null
  status?: "sent" | "delivered" | "read"
  readAt?: Date
  error?: string // Error message for failed AI responses
}

export interface User {
  id: string
  username: string
  full_name?: string
  avatar_url?: string
  online?: boolean
  following?: boolean
  followed_by?: boolean
  lastSeen?: string | null
}

interface ChatStore {
  conversations: Conversation[]
  messages: Message[]
  activeConversationId: number | null
  pendingConversation: Conversation | null // Temporary conversation that doesn't appear in sidebar until first message
  replyingToMessage: Message | null
  isLoading: boolean
  isAITyping: boolean
  users: User[]
  typingUsers: Record<number, string[]> // Record of conversationId -> array of typing user IDs
  typingChannels: Record<string, any> // Record of conversation supabase ID -> channel
  onlineStatusThreshold: number // minutes
  typingTimeouts: Record<string, NodeJS.Timeout> // Record of user+conversation -> timeout
  presenceChannel: any // Global presence channel

  // Actions
  setActiveConversation: (id: number) => void
  getMessagesForActiveConversation: () => Message[]
  getActiveConversation: () => Conversation | undefined
  getTotalUnreadCount: () => number
  sendMessage: (text: string, mindmapIdOrPermalink?: string) => void
  createConversation: (userId: string, userName: string, isOnline: boolean) => Promise<number>
  createAIConversation: (botName: string) => Promise<number>
  markConversationAsRead: (conversationId: number) => void
  deleteConversation: (conversationId: number) => Promise<void>
  togglePin: (conversationId: number) => Promise<void>
  updateConversationName: (conversationId: number, newName: string) => void
  editMessage: (messageId: number, newText: string) => void
  deleteMessage: (messageId: number) => Promise<void>
  setReplyingToMessage: (message: Message | null) => void
  getMessageById: (messageId: number) => Message | undefined
  updateAIMessageAfterAction: (messageId: number, action: "accepted" | "rejected") => Promise<void>
  updateAIMessageText: (messageId: number, newText: string) => void
  regenerateAIMessage: (messageId: number) => Promise<void>
  saveMessageReactions: (messageId: number, reactions: Record<string, string[]>) => Promise<void>
  saveEmphasizedMessage: (messageId: number, emphasized: boolean) => Promise<void>
  updateMessageStatus: (messageId: number, status: "delivered" | "read") => Promise<void>
  markMessagesAsRead: (conversationId: number) => Promise<void>
  setTypingStatus: (conversationId: number, isTyping: boolean) => Promise<void>
  getTypingStatus: (conversationId: number) => boolean
  setupTypingChannelsForAllConversations: () => Promise<void>
  setupTypingChannelsForNewConversations: (newConversations: Conversation[]) => Promise<void>

  // Supabase interactions
  fetchConversations: (skipAutoSelect?: boolean, setupTypingChannels?: boolean) => Promise<void>
  fetchMessages: (conversationId: number) => Promise<void>
  fetchUsers: () => Promise<void>
  searchUsers: (query: string) => Promise<User[]>
  refreshOnlineStatuses: () => Promise<void>
  formatLastSeen: (lastSeen: string | null) => string
  
  // Typing channel management
  initializeTypingChannels: () => Promise<void>
  
  // Cleanup functions
  cleanupTypingChannels: () => void
  cleanupAllTimeouts: () => void

  // Real-time subscriptions
  subscribeToMessages: (conversationId: number) => () => void
  handleRealTimeMessage: (payload: any) => void
  subscribeToConversations: () => () => void
  handleRealTimeConversation: (payload: any) => void
}

const ACCEPTED_MINDMAP_MESSAGE = "Changes to mindmap have been accepted."
const REJECTED_MINDMAP_MESSAGE = "Changes to mindmap have been rejected."

// Helper function to mark a conversation as deleted for a specific user
async function markConversationAsDeletedForUser(userId: string, conversationId: string | undefined) {
  if (!conversationId) {
    console.error("Cannot mark conversation as deleted: No conversation ID provided")
    return false
  }

  const { error } = await supabase
    .from("deleted_conversations")
    .insert({
      user_id: userId,
      conversation_id: conversationId
    })

  if (error) {
    // If the error is a duplicate key error, it's already deleted, which is fine
    if (!error.message.includes('duplicate key')) {
      console.error("Error marking conversation as deleted in Supabase:", error)
      return false
    }
  }

  return true
}

export const useChatStore = create<ChatStore>((set, get) => ({
  conversations: [],
  messages: [],
  activeConversationId: null,
  pendingConversation: null,
  replyingToMessage: null,
  isLoading: false,
  isAITyping: false,
  users: [],
  typingUsers: {} as Record<number, string[]>,
  typingChannels: {} as Record<string, any>,
  onlineStatusThreshold: 3, // 3 minutes - more lenient threshold
  typingTimeouts: {} as Record<string, NodeJS.Timeout>,
  presenceChannel: null,

  // Real-time subscriptions
  subscribeToMessages: (conversationId: number) => {
    const { conversations } = get()
    const conversation = conversations.find(c => c.id === conversationId)
    if (!conversation || !conversation.supabaseId) return () => {}

    console.log(`Subscribing to messages for conversation ${conversationId} (Supabase ID: ${conversation.supabaseId})`)

    // Create a channel for messages only - don't create typing channel since we have persistent ones
    const messageChannel = supabase
      .channel(`messages-${conversation.supabaseId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_messages', filter: `conversation_id=eq.${conversation.supabaseId}` },
        (payload) => {
          console.log('Realtime message event received:', payload)
          get().handleRealTimeMessage(payload)
        }
      )
      .subscribe()

    // Note: We don't create typing channels here anymore since we have persistent ones
    // created by setupTypingChannelsForAllConversations

    // Return a cleanup function
    return () => {
      console.log(`Unsubscribing from messages for conversation ${conversationId}`)
      supabase.removeChannel(messageChannel)
      // Note: We don't remove typing channels here since they should persist
    }
  },

  subscribeToConversations: () => {
    const currentUser = useAuthStore.getState().user
    if (!currentUser) return () => {}

    console.log('Subscribing to conversations')

    const channel = supabase
      .channel('conversations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: `creator_id=eq.${currentUser.id}`
        },
        (payload) => {
          console.log('Realtime conversation event received:', payload)
          get().handleRealTimeConversation(payload)
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: `participant_id=eq.${currentUser.id}`
        },
        (payload) => {
          console.log('Realtime conversation event received:', payload)
          get().handleRealTimeConversation(payload)
        }
      )
      .subscribe()

    // Return a cleanup function
    return () => {
      console.log('Unsubscribing from conversations')
      supabase.removeChannel(channel)
    }
  },

  handleRealTimeConversation: (payload) => {
    const { eventType, new: newRecord } = payload
    const { conversations } = get()
    const currentUser = useAuthStore.getState().user
    if (!currentUser) return

    console.log(`Processing ${eventType} event for conversation:`, newRecord)

    switch (eventType) {
      case 'INSERT': {
        // A new conversation was created
        // Check if this conversation is for the current user
        if (newRecord.creator_id === currentUser.id || newRecord.participant_id === currentUser.id) {
          console.log('New conversation created that involves the current user')

          // Check if we already have this conversation in local state
          const existingConversation = conversations.find(c => c.supabaseId === newRecord.id)
          if (existingConversation) {
            console.log('Conversation already exists in local state')
            return
          }

          const otherUserId = newRecord.creator_id === currentUser.id ? newRecord.participant_id : newRecord.creator_id

          // If this is an AI conversation, add it directly
          if (newRecord.is_ai) {
            const newId = conversations.length > 0 ? Math.max(...conversations.map((c) => c.id)) + 1 : 1
            const newConversation = {
              id: newId,
              name: newRecord.name,
              lastMessage: newRecord.last_message || "",
              timestamp: new Date(newRecord.timestamp),
              online: true,
              lastMessageSentBy: newRecord.last_message_sent_by,
              pinned: false,
              isAI: true,
              botId: newRecord.bot_id,
              supabaseId: newRecord.id
            }

            set({ conversations: [...conversations, newConversation] })
            return
          }

          supabase
            .from("profiles")
            .select("username, avatar_url")
            .eq("id", otherUserId)
            .single()
            .then(({ data: profile, error }) => {
              if (error) {
                console.error("Error fetching user profile:", error)
                // Refresh all conversations as a fallback
                get().fetchConversations()
                return
              }

              // Create a new conversation object
              const newId = conversations.length > 0 ? Math.max(...conversations.map((c) => c.id)) + 1 : 1
              const newConversation = {
                id: newId,
                name: profile.username,
                lastMessage: newRecord.last_message || "",
                timestamp: new Date(newRecord.timestamp),
                avatar: profile.avatar_url,
                online: false,
                lastMessageSentBy: newRecord.last_message_sent_by,
                pinned: false,
                userId: otherUserId,
                supabaseId: newRecord.id,
                lastMessageType: newRecord.last_message_type || "text"
              }

              // Add the new conversation to our state
              set({ conversations: [...conversations, newConversation] })
              
              // Set up typing channel for the new conversation (only for non-AI conversations)
              get().setupTypingChannelsForNewConversations([newConversation])
            })
        } else {
          // This conversation doesn't involve the current user, ignore it
          console.log('New conversation does not involve the current user')
        }
        break
      }

      case 'UPDATE': {
        // A conversation was updated
        // Find the conversation in our local state
        const conversationIndex = conversations.findIndex(c => c.supabaseId === newRecord.id)

        // If we can't find the conversation, refresh the entire list
        if (conversationIndex === -1) {
          console.log('Conversation not found in local state, refreshing all conversations')
          get().fetchConversations()
          return
        }

        // Update the conversation
        const updatedConversations = [...conversations]

        // Format the timestamp properly
        const timestamp = newRecord.timestamp ? new Date(newRecord.timestamp) : new Date();

        // Update the conversation with all the data
        updatedConversations[conversationIndex] = {
          ...updatedConversations[conversationIndex],
          lastMessage: newRecord.last_message || updatedConversations[conversationIndex].lastMessage,
          timestamp: timestamp,
          lastMessageSentBy: newRecord.last_message_sent_by || updatedConversations[conversationIndex].lastMessageSentBy,
          lastMessageType: newRecord.last_message_type || "text",
          // If this is a mindmap message, also update the mindmap_id
          ...(newRecord.last_message_type === 'mindmap' && newRecord.mindmap_id ? { mindmapId: newRecord.mindmap_id } : {})
        }

        // Check if this is a mindmap message and fetch the title if needed
        if (newRecord.last_message_type === "mindmap" && newRecord.mindmap_id) {
          // Try to fetch the mindmap title from Supabase
          supabase
            .from("mindmaps")
            .select("title")
            .eq("id", newRecord.mindmap_id)
            .single()
            .then(({ data, error }) => {
              if (!error && data) {
                // Update the conversation with the mindmap title
                const updatedConversationsWithTitle = [...get().conversations];
                const convIndex = updatedConversationsWithTitle.findIndex(c => c.supabaseId === newRecord.id);
                if (convIndex !== -1) {
                  updatedConversationsWithTitle[convIndex] = {
                    ...updatedConversationsWithTitle[convIndex],
                    mindmapTitle: data.title
                  };
                  set({ conversations: updatedConversationsWithTitle });
                }
              }
            });
        }

        // Log the update for debugging
        console.log('Updating conversation with real-time data:', {
          id: updatedConversations[conversationIndex].id,
          lastMessage: updatedConversations[conversationIndex].lastMessage,
          lastMessageSentBy: updatedConversations[conversationIndex].lastMessageSentBy,
          timestamp: timestamp
        });

        // Update the state with the new conversations
        // Force a new array reference to ensure React detects the change
        set({ conversations: [...updatedConversations] })
        break
      }

      case 'DELETE': {
        // A conversation was deleted
        // We'll handle this by refreshing the conversations list
        get().fetchConversations()
        break
      }
    }
  },

  /**
   * Handles real-time message events from Supabase
   *
   * This function processes real-time events for chat messages, including:
   * - New messages (INSERT)
   * - Message updates (UPDATE) - edits, reactions, read status, etc.
   * - Message deletions (DELETE) - though we use soft deletes via UPDATE
   *
   * The function has two main parts:
   * 1. Update conversation metadata for any message event
   * 2. Process message events for the active conversation only
   *
   * @param payload The event payload from Supabase real-time subscription
   */
  handleRealTimeMessage: (payload) => {
    const { eventType, new: newRecord } = payload
    const { messages, conversations, activeConversationId } = get()
    const currentUser = useAuthStore.getState().user

    if (!newRecord || !currentUser) return

    /*
     * Part 1: Update conversation metadata
     *
     * For any new message, we update the conversation's metadata:
     * - Last message text and timestamp
     * - Last message sender
     * - Message type (text, mindmap, etc.)
     * - Unread count (if the message is from another user)
     *
     * This happens regardless of whether the conversation is active.
     */
    const conversation = conversations.find(c => c.supabaseId === newRecord.conversation_id)

    if (conversation && eventType === 'INSERT') {
      const updatedConversations = [...conversations]
      const conversationIndex = updatedConversations.findIndex(c => c.supabaseId === newRecord.conversation_id)

      // Check if this is a new message from another user and update unread count
      if (newRecord.sender_id !== currentUser.id) {
        // Only increment unread count if the conversation is not active
        if (conversation.id !== activeConversationId) {
          // Increment the unread count
          updatedConversations[conversationIndex] = {
            ...updatedConversations[conversationIndex],
            unread: (updatedConversations[conversationIndex].unread || 0) + 1
          }
        } else {
          // If the conversation is active, we'll mark the message as read when it's processed
          // This will be handled by the message processing logic below
        }
      }

      if (conversationIndex !== -1) {
        // Determine the sender name for the last message
        let lastMessageSentBy = conversation.lastMessageSentBy

        // If the message is from the current user and not an AI message, set the user's username as the sender
        if (newRecord.sender_id === useAuthStore.getState().user?.id && newRecord.type !== 'ai-message') {
          lastMessageSentBy = useAuthStore.getState().user?.username
        } else if (newRecord.type === 'ai-message') {
          // If it's an AI message, use the conversation name (bot name)
          lastMessageSentBy = conversation.name
        } else {
          // Otherwise, try to get the username from the conversation name
          lastMessageSentBy = conversation.name
        }

        // Update the conversation with all the data
        updatedConversations[conversationIndex] = {
          ...updatedConversations[conversationIndex],
          lastMessage: newRecord.text,
          timestamp: new Date(newRecord.timestamp),
          lastMessageSentBy: lastMessageSentBy,
          lastMessageStatus: newRecord.sender_id === currentUser.id ? (newRecord.status || "delivered") : undefined,
          lastMessageType: newRecord.type || 'text',
          // If this is a mindmap message, also update the mindmap_id
          ...(newRecord.type === 'mindmap' && newRecord.mindmap_id ? { mindmapId: newRecord.mindmap_id } : {})
        }

        // If this is a mindmap message, fetch the title
        if (newRecord.type === 'mindmap' && newRecord.mindmap_id) {
          supabase
            .from("mindmaps")
            .select("title")
            .eq("id", newRecord.mindmap_id)
            .single()
            .then(({ data, error }) => {
              if (!error && data) {
                const updatedConversationsWithTitle = [...get().conversations]
                const convIndex = updatedConversationsWithTitle.findIndex(c => c.supabaseId === newRecord.conversation_id)
                if (convIndex !== -1) {
                  updatedConversationsWithTitle[convIndex] = {
                    ...updatedConversationsWithTitle[convIndex],
                    mindmapTitle: data.title
                  }
                  set({ conversations: updatedConversationsWithTitle })
                }
              }
            })
        }

        // Update the conversations state
        // Force a new array reference to ensure React detects the change
        set({ conversations: [...updatedConversations] })

        // Log the update
        console.log('Updated conversation last message:', {
          conversationId: conversation.id,
          lastMessage: newRecord.text,
          lastMessageSentBy: lastMessageSentBy
        })
      }
    }

    /*
     * Part 2: Process messages for the active conversation
     *
     * This section only runs if:
     * 1. There is an active conversation
     * 2. The message belongs to the active conversation
     *
     * For the active conversation, we:
     * - Add new messages to the messages array
     * - Update existing messages (edits, reactions, etc.)
     * - Handle reply messages by mapping Supabase IDs to local IDs
     */
    if (!activeConversationId) return

    const activeConversation = conversations.find(c => c.id === activeConversationId)
    if (!activeConversation || !activeConversation.supabaseId) return

    if (newRecord.conversation_id !== activeConversation.supabaseId) return

    console.log(`Processing ${eventType} event for message:`, newRecord)

    switch (eventType) {
      case 'INSERT': {
        /*
         * New message handling
         *
         * When a new message is received:
         * 1. Skip if the message was sent by the current user (already added locally)
         * 2. Determine the correct sender ID (special handling for AI messages)
         * 3. Create a new message object with a unique local ID
         * 4. Handle reply context if this is a reply message
         */
        if (newRecord.sender_id === useAuthStore.getState().user?.id) return

        let senderId = newRecord.sender_id
        if (newRecord.type === 'ai-message') {
          senderId = 'ai'
        }

        const newId = messages.length > 0 ? Math.max(...messages.map(m => (typeof m.id === 'number' ? m.id : 0))) + 1 : 1
        const newMessage = {
          id: newId,
          conversationId: activeConversationId,
          senderId,
          text: newRecord.text,
          timestamp: new Date(newRecord.timestamp),
          type: newRecord.type || 'text',
          mindmapId: newRecord.mindmap_id,
          edited: newRecord.edited_at !== null,
          editedAt: newRecord.edited_at ? new Date(newRecord.edited_at) : undefined,
          deleted: newRecord.deleted || false,
          emphasized: newRecord.emphasized || false,
          reactions: newRecord.reactions || {},
          // For reply_to_id, we need to find the corresponding local message ID
          replyToId: newRecord.reply_to_id ? undefined : undefined, // We'll update this after fetching all messages
          status: (newRecord.status as "sent" | "delivered" | "read" | undefined) || (senderId === "me" ? "delivered" : undefined),
          readAt: newRecord.read_at ? new Date(newRecord.read_at) : undefined
        }

        /*
         * Reply message handling
         *
         * For reply messages, we need to map the Supabase message ID to our local message ID.
         * This requires fetching all messages for the conversation and finding the correct index.
         *
         * The process:
         * 1. Check if this is a reply message (has reply_to_id)
         * 2. Fetch all messages from Supabase for this conversation
         * 3. Find the index of the message being replied to
         * 4. Map that to our local message ID system (which uses 1-based indexing)
         * 5. If mapping succeeds, add the message with reply context
         * 6. If mapping fails, add the message without reply context
         */
        if (newRecord.reply_to_id) {
          supabase
            .from('chat_messages')
            .select('*')
            .eq('conversation_id', activeConversation.supabaseId)
            .order('timestamp', { ascending: true })
            .then(result => {
              if (result.error) {
                console.error('Error fetching messages for reply mapping:', result.error)
                set({
                  messages: [...messages, newMessage]
                })
                return
              }

              const replyToIndex = result.data.findIndex(msg => msg.id === newRecord.reply_to_id)

              if (replyToIndex !== -1 && replyToIndex < messages.length) {
                const updatedMessage = {
                  ...newMessage,
                  replyToId: replyToIndex + 1
                }

                set({
                  messages: [...messages, updatedMessage]
                })
              } else {
                set({
                  messages: [...messages, newMessage]
                })
              }
            })
        } else {
          set({
            messages: [...messages, newMessage]
          })
        }
        break
      }

      case 'UPDATE': {
        /*
         * Message update handling
         *
         * When a message is updated in Supabase, we need to find and update
         * the corresponding message in our local state.
         *
         * The process:
         * 1. Fetch all messages for this conversation from Supabase
         * 2. Find the index of the updated message in the Supabase results
         * 3. Map that to our local message ID (using 1-based indexing)
         * 4. Find and update the message in our local state
         * 5. Apply all changes from the Supabase record (text, reactions, etc.)
         */
        supabase
          .from('chat_messages')
          .select('*')
          .eq('conversation_id', activeConversation.supabaseId)
          .order('timestamp', { ascending: true })
          .then(result => {
            if (result.error) {
              console.error('Error fetching messages for update:', result.error)
              return
            }

            const supabaseIndex = result.data.findIndex(msg => msg.id === newRecord.id)

            if (supabaseIndex !== -1) {
              const localMessageId = supabaseIndex + 1 // Convert to 1-based index
              const messageToUpdate = messages.find(msg => msg.id === localMessageId)

              if (messageToUpdate) {
                const updatedMessages = messages.map(msg =>
                  msg.id === localMessageId ? {
                    ...msg,
                    text: newRecord.text,
                    edited: newRecord.edited_at !== null,
                    editedAt: newRecord.edited_at ? new Date(newRecord.edited_at) : undefined,
                    deleted: newRecord.deleted || false,
                    emphasized: newRecord.emphasized || false,
                    reactions: newRecord.reactions || {},
                    status: newRecord.status || msg.status,
                    readAt: newRecord.read_at ? new Date(newRecord.read_at) : msg.readAt
                  } : msg
                )

                console.log('Updating message with real-time data:', {
                  messageId: localMessageId,
                  emphasized: newRecord.emphasized,
                  reactions: newRecord.reactions
                })

                set({ messages: updatedMessages })
              }
            }
          })
        break
      }

      case 'DELETE': {
        /*
         * Message deletion handling
         *
         * In our application, we don't actually delete messages from the database.
         * Instead, we mark them as deleted by setting the 'deleted' flag to true.
         *
         * Since we handle this through the UPDATE case, this case should never occur.
         * It's included here for completeness and future-proofing.
         */
        break
      }
    }
  },


  setActiveConversation: (id: number) => {
    // Validate that the conversation exists before setting it as active
    const { conversations } = get()
    const conversation = conversations.find(c => c.id === id)

    if (!conversation) {
      console.warn(`[ChatStore] Attempted to set non-existent conversation ${id} as active`)
      return
    }

    // Set the active conversation ID
    set({ activeConversationId: id })

    // Mark the conversation and messages as read immediately
    // This prevents race conditions and ensures consistent state
    get().markConversationAsRead(id)
    get().markMessagesAsRead(id)
  },

  getMessagesForActiveConversation: () => {
    const { activeConversationId, messages } = get()
    if (!activeConversationId) return []
    return messages.filter((message) => message.conversationId === activeConversationId)
  },

  getActiveConversation: () => {
    const { activeConversationId, conversations, pendingConversation } = get()
    
    // First check if the active conversation is the pending one
    if (pendingConversation && activeConversationId === pendingConversation.id) {
      return pendingConversation
    }
    
    // Otherwise look in the regular conversations list
    return conversations.find((conversation) => conversation.id === activeConversationId)
  },

  // Add a method to get a message by ID
  getMessageById: (messageId: number) => {
    const { messages } = get()
    return messages.find((message) => message.id === messageId)
  },

  // Add a method to set the message being replied to
  setReplyingToMessage: (message: Message | null) => {
    set({ replyingToMessage: message })
  },

  // Update the sendMessage function to handle replies; second arg can be mindmap id (preferred) or permalink (legacy)
  sendMessage: async (text: string, mindmapIdOrPermalink?: string) => {
    const { activeConversationId, messages, conversations, replyingToMessage, pendingConversation } = get()
    if (!activeConversationId) return

    // Check if the active conversation is a pending conversation
    let activeConversation = pendingConversation && activeConversationId === pendingConversation.id 
      ? pendingConversation 
      : conversations.find((c) => c.id === activeConversationId)
      
    if (!activeConversation) return

    const currentUser = useAuthStore.getState().user
    if (!currentUser) {
      console.error("Cannot send message: No authenticated user")
      return
    }

    // Treat provided argument strictly as a mindmap id (no permalink fallback, no store injection here)
    let resolvedMindmapId: string | null = null
    let resolvedMindmapTitle: string | undefined
    if (mindmapIdOrPermalink) {
      // Simple heuristic: accept anything that looks like a UUID (or any non-empty string) as id
      const idCandidate = mindmapIdOrPermalink.trim()
      if (idCandidate.length > 0) {
        resolvedMindmapId = idCandidate
        // We do NOT attempt to fetch or inject here; rendering layer should lazy-fetch if needed
        console.log('[chatStore.sendMessage] Using provided mindmap id (no local lookup):', idCandidate)
        set({ isAITyping: true })
      }
    }

    // Generate a unique ID for the new message
    const newId = messages.length > 0 ? Math.max(...messages.map((m) => (typeof m.id === "number" ? m.id : 0))) + 1 : 1

    // Create new message
    const newMessage: Message = {
      id: newId,
      conversationId: activeConversationId,
      senderId: "me",
      text,
      timestamp: new Date(),
      type: resolvedMindmapId ? 'mindmap' : 'text',
      mindmapId: resolvedMindmapId || undefined,
      replyToId: replyingToMessage ? replyingToMessage.id : undefined, // Add the replyToId if replying
      status: "delivered" // Initial status is 'delivered'
    }

    // Handle conversation updates differently for pending vs existing conversations
    let updatedConversations
    let clearPendingConversation = false

    if (activeConversation.pendingCreation && pendingConversation && activeConversationId === pendingConversation.id) {
      // This is a pending conversation - add it to the conversations list now
      // Get mindmap title if this is a mindmap message
      let mindmapTitle = undefined;
      if (resolvedMindmapId) {
        mindmapTitle = resolvedMindmapTitle
      }

      const conversationToAdd = {
        ...activeConversation,
        lastMessage: text,
        timestamp: new Date(),
        lastMessageSentBy: useAuthStore.getState().user?.username,
        lastMessageStatus: "sent" as const,
            lastMessageType: resolvedMindmapId ? 'mindmap' : 'text',
            mindmapTitle: resolvedMindmapId ? mindmapTitle : undefined
      };

      updatedConversations = [conversationToAdd, ...conversations]
      clearPendingConversation = true
    } else {
      // This is an existing conversation - update it normally
      updatedConversations = conversations.map((conversation) => {
        if (conversation.id === activeConversationId) {
          // Get mindmap title if this is a mindmap message
          let mindmapTitle = undefined;
          if (resolvedMindmapId) {
            mindmapTitle = resolvedMindmapTitle
          }

          return {
            ...conversation,
            lastMessage: text,
            timestamp: new Date(),
            lastMessageSentBy: useAuthStore.getState().user?.username,
            lastMessageStatus: "sent" as const,
            lastMessageType: resolvedMindmapId ? 'mindmap' : 'text',
            mindmapTitle: resolvedMindmapId ? mindmapTitle : undefined
          };
        }
        return conversation;
      })
    }

    set({
      messages: [...messages, newMessage],
      conversations: updatedConversations,
      pendingConversation: clearPendingConversation ? null : get().pendingConversation,
      replyingToMessage: null, // Clear the replying state after sending
    })

    // Check if we need to create the conversation in Supabase first (for non-AI conversations)
    if (activeConversation.pendingCreation && !activeConversation.isAI) {
      try {
        // Create the conversation in Supabase using the pending UUID as the actual ID
        const { error } = await supabase
          .from("conversations")
          .insert({
            id: activeConversation.supabaseId, // Use the pending UUID as the actual ID
            name: activeConversation.name,
            last_message: text,
            creator_id: currentUser.id,
            participant_id: activeConversation.userId,
            online: activeConversation.online || false,
            last_message_sent_by: currentUser.username,
            pinned: false
          })

        if (error) {
          console.error("Error creating conversation in Supabase:", error)
          return // Don't proceed if we couldn't create the conversation
        }

        // Update the conversation in local state to remove pending flag
        const updatedConversationsWithId = conversations.map(conv =>
          conv.id === activeConversationId
            ? { ...conv, pendingCreation: false }
            : conv
        )

        set({ conversations: updatedConversationsWithId })

        // Get the updated conversation
        const updatedActiveConversation = updatedConversationsWithId.find(c => c.id === activeConversationId)

        // Continue with the updated conversation
        if (!updatedActiveConversation || !updatedActiveConversation.supabaseId) {
          console.error("Failed to update conversation")
          return
        }

        // Use the updated conversation for the rest of the function
        activeConversation = updatedActiveConversation

        // No need to trigger URL update since the URL already has the correct supabaseId
      } catch (error) {
        console.error("Error creating conversation in Supabase:", error)
        return // Don't proceed if there was an error
      }
    }

    // Save message to Supabase if we have a supabaseId for the conversation
    if (activeConversation.supabaseId) {
      try {
        // Find the Supabase ID of the message we're replying to, if any
        let replyToSupabaseId = undefined
        if (replyingToMessage) {
          // Get all messages for this conversation from Supabase
          const { data: messageData, error: messageError } = await supabase
            .from("chat_messages")
            .select("*")
            .eq("conversation_id", activeConversation.supabaseId)
            .order("timestamp", { ascending: true })

          if (messageError) {
            console.error("Error fetching messages for reply:", messageError)
          } else if (messageData && messageData.length > 0) {
            // The replyingToMessage.id is a 1-based index in our local state
            // We need to map it to the corresponding Supabase message ID
            const replyToIndex = replyingToMessage.id - 1
            if (replyToIndex >= 0 && replyToIndex < messageData.length) {
              replyToSupabaseId = messageData[replyToIndex].id
            }
          }
        }

  const mindmapId = resolvedMindmapId

        // Save the message to Supabase
        const { error } = await supabase
          .from("chat_messages")
          .insert({
            conversation_id: activeConversation.supabaseId,
            sender_id: currentUser.id,
            recipient_id: activeConversation.isAI ? null : activeConversation.userId,
            text,
            mindmap_id: mindmapId,
            type: mindmapId ? 'mindmap' : 'text',
            reply_to_id: replyToSupabaseId,
            status: "delivered"
          })

        if (error) {
          console.error("Error saving message to Supabase:", error)
        }

        // Update the conversation's last message in Supabase
        // Now that we've added the columns to the database, we can include them in the update
        const updateData: any = {
          last_message: text,
          timestamp: new Date().toISOString(),
          last_message_sent_by: currentUser.username,
          last_message_type: mindmapId ? 'mindmap' : 'text',
          mindmap_id: mindmapId
        }

        try {
          const { error: convError } = await supabase
            .from("conversations")
            .update(updateData)
            .eq("id", activeConversation.supabaseId)

          if (convError) {
            console.error("Error updating conversation in Supabase:", convError)
          }
        } catch (error) {
          console.error("Error updating conversation in Supabase:", error)
        }
      } catch (error) {
        console.error("Error in Supabase operations:", error)
      }
    }

    // If this is an AI conversation, generate and send AI response with the specific bot
    if (activeConversation?.isAI && activeConversation?.botId) {
      // Set to this conversation's bot before generating response
      aiService.setCurrentBot(activeConversation.botId)

      // Get mindmap data if it exists
  const mindMapData = resolvedMindmapId
        ? (() => {
            const { maps } = useMindMapStore.getState()
            const selectedMap = maps.find((m) => m.id === resolvedMindmapId)
            return selectedMap || undefined
          })()
        : undefined

      try {
        const response = await aiService.generateResponse(text, activeConversationId, mindMapData)

        const aiMessageId =
          get().messages.length > 0
            ? Math.max(...get().messages.map((m) => (typeof m.id === "number" ? m.id : 0))) + 1
            : 1

        const aiMessage: Message = {
          id: aiMessageId,
          conversationId: activeConversationId,
          senderId: "ai",
          text: response,
          timestamp: new Date(),
          replyToId: newId, // AI replies to the user's message
          type: "ai-message",
          status: "sent" // AI messages start as sent
        }

        const updatedConversationsWithAI = get().conversations.map((conversation) =>
          conversation.id === activeConversationId
            ? {
                ...conversation,
                lastMessage: response,
                timestamp: new Date(),
                lastMessageSentBy: conversation.name,
                lastMessageType: "text" // AI responses are always text for now
              }
            : conversation,
        )

        set({
          messages: [...get().messages, aiMessage],
          conversations: updatedConversationsWithAI,
          isAITyping: false, // Set isAITyping to false after AI sends the message
        })

        // Save AI response to Supabase if we have a supabaseId for the conversation
        if (activeConversation.supabaseId) {
          try {
            // Save the AI message to Supabase
            const { error } = await supabase
              .from("chat_messages")
              .insert({
                conversation_id: activeConversation.supabaseId,
                sender_id: currentUser.id, // We use the current user's ID but mark it as AI in the type
                recipient_id: null,
                text: response,
                type: "ai-message",
                status: "sent", // AI messages start as sent
                // We would need to find the Supabase ID of the message the AI is replying to
                // For now, we'll skip this part
              })

            if (error) {
              console.error("Error saving AI message to Supabase:", error)
            }

            // Update the conversation's last message in Supabase
            // Now that we've added the columns to the database, we can include them in the update
            const updateData: any = {
              last_message: response,
              timestamp: new Date().toISOString(),
              last_message_sent_by: currentUser.username, // Use the current user's username to satisfy the foreign key constraint
              last_message_type: "text", // AI responses are always text for now
              mindmap_id: null // Clear any mindmap_id
            }

            try {
              const { error: convError } = await supabase
                .from("conversations")
                .update(updateData)
                .eq("id", activeConversation.supabaseId)

              if (convError) {
                console.error("Error updating conversation in Supabase:", convError)
              }
            } catch (error) {
              console.error("Error updating conversation in Supabase:", error)
            }
          } catch (error) {
            console.error("Error in Supabase operations for AI message:", error)
          }
        }
      } catch (error) {
        console.error("Error generating AI response:", error)
        
        // Create an error message for the user
        const errorMessageId = get().messages.length > 0
          ? Math.max(...get().messages.map((m) => (typeof m.id === "number" ? m.id : 0))) + 1
          : 1

        const errorMessage: Message = {
          id: errorMessageId,
          conversationId: activeConversationId,
          senderId: "ai",
          text: "I'm sorry, I encountered an error while processing your request.",
          timestamp: new Date(),
          replyToId: newId, // AI error message replies to the user's message
          type: "ai-message",
          status: "sent",
          error: error instanceof Error ? error.message : "Unknown error occurred"
        }

        const updatedConversationsWithError = get().conversations.map((conversation) =>
          conversation.id === activeConversationId
            ? {
                ...conversation,
                lastMessage: errorMessage.text,
                timestamp: new Date(),
                lastMessageSentBy: conversation.name,
                lastMessageType: "text"
              }
            : conversation,
        )

        set({
          messages: [...get().messages, errorMessage],
          conversations: updatedConversationsWithError,
          isAITyping: false,
        })
      }
    }
  },

  createConversation: async (userId: string, userName: string, isOnline: boolean) => {
    const { conversations } = get()
    const currentUser = useAuthStore.getState().user

    if (!currentUser) {
      console.error("Cannot create conversation: No authenticated user")
      return -1
    }

    try {
      // First, check if we already have a conversation with this user
      // Check in local state first
      const existingConversation = conversations.find(c => c.userId === userId && !c.isAI)

      if (existingConversation) {
        // We already have a conversation with this user, just return its ID
        // Don't set it as active here - let the caller handle that
        return existingConversation.id
      }

      // If not found in local state, check in Supabase for any existing conversation
      // that might have been deleted by the current user but not by the other user
      const { data: existingConvs, error: existingError } = await supabase
        .from("conversations")
        .select("*")
        .or(
          `and(creator_id.eq.${currentUser.id},participant_id.eq.${userId}),` +
          `and(creator_id.eq.${userId},participant_id.eq.${currentUser.id})`
        )
        .limit(1)

      if (existingError) {
        console.error("Error checking for existing conversations:", existingError)
      } else if (existingConvs && existingConvs.length > 0) {
        // Found an existing conversation in Supabase
        const existingConvId = existingConvs[0].id

        // Check if this conversation was deleted by the current user
        const { data: deletedData, error: deletedError } = await supabase
          .from("deleted_conversations")
          .select("*")
          .eq("user_id", currentUser.id)
          .eq("conversation_id", existingConvId)

        if (deletedError) {
          console.error("Error checking if conversation was deleted:", deletedError)
        } else if (deletedData && deletedData.length > 0) {
          // This conversation was deleted by the current user, remove from deleted_conversations
          const { error: removeError } = await supabase
            .from("deleted_conversations")
            .delete()
            .eq("user_id", currentUser.id)
            .eq("conversation_id", existingConvId)

          if (removeError) {
            console.error("Error removing conversation from deleted_conversations:", removeError)
          }
        }

        // Fetch the user's avatar URL
        const { data: userData, error: userError } = await supabase
          .from("profiles")
          .select("avatar_url")
          .eq("id", userId)
          .single()

        let avatarUrl = null
        if (!userError && userData) {
          avatarUrl = userData.avatar_url
        } else {
          console.error("Error fetching user avatar:", userError)
        }

        // Fetch the conversation details to create a local version
        const newId = conversations.length > 0 ? Math.max(...conversations.map((c) => c.id)) + 1 : 1
        const newConversation = {
          id: newId,
          name: userName,
          lastMessage: existingConvs[0].last_message || "",
          timestamp: new Date(existingConvs[0].timestamp),
          online: isOnline || false,
          lastMessageSentBy: existingConvs[0].last_message_sent_by || null,
          pinned: false,
          userId: userId,
          supabaseId: existingConvId,
          avatar: avatarUrl
        }

        // Update the state with the new conversation (don't set as active here)
        set({
          conversations: [...conversations, newConversation],
        })

        return newId
      }

      // Fetch the user's avatar URL first
      const { data: userData, error: userError } = await supabase
        .from("profiles")
        .select("avatar_url")
        .eq("id", userId)
        .single()

      let avatarUrl = null
      if (!userError && userData) {
        avatarUrl = userData.avatar_url
      } else {
        console.error("Error fetching user avatar:", userError)
      }

      // For non-AI conversations, we'll create a pending conversation that only exists
      // in activeConversation state but NOT in the conversations list until first message is sent
      // Generate a UUID for the pending conversation so URL routing works
      const pendingSupabaseId = crypto.randomUUID()
      const newId = conversations.length > 0 ? Math.max(...conversations.map((c) => c.id)) + 1 : 1
      const pendingConversation = {
        id: newId,
        name: userName,
        lastMessage: "",
        timestamp: new Date(),
        online: isOnline || false,
        lastMessageSentBy: undefined,
        pinned: false,
        userId: userId,
        supabaseId: pendingSupabaseId,
        avatar: avatarUrl,
        pendingCreation: true
      }

      // Store the pending conversation in a separate state that won't appear in the sidebar
      // but can be retrieved by getActiveConversation()
      set({
        pendingConversation: pendingConversation,
        activeConversationId: newId
      })

      return newId
    } catch (error) {
      console.error("Error in createConversation:", error)
      return -1
    }
  },

  // Fix the createAIConversation function to ensure proper message ID generation
  createAIConversation: async (botName: string) => {
    const { conversations, messages } = get()
    const currentBot = aiService.getCurrentBot()
    const currentUser = useAuthStore.getState().user

    if (!currentUser) {
      console.error("Cannot create AI conversation: No authenticated user")
      return -1
    }

    // Check if we already have a conversation with this AI bot
    // Check in local state first
    const existingConversation = conversations.find(c => c.isAI && c.botId === currentBot.id)

    if (existingConversation) {
      // We already have a conversation with this bot, just return its ID
      // Don't set it as active here - let the caller handle that
      return existingConversation.id
    }

    // If not found in local state, check in Supabase for any existing conversation
    // that might have been deleted by the current user
    const { data: existingConvs, error: existingError } = await supabase
      .from("conversations")
      .select("*")
      .eq("creator_id", currentUser.id)
      .eq("is_ai", true)
      .eq("bot_id", currentBot.id)
      .limit(1)

    if (existingError) {
      console.error("Error checking for existing AI conversations:", existingError)
    } else if (existingConvs && existingConvs.length > 0) {
      // Found an existing conversation in Supabase
      const existingConvId = existingConvs[0].id

      // Check if this conversation was deleted by the current user
      const { data: deletedData, error: deletedError } = await supabase
        .from("deleted_conversations")
        .select("*")
        .eq("user_id", currentUser.id)
        .eq("conversation_id", existingConvId)

      if (deletedError) {
        console.error("Error checking if AI conversation was deleted:", deletedError)
      } else if (deletedData && deletedData.length > 0) {
        // This conversation was deleted by the current user, remove from deleted_conversations
        const { error: removeError } = await supabase
          .from("deleted_conversations")
          .delete()
          .eq("user_id", currentUser.id)
          .eq("conversation_id", existingConvId)

        if (removeError) {
          console.error("Error removing AI conversation from deleted_conversations:", removeError)
        }
      }

      // Fetch the conversation details to create a local version
      const newId = conversations.length > 0 ? Math.max(...conversations.map((c) => c.id)) + 1 : 1
      const newConversation = {
        id: newId,
        name: botName,
        lastMessage: existingConvs[0].last_message || "New conversation",
        timestamp: new Date(existingConvs[0].timestamp),
        online: true,
        lastMessageSentBy: existingConvs[0].last_message_sent_by || currentUser.username, // Use the stored value or current user's username
        pinned: false,
        isAI: true,
        botId: currentBot.id,
        supabaseId: existingConvId
      }

      // Generate a unique ID for the new message
      const newMessageId =
        messages.length > 0 ? Math.max(...messages.map((m) => (typeof m.id === "number" ? m.id : 0))) + 1 : 1

      // Add initial message from the AI
      const openingMessage =
        currentBot.id === "melvin"
          ? "Ermm welcome back to the chat how can I help you?"
          : "Ay yo! Bigglesmooth here again. What do you need my man?"

      const newMessage = {
        id: newMessageId,
        conversationId: newId,
        senderId: "ai",
        text: openingMessage,
        timestamp: new Date(),
        type: "ai-message"
      }

      // Store the new conversation ID first
      const newConversationId = newId;

      // Update the state with the new conversation (don't set as active here)
      set({
        conversations: [...conversations, newConversation],
        messages: [...messages, newMessage],
      })

      return newConversationId
    }

    // No existing conversation found, create a new one
    const openingMessage =
      currentBot.id === "melvin"
        ? "Ermm welcome to the chat how can I help you?"
        : "Ay yo! Bigglesmooth here. What do you need my man?"

    try {
      // Create new conversation in Supabase
      // Use the current user's username for last_message_sent_by to avoid foreign key constraint violation
      // The UI will still display the AI bot's name
      const { data: convData, error: convError } = await supabase
        .from("conversations")
        .insert({
          name: botName,
          last_message: openingMessage,
          creator_id: currentUser.id,
          participant_id: null, // AI doesn't have a user account
          online: true,
          last_message_sent_by: currentUser.username,
          pinned: false,
          is_ai: true,
          bot_id: currentBot.id
        })
        .select()

      if (convError) {
        console.error("Error creating AI conversation:", convError)
        return -1
      }

      const supabaseConvId = convData?.[0]?.id

      if (!supabaseConvId) {
        console.error("Failed to get conversation ID from Supabase")
        return -1
      }

      // Create initial AI message in Supabase
      const { error: msgError } = await supabase
        .from("chat_messages")
        .insert({
          conversation_id: supabaseConvId,
          sender_id: currentUser.id, 
          recipient_id: null,
          text: openingMessage,
          type: "ai-message"
        })

      if (msgError) {
        console.error("Error creating AI message:", msgError)
      }

      // Create new conversation for local state
      const newId = conversations.length > 0 ? Math.max(...conversations.map((c) => c.id)) + 1 : 1
      const newConversation = {
        id: newId,
        name: botName,
        lastMessage: openingMessage,
        timestamp: new Date(),
        online: true,
        lastMessageSentBy: botName, // Use the bot's name to match what we stored in the database
        pinned: false,
        isAI: true,
        botId: currentBot.id,
        supabaseId: supabaseConvId // Store the Supabase ID for future reference
      }

      // Generate a unique ID for the new message
      const newMessage = {
        id: newId,
        conversationId: newId,
        senderId: "ai",
        text: openingMessage,
        timestamp: new Date(),
        type: "ai-message"
      }

      // Store the new conversation ID first
      const newConversationId = newId;

      // Update the state with the new conversation (don't set as active here)
      set({
        conversations: [...conversations, newConversation],
        messages: [...messages, newMessage],
      })

      return newConversationId
    } catch (error) {
      console.error("Error in createAIConversation:", error)
      return -1
    }
  },

  updateConversationName: (conversationId: number, newName: string) => {
    const { conversations } = get()
    const updatedConversations = conversations.map((conversation) =>
      conversation.id === conversationId ? { ...conversation, name: newName } : conversation,
    )
    set({ conversations: updatedConversations })
  },
  markConversationAsRead: (conversationId: number) => {
    const { conversations, messages } = get()

    const updatedConversations = conversations.map((conversation) =>
      conversation.id === conversationId && conversation.unread ? { ...conversation, unread: 0 } : conversation,
    )

    // Mark messages as delivered when conversation is opened
    const messagesToUpdate = messages.filter(
      m => m.conversationId === conversationId &&
           m.senderId !== "me" &&
           m.status !== "delivered" &&
           m.status !== "read"
    )

    if (messagesToUpdate.length > 0) {
      const updatedMessages = messages.map(msg =>
        msg.conversationId === conversationId && msg.senderId !== "me" && msg.status !== "delivered" && msg.status !== "read"
          ? {
              ...msg,
              status: "delivered" as const
            }
          : msg
      )

      set({ messages: updatedMessages })

      // Update message status in Supabase
      messagesToUpdate.forEach(msg => {
        get().updateMessageStatus(msg.id, "delivered")
      })
    }

    set({ conversations: updatedConversations })
  },

  deleteConversation: async (conversationId: number) => {
    const { conversations, messages, activeConversationId } = get()
    const currentUser = useAuthStore.getState().user
    if (!currentUser) return

    try {
      // Find the conversation in our local state
      const conversation = conversations.find(c => c.id === conversationId)
      if (!conversation) {
        console.error("Conversation not found in local state:", conversationId)
        return
      }

      // Get the Supabase ID either from the conversation object or by fetching it
      let supabaseConvId = conversation.supabaseId

      if (!supabaseConvId) {
        // Find the Supabase conversation ID
        const { data: allConvs, error: convError } = await supabase
          .from("conversations")
          .select("id")
          .or(`creator_id.eq.${currentUser.id},participant_id.eq.${currentUser.id}`)
          .order("timestamp", { ascending: false })

        if (convError || !allConvs || allConvs.length === 0) {
          console.error("Error finding conversations:", convError || "No conversations found")
          return
        }

        // Find the conversation by index (frontend ID - 1)
        const index = conversationId - 1
        if (index < 0 || index >= allConvs.length) {
          console.error("Conversation index out of bounds:", index)
          return
        }

        supabaseConvId = allConvs[index].id
      }

      // Check if this is an AI conversation
      const isAIConversation = conversation.isAI === true

      if (isAIConversation) {
        // For AI conversations, actually delete the conversation and its messages
        // First, delete all messages in the conversation
        const { error: messagesError } = await supabase
          .from("chat_messages")
          .delete()
          .eq("conversation_id", supabaseConvId)

        if (messagesError) {
          console.error("Error deleting messages for AI conversation:", messagesError)
          // Continue with deletion even if there was an error with messages
        }

        // Then, delete the conversation itself
        const { error: convDeleteError } = await supabase
          .from("conversations")
          .delete()
          .eq("id", supabaseConvId)

        if (convDeleteError) {
          console.error("Error deleting AI conversation:", convDeleteError)

          // Check if this is a permission error (likely due to RLS policies)
          if (convDeleteError.code === "42501" || convDeleteError.message.includes("permission denied")) {
            console.error("Permission denied when deleting AI conversation. Make sure RLS policies allow deletion.")
          }

          return
        }

        console.log("Successfully deleted AI conversation:", supabaseConvId)
      } else {
        // For regular conversations, just mark as deleted for the current user
        await markConversationAsDeletedForUser(currentUser.id, supabaseConvId)

        // Explicitly call the function to check if both users have deleted the conversation
        try {
          const { data, error } = await supabase
            .rpc('check_and_delete_conversation_by_id', { conversation_id_param: supabaseConvId })

          if (error) {
            console.error("Error checking if both users deleted conversation:", error)
          } else if (data) {
            console.log("Conversation completely deleted as both users deleted it:", supabaseConvId)
          }
        } catch (error) {
          console.error("Error calling check_and_delete_conversation_by_id:", error)
        }
      }

      // Update local state
      // Filter out the deleted conversation
      const updatedConversations = conversations.filter((c) => c.id !== conversationId)

      // Filter out messages from the deleted conversation
      const updatedMessages = messages.filter((m) => m.conversationId !== conversationId)

      // If we're deleting the active conversation, set activeConversationId to null
      let newActiveId = activeConversationId
      if (activeConversationId === conversationId) {
        newActiveId = null
      }

      set({
        conversations: updatedConversations,
        messages: updatedMessages,
        activeConversationId: newActiveId,
      })
    } catch (error) {
      console.error("Error in deleteConversation:", error)
    }
  },

  togglePin: async (conversationId: number) => {
    const { conversations } = get()
    const currentUser = useAuthStore.getState().user
    if (!currentUser) return

    try {
      // Find the conversation to toggle
      const conversation = conversations.find(c => c.id === conversationId)
      if (!conversation) return

      // Find the Supabase conversation ID
      const { data: allConvs, error: convError } = await supabase
        .from("conversations")
        .select("id")
        .or(`creator_id.eq.${currentUser.id},participant_id.eq.${currentUser.id}`)
        .order("timestamp", { ascending: false })

      if (convError || !allConvs || allConvs.length === 0) {
        console.error("Error finding conversations:", convError || "No conversations found")
        return
      }

      // Find the conversation by index (frontend ID - 1)
      const index = conversationId - 1
      if (index < 0 || index >= allConvs.length) {
        console.error("Conversation index out of bounds:", index)
        return
      }

      const supabaseConvId = allConvs[index].id
      const newPinnedStatus = !conversation.pinned

      if (newPinnedStatus) {
        // Add to pinned_conversations table
        const { error } = await supabase
          .from("pinned_conversations")
          .insert({
            user_id: currentUser.id,
            conversation_id: supabaseConvId
          })

        if (error) {
          // If the error is a duplicate key error, it's already pinned, which is fine
          if (!error.message.includes('duplicate key')) {
            console.error("Error pinning conversation in Supabase:", error)
            return
          }
        }
      } else {
        // Remove from pinned_conversations table
        const { error } = await supabase
          .from("pinned_conversations")
          .delete()
          .eq("user_id", currentUser.id)
          .eq("conversation_id", supabaseConvId)

        if (error) {
          console.error("Error unpinning conversation in Supabase:", error)
          return
        }
      }

      // Update local state
      const updatedConversations = conversations.map((conv) =>
        conv.id === conversationId ? { ...conv, pinned: newPinnedStatus } : conv,
      )
      set({ conversations: updatedConversations })
    } catch (error) {
      console.error("Error in togglePin:", error)
    }
  },

  // Add the editMessage function
  editMessage: async (messageId: number, newText: string) => {
    const { messages, conversations } = get()
    const currentUser = useAuthStore.getState().user
    if (!currentUser) return

    // Find the message to edit
    const messageToEdit = messages.find((m) => m.id === messageId)
    if (!messageToEdit || messageToEdit.senderId !== "me") return

    // Create a new Date for the edit timestamp
    const editedAt = new Date()

    // Update the message
    const updatedMessages = messages.map((message) =>
      message.id === messageId
        ? {
            ...message,
            text: newText,
            edited: true,
            editedAt: editedAt,
          }
        : message,
    )

    // If this is the last message in the conversation, update the conversation's lastMessage
    const conversationId = messageToEdit.conversationId
    const conversationMessages = updatedMessages.filter((m) => m.conversationId === conversationId)
    const lastMessage = conversationMessages[conversationMessages.length - 1]

    const updatedConversations = conversations.map((conversation) =>
      conversation.id === conversationId && lastMessage.id === messageId
        ? { ...conversation, lastMessage: newText }
        : conversation,
    )

    set({
      messages: updatedMessages,
      conversations: updatedConversations,
    })

    // Save the edited message to Supabase if we have a supabaseId for the conversation
    const conversation = conversations.find(c => c.id === conversationId)
    if (conversation && conversation.supabaseId) {
      try {
        // Find the Supabase message ID
        const { data, error } = await supabase
          .from("chat_messages")
          .select("*")
          .eq("conversation_id", conversation.supabaseId)
          .order("timestamp", { ascending: true })

        if (error) {
          console.error("Error fetching messages for editing:", error)
          return
        }

        // The messageId is 1-based index, so we need to subtract 1 to get the array index
        const messageIndex = messageId - 1
        if (messageIndex < 0 || messageIndex >= data.length) {
          console.error("Message index out of bounds:", messageIndex)
          return
        }

        const supabaseMessageId = data[messageIndex].id

        // Update the message in Supabase with the new text and edited_at timestamp
        const { error: updateError } = await supabase
          .from("chat_messages")
          .update({
            text: newText,
            edited_at: editedAt.toISOString()
          })
          .eq("id", supabaseMessageId)

        if (updateError) {
          console.error("Error updating edited message in Supabase:", updateError)
        }

        // If this was the last message, update the conversation's last_message
        if (lastMessage.id === messageId) {
          const { error: convError } = await supabase
            .from("conversations")
            .update({
              last_message: newText,
              last_message_sent_by: currentUser.username, // Make sure we use the current user's username
              // Keep the existing message type and mindmap_id
              // since we're just editing the text
            })
            .eq("id", conversation.supabaseId)

          if (convError) {
            console.error("Error updating conversation in Supabase:", convError)
          }
        }
      } catch (error) {
        console.error("Error in Supabase operations for message editing:", error)
      }
    }
  },

  // Function to mark a message as deleted (not actually deleting it from the database)
  deleteMessage: async (messageId: number) => {
    const { messages, conversations } = get()
    const currentUser = useAuthStore.getState().user
    if (!currentUser) return

    // Find the message to mark as deleted
    const messageToDelete = messages.find((m) => m.id === messageId)
    if (!messageToDelete || messageToDelete.senderId !== "me") return

    // Find the conversation
    const conversationId = messageToDelete.conversationId
    const conversation = conversations.find(c => c.id === conversationId)
    if (!conversation) return

    // Update the message locally - mark as deleted but keep it in the UI
    const updatedMessages = messages.map((message) =>
      message.id === messageId
        ? {
            ...message,
            deleted: true,
          }
        : message,
    )

    // If this is the last message in the conversation, update the conversation's lastMessage
    const conversationMessages = updatedMessages.filter((m) => m.conversationId === conversationId)
    const lastMessage = conversationMessages[conversationMessages.length - 1]

    const updatedConversations = conversations.map((conversation) =>
      conversation.id === conversationId && lastMessage.id === messageId
        ? { ...conversation, lastMessage: "Message deleted" }
        : conversation,
    )

    set({
      messages: updatedMessages,
      conversations: updatedConversations,
    })

    // Delete the message in Supabase if we have a supabaseId for the conversation
    if (conversation.supabaseId) {
      try {
        // Find the Supabase message ID
        // We need to find the message in Supabase based on the conversation ID and message index
        const { data, error } = await supabase
          .from("chat_messages")
          .select("*")
          .eq("conversation_id", conversation.supabaseId)
          .order("timestamp", { ascending: true })

        if (error) {
          console.error("Error fetching messages for deletion:", error)
          return
        }

        // The messageId is 1-based index, so we need to subtract 1 to get the array index
        const messageIndex = messageId - 1
        if (messageIndex < 0 || messageIndex >= data.length) {
          console.error("Message index out of bounds:", messageIndex)
          return
        }

        const supabaseMessageId = data[messageIndex].id

        // Mark the message as deleted in Supabase without actually deleting it
        const { error: updateError } = await supabase
          .from("chat_messages")
          .update({ deleted: true })
          .eq("id", supabaseMessageId)

        if (updateError) {
          console.error("Error deleting message in Supabase:", updateError)
        }

        // If this was the last message, update the conversation's last_message
        if (lastMessage.id === messageId) {
          // Now that we've added the columns to the database, we can include them in the update
          const updateData: any = {
            last_message: "Message deleted",
            last_message_type: "text", // Reset to text type
            mindmap_id: null, // Clear any mindmap_id
            last_message_sent_by: currentUser.username // Make sure we use the current user's username
          }

          try {
            const { error: convError } = await supabase
              .from("conversations")
              .update(updateData)
              .eq("id", conversation.supabaseId)

            if (convError) {
              console.error("Error updating conversation in Supabase:", convError)
            }
          } catch (error) {
            console.error("Error updating conversation in Supabase:", error)
          }
        }
      } catch (error) {
        console.error("Error in Supabase operations for message deletion:", error)
      }
    }
  },
  // Function to save message reactions to Supabase
  saveMessageReactions: async (messageId: number, reactions: Record<string, string[]>) => {
    const { messages } = get()
    const currentUser = useAuthStore.getState().user
    if (!currentUser) {
      console.error("Cannot save reactions: No authenticated user")
      return
    }

    // Find the message
    const message = messages.find(m => m.id === messageId)
    if (!message) return

    // Find the conversation
    const conversation = get().conversations.find(c => c.id === message.conversationId)
    if (!conversation || !conversation.supabaseId) return

    try {
      // Find the Supabase message ID
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("conversation_id", conversation.supabaseId)
        .order("timestamp", { ascending: true })

      if (error) {
        console.error("Error fetching messages for updating reactions:", error)
        return
      }

      // The messageId is 1-based index, so we need to subtract 1 to get the array index
      const messageIndex = messageId - 1
      if (messageIndex < 0 || messageIndex >= data.length) {
        console.error("Message index out of bounds:", messageIndex)
        return
      }

      const supabaseMessageId = data[messageIndex].id

      // Update the message in Supabase with the new reactions
      const { error: updateError } = await supabase
        .from("chat_messages")
        .update({
          reactions: reactions
        })
        .eq("id", supabaseMessageId)

      if (updateError) {
        console.error("Error updating message reactions in Supabase:", updateError)
      }
    } catch (error) {
      console.error("Error in Supabase operations for saving reactions:", error)
    }
  },

  // Function to save emphasized message status to Supabase
  saveEmphasizedMessage: async (messageId: number, emphasized: boolean) => {
    const { messages } = get()
    const currentUser = useAuthStore.getState().user
    if (!currentUser) {
      console.error("Cannot save emphasized status: No authenticated user")
      return
    }

    // Find the message
    const message = messages.find(m => m.id === messageId)
    if (!message) return

    // Find the conversation
    const conversation = get().conversations.find(c => c.id === message.conversationId)
    if (!conversation || !conversation.supabaseId) return

    try {
      // Find the Supabase message ID
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("conversation_id", conversation.supabaseId)
        .order("timestamp", { ascending: true })

      if (error) {
        console.error("Error fetching messages for updating emphasized status:", error)
        return
      }

      // The messageId is 1-based index, so we need to subtract 1 to get the array index
      const messageIndex = messageId - 1
      if (messageIndex < 0 || messageIndex >= data.length) {
        console.error("Message index out of bounds:", messageIndex)
        return
      }

      const supabaseMessageId = data[messageIndex].id

      // Update the message in Supabase with the new emphasized status
      const { error: updateError } = await supabase
        .from("chat_messages")
        .update({
          emphasized: emphasized
        })
        .eq("id", supabaseMessageId)

      if (updateError) {
        console.error("Error updating message emphasized status in Supabase:", updateError)
      }
    } catch (error) {
      console.error("Error in Supabase operations for saving emphasized status:", error)
    }
  },

  // Add a new function to update an AI message after accepting/rejecting mindmap changes
  updateAIMessageAfterAction: async (messageId: number, action: "accepted" | "rejected") => {
    const { messages, conversations } = get()
    const currentUser = useAuthStore.getState().user
    if (!currentUser) {
      console.error("Cannot update AI message: No authenticated user")
      return
    }

    // Find the message to update
    const messageToUpdate = messages.find((m) => m.id === messageId)
    if (!messageToUpdate || messageToUpdate.senderId !== "ai") return

    // Get the appropriate message text based on the action
    const newText = action === "accepted" ? ACCEPTED_MINDMAP_MESSAGE : REJECTED_MINDMAP_MESSAGE

    // Update the message - remove replyToId to make it not appear as a reply
    const updatedMessages = messages.map((message) =>
      message.id === messageId
        ? {
            ...message,
            text: newText,
            type: action === "accepted" ? "accepted-mindmap" : "rejected-mindmap",
            replyToId: undefined, // Remove the replyToId to make it not appear as a reply
          }
        : message,
    )

    // If this is the last message in the conversation, update the conversation's lastMessage
    const conversationId = messageToUpdate.conversationId
    const conversationMessages = updatedMessages.filter((m) => m.conversationId === conversationId)
    const lastMessage = conversationMessages[conversationMessages.length - 1]

    const updatedConversations = conversations.map((conversation) =>
      conversation.id === conversationId && lastMessage.id === messageId
        ? {
            ...conversation,
            lastMessage: newText,
            lastMessageType: action === "accepted" ? "accepted-mindmap" : "rejected-mindmap",
            mindmapTitle: undefined // Clear any mindmap title
          }
        : conversation,
    )

    set({
      messages: updatedMessages,
      conversations: updatedConversations,
    })

    // Find the conversation to get its Supabase ID
    const conversation = conversations.find(c => c.id === conversationId)
    if (!conversation || !conversation.supabaseId) return

    try {
      // Find the Supabase message ID
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("conversation_id", conversation.supabaseId)
        .order("timestamp", { ascending: true })

      if (error) {
        console.error("Error fetching messages for updating AI status:", error)
        return
      }

      // The messageId is 1-based index, so we need to subtract 1 to get the array index
      const messageIndex = messageId - 1
      if (messageIndex < 0 || messageIndex >= data.length) {
        console.error("Message index out of bounds:", messageIndex)
        return
      }

      const supabaseMessageId = data[messageIndex].id

      // Update the message in Supabase with the new type and ai_map_status
      // Also set reply_to_id to null to make it not appear as a reply
      const { error: updateError } = await supabase
        .from("chat_messages")
        .update({
          text: newText,
          type: action === "accepted" ? "accepted-mindmap" : "rejected-mindmap",
          ai_map_status: action,
          reply_to_id: null // Set reply_to_id to null in the database
        })
        .eq("id", supabaseMessageId)

      if (updateError) {
        console.error("Error updating AI message status in Supabase:", updateError)
      }

      // If this was the last message, update the conversation's last_message
      if (lastMessage.id === messageId) {
        // Now that we've added the columns to the database, we can include them in the update
        const updateData: any = {
          last_message: newText,
          last_message_type: action === "accepted" ? "accepted-mindmap" : "rejected-mindmap",
          mindmap_id: null, // Clear any mindmap_id
          last_message_sent_by: currentUser.username // Make sure we use the current user's username
        }

        try {
          const { error: convError } = await supabase
            .from("conversations")
            .update(updateData)
            .eq("id", conversation.supabaseId)

          if (convError) {
            console.error("Error updating conversation in Supabase:", convError)
          }
        } catch (error) {
          console.error("Error updating conversation in Supabase:", error)
        }
      }
    } catch (error) {
      console.error("Error in Supabase operations for AI message status update:", error)
    }
  },

  // Function to update AI message text when switching between preview versions
  updateAIMessageText: (messageId: number, newText: string) => {
    const { messages, conversations } = get()

    // Find the message to update
    const messageToUpdate = messages.find((m) => m.id === messageId)
    if (!messageToUpdate || messageToUpdate.senderId !== "ai") return

    // Update the message text locally
    const updatedMessages = messages.map((message) =>
      message.id === messageId
        ? {
            ...message,
            text: newText,
          }
        : message,
    )

    // If this is the last message in the conversation, update the conversation's lastMessage
    const conversationId = messageToUpdate.conversationId
    const conversationMessages = updatedMessages.filter((m) => m.conversationId === conversationId)
    const lastMessage = conversationMessages[conversationMessages.length - 1]

    const updatedConversations = conversations.map((conversation) =>
      conversation.id === conversationId && lastMessage.id === messageId
        ? {
            ...conversation,
            lastMessage: newText,
          }
        : conversation,
    )

    set({
      messages: updatedMessages,
      conversations: updatedConversations,
    })
  },

  // Function to regenerate an AI message
  regenerateAIMessage: async (messageId: number) => {
    const { messages, conversations } = get()
    const currentUser = useAuthStore.getState().user
    if (!currentUser) {
      console.error("Cannot regenerate AI message: No authenticated user")
      return
    }

    // Find the message to regenerate
    const messageToRegenerate = messages.find((m) => m.id === messageId)
    if (!messageToRegenerate || messageToRegenerate.senderId !== "ai") {
      console.error("Message not found or not an AI message")
      return
    }

    // Find the conversation
    const conversation = conversations.find(c => c.id === messageToRegenerate.conversationId)
    if (!conversation || !conversation.isAI) {
      console.error("Conversation not found or not an AI conversation")
      return
    }

    // Set AI typing status
    set({ isAITyping: true })

    try {
      // Find the user message that the AI was responding to
      const userMessage = messages.find(m => 
        m.conversationId === messageToRegenerate.conversationId && 
        m.senderId === "me" && 
        messageToRegenerate.replyToId === m.id
      )

      if (!userMessage) {
        console.error("Could not find the user message to regenerate response for")
        set({ isAITyping: false })
        return
      }

      // Set to this conversation's bot before generating response
      if (conversation.botId) {
        aiService.setCurrentBot(conversation.botId)
      }

      // Get mindmap data if the user message had a mindmap
  const mindMapData = userMessage.mindmapPermalink
        ? (() => {
            const { maps } = useMindMapStore.getState()
            const selectedMap = maps.find((m) => m.permalink === userMessage.mindmapPermalink)
            return selectedMap || undefined
          })()
        : undefined

      // Generate new AI response
      const newResponse = await aiService.generateResponse(
        userMessage.text, 
        messageToRegenerate.conversationId, 
        mindMapData
      )

      // Update the existing AI message with the new response
      const updatedMessages = messages.map((message) =>
        message.id === messageId
          ? {
              ...message,
              text: newResponse,
              timestamp: new Date(),
              edited: true,
              editedAt: new Date()
            }
          : message
      )

      // Update conversation's last message if this was the last message
      const conversationMessages = updatedMessages.filter((m) => m.conversationId === messageToRegenerate.conversationId)
      const lastMessage = conversationMessages[conversationMessages.length - 1]

      const updatedConversations = conversations.map((conv) =>
        conv.id === messageToRegenerate.conversationId && lastMessage.id === messageId
          ? {
              ...conv,
              lastMessage: newResponse,
              timestamp: new Date(),
              lastMessageSentBy: conv.name
            }
          : conv
      )

      set({
        messages: updatedMessages,
        conversations: updatedConversations,
        isAITyping: false
      })

      // Update message in Supabase if we have a supabaseId for the conversation
      if (conversation.supabaseId) {
        try {
          // Find the Supabase message ID
          const { data, error } = await supabase
            .from("chat_messages")
            .select("*")
            .eq("conversation_id", conversation.supabaseId)
            .order("timestamp", { ascending: true })

          if (error) {
            console.error("Error fetching messages for regeneration:", error)
            return
          }

          // The messageId is 1-based index, so we need to subtract 1 to get the array index
          const messageIndex = messageId - 1
          if (messageIndex < 0 || messageIndex >= data.length) {
            console.error("Message index out of bounds:", messageIndex)
            return
          }

          const supabaseMessageId = data[messageIndex].id

          // Update the message in Supabase
          const { error: updateError } = await supabase
            .from("chat_messages")
            .update({
              text: newResponse,
              edited_at: new Date().toISOString()
            })
            .eq("id", supabaseMessageId)

          if (updateError) {
            console.error("Error updating regenerated message in Supabase:", updateError)
          }

          // If this was the last message, update the conversation's last_message
          if (lastMessage.id === messageId) {
            const { error: convError } = await supabase
              .from("conversations")
              .update({
                last_message: newResponse,
                timestamp: new Date().toISOString(),
                last_message_sent_by: currentUser.username
              })
              .eq("id", conversation.supabaseId)

            if (convError) {
              console.error("Error updating conversation after regeneration:", convError)
            }
          }
        } catch (error) {
          console.error("Error in Supabase operations for message regeneration:", error)
        }
      }
    } catch (error) {
      console.error("Error regenerating AI message:", error)
      set({ isAITyping: false })
    }
  },

  // Supabase interactions
  fetchConversations: async (skipAutoSelect = false, setupTypingChannels = false) => {
    const currentUser = useAuthStore.getState().user
    if (!currentUser) return

    const { activeConversationId } = get()

    // Store previous conversation IDs to check for new ones
    const previousConversations = get().conversations
    const previousSupabaseIds = new Set(previousConversations.map(c => c.supabaseId).filter(Boolean))

    // If skipAutoSelect is true, temporarily set activeConversationId to null
    // This prevents any automatic selection of conversations during initial load
    // But only if there's no active conversation already
    if (skipAutoSelect && activeConversationId === null) {
      set({ activeConversationId: null })
    }

    set({ isLoading: true })

    try {
      // Fetch conversations where the user is either the creator or participant
      const { data, error } = await supabase
        .from("conversations")
        .select("*")
        .or(`creator_id.eq.${currentUser.id},participant_id.eq.${currentUser.id}`)
        .order("timestamp", { ascending: false })

      if (error) {
        console.error("Error fetching conversations:", error)
        return
      }

      // Create a map to store unread counts for each conversation
      const unreadCounts: Record<string, number> = {}

      // Fetch user profiles for participants
      const userIds = data.map(conv =>
        conv.creator_id === currentUser.id ? conv.participant_id : conv.creator_id
      ).filter(id => id !== null)

      let userProfiles: Record<string, any> = {}
      if (userIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, username, full_name, avatar_url, last_seen")
          .in("id", userIds)

        if (!profilesError && profiles) {
          userProfiles = profiles.reduce((acc: Record<string, any>, profile) => {
            acc[profile.id] = profile
            return acc
          }, {})
        } else {
          console.error("Error fetching user profiles:", profilesError)
        }
      }

      // Fetch user's pinned conversations
      const { data: pinnedData, error: pinnedError } = await supabase
        .from("pinned_conversations")
        .select("conversation_id")
        .eq("user_id", currentUser.id)

      if (pinnedError) {
        console.error("Error fetching pinned conversations:", pinnedError)
      }

      // Create a set of pinned conversation IDs for quick lookup
      const pinnedConversationIds = new Set(
        pinnedData?.map(item => item.conversation_id) || []
      )

      // Fetch user's deleted conversations
      let deletedData: any[] = []
      try {
        const { data, error: deletedError } = await supabase
          .from("deleted_conversations")
          .select("conversation_id")
          .eq("user_id", currentUser.id)

        if (deletedError) {
          console.warn("Could not fetch deleted conversations:", deletedError)
        } else {
          deletedData = data || []
        }
      } catch (error) {
        console.warn("Deleted conversations table not available:", error)
      }

      // Create a set of deleted conversation IDs for quick lookup
      const deletedConversationIds = new Set(
        deletedData?.map(item => item.conversation_id) || []
      )

      // Filter out deleted conversations
      const filteredData = data.filter(conv => !deletedConversationIds.has(conv.id))

      // Fetch unread message counts for each conversation
      for (const conv of filteredData) {
        // Count unread messages for this conversation (messages sent to the current user that haven't been read)
        const { count, error: countError } = await supabase
          .from("chat_messages")
          .select("*", { count: "exact", head: true })
          .eq("conversation_id", conv.id)
          .neq("sender_id", currentUser.id) // Not from current user
          .is("read_at", null); // Not read yet

        if (countError) {
          console.error(`Error counting unread messages for conversation ${conv.id}:`, countError);
          unreadCounts[conv.id] = 0;
        } else {
          unreadCounts[conv.id] = count || 0;
        }
      }

      // Get mindmap titles for conversations with mindmap messages
      const mindmapConversations = filteredData.filter(conv =>
        conv.last_message_type === "mindmap" && conv.mindmap_id
      );

      const mindmapTitles: Record<string, string> = {};

      if (mindmapConversations.length > 0) {
        try {
          const mindmapKeys = mindmapConversations.map(conv => conv.mindmap_id).filter(Boolean);

          if (mindmapKeys.length > 0) {
            const { data: mindmapsData, error: mindmapsError } = await supabase
              .from("mindmaps")
              .select("key, title")
              .in("id", mindmapKeys);

            if (!mindmapsError && mindmapsData) {
              mindmapsData.forEach(map => {
                if (map.key) {
                  mindmapTitles[map.key] = map.title;
                }
              });
            }
          }
        } catch (error) {
          console.error("Error fetching mindmap titles:", error);
        }
      }

      // Fetch the last message status for each conversation where the current user sent the last message
      const lastMessageStatuses: Record<string, "sent" | "delivered" | "read"> = {}

      for (const conv of filteredData) {
        if (conv.last_message_sent_by === currentUser.username && !conv.is_ai) {
          try {
            const { data: lastMessageData, error: lastMessageError } = await supabase
              .from("chat_messages")
              .select("status")
              .eq("conversation_id", conv.id)
              .eq("sender_id", currentUser.id)
              .order("timestamp", { ascending: false })
              .limit(1)

            if (!lastMessageError && lastMessageData && lastMessageData.length > 0) {
              lastMessageStatuses[conv.id] = lastMessageData[0].status || "delivered"
            }
          } catch (error) {
            console.error("Error fetching last message status for conversation:", conv.id, error)
          }
        }
      }

      // Convert from Supabase format to our app format
      const formattedConversations = filteredData.map((conv, index) => {
        const otherUserId = conv.creator_id === currentUser.id ? conv.participant_id : conv.creator_id
        const otherUser = userProfiles[otherUserId] || {}

        // Get mindmap title if this is a mindmap message
        let mindmapTitle = undefined;
        if (conv.last_message_type === "mindmap" && conv.mindmap_id && mindmapTitles[conv.mindmap_id]) {
          mindmapTitle = mindmapTitles[conv.mindmap_id];
        }

        return {
          id: index + 1, // Assign sequential IDs for the frontend
          name: conv.is_ai ? conv.name : otherUser.username || conv.name,
          lastMessage: conv.last_message || "",
          timestamp: new Date(conv.timestamp),
          avatar: otherUser.avatar_url || conv.avatar_url,
          online: conv.is_ai ? false : isUserOnline(otherUser.last_seen, get().onlineStatusThreshold), // Use real online status for non-AI users
          unread: unreadCounts[conv.id] || 0, // Use our calculated unread count
          lastMessageSentBy: conv.last_message_sent_by || null,
          lastMessageStatus: lastMessageStatuses[conv.id] || undefined,
          pinned: pinnedConversationIds.has(conv.id), // Use user-specific pinned status
          isAI: conv.is_ai || false,
          botId: conv.bot_id,
          userId: otherUserId, // Store the other user's ID
          supabaseId: conv.id, // Store the Supabase UUID for this conversation
          lastMessageType: conv.last_message_type || "text",
          mindmapTitle: mindmapTitle,
          lastSeen: conv.is_ai ? null : otherUser.last_seen || null
        }
      })

      // Store the current active conversation ID
      const currentActiveId = get().activeConversationId;

      // Find the corresponding conversation in the new list if it exists
      let newActiveId = currentActiveId;

      if (currentActiveId) {
        // Find the current active conversation to get its Supabase ID
        const currentActiveConv = get().conversations.find(c => c.id === currentActiveId);

        if (currentActiveConv && currentActiveConv.supabaseId) {
          // Find the corresponding conversation in the new list by Supabase ID
          const newActiveConv = formattedConversations.find(c => c.supabaseId === currentActiveConv.supabaseId);

          if (newActiveConv) {
            newActiveId = newActiveConv.id;
          } else {
            // Only deselect if we're sure the conversation was actually deleted
            // Keep the current selection if it might just be a temporary sync issue
            newActiveId = currentActiveId;
          }
        } else if (currentActiveConv) {
          // If the conversation exists but doesn't have a Supabase ID, try to find it by other means
          const newActiveConv = formattedConversations.find(c =>
            c.name === currentActiveConv.name &&
            c.isAI === currentActiveConv.isAI &&
            (c.isAI ? c.botId === currentActiveConv.botId : c.userId === currentActiveConv.userId)
          );

          if (newActiveConv) {
            newActiveId = newActiveConv.id;
          } else {
            // Keep current selection to avoid random deselection
            newActiveId = currentActiveId;
          }
        }
      }

      // If skipAutoSelect is true, don't set the activeConversationId
      if (skipAutoSelect) {
        set({
          conversations: formattedConversations,
          isLoading: false
        })
      } else {
        set({
          conversations: formattedConversations,
          isLoading: false,
          activeConversationId: newActiveId
        })
      }

      // Only set up typing channels if explicitly requested (when in Chat page)
      if (setupTypingChannels) {
        // Only set up typing channels for NEW conversations (not all conversations)
        const newConversations = formattedConversations.filter(conv => 
          conv.supabaseId && !previousSupabaseIds.has(conv.supabaseId)
        )

        if (newConversations.length > 0) {
          console.log(`[DEBUG] Setting up typing channels for ${newConversations.length} new conversations`)
          await get().setupTypingChannelsForNewConversations(newConversations)
        }

        // Only run full setup on initial load (when there were no previous conversations)
        if (previousConversations.length === 0 && formattedConversations.length > 0) {
          console.log('[DEBUG] Initial load: Setting up typing channels for all conversations')
          await get().setupTypingChannelsForAllConversations()
        }
      }

    } catch (error) {
      console.error("Error in fetchConversations:", error)
      set({ isLoading: false })
    }
  },

  fetchMessages: async (conversationId: number) => {
    const { conversations, messages, pendingConversation } = get()
    
    // Check if this is a pending conversation
    const conversation = pendingConversation && conversationId === pendingConversation.id 
      ? pendingConversation 
      : conversations.find(c => c.id === conversationId)
      
    if (!conversation) return

    // If this is a pending conversation, there are no messages yet
    if (conversation.pendingCreation) {
      console.log("Pending conversation, no messages to fetch yet")
      set({ 
        messages: messages.filter(m => m.conversationId !== conversationId),
        isLoading: false 
      })
      return
    }

    set({ isLoading: true })

    try {
      // If we have the Supabase ID stored in the conversation, use it directly
      let supabaseConvId = conversation.supabaseId

      // If we don't have the Supabase ID, find it by index
      if (!supabaseConvId) {
        // Instead of using offset, we'll fetch all conversations and find the right one by index
        const { data: allConvs, error: convError } = await supabase
          .from("conversations")
          .select("id")
          .or(`creator_id.eq.${useAuthStore.getState().user?.id},participant_id.eq.${useAuthStore.getState().user?.id}`)
          .order("timestamp", { ascending: false })

        // Handle errors or no data
        if (convError || !allConvs || allConvs.length === 0) {
          console.error("Error finding conversations:", convError || "No conversations found")
          set({ isLoading: false })
          return
        }

        // Find the conversation by index (frontend ID - 1)
        const index = conversationId - 1
        if (index < 0 || index >= allConvs.length) {
          console.error("Conversation index out of bounds:", index)
          set({ isLoading: false })
          return
        }

        supabaseConvId = allConvs[index].id

        // Update the conversation with the Supabase ID for future use
        const updatedConversations = get().conversations.map(c =>
          c.id === conversationId ? { ...c, supabaseId: supabaseConvId } : c
        )
        set({ conversations: updatedConversations })
      }

      // Check if this conversation was previously deleted by the current user
      // If so, we should only show messages after the most recent deletion
      let lastDeletionTime: string | null = null
      const currentUser = useAuthStore.getState().user
      if (currentUser) {
        try {
          const { data: deletionHistory, error: deletionError } = await supabase
            .from("deleted_conversations")
            .select("created_at")
            .eq("user_id", currentUser.id)
            .eq("conversation_id", supabaseConvId)
            .order("created_at", { ascending: false })
            .limit(1)

          if (!deletionError && deletionHistory && deletionHistory.length > 0) {
            // Found a previous deletion, only show messages after this timestamp
            lastDeletionTime = deletionHistory[0].created_at
          }
        } catch (error) {
          // If deleted_conversations table doesn't exist or has issues, just continue without filtering
          console.warn("Could not check deletion history:", error)
        }
      }

      // Fetch messages for this conversation
      let query = supabase
        .from("chat_messages")
        .select("*")
        .eq("conversation_id", supabaseConvId)

      // If we have a timestamp filter, apply it
      if (lastDeletionTime) {
        query = query.gt("timestamp", lastDeletionTime)
      }

      const { data, error } = await query.order("timestamp", { ascending: true })

      if (error) {
        // If the conversation doesn't exist in Supabase yet (e.g., pending conversation), 
        // just return empty messages instead of erroring
        if (error.code === 'PGRST116' || error.message.includes('relation') || error.message.includes('does not exist')) {
          console.log("Conversation not yet created in Supabase, returning empty messages")
          set({
            messages: messages.filter(m => m.conversationId !== conversationId),
            isLoading: false
          })
          return
        }
        
        console.error("Error fetching messages:", error)
        set({ isLoading: false })
        return
      }

      // Since mindmap_id now contains the actual ID (not a key), no mapping is needed

      // Convert from Supabase format to our app format
      const formattedMessages = data.map((msg, index) => {
        // Determine the sender ID based on the message type
        let senderId = msg.sender_id === useAuthStore.getState().user?.id ? "me" : msg.sender_id

        // If this is an AI message, set the sender to "ai"
        if (msg.type === "ai-message") {
          senderId = "ai"
        }

  // Store mindmap id directly; resolution to permalink handled elsewhere if needed
  const mindmapId = msg.type === 'mindmap' ? msg.mindmap_id : undefined

        // Determine the correct message type based on ai_map_status if available
        let messageType = msg.type || "text";
        let messageText = msg.text;

        // If we have an ai_map_status, use it to set the correct type and text
        // Also ensure the sender is set to "ai" for these messages
        if (msg.ai_map_status === "accepted") {
          messageType = "accepted-mindmap";
          messageText = ACCEPTED_MINDMAP_MESSAGE;
          senderId = "ai"; // Force sender to be AI for accepted mindmap messages
        } else if (msg.ai_map_status === "rejected") {
          messageType = "rejected-mindmap";
          messageText = REJECTED_MINDMAP_MESSAGE;
          senderId = "ai"; // Force sender to be AI for rejected mindmap messages
        }

        return {
          id: index + 1, // Assign sequential IDs for the frontend
          conversationId,
          senderId,
          text: messageText,
          timestamp: new Date(msg.timestamp),
          mindmapId,
          type: messageType,
          edited: msg.edited_at !== null,
          editedAt: msg.edited_at ? new Date(msg.edited_at) : undefined,
          deleted: msg.deleted || false,
          emphasized: msg.emphasized || false,
          // Map reply_to_id from Supabase ID to local message ID (1-based index)
          replyToId: msg.reply_to_id ? data.findIndex(m => m.id === msg.reply_to_id) + 1 : undefined,
          reactions: msg.reactions || {},
          status: msg.status || (senderId === "me" ? "delivered" : undefined),
          readAt: msg.read_at ? new Date(msg.read_at) : undefined
        }
      })

      set({
        messages: formattedMessages,
        isLoading: false
      })
    } catch (error) {
      console.error("Error in fetchMessages:", error)
      set({ isLoading: false })
    }
  },

  fetchUsers: async () => {
    const currentUser = useAuthStore.getState().user
    if (!currentUser) return

    set({ isLoading: true })

    try {
      // Fetch users that the current user follows (following)
      const { data: followingData, error: followingError } = await supabase
        .from("user_follows")
        .select("followed_id")
        .eq("follower_id", currentUser.id)

      if (followingError) {
        console.error("Error fetching following users:", followingError)
      }

      // Fetch users that follow the current user (followers)
      const { data: followersData, error: followersError } = await supabase
        .from("user_follows")
        .select("follower_id")
        .eq("followed_id", currentUser.id)

      if (followersError) {
        console.error("Error fetching followers:", followersError)
      }

      const following = followingData?.map(f => f.followed_id) || []
      const followers = followersData?.map(f => f.follower_id) || []

      // Get the union of followers and following
      const userIds = [...new Set([...following, ...followers])]

      if (userIds.length === 0) {
        set({ users: [], isLoading: false })
        return
      }

      // Fetch user profiles including last_seen for presence tracking
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url, last_seen")
        .in("id", userIds)

      if (error) {
        console.error("Error fetching users:", error)
        set({ isLoading: false })
        return
      }

      // Format users with online status
      const formattedUsers = data.map(user => ({
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        avatar_url: user.avatar_url,
        online: isUserOnline(user.last_seen, get().onlineStatusThreshold),
        following: following.includes(user.id),
        followed_by: followers.includes(user.id),
        lastSeen: user.last_seen
      }))

      set({ users: formattedUsers, isLoading: false })
    } catch (error) {
      console.error("Error in fetchUsers:", error)
      set({ isLoading: false })
    }
  },

  searchUsers: async (query: string) => {
    if (!query || query.length < 2) return []

    try {
      // First search users the current user follows or is followed by
      const currentUsers = get().users
      const filteredUsers = currentUsers.filter(user =>
        user.username.toLowerCase().includes(query.toLowerCase()) ||
        (user.full_name && user.full_name.toLowerCase().includes(query.toLowerCase()))
      )

      // If we have results from followed users, return those first
      if (filteredUsers.length > 0) {
        return filteredUsers
      }

      // Otherwise search all users
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url, last_seen")
        .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
        .limit(10)

      if (error) {
        console.error("Error searching users:", error)
        return []
      }

      // Format users
      return data.map(user => ({
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        avatar_url: user.avatar_url,
        online: isUserOnline(user.last_seen, get().onlineStatusThreshold),
        lastSeen: user.last_seen
      }))
    } catch (error) {
      console.error("Error in searchUsers:", error)
      return []
    }
  },

  // Function to update message status (delivered or read)
  updateMessageStatus: async (messageId: number, status: "delivered" | "read") => {
    const { messages } = get()
    const currentUser = useAuthStore.getState().user
    if (!currentUser) {
      console.error("Cannot update message status: No authenticated user")
      return
    }

    // Find the message
    const message = messages.find(m => m.id === messageId)
    if (!message) return

    // Skip if the message is from the current user or already has the same status
    if (message.senderId === "me" || message.status === status) return

    // Find the conversation
    const conversation = get().conversations.find(c => c.id === message.conversationId)
    if (!conversation || !conversation.supabaseId) return

    // Update the message locally
    const updatedMessages = messages.map(msg =>
      msg.id === messageId
        ? {
            ...msg,
            status,
            readAt: status === "read" ? new Date() : msg.readAt
          }
        : msg
    )

    set({ messages: updatedMessages })

    try {
      // Find the Supabase message ID
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("conversation_id", conversation.supabaseId)
        .order("timestamp", { ascending: true })

      if (error) {
        console.error("Error fetching messages for updating status:", error)
        return
      }

      // The messageId is 1-based index, so we need to subtract 1 to get the array index
      const messageIndex = messageId - 1
      if (messageIndex < 0 || messageIndex >= data.length) {
        console.error("Message index out of bounds:", messageIndex)
        return
      }

      const supabaseMessageId = data[messageIndex].id

      // Update the message in Supabase with the new status
      const updateData: any = {
        status: status
      }

      // If status is "read", also update the read_at timestamp
      if (status === "read") {
        updateData.read_at = new Date().toISOString()
      }

      const { error: updateError } = await supabase
        .from("chat_messages")
        .update(updateData)
        .eq("id", supabaseMessageId)

      if (updateError) {
        console.error("Error updating message status in Supabase:", updateError)
      } else {
        // Check if this was the last message in the conversation and update conversation status
        const { conversations, messages } = get()
        const conversationMessages = messages.filter(m => m.conversationId === message.conversationId)
        const lastMessage = conversationMessages[conversationMessages.length - 1]

        if (lastMessage && lastMessage.id === messageId && lastMessage.senderId === "me") {
          // This was the last message sent by the current user, update conversation status
          const updatedConversations = conversations.map(conv =>
            conv.id === message.conversationId
              ? { ...conv, lastMessageStatus: status }
              : conv
          )
          set({ conversations: updatedConversations })
        }
      }
    } catch (error) {
      console.error("Error in Supabase operations for updating message status:", error)
    }
  },

  // Function to mark all messages in a conversation as read
  markMessagesAsRead: async (conversationId: number) => {
    const { messages } = get()
    const currentUser = useAuthStore.getState().user
    if (!currentUser) {
      console.error("Cannot mark messages as read: No authenticated user")
      return
    }

    const conversation = get().conversations.find(c => c.id === conversationId)
    if (!conversation || !conversation.supabaseId) return

    // Get all messages for this conversation that are not from the current user and not already read
    const messagesToUpdate = messages.filter(
      m => m.conversationId === conversationId &&
           m.senderId !== "me" &&
           m.status !== "read"
    )

    if (messagesToUpdate.length === 0) return

    // Update messages locally
    const updatedMessages = messages.map(msg =>
      msg.conversationId === conversationId && msg.senderId !== "me" && msg.status !== "read"
        ? {
            ...msg,
            status: "read" as const,
            readAt: new Date()
          }
        : msg
    )

    set({ messages: updatedMessages })

    try {
      // Get all messages for this conversation from Supabase
      const { data, error } = await supabase
        .from("chat_messages")
        .select("id")
        .eq("conversation_id", conversation.supabaseId)
        .neq("sender_id", currentUser.id) // Not from current user
        .is("read_at", null) // Not already read
        .order("timestamp", { ascending: true })

      if (error) {
        console.error("Error fetching messages for marking as read:", error)
        return
      }

      if (data.length === 0) return

      // Update all messages to read status
      const { error: updateError } = await supabase
        .from("chat_messages")
        .update({
          status: "read",
          read_at: new Date().toISOString()
        })
        .in("id", data.map(m => m.id))

      if (updateError) {
        console.error("Error marking messages as read in Supabase:", updateError)
      }
    } catch (error) {
      console.error("Error in Supabase operations for marking messages as read:", error)
    }
  },

  // Function to set typing status
  setTypingStatus: async (conversationId: number, isTyping: boolean) => {
    const { typingUsers, conversations, typingChannels, typingTimeouts } = get()
    const currentUser = useAuthStore.getState().user
    if (!currentUser) return

    // Find the conversation
    const conversation = conversations.find(c => c.id === conversationId)

    // Skip typing status for AI conversations
    if (!conversation || conversation.isAI) return

    const timeoutKey = `${currentUser.id}-${conversationId}`

    // Clear existing timeout for this user/conversation
    if (typingTimeouts[timeoutKey]) {
      clearTimeout(typingTimeouts[timeoutKey])
      const { [timeoutKey]: _, ...remainingTimeouts } = typingTimeouts
      set({ typingTimeouts: remainingTimeouts })
    }

    // Get current typing users for this conversation
    const currentTypingUsers = typingUsers[conversationId] || []

    // Update typing status locally first
    if (isTyping) {
      // Add current user to typing users if not already there
      if (!currentTypingUsers.includes(currentUser.id)) {
        const newTypingUsers = {
          ...typingUsers,
          [conversationId]: [...currentTypingUsers, currentUser.id]
        }
        set({ typingUsers: newTypingUsers })
      }

      // Set timeout to automatically remove typing status
      const timeoutId = setTimeout(() => {
        const { typingUsers: currentTypingUsers } = get()
        const updatedTypingUsers = (currentTypingUsers[conversationId] || [])
          .filter(id => id !== currentUser.id)
        
        set({
          typingUsers: {
            ...currentTypingUsers,
            [conversationId]: updatedTypingUsers
          }
        })
        
        // Clean up timeout reference
        const { typingTimeouts: currentTimeouts } = get()
        const { [timeoutKey]: _, ...remainingTimeouts } = currentTimeouts
        set({ typingTimeouts: remainingTimeouts })

        // Also broadcast the stop typing event
        const conv = get().conversations.find(c => c.id === conversationId)
        if (conv?.supabaseId) {
          const channel = get().typingChannels[conv.supabaseId]
          if (channel) {
            channel.send({
              type: 'broadcast',
              event: 'typing',
              payload: {
                user_id: currentUser.id,
                conversation_id: conv.supabaseId,
                is_typing: false
              }
            }).catch((error: any) => {
              console.error("Error broadcasting automatic typing stop:", error)
            })
          }
        }
      }, TYPING_INDICATOR_TIMEOUT)

      set({
        typingTimeouts: {
          ...get().typingTimeouts,
          [timeoutKey]: timeoutId
        }
      })
    } else {
      // Remove current user from typing users
      const updatedTypingUsers = currentTypingUsers.filter(id => id !== currentUser.id)
      set({
        typingUsers: {
          ...typingUsers,
          [conversationId]: updatedTypingUsers
        }
      })
    }

    // Skip realtime broadcast if no Supabase ID
    if (!conversation.supabaseId) return

    try {
      const channelKey = conversation.supabaseId
      let channel = typingChannels[channelKey]

      // If channel doesn't exist, try to create it as a fallback
      if (!channel) {
        console.warn(`[DEBUG] No typing channel found for conversation ${conversationId}. Creating fallback channel.`)
        
        // Create the channel as fallback
        channel = supabase.channel(`typing-${channelKey}`, {
          config: {
            broadcast: { self: false }, // Don't receive our own broadcasts
            presence: { key: currentUser.id }
          }
        })

        // Subscribe to typing events from other users
        channel.on('broadcast', { event: 'typing' }, (payload: any) => {
          console.log(`[DEBUG] [setTypingStatus-fallback] Received typing broadcast for conversation ${conversationId}:`, payload)
          const { user_id, conversation_id, is_typing } = payload.payload
          
          // Validate that this typing event is for the correct conversation
          if (conversation_id !== conversation.supabaseId) {
            console.warn(`[DEBUG] [setTypingStatus-fallback] Received typing event for conversation ${conversation_id} but expected ${conversation.supabaseId}, ignoring`)
            return
          }
          
          // Ignore our own typing events
          if (user_id === currentUser.id) {
            console.log(`[DEBUG] [setTypingStatus-fallback] Ignoring own typing event for user ${user_id}`)
            return
          }

          const { typingUsers: currentTypingUsers } = get()
          const conversationTypingUsers = currentTypingUsers[conversationId] || []

          if (is_typing) {
            // Add user to typing list if not already there
            if (!conversationTypingUsers.includes(user_id)) {
              console.log(`[DEBUG] [setTypingStatus-fallback] User ${user_id} started typing in conversation ${conversationId}`)
              set({
                typingUsers: {
                  ...currentTypingUsers,
                  [conversationId]: [...conversationTypingUsers, user_id]
                }
              })
            }
          } else {
            // Remove user from typing list
            console.log(`[DEBUG] [setTypingStatus-fallback] User ${user_id} stopped typing in conversation ${conversationId}`)
            set({
              typingUsers: {
                ...currentTypingUsers,
                [conversationId]: conversationTypingUsers.filter(id => id !== user_id)
              }
            })
          }
        })

        await channel.subscribe()
        
        // Store the channel
        set({
          typingChannels: {
            ...get().typingChannels,
            [channelKey]: channel
          }
        })
      }

      // Broadcast typing status to other users
      console.log(`[DEBUG] Broadcasting typing status: user=${currentUser.id}, conversation=${conversation.supabaseId}, isTyping=${isTyping}`)
      await channel.send({
        type: 'broadcast',
        event: 'typing',
        payload: {
          user_id: currentUser.id,
          conversation_id: conversation.supabaseId,
          is_typing: isTyping
        }
      })
      console.log(`[DEBUG] Typing status broadcast sent successfully`)

    } catch (error) {
      console.error("Error managing typing status:", error)
      // On broadcast failure, revert local typing status
      if (isTyping) {
        const updatedTypingUsers = (get().typingUsers[conversationId] || [])
          .filter(id => id !== currentUser.id)
        set({
          typingUsers: {
            ...get().typingUsers,
            [conversationId]: updatedTypingUsers
          }
        })
      }
      throw error // Re-throw so the UI can handle it
    }
  },

  // Function to get typing status - returns true only if someone OTHER than the current user is typing
  getTypingStatus: (conversationId: number) => {
    const { typingUsers } = get()
    const currentUser = useAuthStore.getState().user
    if (!currentUser) return false

    const typingUserIds = typingUsers[conversationId] || []

    // Return true only if there are typing users other than the current user
    return typingUserIds.some(id => id !== currentUser.id)
  },

  // Function to set up typing channels for all conversations to receive typing indicators
  setupTypingChannelsForAllConversations: async () => {
    const { conversations, typingChannels } = get()
    const currentUser = useAuthStore.getState().user
    if (!currentUser) return

    console.log('[DEBUG] Setting up typing channels for all conversations')

    for (const conversation of conversations) {
      // Skip AI conversations and conversations without Supabase IDs
      if (conversation.isAI || !conversation.supabaseId) continue

      const channelKey = conversation.supabaseId

      // Skip if channel already exists
      if (typingChannels[channelKey]) continue

      try {
        const channel = supabase.channel(`typing-${channelKey}`, {
          config: {
            broadcast: { self: false }, // Don't receive our own broadcasts
            presence: { key: currentUser.id }
          }
        })

        // Subscribe to typing events from other users
        channel.on('broadcast', { event: 'typing' }, (payload: any) => {
          console.log(`[DEBUG] Received typing broadcast for conversation ${conversation.id}:`, payload)
          const { user_id, conversation_id, is_typing } = payload.payload
          
          // Validate that this typing event is for the correct conversation
          if (conversation_id !== conversation.supabaseId) {
            console.warn(`[DEBUG] Received typing event for conversation ${conversation_id} but expected ${conversation.supabaseId}, ignoring`)
            return
          }
          
          // Ignore our own typing events
          if (user_id === currentUser.id) {
            console.log(`[DEBUG] Ignoring own typing event for user ${user_id}`)
            return
          }

          const { typingUsers: currentTypingUsers } = get()
          const conversationTypingUsers = currentTypingUsers[conversation.id] || []

          if (is_typing) {
            // Add user to typing list if not already there
            if (!conversationTypingUsers.includes(user_id)) {
              console.log(`[DEBUG] User ${user_id} started typing in conversation ${conversation.id}`)
              set({
                typingUsers: {
                  ...currentTypingUsers,
                  [conversation.id]: [...conversationTypingUsers, user_id]
                }
              })
            } else {
              console.log(`[DEBUG] User ${user_id} already in typing list for conversation ${conversation.id}`)
            }
          } else {
            // Remove user from typing list
            console.log(`[DEBUG] User ${user_id} stopped typing in conversation ${conversation.id}`)
            set({
              typingUsers: {
                ...currentTypingUsers,
                [conversation.id]: conversationTypingUsers.filter(id => id !== user_id)
              }
            })
          }
        })

        await channel.subscribe()
        
        // Store the channel
        set({
          typingChannels: {
            ...get().typingChannels,
            [channelKey]: channel
          }
        })

        console.log(`[DEBUG] Set up typing channel for conversation: ${conversation.name}`)
      } catch (error) {
        console.error(`Error setting up typing channel for conversation ${conversation.id}:`, error)
      }
    }
  },

  // Function to set up typing channels for specific new conversations
  setupTypingChannelsForNewConversations: async (newConversations: Conversation[]) => {
    const { typingChannels } = get()
    const currentUser = useAuthStore.getState().user
    if (!currentUser) return

    console.log(`[DEBUG] Setting up typing channels for ${newConversations.length} new conversations`)

    for (const conversation of newConversations) {
      // Skip AI conversations and conversations without Supabase IDs
      if (conversation.isAI || !conversation.supabaseId) continue

      const channelKey = conversation.supabaseId

      // Skip if channel already exists
      if (typingChannels[channelKey]) continue

      try {
        const channel = supabase.channel(`typing-${channelKey}`, {
          config: {
            broadcast: { self: false }, // Don't receive our own broadcasts
            presence: { key: currentUser.id }
          }
        })

        // Subscribe to typing events from other users
        channel.on('broadcast', { event: 'typing' }, (payload: any) => {
          console.log(`[DEBUG] [New] Received typing broadcast for conversation ${conversation.id}:`, payload)
          const { user_id, conversation_id, is_typing } = payload.payload
          
          // Validate that this typing event is for the correct conversation
          if (conversation_id !== conversation.supabaseId) {
            console.warn(`[DEBUG] [New] Received typing event for conversation ${conversation_id} but expected ${conversation.supabaseId}, ignoring`)
            return
          }
          
          // Ignore our own typing events
          if (user_id === currentUser.id) {
            console.log(`[DEBUG] [New] Ignoring own typing event for user ${user_id}`)
            return
          }

          const { typingUsers: currentTypingUsers } = get()
          const conversationTypingUsers = currentTypingUsers[conversation.id] || []

          if (is_typing) {
            // Add user to typing list if not already there
            if (!conversationTypingUsers.includes(user_id)) {
              console.log(`[DEBUG] [New] User ${user_id} started typing in conversation ${conversation.id}`)
              set({
                typingUsers: {
                  ...currentTypingUsers,
                  [conversation.id]: [...conversationTypingUsers, user_id]
                }
              })
            } else {
              console.log(`[DEBUG] [New] User ${user_id} already in typing list for conversation ${conversation.id}`)
            }
          } else {
            // Remove user from typing list
            console.log(`[DEBUG] [New] User ${user_id} stopped typing in conversation ${conversation.id}`)
            set({
              typingUsers: {
                ...currentTypingUsers,
                [conversation.id]: conversationTypingUsers.filter(id => id !== user_id)
              }
            })
          }
        })

        await channel.subscribe()
        
        // Store the channel
        set({
          typingChannels: {
            ...get().typingChannels,
            [channelKey]: channel
          }
        })

        console.log(`[DEBUG] Set up typing channel for new conversation: ${conversation.name}`)
      } catch (error) {
        console.error(`Error setting up typing channel for new conversation ${conversation.id}:`, error)
      }
    }
  },

  // Function to initialize typing channels for all existing conversations (for Chat page)
  initializeTypingChannels: async () => {
    const { conversations } = get()
    console.log('[DEBUG] Initializing typing channels for Chat page')
    
    if (conversations.length > 0) {
      await get().setupTypingChannelsForAllConversations()
    }
  },

  // Function to get the total unread count for the current user
  getTotalUnreadCount: () => {
    const { conversations } = get()
    const currentUser = useAuthStore.getState().user
    if (!currentUser) return 0

    // Calculate the total unread count across all conversations
    let totalUnread = 0
    for (const conv of conversations) {
      if (conv.unread) {
        totalUnread += conv.unread
      }
    }

    return totalUnread
  },

  refreshOnlineStatuses: async () => {
    const { conversations, users, onlineStatusThreshold } = get()

    // Get all unique user IDs from conversations and users
    const userIds = new Set<string>()
    
    conversations.forEach(conv => {
      if (conv.userId && !conv.isAI) {
        userIds.add(conv.userId)
      }
    })
    
    users.forEach(user => {
      userIds.add(user.id)
    })

    if (userIds.size === 0) return

    try {
      // Fetch latest last_seen data for all users
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, last_seen")
        .in("id", Array.from(userIds))

      if (error) {
        console.error("Error fetching user online statuses:", error)
        return
      }

      const lastSeenMap = new Map<string, string | null>()
      profiles?.forEach(profile => {
        lastSeenMap.set(profile.id, profile.last_seen)
      })

      // Update conversations with new online statuses
      const updatedConversations = conversations.map(conv => {
        if (conv.isAI || !conv.userId) return conv
        
        const lastSeen = lastSeenMap.get(conv.userId) || null
        return {
          ...conv,
          online: isUserOnline(lastSeen, onlineStatusThreshold),
          lastSeen: lastSeen
        }
      })

      // Update users with new online statuses
      const updatedUsers = users.map(user => {
        const lastSeen = lastSeenMap.get(user.id) || null
        return {
          ...user,
          online: isUserOnline(lastSeen, onlineStatusThreshold),
          lastSeen: lastSeen
        }
      })

      set({ 
        conversations: updatedConversations,
        users: updatedUsers
      })
    } catch (error) {
      console.error("Error in refreshOnlineStatuses:", error)
    }
  },

  formatLastSeen: (lastSeen: string | null): string => {
    if (!lastSeen) return "Never"
    
    const lastSeenDate = new Date(lastSeen)
    const now = new Date()
    const diffMs = now.getTime() - lastSeenDate.getTime()
    const diffMinutes = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffMinutes < 1) return "Just now"
    if (diffMinutes < 60) return `${diffMinutes}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    
    return lastSeenDate.toLocaleDateString()
  },

  // Cleanup functions
  cleanupTypingChannels: () => {
    const { typingChannels } = get()
    
    // Remove all typing channels
    Object.values(typingChannels).forEach(channel => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    })
    
    set({ typingChannels: {} })
  },

  cleanupAllTimeouts: () => {
    const { typingTimeouts } = get()
    
    // Clear all typing timeouts
    Object.values(typingTimeouts).forEach(timeout => {
      if (timeout) {
        clearTimeout(timeout)
      }
    })
    
    set({ typingTimeouts: {} })
  },
}))
