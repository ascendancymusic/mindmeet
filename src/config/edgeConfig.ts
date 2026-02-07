import { MarkerType } from 'reactflow';
import type { Edge } from 'reactflow';

/**
 * Apply styling to edges based on their type (hierarchical or association)
 * @param edge - The edge to style
 * @param sourceNodeColor - The color from the source node
 * @param mapEdgeType - The global edge type for the map (default, straight, smoothstep)
 * @returns Styled edge with proper markers and colors
 */
export function applyEdgeStyling(
  edge: Edge,
  sourceNodeColor: string,
  mapEdgeType: 'default' | 'straight' | 'smoothstep' = 'default'
): Edge {
  // Check if this is an association edge (sideways connection)
  const isAssociation = edge.data?.edgeType === 'association';

  return {
    ...edge,
    type: mapEdgeType,
    style: {
      ...edge.style,
      strokeWidth: 2,
      stroke: sourceNodeColor,
    },
    // Association edges get an arrowhead marker
    ...(isAssociation && {
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 20,
        height: 20,
        color: sourceNodeColor,
      },
    }),
  };
}

/**
 * Helper to determine if a color is transparent
 * Handles various color formats: transparent keyword, rgba, hsla, hex with alpha
 */
export function isTransparentColor(color?: string | null): boolean {
  if (!color) return false;
  const c = String(color).trim().toLowerCase();
  if (c === 'transparent') return true;
  
  // Check rgba format
  const rgba = c.match(/^rgba?\(([^)]+)\)$/);
  if (rgba) {
    const parts = rgba[1].split(/[\s,\/]+/).filter(Boolean);
    if (parts.length >= 4) {
      const a = parseFloat(parts[3]);
      return !isNaN(a) && a <= 0;
    }
  }
  
  // Check hsla format
  const hsla = c.match(/^hsla?\(([^)]+)\)$/);
  if (hsla) {
    const parts = hsla[1].split(/[\s,\/]+/).filter(Boolean);
    if (parts.length >= 4) {
      const a = parseFloat(parts[3]);
      return !isNaN(a) && a <= 0;
    }
  }
  
  // Check hex format with alpha
  if (c.startsWith('#')) {
    const hex = c.slice(1);
    if (hex.length === 4) {
      return hex[3] === '0';
    }
    if (hex.length === 8) {
      return hex.slice(6, 8) === '00';
    }
  }
  
  return false;
}
