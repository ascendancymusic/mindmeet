import React from 'react';
import MarkdownRenderer from '../components/MarkdownRenderer';

/**
 * Calculates the minimum height needed for a text node based on its content and width
 * @param textContent The text content to measure
 * @param currentWidth The current width of the node
 * @returns The calculated minimum height in pixels as a string
 */
export const calculateTextNodeMinHeight = (
  textContent: string,
  currentWidth: number
): string => {
  if (!textContent || textContent.trim() === '') {
    return "40px"; // Default minimum height for empty text
  }

  // Create a temporary element to measure text height
  const tempDiv = document.createElement('div');
  tempDiv.style.position = 'absolute';
  tempDiv.style.visibility = 'hidden';
  tempDiv.style.width = `${currentWidth - 16}px`; // Account for padding only
  tempDiv.style.fontSize = '14px'; // Match node font size
  tempDiv.style.lineHeight = '20px'; // Match text line height
  tempDiv.style.fontFamily = 'inherit';
  tempDiv.style.overflowWrap = 'break-word';
  tempDiv.style.whiteSpace = 'pre-wrap';
  tempDiv.innerHTML = textContent.replace(/\n/g, '<br>');

  document.body.appendChild(tempDiv);
  const textHeight = tempDiv.offsetHeight;
  document.body.removeChild(tempDiv);

  // Add padding for node styling
  const minHeight = Math.max(40, textHeight + 20); // 20px for padding/border

  return `${minHeight}px`;
};

/**
 * Gets the current width of a node from various possible sources
 * @param node The ReactFlow node
 * @returns The width as a number
 */
export const getNodeCurrentWidth = (node: any): number => {
  return typeof node.width === 'number' ? node.width :
    (typeof node.style?.width === 'number' ? node.style.width :
      (typeof node.style?.width === 'string' ? parseFloat(node.style.width) : 120));
};

/**
 * Creates a display label for text nodes with markdown rendering
 * @param textContent The raw text content
 * @returns JSX element with rendered markdown or placeholder
 */
export const createTextNodeDisplayLabel = (textContent: string): React.ReactElement => {
  if (!textContent || textContent === "") {
    return <span className="text-gray-400">Text...</span>;
  }
  return <MarkdownRenderer content={textContent} />;
};

/**
 * Processes a text node to add markdown rendering and dynamic height calculation
 * @param node The ReactFlow node to process
 * @returns The processed node with updated data and style
 */
export const processTextNodeForRendering = (node: any): any => {
  if (node.type !== "default") {
    return node;
  }

  const textContent = typeof node.data?.label === 'string' ? node.data.label : '';
  const currentWidth = getNodeCurrentWidth(node);
  const minHeight = calculateTextNodeMinHeight(textContent, currentWidth);
  const displayLabel = createTextNodeDisplayLabel(textContent);

  return {
    ...node,
    data: {
      ...node.data,
      label: displayLabel,
    },
    style: {
      ...node.style,
      minHeight,
    },
  };
};

/**
 * Processes an array of nodes, applying text node rendering logic to default type nodes
 * @param nodes Array of ReactFlow nodes
 * @returns Array of processed nodes
 */
export const processNodesForTextRendering = (
  nodes: any[]
): any[] => {
  return nodes.map((node: any) => {
    return processTextNodeForRendering(node);
  });
};
