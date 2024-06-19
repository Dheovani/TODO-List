import * as vscode from 'vscode';
import { TodoListDataProvider, TodoListItem, WORKSPACE_STATE_KEY, FILE, getParent, getChild } from './tree';

// Opens a specific file at a specific line
async function goToFile(item: TodoListItem): Promise<void> {
    try {
        const document = await vscode.workspace.openTextDocument(item.fullPath);
        const editor = await vscode.window.showTextDocument(document);
        const position = new vscode.Position(item.fileLine, 0);
        const selection = new vscode.Selection(position, position);

        editor.selection = selection;
        editor.revealRange(selection, vscode.TextEditorRevealType.InCenter);
    } catch (error: any) {
        vscode.window.showErrorMessage(`Failed to open file at ${item.fullPath}: ${error.message}`);
    }
}

// Removes an item from the list
async function remove(item: TodoListItem, workspaceState: vscode.Memento, provider: TodoListDataProvider): Promise<void> {
    let elements = workspaceState.get<TodoListItem[]>(WORKSPACE_STATE_KEY) || [];
    
    if (item.contextValue === FILE) {
        elements = elements.filter(el => el.fullPath != item.fullPath);
    } else {
        const existingParent = elements.find(el => el.fullPath === item.fullPath);

        if (!existingParent) return;

        existingParent.children = existingParent.children.filter(child => child.fileLine != item.fileLine);

        if (existingParent.children.length === 0)
            elements = elements.filter(el => el.fullPath != item.fullPath);
    }

    workspaceState.update(WORKSPACE_STATE_KEY, elements);
    provider.refresh();
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
            const existingParent = elements.find(el => el.fullPath === document.fileName);
            const child = getChild(desc, document.fileName, editor.selection.active.line);

            if (existingParent) {
                existingParent.children.push(child);
            } else {
                const parent = getParent(document.fileName);
                parent.children.push(child);
                elements.push(parent);
            }

            workspaceState.update(WORKSPACE_STATE_KEY, elements);
            provider.refresh();
        }
    }
}

export function activate(context: vscode.ExtensionContext): void {
    // context.workspaceState.update(WORKSPACE_STATE_KEY, undefined);
    const dataProvider = new TodoListDataProvider(context.workspaceState);
    const refresh = vscode.commands.registerCommand('extension.refresh', () => dataProvider.refresh());
    const openFile = vscode.commands.registerCommand('extension.openFile', (item: TodoListItem) => goToFile(item));
    const addTodoItem = vscode.commands.registerCommand(
        'extension.addTodoItem', () => addItem(context.workspaceState, dataProvider));
    const deleteItem = vscode.commands.registerCommand(
        'extension.deleteItem', (item: TodoListItem) => remove(item, context.workspaceState, dataProvider));

    context.subscriptions.push(refresh);
    context.subscriptions.push(openFile);
    context.subscriptions.push(addTodoItem);
    context.subscriptions.push(deleteItem);

    vscode.window.registerTreeDataProvider('todoList', dataProvider);
    vscode.window.createTreeView('todoList', { treeDataProvider: dataProvider });
}

export function deactivate(): void {}
