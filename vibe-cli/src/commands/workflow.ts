/**
 * Workflow Command - Manage and run workflows
 */

import { WorkflowParser, WorkflowRunner } from '../workflows';
import { ApiClient } from '../core/api';
import { loadConfig } from '../config/loader';
import pc from 'picocolors';
import * as readline from 'readline';

export async function workflowCommand(action?: string, arg?: string, options: Record<string, unknown> = {}): Promise<void> {
  const parser = new WorkflowParser();

  switch (action) {
    case 'list':
    case undefined:
      listWorkflows(parser);
      break;

    case 'run':
      if (!arg) {
        console.log('Usage: vibe workflow run <name> [--input key=value]');
        return;
      }
      await runWorkflow(parser, arg, options);
      break;

    case 'show':
      if (!arg) {
        console.log('Usage: vibe workflow show <name>');
        return;
      }
      showWorkflow(parser, arg);
      break;

    case 'create':
      showCreateHelp();
      break;

    case 'validate':
      if (!arg) {
        console.log('Usage: vibe workflow validate <file>');
        return;
      }
      validateWorkflow(parser, arg);
      break;

    default:
      showHelp();
  }
}

function listWorkflows(parser: WorkflowParser): void {
  const workflows = parser.list();

  if (workflows.length === 0) {
    console.log(pc.dim('\nNo workflows found.'));
    console.log(pc.dim('Create workflows in .vibe/workflows/\n'));
    return;
  }

  console.log(pc.cyan('\n━━━ Workflows ━━━\n'));

  for (const name of workflows) {
    const workflow = parser.load(name);
    if (workflow) {
      console.log(`  ${pc.green(name.padEnd(20))} ${workflow.description || ''}`);
      console.log(`  ${' '.repeat(20)} ${pc.dim(`${workflow.steps.length} steps`)}`);
    }
  }

  console.log(pc.dim('\nUse "vibe workflow run <name>" to execute\n'));
}

async function runWorkflow(parser: WorkflowParser, name: string, options: Record<string, unknown>): Promise<void> {
  const workflow = parser.load(name);
  
  if (!workflow) {
    console.log(pc.red(`Workflow not found: ${name}`));
    return;
  }

  const { config } = loadConfig();
  const client = new ApiClient();
  const sessionId = `workflow-${Date.now()}`;
  const model = config?.model || 'gpt-4';
  const runner = new WorkflowRunner(client, model, sessionId);

  // Parse inputs from options
  const inputs: Record<string, unknown> = {};
  if (options.input) {
    const inputPairs = Array.isArray(options.input) ? options.input : [options.input];
    for (const pair of inputPairs) {
      const [key, value] = String(pair).split('=');
      if (key) inputs[key] = value;
    }
  }

  const onApproval = async (tool: string, params: Record<string, unknown>): Promise<boolean> => {
    if (options.yes || options.autoApprove) return true;
    
    console.log(pc.yellow(`\n⚠️  Tool requires approval: ${tool}`));
    console.log(pc.dim(JSON.stringify(params, null, 2)));
    
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise(resolve => {
      rl.question('Allow? [y/n] ', answer => {
        rl.close();
        resolve(answer.toLowerCase().startsWith('y'));
      });
    });
  };

  try {
    const result = await runner.run(workflow, inputs, {
      verbose: !options.quiet,
      autoApprove: Boolean(options.yes),
      onApproval,
      onStepStart: (step, index) => {
        if (!options.quiet) {
          console.log(pc.blue(`\n[${index + 1}/${workflow.steps.length}] ${step.agent}`));
        }
      },
      onStepComplete: (step, index, output) => {
        if (!options.quiet) {
          console.log(pc.green(`✓ Step ${index + 1} complete`));
        }
      }
    });

    console.log(pc.cyan('\n━━━ Workflow Complete ━━━\n'));
    console.log(`Success: ${result.success ? pc.green('yes') : pc.red('no')}`);
    console.log(`Duration: ${result.duration}ms`);
    console.log(`Steps: ${result.steps.filter(s => s.status === 'completed').length}/${result.steps.length} completed`);

    if (Object.keys(result.outputs).length > 0) {
      console.log(pc.bold('\nOutputs:'));
      for (const [key, value] of Object.entries(result.outputs)) {
        console.log(`  ${key}: ${typeof value === 'object' ? JSON.stringify(value).slice(0, 100) : value}`);
      }
    }

  } catch (err: unknown) {
    console.log(pc.red(`\n❌ Workflow failed: ${err instanceof Error ? err.message : String(err)}`));
    process.exit(1);
  }
}

function showWorkflow(parser: WorkflowParser, name: string): void {
  const workflow = parser.load(name);
  
  if (!workflow) {
    console.log(pc.red(`Workflow not found: ${name}`));
    return;
  }

  console.log(pc.cyan(`\n━━━ ${workflow.name} ━━━\n`));
  
  if (workflow.description) {
    console.log(`${pc.bold('Description:')} ${workflow.description}`);
  }

  if (workflow.inputs && Object.keys(workflow.inputs).length > 0) {
    console.log(`\n${pc.bold('Inputs:')}`);
    for (const [key, spec] of Object.entries(workflow.inputs)) {
      const req = spec.required ? pc.red('*') : '';
      const def = spec.default !== undefined ? pc.dim(` (default: ${spec.default})`) : '';
      console.log(`  ${key}${req}: ${spec.type}${def}`);
    }
  }

  console.log(`\n${pc.bold('Steps:')}`);
  for (let i = 0; i < workflow.steps.length; i++) {
    const step = workflow.steps[i];
    console.log(`  ${i + 1}. ${pc.green(step.agent)}`);
    if (step.input) console.log(`     input: ${typeof step.input === 'string' ? step.input : JSON.stringify(step.input)}`);
    if (step.output) console.log(`     output: ${step.output}`);
    if (step.condition) console.log(`     condition: ${step.condition}`);
  }

  if (workflow.outputs && workflow.outputs.length > 0) {
    console.log(`\n${pc.bold('Outputs:')} ${workflow.outputs.join(', ')}`);
  }
}

function validateWorkflow(parser: WorkflowParser, filePath: string): void {
  try {
    const workflow = parser.parseFile(filePath);
    console.log(pc.green(`✅ Valid workflow: ${workflow.name}`));
    console.log(pc.dim(`  ${workflow.steps.length} steps`));
  } catch (err: unknown) {
    console.log(pc.red(`❌ Invalid workflow: ${err instanceof Error ? err.message : String(err)}`));
    process.exit(1);
  }
}

function showCreateHelp(): void {
  console.log(`
${pc.cyan('Creating Workflows')}

Add a YAML file to ${pc.bold('.vibe/workflows/')}

${pc.bold('Example .vibe/workflows/code-review.yaml:')}

${pc.dim(`name: code-review
description: Automated code review workflow
inputs:
  target:
    type: string
    required: true
steps:
  - agent: analyst
    input: "Analyze code quality of \${target}"
    output: analysis
    
  - agent: reviewer
    input: "Review based on analysis: \$prev.output"
    output: review
    
  - agent: writer
    input: "Generate review report from \${review}"
    output: report
    template: review-report
    
outputs:
  - report`)}

${pc.bold('Step options:')}
  agent       Required. Agent to run
  input       Task input (supports \${var} interpolation)
  output      Variable name to store result
  condition   Skip step if condition is false
  onError     'stop' | 'continue' | 'retry'
  maxRetries  Number of retries on failure

${pc.bold('Variable interpolation:')}
  \${varname}     Reference workflow input or previous output
  \$prev.output   Reference previous step's output
`);
}

function showHelp(): void {
  console.log(`
${pc.cyan('Workflow Management')}

${pc.bold('Usage:')} vibe workflow [command]

${pc.bold('Commands:')}
  list                    List all workflows
  run <name>              Run a workflow
  show <name>             Show workflow details
  create                  Show how to create workflows
  validate <file>         Validate workflow file

${pc.bold('Options:')}
  --input key=value       Pass input to workflow
  --yes                   Auto-approve all tool calls
  --quiet                 Minimal output

${pc.bold('Examples:')}
  vibe workflow run code-review --input target=src/
  vibe workflow run deploy --yes
`);
}
