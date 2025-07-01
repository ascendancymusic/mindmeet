import React from 'react';
import { Handle, Position } from 'reactflow';
import { SoundCloudIcon } from './icons/SoundCloudIcon';

interface SoundCloudLiteNodeProps {
  id: string;
  data: {
    label: string;
    soundCloudUrl?: string;
  };
  isConnectable: boolean;
}

const SoundCloudLiteNode: React.FC<SoundCloudLiteNodeProps> = ({ id, data, isConnectable }) => {
  const formatSoundCloudUrl = (url?: string) => {
    if (!url) return data.label || 'Enter SoundCloud URL...';
    
    try {
      const path = url.replace('https://soundcloud.com/', '');
      const [artist, ...songParts] = path.split('/');
      const song = songParts.join('-');
      return `${artist} - ${song}`;
    } catch (error) {
      return data.label || 'Enter SoundCloud URL...';
    }
  };

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
          <SoundCloudIcon className="w-5 h-5 flex-shrink-0 text-[#FF5500]" />
          <span className="text-sm font-medium text-gray-200 truncate">
            {formatSoundCloudUrl(data.soundCloudUrl)}
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

export { SoundCloudLiteNode };