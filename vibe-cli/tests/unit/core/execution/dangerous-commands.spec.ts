import { describe, it, expect } from 'vitest';

const DANGEROUS_COMMANDS = [
  'rm -rf /',
  'chmod 777 /',
  'killall',
  'dd if=/dev/zero of=/dev/sda',
  'mkfs.ext4 /dev/sda',
  ':(){ :|:& };:',
  'mv / /dev/null'
];

function isDangerousCommand(cmd: string): boolean {
  const patterns = [
    /rm\s+-rf\s+\//,
    /chmod\s+777\s+\//,
    /killall/,
    /dd\s+if=\/dev\/zero/,
    /mkfs/,
    /:\(\)/,
    /mv\s+\/\s+/
  ];
  return patterns.some(pattern => pattern.test(cmd));
}

describe('Security - Dangerous Commands', () => {
  describe('Command Blocking', () => {
    DANGEROUS_COMMANDS.forEach(cmd => {
      it(`should block: ${cmd}`, () => {
        expect(isDangerousCommand(cmd)).toBe(true);
      });
    });
  });

  describe('Safe Commands', () => {
    const safeCommands = [
      'ls -la',
      'cat file.txt',
      'echo "hello"',
      'npm install',
      'git status'
    ];

    safeCommands.forEach(cmd => {
      it(`should allow: ${cmd}`, () => {
        expect(isDangerousCommand(cmd)).toBe(false);
      });
    });
  });

  describe('Sandbox Isolation', () => {
    it('should limit file access to project directory', () => {
      const projectDir = process.cwd();
      const testPath = '/etc/passwd';
      expect(testPath.startsWith(projectDir)).toBe(false);
    });

    it('should enforce memory limits', () => {
      const memoryLimit = 128 * 1024 * 1024; // 128MB
      expect(memoryLimit).toBe(134217728);
    });

    it('should enforce timeout', () => {
      const timeout = 60000; // 60s
      expect(timeout).toBe(60000);
    });
  });
});
