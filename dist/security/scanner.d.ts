/**
 * VIBE-CLI v12 - Security Scanning Module
 * Vulnerability detection, dependency auditing, and compliance checking
 */
export interface SecurityFinding {
    id: string;
    severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
    type: 'vulnerability' | 'code' | 'dependency' | 'configuration' | 'compliance';
    title: string;
    description: string;
    location: {
        file: string;
        line?: number;
        column?: number;
    };
    remediation?: string;
    references?: string[];
    cve?: string;
}
export interface SecurityReport {
    scanId: string;
    scannedAt: Date;
    target: string;
    findings: SecurityFinding[];
    summary: {
        critical: number;
        high: number;
        medium: number;
        low: number;
        info: number;
    };
    score: number;
    recommendations: string[];
}
export interface DependencyInfo {
    name: string;
    version: string;
    latest?: string;
    vulnerabilities: SecurityFinding[];
    license?: string;
    outdated: boolean;
}
export interface SecurityConfig {
    scanTypes: ('vulnerability' | 'code' | 'dependency' | 'configuration')[];
    severityThreshold: 'critical' | 'high' | 'medium' | 'low';
    autoFix: boolean;
    failOnSeverity?: 'critical' | 'high' | 'medium';
    complianceFramework?: 'pci' | 'gdpr' | 'hipaa' | 'soc2';
}
export declare class VibeSecurityScanner {
    private config;
    private cacheDir;
    constructor(config?: Partial<SecurityConfig>);
    private ensureCacheDir;
    /**
     * Run a full security scan
     */
    scan(target?: string): Promise<SecurityReport>;
    /**
     * Run a specific type of scan
     */
    private runScan;
    /**
     * Scan for known vulnerabilities
     */
    private scanVulnerabilities;
    /**
     * Scan for code security issues
     */
    private scanCode;
    /**
     * Scan dependencies for vulnerabilities
     */
    private scanDependencies;
    /**
     * Scan configuration files
     */
    private scanConfiguration;
    /**
     * Check compliance
     */
    checkCompliance(framework: string): Promise<{
        passed: string[];
        failed: string[];
        recommendations: string[];
    }>;
    private checkPCICompliance;
    private checkGDPRCompliance;
    private checkHIPAACompliance;
    private checkSOC2Compliance;
    /**
     * Auto-fix security issues
     */
    autoFix(): Promise<{
        fixed: string[];
        failed: string[];
    }>;
    /**
     * Helper: Get code files to scan
     */
    private getCodeFiles;
    /**
     * Helper: Find line number of a pattern
     */
    private findLineNumber;
    /**
     * Helper: Map npm severity to our severity
     */
    private mapNpmSeverity;
    /**
     * Helper: Remove duplicate findings
     */
    private deduplicateFindings;
    /**
     * Helper: Calculate summary
     */
    private calculateSummary;
    /**
     * Helper: Generate recommendations
     */
    private generateRecommendations;
    /**
     * Helper: Calculate security score
     */
    private calculateScore;
    /**
     * Helper: Save report
     */
    private saveReport;
}
//# sourceMappingURL=scanner.d.ts.map