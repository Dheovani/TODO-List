import * as vscode from 'vscode';
import { TodoListDataProvider, TodoListItem, WORKSPACE_STATE_KEY, getParent, getChild } from './tree';

// Opens a specific file at a specific line
async function openFile(filePath: string, lineNumber: number = 0): Promise<void> {
    const uri = vscode.Uri.file(filePath);

    try {
        const document = await vscode.workspace.openTextDocument(uri);
        const editor = await vscode.window.showTextDocument(document);
        const position = new vscode.Position(lineNumber, 0);
        const selection = new vscode.Selection(position, position);

        editor.selection = selection;
        editor.revealRange(selection, vscode.TextEditorRevealType.InCenter);
    } catch (error: any) {
        vscode.window.showErrorMessage(`Failed to open file at ${filePath}: ${error.message}`);
    }
}

// Adds the "TODO" comment above the current line
async function commentLine(editor: vscode.TextEditor): Promise<string | undefined> {
    const position = editor.selection.active;
    const desc = await vscode.window.showInputBox({
        prompt: 'What do you need TODO?',
        placeHolder: 'Description'
    });

    // If the user cancels or doesn't provide a description, do nothing
    if (!desc) return;

    await editor.edit(editBuilder => {
        editBuilder.insert(new vscode.Position(position.line, 0), `// TODO: ${desc}\n`);
    });

    return desc;
}

// Adds a new item to the TODO list
async function addItem(workspaceState: vscode.Memento, provider: TodoListDataProvider): Promise<void> {
    const selectedOption = await vscode.window.showInformationMessage("Add TODO?", "Yes", "No");

    if (selectedOption === "Yes") {
        const editor = vscode.window.activeTextEditor;

        if (!editor) return;

        const { document } = editor;
        const desc = await commentLine(editor);

        if (desc) {
            const elements = workspaceState.get<TodoListItem[]>(WORKSPACE_STATE_KEY) || [];
            const child = getChild(desc, editor);

            const existingParent = elements.find(el => el.fullPath === document.fileName);

            if (existingParent) {
                existingParent.children.push(child);
            } else {
                const parent = getParent(document.fileName, document.uri);
                parent.children.push(child);
                elements.push(parent);
            }

            workspaceState.update(WORKSPACE_STATE_KEY, elements);
            provider.refresh();
        }
    }
}

export function activate(context: vscode.ExtensionContext): void {
    const dataProvider = new TodoListDataProvider(context.workspaceState);
    const refresh = vscode.commands.registerCommand('extension.refresh', () => dataProvider.refresh());
    const addTodoItem = vscode.commands.registerCommand(
        'extension.addTodoItem', () => addItem(context.workspaceState, dataProvider));
    const openFileCommand = vscode.commands.registerCommand(
        'extension.openFile', (filePath: string, lineNumber: number) => openFile(filePath, lineNumber));

    context.subscriptions.push(refresh);
    context.subscriptions.push(addTodoItem);
    context.subscriptions.push(openFileCommand);

    vscode.window.registerTreeDataProvider('todoList', dataProvider);
    vscode.window.createTreeView('todoList', { treeDataProvider: dataProvider });
}

export function deactivate(): void {}
