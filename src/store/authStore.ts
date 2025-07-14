import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { supabase } from '../supabaseClient';
import { createClient } from '@supabase/supabase-js';

interface User {
  id: string;
  username: string;
  avatar_url?: string;
  email?: string;
  full_name?: string;
}

interface AuthState {
  user: User | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  error: string | null;
  avatarUrl: string | null;
  forceLoggedOut: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setAvatarUrl: (url: string | null) => void;
  logout: () => void;
  validateSession: () => Promise<boolean>;
  deleteUserAccount: () => Promise<void>;
}

// Create the store with session validation
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isLoggedIn: false,
      isLoading: false,
      error: null,
      avatarUrl: null,
      forceLoggedOut: false,
      setUser: (user) =>
        set((state) => ({
          user,
          isLoggedIn: !!user,
          error: null,
          avatarUrl: user?.avatar_url || state.avatarUrl,
          forceLoggedOut: false,
        })),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
      setAvatarUrl: (url) => set({ avatarUrl: url }),
      validateSession: async () => {
        try {
          // Get the current state
          const state = get();

          // If not logged in, no need to validate
          if (!state.isLoggedIn || !state.user) {
            return true;
          }

          // Check if there's an active session with Supabase
          const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

          if (sessionError) {
            console.error('Session validation error:', sessionError);
            // If there's an error getting the session, log the user out
            get().logout();
            return false;
          }

          // If no active session, log the user out
          if (!sessionData.session) {
            console.warn('No active session found during validation');
            get().logout();
            return false;
          }

          // Verify that the stored user ID matches the session user ID
          if (state.user.id !== sessionData.session.user.id) {
            console.warn('User ID mismatch during session validation');
            // If the IDs don't match, log the user out
            get().logout();
            return false;
          }

          return true;
        } catch (err) {
          console.error('Error during session validation:', err);
          // On any error, log the user out for safety
          get().logout();
          return false;
        }
      },
      logout: async () => {
        try {
          const currentUser = get().user;

          // Mark user as offline before logging out
          if (currentUser?.id) {
            // Set last_seen to a time that's older than our online threshold (3 minutes)
            const offlineTime = new Date(Date.now() - 2 * 60 * 1000); // 2 minutes ago
            await supabase
              .from('profiles')
              .update({ last_seen: offlineTime.toISOString() })
              .eq('id', currentUser.id);
          }

          // Sign out from Supabase first
          await supabase.auth.signOut();

          // Clear all auth state
          set({ user: null, isLoggedIn: false, error: null, avatarUrl: null, forceLoggedOut: false });

          // Ensure localStorage is cleared (Zustand persist should handle this, but being explicit)
          localStorage.removeItem('auth-storage');
        } catch (err) {
          console.error('Error during logout:', err);
          set({ error: 'Failed to log out. Please try again.' });
        }
      },
      deleteUserAccount: async () => {
        try {
          // First validate the session to ensure we're operating on the correct user
          const isValid = await get().validateSession();
          if (!isValid) {
            set({ error: 'Invalid session. Please log in again.' });
            return;
          }

          set({ isLoading: true });

          // Retrieve the current user
          const { data: user, error: userError } = await supabase.auth.getUser();
          if (userError || !user) {
            console.error('Error retrieving user:', userError?.message || 'User not found');
            set({ error: userError?.message || 'User not found' });
            return;
          }

          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
          const serviceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '';

          if (!supabaseUrl || !serviceRoleKey) {
            throw new Error('Supabase URL or Service Role Key is not defined in environment variables.');
          }

          // Use the Supabase Admin API to delete the user
          const adminClient = createClient(supabaseUrl, serviceRoleKey);

          const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.user.id);
          if (deleteError) {
            console.error('Error deleting user:', deleteError.message);
            set({ error: deleteError.message });
            return;
          }

          console.log('User deleted successfully');

          // Clear all localStorage data first
          localStorage.removeItem('auth-storage');
          localStorage.removeItem('supabase.auth.token');

          // Sign out from Supabase to clear any remaining session
          await supabase.auth.signOut();

          // Clear all auth state immediately and force logged out state
          set({ user: null, isLoggedIn: false, error: null, avatarUrl: null, isLoading: false, forceLoggedOut: true });

          // Force a complete page reload to ensure all React state is cleared
          window.location.href = '/';

          // As a backup, also try to reload after a short delay
          setTimeout(() => {
            window.location.reload();
          }, 500);
        } catch (err) {
          console.error('Unexpected error:', err);
          set({ error: 'An unexpected error occurred.' });
        } finally {
          set({ isLoading: false });
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, isLoggedIn: state.isLoggedIn, forceLoggedOut: state.forceLoggedOut }),
      // Add a custom storage handler to prevent direct manipulation
      storage: createJSONStorage(() => ({
        getItem: (name) => {
          const value = localStorage.getItem(name);
          return value ? JSON.parse(value) : null;
        },
        setItem: (name, value) => {
          localStorage.setItem(name, JSON.stringify(value));
        },
        removeItem: (name) => {
          localStorage.removeItem(name);
        },
      })),
    }
  )
);
