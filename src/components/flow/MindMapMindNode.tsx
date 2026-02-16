import React from "react"
import { Link as RouterLink } from "react-router-dom"
import { Network, Globe, Lock, Link } from "lucide-react"
import { Handle, Position, NodeProps } from "reactflow"
import { useAuthStore } from "../../store/authStore"
import { useMindMapStore } from "../../store/mindMapStore"

export const MindMapMindNode = React.memo(({ data, id }: NodeProps) => {
  const { user } = useAuthStore()
  const { maps } = useMindMapStore()
  
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
    <div className="relative group hover:z-10">
       <div className="absolute -inset-px bg-purple-500/20 rounded-2xl opacity-0 group-hover:opacity-100"></div>
       
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
       <div className="relative bg-[#1e293b] border border-slate-700/50 group-hover:border-purple-500/30 rounded-2xl shadow-lg pointer-events-none min-w-[160px] max-w-[220px]">
         <RouterLink
           to={targetPath}
           className="flex items-center gap-2.5 p-2.5 no-underline pointer-events-auto"
           onClick={(e) => e.stopPropagation()}
         >
           <div 
             className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
             style={{ backgroundColor: data.color ? `${data.color}15` : '#334155' }}
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
             <div className="text-[10px] text-slate-500 truncate">Mind Map</div>
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
