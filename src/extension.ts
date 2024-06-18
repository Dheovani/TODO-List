import * as vscode from 'vscode';

const GLOBAL_STATE_KEY = 'TODO-List-Items';

class TodoListItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        private version: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(label, collapsibleState);
        this.tooltip = `${this.label}-${this.version}`;
        this.description = this.version;
    }

    iconPath = {
        light: '../resources/light/TodoIcon.svg',
        dark: '../resources/dark/TodoIcon.svg'
    };
}

class TodoListDataProvider implements vscode.TreeDataProvider<TodoListItem> {
	private _onDidChangeTreeData: vscode.EventEmitter<TodoListItem | undefined | void> = new vscode.EventEmitter<TodoListItem | undefined | void>();
  	readonly onDidChangeTreeData: vscode.Event<TodoListItem | undefined | void> = this._onDidChangeTreeData.event;

	constructor(private workspaceState: vscode.Memento) {}

	public refresh(): void {
		this._onDidChangeTreeData.fire();
	}

    public getTreeItem(element: TodoListItem): vscode.TreeItem {
        return element;
    }

    public getChildren(element: TodoListItem): Thenable<TodoListItem[]> {
		return element
			? Promise.resolve([element])
			: Promise.resolve(this.getElements());
    }

	private getElements(): TodoListItem[] {
		const elements = this.workspaceState.get<TodoListItem[]>(GLOBAL_STATE_KEY);
		const items: TodoListItem[] = [];
		
		elements?.forEach(e => items.push(e));

		return items;
	}
}

// Adds the "TODO" comment above the current line
async function commentLine(): Promise<string | undefined> {
	const editor = vscode.window.activeTextEditor;

	if (!editor) return;

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

	return `${editor.document.fileName}, ${position.line}: ${desc}`;
}

// Adds a new item to the TODO list
async function addItem(workspaceState: vscode.Memento, provider: TodoListDataProvider): Promise<void> {
	const selectedOption = await vscode.window.showInformationMessage("Add TODO?", "Yes", "No");

	if (selectedOption === "Yes") {
		const desc = await commentLine();

		if (desc) {
			const elements = workspaceState.get<TodoListItem[]>(GLOBAL_STATE_KEY) || [];
			const newItem = new TodoListItem("TODO", desc, vscode.TreeItemCollapsibleState.None);

			elements.push(newItem);
			await workspaceState.update(GLOBAL_STATE_KEY, elements);

			provider.refresh();
		}
	}
}

export function activate(context: vscode.ExtensionContext) {
	const dataProvider = new TodoListDataProvider(context.workspaceState);
	const refresh = vscode.commands.registerCommand('extension.refresh', () => dataProvider.refresh());
	const addTodoItem = vscode.commands.registerCommand(
		'extension.addTodoItem', () => addItem(context.workspaceState, dataProvider));

	context.subscriptions.push(refresh);
	context.subscriptions.push(addTodoItem);

	vscode.window.registerTreeDataProvider('todoList', dataProvider);
	vscode.window.createTreeView('todoList', { treeDataProvider: dataProvider });
}

export function deactivate() {}
