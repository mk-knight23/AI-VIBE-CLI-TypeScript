/**
 * VIBE-CLI v12 - Deployment Module
 * Build, deploy, CI/CD setup, and monitoring
 */
import { BaseModule, ModuleResult } from '../base.module';
export declare class DeploymentModule extends BaseModule {
    private provider;
    private readonly targets;
    constructor();
    /**
     * Execute the module
     */
    execute(params: Record<string, any>): Promise<ModuleResult>;
    /**
     * Build the project
     */
    private buildProject;
    /**
     * Build Docker image
     */
    private buildDockerImage;
    /**
     * Deploy to a target
     */
    private deploy;
    /**
     * Deploy to Vercel
     */
    private deployVercel;
    /**
     * Deploy to Netlify
     */
    private deployNetlify;
    /**
     * Deploy to Heroku
     */
    private deployHeroku;
    /**
     * Deploy Docker container
     */
    private deployDocker;
    /**
     * Generic deployment for cloud providers
     */
    private deployGeneric;
    /**
     * Setup CI/CD pipeline
     */
    private setupCI;
    /**
     * Monitor deployment
     */
    private monitorDeployment;
    /**
     * Rollback deployment
     */
    private rollback;
    /**
     * Get deployment status
     */
    private getDeploymentStatus;
    /**
     * Detect project type
     */
    private detectProjectType;
    /**
     * Detect deployment target type
     */
    private detectTargetType;
    /**
     * Find build artifacts
     */
    private findArtifacts;
    /**
     * Generate CI configuration
     */
    private generateCIConfig;
    /**
     * Generate cloud deployment config
     */
    private generateCloudConfig;
    /**
     * Get apply command for cloud config
     */
    private getApplyCommand;
}
//# sourceMappingURL=index.d.ts.map