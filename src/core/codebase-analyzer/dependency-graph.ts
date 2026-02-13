/**
 * VIBE-CLI v0.0.2 - Dependency Graph Builder
 * Build and analyze dependency graphs for codebases
 */

import * as fs from 'fs';
import * as path from 'path';
import { ASTAnalyzer, CodeDefinition } from './ast-analyzer.js';

/**
 * Edge type in dependency graph
 */
export type DependencyEdgeType = 'imports' | 'extends' | 'implements' | 'calls' | 'uses' | 'exports';

/**
 * Dependency edge
 */
export interface DependencyEdge {
  from: string;
  to: string;
  type: DependencyEdgeType;
  weight: number;
  filePath: string;
  line?: number;
}

/**
 * Dependency graph node
 */
export interface DependencyNode {
  id: string;
  filePath: string;
  name: string;
  type: 'file' | 'class' | 'function' | 'interface' | 'variable';
  incomingEdges: number;
  outgoingEdges: number;
  size: number;
}

/**
 * Dependency graph result
 */
export interface DependencyGraph {
  nodes: DependencyNode[];
  edges: DependencyEdge[];
  stronglyConnectedComponents: string[][];
  hasCycles: boolean;
  metrics: GraphMetrics;
}

/**
 * Graph metrics
 */
export interface GraphMetrics {
  totalNodes: number;
  totalEdges: number;
  averageDegree: number;
  maxDepth: number;
  cycleCount: number;
  density: number;
}

/**
 * Circular dependency info
 */
export interface CircularDependency {
  path: string[];
  files: string[];
}

/**
 * Dependency Graph Builder
 */
export class DependencyGraphBuilder {
  private astAnalyzer: ASTAnalyzer;
  private graph: Map<string, DependencyNode> = new Map();
  private edges: DependencyEdge[] = [];
  private adjacencyList: Map<string, string[]> = new Map();

  constructor() {
    this.astAnalyzer = new ASTAnalyzer();
  }

  /**
   * Build dependency graph from a directory
   */
  build(dirPath: string): DependencyGraph {
    // Clear previous state
    this.graph.clear();
    this.edges = [];
    this.adjacencyList.clear();

    // Get all source files
    const { glob } = require('fast-glob');
    const files = glob.sync(['**/*.ts', '**/*.js', '**/*.py'], {
      cwd: dirPath,
      absolute: true,
      ignore: ['node_modules/**', '.git/**', 'dist/**', 'build/**'],
    });

    // Build nodes and edges
    const fileDefinitions = new Map<string, ReturnType<typeof this.astAnalyzer.analyzeFile>>();

    for (const file of files) {
      this.addFileNode(file);
      fileDefinitions.set(file, this.astAnalyzer.analyzeFile(file));
    }

    // Build edges
    for (const [file, definitions] of fileDefinitions) {
      for (const def of definitions) {
        this.addEdgesFromDefinition(file, def);
      }
    }

    // Calculate metrics
    const metrics = this.calculateMetrics();

    // Find strongly connected components (cycles)
    const { stronglyConnectedComponents, hasCycles } = this.findStronglyConnectedComponents();

    // Build node list
    const nodes: DependencyNode[] = Array.from(this.graph.values()).map((node) => ({
      ...node,
      incomingEdges: this.countIncomingEdges(node.id),
      outgoingEdges: this.adjacencyList.get(node.id)?.length || 0,
    }));

    return {
      nodes,
      edges: this.edges,
      stronglyConnectedComponents,
      hasCycles,
      metrics,
    };
  }

  /**
   * Add a file as a node
   */
  private addFileNode(filePath: string): void {
    const id = this.getNodeId(filePath);
    const stats = fs.statSync(filePath);

    this.graph.set(id, {
      id,
      filePath,
      name: path.basename(filePath),
      type: 'file',
      incomingEdges: 0,
      outgoingEdges: 0,
      size: stats.size,
    });

    this.adjacencyList.set(id, []);
  }

  /**
   * Add edges from a definition
   */
  private addEdgesFromDefinition(
    filePath: string,
    def: CodeDefinition
  ): void {
    const fromId = this.getNodeId(filePath);

    // Process dependencies
    for (const dep of def.dependencies) {
      // Try to resolve dependency to a file
      const resolvedPath = this.resolveDependency(filePath, dep);
      if (resolvedPath) {
        const toId = this.getNodeId(resolvedPath);

        // Add edge if not exists
        if (!this.hasEdge(fromId, toId)) {
          this.addEdge(fromId, toId, 'imports', filePath);
        }
      }
    }

    // Process relationships from metadata
    if (def.metadata?.extends) {
      const parentPath = this.resolveDependency(filePath, def.metadata.extends as string);
      if (parentPath) {
        this.addEdge(fromId, this.getNodeId(parentPath), 'extends', filePath);
      }
    }

    if (def.metadata?.implements) {
      for (const impl of def.metadata.implements as string[]) {
        const implPath = this.resolveDependency(filePath, impl);
        if (implPath) {
          this.addEdge(fromId, this.getNodeId(implPath), 'implements', filePath);
        }
      }
    }
  }

  /**
   * Add an edge
   */
  private addEdge(from: string, to: string, type: DependencyEdgeType, filePath: string): void {
    this.edges.push({ from, to, type, weight: 1, filePath });
    this.adjacencyList.get(from)?.push(to);

    // Update node outgoing count
    const node = this.graph.get(from);
    if (node) {
      node.outgoingEdges++;
    }

    // Update target node incoming count
    const targetNode = this.graph.get(to);
    if (targetNode) {
      targetNode.incomingEdges++;
    }
  }

  /**
   * Check if edge exists
   */
  private hasEdge(from: string, to: string): boolean {
    return this.edges.some((e) => e.from === from && e.to === to);
  }

  /**
   * Get node ID from file path
   */
  private getNodeId(filePath: string): string {
    return path.relative(process.cwd(), filePath);
  }

  /**
   * Resolve dependency to file path
   */
  private resolveDependency(fromPath: string, dependency: string): string | null {
    const dir = path.dirname(fromPath);

    // Try direct resolution
    const extensions = ['.ts', '.js', '.tsx', '.jsx', '.py', '/index.ts', '/index.js'];
    const baseName = dependency.split('/').pop()?.split('?')[0] || '';

    for (const ext of extensions) {
      const candidate = path.resolve(dir, baseName + ext);
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }

    // Try node_modules
    const nodeModulesPath = path.resolve(dir, 'node_modules', dependency);
    if (fs.existsSync(nodeModulesPath)) {
      if (fs.statSync(nodeModulesPath).isDirectory()) {
        const packageJson = path.resolve(nodeModulesPath, 'package.json');
        if (fs.existsSync(packageJson)) {
          try {
            const pkg = JSON.parse(fs.readFileSync(packageJson, 'utf-8'));
            const mainFile = pkg.main || 'index.js';
            return path.resolve(nodeModulesPath, mainFile);
          } catch {
            // Ignore
          }
        }
        const indexFile = path.resolve(nodeModulesPath, 'index.js');
        if (fs.existsSync(indexFile)) {
          return indexFile;
        }
      } else {
        return nodeModulesPath;
      }
    }

    return null;
  }

  /**
   * Count incoming edges for a node
   */
  private countIncomingEdges(nodeId: string): number {
    return this.edges.filter((e) => e.to === nodeId).length;
  }

  /**
   * Calculate graph metrics
   */
  private calculateMetrics(): GraphMetrics {
    const nodes = Array.from(this.graph.values());
    const totalNodes = nodes.length;
    const totalEdges = this.edges.length;
    const averageDegree = totalNodes > 0 ? (totalEdges * 2) / totalNodes : 0;

    // Calculate max depth (longest path)
    const maxDepth = this.calculateMaxDepth();

    // Count cycles
    const { hasCycles } = this.findStronglyConnectedComponents();

    // Calculate density (actual edges / possible edges)
    const maxPossibleEdges = (totalNodes * (totalNodes - 1)) / 2;
    const density = maxPossibleEdges > 0 ? totalEdges / maxPossibleEdges : 0;

    return {
      totalNodes,
      totalEdges,
      averageDegree,
      maxDepth,
      cycleCount: hasCycles ? 1 : 0,
      density,
    };
  }

  /**
   * Calculate maximum depth of the graph
   */
  private calculateMaxDepth(): number {
    let maxDepth = 0;

    for (const node of this.graph.keys()) {
      const depth = this.calculateDepth(node, new Set());
      maxDepth = Math.max(maxDepth, depth);
    }

    return maxDepth;
  }

  /**
   * Calculate depth from a node
   */
  private calculateDepth(nodeId: string, visited: Set<string>): number {
    if (visited.has(nodeId)) return 0;

    visited.add(nodeId);

    const neighbors = this.adjacencyList.get(nodeId) || [];
    if (neighbors.length === 0) return 0;

    let maxDepth = 0;
    for (const neighbor of neighbors) {
      maxDepth = Math.max(maxDepth, this.calculateDepth(neighbor, new Set(visited)));
    }

    return maxDepth + 1;
  }

  /**
   * Find strongly connected components using Tarjan's algorithm
   */
  private findStronglyConnectedComponents(): {
    stronglyConnectedComponents: string[][];
    hasCycles: boolean;
  } {
    const indexMap = new Map<string, number>();
    const lowlinkMap = new Map<string, number>();
    const stack: string[] = [];
    const onStack = new Set<string>();
    let index = 0;
    const components: string[][] = [];

    const strongconnect = (nodeId: string): void => {
      indexMap.set(nodeId, index);
      lowlinkMap.set(nodeId, index);
      index++;
      stack.push(nodeId);
      onStack.add(nodeId);

      for (const neighbor of this.adjacencyList.get(nodeId) || []) {
        if (!indexMap.has(neighbor)) {
          strongconnect(neighbor);
          lowlinkMap.set(
            nodeId,
            Math.min(lowlinkMap.get(nodeId)!, lowlinkMap.get(neighbor)!)
          );
        } else if (onStack.has(neighbor)) {
          lowlinkMap.set(
            nodeId,
            Math.min(lowlinkMap.get(nodeId)!, indexMap.get(neighbor)!)
          );
        }
      }

      if (lowlinkMap.get(nodeId) === indexMap.get(nodeId)) {
        const component: string[] = [];
        let poppedNode: string | undefined;

        do {
          poppedNode = stack.pop();
          onStack.delete(poppedNode!);
          component.push(poppedNode!);
        } while (poppedNode !== nodeId);

        if (component.length > 1) {
          components.push(component);
        }
      }
    };

    for (const nodeId of this.graph.keys()) {
      if (!indexMap.has(nodeId)) {
        strongconnect(nodeId);
      }
    }

    return {
      stronglyConnectedComponents: components,
      hasCycles: components.length > 0,
    };
  }

  /**
   * Find circular dependencies
   */
  findCircularDependencies(): CircularDependency[] {
    const { stronglyConnectedComponents } = this.findStronglyConnectedComponents();

    return stronglyConnectedComponents.map((component) => ({
      path: component,
      files: component,
    }));
  }

  /**
   * Export graph to DOT format for visualization
   */
  exportToDOT(): string {
    let dot = 'digraph DependencyGraph {\n';
    dot += '  rankdir=TB;\n';
    dot += '  node [shape=box];\n\n';

    // Add edges
    for (const edge of this.edges) {
      const fromName = path.basename(edge.from).replace(/\.[^/.]+$/, '');
      const toName = path.basename(edge.to).replace(/\.[^/.]+$/, '');
      dot += `  "${fromName}" -> "${toName}" [label="${edge.type}"];\n`;
    }

    dot += '\n}\n';
    return dot;
  }

  /**
   * Export to JSON format
   */
  exportToJSON(): string {
    const { nodes, edges, stronglyConnectedComponents, hasCycles, metrics } = this.build(process.cwd());
    return JSON.stringify(
      { nodes, edges, stronglyConnectedComponents, hasCycles, metrics },
      null,
      2
    );
  }
}

/**
 * Singleton instance
 */
export const dependencyGraphBuilder = new DependencyGraphBuilder();
