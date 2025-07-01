import { create } from "zustand"

interface PreviewMapVersion {
  nodes: any[]
  edges: any[]
  title: string
  aiResponseText?: string // Store the AI response text for this version
}

interface PreviewMap {
  id: string
  versions: PreviewMapVersion[]
  currentVersionIndex: number
  actionTaken?: "accepted" | "rejected" | null
}

interface PreviewMindMapState {
  previewMaps: Record<string, PreviewMap>
  setPreviewMap: (id: string, nodes: any[], edges: any[], title: string, aiResponseText?: string) => void
  addPreviewMapVersion: (id: string, nodes: any[], edges: any[], title: string, aiResponseText?: string) => void
  clearPreviewMap: (id: string) => void
  setPreviewMapAction: (id: string, action: "accepted" | "rejected") => void
  setCurrentVersionIndex: (id: string, index: number) => void
  getCurrentVersion: (id: string) => PreviewMapVersion | null
  getVersionCount: (id: string) => number
}

export const usePreviewMindMapStore = create<PreviewMindMapState>((set, get) => ({
  previewMaps: {},

  setPreviewMap: (id, nodes, edges, title, aiResponseText) =>
    set((state) => {
      // Check if we already have this map
      const existingMap = state.previewMaps[id]

      if (existingMap) {
        // If we already have this map, just add a new version
        return {
          previewMaps: {
            ...state.previewMaps,
            [id]: {
              ...existingMap,
              versions: [...existingMap.versions, { nodes, edges, title, aiResponseText }],
              currentVersionIndex: existingMap.versions.length,
              actionTaken: null,
            },
          },
        }
      } else {
        // Otherwise create a new map with this as the first version
        return {
          previewMaps: {
            ...state.previewMaps,
            [id]: {
              id,
              versions: [{ nodes, edges, title, aiResponseText }],
              currentVersionIndex: 0,
              actionTaken: null,
            },
          },
        }
      }
    }),

  addPreviewMapVersion: (id, nodes, edges, title, aiResponseText) =>
    set((state) => {
      if (!state.previewMaps[id]) return state

      const currentMap = state.previewMaps[id]
      // Add new version, keeping all existing versions
      const versions = [...currentMap.versions, { nodes, edges, title, aiResponseText }]

      // Ensure we don't exceed 3 versions
      const finalVersions = versions.length > 3 ? versions.slice(-3) : versions

      return {
        previewMaps: {
          ...state.previewMaps,
          [id]: {
            ...currentMap,
            versions: finalVersions,
            currentVersionIndex: finalVersions.length - 1, // Set to the newest version
            actionTaken: null, // Reset action when regenerating
          },
        },
      }
    }),

  clearPreviewMap: (id) =>
    set((state) => {
      // Only delete the specific map ID that was acted upon
      const newPreviewMaps = { ...state.previewMaps }
      delete newPreviewMaps[id]
      return { previewMaps: newPreviewMaps }
    }),

  setPreviewMapAction: (id, action) =>
    set((state) => {
      if (!state.previewMaps[id]) return state

      return {
        previewMaps: {
          ...state.previewMaps,
          [id]: {
            ...state.previewMaps[id],
            actionTaken: action,
          },
        },
      }
    }),

  setCurrentVersionIndex: (id, index) =>
    set((state) => {
      if (!state.previewMaps[id]) return state
      const currentMap = state.previewMaps[id]

      // Ensure index is within bounds
      if (index < 0 || index >= currentMap.versions.length) return state

      return {
        previewMaps: {
          ...state.previewMaps,
          [id]: {
            ...currentMap,
            currentVersionIndex: index,
          },
        },
      }
    }),

  getCurrentVersion: (id) => {
    const state = get()
    const map = state.previewMaps[id]
    if (!map || map.versions.length === 0) return null

    return map.versions[map.currentVersionIndex] || null
  },

  getVersionCount: (id) => {
    const state = get()
    const map = state.previewMaps[id]
    if (!map) return 0

    return map.versions.length
  },
}))

