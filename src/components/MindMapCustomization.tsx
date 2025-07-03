import { X, Network } from 'lucide-react';

interface MindMapCustomizationProps {
  isOpen: boolean;
  onClose: () => void;
  edgeType: 'default' | 'straight' | 'smoothstep';
  onEdgeTypeChange: (newEdgeType: 'default' | 'straight' | 'smoothstep') => void;
}

export default function MindMapCustomization({
  isOpen,
  onClose,
  edgeType,
  onEdgeTypeChange
}: MindMapCustomizationProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/50 p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-500/10 rounded-xl">
              <Network className="w-6 h-6 text-blue-400" />
            </div>
            <h2 className="text-xl font-bold bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent">
              Mindmap Customization
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-700/30 rounded-xl transition-all duration-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Edge Type Section */}
          <div>
            <h3 className="text-lg font-semibold text-slate-200 mb-3">Edge Type</h3>
            <div className="space-y-2">
              <button
                onClick={() => onEdgeTypeChange('default')}
                className={`w-full px-4 py-3 text-left text-sm rounded-xl transition-all duration-200 ${
                  edgeType === 'default' 
                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' 
                    : 'bg-slate-700/30 text-slate-300 hover:bg-slate-700/50 border border-slate-600/30'
                }`}
              >
                <div className="font-medium">Bezier (Default)</div>
                <div className="text-xs text-slate-400 mt-1">Smooth curved connections</div>
              </button>
              
              <button
                onClick={() => onEdgeTypeChange('smoothstep')}
                className={`w-full px-4 py-3 text-left text-sm rounded-xl transition-all duration-200 ${
                  edgeType === 'smoothstep' 
                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' 
                    : 'bg-slate-700/30 text-slate-300 hover:bg-slate-700/50 border border-slate-600/30'
                }`}
              >
                <div className="font-medium">Smooth Step</div>
                <div className="text-xs text-slate-400 mt-1">Right-angled connections with curves</div>
              </button>
              
              <button
                onClick={() => onEdgeTypeChange('straight')}
                className={`w-full px-4 py-3 text-left text-sm rounded-xl transition-all duration-200 ${
                  edgeType === 'straight' 
                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' 
                    : 'bg-slate-700/30 text-slate-300 hover:bg-slate-700/50 border border-slate-600/30'
                }`}
              >
                <div className="font-medium">Straight</div>
                <div className="text-xs text-slate-400 mt-1">Direct linear connections</div>
              </button>
            </div>
          </div>

          {/* Coming Soon Sections */}
          <div>
            <h3 className="text-lg font-semibold text-slate-200 mb-3">Background Color</h3>
            <div className="px-4 py-6 bg-slate-700/20 rounded-xl border border-slate-600/30 text-center">
              <div className="text-slate-400 text-sm">To be added</div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-slate-200 mb-3">Edge Color</h3>
            <div className="px-4 py-6 bg-slate-700/20 rounded-xl border border-slate-600/30 text-center">
              <div className="text-slate-400 text-sm">To be added</div>
            </div>
          </div>
        </div>

        <div className="flex justify-end mt-6 pt-4 border-t border-slate-700/30">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-500 hover:to-slate-600 text-white rounded-xl transition-all duration-200 font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
