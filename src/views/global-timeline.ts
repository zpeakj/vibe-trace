import * as vscode from 'vscode';
import * as path from 'path';
import { VibeEvent, ImpactFile, ViewStatus } from '../types';
import { DataProvider, isProjectInitialized } from '../data-provider';
import { formatTimestamp, truncate } from '../utils';

/**
 * Tab A — Global Timeline.
 * Flat chronological list of all events across all sessions & modules.
 */
export class GlobalTimelineProvider implements vscode.TreeDataProvider<Entry> {
  private _onDidChangeTreeData = new vscode.EventEmitter<Entry | undefined | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(private dataProvider: DataProvider) {
    dataProvider.onDidChange(() => this.refresh());
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: Entry): vscode.TreeItem {
    if (element instanceof EventEntry) {
      return this.eventTreeItem(element.event);
    }
    if (element instanceof FileEntry) {
      return this.fileTreeItem(element.file, element.event);
    }
    if (element instanceof StatusEntry) {
      return element.treeItem;
    }
    return (element as TreeEntry).treeItem;
  }

  getChildren(element?: Entry): Entry[] {
    if (element) {
      // Expand event to show impact files
      if (element instanceof EventEntry) {
        return element.event.impactFiles.map(
          f => new FileEntry(f, element.event)
        );
      }
      return [];
    }

    // Root: check init state first
    const root = this.dataProvider.getWorkspaceRoot();
    if (!root || !isProjectInitialized(root)) {
      return [];
    }

    // Show all events in time order
    const events = this.dataProvider.getAll();
    if (events.length === 0) {
      return [new StatusEntry('empty')];
    }
    return events.map(e => new EventEntry(e));
  }

  private eventTreeItem(event: VibeEvent): vscode.TreeItem {
    const timeStr = formatTimestamp(event.timestamp);

    const item = new vscode.TreeItem(
      truncate(event.intent, 60),
      vscode.TreeItemCollapsibleState.Expanded
    );
    item.description = `${event.module} · ${timeStr}`;
    item.tooltip = [
      event.original_prompt ? `**Original Prompt:** ${event.original_prompt}` : '',
      `**Intent:** ${event.intent}`,
      `**Summary:** ${event.summary}`,
      `**Module:** ${event.module}`,
      `**Session:** ${event.session_id}`,
      `**Time:** ${timeStr}`,
      event.unresolved_issues ? `\n⚠️ **Unresolved:** ${event.unresolved_issues}` : '',
    ].filter(Boolean).join('\n');
    item.iconPath = event.unresolved_issues
      ? new vscode.ThemeIcon('warning', new vscode.ThemeColor('editorWarning.foreground'))
      : new vscode.ThemeIcon('circle-outline');
    item.contextValue = 'vibeEvent';
    item.id = event.id;
    return item;
  }

  private fileTreeItem(file: ImpactFile, event: VibeEvent): vscode.TreeItem {
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

interface TreeEntry {
  treeItem: vscode.TreeItem;
}

type Entry = EventEntry | FileEntry | StatusEntry;

class EventEntry implements TreeEntry {
  treeItem: vscode.TreeItem;
  constructor(public event: VibeEvent) {
    this.treeItem = new vscode.TreeItem(event.intent);
  }
}

class FileEntry implements TreeEntry {
  treeItem: vscode.TreeItem;
  constructor(public file: ImpactFile, public event: VibeEvent) {
    this.treeItem = new vscode.TreeItem(file.path);
  }
}

class StatusEntry implements TreeEntry {
  treeItem: vscode.TreeItem;
  constructor(status: ViewStatus) {
    if (status === 'empty') {
      this.treeItem = new vscode.TreeItem(
        'No events recorded yet',
        vscode.TreeItemCollapsibleState.None
      );
      this.treeItem.description = 'Start a conversation with AI to begin tracing';
      this.treeItem.iconPath = new vscode.ThemeIcon('info');
    } else {
      this.treeItem = new vscode.TreeItem('Ready');
    }
  }
}
