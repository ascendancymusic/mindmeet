import { useState, useEffect, useCallback, useRef } from 'react';
import { Handle, Position, useReactFlow } from 'reactflow';
import { AudioWaveform, Loader, RotateCcw, PlusCircle, Check } from 'lucide-react';
// Fixed width node, no need for getNodeWidth and getNodeHeight
import { compressAudioFile } from '../utils/compressAudio';
import { AudioVisualizer } from 'react-audio-visualize';
import CollapseChevron from './CollapseChevron';

// Constants
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB in bytes
const MAX_DURATION = 240; // 4 minutes in seconds

interface AudioNodeProps {
  id: string;
  data: {
    label: string;
    file?: File;
    audioUrl?: string;
    duration?: number;
    hasChildren?: boolean;
    isCollapsed?: boolean;
    onToggleCollapse?: () => void;
  };
  isConnectable: boolean;
  background?: string; // Node background color
  style?: {
    background?: string;
  };
  onContextMenu?: (event: React.MouseEvent, nodeId: string) => void;
  isAddingToPlaylist?: boolean;
}



// Helper function to format time in MM:SS format
const formatTime = (timeInSeconds: number): string => {
  if (isNaN(timeInSeconds) || !isFinite(timeInSeconds) || timeInSeconds < 0) return '00:00';

  const minutes = Math.floor(timeInSeconds / 60);
  const seconds = Math.floor(timeInSeconds % 60);

  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

export function AudioNode({ id, data, isConnectable, background, style, onContextMenu, isAddingToPlaylist }: AudioNodeProps) {
  const [showCheckmark, setShowCheckmark] = useState(false);

  // Extract collapse data
  const hasChildren = data?.hasChildren || false;
  const isCollapsed = data?.isCollapsed || false;
  const onToggleCollapse = data?.onToggleCollapse;

  const handleOverlayClick = () => {
    setShowCheckmark(true);
    setTimeout(() => {
      setShowCheckmark(false);
    }, 1000);
  };
  // Create a simple ref for the node container
  const nodeRef = useRef<HTMLDivElement>(null);

  // Get the node's background color directly from the DOM element
  const getNodeBackgroundColor = useCallback(() => {
    // Try to get the node element by its ID
    const nodeElement = document.querySelector(`[data-id="${id}"]`);
    if (nodeElement) {
      // Get the computed background color
      const computedStyle = window.getComputedStyle(nodeElement);
      const computedBackground = computedStyle.backgroundColor;
      if (computedBackground && computedBackground !== 'rgba(0, 0, 0, 0)') {
        return computedBackground;
      }
    }
    // Fallback to props
    return background || style?.background || "#1f2937";
  }, [id, background, style]);

  // Use state to track the background color
  const [nodeBackground, setNodeBackground] = useState<string>(getNodeBackgroundColor());

  // Always load audio content to prevent culling when out of view
  const shouldLoadContent = true;

  // Update the background color when props change or when the node is rendered
  useEffect(() => {
    const updateBackgroundColor = () => {
      setNodeBackground(getNodeBackgroundColor());
    };

    // Update immediately
    updateBackgroundColor();

    // Also set up a MutationObserver to watch for style changes
    const nodeElement = document.querySelector(`[data-id="${id}"]`);
    if (nodeElement) {
      const observer = new MutationObserver(updateBackgroundColor);
      observer.observe(nodeElement, { attributes: true, attributeFilter: ['style'] });
      return () => observer.disconnect();
    }
  }, [id, getNodeBackgroundColor]);

  // We need to track the background color for dynamic updates
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false); // Used in multiple places throughout the component (e.g., loadAudio, handleCanPlayThrough)
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionProgress, setCompressionProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showError, setShowError] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [hoverPosition, setHoverPosition] = useState<number | null>(null);
  const [hasEnded, setHasEnded] = useState(false);
  const [isHoveringVolume, setIsHoveringVolume] = useState(false);
  const processedFileRef = useRef<File | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const durationRef = useRef<number>(0);
  const visualizerRef = useRef<HTMLCanvasElement>(null);
  // Ref for volume control debounce
  const lastVolumeWheelTimeRef = useRef<number>(0);
  // We need useReactFlow hook for the component to work properly with ReactFlow
  useReactFlow();

  // Track loading attempts for Supabase URLs
  const loadAttemptsRef = useRef(0);
  const maxLoadAttempts = 3;
  const audioUrlRef = useRef<string | null>(null);

  const loadAudio = useCallback(async () => {
    // If we have a file, prioritize it over audioUrl (for local preview before saving)
    if (data.file) {
      // If file already processed and we're showing its audio, do nothing
      if (data.file === processedFileRef.current && audioSrc && !audioSrc.startsWith('http')) {
        setIsLoading(false); // Ensure loading state is off if we're reusing existing audio
        return;
      }

      // Process the new file
      processedFileRef.current = null; // Reset to ensure we process the file
      // Reset load attempts when switching to a file
      loadAttemptsRef.current = 0;
      console.log('Processing new file for audio node');
    } else if (data.audioUrl) {
      // If no file but audioUrl exists, use the audioUrl
      // Extract the base URL without cache-busting parameters for comparison
      const currentAudioSrcBase = audioSrc?.split('?')[0];
      const newAudioUrlBase = data.audioUrl.split('?')[0];

      // Store the current audioUrl in ref for potential retries
      audioUrlRef.current = data.audioUrl;

      // Only update if the base URL has changed or if there's a new cache-busting parameter
      if (currentAudioSrcBase !== newAudioUrlBase || audioSrc !== data.audioUrl) {
        console.log('Setting new audio URL:', data.audioUrl);
        // Clean up any existing blob URL before setting a new one
        if (audioSrc && !audioSrc.includes('mindmap-audio')) {
          URL.revokeObjectURL(audioSrc);
        }

        // Set audio source and loading state in one go
        setAudioSrc(data.audioUrl);
        setIsLoading(true);
        setError(null);

        // We'll fetch the blob for visualization in the main effect
        // to avoid duplicate fetches
      }
      return;
    } else {
      // No file and no audioUrl
      setIsLoading(false);
      return;
    }

    // Check file size limit
    if (data.file.size > MAX_FILE_SIZE) {
      setError('Audio exceeds the 25MB limit');
      setShowError(true);
      setTimeout(() => setShowError(false), 2000);
      return;
    }

    // Check duration limit by creating a temporary audio context
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const arrayBuffer = await data.file.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      const audioDuration = audioBuffer.duration;

      // Close the audio context
      await audioContext.close();

      // Check if duration exceeds the limit
      if (audioDuration > MAX_DURATION) {
        setError(`Audio exceeds the 4-minute limit (${Math.floor(audioDuration / 60)}:${Math.floor(audioDuration % 60).toString().padStart(2, '0')})`);
        setShowError(true);
        setTimeout(() => setShowError(false), 2000);
        return;
      }
    } catch (err) {
      console.warn('Could not check audio duration before compression:', err);
      // Continue with compression, the duration will be checked during compression
    }

    // Process and compress the new file
    setIsLoading(true);
    setIsCompressing(true);
    setCompressionProgress(0);
    try {
      // Don't create a preview URL immediately - wait for compression
      // Start the compression process with progress updates
      compressAudioFile(
        data.file,
        // Progress callback
        (progress) => {
          if (isMountedRef.current) {
            setCompressionProgress(progress);
          }
        },
        // Duration callback - gets called as soon as duration is known
        (audioDuration) => {
          if (isMountedRef.current && audioDuration > 0) {
            // Check if duration exceeds the limit (as a backup check)
            if (audioDuration > MAX_DURATION) {
              setError(`Audio exceeds the 4-minute limit (${Math.floor(audioDuration / 60)}:${Math.floor(audioDuration % 60).toString().padStart(2, '0')})`);
              setShowError(true);
              setTimeout(() => setShowError(false), 2000);
              // We'll let the compression continue but will show the error
            }

            setDuration(audioDuration);

            // Store the duration in a ref so we can access it when the audio element loads
            durationRef.current = audioDuration;

            // Dispatch an event to update the node data with the duration
            const customEvent = new CustomEvent('audio-node-duration', {
              detail: {
                nodeId: id,
                duration: audioDuration
              },
              bubbles: true
            });
            document.dispatchEvent(customEvent);
          }
        }
      ).then(({ compressedFile, duration }) => {
        // Only update state if component is still mounted
        if (!isMountedRef.current) return;

        // Create an object URL from the compressed file
        const objectUrl = URL.createObjectURL(compressedFile);

        // Set the new compressed audio source and duration immediately
        setAudioSrc(objectUrl);
        // Also set the audio blob for visualization
        setAudioBlob(compressedFile);
        console.log('Audio blob set from compressed file:', compressedFile.type, Math.round(compressedFile.size / 1024), 'KB');

        if (duration && duration > 0) {
          setDuration(duration);
          // Store in ref for consistency
          durationRef.current = duration;

          // Dispatch an event to update the node data with the duration
          const customEvent = new CustomEvent('audio-node-duration', {
            detail: {
              nodeId: id,
              duration: duration
            },
            bubbles: true
          });
          document.dispatchEvent(customEvent);
        }
        setError(null);

        // Mark this file as processed and store the compressed file
        if (data.file) {
          processedFileRef.current = data.file;

          // Update the node data with the compressed file
          // This is important for saving to storage later
          console.log('Dispatching audio-node-compressed event with file:', compressedFile.type, compressedFile.size);
          const customEvent = new CustomEvent('audio-node-compressed', {
            detail: {
              nodeId: id,
              compressedFile
            },
            bubbles: true
          });
          document.dispatchEvent(customEvent);
        }
      }).catch(err => {
        console.error('Error compressing audio:', err);

        // Only update state if component is still mounted
        if (!isMountedRef.current) return;

        // Create a simple object URL for the original file as fallback
        if (data.file) {
          const tempObjectUrl = URL.createObjectURL(data.file);
          setAudioSrc(tempObjectUrl);
          // Also set the audio blob for visualization
          setAudioBlob(data.file);
          console.log('Audio blob set from original file:', data.file.type, Math.round(data.file.size / 1024), 'KB');

          // Try to get duration from the original file
          try {
            const audio = new Audio();
            audio.src = tempObjectUrl;
            audio.addEventListener('loadedmetadata', () => {
              if (isMountedRef.current && audio.duration && audio.duration > 0) {
                // Check if duration exceeds the limit
                if (audio.duration > MAX_DURATION) {
                  setError(`Audio exceeds the 4-minute limit (${Math.floor(audio.duration / 60)}:${Math.floor(audio.duration % 60).toString().padStart(2, '0')})`);
                  setShowError(true);
                  setTimeout(() => setShowError(false), 2000);
                  // We'll continue but show the error
                }

                setDuration(audio.duration);
                durationRef.current = audio.duration;

                // Dispatch an event to update the node data with the duration
                const customEvent = new CustomEvent('audio-node-duration', {
                  detail: {
                    nodeId: id,
                    duration: audio.duration
                  },
                  bubbles: true
                });
                document.dispatchEvent(customEvent);
              }
            });
          } catch (durationErr) {
            console.warn('Could not determine duration from original file:', durationErr);
          }
        }

        // Show a brief error message
        setError('Compression failed, using original file');
        setShowError(true);
        setTimeout(() => {
          if (isMountedRef.current) setShowError(false);
        }, 3000);

        // Still need to update the node data with the original file
        if (data.file) {
          console.log('Compression failed. Dispatching audio-node-compressed event with original file:', data.file.type, data.file.size);
          const customEvent = new CustomEvent('audio-node-compressed', {
            detail: {
              nodeId: id,
              compressedFile: data.file // Use original file if compression fails
            },
            bubbles: true
          });
          document.dispatchEvent(customEvent);
        }
      }).finally(() => {
        // Only update state if component is still mounted
        if (isMountedRef.current) {
          setIsLoading(false);
          setIsCompressing(false);
          setCompressionProgress(100);
        }
      });
    } catch (err) {
      console.error('Error processing audio:', err);
      setError('Error processing audio.');
      setShowError(true);
      setIsLoading(false);
    }
  }, [id, data.file, data.audioUrl]);

  // Track if component is mounted to prevent state updates after unmount
  const isMountedRef = useRef(true);

  // Track if initial load has been done
  const initialLoadDoneRef = useRef(false);

  // Effect to notify when hovering over volume control
  useEffect(() => {
    if (isHoveringVolume) {
      // Dispatch custom event to disable zooming
      document.dispatchEvent(new CustomEvent('audio-volume-hover', {
        detail: { hovering: true }
      }));
    } else {
      // Dispatch custom event to re-enable zooming
      document.dispatchEvent(new CustomEvent('audio-volume-hover', {
        detail: { hovering: false }
      }));
    }

    return () => {
      // Make sure zooming is re-enabled when component unmounts
      document.dispatchEvent(new CustomEvent('audio-volume-hover', {
        detail: { hovering: false }
      }));
    };
  }, [isHoveringVolume]);

  // Function to fetch audio as blob
  const fetchAudioAsBlob = useCallback(async (url: string) => {
    try {
      console.log('Fetching audio as blob from URL:', url);
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch audio: ${response.status} ${response.statusText}`);
      }
      const blob = await response.blob();
      console.log('Successfully fetched audio blob:', blob.type, blob.size);

      // Make sure we have a valid audio blob before setting it
      if (blob.size > 0 && (blob.type.includes('audio') || url.includes('mindmap-audio'))) {
        setAudioBlob(blob);
        console.log('Audio blob set from URL:', blob.type, Math.round(blob.size / 1024), 'KB');
      } else {
        console.warn('Invalid audio blob received:', blob.type, blob.size);
      }

      return blob;
    } catch (error) {
      console.error('Error fetching audio as blob:', error);
      setError('Error loading audio visualization.');
      setShowError(true);
      setTimeout(() => setShowError(false), 3000);
      return null;
    }
  }, []);

  // Function to retry loading audio from Supabase
  const retryLoadAudio = useCallback(() => {
    if (!audioUrlRef.current || loadAttemptsRef.current >= maxLoadAttempts) return;

    loadAttemptsRef.current++;
    console.log(`Retrying audio load (attempt ${loadAttemptsRef.current}/${maxLoadAttempts}):`, audioUrlRef.current);

    // Add a cache-busting parameter to force a fresh request
    const timestamp = Date.now();
    const urlWithForcedRefresh = audioUrlRef.current.includes('?')
      ? `${audioUrlRef.current}&retry=${timestamp}`
      : `${audioUrlRef.current}?retry=${timestamp}`;

    // Clean up any existing blob URL before setting a new one
    if (audioSrc && !audioSrc.includes('mindmap-audio')) {
      URL.revokeObjectURL(audioSrc);
    }

    setAudioSrc(urlWithForcedRefresh);
    setIsLoading(true);
    setError(null);

    // Also try to fetch the audio as blob for visualization
    if (urlWithForcedRefresh.includes('mindmap-audio')) {
      fetchAudioAsBlob(urlWithForcedRefresh).catch(console.error);
    }
  }, [audioSrc, fetchAudioAsBlob]);

  // Removed intersection observer effect since we always load content now

  // Always load duration data from JSON immediately (lightweight)
  useEffect(() => {
    // Set mounted flag
    isMountedRef.current = true;

    // Step 1: First load the JSON data (duration) from props
    // This ensures we have the duration information before loading the audio
    if (data.duration && data.duration > 0) {
      setDuration(data.duration);
      durationRef.current = data.duration;
      console.log('Using saved duration from node.data:', data.duration);
    } else {
      console.log('No saved duration in node.data');
    }

    return () => {
      // Mark component as unmounted
      isMountedRef.current = false;
    };
  }, [data.duration]);

  // Effect for loading audio - always runs to prevent culling
  useEffect(() => {

    // Step 2: Only proceed to load audio if we have a file or URL and haven't loaded it yet
    if ((data.file || data.audioUrl) && !initialLoadDoneRef.current) {
      console.log('Lazy loading audio content for node:', id);
      initialLoadDoneRef.current = true;
      // Reset load attempts when initially loading
      loadAttemptsRef.current = 0;
      setIsLoading(true); // Show loading state while we fetch everything

      // Step 3: Set up visualization data source
      // If we have a file, set it as the audio blob for visualization
      if (data.file) {
        setAudioBlob(data.file);
      }
      // If we have a URL, fetch it as a blob for visualization (only once)
      else if (data.audioUrl && data.audioUrl.includes('mindmap-audio')) {
        fetchAudioAsBlob(data.audioUrl).catch(console.error);
      }

      // Step 4: Load the actual audio data
      loadAudio().catch(err => {
        if (isMountedRef.current) {
          console.error('Error in loadAudio:', err);
          setError('Error loading audio.');
          setShowError(true);
          setIsLoading(false);
        }
      });
    }

    return () => {
      // Cleanup object URL only if it was created from a file and no audioUrl exists
      if (audioSrc && !audioSrc.includes('mindmap-audio')) {
        // Always revoke local blob URLs on unmount
        URL.revokeObjectURL(audioSrc);
      }

      // Clean up audio blob reference
      setAudioBlob(null);
    };
  }, [data.file, data.audioUrl, loadAudio, id]);

  // Effect for audio player events
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // If we already know the duration from compression, use it
    if (durationRef.current > 0) {
      setDuration(durationRef.current);
    }

    // Add canplaythrough event to ensure we're ready to play
    const handleCanPlayThrough = () => {
      if (isMountedRef.current) {
        setIsLoading(false);
        // Reset load attempts on successful load
        loadAttemptsRef.current = 0;
      }
    };

    // Function to update progress and time
    const updateProgress = () => {
      if (isMountedRef.current && audio) {
        // Make sure we have valid values
        const audioCurrentTime = audio.currentTime;

        if (!isNaN(audioCurrentTime) && isFinite(audioCurrentTime)) {
          setCurrentTime(audioCurrentTime);
        }

        // Use our stored duration if available, otherwise try the audio element's duration
        // This ensures we use the duration from the mindmap JSON data when available
        const effectiveDuration = durationRef.current > 0 ? durationRef.current : audio.duration;

        if (!isNaN(effectiveDuration) && isFinite(effectiveDuration) && effectiveDuration > 0) {
          // Calculate progress percentage
          const progressPercentage = (audioCurrentTime / effectiveDuration) * 100;
          setProgress(isNaN(progressPercentage) ? 0 : progressPercentage);

          // Update duration if it's not set yet
          if (duration <= 0) {
            setDuration(effectiveDuration);
            if (durationRef.current <= 0) {
              durationRef.current = effectiveDuration;
            }
          }
        } else {
          // Reset progress if duration is invalid
          setProgress(0);
        }
      }
    };

    // Event listeners for audio element
    const handlePlay = () => {
      if (isMountedRef.current) {
        setIsPlaying(true);
        // Reset hasEnded state when playback starts
        if (hasEnded) {
          setHasEnded(false);
        }
      }
    };

    const handlePause = () => {
      if (isMountedRef.current) setIsPlaying(false);
    };

    const handleEnded = () => {
      if (isMountedRef.current) {
        setIsPlaying(false);
        setProgress(0);
        setHasEnded(true);
        console.log('Audio playback ended, showing repeat button');
      }
    };

    const handleTimeUpdate = () => {
      updateProgress();
    };

    const handleVolumeChange = () => {
      if (isMountedRef.current && audio) {
        setIsMuted(audio.volume === 0);
        setVolume(audio.volume);
      }
    };

    const handleLoadedMetadata = () => {
      if (isMountedRef.current && audio) {
        // Only check duration if we don't already have it from JSON data or compression
        // This avoids redundant checks and state updates
        if (durationRef.current <= 0) {
          const audioDuration = audio.duration;
          if (!isNaN(audioDuration) && isFinite(audioDuration) && audioDuration > 0) {
            setDuration(audioDuration);
            durationRef.current = audioDuration;
            console.log('Using duration from audio element in effect handler:', audioDuration);

            // Check if duration exceeds the limit
            if (audioDuration > MAX_DURATION) {
              setError(`Audio exceeds the 4-minute limit (${Math.floor(audioDuration / 60)}:${Math.floor(audioDuration % 60).toString().padStart(2, '0')})`);
              setShowError(true);
              setTimeout(() => setShowError(false), 2000);
            }
          }
        }
      }
    };

    // Add event listeners
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('volumechange', handleVolumeChange);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('canplaythrough', handleCanPlayThrough);

    // Add error event listener for debugging
    const handleError = (e: Event) => {
      console.error('Audio element error:', (e.target as HTMLAudioElement).error);

      // If we're loading from Supabase and haven't exceeded max attempts, retry
      if (audioSrc?.includes('mindmap-audio') && loadAttemptsRef.current < maxLoadAttempts) {
        console.log(`Audio element error, will retry (${loadAttemptsRef.current + 1}/${maxLoadAttempts})`);
        // Use setTimeout to avoid immediate retry
        setTimeout(() => {
          if (isMountedRef.current) {
            retryLoadAudio();
          }
        }, 1000); // Wait 1 second before retrying
      }
    };
    audio.addEventListener('error', handleError);

    // Remove event listeners on cleanup
    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('volumechange', handleVolumeChange);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('canplaythrough', handleCanPlayThrough);
      audio.removeEventListener('error', handleError);

      // Ensure we pause the audio when unmounting to prevent memory leaks
      if (!audio.paused) {
        audio.pause();
      }
    };
  }, [audioSrc]); // Only re-run when audio source changes

  const handleContextMenu = (event: React.MouseEvent) => {
    if (onContextMenu) {
      onContextMenu(event, id);
    }
  };

  return (
    <div ref={nodeRef} className="group relative overflow-visible" style={{ width: '300px' }} onContextMenu={handleContextMenu}>
      <CollapseChevron 
        hasChildren={hasChildren}
        isCollapsed={isCollapsed}
        onToggleCollapse={onToggleCollapse || (() => {})}
      />
      {isAddingToPlaylist && (data.audioUrl || data.file) && (
        <div
          className="absolute inset-0 bg-green-500 bg-opacity-50 flex items-center justify-center rounded-lg z-20 cursor-pointer"
          onClick={handleOverlayClick}
        >
          {showCheckmark ? (
            <Check className="text-white w-12 h-12" />
          ) : (
            <PlusCircle className="text-white w-12 h-12" />
          )}
        </div>
      )}
      {/* Fixed width audio node without resize control */}
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={isConnectable}
        className="!top-[-8px] !bg-sky-400 !border-1 !border-gray-700 !w-3 !h-3"
        style={{ zIndex: 20 }}
      />
      <div className="p-0 m-0 font-size-0 line-height-0" style={{ pointerEvents: isAddingToPlaylist ? 'none' : 'auto' }}>
        {/* Initial empty state */}
        {!audioSrc && !showError && !isCompressing && !isLoading && (
          <div className="flex flex-col items-center justify-center h-[100px] text-gray-500 bg-gray-700/30 rounded-lg">
            <AudioWaveform className="w-6 h-6 mb-1 text-gray-400" />
            <span className="text-xs text-center">Add audio</span>
            <span className="text-[10px] text-center mt-0.5">(Max: 25MB, 4 min)</span>
          </div>
        )}

        {/* Loading state when no audio source yet */}
        {!audioSrc && isLoading && !isCompressing && (
          <div className="flex flex-col items-center justify-center h-[100px] text-gray-500 bg-gray-700/30 rounded-lg">
            <Loader className="w-5 h-5 text-blue-400 animate-spin mb-2" />
            <span className="text-xs text-center">Loading audio...</span>
          </div>
        )}
        {isCompressing && (
          <div className="flex flex-col items-center justify-center h-[100px] text-gray-500 bg-gray-700/30 rounded-lg p-4">
            <div className="flex items-center justify-center mb-2">
              <Loader className="w-5 h-5 text-blue-400 animate-spin mr-2" />
              <span className="text-sm text-gray-300">Processing audio...</span>
            </div>
            <div className="relative w-full h-2 bg-gray-600 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all duration-300 ease-out"
                style={{ width: `${compressionProgress}%` }}
              ></div>
            </div>
            <div className="flex justify-center w-full text-xs text-gray-400 mt-1">
              <span>{Math.round(compressionProgress)}%</span>
            </div>
          </div>
        )}
        {showError && (
          <div className="w-full transition-opacity duration-700 ease-in-out opacity-100">
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-1.5 text-red-500 text-xs text-center">
              {error}
            </div>
          </div>
        )}
        {audioSrc && !isCompressing && (
          <div className="bg-gray-800/50 rounded-lg p-3 min-w-[250px]">
            <div className="flex items-center mb-2">
              <AudioWaveform className="w-4 h-4 text-gray-400 mr-2" />
              <span className="text-sm text-gray-300 truncate">
                {data.label || 'Audio'}
              </span>
            </div>

            {/* Custom audio player without download option */}
            <div className="custom-audio-player rounded-md bg-gray-700/50 p-2">
              {/* Show loading animation while audio is being fetched */}
              {isLoading && (
                <div className="flex items-center justify-center py-4">
                  <Loader className="w-5 h-5 text-blue-400 animate-spin mr-2" />
                  <span className="text-sm text-gray-300">Loading audio...</span>
                </div>
              )}
              {/* Only create audio element when we have content to load and node is in view */}
              {shouldLoadContent && audioSrc && (
                <audio
                  ref={audioRef}
                  src={audioSrc}
                  preload={shouldLoadContent ? "auto" : "none"}
                  className="hidden" /* Hide the actual audio element */
                  onLoadStart={() => {
                    if (isMountedRef.current) setIsLoading(true);
                  }}
                  onLoadedData={() => {
                    if (isMountedRef.current) {
                      setIsLoading(false);
                      // Reset load attempts counter on successful load
                      loadAttemptsRef.current = 0;

                      // If we have a duration from compression, apply it to the audio element
                      if (durationRef.current > 0 && audioRef.current) {
                        // We can't directly set duration on HTMLMediaElement, but we can ensure
                        // our UI uses the correct duration from our state
                        setDuration(durationRef.current);
                      }
                    }
                  }}
                  onLoadedMetadata={() => {
                    if (isMountedRef.current && audioRef.current) {
                      // Reset load attempts counter on successful metadata load
                      loadAttemptsRef.current = 0;

                      // Only check duration if we don't already have it from JSON data or compression
                      // This avoids redundant checks and state updates
                      if (durationRef.current <= 0) {
                        // Try to get duration from the audio element
                        const audioDuration = audioRef.current.duration;
                        if (!isNaN(audioDuration) && isFinite(audioDuration) && audioDuration > 0) {
                          setDuration(audioDuration);
                          // Also store in our ref for consistency
                          durationRef.current = audioDuration;
                          console.log('Using duration from audio element:', audioDuration);

                          // Check if duration exceeds the limit
                          if (audioDuration > MAX_DURATION) {
                            setError(`Audio exceeds the 4-minute limit (${Math.floor(audioDuration / 60)}:${Math.floor(audioDuration % 60).toString().padStart(2, '0')})`);
                            setShowError(true);
                            setTimeout(() => setShowError(false), 2000);
                          }
                        }
                      }
                    }
                  }}
                  onError={(e) => {
                    if (isMountedRef.current) {
                      console.error('Audio loading error:', e);

                      // If we're loading from Supabase and haven't exceeded max attempts, retry
                      if (audioSrc?.includes('mindmap-audio') && loadAttemptsRef.current < maxLoadAttempts) {
                        console.log(`Audio load error, will retry (${loadAttemptsRef.current + 1}/${maxLoadAttempts})`);
                        // Use setTimeout to avoid immediate retry
                        setTimeout(() => {
                          if (isMountedRef.current) {
                            retryLoadAudio();
                          }
                        }, 1000); // Wait 1 second before retrying
                      } else {
                        setError('Error loading audio.');
                        setShowError(true);
                        setIsLoading(false);
                      }
                    }
                  }}
                />
              )}

              {/* Custom controls */}
              <div className="flex flex-col space-y-2">
                {/* Time display */}
                <div className="flex justify-between text-xs text-gray-400 px-1">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(durationRef.current > 0 ? durationRef.current : duration)}</span>
                </div>

                {/* Main controls row */}
                <div className="flex items-center justify-between">
                  <button
                    className="p-1.5 rounded-full text-white transition-colors hover:opacity-80"
                    style={{
                      backgroundColor: nodeBackground
                    }}
                    onClick={(e) => {
                      // Handle play/pause/repeat
                      if (audioRef.current) {
                        if (hasEnded) {
                          // Reset playback to beginning and play immediately
                          audioRef.current.currentTime = 0;
                          setHasEnded(false);
                          console.log('Replay button clicked, restarting playback');

                          // Immediately start playing and update UI state
                          setIsPlaying(true);

                          // Ensure the audio is fully loaded before playing
                          if (audioRef.current.readyState >= 2) { // HAVE_CURRENT_DATA or higher
                            audioRef.current.play().catch(err => {
                              console.error('Error playing audio:', err);
                              // If play fails, reset UI state
                              setIsPlaying(false);
                              // If play fails and we're using a Supabase URL, try to reload
                              if (audioSrc?.includes('mindmap-audio') && loadAttemptsRef.current < maxLoadAttempts) {
                                retryLoadAudio();
                              }
                            });
                          } else {
                            // If not ready, show loading and wait for canplay event
                            setIsLoading(true);
                            const canPlayHandler = () => {
                              if (isMountedRef.current && audioRef.current) {
                                setIsLoading(false);
                                audioRef.current.play().catch(err => {
                                  console.error('Error playing audio after canplay:', err);
                                  setIsPlaying(false);
                                });
                                audioRef.current.removeEventListener('canplay', canPlayHandler);
                              }
                            };
                            audioRef.current.addEventListener('canplay', canPlayHandler);
                          }
                        } else if (audioRef.current.paused) {
                          // Normal play from current position
                          // Ensure the audio is fully loaded before playing
                          if (audioRef.current.readyState >= 2) { // HAVE_CURRENT_DATA or higher
                            audioRef.current.play().catch(err => {
                              console.error('Error playing audio:', err);
                              // If play fails and we're using a Supabase URL, try to reload
                              if (audioSrc?.includes('mindmap-audio') && loadAttemptsRef.current < maxLoadAttempts) {
                                retryLoadAudio();
                              }
                            });
                          } else {
                            // If not ready, show loading and wait for canplay event
                            setIsLoading(true);
                            const canPlayHandler = () => {
                              if (isMountedRef.current && audioRef.current) {
                                setIsLoading(false);
                                audioRef.current.play().catch(console.error);
                                audioRef.current.removeEventListener('canplay', canPlayHandler);
                              }
                            };
                            audioRef.current.addEventListener('canplay', canPlayHandler);
                          }
                        } else {
                          audioRef.current.pause();
                        }
                      }
                      e.stopPropagation();
                    }}
                    aria-label={hasEnded ? 'Repeat' : (isPlaying ? 'Pause' : 'Play')}
                  >
                    {hasEnded ? (
                      // Rotate CCW (counterclockwise) icon from Lucide
                      <RotateCcw size={16} />
                    ) : !isPlaying ? (
                      // Play icon
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="5 3 19 12 5 21 5 3"></polygon>
                      </svg>
                    ) : (
                      // Pause icon
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="6" y="4" width="4" height="16"></rect>
                        <rect x="14" y="4" width="4" height="16"></rect>
                      </svg>
                    )}
                  </button>

                  {/* Audio visualizer or progress bar */}
                  {audioBlob ? (
                    <div
                      className="flex-1 mx-2 overflow-hidden cursor-pointer relative"
                      title={`Audio visualization (${audioBlob.type}, ${Math.round(audioBlob.size / 1024)} KB)`}
                      onClick={(e) => {
                        if (audioRef.current) {
                          // Calculate click position as percentage of the visualizer width
                          const rect = e.currentTarget.getBoundingClientRect();
                          const pos = (e.clientX - rect.left) / rect.width;

                          // Prioritize the duration from our ref (which is set from data.duration)
                          // This ensures we use the duration from the mindmap JSON data when available
                          const effectiveDuration = durationRef.current > 0
                            ? durationRef.current
                            : audioRef.current.duration || duration;

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
                        width={200}
                        height={24}
                        barWidth={2}
                        gap={1}
                        barColor={'rgba(75, 85, 99, 0.5)'}
                        barPlayedColor={nodeBackground}
                        currentTime={currentTime}
                        style={{
                          borderRadius: '4px',
                          width: '100%' // Make sure it fills the container
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
                          {formatTime(hoverPosition * (durationRef.current > 0 ? durationRef.current : duration))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div
                      className="flex-1 mx-2 h-2 rounded-full overflow-hidden cursor-pointer relative"
                      style={{
                        backgroundColor: 'rgba(75, 85, 99, 0.5)' // Gray background with transparency
                      }}
                      onClick={(e) => {
                        if (audioRef.current) {
                          // Calculate click position as percentage of the bar width
                          const rect = e.currentTarget.getBoundingClientRect();
                          const pos = (e.clientX - rect.left) / rect.width;

                          // Prioritize the duration from our ref (which is set from data.duration)
                          // This ensures we use the duration from the mindmap JSON data when available
                          const effectiveDuration = durationRef.current > 0
                            ? durationRef.current
                            : audioRef.current.duration || duration;

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
                        className="h-full"
                        style={{
                          width: `${progress}%`,
                          backgroundColor: nodeBackground
                        }}
                      ></div>

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
                          {formatTime(hoverPosition * (durationRef.current > 0 ? durationRef.current : duration))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Redesigned volume control - horizontal slider */}
                  <div
                    className="relative flex items-center"
                    onMouseEnter={() => setIsHoveringVolume(true)}
                    onMouseLeave={() => setIsHoveringVolume(false)}
                    ref={(el) => {
                      // Add non-passive wheel event listener to the element
                      if (el) {
                        const wheelHandler = (e: WheelEvent) => {
                          // When hovering over volume control, adjust volume instead of zooming
                          if (isHoveringVolume && audioRef.current) {
                            e.preventDefault();
                            e.stopPropagation();

                            // Implement debounce to prevent multiple rapid wheel events
                            const now = Date.now();
                            const DEBOUNCE_TIME = 80; // ms between allowed wheel events (reduced from 150ms)

                            // Only process wheel event if enough time has passed since the last one
                            if (now - lastVolumeWheelTimeRef.current > DEBOUNCE_TIME) {
                              // Get the direction of the scroll
                              const direction = e.deltaY > 0 ? -1 : 1; // -1 for down, 1 for up

                              // Force volume to be at a discrete 20% increment before calculating
                              const currentVolume = audioRef.current.volume;
                              const currentLevel = Math.round(currentVolume * 5);

                              // Calculate new level (0-5 scale), changing by exactly one step (20%)
                              const newLevel = Math.max(0, Math.min(5, currentLevel + direction));

                              // Convert back to volume scale (0-1)
                              const newVolume = newLevel / 5;

                              // Apply the new volume - use the exact calculated value
                              audioRef.current.volume = newVolume;
                              setVolume(newVolume);

                              // Update the last wheel time
                              lastVolumeWheelTimeRef.current = now;
                            }
                          }
                        };

                        // Remove any existing listener first to avoid duplicates
                        el.removeEventListener('wheel', wheelHandler);
                        // Add the event listener with passive: false to allow preventDefault
                        el.addEventListener('wheel', wheelHandler, { passive: false });
                      }
                    }}
                  >
                    {/* Volume slider container - vertical orientation */}
                    <div className="flex flex-col items-center mr-2 group h-6">
                      {/* Volume slider track */}
                      <div
                        className="relative w-1 h-full bg-gray-700 rounded-full cursor-pointer overflow-hidden"
                        onClick={(e) => {
                          // Calculate click position as percentage of the slider height (inverted)
                          const rect = e.currentTarget.getBoundingClientRect();
                          // Invert Y position (bottom = 1, top = 0)
                          const clickPosition = 1 - ((e.clientY - rect.top) / rect.height);

                          // Round to nearest 20% for consistency with wheel behavior
                          const level = Math.round(clickPosition * 5);
                          const newVolume = level / 5;

                          if (audioRef.current) {
                            audioRef.current.volume = newVolume;
                          }
                          setVolume(newVolume);
                          e.stopPropagation();
                        }}
                      >
                        {/* Volume level fill - fills from bottom to top */}
                        <div
                          className="absolute bottom-0 left-0 w-full transition-all duration-150"
                          style={{
                            // Round to nearest 20% for visual consistency
                            height: `${Math.round(volume * 5) * 20}%`,
                            backgroundColor: nodeBackground
                          }}
                        ></div>

                        {/* Volume slider handle */}
                        <div
                          className="absolute left-0 w-full aspect-square rounded-full bg-white transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{
                            // Round to nearest 20% for visual consistency
                            bottom: `${Math.round(volume * 5) * 20}%`
                          }}
                        ></div>
                      </div>
                    </div>

                    {/* Mute/unmute button */}
                    <button
                      onClick={() => {
                        if (audioRef.current) {
                          audioRef.current.volume = audioRef.current.volume > 0 ? 0 : volume || 1;
                        }
                      }}
                      className="p-1 text-gray-300 hover:text-white transition-colors"
                      aria-label={isMuted ? 'Unmute' : 'Mute'}
                    >
                      {isMuted ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                          <line x1="23" y1="9" x2="17" y2="15"></line>
                          <line x1="17" y1="9" x2="23" y2="15"></line>
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                          <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                          <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={isConnectable}
        className="!bottom-[-8px] !bg-sky-400 !border-1 !border-gray-700 !w-3 !h-3"
      />
    </div>
  );
}

export default AudioNode;