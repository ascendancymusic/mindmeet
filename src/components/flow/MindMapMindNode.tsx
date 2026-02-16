import React from "react"
import { Link as RouterLink } from "react-router-dom"
import { Network, Globe, Lock, Link } from "lucide-react"
import { Handle, Position, NodeProps } from "reactflow"
import { useAuthStore } from "../../store/authStore"
import { useMindMapStore } from "../../store/mindMapStore"

export const MindMapMindNode = React.memo(({ data, id }: NodeProps) => {
  const { user } = useAuthStore()
  const { maps } = useMindMapStore()

  // Use the color from the mindmaps table (data.color), fallback to default grey
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
  // Use a vibrant, mostly opaque mindmap color background with a very subtle gradient for depth
  const gradientBg = `linear-gradient(135deg, ${color}FA 0%, ${color}F2 100%)`;
  // Icon background: even darker version of the mindmap color
  const iconBg = data.color ? darken(data.color, 0.6) : '#1a202c';
  
  const getVisibilityIcon = () => {
    const visibility = data.visibility || 'private'
    const iconClass = "w-2.5 h-2.5"
    
    switch (visibility) {
      case 'public':
        return <Globe className={iconClass} />
      case 'linkOnly':
        return <Link className={iconClass} />
      default:
        return <Lock className={iconClass} />
    }
  }

  // Find the map to get its permalink
  const map = maps.find(m => m.id === id || m.permalink === id)
  const permalink = map?.permalink || id
  const targetPath = user?.username ? `/${user.username}/${permalink}/edit` : '#'

  return (
    <div className="relative group">
       {/* Handles positioned outside the link to avoid event conflicts */}
       <Handle type="target" position={Position.Top} id="top-target" className="!w-1 !h-1 !min-w-0 !min-h-0 !bg-transparent !border-none !top-0" />
       <Handle 
          type="source" 
          position={Position.Top} 
          id="top-source"
          className="!w-2 !h-2 !min-w-0 !min-h-0 !bg-transparent !border-none !top-0 z-50 cursor-crosshair" 
          style={{ background: 'transparent' }}
       />
       {/* Content wrapper - only this part is clickable */}
       <div
         className="relative flex items-center gap-2.5 border border-slate-700/50 group-hover:border-purple-500/30 rounded-2xl p-2.5 min-w-[160px] max-w-[220px] transition-colors pointer-events-none"
         style={{ background: gradientBg }}
       >
         <RouterLink
           to={targetPath}
           className="flex items-center gap-2.5 no-underline pointer-events-auto"
           onClick={(e) => e.stopPropagation()}
         >
           <div 
             className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
             style={{ backgroundColor: iconBg }}
           >
             <Network className="w-4 h-4" style={{ color: data.color || '#94a3b8' }} />
           </div>
           <div className="flex-1 min-w-0">
             <div className="flex items-center gap-1.5">
               <div className="text-xs font-semibold text-slate-300 truncate group-hover:text-purple-200">{data.label}</div>
               <div className="text-slate-500 shrink-0 opacity-60">
                 {getVisibilityIcon()}
               </div>
             </div>
             <div className="text-[10px] text-slate-500 truncate">Mindmap</div>
           </div>
         </RouterLink>
       </div>
       {/* Bottom handles for connections */}
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
  )
})
