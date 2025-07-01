import { create } from "zustand"
import { persist } from "zustand/middleware"

interface AISettings {
  // Global defaults (used for new conversations)
  defaultMemoryLength: number
  defaultCustomContext: string
  
  // Per-conversation settings
  conversationSettings: Record<string, {
    memoryLength: number
    customContext: string
  }>
}

interface AISettingsStore extends AISettings {
  // Actions
  setDefaultMemoryLength: (length: number) => void
  setDefaultCustomContext: (context: string) => void
  setConversationMemoryLength: (conversationId: string, length: number) => void
  setConversationCustomContext: (conversationId: string, context: string) => void
  getConversationSettings: (conversationId: string) => { 
    memoryLength: number;
    customContext: string;
  }
}

export const useAISettingsStore = create<AISettingsStore>()(
  persist(
    (set, get) => ({
      // Default values
      defaultMemoryLength: 10,
      defaultCustomContext: "",
      conversationSettings: {},

      // Actions
      setDefaultMemoryLength: (length: number) => {
        set({ defaultMemoryLength: length })
      },
      
      setDefaultCustomContext: (context: string) => {
        set({ defaultCustomContext: context })
      },
      
      setConversationMemoryLength: (conversationId: string, length: number) => {
        set((state) => ({
          conversationSettings: {
            ...state.conversationSettings,
            [conversationId]: {
              ...state.conversationSettings[conversationId] || { customContext: state.defaultCustomContext },
              memoryLength: length
            }
          }
        }))
      },
      
      setConversationCustomContext: (conversationId: string, context: string) => {
        set((state) => ({
          conversationSettings: {
            ...state.conversationSettings,
            [conversationId]: {
              ...state.conversationSettings[conversationId] || { memoryLength: state.defaultMemoryLength },
              customContext: context
            }
          }
        }))
      },
      
      getConversationSettings: (conversationId: string) => {
        const state = get()
        const settings = state.conversationSettings[conversationId]
        
        // Return conversation-specific settings if they exist, otherwise return defaults
        return {
          memoryLength: settings?.memoryLength ?? state.defaultMemoryLength,
          customContext: settings?.customContext ?? state.defaultCustomContext
        }
      }
    }),
    {
      name: "mindmeetar-ai-settings"
    }
  )
)
