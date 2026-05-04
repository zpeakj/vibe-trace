import { VibeEvent, openFile } from '../api';
import { filterBusinessFiles } from '../utils/filter';
import { Clock, FolderGit2, MessageSquare, AlertTriangle } from 'lucide-react';

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

function actionBadge(action: string) {
  const map: Record<string, string> = {
    create: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    modify: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    delete: 'bg-red-500/20 text-red-400 border-red-500/30',
    read: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
  };
  return map[action] ?? map.read;
}

export function TimelineView({ events }: Props) {
  const sorted = [...events].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  if (sorted.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-500">
        <div className="text-center">
          <Clock className="w-12 h-12 mx-auto mb-3 text-zinc-700" />
          <p className="text-lg font-medium">No events yet</p>
          <p className="text-sm mt-1">Start a conversation to begin tracing.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto px-6 py-4">
      {/* Vertical timeline */}
      <div className="relative ml-3 pl-8 border-l-2 border-zinc-800">
        {sorted.map((ev, i) => {
          const isLatest = i === 0;
          return (
            <div key={ev.id} className="relative mb-6 last:mb-0">
              {/* Dot */}
              <div
                className={`absolute -left-[calc(2rem+5px)] w-3 h-3 rounded-full border-2 border-zinc-950 ring-2 mt-1.5 ${
                  isLatest
                    ? 'bg-emerald-500 ring-emerald-500/30'
                    : ev.unresolved_issues
                      ? 'bg-amber-500 ring-amber-500/30'
                      : 'bg-zinc-600 ring-zinc-600/30'
                }`}
              />

              {/* Card */}
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/80 hover:border-zinc-700 transition-colors">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800/60">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-xs text-zinc-500">
                      <Clock className="w-3 h-3" />
                      {formatTime(ev.timestamp)}
                    </span>
                    <span className="flex items-center gap-1 text-xs font-medium text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">
                      <FolderGit2 className="w-3 h-3" />
                      {ev.module}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded">
                      <MessageSquare className="w-3 h-3" />
                      {ev.session_id}
                    </span>
                  </div>
                  {ev.unresolved_issues && (
                    <span
                      className="flex items-center gap-1 text-xs text-amber-500"
                      title={ev.unresolved_issues}
                    >
                      <AlertTriangle className="w-3 h-3" />
                      Unresolved
                    </span>
                  )}
                </div>

                {/* Body */}
                <div className="px-4 py-3">
                  <h3 className="font-semibold text-sm text-zinc-100 leading-snug">
                    {ev.intent}
                  </h3>
                  <p className="text-xs text-zinc-500 mt-1.5 leading-relaxed">
                    {ev.summary}
                  </p>

                  {/* Impact files */}
                  {filterBusinessFiles(ev.impactFiles).length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {filterBusinessFiles(ev.impactFiles).map((f) => (
                        <button
                          key={f.path}
                          onClick={() => openFile(f.path)}
                          className={`
                            inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border font-mono
                            hover:brightness-125 transition-all cursor-pointer
                            ${actionBadge(f.action)}
                          `}
                          title={`${f.action}: ${f.description}`}
                        >
                          {f.action}
                          <span className="opacity-80">{f.path.split('/').pop()}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
