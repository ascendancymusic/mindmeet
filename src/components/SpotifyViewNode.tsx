import { Handle, Position } from 'reactflow';
import { Spotify } from 'react-spotify-embed';
import { SpotifyIcon } from './icons/SpotifyIcon';
import { useState, useEffect } from 'react';

interface SpotifyViewNodeProps {
  data: {
    label: string;
    spotifyUrl: string;
    background?: string;
  };
  isConnectable: boolean;
}

export function SpotifyViewNode({ data, isConnectable }: SpotifyViewNodeProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [iframeLoaded, setIframeLoaded] = useState(false);

  // Reset loading state when URL changes
  useEffect(() => {
    if (data.spotifyUrl) {
      setIsLoading(true);
      setIframeLoaded(false);
    }
  }, [data.spotifyUrl]);

  // Function to handle iframe load event
  const handleIframeLoad = () => {
    setIframeLoaded(true);
    // Add a minimal delay to ensure the content is fully rendered
    setTimeout(() => setIsLoading(false), 100);
  };

  // Add event listener to detect when the Spotify iframe is loaded
  useEffect(() => {
    if (!data.spotifyUrl) return;

    const checkIframeLoaded = () => {
      const iframes = document.querySelectorAll('iframe');
      iframes.forEach(iframe => {
        if (iframe.src.includes('spotify') && !iframe.onload) {
          iframe.onload = handleIframeLoad;

          // Check if iframe is already loaded
          if (iframe.contentDocument?.readyState === 'complete' ||
              iframe.contentWindow?.document?.readyState === 'complete') {
            handleIframeLoad();
          }
        }
      });
    };

    // Check immediately and then periodically until found
    checkIframeLoaded();
    const interval = setInterval(checkIframeLoaded, 100);

    // Fallback timeout in case the iframe load event doesn't fire
    // Using a shorter timeout since the embed usually loads quickly
    const timeout = setTimeout(() => {
      setIsLoading(false);
      clearInterval(interval);
    }, 2500);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [data.spotifyUrl, iframeLoaded]);

  return (
    <div className="group relative rounded-lg p-0 min-w-[300px]">
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={isConnectable}
        className="!top-[-18px] !bg-sky-400 !border-1 !border-gray-700 !w-3 !h-3"
      />
      {data.spotifyUrl ? (
        <>
          <div className="border-2 border-gray-700 rounded-xl relative">
            <Spotify wide link={data.spotifyUrl} />
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900 rounded-lg z-10">
                <div className="flex flex-col items-center justify-center space-y-2 px-4 py-3 text-center max-w-[80%]">
                  <div className="relative w-8 h-8 flex items-center justify-center mb-1">
                    <SpotifyIcon className="w-5 h-5 text-[#1DB954] z-10" />
                    <div className="absolute inset-0 w-full h-full rounded-full border-2 border-[#1DB954] border-t-transparent animate-spin"></div>
                  </div>
                  <span className="text-sm text-white">Loading track...</span>
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center h-[120px] text-gray-500">
          <SpotifyIcon className="w-8 h-8 mb-1" />
          <span className="text-sm">Add Spotify Track</span>
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
