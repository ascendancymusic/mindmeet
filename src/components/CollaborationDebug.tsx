import React from 'react';
import { useCollaborationStore } from '../store/collaborationStore';

interface CollaborationDebugProps {
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

export const CollaborationDebug: React.FC<CollaborationDebugProps> = ({ 
  position = 'top-right' 
}) => {
  const { 
    connectedUsers, 
    currentUserId, 
    collaborationChannel, 
    getOnlineCollaboratorCount 
  } = useCollaborationStore();

  const collaboratorCount = getOnlineCollaboratorCount();
  const isActive = !!collaborationChannel;
  
  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4',
  };

  const statusColor = isActive 
    ? collaboratorCount > 0 
      ? 'bg-green-500' 
      : 'bg-yellow-500'
    : 'bg-red-500';

  const statusText = isActive
    ? collaboratorCount > 0
      ? `Broadcasting to ${collaboratorCount} collaborator${collaboratorCount === 1 ? '' : 's'}`
      : 'Solo mode - Not broadcasting'
    : 'Collaboration disabled';

  return (
    <div 
      className={`fixed ${positionClasses[position]} z-50 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3 border border-gray-200 dark:border-gray-700 max-w-xs`}
    >
      <div className="flex items-center gap-2 text-sm">
        <div className={`w-3 h-3 rounded-full ${statusColor} animate-pulse`} />
        <span className="font-medium text-gray-900 dark:text-gray-100">
          Collaboration Status
        </span>
      </div>
      
      <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
        <div>{statusText}</div>
        <div className="mt-1">
          Total online: {connectedUsers.length} | 
          Channel: {isActive ? '✅' : '❌'}
        </div>
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-1 text-xs opacity-75">
            User ID: {currentUserId?.slice(-8)}
          </div>
        )}
      </div>
    </div>
  );
};
