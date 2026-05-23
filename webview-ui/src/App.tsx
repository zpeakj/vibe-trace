import { useEffect, useState, useCallback } from 'react';
import { cn } from './utils/cn';
import { isVsCode, getEvents, onMessage, VibeEvent } from './api';
import { BusinessTreeView } from './views/BusinessTreeView';
import { TimelineView } from './views/TimelineView';
import { SessionFlowView } from './views/SessionFlowView';
import { t, setLocale } from './i18n';
import {
  Clock,
  GitBranch,
  MessageSquare,
  ExternalLink,
} from 'lucide-react';

type TabId = 'timeline' | 'business-tree' | 'session-flow';

const TAB_ICONS: Record<TabId, typeof Clock> = {
  timeline: Clock,
  'business-tree': GitBranch,
  'session-flow': MessageSquare,
};

export default function App() {
  const [events, setEvents] = useState<VibeEvent[]>([]);
  const [projectName, setProjectName] = useState<string>(t('app.untitled'));
  const [activeTab, setActiveTab] = useState<TabId>('timeline');
  const [env, setEnv] = useState(t('app.detecting'));

  useEffect(() => {
    setEnv(isVsCode ? t('app.env.vscode') : t('app.env.browser'));

    onMessage((msg) => {
      if (msg.command === 'eventsData') {
        const locale = (msg.locale as string) ?? 'en';
        setLocale(locale);
        setEvents((msg.events as VibeEvent[]) ?? []);
        setProjectName((msg.projectName as string) ?? t('app.untitled'));

        // Apply theme override from extension config
        const theme = (msg.theme as string) ?? 'auto';
        applyTheme(theme);
      }
      if (msg.command === 'switchTab') {
        const tab = msg.tab as TabId | undefined;
        if (tab && tab in TAB_ICONS) {
          setActiveTab(tab);
        }
      }
    });

    getEvents();
  }, []);

  const view = useCallback(() => {
    switch (activeTab) {
      case 'business-tree':
        return <BusinessTreeView events={events} projectName={projectName} />;
      case 'session-flow':
        return <SessionFlowView events={events} />;
      default:
        return <TimelineView events={events} />;
    }
  }, [activeTab, events]);

  return (
    <div className="flex flex-col h-screen bg-vt-bg text-vt-text">
      {/* Nav bar */}
      <header className="flex items-center justify-between border-b border-vt-border px-4 py-0 shrink-0">
        <nav className="flex items-center gap-0" role="tablist">
          {(Object.keys(TAB_ICONS) as TabId[]).map((id) => {
            const Icon = TAB_ICONS[id];
            return (
            <button
              key={id}
              role="tab"
              aria-selected={activeTab === id}
              onClick={() => setActiveTab(id)}
              className={cn(
                'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors',
                activeTab === id
                  ? 'border-emerald-500 text-emerald-400'
                  : 'border-transparent text-vt-text-muted hover:text-vt-text-alt hover:border-vt-border-alt'
              )}
            >
              <Icon className="w-4 h-4" />
              {id === 'timeline' ? t('app.tab.timeline') : id === 'business-tree' ? t('app.tab.features') : t('app.tab.sessions')}
            </button>
            );
          })}
        </nav>

        <div className="flex items-center gap-3 text-xs text-vt-text-subtle">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            {env}
          </span>
          {events.length > 0 && (
            <span>{t('app.eventCount', { count: events.length })}</span>
          )}
        </div>
      </header>

      {/* Viewport */}
      <main className="flex-1 overflow-hidden">{view()}</main>

      {/* Status bar */}
      <footer className="flex items-center justify-between border-t border-vt-border px-4 py-1 text-xs text-vt-text-subtle shrink-0">
        <span>{t('app.brand')}</span>
        <span className="flex items-center gap-1">
          <ExternalLink className="w-3 h-3" />
          {t('app.hint')}
        </span>
      </footer>
    </div>
  );
}

function applyTheme(theme: string) {
  const root = document.documentElement;
  if (theme === 'light') {
    root.classList.remove('vt-dark');
    root.classList.add('vt-light');
    root.style.colorScheme = 'light';
  } else if (theme === 'dark') {
    root.classList.remove('vt-light');
    root.classList.add('vt-dark');
    root.style.colorScheme = 'dark';
  } else {
    // auto — follow VS Code theme detected by inline script in index.html
    // Re-run the detection
    const c = document.body.classList;
    const isLight = c.contains('vscode-light') || c.contains('vscode-high-contrast-light');
    root.classList.toggle('vt-dark', !isLight);
    root.classList.toggle('vt-light', isLight);
    root.style.colorScheme = isLight ? 'light' : 'dark';
  }
}
