/**
 * VIBE-CLI v12 - Security Module
 * Vulnerability scanning, dependency auditing, and security fixes
 */
import { BaseModule, ModuleResult } from '../base.module';
export declare class SecurityModule extends BaseModule {
    private provider;
    private readonly securityPatterns;
    constructor();
    /**
     * Execute the module
     */
    execute(params: Record<string, any>): Promise<ModuleResult>;
    /**
     * Scan code for vulnerabilities
     */
    private scan;
    /**
     * Audit dependencies for known vulnerabilities
     */
    private auditDependencies;
    /**
     * Auto-fix vulnerabilities
     */
    private autoFix;
    /**
     * Generate security report
     */
    private generateReport;
    /**
     * Scan content for security patterns
     */
    private scanContent;
    /**
     * Find files matching pattern
     */
    private findFiles;
    /**
     * Parse npm audit output
     */
    private parseNpmAudit;
    /**
     * Check for outdated packages
     */
    private checkOutdatedPackages;
    /**
     * Get fix for vulnerability type
     */
    private getFixForVulnerability;
    /**
     * Generate summary string
     */
    private generateSummary;
}
//# sourceMappingURL=index.d.ts.map