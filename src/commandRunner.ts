import { exec } from 'child_process';

export interface CommandResult {
    success: boolean;
    stdout: string;
    stderr: string;
    error?: Error;
}

export function runCommand(command: string, cwd?: string, timeoutMs: number = 30000): Promise<CommandResult> {
    return new Promise((resolve) => {
        exec(
            command,
            { 
                cwd: cwd || process.cwd(),
                timeout: timeoutMs
            },
            (error, stdout, stderr) => {
                resolve({
                    success: !error,
                    stdout: stdout.trim(),
                    stderr: stderr.trim(),
                    error: error || undefined
                });
            }
        );
    });
}
