
import React from "react"
import { FileText } from "lucide-react"
import { Handle, Position, NodeProps } from "reactflow"

export const NoteMindNode = React.memo(({ data }: NodeProps) => {
  // Create a very opaque, dark, and pronounced gradient using the note color
  const color = data.color || '#334155';
  // Use a diagonal gradient: color (99% opacity) to a much darker version (85% opacity)
  function darken(hex: string, amount = 0.35) {
    let c = hex.replace('#', '');
    if (c.length === 3) c = c[0]+c[0]+c[1]+c[1]+c[2]+c[2];
    const num = parseInt(c, 16);
    let r = Math.max(0, ((num >> 16) & 0xff) * (1-amount));
    let g = Math.max(0, ((num >> 8) & 0xff) * (1-amount));
    let b = Math.max(0, (num & 0xff) * (1-amount));
    return `rgb(${r|0},${g|0},${b|0})`;
  }
  // Use a vibrant, mostly opaque note color background with a very subtle gradient for depth
  const gradientBg = `linear-gradient(135deg, ${color}FA 0%, ${color}F2 100%)`;
  // Icon background: even darker version of the note color
  const iconBg = data.color ? darken(data.color, 0.6) : '#1a202c';

  return (
    <div className="relative group">
       <div
         className="relative flex items-center gap-2.5 border border-slate-700/50 group-hover:border-blue-500/30 rounded-2xl p-2.5 min-w-[160px] max-w-[220px] transition-colors"
         style={{ background: gradientBg }}
       >
          <Handle type="target" position={Position.Top} id="top-target" className="!w-1 !h-1 !min-w-0 !min-h-0 !bg-transparent !border-none !top-0" />
          <Handle 
              type="source" 
              position={Position.Top} 
              id="top-source"
              className="!w-2 !h-2 !min-w-0 !min-h-0 !bg-transparent !border-none !top-0 z-50 cursor-crosshair" 
              style={{ background: 'transparent' }}
          />
          <div 
            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: iconBg }}
          >
            <FileText className="w-4 h-4" style={{ color: data.color || '#94a3b8' }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-slate-300 truncate group-hover:text-blue-200">{data.label}</div>
            <div className="text-[10px]" style={{ color: 'rgba(30, 41, 59, 0.85)' }}>{data.preview || "No content"}</div>
          </div>
       </div>
    </div>
  )
})
