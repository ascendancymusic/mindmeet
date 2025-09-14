import { create } from "zustand";
import type { Node as ReactFlowNode, Edge } from "reactflow";
import { supabase } from "../supabaseClient";
import { useAuthStore } from './authStore';
import { useToastStore } from './toastStore';
import { compressImage } from '../utils/compressImage';
import { compressAudioFile } from '../utils/compressAudio';
import { prepareNodeForSaving } from '../utils/nodeUtils';
import { DrawingData } from '../components/DrawingCanvas';
import { compressDrawingData, decompressDrawingData } from '../utils/drawingDataCompression';

export interface Node extends ReactFlowNode {
  background?: string;
}

export interface MindMap {
  permalink: string;
  id?: string;
  title: string;
  nodes: Node[];
  edges: Edge[];
  edgeType?: 'default' | 'straight' | 'smoothstep';
  backgroundColor?: string;
  dotColor?: string;
  fontFamily?: string;
  createdAt: number;
  updatedAt: number;
  likes: number;
  comment_count?: number;
  saves: number;
  likedBy: string[];
  savedBy?: string[];
  isPinned?: boolean;
  is_main?: boolean;
  visibility: 'public' | 'private' | 'linkOnly';
  description?: string;
  collaborators: string[];
  creator?: string;
  creatorUsername?: string;
  creatorAvatar?: string | null;
  published_at?: string | null;
  drawingData?: DrawingData;
  json_data?: any; // Add this to preserve all json_data fields for merging
}

interface MindMapState {
  maps: MindMap[];
  collaborationMaps: MindMap[];
  currentMapId: string | null;
  aiProposedChanges: { id: string; nodes: Node[]; edges: Edge[]; title: string } | null;
  mapBackup: MindMap | null;
  addMap: (title: string, userId: string, customPermalink?: string, templateId?: string) => Promise<string>;
  cloneMap: (mapPermalink: string, userId: string) => Promise<string>;
  // First arg can be a UUID mindmap id (preferred) or legacy permalink
  updateMap: (idOrPermalink: string, nodes: Node[], edges: Edge[], title: string, userId: string, customization?: { edgeType?: 'default' | 'straight' | 'smoothstep'; backgroundColor?: string; dotColor?: string; drawingData?: DrawingData; fontFamily?: string; }) => Promise<void>;
  deleteMap: (permalink: string, userId: string) => void;
  setCurrentMap: (id: string | null) => void;
  updateMapTitle: (permalink: string, title: string) => void;
  updateMapVisibility: (permalink: string, visibility: 'public' | 'private' | 'linkOnly') => void;
  getPublicMapsCount: () => number;
  toggleMapPin: (permalink: string) => void;
  proposeAIChanges: (permalink: string, nodes: Node[], edges: Edge[], title: string) => void;
  acceptAIChanges: (nodes?: Node[], edges?: Edge[], title?: string) => void;
  rejectAIChanges: () => void;
  fetchMaps: (userId: string) => Promise<void>;
  fetchCollaborationMaps: (userId: string) => Promise<void>;
  saveMapToSupabase: (map: MindMap, userId?: string, isCollaboratorEdit?: boolean) => Promise<void>;
  deleteMapFromSupabase: (permalink: string, userId: string) => Promise<void>;
  subscribeToMindMaps: () => void;
  updateMapPermalink: (oldPermalink: string, newPermalink: string) => Promise<void>;
  setMaps: (maps: MindMap[]) => void;
  setCollaborationMaps: (maps: MindMap[]) => void;
}

const isUUID = (val: string | undefined | null) => !!val && /^[0-9a-fA-F-]{36}$/.test(val);

export const useMindMapStore = create<MindMapState>()((set, get) => ({
  aiProposedChanges: null,
  maps: [],
  collaborationMaps: [],
  currentMapId: null,
  mapBackup: null,
  fetchMaps: async (userId) => {
    console.log('[mindMapStore] fetchMaps called with userId:', userId);
    if (!userId || !/^[0-9a-fA-F-]{36}$/.test(userId)) {
      console.error("Invalid or undefined userId provided to fetchMaps.");
      return;
    }

    console.log('[mindMapStore] Fetching mindmaps from Supabase for userId:', userId);
    const { data, error } = await supabase
      .from("mindmaps")
      .select(`
        permalink, title, json_data, drawing_data, created_at, updated_at, visibility, is_pinned, is_main, description, creator, id, published_at,
        mindmap_like_counts (like_count),
        mindmap_save_counts (save_count),
        mindmap_collaborations (collaborator_id, status)
      `)
      .eq("creator", userId);

    if (error) {
      console.error("Error fetching mindmaps:", error);
      return;
    }

    // Fetch user's avatar and username for owned maps
    let userAvatar = null;
    let username = null;
    if (userId) {
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("avatar_url, username")
        .eq("id", userId)
        .single();

      if (!profileError && profileData) {
        userAvatar = profileData.avatar_url;
        username = profileData.username;
      }
    }

    const maps = data?.map((map) => ({
      permalink: map.permalink,
      id: map.id,
      title: map.title,
      nodes: map.json_data.nodes,
      edges: map.json_data.edges,
      edgeType: map.json_data.edgeType || 'default',
      backgroundColor: map.json_data.backgroundColor || '#11192C',
      dotColor: map.json_data.dotColor || '#81818a',
      fontFamily: map.json_data.fontFamily || 'Aspekta',
      createdAt: new Date(map.created_at).getTime(),
      updatedAt: new Date(map.updated_at).getTime(),
      likes: map.mindmap_like_counts?.[0]?.like_count || 0,
      comment_count: 0, // TODO: Add comment count from comments table
      saves: map.mindmap_save_counts?.[0]?.save_count || 0,
      likedBy: [], // Will be populated when needed for specific maps
      isPinned: map.is_pinned,
      is_main: map.is_main || false,
      visibility: map.visibility || 'private',
      description: map.description || '',
      creator: map.creator,
      creatorUsername: username,
      collaborators: map.mindmap_collaborations?.filter((c: any) => c.status === 'accepted').map((c: any) => c.collaborator_id) || [],
      creatorAvatar: userAvatar,
      published_at: map.published_at,
      drawingData: decompressDrawingData(map.drawing_data) || undefined,
    }));

    console.log('[mindMapStore] Setting maps in store, count:', maps?.length || 0);
    set({ maps: maps || [] });
  },
  fetchCollaborationMaps: async (userId) => {
    if (!userId || !/^[0-9a-fA-F-]{36}$/.test(userId)) {
      console.error("Invalid or undefined userId provided to fetchCollaborationMaps.");
      return;
    }

    console.log("Fetching collaboration maps for userId:", userId);

    // Fetch from mindmap_collaborations table instead of using array containment
    const { data: collaborations, error: collaborationsError } = await supabase
      .from("mindmap_collaborations")
      .select(`
        mindmap_id,
        mindmaps!mindmap_collaborations_mindmap_id_fkey (
          permalink, title, json_data, drawing_data, created_at, updated_at, visibility, 
          is_pinned, is_main, description, creator, id, published_at,
          mindmap_like_counts (like_count),
          mindmap_save_counts (save_count),
          mindmap_collaborations!mindmap_collaborations_mindmap_id_fkey (
            collaborator_id, status
          )
        )
      `)
      .eq("collaborator_id", userId)
      .eq("status", "accepted");

    if (collaborationsError) {
      console.error("Error fetching collaboration mindmaps:", collaborationsError);
      return;
    }

    console.log("Raw collaboration maps data:", collaborations);

    // Fetch creator profiles separately to get avatar URLs and usernames
    if (collaborations && collaborations.length > 0) {
      const creatorIds = [...new Set(collaborations.map((collab: any) => collab.mindmaps.creator))];
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, avatar_url, username")
        .in("id", creatorIds);

      if (profilesError) {
        console.error("Error fetching creator profiles:", profilesError);
      }

      // Create maps of creator ID to avatar URL and username
      const creatorAvatars = new Map();
      const creatorUsernames = new Map();
      profilesData?.forEach(profile => {
        creatorAvatars.set(profile.id, profile.avatar_url);
        creatorUsernames.set(profile.id, profile.username);
      });

      const collaborationMaps = collaborations.map((collab: any) => {
        const map = collab.mindmaps;
        const collaborators = map.mindmap_collaborations?.filter((c: any) => c.status === 'accepted').map((c: any) => c.collaborator_id) || [userId];
        
        return {
          permalink: map.permalink,
          id: map.id,
          title: map.title,
          nodes: map.json_data.nodes,
          edges: map.json_data.edges,
          edgeType: map.json_data.edgeType || 'default',
          backgroundColor: map.json_data.backgroundColor || '#11192C',
          dotColor: map.json_data.dotColor || '#81818a',
          fontFamily: map.json_data.fontFamily || 'Aspekta',
          createdAt: new Date(map.created_at).getTime(),
          updatedAt: new Date(map.updated_at).getTime(),
          likes: map.mindmap_like_counts?.[0]?.like_count || 0,
          comment_count: 0, // TODO: Add comment count from comments table
          saves: map.mindmap_save_counts?.[0]?.save_count || 0,
          likedBy: [], // Will be populated when needed for specific maps
          isPinned: map.is_pinned,
          is_main: map.is_main || false,
          visibility: map.visibility || 'private',
          description: map.description || '',
          collaborators: collaborators,
          creator: map.creator,
          creatorUsername: creatorUsernames.get(map.creator) || null,
          creatorAvatar: creatorAvatars.get(map.creator) || null,
          published_at: map.published_at,
          drawingData: decompressDrawingData(map.drawing_data) || undefined,
        };
      });

      console.log("Processed collaboration maps:", collaborationMaps);
      set({ collaborationMaps: collaborationMaps || [] });
    } else {
      set({ collaborationMaps: [] });
    }
  },
  saveMapToSupabase: async (map, userId, isCollaboratorEdit = false) => {
  const { id, permalink, title, nodes, edges, edgeType, backgroundColor, dotColor, fontFamily, createdAt, updatedAt, visibility, isPinned, is_main, description, published_at, drawingData, json_data } = map;

    try {
      const effectiveUserId = userId || useAuthStore.getState().user?.id;

      if (!effectiveUserId || !/^[0-9a-fA-F-]{36}$/.test(effectiveUserId)) {
        console.error("Invalid or undefined userId provided to saveMapToSupabase.");
        return;
      }

      // Clean edges by removing unwanted properties including style and type (since edgeType is stored globally)
      const cleanedEdges = edges ? edges.map(edge => {
        const { selected, sourceHandle, targetHandle, style, type, ...cleanEdge } = edge;
        return cleanEdge;
      }) : (json_data?.edges || []);

      let error;

      if (isCollaboratorEdit) {
        // For collaborator edits, only update json_data and updated_at
        console.log("Saving as collaborator - only updating json_data");
        let targetCreator: string | null = null;
        let mindmapId: string | null = null;
        if (isUUID(id)) {
          const { data: record, error: fetchErr } = await supabase
            .from('mindmaps')
            .select('id, creator, json_data, drawing_data')
            .eq('id', id)
            .single();
          if (fetchErr || !record) { console.error('Error fetching mindmap by id for collaborator edit:', fetchErr); return; }
          const { data: collab, error: collabErr } = await supabase
            .from('mindmap_collaborations')
            .select('mindmap_id')
            .eq('mindmap_id', id)
            .eq('collaborator_id', effectiveUserId)
            .eq('status', 'accepted')
            .maybeSingle();
          if (collabErr || !collab) { console.error('Not an accepted collaborator for this id'); return; }
          mindmapId = record.id; targetCreator = record.creator;
          // Merge json_data and drawing_data
          const mergedJsonData = {
            ...record.json_data,
            ...(nodes ? { nodes } : {}),
            ...(edges ? { edges: cleanedEdges } : {}),
            ...(edgeType ? { edgeType } : {}),
            ...(backgroundColor ? { backgroundColor } : {}),
            ...(dotColor ? { dotColor } : {}),
            ...(fontFamily ? { fontFamily } : {}),
          };
          const mergedDrawingData = drawingData ? compressDrawingData(drawingData) : record.drawing_data;
          const { error: updateError } = await supabase
            .from('mindmaps')
            .update({
              json_data: mergedJsonData,
              drawing_data: mergedDrawingData,
              updated_at: new Date().toISOString()
            })
            .eq('id', mindmapId!)
            .eq('creator', targetCreator!);
          error = updateError;
        } else if (permalink) {
          const { data: candidates, error: fetchErr } = await supabase
            .from('mindmaps')
            .select('id, creator, json_data, drawing_data')
            .eq('permalink', permalink);
          if (fetchErr || !candidates || candidates.length === 0) { console.error('Error finding mindmap(s) via permalink:', fetchErr); return; }
            const ids = candidates.map(m=>m.id);
            const { data: collabs, error: collabErr } = await supabase
              .from('mindmap_collaborations')
              .select('mindmap_id')
              .in('mindmap_id', ids)
              .eq('collaborator_id', effectiveUserId)
              .eq('status','accepted');
            if (collabErr) { console.error('Error checking collaborator permissions:', collabErr); return; }
            const authId = collabs?.[0]?.mindmap_id;
            if (!authId) { console.error('User not collaborator on this permalink'); return; }
            const target = candidates.find(m=>m.id===authId);
            if (!target) { console.error('Authorized mindmap not found in candidates'); return; }
            mindmapId = target.id; targetCreator = target.creator;
            // Merge json_data and drawing_data
            const mergedJsonData = {
              ...target.json_data,
              ...(nodes ? { nodes } : {}),
              ...(edges ? { edges: cleanedEdges } : {}),
              ...(edgeType ? { edgeType } : {}),
              ...(backgroundColor ? { backgroundColor } : {}),
              ...(dotColor ? { dotColor } : {}),
              ...(fontFamily ? { fontFamily } : {}),
            };
            const mergedDrawingData = drawingData ? compressDrawingData(drawingData) : target.drawing_data;
            const { error: updateError } = await supabase
              .from('mindmaps')
              .update({
                json_data: mergedJsonData,
                drawing_data: mergedDrawingData,
                updated_at: new Date().toISOString()
              })
              .eq('id', mindmapId!)
              .eq('creator', targetCreator!);
            error = updateError;
        } else { console.error('No identifier provided for collaborator edit'); return; }
      } else {
        // Original logic for creators
        if (!id) {
          console.log('[saveMapToSupabase] Creating new mindmap (id will be assigned by Supabase)', { permalink, title, is_main, visibility });
        } else {
          console.log('[saveMapToSupabase] Updating existing mindmap', { id, permalink, title, is_main, visibility });
        }

        const validCreatedAt = createdAt ? new Date(createdAt).toISOString() : new Date().toISOString();
        const validUpdatedAt = updatedAt ? new Date(updatedAt).toISOString() : new Date().toISOString();

        // Merge json_data and drawing_data with existing values if present
        let mergedJsonData = json_data ? { ...json_data } : {};
        if (nodes) mergedJsonData.nodes = nodes;
        if (edges) mergedJsonData.edges = cleanedEdges;
        if (edgeType) mergedJsonData.edgeType = edgeType;
        if (backgroundColor) mergedJsonData.backgroundColor = backgroundColor;
        if (dotColor) mergedJsonData.dotColor = dotColor;
        if (fontFamily) mergedJsonData.fontFamily = fontFamily;

  let mergedDrawingData = drawingData ? compressDrawingData(drawingData) : undefined;

        const mapData = {
          permalink: permalink,
          title,
          json_data: mergedJsonData,
          drawing_data: mergedDrawingData,
          created_at: validCreatedAt,
          updated_at: validUpdatedAt,
          visibility,
          is_pinned: isPinned,
          is_main: is_main || false,
          creator: effectiveUserId,
          description: description || '',
          published_at: published_at,
        };

        // Fast path: if no id and no existing record by permalink, insert immediately
        let existingId: string | null = null;
        if (isUUID(id)) {
          const { data: existingById, error: checkIdErr } = await supabase
            .from('mindmaps')
            .select('id')
            .eq('id', id)
            .eq('creator', effectiveUserId)
            .maybeSingle();
          if (checkIdErr) console.warn('[saveMapToSupabase] check existing by id error', checkIdErr);
          if (existingById) existingId = existingById.id;
        } else if (permalink) {
          const { data: existingByPermalink, error: checkPermErr } = await supabase
            .from('mindmaps')
            .select('id')
            .eq('permalink', permalink)
            .eq('creator', effectiveUserId)
            .maybeSingle();
          if (checkPermErr) console.warn('[saveMapToSupabase] check existing by permalink error', checkPermErr);
          if (existingByPermalink) existingId = existingByPermalink.id;
        }

        if (!existingId) {
          console.log('[saveMapToSupabase] No existing record found – performing INSERT');
          const { data: insertedMap, error: insertError } = await supabase
            .from('mindmaps')
            .insert(mapData)
            .select('id')
            .single();
          error = insertError;
          if (!error && insertedMap?.id) {
            console.log('[saveMapToSupabase] Insert successful, new id:', insertedMap.id);
            set((state) => ({
              maps: state.maps.map((m) => (m.permalink === permalink && !m.id) ? { ...m, id: insertedMap.id } : m),
            }));
          }
        } else if (is_main) {
          // For main mindmaps, first unset any existing main maps for this user
          const { error: resetError } = await supabase
            .from("mindmaps")
            .update({ is_main: false })
            .eq("creator", effectiveUserId)
            .eq("is_main", true)
      .neq(isUUID(id) ? 'id' : 'permalink', isUUID(id) ? id : permalink);

          if (resetError) {
            console.error("Error resetting main maps:", resetError.message);
          }

          // Then update the current map with a regular update instead of upsert
          const { error: updateError } = await supabase
            .from('mindmaps')
            .update(mapData)
            .eq(isUUID(id) ? 'id' : 'permalink', isUUID(id) ? id : permalink)
            .eq('creator', effectiveUserId);

          error = updateError;
        } else {
          // Non-main and record existed: perform update
          console.log('[saveMapToSupabase] Existing record found – performing UPDATE', { id, permalink });
          const { error: updateError } = await supabase
            .from('mindmaps')
            .update(mapData)
            .eq(isUUID(id) ? 'id' : 'permalink', isUUID(id) ? id : permalink)
            .eq('creator', effectiveUserId);
          if (updateError) {
            console.warn('[saveMapToSupabase] Update failed, attempting fallback UPDATE by permalink (legacy).', updateError);
            if (permalink) {
              const { error: fallbackError } = await supabase
                .from('mindmaps')
                .update(mapData)
                .eq('permalink', permalink)
                .eq('creator', effectiveUserId);
              if (fallbackError) console.error('[saveMapToSupabase] Fallback update also failed', fallbackError);
              error = fallbackError;
            } else {
              error = updateError;
            }
          } else {
            error = updateError;
          }
        }
      }

      if (error) {
        console.error("Error saving mindmap to Supabase:", error.message);

        // Provide more specific error information
        let errorMessage = "Failed to save mindmap";
        if (error.code === 'PGRST116') {
          errorMessage = "Multiple mindmaps found with the same ID";
        } else if (error.code === '23505') {
          errorMessage = "Mindmap with this name already exists";
        } else if (error.message.includes('permission') || error.message.includes('RLS')) {
          errorMessage = "Permission denied - you don't have access to save this mindmap";
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = "Network error - please check your connection";
        }

        throw new Error(errorMessage);
      } else {
        console.log("Mindmap saved successfully:", permalink);
        // Trigger success toast notification
        useToastStore.getState().showToast("Mindmap saved successfully!", "success");
      }
    } catch (err) {
      console.error("Unexpected error in saveMapToSupabase:", err);

      // If it's already our custom error, re-throw it
      if (err instanceof Error && err.message.startsWith("Failed to save mindmap") ||
        err instanceof Error && (err.message.includes("Permission denied") ||
          err.message.includes("Network error") ||
          err.message.includes("Multiple mindmaps") ||
          err.message.includes("already exists"))) {
        throw err;
      }

      // Otherwise, throw a generic error
      throw new Error("Unexpected error while saving mindmap");
    }
  },
  deleteMapFromSupabase: async (permalink, userId) => {
    try {
      // First, fetch the mindmap to get its id
      const { data: mindmap, error: fetchError } = await supabase
        .from("mindmaps")
        .select("id")
        .eq("permalink", permalink)
        .eq("creator", userId)
        .single();

      if (fetchError) {
        console.error("Error fetching mindmap id before deletion:", fetchError);
        if (fetchError?.code === 'PGRST116') {
          console.error('Multiple mindmaps found with the same permalink. This may happen if different users have maps with the same permalink.');
        } else {
          console.error('No mindmap found with permalink:', permalink, 'for user:', userId);
        }
        return;
      }

      const mapId = mindmap?.id;

      if (mapId) {
        // Delete all files in the storage bucket folders for this mindmap
        console.log(`Deleting storage files for mindmap with id: ${mapId}`);

        // List and delete files from mindmap-images bucket
        const { data: imageFileList, error: imageListError } = await supabase.storage
          .from('mindmap-images')
          .list(mapId);

        if (imageListError) {
          console.error(`Error listing files in mindmap-images/${mapId}:`, imageListError);
        } else if (imageFileList && imageFileList.length > 0) {
          // Create an array of file paths to delete
          const imageFilePaths = imageFileList.map(file => `${mapId}/${file.name}`);

          // Delete all files in the folder
          const { error: deleteImageFilesError } = await supabase.storage
            .from('mindmap-images')
            .remove(imageFilePaths);

          if (deleteImageFilesError) {
            console.error(`Error deleting files from mindmap-images/${mapId}:`, deleteImageFilesError);
          } else {
            console.log(`Successfully deleted ${imageFilePaths.length} files from mindmap-images/${mapId}`);
          }
        } else {
          console.log(`No files found in mindmap-images/${mapId}`);
        }

        // List and delete files from mindmap-audio bucket
        const { data: audioFileList, error: audioListError } = await supabase.storage
          .from('mindmap-audio')
          .list(mapId);

        if (audioListError) {
          console.error(`Error listing files in mindmap-audio/${mapId}:`, audioListError);
        } else if (audioFileList && audioFileList.length > 0) {
          // Create an array of file paths to delete
          const audioFilePaths = audioFileList.map(file => `${mapId}/${file.name}`);

          // Delete all files in the folder
          const { error: deleteAudioFilesError } = await supabase.storage
            .from('mindmap-audio')
            .remove(audioFilePaths);

          if (deleteAudioFilesError) {
            console.error(`Error deleting files from mindmap-audio/${mapId}:`, deleteAudioFilesError);
          } else {
            console.log(`Successfully deleted ${audioFilePaths.length} files from mindmap-audio/${mapId}`);
          }
        } else {
          console.log(`No files found in mindmap-audio/${mapId}`);
        }
      }

      // Now delete the mindmap from the database
      const { error } = await supabase
        .from("mindmaps")
        .delete()
        .eq("permalink", permalink)
        .eq("creator", userId);

      if (error) {
        console.error("Error deleting mindmap from Supabase:", error);
      }
    } catch (err) {
      console.error("Unexpected error in deleteMapFromSupabase:", err);
    }
  },
  addMap: async (title, userId, customPermalink, templateId) => {
    const sanitizedTitle = sanitizeTitle(title);
    const existingPermalinks = get().maps.map((map) => map.permalink);
    
    let permalink: string;
    
    if (customPermalink) {
      // Use custom permalink if provided and not in use
      if (existingPermalinks.includes(customPermalink)) {
        throw new Error(`Permalink "${customPermalink}" is already in use`);
      }
      permalink = customPermalink;
    } else {
      // Auto-generate permalink from title
      permalink = sanitizedTitle;
      let counter = 1;
      
      while (existingPermalinks.includes(permalink)) {
        permalink = `${sanitizedTitle}-${counter}`;
        counter++;
      }
    }

    // Set template-specific properties
    const isWhiteboardTemplate = templateId === 'whiteboard';
    const backgroundColor = isWhiteboardTemplate ? '#ffffff' : '#11192C';
    const dotColor = isWhiteboardTemplate ? '#ffffff' : '#81818a';

    const newMap: MindMap = {
      permalink,
      title,
      nodes: isWhiteboardTemplate ? [] : [
        {
          id: "1",
          type: "input",
          data: { label: title },
          position: { x: 240, y: 0 },
          style: { background: "#4c5b6f" },
          background: "#4c5b6f",
        },
      ],
      edges: [],
      edgeType: 'default',
      backgroundColor,
      dotColor,
      fontFamily: 'Aspekta',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      likes: 0,
      comment_count: 0,
      saves: 0,
      likedBy: [],
      isPinned: false,
      is_main: false,
      visibility: 'private',
      description: '',
      collaborators: [],
      creator: userId, // Set the creator field immediately
    };

    set((state) => ({ maps: [...state.maps, newMap] }));

    try {
      await get().saveMapToSupabase(newMap, userId);
    } catch (error) {
      console.error("Error saving new map to Supabase:", error);
      set((state) => ({ maps: state.maps.filter((map) => map.permalink !== permalink) }));

      // Provide more specific error message based on the error type
      let errorMessage = "Failed to create mindmap";
      if (error instanceof Error) {
        if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = "Network error - please check your connection and try again";
        } else if (error.message.includes('permission') || error.message.includes('unauthorized')) {
          errorMessage = "Permission denied - please make sure you're logged in";
        } else if (error.message.includes('validation') || error.message.includes('constraint')) {
          errorMessage = "Invalid mindmap data - please try a different title";
        }
      }

      throw new Error(errorMessage);
    }

    return permalink;
  },
  cloneMap: async (mapPermalink, userId) => {
    const mapToClone = get().maps.find((map) => map.permalink === mapPermalink);
    if (!mapToClone) {
      throw new Error("Map not found");
    }

    // Fetch current user's avatar
    let userAvatar = null;
    try {
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("avatar_url")
        .eq("id", userId)
        .single();

      if (!profileError && profileData) {
        userAvatar = profileData.avatar_url;
      }
    } catch (error) {
      console.warn("Could not fetch user avatar for cloned map:", error);
    }

    // Create new title with "Copy" suffix
    const newTitle = `${mapToClone.title} (Copy)`;
    const sanitizedTitle = sanitizeTitle(newTitle);
    const existingPermalinks = get().maps.map((map) => map.permalink);
    let permalink = sanitizedTitle;
    let counter = 1;

    // Ensure unique permalink
    while (existingPermalinks.includes(permalink)) {
      permalink = `${sanitizedTitle}-${counter}`;
      counter++;
    }

    // Clone the map with default settings (no privacy, likes, comments, collaborators)
    const clonedMap: MindMap = {
      permalink,
      title: newTitle,
      nodes: [...mapToClone.nodes], // Deep copy nodes
      edges: [...mapToClone.edges], // Deep copy edges
      edgeType: mapToClone.edgeType || 'default',
      backgroundColor: mapToClone.backgroundColor,
      dotColor: mapToClone.dotColor,
      fontFamily: mapToClone.fontFamily || 'Aspekta',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      likes: 0, // Reset to default
      comment_count: 0, // Reset to default
      saves: 0, // Reset to default
      likedBy: [], // Reset to default
      isPinned: false, // Reset to default
      is_main: false, // Reset to default
      visibility: 'private', // Default to private
      description: '', // Reset to default
      collaborators: [], // Reset to default (no collaborators)
      creator: userId, // Set the current user as creator
      creatorAvatar: userAvatar, // Include user's avatar
      drawingData: mapToClone.drawingData ? { ...mapToClone.drawingData } : undefined, // Clone drawing data if exists
    };

    // Add to local state
    set((state) => ({ maps: [...state.maps, clonedMap] }));

    try {
      await get().saveMapToSupabase(clonedMap, userId);
    } catch (error) {
      console.error("Error saving cloned map to Supabase:", error);
      // Remove from local state if save failed
      set((state) => ({ maps: state.maps.filter((map) => map.permalink !== permalink) }));

      let errorMessage = "Failed to clone mindmap";
      if (error instanceof Error) {
        if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = "Network error - please check your connection and try again";
        } else if (error.message.includes('permission') || error.message.includes('unauthorized')) {
          errorMessage = "Permission denied - please make sure you're logged in";
        }
      }

      throw new Error(errorMessage);
    }

    return permalink;
  },
  updateMap: async (idOrPermalink, nodes, edges, title, userId, customization = { edgeType: 'default' }) => {
    if (!Array.isArray(nodes) || !Array.isArray(edges)) {
      console.error('Invalid data: nodes and edges must be arrays');
      return;
    }

  // Extract customization data with defaults, but do NOT default fontFamily to 'Aspekta' here
  const { edgeType = 'default', backgroundColor = '#11192C', dotColor = '#81818a', drawingData, fontFamily } = customization;
  const identifier = idOrPermalink;
  const identifierIsId = isUUID(identifier);

    // Fetch candidate mindmaps (no collaborators column anymore)
    let mapId: string | null = null;
    let isCreator = false;
    let isCollaborator = false;
    if (identifierIsId) {
      const { data: record, error: fetchErr } = await supabase
        .from('mindmaps')
        .select('id, creator')
        .eq('id', identifier)
        .maybeSingle();
      if (fetchErr || !record) { console.error('Mindmap not found by id:', fetchErr); return; }
      mapId = record.id;
      isCreator = record.creator === userId;
      if (!isCreator) {
        const { data: collab, error: collabErr } = await supabase
          .from('mindmap_collaborations')
          .select('mindmap_id')
          .eq('mindmap_id', record.id)
          .eq('collaborator_id', userId)
          .eq('status', 'accepted')
          .maybeSingle();
        if (collabErr) { console.error('Error checking collaboration:', collabErr); return; }
        isCollaborator = !!collab;
      }
    } else {
      const { data: candidates, error: fetchErr } = await supabase
        .from('mindmaps')
        .select('id, creator')
        .eq('permalink', identifier);
      if (fetchErr || !candidates || candidates.length === 0) { console.error('No mindmap found with permalink:', identifier); return; }
      const owned = candidates.find(m => m.creator === userId);
      if (owned) { mapId = owned.id; isCreator = true; }
      else {
        const candidateIds = candidates.map(m=>m.id);
        const { data: collabMatches, error: collabErr } = await supabase
          .from('mindmap_collaborations')
          .select('mindmap_id')
          .in('mindmap_id', candidateIds)
          .eq('collaborator_id', userId)
          .eq('status', 'accepted');
        if (collabErr) { console.error('Error checking collaborations:', collabErr); return; }
        if (collabMatches && collabMatches.length>0) { mapId = collabMatches[0].mindmap_id; isCollaborator = true; }
      }
    }
    if (!mapId) { console.error('User does not have permission to edit this mindmap:', identifier); return; }
    if (!isCreator && !isCollaborator) { console.error('User lacks edit permission (post-migration):', identifier); return; }
    const updatedNodes = [...nodes];
    const currentMap = identifierIsId
      ? (get().maps.find(m=>m.id===identifier) || get().collaborationMaps.find(m=>m.id===identifier))
      : (get().maps.find(m=>m.permalink===identifier) || get().collaborationMaps.find(m=>m.permalink===identifier));

    // Find deleted image and audio nodes to clean up their files
    // First check if we have a current map to compare against
    if (currentMap) {
      const deletedMediaNodes = currentMap.nodes.filter(
        oldNode =>
          ((oldNode.type === 'image' && oldNode.data?.imageUrl) ||
            (oldNode.type === 'audio' && oldNode.data?.audioUrl)) &&
          !nodes.some(newNode => newNode.id === oldNode.id)
      );

      // Delete files for removed media nodes
      for (const node of deletedMediaNodes) {
        console.log(`Deleting ${node.type} for removed node:`, node.id);
        await deleteMediaFromStorage(mapId, node.id, node.type || 'unknown');
      }
    }

    // Also check for any image nodes in the current nodes list that might have been deleted
    // but aren't in the currentMap yet (newly created and then deleted before fetching)
    const nodeIdsInCurrentUpdate = nodes.map(node => node.id);

    // Get all image nodes that were previously saved but are now missing
    const { data: existingImageNodes, error: imageListError } = await supabase.storage
      .from('mindmap-images')
      .list(mapId);

    if (!imageListError && existingImageNodes) {
      // Extract node IDs from filenames (removing the extension)
      const existingImageNodeIds = existingImageNodes.map(file => {
        const fileName = file.name;
        return fileName.substring(0, fileName.lastIndexOf('.'));
      });

      // Find node IDs that exist in storage but not in the current update
      const missingImageNodeIds = existingImageNodeIds.filter(nodeId => !nodeIdsInCurrentUpdate.includes(nodeId));

      // Delete files for these missing nodes
      for (const nodeId of missingImageNodeIds) {
        console.log('Deleting image for node not in current update:', nodeId);
        await deleteMediaFromStorage(mapId, nodeId, 'image');
      }
    } else if (imageListError) {
      console.error('Error listing files in image storage bucket:', imageListError);
    }

    // Get all audio nodes that were previously saved but are now missing
    const { data: existingAudioNodes, error: audioListError } = await supabase.storage
      .from('mindmap-audio')
      .list(mapId);

    if (!audioListError && existingAudioNodes) {
      // Extract node IDs from filenames (removing the extension)
      const existingAudioNodeIds = existingAudioNodes.map(file => {
        const fileName = file.name;
        return fileName.substring(0, fileName.lastIndexOf('.'));
      });

      // Find node IDs that exist in storage but not in the current update
      const missingAudioNodeIds = existingAudioNodeIds.filter(nodeId => !nodeIdsInCurrentUpdate.includes(nodeId));

      // Delete files for these missing nodes
      for (const nodeId of missingAudioNodeIds) {
        console.log('Deleting audio for node not in current update:', nodeId);
        await deleteMediaFromStorage(mapId, nodeId, 'audio');
      }
    } else if (audioListError) {
      console.error('Error listing files in audio storage bucket:', audioListError);
    }

    // Process any node with a file, regardless of existing imageUrl or audioUrl
    for (const node of updatedNodes.filter(n => n.data?.file)) {
      const file = node.data.file;

      if (node.type === 'image') {
        console.log('Compressing image for node:', node.id);
        const { compressedFile } = await compressImage(file);
        const extension = compressedFile.type === 'image/png' ? 'png' : 'jpg';
        const path = `${mapId}/${node.id}.${extension}`;
        const contentType = compressedFile.type;

        // Check if we're replacing an existing image (stored in originalImageUrl)
        const isReplacing = node.data.originalImageUrl !== undefined;

        console.log(`${isReplacing ? 'Replacing' : 'Uploading'} image for node:`, node.id, 'to path:', path);
        const { error: uploadError } = await supabase.storage
          .from('mindmap-images')
          .upload(path, compressedFile, { contentType, upsert: true });

        if (uploadError) {
          console.error('Error uploading image:', uploadError);
          continue;
        }

        // Get the public URL
        const { data: { publicUrl } } = supabase.storage.from('mindmap-images').getPublicUrl(path);
        if (!publicUrl) {
          console.error('Failed to get public URL for path:', path);
          continue;
        }

        // Add a cache-busting parameter to the URL when replacing an image
        const timestamp = Date.now();
        const urlWithCacheBusting = isReplacing ?
          `${publicUrl}?v=${timestamp}` :
          publicUrl;

        // Update node data: set new imageUrl and remove file
        node.data = {
          ...node.data,
          imageUrl: urlWithCacheBusting,
          file: undefined,
          originalImageUrl: undefined
        };
        console.log(`${isReplacing ? 'Replaced' : 'Set'} imageUrl for node:`, node.id, 'to', urlWithCacheBusting);
      }
      else if (node.type === 'audio') {
        console.log('Processing audio for node:', node.id, 'File:', file ? 'Present' : 'Missing', 'File type:', file?.type, 'File size:', file?.size);

        if (!file) {
          console.warn('No file found for audio node:', node.id);
          continue;
        }

        try {
          console.log('Starting audio compression for node:', node.id);
          const { compressedFile } = await compressAudioFile(file);
          console.log('Compression complete. Compressed file type:', compressedFile.type, 'Compressed size:', compressedFile.size);

          const extension = compressedFile.type.includes('opus') ? 'opus' :
            compressedFile.type.includes('webm') ? 'webm' : 'ogg';
          const path = `${mapId}/${node.id}.${extension}`;
          const contentType = compressedFile.type;

          // Check if we're replacing an existing audio (stored in originalAudioUrl)
          const isReplacing = node.data.originalAudioUrl !== undefined;

          console.log(`${isReplacing ? 'Replacing' : 'Uploading'} audio for node:`, node.id, 'to path:', path, 'in bucket: mindmap-audio');
          const { error: uploadError } = await supabase.storage
            .from('mindmap-audio')
            .upload(path, compressedFile, { contentType, upsert: true });

          if (uploadError) {
            console.error('Error uploading audio:', uploadError);
            continue;
          }

          // Get the public URL
          const { data: { publicUrl } } = supabase.storage.from('mindmap-audio').getPublicUrl(path);
          if (!publicUrl) {
            console.error('Failed to get public URL for path:', path);
            continue;
          }
          console.log('Got public URL for audio:', publicUrl);

          // Add a cache-busting parameter to the URL for all audio files to prevent caching issues
          // This is especially important for audio files which can have browser caching problems
          const timestamp = Date.now();
          const urlWithCacheBusting = `${publicUrl}?v=${timestamp}`;

          // Update node data: set new audioUrl and remove file
          node.data = {
            ...node.data,
            audioUrl: urlWithCacheBusting,
            file: undefined,
            originalAudioUrl: undefined
          };
          console.log(`${isReplacing ? 'Replaced' : 'Set'} audioUrl for node:`, node.id, 'to', urlWithCacheBusting);
        } catch (error) {
          console.error('Error processing audio for node:', node.id, error);
        }
      }
    }

    // Optimize nodes for saving (remove file, keep imageUrl/audioUrl)
    const optimizedNodes = updatedNodes.map((node) => {
      const { file, type, ...restData } = node.data || {};

      // For link nodes, we want to store the URL in data.url and completely remove the label property
      if (node.type === 'link') {
        const url = node.data?.url || node.data?.label || '';
        // Create a new object without the label property
        const { label, ...dataWithoutLabel } = restData;
        return {
          id: node.id,
          type: node.type,
          position: node.position,
          background: (node.background || node.style?.background) as string | undefined,
          data: {
            ...dataWithoutLabel,
            url: url,
          },
        };
      }

      // For image nodes, use the utility function to prepare for saving
      if (node.type === 'image') {
        const preparedNode = prepareNodeForSaving(node);
        // Make sure we don't save the originalImageUrl property
        const { originalImageUrl, ...cleanRestData } = restData;
        return {
          id: preparedNode.id,
          type: preparedNode.type,
          position: preparedNode.position,
          width: preparedNode.width,
          height: preparedNode.height,
          background: (node.background || node.style?.background) as string | undefined,
          data: {
            ...cleanRestData,
            imageUrl: node.data?.imageUrl || null,
          },
        };
      }


      if (node.type === 'audio') {
        const preparedNode = prepareNodeForSaving(node);
        // Make sure we don't save the originalAudioUrl property
        const { originalAudioUrl, ...cleanRestData } = restData;
        return {
          id: preparedNode.id,
          type: preparedNode.type,
          position: preparedNode.position,
          background: (node.background || node.style?.background) as string | undefined,
          data: {
            ...cleanRestData,
            audioUrl: node.data?.audioUrl || null,
            duration: node.data?.duration || 0,
          },
        };
      }

      // For text nodes (default type), save width and height if they exist
      if (node.type === 'default') {
        const preparedNode = prepareNodeForSaving(node);
        return {
          id: preparedNode.id,
          type: preparedNode.type,
          position: preparedNode.position,
          width: preparedNode.width,
          height: preparedNode.height,
          background: (node.background || node.style?.background) as string | undefined,
          data: {
            ...restData,
          },
        };
      }

      return {
        id: node.id,
        type: node.type,
        position: node.position,
        background: (node.background || node.style?.background) as string | undefined,
        data: {
          ...restData,
        },
      };
    });

    // Clean edges by removing unwanted properties including style and type (since edgeType is stored globally)
    const cleanedEdges = edges.map(edge => {
      // Create a new edge object without the unwanted properties
      const { selected, sourceHandle, targetHandle, style, type, ...cleanEdge } = edge;
      return cleanEdge;
    });

    // Save the updated map - check both maps and collaborationMaps
    const updatedMap = identifierIsId
      ? (get().maps.find(m=>m.id===identifier) || get().collaborationMaps.find(m=>m.id===identifier))
      : (get().maps.find(m=>m.permalink===identifier) || get().collaborationMaps.find(m=>m.permalink===identifier));

    if (updatedMap) {
      const updatedMapData = {
        ...updatedMap,
        nodes: optimizedNodes,
        edges: cleanedEdges,
        edgeType,
        backgroundColor,
        dotColor,
        title,
        updatedAt: Date.now(),
        drawingData: drawingData, // Keep original drawing data without optimization
        fontFamily: typeof fontFamily === 'string' ? fontFamily : updatedMap.fontFamily,
      };

      // Determine if this is a collaborator edit
  const isCollaboratorEdit = !isCreator && isCollaborator;

  await get().saveMapToSupabase(updatedMapData, userId, isCollaboratorEdit);
    }
  },
  deleteMap: (permalink, userId) => {
    const currentMap = get().maps.find((map) => map.permalink === permalink);
    if (!currentMap) return;

    set((state) => ({
      maps: state.maps.filter((map) => map.permalink !== permalink),
    }));

    get()
      .deleteMapFromSupabase(permalink, userId)
      .catch((error) => {
        console.error("Error deleting map from Supabase:", error);
        set((state) => ({
          maps: [...state.maps, currentMap],
        }));
      });
  },
  proposeAIChanges: (permalink, nodes, edges, title) => {
    console.log("Proposing AI changes:", { permalink, nodes, edges, title });
    const currentMap = get().maps.find((map) => map.permalink === permalink);
    if (currentMap) {
      set({
        mapBackup: { ...currentMap },
        aiProposedChanges: { id: permalink, nodes, edges, title },
      });
    }
  },
  acceptAIChanges: async (nodes, edges, title) => {
    const { aiProposedChanges, mapBackup } = get();

    if (nodes && edges && title) {
      try {
        if (!Array.isArray(nodes) || !Array.isArray(edges)) {
          throw new Error("Invalid nodes or edges structure");
        }

        const validNodes = nodes.every(
          (node) =>
            node.id && node.position && typeof node.position.x === "number" && typeof node.position.y === "number"
        );

        if (!validNodes) {
          throw new Error("Invalid node structure");
        }

        const mapPermalink = mapBackup?.permalink;

        if (!mapPermalink) {
          throw new Error("No map permalink found in backup");
        }

        const userId = useAuthStore.getState().user?.id;
        await get().updateMap(mapPermalink, nodes, edges, title, userId || '');

        // Update the local state with the new mindmap data
        set((state) => ({
          maps: state.maps.map((map) =>
            map.permalink === mapPermalink
              ? {
                ...map,
                nodes: nodes,
                edges: edges,
                title: title,
                updatedAt: Date.now(),
              }
              : map
          ),
        }));

        const { usePreviewMindMapStore } = await import("./previewMindMapStore");
        usePreviewMindMapStore.getState().clearPreviewMap(mapPermalink);

        set({ aiProposedChanges: null, mapBackup: null });
      } catch (error) {
        console.error("Error applying specific AI changes:", error);
        if (mapBackup) {
          const userId = useAuthStore.getState().user?.id;
          await get().updateMap(mapBackup.permalink, mapBackup.nodes, mapBackup.edges, mapBackup.title, userId || '');
        }
        set({ aiProposedChanges: null, mapBackup: null });
      }
    } else if (aiProposedChanges) {
      try {
        const { id: permalink, nodes, edges, title } = aiProposedChanges;
        if (!Array.isArray(nodes) || !Array.isArray(edges)) {
          throw new Error("Invalid nodes or edges structure");
        }
        const validNodes = nodes.every(
          (node) =>
            node.id && node.position && typeof node.position.x === "number" && typeof node.position.y === "number"
        );
        if (!validNodes) {
          throw new Error("Invalid node structure");
        }
        const userId = useAuthStore.getState().user?.id;
        await get().updateMap(permalink, nodes, edges, title, userId || '');

        // Update the local state with the new mindmap data
        set((state) => ({
          maps: state.maps.map((map) =>
            map.permalink === permalink
              ? {
                ...map,
                nodes: nodes,
                edges: edges,
                title: title,
                updatedAt: Date.now(),
              }
              : map
          ),
        }));

        const { usePreviewMindMapStore } = await import("./previewMindMapStore");
        usePreviewMindMapStore.getState().clearPreviewMap(permalink);

        set({ aiProposedChanges: null, mapBackup: null });
      } catch (error) {
        console.error("Error applying AI changes:", error);
        const { mapBackup } = get();
        if (mapBackup) {
          const userId = useAuthStore.getState().user?.id;
          await get().updateMap(mapBackup.permalink, mapBackup.nodes, mapBackup.edges, mapBackup.title, userId || '');
        }
        set({ aiProposedChanges: null, mapBackup: null });
      }
    }
  },
  rejectAIChanges: async () => {
    const { aiProposedChanges } = get();
    if (aiProposedChanges) {
      const { usePreviewMindMapStore } = await import("./previewMindMapStore");
      usePreviewMindMapStore.getState().clearPreviewMap(aiProposedChanges.id);
    }
    set({ aiProposedChanges: null, mapBackup: null });
  },
  setCurrentMap: (id) => {
    set({ currentMapId: id });
  },
  updateMapTitle: (permalink, title) => {
    set((state) => ({
      maps: state.maps.map((map) =>
        map.permalink === permalink
          ? {
            ...map,
            title,
            updatedAt: Date.now(),
          }
          : map
      ),
    }));
  },
  updateMapVisibility: (permalink, visibility) => {
    const currentMap = get().maps.find((map) => map.permalink === permalink);
    if (!currentMap) return;

    const updatedMap = { ...currentMap, visibility, updatedAt: Date.now() };

    set((state) => ({
      maps: state.maps.map((map) => (map.permalink === permalink ? updatedMap : map)),
    }));

    get()
      .saveMapToSupabase(updatedMap)
      .catch((error) => {
        console.error("Error updating visibility in Supabase:", error);
        set((state) => ({
          maps: state.maps.map((map) => (map.permalink === permalink ? currentMap : map)),
        }));
      });
  },
  getPublicMapsCount: () => {
    return get().maps.filter((map) => map.visibility === 'public').length;
  },
  toggleMapPin: (permalink) => {
    const currentMap = get().maps.find((map) => map.permalink === permalink);
    if (!currentMap) return;

    // Don't update the updatedAt timestamp when toggling pin state
    const updatedMap = { ...currentMap, isPinned: !currentMap.isPinned };

    // Update local state
    set((state) => ({
      maps: state.maps.map((map) => (map.permalink === permalink ? updatedMap : map)),
    }));

    // Update only the is_pinned field in Supabase without affecting updated_at
    try {
      const userId = useAuthStore.getState().user?.id;
      if (!userId) {
        console.error("No user ID found for updating pin state");
        return;
      }

      // Direct update to Supabase without using saveMapToSupabase
      (async () => {
        try {
          const { error } = await supabase
            .from("mindmaps")
            .update({ is_pinned: updatedMap.isPinned })
            .eq("permalink", permalink)
            .eq("creator", userId);

          if (error) {
            throw error;
          }
        } catch (error) {
          console.error("Error updating pin state in Supabase:", error);
          // Revert local state on error
          set((state) => ({
            maps: state.maps.map((map) => (map.permalink === permalink ? currentMap : map)),
          }));
        }
      })();
    } catch (error) {
      console.error("Error in toggleMapPin:", error);
      // Revert local state on error
      set((state) => ({
        maps: state.maps.map((map) => (map.permalink === permalink ? currentMap : map)),
      }));
    }
  },
  subscribeToMindMaps: () => {
    const userId = useAuthStore.getState().user?.id;

    if (!userId || !/^[0-9a-fA-F-]{36}$/.test(userId)) {
      console.error("Invalid or undefined userId provided to subscribeToMindMaps.");
      return;
    }

    const channel = supabase
      .channel('mindmaps-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'mindmaps', filter: `creator=eq.${userId}` },
        (payload) => {
          console.log("Realtime event received:", payload);
          const { eventType } = payload;

          // Disable realtime updates for now as they require type casting
          console.log(`Received ${eventType} event for mindmap`);
        }
      )
      .subscribe();

    return () => {
      console.log("Unsubscribing from realtime updates.");
      supabase.removeChannel(channel);
    };
  },
  updateMapPermalink: async (oldPermalink, newPermalink) => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId || !/^[0-9a-fA-F-]{36}$/.test(userId)) {
      console.error("Invalid or undefined userId provided to updateMapPermalink.");
      return;
    }

    const currentMap = get().maps.find((map) => map.permalink === oldPermalink);
    if (!currentMap) {
      console.error("Map not found for the given old permalink:", oldPermalink);
      return;
    }

    const updatedMap = { ...currentMap, permalink: newPermalink, updatedAt: Date.now() };

    set((state) => ({
      maps: state.maps.map((map) => (map.permalink === oldPermalink ? updatedMap : map)),
    }));

    try {
      const { error } = await supabase
        .from("mindmaps")
        .update({ permalink: newPermalink })
        .eq("permalink", oldPermalink)
        .eq("creator", userId);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error("Error updating map permalink in Supabase:", error);
      set((state) => ({
        maps: state.maps.map((map) => (map.permalink === oldPermalink ? currentMap : map)),
      }));
    }
  },
  setMaps: (maps) => set({ maps }),
  setCollaborationMaps: (maps) => set({ collaborationMaps: maps }),
}));

function sanitizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const deleteMediaFromStorage = async (mapId: string, nodeId: string, nodeType: string) => {
  try {
    let paths: string[] = [];
    let bucketName = '';

    if (nodeType === 'image') {
      paths = [`${mapId}/${nodeId}.jpg`, `${mapId}/${nodeId}.png`];
      bucketName = 'mindmap-images';
    } else if (nodeType === 'audio') {
      paths = [`${mapId}/${nodeId}.opus`, `${mapId}/${nodeId}.webm`, `${mapId}/${nodeId}.mp3`, `${mapId}/${nodeId}.ogg`];
      bucketName = 'mindmap-audio';
    } else {
      console.warn(`Unknown node type for deletion: ${nodeType}`);
      return;
    }

    for (const path of paths) {
      console.log(`Attempting to delete ${nodeType} file: ${path} from ${bucketName}`);
      const { error } = await supabase.storage
        .from(bucketName)
        .remove([path]);

      if (!error) {
        console.log(`Successfully deleted ${nodeType} file:`, path);
      } else {
        console.log(`File not found or error deleting ${path}:`, error.message);
      }
    }
  } catch (err) {
    console.error(`Error deleting ${nodeType} from storage:`, err);
  }
};

