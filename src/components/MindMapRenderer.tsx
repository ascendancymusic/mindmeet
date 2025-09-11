import React, { useRef, useEffect, useCallback } from 'react';
import ReactFlow, { ReactFlowInstance, NodeTypes, Background } from 'reactflow';
import 'reactflow/dist/style.css';
import { prepareNodesForRendering } from '../utils/reactFlowUtils';
import { processNodesForTextRendering } from '../utils/textNodeUtils';
import { nodeTypes } from '../config/nodeTypes';
import DrawingPreview from './DrawingPreview';
import { decompressDrawingData } from '../utils/drawingDataCompression';
import { DrawingData } from './DrawingCanvas';

interface CustomBackgroundProps {
  backgroundColor?: string;
}

const CustomBackground: React.FC<CustomBackgroundProps> = ({ backgroundColor }) => {
  if (backgroundColor) {
    return (
      <>
        {/* Base background color */}
        <div className="absolute inset-0 rounded-lg" style={{ backgroundColor, zIndex: -2 }} />
        {/* Subtle gradient overlay for better visual appeal */}
        <div
          className="absolute inset-0 bg-gradient-to-br from-black/10 via-transparent to-black/20 rounded-lg"
          style={{ zIndex: -1 }}
        />
      </>
    );
  }

  // Default gradient when no custom background
  return (
    <div
      className="absolute inset-0 bg-gradient-to-br from-slate-900/60 via-slate-800/40 to-slate-900/60 rounded-lg backdrop-blur-sm"
      style={{ zIndex: -1 }}
    />
  );
};

interface MindMapData {
  nodes: any[];
  edges: any[];
  backgroundColor?: string;
  fontFamily?: string;
  edgeType?: 'default' | 'straight' | 'smoothstep';
}

interface MindMapRendererProps {
  /** The mindmap data containing nodes, edges, and styling */
  mindMapData: MindMapData;
  /** Compressed drawing data from database */
  drawingData?: string | DrawingData;
  /** Whether the mindmap is interactive (draggable, connectable, etc.) */
  interactive?: boolean;
  /** Whether zooming is enabled */
  zoomable?: boolean;
  /** Whether panning is enabled */
  pannable?: boolean;
  /** Whether double-click to zoom is enabled */
  doubleClickZoom?: boolean;
  /** Whether elements can be selected */
  selectable?: boolean;
  /** Custom className for the container */
  className?: string;
  /** Minimum zoom level */
  minZoom?: number;
  /** Maximum zoom level */
  maxZoom?: number;
  /** Whether to fit view on mount */
  fitView?: boolean;
  /** Whether scrolling is prevented (useful for small screens) */
  preventScrolling?: boolean;
  /** Callback when ReactFlow instance is initialized */
  onInit?: (instance: ReactFlowInstance) => void;
  /** Custom node types (falls back to default nodeTypes) */
  customNodeTypes?: NodeTypes;
}

/**
 * MindMapRenderer - A reusable component for rendering mindmaps with ReactFlow
 * 
 * Features:
 * - Handles node and edge processing
 * - Supports custom backgrounds and drawing overlays
 * - Configurable interaction modes (preview vs editing)
 * - Consistent styling and behavior across the app
 */
const MindMapRenderer: React.FC<MindMapRendererProps> = ({
  mindMapData,
  drawingData,
  interactive = false,
  zoomable = true,
  pannable = true,
  doubleClickZoom = false,
  selectable = false,
  className = '',
  minZoom = 0.1,
  maxZoom = 2,
  fitView = true,
  preventScrolling = false,
  onInit,
  customNodeTypes,
}) => {
  const instanceRef = useRef<ReactFlowInstance | null>(null);
  const [processedDrawingData, setProcessedDrawingData] = React.useState<DrawingData | null>(null);

  // Process drawing data
  useEffect(() => {
    if (drawingData) {
      if (typeof drawingData === 'string') {
        // Decompress if it's a string from database
        const decompressed = decompressDrawingData(drawingData);
        setProcessedDrawingData(decompressed || null);
      } else {
        // Already processed DrawingData object
        setProcessedDrawingData(drawingData);
      }
    } else {
      setProcessedDrawingData(null);
    }
  }, [drawingData]);

  // Handle ReactFlow initialization
  const handleInit = useCallback((instance: ReactFlowInstance) => {
    instanceRef.current = instance;
    if (onInit) {
      onInit(instance);
    }
  }, [onInit]);

  // Process nodes for rendering
  const processedNodes = React.useMemo(() => {
    if (!mindMapData.nodes?.length) return [];
    return processNodesForTextRendering(prepareNodesForRendering(mindMapData.nodes));
  }, [mindMapData.nodes]);

  // Process edges for rendering
  const processedEdges = React.useMemo(() => {
    if (!mindMapData.edges?.length) return [];
    
    return mindMapData.edges.map((edge: any) => {
      // Find the source node to get its color
      const sourceNode = mindMapData.nodes.find((node: any) => node.id === edge.source);
      const sourceNodeColor = sourceNode
        ? (sourceNode.background || sourceNode.style?.background || '#374151')
        : '#374151';

      // Get edgeType from mindmap data, default to 'default' if not valid
      const edgeType = ['default', 'straight', 'smoothstep'].includes(mindMapData.edgeType || '')
        ? mindMapData.edgeType
        : 'default';

      return {
        ...edge,
        type: edgeType === 'default' ? 'default' : edgeType,
        style: {
          ...edge.style,
          strokeWidth: 2,
          stroke: sourceNodeColor,
        },
      };
    });
  }, [mindMapData.edges, mindMapData.nodes, mindMapData.edgeType]);

  // Use custom node types or fall back to default
  const memoizedNodeTypes = React.useMemo(() => {
    return customNodeTypes || (nodeTypes as unknown as NodeTypes);
  }, [customNodeTypes]);

  // Don't render if no nodes
  if (!processedNodes.length) {
    return (
      <div className={`h-full flex items-center justify-center rounded-xl relative overflow-hidden ${className}`}>
        <div
          className="absolute inset-0"
          style={{
            backgroundColor: mindMapData.backgroundColor || 'rgba(30, 41, 59, 0.3)',
          }}
        />
        <div className="relative z-10 text-slate-400 text-center">
          <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
          <p className="text-sm">Empty mindmap</p>
        </div>
      </div>
    );
  }

  return (
    <ReactFlow
      nodes={processedNodes}
      edges={processedEdges}
      nodeTypes={memoizedNodeTypes}
      fitView={fitView}
      nodesDraggable={interactive}
      nodesConnectable={interactive}
      elementsSelectable={selectable}
      zoomOnScroll={zoomable}
      panOnDrag={pannable}
      zoomOnDoubleClick={doubleClickZoom}
      preventScrolling={preventScrolling}
      minZoom={minZoom}
      maxZoom={maxZoom}
      onInit={handleInit}
      proOptions={{ hideAttribution: true }}
      className={className}
      style={mindMapData.fontFamily ? { fontFamily: mindMapData.fontFamily } : undefined}
    >
      <CustomBackground backgroundColor={mindMapData.backgroundColor} />
      {processedDrawingData && (
        <DrawingPreview drawingData={processedDrawingData} />
      )}
    </ReactFlow>
  );
};

export default MindMapRenderer;
