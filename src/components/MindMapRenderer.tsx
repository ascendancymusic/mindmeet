import React, { useRef, useCallback, useMemo } from 'react';
import ReactFlow, { ReactFlowInstance, NodeTypes } from 'reactflow';
import 'reactflow/dist/style.css';
import { prepareNodesForRendering } from '../utils/reactFlowUtils';
import { processNodesForTextRendering } from '../utils/textNodeUtils';
import { nodeTypes } from '../config/nodeTypes';
import { applyEdgeStyling, isTransparentColor } from '../config/edgeConfig';
import DrawingPreview from './DrawingPreview';
import { decompressDrawingData } from '../utils/drawingDataCompression';
import { DrawingData, getDrawingBounds } from './DrawingCanvas';

interface CustomBackgroundProps {
  backgroundColor?: string;
}

const CustomBackground: React.FC<CustomBackgroundProps> = React.memo(({ backgroundColor }) => {
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
});

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

// Resolve normalized font keys (e.g., 'aspekta', 'array') to actual CSS font stacks
function resolveFontFamily(font?: string | null): string | undefined {
  if (!font) return undefined;
  const raw = String(font).trim();
  const key = raw.toLowerCase();
  const map: Record<string, string> = {
    aspekta: 'Aspekta, sans-serif',
    'aspekta-regular': 'Aspekta, sans-serif',
    chillax: 'Chillax-Variable, Chillax-Regular, Chillax-Medium, Chillax-Bold, sans-serif',
    'chillax-regular': 'Chillax-Variable, Chillax-Regular, Chillax-Medium, Chillax-Bold, sans-serif',
    'chillax-variable': 'Chillax-Variable, Chillax-Regular, Chillax-Medium, Chillax-Bold, sans-serif',
    array: 'Array-Wide, Array-Regular, Array-Semibold, Array-SemiboldWide, Array-BoldWide, Array-Bold, sans-serif',
    'array-regular': 'Array-Wide, Array-Regular, Array-Semibold, Array-SemiboldWide, Array-BoldWide, Array-Bold, sans-serif',
    'array-wide': 'Array-Wide, Array-Regular, Array-Semibold, Array-SemiboldWide, Array-BoldWide, Array-Bold, sans-serif',
    switzer: 'Switzer-Variable, Switzer-Regular, Switzer-Medium, Switzer-Bold, sans-serif',
    'switzer-regular': 'Switzer-Variable, Switzer-Regular, Switzer-Medium, Switzer-Bold, sans-serif',
    'switzer-variable': 'Switzer-Variable, Switzer-Regular, Switzer-Medium, Switzer-Bold, sans-serif',
  };
  // If it's one of our normalized keys, return the mapped stack
  if (map[key]) return map[key];
  // Otherwise assume it's already a valid CSS font-family string
  return raw;
}

/**
 * MindMapRenderer - A reusable component for rendering mindmaps with ReactFlow
 * 
 * Features:
 * - Handles node and edge processing
 * - Supports custom backgrounds and drawing overlays
 * - Configurable interaction modes (preview vs editing)
 * - Consistent styling and behavior across the app
 * - Optimized with React.memo to prevent unnecessary re-renders
 */
const MindMapRenderer: React.FC<MindMapRendererProps> = React.memo(({
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
  // Process drawing data with stable memoization
  const processedDrawingData = useMemo(() => {
    if (!drawingData) return null;
    
    if (typeof drawingData === 'string') {
      // Decompress if it's a string from database
      return decompressDrawingData(drawingData) || null;
    } else {
      // Already processed DrawingData object
      return drawingData;
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
    const regularNodes = mindMapData.nodes?.length 
      ? processNodesForTextRendering(prepareNodesForRendering(mindMapData.nodes))
      : [];

    // If there are regular nodes, use them
    if (regularNodes.length > 0) {
      return regularNodes;
    }

    // If no regular nodes but there's drawing data, create invisible helper nodes for proper viewport fitting
    if (processedDrawingData) {
      const bounds = getDrawingBounds(processedDrawingData);
      if (bounds) {
        // Add some padding around the drawing bounds
        const padding = 100;
        return [
          {
            id: 'drawing-helper-1',
            position: { x: bounds.x - padding, y: bounds.y - padding },
            data: { label: '' },
            type: 'default',
            style: { 
              opacity: 0, 
              pointerEvents: 'none',
              width: 1,
              height: 1,
              background: 'transparent',
              border: 'none'
            },
          },
          {
            id: 'drawing-helper-2',
            position: { x: bounds.x + bounds.width + padding, y: bounds.y + bounds.height + padding },
            data: { label: '' },
            type: 'default',
            style: { 
              opacity: 0, 
              pointerEvents: 'none',
              width: 1,
              height: 1,
              background: 'transparent',
              border: 'none'
            },
          },
        ];
      }
    }

    return [];
  }, [mindMapData.nodes, processedDrawingData]);

  // Process edges for rendering
  const processedEdges = React.useMemo(() => {
    if (!mindMapData.edges?.length) return [];
    
    // Get edgeType from mindmap data, default to 'default' if not valid
    const edgeType = ['default', 'straight', 'smoothstep'].includes(mindMapData.edgeType || '')
      ? mindMapData.edgeType
      : 'default';
    
    return mindMapData.edges.map((edge: any) => {
      // Find the source node to get its color
      const sourceNode = mindMapData.nodes.find((node: any) => node.id === edge.source);
      const colorCandidate = sourceNode
        ? (sourceNode.background || sourceNode.style?.background || '#374151')
        : '#374151';

      // If the source node color is transparent, use white for the edge stroke
      const sourceNodeColor = isTransparentColor(colorCandidate) ? '#ffffff' : colorCandidate;

      // Apply consistent edge styling from config
      return applyEdgeStyling(edge, sourceNodeColor, edgeType);
    });
  }, [mindMapData.edges, mindMapData.nodes, mindMapData.edgeType]);

  // Memoize ReactFlow style to prevent unnecessary re-renders
  // Also expose CSS custom property so node styles can pick it up via var(--mindmap-font-family)
  const reactFlowStyle = useMemo(() => {
    const resolved = resolveFontFamily(mindMapData.fontFamily);
    if (!resolved) return undefined;
    return {
      fontFamily: resolved,
      // Provide CSS variable consumed by global styles for nodes
      // Type assertion used to allow custom property key
      ['--mindmap-font-family' as any]: resolved,
    } as React.CSSProperties;
  }, [mindMapData.fontFamily]);

  // Memoize proOptions to prevent object recreation
  const proOptions = useMemo(() => ({ hideAttribution: true }), []);

  // Use custom node types or fall back to default
  const memoizedNodeTypes = useMemo(() => {
    return customNodeTypes || (nodeTypes as unknown as NodeTypes);
  }, [customNodeTypes]);

  // Memoize empty state component to prevent re-renders
  const emptyState = useMemo(() => (
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
  ), [className, mindMapData.backgroundColor]);

  // Show empty state only if there are no nodes AND no drawing data
  if (!processedNodes.length && !processedDrawingData) {
    return emptyState;
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
      proOptions={proOptions}
      className={className}
      style={reactFlowStyle}
    >
      <CustomBackground backgroundColor={mindMapData.backgroundColor} />
      {processedDrawingData && (
        <DrawingPreview drawingData={processedDrawingData} />
      )}
    </ReactFlow>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for React.memo
  // Only re-render if the data actually changed
  
  // Compare mindMapData properties
  const mindMapDataEqual = 
    JSON.stringify(prevProps.mindMapData.nodes) === JSON.stringify(nextProps.mindMapData.nodes) &&
    JSON.stringify(prevProps.mindMapData.edges) === JSON.stringify(nextProps.mindMapData.edges) &&
    prevProps.mindMapData.backgroundColor === nextProps.mindMapData.backgroundColor &&
    prevProps.mindMapData.fontFamily === nextProps.mindMapData.fontFamily &&
    prevProps.mindMapData.edgeType === nextProps.mindMapData.edgeType;

  // Compare drawing data
  const drawingDataEqual = prevProps.drawingData === nextProps.drawingData;

  // Compare other props
  const otherPropsEqual = 
    prevProps.interactive === nextProps.interactive &&
    prevProps.zoomable === nextProps.zoomable &&
    prevProps.pannable === nextProps.pannable &&
    prevProps.doubleClickZoom === nextProps.doubleClickZoom &&
    prevProps.selectable === nextProps.selectable &&
    prevProps.className === nextProps.className &&
    prevProps.minZoom === nextProps.minZoom &&
    prevProps.maxZoom === nextProps.maxZoom &&
    prevProps.fitView === nextProps.fitView &&
    prevProps.preventScrolling === nextProps.preventScrolling &&
    prevProps.customNodeTypes === nextProps.customNodeTypes;

  return mindMapDataEqual && drawingDataEqual && otherPropsEqual;
});

export default MindMapRenderer;
