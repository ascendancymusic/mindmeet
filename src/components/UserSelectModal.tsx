import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Search, X, MessageCircle } from 'lucide-react';
import { useChatStore } from '../store/chatStore';
import { useAuthStore } from '../store/authStore';

interface User {
  id: string;
  username: string;
  full_name?: string;
  avatar_url?: string;
}

interface SelectedUser {
  id: string;
  username: string;
  full_name?: string;
  avatar_url?: string;
}

interface UserSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectUsers: (users: SelectedUser[], message: string) => void;
  initialMessage?: string;
  mode?: 'share' | 'collaborate';
  existingCollaborators?: string[]; // Array of user IDs who are already collaborators
  maxCollaborators?: number; // Maximum number of collaborators allowed
}

const UserSelectModal = ({ 
  isOpen, 
  onClose, 
  onSelectUsers, 
  initialMessage = "", 
  mode = 'share', 
  existingCollaborators = [], 
  maxCollaborators = 10 
}: UserSelectModalProps) => {
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUsers, setSelectedUsers] = useState<SelectedUser[]>([]);
  const [message, setMessage] = useState(initialMessage);

  // Get current user's ID from auth store
  const { user: currentUser } = useAuthStore();
  const currentUserId = currentUser?.id || null;

  // Reset state when modal opens and pre-select existing collaborators
  useEffect(() => {
    if (!isOpen) {
      setSelectedUsers([]);
      setMessage(initialMessage);
    }
  }, [isOpen, initialMessage]);

  // Pre-select existing collaborators when users are loaded in collaborate mode
  useEffect(() => {
    if (mode === 'collaborate' && existingCollaborators.length > 0 && users.length > 0) {
      const collaboratorUsers = users.filter(user => 
        existingCollaborators.includes(user.id)
      );
      
      setSelectedUsers(collaboratorUsers.map(user => ({
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        avatar_url: user.avatar_url
      })));
    }
  }, [mode, existingCollaborators, users]);

  // Filter users based on search query and exclude current user
  useEffect(() => {
    setFilteredUsers(
      users.filter(
        (user) =>
          // Exclude current user
          user.id !== currentUserId &&
          // Match search query
          (user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (user.full_name && user.full_name.toLowerCase().includes(searchQuery.toLowerCase())))
      )
    );
  }, [users, searchQuery, currentUserId]);

  // Fetch users when modal opens
  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);

      const fetchUsers = async () => {
        try {
          // Start with users from the chat store (which may have been pre-fetched)
          const existingUsers = useChatStore.getState().users;
          if (existingUsers.length > 0) {
            // Filter out current user
            const filteredExistingUsers = existingUsers.filter(user => user.id !== currentUserId);
            // If we already have users, show them immediately
            setUsers(filteredExistingUsers);
            setFilteredUsers(filteredExistingUsers);
            setIsLoading(false);
            return; // Use existing users, no need to fetch more
          }

          // If no existing users, fetch directly from profiles with a simple query
          // Get recent users (could be recent collaborators, followers, etc.)
          const { data: recentUsers, error } = await supabase
            .from('profiles')
            .select('id, username, full_name, avatar_url')
            .neq('id', currentUserId) // Exclude current user
            .order('id') // Simple ordering
            .limit(20); // Limit to 20 users for faster loading

          if (!error && recentUsers) {
            setUsers(recentUsers);
            setFilteredUsers(recentUsers);
          }

          setIsLoading(false);
        } catch (error) {
          console.error('Error fetching users:', error);
          setUsers([]);
          setFilteredUsers([]);
          setIsLoading(false);
        }
      };

      fetchUsers();
    } else {
      setUsers([]);
      setFilteredUsers([]);
      setIsLoading(false);
    }
  }, [isOpen, currentUserId]);

  // Handle search input
  const handleSearch = async (query: string) => {
    setSearchQuery(query);

    // If query is short, just filter existing users
    if (query.length < 2) {
      return;
    }

    // Search for additional users directly from database for speed
    try {
      const { data: searchResults, error } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url')
        .neq('id', currentUserId) // Exclude current user
        .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
        .limit(10); // Limit results for speed

      if (!error && searchResults) {
        // Combine with existing users, avoiding duplicates
        const existingIds = new Set(users.map(u => u.id));
        const newUsers = [...users];

        searchResults.forEach(user => {
          if (!existingIds.has(user.id)) {
            newUsers.push(user);
            existingIds.add(user.id);
          }
        });

        setUsers(newUsers);
      }
    } catch (error) {
      console.error('Error searching users:', error);
    }
  };

  // Toggle user selection
  const toggleUserSelection = (user: User) => {
    setSelectedUsers(prevSelected => {
      const isAlreadySelected = prevSelected.some(selected => selected.id === user.id);

      if (isAlreadySelected) {
        // Remove user if already selected
        return prevSelected.filter(selected => selected.id !== user.id);
      } else {
        // Check if adding this user would exceed the limit
        if (prevSelected.length >= maxCollaborators) {
          console.log(`Cannot add more collaborators. Limit is ${maxCollaborators}.`);
          return prevSelected; // Don't add the user
        }

        // Add user if not selected and under the limit
        return [...prevSelected, {
          id: user.id,
          username: user.username,
          full_name: user.full_name,
          avatar_url: user.avatar_url
        }];
      }
    });
  };

  // Handle form submission
  const handleSubmit = () => {
    // For collaborate mode, allow submitting with 0 users (means removing all collaborators)
    // For share mode, require at least 1 user
    if (mode === 'share' && selectedUsers.length === 0) {
      return;
    }
    
    onSelectUsers(selectedUsers, message);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-xl rounded-2xl p-6 mx-auto shadow-2xl border border-slate-700/30 overflow-hidden">
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                {mode === 'collaborate' ? 'Add Collaborators' : 'Share to Chat'}
              </h2>
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 rounded-lg transition-all duration-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Custom message input - only show in share mode */}
            {mode === 'share' && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-300 mb-3">Message</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Add a message (optional)..."
                  className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 text-slate-200 placeholder:text-slate-400 resize-none transition-all duration-200"
                  rows={2}
                />
              </div>
            )}

            {/* Collaborator limit indicator - only show in collaborate mode */}
            {mode === 'collaborate' && (
              <div className="mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Collaborators</span>
                  <span className={`font-medium ${
                    selectedUsers.length >= maxCollaborators 
                      ? 'text-orange-400' 
                      : 'text-slate-300'
                  }`}>
                    {selectedUsers.length} / {maxCollaborators}
                  </span>
                </div>
                {selectedUsers.length >= maxCollaborators && (
                  <p className="text-xs text-orange-400 mt-1">
                    Maximum collaborators reached
                  </p>
                )}
              </div>
            )}

            {/* Selected users display */}
            {selectedUsers.length > 0 && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-300 mb-3">
                  {mode === 'collaborate' ? 'Selected Collaborators' : 'Selected Users'} ({selectedUsers.length})
                </label>
                <div className="flex flex-wrap gap-2 p-3 bg-slate-800/50 rounded-xl border border-slate-700/50 min-h-[48px]">
                  {selectedUsers.map(user => (
                    <div
                      key={user.id}
                      className="flex items-center gap-2 bg-gradient-to-r from-blue-600/80 to-blue-700/80 text-white text-sm py-1.5 px-3 rounded-lg border border-blue-500/30 shadow-sm"
                    >
                      <span className="font-medium">{user.username}</span>
                      <button
                        onClick={() => toggleUserSelection(user)}
                        className="text-white/80 hover:text-white hover:bg-white/10 rounded-full p-0.5 transition-all duration-200"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 text-slate-200 placeholder:text-slate-400 transition-all duration-200"
                />
              </div>
            </div>
          </div>

          <div>
            {isLoading ? (
              <div className="max-h-[40vh] overflow-y-auto mb-6">
                <div className="space-y-3">
                  {/* Skeleton loading for user list */}
                  {[...Array(5)].map((_, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/30 animate-pulse border border-slate-700/30">
                      <div className="w-12 h-12 rounded-full bg-slate-700/50"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-slate-700/50 rounded-lg w-24 mb-2"></div>
                        <div className="h-3 bg-slate-700/50 rounded-lg w-16"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : filteredUsers.length > 0 ? (
              <div className="max-h-[40vh] overflow-y-auto mb-6">
                <ul className="space-y-2">
                  {filteredUsers.map((user) => {
                    const isSelected = selectedUsers.some(selected => selected.id === user.id);
                    const isAtLimit = !isSelected && selectedUsers.length >= maxCollaborators;
                    const canSelect = !isAtLimit;
                    
                    return (
                      <li key={user.id}>
                        <button
                          onClick={() => canSelect ? toggleUserSelection(user) : undefined}
                          disabled={!canSelect}
                          className={`w-full flex items-center gap-3 p-3 rounded-xl text-slate-200 transition-all duration-200 border ${
                            !canSelect
                              ? 'bg-slate-800/20 border-slate-700/20 opacity-50 cursor-not-allowed'
                              : isSelected 
                                ? 'bg-slate-700/50 border-blue-500/50 shadow-lg shadow-blue-500/10 hover:bg-slate-700/70' 
                                : 'bg-slate-800/30 border-slate-700/30 hover:border-slate-600/50 hover:bg-slate-700/50'
                          }`}
                        >
                          <div className="relative">
                            <div className="w-12 h-12 rounded-full bg-slate-700/50 flex items-center justify-center overflow-hidden ring-2 ring-slate-600/30">
                              {user.avatar_url ? (
                                <img
                                  src={user.avatar_url}
                                  alt={user.username}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span className="text-lg text-slate-300 font-medium bg-gradient-to-br from-slate-600 to-slate-700 w-full h-full flex items-center justify-center">
                                  {user.username.charAt(0).toUpperCase()}
                                </span>
                              )}
                            </div>
                            {isSelected && (
                              <div className="absolute -top-1 -right-1 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full w-6 h-6 flex items-center justify-center border-2 border-slate-800 shadow-lg">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0 text-left">
                            <p className="font-semibold truncate text-left text-slate-200">
                              {user.full_name || user.username}
                            </p>
                            <p className="text-sm text-slate-400 truncate text-left">@{user.username}</p>
                          </div>
                          {mode === 'share' && <MessageCircle className="w-5 h-5 text-slate-400" />}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : (
              <div className="text-center py-8 mb-6">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-800/50 flex items-center justify-center">
                  <Search className="w-8 h-8 text-slate-500" />
                </div>
                <p className="text-slate-400 font-medium">No users found</p>
                <p className="text-slate-500 text-sm mt-1">Try searching with a different term</p>
              </div>
            )}

            {/* Submit button */}
            <button
              onClick={handleSubmit}
              disabled={mode === 'share' && selectedUsers.length === 0}
              className={`w-full py-3 px-6 rounded-xl text-white font-semibold transition-all duration-200 shadow-lg ${
                mode === 'share' && selectedUsers.length === 0
                  ? 'bg-slate-700/50 border border-slate-600/30 cursor-not-allowed opacity-50'
                  : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 border border-blue-500/30 hover:border-blue-400/50'
              }`}
            >
              {mode === 'collaborate' 
                ? 'Update Collaborators'
                : (selectedUsers.length > 1 ? 'Send separately' : 'Send')
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserSelectModal;
