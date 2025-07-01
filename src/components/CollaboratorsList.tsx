import React, { useState, useEffect } from 'react';
import { useCollaborationStore } from '../store/collaborationStore';
import { supabase } from '../supabaseClient';
import { Users, ChevronUp } from 'lucide-react';

interface CollaboratorProfile {
  id: string;
  username: string;
  avatar_url?: string;
  isOnline?: boolean;
}

interface CollaboratorsListProps {
  mindmapId: string;
  collaboratorIds: string[];
  creatorId: string;
  className?: string;
}

export const CollaboratorsList: React.FC<CollaboratorsListProps> = ({
  mindmapId: _mindmapId,
  collaboratorIds,
  creatorId,
  className = ""
}) => {
  const { connectedUsers } = useCollaborationStore();
  const [collaboratorProfiles, setCollaboratorProfiles] = useState<CollaboratorProfile[]>([]);
  const [creatorProfile, setCreatorProfile] = useState<CollaboratorProfile | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch collaborator profiles
  useEffect(() => {
    const fetchCollaboratorProfiles = async () => {
      if (!collaboratorIds?.length && !creatorId) {
        setIsLoading(false);
        return;
      }

      try {
        // Get all user IDs to fetch (creator + collaborators)
        const allUserIds = [creatorId, ...(collaboratorIds || [])].filter(Boolean);
        
        if (allUserIds.length === 0) {
          setIsLoading(false);
          return;
        }

        const { data: profiles, error } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .in('id', allUserIds);

        if (error) {
          console.error('Error fetching collaborator profiles:', error);
          setIsLoading(false);
          return;
        }

        if (profiles) {
          // Separate creator from collaborators
          const creator = profiles.find(p => p.id === creatorId);
          const collabs = profiles.filter(p => p.id !== creatorId);

          if (creator) {
            setCreatorProfile({
              id: creator.id,
              username: creator.username,
              avatar_url: creator.avatar_url,
              isOnline: connectedUsers.includes(creator.id)
            });
          }

          setCollaboratorProfiles(collabs.map(profile => ({
            id: profile.id,
            username: profile.username,
            avatar_url: profile.avatar_url,
            isOnline: connectedUsers.includes(profile.id)
          })));
        }
      } catch (error) {
        console.error('Error fetching collaborator profiles:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCollaboratorProfiles();
  }, [collaboratorIds, creatorId, connectedUsers]);
  // Update online status when connected users change
  useEffect(() => {
    setCreatorProfile(prev => prev ? { ...prev, isOnline: connectedUsers.includes(prev.id) } : null);
    setCollaboratorProfiles(prev => 
      prev.map(collab => ({ ...collab, isOnline: connectedUsers.includes(collab.id) }))
    );
  }, [connectedUsers]);

  const totalCollaborators = (collaboratorProfiles?.length || 0) + (creatorProfile ? 1 : 0);
  const onlineCount = (collaboratorProfiles?.filter(c => c.isOnline).length || 0) + 
                     (creatorProfile?.isOnline ? 1 : 0);

  if (isLoading) {
    return (
      <div className={`bg-gray-800/50 backdrop-blur-sm rounded-full w-10 h-10 flex items-center justify-center ${className}`}>
        <Users className="w-4 h-4 text-gray-400 animate-pulse" />
      </div>
    );
  }

  // Don't show if there are no collaborators (only creator)
  if (totalCollaborators <= 1) {
    return null;
  }

  return (
    <div className={`relative ${className}`}>
      {!isExpanded ? (
        // Collapsed state - just an icon with online indicator
        <div 
          className="bg-gray-800/50 backdrop-blur-sm rounded-full w-10 h-10 flex items-center justify-center cursor-pointer hover:bg-gray-700/50 transition-colors border border-gray-700"
          onClick={() => setIsExpanded(true)}
          title={`${totalCollaborators} collaborators, ${onlineCount} online`}
        >
          <div className="relative">
            <Users className="w-4 h-4 text-gray-300" />
            {onlineCount > 0 && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border border-gray-800 flex items-center justify-center">
                <span className="text-xs text-white font-bold" style={{ fontSize: '8px' }}>
                  {onlineCount}
                </span>
              </div>
            )}
          </div>
        </div>
      ) : (
        // Expanded state - detailed view
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 overflow-hidden min-w-[280px]">
          {/* Header */}
          <div 
            className="p-3 cursor-pointer hover:bg-gray-700/30 transition-colors border-b border-gray-700"
            onClick={() => setIsExpanded(false)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-200">
                  Collaborators ({totalCollaborators})
                </span>
                {onlineCount > 0 && (
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-xs text-green-400">{onlineCount} online</span>
                  </div>
                )}
              </div>
              <ChevronUp className="w-4 h-4 text-gray-400" />
            </div>
          </div>

          {/* Content */}
          <div className="p-3 space-y-3">
            {/* Creator */}
            {creatorProfile && (
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden">
                    {creatorProfile.avatar_url ? (
                      <img
                        src={creatorProfile.avatar_url}
                        alt={creatorProfile.username}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-sm text-gray-300 font-medium">
                        {creatorProfile.username.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  {creatorProfile.isOnline && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-800"></div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-200 truncate">
                      @{creatorProfile.username}
                    </span>
                    <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">
                      Creator
                    </span>
                  </div>
                  <span className="text-xs text-gray-400">
                    {creatorProfile.isOnline ? 'Online' : 'Offline'}
                  </span>
                </div>
              </div>
            )}

            {/* Collaborators */}
            {collaboratorProfiles.map((collaborator) => (
              <div key={collaborator.id} className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden">
                    {collaborator.avatar_url ? (
                      <img
                        src={collaborator.avatar_url}
                        alt={collaborator.username}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-sm text-gray-300 font-medium">
                        {collaborator.username.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  {collaborator.isOnline && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-800"></div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-200 truncate">
                      @{collaborator.username}
                    </span>
                    <span className="text-xs bg-gray-600 text-gray-300 px-2 py-0.5 rounded-full">
                      Collaborator
                    </span>
                  </div>
                  <span className="text-xs text-gray-400">
                    {collaborator.isOnline ? 'Online' : 'Offline'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
