/**
 * Pipelines Module - Export all pipeline functions
 */

export { runResearchPipeline } from './research';
export type { ResearchQuery, ResearchResult } from './research';

export { runAnalysisPipeline } from './analysis';
export type { AnalysisQuery, AnalysisResult } from './analysis';

export { runReportPipeline } from './report';
export type { ReportConfig, ReportResult } from './report';

export { runAutomationPipeline } from './automation';
export type { AutomationTask, AutomationResult } from './automation';
