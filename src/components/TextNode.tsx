import React, { useState, useRef } from 'react';
import { Type, Edit3, Bold, Italic, Code, Palette } from 'lucide-react';
import { Handle, Position, NodeProps, NodeResizeControl, useReactFlow } from 'reactflow';
import MarkdownRenderer from './MarkdownRenderer';
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



interface TextNodeProps {
  nodeId: string;
  label: string;
  onLabelChange: (nodeId: string, label: string) => void;
  isRootNode?: boolean;
}

const TextNode: React.FC<TextNodeProps> = ({ 
  nodeId, 
  label, 
  onLabelChange, 
  isRootNode = false 
}) => {
  const [showAdvancedEditor, setShowAdvancedEditor] = useState(false);

  const handleFormatText = (formatType: 'bold' | 'italic' | 'code') => {
    const textarea = document.querySelector(`textarea[data-node-id="${nodeId}"]`) as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    
    let newText: string;
    let selectionOffset: number;
    let selectionLength: number;

    switch (formatType) {
      case 'bold':
        newText = selectedText ? `**${selectedText}**` : '**bold**';
        selectionOffset = 2;
        selectionLength = selectedText ? selectedText.length : 4;
        break;
      case 'italic':
        newText = selectedText ? `*${selectedText}*` : '*italic*';
        selectionOffset = 1;
        selectionLength = selectedText ? selectedText.length : 6;
        break;
      case 'code':
        newText = selectedText ? `\`${selectedText}\`` : '`code`';
        selectionOffset = 1;
        selectionLength = selectedText ? selectedText.length : 4;
        break;
    }

    const newValue = textarea.value.substring(0, start) + newText + textarea.value.substring(end);
    onLabelChange(nodeId, newValue);
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + selectionOffset, start + selectionOffset + selectionLength);
    }, 0);
  };

  const handleColorChange = (color: { name: string; value: string }) => {
    const textarea = document.querySelector(`textarea[data-node-id="${nodeId}"]`) as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    const newText = selectedText 
      ? `<span style="color: ${color.value}">${selectedText}</span>` 
      : `<span style="color: ${color.value}">text</span>`;
    const newValue = textarea.value.substring(0, start) + newText + textarea.value.substring(end);
    
    onLabelChange(nodeId, newValue);
    
    setTimeout(() => {
      textarea.focus();
      const textStart = start + `<span style="color: ${color.value}">`.length;
      const textEnd = selectedText ? textStart + selectedText.length : textStart + 4;
      textarea.setSelectionRange(textStart, textEnd);
    }, 0);
  };

  const createColorPicker = (e: React.MouseEvent) => {
    const isOpen = document.querySelector('[data-color-picker="true"]');
    if (isOpen) {
      isOpen.remove();
      return;
    }

    const colorPicker = document.createElement('div');
    colorPicker.setAttribute('data-color-picker', 'true');
    colorPicker.className = 'absolute top-full left-0 mt-1 bg-slate-800 border border-slate-700 rounded-lg p-2 shadow-lg z-50 grid grid-cols-4 gap-1';
    colorPicker.style.minWidth = '120px';
    
    const colors = [
      { name: 'Red', value: '#ef4444', class: 'bg-red-500' },
      { name: 'Orange', value: '#f97316', class: 'bg-orange-500' },
      { name: 'Yellow', value: '#eab308', class: 'bg-yellow-500' },
      { name: 'Green', value: '#22c55e', class: 'bg-green-500' },
      { name: 'Blue', value: '#3b82f6', class: 'bg-blue-500' },
      { name: 'Purple', value: '#a855f7', class: 'bg-purple-500' },
      { name: 'Pink', value: '#ec4899', class: 'bg-pink-500' },
      { name: 'Black', value: '#000000', class: 'bg-black border-white' }
    ];
    
    colors.forEach(color => {
      const colorButton = document.createElement('button');
      colorButton.className = `w-6 h-6 rounded-md ${color.class} hover:scale-110 transition-transform border border-slate-600`;
      colorButton.title = color.name;
      colorButton.onclick = () => {
        handleColorChange(color);
        colorPicker.remove();
      };
      colorPicker.appendChild(colorButton);
    });
    
    // Add click outside listener
    setTimeout(() => {
      const clickOutside = (event: Event) => {
        if (!colorPicker.contains(event.target as HTMLElement)) {
          colorPicker.remove();
          document.removeEventListener('click', clickOutside);
        }
      };
      document.addEventListener('click', clickOutside);
    }, 0);
    
    // Append to the button's parent
    const button = e.currentTarget as HTMLElement;
    button.parentElement?.appendChild(colorPicker);
  };

  const getInputClassName = () => {
    const baseClass = "px-4 py-3 bg-slate-800/50 text-white border rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200";
    return isRootNode 
      ? `${baseClass} border-2 border-gradient-to-r from-blue-400 to-blue-600 shadow-lg shadow-blue-500/25 font-bold`
      : `${baseClass} border-slate-600/30`;
  };

  const getInputStyle = () => {
    return isRootNode ? {
      background: "linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(147, 51, 234, 0.1))",
      borderImage: "linear-gradient(90deg, #60a5fa, #3b82f6)",
      borderImageSlice: 1,
    } : {};
  };

  if (!showAdvancedEditor) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Type className="w-4 h-4 text-slate-400" />
            <span className="text-sm text-slate-400">Quick Edit</span>
          </div>
          <button
            onClick={() => setShowAdvancedEditor(true)}
            className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-700/30 rounded-lg transition-all duration-200"
            title="Advanced text editor"
          >
            <Edit3 className="w-4 h-4" />
          </button>
        </div>
        <input
          autoFocus
          data-node-id={nodeId}
          type="text"
          placeholder="Text..."
          value={label || ""}
          onChange={(e) => onLabelChange(nodeId, e.target.value)}
          className={getInputClassName()}
          style={getInputStyle()}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Edit3 className="w-4 h-4 text-blue-400" />
          <span className="text-sm text-blue-400">Advanced Editor</span>
        </div>
        <button
          onClick={() => setShowAdvancedEditor(false)}
          className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-700/30 rounded-lg transition-all duration-200"
          title="Simple editor"
        >
          <Type className="w-4 h-4" />
        </button>
      </div>
      
      {/* Formatting Toolbar */}
      <div className="flex items-center gap-1 p-2 bg-slate-800/30 rounded-lg border border-slate-700/30">
        <button
          onClick={() => handleFormatText('bold')}
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-md transition-all duration-200"
          title="Bold (**text**)"
        >
          <Bold className="w-4 h-4" />
        </button>
        <button
          onClick={() => handleFormatText('italic')}
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-md transition-all duration-200"
          title="Italic (*text*)"
        >
          <Italic className="w-4 h-4" />
        </button>
        <button
          onClick={() => handleFormatText('code')}
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-md transition-all duration-200"
          title="Code (`text`)"
        >
          <Code className="w-4 h-4" />
        </button>
        
        {/* Divider */}
        <div className="w-px h-6 bg-slate-600/50 mx-1"></div>
        
        {/* Text Color Button with Dropdown */}
        <div className="relative">
          <button
            onClick={createColorPicker}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-md transition-all duration-200"
            title="Text Color"
          >
            <Palette className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Large Text Area */}
      <textarea
        autoFocus
        data-node-id={nodeId}
        placeholder="Text..."
        value={label || ""}
        onChange={(e) => onLabelChange(nodeId, e.target.value)}
        className={`${getInputClassName()} resize-none`}
        style={getInputStyle()}
        rows={4}
      />
    </div>
  );
};

// DefaultTextNode component for ReactFlow canvas - shows resizable borders when selected
export const DefaultTextNode: React.FC<NodeProps & { onContextMenu?: (event: React.MouseEvent, nodeId: string) => void }> = ({
  id,
  data,
  selected,
  onContextMenu
}) => {
  const label = data?.label;
  const reactFlowInstance = useReactFlow();
  const initialSizeRef = useRef<{ width: number; height: number } | null>(null);

  const handleContextMenu = (event: React.MouseEvent) => {
    if (onContextMenu) {
      onContextMenu(event, id);
    }
  };

  return (
    <div
      className="relative overflow-visible no-node-overlay w-full h-full"
      onContextMenu={handleContextMenu}
    >
      {/* ReactFlow handles positioned at the actual node boundaries */}
      <Handle
        type="target"
        position={Position.Top}
        id={`${id}-target`}
        className="!top-[-12px] !bg-sky-400 !border-1 !border-gray-700 !w-2.5 !h-2.5"
        style={{ zIndex: 20 }}
      />

      {/* Node content that expands with text */}
      <div className="w-full relative">
        <div className="w-full break-words whitespace-pre-wrap px-2 py-0">
          {/* If label is a React element (JSX), render it directly */}
          {React.isValidElement(label) ? (
            label
          ) : (
            /* If label is a string or empty, handle it appropriately */
            !label || label === '' ? (
              <span className="text-gray-400">Text...</span>
            ) : (
              <MarkdownRenderer content={String(label)} />
            )
          )}
        </div>
      </div>

      {/* NodeResizeControl for actual resizing functionality */}
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
          }}
          keepAspectRatio={false} // Allow free resizing for text nodes
          onResizeStart={() => {
            // Store the initial size when resize starts
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
          onResize={() => {
            // This is called during resize, but we don't need to do anything here
            // as ReactFlow handles the actual resizing
          }}
          onResizeEnd={(_event, params) => {
            // When resize ends, dispatch a custom event to track in history
            // Get initial size if not available (fallback for when onResizeStart wasn't called)
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
              // Only add to history if size actually changed
              if (currentInitialSize.width !== params.width || currentInitialSize.height !== params.height) {
                // Create a custom event with resize data
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
                // Dispatch the event from the node element
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

      <Handle
        type="source"
        position={Position.Bottom}
        id={`${id}-source`}
        className="!bottom-[-12px] !bg-sky-400 !border-1 !border-gray-700 !w-2.5 !h-2.5"
        style={{ zIndex: 20 }}
      />


    </div>
  );
};

export default TextNode;
