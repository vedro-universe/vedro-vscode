// src/VedroExtension.ts
import * as vscode from 'vscode';
import { Logger } from './logger';
import { VedroConfig } from './vedroConfig';
import { VedroDetector } from './vedroDetector';
import { VedroRunner, VedroScenario } from './vedroRunner';

export class VedroExtension implements vscode.Disposable {
    private logger: Logger;
    private config: VedroConfig;
    private detector: VedroDetector;
    private runner: VedroRunner;
    private disposables: vscode.Disposable[] = [];
    private discoveredScenarios: VedroScenario[] = [];

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
            vscode.window.showErrorMessage(
                'Vedro not found. Please install: pip install vedro'
            );
            return false;
        }
        
        // Set the command in runner
        this.runner.setVedroCommand(vedroCommand);
        
        // Get version for confirmation
        const versionInfo = await this.runner.getVersion();
        if (versionInfo) {
            this.logger.log(`Vedro version: ${versionInfo.version}`);
        }
        
        // Automatically discover tests on activation
        await this.autoDiscoverTests();
        
        // Show activation message
        const versionText = versionInfo ? ` (version ${versionInfo.version})` : '';
        const scenariosText = this.discoveredScenarios.length > 0 
            ? `, found ${this.discoveredScenarios.length} scenarios` 
            : '';
        
        vscode.window.showInformationMessage(
            `Vedro extension activated${versionText}${scenariosText}`
        );
        
        this.logger.log('Vedro extension initialized successfully');
        this.logger.log('='.repeat(50));
        
        // Register commands
        this.registerCommands();
        
        return true;
    }

    /**
     * Auto-discover tests on activation
     */
    private async autoDiscoverTests(): Promise<void> {
        this.logger.log('Auto-discovering scenarios...');
        
        try {
            this.discoveredScenarios = await this.runner.discoverTests();
            
            if (this.discoveredScenarios.length > 0) {
                this.logger.log(`Auto-discovered ${this.discoveredScenarios.length} scenarios:`);
                for (const scenario of this.discoveredScenarios) {
                    this.logger.log(`  - ${scenario.subject} (${scenario.path}:${scenario.lineno})`);
                }
            } else {
                this.logger.warn('No scenarios found during auto-discovery');
            }
        } catch (error) {
            this.logger.error('Auto-discovery failed:', error);
        }
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
            'vedro.showOutput',  // show logs
            () => this.logger.show()
        );
        this.disposables.push(showOutputCommand);
        
        // Discover Tests command (manual trigger)
        const discoverTestsCommand = vscode.commands.registerCommand(
            'vedro.discoverTests',
            async () => await this.discoverTests()
        );
        this.disposables.push(discoverTestsCommand);
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
            this.logger.log(`Vedro version: ${versionInfo.version}`);
            vscode.window.showInformationMessage(`Vedro version: ${versionInfo.version}`);
        } else {
            this.logger.error('Failed to get Vedro version');
            vscode.window.showErrorMessage('Failed to get Vedro version');
        }
        
        this.logger.log('='.repeat(50));
        this.logger.show();
    }

    /**
     * Manually discover tests
     */
    private async discoverTests(): Promise<void> {
        this.logger.log('='.repeat(50));
        this.logger.log('Discovering scenarios...');
        
        this.discoveredScenarios = await this.runner.discoverTests();
        
        if (this.discoveredScenarios.length > 0) {
            this.logger.log(`Found ${this.discoveredScenarios.length} scenarios:`);
            for (const scenario of this.discoveredScenarios) {
                this.logger.log(`  ID: ${scenario.id}`);
                this.logger.log(`    Subject: ${scenario.subject}`);
                this.logger.log(`    Location: ${scenario.path}:${scenario.lineno}`);
            }
            vscode.window.showInformationMessage(`Found ${this.discoveredScenarios.length} scenarios`);
        } else {
            this.logger.warn('No scenarios found');
            vscode.window.showWarningMessage('No scenarios found');
        }
        
        this.logger.log('='.repeat(50));
        this.logger.show();
    }

    /**
     * Get discovered scenarios
     */
    public getDiscoveredScenarios(): VedroScenario[] {
        return this.discoveredScenarios;
    }

    public dispose(): void {
        for (const disposable of this.disposables) {
            disposable.dispose();
        }
    }
}
