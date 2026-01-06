/**
 * VIBE-CLI v12 - Modules Index
 * Export all available modules
 */

export type { BaseModule, ModuleInfo, ModuleResult } from './base.module';

// Module exports - lazy loading for each module
export { CodeAssistantModule } from './code-assistant';
export { TestingModule } from './testing';
export { DebuggingModule } from './debugging';
export { SecurityModule } from './security';
export { DeploymentModule } from './deployment';
