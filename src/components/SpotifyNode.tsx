import React from 'react';
import { Handle, Position } from 'reactflow';
import { Spotify } from 'react-spotify-embed';
import { GripVertical, PlusCircle, Check } from 'lucide-react';
import CollapseChevron from './CollapseChevron';
import { SpotifyIcon } from './icons/SpotifyIcon';
import { useState, useEffect } from 'react';

interface SpotifyNodeProps {
  data: {
    label: string;
    spotifyUrl: string;
    background?: string;
    hasChildren?: boolean;
    isCollapsed?: boolean;
    onToggleCollapse?: () => void;
  };
  isConnectable: boolean;
  onContextMenu?: (event: React.MouseEvent, nodeId: string) => void;
  id?: string;
  isAddingToPlaylist?: boolean;
}

export const SpotifyNode = React.memo<SpotifyNodeProps>(({ data, isConnectable, onContextMenu, id, isAddingToPlaylist }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [showCheckmark, setShowCheckmark] = useState(false);

  // Extract collapse data
  const hasChildren = data?.hasChildren || false;
  const isCollapsed = data?.isCollapsed || false;
  const onToggleCollapse = data?.onToggleCollapse;

  const handleOverlayClick = () => {
    setShowCheckmark(true);
    setTimeout(() => {
      setShowCheckmark(false);
    }, 1000);
  };

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
        if (iframe.src.includes('spotify')) {
          iframe.style.pointerEvents = isAddingToPlaylist ? 'none' : 'auto';
          if (!iframe.onload) {
            iframe.onload = handleIframeLoad;

            // Check if iframe is already loaded
            if (iframe.contentDocument?.readyState === 'complete' ||
                iframe.contentWindow?.document?.readyState === 'complete') {
              handleIframeLoad();
            }
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
  }, [data.spotifyUrl, iframeLoaded, isAddingToPlaylist]);

  const handleContextMenu = (event: React.MouseEvent) => {
    if (onContextMenu && id) {
      onContextMenu(event, id);
    }
  };

  return (
    <div className="group relative rounded-lg p-0 min-w-[300px]" onContextMenu={handleContextMenu}>
      <CollapseChevron 
        hasChildren={hasChildren}
        isCollapsed={isCollapsed}
        onToggleCollapse={onToggleCollapse || (() => {})}
      />
      {isAddingToPlaylist && data.spotifyUrl && (
        <div
          className="absolute inset-0 bg-green-500 bg-opacity-50 flex items-center justify-center rounded-lg z-10 cursor-pointer"
          onClick={handleOverlayClick}
        >
          {showCheckmark ? (
            <Check className="text-white w-12 h-12" />
          ) : (
            <PlusCircle className="text-white w-12 h-12" />
          )}
        </div>
      )}
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
          <div className="absolute -right-12 top-1/2 -translate-y-1/2 cursor-move opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-[9999]">
            <GripVertical size={32} className="text-gray-400 hover:text-gray-200 transition-colors" />
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
});