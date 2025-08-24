import * as path from 'path';
import * as vscode from 'vscode';

export interface VedroConfigData {
    vedroPath: string | null;
    projectDir: string;
    vedroArgs: string[];
    workspaceFolder: string;
}

export class VedroConfig implements vscode.Disposable {
    private config: VedroConfigData;
    private configChangeListener: vscode.Disposable;

    constructor() {
        this.config = this.loadConfiguration();
        this.configChangeListener = vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('vedro')) {
                this.config = this.loadConfiguration();
            }
        });
    }

    private loadConfiguration(): VedroConfigData {
        const vsConfig = vscode.workspace.getConfiguration('vedro');
        const workspaceFolders = vscode.workspace.workspaceFolders;
        const workspaceFolder = workspaceFolders?.[0]?.uri.fsPath || process.cwd();

        // Get settings with defaults
        const vedroPath = vsConfig.get<string>('vedroPath') || null;
        const projectDir = vsConfig.get<string>('projectDir') || workspaceFolder;
        const vedroArgsString = vsConfig.get<string>('vedroArgs') || '';

        // Parse vedro args (split by space, filter empty)
        const vedroArgs = vedroArgsString
            .split(' ')
            .map(arg => arg.trim())
            .filter(arg => arg.length > 0);

        // Resolve project dir relative to workspace
        const resolvedProjectDir = path.isAbsolute(projectDir) 
            ? projectDir 
            : path.join(workspaceFolder, projectDir);

        return {
            vedroPath,
            projectDir: resolvedProjectDir,
            vedroArgs,
            workspaceFolder
        };
    }

    /**
     * Get the configured vedro command or null if not set
     */
    public getVedroPath(): string | null {
        return this.config.vedroPath;
    }

    /**
     * Set the vedro command (updates workspace settings)
     */
    public async setVedroPath(vedroPath: string): Promise<void> {
        const vsConfig = vscode.workspace.getConfiguration('vedro');
        await vsConfig.update('vedroPath', vedroPath, vscode.ConfigurationTarget.Workspace);
        this.config.vedroPath = vedroPath;
    }

    /**
     * Get the project directory for --project-dir
     */
    public getProjectDir(): string {
        return this.config.projectDir;
    }

    /**
     * Get additional vedro arguments
     */
    public getVedroArgs(): string[] {
        return this.config.vedroArgs;
    }

    /**
     * Get the workspace folder
     */
    public getWorkspaceFolder(): string {
        return this.config.workspaceFolder;
    }

    public dispose(): void {
        this.configChangeListener.dispose();
    }
}
