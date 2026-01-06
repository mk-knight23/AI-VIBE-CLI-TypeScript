/**
 * VIBE-CLI v12 - Infrastructure Module
 * Cloud infrastructure management and IaC
 */
import { BaseModule, ModuleResult } from '../base.module';
export declare class InfrastructureModule extends BaseModule {
    private provider;
    constructor();
    execute(params: Record<string, any>): Promise<ModuleResult>;
    private generateInfra;
    private generateTerraform;
    private generateDocker;
    private generateKubernetes;
    private validateConfig;
}
//# sourceMappingURL=index.d.ts.map