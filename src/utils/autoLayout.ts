import { Node as FlowNode, Edge } from 'reactflow';

export interface AutoLayoutOptions {
  nodeSpacing?: number;
  subtreeSpacing?: number;
  levelSpacing?: number;
  childrenPerRow?: number;
  minRowSpacing?: number;
}

export interface AutoLayoutResult {
  updatedNodes: FlowNode[];
  positions: { [nodeId: string]: { x: number; y: number } };
}

export class AutoLayoutEngine {
  private nodes: FlowNode[];
  private edges: Edge[];
  private options: Required<AutoLayoutOptions>;

  constructor(nodes: FlowNode[], edges: Edge[], options: AutoLayoutOptions = {}) {
    this.nodes = nodes;
    this.edges = edges;
    this.options = {
      nodeSpacing: options.nodeSpacing ?? 20,
      subtreeSpacing: options.subtreeSpacing ?? 60,
      levelSpacing: options.levelSpacing ?? 120,
      childrenPerRow: options.childrenPerRow ?? 3,
      minRowSpacing: options.minRowSpacing ?? 60,
    };
  }

  /**
   * Performs auto-layout for a given parent node
   */
  public layoutNode(parentNodeId: string): AutoLayoutResult {
    const parentNode = this.nodes.find(node => node.id === parentNodeId);
    if (!parentNode) {
      throw new Error(`Parent node ${parentNodeId} not found`);
    }

    const allPositions = this.positionSubtree(
      parentNodeId, 
      0, // temporary center
      parentNode.position.y, 
      true
    );

    // Adjust positions to center over direct children
    this.adjustRootPosition(parentNodeId, parentNode, allPositions);

    // Create updated nodes array
    const updatedNodes = this.nodes.map(node => {
      if (allPositions[node.id] && node.id !== parentNodeId) {
        return {
          ...node,
          position: allPositions[node.id]
        };
      }
      return node;
    });

    return {
      updatedNodes,
      positions: allPositions
    };
  }

  private snapToGrid(value: number): number {
    return Math.round(value / 20) * 20;
  }

  private getChildren(parentId: string): string[] {
    return this.edges
      .filter(edge => edge.source === parentId)
      .map(edge => edge.target);
  }

  private calculateSubtreeWidth(nodeId: string): number {
    const children = this.getChildren(nodeId);

    if (children.length === 0) {
      const node = this.nodes.find(n => n.id === nodeId);
      return node?.width || 200;
    }

    const childrenWidths = children.map(childId => this.calculateSubtreeWidth(childId));
    const hasGrandchildren = children.some(childId => this.getChildren(childId).length > 0);

    let childrenLayoutWidth: number;

    if (children.length >= 4 && !hasGrandchildren) {
      childrenLayoutWidth = this.calculateStackedLayoutWidth(childrenWidths);
    } else {
      childrenLayoutWidth = this.calculateSingleRowLayoutWidth(children, childrenWidths);
    }

    const nodeWidth = this.nodes.find(n => n.id === nodeId)?.width || 200;
    return Math.max(nodeWidth, childrenLayoutWidth);
  }

  private calculateStackedLayoutWidth(childrenWidths: number[]): number {
    const childrenPerRow = Math.min(
      this.options.childrenPerRow, 
      Math.ceil(childrenWidths.length / Math.ceil(childrenWidths.length / this.options.childrenPerRow))
    );
    
    const rows: number[][] = [];
    for (let i = 0; i < childrenWidths.length; i += childrenPerRow) {
      rows.push(childrenWidths.slice(i, i + childrenPerRow));
    }

    const rowWidths = rows.map(rowWidths =>
      rowWidths.reduce((sum, width) => sum + width, 0) + 
      (rowWidths.length - 1) * this.options.nodeSpacing
    );

    return Math.max(...rowWidths);
  }

  private calculateSingleRowLayoutWidth(children: string[], childrenWidths: number[]): number {
    const totalChildrenWidth = childrenWidths.reduce((sum, width) => sum + width, 0);
    
    let totalGapsWidth = 0;
    for (let i = 0; i < children.length - 1; i++) {
      const currentChildHasChildren = this.getChildren(children[i]).length > 0;
      const nextChildHasChildren = this.getChildren(children[i + 1]).length > 0;

      if (currentChildHasChildren || nextChildHasChildren) {
        totalGapsWidth += this.options.subtreeSpacing;
      } else {
        totalGapsWidth += this.options.nodeSpacing;
      }
    }

    return totalChildrenWidth + totalGapsWidth;
  }

  private positionSubtree(
    nodeId: string, 
    centerX: number, 
    topY: number, 
    isRootNode: boolean = false
  ): { [nodeId: string]: { x: number; y: number } } {
    const positions: { [nodeId: string]: { x: number; y: number } } = {};
    const node = this.nodes.find(n => n.id === nodeId);
    
    if (!node) return positions;

    const nodeWidth = node.width || 200;
    const nodeHeight = node.height || 40;

    // Position current node
    positions[nodeId] = {
      x: this.snapToGrid(centerX - nodeWidth / 2),
      y: this.snapToGrid(topY)
    };

    const children = this.getChildren(nodeId);
    if (children.length > 0) {
      const result = this.positionChildren(children, centerX, topY, nodeHeight);
      Object.assign(positions, result.positions);

      // Update current node position if not root
      if (!isRootNode) {
        positions[nodeId] = {
          x: this.snapToGrid(result.childrenCenterX - nodeWidth / 2),
          y: this.snapToGrid(topY)
        };
      }
    }

    return positions;
  }

  private positionChildren(
    children: string[],
    centerX: number,
    topY: number,
    nodeHeight: number
  ): { positions: { [nodeId: string]: { x: number; y: number } }, childrenCenterX: number } {
    const positions: { [nodeId: string]: { x: number; y: number } } = {};
    const childrenWidths = children.map(childId => this.calculateSubtreeWidth(childId));
    const hasGrandchildren = children.some(childId => this.getChildren(childId).length > 0);

    let childrenCenterX: number;

    if (children.length >= 4 && !hasGrandchildren) {
      const result = this.positionStackedChildren(children, childrenWidths, centerX, topY, nodeHeight);
      Object.assign(positions, result.positions);
      childrenCenterX = result.centerX;
    } else {
      const result = this.positionSingleRowChildren(children, childrenWidths, centerX, topY, nodeHeight);
      Object.assign(positions, result.positions);
      childrenCenterX = result.centerX;
    }

    return { positions, childrenCenterX };
  }

  private positionStackedChildren(
    children: string[],
    childrenWidths: number[],
    centerX: number,
    topY: number,
    nodeHeight: number
  ): { positions: { [nodeId: string]: { x: number; y: number } }, centerX: number } {
    const positions: { [nodeId: string]: { x: number; y: number } } = {};
    const childrenPerRow = Math.min(
      this.options.childrenPerRow,
      Math.ceil(children.length / Math.ceil(children.length / this.options.childrenPerRow))
    );

    const rows: string[][] = [];
    for (let i = 0; i < children.length; i += childrenPerRow) {
      rows.push(children.slice(i, i + childrenPerRow));
    }

    const dynamicLevelSpacing = Math.max(this.options.levelSpacing, nodeHeight + 40);
    let currentRowY = topY + dynamicLevelSpacing;

    rows.forEach((rowChildren) => {
      const rowChildWidths = rowChildren.map(childId => childrenWidths[children.indexOf(childId)]);
      const rowTotalWidth = rowChildWidths.reduce((sum, width) => sum + width, 0) + 
                           (rowChildren.length - 1) * this.options.nodeSpacing;
      
      let rowCurrentX = centerX - rowTotalWidth / 2;
      const rowMaxHeight = Math.max(...rowChildren.map(childId => {
        const childNode = this.nodes.find(n => n.id === childId);
        return childNode?.height || 40;
      }));

      rowChildren.forEach((childId, childIndex) => {
        const childSubtreeWidth = rowChildWidths[childIndex];
        const childCenterX = rowCurrentX + childSubtreeWidth / 2;
        const childPositions = this.positionSubtree(childId, childCenterX, currentRowY, false);
        Object.assign(positions, childPositions);
        rowCurrentX += childSubtreeWidth + this.options.nodeSpacing;
      });

      currentRowY += Math.max(this.options.minRowSpacing, rowMaxHeight + 20);
    });

    return { positions, centerX };
  }

  private positionSingleRowChildren(
    children: string[],
    childrenWidths: number[],
    centerX: number,
    topY: number,
    nodeHeight: number
  ): { positions: { [nodeId: string]: { x: number; y: number } }, centerX: number } {
    const positions: { [nodeId: string]: { x: number; y: number } } = {};
    
    // Calculate total layout width and spacing
    const totalChildrenWidth = childrenWidths.reduce((sum, width) => sum + width, 0);
    let totalGapsWidth = 0;
    
    for (let i = 0; i < children.length - 1; i++) {
      const currentChildHasChildren = this.getChildren(children[i]).length > 0;
      const nextChildHasChildren = this.getChildren(children[i + 1]).length > 0;

      if (currentChildHasChildren || nextChildHasChildren) {
        totalGapsWidth += this.options.subtreeSpacing;
      } else {
        totalGapsWidth += this.options.nodeSpacing;
      }
    }

    const childrenLayoutWidth = totalChildrenWidth + totalGapsWidth;
    
    // Position children and calculate their centers
    let currentX = centerX - childrenLayoutWidth / 2;
    const childCenters: number[] = [];

    children.forEach((childId, index) => {
      const childSubtreeWidth = childrenWidths[index];
      const childCenterX = currentX + childSubtreeWidth / 2;
      childCenters.push(childCenterX);
      currentX += childSubtreeWidth;

      if (index < children.length - 1) {
        const currentChildHasChildren = this.getChildren(childId).length > 0;
        const nextChildHasChildren = this.getChildren(children[index + 1]).length > 0;

        if (currentChildHasChildren || nextChildHasChildren) {
          currentX += this.options.subtreeSpacing;
        } else {
          currentX += this.options.nodeSpacing;
        }
      }
    });

    // Calculate actual center of direct children
    const leftmostChild = Math.min(...childCenters);
    const rightmostChild = Math.max(...childCenters);
    const childrenCenterX = (leftmostChild + rightmostChild) / 2;

    // Position children using calculated centers
    const dynamicLevelSpacing = Math.max(this.options.levelSpacing, nodeHeight + 40);
    children.forEach((childId, index) => {
      const childCenterX = childCenters[index];
      const childSubtreePositions = this.positionSubtree(childId, childCenterX, topY + dynamicLevelSpacing, false);
      Object.assign(positions, childSubtreePositions);
    });

    return { positions, centerX: childrenCenterX };
  }

  private adjustRootPosition(
    parentNodeId: string,
    parentNode: FlowNode,
    allPositions: { [nodeId: string]: { x: number; y: number } }
  ): void {
    const directChildren = this.getChildren(parentNodeId);
    
    if (directChildren.length > 0) {
      const childPositions = directChildren.map(childId => {
        const pos = allPositions[childId];
        const childNode = this.nodes.find(n => n.id === childId);
        const childWidth = childNode?.width || 200;
        return pos ? { ...pos, width: childWidth } : null;
      }).filter((pos): pos is { x: number; y: number; width: number } => pos !== null);

      if (childPositions.length > 0) {
        const leftmostChild = Math.min(...childPositions.map(pos => pos.x));
        const rightmostChild = Math.max(...childPositions.map(pos => pos.x + pos.width));
        const childrenCenter = (leftmostChild + rightmostChild) / 2;

        const rootCenterX = parentNode.position.x + (parentNode.width || 200) / 2;
        const offset = rootCenterX - childrenCenter;

        // Apply offset to all positioned nodes
        Object.keys(allPositions).forEach(nodeId => {
          allPositions[nodeId].x += offset;
        });
      }
    }
  }
}

// Convenience function for simple usage
export function autoLayoutNode(
  nodes: FlowNode[], 
  edges: Edge[], 
  parentNodeId: string, 
  options?: AutoLayoutOptions
): AutoLayoutResult {
  const engine = new AutoLayoutEngine(nodes, edges, options);
  return engine.layoutNode(parentNodeId);
}
