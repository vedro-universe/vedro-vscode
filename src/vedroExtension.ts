import * as vscode from 'vscode';
import { Logger } from './logger';
import { VedroConfig } from './vedroConfig';
import { VedroDetector } from './vedroDetector';
import { VedroRunner } from './vedroRunner';

export class VedroExtension implements vscode.Disposable {
    private logger: Logger;
    private config: VedroConfig;
    private detector: VedroDetector;
    private runner: VedroRunner;
    private disposables: vscode.Disposable[] = [];

    constructor(private readonly context: vscode.ExtensionContext) {
        this.logger = new Logger('Vedro');
        this.config = new VedroConfig();
        this.detector = new VedroDetector(this.config, this.logger);
        this.runner = new VedroRunner(this.config, this.logger);
        
        // Add to disposables
        this.disposables.push(this.logger, this.config);
    }

    /**
     * Initialize the extension
     */
    public async initialize(): Promise<boolean> {
        this.logger.log('='.repeat(50));
        this.logger.log('Initializing Vedro extension...');
        this.logger.log(`Workspace: ${this.config.getWorkspaceFolder()}`);

        // Check for vedro.cfg.py (optional, just for info)
        const vedroConfigFiles = await vscode.workspace.findFiles('**/vedro.cfg.py');
        if (vedroConfigFiles.length > 0) {
            this.logger.log(`Found vedro.cfg.py at: ${vedroConfigFiles[0].fsPath}`);
        }

        // Detect vedro command
        const vedroCommand = await this.detector.detectVedro();
        if (!vedroCommand) {
            this.logger.error('Failed to detect Vedro');
            vscode.window.showErrorMessage('Vedro not found. Please install: pip install vedro');
            return false;
        }

        // Set the command in runner
        this.runner.setVedroCommand(vedroCommand);

        // Get version for confirmation
        const versionInfo = await this.runner.getVersion();
        if (versionInfo) {
            this.logger.log(`Vedro version: ${versionInfo}`);
            vscode.window.showInformationMessage(
                `Vedro extension activated (version ${versionInfo})`
            );
        } else {
            vscode.window.showInformationMessage('Vedro extension activated');
        }

        this.logger.log('Vedro extension initialized successfully');
        this.logger.log('='.repeat(50));
        
        // Register commands
        this.registerCommands();

        return true;
    }

    /**
     * Register extension commands
     */
    private registerCommands(): void {
        // Show Version command
        const showVersionCommand = vscode.commands.registerCommand(
            'vedro.showVersion',
            async () => await this.showVersion()
        );
        this.disposables.push(showVersionCommand);

        // Show Output command
        const showOutputCommand = vscode.commands.registerCommand(
            'vedro.showOutput',
            () => this.logger.show()
        );
        this.disposables.push(showOutputCommand);
    }

    /**
     * Show Vedro version
     */
    private async showVersion(): Promise<void> {
        this.logger.log('='.repeat(50));
        this.logger.log('Checking Vedro version...');

        const versionInfo = await this.runner.getVersion();
        if (versionInfo) {
            this.logger.log(`Vedro command: ${this.runner.getVedroCommand()}`);
            this.logger.log(`Vedro version: ${versionInfo}`);
            vscode.window.showInformationMessage(`Vedro version: ${versionInfo}`);
        } else {
            this.logger.error('Failed to get Vedro version');
            vscode.window.showErrorMessage('Failed to get Vedro version');
        }

        this.logger.log('='.repeat(50));
        this.logger.show();
    }

    public dispose(): void {
        for (const disposable of this.disposables) {
            disposable.dispose();
        }
    }
}
