import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Network, Bold, Copy, Check, X } from 'lucide-react';
import { Node as FlowNode, Edge } from 'reactflow';
import { autoLayoutNode } from '../utils/autoLayout';

interface NodeContextMenuProps {
  isVisible: boolean;
  onClose: () => void;
  nodeId: string;
  nodes: FlowNode[];
  edges: Edge[];
  onAutoLayout: (nodeId: string, originalNodes: FlowNode[], updatedNodes: FlowNode[]) => void;
  updateNodeData: (nodeId: string, updateFn: (node: FlowNode) => Partial<FlowNode>, historyData: any) => void;
  onCopyNode?: (nodeId: string) => void; // new optional prop to trigger external copy logic
}

// Store original colors temporarily in memory (not saved to JSON)
const originalColors = new Map<string, string>();

export const NodeContextMenu: React.FC<NodeContextMenuProps> = ({
  isVisible,
  onClose,
  nodeId,
  nodes,
  edges,
  onAutoLayout,
  updateNodeData,
  onCopyNode
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [openCounter, setOpenCounter] = useState(0); // force remount to avoid flash from old position
  const lastNodeIdRef = useRef<string | null>(null);
  const frameRef = useRef<number | null>(null);

  // Helper to compute current on-screen coordinates for the node (right side of node)
  const computeNodeScreenPosition = () => {
    if (!nodeId) return null;
    const nodeElement = document.querySelector(`[data-id="${nodeId}"]`);
    if (!nodeElement) return null;
    const rect = (nodeElement as HTMLElement).getBoundingClientRect();
    return { x: rect.right + 6, y: rect.top };
  };

  // Sync initial position BEFORE paint to prevent jump/flicker when opening on a new node
  useLayoutEffect(() => {
    if (!isVisible || !nodeId) return;
    const isNewNode = lastNodeIdRef.current !== nodeId;
    if (isNewNode) {
      setOpenCounter(c => c + 1); // force new DOM node for fresh position
      lastNodeIdRef.current = nodeId;
    }
    const pos = computeNodeScreenPosition();
    if (pos) {
      setPosition(pos);
    } else {
      // If not yet in DOM (rare), retry next frame
      requestAnimationFrame(() => {
        const retry = computeNodeScreenPosition();
        if (retry) setPosition(retry);
      });
    }
  }, [isVisible, nodeId]);

  // Observe viewport transforms (pan/zoom) and node size changes; throttle with rAF
  useEffect(() => {
    if (!isVisible || !nodeId) return;

    const updatePosition = () => {
      const pos = computeNodeScreenPosition();
      if (pos) setPosition(pos);
    };

    const scheduleUpdate = () => {
      if (frameRef.current != null) return;
      frameRef.current = requestAnimationFrame(() => {
        frameRef.current = null;
        updatePosition();
      });
    };

    // MutationObserver on the viewport element for transform changes
    const viewportEl = document.querySelector('.react-flow__viewport');
    let viewportObserver: MutationObserver | null = null;
    if (viewportEl) {
      viewportObserver = new MutationObserver(scheduleUpdate);
      viewportObserver.observe(viewportEl, { attributes: true, attributeFilter: ['style'] });
    }

    // ResizeObserver on the node element (size could change w/ content)
    const nodeElement = document.querySelector(`[data-id="${nodeId}"]`);
    let resizeObserver: ResizeObserver | null = null;
    if (nodeElement) {
      resizeObserver = new ResizeObserver(scheduleUpdate);
      resizeObserver.observe(nodeElement);
    }

    // Wheel & window resize
    viewportEl?.addEventListener('wheel', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate);

    return () => {
      viewportObserver?.disconnect();
      resizeObserver?.disconnect();
      viewportEl?.removeEventListener('wheel', scheduleUpdate);
      window.removeEventListener('resize', scheduleUpdate);
      if (frameRef.current != null) cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    };
  }, [isVisible, nodeId]);

  const handleBold = () => {
    const currentNode = nodes.find(node => node.id === nodeId);
    if (!currentNode) return;

    const currentLabel = currentNode.data?.label || '';

    // Check if the text is already bold (wrapped in **)
    const isBold = currentLabel.startsWith('**') && currentLabel.endsWith('**');

    let newLabel: string;
    if (isBold) {
      // Remove bold formatting
      newLabel = currentLabel.slice(2, -2); // Remove ** from start and end
    } else {
      // Add bold formatting
      newLabel = `**${currentLabel}**`;
    }

    // Use updateNodeData for proper history and collaboration integration
    updateNodeData(
      nodeId,
      (node) => ({
        data: {
          ...node.data,
          label: newLabel
        }
      }),
      {
        label: newLabel,
        oldLabel: currentLabel
      }
    );

    onClose();
  };

  const handleCopy = () => {
    if (onCopyNode) {
      onCopyNode(nodeId);
    } else {
      console.log('Copy node (no handler provided):', nodeId);
    }
    onClose();
  };

  const handleMarkAsDone = () => {
    const currentNode = nodes.find(node => node.id === nodeId);
    if (!currentNode) return;

    const currentLabel = currentNode.data?.label || '';
    const currentBackground = (currentNode as any).background || currentNode.style?.background || '#000000';

    // Check if currently marked as done by looking at the text formatting
    const isCurrentlyDone = currentLabel.startsWith('--') && currentLabel.endsWith('--');

    let newLabel: string;
    let newBackground: string;

    if (isCurrentlyDone) {
      // Mark as undone - remove strikethrough and restore original background
      newLabel = currentLabel.slice(2, -2); // Remove -- from start and end

      // Get the stored original color, or fallback to parent color, or black
      const storedOriginalColor = originalColors.get(nodeId);

      if (storedOriginalColor) {
        newBackground = storedOriginalColor;
        console.log('Marking as undone, using stored color:', newBackground);
      } else {
        // No stored color, try to use parent's color
        const parentEdge = edges.find(edge => edge.target === nodeId);
        if (parentEdge) {
          const parentNode = nodes.find(node => node.id === parentEdge.source);
          if (parentNode) {
            newBackground = (parentNode as any).background || parentNode.style?.background || '#000000';
            console.log('Marking as undone, using parent color:', newBackground);
          } else {
            newBackground = '#000000';
            console.log('Marking as undone, parent not found, using black');
          }
        } else {
          newBackground = '#000000';
          console.log('Marking as undone, no parent, using black');
        }
      }

      // Remove the stored color since we're marking as undone
      originalColors.delete(nodeId);
    } else {
      // Mark as done - add strikethrough and red background
      // First, store the current background color before changing it
      originalColors.set(nodeId, currentBackground);

      newLabel = `--${currentLabel}--`;
      newBackground = '#ff0000';

      console.log('Marking as done, stored original color:', currentBackground);
    }

    // Use updateNodeData with complete node update including background
    updateNodeData(
      nodeId,
      (node) => ({
        ...node,
        data: {
          ...node.data,
          label: newLabel
        },
        background: newBackground,
        style: {
          ...node.style,
          background: newBackground
        }
      }),
      {
        nodeId,
        label: newLabel,
        oldLabel: currentLabel,
        color: newBackground,
        oldColor: currentBackground
      }
    );

    onClose();
  };

  const handleAutoLayout = () => {
    const parentNode = nodes.find(node => node.id === nodeId);
    if (!parentNode) return;

    try {
      // Store original nodes for history
      const originalNodes = [...nodes];
      
      // Perform auto-layout using the utility
      const result = autoLayoutNode(nodes, edges, nodeId, {
        nodeSpacing: 20,
        subtreeSpacing: 60,
        levelSpacing: 120,
        childrenPerRow: 3,
        minRowSpacing: 60
      });

      // Call the callback with original and updated nodes
      onAutoLayout(nodeId, originalNodes, result.updatedNodes);
    } catch (error) {
      console.error('Auto-layout failed:', error);
    }
    
    onClose();
  };

  // (Removed old after-open positioning effect; replaced with layout & observer logic above)

  // Close menu when clicking outside or on ReactFlow
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as HTMLElement)) {
        onClose();
      }
    };

    const handleReactFlowClick = (event: MouseEvent) => {
      const target = event.target as Element;
      if (target.closest('.react-flow') || target.classList.contains('react-flow__pane')) {
        onClose();
      }
    };

    if (isVisible) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('click', handleReactFlowClick);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('click', handleReactFlowClick);
      };
    }
  }, [isVisible, onClose]);

  // Close menu on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isVisible) {
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [isVisible, onClose]);



  if (!isVisible) return null;

  // Get the current node to check its type
  const currentNode = nodes.find(node => node.id === nodeId);
  const isTextNode = currentNode?.type === 'default' || !currentNode?.type;
  const isTextNoBgNode = currentNode?.type === 'text-no-bg';
  const isLinkNode = currentNode?.type === 'link';
  const isYouTubeVideoNode = currentNode?.type === 'youtube-video';
  const isImageNode = currentNode?.type === 'image';
  const isMindmapNode = currentNode?.type === 'mindmap';
  const isSpotifyNode = currentNode?.type === 'spotify';
  const isSoundCloudNode = currentNode?.type === 'soundcloud';
  const isAudioNode = currentNode?.type === 'audio';
  const isPlaylistNode = currentNode?.type === 'playlist';
  const isInstagramNode = currentNode?.type === 'instagram';
  const isTwitterNode = currentNode?.type === 'twitter';
  const isFacebookNode = currentNode?.type === 'facebook';
  const isYouTubeNode = currentNode?.type === 'youtube';
  const isTikTokNode = currentNode?.type === 'tiktok';
  const isMindMeetNode = currentNode?.type === 'mindmeet';
  const isRootNode = nodeId === "1";

  // Check if node has children
  const nodeHasChildren = edges.some(edge => edge.source === nodeId);

  // Define which options to show based on node type
  const showBoldOption = isTextNoBgNode ? false : (isTextNode && !isRootNode);
  const showCopyOption = isTextNode || isTextNoBgNode || isLinkNode || isYouTubeVideoNode || isImageNode || isMindmapNode || isSpotifyNode || isSoundCloudNode || isAudioNode || isPlaylistNode || isInstagramNode || isTwitterNode || isFacebookNode || isYouTubeNode || isTikTokNode || isMindMeetNode; // Show copy for ALL supported node types
  const showMarkAsDoneOption = isTextNoBgNode ? false : isTextNode; // Hide for TextNoBgNode
  const showAutoLayoutOption = !isTextNoBgNode && nodeHasChildren; // Hide autolayout for TextNoBgNode or nodes without children

  // Check if text is currently bold
  const currentLabel = currentNode?.data?.label || '';
  const isBold = currentLabel.startsWith('**') && currentLabel.endsWith('**');

  // Check if node is marked as done by looking at the text formatting
  const isDone = currentLabel.startsWith('--') && currentLabel.endsWith('--');

  // Use portal to render at document level but position relative to node
  return createPortal(
    <div
      key={openCounter}
      ref={menuRef}
      className="fixed z-[1000]"
      style={{
        left: position.x,
        top: position.y,
      }}
    >
      <div 
        className="bg-gradient-to-br from-slate-800/95 via-slate-900/95 to-slate-800/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
        style={{
          minWidth: '180px',
          animation: 'fadeInScale 0.15s ease-out',
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-white/5">
          <div className="text-xs font-semibold text-slate-300 tracking-wide">
            Node Actions
          </div>
        </div>

        {/* Content */}
        <div className="p-1.5 space-y-0.5">
          {showAutoLayoutOption && (
            <button
              onClick={handleAutoLayout}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-all duration-150 group hover:bg-white/10 border border-transparent hover:border-white/10"
            >
              <div className="flex items-center justify-center w-7 h-7 rounded-lg transition-all duration-150 bg-white/5 text-slate-400 group-hover:bg-white/10 group-hover:text-white">
                <Network className="w-4 h-4" />
              </div>
              <span className="text-sm font-medium transition-colors text-slate-300 group-hover:text-white">
                Autolayout
              </span>
            </button>
          )}

          {showBoldOption && (
            <button
              onClick={handleBold}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-all duration-150 group hover:bg-white/10 border border-transparent hover:border-white/10"
            >
              <div className="flex items-center justify-center w-7 h-7 rounded-lg transition-all duration-150 bg-white/5 text-slate-400 group-hover:bg-white/10 group-hover:text-white">
                <Bold className="w-4 h-4" />
              </div>
              <span className="text-sm font-medium transition-colors text-slate-300 group-hover:text-white">
                {isBold ? 'Unbold' : 'Bold'}
              </span>
            </button>
          )}

          {showCopyOption && (
            <button
              onClick={handleCopy}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-all duration-150 group hover:bg-white/10 border border-transparent hover:border-white/10"
            >
              <div className="flex items-center justify-center w-7 h-7 rounded-lg transition-all duration-150 bg-white/5 text-slate-400 group-hover:bg-white/10 group-hover:text-white">
                <Copy className="w-4 h-4" />
              </div>
              <span className="text-sm font-medium transition-colors text-slate-300 group-hover:text-white">
                Copy
              </span>
            </button>
          )}

          {showMarkAsDoneOption && (
            <button
              onClick={handleMarkAsDone}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-all duration-150 group hover:bg-white/10 border border-transparent hover:border-white/10"
            >
              <div className="flex items-center justify-center w-7 h-7 rounded-lg transition-all duration-150 bg-white/5 text-slate-400 group-hover:bg-white/10 group-hover:text-white">
                {isDone ? (
                  <X className="w-4 h-4" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
              </div>
              <span className="text-sm font-medium transition-colors text-slate-300 group-hover:text-white">
                {isDone ? 'Mark as undone' : 'Mark as done'}
              </span>
            </button>
          )}
        </div>
      </div>
      <style>{`
        @keyframes fadeInScale {
          from { opacity: 0; transform: scale(0.95) translateY(-4px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>,
    document.body
  );
};
