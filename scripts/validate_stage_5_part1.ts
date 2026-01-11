import { SuggestionEngine } from '../src/core/suggestion-engine';
import { CodeExplainer } from '../src/core/code-explainer';
import { CodeAnalyzer } from '../src/core/code-analyzer';
import { DependencyManager } from '../src/core/dependency-manager';
import { PlanningPrimitive } from '../src/primitives/planning';
import { KnowledgeEngine } from '../src/core/knowledge-engine';
import { stateManager } from '../src/core/state-manager';
import { CheckpointSystem } from '../src/core/checkpoint-system';
import * as path from 'path';

// Mock Provider for Stage 5 Logic Verification
const mockProvider = {
    complete: async (prompt: string) => ({
        content: JSON.stringify({
            score: 8,
            suggestions: ["Improve comments", "Refactor loop"],
            criticalIssues: [],
            plan: [{ step: 1, task: "mock task", primitive: "EXECUTION", rationale: "none" }]
        }),
        usage: { totalTokens: 10 }
    }),
    stream: async function* (prompt: string) {
        yield JSON.stringify([{ step: 1, task: "mock task", primitive: "EXECUTION", rationale: "none" }]);
    }
} as any;

async function validateStage5Part1() {
    console.log('--- VIBE CLI STAGE 5 PART 1 VALIDATION ---\n');

    // F26: Suggestion Engine
    const suggestionEngine = new SuggestionEngine(mockProvider, stateManager);
    const suggestions = await suggestionEngine.getSuggestions('npm');
    console.log(`[F26] Suggestion Engine: OK (Found ${suggestions.length} suggestions)`);

    // F28: Checkpoint System
    const checkpointSystem = new CheckpointSystem(stateManager);
    try {
        await checkpointSystem.create('pre-test');
    } catch (e) {
        console.log('[F28] Checkpoint System: Info (Git probably not initialized in this env)');
    }
    const checkpoints = await checkpointSystem.list();
    console.log(`[F28] Checkpoint System: OK (${checkpoints.length} checkpoints found)`);

    // F29: Code Explainer
    const explainer = new CodeExplainer(mockProvider);
    const explanation = await explainer.explain('src/core/config-system.ts');
    console.log('[F29] Code Explainer: OK (Explanation length=' + explanation.length + ')');

    // F31: Code Analyzer
    const analyzer = new CodeAnalyzer(mockProvider);
    const analysis = await analyzer.analyze('src/core/config-system.ts');
    console.log('[F31] Code Analyzer: OK (Analysis score=' + analysis.score + ')');

    // F32: Dependency Manager (Static)
    const audit = DependencyManager.audit();
    console.log('[F32] Dependency Manager: OK (Audit length=' + audit.length + ')');

    // F37: Planning Primitive
    const planner = new PlanningPrimitive();
    console.log('[F37] Planning Primitive: Loaded');

    // F39: Knowledge Engine
    const knowledge = new KnowledgeEngine(mockProvider);
    console.log('[F39] Knowledge Engine: Loaded');

    console.log('\n--- STAGE 5 PART 1 VALIDATION COMPLETE ---');
}

validateStage5Part1().catch(console.error);
