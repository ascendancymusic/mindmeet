import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Mock Supabase
const mockChannel = {
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn().mockResolvedValue({}),
  send: vi.fn().mockResolvedValue({}),
  unsubscribe: vi.fn().mockResolvedValue({})
}

const mockSupabase = {
  channel: vi.fn().mockReturnValue(mockChannel),
  removeChannel: vi.fn()
}

// Mock the chat store
const createMockChatStore = () => ({
  conversations: [
    {
      id: 1,
      name: 'Test User',
      lastMessage: 'Hello',
      timestamp: new Date(),
      online: true,
      isAI: false,
      supabaseId: 'conv-1'
    },
    {
      id: 2,
      name: 'Other User',
      lastMessage: 'Hi',
      timestamp: new Date(),
      online: true,
      isAI: false,
      supabaseId: 'conv-2'
    }
  ],
  typingUsers: {} as Record<number, string[]>,
  typingChannels: {} as Record<string, any>,
  typingTimeouts: {} as Record<string, NodeJS.Timeout>,
  activeConversationId: null
})

// Mock typing status functions
const createTypingFunctions = (store: any) => ({
  setTypingStatus: async (conversationId: number, isTyping: boolean) => {
    const conversation = store.conversations.find((c: any) => c.id === conversationId)
    if (!conversation || conversation.isAI) return

    const currentUser = { id: 'user-1' }
    const currentTypingUsers = store.typingUsers[conversationId] || []

    if (isTyping) {
      if (!currentTypingUsers.includes(currentUser.id)) {
        store.typingUsers[conversationId] = [...currentTypingUsers, currentUser.id]
      }
    } else {
      store.typingUsers[conversationId] = currentTypingUsers.filter((id: string) => id !== currentUser.id)
    }

    // Simulate broadcast
    const channelKey = conversation.supabaseId
    if (!store.typingChannels[channelKey]) {
      store.typingChannels[channelKey] = mockChannel
    }
    await mockChannel.send({
      type: 'broadcast',
      event: 'typing',
      payload: {
        user_id: currentUser.id,
        conversation_id: conversation.supabaseId,
        is_typing: isTyping
      }
    })
  },

  getTypingStatus: (conversationId: number) => {
    const typingUserIds = store.typingUsers[conversationId] || []
    return typingUserIds.some((id: string) => id !== 'user-1')
  },

  setupTypingChannelsForAllConversations: async () => {
    for (const conversation of store.conversations) {
      if (conversation.isAI || !conversation.supabaseId) continue
      
      const channelKey = conversation.supabaseId
      if (store.typingChannels[channelKey]) continue

      store.typingChannels[channelKey] = mockChannel
      await mockChannel.subscribe()
    }
  },

  setupTypingChannelsForNewConversations: async (newConversations: any[]) => {
    for (const conversation of newConversations) {
      if (conversation.isAI || !conversation.supabaseId) continue
      
      const channelKey = conversation.supabaseId
      if (store.typingChannels[channelKey]) continue

      store.typingChannels[channelKey] = mockChannel
      await mockChannel.subscribe()
    }
  }
})

describe('Typing Indicator System', () => {
  let store: any
  let typingFunctions: any

  beforeEach(() => {
    store = createMockChatStore()
    typingFunctions = createTypingFunctions(store)
    vi.clearAllMocks()
  })

  afterEach(() => {
    // Clean up any timeouts
    Object.values(store.typingTimeouts).forEach((timeout: any) => {
      if (timeout) clearTimeout(timeout)
    })
  })

  describe('Basic Typing Status', () => {
    it('should set typing status correctly', async () => {
      await typingFunctions.setTypingStatus(1, true)
      
      expect(store.typingUsers[1]).toContain('user-1')
      expect(mockChannel.send).toHaveBeenCalledWith({
        type: 'broadcast',
        event: 'typing',
        payload: {
          user_id: 'user-1',
          conversation_id: 'conv-1',
          is_typing: true
        }
      })
    })

    it('should clear typing status correctly', async () => {
      // First set typing status
      await typingFunctions.setTypingStatus(1, true)
      expect(store.typingUsers[1]).toContain('user-1')

      // Then clear it
      await typingFunctions.setTypingStatus(1, false)
      expect(store.typingUsers[1]).not.toContain('user-1')
    })

    it('should ignore typing status for AI conversations', async () => {
      // Add AI conversation
      store.conversations.push({
        id: 3,
        name: 'AI Bot',
        lastMessage: 'Hello',
        timestamp: new Date(),
        online: true,
        isAI: true,
        supabaseId: 'conv-3'
      })

      await typingFunctions.setTypingStatus(3, true)
      
      expect(store.typingUsers[3]).toBeUndefined()
      expect(mockChannel.send).not.toHaveBeenCalled()
    })
  })

  describe('Cross-Conversation Typing', () => {
    it('should maintain typing status across different conversations', async () => {
      // User starts typing in conversation 1
      await typingFunctions.setTypingStatus(1, true)
      
      // Simulate receiving typing event from another user in conversation 2
      store.typingUsers[2] = ['other-user']
      
      // Both conversations should have typing users
      expect(store.typingUsers[1]).toContain('user-1')
      expect(store.typingUsers[2]).toContain('other-user')
      
      // getTypingStatus should work for both
      expect(typingFunctions.getTypingStatus(2)).toBe(true) // other user typing
      expect(typingFunctions.getTypingStatus(1)).toBe(false) // only current user typing
    })

    it('should not show typing indicator for current user', () => {
      store.typingUsers[1] = ['user-1', 'other-user']
      
      // Should return true because other-user is typing
      expect(typingFunctions.getTypingStatus(1)).toBe(true)
      
      store.typingUsers[1] = ['user-1']
      
      // Should return false because only current user is typing
      expect(typingFunctions.getTypingStatus(1)).toBe(false)
    })
  })

  describe('Channel Management', () => {
    it('should setup channels for all conversations on initial load', async () => {
      await typingFunctions.setupTypingChannelsForAllConversations()
      
      expect(store.typingChannels['conv-1']).toBeDefined()
      expect(store.typingChannels['conv-2']).toBeDefined()
      expect(mockChannel.subscribe).toHaveBeenCalledTimes(2)
    })

    it('should setup channels only for new conversations', async () => {
      // Setup initial channels
      await typingFunctions.setupTypingChannelsForAllConversations()
      vi.clearAllMocks()
      
      // Add new conversation
      const newConversation = {
        id: 4,
        name: 'New User',
        lastMessage: 'Hey',
        timestamp: new Date(),
        online: true,
        isAI: false,
        supabaseId: 'conv-4'
      }
      
      await typingFunctions.setupTypingChannelsForNewConversations([newConversation])
      
      expect(store.typingChannels['conv-4']).toBeDefined()
      expect(mockChannel.subscribe).toHaveBeenCalledTimes(1) // Only for new conversation
    })

    it('should not create duplicate channels', async () => {
      await typingFunctions.setupTypingChannelsForAllConversations()
      const firstCallCount = mockChannel.subscribe.mock.calls.length
      
      // Try to setup again
      await typingFunctions.setupTypingChannelsForAllConversations()
      
      // Should not create additional channels
      expect(mockChannel.subscribe).toHaveBeenCalledTimes(firstCallCount)
    })
  })

  describe('Race Condition Prevention', () => {
    it('should handle rapid typing status changes', async () => {
      const promises = [
        typingFunctions.setTypingStatus(1, true),
        typingFunctions.setTypingStatus(1, false),
        typingFunctions.setTypingStatus(1, true),
        typingFunctions.setTypingStatus(1, false)
      ]
      
      await Promise.all(promises)
      
      // Final state should be not typing
      expect(store.typingUsers[1]).not.toContain('user-1')
    })

    it('should handle conversation switching with typing status', async () => {
      // Start typing in conversation 1
      await typingFunctions.setTypingStatus(1, true)
      expect(store.typingUsers[1]).toContain('user-1')
      
      // Switch to conversation 2 and start typing
      await typingFunctions.setTypingStatus(1, false) // Clear first conversation
      await typingFunctions.setTypingStatus(2, true)  // Start typing in second
      
      expect(store.typingUsers[1]).not.toContain('user-1')
      expect(store.typingUsers[2]).toContain('user-1')
    })
  })

  describe('Error Handling', () => {
    it('should handle missing conversation gracefully', async () => {
      await expect(typingFunctions.setTypingStatus(999, true)).resolves.not.toThrow()
      expect(store.typingUsers[999]).toBeUndefined()
    })

    it('should handle broadcast failures gracefully', async () => {
      mockChannel.send.mockRejectedValueOnce(new Error('Network error'))
      
      await expect(typingFunctions.setTypingStatus(1, true)).resolves.not.toThrow()
      // Local state should still be updated even if broadcast fails
      expect(store.typingUsers[1]).toContain('user-1')
    })
  })
})

describe('React Component Typing Integration', () => {
  let store: any
  let typingFunctions: any
  let isTypingRef: { current: boolean }

  beforeEach(() => {
    store = createMockChatStore()
    typingFunctions = createTypingFunctions(store)
    isTypingRef = { current: false }
    vi.clearAllMocks()
  })

  const simulateTypingEffect = (message: string, activeConversationId: number | null) => {
    if (!activeConversationId) return

    const hasText = message.trim().length > 0
    
    // Only update if typing status actually changed
    if (isTypingRef.current === hasText) return
    
    // Simulate debounced update
    setTimeout(() => {
      if (isTypingRef.current !== hasText) {
        isTypingRef.current = hasText
        typingFunctions.setTypingStatus(activeConversationId, hasText)
      }
    }, 150)
  }

  it('should sync isTypingRef with typing status', (done) => {
    store.activeConversationId = 1
    
    simulateTypingEffect('Hello', 1)
    
    setTimeout(() => {
      expect(isTypingRef.current).toBe(true)
      expect(store.typingUsers[1]).toContain('user-1')
      
      simulateTypingEffect('', 1) // Clear message
      
      setTimeout(() => {
        expect(isTypingRef.current).toBe(false)
        expect(store.typingUsers[1]).not.toContain('user-1')
        done()
      }, 200)
    }, 200)
  })

  it('should handle rapid message changes', (done) => {
    store.activeConversationId = 1
    
    simulateTypingEffect('H', 1)
    simulateTypingEffect('He', 1)
    simulateTypingEffect('Hel', 1)
    simulateTypingEffect('Hell', 1)
    simulateTypingEffect('Hello', 1)
    
    setTimeout(() => {
      expect(isTypingRef.current).toBe(true)
      expect(store.typingUsers[1]).toContain('user-1')
      done()
    }, 200)
  })
})
