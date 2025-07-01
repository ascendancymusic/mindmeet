import { Handle, Position } from 'reactflow';
import { AudioWaveform } from 'lucide-react';
import { useMemo } from 'react';

interface AudioLiteNodeProps {
  id: string;
  data: {
    label: string;
    duration?: number;
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

export function AudioLiteNode({ data, isConnectable, background, style }: AudioLiteNodeProps) {
  // Get the node's background color from props or use default
  const nodeBackground = background || style?.background || "#1f2937";

  // Mock values for visualization
  const duration = data.duration || 0;
  const mockProgress = 0;
  const mockCurrentTime = 0;

  // Generate mock visualizer bars - memoized to prevent regeneration on every render
  const mockBars = useMemo(() => {
    const bars = [];
    const numBars = 100;

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
            backgroundColor: i < 0 ? nodeBackground : 'rgba(255, 254, 254, 0.5)',
            marginRight: '1px',
            borderRadius: '1px'
          }}
        />
      );
    }

    return bars;
  }, [nodeBackground]); // Only regenerate if nodeBackground changes

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
          <div className="flex items-center mb-2">
            <AudioWaveform className="w-4 h-4 text-gray-400 mr-2" />
            <span className="text-sm text-gray-300 truncate">
              {data.label || 'Audio'}
            </span>
          </div>

          <div className="flex flex-col space-y-2">
            {/* Time display */}
            <div className="flex justify-between text-xs text-gray-400 px-1">
              <span>{formatTime(mockCurrentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>

            {/* Main controls row */}
            <div className="flex items-center justify-between">
              <button
                className="p-1.5 rounded-full text-white transition-colors hover:opacity-80"
                style={{
                  backgroundColor: nodeBackground
                }}
                aria-label="Play"
              >
                {/* Play icon */}
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="5 3 19 12 5 21 5 3"></polygon>
                </svg>
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

              {/* Volume indicator (non-functional) */}
              <div className="relative flex items-center">
                <div
                  className="h-6 flex flex-col justify-end mr-1"
                  style={{ width: '4px' }}
                >
                  {/* Volume bars - 5 segments */}
                  {[0.8, 0.6, 0.4, 0.2, 0].map((threshold, index) => (
                    <div
                      key={index}
                      className="w-full mb-[1px] rounded-sm transition-all duration-150"
                      style={{
                        height: '3px',
                        backgroundColor: 1 > threshold
                          ? nodeBackground
                          : 'rgba(75, 85, 99, 0.3)',
                        opacity: 1 > threshold ? 1 : 0.5
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full h-1 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full transition-all duration-100 ease-linear"
                style={{
                  width: `${mockProgress}%`,
                  backgroundColor: nodeBackground
                }}
              />
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