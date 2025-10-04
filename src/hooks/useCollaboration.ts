import { useEffect } from 'react';
import type { Edge, Node } from 'reactflow';

type Setter<T> = React.Dispatch<React.SetStateAction<T>>;

export function useCollaborationSync(params: {
  currentMindMapId: string | null | undefined;
  userId?: string | null;
  edgeType: 'default' | 'straight' | 'smoothstep';
  backgroundColor: string | null;
  dotColor: string | null;
  fontFamily: string | null;
  setNodes: Setter<Node[]>;
  setEdges: Setter<Edge[]>;
  setEdgeType: (t: 'default' | 'straight' | 'smoothstep') => void;
  setBackgroundColor: (c: string) => void;
  setDotColor: (c: string) => void;
  setFontFamily: (f: string) => void;
}) {
  const {
    currentMindMapId,
    userId,
    edgeType,
    backgroundColor,
    dotColor,
    fontFamily,
    setNodes,
    setEdges,
    setEdgeType,
    setBackgroundColor,
    setDotColor,
    setFontFamily,
  } = params;

  useEffect(() => {
    if (!currentMindMapId) return;

    const handleLiveChange = (event: CustomEvent) => {
      const { id: changeId, type, action, data, user_id } = event.detail;
      if (user_id === userId) return; // ignore self

      if (type === 'node') {
        if (action === 'update') {
          setNodes((currentNodes) =>
            currentNodes.map((node) => (node.id === changeId ? { ...node, ...data } : node))
          );
        } else if (action === 'create') {
          setNodes((currentNodes) => {
            const nodeExists = currentNodes.some((node) => node.id === changeId);
            return nodeExists ? currentNodes : [...currentNodes, data];
          });
        } else if (action === 'delete') {
          setNodes((currentNodes) => currentNodes.filter((node) => node.id !== changeId));
          setEdges((currentEdges) => currentEdges.filter((edge) => edge.source !== changeId && edge.target !== changeId));
        }
      } else if (type === 'edge') {
        if (action === 'create') {
          setEdges((currentEdges) => {
            const edgeExists = currentEdges.some((edge) => edge.id === data.id);
            return edgeExists ? currentEdges : [...currentEdges, data];
          });
        } else if (action === 'delete') {
          setEdges((currentEdges) => currentEdges.filter((edge) => edge.id !== changeId));
        }
      } else if (type === 'customization' && action === 'update') {
        const customData: any = data;
        if (customData.edgeType && customData.edgeType !== edgeType) {
          setEdgeType(customData.edgeType);
          setEdges((eds) => eds.map((e) => ({ ...e, type: customData.edgeType === 'default' ? 'default' : customData.edgeType })));
        }
        if (customData.backgroundColor && customData.backgroundColor !== backgroundColor) {
          setBackgroundColor(customData.backgroundColor);
        }
        if (customData.dotColor && customData.dotColor !== dotColor) {
          setDotColor(customData.dotColor);
        }
        if (customData.fontFamily && customData.fontFamily !== fontFamily) {
          setFontFamily(customData.fontFamily);
        }
      }
    };

    window.addEventListener('collaboration-live-change', handleLiveChange as EventListener);
    return () => {
      window.removeEventListener('collaboration-live-change', handleLiveChange as EventListener);
    };
  }, [currentMindMapId, userId, edgeType, backgroundColor, dotColor, fontFamily, setNodes, setEdges, setEdgeType, setBackgroundColor, setDotColor, setFontFamily]);
}
