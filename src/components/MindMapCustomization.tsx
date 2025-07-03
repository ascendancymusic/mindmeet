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
      <style dangerouslySetInnerHTML={{
        __html: `
          @media (max-height: 1090px) {
            .compact-modal {
              max-height: 85vh;
              padding: 1rem !important;
            }
            .compact-header {
              margin-bottom: 1rem !important;
            }
            .compact-title {
              font-size: 1rem !important;
            }
            .compact-section {
              margin-bottom: 1rem !important;
            }
            .compact-section h3 {
              font-size: 0.875rem !important;
              margin-bottom: 0.5rem !important;
            }
            .compact-button {
              padding: 0.5rem 0.75rem !important;
              font-size: 0.75rem !important;
            }
            .compact-footer {
              margin-top: 1rem !important;
              padding-top: 0.75rem !important;
            }
            .compact-coming-soon {
              padding: 1rem 0.75rem !important;
            }
          }
        `
      }} />
      <div className="bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/50 p-6 w-full max-w-md compact-modal"
        style={{ maxHeight: '90vh' }}
      >
        <div className="flex items-center justify-between mb-6 compact-header">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-500/10 rounded-xl">
              <Network className="w-6 h-6 text-blue-400" />
            </div>
            <h2 className="text-xl font-bold bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent compact-title">
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

        <div className="space-y-6 overflow-y-auto" style={{ maxHeight: '65vh' }}>
          {/* Edge Type Section */}
          <div className="compact-section">
            <h3 className="text-lg font-semibold text-slate-200 mb-3">Edge Type</h3>
            <div className="space-y-2">
              <button
                onClick={() => onEdgeTypeChange('default')}
                className={`w-full px-4 py-3 text-left text-sm rounded-xl transition-all duration-200 compact-button ${
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
                className={`w-full px-4 py-3 text-left text-sm rounded-xl transition-all duration-200 compact-button ${
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
                className={`w-full px-4 py-3 text-left text-sm rounded-xl transition-all duration-200 compact-button ${
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
          <div className="compact-section">
            <h3 className="text-lg font-semibold text-slate-200 mb-3">Background Color</h3>
            <div className="px-4 py-6 bg-slate-700/20 rounded-xl border border-slate-600/30 text-center compact-coming-soon">
              <div className="text-slate-400 text-sm">To be added</div>
            </div>
          </div>

          <div className="compact-section">
            <h3 className="text-lg font-semibold text-slate-200 mb-3">Edge Color</h3>
            <div className="px-4 py-6 bg-slate-700/20 rounded-xl border border-slate-600/30 text-center compact-coming-soon">
              <div className="text-slate-400 text-sm">To be added</div>
            </div>
          </div>
        </div>

        <div className="flex justify-end mt-6 pt-4 border-t border-slate-700/30 compact-footer">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-500 hover:to-slate-600 text-white rounded-xl transition-all duration-200 font-medium compact-button"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
