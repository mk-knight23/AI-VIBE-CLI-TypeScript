/**
 * VIBE-CLI v0.0.2 - Documentation Generator
 * Generate code explanations, docstrings, and API documentation
 */

import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';

/**
 * Language type
 */
export type LanguageType =
  | 'typescript'
  | 'javascript'
  | 'python'
  | 'java'
  | 'cpp'
  | 'c'
  | 'go'
  | 'rust'
  | 'ruby'
  | 'php'
  | 'unknown';

/**
 * Code explanation result
 */
export interface CodeExplanation {
  summary: string;
  purpose: string;
  inputs: string[];
  outputs: string[];
  dependencies: string[];
  complexity?: string;
  keyConcepts: string[];
  lineByLine?: LineExplanation[];
}

/**
 * Line-by-line explanation
 */
export interface LineExplanation {
  lineNumber: number;
  line: string;
  explanation: string;
}

/**
 * Generated docstring
 */
export interface GeneratedDocstring {
  content: string;
  format: 'jsdoc' | 'tsdoc' | 'avadoc' | 'pydoc' | 'javadoc' | 'docblock';
  template: string;
}

/**
 * API documentation
 */
export interface APIDocumentation {
  file: string;
  functions: FunctionDoc[];
  classes: ClassDoc[];
  interfaces: InterfaceDoc[];
  exports: ExportDoc[];
  overview: string;
}

/**
 * Function documentation
 */
export interface FunctionDoc {
  name: string;
  description: string;
  parameters: ParameterDoc[];
  returns: ReturnDoc;
  throws?: string[];
  examples: string[];
  visibility: 'public' | 'private' | 'protected';
  isAsync: boolean;
}

/**
 * Parameter documentation
 */
export interface ParameterDoc {
  name: string;
  type: string;
  description: string;
  optional: boolean;
  defaultValue?: string;
}

/**
 * Return documentation
 */
export interface ReturnDoc {
  type: string;
  description: string;
}

/**
 * Class documentation
 */
export interface ClassDoc {
  name: string;
  description: string;
  extends?: string;
  implements?: string[];
  properties: PropertyDoc[];
  methods: FunctionDoc[];
  examples: string[];
}

/**
 * Property documentation
 */
export interface PropertyDoc {
  name: string;
  type: string;
  description: string;
  visibility: 'public' | 'private' | 'protected';
  readonly: boolean;
  defaultValue?: string;
}

/**
 * Interface documentation
 */
export interface InterfaceDoc {
  name: string;
  description: string;
  properties: PropertyDoc[];
  methods: FunctionDoc[];
}

/**
 * Export documentation
 */
export interface ExportDoc {
  name: string;
  type: 'function' | 'class' | 'interface' | 'variable' | 'type';
  documentation: string;
}

/**
 * Documentation generator options
 */
export interface DocumentationOptions {
  format?: 'jsdoc' | 'tsdoc' | 'avadoc' | 'pydoc' | 'javadoc';
  includeExamples?: boolean;
  verbose?: boolean;
}

/**
 * Documentation Generator
 */
export class DocumentationGenerator {
  private readonly languageExtensions: Record<string, LanguageType> = {
    '.ts': 'typescript',
    '.tsx': 'typescript',
    '.js': 'javascript',
    '.jsx': 'javascript',
    '.py': 'python',
    '.java': 'java',
    '.cpp': 'cpp',
    '.cc': 'cpp',
    '.c': 'c',
    '.h': 'c',
    '.go': 'go',
    '.rs': 'rust',
    '.rb': 'ruby',
    '.php': 'php',
  };

  /**
   * Explain code in natural language
   */
  async explainCode(filePath: string, provider?: any): Promise<CodeExplanation> {
    const absolutePath = path.isAbsolute(filePath)
      ? filePath
      : path.join(process.cwd(), filePath);

    if (!fs.existsSync(absolutePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const content = fs.readFileSync(absolutePath, 'utf-8');
    const language = this.detectLanguage(filePath);

    if (provider) {
      const prompt = `Explain this ${language} code in natural language. Provide a summary, its purpose, inputs, outputs, key concepts, and a concise line-by-line breakdown.
      
Code:
${content}

Respond with a JSON object: {summary, purpose, inputs: string[], outputs: string[], keyConcepts: string[], lineByLine: {lineNumber, line, explanation}[]}`;

      try {
        const response = await provider.chat([{ role: 'system', content: 'You are an expert developer explaining code.' }, { role: 'user', content: prompt }]);
        return JSON.parse(response.content.trim().replace(/```json/g, '').replace(/```/g, ''));
      } catch {
        // Fallback to local
      }
    }

    // Generate explanation based on language
    const lines = content.split('\n');
    const summary = this.generateSummary(lines, language);
    const purpose = this.inferPurpose(content, language);
    const { inputs, outputs } = this.findInputsOutputs(content, language);
    const keyConcepts = this.findKeyConcepts(content);
    const lineByLine = this.explainLineByLine(lines);

    return {
      summary,
      purpose,
      inputs,
      outputs,
      dependencies: this.findDependencies(content, language),
      keyConcepts,
      lineByLine,
    };
  }

  /**
   * Generate docstring for a function
   */
  generateDocstring(
    functionSignature: string,
    options: DocumentationOptions = {}
  ): GeneratedDocstring {
    const { format = 'jsdoc' } = options;

    const parsed = this.parseFunctionSignature(functionSignature);
    let content = '';
    let template = '';

    switch (format) {
      case 'tsdoc':
      case 'jsdoc':
        content = this.generateJSDoc(parsed);
        template = '/**\n * ${description}\n * @param ${param} ${description}\n * @returns ${description}\n */';
        break;
      case 'avadoc':
        content = this.generateADoc(parsed);
        template = '/**\n * ${description}\n * @param ${param} ${description}\n * @return ${description}\n */';
        break;
      case 'pydoc':
        content = this.generatePyDoc(parsed);
        template = '"""${description}\n\nArgs:\n    ${param}: ${description}\n\nReturns:\n    ${description}\n"""';
        break;
      case 'javadoc':
        content = this.generateJavadoc(parsed);
        template = '/**\n * ${description}\n * @param ${param} ${description}\n * @return ${description}\n */';
        break;
    }

    return {
      content,
      format,
      template,
    };
  }

  /**
   * Generate API documentation for a directory
   */
  async generateAPIDoc(
    dirPath: string,
    options: DocumentationOptions = {}
  ): Promise<APIDocumentation[]> {
    const absolutePath = path.isAbsolute(dirPath)
      ? dirPath
      : path.join(process.cwd(), dirPath);

    if (!fs.existsSync(absolutePath)) {
      throw new Error(`Directory not found: ${dirPath}`);
    }

    const docs: APIDocumentation[] = [];

    // Find all source files
    const files = this.findSourceFiles(absolutePath);

    for (const file of files) {
      try {
        const doc = await this.generateFileDoc(file, options);
        if (doc) {
          docs.push(doc);
        }
      } catch (error) {
        // Skip files that can't be parsed
        console.warn(chalk.yellow(`⚠ Could not parse: ${file}`));
      }
    }

    return docs;
  }

  /**
   * Generate README section for a directory
   */
  async generateREADMESection(
    dirPath: string,
    options: DocumentationOptions = {}
  ): Promise<string> {
    const docs = await this.generateAPIDoc(dirPath, options);

    if (docs.length === 0) {
      return '# Documentation\n\nNo API documentation available.';
    }

    let markdown = '# API Documentation\n\n';
    markdown += `Generated from ${docs.length} file(s)\n\n`;

    for (const doc of docs) {
      markdown += `## ${path.basename(doc.file)}\n\n`;

      if (doc.overview) {
        markdown += `${doc.overview}\n\n`;
      }

      // Classes
      for (const cls of doc.classes) {
        markdown += `### Class: ${cls.name}\n\n`;
        markdown += `${cls.description}\n\n`;

        if (cls.properties.length > 0) {
          markdown += '#### Properties\n\n';
          markdown += '| Name | Type | Description |\n';
          markdown += '|------|------|-------------|\n';
          for (const prop of cls.properties) {
            markdown += `| ${prop.name} | \`${prop.type}\` | ${prop.description} |\n`;
          }
          markdown += '\n';
        }

        if (cls.methods.length > 0) {
          markdown += '#### Methods\n\n';
          for (const method of cls.methods) {
            markdown += `##### ${method.name}(${method.parameters.map((p) => p.name).join(', ')})\n\n`;
            markdown += `${method.description}\n\n`;
          }
        }
      }

      // Functions
      for (const func of doc.functions) {
        markdown += `### Function: ${func.name}\n\n`;
        markdown += `${func.description}\n\n`;

        if (func.parameters.length > 0) {
          markdown += '**Parameters:**\n\n';
          for (const param of func.parameters) {
            markdown += `- \`${param.name}\` (\`${param.type}\`): ${param.description}\n`;
          }
          markdown += '\n';
        }

        markdown += `**Returns:** \`${func.returns.type}\` - ${func.returns.description}\n\n`;
      }
    }

    return markdown;
  }

  /**
   * Detect language from file extension
   */
  private detectLanguage(filePath: string): LanguageType {
    const ext = path.extname(filePath).toLowerCase();
    return this.languageExtensions[ext] || 'unknown';
  }

  /**
   * Generate summary from lines
   */
  private generateSummary(lines: string[], language: LanguageType): string {
    // Find first significant line (not imports/comments)
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('#')) {
        continue;
      }

      // Class definition
      if (/\b(class|interface|type)\s+\w+/.test(trimmed)) {
        const match = trimmed.match(/(class|interface|type)\s+(\w+)/);
        if (match) {
          return `A ${language} ${match[1]} definition for "${match[2]}".`;
        }
      }

      // Function definition
      if (/\b(function|def|fun|func)\s+\w+/.test(trimmed)) {
        const match = trimmed.match(/(function|def|fun|func)\s+(\w+)/);
        if (match) {
          return `A ${match[1]} definition for "${match[2]}".`;
        }
      }

      break;
    }

    return `A ${language} code file.`;
  }

  /**
   * Infer purpose from code content
   */
  private inferPurpose(content: string, language: LanguageType): string {
    // Look for comments at the start
    const lines = content.split('\n');
    const commentPatterns: Record<LanguageType, RegExp[]> = {
      typescript: [/^\s*\/\/.*/, /^\s*\/\*[\s\S]*?\*\//],
      javascript: [/^\s*\/\/.*/, /^\s*\/\*[\s\S]*?\*\//],
      python: [/^\s*#.*/, /^\s*["']{3}[\s\S]*?["']{3}/],
      java: [/^\s*\/\/.*/, /^\s*\/\*[\s\S]*?\*\//],
      cpp: [/^\s*\/\/.*/, /^\s*\/\*[\s\S]*?\*\//],
      c: [/^\s*\/\/.*/, /^\s*\/\*[\s\S]*?\*\//],
      go: [/^\s*\/\/.*/],
      rust: [/^\s*\/\/.*/, /^\s*\/\*[\s\S]*?\*\//],
      ruby: [/^\s*#.*/],
      php: [/^\s*\/\/.*/, /^\s*#.*/, /^\s*\/\*[\s\S]*?\*\//],
      unknown: [],
    };

    for (const pattern of commentPatterns[language] || []) {
      const match = content.match(pattern);
      if (match) {
        return match[0].replace(/^\s*[\/\*#]+/, '').trim();
      }
    }

    return 'Purpose not documented.';
  }

  /**
   * Find inputs and outputs
   */
  private findInputsOutputs(
    content: string,
    language: LanguageType
  ): { inputs: string[]; outputs: string[] } {
    const inputs: string[] = [];
    const outputs: string[] = [];

    // Common input patterns
    const inputPatterns = [
      /(?:function|def|fun|func|method)\s+\w+\s*\(([^)]*)\)/,
      /(?:class|interface)\s+\w+\s*(?:extends|implements)?\s*([^{]*)/,
    ];

    for (const pattern of inputPatterns) {
      const match = content.match(pattern);
      if (match) {
        const params = match[1].split(',').filter(Boolean);
        for (const param of params) {
          const paramName = param.trim().split(/\s+/)[0];
          if (paramName && !inputs.includes(paramName)) {
            inputs.push(paramName);
          }
        }
      }
    }

    // Common output patterns
    const outputPatterns = [
      /(?:return|yield)\s+(\w+)/g,
      /(?:console\.(log|debug|info|warn|error))\s*\(/g,
    ];

    for (const pattern of outputPatterns) {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        const value = match[1];
        if (value && !outputs.includes(value)) {
          outputs.push(value);
        }
      }
    }

    return { inputs, outputs };
  }

  /**
   * Find dependencies
   */
  private findDependencies(content: string, language: LanguageType): string[] {
    const dependencies: string[] = [];

    const importPatterns: Record<LanguageType, RegExp[]> = {
      typescript: [/import\s+(?:\{[^}]*\}|\w+)\s+from\s+['"]([^'"]+)['"]/g],
      javascript: [/import\s+(?:\{[^}]*\}|\w+)\s+from\s+['"]([^'"]+)['"]/g, /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g],
      python: [/^import\s+(\w+)/gm, /^from\s+(\w+)/gm],
      java: [/import\s+([\w.]+);/g],
      cpp: [/#include\s+[<"]([^>"]+)[>"]/g],
      c: [/#include\s+[<"]([^>"]+)[>"]/g],
      go: [/import\s+\([^)]*\)/g],
      rust: [/use\s+(\w+)/g],
      ruby: [/require\s+['"]([^'"]+)['"]/g],
      php: [/(?:require|include)(?:_once)?\s+['"]([^'"]+)['"]/g],
      unknown: [],
    };

    const patterns = importPatterns[language] || [];

    for (const pattern of patterns) {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        const dep = match[1];
        if (dep && !dependencies.includes(dep)) {
          dependencies.push(dep);
        }
      }
    }

    return dependencies;
  }

  /**
   * Find key concepts
   */
  private findKeyConcepts(content: string): string[] {
    const concepts: string[] = [];

    // Common programming concepts
    const conceptPatterns = [
      { pattern: /\b(class|interface|type)\s+(\w+)/g, concept: 'Type Definition' },
      { pattern: /\b(function|def|fun|func)\s+(\w+)/g, concept: 'Function' },
      { pattern: /\b(async|await)\b/g, concept: 'Async/Await' },
      { pattern: /\b(promise|Promise)\b/g, concept: 'Promise' },
      { pattern: /\b(observable|Observable)\b/g, concept: 'Observable' },
      { pattern: /\b(lambda|=>)\b/g, concept: 'Arrow Function' },
      { pattern: /\b(decorator|@)\w+/g, concept: 'Decorator' },
      { pattern: /\b(try|catch|finally)\b/g, concept: 'Error Handling' },
      { pattern: /\b(forEach|map|filter|reduce)\b/g, concept: 'Array Methods' },
      { pattern: /\b(useState|useEffect|useRef)\b/g, concept: 'React Hook' },
    ];

    for (const { pattern, concept } of conceptPatterns) {
      if (pattern.test(content) && !concepts.includes(concept)) {
        concepts.push(concept);
      }
    }

    return concepts;
  }

  /**
   * Explain line by line
   */
  private explainLineByLine(lines: string[]): LineExplanation[] {
    return lines
      .filter((line) => line.trim().length > 0 && !this.isComment(line))
      .slice(0, 50) // Limit to first 50 significant lines
      .map((line, index) => ({
        lineNumber: index + 1,
        line: line.trim(),
        explanation: this.explainLine(line),
      }));
  }

  /**
   * Check if line is a comment
   */
  private isComment(line: string): boolean {
    const trimmed = line.trim();
    return (
      trimmed.startsWith('//') ||
      trimmed.startsWith('/*') ||
      trimmed.startsWith('*') ||
      trimmed.startsWith('#') ||
      trimmed.startsWith('"""') ||
      trimmed.startsWith("'''")
    );
  }

  /**
   * Explain a single line
   */
  private explainLine(line: string): string {
    const trimmed = line.trim();

    // Import statement
    if (/^import\s+/.test(trimmed)) {
      return 'Import statement - brings in external code';
    }

    // Export statement
    if (/^export\s+/.test(trimmed)) {
      return 'Export statement - makes code available to other modules';
    }

    // Function definition
    if (/^(?:function|def|fun|func)\s+\w+/.test(trimmed)) {
      return 'Function definition - creates a reusable block of code';
    }

    // Class definition
    if (/^class\s+\w+/.test(trimmed)) {
      return 'Class definition - creates a blueprint for objects';
    }

    // Return statement
    if (/^return\s+/.test(trimmed)) {
      return 'Return statement - exits function with a value';
    }

    // Variable declaration
    if (/^(?:const|let|var|val|var)\s+\w+/.test(trimmed)) {
      return 'Variable declaration - stores a value';
    }

    // If statement
    if (/^if\s*\(/.test(trimmed)) {
      return 'Conditional statement - executes code based on condition';
    }

    // For loop
    if (/^for\s*\(/.test(trimmed)) {
      return 'Loop - repeats code for each iteration';
    }

    // Try/catch
    if (/^try\s*\{/.test(trimmed)) {
      return 'Try block - attempts code that may throw errors';
    }

    return '';
  }

  /**
   * Parse function signature
   */
  private parseFunctionSignature(signature: string): {
    name: string;
    parameters: { name: string; type: string; optional: boolean }[];
    returnType: string;
    description: string;
  } {
    // Extract name
    const nameMatch = signature.match(/(?:function|def|fun|func)\s+(\w+)/);
    const name = nameMatch ? nameMatch[1] : 'unknown';

    // Extract parameters
    const paramsMatch = signature.match(/\(([^)]*)\)/);
    const parameters: { name: string; type: string; optional: boolean }[] = [];

    if (paramsMatch) {
      const params = paramsMatch[1].split(',').filter(Boolean);
      for (const param of params) {
        const trimmed = param.trim();
        const optional = trimmed.includes('?') || trimmed.includes('=');
        const nameMatch = trimmed.match(/(\w+)/);
        parameters.push({
          name: nameMatch ? nameMatch[1] : trimmed,
          type: 'unknown',
          optional,
        });
      }
    }

    // Extract return type
    const returnMatch = signature.match(/(?::|->|returns?)\s*(\w+)/i);
    const returnType = returnMatch ? returnMatch[1] : 'void';

    return {
      name,
      parameters,
      returnType,
      description: '',
    };
  }

  /**
   * Generate JSDoc
   */
  private generateJSDoc(parsed: ReturnType<typeof this.parseFunctionSignature>): string {
    let doc = '/**\n';
    doc += ` * ${parsed.description || 'Description of ' + parsed.name}\n`;

    for (const param of parsed.parameters) {
      doc += ` * @param {unknown} ${param.name} - Description of ${param.name}\n`;
    }

    doc += ` * @returns {${parsed.returnType}} Description of return value\n`;
    doc += ' */';

    return doc;
  }

  /**
   * Generate autodoc
   */
  private generateADoc(parsed: ReturnType<typeof this.parseFunctionSignature>): string {
    let doc = '/**\n';
    doc += ` * ${parsed.description || 'Description of ' + parsed.name}\n`;

    for (const param of parsed.parameters) {
      doc += ` * @param ${param.name} Description of ${param.name}\n`;
    }

    doc += ` * @return ${parsed.returnType} Description of return value\n`;
    doc += ' */';

    return doc;
  }

  /**
   * Generate PyDoc
   */
  private generatePyDoc(parsed: ReturnType<typeof this.parseFunctionSignature>): string {
    let doc = '"""\n';
    doc += `${parsed.description || 'Description of ' + parsed.name}\n\n`;

    if (parsed.parameters.length > 0) {
      doc += 'Args:\n';
      for (const param of parsed.parameters) {
        doc += `    ${param.name}: Description of ${param.name}\n`;
      }
      doc += '\n';
    }

    doc += `Returns:\n`;
    doc += `    ${parsed.returnType}: Description of return value\n`;
    doc += '"""';

    return doc;
  }

  /**
   * Generate Javadoc
   */
  private generateJavadoc(parsed: ReturnType<typeof this.parseFunctionSignature>): string {
    let doc = '/**\n';
    doc += ` * ${parsed.description || 'Description of ' + parsed.name}\n`;

    for (const param of parsed.parameters) {
      doc += ` * @param ${param.name} Description of ${param.name}\n`;
    }

    doc += ` * @return ${parsed.returnType} Description of return value\n`;
    doc += ' */';

    return doc;
  }

  /**
   * Find source files in directory
   */
  private findSourceFiles(dirPath: string): string[] {
    const files: string[] = [];
    const extensions = Object.keys(this.languageExtensions);

    const scan = (dir: string) => {
      if (!fs.existsSync(dir)) return;

      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
          scan(fullPath);
        } else if (entry.isFile() && extensions.includes(path.extname(entry.name))) {
          files.push(fullPath);
        }
      }
    };

    scan(dirPath);
    return files;
  }

  /**
   * Generate documentation for a single file
   */
  private async generateFileDoc(
    filePath: string,
    _options: DocumentationOptions
  ): Promise<APIDocumentation | null> {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');

      // Basic extraction - in a real implementation, this would parse the AST
      const functions = this.extractFunctions(content);
      const classes = this.extractClasses(content);
      const exports = this.extractExports(content);

      return {
        file: filePath,
        functions,
        classes: [],
        interfaces: [],
        exports,
        overview: this.inferPurpose(content, this.detectLanguage(filePath)),
      };
    } catch {
      return null;
    }
  }

  /**
   * Extract functions from content
   */
  private extractFunctions(content: string): FunctionDoc[] {
    const functions: FunctionDoc[] = [];
    const pattern = /(?:function|def|fun|func)\s+(\w+)\s*\(([^)]*)\)/g;
    let match;

    while ((match = pattern.exec(content)) !== null) {
      const name = match[1];
      const params = match[2].split(',').filter(Boolean);

      functions.push({
        name,
        description: `Function ${name}`,
        parameters: params.map((p) => ({
          name: p.trim(),
          type: 'unknown',
          description: `Parameter ${p.trim()}`,
          optional: false,
        })),
        returns: {
          type: 'unknown',
          description: 'Return value',
        },
        examples: [],
        visibility: 'public',
        isAsync: false,
      });
    }

    return functions;
  }

  /**
   * Extract classes from content
   */
  private extractClasses(content: string): ClassDoc[] {
    const classes: ClassDoc[] = [];
    const pattern = /class\s+(\w+)(?:\s+extends\s+(\w+))?/g;
    let match;

    while ((match = pattern.exec(content)) !== null) {
      classes.push({
        name: match[1],
        description: `Class ${match[1]}`,
        extends: match[2],
        properties: [],
        methods: [],
        examples: [],
      });
    }

    return classes;
  }

  /**
   * Extract exports from content
   */
  private extractExports(content: string): ExportDoc[] {
    const exports: ExportDoc[] = [];
    const pattern = /export\s+(?:const|let|var|function|class|interface|type)\s+(\w+)/g;
    let match;

    while ((match = pattern.exec(content)) !== null) {
      exports.push({
        name: match[1],
        type: 'variable',
        documentation: `Exported ${match[1]}`,
      });
    }

    return exports;
  }
}

/**
 * Singleton instance
 */
export const documentationGenerator = new DocumentationGenerator();
