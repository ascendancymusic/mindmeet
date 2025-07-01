import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { UserPlus, UserMinus, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useNotificationStore } from '../store/notificationStore';
import eventEmitter from '../services/eventService';

interface User {
  id: string;
  username: string;
  full_name?: string;
  avatar_url?: string;
  followed_by?: string[];
  followers?: number;
}

interface UserListModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  userIds: string[];
}

const UserListModal = ({ isOpen, onClose, title, userIds }: UserListModalProps) => {  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserFollowing, setCurrentUserFollowing] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch current user's ID and following list when modal opens
  useEffect(() => {
    if (!isOpen) return;

    const fetchCurrentUser = async () => {
      const { data: user } = await supabase.auth.getUser();
      if (user?.user?.id) {
        setCurrentUserId(user.user.id);

        const { data: profile, error } = await supabase
          .from('profiles')
          .select('following')
          .eq('id', user.user.id)
          .single();

        if (!error && profile) {
          setCurrentUserFollowing(profile.following || []);
        } else {
          console.error('Error fetching current user profile:', error);
          setCurrentUserFollowing([]);
        }
      }
    };
    fetchCurrentUser();
  }, [isOpen]);

  // Refresh following list when modal is reopened
  useEffect(() => {
    if (isOpen && currentUserId) {
      const refreshFollowingList = async () => {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('following')
          .eq('id', currentUserId)
          .single();

        if (!error && profile) {
          setCurrentUserFollowing(profile.following || []);
        }
      };
      refreshFollowingList();
    }  }, [isOpen, currentUserId]);

  // Fetch the list of users when modal is open or userIds change
  useEffect(() => {
    if (isOpen) {
      // Set loading immediately when modal opens
      setIsLoading(true);

      if (Array.isArray(userIds) && userIds.length > 0) {
        const fetchUsers = async () => {
          const { data, error } = await supabase
            .from('profiles')
            .select('id, username, full_name, avatar_url')
            .in('id', userIds);

          if (error) {
            console.error('Error fetching users:', error);
            setUsers([]);          } else {
            setUsers(data || []);
          }
          setIsLoading(false);
        };
        fetchUsers();
      } else {
        setUsers([]);
        setIsLoading(false);
      }
    } else {
      setUsers([]);
      setIsLoading(false);
    }
  }, [isOpen, userIds]);

  // Filter users based on search query
  useEffect(() => {
    const lowercasedQuery = searchQuery.toLowerCase();
    setFilteredUsers(
      users.filter(
        (user) =>
          user.username.toLowerCase().includes(lowercasedQuery) ||
          user.full_name?.toLowerCase().includes(lowercasedQuery)
      )
    );
  }, [searchQuery, users]);

  // Handle follow/unfollow toggle
  const handleFollowToggle = async (userId: string) => {
    if (!currentUserId) return;

    const isFollowing = currentUserFollowing.includes(userId);

    // Optimistically update UI
    setCurrentUserFollowing((prev) =>
      isFollowing ? prev.filter((id) => id !== userId) : [...prev, userId]
    );

    // Emit event for Profile component to update following count
    eventEmitter.emit('followToggle', {
      action: isFollowing ? 'unfollow' : 'follow',
      targetUserId: userId
    });

    try {
      const updatedFollowing = isFollowing
        ? currentUserFollowing.filter((id) => id !== userId)
        : [...currentUserFollowing, userId];

      const { error } = await supabase
        .from('profiles')
        .update({ following: updatedFollowing })
        .eq('id', currentUserId);

      if (error) throw error;

      const { data: user, error: userError } = await supabase
        .from('profiles')
        .select('followed_by, username, followers')
        .eq('id', userId)
        .single();

      if (userError) throw userError;

      // Update followed_by array
      const updatedFollowedBy = isFollowing
        ? (user.followed_by || []).filter((id: string) => id !== currentUserId)
        : [...(user.followed_by || []), currentUserId];

      // Update followers count
      const updatedFollowers = isFollowing
        ? Math.max((user.followers || 0) - 1, 0) // Ensure it doesn't go below 0
        : (user.followers || 0) + 1;

      const { error: followError } = await supabase
        .from('profiles')
        .update({
          followed_by: updatedFollowedBy,
          followers: updatedFollowers
        })
        .eq('id', userId);

      if (followError) throw followError;

      // Get current user's username for notification
      const { data: currentUserData } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', currentUserId)
        .single();

      // Send notification for follow/unfollow
      if (currentUserData?.username && userId !== currentUserId) {
        await useNotificationStore.getState().addNotification({
          user_id: userId,
          type: 'follow',
          title: isFollowing ? 'Lost Follower' : 'New Follower',
          message: isFollowing
            ? `@${currentUserData.username} unfollowed you`
            : `@${currentUserData.username} started following you`,
          related_user: currentUserId
        });
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
      // Revert UI changes on failure
      setCurrentUserFollowing((prev) =>
        isFollowing ? [...prev, userId] : prev.filter((id) => id !== userId)
      );

      // Emit revert event for Profile component
      eventEmitter.emit('followToggle', {
        action: isFollowing ? 'follow' : 'unfollow', // Reverse the action for revert
        targetUserId: userId
      });
    }
  };  return (
    <div className={`fixed inset-0 z-50 transition-all duration-300 ${
      isOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
    }`}>
      <div 
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm transition-all duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`} 
        onClick={onClose} 
      />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div className={`max-w-4xl w-full bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-xl rounded-2xl p-6 mx-auto shadow-2xl border border-slate-700/30 overflow-hidden transform transition-all duration-300 ${
          isOpen ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-8 opacity-0 scale-95'
        }`}>
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">{title}</h2>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 rounded-lg transition-all duration-200"
            >
              ✕
            </button>
          </div>          {/* Search */}
          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-800/50 border border-slate-700/50 text-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-200 placeholder:text-slate-400"
            />
          </div>{/* Content */}
          <div className="transition-all duration-300">
            {isLoading ? (
              <div className="max-h-[70vh] overflow-y-auto">
                <div className="space-y-3">
                  {/* Skeleton loading for user list */}
                  {[...Array(5)].map((_, index) => (
                    <div 
                      key={index} 
                      className="flex items-center space-x-4 py-4 px-3 rounded-xl bg-slate-800/30 animate-pulse border border-slate-700/30"
                    >
                      <div className="w-12 h-12 rounded-full bg-slate-700/50"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-slate-700/50 rounded-lg w-24 mb-2 animate-pulse"></div>
                        <div className="h-3 bg-slate-700/50 rounded-lg w-16 animate-pulse"></div>
                      </div>
                      <div className="w-20 h-8 bg-slate-700/50 rounded-lg animate-pulse"></div>
                    </div>
                  ))}
                </div>
              </div>
            ) : filteredUsers.length > 0 ? (
              <ul className="max-h-[70vh] overflow-y-auto space-y-2">
                {filteredUsers.map((user) => (
                  <li 
                    key={user.id} 
                    className="flex items-center space-x-4 py-4 px-3 hover:bg-slate-700/50 rounded-xl transition-all duration-200 border border-slate-800/50 hover:border-slate-600/50"
                  >
                    <Link
                      to={`/${user.username}`}
                      className="flex items-center space-x-4 flex-1 cursor-pointer transition-colors group"
                    >
                      {user.avatar_url ? (
                        <img
                          src={user.avatar_url}
                          alt={user.username}
                          className="w-12 h-12 rounded-full border-2 border-slate-700/50 group-hover:border-slate-600/50 transition-all duration-200"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-slate-200 text-lg font-bold border-2 border-slate-700/50 group-hover:border-slate-600/50 transition-all duration-200">
                          {user.username.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-200 text-base font-semibold truncate group-hover:text-white transition-colors">
                          {user.full_name || user.username}
                        </p>
                        <p className="text-slate-400 text-sm truncate">@{user.username}</p>
                      </div>
                    </Link>
                    {user.id !== currentUserId && (
                      <button
                        onClick={() => handleFollowToggle(user.id)}
                        className={`px-4 py-2 text-sm rounded-lg flex items-center gap-2 font-medium transition-all duration-200 shadow-sm ${
                          currentUserFollowing.includes(user.id)
                            ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 border border-red-400/30 hover:border-red-300/50'
                            : 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 border border-purple-500/30 hover:border-purple-400/50'
                        } text-white`}
                      >
                        {currentUserFollowing.includes(user.id) ? (
                          <>
                            <UserMinus className="w-4 h-4" />
                            Unfollow
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-4 h-4" />
                            Follow
                          </>
                        )}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-800/50 flex items-center justify-center">
                  <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <p className="text-slate-400 font-medium mb-1">No users found</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>  );
};

export default UserListModal;