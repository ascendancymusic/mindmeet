
import React from "react"
import { Folder, FolderOpen } from "lucide-react"
import { Handle, Position, NodeProps } from "reactflow"

// Optimized node types to prevent drag lag (removed conflicting transitions)
export const FolderMindNode = React.memo(({ data }: NodeProps) => {
  // Use the folder color as the base, overlay with a much darker version (no transparency)
  const color = data.color || '#334155';
  // Make the whole background very dark, blending the folder color with a strong dark overlay
  const overlay = 'rgba(20,24,36,0.92)';
  const bg = `linear-gradient(135deg, ${color} 0%, ${color} 100%), ${overlay}`;
  return (
    <div className="relative group">
      <div
        className="relative flex items-center gap-3 border group-hover:border-blue-400/30 rounded-2xl p-3 min-w-[180px] max-w-[260px] transition-colors"
        style={{
          borderColor: color,
          background: bg,
          backgroundBlendMode: 'multiply',
        }}
      >
        <Handle type="target" position={Position.Top} id="top-target" className="!w-1 !h-1 !min-w-0 !min-h-0 !bg-transparent !border-none !top-0" />
        {/* Add source handle to top to allow dragging from top to create parent folder */}
        <Handle 
           type="source" 
           position={Position.Top} 
           id="top-source"
           className="!w-2 !h-2 !min-w-0 !min-h-0 !bg-transparent !border-none !top-0 z-50 cursor-crosshair" 
           style={{ background: 'transparent' }}
        />
        <div 
          className="w-10 h-10 rounded-xl flex items-center justify-center border border-white/5" 
          style={{ 
            backgroundColor: data.color ? `${data.color}15` : '#1e293b',
            borderColor: data.color ? `${data.color}30` : 'rgba(255,255,255,0.05)'
          }}
        >
          {data.collapsed ? (
            <Folder className="w-5 h-5" style={{ color: data.color || '#64748b' }} />
          ) : (
            <FolderOpen className="w-5 h-5" style={{ color: data.color || '#64748b' }} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-slate-200 truncate">{data.label}</div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">{data.count || 0} ITEMS</span>
            {data.collapsed && <span className="w-1.5 h-1.5 rounded-full bg-blue-500/50" />}
          </div>
        </div>
        {/* Both source and target handles at bottom to allow connecting TO folder (as parent) and FROM folder (to child) */}
        <Handle 
           type="source" 
           position={Position.Bottom} 
           id="bottom-source"
           className="!w-2 !h-2 !min-w-0 !min-h-0 !bg-transparent !border-none !bottom-0 z-50 cursor-crosshair" 
           style={{ background: 'transparent' }}
        />
        <Handle 
           type="target" 
           position={Position.Bottom} 
           id="bottom-target"
           className="!w-2 !h-2 !min-w-0 !min-h-0 !bg-transparent !border-none !bottom-0 z-40" 
           style={{ background: 'transparent' }}
        />
      </div>
    </div>
  )
})
