import type { Node } from 'reactflow';

/**
 * Gets the width of a node, handling different node types appropriately
 * @param node The ReactFlow node
 * @param defaultWidth Default width to use if no width is found
 * @returns The width value
 */
export const getNodeWidth = (node: Node, defaultWidth: number | string = 'auto'): number | string => {
  if (typeof (node as any).width === 'number') {
    return (node as any).width as number;
  }

  const styleWidth = node.style?.width;
  if (typeof styleWidth === 'number') return styleWidth;
  if (typeof styleWidth === 'string') {
    const trimmed = styleWidth.trim();
    if (trimmed === 'auto') return defaultWidth;
    const parsed = parseFloat(trimmed);
    return Number.isFinite(parsed) ? parsed : defaultWidth;
  }

  if (['link', 'mindmap', 'spotify', 'soundcloud', 'instagram', 'twitter', 'facebook', 'youtube', 'tiktok', 'mindmeet', 'playlist'].includes(node.type || '')) {
    return 'auto';
  }

  return defaultWidth;
};

/**
 * Gets the height of a node, handling different node types appropriately
 * @param node The ReactFlow node
 * @param defaultHeight Default height to use if no height is found
 * @returns The height value
 */
export const getNodeHeight = (node: Node, defaultHeight: number | string = 'auto'): number | string => {
  if (typeof (node as any).height === 'number') {
    return (node as any).height as number;
  }

  const styleHeight = node.style?.height;
  if (typeof styleHeight === 'number') return styleHeight;
  if (typeof styleHeight === 'string') {
    const trimmed = styleHeight.trim();
    if (trimmed === 'auto') return defaultHeight;
    const parsed = parseFloat(trimmed);
    return Number.isFinite(parsed) ? parsed : defaultHeight;
  }

  return defaultHeight;
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

    const baseStyle = preparedNode.style || {};
    preparedNode.style = {
      ...baseStyle,
      width: width,
      height: height,
      padding: node.type === 'image' ? '0' : (baseStyle as any).padding,
    } as any;
  }

  // Ensure background is set correctly
  const nodeAny = node as any;
  preparedNode.style = preparedNode.style || {};
  (preparedNode.style as any).background =
    nodeAny.background ??
    (node.style as any)?.background ??
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

  // For image, audio, default text, and text-no-bg nodes, extract width and height from style and save directly on the node
  if (node.type === 'image' || node.type === 'audio' || node.type === 'default' || node.type === 'text-no-bg') {
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
