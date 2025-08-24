import { Logger } from './logger';
import { VedroConfig } from './vedroConfig';
import { runCommand } from './commandRunner';

export interface VedroVersion {
    version: string;
    raw: string;
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
    public async getVersion(): Promise<string | null> {
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
                return versionMatch[1];
            }

            // Fallback if pattern doesn't match
            return 'unknown';
        }

        this.logger.error(`Failed to get version: ${result.stderr || result.error?.message}`);
        return null;
    }
}
