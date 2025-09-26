import React, { useState, useEffect, useMemo, useRef } from "react";
import { Eye, EyeOff, Link, Star, X, UserPlus, ChevronDown, HelpCircle } from "lucide-react";
import UserSelectModal from "./UserSelectModal";
import { supabase } from "../supabaseClient";
import { useToastStore } from "../store/toastStore";

interface EditDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  mapData: {
    id?: string; // Add mindmap ID for collaboration queries
    permalink: string;
    title: string;
    description?: string;
    visibility?: "public" | "private" | "linkOnly";
    is_main?: boolean;
    collaborators?: string[];
    published_at?: string | null;
  };
  username?: string;
  onSave: (details: {
    title: string;
    permalink: string;
    visibility: "public" | "private" | "linkOnly";
    description: string;
    is_main: boolean;
    collaborators: string[];
    published_at?: string | null;
  }) => Promise<void>;
  showMainMapOption?: boolean;
}

const EditDetailsModal: React.FC<EditDetailsModalProps> = ({
  isOpen,
  onClose,
  mapData,
  username,
  onSave,
  showMainMapOption = false,
}) => {
  const [editDetails, setEditDetails] = useState({
    title: mapData.title || "",
    permalink: mapData.permalink || "",
    visibility: (mapData.visibility || "private") as "public" | "private" | "linkOnly",
    description: mapData.description || "",
    is_main: mapData.is_main || false,
    collaborators: mapData.collaborators || [],
  });
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [isUserSelectModalOpen, setIsUserSelectModalOpen] = useState(false);
  const [collaboratorProfiles, setCollaboratorProfiles] = useState<Array<{ 
    id: string, 
    username: string, 
    full_name?: string, 
    avatar_url?: string,
    status: 'pending' | 'accepted'
  }>>([]);
  // Local state to track collaboration changes before saving
  const [pendingCollaboratorChanges, setPendingCollaboratorChanges] = useState<{
    toAdd: Array<{ id: string, username: string, full_name?: string, avatar_url?: string }>;
    toRemove: Array<string>;
  }>({ toAdd: [], toRemove: [] });
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [saveAction, setSaveAction] = useState<"publish" | "save">("publish");
  const [showHelpTooltip, setShowHelpTooltip] = useState(false);

  // Ref for the dropdown container to handle click outside
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Helper function to determine button text based on publish status
  const getButtonText = () => {
    if (isSaving) {
      if (saveAction === "publish") {
        return "Publishing...";
      }
      return "Saving...";
    }
    if (saveAction === "publish") {
      return mapData.published_at ? "Republish" : "Publish";
    }
    return "Save changes";
  };

  // Helper function to check if republishing is allowed (14 days cooldown)
  const canRepublish = () => {
    if (!mapData.published_at) return true; // First time publishing is always allowed

    const publishedDate = new Date(mapData.published_at);
    const now = new Date();
    const daysSincePublished = Math.floor((now.getTime() - publishedDate.getTime()) / (1000 * 60 * 60 * 24));

    return daysSincePublished >= 14;
  };

  // Helper function to get remaining days until republish is allowed
  const getDaysUntilRepublish = () => {
    if (!mapData.published_at) return 0;

    const publishedDate = new Date(mapData.published_at);
    const now = new Date();
    const daysSincePublished = Math.floor((now.getTime() - publishedDate.getTime()) / (1000 * 60 * 60 * 24));

    return Math.max(0, 14 - daysSincePublished);
  };

  // Store the original permalink to check for changes
  const originalPermalink = useMemo(() => mapData.permalink || "", [mapData.permalink]);

  // Get base URL for permalink display (without trailing slash)
  const baseUrl = useMemo(() => {
    const url = window.location.origin;
    return url.endsWith('/') ? url.slice(0, -1) : url;
  }, []);

  const handleSave = async () => {
    if (!editDetails.title.trim() || !editDetails.permalink.trim()) return;

    setIsSaving(true);
    try {
      // Apply collaboration changes first if there are any
      if (mapData.id && (pendingCollaboratorChanges.toAdd.length > 0 || pendingCollaboratorChanges.toRemove.length > 0)) {
        await applyCollaborationChanges();
      }

      // Determine if we should set published_at timestamp
      const shouldPublish = saveAction === "publish" && editDetails.visibility === "public";

      if (shouldPublish) {
        const action = mapData.published_at ? "Republishing" : "Publishing";
        console.log(`${action} mindmap with timestamp:`, new Date().toISOString());
      } else {
        console.log("Saving mindmap without publishing");
      }

      await onSave({
        title: editDetails.title,
        permalink: editDetails.permalink,
        visibility: editDetails.visibility,
        description: editDetails.description,
        is_main: editDetails.is_main,
        collaborators: [], // Empty array since collaborations are now handled via mindmap_collaborations table
        published_at: shouldPublish ? new Date().toISOString() : mapData.published_at,
      });

      onClose();
    } catch (error) {
      console.error("Error saving map details:", error);
      // Check if it's a specific permalink error
      if (error instanceof Error && error.message.includes("Permalink already in use")) {
        setEditError(error.message);
      } else {
        setEditError("Failed to save changes. Please try again.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const toggleMainMap = () => {
    setEditDetails(prev => ({
      ...prev,
      is_main: !prev.is_main
    }));
  };

  // Check for permalink conflicts in real-time
  useEffect(() => {
    const checkPermalinkConflict = async () => {
      // Only check if permalink has changed from original
      if (editDetails.permalink !== originalPermalink && editDetails.permalink.trim() !== "") {
        try {
          // Get current user first
          const { data: userData } = await supabase.auth.getUser();
          if (!userData || !userData.user) {
            console.error("No authenticated user found");
            return;
          }

          // Get all maps for the current user
          const { data: userMaps, error } = await supabase
            .from("mindmaps")
            .select("permalink, title")
            .eq("creator", userData.user.id);

          if (error) throw error;

          // Check for conflicts
          const conflictingMap = userMaps?.find(
            map => map.permalink === editDetails.permalink && map.permalink !== originalPermalink
          );

          if (conflictingMap) {
            setEditError(`Permalink already in use in your mindmap "${conflictingMap.title}"`);
          } else {
            setEditError(null);
          }
        } catch (error) {
          console.error("Error checking permalink:", error);
        }
      } else {
        // Clear error if permalink is reset to original or empty
        setEditError(null);
      }
    };

    // Debounce the check to avoid too many database calls
    const timeoutId = setTimeout(checkPermalinkConflict, 500);

    return () => clearTimeout(timeoutId);
  }, [editDetails.permalink, originalPermalink]);

  // Fetch collaborator profiles function
  const fetchCollaboratorProfiles = async () => {
    if (!isOpen || !mapData.id) {
      setCollaboratorProfiles([]);
      return;
    }

    try {
      // Fetch collaborations from the new mindmap_collaborations table
      const { data: collaborations, error: collaborationsError } = await supabase
        .from('mindmap_collaborations')
        .select('collaborator_id, status')
        .eq('mindmap_id', mapData.id);

      if (collaborationsError) {
        console.error('Error fetching collaborations:', collaborationsError);
        return;
      }

      if (!collaborations || collaborations.length === 0) {
        setCollaboratorProfiles([]);
        return;
      }

      // Fetch profiles for the collaborators
      const collaboratorIds = collaborations.map(c => c.collaborator_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url')
        .in('id', collaboratorIds);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        return;
      }

      // Combine collaboration data with profile data
      const collaboratorProfilesWithStatus = collaborations.map(collaboration => {
        const profile = profiles?.find(p => p.id === collaboration.collaborator_id);
        return {
          id: profile?.id || collaboration.collaborator_id,
          username: profile?.username || 'Unknown',
          full_name: profile?.full_name,
          avatar_url: profile?.avatar_url,
          status: collaboration.status as 'pending' | 'accepted'
        };
      }).filter(c => c.username !== 'Unknown'); // Filter out any that couldn't find profile

      setCollaboratorProfiles(collaboratorProfilesWithStatus);
    } catch (error) {
      console.error('Error fetching collaborator profiles:', error);
    }
  };

  // Fetch collaborator profiles when modal opens or collaborators change
  useEffect(() => {
    fetchCollaboratorProfiles();
  }, [isOpen, mapData.id]);

  // Close dropdown when clicking outside or modal state changes
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Check if the click is outside the dropdown and not on the toggle button
      if (isDropdownOpen && dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        console.log("Click outside detected, closing dropdown");
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  // Reset dropdown state when modal closes or visibility changes
  useEffect(() => {
    setIsDropdownOpen(false);
  }, [isOpen, editDetails.visibility]);

  // Reset save action to "publish" only when modal opens and republishing is allowed
  useEffect(() => {
    if (isOpen) {
      // Default to "publish" if republishing is allowed, otherwise "save"
      setSaveAction(canRepublish() ? "publish" : "save");
    }
  }, [isOpen]);

  // Debug: Track saveAction changes
  useEffect(() => {
    console.log("SaveAction changed to:", saveAction);
  }, [saveAction]);

  // Handle clicking outside dropdowns to close them
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
      // Close help tooltip when clicking outside of it
      if (showHelpTooltip && event.target) {
        const helpElement = (event.target as Element).closest('.help-tooltip-container');
        if (!helpElement) {
          setShowHelpTooltip(false);
        }
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsDropdownOpen(false);
        setShowHelpTooltip(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showHelpTooltip]);

  // Handle adding/updating collaborators
  const handleAddCollaborators = async (selectedUsers: { id: string, username: string, full_name?: string, avatar_url?: string }[]) => {
    // The selectedUsers now represents the final desired state of collaborators
    // We need to figure out who to add and who to remove
    
    const currentCollaboratorIds = new Set(collaboratorProfiles.map(c => c.id));
    const selectedUserIds = new Set(selectedUsers.map(u => u.id));
    
    // Users to add: selected but not currently collaborators
    const usersToAdd = selectedUsers.filter(user => !currentCollaboratorIds.has(user.id));
    
    // Users to remove: currently collaborators but not selected
    const usersToRemove = collaboratorProfiles
      .filter(collaborator => !selectedUserIds.has(collaborator.id))
      .map(collaborator => collaborator.id);

    // Update pending changes
    setPendingCollaboratorChanges({
      toAdd: usersToAdd,
      toRemove: usersToRemove
    });

    console.log(`Staged ${usersToAdd.length} additions and ${usersToRemove.length} removals`);
    setIsUserSelectModalOpen(false);
  };

  // Handle removing a collaborator
  const handleRemoveCollaborator = (collaboratorId: string) => {
    // Check if this user is in pending to add list
    const isInPendingAdd = pendingCollaboratorChanges.toAdd.some(u => u.id === collaboratorId);
    
    if (isInPendingAdd) {
      // If they're pending to be added, just remove from the pending add list
      setPendingCollaboratorChanges(prev => ({
        ...prev,
        toAdd: prev.toAdd.filter(u => u.id !== collaboratorId)
      }));
    } else {
      // If they're an existing collaborator, add to pending removal list
      setPendingCollaboratorChanges(prev => ({
        ...prev,
        toRemove: [...prev.toRemove.filter(id => id !== collaboratorId), collaboratorId]
      }));
    }

    console.log(`Staged removal of collaborator: ${collaboratorId}`);
  };

  // Function to invite a user to a mindmap
  const inviteUserToMindmap = async (mindmapId: string, userId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No authenticated user found');

    const { error } = await supabase
      .from('mindmap_collaborations')
      .insert({
        mindmap_id: mindmapId,
        collaborator_id: userId,
        inviter_id: user.id,
        status: 'pending'
      });

    if (error) throw error;
  };

  // Apply pending collaboration changes to the database
  const applyCollaborationChanges = async () => {
    if (!mapData.id) throw new Error("No mindmap ID available");
    const toast = useToastStore.getState();

    try {
      // Add new collaborators
      for (const user of pendingCollaboratorChanges.toAdd) {
        await inviteUserToMindmap(mapData.id, user.id);
        console.log(`Sent invitation to ${user.username}`);
      }

      // Remove collaborators
      for (const userId of pendingCollaboratorChanges.toRemove) {
        const { error } = await supabase
          .from("mindmap_collaborations")
          .delete()
          .eq("mindmap_id", mapData.id)
          .eq("collaborator_id", userId);

        if (error) throw error;
        console.log(`Removed collaboration for user ${userId}`);
      }

      // Show success messages
      if (pendingCollaboratorChanges.toAdd.length > 0) {
        const usernames = pendingCollaboratorChanges.toAdd.map(u => u.username).join(", ");
        if (pendingCollaboratorChanges.toAdd.length === 1) {
          toast.showToast(`Invitation sent to ${usernames}`, 'success');
        } else {
          toast.showToast(`Invitations sent to ${usernames}`, 'success');
        }
      }

      if (pendingCollaboratorChanges.toRemove.length > 0) {
        const count = pendingCollaboratorChanges.toRemove.length;
        if (count === 1) {
          toast.showToast('Collaborator removed successfully', 'success');
        } else {
          toast.showToast(`${count} collaborators removed successfully`, 'success');
        }
      }

      // Reset pending changes and refresh collaborators list
      setPendingCollaboratorChanges({ toAdd: [], toRemove: [] });
      fetchCollaboratorProfiles();
    } catch (error) {
      console.error("Failed to apply collaboration changes:", error);
      useToastStore.getState().showToast("Failed to update collaborators", 'error');
      throw error;
    }
  };

  // ...existing code...

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50 pt-8 sm:pt-12"
    >
      <div
        className="bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-xl rounded-xl sm:rounded-2xl p-3 sm:p-6 w-full max-w-xs sm:max-w-md shadow-2xl border border-slate-700/30"
        style={{ maxHeight: '85vh' }}
      >
        <h2 className="text-base sm:text-xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent mb-3 sm:mb-6">Edit Map Details</h2>
        <div className="space-y-3 sm:space-y-6 overflow-y-auto" style={{ maxHeight: '60vh' }}>
          <div className="space-y-2">
            <label htmlFor="map-title" className="block text-sm font-medium text-slate-300">
              Title<span className="text-red-400">*</span>
            </label>
            <input
              id="map-title"
              type="text"
              value={editDetails.title}
              onChange={(e) => setEditDetails({ ...editDetails, title: e.target.value })}
              className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-slate-800/50 border border-slate-700/50 rounded-lg sm:rounded-xl text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 text-sm"
              maxLength={50}
              required
            />
            <p className="text-xs text-slate-500 mt-1">{editDetails.title.length}/50</p>
          </div>

          <div className="space-y-2">
            <label htmlFor="map-permalink" className="block text-sm font-medium text-slate-300">
              Permalink<span className="text-red-400">*</span>
            </label>
            <div className="flex items-center min-w-0 overflow-hidden rounded-lg sm:rounded-xl border border-slate-700/50 focus-within:border-blue-500/50 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all duration-200">
              <span className="bg-slate-700/50 px-2 sm:px-3 py-2 sm:py-3 text-slate-400 text-xs whitespace-nowrap flex-shrink-0 max-w-[60%] sm:max-w-[70%] overflow-hidden text-ellipsis">
                {baseUrl}/{username}/
              </span>
              <input
                id="map-permalink"
                type="text"
                value={editDetails.permalink}
                onChange={(e) => {
                  // Sanitize permalink: only allow lowercase letters, numbers, hyphens, and underscores
                  const sanitizedValue = e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, '');
                  setEditDetails({ ...editDetails, permalink: sanitizedValue });
                }}
                className={`w-0 flex-grow min-w-[60px] px-2 sm:px-3 py-2 sm:py-3 bg-slate-800/50 ${editError ? "border-l border-red-500/50" : "border-l border-slate-700/30"
                  } text-slate-100 focus:outline-none text-xs sm:text-sm`}
                required
              />
            </div>
            {editError && <p className="text-red-400 text-sm mt-1 flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-red-400"></span>
              {editError}
            </p>}
            <p className="text-xs text-slate-500 mt-1">Only lowercase letters, numbers, hyphens, and underscores are allowed.</p>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-300">Description</label>
            <div className="flex items-center">
              <textarea
                value={editDetails.description}
                onChange={(e) => setEditDetails({ ...editDetails, description: e.target.value.substring(0, 200) })}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-slate-800/50 border border-slate-700/50 rounded-lg sm:rounded-xl text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 resize-none text-sm"
                rows={2}
                maxLength={200}
                placeholder="Add a description for your mind map..."
              />
            </div>
            <div className="text-xs text-slate-400 text-right">
              {editDetails.description.length}/200
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-300 mb-2">Visibility</label>
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => setEditDetails({ ...editDetails, visibility: "public" })}
                className={`flex items-center justify-center px-2 sm:px-3 py-2 sm:py-3 rounded-lg sm:rounded-xl transition-all duration-200 border ${editDetails.visibility === "public"
                  ? "bg-blue-600/80 text-white border-blue-500/50 shadow-lg shadow-blue-500/25"
                  : "bg-slate-800/50 text-slate-300 border-slate-700/50 hover:bg-slate-700/50 hover:border-slate-600/50"}`}
              >
                <Eye className={`w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 ${editDetails.visibility === "public" ? "text-white" : "text-slate-400"}`} />
                <span className="text-xs sm:text-sm font-medium">Public</span>
              </button>
              <button
                type="button"
                onClick={() => setEditDetails({ ...editDetails, visibility: "private" })}
                className={`flex items-center justify-center px-2 sm:px-3 py-2 sm:py-3 rounded-lg sm:rounded-xl transition-all duration-200 border ${editDetails.visibility === "private"
                  ? "bg-blue-600/80 text-white border-blue-500/50 shadow-lg shadow-blue-500/25"
                  : "bg-slate-800/50 text-slate-300 border-slate-700/50 hover:bg-slate-700/50 hover:border-slate-600/50"}`}
              >
                <EyeOff className={`w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 ${editDetails.visibility === "private" ? "text-white" : "text-slate-400"}`} />
                <span className="text-xs sm:text-sm font-medium">Private</span>
              </button>
              <button
                type="button"
                onClick={() => setEditDetails({ ...editDetails, visibility: "linkOnly" })}
                className={`flex items-center justify-center px-2 sm:px-3 py-2 sm:py-3 rounded-lg sm:rounded-xl transition-all duration-200 border ${editDetails.visibility === "linkOnly"
                  ? "bg-blue-600/80 text-white border-blue-500/50 shadow-lg shadow-blue-500/25"
                  : "bg-slate-800/50 text-slate-300 border-slate-700/50 hover:bg-slate-700/50 hover:border-slate-600/50"}`}
              >
                <Link className={`w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 ${editDetails.visibility === "linkOnly" ? "text-white" : "text-slate-400"}`} />
                <span className="text-xs sm:text-sm font-medium">Link Only</span>
              </button>
            </div>
          </div>

          {showMainMapOption && (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-300 mb-3">Main Map</label>
              <button
                type="button"
                onClick={toggleMainMap}
                className={`flex items-center justify-center px-4 py-3 rounded-xl transition-all duration-200 w-full border ${editDetails.is_main
                  ? "bg-gradient-to-r from-blue-600/80 to-purple-600/80 text-white border-blue-500/50 shadow-lg shadow-blue-500/25"
                  : "bg-slate-800/50 text-slate-300 border-slate-700/50 hover:bg-slate-700/50 hover:border-slate-600/50"}`}
              >
                <Star className={`w-4 h-4 mr-2 ${editDetails.is_main ? "text-white fill-current" : "text-slate-400"}`} />
                <span className="font-medium">{editDetails.is_main ? "Main Map" : "Set as Main Map"}</span>
              </button>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">Your main map accessible via the shortcut URL: <span className="font-mono bg-slate-800/50 px-2 py-1 rounded border border-slate-700/30">{baseUrl}/@{username}</span></p>
            </div>
          )}

          {/* Collaborators Section */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-300">Collaborators</label>

            {/* Add Collaborators Button */}
            <button
              type="button"
              onClick={() => setIsUserSelectModalOpen(true)}
              className="flex items-center justify-center px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl transition-all duration-200 w-full bg-slate-800/50 text-slate-300 border border-slate-700/50 hover:bg-slate-700/50 hover:border-slate-600/50"
            >
              <UserPlus className="w-3 h-3 sm:w-4 sm:h-4 mr-2 text-slate-400" />
              <span className="text-sm sm:text-base font-medium">Invite collaborators</span>
            </button>

            {/* Display Current Collaborators and Pending Changes */}
            {(collaboratorProfiles.length > 0 || pendingCollaboratorChanges.toAdd.length > 0) && (
              <div className="space-y-2">
                <p className="text-xs text-slate-500 font-medium">Collaborators & invitations:</p>
                <div className="space-y-1.5 sm:space-y-2">
                  {/* Existing collaborators (show as pending removal if marked for deletion) */}
                  {collaboratorProfiles
                    .filter(collaborator => !pendingCollaboratorChanges.toRemove.includes(collaborator.id))
                    .map((collaborator) => (
                    <div
                      key={collaborator.id}
                      className={`flex items-center justify-between p-2 sm:p-3 rounded-lg sm:rounded-xl border transition-all duration-200 ${
                        collaborator.status === 'pending' 
                          ? 'bg-orange-500/5 border-orange-500/30 hover:bg-orange-500/10' 
                          : 'bg-slate-800/50 border-slate-700/50 hover:bg-slate-700/30'
                      }`}
                    >
                      <div className="flex items-center">
                        <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex-shrink-0 overflow-hidden mr-2 sm:mr-3 ring-2 ${
                          collaborator.status === 'pending' 
                            ? 'ring-orange-400/50 bg-orange-600/20' 
                            : 'ring-slate-700/30 bg-slate-600/50'
                        }`}>
                          {collaborator.avatar_url ? (
                            <img
                              src={collaborator.avatar_url}
                              alt={collaborator.username}
                              className={`w-full h-full object-cover ${
                                collaborator.status === 'pending' ? 'opacity-70' : ''
                              }`}
                            />
                          ) : (
                            <div className={`w-full h-full flex items-center justify-center font-medium text-sm ${
                              collaborator.status === 'pending' 
                                ? 'text-orange-300 bg-gradient-to-br from-orange-600/30 to-orange-700/30' 
                                : 'text-slate-300 bg-gradient-to-br from-slate-600 to-slate-700'
                            }`}>
                              {collaborator.username?.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className={`text-sm font-medium ${
                              collaborator.status === 'pending' ? 'text-orange-200' : 'text-slate-200'
                            }`}>
                              @{collaborator.username}
                            </p>
                            {collaborator.status === 'pending' && (
                              <span className="px-2 py-0.5 text-xs font-medium bg-orange-500/20 text-orange-300 rounded-full border border-orange-500/30">
                                Pending
                              </span>
                            )}
                          </div>
                          {collaborator.full_name && (
                            <p className={`text-xs ${
                              collaborator.status === 'pending' ? 'text-orange-400/70' : 'text-slate-400'
                            }`}>
                              {collaborator.full_name}
                            </p>
                          )}
                          {collaborator.status === 'pending' && (
                            <p className="text-xs text-orange-400/80 mt-0.5">
                              Invitation sent - waiting for acceptance
                            </p>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveCollaborator(collaborator.id)}
                        className="p-1 sm:p-1.5 rounded-md sm:rounded-lg transition-all duration-200 text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                        title={collaborator.status === 'pending' ? 'Cancel invitation' : 'Remove collaborator'}
                      >
                        <X className="w-3 h-3 sm:w-4 sm:h-4" />
                      </button>
                    </div>
                  ))}

                  {/* Pending additions (will be added on save) */}
                  {pendingCollaboratorChanges.toAdd.map((user) => (
                    <div
                      key={`pending-${user.id}`}
                      className="flex items-center justify-between p-2 sm:p-3 rounded-lg sm:rounded-xl border transition-all duration-200 bg-blue-500/5 border-blue-500/30 hover:bg-blue-500/10"
                    >
                      <div className="flex items-center">
                        <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full flex-shrink-0 overflow-hidden mr-2 sm:mr-3 ring-2 ring-blue-400/50 bg-blue-600/20">
                          {user.avatar_url ? (
                            <img
                              src={user.avatar_url}
                              alt={user.username}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center font-medium text-sm text-blue-300 bg-gradient-to-br from-blue-600/30 to-blue-700/30">
                              {user.username?.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-blue-200">
                              @{user.username}
                            </p>
                            <span className="px-2 py-0.5 text-xs font-medium bg-blue-500/20 text-blue-300 rounded-full border border-blue-500/30">
                              Will be invited
                            </span>
                          </div>
                          {user.full_name && (
                            <p className="text-xs text-blue-400/70">
                              {user.full_name}
                            </p>
                          )}
                          <p className="text-xs text-blue-400/80 mt-0.5">
                            Will receive invitation when you save changes
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveCollaborator(user.id)}
                        className="p-1 sm:p-1.5 rounded-md sm:rounded-lg transition-all duration-200 text-blue-400 hover:text-red-400 hover:bg-red-500/10"
                        title="Remove from pending invitations"
                      >
                        <X className="w-3 h-3 sm:w-4 sm:h-4" />
                      </button>
                    </div>
                  ))}

                  {/* Collaborators marked for removal (shown with strikethrough) */}
                  {collaboratorProfiles
                    .filter(collaborator => pendingCollaboratorChanges.toRemove.includes(collaborator.id))
                    .map((collaborator) => (
                    <div
                      key={`removing-${collaborator.id}`}
                      className="flex items-center justify-between p-2 sm:p-3 rounded-lg sm:rounded-xl border transition-all duration-200 bg-red-500/5 border-red-500/30 hover:bg-red-500/10 opacity-75"
                    >
                      <div className="flex items-center">
                        <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full flex-shrink-0 overflow-hidden mr-2 sm:mr-3 ring-2 ring-red-400/50 bg-red-600/20">
                          {collaborator.avatar_url ? (
                            <img
                              src={collaborator.avatar_url}
                              alt={collaborator.username}
                              className="w-full h-full object-cover opacity-50"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center font-medium text-sm text-red-300 bg-gradient-to-br from-red-600/30 to-red-700/30">
                              {collaborator.username?.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-red-200 line-through">
                              @{collaborator.username}
                            </p>
                            <span className="px-2 py-0.5 text-xs font-medium bg-red-500/20 text-red-300 rounded-full border border-red-500/30">
                              Will be removed
                            </span>
                          </div>
                          {collaborator.full_name && (
                            <p className="text-xs text-red-400/70 line-through">
                              {collaborator.full_name}
                            </p>
                          )}
                          <p className="text-xs text-red-400/80 mt-0.5">
                            Will be removed when you save changes
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          // Remove from pending removal list (undo the removal)
                          setPendingCollaboratorChanges(prev => ({
                            ...prev,
                            toRemove: prev.toRemove.filter(id => id !== collaborator.id)
                          }));
                        }}
                        className="p-1.5 rounded-lg transition-all duration-200 text-red-400 hover:text-green-400 hover:bg-green-500/10"
                        title="Undo removal"
                      >
                        <X className="w-4 h-4 rotate-45" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p className="text-xs text-slate-500 leading-relaxed">
              Send collaboration invitations to other users. They'll receive a notification and can accept to gain edit access to this mindmap. Collaborators can edit content but cannot change title, description, or settings.
            </p>
          </div>
        </div>
        <div className="flex justify-end items-center space-x-2 sm:space-x-3 mt-4 sm:mt-8">
          <button
            type="button"
            onClick={onClose}
            className="px-4 sm:px-6 py-2 sm:py-2.5 text-slate-400 hover:text-slate-100 transition-colors text-sm sm:text-base font-medium"
          >
            Cancel
          </button>

          {editDetails.visibility === "public" ? (
            <div className="flex items-center space-x-2 sm:space-x-3">
              {/* Help icon */}
              <div className="relative help-tooltip-container">
                <button
                  type="button"
                  onClick={() => setShowHelpTooltip(!showHelpTooltip)}
                  className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-md sm:rounded-lg bg-slate-700/50 border border-slate-600/50 text-slate-400 hover:text-blue-400 hover:border-blue-500/50 hover:bg-slate-600/50 transition-all duration-200"
                  title="Learn about publishing options"
                >
                  <HelpCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                </button>

                {/* Help tooltip/modal */}
                {showHelpTooltip && (
                  <div className="absolute bottom-full mb-3 right-0 bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl p-0 z-30 w-80">
                    {/* Tooltip arrow */}
                    <div className="absolute -bottom-2 right-2 w-4 h-4 bg-slate-900 border-r border-b border-slate-700/50 transform rotate-45"></div>

                    <div className="relative">
                      {/* Header with close button */}
                      <div className="flex items-center justify-between p-4 border-b border-slate-700/50">
                        <h4 className="text-sm font-semibold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">Publishing Options</h4>
                        <button
                          type="button"
                          onClick={() => setShowHelpTooltip(false)}
                          className="w-6 h-6 rounded-lg bg-slate-800/50 border border-slate-600/50 flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-all duration-200"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Content */}
                      <div className="p-4 space-y-3">
                        <div className="bg-gradient-to-r from-blue-500/10 to-blue-600/5 border border-blue-500/30 rounded-xl p-3">
                          <div className="flex items-start space-x-3">
                            <div className="w-6 h-6 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <span className="text-white text-xs font-bold">📢</span>
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold text-blue-200 mb-1.5 text-sm">Publish/Republish</p>
                              <p className="text-slate-300 text-xs leading-relaxed">Promotes your mindmap to the top of the community feed and sends notifications to your followers.</p>
                              <p className="text-blue-300 text-xs mt-1 font-medium">Limited to once every 14 days</p>
                            </div>
                          </div>
                        </div>

                        <div className="bg-gradient-to-r from-green-500/10 to-green-600/5 border border-green-500/30 rounded-xl p-3">
                          <div className="flex items-start space-x-3">
                            <div className="w-6 h-6 rounded-full bg-gradient-to-r from-green-500 to-green-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <span className="text-white text-xs font-bold">💾</span>
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold text-green-200 mb-1.5 text-sm">Save Changes</p>
                              <p className="text-slate-300 text-xs leading-relaxed">Updates your mindmap details quietly without promoting or sending any notifications.</p>
                              <p className="text-green-300 text-xs mt-1 font-medium">Still puts in on your profile and map recommendations.</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="relative" ref={dropdownRef}>
                <div className="flex">
                  {/* Main button - shows current selected action */}
                  <button
                    type="button"
                    onClick={() => handleSave()}
                    disabled={!editDetails.title.trim() || !editDetails.permalink.trim() || isSaving || !!editError}
                    className={`px-4 sm:px-6 py-2 sm:py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-l-lg sm:rounded-l-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base font-medium shadow-lg ${isSaving ? "animate-pulse" : ""
                      }`}
                  >
                    {getButtonText()}
                  </button>

                  {/* Dropdown arrow button */}
                  <button
                    type="button"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    disabled={!editDetails.title.trim() || !editDetails.permalink.trim() || isSaving || !!editError}
                    className="px-2 sm:px-3 py-2 sm:py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 border-l border-blue-500/30 rounded-r-lg sm:rounded-r-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronDown className={`w-3 h-3 sm:w-4 sm:h-4 text-white transition-transform duration-200 ${isDropdownOpen ? "rotate-180" : ""}`} />
                  </button>
                </div>

                {/* Dropdown menu */}
                {isDropdownOpen && (
                  <div className="absolute bottom-full mb-2 right-0 bg-slate-800/95 backdrop-blur-xl border border-slate-700/50 rounded-xl shadow-2xl z-10 min-w-full overflow-hidden">
                    <button
                      type="button"
                      onClick={() => {
                        console.log(mapData.published_at ? "Republish button clicked" : "Publish button clicked");
                        setSaveAction("publish");
                        setIsDropdownOpen(false);
                      }}
                      disabled={!editDetails.title.trim() || !editDetails.permalink.trim() || isSaving || !!editError || !canRepublish()}
                      className="w-full px-4 py-3 text-left text-slate-100 hover:bg-slate-700/50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed border-b border-slate-700/30"
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">{mapData.published_at ? "Republish" : "Publish"}</span>
                        {mapData.published_at && !canRepublish() && (
                          <span className="text-xs text-slate-400 mt-1">
                            Available in {getDaysUntilRepublish()} day{getDaysUntilRepublish() !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        console.log("Save changes button clicked");
                        setSaveAction("save");
                        setIsDropdownOpen(false);
                      }}
                      disabled={!editDetails.title.trim() || !editDetails.permalink.trim() || isSaving || !!editError}
                      className="w-full px-4 py-3 text-left text-slate-100 hover:bg-slate-700/50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                    >
                      Save changes
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => handleSave()}
              disabled={!editDetails.title.trim() || !editDetails.permalink.trim() || isSaving || !!editError}
              className={`px-4 sm:px-6 py-2 sm:py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg sm:rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base font-medium shadow-lg ${isSaving ? "animate-pulse" : ""
                }`}
            >
              {isSaving ? "Saving..." : "Save changes"}
            </button>
          )}
        </div>
      </div>

      {/* User Select Modal for Adding Collaborators */}
      {isUserSelectModalOpen && (
        <UserSelectModal
          isOpen={isUserSelectModalOpen}
          onClose={() => setIsUserSelectModalOpen(false)}
          onSelectUsers={handleAddCollaborators}
          initialMessage=""
          mode="collaborate"
          existingCollaborators={collaboratorProfiles.map(c => c.id)}
          maxCollaborators={3}
        />
      )}
    </div>
  );
};

export default EditDetailsModal;
