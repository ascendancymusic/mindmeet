import { useCallback } from 'react';
import type { Edge, Node } from 'reactflow';
import { broadcastStateDiff } from '../utils/collabDiff';

export type HistoryAction = {
  type: string;
  data: any;
  previousState?: {
    nodes: Node[];
    edges: Edge[];
    title?: string;
    edgeType?: 'default' | 'straight' | 'smoothstep';
    backgroundColor?: string;
    dotColor?: string;
    drawingData?: any;
    fontFamily?: string;
  };
};

type Setter<T> = React.Dispatch<React.SetStateAction<T>>;

export function useHistoryControls(params: {
  history: HistoryAction[];
  currentHistoryIndex: number;
  lastSavedHistoryIndex: number;
  nodes: Node[];
  edges: Edge[];
  edgeType: 'default' | 'straight' | 'smoothstep';
  backgroundColor: string | null;
  dotColor: string | null;
  fontFamily: string | null;
  setNodes: Setter<Node[]>;
  setEdges: Setter<Edge[]>;
  setEditedTitle: (t: string) => void;
  setEdgeType: (t: 'default' | 'straight' | 'smoothstep') => void;
  setBackgroundColor: (c: string | null) => void;
  setDotColor: (c: string | null) => void;
  setDrawingData: (d: any) => void;
  setCurrentHistoryIndex: (i: number) => void;
  setHasUnsavedChanges: (b: boolean) => void;
  setCanUndo: (b: boolean) => void;
  setCanRedo: (b: boolean) => void;
  setSelectedNodeId: (v: string | null) => void;
  setVisuallySelectedNodeId: (v: string | null) => void;
  broadcastLiveChange?: (payload: any) => void;
  currentMindMapId?: string | null;
}) {
  const {
    history,
    currentHistoryIndex,
    lastSavedHistoryIndex,
    nodes,
    edges,
    edgeType,
    backgroundColor,
    dotColor,
    fontFamily,
    setNodes,
    setEdges,
    setEditedTitle,
    setEdgeType,
    setBackgroundColor,
    setDotColor,
    setDrawingData,
    setCurrentHistoryIndex,
    setHasUnsavedChanges,
    setCanUndo,
    setCanRedo,
    setSelectedNodeId,
    setVisuallySelectedNodeId,
    broadcastLiveChange,
    currentMindMapId,
  } = params;

  const jumpToHistory = useCallback((targetIndex: number) => {
    if (history.length === 0) return;
    if (targetIndex < -1 || targetIndex >= history.length) return;
    if (targetIndex === currentHistoryIndex) return;
    if (targetIndex < lastSavedHistoryIndex) return;

    let targetState: any;
    if (targetIndex === -1) {
      const firstAction = history[0];
      if (!firstAction?.previousState) return;
      targetState = { ...firstAction.previousState };
    } else if (targetIndex === history.length - 1) {
      const lastAction = history[targetIndex];
      if (!lastAction?.previousState) return;
      const prev = lastAction.previousState;
      let simNodes: Node[] = prev.nodes ? prev.nodes.map(n => ({ ...n, data: { ...n.data }, style: { ...n.style } })) : [];
      let simEdges: Edge[] = prev.edges ? prev.edges.map(e => ({ ...e })) : [];
      let simTitle = prev.title;
      let simEdgeType = prev.edgeType;
      let simBackgroundColor = prev.backgroundColor;
      let simDotColor = prev.dotColor;
      let simDrawingData = prev.drawingData;
      let simFontFamily = (prev as any).fontFamily;

      // Apply last action minimally (partial, mirrors MindMap)
      switch (lastAction.type) {
        case 'move_node': {
          const positionMap = lastAction.data.position as Record<string, { x: number; y: number }>;
          if (positionMap) simNodes = simNodes.map(n => positionMap[n.id] ? ({ ...n, position: positionMap[n.id] }) : n);
          break;
        }
        case 'resize_node': {
          const id = lastAction.data.nodeId;
          if (id) {
            simNodes = simNodes.map(n => n.id === id ? ({
              ...n,
              width: typeof lastAction.data.width === 'number' ? lastAction.data.width : undefined,
              height: typeof lastAction.data.height === 'number' ? lastAction.data.height : undefined,
              style: {
                ...n.style,
                width: typeof lastAction.data.width === 'number' ? `${lastAction.data.width}px` : lastAction.data.width,
                height: typeof lastAction.data.height === 'number' ? `${lastAction.data.height}px` : lastAction.data.height,
              }
            }) : n);
          }
          break;
        }
        case 'connect_nodes': {
          const conn = (lastAction.data as any).connection;
          const replacedId = (lastAction.data as any).replacedEdgeId;
          if (replacedId) simEdges = simEdges.filter(e => e.id !== replacedId);
          if (conn) {
            simEdges = [...simEdges, { id: conn.id || `${conn.source}-${conn.target}`, ...conn } as Edge];
            if (simEdgeType) simEdges = simEdges.map(e => ({ ...e, type: simEdgeType === 'default' ? 'default' : simEdgeType }));
          }
          break;
        }
        case 'disconnect_nodes': {
          const nodeId = (lastAction.data as any).nodeId;
          if (nodeId) simEdges = simEdges.filter(e => e.source !== nodeId && e.target !== nodeId);
          break;
        }
        case 'delete_node': {
          const data: any = lastAction.data;
          let idsToDelete: string[] = [];
          if (Array.isArray(data.affectedNodes) && data.affectedNodes.length > 0) idsToDelete = [...data.affectedNodes];
          else if (data.nodeId) {
            const graph = new Map<string, string[]>();
            simEdges.forEach(e => { if (!graph.has(e.source)) graph.set(e.source, []); graph.get(e.source)!.push(e.target); });
            const queue = [data.nodeId];
            const seen = new Set(queue);
            const descendants: string[] = [];
            while (queue.length) {
              const cur = queue.shift()!;
              const children = graph.get(cur) || [];
              for (const ch of children) if (!seen.has(ch)) { seen.add(ch); queue.push(ch); descendants.push(ch); }
            }
            idsToDelete = [data.nodeId, ...descendants];
          }
          if (idsToDelete.length) {
            simNodes = simNodes.filter(n => !idsToDelete.includes(n.id));
            simEdges = simEdges.filter(e => !idsToDelete.includes(e.source) && !idsToDelete.includes(e.target));
          }
          break;
        }
        case 'update_node': {
          const d: any = lastAction.data;
          const targets: string[] = [];
          if (d.nodeId) targets.push(d.nodeId);
          if (Array.isArray(d.affectedNodes)) d.affectedNodes.forEach((id: string) => { if (!targets.includes(id)) targets.push(id); });
          if (targets.length) {
            simNodes = simNodes.map(n => targets.includes(n.id) ? ({ ...n, data: { ...n.data, label: d.label ?? n.data?.label } } as Node) : n);
          }
          break;
        }
        case 'add_node': {
          const d: any = lastAction.data;
          if (Array.isArray(d.nodes)) simNodes = d.nodes as Node[];
          break;
        }
        case 'update_title': simTitle = lastAction.data.label || ''; break;
        case 'update_customization': {
          const d: any = lastAction.data;
          if (d.edgeType) { simEdgeType = d.edgeType; simEdges = simEdges.map(e => ({ ...e, type: simEdgeType === 'default' ? 'default' : simEdgeType })); }
          if (d.backgroundColor) simBackgroundColor = d.backgroundColor;
          if (d.dotColor) simDotColor = d.dotColor;
          if (d.fontFamily) simFontFamily = d.fontFamily;
          break;
        }
        case 'drawing_change':
        case 'move_stroke': { const d: any = lastAction.data; if (d.drawingData) simDrawingData = d.drawingData; break; }
        default: break;
      }

      targetState = { nodes: simNodes, edges: simEdges, title: simTitle, edgeType: simEdgeType, backgroundColor: simBackgroundColor, dotColor: simDotColor, drawingData: simDrawingData, fontFamily: simFontFamily } as any;
    } else {
      const nextAction = history[targetIndex + 1];
      if (!nextAction || !nextAction.previousState) return;
      targetState = { ...nextAction.previousState } as any;
    }

    // Broadcast diffs
    broadcastStateDiff(nodes, edges, targetState.nodes, targetState.edges, broadcastLiveChange, currentMindMapId);

    // Apply
    setNodes(targetState.nodes);
    setEdges(targetState.edges);
    if (targetState.title !== undefined) setEditedTitle(targetState.title);
    if (targetState.edgeType !== undefined) setEdgeType(targetState.edgeType);
    if (targetState.backgroundColor !== undefined) setBackgroundColor(targetState.backgroundColor);
    if (targetState.dotColor !== undefined) setDotColor(targetState.dotColor);
    if (targetState.drawingData !== undefined) setDrawingData(targetState.drawingData);

    setCurrentHistoryIndex(targetIndex);

    // Customization broadcast
    if (broadcastLiveChange && currentMindMapId) {
      const customizationPayload: any = {};
      if (targetState.edgeType !== undefined && targetState.edgeType !== edgeType) customizationPayload.edgeType = targetState.edgeType;
      if (targetState.backgroundColor !== undefined && targetState.backgroundColor !== backgroundColor) customizationPayload.backgroundColor = targetState.backgroundColor;
      if (targetState.dotColor !== undefined && targetState.dotColor !== dotColor) customizationPayload.dotColor = targetState.dotColor;
      if ((targetState as any).fontFamily && (targetState as any).fontFamily !== fontFamily) customizationPayload.fontFamily = (targetState as any).fontFamily;
      if (Object.keys(customizationPayload).length > 0) {
        broadcastLiveChange({ id: `customization-${currentMindMapId}`, type: 'customization', action: 'update', data: customizationPayload });
      }
    }

    const reachedSavePoint = targetIndex === lastSavedHistoryIndex;
    setHasUnsavedChanges(!reachedSavePoint);
    setCanUndo(targetIndex > lastSavedHistoryIndex);
    setCanRedo(targetIndex < history.length - 1);
    setSelectedNodeId(null);
    setVisuallySelectedNodeId(null);
  }, [history, currentHistoryIndex, lastSavedHistoryIndex, nodes, edges, edgeType, backgroundColor, dotColor, fontFamily, setNodes, setEdges, setEditedTitle, setEdgeType, setBackgroundColor, setDotColor, setDrawingData, setCurrentHistoryIndex, setHasUnsavedChanges, setCanUndo, setCanRedo, setSelectedNodeId, setVisuallySelectedNodeId, broadcastLiveChange, currentMindMapId]);

  return { jumpToHistory };
}
