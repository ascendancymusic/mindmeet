import React from 'react';

interface PublishSuccessModalProps {
  isVisible: boolean;
}

const PublishSuccessModal: React.FC<PublishSuccessModalProps> = ({ isVisible }) => {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
      <div className="relative bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-xl text-white px-8 py-6 rounded-2xl shadow-2xl border border-slate-700/50 animate-in fade-in-50 slide-in-from-bottom-4 duration-300">
        {/* Progress bar background */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-800/50 rounded-b-2xl overflow-hidden">
          {/* Animated progress bar */}
          <div 
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-b-2xl"
            style={{
              width: '100%',
              animation: 'countdown-bar 3s linear forwards',
            }}
          />
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 flex items-center justify-center backdrop-blur-sm">
            <span className="text-2xl">🎉</span>
          </div>
          <div>
            <div className="font-bold text-xl text-white mb-1">Mindmap Published!</div>
            <div className="text-slate-400 text-sm">Successfully shared with the community</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublishSuccessModal;
