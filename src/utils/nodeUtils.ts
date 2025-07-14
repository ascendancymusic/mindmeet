import type { Node } from 'reactflow';

/**
 * Gets the width of a node, handling different node types appropriately
 * @param node The ReactFlow node
 * @param defaultWidth Default width to use if no width is found
 * @returns The width value
 */
export const getNodeWidth = (node: Node, defaultWidth: number | string = 'auto'): number | string => {
  // For image, audio, and default text nodes, width is stored directly on the node
  if (node.type === 'image' || node.type === 'audio' || node.type === 'default') {
    // First check if width is directly on the node (saved format)
    if (typeof node.width === 'number') {
      return node.width;
    }

    // Then check if it's in style
    if (node.style?.width) {
      return typeof node.style.width === 'string'
        ? node.style.width
        : parseFloat(node.style.width.toString());
    }
  }

  // For link nodes and other auto-width nodes, return 'auto'
  if (['link', 'mindmap', 'spotify', 'soundcloud', 'instagram', 'twitter', 'facebook', 'youtube', 'tiktok', 'playlist'].includes(node.type || '')) {
    return 'auto';
  }

  // For other nodes, check style first, then default
  return node.style?.width || defaultWidth;
};

/**
 * Gets the height of a node, handling different node types appropriately
 * @param node The ReactFlow node
 * @param defaultHeight Default height to use if no height is found
 * @returns The height value
 */
export const getNodeHeight = (node: Node, defaultHeight: number | string = 'auto'): number | string => {
  // For image, audio, and default text nodes, height is stored directly on the node
  if (node.type === 'image' || node.type === 'audio' || node.type === 'default') {
    // First check if height is directly on the node (saved format)
    if (typeof node.height === 'number') {
      return node.height;
    }

    // Then check if it's in style
    if (node.style?.height) {
      return typeof node.style.height === 'string'
        ? node.style.height
        : parseFloat(node.style.height.toString());
    }
  }

  // For other nodes, check style first, then default
  return node.style?.height || defaultHeight;
};

/**
 * Prepares a node for rendering in ReactFlow, ensuring all properties are correctly set
 * @param node The node to prepare
 * @param defaultStyles Default styles to apply
 * @returns The prepared node
 */
export const prepareNodeForRendering = (node: Node, defaultStyles: any = {}): Node => {
  // Create a copy of the node to avoid mutating the original
  const preparedNode = { ...node };

  // Set up the style object if it doesn't exist
  if (!preparedNode.style) {
    preparedNode.style = {};
  }

  // Apply default styles based on node type
  if (defaultStyles[node.type || 'default']) {
    preparedNode.style = {
      ...defaultStyles[node.type || 'default'],
      ...preparedNode.style,
    };
  }

  // For image, audio, and default text nodes, ensure width and height are in the style
  if (node.type === 'image' || node.type === 'audio' || node.type === 'default') {
    const width = getNodeWidth(node);
    const height = getNodeHeight(node);

    preparedNode.style = {
      ...preparedNode.style,
      width: width,
      height: height,
      padding: node.type === 'image' ? '0' : preparedNode.style.padding,
    };
  }

  // Ensure background is set correctly
  preparedNode.style.background =
    node.background ||
    node.style?.background ||
    (defaultStyles[node.type || 'default']?.background);

  return preparedNode;
};

/**
 * Prepares a node for saving, ensuring width and height are stored correctly
 * @param node The node to prepare for saving
 * @returns The prepared node
 */
export const prepareNodeForSaving = (node: Node): Node => {
  // Create a copy of the node to avoid mutating the original
  const preparedNode = { ...node };

  // For image, audio, and default text nodes, extract width and height from style and save directly on the node
  if (node.type === 'image' || node.type === 'audio' || node.type === 'default') {
    const width = node.style?.width
      ? typeof node.style.width === 'string'
        ? parseFloat(node.style.width)
        : parseFloat(node.style.width.toString())
      : undefined;

    const height = node.style?.height
      ? typeof node.style.height === 'string'
        ? parseFloat(node.style.height)
        : parseFloat(node.style.height.toString())
      : undefined;

    // Save width and height directly on the node
    if (width) preparedNode.width = width;
    if (height) preparedNode.height = height;

    // Remove style to avoid duplication
    if (preparedNode.style) {
      const { width: _, height: __, ...restStyle } = preparedNode.style;
      preparedNode.style = restStyle;
    }
  }

  return preparedNode;
};
