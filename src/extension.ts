import * as vscode from 'vscode';
import { VedroExtension } from './vedroExtension';

export async function activate(context: vscode.ExtensionContext) {
    const vedroExtension = new VedroExtension(context);

    const initialized = await vedroExtension.initialize();
    if (initialized) {
        context.subscriptions.push(vedroExtension);
    } else {
        vedroExtension.dispose();
    }
}

export function deactivate() {
    // Cleanup is handled by context.subscriptions
}
