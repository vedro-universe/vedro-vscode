import vscode from 'vscode';

class Terminal {
    private name: string;
    private term: vscode.Terminal | null = null;
    private opened: boolean = false;

    constructor(name: string) {
        this.name = name;
    }

    public runCmd(cmd: string, workDir: string): void {
        if (!this.term) {
            this.term = this.createTerminal(workDir);
        }
        this.showTerminal();
        this.clearTerminal();
        this.executeCmd(cmd);
    }

    private createTerminal(workDir: string): vscode.Terminal {
        const terminal = vscode.window.createTerminal(this.name);
        if (workDir && workDir !== '.') {
            terminal.sendText(`cd "${workDir}"`);
        }

        vscode.window.onDidOpenTerminal((term: vscode.Terminal) => {
            if (term.name === this.name) {
                this.opened = true;
            }
        });

        vscode.window.onDidCloseTerminal((term: vscode.Terminal) => {
            if (term.name === this.name) {
                this.term?.dispose();
                this.term = null;
                this.opened = false;
            }
        });

        return terminal;
    }

    private showTerminal(): void {
        if (this.term) {
            this.term.show(!!'preserveFocus');
        }
    }

    private clearTerminal(): void {
        vscode.commands.executeCommand('workbench.action.terminal.clear');
    }

    private executeCmd(cmd: string) {
        // Change to https://github.com/microsoft/vscode-python/wiki/Python-Environment-APIs
        if (this.opened) {
            this.term?.sendText(cmd);
        } else {
            setTimeout(() => this.executeCmd(cmd), 200);
        }
    }
}

export default Terminal;
