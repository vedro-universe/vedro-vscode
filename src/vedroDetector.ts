import * as vscode from 'vscode';
import { Logger } from './logger';
import { VedroConfig } from './vedroConfig';
import { runCommand } from './commandRunner';

export class VedroDetector {
    constructor(
        private readonly config: VedroConfig,
        private readonly logger: Logger
    ) {}

    /**
     * Detect and return a working vedro command
     */
    public async detectVedro(): Promise<string | null> {
        this.logger.log('Detecting Vedro...');
        
        // 1. First try user-configured vedro path
        const configuredPath = this.config.getVedroPath();
        if (configuredPath) {
            this.logger.log(`Trying configured vedro path: ${configuredPath}`);
            if (await this.verifyVedroCommand(configuredPath)) {
                this.logger.log(`✓ Using configured vedro: ${configuredPath}`);
                return configuredPath;
            }
            this.logger.warn(`Configured vedro path doesn't work: ${configuredPath}`);
        }
        
        // 2. Try to get Python from VS Code Python extension
        const pythonPath = await this.getPythonFromExtension();
        if (pythonPath) {
            const vedroCommand = `${pythonPath} -m vedro`;
            if (await this.verifyVedroCommand(vedroCommand)) {
                this.logger.log(`✓ Using vedro from Python extension: ${vedroCommand}`);
                
                // Save it to config for future use
                await this.config.setVedroPath(vedroCommand);
                
                return vedroCommand;
            }
        }
        
        // 3. Try common defaults
        const defaults = [
            'python3 -m vedro',
            'python -m vedro',
            'vedro',  // In case vedro is in PATH
        ];
        
        for (const command of defaults) {
            this.logger.log(`Trying default: ${command}`);
            if (await this.verifyVedroCommand(command)) {
                this.logger.log(`✓ Using default vedro: ${command}`);
                
                // Save it to config for future use
                await this.config.setVedroPath(command);
                
                return command;
            }
        }
        
        this.logger.error('Could not find working vedro command');
        return null;
    }

    /**
     * Verify that a vedro command works
     */
    private async verifyVedroCommand(command: string): Promise<boolean> {
        const fullCommand = `${command} --version`;
        const result = await runCommand(fullCommand, this.config.getWorkspaceFolder());
        
        if (result.success) {
            const output = result.stdout || result.stderr;
            // Check if output contains "Vedro" to ensure it's really vedro
            if (output.toLowerCase().includes('vedro')) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * Get Python path from VS Code Python extension
     */
    private async getPythonFromExtension(): Promise<string | null> {
        try {
            const pythonExtension = vscode.extensions.getExtension('ms-python.python');
            
            if (!pythonExtension) {
                this.logger.log('Python extension not found');
                return null;
            }

            if (!pythonExtension.isActive) {
                await pythonExtension.activate();
            }

            // Try the new API
            const api = pythonExtension.exports;
            if (api?.environments) {
                const activeEnv = api.environments.getActiveEnvironmentPath();
                if (activeEnv?.path) {
                    // Try common paths for the Python executable
                    const possiblePaths = [
                        activeEnv.path,
                        `${activeEnv.path}/bin/python`,
                        `${activeEnv.path}/Scripts/python.exe`,
                    ];
                    
                    for (const pythonPath of possiblePaths) {
                        const result = await runCommand(
                            `${pythonPath} --version`, 
                            this.config.getWorkspaceFolder(),
                        );
                        if (result.success) {
                            this.logger.log(`Found Python from extension: ${pythonPath}`);
                            return pythonPath;
                        }
                    }
                }
            }

            // Fallback to workspace configuration
            const vsConfig = vscode.workspace.getConfiguration('python');
            const interpreterPath = vsConfig.get<string>('defaultInterpreterPath');
            if (interpreterPath) {
                const result = await runCommand(
                    `${interpreterPath} --version`,
                    this.config.getWorkspaceFolder(),
                );
                if (result.success) {
                    return interpreterPath;
                }
            }

        } catch (error) {
            this.logger.error('Error getting Python from extension:', error);
        }

        return null;
    }
}
