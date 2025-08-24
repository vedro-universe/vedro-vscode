import * as vscode from 'vscode';


let outputChannel: vscode.OutputChannel;

export async function activate(context: vscode.ExtensionContext) {
    outputChannel = vscode.window.createOutputChannel('Vedro');
    
    outputChannel.appendLine('Vedro extension is activating...');
    outputChannel.appendLine(`Activation time: ${new Date().toISOString()}`);
    
    // Double-check that vedro.cfg.py exists
    const vedroConfigFiles = await vscode.workspace.findFiles('**/vedro.cfg.py', '**/node_modules/**', 1);
    
    if (vedroConfigFiles.length === 0) {
        outputChannel.appendLine('WARNING: No vedro.cfg.py found, but extension was activated!');
        vscode.window.showWarningMessage('Vedro: No vedro.cfg.py found in workspace');
        return;
    }
    
    const configPath = vedroConfigFiles[0].fsPath;
    outputChannel.appendLine(`Found vedro.cfg.py at: ${configPath}`);
    
    vscode.window.showInformationMessage('Vedro extension activated successfully!');
    outputChannel.appendLine('Vedro extension activated successfully!');
    
    const showOutputCommand = vscode.commands.registerCommand('vedro.showOutput', () => {
        outputChannel.show();
    });

    context.subscriptions.push(showOutputCommand);
    context.subscriptions.push(outputChannel);
}

export function deactivate() {
    if (outputChannel) {
        outputChannel.appendLine('Vedro extension is deactivating...');
        outputChannel.dispose();
    }
}
