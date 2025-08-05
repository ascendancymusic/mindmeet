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



  const handleColorPickerOpen = () => {
    setTempColor(selectedColor);
    setShowColorPicker(true);
  };

  const handleColorConfirm = () => {
    setSelectedColor(tempColor);
    setShowColorPicker(false);

    // Dispatch color change event
    const event = new CustomEvent('drawing-settings-changed', {
      detail: { color: tempColor }
    });
    document.dispatchEvent(event);
  };

  const handleColorCancel = () => {
    setTempColor(selectedColor);
    setShowColorPicker(false);
  };

  return (
    <>
      <style>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 2vh;
          height: 2vh;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: 2px solid #1e293b;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        }
        
        .slider::-moz-range-thumb {
          width: 2vh;
          height: 2vh;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: 2px solid #1e293b;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        }
      `}</style>
      <div className="fixed bottom-0 left-1/2 transform -translate-x-1/2 z-50 w-1/4 min-w-80 max-w-2xl bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-xl border border-slate-700/50 rounded-t-xl shadow-2xl">
        <div className="flex items-center justify-between" style={{ padding: '1.5vh 2vh' }}>
          {/* Left section - Drawing tools */}
          <div className="flex items-center" style={{ gap: '2vh' }}>
            {/* Color picker section */}
            <div className="flex items-center" style={{ gap: '1vh' }}>
              <span className="text-slate-300 font-medium" style={{ fontSize: '1.8vh' }}>Color:</span>
              <div className="relative">
                <button
                  onClick={handleColorPickerOpen}
                  className="rounded-lg border-2 border-slate-600/50 hover:border-slate-500/50 transition-all duration-200 shadow-lg"
                  style={{
                    backgroundColor: selectedColor,
                    width: '4vh',
                    height: '4vh'
                  }}
                  title="Choose color"
                />

                {showColorPicker && (
                  <div className="absolute bottom-full left-0 bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-xl rounded-xl shadow-2xl border border-slate-700/50 z-50" style={{ padding: '1.5vh', marginBottom: '1vh' }}>
                    <HexColorPicker
                      color={tempColor}
                      onChange={setTempColor}
                      style={{ width: '24vh', height: '16vh' }}
                    />
                    <div className="flex justify-between" style={{ marginTop: '1.5vh', gap: '1vh' }}>
                      <button
                        onClick={handleColorConfirm}
                        className="flex items-center justify-center text-green-300 hover:text-white hover:bg-green-500/80 rounded-lg transition-all duration-200"
                        style={{ width: '3vh', height: '3vh' }}
                        title="Confirm color change"
                      >
                        <Check style={{ width: '1.8vh', height: '1.8vh' }} />
                      </button>
                      <button
                        onClick={handleColorCancel}
                        className="flex items-center justify-center text-red-300 hover:text-white hover:bg-red-500/80 rounded-lg transition-all duration-200"
                        style={{ width: '3vh', height: '3vh' }}
                        title="Cancel color change"
                      >
                        <X style={{ width: '1.8vh', height: '1.8vh' }} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Line width section */}
            <div className="flex items-center" style={{ gap: '1vh' }}>
              <span className="text-slate-300 font-medium" style={{ fontSize: '1.8vh' }}>Width:</span>
              <div className="flex items-center" style={{ gap: '1vh' }}>
                {/* Slider */}
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={lineWidth}
                  onChange={(e) => {
                    const width = parseInt(e.target.value);
                    setLineWidth(width);

                    // Dispatch line width change event
                    const event = new CustomEvent('drawing-settings-changed', {
                      detail: { lineWidth: width }
                    });
                    document.dispatchEvent(event);
                  }}
                  className="bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
                  style={{
                    width: '8vh',
                    height: '0.8vh',
                    background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${((lineWidth - 1) / 19) * 100}%, #374151 ${((lineWidth - 1) / 19) * 100}%, #374151 100%)`
                  }}
                />

                {/* Input field */}
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={lineWidth}
                  onChange={(e) => {
                    const width = Math.max(1, Math.min(30, parseInt(e.target.value) || 1));
                    setLineWidth(width);

                    // Dispatch line width change event
                    const event = new CustomEvent('drawing-settings-changed', {
                      detail: { lineWidth: width }
                    });
                    document.dispatchEvent(event);
                  }}
                  className="bg-slate-700/50 border border-slate-600/50 rounded text-slate-200 text-center focus:outline-none focus:border-blue-500/50"
                  style={{
                    width: '5vh',
                    height: '3vh',
                    padding: '0.5vh',
                    fontSize: '1.6vh'
                  }}
                />

                <span className="text-slate-400" style={{ fontSize: '1.6vh' }}>px</span>
              </div>
            </div>

            {/* Eraser tool */}
            <button
              onClick={() => {
                const newEraserMode = !isEraserMode;
                setIsEraserMode(newEraserMode);

                // Dispatch eraser mode change event
                const event = new CustomEvent('drawing-settings-changed', {
                  detail: { isEraserMode: newEraserMode }
                });
                document.dispatchEvent(event);
              }}
              className={`flex items-center justify-center rounded-lg border-2 transition-all duration-200 ${isEraserMode
                ? 'border-red-500/50 text-red-300'
                : 'border-slate-600/30 text-slate-400 hover:border-slate-500/50'
                }`}
              style={{ width: '4vh', height: '4vh' }}
              title={isEraserMode ? 'Switch to pen' : 'Switch to eraser'}
            >
              <Eraser style={{ width: '2.2vh', height: '2.2vh' }} />
            </button>
          </div>

          {/* Right section - Close button */}
          <button
            onClick={onClose}
            className="flex items-center justify-center rounded-lg border-2 border-slate-600/30 text-slate-400 hover:border-slate-500/50 hover:text-slate-200 transition-all duration-200"
            style={{ width: '4vh', height: '4vh' }}
            title="Close drawing tools"
          >
            <X style={{ width: '2.2vh', height: '2.2vh' }} />
          </button>
        </div>

        {/* Visual feedback for current settings */}
        <div style={{ padding: '0 2vh 1.5vh 2vh' }}>
          <div className="flex items-center text-slate-400" style={{ gap: '2vh', fontSize: '1.6vh' }}>
            <span>Current: {isEraserMode ? `Eraser mode, ${lineWidth}px` : `Pen mode, ${selectedColor}, ${lineWidth}px`}</span>
          </div>
        </div>
      </div>
    </>
  );
};