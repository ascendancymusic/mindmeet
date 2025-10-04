import type { Edge, Node } from 'reactflow';

type BroadcastFn = (payload: { id: string; type: 'node' | 'edge' | 'customization'; action: 'create' | 'update' | 'delete' | 'update'; data: any }) => void;

// Broadcast minimal diffs between previous and next nodes/edges to collaborators
export function broadcastStateDiff(
  prevNodes: Node[] | undefined,
  prevEdges: Edge[] | undefined,
  nextNodes: Node[] | undefined,
  nextEdges: Edge[] | undefined,
  broadcastLiveChange?: BroadcastFn,
  currentMindMapId?: string | null
): void {
  if (!currentMindMapId || !broadcastLiveChange) return;

  const sanitizeNode = (n: any) => {
    if (!n) return n;
    const { selected, dragging, positionAbsolute, ...rest } = n;
    return rest;
  };

  const prevNodeMap = new Map<string, Node>((prevNodes || []).map(n => [n.id, n]));
  const nextNodeMap = new Map<string, Node>((nextNodes || []).map(n => [n.id, n]));

  // Node deletions
  for (const id of prevNodeMap.keys()) {
    if (!nextNodeMap.has(id)) {
      broadcastLiveChange({ id, type: 'node', action: 'delete', data: { id } });
    }
  }

  // Node creations and updates
  for (const [id, nextNode] of nextNodeMap.entries()) {
    const prevNode = prevNodeMap.get(id);
    if (!prevNode) {
      broadcastLiveChange({ id, type: 'node', action: 'create', data: nextNode });
    } else {
      const changed = JSON.stringify(sanitizeNode(prevNode)) !== JSON.stringify(sanitizeNode(nextNode));
      if (changed) {
        broadcastLiveChange({ id, type: 'node', action: 'update', data: nextNode });
      }
    }
  }

  // Edge diffs
  const prevEdgeIds = new Set((prevEdges || []).map(e => e.id));
  const nextEdgeIds = new Set((nextEdges || []).map(e => e.id));

  for (const id of prevEdgeIds) {
    if (!nextEdgeIds.has(id)) {
      broadcastLiveChange({ id, type: 'edge', action: 'delete', data: { id } });
    }
  }

  for (const e of nextEdges || []) {
    if (!prevEdgeIds.has(e.id)) {
      broadcastLiveChange({ id: e.id, type: 'edge', action: 'create', data: e });
    }
  }
}
