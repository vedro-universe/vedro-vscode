import * as vscode from 'vscode';

export class Logger {
    private outputChannel: vscode.OutputChannel;

    constructor(name: string) {
        this.outputChannel = vscode.window.createOutputChannel(name);
    }

    public log(message: string): void {
        const timestamp = new Date().toISOString();
        this.outputChannel.appendLine(`[${timestamp}] ${message}`);
    }

    public error(message: string, error?: any): void {
        const timestamp = new Date().toISOString();
        this.outputChannel.appendLine(`[${timestamp}] [ERROR] ${message}`);
        if (error) {
            this.outputChannel.appendLine(`  ${error.toString()}`);
            if (error.stack) {
                this.outputChannel.appendLine(`  Stack: ${error.stack}`);
            }
        }
    }

    public warn(message: string): void {
        const timestamp = new Date().toISOString();
        this.outputChannel.appendLine(`[${timestamp}] [WARN] ${message}`);
    }

    public show(): void {
        this.outputChannel.show();
    }

    public dispose(): void {
        this.outputChannel.dispose();
    }
}
