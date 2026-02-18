'use client';

import React, { useState } from 'react';
import {
  ArrowLeft,
  Save,
  Loader,
  ChevronDown,
  MoreVertical,
  Edit3,
  SquarePen,
  Monitor,
  Maximize2,
  Search,
  ListMusic,
  Clock,
  X,
} from 'lucide-react';
import { MdQuestionMark } from 'react-icons/md';
import { FiMessageSquare } from 'react-icons/fi';

/* ─── Shared menu item component matching EdgeDropMenu style ─── */
const MenuItem: React.FC<{
  onClick?: () => void;
  icon: React.ReactNode;
  label: string;
  danger?: boolean;
  disabled?: boolean;
  active?: boolean;
  sub?: string;
}> = ({ onClick, icon, label, danger, disabled, active, sub }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-all duration-150 group
      ${disabled ? 'opacity-40 cursor-not-allowed' : ''}
      ${danger && !disabled ? 'hover:bg-red-500/10 border border-transparent hover:border-red-500/20' : ''}
      ${active && !danger ? 'bg-blue-500/15 border border-blue-500/20' : ''}
      ${!danger && !active && !disabled ? 'hover:bg-white/[0.06] border border-transparent hover:border-white/[0.08]' : ''}
      ${!active && !danger ? 'border border-transparent' : ''}
    `}
  >
    <div className={`flex items-center justify-center w-6 h-6 rounded-lg transition-all
      ${active ? 'bg-blue-500/20 text-blue-300' : ''}
      ${danger ? 'bg-white/[0.05] group-hover:bg-red-500/10 text-red-400' : ''}
      ${!active && !danger ? 'bg-white/[0.05] group-hover:bg-white/10 text-slate-400 group-hover:text-white' : ''}
    `}>
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <span className={`text-sm transition-colors
        ${active ? 'text-blue-300' : ''}
        ${danger ? 'text-red-400 group-hover:text-red-300' : ''}
        ${!active && !danger ? 'text-slate-300 group-hover:text-white' : ''}
      `}>
        {label}
      </span>
      {sub && <div className="text-[10px] text-slate-500">{sub}</div>}
    </div>
  </button>
);

/* ─── Shared glass button ─── */
const GlassButton: React.FC<{
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
  title?: string;
  disabled?: boolean;
}> = ({ onClick, children, className = '', title, disabled }) => (
  <button
    onClick={onClick}
    title={title}
    disabled={disabled}
    className={`flex items-center justify-center rounded-xl bg-gradient-to-br from-slate-800/80 via-slate-900/80 to-slate-800/80 backdrop-blur-xl border border-white/[0.08] hover:border-white/[0.15] hover:bg-white/[0.06] transition-all duration-200 text-slate-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
  >
    {children}
  </button>
);

/* ─── Dropdown wrapper matching EdgeDropMenu ─── */
const DropdownMenu: React.FC<{
  children: React.ReactNode;
  header?: React.ReactNode;
  width?: string;
}> = ({ children, header, width = 'min-w-[200px]' }) => (
  <div
    className={`absolute top-full right-0 mt-2 z-50 bg-gradient-to-br from-slate-800/95 via-slate-900/95 to-slate-800/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden ${width}`}
    style={{ animation: 'fadeInScale 0.15s ease-out' }}
  >
    {header && (
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-white/5">
        {header}
      </div>
    )}
    <div className="p-1.5">
      {children}
    </div>
  </div>
);

/* ─── Main header ─── */
interface MindMapViewerHeaderProps {
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  onClose: () => void;
  setShowUnsavedChangesModal: (show: boolean) => void;
  isSmallScreen: boolean;
  handleSearchOpen: () => void;
  detailedMap: any;
  currentMap: any;
  isEditingTitle: boolean;
  setIsEditingTitle: (editing: boolean) => void;
  editedTitle: string;
  handleTitleChange: (title: string) => void;
  originalTitle: string;
  setHasUnsavedChanges: (hasChanges: boolean) => void;
  titleRef: React.RefObject<HTMLInputElement>;
  setEditedTitle: (title: string) => void;
  user: any;
  showThreeDotMenu: boolean;
  setShowThreeDotMenu: (show: boolean) => void;
  setShowEditDetailsModal: (show: boolean) => void;
  setShowCustomizationModal: (show: boolean) => void;
  handleViewNavigation: () => void;
  handleSave: () => void;
  showAutosaveMenu: boolean;
  setShowAutosaveMenu: (show: boolean) => void;
  autosaveInterval: 'off' | '5min' | '10min' | 'custom';
  setAutosaveInterval: (interval: 'off' | '5min' | '10min' | 'custom') => void;
  showCustomInput: boolean;
  setShowCustomInput: (show: boolean) => void;
  customAutosaveMinutes: number;
  setCustomAutosaveMinutes: (minutes: number) => void;
  handleFullscreen: () => void;
  isAddingToPlaylist: boolean;
  toggleAddToPlaylistMode: (nodeId: string | null) => void;
  setShowBrainstormChat: (show: boolean) => void;
  unreadChatCount: number;
  setUnreadChatCount: (count: number | ((prev: number) => number)) => void;
  setShowHelpModal: (show: boolean) => void;
}

export const MindMapViewerHeader: React.FC<MindMapViewerHeaderProps> = ({
  hasUnsavedChanges,
  isSaving,
  onClose,
  setShowUnsavedChangesModal,
  isSmallScreen,
  handleSearchOpen,
  detailedMap,
  currentMap,
  isEditingTitle,
  setIsEditingTitle,
  editedTitle,
  handleTitleChange,
  originalTitle,
  setHasUnsavedChanges,
  titleRef,
  setEditedTitle,
  user,
  showThreeDotMenu,
  setShowThreeDotMenu,
  setShowEditDetailsModal,
  setShowCustomizationModal,
  handleViewNavigation,
  handleSave,
  showAutosaveMenu,
  setShowAutosaveMenu,
  autosaveInterval,
  setAutosaveInterval,
  showCustomInput,
  setShowCustomInput,
  customAutosaveMinutes,
  setCustomAutosaveMinutes,
  handleFullscreen,
  isAddingToPlaylist,
  toggleAddToPlaylistMode,
  setShowBrainstormChat,
  unreadChatCount,
  setUnreadChatCount,
  setShowHelpModal,
}) => {
  const mapData = detailedMap || currentMap;
  const isCreator = user?.id === mapData?.creator;
  const isCollaborator = mapData?.collaborators?.includes(user?.id);
  const canEdit = isCreator || isCollaborator;

  return (
    <>
      {/* ─── Top bar: single unified glass strip ─── */}
      <div className="absolute top-3 left-3 right-3 z-50 flex items-center gap-2">

        {/* Left group */}
        <div className="flex items-center gap-1.5 rounded-2xl bg-gradient-to-br from-slate-800/80 via-slate-900/80 to-slate-800/80 backdrop-blur-xl border border-white/[0.08] p-1">
          <GlassButton
            onClick={() => {
              if (hasUnsavedChanges) setShowUnsavedChangesModal(true);
              else onClose();
            }}
            disabled={isSaving}
            className="px-3 py-2 gap-2 border-0 bg-transparent hover:bg-white/[0.06]"
            title="Back to notes"
          >
            <ArrowLeft className="w-4 h-4" />
            {!isSmallScreen && <span className="text-sm">Back</span>}
          </GlassButton>

          <div className="w-px h-5 bg-white/[0.06]" />

          <GlassButton
            onClick={handleSearchOpen}
            className="w-9 h-9 border-0 bg-transparent hover:bg-white/[0.06]"
            title="Search nodes (Ctrl+F)"
          >
            <Search className="w-4 h-4" />
          </GlassButton>
        </div>

        {/* Center title */}
        <div className="flex-1 flex justify-center min-w-0">
          {isEditingTitle ? (
            <input
              type="text"
              ref={titleRef}
              value={editedTitle}
              onChange={(e) => handleTitleChange(e.target.value)}
              onBlur={() => {
                setIsEditingTitle(false);
                if (editedTitle.trim() === '') {
                  setEditedTitle(originalTitle);
                  setHasUnsavedChanges(false);
                }
              }}
              onKeyDown={(e) => {
                if (e.key !== 'Enter') return;
                setIsEditingTitle(false);
                if (editedTitle.trim() === '') {
                  setEditedTitle(originalTitle);
                  setHasUnsavedChanges(false);
                }
              }}
              className="text-base font-semibold text-center bg-gradient-to-br from-slate-800/80 via-slate-900/80 to-slate-800/80 backdrop-blur-xl border border-blue-500/40 rounded-xl px-4 py-2 focus:outline-none focus:border-blue-400/60 text-white max-w-xs w-full"
              autoFocus
            />
          ) : (
            <button
              className="text-base font-semibold text-center text-slate-200 hover:text-white bg-gradient-to-br from-slate-800/60 via-slate-900/60 to-slate-800/60 backdrop-blur-xl border border-white/[0.06] hover:border-white/[0.12] rounded-xl px-4 py-2 transition-all duration-200 truncate max-w-xs cursor-text"
              onClick={() => setIsEditingTitle(true)}
              title="Click to edit title"
            >
              {editedTitle}
            </button>
          )}
        </div>

        {/* Right group */}
        <div className="flex items-center gap-1.5 rounded-2xl bg-gradient-to-br from-slate-800/80 via-slate-900/80 to-slate-800/80 backdrop-blur-xl border border-white/[0.08] p-1">

          {/* Three-dot menu */}
          {canEdit && (
            <div className="relative three-dot-dropdown">
              <GlassButton
                onClick={() => setShowThreeDotMenu(!showThreeDotMenu)}
                className="w-9 h-9 border-0 bg-transparent hover:bg-white/[0.06]"
              >
                <MoreVertical className="w-4 h-4" />
              </GlassButton>

              {showThreeDotMenu && (
                <DropdownMenu
                  header={
                    <>
                      <MoreVertical className="w-3.5 h-3.5 text-blue-400" />
                      <span className="text-xs font-semibold text-slate-300 tracking-wide">Options</span>
                    </>
                  }
                >
                  {isCreator && (
                    <MenuItem
                      onClick={() => { setShowEditDetailsModal(true); setShowThreeDotMenu(false); }}
                      icon={<Edit3 className="w-3.5 h-3.5" />}
                      label="Edit details"
                    />
                  )}
                  <MenuItem
                    onClick={() => { setShowCustomizationModal(true); setShowThreeDotMenu(false); }}
                    icon={<SquarePen className="w-3.5 h-3.5" />}
                    label="Customize"
                  />
                  <MenuItem
                    onClick={() => { setShowThreeDotMenu(false); handleViewNavigation(); }}
                    icon={<Monitor className="w-3.5 h-3.5" />}
                    label="View"
                  />
                </DropdownMenu>
              )}
            </div>
          )}

          <div className="w-px h-5 bg-white/[0.06]" />

          {/* Save button group */}
          <div className="relative autosave-dropdown flex items-center">
            <GlassButton
              onClick={handleSave}
              disabled={!hasUnsavedChanges || isSaving}
              className={`px-3 py-2 gap-2 rounded-r-none border-0
                ${hasUnsavedChanges && !isSaving
                  ? 'bg-gradient-to-r from-blue-600/30 to-purple-600/30 text-white hover:from-blue-600/40 hover:to-purple-600/40'
                  : isSaving
                    ? 'bg-orange-500/20 text-orange-300'
                    : 'bg-transparent text-slate-500'
                }
              `}
              title="Save (Ctrl+S)"
            >
              {isSaving
                ? <Loader className="w-4 h-4 animate-spin" />
                : <Save className="w-4 h-4" />
              }
              {!isSmallScreen && <span className="text-sm">{isSaving ? 'Saving' : 'Save'}</span>}
            </GlassButton>
            <GlassButton
              onClick={() => setShowAutosaveMenu(!showAutosaveMenu)}
              disabled={isSaving}
              className="w-7 h-9 rounded-l-none border-0 border-l border-l-white/[0.06] bg-transparent hover:bg-white/[0.06]"
            >
              <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${showAutosaveMenu ? 'rotate-180' : ''}`} />
            </GlassButton>

            {showAutosaveMenu && (
              <DropdownMenu
                width="min-w-[210px]"
                header={
                  <>
                    <Clock className="w-3.5 h-3.5 text-blue-400" />
                    <span className="text-xs font-semibold text-slate-300 tracking-wide">Autosave</span>
                    <div className="relative group ml-auto">
                      <MdQuestionMark className="w-3 h-3 text-slate-500 hover:text-slate-300 cursor-help" />
                      <div className="absolute top-full right-0 mt-2 w-56 p-3 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                        <p className="text-[11px] text-slate-300">Applies globally to all mindmaps.</p>
                        <p className="text-[11px] text-amber-400 mt-1.5">After saving you cannot undo, so use autosave with caution.</p>
                      </div>
                    </div>
                  </>
                }
              >
                <MenuItem
                  onClick={() => { setAutosaveInterval('off'); setShowCustomInput(false); setShowAutosaveMenu(false); }}
                  icon={<X className="w-3.5 h-3.5" />}
                  label="Off"
                  active={autosaveInterval === 'off'}
                />
                <MenuItem
                  onClick={() => { setAutosaveInterval('5min'); setShowCustomInput(false); setShowAutosaveMenu(false); }}
                  icon={<Clock className="w-3.5 h-3.5" />}
                  label="5 minutes"
                  active={autosaveInterval === '5min'}
                />
                <MenuItem
                  onClick={() => { setAutosaveInterval('10min'); setShowCustomInput(false); setShowAutosaveMenu(false); }}
                  icon={<Clock className="w-3.5 h-3.5" />}
                  label="10 minutes"
                  active={autosaveInterval === '10min'}
                />
                <MenuItem
                  onClick={() => { setAutosaveInterval('custom'); setShowCustomInput(true); }}
                  icon={<Clock className="w-3.5 h-3.5" />}
                  label="Custom"
                  active={autosaveInterval === 'custom'}
                  sub={`${customAutosaveMinutes} min`}
                />
                {showCustomInput && (
                  <div className="mt-1 mx-1 p-2 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                    <div className="text-[10px] text-slate-500 mb-1.5">Interval (1-30 min)</div>
                    <input
                      type="number"
                      min="1"
                      max="30"
                      value={customAutosaveMinutes}
                      onChange={(e) => {
                        const v = Math.max(1, Math.min(30, parseInt(e.target.value) || 1));
                        setCustomAutosaveMinutes(v);
                      }}
                      className="w-full px-2.5 py-1.5 text-xs bg-white/[0.04] border border-white/[0.06] rounded-lg text-white focus:outline-none focus:border-blue-500/40 transition-colors"
                      autoFocus
                    />
                  </div>
                )}
              </DropdownMenu>
            )}
          </div>

          <div className="w-px h-5 bg-white/[0.06]" />

          {/* Fullscreen */}
          <GlassButton
            onClick={handleFullscreen}
            className="w-9 h-9 border-0 bg-transparent hover:bg-white/[0.06]"
            title="Fullscreen"
          >
            <Maximize2 className="w-4 h-4" />
          </GlassButton>
        </div>
      </div>

      {/* ─── Playlist banner ─── */}
      {isAddingToPlaylist && (
        <div className="absolute top-16 left-1/2 transform -translate-x-1/2 z-50 max-w-xl">
          <div className="px-4 py-2.5 bg-gradient-to-r from-blue-600/40 to-purple-600/40 backdrop-blur-xl border border-blue-500/30 rounded-2xl text-sm text-blue-100 flex items-center gap-3">
            <ListMusic className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1">Click any audio, Spotify, SoundCloud, or YouTube node to add to playlist</span>
            <button
              onClick={() => toggleAddToPlaylistMode(null)}
              className="px-2.5 py-1 bg-white/[0.08] hover:bg-white/[0.15] border border-white/[0.1] text-white rounded-lg text-xs transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ─── Bottom right: chat & help ─── */}
      <div className="fixed bottom-4 right-4 z-30 flex flex-col sm:flex-row gap-2">
        <div className="relative">
          <GlassButton
            onClick={() => { setShowBrainstormChat(true); setUnreadChatCount(0); }}
            className="w-11 h-11 sm:w-10 sm:h-10"
            title="AI Chat"
          >
            <FiMessageSquare className="w-5 h-5" />
          </GlassButton>
          {unreadChatCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-gradient-to-br from-purple-500 to-blue-600 text-white text-[10px] leading-[18px] rounded-full ring-1 ring-white/20 flex items-center justify-center shadow-lg shadow-purple-500/30">
              {unreadChatCount > 9 ? '9+' : unreadChatCount}
            </span>
          )}
        </div>
        <GlassButton
          onClick={() => setShowHelpModal(true)}
          className="w-11 h-11 sm:w-10 sm:h-10"
          title="Help"
        >
          <MdQuestionMark className="w-5 h-5" />
        </GlassButton>
      </div>

      {/* Animation keyframes */}
      <style jsx>{`
        @keyframes fadeInScale {
          from { opacity: 0; transform: scale(0.95) translateY(-4px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </>
  );
};

export default MindMapViewerHeader;
