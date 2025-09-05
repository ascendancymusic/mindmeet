import { useEffect, useRef } from 'react';
import { Handle, Position } from 'reactflow';
import { Instagram, Twitter, Facebook, Youtube } from 'lucide-react';
import CollapseChevron from './CollapseChevron';

// Custom TikTok Icon
const TikTok = ({ className }: { className: string }) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    fill="currentColor"
  >
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
  </svg>
);

const icons = {
  instagram: () => <Instagram className="w-4 h-4 text-pink-500" />,
  twitter: () => <Twitter className="w-4 h-4 text-blue-400" />,
  facebook: () => <Facebook className="w-4 h-4 text-blue-700" />,
  youtube: () => <Youtube className="w-4 h-4 text-red-600" />,
  tiktok: () => <TikTok className="w-4 h-4 text-white" />,
  mindmeet: () => <img src="/logo.svg" alt="MindMeet" className="w-4 h-4" />,
  default: () => <span className="w-4 h-4 text-gray-500">?</span>, // Fallback icon
};

const socialMediaUrls = {
  instagram: (username: string) => `https://instagram.com/${username}`,
  twitter: (username: string) => `https://twitter.com/${username}`,
  facebook: (username: string) => `https://facebook.com/${username}`,
  youtube: (username: string) => `https://youtube.com/@${username}`,
  tiktok: (username: string) => `https://tiktok.com/@${username}`,
  mindmeet: (username: string) => `${window.location.origin}/${username}`,
};

const hoverTextColors = {
  instagram: 'hover:text-pink-500',
  twitter: 'hover:text-blue-400',
  facebook: 'hover:text-blue-700',
  youtube: 'hover:text-red-600',
  tiktok: 'hover:text-black',
  mindmeet: 'hover:text-blue-400',
};

export function SocialMediaNode(props: any) {
  const { data, isConnectable, type: nodeType, onContextMenu, id } = props;
  const textRef = useRef<HTMLSpanElement>(null);
  const { username = "" } = data || {};

  // Extract collapse data
  const hasChildren = data?.hasChildren || false;
  const isCollapsed = data?.isCollapsed || false;
  const onToggleCollapse = data?.onToggleCollapse;

  // Get the type from ReactFlow's node type prop
  const type = nodeType as 'instagram' | 'twitter' | 'facebook' | 'youtube' | 'tiktok' | 'mindmeet';

  useEffect(() => {
    if (textRef.current) {
      const parentNode = textRef.current.closest(".react-flow__node");
      if (parentNode) {
        const calculatedWidth = Math.ceil(textRef.current.offsetWidth + 75); // Add padding and adjust for overflow
        (parentNode as HTMLElement).style.width = `${calculatedWidth}px`;
      }
    }
  }, [username]);

  const url = username && username !== "username" ? socialMediaUrls[type]?.(username) : undefined;

  const handleContextMenu = (event: React.MouseEvent) => {
    if (onContextMenu && id) {
      onContextMenu(event, id);
    }
  };

  return (
    <div
      className="group relative bg-gray-900/75 rounded-lg py-3.5 px-3 border-2 border-gray-700 transition-colors flex items-center"
      style={{ wordWrap: "break-word", whiteSpace: "normal" }} // Ensure text wraps properly
      onContextMenu={handleContextMenu}
    >
      <CollapseChevron 
        hasChildren={hasChildren}
        isCollapsed={isCollapsed}
        onToggleCollapse={onToggleCollapse || (() => {})}
      />
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={isConnectable}
        className="!top-[-16px]"
      />
      <div className="flex items-center">
        {(icons[type] || icons.default)()}
        {url ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-2 cursor-pointer"
          >
            <span
              ref={textRef}
              className={`${username === "" ? "text-gray-400" : "text-white"} ${hoverTextColors[type] || ""
                } transition-colors duration-200`}
              title={username !== "username" ? username : undefined}
            >
              {username === "" ? "username" : username}
            </span>
          </a>
        ) : (
          <span
            ref={textRef}
            className={`ml-2 ${username === "" ? "text-gray-400" : "text-white"} transition-colors duration-200`}
            title={username !== "username" ? username : undefined}
          >
            {username === "" ? "username" : username}
          </span>
        )}
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={isConnectable}
        className="!bottom-[-16px]"
      />
    </div>
  );
}
