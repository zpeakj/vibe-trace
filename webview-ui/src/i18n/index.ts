import { en } from './locales/en';
import { zh_cn } from './locales/zh-cn';

type Locale = Record<string, string>;

let currentLocale: Locale = en;

export function setLocale(lang: string): void {
  currentLocale = lang.startsWith('zh') ? zh_cn : en;
}

export function t(key: string, params?: Record<string, string | number>): string {
  let text = currentLocale[key] ?? en[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    }
  }
  return text;
}
