import * as vscode from 'vscode';
import * as path from 'path';

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
	constructor(private globalState: vscode.Memento) {}

	private _onDidChangeTreeData: vscode.EventEmitter<TodoListItem | undefined | void> = new vscode.EventEmitter<TodoListItem | undefined | void>();
  	readonly onDidChangeTreeData: vscode.Event<TodoListItem | undefined | void> = this._onDidChangeTreeData.event;

	public refresh(): void {
		this._onDidChangeTreeData.fire();
	}

    public getTreeItem(element: TodoListItem): vscode.TreeItem {
        return element;
    }

    public getChildren(element: TodoListItem): Thenable<TodoListItem[]> {
		const todo = this.globalState.get(GLOBAL_STATE_KEY);
        return Promise.resolve([element]);
    }
}

export function activate(context: vscode.ExtensionContext) {
	const { globalState } = context;
	const dataProvider = new TodoListDataProvider(globalState);

	vscode.window.registerTreeDataProvider('todoList', dataProvider);
	vscode.window.createTreeView('todoList', { treeDataProvider: dataProvider });

  	let disposable = vscode.commands.registerCommand('myTreeView.refresh', () => dataProvider.refresh());
  	context.subscriptions.push(disposable);
}

export function deactivate() {}
