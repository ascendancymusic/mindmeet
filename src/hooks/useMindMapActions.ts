import { useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useAuthStore } from '../store/authStore';
import { useNotificationStore } from '../store/notificationStore';

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
      key?: string;
      title: string;
      likes: number;
      liked_by?: string[];
      likedBy?: string[];
      creator?: string;
    }
  ) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user?.id) return;

    // Handle both liked_by and likedBy field names for compatibility
    const currentLikedBy = mindmap.liked_by || mindmap.likedBy || [];
    const isLiked = currentLikedBy.includes(user.id);
    const updatedLikes = isLiked ? mindmap.likes - 1 : mindmap.likes + 1;
    const updatedLikedBy = isLiked
      ? currentLikedBy.filter((id: string) => id !== user.id)
      : [...currentLikedBy, user.id];

    // Optimistically update UI
    onLikeUpdate?.(mindmap.permalink, updatedLikes, updatedLikedBy); try {
      // Update likes in the database
      const { error } = await supabase
        .from('mindmaps')
        .update({ likes: updatedLikes, liked_by: updatedLikedBy })
        .eq('permalink', mindmap.permalink);

      if (error) throw error;      // Send notification for like/unlike action (only if not own mindmap)
      if (sendNotifications && mindmap.creator && mindmap.creator !== user.id && user.username) {
        try {
          console.log('Sending like notification:', {
            creator: mindmap.creator,
            user: user.id,
            key: mindmap.key,
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
            mindmap_key: mindmap.key
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
      key: string;
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
      // Update saves in the mindmaps table
      const { error: mindmapError } = await supabase
        .from('mindmaps')
        .update({ saves: updatedSaves, saved_by: updatedSavedBy })
        .eq('permalink', mindmap.permalink);

      if (mindmapError) throw mindmapError;

      // Update user's profile saves column
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('saves')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Error fetching user profile for saves update:', profileError);
      } else {
        const currentUserSaves = userProfile?.saves || [];
        const updatedUserSaves = isSaved
          ? currentUserSaves.filter((key: string) => key !== mindmap.key)
          : [...currentUserSaves, mindmap.key];

        const { error: updateProfileError } = await supabase
          .from('profiles')
          .update({ saves: updatedUserSaves })
          .eq('id', user.id);

        if (updateProfileError) {
          console.error('Error updating user profile saves:', updateProfileError);
        }
      }
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
