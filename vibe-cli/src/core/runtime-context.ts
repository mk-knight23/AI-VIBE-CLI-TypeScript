import path from 'path';

export function getProjectRoot(): string {
  return process.env.VIBE_PROJECT_ROOT ?? process.cwd();
}

export function getOutputDir(name: string): string {
  return path.join(getProjectRoot(), name);
}

export function getVibeDir(): string {
  return path.join(getProjectRoot(), '.vibe');
}
