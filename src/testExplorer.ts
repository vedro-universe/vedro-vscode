import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import vscode from 'vscode';


export class TestExplorer {
    private testController: vscode.TestController;

    constructor(testController: vscode.TestController) {
        this.testController = testController;
    }

    public async discoverTests(file: vscode.Uri): Promise<void> {
        if (file.scheme !== 'file' || !file.path.endsWith('.py') || !this.isUnderTestRoot(file)) {
            return;
        }
        const testItems = await this.getTestItemsFromFile(file);
        this.updateTestItems(file, testItems);
    }

    /** Discover tests in all Python files under scenarios (or vedro.testRoot). Used by resolveHandler when Test Explorer is opened. */
    public async discoverAllInWorkspace(): Promise<void> {
        const folders = vscode.workspace.workspaceFolders;
        if (!folders?.length) {
            return;
        }

        const config = vscode.workspace.getConfiguration();
        const testRoot = config.get<string>('vedro.testRoot', '.');

        for (const folder of folders) {
            const pattern = testRoot === '.' ? '**/*.py' : `${testRoot}/**/*.py`;
            const pyFiles = await vscode.workspace.findFiles(
                new vscode.RelativePattern(folder, pattern),
                null
            );
            for (const uri of pyFiles) {
                await this.discoverTests(uri);
            }
        }
    }

    private async getTestItemsFromFile(file: vscode.Uri): Promise<vscode.TestItem[]> {
        let testItems: vscode.TestItem[] = [];

        const testRoot = this.getTestRootFolder(file);
        const relPath = path.relative(testRoot, file.fsPath);

        const content = await fs.readFile(file.fsPath, 'utf-8');
        const classRegex = /class\s+(\w+)\(vedro\.Scenario\):/;
        content.split(os.EOL).forEach((line, index) => {
            const match = classRegex.exec(line);
            if (match) {
                const className = match[1];
                testItems.push(this.createTestItem(file, relPath, className, index));
            }
        });

        return testItems;
    }

    private createTestItem(file: vscode.Uri, relPath: string, className: string, lineNumber: number): vscode.TestItem {
        const uniqueId = `${relPath}::${className}`;

        const basename = path.basename(file.fsPath, path.extname(file.fsPath));
        const label = `${basename}::${className}`;

        const testItem = this.testController.createTestItem(uniqueId, label, file);
        testItem.range = new vscode.Range(lineNumber, 0, lineNumber, 0);
        return testItem;
    }

    private updateTestItems(file: vscode.Uri, testItems: vscode.TestItem[]): void {
        this.testController.items.forEach(item => {
            if (item.uri?.fsPath === file.fsPath) {
                this.testController.items.delete(item.id);
            }
        });
        testItems.forEach(item => this.testController.items.add(item));
    }

    private getTestRootFolder(file: vscode.Uri): string {
        const projectFolder = vscode.workspace.getWorkspaceFolder(file)?.uri.fsPath || '.';
        const config = vscode.workspace.getConfiguration();
        const testRootFolder = config.get<string>('vedro.testRoot', 'scenarios');
        return path.join(projectFolder, testRootFolder);
    }

    private isUnderTestRoot(file: vscode.Uri): boolean {
        const root = this.getTestRootFolder(file);
        const rel = path.relative(root, file.fsPath);
        return !rel.startsWith('..') && !path.isAbsolute(rel);
    }
}
