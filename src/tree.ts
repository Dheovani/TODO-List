import * as vscode from 'vscode';

export const WORKSPACE_STATE_KEY = 'TODO-List-Items';

enum TodoContextValues {
	FILE = "file",
	ITEM = "item"
};

export class TodoListItem extends vscode.TreeItem {
    constructor(
		public readonly fullPath: string,
        private desc: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly resourceUri?: vscode.Uri,
        public readonly children: TodoListItem[] = [],
        public readonly command?: vscode.Command
    ) {
        super((`${fullPath}`.split("\\").pop() || fullPath), collapsibleState);

        this.tooltip = fullPath;
        this.description = this.desc;
        this.iconPath = resourceUri ? vscode.ThemeIcon.File : undefined;
    }
}

export class TodoListDataProvider implements vscode.TreeDataProvider<TodoListItem> {
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

export function getChild(desc: string, editor: vscode.TextEditor): TodoListItem  {
    const child = new TodoListItem(
        `Line ${editor.selection.active.line}: `, desc,
        vscode.TreeItemCollapsibleState.None, undefined, [],
        {
            command: 'extension.openFile',
            title: '',
            arguments: [editor.document.uri.fsPath, editor.selection.active.line]
        }
    );

    child.contextValue = TodoContextValues.ITEM;
    return child;
}

export function getParent(fileName: string, uri?: vscode.Uri): TodoListItem  {
    const parent = new TodoListItem(
        fileName, "", vscode.TreeItemCollapsibleState.Collapsed,
        uri, [],
        {
            command: 'extension.openFile',
            title: '',
            arguments: [uri?.fsPath, 0]
        }
    );
    
    parent.contextValue = TodoContextValues.FILE;
    return parent;
}