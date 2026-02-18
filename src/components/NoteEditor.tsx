import React from 'react'
import { Editor, EditorContent } from '@tiptap/react'
import {
  Trash2,
  ChevronRight,
  GripVertical,
  X,
  FileText,
  MoreHorizontal,
  Folder,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Heading1,
  Heading2,
  Quote,
  Code,
  Share2,
} from "lucide-react"
import { NoteItem, FolderItem } from "../pages/Notes"

const ToolbarBtn = ({ children, onClick, active, title, disabled }: any) => (
  <button
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={`p-1.5 rounded-lg transition-all duration-200 ${
      active 
        ? "bg-blue-500/20 text-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.15)] ring-1 ring-blue-500/30" 
        : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
    } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
  >
    {children}
  </button>
)

interface NoteEditorProps {
  note: NoteItem
  editor: Editor | null
  folders: FolderItem[]
  activeFormats: Record<string, boolean>
  wordCount: number
  charCount: number
  saveStatus: 'idle' | 'saving' | 'saved' | 'error' | 'offline'
  sidebarCollapsed: boolean
  showHeaderMenu: boolean
  titleRef: React.RefObject<HTMLInputElement>
  headerMenuRef: React.RefObject<HTMLDivElement>
  onClose: () => void
  onUpdateTitle: (title: string) => void
  onSetShowHeaderMenu: (show: boolean) => void
  onMoveToFolder: (folderId: string | null) => void
  onDeleteNote: (id: string, title?: string) => void
  onExecCommand: (command: string, arg?: any) => void
  onToggleSidebar: () => void
}

export const NoteEditor: React.FC<NoteEditorProps> = ({
  note,
  editor,
  folders,
  activeFormats,
  wordCount,
  charCount,
  saveStatus,
  sidebarCollapsed,
  showHeaderMenu,
  titleRef,
  headerMenuRef,
  onClose,
  onUpdateTitle,
  onSetShowHeaderMenu,
  onMoveToFolder,
  onDeleteNote,
  onExecCommand,
  onToggleSidebar,
}) => {
  return (
    <>
      {/* Header */}
      <div className="flex items-center px-8 py-3 border-b border-white/[0.06] bg-gradient-to-r from-slate-800/30 via-transparent to-slate-800/30">
        
        {/* Close note (go back to Mindmap) */}
        <button
          onClick={onClose}
          className="mr-2 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/[0.04] text-slate-400 hover:text-white transition-colors ring-1 ring-transparent hover:ring-white/6"
          title="Close note & return to Mindmap"
          aria-label="Close note"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Sidebar toggle (keeps editor open) */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggleSidebar(); }}
          className="mr-4 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/[0.06] text-slate-500 hover:text-slate-300 transition-all"
          title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          aria-label="Toggle sidebar"
        >
          {sidebarCollapsed ? <GripVertical className="w-4 h-4" /> : <ChevronRight className="w-4 h-4 rotate-180" />}
        </button>

        <div
          className="w-2 h-2 rounded-full mr-3 flex-shrink-0"
          style={{ backgroundColor: note.color || '#94a3b8' }}
        />
        <input
          ref={titleRef}
          type="text"
          value={note.title}
          onChange={(e) => onUpdateTitle(e.target.value)}
          placeholder="Untitled note"
          className="flex-1 bg-transparent text-lg font-semibold text-white placeholder-slate-600 outline-none"
        />
        <button
          className="ml-3 px-3 py-1.5 text-xs rounded-xl bg-white/[0.04] border border-white/[0.08] text-slate-500 flex items-center gap-1.5 cursor-not-allowed opacity-40 transition-all"
          disabled
          title="Coming soon"
        >
          <Share2 className="w-3 h-3" />
          Turn into Mindmap
        </button>

        <div className="relative ml-4" ref={headerMenuRef}>
           <button
             data-header-trigger
             onClick={() => onSetShowHeaderMenu(!showHeaderMenu)}
             className={`w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/[0.06] transition-colors ${showHeaderMenu ? "bg-white/[0.06] text-white" : "text-slate-400"}`}
           >
             <MoreHorizontal className="w-4 h-4" />
           </button>
           
           {showHeaderMenu && (
            <div
              className="absolute right-0 top-9 z-50 bg-gradient-to-br from-slate-800/95 via-slate-900/95 to-slate-800/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden min-w-[210px]"
              style={{ animation: 'fadeInScale 0.15s ease-out' }}
            >
              <div className="flex items-center gap-2 px-3 py-2.5 border-b border-white/5">
                <MoreHorizontal className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-xs font-semibold text-slate-300 tracking-wide">Options</span>
              </div>
              <div className="p-1.5">
                {folders.length > 0 && (
                  <>
                    <div className="px-3 py-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                      Move to folder
                    </div>
                    <button
                      onClick={() => {
                        onMoveToFolder(null)
                        onSetShowHeaderMenu(false)
                      }}
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
                        onClick={() => {
                          onMoveToFolder(f.id)
                          onSetShowHeaderMenu(false)
                        }}
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
                  onClick={() => {
                     onDeleteNote(note.id, note.title)
                     onSetShowHeaderMenu(false)
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-all duration-150 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 group"
                >
                  <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-white/[0.05] group-hover:bg-red-500/10 transition-all">
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  </div>
                  <span className="text-sm text-red-400 group-hover:text-red-300 transition-colors">Delete note</span>
                </button>
              </div>
            </div>
           )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-8 py-2 border-b border-white/[0.06] bg-gradient-to-r from-slate-800/40 via-slate-900/40 to-slate-800/40 backdrop-blur-sm flex-wrap">
        <ToolbarBtn onClick={() => onExecCommand("bold")} active={activeFormats.bold} title="Bold (Ctrl+B)">
          <Bold className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => onExecCommand("italic")} active={activeFormats.italic} title="Italic (Ctrl+I)">
          <Italic className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => onExecCommand("underline")} active={activeFormats.underline} title="Underline (Ctrl+U)">
          <Underline className="w-3.5 h-3.5" />
        </ToolbarBtn>

        <div className="w-px h-5 bg-white/[0.06] mx-1.5" />

        <ToolbarBtn
          onClick={() => onExecCommand("formatBlock", "h1")}
          active={activeFormats.h1}
          title="Heading 1"
        >
          <Heading1 className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => onExecCommand("formatBlock", "h2")}
          active={activeFormats.h2}
          title="Heading 2"
        >
          <Heading2 className="w-3.5 h-3.5" />
        </ToolbarBtn>

        <div className="w-px h-5 bg-white/[0.06] mx-1.5" />

        <ToolbarBtn
          onClick={() => onExecCommand("insertUnorderedList")}
          active={activeFormats.insertUnorderedList}
          title="Bullet list"
        >
          <List className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => onExecCommand("insertOrderedList")}
          active={activeFormats.insertOrderedList}
          title="Numbered list"
        >
          <ListOrdered className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => onExecCommand("formatBlock", "blockquote")}
          active={activeFormats.blockquote}
          title="Quote"
        >
          <Quote className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => onExecCommand("formatBlock", "pre")}
          active={activeFormats.pre}
          title="Code block"
        >
          <Code className="w-3.5 h-3.5" />
        </ToolbarBtn>

        <div className="w-px h-5 bg-white/[0.06] mx-1.5" />

        <ToolbarBtn
          onClick={() => onExecCommand("justifyLeft")}
          active={activeFormats.justifyLeft}
          title="Align left"
        >
          <AlignLeft className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => onExecCommand("justifyCenter")}
          active={activeFormats.justifyCenter}
          title="Align center"
        >
          <AlignCenter className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => onExecCommand("justifyRight")}
          active={activeFormats.justifyRight}
          title="Align right"
        >
          <AlignRight className="w-3.5 h-3.5" />
        </ToolbarBtn>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-y-auto bg-[#0c1220] scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
        <div className="w-full min-h-full px-12 py-8 tiptap-editor-wrapper">
           <EditorContent 
             editor={editor} 
             className="min-h-full outline-none text-[15px] leading-relaxed text-slate-200 caret-blue-400
              [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:text-white [&_h1]:mb-3 [&_h1]:mt-6
              [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-white [&_h2]:mb-2 [&_h2]:mt-5
              [&_blockquote]:border-l-2 [&_blockquote]:border-blue-500/40 [&_blockquote]:pl-4 [&_blockquote]:text-slate-400 [&_blockquote]:italic [&_blockquote]:my-3
              [&_pre]:bg-white/[0.04] [&_pre]:border [&_pre]:border-white/[0.06] [&_pre]:rounded-lg [&_pre]:px-4 [&_pre]:py-3 [&_pre]:my-3 [&_pre]:font-mono [&_pre]:text-sm [&_pre]:text-slate-300
              [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-2
              [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-2
              [&_li]:my-1
              [&_a]:text-blue-400 [&_a]:underline"
           />
        </div>
      </div>

      {/* Footer / Status Bar - Character Count */}
      <div className="flex-shrink-0 flex items-center justify-between px-6 h-12 border-t border-white/[0.06] text-xs text-slate-500 select-none bg-gradient-to-r from-slate-800/40 via-slate-900/40 to-slate-800/40 backdrop-blur-xl">
         <div className="flex items-center gap-2">
           {saveStatus === 'saving' && (
             <span className="text-blue-400 flex items-center gap-1.5">
               <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                 <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                 <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
               </svg>
               Saving...
             </span>
           )}
           {saveStatus === 'saved' && note?.updatedAt && (
             <span className="text-slate-500">
               Updated {new Date(note.updatedAt).toLocaleString([], {
                 month: "short",
                 day: "numeric",
                 hour: "2-digit",
                 minute: "2-digit",
               })}
             </span>
           )}
           {saveStatus === 'error' && (
             <span className="text-red-400">Failed to save</span>
           )}
           {saveStatus === 'offline' && (
             <span className="text-yellow-400">Offline mode</span>
           )}
         </div>
         <div className="flex gap-6 font-medium">
           <span>{wordCount} words</span>
           <span>{charCount} characters</span>
         </div>
      </div>
    </>
  )
}
