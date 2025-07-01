import { Handle, Position } from 'reactflow';
import { Youtube } from 'lucide-react';
import { YouTubeVideo } from '../services/youtubeSearch';

interface YouTubeViewNodeProps {
  id: string;
  data: {
    label: string;
    videoUrl: string;
  };
  isConnectable: boolean;
  selected?: boolean;
  updateNodeData?: (nodeId: string, video: YouTubeVideo) => void;
}

export function YouTubeViewNode({ id, data, isConnectable, selected, updateNodeData }: YouTubeViewNodeProps) {
  // Extract video ID from various YouTube URL formats
  const getYouTubeVideoId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  };

  const videoId = data.videoUrl ? getYouTubeVideoId(data.videoUrl) : null;

  return (
    <div className="group relative rounded-lg p-0 min-w-[300px]">
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={isConnectable}
        className="!top-[-18px] !bg-sky-400 !border-1 !border-gray-700 !w-3 !h-3"
      />
      {videoId ? (
        <>
          <div className="border-2 border-gray-700 rounded-xl">
            <div className="aspect-video">
              <iframe
                width="100%"
                height="100%"
                src={`https://www.youtube.com/embed/${videoId}`}
                title={data.label || 'YouTube video player'}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="rounded-lg"
              />
            </div>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center h-[120px] text-gray-500">
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
