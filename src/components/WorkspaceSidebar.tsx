import React from 'react'
import { Link as RouterLink } from 'react-router-dom'
import {
  Trash2,
  Plus,
  ChevronRight,
  FileText,
  Search,
  MoreHorizontal,
  FolderPlus,
  Folder,
  FolderOpen,
  X,
  Check,
  Share2,
  Palette,
  Network,
  Globe,
  Lock,
  Link,
} from "lucide-react"
import { HexColorPicker } from "react-colorful"
import { NoteItem, FolderItem, MindMapItem } from "../pages/Notes"
import { useAuthStore } from '../store/authStore'
import { useMindMapStore } from '../store/mindMapStore'

interface WorkspaceSidebarProps {
  notes: NoteItem[]
  folders: FolderItem[]
  mindmaps: MindMapItem[]
  activeNoteId: string | null
  selectedNotes: Set<string>
  selectedMindmaps: Set<string>
  searchQuery: string
  isCollapsed: boolean
  width: number
  showNoteMenu: string | null
  showMindmapMenu: string | null
  showBulkMoveMenu: boolean
  renamingFolder: string | null
  colorPickerFolder: string | null
  tempColor: string
  sidebarRef: React.RefObject<HTMLDivElement>
  menuRef: React.RefObject<HTMLDivElement>
  onSetActiveNoteId: (id: string | null) => void
  onSetSearchQuery: (query: string) => void
  onSetSelectedNotes: (notes: Set<string>) => void
  onSetSelectedMindmaps: (mindmaps: Set<string>) => void
  onSetShowNoteMenu: (id: string | null) => void
  onSetShowMindmapMenu: (id: string | null) => void
  onSetShowBulkMoveMenu: (show: boolean) => void
  onSetIsResizing: (resizing: boolean) => void
  onSetRenamingFolder: (id: string | null) => void
  onSetColorPickerFolder: (id: string | null) => void
  onSetTempColor: (color: string) => void
  onAddNote: (folderId: string | null) => void
  onDeleteNote: (id: string, title?: string) => void
  onAddFolder: (parentId: string | null) => void
  onDeleteFolder: (id: string, name?: string) => void
  onToggleFolder: (id: string) => void
  onMoveNoteToFolder: (noteId: string, folderId: string | null) => void
  onChangeFolderColor: (folderId: string, color: string) => void
  onDeleteSelectedNotes: () => void
  onMoveSelectedNotes: (folderId: string | null) => void
  onToggleNoteSelection: (e: React.MouseEvent, noteId: string) => void
  onToggleMindmapSelection: (e: React.MouseEvent, mindmapId: string) => void
  onUpdateFolderLocal: (folderId: string, updates: Partial<FolderItem>) => void
  onDebouncedSaveFolder: (folder: FolderItem) => void
}

export const WorkspaceSidebar: React.FC<WorkspaceSidebarProps> = ({
  notes,
  folders,
  mindmaps,
  activeNoteId,
  selectedNotes,
  selectedMindmaps,
  searchQuery,
  isCollapsed,
  width,
  showNoteMenu,
  showMindmapMenu,
  showBulkMoveMenu,
  renamingFolder,
  colorPickerFolder,
  tempColor,
  sidebarRef,
  menuRef,
  onSetActiveNoteId,
  onSetSearchQuery,
  onSetSelectedNotes,
  onSetSelectedMindmaps,
  onSetShowNoteMenu,
  onSetShowMindmapMenu,
  onSetShowBulkMoveMenu,
  onSetIsResizing,
  onSetRenamingFolder,
  onSetColorPickerFolder,
  onSetTempColor,
  onAddNote,
  onDeleteNote,
  onAddFolder,
  onDeleteFolder,
  onToggleFolder,
  onMoveNoteToFolder,
  onChangeFolderColor,
  onDeleteSelectedNotes,
  onMoveSelectedNotes,
  onToggleNoteSelection,
  onToggleMindmapSelection,
  onUpdateFolderLocal,
  onDebouncedSaveFolder,
}) => {
  const { user } = useAuthStore()
  const { maps } = useMindMapStore()

  const formatDate = (ts: number) => {
    const d = new Date(ts)
    const now = new Date()
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    }
    return d.toLocaleDateString([], { month: "short", day: "numeric" })
  }

  const getPreview = (html: string) => {
    const tmp = document.createElement("div")
    tmp.innerHTML = html
    const text = tmp.textContent || ""
    return text.slice(0, 60) || "Empty note"
  }

  const filteredNotes = searchQuery
    ? notes.filter(
        (n) =>
          (n.title || "Untitled").toLowerCase().includes(searchQuery.toLowerCase()) ||
          getPreview(n.content).toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : notes

  const rootNotes = filteredNotes.filter((n) => !n.folderId)
  const notesInFolder = (fId: string) => filteredNotes.filter((n) => n.folderId === fId)
  const rootMindmaps = mindmaps.filter((m) => !m.folderId)
  const mindmapsInFolder = (fId: string) => mindmaps.filter((m) => m.folderId === fId)

  // Recursive folder renderer
  const renderFolder = (folder: FolderItem) => {
    const childFolders = folders.filter((f) => f.parentId === folder.id)
    const folderNotes = notesInFolder(folder.id)
    const folderMindmaps = mindmapsInFolder(folder.id)

    return (
      <div key={folder.id} className="mb-1">
        <div className="group/folder flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-white/[0.04] transition-colors relative">
          <button
            onClick={() => onToggleFolder(folder.id)}
            className="flex-shrink-0"
          >
            <ChevronRight
              className="w-3 h-3 text-slate-600 transition-transform duration-200"
              style={{
                transform: folder.collapsed ? "rotate(0deg)" : "rotate(90deg)",
              }}
            />
          </button>
          {folder.collapsed ? (
            <Folder
              className="w-4 h-4 flex-shrink-0"
              style={{ color: folder.color }}
            />
          ) : (
            <FolderOpen
              className="w-4 h-4 flex-shrink-0"
              style={{ color: folder.color }}
            />
          )}

          {renamingFolder === folder.id ? (
            <input
              autoFocus
              defaultValue={folder.name === "New Folder" ? "" : folder.name}
              placeholder={folder.name || "New Folder"}
              onFocus={(e) => {
                if (folder.name === "New Folder") {
                  e.target.select()
                }
              }}
              onBlur={(e) => {
                if (!user?.id) return
                const newName = e.target.value || "Untitled"
                onUpdateFolderLocal(folder.id, { name: newName })
                onDebouncedSaveFolder({ ...folder, name: newName })
                onSetRenamingFolder(null)
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  ;(e.target as HTMLInputElement).blur()
                }
                if (e.key === "Escape") {
                  onSetRenamingFolder(null)
                }
              }}
              className="flex-1 bg-white/[0.06] text-sm text-slate-200 outline-none border border-blue-500/40 rounded px-1.5 py-0.5 min-w-0"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span
              className="text-sm text-slate-400 truncate flex-1 cursor-text"
              onDoubleClick={(e) => {
                e.stopPropagation()
                onSetRenamingFolder(folder.id)
              }}
              title="Double-click to rename"
            >
              {folder.name}
            </span>
          )}

          <span className="text-[10px] text-slate-600 flex-shrink-0 group-hover/folder:hidden">
            {folderNotes.length + folderMindmaps.length + childFolders.length}
          </span>
          
          <div className="items-center gap-0.5 hidden group-hover/folder:flex flex-shrink-0">
             <button
              onClick={(e) => {
                e.stopPropagation()
                onSetRenamingFolder(folder.id)
              }}
              className="w-5 h-5 flex items-center justify-center rounded text-slate-600 hover:text-slate-300 hover:bg-white/[0.06] transition-colors"
              title="Rename folder"
            >
              <FileText className="w-3 h-3" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onSetColorPickerFolder(colorPickerFolder === folder.id ? null : folder.id)
                onSetTempColor(folder.color)
              }}
              className="w-5 h-5 flex items-center justify-center rounded text-slate-600 hover:text-purple-400 hover:bg-white/[0.06] transition-colors"
              title="Change color"
            >
              <Palette className="w-3 h-3" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onAddFolder(folder.id)
              }}
              className="w-5 h-5 flex items-center justify-center rounded text-slate-600 hover:text-slate-300 hover:bg-white/[0.06] transition-colors"
              title="Add subfolder"
            >
              <FolderPlus className="w-3 h-3" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onAddNote(folder.id)
              }}
              className="w-5 h-5 flex items-center justify-center rounded text-slate-600 hover:text-slate-300 hover:bg-white/[0.06] transition-colors"
              title="Add note to folder"
            >
              <Plus className="w-3 h-3" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDeleteFolder(folder.id, folder.name)
              }}
              className="w-5 h-5 flex items-center justify-center rounded text-slate-600 hover:text-red-400 hover:bg-white/[0.06] transition-colors"
              title="Delete folder"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Folder Color Picker Popup */}
        {colorPickerFolder === folder.id && (
          <div className="ml-12 mb-2 p-3 bg-gradient-to-br from-slate-800/95 via-slate-900/95 to-slate-800/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl"
            style={{ animation: 'fadeInScale 0.15s ease-out' }}
          >
            <HexColorPicker 
              color={tempColor} 
              onChange={onSetTempColor}
              style={{ width: '100%', height: '120px' }}
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => {
                  onChangeFolderColor(folder.id, tempColor)
                  onSetColorPickerFolder(null)
                }}
                className="flex-1 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                Apply
              </button>
              <button
                onClick={() => onSetColorPickerFolder(null)}
                className="flex-1 px-3 py-1.5 text-xs font-medium text-slate-300 bg-white/[0.06] hover:bg-white/[0.10] rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {!folder.collapsed && (
          <div className="ml-4 border-l border-white/[0.04] pl-1">
            
            {/* Render Subfolders */}
            {childFolders.map((child) => renderFolder(child))}

            {/* Render Notes */}
            {folderNotes.map((note) => (
               <NoteListItem key={note.id} note={note} />
            ))}
            
            {/* Render Mindmaps */}
            {folderMindmaps.map((mindmap) => (
               <MindMapListItem key={mindmap.id} mindmap={mindmap} />
            ))}
            
            {folderNotes.length === 0 && folderMindmaps.length === 0 && childFolders.length === 0 && (
                 <p className="text-[11px] text-slate-700 px-3 py-2">
                   Empty
                 </p>
            )}
          </div>
        )}

      </div>
    )
  }

  /* --- note list item --- */
  const NoteListItem = ({ note }: { note: NoteItem }) => {
    const isActive = activeNoteId === note.id
    const isSelected = selectedNotes.has(note.id)

    return (
      <div className="relative group/note">
        <button
          onClick={() => {
            onSetActiveNoteId(note.id)
          }}
          className={`w-full text-left px-3 py-2.5 rounded-xl mb-0.5 transition-all duration-200 ${
            isActive
              ? "bg-gradient-to-r from-blue-500/10 via-purple-500/5 to-transparent border border-white/[0.08]"
              : isSelected
                ? "bg-blue-500/10 border border-blue-500/20"
                : "hover:bg-white/[0.04] border border-transparent"
          }`}
        >
          <div className="flex items-start gap-2.5">
            <div
              onClick={(e) => onToggleNoteSelection(e, note.id)}
              className={`w-4 h-4 mt-1 flex-shrink-0 flex items-center justify-center rounded border transition-all cursor-pointer ${
                isSelected
                  ? "bg-blue-500 border-blue-500 text-white opacity-100"
                  : "border-slate-500 bg-transparent opacity-0 group-hover/note:opacity-100 hover:border-slate-300"
              }`}
            >
              {isSelected && <Check className="w-3 h-3 pointer-events-none" />}
            </div>
            <FileText className="w-4 h-4 mt-1 flex-shrink-0" style={{ color: note.color }} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span
                  className={`text-sm font-medium truncate ${
                    isActive ? "text-white" : "text-slate-400"
                  }`}
                >
                  {note.title || "Untitled"}
                </span>
                <span className="text-[11px] text-slate-600 flex-shrink-0 ml-2 group-hover/note:hidden transition-opacity">
                  {formatDate(note.updatedAt)}
                </span>
              </div>
              <p className="text-[12px] text-slate-600 truncate mt-0.5">
                {getPreview(note.content)}
              </p>
            </div>
          </div>
        </button>

        {!isSelected && (
          <div className="absolute right-2 top-2.5">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onSetShowNoteMenu(showNoteMenu === note.id ? null : note.id)
              }}
              className={`w-6 h-6 flex items-center justify-center rounded-md transition-all duration-150 ${
                showNoteMenu === note.id
                  ? "opacity-100 bg-white/[0.08]"
                  : "opacity-0 group-hover/note:opacity-100 hover:bg-white/[0.08]"
              } text-slate-500 hover:text-slate-300`}
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {showNoteMenu === note.id && (
          <div
            ref={menuRef}
            className="absolute right-1 top-9 z-50 bg-gradient-to-br from-slate-800/95 via-slate-900/95 to-slate-800/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden min-w-[180px]"
            style={{ animation: 'fadeInScale 0.15s ease-out' }}
          >
            <div className="p-1.5">
              {/* Move to folder options */}
              {folders.length > 0 && (
                <>
                  <div className="px-3 py-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                    Move to
                  </div>
                  {note.folderId && (
                    <button
                      onClick={() => onMoveNoteToFolder(note.id, null)}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-all duration-150 hover:bg-white/[0.06] border border-transparent hover:border-white/[0.08] group"
                    >
                      <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-white/[0.05] group-hover:bg-white/10 transition-all">
                        <FileText className="w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-colors" />
                      </div>
                      <span className="text-sm text-slate-300 group-hover:text-white transition-colors">Root</span>
                    </button>
                  )}
                  {folders
                    .filter((f) => f.id !== note.folderId)
                    .map((f) => (
                      <button
                        key={f.id}
                        onClick={() => onMoveNoteToFolder(note.id, f.id)}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-all duration-150 hover:bg-white/[0.06] border border-transparent hover:border-white/[0.08] group"
                      >
                        <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-white/[0.05] group-hover:bg-white/10 transition-all">
                          <Folder className="w-3.5 h-3.5 transition-colors" style={{ color: f.color }} />
                        </div>
                        <span className="text-sm text-slate-300 group-hover:text-white transition-colors">{f.name}</span>
                      </button>
                    ))}
                  <div className="my-1 mx-2 border-t border-white/[0.06]" />
                </>
              )}
              <button
                onClick={() => onSetShowNoteMenu(null)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-all duration-150 border border-transparent cursor-not-allowed opacity-40"
                disabled
                title="Coming soon"
              >
                <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-white/[0.05]">
                  <Share2 className="w-3.5 h-3.5 text-slate-400" />
                </div>
                <span className="text-sm text-slate-400">Turn into Mindmap</span>
              </button>
              <button
                onClick={() => onDeleteNote(note.id, note.title)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-all duration-150 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 group"
              >
                <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-white/[0.05] group-hover:bg-red-500/10 transition-all">
                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                </div>
                <span className="text-sm text-red-400 group-hover:text-red-300 transition-colors">Delete</span>
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  /* --- mindmap list item --- */
  const MindMapListItem = ({ mindmap }: { mindmap: MindMapItem }) => {
    const isSelected = selectedMindmaps.has(mindmap.id)

    const getVisibilityIcon = () => {
      const visibility = mindmap.visibility || 'private'
      const iconClass = "w-3 h-3"
      
      switch (visibility) {
        case 'public':
          return <Globe className={iconClass} />
        case 'linkOnly':
          return <Link className={iconClass} />
        default:
          return <Lock className={iconClass} />
      }
    }

    // Find the actual map to get its permalink
    const map = maps.find(m => m.id === mindmap.id || m.permalink === mindmap.id)
    const permalink = map?.permalink || mindmap.id
    const targetPath = user?.username ? `/${user.username}/${permalink}/edit` : '#'

    return (
      <div className="relative group/mindmap">
        <RouterLink
          to={targetPath}
          className={`block w-full text-left px-3 py-2.5 rounded-xl mb-0.5 transition-all duration-200 border ${
            isSelected
              ? "bg-purple-500/10 border-purple-500/20"
              : "hover:bg-white/[0.04] border-transparent hover:border-purple-500/20"
          }`}
        >
          <div className="flex items-start gap-2.5">
            <div
              onClick={(e) => onToggleMindmapSelection(e, mindmap.id)}
              className={`w-4 h-4 mt-1 flex-shrink-0 flex items-center justify-center rounded border transition-all cursor-pointer ${
                isSelected
                  ? "bg-purple-500 border-purple-500 text-white opacity-100"
                  : "border-slate-500 bg-transparent opacity-0 group-hover/mindmap:opacity-100 hover:border-slate-300"
              }`}
            >
              {isSelected && <Check className="w-3 h-3 pointer-events-none" />}
            </div>
            <Network className="w-4 h-4 mt-1 flex-shrink-0 text-purple-400" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  <span className="text-sm font-medium truncate text-slate-400">
                    {mindmap.title || "Untitled Mindmap"}
                  </span>
                  <div className="text-slate-600 opacity-70 shrink-0">
                    {getVisibilityIcon()}
                  </div>
                </div>
                <span className="text-[11px] text-slate-600 flex-shrink-0 ml-2 group-hover/mindmap:hidden transition-opacity">
                  {formatDate(mindmap.updatedAt)}
                </span>
              </div>
            </div>
          </div>
        </RouterLink>

        {!isSelected && (
          <div className="absolute right-2 top-2.5">
            <button
              onClick={(e) => {
                e.stopPropagation()
                e.preventDefault()
                onSetShowMindmapMenu(showMindmapMenu === mindmap.id ? null : mindmap.id)
              }}
              className={`w-6 h-6 flex items-center justify-center rounded-md transition-all duration-150 ${
                showMindmapMenu === mindmap.id
                  ? "opacity-100 bg-white/[0.08]"
                  : "opacity-0 group-hover/mindmap:opacity-100 hover:bg-white/[0.08]"
              } text-slate-500 hover:text-slate-300`}
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {showMindmapMenu === mindmap.id && (
          <div
            ref={menuRef}
            className="absolute right-2 top-10 z-50 bg-gradient-to-br from-slate-800/95 via-slate-900/95 to-slate-800/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden min-w-[160px]"
            style={{ animation: 'fadeInScale 0.15s ease-out' }}
            onClick={(e) => e.preventDefault()}
          >
            <div className="flex items-center gap-2 px-3 py-2.5 border-b border-white/5">
              <Folder className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-xs font-semibold text-slate-300 tracking-wide">Move to</span>
            </div>
            <div className="p-1.5">
              <button
                disabled
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-all duration-150 opacity-40 cursor-not-allowed"
                title="Coming soon"
              >
                <Share2 className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-sm text-slate-300">Rename</span>
              </button>
              <button
                disabled
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-all duration-150 opacity-40 cursor-not-allowed"
                title="Coming soon"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-400" />
                <span className="text-sm text-slate-300">Delete</span>
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      ref={sidebarRef}
      style={{ width: isCollapsed ? 0 : width }}
      className={`flex-shrink-0 flex flex-col h-full border-r border-white/[0.08] bg-gradient-to-b from-slate-800/60 via-slate-900/60 to-slate-800/60 backdrop-blur-xl relative ${
        isCollapsed ? "overflow-hidden border-r-0" : ""
      }`}
    >
      {/* Resize Handle */}
      <div 
         className="absolute right-[-2px] top-0 bottom-0 w-2 cursor-col-resize hover:bg-blue-500/50 z-20 transition-colors"
         onMouseDown={(e) => {
           e.preventDefault()
           e.stopPropagation()
           onSetIsResizing(true)
         }}
      />
      {/* Header */}
      {(selectedNotes.size > 0 || selectedMindmaps.size > 0) ? (
        <div className="p-4 flex items-center justify-between bg-blue-500/10 border-b border-blue-500/20">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onSetSelectedNotes(new Set())
                onSetSelectedMindmaps(new Set())
              }}
              className="text-slate-400 hover:text-white transition-colors"
              title="Clear selection"
            >
              <X className="w-4 h-4" />
            </button>
            <span className="text-sm font-medium text-blue-400">
              {selectedNotes.size + selectedMindmaps.size} selected
            </span>
          </div>
          <div className="flex items-center gap-1 relative">
            <button
              onClick={() => onSetShowBulkMoveMenu(!showBulkMoveMenu)}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/[0.1] text-slate-300 transition-colors"
              title="Move selected"
            >
              <Folder className="w-4 h-4" />
            </button>
            <button
              onClick={onDeleteSelectedNotes}
              disabled={selectedMindmaps.size > 0}
              className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${
                selectedMindmaps.size > 0
                  ? "opacity-40 cursor-not-allowed text-slate-500"
                  : "hover:bg-red-500/20 text-red-400"
              }`}
              title={selectedMindmaps.size > 0 ? "Delete not available for mindmaps yet" : "Delete selected"}
            >
              <Trash2 className="w-4 h-4" />
            </button>

            {/* Bulk Move Menu */}
          {showBulkMoveMenu && (
            <div
              ref={menuRef}
              className="absolute right-0 top-9 z-50 bg-gradient-to-br from-slate-800/95 via-slate-900/95 to-slate-800/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden min-w-[180px]"
              style={{ animation: 'fadeInScale 0.15s ease-out' }}
            >
              <div className="flex items-center gap-2 px-3 py-2.5 border-b border-white/5">
                <Folder className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-xs font-semibold text-slate-300 tracking-wide">Move to</span>
              </div>
              <div className="p-1.5">
                <button
                  onClick={() => onMoveSelectedNotes(null)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-all duration-150 hover:bg-white/[0.06] border border-transparent hover:border-white/[0.08] group"
                >
                  <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-white/[0.05] group-hover:bg-white/10 transition-all">
                    <FileText className="w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-colors" />
                  </div>
                  <span className="text-sm text-slate-300 group-hover:text-white transition-colors">Root</span>
                </button>
                {folders.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => onMoveSelectedNotes(f.id)}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-all duration-150 hover:bg-white/[0.06] border border-transparent hover:border-white/[0.08] group"
                  >
                    <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-white/[0.05] group-hover:bg-white/10 transition-all">
                      <Folder className="w-3.5 h-3.5 transition-colors" style={{ color: f.color }} />
                    </div>
                    <span className="text-sm text-slate-300 group-hover:text-white transition-colors">{f.name}</span>
                  </button>
                ))}
              </div>
            </div>
            )}
          </div>
        </div>
      ) : (
        <div className="p-4 flex items-center justify-between border-b border-white/[0.06]">
          <h2 className="text-base font-semibold tracking-normal bg-gradient-to-r from-pink-300 via-purple-300 to-blue-300 text-transparent bg-clip-text" style={{letterSpacing: '0.01em'}}>
            Workspace
          </h2>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onAddFolder(null)}
              className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/[0.05] hover:bg-gradient-to-br hover:from-blue-500/20 hover:to-purple-500/20 border border-white/[0.06] hover:border-white/[0.12] transition-all duration-200 text-slate-400 hover:text-white"
              title="New folder"
            >
              <FolderPlus className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onAddNote(null)}
              className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/[0.05] hover:bg-gradient-to-br hover:from-blue-500/20 hover:to-purple-500/20 border border-white/[0.06] hover:border-white/[0.12] transition-all duration-200 text-slate-400 hover:text-white"
              title="New note"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="px-3 pb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSetSearchQuery(e.target.value)}
            placeholder="Search notes..."
            className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl py-2 pl-9 pr-3 text-sm text-slate-300 placeholder-slate-600 outline-none focus:border-blue-500/30 focus:bg-white/[0.06] transition-all duration-200"
          />
        </div>
      </div>

      {/* Note list */}
      <div className="flex-1 overflow-y-auto px-2 pb-2 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
        {notes.length === 0 && folders.length === 0 ? (
          <div className="px-3 py-8 text-center">
            <FileText className="w-8 h-8 text-slate-700 mx-auto mb-3" />
            <p className="text-sm text-slate-600">No notes yet</p>
            <button
              onClick={() => onAddNote(null)}
              className="mt-3 text-xs text-blue-400/80 hover:text-blue-400 transition-colors"
            >
              Create your first note
            </button>
          </div>
        ) : (
          <>
            {/* Folders */}
            {folders
              .filter((folder) => !folder.parentId)
              .map((folder) => renderFolder(folder))}

            {/* Root notes */}
            {rootNotes.map((note) => (
              <NoteListItem key={note.id} note={note} />
            ))}
            
            {/* Root mindmaps */}
            {rootMindmaps.map((mindmap) => (
              <MindMapListItem key={mindmap.id} mindmap={mindmap} />
            ))}
          </>
        )}
      </div>
    </div>
  )
}
