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
  id: string;
  key?: string;
  title: string;
  nodes: Node[];
  edges: Edge[];
  edgeType?: 'default' | 'straight' | 'smoothstep';
  backgroundColor?: string;
  dotColor?: string;
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
}

interface MindMapState {
  maps: MindMap[];
  collaborationMaps: MindMap[];
  currentMapId: string | null;
  aiProposedChanges: { id: string; nodes: Node[]; edges: Edge[]; title: string } | null;
  mapBackup: MindMap | null;
  addMap: (title: string, userId: string) => Promise<string>;
  cloneMap: (mapId: string, userId: string) => Promise<string>;
  updateMap: (id: string, nodes: Node[], edges: Edge[], title: string, userId: string, customization?: { edgeType?: 'default' | 'straight' | 'smoothstep'; backgroundColor?: string; dotColor?: string; drawingData?: DrawingData }) => Promise<void>;
  deleteMap: (id: string, userId: string) => void;
  setCurrentMap: (id: string | null) => void;
  updateMapTitle: (id: string, title: string) => void;
  updateMapVisibility: (id: string, visibility: 'public' | 'private' | 'linkOnly') => void;
  getPublicMapsCount: () => number;
  toggleLike: (mapId: string, userId: string) => void;
  toggleMapPin: (id: string) => void;
  proposeAIChanges: (id: string, nodes: Node[], edges: Edge[], title: string) => void;
  acceptAIChanges: (nodes?: Node[], edges?: Edge[], title?: string) => void;
  rejectAIChanges: () => void;
  fetchMaps: (userId: string) => Promise<void>;
  fetchCollaborationMaps: (userId: string) => Promise<void>;
  saveMapToSupabase: (map: MindMap, userId?: string, isCollaboratorEdit?: boolean) => Promise<void>;
  deleteMapFromSupabase: (id: string, userId: string) => Promise<void>;
  subscribeToMindMaps: () => void;
  updateMapId: (oldId: string, newId: string) => Promise<void>;
  setMaps: (maps: MindMap[]) => void;
  setCollaborationMaps: (maps: MindMap[]) => void;
}

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
      .select("id, title, json_data, drawing_data, created_at, updated_at, visibility, likes, comment_count, saves, liked_by, is_pinned, is_main, description, creator, key, collaborators, published_at")
      .eq("creator", userId);

    if (error) {
      console.error("Error fetching mindmaps:", error);
      return;
    }

    // Fetch user's avatar for owned maps
    let userAvatar = null;
    if (userId) {
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("avatar_url")
        .eq("id", userId)
        .single();

      if (!profileError && profileData) {
        userAvatar = profileData.avatar_url;
      }
    }

    const maps = data?.map((map) => ({
      id: map.id,
      key: map.key,
      title: map.title,
      nodes: map.json_data.nodes,
      edges: map.json_data.edges,
      edgeType: map.json_data.edgeType || 'default',
      backgroundColor: map.json_data.backgroundColor || '#11192C',
      dotColor: map.json_data.dotColor || '#81818a',
      createdAt: new Date(map.created_at).getTime(),
      updatedAt: new Date(map.updated_at).getTime(),
      likes: map.likes,
      comment_count: map.comment_count,
      saves: map.saves,
      likedBy: map.liked_by || [],
      isPinned: map.is_pinned,
      is_main: map.is_main || false,
      visibility: map.visibility || 'private',
      description: map.description || '',
      creator: map.creator,
      collaborators: map.collaborators || [],
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

        // Use the @> operator for JSONB containment
    const { data, error } = await supabase
      .from("mindmaps")
      .select("id, title, json_data, drawing_data, created_at, updated_at, visibility, likes, comment_count, saves, liked_by, is_pinned, is_main, description, creator, username, key, collaborators, published_at")
      .filter("collaborators", "cs", JSON.stringify([userId]));

    if (error) {
      console.error("Error fetching collaboration mindmaps:", error);
      return;
    }

    console.log("Raw collaboration maps data:", data);

    // Fetch creator profiles separately to get avatar URLs
    if (data && data.length > 0) {
      const creatorIds = [...new Set(data.map(map => map.creator))];
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, avatar_url")
        .in("id", creatorIds);

      if (profilesError) {
        console.error("Error fetching creator profiles:", profilesError);
      }

      // Create a map of creator ID to avatar URL
      const creatorAvatars = new Map();
      profilesData?.forEach(profile => {
        creatorAvatars.set(profile.id, profile.avatar_url);
      });

      const collaborationMaps = data.map((map) => ({
        id: map.id,
        key: map.key,
        title: map.title,
        nodes: map.json_data.nodes,
        edges: map.json_data.edges,
        edgeType: map.json_data.edgeType || 'default',
        backgroundColor: map.json_data.backgroundColor || '#11192C',
        dotColor: map.json_data.dotColor || '#81818a',
        createdAt: new Date(map.created_at).getTime(),
        updatedAt: new Date(map.updated_at).getTime(),
        likes: map.likes,
        comment_count: map.comment_count,
        saves: map.saves,
        likedBy: map.liked_by || [],
        isPinned: map.is_pinned,
        is_main: map.is_main || false,
        visibility: map.visibility || 'private',
        description: map.description || '',
        collaborators: map.collaborators || [],
        creator: map.creator,
        creatorUsername: map.username,
        creatorAvatar: creatorAvatars.get(map.creator) || null,
        published_at: map.published_at,
        drawingData: decompressDrawingData(map.drawing_data) || undefined,
      }));

      console.log("Processed collaboration maps:", collaborationMaps);
      set({ collaborationMaps: collaborationMaps || [] });
    } else {
      set({ collaborationMaps: [] });
    }
  },
  saveMapToSupabase: async (map, userId, isCollaboratorEdit = false) => {
    const { id, title, nodes, edges, edgeType = 'default', backgroundColor = '#11192C', dotColor = '#81818a', createdAt, updatedAt, visibility, likes, comment_count, saves, likedBy, isPinned, is_main, description, collaborators, published_at, drawingData } = map;

    try {
      const effectiveUserId = userId || useAuthStore.getState().user?.id;

      if (!effectiveUserId || !/^[0-9a-fA-F-]{36}$/.test(effectiveUserId)) {
        console.error("Invalid or undefined userId provided to saveMapToSupabase.");
        return;
      }

      // Clean edges by removing unwanted properties including style and type (since edgeType is stored globally)
      const cleanedEdges = edges.map(edge => {
        // Create a new edge object without the unwanted properties
        const { selected, sourceHandle, targetHandle, style, type, ...cleanEdge } = edge;
        return cleanEdge;
      });

      let error;

      if (isCollaboratorEdit) {
        // For collaborator edits, only update json_data and updated_at
        console.log("Saving as collaborator - only updating json_data");
        
        // First, find the correct mindmap record
        const { data: mindmaps, error: fetchError } = await supabase
          .from('mindmaps')
          .select('creator, collaborators')
          .eq('id', id);

        if (fetchError || !mindmaps || mindmaps.length === 0) {
          console.error('Error finding mindmap for collaborator edit:', fetchError);
          return;
        }

        // Find the mindmap where user is a collaborator
        const targetMindmap = mindmaps.find(map => 
          Array.isArray(map.collaborators) && map.collaborators.includes(effectiveUserId)
        );

        if (!targetMindmap) {
          console.error('User is not a collaborator on any mindmap with this ID');
          return;
        }

        // Update only json_data, drawing_data and updated_at
        const { error: updateError } = await supabase
          .from("mindmaps")
          .update({
            json_data: { nodes, edges: cleanedEdges, edgeType, backgroundColor, dotColor },
            drawing_data: compressDrawingData(drawingData),
            updated_at: new Date().toISOString()
          })
          .eq("id", id)
          .eq("creator", targetMindmap.creator);

        error = updateError;
      } else {
        // Original logic for creators
        const validCreatedAt = createdAt ? new Date(createdAt).toISOString() : new Date().toISOString();
        const validUpdatedAt = updatedAt ? new Date(updatedAt).toISOString() : new Date().toISOString();

        // Convert likedBy to a proper format for Supabase
        const likedByArray = Array.isArray(likedBy) ? likedBy : [];
        
        // Convert collaborators to a proper format for Supabase
        const collaboratorsArray = Array.isArray(collaborators) ? collaborators : [];

        // Create the data object with proper typing
        const mapData = {
          id,
          title,
          json_data: { nodes, edges: cleanedEdges, edgeType, backgroundColor, dotColor },
          drawing_data: compressDrawingData(drawingData),
          created_at: validCreatedAt,
          updated_at: validUpdatedAt,
          visibility,
          likes,
          comment_count,
          saves,
          liked_by: likedByArray,
          is_pinned: isPinned,
          is_main: is_main || false,
          creator: effectiveUserId,
          description: description || '',
          collaborators: collaboratorsArray,
          published_at: published_at,
        };

        if (is_main) {
          // For main mindmaps, first unset any existing main maps for this user
          const { error: resetError } = await supabase
            .from("mindmaps")
            .update({ is_main: false })
            .eq("creator", effectiveUserId)
            .eq("is_main", true)
            .neq("id", id);

          if (resetError) {
            console.error("Error resetting main maps:", resetError.message);
          }

          // Then update the current map with a regular update instead of upsert
          const { error: updateError } = await supabase
            .from("mindmaps")
            .update(mapData)
            .eq("id", id)
            .eq("creator", effectiveUserId);

          error = updateError;
        } else {
          // For non-main mindmaps, check if the record exists first
          const { data: existingMap } = await supabase
            .from("mindmaps")
            .select("id")
            .eq("id", id)
            .eq("creator", effectiveUserId)
            .single();

          if (existingMap) {
            // Update existing map
            const { error: updateError } = await supabase
              .from("mindmaps")
              .update(mapData)
              .eq("id", id)
              .eq("creator", effectiveUserId);
            
            error = updateError;
          } else {
            // Insert new map and get the generated key
            const { data: insertedMap, error: insertError } = await supabase
              .from("mindmaps")
              .insert(mapData)
              .select("key")
              .single();
            
            error = insertError;
            
            // Update the local store with the generated key
            if (!error && insertedMap?.key) {
              set((state) => ({
                maps: state.maps.map((map) =>
                  map.id === id ? { ...map, key: insertedMap.key } : map
                ),
              }));
            }
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
        console.log("Mindmap saved successfully:", id);
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
  deleteMapFromSupabase: async (id, userId) => {
    try {
      // First, fetch the mindmap to get its key
      const { data: mindmap, error: fetchError } = await supabase
        .from("mindmaps")
        .select("key")
        .eq("id", id)
        .eq("creator", userId)
        .single();

      if (fetchError) {
        console.error("Error fetching mindmap key before deletion:", fetchError);
        if (fetchError?.code === 'PGRST116') {
          console.error('Multiple mindmaps found with the same ID. This may happen if different users have maps with the same ID.');
        } else {
          console.error('No mindmap found with ID:', id, 'for user:', userId);
        }
        return;
      }

      const mapKey = mindmap?.key;

      if (mapKey) {
        // Delete all files in the storage bucket folders for this mindmap
        console.log(`Deleting storage files for mindmap with key: ${mapKey}`);

        // List and delete files from mindmap-images bucket
        const { data: imageFileList, error: imageListError } = await supabase.storage
          .from('mindmap-images')
          .list(mapKey);

        if (imageListError) {
          console.error(`Error listing files in mindmap-images/${mapKey}:`, imageListError);
        } else if (imageFileList && imageFileList.length > 0) {
          // Create an array of file paths to delete
          const imageFilePaths = imageFileList.map(file => `${mapKey}/${file.name}`);

          // Delete all files in the folder
          const { error: deleteImageFilesError } = await supabase.storage
            .from('mindmap-images')
            .remove(imageFilePaths);

          if (deleteImageFilesError) {
            console.error(`Error deleting files from mindmap-images/${mapKey}:`, deleteImageFilesError);
          } else {
            console.log(`Successfully deleted ${imageFilePaths.length} files from mindmap-images/${mapKey}`);
          }
        } else {
          console.log(`No files found in mindmap-images/${mapKey}`);
        }

        // List and delete files from mindmap-audio bucket
        const { data: audioFileList, error: audioListError } = await supabase.storage
          .from('mindmap-audio')
          .list(mapKey);

        if (audioListError) {
          console.error(`Error listing files in mindmap-audio/${mapKey}:`, audioListError);
        } else if (audioFileList && audioFileList.length > 0) {
          // Create an array of file paths to delete
          const audioFilePaths = audioFileList.map(file => `${mapKey}/${file.name}`);

          // Delete all files in the folder
          const { error: deleteAudioFilesError } = await supabase.storage
            .from('mindmap-audio')
            .remove(audioFilePaths);

          if (deleteAudioFilesError) {
            console.error(`Error deleting files from mindmap-audio/${mapKey}:`, deleteAudioFilesError);
          } else {
            console.log(`Successfully deleted ${audioFilePaths.length} files from mindmap-audio/${mapKey}`);
          }
        } else {
          console.log(`No files found in mindmap-audio/${mapKey}`);
        }
      }

      // Now delete the mindmap from the database
      const { error } = await supabase
        .from("mindmaps")
        .delete()
        .eq("id", id)
        .eq("creator", userId);

      if (error) {
        console.error("Error deleting mindmap from Supabase:", error);
      }
    } catch (err) {
      console.error("Unexpected error in deleteMapFromSupabase:", err);
    }
  },
  addMap: async (title, userId) => {
    const sanitizedTitle = sanitizeTitle(title);
    const existingIds = get().maps.map((map) => map.id);
    let id = sanitizedTitle;
    let counter = 1;

    while (existingIds.includes(id)) {
      id = `${sanitizedTitle}-${counter}`;
      counter++;
    }

    const newMap: MindMap = {
      id,
      title,
      nodes: [
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
    };

    set((state) => ({ maps: [...state.maps, newMap] }));

    try {
      await get().saveMapToSupabase(newMap, userId);
    } catch (error) {
      console.error("Error saving new map to Supabase:", error);
      set((state) => ({ maps: state.maps.filter((map) => map.id !== id) }));
      
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

    return id;
  },
  cloneMap: async (mapId, userId) => {
    const mapToClone = get().maps.find((map) => map.id === mapId);
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
    const existingIds = get().maps.map((map) => map.id);
    let id = sanitizedTitle;
    let counter = 1;

    // Ensure unique ID
    while (existingIds.includes(id)) {
      id = `${sanitizedTitle}-${counter}`;
      counter++;
    }

    // Clone the map with default settings (no privacy, likes, comments, collaborators)
    const clonedMap: MindMap = {
      id,
      title: newTitle,
      nodes: [...mapToClone.nodes], // Deep copy nodes
      edges: [...mapToClone.edges], // Deep copy edges
      edgeType: mapToClone.edgeType || 'default',
      backgroundColor: mapToClone.backgroundColor,
      dotColor: mapToClone.dotColor,
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
      set((state) => ({ maps: state.maps.filter((map) => map.id !== id) }));
      
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

    return id;
  },
updateMap: async (id, nodes, edges, title, userId, customization = { edgeType: 'default' }) => {
  if (!Array.isArray(nodes) || !Array.isArray(edges)) {
    console.error('Invalid data: nodes and edges must be arrays');
    return;
  }

  // Extract customization data with defaults
  const { edgeType = 'default', backgroundColor = '#11192C', dotColor = '#81818a', drawingData } = customization;

  // Fetch the mindmap to get the 'key', allowing access for creator or collaborators
  const { data: mindmaps, error: fetchError } = await supabase
    .from('mindmaps')
    .select('key, creator, collaborators')
    .eq('id', id);

  if (fetchError || !mindmaps || mindmaps.length === 0) {
    console.error('Error fetching mindmap key:', fetchError);
    console.error('No mindmap found with ID:', id, 'for user:', userId);
    return;
  }

  // Find the mindmap where user is either creator or collaborator
  const mindmap = mindmaps.find(map => 
    map.creator === userId || 
    (Array.isArray(map.collaborators) && map.collaborators.includes(userId))
  );

  if (!mindmap?.key) {
    console.error('User does not have permission to edit any mindmap with ID:', id, 'User:', userId);
    return;
  }

  // Check if user has permission to edit (is creator or collaborator)
  const isCreator = mindmap.creator === userId;
  const isCollaborator = Array.isArray(mindmap.collaborators) && mindmap.collaborators.includes(userId);
  
  if (!isCreator && !isCollaborator) {
    console.error('User does not have permission to edit this mindmap:', id, 'User:', userId);
    return;
  }

  const mapKey = mindmap.key;
  const updatedNodes = [...nodes];
  const currentMap = get().maps.find((map) => map.id === id) || get().collaborationMaps.find((map) => map.id === id);

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
      await deleteMediaFromStorage(mapKey, node.id, node.type || 'unknown');
    }
  }

  // Also check for any image nodes in the current nodes list that might have been deleted
  // but aren't in the currentMap yet (newly created and then deleted before fetching)
  const nodeIdsInCurrentUpdate = nodes.map(node => node.id);

  // Get all image nodes that were previously saved but are now missing
  const { data: existingImageNodes, error: imageListError } = await supabase.storage
    .from('mindmap-images')
    .list(mapKey);

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
      await deleteMediaFromStorage(mapKey, nodeId, 'image');
    }
  } else if (imageListError) {
    console.error('Error listing files in image storage bucket:', imageListError);
  }

  // Get all audio nodes that were previously saved but are now missing
  const { data: existingAudioNodes, error: audioListError } = await supabase.storage
    .from('mindmap-audio')
    .list(mapKey);

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
      await deleteMediaFromStorage(mapKey, nodeId, 'audio');
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
      const path = `${mapKey}/${node.id}.${extension}`;
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
        const path = `${mapKey}/${node.id}.${extension}`;
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
  const updatedMap = get().maps.find((map) => map.id === id) || get().collaborationMaps.find((map) => map.id === id);
  
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
    };
    
    // Determine if this is a collaborator edit
    const isCollaboratorEdit = !isCreator && isCollaborator;
    
    await get().saveMapToSupabase(updatedMapData, userId, isCollaboratorEdit);
  }
},
  deleteMap: (id, userId) => {
    const currentMap = get().maps.find((map) => map.id === id);
    if (!currentMap) return;

    set((state) => ({
      maps: state.maps.filter((map) => map.id !== id),
    }));

    get()
      .deleteMapFromSupabase(id, userId)
      .catch((error) => {
        console.error("Error deleting map from Supabase:", error);
        set((state) => ({
          maps: [...state.maps, currentMap],
        }));
      });
  },
  proposeAIChanges: (id, nodes, edges, title) => {
    console.log("Proposing AI changes:", { id, nodes, edges, title });
    const currentMap = get().maps.find((map) => map.id === id);
    if (currentMap) {
      set({
        mapBackup: { ...currentMap },
        aiProposedChanges: { id, nodes, edges, title },
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

        const mapId = mapBackup?.id;

        if (!mapId) {
          throw new Error("No map ID found in backup");
        }

        const userId = useAuthStore.getState().user?.id;
        await get().updateMap(mapId, nodes, edges, title, userId || '');

        // Update the local state with the new mindmap data
        set((state) => ({
          maps: state.maps.map((map) =>
            map.id === mapId
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
        usePreviewMindMapStore.getState().clearPreviewMap(mapId);

        set({ aiProposedChanges: null, mapBackup: null });
      } catch (error) {
        console.error("Error applying specific AI changes:", error);
        if (mapBackup) {
          const userId = useAuthStore.getState().user?.id;
          await get().updateMap(mapBackup.id, mapBackup.nodes, mapBackup.edges, mapBackup.title, userId || '');
        }
        set({ aiProposedChanges: null, mapBackup: null });
      }
    } else if (aiProposedChanges) {
      try {
        const { id, nodes, edges, title } = aiProposedChanges;
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
        await get().updateMap(id, nodes, edges, title, userId || '');

        // Update the local state with the new mindmap data
        set((state) => ({
          maps: state.maps.map((map) =>
            map.id === id
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
        usePreviewMindMapStore.getState().clearPreviewMap(id);

        set({ aiProposedChanges: null, mapBackup: null });
      } catch (error) {
        console.error("Error applying AI changes:", error);
        const { mapBackup } = get();
        if (mapBackup) {
          const userId = useAuthStore.getState().user?.id;
          await get().updateMap(mapBackup.id, mapBackup.nodes, mapBackup.edges, mapBackup.title, userId || '');
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
  updateMapTitle: (id, title) => {
    set((state) => ({
      maps: state.maps.map((map) =>
        map.id === id
          ? {
              ...map,
              title,
              updatedAt: Date.now(),
            }
          : map
      ),
    }));
  },
  updateMapVisibility: (id, visibility) => {
    const currentMap = get().maps.find((map) => map.id === id);
    if (!currentMap) return;

    const updatedMap = { ...currentMap, visibility, updatedAt: Date.now() };

    set((state) => ({
      maps: state.maps.map((map) => (map.id === id ? updatedMap : map)),
    }));

    get()
      .saveMapToSupabase(updatedMap)
      .catch((error) => {
        console.error("Error updating visibility in Supabase:", error);
        set((state) => ({
          maps: state.maps.map((map) => (map.id === id ? currentMap : map)),
        }));
      });
  },
  getPublicMapsCount: () => {
    return get().maps.filter((map) => map.visibility === 'public').length;
  },
  toggleLike: (mapId, userId) => {
    set((state) => ({
      maps: state.maps.map((map) => {
        if (map.id === mapId) {
          const isLiked = map.likedBy.includes(userId);
          return {
            ...map,
            likes: isLiked ? map.likes - 1 : map.likes + 1,
            likedBy: isLiked ? map.likedBy.filter((id) => id !== userId) : [...map.likedBy, userId],
          };
        }
        return map;
      }),
    }));
  },
  toggleMapPin: (id) => {
    const currentMap = get().maps.find((map) => map.id === id);
    if (!currentMap) return;

    // Don't update the updatedAt timestamp when toggling pin state
    const updatedMap = { ...currentMap, isPinned: !currentMap.isPinned };

    // Update local state
    set((state) => ({
      maps: state.maps.map((map) => (map.id === id ? updatedMap : map)),
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
            .eq("id", id)
            .eq("creator", userId);

          if (error) {
            throw error;
          }
        } catch (error) {
          console.error("Error updating pin state in Supabase:", error);
          // Revert local state on error
          set((state) => ({
            maps: state.maps.map((map) => (map.id === id ? currentMap : map)),
          }));
        }
      })();
    } catch (error) {
      console.error("Error in toggleMapPin:", error);
      // Revert local state on error
      set((state) => ({
        maps: state.maps.map((map) => (map.id === id ? currentMap : map)),
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
  updateMapId: async (oldId, newId) => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId || !/^[0-9a-fA-F-]{36}$/.test(userId)) {
      console.error("Invalid or undefined userId provided to updateMapId.");
      return;
    }

    const currentMap = get().maps.find((map) => map.id === oldId);
    if (!currentMap) {
      console.error("Map not found for the given old ID:", oldId);
      return;
    }

    const updatedMap = { ...currentMap, id: newId, updatedAt: Date.now() };

    set((state) => ({
      maps: state.maps.map((map) => (map.id === oldId ? updatedMap : map)),
    }));

    try {
      const { error } = await supabase
        .from("mindmaps")
        .update({ id: newId })
        .eq("id", oldId)
        .eq("creator", userId);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error("Error updating map ID in Supabase:", error);
      set((state) => ({
        maps: state.maps.map((map) => (map.id === oldId ? currentMap : map)),
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

const deleteMediaFromStorage = async (mapKey: string, nodeId: string, nodeType: string) => {
  try {
    let paths: string[] = [];
    let bucketName = '';

    if (nodeType === 'image') {
      paths = [`${mapKey}/${nodeId}.jpg`, `${mapKey}/${nodeId}.png`];
      bucketName = 'mindmap-images';
    } else if (nodeType === 'audio') {
      paths = [`${mapKey}/${nodeId}.opus`, `${mapKey}/${nodeId}.webm`, `${mapKey}/${nodeId}.mp3`, `${mapKey}/${nodeId}.ogg`];
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

