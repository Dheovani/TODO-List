import * as vscode from 'vscode';

const WORKSPACE_STATE_KEY = 'TODO-List-Items';

enum TodoContextValues {
	FILE = "file",
	ITEM = "item"
};

class TodoListItem extends vscode.TreeItem {
	public resourceUri: vscode.Uri | undefined = undefined;
	public contextValues: TodoContextValues | undefined = undefined;

    constructor(
        name: string,
        desc: string,
        collapsibleState: vscode.TreeItemCollapsibleState,
		public children: TodoListItem[] = []
    ) {
		const newName = `${name}`.split("\\").pop() || name;

        super(newName, collapsibleState);
        this.tooltip = name;
        this.description = desc;
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

    public getChildren(element?: TodoListItem): Thenable<TodoListItem[]> {
        return Promise.resolve(element ? element.children : this.getElements());
    }

    private getElements(): TodoListItem[] {
        return this.workspaceState.get<TodoListItem[]>(WORKSPACE_STATE_KEY) || [];
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

		const desc = await commentLine(editor);

		if (desc) {
			const elements = workspaceState.get<TodoListItem[]>(WORKSPACE_STATE_KEY) || [];
			const newItem = new TodoListItem(`Line ${editor.selection.active.line}: `, desc, vscode.TreeItemCollapsibleState.None);
			newItem.contextValues = TodoContextValues.ITEM;

			if (elements.some(el => el.label === editor.document.fileName)) {
				elements.filter(el => el.label === editor.document.fileName).at(0)?.children.push(newItem);
			} else {
				const parent = new TodoListItem(editor.document.fileName, "", vscode.TreeItemCollapsibleState.Collapsed);
				parent.contextValues = TodoContextValues.FILE;
				parent.resourceUri = editor.document.uri;

				parent.children.push(newItem);
				elements.push(parent);
			}
			
			workspaceState.update(WORKSPACE_STATE_KEY, elements);
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
