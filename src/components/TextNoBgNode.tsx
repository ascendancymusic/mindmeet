import React, { useRef, useEffect, useState, useLayoutEffect, useMemo } from 'react';
import { NodeProps, NodeResizeControl, useReactFlow } from 'reactflow';
import CollapseChevron from './CollapseChevron';
import { getNodeWidth, getNodeHeight } from '../utils/nodeUtils';
import { calculateTextNodeMinHeight } from '../utils/textNodeUtils';

const ResizeIcon = () => (
    <svg width="8" height="8" viewBox="0 0 8 8" className="text-slate-400 hover:text-slate-300 transition-colors">
        <path
            d="M1 1L1 4M1 1L4 1M1 1L7 7M7 7L4 7M7 7L7 4"
            stroke="currentColor"
            strokeWidth="1"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);

// TextNoBgNode component - Simple comment-style text without connections
export const TextNoBgNode: React.FC<NodeProps & { onContextMenu?: (event: React.MouseEvent, nodeId: string) => void }> = ({
    id,
    data,
    selected,
    onContextMenu,
}) => {
    const reactFlowInstance = useReactFlow();
    const initialSizeRef = useRef<{ width: number; height: number } | null>(null);
    const rootRef = useRef<HTMLDivElement>(null);
    const [containerSize, setContainerSize] = useState<{ width: number; height: number }>(() => ({
        width: 240,
        height: 80,
    }));

    // Extract collapse data
    const hasChildren = data?.hasChildren || false;
    const isCollapsed = data?.isCollapsed || false;
    const onToggleCollapse = data?.onToggleCollapse;

    // Keep overlay minimal; do not alter layout or border externally
    useEffect(() => {
        const wrapper = rootRef.current?.closest('.react-flow__node') as HTMLElement | null;
        if (wrapper) {
            wrapper.classList.add('text-no-bg-node', 'no-node-overlay');
        }
        return () => {
            if (wrapper) {
                wrapper.classList.remove('text-no-bg-node', 'no-node-overlay');
            }
        };
    }, [id]);

    const label = data?.label;
    const textContent = typeof label === 'string' ? label : '';
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(textContent);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const autoResizeStartSizeRef = useRef<{ width: number; height: number } | null>(null);

    useEffect(() => {
        setEditValue(textContent);
    }, [textContent]);

    useEffect(() => {
        if (isEditing && textareaRef.current) {
            const ta = textareaRef.current;
            ta.focus();
            const len = ta.value.length;
            ta.setSelectionRange(len, len);
            // Record starting size for history
            autoResizeStartSizeRef.current = { ...containerSize };
            // Do not change height on edit start; keep exactly current node height
            ta.style.height = '100%';
        }
        if (!isEditing) {
            // On edit end, if size changed, dispatch one resize event for history
            const start = autoResizeStartSizeRef.current;
            if (start && (start.height !== containerSize.height || start.width !== containerSize.width)) {
                const customEvent = new CustomEvent('text-node-resized', {
                    detail: {
                        nodeId: id,
                        previousWidth: start.width,
                        previousHeight: start.height,
                        width: containerSize.width,
                        height: containerSize.height,
                    },
                    bubbles: true,
                });
                document.dispatchEvent(customEvent);
            }
            autoResizeStartSizeRef.current = null;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isEditing]);

    // Auto-expand height live while typing; shrink when lines are removed
    useEffect(() => {
        if (!isEditing || !textareaRef.current) return;
        const ta = textareaRef.current;
        const prevHeight = ta.style.height;
        ta.style.height = 'auto';
        const measured = Math.max(40, ta.scrollHeight);
        const newHeight = Math.max(containerSize.height, measured);
        if (newHeight !== containerSize.height) {
            setContainerSize((prev) => ({ ...prev, height: newHeight }));
        }
        // Reset height to fill container after measurement
        ta.style.height = prevHeight || '100%';
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editValue]);

    // Fit height to text lines in display mode when text or width changes
    useLayoutEffect(() => {
        if (isEditing) return;
        const minHStr = calculateTextNodeMinHeight(textContent || '', containerSize.width);
        const measured = Math.max(40, parseInt(minHStr, 10) || 40);
        const newHeight = Math.max(containerSize.height, measured);
        if (newHeight !== containerSize.height) {
            setContainerSize((prev) => ({ ...prev, height: newHeight }));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [textContent, containerSize.width, isEditing]);

    // Initialize/sync container size from React Flow node before paint
    useLayoutEffect(() => {
        const node = reactFlowInstance.getNode(id);
        if (node) {
            const width = getNodeWidth(node, 120);
            const height = getNodeHeight(node, 40);
            const w = typeof width === 'string' ? parseFloat(width) : width;
            const h = typeof height === 'string' ? parseFloat(height) : height;
            setContainerSize((prev) => (prev.width !== w || prev.height !== h ? { width: w, height: h } : prev));
        } else {
            setContainerSize((prev) => prev);
        }
    }, [id, reactFlowInstance]);

    // Listen for external resize events to keep in sync
    useEffect(() => {
        const handler = (event: Event) => {
            const e = event as CustomEvent<{
                nodeId: string;
                width: number;
                height: number;
                previousWidth: number;
                previousHeight: number;
            }>;
            if (e.detail?.nodeId === id) {
                setContainerSize({ width: e.detail.width, height: e.detail.height });
            }
        };
        document.addEventListener('text-node-resized', handler as EventListener);
        return () => document.removeEventListener('text-node-resized', handler as EventListener);
    }, [id]);

    const handleContextMenu = (event: React.MouseEvent) => {
        if (onContextMenu) onContextMenu(event, id);
    };

    // Always apply width/height so the node isn't autowidth on first render
    const containerStyle: React.CSSProperties = {
        minWidth: '120px',
        minHeight: '40px',
        width: containerSize.width,
        height: containerSize.height,
    };

    // Dynamic minimum height based on text lines and current width
    const dynamicMinHeight = useMemo(() => {
        const content = (isEditing ? editValue : textContent) || '';
        const minHStr = calculateTextNodeMinHeight(content, containerSize.width);
        const minH = parseInt(minHStr, 10);
        return Number.isFinite(minH) ? Math.max(40, minH) : 40;
    }, [isEditing, editValue, textContent, containerSize.width]);

    return (
        <div
            ref={rootRef}
            className={`relative overflow-visible no-node-overlay group ${selected
                ? 'border border-blue-400/50 rounded-md'
                : 'border border-transparent rounded-md hover:border-gray-500/30'}`}
            style={containerStyle}
            onContextMenu={handleContextMenu}
        >
            <CollapseChevron
                hasChildren={hasChildren}
                isCollapsed={isCollapsed}
                onToggleCollapse={onToggleCollapse}
            />

            <div className="w-full h-full relative" style={{ boxSizing: 'border-box', overflow: 'hidden' }}>
                {isEditing ? (
                    <textarea
                        ref={textareaRef}
                        value={editValue}
                        onChange={(e) => {
                            const newValue = e.target.value;
                            setEditValue(newValue);
                            const customEvent = new CustomEvent('text-node-label-changed', {
                                detail: { nodeId: id, newLabel: newValue },
                                bubbles: true,
                            });
                            document.dispatchEvent(customEvent);
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Escape') {
                                setEditValue(textContent);
                                setIsEditing(false);
                                return;
                            }
                            if (e.key === 'Enter') {
                                e.stopPropagation();
                            }
                        }}
                        onBlur={() => setIsEditing(false)}
                        onMouseDown={(e) => e.stopPropagation()}
                        onPointerDown={(e) => e.stopPropagation()}
                        className="w-full h-full bg-transparent text-white border-none outline-none resize-none nodrag"
                        style={{
                            minHeight: '40px',
                            height: '100%',
                            fontFamily: 'inherit',
                            fontSize: '14px',
                            lineHeight: '20px',
                            pointerEvents: 'auto',
                            textShadow: '0 0 3px rgba(0,0,0,0.8), 0 0 5px rgba(0,0,0,0.6), 1px 1px 0 rgba(0,0,0,1), -1px -1px 0 rgba(0,0,0,1), 1px -1px 0 rgba(0,0,0,1), -1px 1px 0 rgba(0,0,0,1)',
                            padding: '8px',
                            margin: '0',
                            wordBreak: 'break-word',
                            overflowWrap: 'anywhere',
                            whiteSpace: 'pre-wrap',
                            width: '100%',
                            maxWidth: '100%',
                            boxSizing: 'border-box',
                            overflow: 'hidden',
                        }}
                        placeholder="Add comment..."
                    />
                ) : (
                    <div
                        className="w-full h-full whitespace-pre-wrap text-white cursor-text"
                        onClick={() => setIsEditing(true)}
                        style={{
                            width: '100%',
                            height: '100%',
                            maxWidth: '100%',
                            boxSizing: 'border-box',
                            fontSize: '14px',
                            lineHeight: '20px',
                            wordBreak: 'break-word',
                            overflowWrap: 'anywhere',
                            padding: '8px',
                            textShadow: '0 0 3px rgba(0,0,0,0.8), 0 0 5px rgba(0,0,0,0.6), 1px 1px 0 rgba(0,0,0,1), -1px -1px 0 rgba(0,0,0,1), 1px -1px 0 rgba(0,0,0,1), -1px 1px 0 rgba(0,0,0,1)',
                            overflow: 'hidden',
                        }}
                    >
                        {React.isValidElement(label) ? (
                            label
                        ) : !textContent || textContent === '' ? (
                            <span className="text-gray-300">Add comment...</span>
                        ) : (
                            // Render plain text to ensure identical line spacing with textarea
                            <span>{textContent}</span>
                        )}
                    </div>
                )}
            </div>

            {selected && (
                <NodeResizeControl
                    nodeId={id}
                    minWidth={120}
                    minHeight={dynamicMinHeight}
                    maxWidth={600}
                    maxHeight={1200}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '0',
                        margin: '0',
                        position: 'absolute',
                        right: 0,
                        bottom: 0,
                        zIndex: 1000,
                        boxShadow: 'none',
                        pointerEvents: 'auto',
                    }}
                    keepAspectRatio={false}
                    onResizeStart={() => {
                        // Use current state as the most reliable starting size
                        initialSizeRef.current = { ...containerSize };
                    }}
                    onResize={(_event, params) => {
                        const nextWidth = Number.isFinite(params.width) ? params.width : containerSize.width;
                        const nextHeightRaw = Number.isFinite(params.height) ? params.height : containerSize.height;
                        const clampedHeight = Math.max(dynamicMinHeight, nextHeightRaw);
                        setContainerSize({ width: nextWidth, height: clampedHeight });
                    }}
                    onResizeEnd={(_event, params) => {
                        let currentInitialSize = initialSizeRef.current;
                        if (!currentInitialSize) {
                            // Fallback to measured or state
                            const node = reactFlowInstance.getNode(id);
                            const width = node ? getNodeWidth(node, containerSize.width) : containerSize.width;
                            const height = node ? getNodeHeight(node, containerSize.height) : containerSize.height;
                            const w = typeof width === 'string' ? parseFloat(width) : width;
                            const h = typeof height === 'string' ? parseFloat(height) : height;
                            currentInitialSize = {
                                width: Number.isFinite(w) ? w : containerSize.width,
                                height: Number.isFinite(h) ? h : containerSize.height,
                            };
                        }

                        if (currentInitialSize) {
                            // Build safe final sizes using params with fallbacks
                            const measuredNode = reactFlowInstance.getNode(id);
                            const measuredWRaw = measuredNode ? getNodeWidth(measuredNode, containerSize.width) : containerSize.width;
                            const measuredHRaw = measuredNode ? getNodeHeight(measuredNode, containerSize.height) : containerSize.height;
                            const measuredW = typeof measuredWRaw === 'string' ? parseFloat(measuredWRaw) : measuredWRaw;
                            const measuredH = typeof measuredHRaw === 'string' ? parseFloat(measuredHRaw) : measuredHRaw;

                            const finalWidth = Number.isFinite(params.width)
                                ? params.width
                                : Number.isFinite(measuredW)
                                    ? measuredW
                                    : containerSize.width;
                            const finalHeight = Math.max(
                                dynamicMinHeight,
                                Number.isFinite(params.height)
                                    ? params.height
                                    : Number.isFinite(measuredH)
                                        ? measuredH
                                        : containerSize.height
                            );
                            if (currentInitialSize.width !== finalWidth || currentInitialSize.height !== finalHeight) {
                                const customEvent = new CustomEvent('text-node-resized', {
                                    detail: {
                                        nodeId: id,
                                        previousWidth: currentInitialSize.width,
                                        previousHeight: currentInitialSize.height,
                                        width: finalWidth,
                                        height: finalHeight,
                                    },
                                    bubbles: true,
                                });
                                document.dispatchEvent(customEvent);
                            }
                            initialSizeRef.current = null;
                        }
                    }}
                >
                    <div className="p-2 rounded-bl-lg cursor-se-resize">
                        <ResizeIcon />
                    </div>
                </NodeResizeControl>
            )}
        </div>
    );
};

export default TextNoBgNode;