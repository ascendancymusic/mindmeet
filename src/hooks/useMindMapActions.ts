import { useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useAuthStore } from '../store/authStore';
import { useNotificationStore } from '../store/notificationStore';

/**
 * Hook for handling mindmap like and save actions using optimized database tables.
 * 
 * Uses the new database structure:
 * - Likes: `mindmap_likes` table for individual likes, `mindmap_like_counts` for aggregated counts
 * - Saves: `mindmap_saves` table for individual saves, `mindmap_save_counts` for aggregated counts
 * 
 * This replaces the old array-based approach using `liked_by`, `saved_by` arrays and direct count columns.
 */

interface MindMapActionsProps {
  onLikeUpdate?: (mapPermalink: string, newLikes: number, newLikedBy: string[]) => void;
  onSaveUpdate?: (mapPermalink: string, newSaves: number, newSavedBy: string[]) => void;
  onError?: (error: string, action: 'like' | 'save') => void;
  sendNotifications?: boolean; // Whether to send notifications for like actions
}

export const useMindMapActions = ({
  onLikeUpdate,
  onSaveUpdate,
  onError,
  sendNotifications = true
}: MindMapActionsProps = {}) => {
  const { user } = useAuthStore();

  const handleLike = useCallback(async (
    e: React.MouseEvent,
    mindmap: {
      permalink: string;
      id?: string;
      title: string;
      likes: number;
      liked_by?: string[];
      likedBy?: string[];
      creator?: string;
    }
  ) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user?.id || !mindmap.id) return;

    // Handle both liked_by and likedBy field names for compatibility
    const currentLikedBy = mindmap.liked_by || mindmap.likedBy || [];
    const isLiked = currentLikedBy.includes(user.id);
    const updatedLikes = isLiked ? mindmap.likes - 1 : mindmap.likes + 1;
    const updatedLikedBy = isLiked
      ? currentLikedBy.filter((id: string) => id !== user.id)
      : [...currentLikedBy, user.id];

    // Optimistically update UI
    onLikeUpdate?.(mindmap.permalink, updatedLikes, updatedLikedBy);

    try {
      if (isLiked) {
        // Remove like from mindmap_likes table
        const { error: deleteError } = await supabase
          .from('mindmap_likes')
          .delete()
          .eq('mindmap_id', mindmap.id)
          .eq('user_id', user.id);

        if (deleteError) throw deleteError;
      } else {
        // Add like to mindmap_likes table
        const { error: insertError } = await supabase
          .from('mindmap_likes')
          .insert({
            mindmap_id: mindmap.id,
            user_id: user.id
          });

        if (insertError) throw insertError;
      }

      // Note: mindmap_like_counts table is updated automatically via database triggers

      // Send notification for like/unlike action (only if not own mindmap)
      if (sendNotifications && mindmap.creator && mindmap.creator !== user.id && user.username) {
        try {
          console.log('Sending like notification:', {
            creator: mindmap.creator,
            user: user.id,
            id: mindmap.id,
            title: mindmap.title,
            isLiked
          });
          await useNotificationStore.getState().addNotification({
            user_id: mindmap.creator,
            type: 'like',
            title: isLiked ? 'Like Removed' : 'New Like',
            message: isLiked
              ? `@${user.username} unliked your mindmap: ${mindmap.title}`
              : `@${user.username} liked your mindmap: ${mindmap.title}`,
            related_user: user.id,
            mindmap_id: mindmap.id
          });
          console.log('Like notification sent successfully');
        } catch (notificationError) {
          console.error('Failed to send like notification:', notificationError);
        }
      } else {
        console.log('Not sending notification:', {
          sendNotifications,
          hasCreator: !!mindmap.creator,
          isOwnMap: mindmap.creator === user.id,
          hasUsername: !!user.username
        });
      }
    } catch (error) {
      console.error('Error updating likes:', error);
      onError?.('Failed to update like', 'like');
      // Revert UI changes
      onLikeUpdate?.(mindmap.permalink, mindmap.likes, currentLikedBy);
    }
  }, [user?.id, onLikeUpdate, onError, sendNotifications]);

  const handleSave = useCallback(async (
    e: React.MouseEvent,
    mindmap: {
      permalink: string;
      id: string;
      title: string;
      saves: number;
      saved_by?: string[];
      savedBy?: string[];
      creator?: string;
    }
  ) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user?.id) return;

    // Handle both saved_by and savedBy field names for compatibility
    const currentSavedBy = mindmap.saved_by || mindmap.savedBy || [];
    const isSaved = currentSavedBy.includes(user.id);
    const updatedSaves = isSaved ? mindmap.saves - 1 : mindmap.saves + 1;
    const updatedSavedBy = isSaved
      ? currentSavedBy.filter((id: string) => id !== user.id)
      : [...currentSavedBy, user.id];

    // Optimistically update UI
    onSaveUpdate?.(mindmap.permalink, updatedSaves, updatedSavedBy);

    try {
      if (isSaved) {
        // Remove save from mindmap_saves table
        const { error: deleteError } = await supabase
          .from('mindmap_saves')
          .delete()
          .eq('mindmap_id', mindmap.id)
          .eq('user_id', user.id);

        if (deleteError) throw deleteError;
      } else {
        // Add save to mindmap_saves table
        const { error: insertError } = await supabase
          .from('mindmap_saves')
          .insert({
            mindmap_id: mindmap.id,
            user_id: user.id
          });

        if (insertError) throw insertError;
      }

      // Note: mindmap_save_counts table is updated automatically via database triggers

    } catch (error) {
      console.error('Error updating saves:', error);
      onError?.('Failed to update save', 'save');
      // Revert UI changes
      onSaveUpdate?.(mindmap.permalink, mindmap.saves, currentSavedBy);
    }
  }, [user?.id, onSaveUpdate, onError]);

  return {
    handleLike,
    handleSave,
    user
  };
};
