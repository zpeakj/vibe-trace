import * as vscode from 'vscode';
import * as path from 'path';
import { DataProvider, isProjectInitialized } from './data-provider';
import { ModuleDict } from './module-dict';
import { GlobalTimelineProvider } from './views/global-timeline';
import { FeatureTreeProvider } from './views/feature-tree';
import { SessionTreeProvider } from './views/session-tree';
import { eventDetailHtml, featureFlowHtml, sessionChainHtml } from './views/webview-content';
import { CURSOR_RULES_CONTENT, setupRules, EDITOR_LABELS, type EditorType, RULES_FILES } from './rules';
import { WebviewPanelManager } from './WebviewPanelManager';

let dataProvider: DataProvider;
let moduleDict: ModuleDict;
let dashboardManager: WebviewPanelManager;

export function activate(context: vscode.ExtensionContext) {
  const root = getWorkspaceRoot();
  const initialized = root ? isProjectInitialized(root) : false;

  // ── Context key for viewsWelcome ────────────────────
  vscode.commands.executeCommand('setContext', 'vibetrace:initialized', initialized);

  // ── Data layer ──────────────────────────────────────
  dataProvider = new DataProvider();

  if (initialized) {
    dataProvider.initialize().then(() => log('DataProvider initialized'));
    moduleDict = new ModuleDict(dataProvider);
    moduleDict.initialize();
  }

  // ── Dashboard webview ───────────────────────────────
  dashboardManager = new WebviewPanelManager(context, dataProvider);

  // ── Tree views ──────────────────────────────────────
  const globalTimeline = new GlobalTimelineProvider(dataProvider);
  const featureTree = new FeatureTreeProvider(dataProvider);
  const sessionTree = new SessionTreeProvider(dataProvider);

  context.subscriptions.push(
    vscode.window.registerTreeDataProvider('vibetrace.globalTimeline', globalTimeline),
    vscode.window.registerTreeDataProvider('vibetrace.featureGraph', featureTree),
    vscode.window.registerTreeDataProvider('vibetrace.sessionChain', sessionTree),
  );

  // ── Commands ────────────────────────────────────────

  // Initialize VibeTrace for this project
  context.subscriptions.push(
    vscode.commands.registerCommand('vibetrace.initialize', async () => {
      const root = getWorkspaceRoot();
      if (!root) {
        vscode.window.showWarningMessage('VibeTrace: Open a workspace folder first.');
        return;
      }
      if (isProjectInitialized(root)) {
        vscode.window.showInformationMessage('VibeTrace is already initialized for this project.');
        return;
      }

      const editorType = await pickEditor();
      if (!editorType) { return; }

      // Create directories
      const eventsDir = vscode.Uri.file(path.join(root, '.vibe', 'events'));
      await vscode.workspace.fs.createDirectory(eventsDir);

      // Write rules file
      await setupRules(root, editorType);

      // Start data pipeline
      await dataProvider.initialize();
      log('DataProvider initialized');

      moduleDict = new ModuleDict(dataProvider);
      moduleDict.initialize();

      // Update context & refresh views
      vscode.commands.executeCommand('setContext', 'vibetrace:initialized', true);
      globalTimeline.refresh();
      featureTree.refresh();
      sessionTree.refresh();

      const label = EDITOR_LABELS[editorType];
      const filename = RULES_FILES[editorType];
      vscode.window.showInformationMessage(
        `VibeTrace initialized for ${label} (${filename}). AI will now auto-record conversations.`
      );
    }),

    // Refresh all views
    vscode.commands.registerCommand('vibetrace.refresh', () => {
      globalTimeline.refresh();
      featureTree.refresh();
      sessionTree.refresh();
      log('Views refreshed');
    }),

    // Open full dashboard (default tab)
    vscode.commands.registerCommand('vibetrace.openDashboard', () => {
      dashboardManager.open();
    }),

    // Open dashboard with specific tab
    vscode.commands.registerCommand('vibetrace.openTimeline', () => {
      dashboardManager.open('timeline');
    }),
    vscode.commands.registerCommand('vibetrace.openBusinessTree', () => {
      dashboardManager.open('business-tree');
    }),
    vscode.commands.registerCommand('vibetrace.openSessionFlow', () => {
      dashboardManager.open('session-flow');
    }),
  );

  // Open a file in the editor
  context.subscriptions.push(
    vscode.commands.registerCommand('vibetrace.openFile', async (filePath: string) => {
      const root = dataProvider.getWorkspaceRoot();
      if (!root) {
        vscode.window.showWarningMessage('No workspace folder open.');
        return;
      }
      const fullPath = path.join(root, filePath);
      const uri = vscode.Uri.file(fullPath);
      try {
        const doc = await vscode.workspace.openTextDocument(uri);
        await vscode.window.showTextDocument(doc, { preview: false });
      } catch {
        vscode.window.showErrorMessage(`File not found: ${filePath}`);
      }
    })
  );

  // Edit module name for an event (user correction)
  context.subscriptions.push(
    vscode.commands.registerCommand('vibetrace.editModule', async (eventItem: any) => {
      const eventId = eventItem?.id ?? eventItem?.event?.id;
      if (!eventId) { return; }

      const event = dataProvider.getById(eventId);
      if (!event) { return; }

      const newModule = await vscode.window.showInputBox({
        title: 'Edit Module Name',
        prompt: 'Enter the correct module name for this event',
        value: event.module,
        validateInput: (value) => {
          if (!value.trim()) { return 'Module name cannot be empty'; }
          return undefined;
        },
      });

      if (newModule && newModule !== event.module) {
        await dataProvider.updateModule(eventId, newModule.trim());
        log(`Module updated: ${event.module} → ${newModule}`);
      }
    })
  );

  // View event detail (webview)
  context.subscriptions.push(
    vscode.commands.registerCommand('vibetrace.viewDetail', (eventItem: any) => {
      const eventId = eventItem?.id ?? eventItem?.event?.id;
      if (!eventId) { return; }

      const event = dataProvider.getById(eventId);
      if (!event) { return; }

      const panel = vscode.window.createWebviewPanel(
        'vibetrace.eventDetail',
        `Event: ${truncateLabel(event.intent)}`,
        vscode.ViewColumn.One,
        { enableScripts: true, retainContextWhenHidden: true }
      );

      panel.webview.html = eventDetailHtml(event);

      panel.webview.onDidReceiveMessage((msg) => {
        if (msg.command === 'openFile') {
          vscode.commands.executeCommand('vibetrace.openFile', msg.path);
        }
      });
    })
  );

  // View feature flowchart (webview)
  context.subscriptions.push(
    vscode.commands.registerCommand('vibetrace.viewFeatureFlow', (moduleEntry: any) => {
      const moduleName = moduleEntry?.moduleName;
      if (!moduleName) { return; }

      const events = dataProvider.getByModule(moduleName);
      if (events.length === 0) { return; }

      const panel = vscode.window.createWebviewPanel(
        'vibetrace.featureFlow',
        `Feature: ${moduleName}`,
        vscode.ViewColumn.One,
        { enableScripts: true, retainContextWhenHidden: true }
      );

      panel.webview.html = featureFlowHtml(moduleName, events);

      panel.webview.onDidReceiveMessage((msg) => {
        if (msg.command === 'openFile') {
          vscode.commands.executeCommand('vibetrace.openFile', msg.path);
        }
      });
    })
  );

  // View session chain (webview)
  context.subscriptions.push(
    vscode.commands.registerCommand('vibetrace.viewSessionChain', (sessionEntry: any) => {
      const sessionId = sessionEntry?.sessionId;
      if (!sessionId) { return; }

      const events = dataProvider.getBySession(sessionId);
      if (events.length === 0) { return; }

      const panel = vscode.window.createWebviewPanel(
        'vibetrace.sessionChain',
        `Session: ${sessionId}`,
        vscode.ViewColumn.One,
        { enableScripts: true, retainContextWhenHidden: true }
      );

      panel.webview.html = sessionChainHtml(sessionId, events);

      panel.webview.onDidReceiveMessage((msg) => {
        if (msg.command === 'openFile') {
          vscode.commands.executeCommand('vibetrace.openFile', msg.path);
        }
      });
    })
  );

  // Rename session (user-friendly display name)
  context.subscriptions.push(
    vscode.commands.registerCommand('vibetrace.renameSession', async (sessionItem: any) => {
      const sessionId = sessionItem?.sessionId;
      if (!sessionId) { return; }

      const newName = await vscode.window.showInputBox({
        title: 'Rename Session',
        prompt: 'Enter a readable name for this session window',
        value: sessionId,
        validateInput: (value) => {
          if (!value.trim()) { return 'Session name cannot be empty'; }
          if (value === sessionId) { return 'Name is unchanged'; }
          if (dataProvider.getBySession(value).length > 0) { return 'A session with this name already exists'; }
          return undefined;
        },
      });

      if (newName && newName !== sessionId) {
        await dataProvider.renameSession(sessionId, newName.trim());
        log(`Session renamed: ${sessionId} → ${newName}`);
      }
    })
  );

  // Setup / update AI rules file
  context.subscriptions.push(
    vscode.commands.registerCommand('vibetrace.setupRules', async () => {
      const root = dataProvider.getWorkspaceRoot();
      if (!root) {
        vscode.window.showWarningMessage('VibeTrace: Open a workspace folder first.');
        return;
      }
      const editorType = await pickEditor();
      if (!editorType) { return; }
      const result = await setupRules(root, editorType);
      const filename = RULES_FILES[editorType];
      const label = EDITOR_LABELS[editorType];
      if (result === 'created') {
        vscode.window.showInformationMessage(`VibeTrace: ${filename} created for ${label}.`);
      } else if (result === 'updated') {
        vscode.window.showInformationMessage(`VibeTrace: ${filename} updated with VibeTrace recording rules.`);
      } else {
        vscode.window.showInformationMessage(`VibeTrace: ${filename} is already configured.`);
      }
    }),

    // Copy rules to clipboard (fallback for manual setup)
    vscode.commands.registerCommand('vibetrace.copyRules', async () => {
      await vscode.env.clipboard.writeText(CURSOR_RULES_CONTENT);
      vscode.window.showInformationMessage('VibeTrace: Rules copied to clipboard.');
    }),
  );

  // Register feature/session context menu commands
  context.subscriptions.push(
    vscode.commands.registerCommand('vibetrace._viewFeatureFlow', (item: any) => {
      vscode.commands.executeCommand('vibetrace.viewFeatureFlow', item);
    }),
    vscode.commands.registerCommand('vibetrace._viewSessionChain', (item: any) => {
      vscode.commands.executeCommand('vibetrace.viewSessionChain', item);
    }),
  );

  // Status bar item
  const statusBar = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );
  statusBar.command = 'vibetrace.refresh';
  statusBar.text = '$(history) VibeTrace';
  statusBar.tooltip = 'VibeTrace — Click to refresh';
  statusBar.show();
  context.subscriptions.push(statusBar);

  log('VibeTrace activated');
}

export function deactivate() {
  dashboardManager?.dispose();
  dataProvider?.dispose();
  moduleDict?.dispose();
  log('VibeTrace deactivated');
}

// ── Helpers ───────────────────────────────────────────

function getWorkspaceRoot(): string | undefined {
  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
}

async function pickEditor(): Promise<EditorType | undefined> {
  const items: vscode.QuickPickItem[] = [
    { label: '$(symbol-class) Cursor', description: '.cursorrules', detail: 'Cursor editor (cursor.com)' },
    { label: '$(symbol-constructor) Codex', description: 'AGENTS.md', detail: 'OpenAI Codex CLI / Codex Web' },
    { label: '$(symbol-module) Trae', description: 'RULES.md', detail: 'Trae editor (字节跳动)' },
  ];

  const picked = await vscode.window.showQuickPick(items, {
    placeHolder: 'Select your AI editor to configure rules file',
  });

  if (!picked) { return undefined; }
  if (picked.label.includes('Codex')) { return 'codex'; }
  if (picked.label.includes('Trae')) { return 'trae'; }
  return 'cursor';
}

function log(msg: string): void {
  console.log(`[VibeTrace] ${msg}`);
}

function truncateLabel(s: string, max = 30): string {
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}
