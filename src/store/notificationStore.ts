import { create } from 'zustand';
import { supabase } from '../supabaseClient';
import { useAuthStore } from './authStore';

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  type: 'follow' | 'like' | 'comment' | 'publish' | 'collaboration_accept' | 'collaboration_reject';
  related_user?: string;
  mindmap_id?: string;
  comment_id?: string;
}

interface NotificationStore {
  notifications: Notification[];
  isLoading: boolean;
  fetchNotifications: (userId: string) => Promise<void>;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  removeNotification: (id: string) => Promise<void>;
  clearAll: (userId: string) => Promise<void>;
  markAllAsRead: (userId: string) => Promise<void>;
}

export const useNotificationStore = create<NotificationStore>((set) => ({
  notifications: [],
  isLoading: false,

  fetchNotifications: async (userId: string) => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .neq('related_user', userId)
        .order('timestamp', { ascending: false });

      if (error) throw error;
      set({ notifications: data || [] });
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      set({ isLoading: false });
    }
  },
    addNotification: async (notification) => {
    try {
      const authUser = useAuthStore.getState().user;
      let message = notification.message;

      if (notification.related_user && authUser && notification.related_user === authUser.id && authUser.username) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', notification.related_user)
          .single();
        
        if (profile && profile.username !== authUser.username) {
          message = notification.message.replace(`@${authUser.username}`, `@${profile.username}`);
        }
      }

      const updatedNotification = { ...notification, message };


      if (updatedNotification.type === 'publish') {
        const { data, error } = await supabase.rpc('create_mindmap_publish_notification', {
          p_user_id: updatedNotification.user_id,           // sender (publisher)
          p_title: updatedNotification.title,
          p_message: updatedNotification.message,
          p_type: updatedNotification.type,
          p_mindmap_id: updatedNotification.mindmap_id
        });
      
        if (error) {
          console.error('Publish notification creation failed:', error);
          throw error;
        }
      
        if (data && data.length > 0) {
          set((state) => ({
            notifications: [data[0], ...state.notifications],
          }));
        }
        return;
      }

      // For follow notifications, use the simple RPC method since they don't need mindmap_id
      if (updatedNotification.type === 'follow') {
        const { data, error } = await supabase.rpc('create_notification', {
          p_message: updatedNotification.message,
          p_related_user: updatedNotification.related_user,
          p_title: updatedNotification.title,
          p_type: updatedNotification.type,
          p_user_id: updatedNotification.user_id,
        });

        if (error) {
          console.error('Follow notification creation failed:', error);
          throw error;
        }

        // Update the local state with the new notification
        if (data && data.length > 0) {
          set((state) => ({
            notifications: [data[0], ...state.notifications],
          }));        }
        return;
      }

      // For like notifications, use the specific server-side function
      if (updatedNotification.type === 'like') {
        const { data, error } = await supabase.rpc('create_like_notification_with_mindmap_id', {
          p_user_id: updatedNotification.user_id,
          p_type: updatedNotification.type,
          p_title: updatedNotification.title,
          p_message: updatedNotification.message,
          p_related_user: updatedNotification.related_user,
          p_mindmap_id: updatedNotification.mindmap_id,
          p_comment_id: updatedNotification.comment_id
        });

        if (error) {
          console.error('Like notification creation failed:', error);
          throw error;
        }

        // Update the local state with the new notification
        if (data && data.length > 0) {
          set((state) => ({
            notifications: [data[0], ...state.notifications],
          }));
        }        return;
      }

      // Collaboration acceptance / rejection notifications WITH mindmap id so the client can navigate.
      if (updatedNotification.type === 'collaboration_accept' || updatedNotification.type === 'collaboration_reject') {
        const { data, error } = await supabase.rpc('create_notification_with_mindmap_id', {
          p_user_id: updatedNotification.user_id,
          p_type: updatedNotification.type,
          p_title: updatedNotification.title,
          p_message: updatedNotification.message,
          p_related_user: updatedNotification.related_user,
          p_mindmap_id: updatedNotification.mindmap_id,
          p_comment_id: updatedNotification.comment_id || null
        });

        if (error) {
          console.error('Collaboration notification creation failed:', error);
          throw error;
        }

        if (data && data.length > 0) {
          set((state) => ({
            notifications: [data[0], ...state.notifications],
          }));
        }
        return;
      }

      // For other notification types (comment), use the server-side function
      const { data, error } = await supabase.rpc('create_notification_with_mindmap_id', {
        p_user_id: updatedNotification.user_id,
        p_type: updatedNotification.type,
        p_title: updatedNotification.title,
        p_message: updatedNotification.message,
        p_related_user: updatedNotification.related_user,
        p_mindmap_id: updatedNotification.mindmap_id,
        p_comment_id: updatedNotification.comment_id
      });

      if (error) {
        console.error('Notification creation failed:', error);
        throw error;
      }

      // Update the local state with the new notification
      if (data && data.length > 0) {
        set((state) => ({
          notifications: [data[0], ...state.notifications],
        }));
      }
    } catch (error) {
      console.error('Error adding notification:', error);
    }
  },

  markAsRead: async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id);

      if (error) throw error;
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === id ? { ...n, read: true } : n
        ),
      }));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  },

  removeNotification: async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id);

      if (error) throw error;
      set((state) => ({
        notifications: state.notifications.filter((n) => n.id !== id),
      }));
    } catch (error) {
      console.error('Error removing notification:', error);
    }
  },

  clearAll: async (userId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;
      set({ notifications: [] });
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  },

  markAllAsRead: async (userId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', userId)
        .eq('read', false);

      if (error) throw error;
      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, read: true })),
      }));
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  },
}));