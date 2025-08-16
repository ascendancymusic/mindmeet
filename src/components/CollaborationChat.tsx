import React, { useState, useRef, useEffect } from 'react';
import { X, Send, MessageCircle } from 'lucide-react';
import { supabase } from '../supabaseClient';

interface ChatMessage {
  id: string;
  user: string;
  message: string;
  timestamp: Date;
  avatar?: string;
}

interface UserProfile {
  username: string;
  avatar_url?: string;
}

interface CollaborationChatProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserName: string;
  mindMapKey: string; // Add mindMapKey for unique channel
}

export const CollaborationChat: React.FC<CollaborationChatProps> = ({
  isOpen,
  onClose,
  currentUserName,
  mindMapKey
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [userProfiles, setUserProfiles] = useState<Record<string, UserProfile>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Fetch user profile from database
  const fetchUserProfile = async (username: string): Promise<UserProfile | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('username', username)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  };

  // Get avatar for a user (from cache or fetch from database)
  const getUserAvatar = async (username: string): Promise<string | undefined> => {
    // Check if we already have the profile cached
    if (userProfiles[username]) {
      return userProfiles[username].avatar_url;
    }

    // Fetch from database
    const profile = await fetchUserProfile(username);
    if (profile) {
      setUserProfiles(prev => ({
        ...prev,
        [username]: profile
      }));
      return profile.avatar_url;
    }

    return undefined;
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Clean up messages older than 24 hours
  useEffect(() => {
    const cleanupOldMessages = () => {
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago
      
      setMessages(prev => prev.filter(message => message.timestamp > oneDayAgo));
    };

    // Clean up immediately on mount
    cleanupOldMessages();

    // Set up interval to clean up every hour
    const interval = setInterval(cleanupOldMessages, 60 * 60 * 1000); // Every hour

    return () => clearInterval(interval);
  }, []);

  // Set up real-time messaging
  useEffect(() => {
    if (!isOpen || !mindMapKey) return;

    const channel = supabase.channel(`chat:${mindMapKey}`, {
      config: {
        broadcast: { self: false }
      }
    });

    // Listen for incoming messages
    channel.on('broadcast', { event: 'chat_message' }, async (payload) => {
      const message = payload.payload as ChatMessage;
      // Convert timestamp string back to Date object
      message.timestamp = new Date(message.timestamp);
      
      // Only add message if it's from someone else (not current user)
      if (message.user !== currentUserName) {
        // Fetch the correct avatar from database
        const avatar = await getUserAvatar(message.user);
        message.avatar = avatar;
        
        setMessages(prev => [...prev, message]);
      }
    });

    // Subscribe to the channel
    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOpen, mindMapKey, currentUserName]);

  const handleSendMessage = async () => {
    if (newMessage.trim()) {
      // Get the correct avatar from database for current user
      const avatar = await getUserAvatar(currentUserName);
      
      const message: ChatMessage = {
        id: Date.now().toString(),
        user: currentUserName,
        message: newMessage.trim(),
        timestamp: new Date(),
        avatar: avatar
      };
      
      // Add message to local state immediately
      setMessages(prev => [...prev, message]);
      setNewMessage('');

      // Broadcast message to other users
      const channel = supabase.channel(`chat:${mindMapKey}`);
      await channel.send({
        type: 'broadcast',
        event: 'chat_message',
        payload: message
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="absolute top-full mt-2 left-0 w-72 bg-slate-800 border border-slate-700 rounded-lg shadow-lg z-50">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-blue-400" />
          <span className="font-medium text-slate-100">Live Chat</span>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-300"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="h-64 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center text-slate-400 text-sm py-8">
            Start a conversation with your collaborators!
          </div>
        ) : (
          messages.map((message) => (
            <div key={message.id} className="flex gap-2">
              <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
                {message.avatar ? (
                  <img 
                    src={message.avatar} 
                    alt={message.user}
                    className="w-6 h-6 rounded-full"
                  />
                ) : (
                  message.user.charAt(0).toUpperCase()
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="font-medium text-sm text-slate-100">
                    {message.user}
                  </span>
                  <span className="text-xs text-slate-400">
                    {message.timestamp.toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </span>
                </div>
                <p className="text-sm text-slate-300 break-words">
                  {message.message}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-slate-700">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className="flex-1 px-3 py-2 text-sm border border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-700 text-slate-100 placeholder-slate-400"
          />
          <button
            onClick={handleSendMessage}
            disabled={!newMessage.trim()}
            className="px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Session only - messages will be lost on refresh
        </p>
      </div>
    </div>
  );
};
