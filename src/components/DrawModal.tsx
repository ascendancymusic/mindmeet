import React, { useState } from 'react';
import { X, Eraser, Check } from 'lucide-react';
import { HexColorPicker } from 'react-colorful';

interface DrawModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DrawModal: React.FC<DrawModalProps> = ({ isOpen, onClose }) => {
  const [selectedColor, setSelectedColor] = useState('#ffffff');
  const [tempColor, setTempColor] = useState('#ffffff');
  const [lineWidth, setLineWidth] = useState(3);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [isEraserMode, setIsEraserMode] = useState(false);

  if (!isOpen) return null;

  const lineWidthOptions = [1, 2, 3, 5, 8, 12];

  const handleColorPickerOpen = () => {
    setTempColor(selectedColor);
    setShowColorPicker(true);
  };

  const handleColorConfirm = () => {
    setSelectedColor(tempColor);
    setShowColorPicker(false);
  };

  const handleColorCancel = () => {
    setTempColor(selectedColor);
    setShowColorPicker(false);
  };

  return (
    <div className="fixed bottom-0 left-1/2 transform -translate-x-1/2 z-50 w-1/4 min-w-96 bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-xl border border-slate-700/50 rounded-t-xl shadow-2xl">
      <div className="flex items-center justify-between p-4">
        {/* Left section - Drawing tools */}
        <div className="flex items-center space-x-4">
          {/* Color picker section */}
          <div className="flex items-center space-x-3">
            <span className="text-slate-300 text-sm font-medium">Color:</span>
            <div className="relative">
              <button
                onClick={handleColorPickerOpen}
                className="w-10 h-10 rounded-lg border-2 border-slate-600/50 hover:border-slate-500/50 transition-all duration-200 shadow-lg"
                style={{ backgroundColor: selectedColor }}
                title="Choose color"
              />

              {showColorPicker && (
                <div className="absolute bottom-full mb-2 left-0 p-3 bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-xl rounded-xl shadow-2xl border border-slate-700/50 z-50">
                  <HexColorPicker
                    color={tempColor}
                    onChange={setTempColor}
                    className="w-48 h-32"
                  />
                  <div className="mt-3 flex justify-between gap-2">
                    <button
                      onClick={handleColorConfirm}
                      className="flex items-center justify-center w-8 h-8 text-green-300 hover:text-white hover:bg-green-500/80 rounded-lg transition-all duration-200"
                      title="Confirm color change"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleColorCancel}
                      className="flex items-center justify-center w-8 h-8 text-red-300 hover:text-white hover:bg-red-500/80 rounded-lg transition-all duration-200"
                      title="Cancel color change"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Line width section */}
          <div className="flex items-center space-x-3">
            <span className="text-slate-300 text-sm font-medium">Width:</span>
            <div className="flex items-center space-x-2">
              {lineWidthOptions.map((width) => (
                <button
                  key={width}
                  onClick={() => setLineWidth(width)}
                  className={`flex items-center justify-center w-10 h-10 rounded-lg border-2 transition-all duration-200 ${lineWidth === width
                    ? 'border-blue-500/50 text-blue-300'
                    : 'border-slate-600/30 text-slate-400 hover:border-slate-500/50'
                    }`}
                  title={`Line width: ${width}px`}
                >
                  <div
                    className="rounded-full bg-current"
                    style={{
                      width: `${Math.min(width * 2, 16)}px`,
                      height: `${Math.min(width * 2, 16)}px`,
                    }}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Eraser tool */}
          <button
            onClick={() => setIsEraserMode(!isEraserMode)}
            className={`flex items-center justify-center w-10 h-10 rounded-lg border-2 transition-all duration-200 ${isEraserMode
              ? 'border-red-500/50 text-red-300'
              : 'border-slate-600/30 text-slate-400 hover:border-slate-500/50'
              }`}
            title={isEraserMode ? 'Switch to pen' : 'Switch to eraser'}
          >
            <Eraser className="w-5 h-5" />
          </button>
        </div>

        {/* Right section - Close button */}
        <button
          onClick={onClose}
          className="flex items-center justify-center w-10 h-10 rounded-lg border-2 border-slate-600/30 text-slate-400 hover:border-slate-500/50 hover:text-slate-200 transition-all duration-200"
          title="Close drawing tools"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Visual feedback for current settings */}
      <div className="px-4 pb-3">
        <div className="flex items-center space-x-4 text-xs text-slate-400">
          <span>Current: {isEraserMode ? `Eraser mode, ${lineWidth}px` : `Pen mode, ${selectedColor}, ${lineWidth}px`}</span>
        </div>
      </div>
    </div>
  );
};