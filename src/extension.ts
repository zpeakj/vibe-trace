import * as vscode from 'vscode';
import * as path from 'path';
import { DataProvider, isProjectInitialized, saveEditorType, getEditorType } from './data-provider';
import { ModuleDict } from './module-dict';
import { GlobalTimelineProvider } from './views/global-timeline';
import { FeatureTreeProvider } from './views/feature-tree';
import { SessionTreeProvider } from './views/session-tree';
import { eventDetailHtml, featureFlowHtml, sessionChainHtml } from './views/webview-content';
import { CURSOR_RULES_CONTENT, setupRules, EDITOR_LABELS, type EditorType, RULES_FILES } from './rules';
import { WebviewPanelManager } from './WebviewPanelManager';
import { exportVibeData } from './export';
import { refreshLocale, onConfigChange, t } from './i18n';

let dataProvider: DataProvider;
let moduleDict: ModuleDict;
let dashboardManager: WebviewPanelManager;

export async function activate(context: vscode.ExtensionContext) {
  refreshLocale();
  const root = getWorkspaceRoot();
  const initialized = root ? isProjectInitialized(root) : false;

  // ── Context key for viewsWelcome ────────────────────
  vscode.commands.executeCommand('setContext', 'vibetrace:initialized', initialized);

  // ── Data layer ──────────────────────────────────────
  dataProvider = new DataProvider();

  if (initialized) {
    // Auto-update rules to latest version (self-healing overwrite)
    let savedEditor = getEditorType(root!);
    if (!savedEditor) {
      // One-time repair for projects initialized before editor-type tracking existed
      savedEditor = await pickEditor();
      if (savedEditor) {
        await saveEditorType(root!, savedEditor);
        log(`Editor type repaired: ${savedEditor}`);
      }
    }
    if (savedEditor) {
      setupRules(root!, savedEditor).then(result => {
        if (result !== 'unchanged') { log(`Rules auto-updated: ${result}`); }
      });
    }
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
        vscode.window.showWarningMessage(t('notify.noWorkspace'));
        return;
      }
      if (isProjectInitialized(root)) {
        vscode.window.showInformationMessage(t('notify.alreadyInitialized'));
        return;
      }

      const editorType = await pickEditor();
      if (!editorType) { return; }

      // Create directories
      const eventsDir = vscode.Uri.file(path.join(root, '.vibe', 'events'));
      await vscode.workspace.fs.createDirectory(eventsDir);

      // Write rules file
      await setupRules(root, editorType);
      await saveEditorType(root, editorType);

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
        t('notify.initialized', { editor: label, file: filename })
      );
    }),

    // Refresh all views
    vscode.commands.registerCommand('vibetrace.refresh', () => {
      globalTimeline.refresh();
      featureTree.refresh();
      sessionTree.refresh();
      log('Views refreshed');
    }),

    // Toggle collapse/expand for each view
    vscode.commands.registerCommand('vibetrace.toggleCollapseTimeline', () => {
      globalTimeline.toggleCollapse();
    }),
    vscode.commands.registerCommand('vibetrace.toggleCollapseFeatures', () => {
      featureTree.toggleCollapse();
    }),
    vscode.commands.registerCommand('vibetrace.toggleCollapseSessions', () => {
      sessionTree.toggleCollapse();
    }),

    // Export .vibe data as zip
    vscode.commands.registerCommand('vibetrace.export', async () => {
      const root = dataProvider.getWorkspaceRoot();
      if (!root) {
        vscode.window.showWarningMessage(t('notify.noWorkspace'));
        return;
      }
      await exportVibeData(root);
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
        vscode.window.showWarningMessage(t('notify.noWorkspaceFile'));
        return;
      }
      const fullPath = path.join(root, filePath);
      const uri = vscode.Uri.file(fullPath);
      try {
        const doc = await vscode.workspace.openTextDocument(uri);
        await vscode.window.showTextDocument(doc, { preview: false });
      } catch {
        vscode.window.showErrorMessage(t('notify.fileNotFound', { path: filePath }));
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
        title: t('input.editModule.title'),
        prompt: t('input.editModule.prompt'),
        value: event.module,
        validateInput: (value) => {
          if (!value.trim()) { return t('input.editModule.emptyError'); }
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
        t('panel.event', { title: truncateLabel(event.intent) }),
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
        t('panel.feature', { name: moduleName }),
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
        t('panel.session', { name: sessionId }),
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
        title: t('input.renameSession.title'),
        prompt: t('input.renameSession.prompt'),
        value: sessionId,
        validateInput: (value) => {
          if (!value.trim()) { return t('input.renameSession.emptyError'); }
          if (value === sessionId) { return t('input.renameSession.unchanged'); }
          if (dataProvider.getBySession(value).length > 0) { return t('input.renameSession.duplicate'); }
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
        vscode.window.showWarningMessage(t('notify.noWorkspace'));
        return;
      }
      const editorType = await pickEditor();
      if (!editorType) { return; }
      const result = await setupRules(root, editorType);
      const filename = RULES_FILES[editorType];
      const label = EDITOR_LABELS[editorType];
      if (result === 'created') {
        vscode.window.showInformationMessage(t('notify.rulesCreated', { file: filename, editor: label }));
      } else if (result === 'updated') {
        vscode.window.showInformationMessage(t('notify.rulesUpdated', { file: filename }));
      } else {
        vscode.window.showInformationMessage(t('notify.rulesUnchanged', { file: filename }));
      }
    }),

    // Copy rules to clipboard (fallback for manual setup)
    vscode.commands.registerCommand('vibetrace.copyRules', async () => {
      await vscode.env.clipboard.writeText(CURSOR_RULES_CONTENT);
      vscode.window.showInformationMessage(t('notify.rulesCopied'));
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
  statusBar.text = t('statusbar.text');
  statusBar.tooltip = t('statusbar.tooltip');
  statusBar.show();
  context.subscriptions.push(statusBar);

  // ── Config change watcher ──────────────────────────
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (onConfigChange(e)) {
        globalTimeline.refresh();
        featureTree.refresh();
        sessionTree.refresh();
        statusBar.text = t('statusbar.text');
        statusBar.tooltip = t('statusbar.tooltip');
        dashboardManager.pushLocale();
      }
      if (e.affectsConfiguration('vibetrace.theme')) {
        dashboardManager.pushLocale();
      }
    })
  );

  // ── Switch language command ────────────────────────
  context.subscriptions.push(
    vscode.commands.registerCommand('vibetrace.switchLanguage', async () => {
      const config = vscode.workspace.getConfiguration('vibetrace');
      const current = config.get<string>('language', 'auto');
      const options: string[] = ['auto', 'en', 'zh-cn'];
      const labels: Record<string, string> = {
        auto: 'Auto (follow editor)',
        en: 'English',
        'zh-cn': '简体中文',
      };
      const idx = options.indexOf(current ?? 'auto');
      const next = options[(idx + 1) % options.length];
      await config.update('language', next, vscode.ConfigurationTarget.Global);
      vscode.window.showInformationMessage(`VibeTrace: ${labels[next]}`);
    })
  );

  // ── Switch theme command ───────────────────────────
  context.subscriptions.push(
    vscode.commands.registerCommand('vibetrace.switchTheme', async () => {
      const config = vscode.workspace.getConfiguration('vibetrace');
      const current = config.get<string>('theme', 'auto');
      const options: string[] = ['auto', 'light', 'dark'];
      const labels: Record<string, string> = {
        auto: 'Auto (follow editor)',
        light: 'Light',
        dark: 'Dark',
      };
      const idx = options.indexOf(current ?? 'auto');
      const next = options[(idx + 1) % options.length];
      await config.update('theme', next, vscode.ConfigurationTarget.Global);
      vscode.window.showInformationMessage(`VibeTrace theme: ${labels[next]}`);
    })
  );

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
    { label: t('editor.cursor.label'), description: t('editor.cursor.desc'), detail: t('editor.cursor.detail') },
    { label: t('editor.codex.label'), description: t('editor.codex.desc'), detail: t('editor.codex.detail') },
    { label: t('editor.trae.label'), description: t('editor.trae.desc'), detail: t('editor.trae.detail') },
  ];

  const picked = await vscode.window.showQuickPick(items, {
    placeHolder: t('editor.pickPlaceholder'),
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
