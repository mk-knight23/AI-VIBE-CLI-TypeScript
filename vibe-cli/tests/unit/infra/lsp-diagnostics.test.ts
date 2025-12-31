import { describe, it, expect } from 'vitest';
import { formatDiagnostics } from '../../../src/lsp/diagnostics';
import type { DiagnosticsResult } from '../../../src/lsp/diagnostics';

describe('LSP Diagnostics', () => {
  describe('formatDiagnostics', () => {
    it('should format empty diagnostics', () => {
      const result: DiagnosticsResult = {
        diagnostics: [],
        errorCount: 0,
        warningCount: 0
      };
      
      const formatted = formatDiagnostics(result);
      expect(formatted).toContain('No diagnostics found');
    });

    it('should format diagnostics with errors', () => {
      const result: DiagnosticsResult = {
        diagnostics: [
          {
            file: 'src/test.ts',
            line: 10,
            column: 5,
            severity: 'error',
            message: 'Type error',
            code: 'TS2322',
            source: 'typescript'
          }
        ],
        errorCount: 1,
        warningCount: 0
      };
      
      const formatted = formatDiagnostics(result);
      expect(formatted).toContain('1 errors');
      expect(formatted).toContain('src/test.ts');
      expect(formatted).toContain('Type error');
      expect(formatted).toContain('TS2322');
    });

    it('should format diagnostics with warnings', () => {
      const result: DiagnosticsResult = {
        diagnostics: [
          {
            file: 'src/test.ts',
            line: 5,
            column: 1,
            severity: 'warning',
            message: 'Unused variable',
            code: 'no-unused-vars',
            source: 'eslint'
          }
        ],
        errorCount: 0,
        warningCount: 1
      };
      
      const formatted = formatDiagnostics(result);
      expect(formatted).toContain('1 warnings');
      expect(formatted).toContain('Unused variable');
    });

    it('should group diagnostics by file', () => {
      const result: DiagnosticsResult = {
        diagnostics: [
          { file: 'a.ts', line: 1, column: 1, severity: 'error', message: 'Error 1' },
          { file: 'a.ts', line: 2, column: 1, severity: 'error', message: 'Error 2' },
          { file: 'b.ts', line: 1, column: 1, severity: 'warning', message: 'Warning 1' }
        ],
        errorCount: 2,
        warningCount: 1
      };
      
      const formatted = formatDiagnostics(result);
      expect(formatted).toContain('a.ts');
      expect(formatted).toContain('b.ts');
    });
  });
});
