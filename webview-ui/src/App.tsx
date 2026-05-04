import { useEffect, useState, useCallback } from 'react';
import { cn } from './utils/cn';
import { isVsCode, getEvents, onMessage, VibeEvent } from './api';
import { BusinessTreeView } from './views/BusinessTreeView';
import { TimelineView } from './views/TimelineView';
import { SessionFlowView } from './views/SessionFlowView';
import {
  Clock,
  GitBranch,
  MessageSquare,
  ExternalLink,
} from 'lucide-react';

type TabId = 'timeline' | 'business-tree' | 'session-flow';

const TABS: { id: TabId; label: string; icon: typeof Clock }[] = [
  { id: 'timeline', label: 'Global Timeline', icon: Clock },
  { id: 'business-tree', label: 'Business Features', icon: GitBranch },
  { id: 'session-flow', label: 'Window Sessions', icon: MessageSquare },
];

export default function App() {
  const [events, setEvents] = useState<VibeEvent[]>([]);
  const [activeTab, setActiveTab] = useState<TabId>('timeline');
  const [env, setEnv] = useState('detecting...');

  useEffect(() => {
    setEnv(isVsCode ? 'VS Code' : 'Browser dev');

    onMessage((msg) => {
      if (msg.command === 'eventsData') {
        setEvents((msg.events as VibeEvent[]) ?? []);
      }
      if (msg.command === 'switchTab') {
        const tab = msg.tab as TabId | undefined;
        if (tab && TABS.some((t) => t.id === tab)) {
          setActiveTab(tab);
        }
      }
    });

    getEvents();
  }, []);

  const view = useCallback(() => {
    switch (activeTab) {
      case 'business-tree':
        return <BusinessTreeView events={events} />;
      case 'session-flow':
        return <SessionFlowView events={events} />;
      default:
        return <TimelineView events={events} />;
    }
  }, [activeTab, events]);

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-zinc-100">
      {/* Nav bar */}
      <header className="flex items-center justify-between border-b border-zinc-800 px-4 py-0 shrink-0">
        <nav className="flex items-center gap-0" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={activeTab === t.id}
              onClick={() => setActiveTab(t.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors',
                activeTab === t.id
                  ? 'border-emerald-500 text-emerald-400'
                  : 'border-transparent text-zinc-500 hover:text-zinc-300 hover:border-zinc-700'
              )}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-3 text-xs text-zinc-600">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            {env}
          </span>
          {events.length > 0 && (
            <span>{events.length} event{events.length > 1 ? 's' : ''}</span>
          )}
        </div>
      </header>

      {/* Viewport */}
      <main className="flex-1 overflow-hidden">{view()}</main>

      {/* Status bar */}
      <footer className="flex items-center justify-between border-t border-zinc-800 px-4 py-1 text-xs text-zinc-600 shrink-0">
        <span>VibeTrace Dashboard</span>
        <span className="flex items-center gap-1">
          <ExternalLink className="w-3 h-3" />
          Click a file path to open in editor
        </span>
      </footer>
    </div>
  );
}
