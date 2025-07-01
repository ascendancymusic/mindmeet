import React from 'react';
import { Handle, Position } from 'reactflow';
import { GripVertical } from 'lucide-react';
import { SoundCloudIcon } from './icons/SoundCloudIcon';

interface SoundCloudNodeProps {
  data: {
    soundCloudUrl: string | null;
    background?: string;
  };
  isConnectable: boolean;
}

export const SoundCloudNode = React.memo<SoundCloudNodeProps>(({ data, isConnectable }) => {
  return (
    <>
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={isConnectable}
        className="!top-[-8px]"
      />
      <div className="group relative bg-gray-800 rounded-lg p-0 min-w-[300px]">
        {data.soundCloudUrl ? (
          <>
            <div className="border-2 border-gray-700 rounded-xl">
              <iframe
                width="100%"
                height="166"
                scrolling="no"
                frameBorder="no"
                src={`https://w.soundcloud.com/player/?url=${encodeURIComponent(data.soundCloudUrl)}&color=%23ff5500&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false`}
                className="rounded-lg"
              />
            </div>
            <div className="absolute -right-12 top-1/2 -translate-y-1/2 cursor-move opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <GripVertical size={32} className="text-gray-400 hover:text-gray-200 transition-colors" />
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-[120px] text-gray-500">
            <SoundCloudIcon className="w-8 h-8 mb-1" />
            <span className="text-sm">Add SoundCloud Track</span>
          </div>
        )}
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={isConnectable}
        className="!bottom-[-8px]"
      />
    </>
  );
});
