import { create } from "zustand"
import { persist } from "zustand/middleware"


export const AVAILABLE_AI_MODELS = [
  "qwen/qwen3-coder:free",
  "tngtech/deepseek-r1t2-chimera:free",
  "deepseek/deepseek-r1-0528:free",
  "deepseek/deepseek-chat-v3-0324:free"
];

interface AISettings {
  // Global defaults (used for new conversations)
  defaultMemoryLength: number;
  defaultCustomContext: string;
  defaultModel: string;

  // Per-conversation settings
  conversationSettings: Record<string, {
    memoryLength: number;
    customContext: string;
    model: string;
  }>;
}

interface AISettingsStore extends AISettings {
  // Actions
  setDefaultMemoryLength: (length: number) => void;
  setDefaultCustomContext: (context: string) => void;
  setDefaultModel: (model: string) => void;
  setConversationMemoryLength: (conversationId: string, length: number) => void;
  setConversationCustomContext: (conversationId: string, context: string) => void;
  setConversationModel: (conversationId: string, model: string) => void;
  getConversationSettings: (conversationId: string) => {
    memoryLength: number;
    customContext: string;
    model: string;
  };
}

export const useAISettingsStore = create<AISettingsStore>()(
  persist(
    (set, get) => ({
      // Default values
      defaultMemoryLength: 10,
      defaultCustomContext: "",
      defaultModel: AVAILABLE_AI_MODELS[1], // default to deepseek-r1t2-chimera
      conversationSettings: {},

      // Actions
      setDefaultMemoryLength: (length: number) => {
        set({ defaultMemoryLength: length });
      },

      setDefaultCustomContext: (context: string) => {
        set({ defaultCustomContext: context });
      },

      setDefaultModel: (model: string) => {
        set({ defaultModel: model });
      },

      setConversationMemoryLength: (conversationId: string, length: number) => {
        set((state) => ({
          conversationSettings: {
            ...state.conversationSettings,
            [conversationId]: {
              ...state.conversationSettings[conversationId] || { customContext: state.defaultCustomContext, model: state.defaultModel },
              memoryLength: length
            }
          }
        }));
      },

      setConversationCustomContext: (conversationId: string, context: string) => {
        set((state) => ({
          conversationSettings: {
            ...state.conversationSettings,
            [conversationId]: {
              ...state.conversationSettings[conversationId] || { memoryLength: state.defaultMemoryLength, model: state.defaultModel },
              customContext: context
            }
          }
        }));
      },

      setConversationModel: (conversationId: string, model: string) => {
        set((state) => ({
          conversationSettings: {
            ...state.conversationSettings,
            [conversationId]: {
              ...state.conversationSettings[conversationId] || { memoryLength: state.defaultMemoryLength, customContext: state.defaultCustomContext },
              model
            }
          }
        }));
      },

      getConversationSettings: (conversationId: string) => {
        const state = get();
        const settings = state.conversationSettings[conversationId];
        // Return conversation-specific settings if they exist, otherwise return defaults
        return {
          memoryLength: settings?.memoryLength ?? state.defaultMemoryLength,
          customContext: settings?.customContext ?? state.defaultCustomContext,
          model: settings?.model ?? state.defaultModel
        };
      }
    }),
    {
      name: "mindmeetar-ai-settings"
    }
  )
);
