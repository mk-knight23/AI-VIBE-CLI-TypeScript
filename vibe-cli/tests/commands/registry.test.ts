/**
 * Command Registry Tests - P0
 * Validates command registration, duplicates, and alias conflicts
 */

import { describe, it, expect } from 'vitest';
import { commands, findCommand } from '../../src/commands/registry';

describe('Command Registry', () => {
  describe('Duplicate Detection', () => {
    it('should have no duplicate command names', () => {
      const names = commands.map(c => c.name);
      const duplicates = names.filter((n, i) => names.indexOf(n) !== i);
      expect(duplicates, `Duplicate commands found: ${duplicates.join(', ')}`).toEqual([]);
    });

    it('should have no alias conflicts with command names', () => {
      const names = new Set(commands.map(c => c.name));
      const conflicts: string[] = [];
      
      for (const cmd of commands) {
        for (const alias of cmd.aliases || []) {
          if (names.has(alias)) {
            conflicts.push(`${cmd.name} alias '${alias}' conflicts with command '${alias}'`);
          }
        }
      }
      expect(conflicts, conflicts.join('\n')).toEqual([]);
    });

    it('should have no alias conflicts between commands', () => {
      const aliasMap = new Map<string, string>();
      const conflicts: string[] = [];
      
      for (const cmd of commands) {
        for (const alias of cmd.aliases || []) {
          if (aliasMap.has(alias)) {
            conflicts.push(`Alias '${alias}' used by both '${aliasMap.get(alias)}' and '${cmd.name}'`);
          } else {
            aliasMap.set(alias, cmd.name);
          }
        }
      }
      expect(conflicts, conflicts.join('\n')).toEqual([]);
    });
  });

  describe('Command Structure', () => {
    it('should have handlers for all commands', () => {
      const missing = commands.filter(c => !c.handler);
      expect(missing.map(c => c.name)).toEqual([]);
    });

    it('should have descriptions for all commands', () => {
      const missing = commands.filter(c => !c.description);
      expect(missing.map(c => c.name)).toEqual([]);
    });

    it('should have usage for all commands', () => {
      const missing = commands.filter(c => !c.usage);
      expect(missing.map(c => c.name)).toEqual([]);
    });
  });

  describe('findCommand', () => {
    it('should find command by name', () => {
      const cmd = findCommand('help');
      expect(cmd?.name).toBe('help');
    });

    it('should find command by alias', () => {
      const cmd = findCommand('h');
      expect(cmd?.name).toBe('help');
    });

    it('should return undefined for unknown command', () => {
      const cmd = findCommand('nonexistent');
      expect(cmd).toBeUndefined();
    });

    it('should be case insensitive', () => {
      const cmd = findCommand('HELP');
      expect(cmd?.name).toBe('help');
    });
  });
});
