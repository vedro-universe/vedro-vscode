import vscode from 'vscode';
import Terminal from './terminal';
import { TestExplorer } from './testExplorer';
import { TestRunner } from './testRunner';

export async function activate(context: vscode.ExtensionContext) {
    const testController = vscode.tests.createTestController('vedroTestController', 'Vedro Test Controller');
    context.subscriptions.push(testController);

    const terminal = new Terminal('vedro-runner');
    const testRunner = new TestRunner(terminal);

    const runHandler = (request: vscode.TestRunRequest, token: vscode.CancellationToken) => {
        const testRun = testController.createTestRun(request);
        testRunner.runTests(request, token);
        testRun.end();
    };
    testController.createRunProfile('Run', vscode.TestRunProfileKind.Run, runHandler, !!'isDefault');

    const testExplorer = new TestExplorer(testController);

    for (const document of vscode.workspace.textDocuments) {
        await testExplorer.discoverTests(document.uri);
    }

    context.subscriptions.push(
        vscode.workspace.onDidOpenTextDocument(document => testExplorer.discoverTests(document.uri)),
        vscode.workspace.onDidChangeTextDocument(e => testExplorer.discoverTests(e.document.uri)),
    );
}

export async function deactivate() {}
