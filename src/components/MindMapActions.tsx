import React from 'react';
import { Heart, MessageCircle, Bookmark } from 'lucide-react';
import { useMindMapActions } from '../hooks/useMindMapActions';

interface MindMapActionsProps {
  mindmap: {
    id: string;
    key: string;
    title: string;
    likes: number;
    saves: number;
    comment_count?: number;
    liked_by?: string[];
    likedBy?: string[];
    saved_by?: string[];
    savedBy?: string[];
    creator?: string;
  };
  user?: { id: string; username?: string } | null;
  onLikeUpdate: (mapId: string, newLikes: number, newLikedBy: string[]) => void;
  onSaveUpdate: (mapId: string, newSaves: number, newSavedBy: string[]) => void;
  onCommentClick?: () => void;
  showComments?: boolean;
  className?: string;
  iconSize?: 'sm' | 'md' | 'lg';
}

export const MindMapActions: React.FC<MindMapActionsProps> = ({
  mindmap,
  user,
  onLikeUpdate,
  onSaveUpdate,
  onCommentClick,
  showComments = true,
  className = '',
  iconSize = 'md'
}) => {
  const { handleLike, handleSave } = useMindMapActions({
    onLikeUpdate,
    onSaveUpdate,
    onError: (error, action) => {
      console.error(`${action} action failed:`, error);
    }
  });

  const iconSizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5', 
    lg: 'w-6 h-6'
  };

  const iconClass = iconSizeClasses[iconSize];
  const currentLikedBy = mindmap.liked_by || mindmap.likedBy || [];
  const currentSavedBy = mindmap.saved_by || mindmap.savedBy || [];

  return (
    <div className={`flex items-center space-x-4 ${className}`}>
      {/* Like Button */}
      <button
        onClick={(e) => handleLike(e, mindmap)}
        className="flex items-center focus:outline-none group"
      >
        <Heart
          className={`${iconClass} mr-1 transition-colors duration-200 ${
            user?.id && currentLikedBy.includes(user.id)
              ? 'fill-current text-sky-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        />
        {mindmap.likes > 0 && <span className="text-xs">{mindmap.likes}</span>}
      </button>

      {/* Comments Button */}
      {showComments && (
        <button
          onClick={onCommentClick}
          className="flex items-center focus:outline-none group"
        >
          <MessageCircle className={`${iconClass} mr-1 text-gray-400 hover:text-gray-300 transition-colors duration-200`} />
          {(mindmap.comment_count || 0) > 0 && (
            <span className="text-xs">{mindmap.comment_count}</span>
          )}
        </button>
      )}

      {/* Save Button */}
      <button
        onClick={(e) => handleSave(e, mindmap)}
        className="flex items-center focus:outline-none group"
      >
        <Bookmark
          className={`${iconClass} mr-1 transition-colors duration-200 ${
            user?.id && currentSavedBy.includes(user.id)
              ? 'fill-current text-sky-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        />
        {mindmap.saves > 0 && <span className="text-xs">{mindmap.saves}</span>}
      </button>
    </div>
  );
};
