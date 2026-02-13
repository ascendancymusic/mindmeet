import { Node, Edge, Connection } from "reactflow"
import { DrawingData } from "../components/DrawingCanvas"

export interface HistoryAction {
  type: 
    | "add_node" 
    | "move_node" 
    | "connect_nodes" 
    | "disconnect_nodes" 
    | "delete_node" 
    | "update_node" 
    | "update_title" 
    | "resize_node" 
    | "change_edge_type" 
    | "change_background_color" 
    | "change_dot_color" 
    | "drawing_change" 
    | "move_stroke" 
    | "update_customization" 
    | "update_edge"

  timestamp?: string
  data: {
    nodes?: Node[]
    edges?: Edge[]
    nodeId?: string
    edgeId?: string
    position?: { x: number; y: number } | Record<string, { x: number; y: number }>
    connection?: Connection
    label?: string
    width?: number
    height?: number

    videoUrl?: string
    spotifyUrl?: string
    displayText?: string
    color?: string
    affectedNodes?: string[]
    edgeType?: 'default' | 'straight' | 'smoothstep'
    backgroundColor?: string
    dotColor?: string
    replacedEdgeId?: string
    drawingData?: DrawingData
    strokeId?: string
    trackIds?: string[]
    fontFamily?: string
  }
  previousState?: {
    nodes: Node[]
    edges: Edge[]
    title?: string
    edgeType?: 'default' | 'straight' | 'smoothstep'
    backgroundColor?: string
    dotColor?: string
    drawingData?: DrawingData
    fontFamily?: string
  }
}
