import { create } from 'zustand';
import { supabase } from '../supabaseClient';
import { RealtimeChannel } from '@supabase/supabase-js';
import { Node, Edge, XYPosition } from 'reactflow';

interface CollaboratorCursor {
  user_id: string;
  user_name: string;
  user_avatar?: string;
  position: XYPosition;
  last_seen: string;
  isDragging?: boolean;
}

interface LiveChange {
  id: string;
  type: 'node' | 'edge';
  action: 'create' | 'update' | 'delete';
  data: Node | Edge | { id: string };
  user_id: string;
  user_name: string;
  timestamp: string;
}

interface CollaborationState {
  // Cursor tracking
  collaboratorCursors: Record<string, CollaboratorCursor>;
  isTrackingCursor: boolean;
  currentCursorPosition: XYPosition | null;
  // Current user identity (cached to avoid race conditions with presence state lookups)
  currentUserName: string | null;
  currentUserAvatar: string | null;
  
  // Live changes
  pendingChanges: LiveChange[];
  isReceivingChanges: boolean;
  
  // Real-time connection
  collaborationChannel: RealtimeChannel | null;
  presenceChannel: RealtimeChannel | null; // Separate channel just for presence tracking
  connectedUsers: string[];
  currentMindMapId: string | null;
  currentUserId: string | null;
  
  // Actions
  initializeCollaboration: (mindMapId: string, userId: string, userName: string, userAvatar?: string) => Promise<void>;
  cleanupCollaboration: () => void;
  updateCursorPosition: (position: XYPosition) => void;
  broadcastCursorPosition: (position: XYPosition, meta?: { isDragging?: boolean }) => void;
  broadcastLiveChange: (change: Omit<LiveChange, 'timestamp' | 'user_id' | 'user_name'>) => void;
  removeCursor: (userId: string) => void;
  clearPendingChanges: () => void;
  createFullCollaborationChannel: () => Promise<void>;
}

export const useCollaborationStore = create<CollaborationState>((set, get) => ({
  // Initial state
  collaboratorCursors: {},
  isTrackingCursor: false,
  currentCursorPosition: null,
  currentUserName: null,
  currentUserAvatar: null,
  pendingChanges: [],
  isReceivingChanges: false,
  collaborationChannel: null,
  presenceChannel: null,
  connectedUsers: [],
  currentMindMapId: null,
  currentUserId: null,
  initializeCollaboration: async (mindMapId: string, userId: string, userName: string, userAvatar?: string) => {
    const state = get();
    
    // Clean up existing channels if any
    if (state.collaborationChannel) {
      await state.collaborationChannel.unsubscribe();
    }
    if (state.presenceChannel) {
      await state.presenceChannel.unsubscribe();
    }

    // Create presence-only channel first to detect other users
    const presenceChannelName = `mindmap_presence:${mindMapId}`;
    const presenceChannel = supabase.channel(presenceChannelName, {
      config: {
        presence: { key: userId }
      }
    });

    // Set up presence tracking to monitor when users join/leave
    presenceChannel.on('presence', { event: 'sync' }, () => {
      const presenceState = presenceChannel.presenceState();
      const connectedUserIds = Object.keys(presenceState);
      
      set({ connectedUsers: connectedUserIds });
      
      // If we now have 2+ users and no full collaboration channel, create it
      if (connectedUserIds.length >= 2 && !get().collaborationChannel) {
        get().createFullCollaborationChannel();
      }
    });    presenceChannel.on('presence', { event: 'join' }, () => {
      // Update connected users when someone joins
      const presenceState = presenceChannel.presenceState();
      const connectedUserIds = Object.keys(presenceState);
      set({ connectedUsers: connectedUserIds });
      
      // If we now have 2+ users and no full collaboration channel, create it
      if (connectedUserIds.length >= 2 && !get().collaborationChannel) {
        get().createFullCollaborationChannel();
      }
    });

    presenceChannel.on('presence', { event: 'leave' }, ({ key }) => {
      // Remove cursor for disconnected user
      get().removeCursor(key);
      
      // Update connected users when someone leaves
      const presenceState = presenceChannel.presenceState();
      const connectedUserIds = Object.keys(presenceState);
      set({ connectedUsers: connectedUserIds });
      
      // If we're back down to 1 user, clean up the collaboration channel
      if (connectedUserIds.length < 2 && get().collaborationChannel) {
        get().collaborationChannel?.unsubscribe();
        set({ 
          collaborationChannel: null,
          isTrackingCursor: false 
        });
      }
    });

    // Subscribe to presence channel
    await presenceChannel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        // Track presence with user info
        await presenceChannel.track({
          user_id: userId,
          user_name: userName,
          user_avatar: userAvatar,
          online_at: new Date().toISOString(),
        });
      }
    });

    set({
      presenceChannel: presenceChannel,
      currentMindMapId: mindMapId,
      currentUserId: userId,
      currentUserName: userName || null,
      currentUserAvatar: userAvatar || null,
    });
  },  cleanupCollaboration: async () => {
    const state = get();
    
    if (state.collaborationChannel) {
      await state.collaborationChannel.unsubscribe();
    }
    
    if (state.presenceChannel) {
      await state.presenceChannel.unsubscribe();
    }

    set({
      collaborationChannel: null,
      presenceChannel: null,
      collaboratorCursors: {},
      isTrackingCursor: false,
      currentCursorPosition: null,
      connectedUsers: [],
      currentMindMapId: null,
      currentUserId: null,
      currentUserName: null,
      currentUserAvatar: null,
      pendingChanges: [],
      isReceivingChanges: false,
    });
  },

  createFullCollaborationChannel: async () => {
    const state = get();
    
    if (!state.currentMindMapId || !state.currentUserId || state.collaborationChannel) {
      return; // Already have a channel or missing required info
    }

    // Create new channel for this mind map with full collaboration features
    const channelName = `mindmap_collaboration:${state.currentMindMapId}`;
    const channel = supabase.channel(channelName, {
      config: {
        broadcast: { self: false }, // Don't receive our own broadcasts
        presence: { key: state.currentUserId }
      }
    });

    // Set up cursor tracking subscription
    channel.on('broadcast', { event: 'cursor_position' }, (payload) => {
      const { position, timestamp, user_id, user_name, user_avatar, isDragging } = payload.payload;
      
      // Only show cursors from other users
      if (user_id && user_id !== state.currentUserId) {
        const cursorData: CollaboratorCursor = {
          user_id,
          user_name: user_name || 'Unknown User',
          user_avatar,
          position,
          last_seen: timestamp,
          isDragging,
        };

        set(currentState => ({
          collaboratorCursors: {
            ...currentState.collaboratorCursors,
            [user_id]: cursorData,
          }
        }));

        // Remove cursor after 3 seconds of inactivity
        setTimeout(() => {
          const currentState = get();
          const cursor = currentState.collaboratorCursors[user_id];
          if (cursor && cursor.last_seen === timestamp) {
            get().removeCursor(user_id);
          }
        }, 3000);
      }
    });

    // Set up live changes subscription
    channel.on('broadcast', { event: 'live_change' }, (payload) => {
      const change: LiveChange = payload.payload;
      
      // Only process changes from other users
      if (change.user_id !== state.currentUserId) {
        set(currentState => ({
          pendingChanges: [...currentState.pendingChanges, change],
          isReceivingChanges: true,
        }));

        // Dispatch custom event for the MindMap component to receive
        const customEvent = new CustomEvent('collaboration-live-change', {
          detail: change
        });
        window.dispatchEvent(customEvent);

        // Clear the receiving flag after a short delay
        setTimeout(() => {
          set({ isReceivingChanges: false });
        }, 200);
      }
    });    // Subscribe to the collaboration channel
    await channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        // Track presence with stored user info (avoids race condition where presenceState may not yet include user metadata)
        await channel.track({
          user_id: state.currentUserId,
          user_name: state.currentUserName || 'Unknown User',
          user_avatar: state.currentUserAvatar || undefined,
          online_at: new Date().toISOString(),
        });
      }
    });

    set({
      collaborationChannel: channel,
      isTrackingCursor: true,
    });
  },

  updateCursorPosition: (position: XYPosition) => {
    set({ currentCursorPosition: position });
  },  broadcastCursorPosition: (position: XYPosition, meta?: { isDragging?: boolean }) => {
    const { collaborationChannel, isTrackingCursor, currentUserId, currentUserName, currentUserAvatar } = get();
    if (!collaborationChannel || !isTrackingCursor || !currentUserId) return;

    const payload = {
      position,
      timestamp: new Date().toISOString(),
      user_id: currentUserId,
      user_name: currentUserName || 'Unknown User',
      user_avatar: currentUserAvatar || undefined,
      isDragging: meta?.isDragging || false,
    };

    collaborationChannel.send({
      type: 'broadcast',
      event: 'cursor_position',
      payload
    });
  },broadcastLiveChange: (change: Omit<LiveChange, 'timestamp' | 'user_id' | 'user_name'>) => {
    const { collaborationChannel, currentUserId, currentUserName } = get();
    if (!collaborationChannel || !currentUserId) return;

    const fullChange: LiveChange = {
      ...change,
      user_id: currentUserId,
      user_name: currentUserName || 'Unknown User',
      timestamp: new Date().toISOString(),
    };

    collaborationChannel.send({
      type: 'broadcast',
      event: 'live_change',
      payload: fullChange
    });
  },

  removeCursor: (userId: string) => {
    set(state => {
      const newCursors = { ...state.collaboratorCursors };
      delete newCursors[userId];
      return { collaboratorCursors: newCursors };
    });
  },

  clearPendingChanges: () => {
    set({ pendingChanges: [] });
  },
}));
