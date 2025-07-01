import { MindMap } from '../store/mindMapStore';

// Mock data for likes, comments, and saves. Replace with your database fetching logic.
const mockMindMapData = {
  'map1': {
    likes: Math.floor(Math.random() * 100),
    comments: Math.floor(Math.random() * 50),
    saves: Math.floor(Math.random() * 20),
  },
  'map2': {
    likes: Math.floor(Math.random() * 100),
    comments: Math.floor(Math.random() * 50),
    saves: Math.floor(Math.random() * 20),
  },
  // Add more mock data as needed
};

// Function to fetch mind map data.  Currently uses mock data, but can be easily adapted for a real database.
export const getMindMapData = async (mapId: string): Promise<Partial<MindMap>> => {
  await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate network delay

  // Check if mock data exists for this map ID
  if (mockMindMapData[mapId]) {
    return mockMindMapData[mapId];
  } else {
    // Handle case where map ID is not found in mock data (or database)
    console.warn(`Mind map data not found for ID: ${mapId}`);
    return {}; // Return an empty object or handle the error appropriately
  }
};



// Example of how to fetch data from a real database (replace with your actual database code)
// export const getMindMapData = async (mapId: string): Promise<Partial<MindMap>> => {
//   try {
//     const response = await fetch(`/api/mindmaps/${mapId}`); // Replace with your API endpoint
//     if (!response.ok) {
//       throw new Error(`Failed to fetch mind map data: ${response.status} ${response.statusText}`);
//     }
//     const data = await response.json();
//     return data;
//   } catch (error) {
//     console.error('Error fetching mind map data:', error);
//     throw error; // Re-throw the error to be handled by the calling function
//   }
// };
