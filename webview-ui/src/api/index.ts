// ── Types (mirrors extension src/types.ts) ──────────────

export type FileAction = 'create' | 'modify' | 'delete' | 'read';

export interface ImpactFile {
  path: string;
  action: FileAction;
  description: string;
}

export interface VibeEvent {
  id: string;
  timestamp: string;
  session_id: string;
  module: string;
  intent: string;
  summary: string;
  impactFiles: ImpactFile[];
  original_prompt?: string;
  unresolved_issues?: string;
}

// ── Message types ───────────────────────────────────────

interface ExtensionMessage {
  command: string;
  [key: string]: unknown;
}

type MessageHandler = (msg: ExtensionMessage) => void;

// ── Environment detection ───────────────────────────────

export const isVsCode = typeof acquireVsCodeApi === 'function';

const vscode = isVsCode ? acquireVsCodeApi() : null;

// ── Message listeners ───────────────────────────────────

const handlers: MessageHandler[] = [];

if (isVsCode) {
  window.addEventListener('message', (event) => {
    const msg = event.data as ExtensionMessage;
    if (msg && typeof msg.command === 'string') {
      handlers.forEach((fn) => fn(msg));
    }
  });
}

export function onMessage(fn: MessageHandler): () => void {
  handlers.push(fn);
  return () => {
    const idx = handlers.indexOf(fn);
    if (idx >= 0) handlers.splice(idx, 1);
  };
}

// ── API functions ───────────────────────────────────────

export function getEvents(): void {
  if (isVsCode) {
    vscode!.postMessage({ command: 'getEvents' });
  } else {
    // Browser dev mode — simulate async response with mock data
    setTimeout(() => {
      const msg: ExtensionMessage = {
        command: 'eventsData',
        events: MOCK_EVENTS,
        projectName: 'MyVibeProject',
      };
      handlers.forEach((fn) => fn(msg));
    }, 300);
  }
}

export function openFile(filePath: string): void {
  if (isVsCode) {
    vscode!.postMessage({ command: 'openFile', path: filePath });
  } else {
    console.log(`[VibeTrace] openFile: ${filePath}`);
  }
}

export function updateEventModule(eventId: string, newModule: string): void {
  if (isVsCode) {
    vscode!.postMessage({ command: 'updateEventModule', eventId, newModule });
  } else {
    console.log(`[VibeTrace] updateEventModule: ${eventId} → ${newModule}`);
  }
}

// ── Mock data (browser dev mode) ────────────────────────

const MOCK_EVENTS: VibeEvent[] = [
  {
    id: '20260504-LoginPage-k7m-x9k',
    timestamp: '2026-05-04T00:20:00+08:00',
    session_id: 'LoginPage-k7m',
    module: 'Auth',
    original_prompt: 'I need to add WeChat QR code login to the existing login modal. Users should be able to scan a QR code with WeChat to log in instead of entering their password.',
    intent: 'Add WeChat QR code login to the login modal',
    summary:
      'Created WeChatQR component, added OAuth callback handling in user store, wired up backend verification route.',
    impactFiles: [
      {
        path: 'src/components/WeChatQR.tsx',
        action: 'create',
        description: 'QR code display component with polling',
      },
      {
        path: 'src/store/userStore.ts',
        action: 'modify',
        description: 'Added wechat_openid field and setter',
      },
      {
        path: 'src/api/wechat.ts',
        action: 'create',
        description: 'OAuth request helpers for WeChat backend',
      },
    ],
    unresolved_issues:
      'Need real WeChat AppID and Secret in environment variables',
  },
  {
    id: '20260504-UserStateRefactor-p2x-m4z',
    timestamp: '2026-05-04T14:15:00+08:00',
    session_id: 'UserStateRefactor-p2x',
    module: 'Auth',
    original_prompt: 'Now that WeChat login works, I want to also support Google and Apple login. Can you refactor the auth system to support multiple OAuth providers?',
    intent: 'Refactor user state management to support multiple OAuth providers',
    summary:
      'Extracted OAuth logic into a generic auth provider pattern. Moved WeChat-specific code into its own adapter.',
    impactFiles: [
      {
        path: 'src/store/userStore.ts',
        action: 'modify',
        description: 'Generalized auth state, removed WeChat-specific fields',
      },
      {
        path: 'src/auth/providers/wechat.ts',
        action: 'create',
        description: 'WeChat adapter implementing generic AuthProvider interface',
      },
      {
        path: 'src/auth/types.ts',
        action: 'create',
        description: 'AuthProvider interface and common types',
      },
    ],
  },
  {
    id: '20260504-DashboardPage-w3c-n5q',
    timestamp: '2026-05-04T18:30:00+08:00',
    session_id: 'DashboardPage-w3c',
    module: 'UI_Components',
    original_prompt: 'Build me an analytics dashboard page with line charts showing user signups and revenue over time. Needs to look modern and match the existing UI.',
    intent: 'Create a new analytics dashboard page with charts',
    summary:
      'Built dashboard layout with chart components, added data fetching hook, created reusable stat card and chart primitives.',
    impactFiles: [
      {
        path: 'src/pages/Dashboard.tsx',
        action: 'create',
        description: 'Main dashboard page with grid layout',
      },
      {
        path: 'src/components/StatCard.tsx',
        action: 'create',
        description: 'Reusable stat display card',
      },
      {
        path: 'src/components/LineChart.tsx',
        action: 'create',
        description: 'Recharts-based line chart wrapper',
      },
      {
        path: 'src/hooks/useAnalytics.ts',
        action: 'create',
        description: 'SWR-based data fetching for analytics API',
      },
    ],
  },
];
