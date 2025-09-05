import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface CollapsibleNodeData {
  label: string;
  hasChildren: boolean;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const CollapsibleNode: React.FC<NodeProps<CollapsibleNodeData>> = ({ data, isConnectable }) => {
  return (
    <div className="relative px-4 py-2 shadow-md rounded-md bg-white border-2 border-gray-200 group">
      <div className="text-sm font-bold">{data.label}</div>
      
      {data.hasChildren && (
        <button
          className="absolute -top-2 -right-2 p-1 rounded-full bg-white border border-gray-300 shadow-sm hover:bg-gray-100 transition-all opacity-0 group-hover:opacity-100"
          onClick={data.onToggleCollapse}
        >
          {data.isCollapsed ? (
            <ChevronRight className="w-3 h-3 text-gray-600" />
          ) : (
            <ChevronDown className="w-3 h-3 text-gray-600" />
          )}
        </button>
      )}
      
      <Handle type="target" position={Position.Top} isConnectable={isConnectable} />
      <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} />
    </div>
  );
};

export default memo(CollapsibleNode);

