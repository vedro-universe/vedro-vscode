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

        const cmd = this.buildCommand(request, runOptions);
        this.terminal.runCmd(cmd, testRootDir);
    }

    public async debugTests(request: vscode.TestRunRequest, token: vscode.CancellationToken): Promise<void> {
        const config = vscode.workspace.getConfiguration();
        const runOptions = config.get<string>('vedro.runOptions', '');
        const debugOptions = config.get<string>('vedro.debugOptions', '');
        const testRootDir = config.get<string>('vedro.testRoot', '.');
        const debugPort = config.get<number>('vedro.debugPort', 5678);

        const options = debugOptions || runOptions;
        const baseCmd = this.buildCommand(request, options);
        const cmd = `python -m debugpy --listen ${debugPort} --wait-for-client -m ${baseCmd}`;
        this.terminal.runCmd(cmd, testRootDir);

        if (token.isCancellationRequested) {
            return;
        }

        const debugConfig: vscode.DebugConfiguration = {
            name: 'Vedro Debug',
            type: 'debugpy',
            request: 'attach',
            connect: {
                host: 'localhost',
                port: debugPort,
            },
            justMyCode: true,
        };

        const attached = await this.attachWithRetry(debugConfig, token);
        if (!attached) {
            vscode.window.showErrorMessage(
                `Failed to attach debugger to port ${debugPort}. ` +
                'Make sure debugpy is installed (pip install debugpy) ' +
                'and the Python Debugger extension is installed in VS Code.'
            );
            return;
        }

        await this.waitForDebugSessionToEnd(token);
    }

    /**
     * Attempts to attach the VS Code debugger with retries.
     * Uses startDebugging directly — debugpy extension handles
     * the DAP connection internally.
     */
    private async attachWithRetry(
        debugConfig: vscode.DebugConfiguration,
        token: vscode.CancellationToken,
        timeout: number = 30000,
    ): Promise<boolean> {
        const start = Date.now();
        const initialDelay = 2000;
        const retryInterval = 1000;

        await new Promise<void>(resolve => setTimeout(resolve, initialDelay));

        while (Date.now() - start < timeout) {
            if (token.isCancellationRequested) {
                return false;
            }

            const started = await vscode.debug.startDebugging(undefined, debugConfig);
            if (started) {
                return true;
            }

            await new Promise<void>(resolve => setTimeout(resolve, retryInterval));
        }

        return false;
    }

    /**
     * Waits until the active debug session (named 'Vedro Debug') terminates.
     * This ensures that testRun.end() is not called prematurely while
     * the user is still stepping through breakpoints.
     */
    private waitForDebugSessionToEnd(token: vscode.CancellationToken): Promise<void> {
        return new Promise<void>(resolve => {
            const disposable = vscode.debug.onDidTerminateDebugSession(session => {
                if (session.name === 'Vedro Debug') {
                    disposable.dispose();
                    resolve();
                }
            });

            token.onCancellationRequested(() => {
                disposable.dispose();
                resolve();
            });
        });
    }

    private buildCommand(request: vscode.TestRunRequest, runOptions: string): string {
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
        return cmd;
    }

    private formatTestItems(testItems: readonly vscode.TestItem[]): string {
        return testItems.map(testItem => `"${testItem.id}"`).join(' ');
    }
}
