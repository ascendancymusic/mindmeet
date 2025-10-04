import type { Edge, Node } from 'reactflow';

export function validateAndFixEdgeIds(edges: Edge[]): Edge[] {
  const seen = new Set<string>();
  return edges.map((e) => {
    let id = e.id || `${e.source}-${e.target}`;
    if (seen.has(id)) {
      id = `${id}-${Math.random().toString(36).slice(2, 8)}`;
    }
    seen.add(id);
    return { ...e, id };
  });
}

export type SnapshotState = {
  nodes: Node[];
  edges: Edge[];
  title?: string;
  edgeType?: 'default' | 'straight' | 'smoothstep';
  backgroundColor?: string;
  dotColor?: string;
  drawingData?: any;
  fontFamily?: string;
};
