import React, { useState, useEffect } from 'react';
import { Search, Loader } from 'lucide-react';
import { searchVideos, YouTubeVideo } from '../services/youtubeSearch';

interface YouTubeSearchProps {
  onSelect: (video: YouTubeVideo) => void;
}

export function YouTubeSearch({ onSelect }: YouTubeSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<YouTubeVideo[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const searchTimeout = setTimeout(async () => {
      if (query.trim()) {
        setIsLoading(true);
        const videos = await searchVideos(query);
        setResults(videos);
        setIsLoading(false);
      } else {
        setResults([]);
      }
    }, 300);

    return () => clearTimeout(searchTimeout);
  }, [query]);

  return (
    <div className="w-full space-y-2">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for a video..."
          className="w-full px-4 py-2 pl-10 bg-gray-900 text-white border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="absolute left-3 top-1/2 -translate-y-1/2">
          {isLoading ? (
            <Loader className="w-4 h-4 text-gray-400 animate-spin" />
          ) : (
            <Search className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </div>

      {results.length > 0 && (
        <div className="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
          {results.map((video) => (
            <button
              key={video.id}
              onClick={() => onSelect(video)}
              className="w-full px-4 py-2 text-left hover:bg-gray-800 transition-colors flex items-center space-x-4"
            >
              <img
                src={video.thumbnailUrl}
                alt={video.title}
                className="w-20 h-auto rounded"
              />
              <div>
                <div className="text-sm text-white line-clamp-2">{video.title}</div>
                <div className="text-xs text-gray-400">{video.channelTitle}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}