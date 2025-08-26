import { runCommand } from './commandRunner';
import { Logger } from './logger';
import { VedroConfig } from './vedroConfig';

export interface VedroVersion {
    version: string;
    raw: string;
}

export interface VedroScenario {
    id: string;
    subject: string;
    path: string;
    lineno: number;
}

export class VedroRunner {
    private vedroCommand: string | null = null;

    constructor(
        private readonly config: VedroConfig,
        private readonly logger: Logger
    ) {}

    /**
     * Set the vedro command to use
     */
    public setVedroCommand(command: string): void {
        this.vedroCommand = command;
    }

    /**
     * Get the current vedro command
     */
    public getVedroCommand(): string | null {
        return this.vedroCommand;
    }

    /**
     * Get Vedro version
     */
    public async getVersion(): Promise<VedroVersion | null> {
        if (!this.vedroCommand) {
            this.logger.error('Vedro command not set');
            return null;
        }

        const command = `${this.vedroCommand} --version`;
        this.logger.log(`Running: ${command}`);
        
        const result = await runCommand(command, this.config.getWorkspaceFolder());

        if (result.success) {
            const output = result.stdout || result.stderr;
            
            // Parse version from output (may contain ANSI codes)
            const versionMatch = output.match(/Vedro\s+(\d+\.\d+\.\d+)/i);
            if (versionMatch) {
                return {
                    version: versionMatch[1],
                    raw: output
                };
            }
            
            // Fallback if pattern doesn't match
            return {
                version: 'unknown',
                raw: output
            };
        }
        
        this.logger.error(`Failed to get version: ${result.stderr || result.error?.message}`);
        return null;
    }

    /**
     * Discover tests by running vedro -r json
     */
    public async discoverTests(): Promise<VedroScenario[]> {
        if (!this.vedroCommand) {
            this.logger.error('Vedro command not set');
            return [];
        }

        const projectDir = this.config.getProjectDir();
        const vedroArgs = this.config.getVedroArgs();
        
        const args = [
            '-r', 'json',
            '--project-dir', projectDir,
            ...vedroArgs
        ];
        
        const command = `${this.vedroCommand} ${args.join(' ')}`;
        this.logger.log(`Discovering tests: ${command}`);
        
        const result = await runCommand(command, this.config.getWorkspaceFolder());
        
        if (!result.success && !result.stdout) {
            this.logger.error(`Test discovery may have failed: ${result.stderr || result.error?.message}`);

            if (!result.stdout) {
                return [];
            }
        }
        
        return this.parseTestDiscoveryOutput(result.stdout);
    }

    /**
     * Parse test discovery JSON lines output
     */
    private parseTestDiscoveryOutput(output: string): VedroScenario[] {
        const scenarios: Map<string, VedroScenario> = new Map();
        
        try {
            const lines = output.split('\n').filter(line => line.trim());
            
            for (const line of lines) {
                try {
                    const data = JSON.parse(line);
                    
                    // Look for events that contain scenario information
                    if (data.scenario && data.scenario.id) {
                        const scenario = data.scenario;
                        
                        // Store scenario (using Map to avoid duplicates)
                        scenarios.set(scenario.id, {
                            id: scenario.id,
                            subject: scenario.subject || 'unknown',
                            path: scenario.path,
                            lineno: scenario.lineno || 0
                        });
                    }
                } catch {
                    // Skip non-JSON lines or lines without scenario data
                    continue;
                }
            }
        } catch (error) {
            this.logger.error('Failed to parse test discovery output:', error);
        }
        
        const scenarioList = Array.from(scenarios.values());
        this.logger.log(`Discovered ${scenarioList.length} scenarios`);
        
        return scenarioList;
    }
}
