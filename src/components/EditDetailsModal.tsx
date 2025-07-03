import React, { useState, useEffect, useMemo, useRef } from "react";
import { Eye, EyeOff, Link, Star, X, UserPlus, ChevronDown, HelpCircle } from "lucide-react";
import UserSelectModal from "./UserSelectModal";
import { supabase } from "../supabaseClient";

interface EditDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  mapData: {
    id: string;
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
    permalink: mapData.id || "",
    visibility: (mapData.visibility || "private") as "public" | "private" | "linkOnly",
    description: mapData.description || "",
    is_main: mapData.is_main || false,
    collaborators: mapData.collaborators || [],
  });
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [isUserSelectModalOpen, setIsUserSelectModalOpen] = useState(false);
  const [collaboratorProfiles, setCollaboratorProfiles] = useState<Array<{id: string, username: string, full_name?: string, avatar_url?: string}>>([]);
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
  const originalPermalink = useMemo(() => mapData.id || "", [mapData.id]);
  
  // Get base URL for permalink display (without trailing slash)
  const baseUrl = useMemo(() => {
    const url = window.location.origin;
    return url.endsWith('/') ? url.slice(0, -1) : url;
  }, []);

  const handleSave = async () => {
    if (!editDetails.title.trim() || !editDetails.permalink.trim()) return;

    setIsSaving(true);
    try {
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
        collaborators: editDetails.collaborators,
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
            .select("id, title")
            .eq("creator", userData.user.id);
            
          if (error) throw error;
          
          // Check for conflicts
          const conflictingMap = userMaps?.find(
            map => map.id === editDetails.permalink && map.id !== originalPermalink
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

  // Fetch collaborator profiles when modal opens or collaborators change
  useEffect(() => {
    const fetchCollaboratorProfiles = async () => {
      if (!isOpen || editDetails.collaborators.length === 0) {
        setCollaboratorProfiles([]);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url')
          .in('id', editDetails.collaborators);

        if (error) {
          console.error('Error fetching collaborator profiles:', error);
          return;
        }

        setCollaboratorProfiles(data || []);
      } catch (error) {
        console.error('Error fetching collaborator profiles:', error);
      }
    };

    fetchCollaboratorProfiles();
  }, [isOpen, editDetails.collaborators]);

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
  const handleAddCollaborators = (selectedUsers: { id: string, username: string }[]) => {
    const newCollaboratorIds = selectedUsers.map(user => user.id);
    
    setEditDetails(prev => ({
      ...prev,
      collaborators: newCollaboratorIds
    }));
    
    setIsUserSelectModalOpen(false);
  };

  // Handle removing a collaborator
  const handleRemoveCollaborator = (collaboratorId: string) => {
    setEditDetails(prev => ({
      ...prev,
      collaborators: prev.collaborators.filter(id => id !== collaboratorId)
    }));
  };

  // ...existing code...

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
    >
      <div
        className="bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-xl rounded-2xl p-6 w-full max-w-md shadow-2xl border border-slate-700/30"
        style={{ maxHeight: '90vh' }}
      >
        <h2 className="text-xl md:text-lg sm:text-base font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent mb-6">Edit Map Details</h2>
        <div className="space-y-6 overflow-y-auto" style={{ maxHeight: '65vh' }}>
          <div className="space-y-3">
            <label htmlFor="map-title" className="block text-sm font-medium text-slate-300">
              Title<span className="text-red-400">*</span>
            </label>
            <input
              id="map-title"
              type="text"
              value={editDetails.title}
              onChange={(e) => setEditDetails({ ...editDetails, title: e.target.value })}
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 text-base md:text-sm sm:text-xs"
              maxLength={20}
              required
            />
          </div>

          <div className="space-y-3">
            <label htmlFor="map-permalink" className="block text-sm font-medium text-slate-300">
              Permalink<span className="text-red-400">*</span>
            </label>
            <div className="flex items-center min-w-0 overflow-hidden rounded-xl border border-slate-700/50 focus-within:border-blue-500/50 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all duration-200">
              <span className="bg-slate-700/50 px-3 py-3 text-slate-400 text-xs whitespace-nowrap flex-shrink-0 max-w-[70%] overflow-hidden text-ellipsis">
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
                className={`w-0 flex-grow min-w-[80px] px-3 py-3 bg-slate-800/50 ${
                  editError ? "border-l border-red-500/50" : "border-l border-slate-700/30"
                } text-slate-100 focus:outline-none text-sm md:text-xs sm:text-xs`}
                required
              />
            </div>
            {editError && <p className="text-red-400 text-sm mt-2 flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-red-400"></span>
              {editError}
            </p>}
            <p className="text-xs text-slate-500 mt-2">Only lowercase letters, numbers, hyphens, and underscores are allowed.</p>
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-medium text-slate-300">Description</label>
            <div className="flex items-center">
              <textarea
                value={editDetails.description}
                onChange={(e) => setEditDetails({ ...editDetails, description: e.target.value.substring(0, 200) })}
                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 resize-none text-base md:text-sm sm:text-xs"
                rows={3}
                maxLength={200}
                placeholder="Add a description for your mind map..."
              />
            </div>
            <div className="text-xs text-slate-400 text-right">
              {editDetails.description.length}/200
            </div>
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-medium text-slate-300 mb-3">Visibility</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setEditDetails({ ...editDetails, visibility: "public" })}
                className={`flex items-center justify-center px-3 py-3 rounded-xl transition-all duration-200 border ${editDetails.visibility === "public"
                  ? "bg-blue-600/80 text-white border-blue-500/50 shadow-lg shadow-blue-500/25"
                  : "bg-slate-800/50 text-slate-300 border-slate-700/50 hover:bg-slate-700/50 hover:border-slate-600/50"}`}
              >
                <Eye className={`w-4 h-4 mr-2 ${editDetails.visibility === "public" ? "text-white" : "text-slate-400"}`} />
                <span className="text-sm font-medium">Public</span>
              </button>
              <button
                type="button"
                onClick={() => setEditDetails({ ...editDetails, visibility: "private" })}
                className={`flex items-center justify-center px-3 py-3 rounded-xl transition-all duration-200 border ${editDetails.visibility === "private"
                  ? "bg-blue-600/80 text-white border-blue-500/50 shadow-lg shadow-blue-500/25"
                  : "bg-slate-800/50 text-slate-300 border-slate-700/50 hover:bg-slate-700/50 hover:border-slate-600/50"}`}
              >
                <EyeOff className={`w-4 h-4 mr-2 ${editDetails.visibility === "private" ? "text-white" : "text-slate-400"}`} />
                <span className="text-sm font-medium">Private</span>
              </button>
              <button
                type="button"
                onClick={() => setEditDetails({ ...editDetails, visibility: "linkOnly" })}
                className={`flex items-center justify-center px-3 py-3 rounded-xl transition-all duration-200 border ${editDetails.visibility === "linkOnly"
                  ? "bg-blue-600/80 text-white border-blue-500/50 shadow-lg shadow-blue-500/25"
                  : "bg-slate-800/50 text-slate-300 border-slate-700/50 hover:bg-slate-700/50 hover:border-slate-600/50"}`}
              >
                <Link className={`w-4 h-4 mr-2 ${editDetails.visibility === "linkOnly" ? "text-white" : "text-slate-400"}`} />
                <span className="text-sm font-medium">Link Only</span>
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
          <div className="space-y-3">
            <label className="block text-sm font-medium text-slate-300">Collaborators</label>
            
            {/* Add Collaborators Button */}
            <button
              type="button"
              onClick={() => setIsUserSelectModalOpen(true)}
              className="flex items-center justify-center px-4 py-3 rounded-xl transition-all duration-200 w-full bg-slate-800/50 text-slate-300 border border-slate-700/50 hover:bg-slate-700/50 hover:border-slate-600/50"
            >
              <UserPlus className="w-4 h-4 mr-2 text-slate-400" />
              <span className="font-medium">Add collaborators</span>
            </button>

            {/* Display Current Collaborators */}
            {collaboratorProfiles.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs text-slate-500 font-medium">Current collaborators:</p>
                <div className="space-y-2">
                  {collaboratorProfiles.map((collaborator) => (
                    <div
                      key={collaborator.id}
                      className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl border border-slate-700/50 hover:bg-slate-700/30 transition-all duration-200"
                    >
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-full bg-slate-600/50 flex-shrink-0 overflow-hidden mr-3 ring-2 ring-slate-700/30">
                          {collaborator.avatar_url ? (
                            <img
                              src={collaborator.avatar_url}
                              alt={collaborator.username}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-300 font-medium text-sm bg-gradient-to-br from-slate-600 to-slate-700">
                              {collaborator.username?.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-200">@{collaborator.username}</p>
                          {collaborator.full_name && (
                            <p className="text-xs text-slate-400">{collaborator.full_name}</p>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveCollaborator(collaborator.id)}
                        className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all duration-200"
                        title="Remove collaborator"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <p className="text-xs text-slate-500 leading-relaxed">
              Collaborators can edit this mindmap but cannot change its title, description, or settings.
            </p>
          </div>
        </div>
        <div className="flex justify-end items-center space-x-3 mt-8">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 text-slate-400 hover:text-slate-100 transition-colors font-medium"
          >
            Cancel
          </button>
          
          {editDetails.visibility === "public" ? (
            <div className="flex items-center space-x-3">
              {/* Help icon */}
              <div className="relative help-tooltip-container">
                <button
                  type="button"
                  onClick={() => setShowHelpTooltip(!showHelpTooltip)}
                  className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-700/50 border border-slate-600/50 text-slate-400 hover:text-blue-400 hover:border-blue-500/50 hover:bg-slate-600/50 transition-all duration-200"
                  title="Learn about publishing options"
                >
                  <HelpCircle className="w-4 h-4" />
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
                    className={`px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-l-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-lg ${
                      isSaving ? "animate-pulse" : ""
                    }`}
                  >
                    {getButtonText()}
                  </button>
                  
                  {/* Dropdown arrow button */}
                  <button
                    type="button"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    disabled={!editDetails.title.trim() || !editDetails.permalink.trim() || isSaving || !!editError}
                    className="px-3 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 border-l border-blue-500/30 rounded-r-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronDown className={`w-4 h-4 text-white transition-transform duration-200 ${isDropdownOpen ? "rotate-180" : ""}`} />
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
              className={`px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-lg ${
                isSaving ? "animate-pulse" : ""
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
          existingCollaborators={editDetails.collaborators}
        />
      )}
    </div>
  );
};

export default EditDetailsModal;
