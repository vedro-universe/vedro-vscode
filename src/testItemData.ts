import vscode from 'vscode';


export type TestItemKind = 'workspace' | 'directory' | 'file' | 'scenario';

export interface TestItemData {
    kind: TestItemKind;
    selector: string;
    workDir: string;
}

const testItemData = new WeakMap<vscode.TestItem, TestItemData>();

export function setTestItemData(testItem: vscode.TestItem, data: TestItemData): void {
    testItemData.set(testItem, data);
}

export function getTestItemData(testItem: vscode.TestItem): TestItemData | undefined {
    return testItemData.get(testItem);
}
