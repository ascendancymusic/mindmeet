import { Handle, Position, useReactFlow } from 'reactflow';
import { ListMusic, Play, GripVertical } from 'lucide-react';
import { useMemo } from 'react';

interface PlaylistItem {
  id: string;
  label: string;
  audioUrl: string;
  duration: number;
}

interface PlaylistLiteNodeProps {
  id: string;
  data: {
    label: string;
    trackIds?: string[]; // Store only the IDs of audio nodes
  };
  isConnectable: boolean;
  background?: string;
  style?: {
    background?: string;
  };
}

// Helper function to format time in MM:SS format
const formatTime = (timeInSeconds: number): string => {
  if (isNaN(timeInSeconds) || !isFinite(timeInSeconds) || timeInSeconds < 0) return '00:00';

  const minutes = Math.floor(timeInSeconds / 60);
  const seconds = Math.floor(timeInSeconds % 60);

  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

export function PlaylistLiteNode({ id, data, isConnectable, background, style }: PlaylistLiteNodeProps) {
  // Get the node's background color from props or use default
  const nodeBackground = background || style?.background || "#1f2937";

  // Get ReactFlow instance to access nodes
  const reactFlowInstance = useReactFlow();

  // Build playlist from track IDs
  const playlist = useMemo(() => {
    if (!data.trackIds || data.trackIds.length === 0) return [];

    const allNodes = reactFlowInstance.getNodes();

    // Map track IDs to actual audio node data
    return data.trackIds
      .map((trackId, index) => {
        const audioNode = allNodes.find(node => node.id === trackId && node.type === 'audio');
        if (!audioNode) return null;

        // Count occurrences of this track ID before this index
        const trackOccurrences = data.trackIds
          ? data.trackIds.slice(0, index).filter(id => id === trackId).length
          : 0;

        // Create a label with counter for duplicate tracks
        let displayLabel = audioNode.data.label || 'Audio';
        if (trackOccurrences > 0) {
          displayLabel = `${displayLabel} (${trackOccurrences + 1})`;
        }

        return {
          id: audioNode.id,
          label: displayLabel,
          audioUrl: audioNode.data.audioUrl,
          duration: audioNode.data.duration || 0
        };
      })
      .filter((item): item is PlaylistItem => item !== null);
  }, [data.trackIds, reactFlowInstance]);

  // Calculate total duration
  const totalDuration = useMemo(() => {
    return playlist.reduce((total, track) => total + (track.duration || 0), 0);
  }, [playlist]);

  // Generate mock progress bar
  const mockBars = useMemo(() => {
    const bars = [];
    const numBars = 50;

    for (let i = 0; i < numBars; i++) {
      // Create random heights for the bars between 30% and 100%
      const height = 30 + Math.random() * 70;
      bars.push(
        <div
          key={i}
          className="inline-block"
          style={{
            height: `${height}%`,
            width: '2px',
            backgroundColor: 'rgba(255, 254, 254, 0.5)',
            marginRight: '1px',
            borderRadius: '1px'
          }}
        />
      );
    }

    return bars;
  }, []);

  return (
    <div className="relative overflow-visible" style={{ width: '300px' }}>
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={isConnectable}
        className="!top-[-8px] !bg-sky-400 !border-1 !border-gray-700 !w-3 !h-3"
        style={{ zIndex: 20 }}
      />
      <div className="p-0 m-0 font-size-0 line-height-0">
        <div className="bg-gray-800/50 rounded-lg p-3 min-w-[250px]">
          {/* Header with title */}
          <div className="flex items-center mb-2">
            <ListMusic className="w-4 h-4 text-gray-400 mr-2" />
            <span className="text-sm text-gray-300 truncate">
              {data.label || 'Playlist'}
            </span>
          </div>

          {/* Playlist tracks (limited to 3 for lite view) */}
          <div className="mb-3 max-h-[100px] overflow-y-auto bg-gray-900/30 rounded p-1">
            {playlist.length === 0 ? (
              <div className="text-gray-500 text-xs p-2 text-center">
                No tracks in playlist
              </div>
            ) : (
              <div className="space-y-1">
                {playlist.slice(0, 3).map((track, index) => (
                  <div
                    key={`${track.id}-${index}`}
                    className="flex items-center p-1 rounded text-xs text-gray-300"
                  >
                    <GripVertical className="w-3 h-3 text-gray-500 mr-1 flex-shrink-0" />
                    <div className="flex-1 truncate">{track.label}</div>
                    <div className="text-gray-500 ml-1 flex-shrink-0">
                      {formatTime(track.duration || 0)}
                    </div>
                  </div>
                ))}
                {playlist.length > 3 && (
                  <div className="text-gray-500 text-xs p-1 text-center">
                    +{playlist.length - 3} more tracks
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Playback controls (non-functional in lite version) */}
          <div className="flex items-center justify-between">
            <button
              className="p-1.5 rounded-full text-white transition-colors"
              style={{
                backgroundColor: nodeBackground
              }}
              aria-label="Play"
            >
              <Play className="w-4 h-4" />
            </button>

            {/* Mock audio visualizer */}
            <div
              className="flex-1 mx-2 overflow-hidden relative h-6"
              style={{ backgroundColor: 'rgba(31, 41, 55, 0.5)', borderRadius: '4px' }}
            >
              <div className="absolute inset-0 flex items-end justify-start h-full">
                {mockBars}
              </div>
            </div>

            {/* Total duration */}
            <div className="text-xs text-gray-400">
              {formatTime(totalDuration)}
            </div>
          </div>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={isConnectable}
        className="!bottom-[-8px] !bg-sky-400 !border-1 !border-gray-700 !w-3 !h-3"
        style={{ zIndex: 20 }}
      />
    </div>
  );
}
