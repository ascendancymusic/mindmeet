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
    <div className="px-4 py-2 shadow-md rounded-md bg-white border-2 border-gray-200">
      <div className="flex items-center">
        {data.hasChildren && (
          <button
            className="mr-2 p-1 rounded-full hover:bg-gray-100 transition-colors"
            onClick={data.onToggleCollapse}
          >
            {data.isCollapsed ? (
              <ChevronRight className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            )}
          </button>
        )}
        <div className="text-sm font-bold">{data.label}</div>
      </div>
      <Handle type="target" position={Position.Top} isConnectable={isConnectable} />
      <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} />
    </div>
  );
};

export default memo(CollapsibleNode);

