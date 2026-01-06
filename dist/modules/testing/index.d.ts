/**
 * VIBE-CLI v12 - Testing Module
 * Test generation, execution, and coverage analysis
 */
import { BaseModule, ModuleResult } from '../base.module';
export declare class TestingModule extends BaseModule {
    private provider;
    private readonly frameworks;
    constructor();
    /**
     * Execute the module
     */
    execute(params: Record<string, any>): Promise<ModuleResult>;
    /**
     * Generate tests for a file
     */
    private generateTests;
    /**
     * Run the test suite
     */
    private runTests;
    /**
     * Get coverage report
     */
    private getCoverage;
    /**
     * Watch mode for tests
     */
    private watchTests;
    /**
     * Analyze coverage and suggest improvements
     */
    private analyzeCoverage;
    /**
     * Get framework configuration
     */
    private getFrameworkConfig;
    /**
     * Detect test framework from project
     */
    private detectFramework;
    /**
     * Get framework-specific test template
     */
    private getFrameworkTestTemplate;
    /**
     * Parse code blocks from response
     */
    private parseCodeBlocks;
    /**
     * Write test files
     */
    private writeTestFiles;
    /**
     * Parse test output
     */
    private parseTestOutput;
    /**
     * Parse coverage output
     */
    private parseCoverageOutput;
}
//# sourceMappingURL=index.d.ts.map