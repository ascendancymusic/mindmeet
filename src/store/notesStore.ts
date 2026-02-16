import { create } from "zustand";
import { supabase } from "../supabaseClient";
import { useToastStore } from './toastStore';

export interface NoteItem {
  id: string;
  user_id?: string;
  title: string;
  content: string; // Markdown content
  updatedAt: number;
  color: string | null;
  folderId: string | null;
  position?: { x: number; y: number };
}

export interface FolderItem {
  id: string;
  user_id?: string;
  name: string;
  collapsed: boolean;
  color: string;
  parentId: string | null;
  position?: { x: number; y: number };
}

type SaveStatus = 'saved' | 'saving' | 'error' | 'offline';

interface NotesState {
  notes: NoteItem[];
  folders: FolderItem[];
  saveStatus: SaveStatus;
  lastSavedAt: number | null;
  
  // Actions
  fetchNotes: (userId: string) => Promise<void>;
  fetchFolders: (userId: string) => Promise<void>;
  
  saveNote: (note: NoteItem, userId: string) => Promise<void>;
  saveFolder: (folder: FolderItem, userId: string) => Promise<void>;
  
  saveNotePosition: (noteId: string, position: { x: number; y: number }, userId: string) => Promise<void>;
  saveFolderPosition: (folderId: string, position: { x: number; y: number }, userId: string) => Promise<void>;
  
  deleteNote: (noteId: string, userId: string) => Promise<void>;
  deleteFolder: (folderId: string, userId: string) => Promise<void>;
  
  // Local state updates (optimistic)
  setNotes: (notes: NoteItem[]) => void;
  setFolders: (folders: FolderItem[]) => void;
  updateNoteLocal: (noteId: string, updates: Partial<NoteItem>) => void;
  updateFolderLocal: (folderId: string, updates: Partial<FolderItem>) => void;
  
  setSaveStatus: (status: SaveStatus) => void;
  setLastSavedAt: (timestamp: number) => void;
  
  // Migration from localStorage
  migrateFromLocalStorage: (userId: string) => Promise<void>;
}

export const useNotesStore = create<NotesState>()((set, get) => ({
  notes: [],
  folders: [],
  saveStatus: 'saved',
  lastSavedAt: null,

  fetchNotes: async (userId: string) => {
    if (!userId) {
      console.error("Invalid userId provided to fetchNotes");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("notes")
        .select("*")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false });

      if (error) throw error;

      const notes: NoteItem[] = (data || []).map((row) => ({
        id: row.id,
        user_id: row.user_id,
        title: row.title,
        content: row.content,
        updatedAt: new Date(row.updated_at).getTime(),
        color: row.color,
        folderId: row.folder_id,
        position: row.position_x !== null && row.position_y !== null
          ? { x: row.position_x / 100, y: row.position_y / 100 }
          : undefined,
      }));

      set({ notes });
    } catch (error: any) {
      console.error("Error fetching notes:", error);
      useToastStore.getState().showToast("Failed to load notes", "error");
    }
  },

  fetchFolders: async (userId: string) => {
    if (!userId) {
      console.error("Invalid userId provided to fetchFolders");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("folders")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      const folders: FolderItem[] = (data || []).map((row) => ({
        id: row.id,
        user_id: row.user_id,
        name: row.name,
        collapsed: row.collapsed,
        color: row.color,
        parentId: row.parent_id,
        position: row.position_x !== null && row.position_y !== null
          ? { x: row.position_x / 100, y: row.position_y / 100 }
          : undefined,
      }));

      set({ folders });
    } catch (error: any) {
      console.error("Error fetching folders:", error);
      useToastStore.getState().showToast("Failed to load folders", "error");
    }
  },

  saveNote: async (note: NoteItem, userId: string) => {
    set({ saveStatus: 'saving' });

    try {
      const noteData = {
        id: note.id,
        user_id: userId,
        title: note.title,
        content: note.content,
        folder_id: note.folderId,
        color: note.color,
        position_x: note.position ? Math.round(note.position.x * 100) : null,
        position_y: note.position ? Math.round(note.position.y * 100) : null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("notes")
        .upsert(noteData, { onConflict: 'id' });

      if (error) throw error;

      set({ 
        saveStatus: 'saved',
        lastSavedAt: Date.now()
      });
    } catch (error: any) {
      console.error("Error saving note:", error);
      set({ saveStatus: 'error' });
      
      useToastStore.getState().showToast("Failed to save note", "error");
    }
  },

  saveFolder: async (folder: FolderItem, userId: string) => {
    set({ saveStatus: 'saving' });

    try {
      const folderData = {
        id: folder.id,
        user_id: userId,
        name: folder.name,
        parent_id: folder.parentId,
        color: folder.color,
        collapsed: folder.collapsed,
        position_x: folder.position ? Math.round(folder.position.x * 100) : null,
        position_y: folder.position ? Math.round(folder.position.y * 100) : null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("folders")
        .upsert(folderData, { onConflict: 'id' });

      if (error) throw error;

      set({ 
        saveStatus: 'saved',
        lastSavedAt: Date.now()
      });
    } catch (error: any) {
      console.error("Error saving folder:", error);
      set({ saveStatus: 'error' });
      
      useToastStore.getState().showToast("Failed to save folder", "error");
    }
  },

  saveNotePosition: async (noteId: string, position: { x: number; y: number }, userId: string) => {
    try {
      const { error } = await supabase
        .from("notes")
        .update({
          position_x: Math.round(position.x * 100),
          position_y: Math.round(position.y * 100),
        })
        .eq("id", noteId)
        .eq("user_id", userId);

      if (error) throw error;
    } catch (error: any) {
      console.error("Error saving note position:", error);
    }
  },

  saveFolderPosition: async (folderId: string, position: { x: number; y: number }, userId: string) => {
    try {
      const { error } = await supabase
        .from("folders")
        .update({
          position_x: Math.round(position.x * 100),
          position_y: Math.round(position.y * 100),
        })
        .eq("id", folderId)
        .eq("user_id", userId);

      if (error) throw error;
    } catch (error: any) {
      console.error("Error saving folder position:", error);
    }
  },

  deleteNote: async (noteId: string, userId: string) => {
    try {
      const { error } = await supabase
        .from("notes")
        .delete()
        .eq("id", noteId)
        .eq("user_id", userId);

      if (error) throw error;

      set((state) => ({
        notes: state.notes.filter((n) => n.id !== noteId),
      }));
    } catch (error: any) {
      console.error("Error deleting note:", error);
      useToastStore.getState().showToast("Failed to delete note", "error");
    }
  },

  deleteFolder: async (folderId: string, userId: string) => {
    try {
      const { error } = await supabase
        .from("folders")
        .delete()
        .eq("id", folderId)
        .eq("user_id", userId);

      if (error) throw error;

      set((state) => ({
        folders: state.folders.filter((f) => f.id !== folderId),
      }));
    } catch (error: any) {
      console.error("Error deleting folder:", error);
      useToastStore.getState().showToast("Failed to delete folder", "error");
    }
  },

  setNotes: (notes) => set({ notes }),
  setFolders: (folders) => set({ folders }),
  
  updateNoteLocal: (noteId, updates) => {
    set((state) => ({
      notes: state.notes.map((n) => {
        if (n.id !== noteId) return n;
        
        // Only update updatedAt if changes include title or content
        const shouldUpdateTimestamp = 'title' in updates || 'content' in updates;
        
        return {
          ...n,
          ...updates,
          ...(shouldUpdateTimestamp && { updatedAt: Date.now() })
        };
      }),
    }));
  },

  updateFolderLocal: (folderId, updates) => {
    set((state) => ({
      folders: state.folders.map((f) =>
        f.id === folderId ? { ...f, ...updates } : f
      ),
    }));
  },

  setSaveStatus: (status) => set({ saveStatus: status }),
  setLastSavedAt: (timestamp) => set({ lastSavedAt: timestamp }),

  migrateFromLocalStorage: async (userId: string) => {
    try {
      const savedNotes = localStorage.getItem("notes_wysiwyg_v1");
      const savedFolders = localStorage.getItem("notes_folders_v1");

      if (savedNotes) {
        const localNotes: NoteItem[] = JSON.parse(savedNotes);
        
        // Save each note to Supabase
        for (const note of localNotes) {
          await get().saveNote({ ...note, user_id: userId }, userId);
        }
        
        console.log(`Migrated ${localNotes.length} notes to Supabase`);
      }

      if (savedFolders) {
        const localFolders: FolderItem[] = JSON.parse(savedFolders);
        
        // Save each folder to Supabase
        for (const folder of localFolders) {
          await get().saveFolder({ ...folder, user_id: userId }, userId);
        }
        
        console.log(`Migrated ${localFolders.length} folders to Supabase`);
      }

      // Fetch the migrated data
      await get().fetchNotes(userId);
      await get().fetchFolders(userId);

      useToastStore.getState().showToast("Notes migrated successfully!", "success");

      // Clear localStorage after successful migration
      localStorage.removeItem("notes_wysiwyg_v1");
      localStorage.removeItem("notes_folders_v1");
    } catch (error: any) {
      console.error("Error migrating from localStorage:", error);
      useToastStore.getState().showToast("Failed to migrate notes", "error");
    }
  },
}));
