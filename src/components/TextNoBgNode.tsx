import React, { useRef, useState, useEffect } from 'react';
import { NodeProps, NodeResizeControl, useReactFlow } from 'reactflow';
import CollapseChevron from './CollapseChevron';
import { getNodeWidth, getNodeHeight } from '../utils/nodeUtils';

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
    onContextMenu
}) => {
    const reactFlowInstance = useReactFlow();
    const initialSizeRef = useRef<{ width: number; height: number } | null>(null);
    const rootRef = useRef<HTMLDivElement>(null);

    // Extract collapse data
    const hasChildren = data?.hasChildren || false;
    const isCollapsed = data?.isCollapsed || false;
    const onToggleCollapse = data?.onToggleCollapse;

    // Ensure the outer React Flow node wrapper has the correct classes/styles to disable overlays globally
    useEffect(() => {
        const wrapper = rootRef.current?.closest('.react-flow__node') as HTMLElement | null;
        if (wrapper) {
            wrapper.classList.add('text-no-bg-node', 'no-node-overlay');
            wrapper.style.background = 'transparent';
            wrapper.style.border = 'none';
            wrapper.style.boxShadow = 'none';
        }

        return () => {
            if (wrapper) {
                wrapper.classList.remove('text-no-bg-node', 'no-node-overlay', 'text-no-bg-editing');
                wrapper.style.background = '';
                wrapper.style.border = '';
                wrapper.style.boxShadow = '';
            }
        };
    }, [id]);


    // Get the text content from data.label
    const textContent = typeof data?.label === 'string' ? data.label : '';

    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(textContent);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [containerSize, setContainerSize] = useState({ width: 160, height: 40 });
    const CONTENT_PADDING = 8; // px padding on each side

    // Update edit value when data.label changes
    useEffect(() => {
        setEditValue(textContent);
    }, [textContent]);

    // Recalculate height when width changes or text content changes
    useEffect(() => {
        if (textContent && containerSize.width > 0) {
            const newHeight = calculateTextNoBgHeight(textContent, containerSize.width);

            if (newHeight !== containerSize.height) {
                setContainerSize(prev => ({ ...prev, height: newHeight }));
            }
        }
    }, [textContent, containerSize.width]);

    // Custom height calculation for TextNoBgNode with correct font sizing
    const calculateTextNoBgHeight = (text: string, width: number): number => {
        if (!text || text.trim() === '') return 40;

        const tempDiv = document.createElement('div');
        tempDiv.style.position = 'absolute';
        tempDiv.style.visibility = 'hidden';
    // Account for inner padding on both sides
    const contentWidth = Math.max(0, width - CONTENT_PADDING * 2);
    tempDiv.style.width = `${contentWidth}px`;
        tempDiv.style.fontSize = '16px'; // Match actual TextNoBgNode font size
        tempDiv.style.lineHeight = '1.625'; // Match leading-relaxed
        tempDiv.style.fontFamily = 'inherit';
        tempDiv.style.wordWrap = 'break-word';
        tempDiv.style.whiteSpace = 'pre-wrap';
        tempDiv.innerHTML = text.replace(/\n/g, '<br>');

        document.body.appendChild(tempDiv);
        const textHeight = tempDiv.offsetHeight;
        document.body.removeChild(tempDiv);

    // Add vertical padding top+bottom
    return Math.max(40, textHeight + CONTENT_PADDING * 2);
    };

    // Update height in real-time while typing
    useEffect(() => {
        if (isEditing && editValue && containerSize.width > 0) {
            const newHeight = calculateTextNoBgHeight(editValue, containerSize.width);

            if (newHeight !== containerSize.height) {
                setContainerSize(prev => ({ ...prev, height: newHeight }));
            }
        }
    }, [editValue, containerSize.width, isEditing]);

    // Focus textarea when editing starts and auto-resize
    useEffect(() => {
        // Toggle an additional editing class while editing to leverage CSS that isolates layout
        const wrapper = rootRef.current?.closest('.react-flow__node') as HTMLElement | null;
        if (wrapper) {
            if (isEditing) wrapper.classList.add('text-no-bg-editing');
            else wrapper.classList.remove('text-no-bg-editing');
        }

        if (isEditing && textareaRef.current) {
            textareaRef.current.focus();
            // Place caret at end without selecting all text
            const len = textareaRef.current.value.length;
            textareaRef.current.setSelectionRange(len, len);

            // Auto-resize textarea to fit content
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.max(40, textareaRef.current.scrollHeight)}px`;
        }
    }, [id, isEditing]);

    // Start editing on single click of displayed text
    const handleStartEditing = () => {
        // Allow selection to occur; don't stop propagation here
        setIsEditing(true);
    };

    const handleSave = () => {
        // Calculate proper height using custom calculation
        const newHeight = calculateTextNoBgHeight(editValue, containerSize.width);

        // Update container size
        setContainerSize(prev => ({ ...prev, height: newHeight }));

        // No need to dispatch event here since we're already doing it on every character change
        setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            setEditValue(textContent); // Reset to current data.label value
            setIsEditing(false);
            return;
        }

        if (e.key === 'Enter') {
            // Let textarea insert a newline, but stop propagation so it doesn't affect React Flow
            e.stopPropagation();
            return; // don't preventDefault so newline is inserted
        }
    };

    const handleBlur = () => {
        handleSave();
    };

    // Close editing when node becomes deselected
    useEffect(() => {
        if (!selected && isEditing) {
            handleSave();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selected]);

    // Optional: start editing when requested externally (e.g., right after drop)
    useEffect(() => {
        const handleStartEditEvent = (event: Event) => {
            const e = event as CustomEvent<{ nodeId: string }>; 
            if (e.detail?.nodeId === id) {
                setIsEditing(true);
                // focus happens via the isEditing effect
            }
        };

        document.addEventListener('text-no-bg-start-edit', handleStartEditEvent as EventListener);
        return () => {
            document.removeEventListener('text-no-bg-start-edit', handleStartEditEvent as EventListener);
        };
    }, [id]);

    const handleContextMenu = (event: React.MouseEvent) => {
        if (onContextMenu) {
            onContextMenu(event, id);
        }
    };

    return (
        <div
            ref={rootRef}
            className={`relative overflow-visible no-node-overlay group ${selected
                ? 'border border-blue-400/50 rounded-md'
                : 'border border-transparent rounded-md hover:border-gray-500/30'
                }`}
            style={{
                minWidth: '120px',
                minHeight: '40px',
                width: `${containerSize.width}px`,
                height: `${containerSize.height}px`,
            }}
            onContextMenu={handleContextMenu}
        >
            {/* Collapse button overlay */}
            <CollapseChevron
                hasChildren={hasChildren}
                isCollapsed={isCollapsed}
                onToggleCollapse={onToggleCollapse}
            />

            {/* No handles - this is a comment node, not connectable */}

            {/* Simple text content */}
            <div className="w-full relative">
                {isEditing ? (
                    <textarea
                        ref={textareaRef}
                        value={editValue}
                        onChange={(e) => {
                            const newValue = e.target.value;
                            setEditValue(newValue);

                            // Dispatch event for every character change (like TextNode does)
                            const customEvent = new CustomEvent('text-node-label-changed', {
                                detail: {
                                    nodeId: id,
                                    newLabel: newValue
                                },
                                bubbles: true
                            });
                            document.dispatchEvent(customEvent);
                        }}
                        onKeyDown={handleKeyDown}
                        onBlur={handleBlur}
                        onMouseDown={(e) => e.stopPropagation()}
                        onPointerDown={(e) => e.stopPropagation()}
                        onInput={(e) => {
                            // Auto-resize textarea based on content like TextNode
                            const target = e.target as HTMLTextAreaElement;
                            target.style.height = 'auto';
                            target.style.height = `${Math.max(40, target.scrollHeight)}px`;
                        }}
                        className="w-full bg-transparent text-white border-none outline-none resize-none nodrag overflow-hidden"
                        style={{
                            minHeight: '40px',
                            height: 'auto',
                            fontFamily: 'inherit',
                            fontSize: '16px',
                            lineHeight: '1.625', // Match leading-relaxed
                            pointerEvents: 'auto',
                            textShadow: '0 0 3px rgba(0,0,0,0.8), 0 0 5px rgba(0,0,0,0.6), 1px 1px 0 rgba(0,0,0,1), -1px -1px 0 rgba(0,0,0,1), 1px -1px 0 rgba(0,0,0,1), -1px 1px 0 rgba(0,0,0,1)',
                            padding: `${CONTENT_PADDING}px`,
                            margin: '0',
                            wordWrap: 'break-word',
                            whiteSpace: 'pre-wrap',
                            width: '100%',
                            maxWidth: '100%',
                            boxSizing: 'border-box',
                        }}
                        placeholder="Add comment..."
                    />
        ) : (
                    <div
                        className="w-full break-words whitespace-pre-wrap leading-relaxed text-white cursor-text"
            onClick={handleStartEditing}
                        style={{
                            width: '100%',
                            maxWidth: '100%',
                            boxSizing: 'border-box',
                            wordWrap: 'break-word',
                            overflowWrap: 'break-word',
                            padding: `${CONTENT_PADDING}px`,
                        }}
                    >
                        {!textContent || textContent === '' ? (
                            <span className="text-gray-400" style={{ textShadow: '0 0 3px rgba(0,0,0,0.8), 0 0 5px rgba(0,0,0,0.6), 1px 1px 0 rgba(0,0,0,1), -1px -1px 0 rgba(0,0,0,1), 1px -1px 0 rgba(0,0,0,1), -1px 1px 0 rgba(0,0,0,1)' }}>Add comment...</span>
                        ) : (
                            <span className="text-white" style={{ textShadow: '0 0 3px rgba(0,0,0,0.8), 0 0 5px rgba(0,0,0,0.6), 1px 1px 0 rgba(0,0,0,1), -1px -1px 0 rgba(0,0,0,1), 1px -1px 0 rgba(0,0,0,1), -1px 1px 0 rgba(0,0,0,1)' }}>{textContent}</span>
                        )}
                    </div>
                )}
            </div>

            {/* NodeResizeControl for resizing functionality */}
            {selected && (
                <NodeResizeControl
                    nodeId={id}
                    minWidth={120}
                    minHeight={40}
                    maxWidth={600}
                    maxHeight={400}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '0',
                        margin: '0',
                        position: 'absolute',
                        right: 0,
                        bottom: 0,
                        zIndex: 10,
                        boxShadow: 'none',
                    }}
                    keepAspectRatio={false}
                    onResizeStart={() => {
                        const node = reactFlowInstance.getNode(id);
                        if (node) {
                            const width = getNodeWidth(node, 120);
                            const height = getNodeHeight(node, 40);
                            initialSizeRef.current = {
                                width: typeof width === 'string' ? parseFloat(width) : width,
                                height: typeof height === 'string' ? parseFloat(height) : height
                            };
                        }
                    }}
                    onResize={(_event, params) => {
                        // Update container size during resize for smooth visual feedback
                        setContainerSize({
                            width: params.width,
                            height: params.height
                        });
                    }}
                    onResizeEnd={(_event, params) => {
                        // Update container size when resize ends
                        setContainerSize({
                            width: params.width,
                            height: params.height
                        });

                        let currentInitialSize = initialSizeRef.current;
                        if (!currentInitialSize) {
                            const node = reactFlowInstance.getNode(id);
                            if (node) {
                                const width = getNodeWidth(node, 120);
                                const height = getNodeHeight(node, 40);
                                currentInitialSize = {
                                    width: typeof width === 'string' ? parseFloat(width) : width,
                                    height: typeof height === 'string' ? parseFloat(height) : height
                                };
                            }
                        }

                        if (currentInitialSize) {
                            if (currentInitialSize.width !== params.width || currentInitialSize.height !== params.height) {
                                const customEvent = new CustomEvent('text-node-resized', {
                                    detail: {
                                        nodeId: id,
                                        previousWidth: currentInitialSize.width,
                                        previousHeight: currentInitialSize.height,
                                        width: params.width,
                                        height: params.height
                                    },
                                    bubbles: true
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
            )
            }
        </div >
    );
};

export default TextNoBgNode;