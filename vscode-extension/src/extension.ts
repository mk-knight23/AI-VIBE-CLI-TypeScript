import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';
import axios from 'axios';

const execAsync = promisify(exec);
const API_URL = 'http://localhost:3000/api';

export function activate(context: vscode.ExtensionContext) {
    console.log('VIBE Extension is now active');

    // Command: Review Code
    let reviewCommand = vscode.commands.registerCommand('vibe.review', async () => {
        const file = vscode.window.activeTextEditor?.document.fileName;
        if (!file) return;

        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "VIBE: Reviewing code...",
            cancellable: false
        }, async () => {
            try {
                const { stdout } = await execAsync(`vibe review --file ${file}`);
                console.log(stdout); // satisfies lint
                vscode.window.showInformationMessage('VIBE Review Complete!');
                // In a real extension, we would parse stdout and show diagnostics
            } catch (error: any) {
                vscode.window.showErrorMessage(`VIBE Review Failed: ${error.message}`);
            }
        });
    });

    // Command: Fix Issue
    let fixCommand = vscode.commands.registerCommand('vibe.fix', async () => {
        const file = vscode.window.activeTextEditor?.document.fileName;
        if (!file) return;

        const issue = await vscode.window.showInputBox({
            prompt: 'Describe the issue to fix'
        });

        if (!issue) return;

        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "VIBE: Attempting fix...",
            cancellable: false
        }, async () => {
            try {
                const { stdout } = await execAsync(`vibe fix --file ${file} --error "${issue}"`);
                console.log(stdout); // satisfies lint
                vscode.window.showInformationMessage('VIBE Fix Applied!');
            } catch (error: any) {
                vscode.window.showErrorMessage(`VIBE Fix Failed: ${error.message}`);
            }
        });
    });

    context.subscriptions.push(reviewCommand, fixCommand);

    // Sidebar Provider
    const sidebarProvider = new VibeSidebarProvider();
    vscode.window.registerTreeDataProvider('vibe-projects', sidebarProvider);

    // Refresh command
    vscode.commands.registerCommand('vibe.refreshProjects', () => sidebarProvider.refresh());

    // Diagnostics
    const diagnosticCollection = vscode.languages.createDiagnosticCollection('vibe');
    context.subscriptions.push(diagnosticCollection);

    // Code Actions
    context.subscriptions.push(
        vscode.languages.registerCodeActionsProvider(
            { scheme: 'file', language: '*' },
            new VibeFixProvider(),
            {
                providedCodeActionKinds: VibeFixProvider.providedCodeActionKinds
            }
        )
    );
}

export function deactivate() { }

/**
 * Sidebar Provider for VIBE Projects
 */
class VibeSidebarProvider implements vscode.TreeDataProvider<VibeProjectItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<VibeProjectItem | undefined | void> = new vscode.EventEmitter<VibeProjectItem | undefined | void>();
    readonly onDidChangeTreeData: vscode.Event<VibeProjectItem | undefined | void> = this._onDidChangeTreeData.event;

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: VibeProjectItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: VibeProjectItem): Promise<VibeProjectItem[]> {
        if (element) return [];

        try {
            const response = await axios.get(`${API_URL}/projects`);
            const projects = response.data.projects || [];
            return projects.map((p: string) => new VibeProjectItem(p, vscode.TreeItemCollapsibleState.None));
        } catch (error) {
            vscode.window.showErrorMessage('Failed to fetch VIBE projects. Is the server running?');
            return [];
        }
    }
}

class VibeProjectItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(label, collapsibleState);
        this.tooltip = `${this.label} project`;
        this.description = 'Local Project';
        this.iconPath = new vscode.ThemeIcon('folder');
        this.contextValue = 'vibe-project';
    }
}

/**
 * Provides "Vibe Fix" actions for diagnostics
 */
export class VibeFixProvider implements vscode.CodeActionProvider {
    public static readonly providedCodeActionKinds = [
        vscode.CodeActionKind.QuickFix
    ];

    public provideCodeActions(document: vscode.TextDocument, _range: vscode.Range | vscode.Selection, context: vscode.CodeActionContext): vscode.CodeAction[] {
        return context.diagnostics
            .filter(diagnostic => diagnostic.source === 'vibe' || context.only?.contains(vscode.CodeActionKind.QuickFix))
            .map(diagnostic => this.createFix(document, diagnostic));
    }

    private createFix(document: vscode.TextDocument, diagnostic: vscode.Diagnostic): vscode.CodeAction {
        const fix = new vscode.CodeAction(`VIBE: Fix this issue`, vscode.CodeActionKind.QuickFix);
        fix.command = {
            command: 'vibe.fix',
            title: 'Vibe Fix',
            arguments: [document, diagnostic]
        };
        fix.diagnostics = [diagnostic];
        fix.isPreferred = true;
        return fix;
    }
}
