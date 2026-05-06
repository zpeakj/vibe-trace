import * as vscode from 'vscode';
import * as path from 'path';
import { readFileSync } from 'fs';
import { DataProvider } from './data-provider';

/**
 * Manages the VibeTrace Dashboard webview panel.
 * Handles lifecycle, HTML loading, CSP, and bidirectional messaging.
 */
export class WebviewPanelManager {
  private panel: vscode.WebviewPanel | null = null;
  private dataProvider: DataProvider;
  private extensionUri: vscode.Uri;
  private disposables: vscode.Disposable[] = [];

  constructor(context: vscode.ExtensionContext, dataProvider: DataProvider) {
    this.extensionUri = context.extensionUri;
    this.dataProvider = dataProvider;
    context.subscriptions.push(this);
  }

  /** Create or reveal the dashboard panel, optionally switch to a specific tab */
  open(tab?: 'timeline' | 'business-tree' | 'session-flow'): void {
    if (this.panel) {
      this.panel.reveal(vscode.ViewColumn.One);
      if (tab) {
        this.panel.webview.postMessage({ command: 'switchTab', tab });
      }
      return;
    }

    this.panel = vscode.window.createWebviewPanel(
      'vibetrace.dashboard',
      'VibeTrace Dashboard',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(this.extensionUri, 'out', 'webview'),
        ],
      }
    );

    this.panel.iconPath = vscode.Uri.joinPath(
      this.extensionUri,
      'media',
      'icon.svg'
    );

    this.panel.webview.html = this.buildHtml();
    this.setupMessageHandlers();
    this.setupDataPush();

    // Route to specific tab if requested
    if (tab) {
      this.panel.webview.postMessage({ command: 'switchTab', tab });
    }

    this.panel.onDidDispose(
      () => {
        this.panel = null;
        this.disposables.forEach((d) => d.dispose());
        this.disposables = [];
      },
      null,
      this.disposables
    );
  }

  dispose(): void {
    this.panel?.dispose();
    this.disposables.forEach((d) => d.dispose());
  }

  // ── HTML construction ──────────────────────────────

  private buildHtml(): string {
    const webviewDir = vscode.Uri.joinPath(
      this.extensionUri,
      'out',
      'webview'
    );

    const htmlPath = vscode.Uri.joinPath(webviewDir, 'index.html');
    let html = readFileSync(htmlPath.fsPath, 'utf-8');

    // Convert local paths to webview URIs
    const jsUri = this.panel!.webview.asWebviewUri(
      vscode.Uri.joinPath(webviewDir, 'index.js')
    );
    const cssUri = this.panel!.webview.asWebviewUri(
      vscode.Uri.joinPath(webviewDir, 'index.css')
    );

    html = html.replace('./index.js', jsUri.toString());
    html = html.replace('./index.css', cssUri.toString());

    // Inject CSP before the closing head tag
    const csp = [
      `default-src 'none';`,
      `script-src ${this.panel!.webview.cspSource};`,
      `style-src ${this.panel!.webview.cspSource} 'unsafe-inline';`,
      `font-src ${this.panel!.webview.cspSource};`,
      `img-src ${this.panel!.webview.cspSource} data:;`,
    ].join(' ');

    html = html.replace(
      '</head>',
      `  <meta http-equiv="Content-Security-Policy" content="${csp}">\n  </head>`
    );

    return html;
  }

  // ── Message handling ───────────────────────────────

  private setupMessageHandlers(): void {
    this.panel!.webview.onDidReceiveMessage(
      (msg: { command: string; [key: string]: unknown }) => {
        switch (msg.command) {
          case 'getEvents':
            this.sendEvents();
            break;
          case 'openFile':
            this.openFile(msg.path as string);
            break;
          case 'updateEventModule':
            this.dataProvider.updateModule(
              msg.eventId as string,
              msg.newModule as string
            );
            break;
        }
      },
      null,
      this.disposables
    );
  }

  private setupDataPush(): void {
    this.dataProvider.onDidChange(() => {
      this.sendEvents();
    }, null, this.disposables);
  }

  private sendEvents(): void {
    const root = this.dataProvider.getWorkspaceRoot();
    this.panel?.webview.postMessage({
      command: 'eventsData',
      events: this.dataProvider.getAll(),
      projectName: root ? path.basename(root) : 'Untitled',
    });
  }

  private async openFile(filePath: string): Promise<void> {
    const root = this.dataProvider.getWorkspaceRoot();
    if (!root) { return; }

    const fullPath = path.join(root, filePath);
    const uri = vscode.Uri.file(fullPath);

    try {
      const doc = await vscode.workspace.openTextDocument(uri);
      await vscode.window.showTextDocument(doc, { preview: false });
    } catch {
      vscode.window.showErrorMessage(`File not found: ${filePath}`);
    }
  }
}
