import { useState, useEffect, useRef, useCallback, memo, useMemo } from 'react';
import { Handle, Position } from 'reactflow';
import { createPortal } from 'react-dom';
import { Link as LinkIcon } from 'lucide-react';

// Cache for storing favicons with timestamp for cache invalidation
const faviconCache = new Map<string, { url: string; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Helper function to get cached favicon
const getCachedFavicon = (url: string): string | null => {
  const cached = faviconCache.get(url);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.url;
  }
  if (cached) {
    faviconCache.delete(url); // Remove expired cache
  }
  return null;
};

// Helper function to set cached favicon
const setCachedFavicon = (url: string, faviconUrl: string): void => {
  faviconCache.set(url, { url: faviconUrl, timestamp: Date.now() });
};

interface LinkNodeProps {
  data: {
    url: string;
    displayText?: string;
  };
  isConnectable: boolean;
}

// Memoized LinkNode component to prevent unnecessary re-renders
export const LinkNode = memo(function LinkNode({ data, isConnectable }: LinkNodeProps) {
  const [favicon, setFavicon] = useState<string | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [nodeWidth, setNodeWidth] = useState(60);

  const textRef = useRef<HTMLAnchorElement>(null);

  // Memoize the processed URL to avoid recalculating on every render
  const processedUrl = useMemo(() => {
    if (!data.url) return null;
    return data.url.startsWith('http') ? data.url : `http://${data.url}`;
  }, [data.url]);

  // Memoize display text
  const displayText = useMemo(() => {
    return data.displayText || (data.url === '' ? 'Link' : data.url);
  }, [data.displayText, data.url]);

  // Memoize click handler to prevent recreation on every render
  const handleNodeClick = useCallback((e: React.MouseEvent) => {
    // Let the browser handle the link naturally via href
    // Only prevent default if there's no valid URL
    if (!processedUrl) {
      e.preventDefault();
    }
  }, [processedUrl]);

  // Memoize tooltip handlers
  const handleMouseEnter = useCallback(() => setShowTooltip(true), []);
  const handleMouseLeave = useCallback(() => setShowTooltip(false), []);

  const updateWidth = useCallback(() => {
    if (textRef.current) {
      setNodeWidth(textRef.current.offsetWidth + 40);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadFavicon = async () => {
      if (!data.url) {
        setFavicon(null);
        return;
      }

      try {
        setIsLoading(true);
        setHasError(false);

        // Check cache first
        const cachedFavicon = getCachedFavicon(data.url);
        if (cachedFavicon) {
          setFavicon(cachedFavicon);
          setIsLoading(false);
          return;
        }

        // Parse URL safely
        const urlToUse = data.url.startsWith('http') ? data.url : `http://${data.url}`;
        const url = new URL(urlToUse);
        const faviconUrl = `https://www.google.com/s2/favicons?sz=32&domain=${url.origin}`;

        // Preload image
        const img = new Image();
        img.onload = () => {
          if (isMounted) {
            setCachedFavicon(data.url, faviconUrl);
            setFavicon(faviconUrl);
            setIsLoading(false);
          }
        };
        img.onerror = () => {
          if (isMounted) {
            setHasError(true);
            setIsLoading(false);
          }
        };
        img.src = faviconUrl;

      } catch (error) {
        if (isMounted) {
          setHasError(true);
          setIsLoading(false);
          setFavicon(null);
        }
      }
    };

    loadFavicon();

    return () => {
      isMounted = false;
    };
  }, [data.url]);

  useEffect(() => {
    const handleResize = () => {
      updateWidth();
    };

    window.addEventListener('resize', handleResize);
    updateWidth();
    return () => window.removeEventListener('resize', handleResize);
  }, [updateWidth]);

  useEffect(() => {
    updateWidth();
  }, [data.url, data.displayText, updateWidth]);

  // Memoize the icon component to avoid recreation
  const iconComponent = useMemo(() => {
    if (isLoading) {
      return <div className="w-4 h-4 rounded-full border-2 border-gray-400 border-t-transparent animate-spin" />;
    }
    if (hasError) {
      return <LinkIcon className="w-4 h-4 text-gray-400" />;
    }
    if (favicon) {
      return <img src={favicon} alt="favicon" className="w-4 h-4" loading="lazy" />;
    }
    return <LinkIcon className="w-4 h-4 text-gray-400" />;
  }, [isLoading, hasError, favicon]);

  // Memoize tooltip position calculation
  const tooltipStyle = useMemo(() => {
    if (!showTooltip || !textRef.current) return {};
    const rect = textRef.current.getBoundingClientRect();
    return {
      zIndex: 9999,
      left: rect.left + (rect.width / 2),
      top: rect.bottom + 8,
      transform: 'translateX(-50%)'
    };
  }, [showTooltip]);

  return (
    <div 
      className="relative bg-gray-900/75 rounded-lg p-3 border-2 border-gray-700 hover:border-gray-600 transition-colors cursor-pointer flex items-center"
      style={{ minWidth: nodeWidth, transition: 'min-width 0.2s ease-in-out' }}
    >
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={isConnectable}
        className="!top-[-16px]"
      />
      <div className="flex items-center">
        {iconComponent}
        <a
          ref={textRef}
          href={processedUrl || '#'}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleNodeClick}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className={`ml-2 ${data.url === '' ? 'text-gray-400' : 'text-white'} cursor-pointer no-underline hover:no-underline`}
        >
          {displayText}
        </a>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={isConnectable}
        className="!bottom-[-16px]"
      />
      {showTooltip && data.displayText && createPortal(
        <div 
          className="fixed bg-gray-800 text-white text-sm p-2 rounded shadow-lg" 
          style={tooltipStyle}
        >
          {data.url}
        </div>,
        document.body
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for memo optimization
  return (
    prevProps.isConnectable === nextProps.isConnectable &&
    prevProps.data.url === nextProps.data.url &&
    prevProps.data.displayText === nextProps.data.displayText
  );
});