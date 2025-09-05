import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface CollapseChevronProps {
  hasChildren: boolean;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const CollapseChevron: React.FC<CollapseChevronProps> = ({
  hasChildren,
  isCollapsed,
  onToggleCollapse
}) => {
  // Don't render anything if the node has no children
  if (!hasChildren) {
    return null;
  }

  return (
    <button
      className={`absolute -top-2 -right-2 p-1 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 border border-slate-600/50 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 backdrop-blur-sm z-30 ${
        isCollapsed 
          ? 'opacity-100 ring-2 ring-blue-400/30' // Always visible when collapsed with accent ring
          : 'opacity-0 group-hover:opacity-100' // Hover-only when expanded
      }`}
      onClick={(e) => {
        e.stopPropagation();
        onToggleCollapse();
      }}
      title={isCollapsed ? "Expand" : "Collapse"}
    >
      {isCollapsed ? (
        <ChevronRight className="w-3 h-3 text-slate-200" />
      ) : (
        <ChevronDown className="w-3 h-3 text-slate-200" />
      )}
    </button>
  );
};

export default CollapseChevron;
