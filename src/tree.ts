import * as vscode from 'vscode';

export const WORKSPACE_STATE_KEY = 'TODO_LIST_ITEMS';

export class TodoListItem extends vscode.TreeItem {
    constructor(
        public readonly fullPath: string,
        public readonly desc: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly resourceUri: vscode.Uri,
        public readonly fileLine: number = 0,
        public children: TodoListItem[] = []
    ) {
        super(fullPath.split("\\").pop() || fullPath, collapsibleState);

        this.tooltip = fullPath;
        this.description = this.desc;
        this.iconPath = vscode.ThemeIcon.File;
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
        const storedItems = this.workspaceState.get<TodoListItem[]>(WORKSPACE_STATE_KEY) || [];

        return storedItems.map(item => new TodoListItem(
            item.fullPath,
            item.desc,
            item.collapsibleState,
            item.resourceUri,
            item.fileLine,
            item.children.map(child => new TodoListItem(child.fullPath,
                child.desc, child.collapsibleState, child.resourceUri, child.fileLine))
        ));
    }
}

export function getChild(desc: string, fileName: string, line: number): TodoListItem {
    const uri = vscode.Uri.file(fileName);
    return new TodoListItem(`Line ${line}: ${desc}`, desc, vscode.TreeItemCollapsibleState.None, uri, line);
}

export function getParent(fileName: string): TodoListItem {
    const uri = vscode.Uri.file(fileName);
    return new TodoListItem(fileName, "", vscode.TreeItemCollapsibleState.Collapsed, uri);
}
