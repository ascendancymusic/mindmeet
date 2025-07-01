import React from 'react';
import { Handle, Position } from 'reactflow';
import { SpotifyIcon } from './icons/SpotifyIcon';

interface SpotifyLiteNodeProps {
  id: string;
  data: {
    label: string;
    spotifyUrl?: string;
  };
  isConnectable: boolean;
}

const SpotifyLiteNode: React.FC<SpotifyLiteNodeProps> = ({ id, data, isConnectable }) => {
  return (
    <div className="relative w-[200px] bg-gray-800/50 rounded-lg overflow-visible">
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={isConnectable}
        id={`${id}-target`}
        className="!top-[-12px] !bg-sky-400 !border-1 !border-gray-700 !w-3 !h-3"
      />
      <div className="p-2">
        <div className="flex items-center space-x-2 mb-1">
          <SpotifyIcon className="w-5 h-5 flex-shrink-0 text-[#1DB954]" />
          <span className="text-sm font-medium text-gray-200 truncate">
            {data.label || 'Select a song...'}
          </span>
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={isConnectable}
        id={`${id}-source`}
        className="!bottom-[-12px] !bg-sky-400 !border-1 !border-gray-700 !w-3 !h-3"
      />
    </div>
  );
};

export { SpotifyLiteNode };