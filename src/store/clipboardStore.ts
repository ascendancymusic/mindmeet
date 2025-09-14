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
    (set, get) => ({
      clipboardNodes: [],
      clipboardEdges: [],
      setClipboard: (nodes: Node[], edges: Edge[]) => {
        set({ clipboardNodes: nodes, clipboardEdges: edges });
      },
      clearClipboard: () => {
        set({ clipboardNodes: [], clipboardEdges: [] });
      },
      hasClipboard: () => {
        const { clipboardNodes } = get();
        return clipboardNodes.length > 0;
      },
    }),
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