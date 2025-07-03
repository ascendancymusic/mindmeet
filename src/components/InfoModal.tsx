import React, { useState, useEffect } from "react";
import { Clock, Eye, EyeOff, Link, X, Users, User, FileText, BarChart3, Calendar } from "lucide-react";
import { useCollaborationStore } from "../store/collaborationStore";
import { formatDateSmart } from "../utils/dateUtils";
import { supabase } from "../supabaseClient";

// Enhanced cache with expiration
interface CachedAvatar {
  url: string;
  expires: number;
}

interface CollaboratorProfile {
  id: string;
  username: string;
  avatar_url?: string;
  isOnline?: boolean;
}

const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes in milliseconds
const avatarCache = new Map<string, CachedAvatar>();

// Utility function to clean expired cache entries
const cleanExpiredCache = () => {
  const now = Date.now();
  for (const [key, value] of avatarCache.entries()) {
    if (value.expires < now) {
      avatarCache.delete(key);
    }
  }
};

// Utility function to get cached avatar
const getCachedAvatar = (username: string): string | null => {
  const cached = avatarCache.get(username);
  if (!cached) return null;

  if (cached.expires < Date.now()) {
    avatarCache.delete(username);
    return null;
  }

  return cached.url;
};

interface InfoModalProps {
  mindmap: {
    username: string;
    displayName: string;
    name: string;
    id: string;
    updatedAt: string;
    description: string;
    visibility?: 'public' | 'private' | 'linkOnly';
    avatar_url?: string | null; // Add avatar_url to the interface
    collaborators?: string[]; // Add collaborators array
    published_at?: string | null; // Add published_at to the interface
    stats?: {
      nodes?: number;
      edges?: number;
      likes?: number;
      comments?: number;
      saves?: number;
    };
  };
  onClose: () => void;
  hideVisibility?: boolean; // Add prop to conditionally hide visibility section
}

const InfoModal: React.FC<InfoModalProps> = ({ mindmap, onClose, hideVisibility = false }) => {
  const { connectedUsers } = useCollaborationStore();
  const [collaboratorProfiles, setCollaboratorProfiles] = useState<CollaboratorProfile[]>([]);
  const [isLoadingCollaborators, setIsLoadingCollaborators] = useState(false);

  // Clean expired cache entries and update cache with new avatar if available
  React.useEffect(() => {
    cleanExpiredCache();
    // Always update cache with current avatar if available
    if (mindmap.avatar_url) {
      avatarCache.set(mindmap.username, {
        url: mindmap.avatar_url,
        expires: Date.now() + CACHE_DURATION
      });
    }
  }, [mindmap.username, mindmap.avatar_url]);

  // Fetch collaborator profiles
  useEffect(() => {
    const fetchCollaboratorProfiles = async () => {
      if (!mindmap.collaborators || mindmap.collaborators.length === 0) {
        setCollaboratorProfiles([]);
        return;
      }

      setIsLoadingCollaborators(true);
      try {
        const { data: profiles, error } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .in('id', mindmap.collaborators);

        if (error) {
          console.error('Error fetching collaborator profiles:', error);
          return;
        }

        if (profiles) {
          setCollaboratorProfiles(profiles.map(profile => ({
            id: profile.id,
            username: profile.username,
            avatar_url: profile.avatar_url,
            isOnline: connectedUsers.includes(profile.id)
          })));
        }
      } catch (error) {
        console.error('Error fetching collaborator profiles:', error);
      } finally {
        setIsLoadingCollaborators(false);
      }
    };

    fetchCollaboratorProfiles();
  }, [mindmap.collaborators, connectedUsers]);

  // Update online status when connected users change
  useEffect(() => {
    setCollaboratorProfiles(prev => 
      prev.map(collab => ({ ...collab, isOnline: connectedUsers.includes(collab.id) }))
    );
  }, [connectedUsers]);

  // Get avatar from cache or directly from props
  const getAvatar = () => {
    const cached = getCachedAvatar(mindmap.username);
    return cached || mindmap.avatar_url || null;
  };
  const getVisibilityIcon = () => {
    switch (mindmap.visibility) {
      case 'public':
        return <Eye className="w-5 h-5 text-blue-400" />;
      case 'private':
        return <EyeOff className="w-5 h-5 text-slate-400" />;
      case 'linkOnly':
        return <Link className="w-5 h-5 text-emerald-400" />;
      default:
        return <Eye className="w-5 h-5 text-blue-400" />;
    }
  };

  const getVisibilityText = () => {
    switch (mindmap.visibility) {
      case 'public':
        return 'Public - Anyone can view this mindmap';
      case 'private':
        return 'Private - Only you can view this mindmap';
      case 'linkOnly':
        return 'Link Only - Only people with the link can view this mindmap';
      default:
        return 'Public - Anyone can view this mindmap';
    }
  };
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={onClose}>
      <style>{`
        @media (max-height: 1090px) {
          .compact-modal-header {
            padding: 1rem !important;
          }
          .compact-modal-content {
            padding: 1rem !important;
            max-height: 65vh !important;
            overflow-y: auto !important;
          }
          .compact-modal-title {
            font-size: 1.125rem !important;
            margin-bottom: 0.75rem !important;
          }
          .compact-modal-section {
            margin-bottom: 1rem !important;
          }
          .compact-modal-section:last-child {
            margin-bottom: 0 !important;
          }
          .compact-section-title {
            font-size: 0.75rem !important;
            margin-bottom: 0.5rem !important;
          }
          .compact-creator-card {
            padding: 0.75rem !important;
          }
          .compact-avatar {
            width: 2.5rem !important;
            height: 2.5rem !important;
          }
          .compact-collaborator {
            padding: 0.5rem !important;
          }
          .compact-collaborator-avatar {
            width: 1.75rem !important;
            height: 1.75rem !important;
          }
          .compact-description {
            padding: 0.75rem !important;
          }
          .compact-stats-grid {
            gap: 0.5rem !important;
          }
          .compact-stat-card {
            padding: 0.75rem !important;
          }
          .compact-stat-value {
            font-size: 1.125rem !important;
            margin-bottom: 0.25rem !important;
          }
          .compact-stat-label {
            font-size: 0.625rem !important;
          }
        }
      `}</style>
      <div
        className="bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-xl rounded-2xl max-w-lg w-full shadow-2xl border border-slate-700/30 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        style={{ maxHeight: '90vh' }}
      >        {/* Enhanced Header */}
        <div className="p-6 border-b border-slate-700/50 compact-modal-header">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent compact-modal-title">{mindmap.name}</h2>
            <button 
              onClick={onClose} 
              className="p-2 text-slate-400 hover:text-slate-300 hover:bg-slate-700/50 rounded-xl transition-all duration-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>          {/* Enhanced Date information */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-slate-300 text-sm bg-slate-800/30 rounded-lg px-3 py-2">
              <Clock className="w-4 h-4 text-blue-400" />
              <span className="font-medium text-slate-400">Edited:</span>
              <span className="text-slate-200">{(() => {
                try {
                  const date = new Date(mindmap.updatedAt);
                  if (isNaN(date.getTime())) {
                    return 'Unknown';
                  }
                  return formatDateSmart(date);
                } catch (error) {
                  console.error('Error formatting date:', error);
                  return 'Unknown';
                }
              })()}</span>
            </div>
            
            {mindmap.published_at && (
              <div className="flex items-center gap-2 text-slate-300 text-sm bg-slate-800/30 rounded-lg px-3 py-2">
                <Calendar className="w-4 h-4 text-purple-400" />
                <span className="font-medium text-slate-400">Published:</span>
                <span className="text-slate-200">{(() => {
                  try {
                    const date = new Date(mindmap.published_at);
                    if (isNaN(date.getTime())) {
                      return 'Unknown';
                    }
                    return formatDateSmart(date);
                  } catch (error) {
                    console.error('Error formatting published date:', error);
                    return 'Unknown';
                  }
                })()}</span>
              </div>
            )}
          </div>
        </div>        {/* Enhanced Content */}
        <div className="p-6 space-y-6 compact-modal-content">          {/* Enhanced Creator info */}
          <div className="compact-modal-section">
            <h3 className="text-sm font-medium text-slate-400 mb-3 compact-section-title">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-blue-400" />
                <span>Created by</span>
              </div>
            </h3>
            <div 
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-700/30 transition-all duration-200 cursor-pointer border border-slate-700/30 hover:border-slate-600/50 compact-creator-card"
              onClick={() => window.open(`/${mindmap.username}`, '_blank')}
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 flex-shrink-0 overflow-hidden ring-2 ring-slate-600/20 compact-avatar">
                {getAvatar() ? (
                  <img
                    src={getAvatar()!}
                    alt={mindmap.username}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300 font-bold text-lg">
                    {mindmap.username.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div>
                <p className="text-white font-semibold">{mindmap.displayName}</p>
                <p className="text-sm text-slate-400">@{mindmap.username}</p>
              </div>
            </div>
          </div>          {/* Enhanced Collaborators */}
          {mindmap.collaborators && mindmap.collaborators.length > 0 && (
            <div className="compact-modal-section">
              <h3 className="text-sm font-medium text-slate-400 mb-3 compact-section-title">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-purple-400" />
                  <span>Collaborators ({mindmap.collaborators.length})</span>
                </div>
              </h3>
              {isLoadingCollaborators ? (
                <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-700/30 compact-description">
                  <p className="text-slate-400 text-sm">Loading collaborators...</p>
                </div>
              ) : collaboratorProfiles.length > 0 ? (
                <div className="bg-slate-800/30 p-3 rounded-xl border border-slate-700/30 space-y-2 compact-description">
                  {collaboratorProfiles.map((collaborator) => (
                    <div 
                      key={collaborator.id} 
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-700/30 transition-all duration-200 cursor-pointer compact-collaborator"
                      onClick={() => window.open(`/${collaborator.username}`, '_blank')}
                    >
                      <div className="relative">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center overflow-hidden ring-2 ring-slate-600/20 compact-collaborator-avatar">
                          {collaborator.avatar_url ? (
                            <img
                              src={collaborator.avatar_url}
                              alt={collaborator.username}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-xs text-slate-300 font-bold">
                              {collaborator.username.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        {collaborator.isOnline && (
                          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-purple-400 rounded-full border-2 border-slate-800"></div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-slate-200 truncate">
                          @{collaborator.username}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-700/30 compact-description">
                  <p className="text-slate-400 text-sm">No collaborator information available.</p>
                </div>
              )}
            </div>
          )}          {/* Enhanced Description */}
          <div className="compact-modal-section">
            <h3 className="text-sm font-medium text-slate-400 mb-3 compact-section-title">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple-400" />
                <span>Description</span>
              </div>
            </h3>
            <p className="text-slate-300 bg-slate-800/30 p-4 rounded-xl border border-slate-700/30 leading-relaxed compact-description">
              {mindmap.description || "No description provided."}
            </p>
          </div>          {/* Enhanced Visibility */}
          {!hideVisibility && (
            <div className="compact-modal-section">
              <h3 className="text-sm font-medium text-slate-400 mb-3 compact-section-title">
                <div className="flex items-center gap-2">
                  {getVisibilityIcon()}
                  <span>Visibility</span>
                </div>
              </h3>
              <div className="flex items-center gap-3 p-4 bg-slate-800/30 rounded-xl border border-slate-700/30 compact-description">
                <span className="text-slate-300">{getVisibilityText()}</span>
              </div>
            </div>
          )}          {/* Enhanced Stats */}
          {mindmap.stats && (
            <div className="compact-modal-section">
              <h3 className="text-sm font-medium text-slate-400 mb-3 compact-section-title">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-purple-400" />
                  <span>Statistics</span>
                </div>
              </h3>
              <div className="space-y-4">
                {/* Structure Metrics */}
                <div>
                  <p className="text-xs text-slate-500 mb-3 px-1 font-medium">Structure</p>
                  <div className="grid grid-cols-2 gap-3 compact-stats-grid">
                    <div className="bg-slate-800/30 p-4 rounded-xl text-center border border-slate-700/30 hover:border-slate-600/50 transition-all duration-200 compact-stat-card">
                      <p className="text-xl font-bold text-white mb-1 compact-stat-value">{mindmap.stats.nodes || 0}</p>
                      <p className="text-xs text-slate-400 font-medium compact-stat-label">Nodes</p>
                    </div>
                    <div className="bg-slate-800/30 p-4 rounded-xl text-center border border-slate-700/30 hover:border-slate-600/50 transition-all duration-200 compact-stat-card">
                      <p className="text-xl font-bold text-white mb-1 compact-stat-value">{mindmap.stats.edges || 0}</p>
                      <p className="text-xs text-slate-400 font-medium compact-stat-label">Connections</p>
                    </div>
                  </div>
                </div>
                {/* Engagement Metrics */}
                <div>
                  <p className="text-xs text-slate-500 mb-3 px-1 font-medium">Engagement</p>
                  <div className="grid grid-cols-3 gap-3 compact-stats-grid">
                    <div className="bg-slate-800/30 p-4 rounded-xl text-center border border-slate-700/30 hover:border-slate-600/50 transition-all duration-200 compact-stat-card">
                      <p className="text-xl font-bold text-white mb-1 compact-stat-value">{mindmap.stats.likes || 0}</p>
                      <p className="text-xs text-slate-400 font-medium compact-stat-label">Likes</p>
                    </div>
                    <div className="bg-slate-800/30 p-4 rounded-xl text-center border border-slate-700/30 hover:border-slate-600/50 transition-all duration-200 compact-stat-card">
                      <p className="text-xl font-bold text-white mb-1 compact-stat-value">{mindmap.stats.comments || 0}</p>
                      <p className="text-xs text-slate-400 font-medium compact-stat-label">Comments</p>
                    </div>
                    <div className="bg-slate-800/30 p-4 rounded-xl text-center border border-slate-700/30 hover:border-slate-600/50 transition-all duration-200 compact-stat-card">
                      <p className="text-xl font-bold text-white mb-1 compact-stat-value">{mindmap.stats.saves || 0}</p>
                      <p className="text-xs text-slate-400 font-medium compact-stat-label">Saves</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InfoModal;
