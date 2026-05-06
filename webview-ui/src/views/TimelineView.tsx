import { useState, useMemo } from 'react';
import { VibeEvent, openFile } from '../api';
import { filterBusinessFiles } from '../utils/filter';
import { Clock, FolderGit2, MessageSquare, AlertTriangle, ChevronDown } from 'lucide-react';

interface Props {
  events: VibeEvent[];
}

interface DayGroup {
  dateLabel: string;
  dateKey: string;
  events: VibeEvent[];
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso.slice(0, 25);
    return d.toLocaleString(undefined, {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso.slice(0, 25);
  }
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso.slice(0, 10);
    return d.toLocaleString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'short',
    });
  } catch {
    return iso.slice(0, 10);
  }
}

function extractDateKey(iso: string): string {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso.slice(0, 10);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  } catch {
    return iso.slice(0, 10);
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

function groupByDay(sorted: VibeEvent[]): DayGroup[] {
  const map = new Map<string, VibeEvent[]>();
  for (const ev of sorted) {
    const key = extractDateKey(ev.timestamp);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(ev);
  }
  return Array.from(map.entries()).map(([dateKey, dayEvents]) => ({
    dateKey,
    dateLabel: formatDate(dayEvents[0].timestamp),
    events: dayEvents,
  }));
}

export function TimelineView({ events }: Props) {
  const sorted = useMemo(
    () =>
      [...events].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      ),
    [events]
  );

  const dayGroups = useMemo(() => groupByDay(sorted), [sorted]);

  const [expandedDays, setExpandedDays] = useState<Set<string>>(() => {
    if (dayGroups.length === 0) return new Set();
    return new Set([dayGroups[0].dateKey]);
  });

  const toggleDay = (dateKey: string) => {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(dateKey)) {
        next.delete(dateKey);
      } else {
        next.add(dateKey);
      }
      return next;
    });
  };

  if (dayGroups.length === 0) {
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
    <div className="h-full overflow-y-auto px-4 py-4">
      {dayGroups.map((group, gi) => {
        const isOpen = expandedDays.has(group.dateKey);
        const isLatest = gi === 0;

        return (
          <div key={group.dateKey} className="mb-3">
            {/* Drawer header */}
            <button
              onClick={() => toggleDay(group.dateKey)}
              className={`
                w-full flex items-center gap-3 px-4 py-2.5 rounded-lg border text-left
                transition-colors group
                ${isOpen
                  ? 'border-zinc-700 bg-zinc-900/80 rounded-b-none'
                  : 'border-zinc-800 bg-zinc-900/60 hover:border-zinc-700'}
                ${isLatest && !isOpen ? 'ring-1 ring-emerald-500/20 border-emerald-500/30' : ''}
              `}
            >
              <ChevronDown
                className={`w-4 h-4 text-zinc-500 transition-transform ${isOpen ? '' : '-rotate-90'}`}
              />
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className={`text-sm font-medium ${isLatest ? 'text-emerald-400' : 'text-zinc-200'}`}>
                  {group.dateLabel}
                </span>
                {isLatest && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                    Latest
                  </span>
                )}
              </div>
              <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded">
                {group.events.length} event{group.events.length > 1 ? 's' : ''}
              </span>
            </button>

            {/* Drawer body */}
            {isOpen && (
              <div className="border-l-2 border-r border-b border-zinc-700 rounded-b-lg bg-zinc-900/60">
                <div className="relative ml-3 pl-8 border-l-2 border-zinc-800">
                  {group.events.map((ev, i) => {
                    const isFirstInGroup = i === 0;
                    const hasUnresolved = !!ev.unresolved_issues;

                    return (
                      <div key={ev.id} className="relative pb-5 last:pb-3">
                        {/* Dot */}
                        <div
                          className={`absolute -left-[calc(2rem+5px)] w-2.5 h-2.5 rounded-full border-2 border-zinc-950 ring-2 mt-2 ${
                            isFirstInGroup && isLatest
                              ? 'bg-emerald-500 ring-emerald-500/30'
                              : hasUnresolved
                                ? 'bg-amber-500 ring-amber-500/30'
                                : 'bg-zinc-600 ring-zinc-600/30'
                          }`}
                        />

                        {/* Card */}
                        <div className="rounded-lg border border-zinc-800 bg-zinc-900/80 hover:border-zinc-700 transition-colors">
                          {/* Header */}
                          <div className="flex items-center justify-between px-3 py-1.5 border-b border-zinc-800/60">
                            <div className="flex items-center gap-2">
                              <span className="flex items-center gap-1 text-[11px] text-zinc-500">
                                <Clock className="w-3 h-3" />
                                {formatTime(ev.timestamp)}
                              </span>
                              <span className="flex items-center gap-1 text-[10px] font-medium text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">
                                <FolderGit2 className="w-3 h-3" />
                                {ev.module}
                              </span>
                              <span className="flex items-center gap-1 text-[10px] text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded">
                                <MessageSquare className="w-3 h-3" />
                                {ev.session_id}
                              </span>
                            </div>
                            {ev.unresolved_issues && (
                              <span
                                className="flex items-center gap-1 text-[10px] text-amber-500"
                                title={ev.unresolved_issues}
                              >
                                <AlertTriangle className="w-3 h-3" />
                                Unresolved
                              </span>
                            )}
                          </div>

                          {/* Body */}
                          <div className="px-3 py-2.5">
                            {ev.original_prompt && (
                              <p className="text-[11px] text-zinc-500/70 italic mb-2 leading-relaxed">
                                &ldquo;{ev.original_prompt}&rdquo;
                              </p>
                            )}
                            <h3 className="font-semibold text-sm text-zinc-100 leading-snug">
                              {ev.intent}
                            </h3>
                            <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                              {ev.summary}
                            </p>

                            {/* Impact files */}
                            {filterBusinessFiles(ev.impactFiles).length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2.5">
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
            )}
          </div>
        );
      })}
    </div>
  );
}
