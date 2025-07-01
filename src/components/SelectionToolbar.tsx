import React, { useState, useEffect } from 'react';
import { Scissors, Copy, Trash2, Check } from 'lucide-react';

interface SelectionToolbarProps {
  isVisible: boolean;
  onCut: () => void;
  onCopy: () => void;
  onDelete: () => void;
}

type ActionType = 'copy' | 'cut' | 'delete' | null;

const SelectionToolbar: React.FC<SelectionToolbarProps> = ({
  isVisible,
  onCut,
  onCopy,
  onDelete,
}) => {
  const [confirmation, setConfirmation] = useState<ActionType>(null);

  // Reset the confirmation after a delay
  useEffect(() => {
    if (confirmation) {
      const timer = setTimeout(() => {
        setConfirmation(null);
      }, 2000); // Show confirmation for 2 seconds

      return () => clearTimeout(timer);
    }
  }, [confirmation]);

  if (!isVisible) return null;

  return (
    <div className="bg-gray-800 rounded-lg shadow-lg flex items-center p-1" style={{ pointerEvents: 'auto' }}>
      {confirmation === 'cut' ? (
        <div className="flex items-center bg-gray-700 rounded-md px-2 py-1 mx-1 text-green-400">
          <Check className="w-4 h-4 mr-1" />
          <span className="text-xs whitespace-nowrap">Cut!</span>
        </div>
      ) : (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onCut();
            setConfirmation('cut');
          }}
          className="p-2 hover:bg-gray-700 rounded-md mx-1 text-gray-300 hover:text-white transition-colors"
          title="Cut"
        >
          <Scissors className="w-4 h-4" />
        </button>
      )}

      {confirmation === 'copy' ? (
        <div className="flex items-center bg-gray-700 rounded-md px-2 py-1 mx-1 text-green-400">
          <Check className="w-4 h-4 mr-1" />
          <span className="text-xs whitespace-nowrap">Copied!</span>
        </div>
      ) : (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onCopy();
            setConfirmation('copy');
          }}
          className="p-2 hover:bg-gray-700 rounded-md mx-1 text-gray-300 hover:text-white transition-colors"
          title="Copy"
        >
          <Copy className="w-4 h-4" />
        </button>
      )}

      {confirmation === 'delete' ? (
        <div className="flex items-center bg-gray-700 rounded-md px-2 py-1 mx-1 text-green-400">
          <Check className="w-4 h-4 mr-1" />
          <span className="text-xs whitespace-nowrap">Deleted!</span>
        </div>
      ) : (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
            setConfirmation('delete');
          }}
          className="p-2 hover:bg-gray-700 rounded-md mx-1 text-gray-300 hover:text-white transition-colors"
          title="Delete"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

export default SelectionToolbar;
