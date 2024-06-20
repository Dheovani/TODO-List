import * as vscode from 'vscode';
import { TodoListDataProvider, TodoListItem, WORKSPACE_STATE_KEY, FILE, getParent, getChild } from './tree';

const GENERATED = "[GENERATED]";

// Opens a specific file at a specific line
async function goToFile(item: TodoListItem): Promise<boolean> {
    try {
        const document = await vscode.workspace.openTextDocument(item.fullPath);
        const editor = await vscode.window.showTextDocument(document);
        const position = new vscode.Position(item.fileLine, 0);
        const selection = new vscode.Selection(position, position);

        editor.selection = selection;
        editor.revealRange(selection, vscode.TextEditorRevealType.InCenter);

        const lineContent = document.lineAt(item.fileLine).text.toLowerCase();
        return item.fileLine > 0 && !lineContent.includes("todo");
    } catch (error: any) {
        vscode.window.showErrorMessage(`Failed to open file at ${item.fullPath}: ${error.message}`);
    }

    return false;
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

function getComment(content: string, languageId: string): string {
    switch (languageId) {
        case 'javascript':
        case 'typescript':
        case 'java':
        case 'c':
        case 'cpp':
        case 'csharp':
        case 'go':
        case 'swift':
        case 'rust':
        default:
            return `// ${content}`;

        case 'python':
        case 'r':
        case 'perl':
        case 'ruby':
        case 'shellscript':
            return `# ${content}`;

        case 'html':
        case 'xml':
        case 'markdown':
            return `<!-- ${content} -->`;

        case 'css':
        case 'scss':
        case 'less':
        case 'json':
        case 'javascriptreact':
        case 'typescriptreact':
            return `/* ${content} */`;

        case 'sql':
            return `-- ${content}`;
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
        editBuilder.insert(
            new vscode.Position(position.line, 0),
            getComment(`${GENERATED} TODO: ${desc}\n`, editor.document.languageId)
        );
    });

    return desc;
}

// Adds a new item to the TODO list
async function addItem(workspaceState: vscode.Memento, provider: TodoListDataProvider): Promise<void> {
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

export function activate(context: vscode.ExtensionContext): void {
    const { workspaceState } = context;
    const dataProvider = new TodoListDataProvider(workspaceState);

    const addCmd = vscode.commands.registerCommand('todolist.add', () => addItem(workspaceState, dataProvider));    
    const refreshCmd = vscode.commands.registerCommand('todolist.refresh', () => dataProvider.refresh());
    const openCmd = vscode.commands.registerCommand('todolist.open', (item: TodoListItem) => goToFile(item)
        .then(async del => {
            const msg = `It seems like line ${item.fileLine} doesn't have a TODO anymore. Would you like to delete?`;

            // Delete item if it doesn't exist anymore
            if (del && await vscode.window.showInformationMessage(msg, "Yes", "No") === "Yes")
                remove(item, workspaceState, dataProvider);
        }));

    const deleteCmd = vscode.commands.registerCommand(
        'todolist.delete', (item: TodoListItem) => remove(item, workspaceState, dataProvider));

    const clearCmd = vscode.commands.registerCommand('todolist.clear', async () => {
        await workspaceState.update(WORKSPACE_STATE_KEY, undefined);
        dataProvider.refresh();
    });

    const keybindingsCmd = vscode.commands.registerCommand('todolist.keybindings', async () => {
        await vscode.commands.executeCommand('workbench.action.openGlobalKeybindings');
    });

    const openPageCmd = vscode.commands.registerCommand('todolist.openPage', async () => {
		await vscode.env.openExternal(vscode.Uri.parse('vscode:extensions/Dheovani.todo-list-helper'));
	});

    context.subscriptions.push(refreshCmd); // Refresh item list
    context.subscriptions.push(openCmd); // Go to file at specific line
    context.subscriptions.push(addCmd); // Creates new item
    context.subscriptions.push(deleteCmd); // Deletes specific item
    context.subscriptions.push(clearCmd); // Deletes all elements
    context.subscriptions.push(keybindingsCmd); // Open extension's keybindings
    context.subscriptions.push(openPageCmd); // Open extension's page

    vscode.window.registerTreeDataProvider('todoList', dataProvider);
    vscode.window.createTreeView('todoList', { treeDataProvider: dataProvider });

    vscode.workspace.onDidChangeTextDocument(event => {
        const { document, contentChanges } = event;

        contentChanges.forEach(change => {
            const { text } = document.lineAt(change.range.start.line);

            if (text.toLowerCase().includes("todo") && !text.toUpperCase().includes(GENERATED)) {
                vscode.window.showInformationMessage("Would you like to add this item to your TODO list?", "Yes", "No")
                    .then(answer => {
                        if (answer === 'Yes') {
                            const elements = workspaceState.get<TodoListItem[]>(WORKSPACE_STATE_KEY) || [];
                            const existingParent = elements.find(el => el.fullPath === document.fileName);
                            const child = getChild(text, document.fileName, change.range.start.line);

                            if (existingParent) {
                                existingParent.children.push(child);
                            } else {
                                const parent = getParent(document.fileName);
                                parent.children.push(child);
                                elements.push(parent);
                            }

                            workspaceState.update(WORKSPACE_STATE_KEY, elements);
                            dataProvider.refresh();
                        }
                    });
            }
        });
    });
}

export function deactivate(): void {}
