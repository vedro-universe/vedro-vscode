import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import vscode from 'vscode';
import { getTestItemData, setTestItemData } from './testItemData';


interface DiscoveredScenario {
    className: string;
    lineNumber: number;
}

interface TestItemParent {
    collection: vscode.TestItemCollection;
    item: vscode.TestItem | undefined;
}


export class TestExplorer {
    private testController: vscode.TestController;
    private fileItems = new Map<string, vscode.TestItem>();

    constructor(testController: vscode.TestController) {
        this.testController = testController;
    }

    public async discoverTests(file: vscode.Uri): Promise<void> {
        if (file.scheme !== 'file' || !file.path.endsWith('.py') || !this.isUnderTestRoot(file)) {
            return;
        }
        const scenarios = await this.getScenariosFromFile(file);
        this.updateTestItems(file, scenarios);
    }

    /** Discover tests under vedro.testRoot. Used by resolveHandler when Test Explorer is opened. */
    public async discoverAllInWorkspace(): Promise<void> {
        const folders = vscode.workspace.workspaceFolders;
        if (!folders?.length) {
            return;
        }

        const config = vscode.workspace.getConfiguration();
        const testRoot = config.get<string>('vedro.testRoot', '.');
        // RelativePattern requires a workspace-relative path; check the raw value.
        if (path.isAbsolute(testRoot)) {
            vscode.window.showWarningMessage(
                `vedro.testRoot must be a workspace-relative path, got "${testRoot}". Test discovery skipped.`
            );
            return;
        }
        const normalizedRoot = testRoot
            .replace(/\\/g, '/')
            .replace(/^\.\/+/, '')
            .replace(/^\/+|\/+$/g, '');

        await Promise.all(folders.map(async folder => {
            const pattern = (!normalizedRoot || normalizedRoot === '.')
                ? '**/*.py'
                : `${normalizedRoot}/**/*.py`;
            // `undefined` (not `null`) keeps default files.exclude / search.exclude active.
            const pyFiles = await vscode.workspace.findFiles(
                new vscode.RelativePattern(folder, pattern),
                undefined
            );
            await Promise.all(pyFiles.map(uri => this.discoverTests(uri)));
        }));
    }

    private async getScenariosFromFile(file: vscode.Uri): Promise<DiscoveredScenario[]> {
        const scenarios: DiscoveredScenario[] = [];
        const content = await fs.readFile(file.fsPath, 'utf-8');
        const classRegex = /class\s+(\w+)\(vedro\.Scenario\):/;
        content.split(os.EOL).forEach((line, index) => {
            const match = classRegex.exec(line);
            if (match) {
                scenarios.push({ className: match[1], lineNumber: index });
            }
        });

        return scenarios;
    }

    private createScenarioItem(
        file: vscode.Uri,
        rootId: string,
        testRoot: string,
        relPath: string,
        scenario: DiscoveredScenario,
    ): vscode.TestItem {
        const selector = `${relPath}::${scenario.className}`;
        const testItem = this.testController.createTestItem(
            `scenario:${rootId}:${selector}`,
            scenario.className,
            file,
        );
        testItem.range = new vscode.Range(scenario.lineNumber, 0, scenario.lineNumber, 0);
        testItem.sortText = `2:${scenario.className}`;
        setTestItemData(testItem, { kind: 'scenario', selector, workDir: testRoot });
        return testItem;
    }

    private updateTestItems(file: vscode.Uri, scenarios: DiscoveredScenario[]): void {
        const existingFileItem = this.fileItems.get(file.fsPath);
        if (scenarios.length === 0) {
            if (existingFileItem) {
                this.removeFileItem(existingFileItem);
            }
            return;
        }

        const testRoot = this.getTestRootFolder(file);
        const rootId = vscode.Uri.file(testRoot).toString();
        const relPath = this.normalizePath(path.relative(testRoot, file.fsPath));
        const directoryPath = path.posix.dirname(relPath);
        const treeRoot = this.ensureWorkspaceRoot(file, rootId, testRoot);
        const parent = this.ensureDirectoryPath(testRoot, rootId, directoryPath, treeRoot);
        const fileId = `file:${rootId}:${relPath}`;

        if (existingFileItem && existingFileItem.parent !== parent.item) {
            this.removeFileItem(existingFileItem);
        }

        let fileItem = parent.collection.get(fileId);
        if (!fileItem) {
            fileItem = this.testController.createTestItem(fileId, path.posix.basename(relPath), file);
            fileItem.sortText = `1:${fileItem.label}`;
            parent.collection.add(fileItem);
        }
        setTestItemData(fileItem, { kind: 'file', selector: relPath, workDir: testRoot });
        fileItem.children.replace(
            scenarios.map(scenario => this.createScenarioItem(file, rootId, testRoot, relPath, scenario)),
        );
        this.fileItems.set(file.fsPath, fileItem);
    }

    private ensureWorkspaceRoot(file: vscode.Uri, rootId: string, testRoot: string): TestItemParent {
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(file);
        if (!workspaceFolder) {
            return { collection: this.testController.items, item: undefined };
        }

        const workspaceId = `workspace:${rootId}`;
        let workspaceItem = this.testController.items.get(workspaceId);
        if (!workspaceItem) {
            workspaceItem = this.testController.createTestItem(
                workspaceId,
                workspaceFolder.name,
                workspaceFolder.uri,
            );
            workspaceItem.sortText = `0:${workspaceItem.label}`;
            setTestItemData(workspaceItem, { kind: 'workspace', selector: '.', workDir: testRoot });
            this.testController.items.add(workspaceItem);
        }

        return { collection: workspaceItem.children, item: workspaceItem };
    }

    private ensureDirectoryPath(
        testRoot: string,
        rootId: string,
        directoryPath: string,
        treeRoot: TestItemParent,
    ): TestItemParent {
        let collection = treeRoot.collection;
        let parent = treeRoot.item;

        if (directoryPath === '.') {
            return { collection, item: parent };
        }

        const segments = directoryPath.split('/');
        for (let index = 0; index < segments.length; index++) {
            const selector = segments.slice(0, index + 1).join('/');
            const directoryId = `directory:${rootId}:${selector}`;
            let directoryItem = collection.get(directoryId);
            if (!directoryItem) {
                const directoryUri = vscode.Uri.file(path.join(testRoot, ...segments.slice(0, index + 1)));
                directoryItem = this.testController.createTestItem(directoryId, segments[index], directoryUri);
                directoryItem.sortText = `0:${directoryItem.label}`;
                setTestItemData(directoryItem, { kind: 'directory', selector, workDir: testRoot });
                collection.add(directoryItem);
            }
            parent = directoryItem;
            collection = directoryItem.children;
        }

        return { collection, item: parent };
    }

    private removeFileItem(fileItem: vscode.TestItem): void {
        const parent = fileItem.parent;
        const collection = parent?.children ?? this.testController.items;
        collection.delete(fileItem.id);
        this.fileItems.delete(fileItem.uri?.fsPath ?? '');
        this.pruneEmptyDirectories(parent);
    }

    private pruneEmptyDirectories(item: vscode.TestItem | undefined): void {
        let current = item;
        while (current && current.children.size === 0 && getTestItemData(current)?.kind === 'directory') {
            const parent = current.parent;
            const collection = parent?.children ?? this.testController.items;
            collection.delete(current.id);
            current = parent;
        }
    }

    private normalizePath(filePath: string): string {
        return filePath.replace(/\\/g, '/');
    }

    private getTestRootFolder(file: vscode.Uri): string {
        const projectFolder = vscode.workspace.getWorkspaceFolder(file)?.uri.fsPath || '.';
        const config = vscode.workspace.getConfiguration();
        const testRootFolder = config.get<string>('vedro.testRoot', '.');
        return path.join(projectFolder, testRootFolder);
    }

    private isUnderTestRoot(file: vscode.Uri): boolean {
        const root = this.getTestRootFolder(file);
        const caseInsensitive = process.platform === 'win32' || process.platform === 'darwin';
        const rootCmp = caseInsensitive ? root.toLowerCase() : root;
        const fileCmp = caseInsensitive ? file.fsPath.toLowerCase() : file.fsPath;
        const rel = path.relative(rootCmp, fileCmp);
        return rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel);
    }
}
