
import React from "react"
import { FileText } from "lucide-react"
import { Handle, Position, NodeProps } from "reactflow"

export const NoteMindNode = React.memo(({ data }: NodeProps) => {
  return (
    <div className="relative group hover:z-10">
       <div className="absolute -inset-px bg-blue-500/20 rounded-2xl opacity-0 group-hover:opacity-100"></div>
       <div className="relative flex items-center gap-2.5 bg-[#1e293b] border border-slate-700/50 group-hover:border-blue-500/30 rounded-2xl p-2.5 min-w-[160px] max-w-[220px] shadow-lg hover:bg-[#1e293b]">
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
            style={{ backgroundColor: data.color ? `${data.color}15` : '#334155' }}
          >
            <FileText className="w-4 h-4" style={{ color: data.color || '#94a3b8' }} />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-slate-300 truncate group-hover:text-blue-200">{data.label}</div>
            <div className="text-[10px] text-slate-500 truncate">{data.preview || "No content"}</div>
          </div>
       </div>
    </div>
  )
})
