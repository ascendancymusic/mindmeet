const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';
const CLIENT_ID = import.meta.env.VITE_SP_CLIENT_ID;
const CLIENT_SECRET = import.meta.env.VITE_SP_CLIENT_SECRET;

let accessToken: string | null = null;
let tokenExpiration: number | null = null;

async function getAccessToken() {
  if (accessToken && tokenExpiration && Date.now() < tokenExpiration) {
    return accessToken;
  }

  try {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${btoa(`${CLIENT_ID}:${CLIENT_SECRET}`)}`,
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Failed to get access token: ${response.statusText}`, errorText);
      throw new Error(`Failed to get access token: ${response.statusText}`);
    }

    const data = await response.json();
    accessToken = data.access_token;
    tokenExpiration = Date.now() + (data.expires_in * 1000);
    return accessToken;
  } catch (error) {
    console.error('Error getting Spotify access token:', error);
    throw error;
  }
}

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: { name: string }[];
  external_urls: {
    spotify: string;
  };
}

export async function searchTracks(query: string): Promise<SpotifyTrack[]> {
  if (!query.trim()) return [];

  try {
    const token = await getAccessToken();
    const response = await fetch(
      `${SPOTIFY_API_BASE}/search?q=${encodeURIComponent(query)}&type=track&limit=5`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Search failed: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.tracks?.items) {
      console.error('Unexpected response format:', data);
      return [];
    }

    return data.tracks.items;
  } catch (error) {
    console.error('Error searching tracks:', error instanceof Error ? error.message : 'Unknown error');
    return [];
  }
}
