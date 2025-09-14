import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Node as ReactFlowNode, Edge } from "reactflow";

export interface Node extends ReactFlowNode {
  background?: string;
}

interface ClipboardState {
  clipboardNodes: Node[];
  clipboardEdges: Edge[];
  setClipboard: (nodes: Node[], edges: Edge[]) => void;
  clearClipboard: () => void;
  hasClipboard: () => boolean;
}

export const useClipboardStore = create<ClipboardState>()(
  persist(
    (set, get) => {
      // Timer reference
      let clearTimer: ReturnType<typeof setTimeout> | null = null;

      // Helper to start/reset the timer
      const startClearTimer = () => {
        if (clearTimer) clearTimeout(clearTimer);
        clearTimer = setTimeout(() => {
          set({ clipboardNodes: [], clipboardEdges: [] });
        }, 30 * 60 * 1000); // 30 minutes
      };

      return {
        clipboardNodes: [],
        clipboardEdges: [],
        setClipboard: (nodes: Node[], edges: Edge[]) => {
          set({ clipboardNodes: nodes, clipboardEdges: edges });
          startClearTimer();
        },
        clearClipboard: () => {
          set({ clipboardNodes: [], clipboardEdges: [] });
          if (clearTimer) clearTimeout(clearTimer);
        },
        hasClipboard: () => {
          const { clipboardNodes } = get();
          return clipboardNodes.length > 0;
        },
      };
    },
    {
      name: "mindmeet-clipboard", // unique name for localStorage key
      // Only persist the clipboard data, not functions
      partialize: (state) => ({
        clipboardNodes: state.clipboardNodes,
        clipboardEdges: state.clipboardEdges,
      }),
    }
  )
);