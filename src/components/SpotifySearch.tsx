import React, { useState, useEffect } from 'react';
import { Search, Loader } from 'lucide-react';
import { searchTracks, SpotifyTrack } from '../services/spotifySearch';

interface SpotifySearchProps {
  onSelect: (track: SpotifyTrack) => void;
}

export function SpotifySearch({ onSelect }: SpotifySearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SpotifyTrack[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const searchTimeout = setTimeout(async () => {
      if (query.trim()) {
        setIsLoading(true);
        const tracks = await searchTracks(query);
        setResults(tracks);
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
          placeholder="Search for a song..."
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
          {results.map((track) => (
            <button
              key={track.id}
              onClick={() => onSelect(track)}
              className="w-full px-4 py-2 text-left hover:bg-gray-800 transition-colors flex items-center space-x-2"
            >
              <div>
                <div className="text-sm text-white">{track.name}</div>
                <div className="text-xs text-gray-400">
                  {track.artists.map(a => a.name).join(', ')}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
