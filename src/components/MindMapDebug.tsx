import React, { useState } from 'react';
import { useMindMapStore } from '../store/mindMapStore';

const MindMapDebug: React.FC = () => {
  const { maps } = useMindMapStore();
  const [selectedMapId, setSelectedMapId] = useState<string>(maps[0]?.id || '');
  const [editableJson, setEditableJson] = useState<string>('');
  const [editStatus, setEditStatus] = useState<'idle' | 'editing'>('idle');
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false); // State for delete confirmation

  const selectedMap = maps.find(map => map.id === selectedMapId);

  if (maps.length === 0) {
    return <div className="p-4 text-gray-400">No mindmaps available</div>;
  }

  const handleMapSelect = (id: string) => {
    setSelectedMapId(id);
    setEditableJson('');
    setEditStatus('idle');
  };

  const handleEditClick = () => {
    setEditableJson(JSON.stringify(selectedMap, null, 2));
    setEditStatus('editing');
  };

  const handleSaveClick = () => {
    useMindMapStore.setState((state) => ({
      maps: state.maps.map((map) =>
        map.id === selectedMapId ? JSON.parse(editableJson) : map
      ),
    }));
    setEditStatus('idle');
  };

  const handleDeleteClick = () => {
    useMindMapStore.setState((state) => ({
      maps: state.maps.filter((map) => map.id !== selectedMapId),
    }));
    setSelectedMapId(maps[0]?.id || ''); // Select the first map or reset if no maps remain
    setEditableJson('');
    setEditStatus('idle');
    setShowDeleteConfirmation(false); // Close confirmation dialog
  };

  return (
    <div className="p-4 bg-gray-800 rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-blue-400">MindMap Debug View</h2>
        <select
          value={selectedMapId}
          onChange={(e) => handleMapSelect(e.target.value)}
          className="bg-gray-700 text-white px-3 py-1 rounded-md"
        >
          {maps.map(map => (
            <option key={map.id} value={map.id}>{map.title}</option>
          ))}
        </select>
      </div>

      <div className="space-y-4">
        {editStatus === 'editing' ? (
          <div>
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg text-blue-300">Edit Map Data:</h3>
              <div className="space-x-2">
                <button
                  onClick={handleSaveClick}
                  className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditStatus('idle')}
                  className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  Cancel
                </button>
              </div>
            </div>
            <textarea
              value={editableJson}
              onChange={(e) => setEditableJson(e.target.value)}
              className="w-full h-[600px] bg-gray-900 p-3 rounded text-gray-300 font-mono"
            />
          </div>
        ) : (
          <div>
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg text-blue-300">Full MindMap Structure:</h3>
              <div className="space-x-2">
                <button
                  onClick={handleEditClick}
                  className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Edit Map Data
                </button>
                <button
                  onClick={() => setShowDeleteConfirmation(true)} // Show confirmation dialog
                  className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Delete Map
                </button>
              </div>
            </div>
            <pre className="bg-gray-900 p-3 rounded text-gray-300 overflow-auto max-h-[600px]">
              {JSON.stringify(selectedMap, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {showDeleteConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg text-center">
            <h3 className="text-lg text-white mb-4">Are you sure you want to delete this map?</h3>
            <div className="space-x-4">
              <button
                onClick={handleDeleteClick}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Yes, Delete
              </button>
              <button
                onClick={() => setShowDeleteConfirmation(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MindMapDebug;