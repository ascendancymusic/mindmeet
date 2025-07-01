import { create } from 'zustand';
import { supabase } from '../supabaseClient';

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  type: 'follow' | 'like' | 'comment' | 'publish';
  related_user?: string;
  mindmap_key?: string;
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
      // For follow notifications, use the simple RPC method since they don't need mindmap_key
      if (notification.type === 'follow') {
        const { data, error } = await supabase.rpc('create_notification', {
          p_message: notification.message,
          p_related_user: notification.related_user,
          p_title: notification.title,
          p_type: notification.type,
          p_user_id: notification.user_id,
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
      if (notification.type === 'like') {
        const { data, error } = await supabase.rpc('create_like_notification_with_mindmap_key', {
          p_user_id: notification.user_id,
          p_type: notification.type,
          p_title: notification.title,
          p_message: notification.message,
          p_related_user: notification.related_user,
          p_mindmap_key: notification.mindmap_key,
          p_comment_id: notification.comment_id
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

      // For other notification types (comment), use the server-side function
      const { data, error } = await supabase.rpc('create_notification_with_mindmap_key', {
        p_user_id: notification.user_id,
        p_type: notification.type,
        p_title: notification.title,
        p_message: notification.message,
        p_related_user: notification.related_user,
        p_mindmap_key: notification.mindmap_key,
        p_comment_id: notification.comment_id
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