import { useState, useEffect, useRef, useCallback } from 'react';
import { Handle, Position, useReactFlow } from 'reactflow';
import { ListMusic, Play, Pause, SkipForward, SkipBack, RotateCcw, Loader, AudioWaveform } from 'lucide-react';
import { AudioVisualizer } from 'react-audio-visualize';
import { SpotifyIcon } from './icons/SpotifyIcon';
import { SoundCloudIcon } from './icons/SoundCloudIcon';
import { Youtube } from 'lucide-react';

interface PlaylistItem {
  id: string;
  label: string;
  audioUrl?: string;
  spotifyUrl?: string;
  soundCloudUrl?: string;
  videoUrl?: string; // Add videoUrl for YouTube videos
}

interface PlaylistNodeProps {
  id: string;
  data: {
    label: string;
    trackIds?: string[]; // Store only the IDs of audio or spotify nodes
  };
  isConnectable: boolean;
  background?: string;
  style?: {
    background?: string;
  };
}

// Helper function to format time in MM:SS format
const formatTime = (timeInSeconds: number): string => {
  if (isNaN(timeInSeconds) || !isFinite(timeInSeconds) || timeInSeconds < 0) return '00:00';

  const minutes = Math.floor(timeInSeconds / 60);
  const seconds = Math.floor(timeInSeconds % 60);

  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

// Helper function to format SoundCloud URLs into readable text
const formatSoundCloudUrl = (url?: string, fallbackLabel: string = 'SoundCloud Track'): string => {
  if (!url) return fallbackLabel;
  
  try {
    // Improved regex to remove protocol, www prefix, and domain completely
    let path = url.replace(/^(?:https?:\/\/)?(?:www\.)?soundcloud\.com\//, '');
    
    // Split artist and song parts
    const [artist, ...songParts] = path.split('/');
    const song = songParts.join('-');
    
    if (artist && song) {
      return `${artist} - ${song}`;
    } else if (artist) {
      return artist;
    }
    return fallbackLabel;
  } catch (error) {
    return fallbackLabel;
  }
};

export function PlaylistNode({ id, data, isConnectable }: PlaylistNodeProps) {
  // Get ReactFlow instance to access nodes
  const reactFlowInstance = useReactFlow();

  // State for playlist functionality
  const [playlist, setPlaylist] = useState<PlaylistItem[]>([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [hasEnded, setHasEnded] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [hoverPosition, setHoverPosition] = useState<number | null>(null);
  // Add state for Spotify iframe
  const [spotifyEmbedUrl, setSpotifyEmbedUrl] = useState<string | null>(null);
  const spotifyIframeRef = useRef<HTMLIFrameElement>(null);
  // Add state for tracking if Spotify player is ready
  const [spotifyPlayerReady, setSpotifyPlayerReady] = useState(false);
  // Add state to track the current loaded Spotify track ID
  const [currentSpotifyTrackId, setCurrentSpotifyTrackId] = useState<string | null>(null);
  // Create a ref to hold the latest ready state to avoid race conditions
  const spotifyPlayerReadyRef = useRef(false);

  // Add state for YouTube iframe
  const [youtubePlayerReady, setYoutubePlayerReady] = useState(false);
  const youtubePlayerReadyRef = useRef(false);
  const youtubeIframeRef = useRef<HTMLIFrameElement>(null);
  const [currentYoutubeTrackId, setCurrentYoutubeTrackId] = useState<string | null>(null);

  // Track when mouse is hovering over the playlist tracks area
  const [isHoveringTracks, setIsHoveringTracks] = useState(false);

  // Notify ReactFlow when hovering state changes to disable/enable zooming
  useEffect(() => {
    if (isHoveringTracks) {
      // Dispatch custom event to disable zooming
      document.dispatchEvent(new CustomEvent('playlist-hover', {
        detail: { hovering: true }
      }));
    } else {
      // Dispatch custom event to re-enable zooming
      document.dispatchEvent(new CustomEvent('playlist-hover', {
        detail: { hovering: false }
      }));
    }

    return () => {
      // Make sure zooming is re-enabled when component unmounts
      document.dispatchEvent(new CustomEvent('playlist-hover', {
        detail: { hovering: false }
      }));
    };
  }, [isHoveringTracks]);

  // Refs
  const nodeRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isMountedRef = useRef(true);
  const progressIntervalRef = useRef<number | null>(null);
  const visualizerRef = useRef<HTMLCanvasElement>(null);

  // Cache for audio blobs to avoid redundant fetches
  const audioBlobCacheRef = useRef<Map<string, Blob>>(new Map());

  // Always load content to prevent audio culling when out of view
  const shouldLoadContent = true;

  // Build playlist from track IDs
  useEffect(() => {
    if (data.trackIds && data.trackIds.length > 0) {
      const allNodes = reactFlowInstance.getNodes();

      // Map track IDs to actual audio node data
      const playlistItems = data.trackIds
        .map((trackId, index) => {
          const node = allNodes.find(node => node.id === trackId && (
            node.type === 'audio' || 
            node.type === 'spotify' || 
            node.type === 'soundcloud' || 
            node.type === 'youtube-video'
          ));
          if (!node) return null;

          // Count occurrences of this track ID before this index
          const trackOccurrences = data.trackIds
            ? data.trackIds.slice(0, index).filter(id => id === trackId).length
            : 0;

          // Create a label with counter for duplicate tracks
          let displayLabel = node.data.label || (
            node.type === 'audio' ? 'Audio' : 
            node.type === 'spotify' ? 'Spotify Track' : 
            node.type === 'soundcloud' ? 'SoundCloud Track' :
            node.type === 'youtube-video' ? 'YouTube Video' :
            'Track'
          );
          
          // Format SoundCloud URLs into readable labels
          if (node.type === 'soundcloud' && node.data.soundCloudUrl) {
            displayLabel = formatSoundCloudUrl(node.data.soundCloudUrl, displayLabel);
          }
          
          if (trackOccurrences > 0) {
            displayLabel = `${displayLabel} (${trackOccurrences + 1})`;
          }

          // Determine the URL based on node type
          let audioUrl: string | undefined = undefined;
          let spotifyUrl: string | undefined = undefined;
          let soundCloudUrl: string | undefined = undefined;
          let videoUrl: string | undefined = undefined;
          if (node.type === 'audio') {
            audioUrl = node.data.audioUrl as string | undefined;
          } else if (node.type === 'spotify') {
            spotifyUrl = node.data.spotifyUrl as string | undefined;
          } else if (node.type === 'soundcloud') {
            soundCloudUrl = node.data.soundCloudUrl as string | undefined;
          } else if (node.type === 'youtube-video') {
            videoUrl = node.data.videoUrl as string | undefined;
          }

          return {
            id: node.id,
            label: displayLabel,
            audioUrl: audioUrl,
            spotifyUrl: spotifyUrl,
            soundCloudUrl: soundCloudUrl,
            videoUrl: videoUrl
          } as PlaylistItem | null; // Explicitly type the returned object
        })
        .filter((item): item is PlaylistItem => item !== null);

      setPlaylist(playlistItems);
    } else {
      setPlaylist([]);
    }
  }, [data.trackIds, reactFlowInstance]);

  // Clean up on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (progressIntervalRef.current) {
        window.clearInterval(progressIntervalRef.current);
      }

      // We don't clear the audio blob cache on unmount to maintain it across renders
      // This ensures we don't refetch the same audio files when the component remounts
    };
  }, []);

  // Add event listeners to the audio element to properly update play/pause state
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    
    const handlePlay = () => {
      if (isMountedRef.current) {
        console.log('Audio play event detected');
        setIsPlaying(true);
        if (hasEnded) setHasEnded(false);
      }
    };
    
    const handlePause = () => {
      if (isMountedRef.current) {
        console.log('Audio pause event detected');
        setIsPlaying(false);
      }
    };
    
    const handleEnded = () => {
      if (isMountedRef.current) {
        console.log('Audio ended event detected');
        setHasEnded(true);
        setIsPlaying(false);
        
        // Auto-play next track if available
        if (currentTrackIndex < playlist.length - 1) {
          // Use a small timeout to ensure state is updated properly before playing next track
          setTimeout(() => {
            if (isMountedRef.current) {
              playTrack(currentTrackIndex + 1);
            }
          }, 100);
        }
      }
    };
    
    // Clean up any existing listeners first to avoid duplication
    audio.removeEventListener('play', handlePlay);
    audio.removeEventListener('pause', handlePause);
    audio.removeEventListener('ended', handleEnded);
    
    // Add the listeners
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    
    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [hasEnded, currentTrackIndex, playlist.length]); // Add dependencies for auto-play next functionality

  // Function to update progress
  const updateProgress = useCallback(() => {
    if (audioRef.current && isMountedRef.current && currentTrackIndex >= 0 && currentTrackIndex < playlist.length) {
      // Always update progress for audio tracks, regardless of Spotify status
      const currentTrack = playlist[currentTrackIndex];
      // Only proceed for audio tracks
      if (currentTrack.audioUrl && !currentTrack.spotifyUrl) {
        const currentTime = audioRef.current.currentTime;
        const audioDuration = audioRef.current.duration || 0;
        if (audioDuration > 0) {
          setProgress((currentTime / audioDuration) * 100);
          setCurrentTime(currentTime);
        }
      }
    }
  }, [currentTrackIndex, playlist]);

  // Function to fetch audio as blob for visualization
  const fetchAudioAsBlob = useCallback(async (url: string, trackIndex: number = -1) => {
    if (!url) return null;

    // Create a unique cache key using the track index and URL
    // This ensures duplicate tracks (same URL but different positions) have separate cache entries
    const cacheKey = trackIndex >= 0 ? `${trackIndex}:${url}` : url;

    // Check if we already have this blob in the cache
    if (audioBlobCacheRef.current.has(cacheKey)) {
      console.log('Using cached audio blob for track index:', trackIndex, 'URL:', url);
      const cachedBlob = audioBlobCacheRef.current.get(cacheKey)!;
      setAudioBlob(cachedBlob);
      return cachedBlob;
    }

    try {
      console.log('Fetching audio as blob for track index:', trackIndex, 'URL:', url);
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch audio: ${response.status} ${response.statusText}`);
      }
      const blob = await response.blob();
      console.log('Successfully fetched audio blob:', blob.type, blob.size);

      // Make sure we have a valid audio blob before setting it
      if (blob.size > 0 && (blob.type.includes('audio') || url.includes('mindmap-audio'))) {
        // Store in cache for future use with the unique cache key
        audioBlobCacheRef.current.set(cacheKey, blob);

        setAudioBlob(blob);
        console.log('Audio blob set from URL:', blob.type, Math.round(blob.size / 1024), 'KB');
      } else {
        console.warn('Invalid audio blob received:', blob.type, blob.size);
      }

      return blob;
    } catch (error) {
      console.error('Error fetching audio as blob:', error);
      return null;
    }
  }, []);

  // Set up progress interval when playing
  useEffect(() => {
    if (isPlaying) {
      progressIntervalRef.current = window.setInterval(updateProgress, 100);
    } else if (progressIntervalRef.current) {
      window.clearInterval(progressIntervalRef.current);
    }

    return () => {
      if (progressIntervalRef.current) {
        window.clearInterval(progressIntervalRef.current);
      }
    };
  }, [isPlaying, updateProgress]);

  // Add a safety timeout to clear loading state if it gets stuck
  useEffect(() => {
    let loadingTimeout: number | null = null;

    if (isLoading) {
      // Clear loading state after 5 seconds if it hasn't been cleared already
      loadingTimeout = window.setTimeout(() => {
        console.log('Loading timeout reached, clearing loading state');
        setIsLoading(false);
      }, 5000);
    }

    return () => {
      if (loadingTimeout) {
        window.clearTimeout(loadingTimeout);
      }
    };
  }, [isLoading]);

  // Function to extract Spotify track ID from URL
  const extractSpotifyTrackId = useCallback((spotifyUrl: string): string | null => {
    // Handle various Spotify URL formats
    const trackIdMatch = spotifyUrl.match(/track\/([a-zA-Z0-9]+)/);
    return trackIdMatch ? trackIdMatch[1] : null;
  }, []);

  // Function to create Spotify embed URL
  const createSpotifyEmbedUrl = useCallback((spotifyUrl: string): string | null => {
    const trackId = extractSpotifyTrackId(spotifyUrl);
    if (!trackId) return null;
    
    // Update the current Spotify track ID
    setCurrentSpotifyTrackId(trackId);
    
    // Create embed URL with autoplay=1 to attempt autoplay
    return `https://open.spotify.com/embed/track/${trackId}?utm_source=generator&theme=0`;
  }, [extractSpotifyTrackId]);

  // Function to control Spotify playback with readiness check
  const controlSpotifyPlayback = useCallback((action: 'play' | 'pause') => {
    if (!spotifyIframeRef.current || !spotifyPlayerReadyRef.current) {
      console.log('Spotify player not ready yet, cannot', action);
      return false;
    }
    
    try {
      console.log(`Sending ${action} command to Spotify player`);
      // Send message to the Spotify iframe
      spotifyIframeRef.current.contentWindow?.postMessage({
        type: 'command',
        command: action
      }, '*');
      return true;
    } catch (error) {
      console.error('Error controlling Spotify playback:', error);
      return false;
    }
  }, []);

  // Function to control YouTube playback
  const controlYoutubePlayback = useCallback((action: 'play' | 'pause') => {
    if (!youtubeIframeRef.current || !youtubePlayerReadyRef.current) {
      console.log('YouTube player not ready yet, cannot', action);
      return false;
    }
    
    try {
      console.log(`Sending ${action} command to YouTube player`);
      // Send message to the YouTube iframe using the YouTube iframe API format
      youtubeIframeRef.current.contentWindow?.postMessage(JSON.stringify({
        event: 'command',
        func: action === 'play' ? 'playVideo' : 'pauseVideo',
        args: []
      }), '*');
      
      // Update UI immediately for responsiveness
      setIsPlaying(action === 'play');
      
      return true;
    } catch (error) {
      console.error(`Error ${action}ing YouTube video:`, error);
      return false;
    }
  }, []);

  // Update the YouTube player ref when the state changes
  useEffect(() => {
    youtubePlayerReadyRef.current = youtubePlayerReady;
  }, [youtubePlayerReady]);

  // Effect to auto-play YouTube when player becomes ready
  useEffect(() => {
    if (youtubePlayerReady && currentTrackIndex >= 0 && playlist[currentTrackIndex]?.videoUrl) {
      console.log('YouTube player is now ready, attempting to play');
      // Wait a bit to ensure the player is fully initialized
      const timer = setTimeout(() => {
        const success = controlYoutubePlayback('play');
        if (success) {
          setIsPlaying(true);
          setIsLoading(false);
        }
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [youtubePlayerReady, currentTrackIndex, playlist, controlYoutubePlayback]);

  // Update the ref when the state changes
  useEffect(() => {
    spotifyPlayerReadyRef.current = spotifyPlayerReady;
  }, [spotifyPlayerReady]);

  // Effect to auto-play Spotify when player becomes ready
  useEffect(() => {
    if (spotifyPlayerReady && currentTrackIndex >= 0 && playlist[currentTrackIndex]?.spotifyUrl) {
      console.log('Spotify player is now ready, attempting to play');
      // Wait a bit longer to ensure the player is fully initialized
      const timer = setTimeout(() => {
        const success = controlSpotifyPlayback('play');
        if (success) {
          setIsPlaying(true);
          setIsLoading(false);
        }
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [spotifyPlayerReady, currentTrackIndex, playlist, controlSpotifyPlayback]);

  // Add state for SoundCloud iframe
  const [soundCloudEmbedUrl, setSoundCloudEmbedUrl] = useState<string | null>(null);
  const soundCloudIframeRef = useRef<HTMLIFrameElement>(null);
  const [soundCloudPlayerReady, setSoundCloudPlayerReady] = useState(false);
  const soundCloudPlayerReadyRef = useRef(false);
  // Add state to track the current loaded SoundCloud track URL
  const [currentSoundCloudTrackUrl, setCurrentSoundCloudTrackUrl] = useState<string | null>(null);

  // Function to create SoundCloud embed URL - fix URL formatting issues
  const createSoundCloudEmbedUrl = useCallback((soundCloudUrl: string): string => {
    console.log('Creating SoundCloud embed URL for:', soundCloudUrl);
    
    // Ensure the URL has a protocol (SoundCloud embed requires complete URLs)
    let formattedUrl = soundCloudUrl;
    if (!formattedUrl.startsWith('http')) {
      formattedUrl = 'https://' + formattedUrl;
    }
    
    // Update the current SoundCloud track URL
    setCurrentSoundCloudTrackUrl(formattedUrl);
    
    // Create embed URL for SoundCloud Widget API with improved parameters
    // visual=true for artwork, but hide user info and controls where possible
    return `https://w.soundcloud.com/player/?url=${encodeURIComponent(formattedUrl)}&color=%235c6ac4&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false&visual=true&single_active=true&buying=false&sharing=false&download=false&show_playcount=true`;
  }, []);

  // Enhanced SoundCloud initialization with duration request
  const initializeSoundCloudWidget = useCallback(() => {
    if (!soundCloudIframeRef.current) return;
    
    try {
      console.log('Initializing SoundCloud widget API with direct play approach');
      
      // First bind to ready event
      soundCloudIframeRef.current.contentWindow?.postMessage(JSON.stringify({
        method: 'addEventListener',
        value: 'ready'
      }), '*');
      
      // Then bind other events - add more events for reliability
      ['play', 'pause', 'finish', 'playProgress', 'error', 'seek', 'playing'].forEach(event => {
        soundCloudIframeRef.current?.contentWindow?.postMessage(JSON.stringify({
          method: 'addEventListener',
          value: event
        }), '*');
      });
      
      // Explicitly request duration information
      soundCloudIframeRef.current.contentWindow?.postMessage(JSON.stringify({
        method: 'getDuration'
      }), '*');
      
      // Important: Immediately try to issue a play command without waiting for ready
      soundCloudIframeRef.current.contentWindow?.postMessage(JSON.stringify({
        method: 'play'
      }), '*');
      
      // Send play again after a short delay - increases reliability
      setTimeout(() => {
        if (soundCloudIframeRef.current && isMountedRef.current) {
          soundCloudIframeRef.current.contentWindow?.postMessage(JSON.stringify({
            method: 'play'
          }), '*');
        }
      }, 300);
      
      // Mark as playing to match our UI state
      setIsPlaying(true);
      
    } catch (error) {
      console.error('Error initializing SoundCloud widget:', error);
    }
  }, []);

  // More reliable SoundCloud playback control
  const controlSoundCloudPlayback = useCallback((action: 'play' | 'pause') => {
    if (!soundCloudIframeRef.current) {
      console.log('SoundCloud iframe not available');
      return false;
    }
    
    try {
      console.log(`Attempting to ${action} SoundCloud track (direct method)`);
      
      // Use wildcard target origin to ensure message delivery
      const command = JSON.stringify({ method: action });
      soundCloudIframeRef.current.contentWindow?.postMessage(command, '*');
      
      // Update UI immediately for responsiveness
      setIsPlaying(action === 'play');
      
      // Also try again after a short delay (helps with reliability)
      setTimeout(() => {
        if (soundCloudIframeRef.current && isMountedRef.current) {
          soundCloudIframeRef.current.contentWindow?.postMessage(command, '*');
        }
      }, 100);
      
      return true;
    } catch (error) {
      console.error(`Error ${action}ing SoundCloud track:`, error);
      return false;
    }
  }, []);

  // Update the ref when the state changes
  useEffect(() => {
    soundCloudPlayerReadyRef.current = soundCloudPlayerReady;
  }, [soundCloudPlayerReady]);

  // Effect to auto-play SoundCloud when player becomes ready
  useEffect(() => {
    if (soundCloudPlayerReady && currentTrackIndex >= 0 && playlist[currentTrackIndex]?.soundCloudUrl) {
      console.log('SoundCloud player is now ready, attempting to play');
      // Wait a bit to ensure the player is fully initialized
      const timer = setTimeout(() => {
        const success = controlSoundCloudPlayback('play');
        if (success) {
          setIsPlaying(true);
          setIsLoading(false);
        }
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [soundCloudPlayerReady, currentTrackIndex, playlist, controlSoundCloudPlayback]);

  // Update audioBlob and handle Spotify/SoundCloud URL when track changes
  useEffect(() => {
    // Reset Spotify and SoundCloud player ready state when changing tracks
    setSpotifyPlayerReady(false);
    setSoundCloudPlayerReady(false);
    
    // Clear any previous state when switching tracks
    setAudioBlob(null);
    setSoundCloudEmbedUrl(null);
    
    // Reset progress for all track changes to ensure clean state
    setProgress(0);
    setCurrentTime(0);

    if (currentTrackIndex >= 0 && currentTrackIndex < playlist.length) {
      const currentTrack = playlist[currentTrackIndex];
      const trackIndexCopy = currentTrackIndex;
      
      if (currentTrack.spotifyUrl) {
        // Handle Spotify track
        console.log('Selected Spotify track:', currentTrack.label, currentTrack.spotifyUrl);
        
        // Extract the track ID before creating the embed URL
        const trackId = extractSpotifyTrackId(currentTrack.spotifyUrl);
        if (trackId) {
          setCurrentSpotifyTrackId(trackId);
        }
        
  // Create Spotify embed URL - don't use autoplay in URL as we'll control it via JS
  const embedUrl = createSpotifyEmbedUrl(currentTrack.spotifyUrl);
  setSpotifyEmbedUrl(embedUrl);
  // setDuration(0); (removed duration logic)
  setHasEnded(false);
  setIsLoading(true);
  // We'll handle play state in the Spotify ready effect
      } else if (currentTrack.soundCloudUrl) {
        // Handle SoundCloud track
        console.log('Selected SoundCloud track:', currentTrack.label, currentTrack.soundCloudUrl);
        
        // Clear Spotify embed and audio blob
        setSpotifyEmbedUrl(null);
        setAudioBlob(null);
        
        // Reset SoundCloud player ready state since we're loading a new track
        setSoundCloudPlayerReady(false);
        
  // Create SoundCloud embed URL
  const embedUrl = createSoundCloudEmbedUrl(currentTrack.soundCloudUrl);
  setSoundCloudEmbedUrl(embedUrl);
  // setDuration(0); (removed duration logic)
  setHasEnded(false);
  setIsLoading(true);
  // We'll handle play state in the SoundCloud ready effect
      } else if (currentTrack.audioUrl) {
        // Handle regular audio track
        console.log('Selected Audio track:', currentTrack.label, currentTrack.audioUrl);
        
        // Clear any existing Spotify embed
        setSpotifyEmbedUrl(null);
        
  // setDuration(0); (removed duration logic)
        setHasEnded(false);
        setIsLoading(true);
        fetchAudioAsBlob(currentTrack.audioUrl, currentTrackIndex)
          .then(blob => {
            if (isMountedRef.current) {
              if (blob) {
                console.log('Successfully fetched audio blob for visualization', blob.size);
                if (currentTrackIndex === trackIndexCopy) {
                  setAudioBlob(blob);
                }
              } else {
                console.warn('Failed to fetch audio blob - null result');
              }
            }
          })
          .catch(error => {
            console.error('Error fetching audio blob:', error);
          });
      } else if (currentTrack.videoUrl) {
        // Handle YouTube video
        console.log('Selected YouTube video:', currentTrack.label, currentTrack.videoUrl);
        
        // Clear Spotify embed and audio blob
        setSpotifyEmbedUrl(null);
        setAudioBlob(null);
        
        // Clear SoundCloud embed
        setSoundCloudEmbedUrl(null);
        
  // setDuration(0); (removed duration logic)
  setHasEnded(false);
  setIsLoading(true);
  // We'll handle play state in the YouTube iframe
      }
    }
  }, [currentTrackIndex, playlist, fetchAudioAsBlob, createSpotifyEmbedUrl, extractSpotifyTrackId, createSoundCloudEmbedUrl]);

  // Listen for Spotify and SoundCloud widget API messages
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Process SoundCloud messages
      if (event.origin === 'https://w.soundcloud.com') {
        try {
          // Parse the data if it's a string
          let data;
          if (typeof event.data === 'string') {
            try {
              data = JSON.parse(event.data);
            } catch (e) {
              // Some messages may not be valid JSON
              return;
            }
          } else {
            data = event.data;
          }
          
          if (!data || typeof data !== 'object') return;
          
          // Debug all SoundCloud events
          console.log('SoundCloud event:', data.method, data);

          // Clear loading state with ANY valid SoundCloud event
          if (isLoading && data.method) {
            console.log('Clearing loading state due to SoundCloud activity');
            setIsLoading(false);
          }
          
          // Removed SoundCloud duration handling
          
          // Handle ready event more aggressively
          if (data.method === 'ready') {
            console.log('SoundCloud player is READY - requesting duration and sending play command');
            setSoundCloudPlayerReady(true);
            setIsLoading(false);
            
            // Removed explicit duration request
            
            // Force immediate play command on ready
            if (currentTrackIndex >= 0 && playlist[currentTrackIndex]?.soundCloudUrl) {
              // Send direct command without using our wrapper function
              soundCloudIframeRef.current?.contentWindow?.postMessage(
                JSON.stringify({ method: 'play' }), 
                '*'
              );
              setIsPlaying(true);
              
              // Also try again after a short delay for increased reliability
              setTimeout(() => {
                if (soundCloudIframeRef.current && isMountedRef.current) {
                  soundCloudIframeRef.current.contentWindow?.postMessage(
                    JSON.stringify({ method: 'play' }), 
                    '*'
                  );
                }
              }, 500);
            }
          }
          
          // Handle playback state changes - clear loading state as soon as we get any progress
          if (data.method === 'playProgress') {
            // Clear loading state immediately on first playback progress
            setIsLoading(false);
            
            // Update time and progress
            if (data.value && typeof data.value.currentPosition === 'number' && typeof data.value.duration === 'number') {
              const currentMs = data.value.currentPosition;
              const durationMs = data.value.duration;
              setCurrentTime(currentMs / 1000); // Convert ms to seconds
              setProgress((currentMs / durationMs) * 100);
            }
          }
          
          // Handle play/pause state
          if (data.method === 'play' || data.method === 'playing') {
            console.log('SoundCloud playback started');
            setIsPlaying(true);
            setIsLoading(false);
          } else if (data.method === 'pause') {
            setIsPlaying(false);
          } else if (data.method === 'finish') {
            setHasEnded(true);
            setIsPlaying(false);
            
            // Auto-play next track if available
            if (currentTrackIndex < playlist.length - 1) {
              playTrack(currentTrackIndex + 1);
            }
          }
        } catch (error) {
          console.error('Error processing SoundCloud message:', error);
        }
      } else if (event.origin === 'https://open.spotify.com') {
        // Keep existing Spotify message handling but filter out noisy messages
        try {
          // Filter out noisy playback_update messages - only log important events
          const importantSpotifyEvents = ['ready', 'player_state_changed', 'error'];
          if (importantSpotifyEvents.includes(event.data.type)) {
            console.log('Spotify message received:', event.data.type);
          }
          
          // Detect when player is ready
          if (event.data.type === 'ready') {
            console.log('Spotify player is ready');
            setSpotifyPlayerReady(true);
            
            // We'll handle actual playback in the separate effect that responds to spotifyPlayerReady
          }
          
          // Handle Spotify player events - only process meaningful state changes
          if (event.data.type === 'player_state_changed') {
            const state = event.data.playerState;
            
            // Update playing state based on player state
            if (state && state.paused !== undefined) {
              setIsPlaying(!state.paused);
              
              // If we know it's playing, we can mark as not loading
              if (!state.paused) {
                setIsLoading(false);
              }
            }
            
            // Update progress if position is available
            if (state && state.position !== undefined && state.duration !== undefined) {
              setCurrentTime(state.position / 1000); // Convert ms to seconds
              setProgress((state.position / state.duration) * 100);
              
              // Check if track ended
              if (state.position >= state.duration - 100) { // Consider it ended if within 100ms of end
                setHasEnded(true);
                
                // Auto-play next track if available
                if (currentTrackIndex < playlist.length - 1) {
                  playTrack(currentTrackIndex + 1);
                }
              }
            }
          }
          
          // Ignore playback_update messages to reduce noise
          // if (event.data.type === 'playback_update') {
          //   // Skip processing these frequent update messages
          //   return;
          // }
        } catch (error) {
          console.error('Error processing Spotify message:', error);
        }
      } else if (event.origin.includes('youtube.com')) {
        try {
          // Parse the data if it's a string (YouTube sometimes sends string data)
          let data = event.data;
          if (typeof data === 'string') {
            try {
              data = JSON.parse(data);
            } catch (e) {
              // Some messages may not be valid JSON
              return;
            }
          }
          
          if (!data || typeof data !== 'object') return;
          
          // Filter out noisy YouTube events - only log important ones
          const importantEvents = ['onReady', 'onStateChange', 'onError'];
          if (importantEvents.includes(data.event)) {
            console.log('YouTube event:', data.event, data.info);
          }

          // Handle YouTube player ready event
          if (data.event === 'onReady') {
            console.log('YouTube player is READY');
            setYoutubePlayerReady(true);
            setIsLoading(false);
            
            // Auto-play when ready (handled by separate effect)
          }
          
          // Handle YouTube player state changes
          if (data.event === 'onStateChange') {
            // YouTube states: -1 (unstarted), 0 (ended), 1 (playing), 2 (paused), 3 (buffering), 5 (video cued)
            const state = data.info;
            
            if (state === 1) { // Playing
              console.log('YouTube playback started');
              setIsPlaying(true);
              setIsLoading(false);
            } else if (state === 2) { // Paused
              console.log('YouTube playback paused');
              setIsPlaying(false);
            } else if (state === 0) { // Ended
              console.log('YouTube playback ended');
              setIsPlaying(false);
              setHasEnded(true);
              
              // Auto-play next track if available
              if (currentTrackIndex < playlist.length - 1) {
                playTrack(currentTrackIndex + 1);
              }
            }
          }
        } catch (error) {
          console.error('Error processing YouTube message:', error);
        }
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [currentTrackIndex, playlist.length, controlYoutubePlayback, playlist]);

  // Play/pause the current track - updated to handle YouTube videos
  const togglePlayPause = () => {
    // Dispatch a custom event to notify MindMap component that this is a playback action
    document.dispatchEvent(new CustomEvent('playlist-playback-action', {
      detail: { nodeId: id, action: 'toggle-play-pause' }
    }));

    if (currentTrackIndex < 0 && playlist.length > 0) {
      // If no track is selected but we have tracks, play the first one
      playTrack(0);
    } else if (currentTrackIndex >= 0 && currentTrackIndex < playlist.length) {
      const currentTrack = playlist[currentTrackIndex];
      
      if (currentTrack.videoUrl) {
        console.log('Toggling YouTube playback, current state:', isPlaying ? 'playing' : 'paused');
        
        // Always attempt to control regardless of UI state since YouTube might be out of sync
        const action = isPlaying ? 'pause' : 'play';
        const success = controlYoutubePlayback(action);
        
        if (!success && !youtubePlayerReady) {
          // If player isn't ready, set loading
          setIsLoading(true);
        }
      } else if (currentTrack.spotifyUrl) {
        console.log('Toggling Spotify playback, current state:', isPlaying ? 'playing' : 'paused');
        
        // For Spotify, we should NOT reload the embed URL when toggling play/pause
        // Just send the play/pause command to the existing player
        const action = isPlaying ? 'pause' : 'play';
        const success = controlSpotifyPlayback(action);
        
        if (success) {
          // Only update state if the command was sent successfully
          setIsPlaying(!isPlaying);
        } else if (!spotifyPlayerReady) {
          // If player isn't ready, set loading
          setIsLoading(true);
        }
      } else if (currentTrack.soundCloudUrl) {
        console.log('Toggling SoundCloud playback, current state:', isPlaying ? 'playing' : 'paused');
        
        // Try to control the player regardless of ready state
        const action = isPlaying ? 'pause' : 'play';
        controlSoundCloudPlayback(action);
        
        // Don't wait for success/failure response from the iframe
        // We'll let the message event handler update the state
      } else if (currentTrack.audioUrl && audioRef.current) {
        // Handle regular audio playback
        console.log('Toggling audio playback. Current state:', 
                    isPlaying ? 'playing' : 'paused', 
                    'Audio paused:', audioRef.current.paused);
                    
        if (hasEnded) {
          // If playback ended, restart from the beginning
          audioRef.current.currentTime = 0;
          setHasEnded(false);
          audioRef.current.play()
            .then(() => setIsPlaying(true))
            .catch(err => {
              console.error('Error playing audio:', err);
              setIsPlaying(false);
              setIsLoading(false);
            });
          setIsLoading(true);
        } else if (!audioRef.current.paused) {
          // If currently playing, pause
          console.log('Pausing audio');
          audioRef.current.pause();
        } else if (audioRef.current.readyState >= 2) {
          // If paused and ready to play, play
          console.log('Playing audio');
          audioRef.current.play()
            .then(() => {
              console.log('Audio playback started successfully');
              setIsPlaying(true);
            })
            .catch(err => {
              console.error('Error playing audio:', err);
              setIsPlaying(false);
              setIsLoading(false);
            });
        }
      }
    }
  };

  // Play the next track
  const playNextTrack = () => {
    if (currentTrackIndex < playlist.length - 1) {
      // Dispatch a custom event to notify MindMap component that this is a playback action
      document.dispatchEvent(new CustomEvent('playlist-playback-action', {
        detail: { nodeId: id, action: 'next-track' }
      }));

      const nextIndex = currentTrackIndex + 1;
      playTrack(nextIndex);
    }
  };

  // Play the previous track
  const playPreviousTrack = () => {
    if (currentTrackIndex > 0) {
      // Dispatch a custom event to notify MindMap component that this is a playback action
      document.dispatchEvent(new CustomEvent('playlist-playback-action', {
        detail: { nodeId: id, action: 'previous-track' }
      }));

      const prevIndex = currentTrackIndex - 1;
      playTrack(prevIndex);
    }
  };

  // Play a specific track by index - updated to handle YouTube videos
  const playTrack = (index: number) => {
    if (index >= 0 && index < playlist.length) {
      // Dispatch a custom event to notify MindMap component that this is a playback action
      document.dispatchEvent(new CustomEvent('playlist-playback-action', {
        detail: { nodeId: id, action: 'play', trackIndex: index }
      }));

      // If we're already playing this track, toggle play/pause instead
      if (currentTrackIndex === index) {
        togglePlayPause();
        return;
      }

      const selectedTrack = playlist[index];

      // Set the current track index first to ensure other effects can use it
      setCurrentTrackIndex(index);

      // Handle YouTube videos differently
      if (selectedTrack.videoUrl) {
        console.log('Selected YouTube video for playback:', selectedTrack.label, selectedTrack.videoUrl);
        
        // Pause any current audio playback
        if (audioRef.current && !audioRef.current.paused) {
          audioRef.current.pause();
        }
        
        // Clear SoundCloud embed
        setSoundCloudEmbedUrl(null);
        
        // Clear Spotify embed
        setSpotifyEmbedUrl(null);
        
        // Extract video ID and set current track ID
        const videoId = extractYouTubeVideoId(selectedTrack.videoUrl);
        setCurrentYoutubeTrackId(videoId);
        
        // Reset YouTube player ready state since we're loading a new track
        setYoutubePlayerReady(false);
        
        // Set track metadata
  setDuration(0);
        setCurrentTime(0);
        setProgress(0);
        setHasEnded(false);
        setIsLoading(true);
        
        // Set isPlaying to true to indicate intent to play
        // Actual playback will be handled when the player is ready
        setIsPlaying(true);
      } else if (selectedTrack.spotifyUrl) {
        console.log('Selected Spotify track for playback:', selectedTrack.label, selectedTrack.spotifyUrl);
        
        // Pause any current audio playback
        if (audioRef.current && !audioRef.current.paused) {
          audioRef.current.pause();
        }
        
        // Clear SoundCloud embed
        setSoundCloudEmbedUrl(null);
        
        // Check if this is the same Spotify track as currently loaded
        const newTrackId = extractSpotifyTrackId(selectedTrack.spotifyUrl);
        
        // Only reload the embed if it's a different track
        if (newTrackId !== currentSpotifyTrackId) {
          console.log('Loading new Spotify track:', newTrackId);
          // Reset Spotify player ready state since we're loading a new track
          setSpotifyPlayerReady(false);
          
          // Create new embed URL
          const embedUrl = createSpotifyEmbedUrl(selectedTrack.spotifyUrl);
          setSpotifyEmbedUrl(embedUrl);
        } else {
          console.log('Same Spotify track, just resuming playback');
          // Same track, just resume playback without reloading
          const success = controlSpotifyPlayback('play');
          if (success) {
            setIsPlaying(true);
            setIsLoading(false);
            return; // Exit early since we don't need to reload
          }
        }
        
        // Set track metadata
  setDuration(0);
        setCurrentTime(0);
        setProgress(0);
        setHasEnded(false);
        setIsLoading(true);
        
        // We don't set isPlaying yet - we'll do that when the player is ready
      } else if (selectedTrack.soundCloudUrl) {
        // Handle SoundCloud track
        console.log('Selected SoundCloud track for playback:', selectedTrack.label, selectedTrack.soundCloudUrl);
        
        // Pause any current audio playback
        if (audioRef.current && !audioRef.current.paused) {
          audioRef.current.pause();
        }
        
        // Reset SoundCloud player ready state since we're loading a new track
        setSoundCloudPlayerReady(false);
        
        // Clear Spotify embed
        setSpotifyEmbedUrl(null);
        
        // Set track metadata
  // setDuration(selectedTrack.duration || 0); (removed duration logic)
        setCurrentTime(0);
        setProgress(0);
        setHasEnded(false);
        setIsLoading(true);
        
        // IMPORTANT: Set isPlaying to true explicitly for SoundCloud tracks
        // This ensures the play command is sent when the widget is ready
        setIsPlaying(true);
      } else if (selectedTrack.audioUrl) {
        // Handle regular audio tracks
        console.log('Selected Audio track for playback:', selectedTrack.label, selectedTrack.audioUrl);
        
        // Reset Spotify states
        setSpotifyEmbedUrl(null);
        
        // Set the track duration immediately from the playlist item
  // setDuration(0); (removed duration logic)
        
        // Set initial audio states
        setIsPlaying(true);
        setIsLoading(true);
        setCurrentTime(0);
        setProgress(0);
        setHasEnded(false);
        
        // Fetch the audio blob for visualization - this is crucial for the visualizer
        fetchAudioAsBlob(selectedTrack.audioUrl, index)
          .catch(error => console.error('Error fetching audio blob:', error));
      }
    }
  };

  return (
    <div ref={nodeRef} className="relative overflow-visible" style={{ width: '300px' }}>
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={isConnectable}
        className="!top-[-8px] !bg-sky-400 !border-1 !border-gray-700 !w-3 !h-3"
        style={{ zIndex: 20 }}
      />
      <div className="p-0 m-0 font-size-0 line-height-0">
        <div className="bg-gray-800/50 rounded-lg p-3 min-w-[250px]">
          {/* Header with title */}
          <div className="flex items-center mb-2">
            <ListMusic className="w-4 h-4 text-gray-400 mr-2" />
            <span className="text-sm text-gray-300 truncate">
              {data.label || 'Playlist'}
            </span>
          </div>

          {/* Playlist tracks - limited to show 5 tracks with scrolling */}
          <div
            className="mb-3 max-h-[140px] overflow-y-auto bg-gray-900/30 rounded p-1 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent"
            onMouseEnter={() => setIsHoveringTracks(true)}
            onMouseLeave={() => setIsHoveringTracks(false)}
            ref={(el) => {
              // Add non-passive wheel event listener to the element
              if (el) {
                const wheelHandler = (e: WheelEvent) => {
                  // When hovering over tracks, we want to scroll the tracks, not zoom the mindmap
                  if (isHoveringTracks) {
                    e.preventDefault();
                    e.stopPropagation();

                    // Manually handle scrolling
                    el.scrollTop += e.deltaY;
                  }
                };

                // Remove any existing listener first to avoid duplicates
                el.removeEventListener('wheel', wheelHandler);
                // Add the event listener with passive: false to allow preventDefault
                el.addEventListener('wheel', wheelHandler, { passive: false });
              }
            }}
          >
            {playlist.length === 0 ? (
              <div className="text-gray-500 text-xs p-2 text-center">
                No tracks added to playlist
              </div>
            ) : (
              <div className="space-y-1">
                {playlist.map((track, index) => (
                  <div
                    key={`${track.id}-${index}`}
                    className={`flex items-center p-1 rounded text-xs ${
                      currentTrackIndex === index
                        ? 'bg-white/10 text-white'
                        : 'hover:bg-gray-800/50 text-gray-300'
                    } select-none`}
                    onClick={() => playTrack(index)}
                  >
                    <div className="w-5 text-center text-gray-500 mr-1 flex-shrink-0">
                      {index + 1}.
                    </div>
                    {/* Conditionally render icons based on track type */}
                    {track.spotifyUrl ? (
                      <SpotifyIcon className="w-3 h-3 text-gray-500 mr-1 flex-shrink-0" />
                    ) : track.soundCloudUrl ? (
                      <SoundCloudIcon className="w-3 h-3 text-gray-500 mr-1 flex-shrink-0" />
                    ) : track.videoUrl ? (
                      <Youtube className="w-3 h-3 text-gray-500 mr-1 flex-shrink-0" />
                    ) : (
                      <AudioWaveform className="w-3 h-3 text-gray-500 mr-1 flex-shrink-0" />
                    )}
                    <div className="flex-1 truncate">{track.label}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Playback controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1">
              <button
                className="p-1 rounded-full text-white transition-colors hover:bg-gray-700/50"
                onClick={playPreviousTrack}
                disabled={currentTrackIndex <= 0 || playlist.length === 0}
              >
                <SkipBack className="w-4 h-4" />
              </button>

              <button
                className="p-1.5 rounded-full text-white transition-colors hover:bg-gray-700/50"
                onClick={togglePlayPause}
                disabled={playlist.length === 0}
              >
                {isLoading ? (
                  <Loader className="w-4 h-4 animate-spin" />
                ) : hasEnded ? (
                  <RotateCcw className="w-4 h-4" />
                ) : isPlaying ? (
                  <Pause className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
              </button>

              <button
                className="p-1 rounded-full text-white transition-colors hover:bg-gray-700/50"
                onClick={playNextTrack}
                disabled={currentTrackIndex >= playlist.length - 1 || playlist.length === 0}
              >
                <SkipForward className="w-4 h-4" />
              </button>
            </div>

            {/* Current track info */}
            <div className="text-xs text-gray-400 ml-2 flex-1 truncate">
              {currentTrackIndex >= 0 && currentTrackIndex < playlist.length ? (
                <div className="flex justify-between">
                  <span className="truncate">{playlist[currentTrackIndex].label}</span>
                  
                  {/* Only show time display for regular audio tracks (not SoundCloud, Spotify, or YouTube) */}
                  {/* No duration logic, only show current time if needed */}
                </div>
              ) : (
                <span>-</span>
              )}
            </div>
          </div>

          {/* SoundCloud Embed (conditionally rendered) */}
          {shouldLoadContent && soundCloudEmbedUrl && (
            <div className="mt-3 flex flex-col">
              <div className="soundcloud-embed-container rounded-md overflow-hidden bg-gray-900/80 border border-gray-700/50 shadow-inner" style={{ height: '150px' }}>
                <iframe
                  ref={soundCloudIframeRef}
                  src={soundCloudEmbedUrl}
                  width="100%"
                  height="150"
                  frameBorder="0"
                  allow="autoplay"
                  style={{ 
                    borderRadius: '4px',
                    boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.2)'
                  }}
                  onLoad={() => {
                    console.log('SoundCloud iframe LOADED - initializing immediately');
                    
                    // Set isPlaying preemptively for better UI feedback
                    setIsPlaying(true);
                    
                    // Clear loading state soon after iframe loads
                    setTimeout(() => {
                      if (isMountedRef.current) {
                        setIsLoading(false);
                      }
                    }, 1500);
                    
                    // Initialize widget with our improved method
                    setTimeout(() => {
                      if (isMountedRef.current) {
                        initializeSoundCloudWidget();
                      }
                    }, 100);
                  }}
                ></iframe>
              </div>
            </div>
          )}

          {/* Spotify Embed (conditionally rendered) */}
          {shouldLoadContent && spotifyEmbedUrl && (
            <div className="mt-3 spotify-embed-container rounded overflow-hidden" style={{ height: '80px' }}>
              <iframe
                ref={spotifyIframeRef}
                src={spotifyEmbedUrl}
                width="100%"
                height="80"
                frameBorder="0"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy"
                style={{ borderRadius: '4px' }}
                onLoad={() => {
                  console.log('Spotify iframe loaded');
                  // Just log the load event, we'll rely on the message event for ready state
                }}
              ></iframe>
            </div>
          )}

          {/* YouTube Embed with API enabled for control */}
          {shouldLoadContent && currentTrackIndex >= 0 && 
           playlist[currentTrackIndex] && playlist[currentTrackIndex].videoUrl && (
            <div className="mt-3 youtube-embed-container rounded overflow-hidden" style={{ height: '150px' }}>
              <iframe
                ref={youtubeIframeRef}
                src={`https://www.youtube.com/embed/${extractYouTubeVideoId(playlist[currentTrackIndex].videoUrl!)}?enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}&autoplay=1&mute=0`}
                width="100%"
                height="150"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={{ borderRadius: '4px' }}
                onLoad={() => {
                  console.log('YouTube iframe loaded, initializing API');
                  
                  // Initialize the YouTube player
                  setTimeout(() => {
                    if (youtubeIframeRef.current && isMountedRef.current) {
                      try {
                        // Force immediate initialization attempt with YouTube iframe API
                        youtubeIframeRef.current.contentWindow?.postMessage(JSON.stringify({
                          event: 'listening',
                          id: youtubeIframeRef.current.id || 'youtube-player'
                        }), '*');
                        
                        // Clear loading state after a reasonable timeout if not cleared by events
                        setTimeout(() => {
                          if (isMountedRef.current) {
                            setIsLoading(false);
                          }
                        }, 2000);
                      } catch (err) {
                        console.error('Error initializing YouTube iframe:', err);
                        setIsLoading(false);
                      }
                    }
                  }, 200);
                }}
              ></iframe>
            </div>
          )}

          {/* Audio visualizer or progress bar - only show for non-Spotify/non-SoundCloud tracks */}
          {currentTrackIndex >= 0 && playlist[currentTrackIndex] && 
           !playlist[currentTrackIndex].spotifyUrl && !playlist[currentTrackIndex].soundCloudUrl && (
            <>
              {/* For audio tracks with blob data, show visualizer */}
              {(audioBlob && playlist[currentTrackIndex]?.audioUrl) ? (
                <div
                  className="mt-2 overflow-hidden cursor-pointer relative"
                  onClick={(e) => {
                    // Dispatch a custom event to notify MindMap component that this is a playback action
                    document.dispatchEvent(new CustomEvent('playlist-playback-action', {
                      detail: { nodeId: id, action: 'seek' }
                    }));

                    if (audioRef.current) {
                      // Calculate click position as percentage of the visualizer width
                      const rect = e.currentTarget.getBoundingClientRect();
                      const pos = (e.clientX - rect.left) / rect.width;

                      // Get the effective duration
                      // duration property removed
                      const audioDuration = audioRef.current.duration || 0;
                      const effectiveDuration = audioDuration;

                      // Only set currentTime if we have a valid duration
                      if (effectiveDuration && isFinite(effectiveDuration) && effectiveDuration > 0) {
                        // Set the audio's current time based on the click position
                        audioRef.current.currentTime = pos * effectiveDuration;

                        // Reset hasEnded state if user interacts with the visualizer
                        if (hasEnded) {
                          setHasEnded(false);
                        }
                      }
                    }
                  }}
                  onMouseMove={(e) => {
                    // Calculate hover position as percentage of the visualizer width
                    const rect = e.currentTarget.getBoundingClientRect();
                    const pos = (e.clientX - rect.left) / rect.width;
                    setHoverPosition(pos);
                  }}
                  onMouseLeave={() => {
                    setHoverPosition(null);
                  }}
                >
                  <AudioVisualizer
                    ref={visualizerRef}
                    blob={audioBlob}
                    width={300}
                    height={24}
                    barWidth={2}
                    gap={1}
                    barColor={'rgba(75, 85, 99, 0.5)'}
                    barPlayedColor={'#ffffff'}
                    currentTime={currentTime}
                    style={{
                      borderRadius: '4px',
                      width: '100%', // Make sure it fills the container
                      height: '24px'
                    }}
                  />

                  {/* Hover indicator */}
                  {hoverPosition !== null && (
                    <div
                      className="absolute top-0 bottom-0 w-[2px] bg-white/70 pointer-events-none"
                      style={{
                        left: `${hoverPosition * 100}%`,
                        boxShadow: '0 0 4px rgba(255, 255, 255, 0.7)'
                      }}
                    />
                  )}

                  {/* Hover time tooltip */}
                  {hoverPosition !== null && (
                    <div
                      className="absolute top-[-22px] bg-gray-800 text-xs text-white px-1.5 py-0.5 rounded pointer-events-none transform -translate-x-1/2 z-10"
                      style={{
                        left: `${hoverPosition * 100}%`,
                        opacity: 0.9,
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)'
                      }}
                    >
                      {/* No duration logic */}
                    </div>
                  )}
                </div>
              ) : (
                // Show progress bar only for audio tracks without blob (not for Spotify)
                <div 
                  className="mt-2 h-1 bg-gray-700 rounded-full overflow-hidden cursor-pointer relative"
                  onClick={(e) => {
                    // Dispatch a custom event to notify MindMap component that this is a playback action
                    document.dispatchEvent(new CustomEvent('playlist-playback-action', {
                      detail: { nodeId: id, action: 'seek' }
                    }));

                    if (audioRef.current) {
                      // Calculate click position as percentage of the bar width
                      const rect = e.currentTarget.getBoundingClientRect();
                      const pos = (e.clientX - rect.left) / rect.width;

                      // Get the effective duration
                      // duration property removed
                      const audioDuration = audioRef.current.duration || 0;
                      const effectiveDuration = audioDuration;

                      // Only set currentTime if we have a valid duration
                      if (effectiveDuration && isFinite(effectiveDuration) && effectiveDuration > 0) {
                        // Set the audio's current time based on the click position
                        audioRef.current.currentTime = pos * effectiveDuration;

                        // Reset hasEnded state if user interacts with the progress bar
                        if (hasEnded) {
                          setHasEnded(false);
                        }
                      }
                    }
                  }}
                  onMouseMove={(e) => {
                    // Calculate hover position as percentage of the bar width
                    const rect = e.currentTarget.getBoundingClientRect();
                    const pos = (e.clientX - rect.left) / rect.width;
                    setHoverPosition(pos);
                  }}
                  onMouseLeave={() => {
                    setHoverPosition(null);
                  }}
                >
                  <div
                    className="h-full bg-white"
                    style={{ width: `${progress}%` }}
                  />

                  {/* Hover indicator */}
                  {hoverPosition !== null && (
                    <div
                      className="absolute top-0 bottom-0 w-[2px] bg-white/70 pointer-events-none"
                      style={{
                        left: `${hoverPosition * 100}%`,
                        boxShadow: '0 0 4px rgba(255, 255, 255, 0.7)'
                      }}
                    />
                  )}

                  {/* Hover time tooltip */}
                  {hoverPosition !== null && (
                    <div
                      className="absolute top-[-22px] bg-gray-800 text-xs text-white px-1.5 py-0.5 rounded pointer-events-none transform -translate-x-1/2 z-10"
                      style={{
                        left: `${hoverPosition * 100}%`,
                        opacity: 0.9,
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)'
                      }}
                    >
                      {/* No duration logic */}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Audio element (hidden) - only render for audio tracks and ensure it gets the right audio URL */}
      {shouldLoadContent && currentTrackIndex >= 0 && currentTrackIndex < playlist.length && 
       playlist[currentTrackIndex].audioUrl && !playlist[currentTrackIndex].spotifyUrl && (
        <audio
          // Add a key that includes both the track index and URL to force re-render when switching between duplicate tracks
          key={`audio-${currentTrackIndex}-${playlist[currentTrackIndex].audioUrl}`}
          ref={audioRef}
          src={playlist[currentTrackIndex].audioUrl}
          preload="auto"
          className="hidden"
          autoPlay={isPlaying} // autoPlay should be true only if isPlaying is true
          onLoadStart={() => {
            if (isMountedRef.current) setIsLoading(true);
          }}
          onLoadedData={() => {
            if (isMountedRef.current) {
              console.log('Audio loaded successfully');
              setIsLoading(false);
              // Ensure we update the progress when audio is loaded
              updateProgress();
              
              // Make sure playback state is correct
              if (isPlaying && audioRef.current?.paused) {
                audioRef.current.play().catch(err => {
                  console.error('Error auto-playing audio:', err);
                  setIsPlaying(false);
                });
              }
            }
          }}
          onLoadedMetadata={() => {
            if (isMountedRef.current && audioRef.current) {
              // If we don't have a duration from the playlist item, use the audio element's duration
              const audioDuration = audioRef.current.duration;
              if (!isNaN(audioDuration) && isFinite(audioDuration) && audioDuration > 0) {
                // setDuration(audioDuration); (removed duration logic)
              }
            }
          }}
          onError={(e) => {
            console.error('Error loading audio element:', e);
            if (isMountedRef.current) {
              setIsLoading(false);
              setIsPlaying(false);
            }
          }}
          onEnded={() => {
            if (isMountedRef.current) {
              console.log('Audio ended');
              setHasEnded(true);
              setIsPlaying(false);
              
              // Check if there's a next track to play
              if (currentTrackIndex < playlist.length - 1) {
                // Use setTimeout to ensure state updates before playing next track
                setTimeout(() => {
                  if (isMountedRef.current) {
                    playNextTrack(); // Use playNextTrack instead of direct index to ensure proper handling
                  }
                }, 100);
              }
            }
          }}
        />
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={isConnectable}
        className="!bottom-[-8px] !bg-sky-400 !border-1 !border-gray-700 !w-3 !h-3"
        style={{ zIndex: 20 }}
      />
    </div>
  );
}

// Improved YouTube video ID extraction function
function extractYouTubeVideoId(url: string): string {
  // Handle various YouTube URL formats
  const regexPatterns = [
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i,
    /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
  ];
  
  for (const regex of regexPatterns) {
    const match = url.match(regex);
    if (match && match[2] && match[2].length === 11) {
      return match[2];
    }
  }
  
  // Default match for standard YouTube URLs
  const standardMatch = url.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/);
  return (standardMatch && standardMatch[2].length === 11) ? standardMatch[2] : '';
}