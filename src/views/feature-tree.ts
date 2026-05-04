import * as vscode from 'vscode';
import * as path from 'path';
import { VibeEvent, ImpactFile, ViewStatus } from '../types';
import { DataProvider, isProjectInitialized } from '../data-provider';
import { formatTimestamp, truncate } from '../utils';

/**
 * Tab B — Business Features.
 * Groups events by module. Expand a module to see its event chain.
 */
export class FeatureTreeProvider implements vscode.TreeDataProvider<FEntry> {
  private _onDidChangeTreeData = new vscode.EventEmitter<FEntry | undefined | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(private dataProvider: DataProvider) {
    dataProvider.onDidChange(() => this.refresh());
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: FEntry): vscode.TreeItem {
    if (element instanceof ModuleEntry) {
      return this.moduleTreeItem(element);
    }
    if (element instanceof FeatureEventEntry) {
      return this.eventTreeItem(element.event);
    }
    if (element instanceof FeatureFileEntry) {
      return this.fileTreeItem(element.file);
    }
    if (element instanceof FeatureStatusEntry) {
      return element.treeItem;
    }
    return (element as FTreeEntry).treeItem;
  }

  getChildren(element?: FEntry): FEntry[] {
    if (!element) {
      // Root: check init state first
      const root = this.dataProvider.getWorkspaceRoot();
      if (!root || !isProjectInitialized(root)) {
        return [];
      }

      // List of modules
      const modules = this.dataProvider.getModules();
      if (modules.length === 0) {
        return [new FeatureStatusEntry('empty')];
      }
      return modules.map(m => new ModuleEntry(m, this.dataProvider.getByModule(m).length));
    }

    if (element instanceof ModuleEntry) {
      const events = this.dataProvider.getByModule(element.moduleName);
      return events.map(e => new FeatureEventEntry(e));
    }

    if (element instanceof FeatureEventEntry) {
      return element.event.impactFiles.map(f => new FeatureFileEntry(f));
    }

    return [];
  }

  private moduleTreeItem(entry: ModuleEntry): vscode.TreeItem {
    const item = new vscode.TreeItem(
      entry.moduleName,
      vscode.TreeItemCollapsibleState.Expanded
    );
    item.description = `${entry.eventCount} event${entry.eventCount > 1 ? 's' : ''}`;
    item.iconPath = new vscode.ThemeIcon('package');
    item.contextValue = 'moduleGroup';
    item.id = `module-${entry.moduleName}`;
    return item;
  }

  private eventTreeItem(event: VibeEvent): vscode.TreeItem {
    const timeStr = formatTimestamp(event.timestamp);

    const item = new vscode.TreeItem(
      truncate(event.intent, 60),
      vscode.TreeItemCollapsibleState.Collapsed
    );
    item.description = `${event.session_id} · ${timeStr}`;
    item.tooltip = [
      `**Intent:** ${event.intent}`,
      `**Summary:** ${event.summary}`,
      `**Session:** ${event.session_id}`,
      `**Time:** ${timeStr}`,
      event.unresolved_issues ? `\n⚠️ **Unresolved:** ${event.unresolved_issues}` : '',
    ].join('\n');
    item.iconPath = event.unresolved_issues
      ? new vscode.ThemeIcon('warning', new vscode.ThemeColor('editorWarning.foreground'))
      : new vscode.ThemeIcon('circle-outline');
    item.contextValue = 'vibeEvent';
    item.id = event.id;
    return item;
  }

  private fileTreeItem(file: ImpactFile): vscode.TreeItem {
    const item = new vscode.TreeItem(
      path.basename(file.path),
      vscode.TreeItemCollapsibleState.None
    );
    item.description = `${file.action} — ${file.description}`;
    item.tooltip = `**File:** ${file.path}\n**Action:** ${file.action}\n**Description:** ${file.description}`;
    item.iconPath = this.fileActionIcon(file.action);
    item.contextValue = 'impactFile';
    item.command = {
      command: 'vibetrace.openFile',
      title: 'Open File',
      arguments: [file.path],
    };
    return item;
  }

  private fileActionIcon(action: string): vscode.ThemeIcon {
    switch (action) {
      case 'create': return new vscode.ThemeIcon('diff-added', new vscode.ThemeColor('charts.green'));
      case 'modify': return new vscode.ThemeIcon('diff-modified', new vscode.ThemeColor('charts.yellow'));
      case 'delete': return new vscode.ThemeIcon('diff-removed', new vscode.ThemeColor('charts.red'));
      default: return new vscode.ThemeIcon('file');
    }
  }
}

// ── Tree entry types ──────────────────────────────────

interface FTreeEntry {
  treeItem: vscode.TreeItem;
}

type FEntry = ModuleEntry | FeatureEventEntry | FeatureFileEntry | FeatureStatusEntry;

class ModuleEntry implements FTreeEntry {
  treeItem: vscode.TreeItem;
  constructor(
    public moduleName: string,
    public eventCount: number
  ) {
    this.treeItem = new vscode.TreeItem(moduleName);
  }
}

class FeatureEventEntry implements FTreeEntry {
  treeItem: vscode.TreeItem;
  constructor(public event: VibeEvent) {
    this.treeItem = new vscode.TreeItem(event.intent);
  }
}

class FeatureFileEntry implements FTreeEntry {
  treeItem: vscode.TreeItem;
  constructor(public file: ImpactFile) {
    this.treeItem = new vscode.TreeItem(file.path);
  }
}

class FeatureStatusEntry implements FTreeEntry {
  treeItem: vscode.TreeItem;
  constructor(status: ViewStatus) {
    if (status === 'empty') {
      this.treeItem = new vscode.TreeItem(
        'No business features recorded yet',
        vscode.TreeItemCollapsibleState.None
      );
      this.treeItem.description = 'AI will auto-classify conversations into features';
      this.treeItem.iconPath = new vscode.ThemeIcon('info');
    } else {
      this.treeItem = new vscode.TreeItem('Ready');
    }
  }
}
