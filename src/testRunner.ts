import vscode from 'vscode';
import Terminal from './terminal';

export class TestRunner {
    private terminal: Terminal;

    constructor(terminal: Terminal) {
        this.terminal = terminal;
    }

    public runTests(request: vscode.TestRunRequest, token: vscode.CancellationToken): void {
        const config = vscode.workspace.getConfiguration();
        const runOptions = config.get<string>('vedro.runOptions', '');
        const testRootDir = config.get<string>('vedro.testRoot', '.');

        const selected = this.formatTestItems(request.include || []);
        const deselected = this.formatTestItems(request.exclude || []);

        let cmd = "vedro run";
        if (selected) {
            cmd += ` ${selected}`;
        }
        if (deselected) {
            cmd += ` -i ${deselected}`;
        }
        if (runOptions) {
            cmd += ` ${runOptions}`;
        }

        this.terminal.runCmd(cmd, testRootDir);
    }

    private formatTestItems(testItems: readonly vscode.TestItem[]): string {
        return testItems.map(testItem => `"${testItem.id}"`).join(' ');
    }
}
