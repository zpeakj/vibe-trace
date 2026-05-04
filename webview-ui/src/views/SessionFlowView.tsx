import { useState, useMemo } from 'react';
import { VibeEvent, openFile } from '../api';
import { filterBusinessFiles } from '../utils/filter';
import {
  MessageSquare,
  Clock,
  FolderGit2,
  ChevronRight,
  FileCode,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '../utils/cn';

interface Props {
  events: VibeEvent[];
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso.slice(0, 25);
    return d.toLocaleString(undefined, {
      hour12: false,
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso.slice(0, 25);
  }
}

function actionDot(action: string) {
  switch (action) {
    case 'create': return 'bg-emerald-500';
    case 'modify': return 'bg-yellow-500';
    case 'delete': return 'bg-red-500';
    default: return 'bg-zinc-500';
  }
}

export function SessionFlowView({ events }: Props) {
  const [selected, setSelected] = useState<string | null>(null);

  const sessions = useMemo(() => {
    const map = new Map<string, VibeEvent[]>();
    for (const ev of events) {
      const list = map.get(ev.session_id) ?? [];
      list.push(ev);
      map.set(ev.session_id, list);
    }
    // Sort each session's events newest first
    const result: { id: string; events: VibeEvent[]; modules: string[] }[] = [];
    for (const [id, evts] of map) {
      evts.sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      const modSet = new Set(evts.map((e) => e.module));
      result.push({ id, events: evts, modules: Array.from(modSet).sort() });
    }
    // Sessions with most recent activity first
    result.sort(
      (a, b) =>
        new Date(b.events[0].timestamp).getTime() -
        new Date(a.events[0].timestamp).getTime()
    );
    return result;
  }, [events]);

  // Auto-select first session
  const active = selected
    ? sessions.find((s) => s.id === selected)
    : sessions[0];

  if (sessions.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-500">
        <div className="text-center">
          <MessageSquare className="w-12 h-12 mx-auto mb-3 text-zinc-700" />
          <p className="text-lg font-medium">No sessions yet</p>
          <p className="text-sm mt-1">Open an agent window and start a conversation.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Left: session list */}
      <aside className="w-72 shrink-0 border-r border-zinc-800 overflow-y-auto bg-zinc-950/50">
        <div className="px-3 py-3 border-b border-zinc-800 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
          Sessions ({sessions.length})
        </div>
        {sessions.map((s) => (
          <button
            key={s.id}
            onClick={() => setSelected(s.id)}
            className={cn(
              'w-full text-left px-3 py-3 border-b border-zinc-800/50 transition-colors hover:bg-zinc-900/50',
              active?.id === s.id
                ? 'bg-zinc-900 border-l-2 border-l-emerald-500 pl-[10px]'
                : 'border-l-2 border-l-transparent pl-[10px]'
            )}
          >
            <div className="flex items-center gap-2">
              <ChevronRight
                className={cn(
                  'w-3 h-3 shrink-0 transition-transform',
                  active?.id === s.id ? 'text-emerald-400 rotate-90' : 'text-zinc-600'
                )}
              />
              <span
                className={cn(
                  'text-sm font-medium truncate',
                  active?.id === s.id ? 'text-emerald-300' : 'text-zinc-300'
                )}
              >
                {s.id}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1.5 ml-5">
              <span className="text-[11px] text-zinc-500">
                {s.events.length} turn{s.events.length > 1 ? 's' : ''}
              </span>
              <span className="text-[11px] text-zinc-700">·</span>
              <span className="text-[11px] text-zinc-600 truncate">
                {s.modules.join(', ')}
              </span>
            </div>
          </button>
        ))}
      </aside>

      {/* Right: session detail */}
      <main className="flex-1 overflow-y-auto">
        {active ? (
          <div className="px-6 py-4">
            <div className="flex items-center gap-3 mb-6">
              <MessageSquare className="w-5 h-5 text-emerald-400" />
              <div>
                <h2 className="text-lg font-bold text-zinc-100">{active.id}</h2>
                <p className="text-sm text-zinc-500">
                  {active.events.length} turn{active.events.length > 1 ? 's' : ''}
                  {' · '}
                  {active.modules.join(', ')}
                </p>
              </div>
            </div>

            {/* Event cards — newest first */}
            <div className="space-y-4">
              {active.events.map((ev, i) => (
                <div
                  key={ev.id}
                  className="rounded-lg border border-zinc-800 bg-zinc-900/80"
                >
                  {/* Turn header */}
                  <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800/60">
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] font-mono text-zinc-600">
                        #{active.events.length - i}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-zinc-500">
                        <Clock className="w-3 h-3" />
                        {formatTime(ev.timestamp)}
                      </span>
                      <span className="flex items-center gap-1 text-xs font-medium text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">
                        <FolderGit2 className="w-3 h-3" />
                        {ev.module}
                      </span>
                    </div>
                    {ev.unresolved_issues && (
                      <span
                        className="flex items-center gap-1 text-xs text-amber-500"
                        title={ev.unresolved_issues}
                      >
                        <AlertTriangle className="w-3 h-3" />
                      </span>
                    )}
                  </div>

                  {/* Body */}
                  <div className="px-4 py-3">
                    <h3 className="font-semibold text-sm text-zinc-100">
                      {ev.intent}
                    </h3>
                    <p className="text-xs text-zinc-500 mt-1.5 leading-relaxed">
                      {ev.summary}
                    </p>

                    {/* Files */}
                    {filterBusinessFiles(ev.impactFiles).length > 0 && (
                      <div className="mt-3 space-y-1">
                        {filterBusinessFiles(ev.impactFiles).map((f) => (
                          <button
                            key={f.path}
                            onClick={() => openFile(f.path)}
                            className="flex items-center gap-2 w-full text-left px-3 py-1.5 rounded hover:bg-zinc-800/50 transition-colors group"
                          >
                            <span
                              className={`w-2 h-2 rounded-full shrink-0 ${actionDot(f.action)}`}
                            />
                            <FileCode className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-400" />
                            <code className="text-xs text-zinc-400 group-hover:text-zinc-200 font-mono">
                              {f.path}
                            </code>
                            <span className="text-[10px] text-zinc-600 group-hover:text-zinc-500 ml-auto">
                              {f.action}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-zinc-500">
            Select a session to view its conversation chain.
          </div>
        )}
      </main>
    </div>
  );
}
