import * as vscode from 'vscode';
import { en } from './locales/en';
import { zh_cn } from './locales/zh-cn';

type Locale = Record<string, string>;

let locale: Locale = en;

function resolveLanguage(): string {
  const config = vscode.workspace.getConfiguration('vibetrace');
  const setting = config.get<string>('language', 'auto');
  if (setting === 'en') return 'en';
  if (setting === 'zh-cn') return 'zh-cn';
  // 'auto' — follow editor display language
  const lang = vscode.env.language.toLowerCase();
  return lang.startsWith('zh') ? 'zh-cn' : 'en';
}

export function refreshLocale(): void {
  locale = resolveLanguage() === 'zh-cn' ? zh_cn : en;
}

export function getLocale(): string {
  return resolveLanguage();
}

export function onConfigChange(e: vscode.ConfigurationChangeEvent): boolean {
  if (e.affectsConfiguration('vibetrace.language')) {
    refreshLocale();
    return true;
  }
  return false;
}

export function t(key: string, params?: Record<string, string | number>): string {
  let text = locale[key] ?? en[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    }
  }
  return text;
}
