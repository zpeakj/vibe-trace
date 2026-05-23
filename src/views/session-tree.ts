import * as vscode from 'vscode';
import * as path from 'path';
import { VibeEvent, ImpactFile, ViewStatus } from '../types';
import { DataProvider, isProjectInitialized } from '../data-provider';
import { formatTimestamp, truncate } from '../utils';
import { t } from '../i18n';

/**
 * Tab C — Window Sessions.
 * Groups events by session_id. Expand a session to see the conversation chain.
 */
export class SessionTreeProvider implements vscode.TreeDataProvider<SEntry> {
  private _onDidChangeTreeData = new vscode.EventEmitter<SEntry | undefined | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;
  private _allCollapsed = true;
  private _version = 0;

  constructor(private dataProvider: DataProvider) {
    dataProvider.onDidChange(() => this.refresh());
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  toggleCollapse(): void {
    this._allCollapsed = !this._allCollapsed;
    this._version++;
    this.refresh();
  }

  get allCollapsed(): boolean {
    return this._allCollapsed;
  }

  getTreeItem(element: SEntry): vscode.TreeItem {
    if (element instanceof SessionEntry) {
      return this.sessionTreeItem(element);
    }
    if (element instanceof SessionEventEntry) {
      return this.eventTreeItem(element.event);
    }
    if (element instanceof SessionFileEntry) {
      return this.fileTreeItem(element.file);
    }
    if (element instanceof SessionStatusEntry) {
      return element.treeItem;
    }
    return (element as STreeEntry).treeItem;
  }

  getChildren(element?: SEntry): SEntry[] {
    if (!element) {
      // Root: check init state first
      const root = this.dataProvider.getWorkspaceRoot();
      if (!root || !isProjectInitialized(root)) {
        return [];
      }

      // List of sessions
      const sessions = this.dataProvider.getSessions();
      if (sessions.length === 0) {
        return [new SessionStatusEntry('empty')];
      }
      return sessions.map(sid => {
        const events = this.dataProvider.getBySession(sid);
        return new SessionEntry(sid, events);
      });
    }

    if (element instanceof SessionEntry) {
      return element.events.map(e => new SessionEventEntry(e));
    }

    if (element instanceof SessionEventEntry) {
      return element.event.impactFiles.map(f => new SessionFileEntry(f));
    }

    return [];
  }

  private sessionTreeItem(entry: SessionEntry): vscode.TreeItem {
    const events = entry.events;
    const modules = new Set(events.map(e => e.module));
    const moduleList = Array.from(modules).join(', ');
    const firstTime = events[events.length - 1]?.timestamp;
    const lastTime = events[0]?.timestamp;
    const timeRange = firstTime && lastTime
      ? `${formatTimestamp(firstTime).split(',')[0] || formatTimestamp(firstTime).split(' ')[0]} → ${formatTimestamp(lastTime).split(',')[0] || formatTimestamp(lastTime).split(' ')[0]}`
      : '';

    const collapsible = this._allCollapsed
      ? vscode.TreeItemCollapsibleState.Collapsed
      : vscode.TreeItemCollapsibleState.Expanded;
    const item = new vscode.TreeItem(
      entry.sessionId,
      collapsible
    );
    item.description = `${t('common.turns', { count: events.length })} · ${moduleList}`;
    item.tooltip = [
      `${t('tooltip.session')} ${entry.sessionId}`,
      `${t('tooltip.turns')} ${events.length}`,
      `${t('tooltip.modulesTouched')} ${moduleList}`,
      timeRange ? `${t('tooltip.timeSpan')} ${timeRange}` : '',
    ].filter(Boolean).join('\n');
    item.iconPath = new vscode.ThemeIcon('comment-discussion');
    item.contextValue = 'sessionGroup';
    item.id = `session-${entry.sessionId}@${this._version}`;
    return item;
  }

  private eventTreeItem(event: VibeEvent): vscode.TreeItem {
    const timeStr = formatTimestamp(event.timestamp);

    const item = new vscode.TreeItem(
      truncate(event.intent, 60),
      vscode.TreeItemCollapsibleState.Collapsed
    );
    item.description = `${event.module} · ${timeStr}`;
    item.tooltip = [
      `${t('tooltip.intent')} ${event.intent}`,
      `${t('tooltip.summary')} ${event.summary}`,
      `${t('tooltip.module')} ${event.module}`,
      `${t('tooltip.time')} ${timeStr}`,
      event.unresolved_issues ? `${t('tooltip.unresolved')} ${event.unresolved_issues}` : '',
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
    item.tooltip = `${t('tooltip.file')} ${file.path}\n${t('tooltip.action')} ${file.action}\n${t('tooltip.description')} ${file.description}`;
    item.iconPath = this.fileActionIcon(file.action);
    item.contextValue = 'impactFile';
    item.command = {
      command: 'vibetrace.openFile',
      title: t('common.openFile'),
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

interface STreeEntry {
  treeItem: vscode.TreeItem;
}

type SEntry = SessionEntry | SessionEventEntry | SessionFileEntry | SessionStatusEntry;

class SessionEntry implements STreeEntry {
  treeItem: vscode.TreeItem;
  constructor(
    public sessionId: string,
    public events: VibeEvent[]
  ) {
    this.treeItem = new vscode.TreeItem(sessionId);
  }
}

class SessionEventEntry implements STreeEntry {
  treeItem: vscode.TreeItem;
  constructor(public event: VibeEvent) {
    this.treeItem = new vscode.TreeItem(event.intent);
  }
}

class SessionFileEntry implements STreeEntry {
  treeItem: vscode.TreeItem;
  constructor(public file: ImpactFile) {
    this.treeItem = new vscode.TreeItem(file.path);
  }
}

class SessionStatusEntry implements STreeEntry {
  treeItem: vscode.TreeItem;
  constructor(status: ViewStatus) {
    if (status === 'empty') {
      this.treeItem = new vscode.TreeItem(
        t('sessions.empty.title'),
        vscode.TreeItemCollapsibleState.None
      );
      this.treeItem.description = t('sessions.empty.desc');
      this.treeItem.iconPath = new vscode.ThemeIcon('info');
    } else {
      this.treeItem = new vscode.TreeItem(t('common.ready'));
    }
  }
}
