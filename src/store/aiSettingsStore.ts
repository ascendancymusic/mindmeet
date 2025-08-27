import { create } from "zustand"
import { persist } from "zustand/middleware"


export const AVAILABLE_AI_MODELS = [
  "@github/gpt-4o",
  "@github/DeepSeek-R1",
  "@github/DeepSeek-V3-0324",
  "@github/gpt-4.1",
  "@google/gemini-2.5-flash"
  
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

// MIGRATION: On store load, fix any invalid model values in persisted state
const fixModels = (state: any) => {
  const validModel = AVAILABLE_AI_MODELS[0];
  let changed = false;
  // Fix global defaultModel
  if (!AVAILABLE_AI_MODELS.includes(state.defaultModel)) {
    state.defaultModel = validModel;
    changed = true;
  }
  // Fix per-conversation models
  if (state.conversationSettings) {
    for (const key in state.conversationSettings) {
      if (!AVAILABLE_AI_MODELS.includes(state.conversationSettings[key].model)) {
        state.conversationSettings[key].model = validModel;
        changed = true;
      }
    }
  }
  return changed ? { ...state } : state;
};

export const useAISettingsStore = create<AISettingsStore>()(
  persist(
    (set, get) => ({
  // Default values
  defaultMemoryLength: 10,
  defaultCustomContext: "",
  defaultModel: AVAILABLE_AI_MODELS[4], // default to gemini 2.5 flash
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
      name: "mindmeetar-ai-settings",
      version: 2,
      migrate: async (persistedState: any) => fixModels(persistedState)
    }
  )
);
