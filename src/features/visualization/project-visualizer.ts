/**
 * VIBE-CLI v0.0.2 - Project Visualizer
 * Visual codebase understanding and dependency maps
 */

import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import { DependencyGraphBuilder, DependencyGraph } from '../../core/codebase-analyzer/dependency-graph.js';

/**
 * Visual output format
 */
export type VisualizationFormat = 'ascii' | 'json' | 'dot' | 'svg' | 'mermaid';

/**
 * Graph node for visualization
 */
export interface VisualNode {
  id: string;
  label: string;
  type: 'file' | 'class' | 'function' | 'module' | 'component';
  size?: number;
  color?: string;
  shape?: string;
}

/**
 * Graph edge for visualization
 */
export interface VisualEdge {
  from: string;
  to: string;
  label?: string;
  type: 'imports' | 'extends' | 'implements' | 'calls' | 'uses' | 'exports';
  style?: 'solid' | 'dashed' | 'dotted';
}

/**
 * Visualization result
 */
export interface VisualizationResult {
  format: VisualizationFormat;
  content: string;
  filePath?: string;
}

/**
 * Architecture component
 */
export interface ArchitectureComponent {
  name: string;
  type: 'frontend' | 'backend' | 'database' | 'api' | 'service' | 'utility';
  description: string;
  files: string[];
  dependencies: string[];
  responsibilities: string[];
}

/**
 * Architecture layer
 */
export interface ArchitectureLayer {
  name: string;
  components: ArchitectureComponent[];
  description: string;
}

/**
 * Project Visualizer
 */
export class ProjectVisualizer {
  private dependencyGraphBuilder: DependencyGraphBuilder;

  constructor() {
    this.dependencyGraphBuilder = new DependencyGraphBuilder();
  }

  /**
   * Visualize project structure
   */
  visualizeProject(dirPath: string, format: VisualizationFormat = 'ascii'): VisualizationResult {
    switch (format) {
      case 'ascii':
        return this.visualizeAscii(dirPath);
      case 'json':
        return this.visualizeJson(dirPath);
      case 'dot':
        return this.visualizeDot(dirPath);
      case 'mermaid':
        return this.visualizeMermaid(dirPath);
      default:
        return this.visualizeAscii(dirPath);
    }
  }

  /**
   * Generate ASCII visualization
   */
  private visualizeAscii(dirPath: string): VisualizationResult {
    const lines: string[] = [];

    lines.push(chalk.bold('\n📁 Project Structure\n'));
    lines.push(chalk.gray('='.repeat(50)));
    lines.push('');

    const tree = this.buildDirectoryTree(dirPath);
    lines.push(this.formatTreeAscii(tree, 0));

    return {
      format: 'ascii',
      content: lines.join('\n'),
    };
  }

  /**
   * Build directory tree structure
   */
  private buildDirectoryTree(dirPath: string, depth = 0): any {
    if (depth > 5) return { name: '...', children: [] };

    const items = fs.readdirSync(dirPath, { withFileTypes: true });
    const tree: any = {
      name: path.basename(dirPath),
      children: [],
    };

    for (const item of items) {
      if (item.name.startsWith('.') || item.name === 'node_modules') continue;

      const itemPath = path.join(dirPath, item.name);

      if (item.isDirectory()) {
        tree.children.push(this.buildDirectoryTree(itemPath, depth + 1));
      } else {
        tree.children.push({ name: item.name, isFile: true });
      }
    }

    return tree;
  }

  /**
   * Format tree as ASCII
   */
  private formatTreeAscii(node: any, depth: number, prefix = ''): string {
    const lines: string[] = [];
    const isLast = !node.children || node.children.length === 0;
    const connector = isLast ? '└── ' : '├── ';

    lines.push(prefix + connector + chalk.cyan(node.name));

    if (node.children) {
      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];
        const newPrefix = prefix + (isLast ? '    ' : '│   ');
        lines.push(this.formatTreeAscii(child, depth + 1, newPrefix));
      }
    }

    return lines.join('\n');
  }

  /**
   * Generate JSON visualization
   */
  private visualizeJson(dirPath: string): VisualizationResult {
    const tree = this.buildDirectoryTree(dirPath);

    return {
      format: 'json',
      content: JSON.stringify(tree, null, 2),
    };
  }

  /**
   * Generate DOT graph
   */
  private visualizeDot(dirPath: string): VisualizationResult {
    const graph = this.dependencyGraphBuilder.build(dirPath);

    const lines: string[] = [];

    lines.push('digraph DependencyGraph {');
    lines.push('  rankdir=TB;');
    lines.push('  node [shape=box, style=rounded];');
    lines.push('');

    // Add nodes
    for (const node of graph.nodes) {
      const color = this.getNodeColor(node.type);
      lines.push(`  "${node.id}" [label="${node.name}" fillcolor="${color}" style=filled];`);
    }

    lines.push('');

    // Add edges
    for (const edge of graph.edges) {
      const style = this.getEdgeStyle(edge.type);
      lines.push(`  "${edge.from}" -> "${edge.to}" [label="${edge.type}" style="${style}"];`);
    }

    lines.push('}');

    return {
      format: 'dot',
      content: lines.join('\n'),
    };
  }

  /**
   * Generate Mermaid diagram
   */
  private visualizeMermaid(dirPath: string): VisualizationResult {
    const graph = this.dependencyGraphBuilder.build(dirPath);

    const lines: string[] = [];

    lines.push('```mermaid');
    lines.push('graph TD');

    // Add nodes
    for (const node of graph.nodes) {
      const color = this.getMermaidNodeColor(node.type);
      lines.push(`  ${this.sanitizeId(node.id)}["${node.name}"]:::${node.type}`);
    }

    lines.push('');

    // Add class definitions
    lines.push('  classDef file fill:#e1f5fe');
    lines.push('  classDef class fill:#fce4ec');
    lines.push('  classDef function fill:#f3e5f5');
    lines.push('  classDef module fill:#e8f5e9');
    lines.push('  classDef component fill:#fff3e0');

    lines.push('');

    // Add edges
    for (const edge of graph.edges) {
      lines.push(`  ${this.sanitizeId(edge.from)} -->|${edge.type}| ${this.sanitizeId(edge.to)}`);
    }

    lines.push('```');

    return {
      format: 'mermaid',
      content: lines.join('\n'),
    };
  }

  /**
   * Visualize dependencies
   */
  visualizeDependencies(dirPath: string, format: VisualizationFormat = 'ascii'): VisualizationResult {
    const graph = this.dependencyGraphBuilder.build(dirPath);

    const lines: string[] = [];

    if (format === 'ascii') {
      lines.push(chalk.bold('\n🔗 Dependency Graph\n'));
      lines.push(chalk.gray('='.repeat(50)));
      lines.push('');

      lines.push(chalk.bold('Metrics:'));
      lines.push(`  Nodes: ${graph.metrics.totalNodes}`);
      lines.push(`  Edges: ${graph.metrics.totalEdges}`);
      lines.push(`  Average Degree: ${graph.metrics.averageDegree.toFixed(2)}`);
      lines.push(`  Max Depth: ${graph.metrics.maxDepth}`);
      lines.push(`  Density: ${(graph.metrics.density * 100).toFixed(2)}%`);
      lines.push('');

      if (graph.hasCycles) {
        lines.push(chalk.red('⚠️  Circular dependencies detected!'));
        lines.push('');
        for (const component of graph.stronglyConnectedComponents) {
          lines.push(chalk.yellow(`  Cycle: ${component.join(' → ')}`));
        }
        lines.push('');
      }

      lines.push(chalk.bold('Top Connected Files:'));
      const topNodes = graph.nodes
        .sort((a, b) => (b.incomingEdges + b.outgoingEdges) - (a.incomingEdges + a.outgoingEdges))
        .slice(0, 10);

      for (const node of topNodes) {
        lines.push(`  ${chalk.cyan(node.name)}: ${node.incomingEdges} incoming, ${node.outgoingEdges} outgoing`);
      }
    } else if (format === 'json') {
      return {
        format: 'json',
        content: JSON.stringify(graph, null, 2),
      };
    } else if (format === 'dot') {
      return this.visualizeDot(dirPath);
    }

    return {
      format: 'ascii',
      content: lines.join('\n'),
    };
  }

  /**
   * Analyze architecture with AI assistance
   */
  async analyzeArchitectureWithAI(dirPath: string, provider: any): Promise<string> {
    const layers = this.analyzeArchitecture(dirPath);
    const summary = this.formatArchitecture(layers);

    const prompt = `Analyze this project architecture and provide 3-5 recommendations for improvement (e.g., modularity, patterns, decoupling).
    
Architecture Summary:
${summary}`;

    try {
      const response = await provider.chat([{ role: 'system', content: 'You are a senior software architect.' }, { role: 'user', content: prompt }]);
      return response.content;
    } catch {
      return 'AI analysis unavailable.';
    }
  }

  /**
   * Analyze and visualize architecture
   */
  analyzeArchitecture(dirPath: string): ArchitectureLayer[] {
    const layers: ArchitectureLayer[] = [];
    const { glob } = require('fast-glob');

    const files = glob.sync(['**/*.{ts,js}'], {
      cwd: dirPath,
      ignore: ['node_modules/**', '.git/**', 'dist/**'],
    });

    // Identify components based on directory structure
    const components = new Map<string, ArchitectureComponent>();

    for (const file of files) {
      const parts = file.split('/');
      const componentName = parts[0] || 'root';

      if (!components.has(componentName)) {
        components.set(componentName, {
          name: componentName,
          type: this.inferComponentType(componentName),
          description: `${componentName} module`,
          files: [],
          dependencies: [],
          responsibilities: [],
        });
      }

      components.get(componentName)!.files.push(file);
    }

    // Categorize into layers
    const frontendComponents: ArchitectureComponent[] = [];
    const backendComponents: ArchitectureComponent[] = [];
    const utilityComponents: ArchitectureComponent[] = [];

    for (const component of components.values()) {
      if (['src', 'components', 'pages', 'views'].includes(component.name)) {
        frontendComponents.push(component);
      } else if (['api', 'services', 'controllers', 'models'].includes(component.name)) {
        backendComponents.push(component);
      } else {
        utilityComponents.push(component);
      }
    }

    if (frontendComponents.length > 0) {
      layers.push({
        name: 'Frontend',
        description: 'User interface and presentation layer',
        components: frontendComponents,
      });
    }

    if (backendComponents.length > 0) {
      layers.push({
        name: 'Backend',
        description: 'Server-side logic and API layer',
        components: backendComponents,
      });
    }

    if (utilityComponents.length > 0) {
      layers.push({
        name: 'Utilities',
        description: 'Shared utilities and helpers',
        components: utilityComponents,
      });
    }

    return layers;
  }

  /**
   * Format architecture for display
   */
  formatArchitecture(layers: ArchitectureLayer[]): string {
    const lines: string[] = [];

    lines.push(chalk.bold('\n🏗️  Architecture Overview\n'));
    lines.push(chalk.gray('='.repeat(50)));
    lines.push('');

    for (const layer of layers) {
      lines.push(chalk.bold(`📦 ${layer.name}`));
      lines.push(chalk.gray(layer.description));
      lines.push('');

      for (const component of layer.components) {
        const icon = this.getComponentIcon(component.type);
        lines.push(`${icon} ${chalk.cyan(component.name)} (${component.files.length} files)`);

        if (component.files.length > 0) {
          const sampleFiles = component.files.slice(0, 3).map((f) => `  └── ${f}`).join('\n');
          lines.push(chalk.gray(sampleFiles));
          if (component.files.length > 3) {
            lines.push(chalk.gray(`  └── ... and ${component.files.length - 3} more`));
          }
        }
        lines.push('');
      }
    }

    return lines.join('\n');
  }

  /**
   * Generate SVG treemap
   */
  generateTreemap(dirPath: string): string {
    const { glob } = require('fast-glob');
    const files = glob.sync(['**/*.{ts,js,py,java}'], {
      cwd: dirPath,
      ignore: ['node_modules/**', '.git/**', 'dist/**'],
    });

    // Calculate file sizes
    const fileSizes: Array<{ path: string; size: number }> = [];

    for (const file of files) {
      const filePath = path.join(dirPath, file);
      try {
        const stats = fs.statSync(filePath);
        fileSizes.push({ path: file, size: stats.size });
      } catch {
        // Skip
      }
    }

    // Sort by size
    fileSizes.sort((a, b) => b.size - a.size);

    // Generate SVG
    const totalSize = fileSizes.reduce((sum, f) => sum + f.size, 0);
    let currentX = 0;
    const boxWidth = 800;
    const boxHeight = 400;

    const lines: string[] = [];
    lines.push(`<svg viewBox="0 0 ${boxWidth} ${boxHeight}" xmlns="http://www.w3.org/2000/svg">`);
    lines.push('  <style>');
    lines.push('    .box { stroke: white; stroke-width: 1; }');
    lines.push('    .label { font-size: 10px; fill: white; }');
    lines.push('  </style>');

    for (const file of fileSizes.slice(0, 20)) {
      const width = Math.max(10, (file.size / totalSize) * boxWidth);
      const height = Math.max(10, (file.size / totalSize) * boxHeight * 5);

      const color = this.getSizeColor(file.size);
      const label = path.basename(file.path).substring(0, 15);

      lines.push(`  <rect x="${currentX}" y="0" width="${width}" height="${Math.min(height, boxHeight)}" fill="${color}" class="box"/>`);
      lines.push(`  <text x="${currentX + width / 2}" y="${Math.min(height, boxHeight) / 2}" text-anchor="middle" class="label">${label}</text>`);

      currentX += width + 2;
      if (currentX > boxWidth) break;
    }

    lines.push('</svg>');

    return lines.join('\n');
  }

  /**
   * Helper: Get node color for DOT
   */
  private getNodeColor(type: string): string {
    const colors: Record<string, string> = {
      file: '#e3f2fd',
      class: '#fce4ec',
      function: '#f3e5f5',
      module: '#e8f5e9',
      component: '#fff3e0',
    };
    return colors[type] || '#eeeeee';
  }

  /**
   * Helper: Get mermaid node color
   */
  private getMermaidNodeColor(type: string): string {
    const colors: Record<string, string> = {
      file: '#e3f2fd',
      class: '#fce4ec',
      function: '#f3e5f5',
      module: '#e8f5e9',
      component: '#fff3e0',
    };
    return colors[type] || '#eeeeee';
  }

  /**
   * Helper: Get edge style
   */
  private getEdgeStyle(type: string): string {
    const styles: Record<string, string> = {
      imports: 'solid',
      extends: 'dashed',
      implements: 'dotted',
      calls: 'solid',
      uses: 'dashed',
      exports: 'solid',
    };
    return styles[type] || 'solid';
  }

  /**
   * Helper: Sanitize ID for Mermaid/DOT
   */
  private sanitizeId(id: string): string {
    return id.replace(/[^a-zA-Z0-9_]/g, '_').replace(/^_/, '');
  }

  /**
   * Helper: Infer component type
   */
  private inferComponentType(name: string): ArchitectureComponent['type'] {
    if (['components', 'ui', 'widgets'].includes(name)) return 'frontend';
    if (['api', 'routes', 'endpoints'].includes(name)) return 'api';
    if (['services', 'business'].includes(name)) return 'service';
    if (['models', 'entities', 'schemas'].includes(name)) return 'database';
    if (['utils', 'helpers', 'lib'].includes(name)) return 'utility';
    return 'backend';
  }

  /**
   * Helper: Get component icon
   */
  private getComponentIcon(type: ArchitectureComponent['type']): string {
    const icons: Record<string, string> = {
      frontend: '🖥️',
      backend: '⚙️',
      database: '🗄️',
      api: '🔌',
      service: '🔧',
      utility: '🛠️',
    };
    return icons[type] || '📦';
  }

  /**
   * Helper: Get size color for treemap
   */
  private getSizeColor(size: number): string {
    if (size > 50000) return '#ef5350';
    if (size > 20000) return '#ff7043';
    if (size > 10000) return '#ffca28';
    if (size > 5000) return '#66bb6a';
    return '#42a5f5';
  }

  /**
   * Export visualization to file
   */
  exportVisualization(result: VisualizationResult, outputPath: string): void {
    fs.writeFileSync(outputPath, result.content);
  }
}

/**
 * Singleton instance
 */
export const projectVisualizer = new ProjectVisualizer();
