import * as vscode from 'vscode';

export const ITEM = "item";
export const FILE = "file";
export const WORKSPACE_STATE_KEY = 'TODO_LIST_ITEMS';

export class TodoListItem extends vscode.TreeItem {
    constructor(
        public readonly name: string,
        public readonly desc: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly resourceUri: vscode.Uri,
        public readonly fullPath: string,
        public readonly fileLine: number = 0,
        public children: TodoListItem[] = []
    ) {
        super(name.split("\\").pop() || name, collapsibleState);

        this.tooltip = name;
        this.description = this.desc;
        this.iconPath = vscode.ThemeIcon.File;

        this.contextValue = collapsibleState === vscode.TreeItemCollapsibleState.Collapsed ? FILE : ITEM;
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

        return storedItems.map(item => {
            const uri = vscode.Uri.file(item.fullPath);

            return new TodoListItem(
                item.name,
                item.desc,
                item.collapsibleState,
                item.resourceUri || uri,
                item.fullPath,
                item.fileLine,
                item.children.map(child => new TodoListItem(child.name, child.desc,
                    child.collapsibleState, child.resourceUri || uri, child.fullPath, child.fileLine))
            );
        });
    }
}

export function getChild(desc: string, fileName: string, line: number): TodoListItem {
    const uri = vscode.Uri.file(fileName);
    return new TodoListItem(`Line ${line}: ${desc}`, desc, vscode.TreeItemCollapsibleState.None, uri, fileName, line);
}

export function getParent(fileName: string): TodoListItem {
    const uri = vscode.Uri.file(fileName);
    return new TodoListItem(fileName, "", vscode.TreeItemCollapsibleState.Collapsed, uri, fileName);
}
