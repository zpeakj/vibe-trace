import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import AdmZip from 'adm-zip';
import { t } from './i18n';

export async function exportVibeData(workspaceRoot: string): Promise<void> {
  const vibeDir = path.join(workspaceRoot, '.vibe');

  if (!fs.existsSync(vibeDir)) {
    vscode.window.showWarningMessage(t('export.noData'));
    return;
  }

  const projectName = path.basename(workspaceRoot);
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const defaultName = `vibetrace-${projectName}-${dateStr}.zip`;
  const defaultUri = vscode.Uri.file(path.join(workspaceRoot, defaultName));

  const uri = await vscode.window.showSaveDialog({
    defaultUri,
    filters: { [t('export.filterLabel')]: ['zip'] },
    title: t('export.dialogTitle'),
  });

  if (!uri) { return; }

  const zip = new AdmZip();
  addDir(zip, vibeDir, '.vibe');
  zip.writeZip(uri.fsPath);

  vscode.window.showInformationMessage(t('export.success', { filename: path.basename(uri.fsPath) }));
}

function addDir(zip: AdmZip, dirPath: string, zipRoot: string): void {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dirPath, entry.name);
    const zipEntry = path.join(zipRoot, entry.name).replace(/\\/g, '/');
    if (entry.isDirectory()) {
      addDir(zip, full, zipEntry);
    } else {
      zip.addLocalFile(full, path.dirname(zipEntry));
    }
  }
}
