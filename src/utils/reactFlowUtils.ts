import type { Node } from 'reactflow';
import { prepareNodeForRendering } from './nodeUtils';
import defaultNodeStyles from '../config/defaultNodeStyles';

/**
 * Prepares nodes for rendering in ReactFlow, ensuring all properties are correctly set
 * @param nodes The nodes to prepare
 * @returns The prepared nodes
 */
export const prepareNodesForRendering = (nodes: Node[]): Node[] => {
  return nodes.map((node) => {
    // For image nodes, ensure width and height are properly set
    if (node.type === 'image') {
      return prepareNodeForRendering(node, defaultNodeStyles);
    }

    // For other nodes, apply default styling
    return {
      ...node,
      style: {
        ...defaultNodeStyles[node.type as keyof typeof defaultNodeStyles] || {},
        ...node.style,
        background:
          node.background ||
          node.style?.background ||
          (defaultNodeStyles[node.type as keyof typeof defaultNodeStyles]?.background),
        width: ['link', 'mindmap', 'spotify', 'soundcloud', 'instagram', 'twitter', 'facebook', 'youtube', 'tiktok', 'playlist'].includes(node.type || '')
          ? 'auto'
          : node.style?.width || (defaultNodeStyles[node.type as keyof typeof defaultNodeStyles]?.width),
        padding: node.type === 'image'
          ? '0'
          : (node.style?.padding || defaultNodeStyles[node.type as keyof typeof defaultNodeStyles]?.padding),
      },
    };
  });
};
