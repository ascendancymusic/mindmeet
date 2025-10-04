import type { Edge, Node, Connection } from 'reactflow';

type Setter<T> = React.Dispatch<React.SetStateAction<T>>;

export function useNodeUpdates(params: {
  setNodes: Setter<Node[]>;
  setEdges: Setter<Edge[]>;
}) {
  const { setNodes, setEdges } = params;

  const updateNodeById = (id: string, mutator: (n: Node) => Node) => {
    setNodes((nodes) => nodes.map((n) => (n.id === id ? mutator(n) : n)));
  };

  const updateManyNodes = (ids: string[], mutator: (n: Node) => Node) => {
    const idSet = new Set(ids);
    setNodes((nodes) => nodes.map((n) => (idSet.has(n.id) ? mutator(n) : n)));
  };

  const upsertEdge = (edge: Edge) => {
    setEdges((edges) => {
      const exists = edges.some((e) => e.id === edge.id);
      return exists ? edges.map((e) => (e.id === edge.id ? edge : e)) : [...edges, edge];
    });
  };

  const removeEdgeById = (edgeId: string) => {
    setEdges((edges) => edges.filter((e) => e.id !== edgeId));
  };

  const connectEdge = (conn: Connection) => {
    const id = `${conn.source}-${conn.target}`;
    upsertEdge({ id, ...conn } as Edge);
  };

  return { updateNodeById, updateManyNodes, upsertEdge, removeEdgeById, connectEdge };
}
