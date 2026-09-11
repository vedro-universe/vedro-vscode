import vscode from 'vscode';

class Terminal implements vscode.Disposable {
    private name: string;
    private term: vscode.Terminal | null = null;
    private workDir: string | null = null;
    private closeListener: vscode.Disposable;

    constructor(name: string) {
        this.name = name;
        this.closeListener = vscode.window.onDidCloseTerminal(term => {
            if (term === this.term) {
                this.term = null;
                this.workDir = null;
            }
        });
    }

    public runCmd(cmd: string, workDir: string): void {
        if (this.term && this.workDir !== workDir) {
            const previousTerm = this.term;
            this.term = null;
            this.workDir = null;
            previousTerm.dispose();
        }
        if (!this.term) {
            this.term = this.createTerminal(workDir);
            this.workDir = workDir;
        }
        this.showTerminal();
        this.clearTerminal();
        this.executeCmd(cmd);
    }

    private createTerminal(workDir: string): vscode.Terminal {
        return vscode.window.createTerminal({
            name: this.name,
            cwd: workDir,
        });
    }

    private showTerminal(): void {
        if (this.term) {
            this.term.show(/* preserveFocus */ true);
        }
    }

    private clearTerminal(): void {
        vscode.commands.executeCommand('workbench.action.terminal.clear');
    }

    private executeCmd(cmd: string) {
        // Change to https://github.com/microsoft/vscode-python/wiki/Python-Environment-APIs
        this.term?.sendText(cmd);
    }

    public dispose(): void {
        const terminal = this.term;
        this.term = null;
        this.workDir = null;
        this.closeListener.dispose();
        terminal?.dispose();
    }
}

export default Terminal;
