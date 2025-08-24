import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Extension Test Suite', () => {

    test('Extension should be present', () => {
        const extension = vscode.extensions.getExtension('vedro.vedro');
        assert.ok(extension, 'Extension should be available');
    });

    test('Extension should activate', async () => {
        const extension = vscode.extensions.getExtension('vedro.vedro');
        await extension?.activate();
        assert.ok(extension?.isActive);
    });

});
