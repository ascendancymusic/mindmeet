import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Handle, Position, NodeResizeControl, useReactFlow } from 'reactflow';
import { ImageIcon } from 'lucide-react';
import { compressImage } from '../utils/compressImage';
import { getNodeWidth, getNodeHeight } from '../utils/nodeUtils';

interface ImageNodeProps {
  id: string;
  data: {
    label: string;
    file?: File;
    imageUrl?: string;
  };
  isConnectable: boolean;
  width?: number;
  height?: number;
  selected?: boolean; // added to mirror TextNode behavior for showing resize handle only when selected
}

// Match TextNode's minimal corner resize icon
const ResizeIcon = () => (
  <svg width="8" height="8" viewBox="0 0 8 8" className="text-slate-400 hover:text-slate-300 transition-colors">
    <path
      d="M1 1L1 4M1 1L4 1M1 1L7 7M7 7L4 7M7 7L7 4"
      stroke="currentColor"
      strokeWidth="1"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export function ImageNode({ id, data, isConnectable, width, height, selected }: ImageNodeProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showError, setShowError] = useState(false);
  const processedFileRef = useRef<File | null>(null);
  const processedUrlRef = useRef<string | null>(null);
  const reactFlowInstance = useReactFlow();
  const initialSizeRef = useRef<{ width: number; height: number } | null>(null);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);
  const captionRef = useRef<HTMLDivElement | null>(null);
  const [captionHeight, setCaptionHeight] = useState(0);

  // Get the actual node to access its style/background
  const node = reactFlowInstance.getNode(id);
  const nodeBackground = (node?.style?.background as string) || 
                        (node?.style?.backgroundColor as string) || 
                        (node as any)?.background ||
                        '#374151';

  const loadImage = useCallback(() => {
    // If we have a file, prioritize it over imageUrl (for local preview before saving)
    if (data.file) {
      // If file already processed and we're showing its image, do nothing
      if (data.file === processedFileRef.current && imageSrc && !imageSrc.startsWith('http')) {
        return;
      }

      // Process the new file
      processedFileRef.current = null;
      processedUrlRef.current = null;
    } else if (data.imageUrl) {
      // If no file but imageUrl exists, use the imageUrl
      // Check if we've already processed this exact URL and it's currently displayed
      if (processedUrlRef.current === data.imageUrl && imageSrc === data.imageUrl && imageSrc) {
        return;
      }

      setImageSrc(data.imageUrl);
      setIsLoading(true);
      setError(null);
      processedUrlRef.current = data.imageUrl;
      return;
    } else {
      // No file and no imageUrl
      return;
    }

    // Check file size limit
    if (data.file.size > 3 * 1024 * 1024) {
      setError('Image exceeds the 3MB limit');
      setShowError(true);
      setTimeout(() => setShowError(false), 2000);
      return;
    }

    // Compress the new file
    setIsLoading(true);
    compressImage(data.file)
      .then(({ compressedFile }) => {
        const objectUrl = URL.createObjectURL(compressedFile);
        setImageSrc(objectUrl);
        setError(null);
        if (data.file) processedFileRef.current = data.file;
      })
      .catch((err) => {
        console.error('Error compressing image:', err);
        setError('Error processing image.');
        setShowError(true);
      })
      .finally(() => setIsLoading(false));
  }, [data.file, data.imageUrl]);

  const handleImageLoad = useMemo(() => (e: React.SyntheticEvent<HTMLImageElement>) => {
    setIsLoading(false);

    // Get natural dimensions of the loaded image
    const img = e.target as HTMLImageElement;
    const naturalWidth = img.naturalWidth;
    const naturalHeight = img.naturalHeight;

    // Set a reasonable max size while maintaining aspect ratio
    const maxWidth = 300;
    const maxHeight = 300;

    let calculatedWidth = naturalWidth;
    let calculatedHeight = naturalHeight;

    // Scale down if needed while maintaining aspect ratio
    if (calculatedWidth > maxWidth) {
      calculatedHeight = (calculatedHeight * maxWidth) / calculatedWidth;
      calculatedWidth = maxWidth;
    }

    if (calculatedHeight > maxHeight) {
      calculatedWidth = (calculatedWidth * maxHeight) / calculatedHeight;
      calculatedHeight = maxHeight;
    }

    // Check if this is a new upload (file exists) or if dimensions have changed
    const isNewUpload = !!data.file;
    const dimensionsChanged = !imageDimensions ||
      imageDimensions.width !== calculatedWidth ||
      imageDimensions.height !== calculatedHeight;

    // For new uploads or when dimensions change, update the node
    if (isNewUpload || dimensionsChanged) {
      setImageDimensions({ width: calculatedWidth, height: calculatedHeight });

      // Dispatch event to update node dimensions
      const customEvent = new CustomEvent('image-node-dimensions-set', {
        detail: {
          nodeId: id,
          width: Math.round(calculatedWidth),
          height: Math.round(calculatedHeight),
          isNewUpload
        },
        bubbles: true
      });
      document.dispatchEvent(customEvent);
    } else if (typeof width === 'number' && typeof height === 'number') {
      // Use existing dimensions from props
      setImageDimensions({ width, height });
    }
  }, [data.file, imageDimensions, id, width, height]);

  const handleImageError = useCallback(() => {
    setError('Error loading image.');
    setShowError(true);
    setIsLoading(false);
  }, []);

  // Reset state when node data changes significantly
  useEffect(() => {
    // If we have imageUrl but no current imageSrc, or if imageUrl changed
    if (data.imageUrl && (!imageSrc || (imageSrc !== data.imageUrl && processedUrlRef.current !== data.imageUrl))) {
      setImageSrc(null);
      processedUrlRef.current = null;
      processedFileRef.current = null;
    }
  }, [data.imageUrl, imageSrc]);

  useEffect(() => {
    // Only call loadImage if we actually have new data to process
    if (data.file || data.imageUrl) {
      loadImage();
    }
    // Observe caption height changes to position resize control precisely at image bottom edge
    const el = captionRef.current;
    if (el) {
      const update = () => setCaptionHeight(el.getBoundingClientRect().height);
      update();
      const ro = new ResizeObserver(update);
      ro.observe(el);
      return () => ro.disconnect();
    }
    return () => {
      // Cleanup object URL only if it was created from a file and no imageUrl exists
      if (imageSrc && !imageSrc.includes('mindmap-images') && data.file && !data.imageUrl) {
        // Only revoke if it's a local object URL (not a Supabase URL)
        URL.revokeObjectURL(imageSrc);
      }
    };
  }, [loadImage, data.file, data.imageUrl]);

  return (
    <div className={"relative overflow-visible no-node-overlay"}>
      {/* Show resize control only when image is present AND node is selected (parity with TextNode) */}
  {imageSrc && selected && (
    // We position the resize control so the visible grip sits just inside the bottom-right corner
        <NodeResizeControl
          nodeId={id}
          minWidth={100}
          minHeight={50}
          maxWidth={400}
          maxHeight={300}
          style={{
            background: 'transparent',
            border: 'none',
            borderRadius: '4px',
            padding: 0,
            margin: 0,
            position: 'absolute',
            right: 0,
      // Dynamically offset by caption height; then we nudge inward with a transform so it feels attached.
      bottom: data.label ? captionHeight : 0,
      transform: 'translate(-8px, -8px)',
            zIndex: 10,
          }}
          keepAspectRatio={true}
          onResizeStart={() => {
            // Store the initial size when resize starts
            const node = reactFlowInstance.getNode(id);
            if (node) {
              const width = getNodeWidth(node, 100);
              const height = getNodeHeight(node, 100);
              initialSizeRef.current = {
                width: typeof width === 'string' ? parseFloat(width) : width,
                height: typeof height === 'string' ? parseFloat(height) : height
              };
            }
          }}
          onResize={() => {
            // This is called during resize, but we don't need to do anything here
            // as ReactFlow handles the actual resizing
          }}
          onResizeEnd={(_event, params) => {
            // When resize ends, dispatch a custom event to track in history
            if (initialSizeRef.current) {
              // Only add to history if size actually changed
              if (initialSizeRef.current.width !== params.width || initialSizeRef.current.height !== params.height) {
                // Create a custom event with resize data
                const customEvent = new CustomEvent('image-node-resized', {
                  detail: {
                    nodeId: id,
                    previousWidth: initialSizeRef.current.width,
                    previousHeight: initialSizeRef.current.height,
                    width: params.width,
                    height: params.height
                  },
                  bubbles: true
                });
                // Dispatch the event from the node element
                document.dispatchEvent(customEvent);
              }
              initialSizeRef.current = null;
            }
          }}
        >
          <div className="p-1 rounded-bl-lg cursor-se-resize hover:bg-slate-800/40 transition-colors">
            <ResizeIcon />
          </div>
        </NodeResizeControl>
      )}
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={isConnectable}
        className="!top-[-4px] !bg-sky-400 !border-1 !border-gray-700 !w-2.5 !h-2.5"
        style={{ zIndex: 20 }}
      />
      <div className="p-0 m-0 font-size-0 line-height-0">
        {!imageSrc && !showError && (
          <div className="flex flex-col items-center justify-center w-[120px] h-[120px] text-gray-500 bg-gray-700/30 rounded-lg">
            <ImageIcon className="w-6 h-6 mb-1 text-gray-400" />
            <span className="text-xs text-center">        Add image        </span>
            <span className="text-[10px] text-center mt-0.5">(Max: 3MB)</span>
          </div>
        )}
        {showError && (
          <div className="w-full transition-opacity duration-700 ease-in-out opacity-100">
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-1.5 text-red-500 text-xs text-center">
              {error}
            </div>
          </div>
        )}
        {imageSrc && (
          <div className="relative">
            <img
              key={imageSrc}
              src={imageSrc}
              alt={data.label || 'Node image'}
              onLoad={handleImageLoad}
              onError={handleImageError}
              className={`w-full h-auto object-contain ${data.label ? 'rounded-t-[14px]' : 'rounded-[14px]'} transition-opacity duration-700 ease-in-out imagenode-image-content ${
                !isLoading ? 'opacity-100' : 'opacity-0'
              }`}
              style={{
                filter: !isLoading ? 'blur(0)' : 'blur(5px)',
                maxWidth: '800px',
                maxHeight: '600px',
                display: 'block',
              }}
            />
            
            {/* Title Section */}
            {data.label && (
              <div
                ref={captionRef}
                className="image-node-title-extension border-t border-slate-600/30 rounded-b-[14px] px-3 py-2 text-center border-l border-r border-b"
                style={{
                  backgroundColor: nodeBackground,
                  borderColor: (node?.style?.borderColor as string) || 'rgb(71 85 105 / 0.6)',
                }}
              >
                <span className="text-white text-sm font-medium break-words">
                  {data.label}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={isConnectable}
        className="!bottom-[-4px] !bg-sky-400 !border-1 !border-gray-700 !w-2.5 !h-2.5"
        style={{ zIndex: 20 }}
      />
    </div>
  );
}

export default ImageNode;