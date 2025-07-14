import React, { useEffect } from 'react';
import { Check, X } from 'lucide-react';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  isVisible: boolean;
  onClose: () => void;
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({ 
  message, 
  type = 'success', 
  isVisible, 
  onClose, 
  duration = 3000 
}) => {
  useEffect(() => {
    if (isVisible && duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose]);

  if (!isVisible) return null;

  const getToastStyles = () => {
    switch (type) {
      case 'success':
        return 'bg-gradient-to-r from-green-500 to-emerald-600 border-green-400/50 text-white';
      case 'error':
        return 'bg-gradient-to-r from-red-500 to-rose-600 border-red-400/50 text-white';
      case 'info':
        return 'bg-gradient-to-r from-blue-500 to-cyan-600 border-blue-400/50 text-white';
      default:
        return 'bg-gradient-to-r from-green-500 to-emerald-600 border-green-400/50 text-white';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <Check className="w-5 h-5" />;
      case 'error':
        return <X className="w-5 h-5" />;
      case 'info':
        return <Check className="w-5 h-5" />;
      default:
        return <Check className="w-5 h-5" />;
    }
  };

  return (
    <div className="fixed top-20 right-4 z-[9999] animate-in slide-in-from-top-2 duration-300">
      <div className={`
        ${getToastStyles()}
        backdrop-blur-xl rounded-xl shadow-2xl border 
        px-6 py-4 flex items-center space-x-3 
        min-w-[300px] max-w-[400px]
        transform transition-all duration-300 ease-out
        hover:scale-105 hover:shadow-lg
      `}>
        <div className="flex-shrink-0 p-1 bg-white/20 rounded-lg">
          {getIcon()}
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium">{message}</p>
        </div>
        <button
          onClick={onClose}
          className="flex-shrink-0 p-1 hover:bg-white/20 rounded-lg transition-colors duration-200"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
