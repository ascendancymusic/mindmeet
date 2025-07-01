export interface YouTubeVideo {
  id: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
  url: string;
}

const YOUTUBE_API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;
const YOUTUBE_API_URL = 'https://www.googleapis.com/youtube/v3/search';
const YOUTUBE_VIDEOS_API_URL = 'https://www.googleapis.com/youtube/v3/videos';
const YOUTUBE_VIDEO_URL = 'https://www.youtube.com/watch?v=';

async function checkVideoAvailability(videoId: string): Promise<boolean> {
  try {
    const response = await fetch(
      `${YOUTUBE_VIDEOS_API_URL}?part=status,contentDetails&id=${videoId}&key=${YOUTUBE_API_KEY}`
    );

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    if (!data.items || data.items.length === 0) {
      return false;
    }

    const video = data.items[0];
    // Check if video is not private and not region restricted
    return video.status.privacyStatus === 'public' && !video.status.embeddable === false;
  } catch (error) {
    console.error('Error checking video availability:', error);
    return false;
  }
}

export async function searchVideos(query: string): Promise<YouTubeVideo[]> {
  if (!YOUTUBE_API_KEY) {
    console.error('YouTube API key is not configured');
    return [];
  }

  try {
    const response = await fetch(
      `${YOUTUBE_API_URL}?part=snippet&maxResults=10&q=${encodeURIComponent(query)}&type=video&key=${YOUTUBE_API_KEY}`
    );

    if (!response.ok) {
      throw new Error('YouTube API request failed');
    }

    const data = await response.json();
    const availableVideos: YouTubeVideo[] = [];

    if (!data.items || !Array.isArray(data.items)) {
      console.error('Invalid response format from YouTube API');
      return [];
    }

    for (const item of data.items) {
      if (!item.id?.videoId || !item.snippet) continue;
      
      const videoId = item.id.videoId;
      const isAvailable = await checkVideoAvailability(videoId);

      if (isAvailable) {
        const thumbnail = item.snippet.thumbnails?.high?.url || 
                        item.snippet.thumbnails?.default?.url;

        if (!thumbnail) continue;

        availableVideos.push({
          id: videoId,
          title: item.snippet.title || '',
          channelTitle: item.snippet.channelTitle || '',
          thumbnailUrl: thumbnail,
          url: `${YOUTUBE_VIDEO_URL}${videoId}`
        });
      }

      // Return when we have enough available videos
      if (availableVideos.length >= 5) {
        break;
      }
    }

    return availableVideos;
  } catch (error) {
    console.error('Error searching YouTube videos:', error);
    return [];
  }
}