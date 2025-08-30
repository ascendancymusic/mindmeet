
import React, { useState, useMemo } from 'react';
import { Node } from 'reactflow';
import { Music, X } from 'lucide-react';

interface AddToPlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodes: Node[];
  onAddTracks: (trackIds: string[]) => void;
  playlistNodeId: string | null;
}

export const AddToPlaylistModal: React.FC<AddToPlaylistModalProps> = ({
  isOpen,
  onClose,
  nodes,
  onAddTracks,
  playlistNodeId,
}) => {
  const [selectedTrackIds, setSelectedTrackIds] = useState<string[]>([]);

  const availableTracks = useMemo(() => {
    const playlistNode = nodes.find(node => node.id === playlistNodeId);
    const existingTrackIds = playlistNode?.data.trackIds || [];
    return nodes.filter(node =>
      (node.type === 'audio' || node.type === 'spotify' || node.type === 'soundcloud' || node.type === 'youtube-video') &&
      !existingTrackIds.includes(node.id)
    );
  }, [nodes, playlistNodeId]);

  const handleToggleTrack = (trackId: string) => {
    setSelectedTrackIds(prev =>
      prev.includes(trackId)
        ? prev.filter(id => id !== trackId)
        : [...prev, trackId]
    );
  };

  const handleDone = () => {
    onAddTracks(selectedTrackIds);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/50 p-6 w-full max-w-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Add Songs to Playlist</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto space-y-2 pr-2 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent">
          {availableTracks.length > 0 ? (
            availableTracks.map(track => (
              <div
                key={track.id}
                onClick={() => handleToggleTrack(track.id)}
                className={`flex items-center p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedTrackIds.includes(track.id)
                    ? 'bg-blue-500/20 border-blue-500'
                    : 'bg-slate-800/50 hover:bg-slate-700/50'
                } border border-transparent`}
              >
                <Music className="w-5 h-5 mr-3 text-gray-400" />
                <span className="flex-1 text-white truncate">{track.data.label || 'Untitled Track'}</span>
                <input
                  type="checkbox"
                  checked={selectedTrackIds.includes(track.id)}
                  onChange={() => handleToggleTrack(track.id)}
                  className="form-checkbox h-5 w-5 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                />
              </div>
            ))
          ) : (
            <p className="text-gray-400 text-center py-8">No available tracks to add.</p>
          )}
        </div>
        <div className="mt-6 flex justify-end space-x-4">
          <button
            onClick={onClose}
            className="px-6 py-2 text-gray-300 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleDone}
            className="px-6 py-2 text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
