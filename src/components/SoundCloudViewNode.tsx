import { useEffect, useMemo, useState } from 'react';
import { Handle, Position } from 'reactflow';
import { SoundCloudIcon } from './icons/SoundCloudIcon';

interface SoundCloudViewNodeProps {
  data: {
    soundCloudUrl: string | null;
    background?: string;
  };
  isConnectable: boolean;
}

export function SoundCloudViewNode({ data, isConnectable }: SoundCloudViewNodeProps) {
  const [isPlayerVisible, setIsPlayerVisible] = useState(false);
  const [metadata, setMetadata] = useState<{ title: string; authorName?: string; thumbnailUrl?: string } | null>(null);
  const [isFetchingMetadata, setIsFetchingMetadata] = useState(false);
  const [metadataError, setMetadataError] = useState<string | null>(null);

  const fallbackTitle = useMemo(() => {
    if (!data?.soundCloudUrl) {
      return 'SoundCloud Track';
    }

    try {
      const withoutQuery = data.soundCloudUrl.split('?')[0];
      const path = withoutQuery.replace('https://soundcloud.com/', '');
      const [artist, ...songParts] = path.split('/').filter(Boolean);
      if (!artist || songParts.length === 0) {
        return decodeURIComponent(path.replace(/-/g, ' ')) || 'SoundCloud Track';
      }
      const song = songParts.join(' ').replace(/-/g, ' ');
      return `${decodeURIComponent(artist.replace(/-/g, ' '))} — ${decodeURIComponent(song)}`;
    } catch (error) {
      return 'SoundCloud Track';
    }
  }, [data?.soundCloudUrl]);

  // Fetch SoundCloud metadata so we can render a lightweight preview before loading the iframe.
  useEffect(() => {
    setIsPlayerVisible(false);

    if (!data?.soundCloudUrl) {
      setMetadata(null);
      setMetadataError(null);
      setIsFetchingMetadata(false);
      return;
    }

    const controller = new AbortController();
    const soundCloudUrl = data.soundCloudUrl as string;

    const fetchMetadata = async () => {
      setIsFetchingMetadata(true);
      setMetadata(null);
      setMetadataError(null);

      try {
        const response = await fetch(
          `https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(soundCloudUrl)}&maxheight=166&show_comments=false`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const json = await response.json();
        if (!controller.signal.aborted) {
          setMetadata({
            title: json.title,
            authorName: json.author_name,
            thumbnailUrl: json.thumbnail_url,
          });
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setMetadataError(error instanceof Error ? error.message : 'Unable to load track details');
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsFetchingMetadata(false);
        }
      }
    };

    fetchMetadata();

    return () => {
      controller.abort();
    };
  }, [data?.soundCloudUrl]);

  const handleLoadPlayer = () => {
    setIsPlayerVisible(true);
  };

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
            <div className="border-2 border-gray-700 rounded-xl overflow-hidden bg-gray-900">
              {isPlayerVisible ? (
                <iframe
                  width="100%"
                  height="166"
                  scrolling="no"
                  frameBorder="no"
                  src={`https://w.soundcloud.com/player/?url=${encodeURIComponent(data.soundCloudUrl as string)}&color=%23ff5500&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false`}
                  className="rounded-lg"
                />
              ) : (
                <button
                  type="button"
                  onClick={handleLoadPlayer}
                  className="w-full text-left"
                  aria-label="Load SoundCloud player"
                >
                  <div className="flex items-start gap-3 p-4">
                    <SoundCloudIcon className="w-7 h-7 flex-shrink-0 text-[#FF5500]" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-100 truncate">
                        {metadata?.title || fallbackTitle}
                      </p>
                      <p className="text-xs text-gray-400 truncate">
                        {isFetchingMetadata
                          ? 'Loading track details...'
                          : metadata?.authorName || (metadataError ? 'Track details unavailable' : 'Unknown artist')}
                      </p>
                      <p className="mt-2 text-xs font-medium text-sky-400">Click to load player</p>
                    </div>
                    {metadata?.thumbnailUrl && (
                      <img
                        src={metadata.thumbnailUrl}
                        alt="SoundCloud track artwork"
                        className="w-16 h-16 rounded-md object-cover flex-shrink-0"
                      />
                    )}
                  </div>
                </button>
              )}
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
}
