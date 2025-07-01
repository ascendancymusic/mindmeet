import React from 'react';
import { Handle, Position } from 'reactflow';
import { Youtube } from 'lucide-react';
import { YouTubeVideo } from '../services/youtubeSearch';

interface YouTubeLiteNodeProps {
  id: string;
  data: {
    label: string;
    videoUrl: string;
  };
  isConnectable: boolean;
  selected?: boolean;
  updateNodeData?: (nodeId: string, video: YouTubeVideo) => void;
}

export function YouTubeLiteNode({ id, data, isConnectable }: YouTubeLiteNodeProps) {
  const getYouTubeVideoId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  };

  const videoId = data.videoUrl ? getYouTubeVideoId(data.videoUrl) : null;
  const thumbnailUrl = videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : null;

  return (
    <div className="group relative rounded-lg p-0 min-w-[300px]">
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={isConnectable}
        className="!top-[-18px] !bg-sky-400 !border-1 !border-gray-700 !w-3 !h-3"
      />
      {thumbnailUrl ? (
        <div>
          <div className="border-2 border-gray-700 rounded-xl overflow-hidden aspect-video relative">
            <img
              src={thumbnailUrl}
              alt={data.label || 'YouTube video thumbnail'}
              className="absolute inset-0 w-full h-full object-cover"
              loading="lazy"
            />
          </div>
          <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-sm p-1.5 rounded-b-xl">
            <div className="flex items-center space-x-2">
              <Youtube className="w-4 h-4 flex-shrink-0 text-[#FF0000]" />
              <span className="text-xs font-medium text-gray-200 truncate">
                {data.label || 'YouTube video'}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-[120px] text-gray-500 bg-gray-700/30 rounded-lg border-2 border-dashed border-gray-600">
          <Youtube className="w-8 h-8 mb-1" />
          <span className="text-sm">Add YouTube Video</span>
        </div>
      )}
      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={isConnectable}
        className="!bottom-[-18px] !bg-sky-400 !border-1 !border-gray-700 !w-3 !h-3"
      />
    </div>
  );
}