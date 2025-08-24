import { exec } from 'child_process';

export interface CommandResult {
    success: boolean;
    stdout: string;
    stderr: string;
    error?: Error;
}

export function runCommand(command: string, cwd?: string): Promise<CommandResult> {
    return new Promise((resolve) => {
        exec(
            command,
            { 
                cwd: cwd || process.cwd(),
                timeout: 5000 // 5 second timeout
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
