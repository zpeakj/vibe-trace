import { useState, useMemo } from 'react';
import { VibeEvent, openFile } from '../api';
import { filterBusinessFiles } from '../utils/filter';
import { actionBadge } from '../utils/theme';
import { t } from '../i18n';
import { Clock, FolderGit2, MessageSquare, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';

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

  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());

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
      <div className="flex items-center justify-center h-full text-vt-text-muted">
        <div className="text-center">
          <Clock className="w-12 h-12 mx-auto mb-3 text-vt-empty-icon" />
          <p className="text-lg font-medium">{t('timeline.empty.title')}</p>
          <p className="text-sm mt-1">{t('timeline.empty.desc')}</p>
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
                  ? 'border-vt-border-alt bg-vt-bg-alt/80 rounded-b-none'
                  : 'border-vt-border bg-vt-bg-alt/60 hover:border-vt-border-alt'}
                ${isLatest && !isOpen ? 'ring-1 ring-emerald-500/20 border-emerald-500/30' : ''}
              `}
            >
              <ChevronDown
                className={`w-4 h-4 text-vt-text-muted transition-transform ${isOpen ? '' : '-rotate-90'}`}
              />
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className={`text-sm font-medium ${isLatest ? 'text-emerald-400' : 'text-vt-text-alt'}`}>
                  {group.dateLabel}
                </span>
                {isLatest && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                    {t('timeline.latest')}
                  </span>
                )}
              </div>
              <span className="text-xs text-vt-text-muted bg-vt-surface px-2 py-0.5 rounded">
                {t('common.events', { count: group.events.length })}
              </span>
            </button>

            {/* Drawer body */}
            {isOpen && (
              <div className="border-l-2 border-r border-b border-vt-border-alt rounded-b-lg bg-vt-bg-alt/60">
                <div className="relative ml-3 pl-8 border-l-2 border-vt-border">
                  {group.events.map((ev, i) => {
                    const isFirstInGroup = i === 0;
                    const hasUnresolved = !!ev.unresolved_issues;

                    return (
                      <div key={ev.id} className="relative pb-5 last:pb-3">
                        {/* Dot */}
                        <div
                          className={`absolute -left-[calc(2rem+5px)] w-2.5 h-2.5 rounded-full border-2 border-vt-bg ring-2 mt-2 ${
                            isFirstInGroup && isLatest
                              ? 'bg-emerald-500 ring-emerald-500/30'
                              : hasUnresolved
                                ? 'bg-amber-500 ring-amber-500/30'
                                : 'bg-vt-text-subtle ring-vt-text-muted/30'
                          }`}
                        />

                        {/* Card */}
                        <div className="rounded-lg border border-vt-border bg-vt-bg-alt/80 hover:border-vt-border-alt transition-colors">
                          {/* Header */}
                          <div className="flex items-center justify-between px-3 py-1.5 border-b border-vt-border/60">
                            <div className="flex items-center gap-2">
                              <span className="flex items-center gap-1 text-[11px] text-vt-text-muted">
                                <Clock className="w-3 h-3" />
                                {formatTime(ev.timestamp)}
                              </span>
                              <span className="flex items-center gap-1 text-[10px] font-medium text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">
                                <FolderGit2 className="w-3 h-3" />
                                {ev.module}
                              </span>
                              <span className="flex items-center gap-1 text-[10px] text-vt-text-muted bg-vt-surface px-1.5 py-0.5 rounded">
                                <MessageSquare className="w-3 h-3" />
                                {ev.session_id}
                              </span>
                            </div>
                            {ev.unresolved_issues && (
                              <span className="flex items-center gap-1 text-[10px] text-amber-500">
                                <AlertTriangle className="w-3 h-3" />
                                {t('timeline.unresolved')}
                              </span>
                            )}
                          </div>

                          {/* Body */}
                          <div className="px-3 py-2.5">
                            {ev.original_prompt && (
                              <p className="text-[11px] text-vt-text-quote/70 italic mb-2 leading-relaxed">
                                &ldquo;{ev.original_prompt}&rdquo;
                              </p>
                            )}
                            <h3 className="font-semibold text-sm text-vt-text leading-snug">
                              {ev.intent}
                            </h3>
                            <p className="text-xs text-vt-text-muted mt-1 leading-relaxed">
                              {ev.summary}
                            </p>

                            {ev.unresolved_issues && (
                              <div className="mt-2.5 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2">
                                <div className="flex items-center gap-1.5 mb-1">
                                  <AlertTriangle className="w-3 h-3 text-amber-500" />
                                  <span className="text-[10px] font-semibold text-amber-400">
                                    {t('timeline.unresolved')}
                                  </span>
                                </div>
                                <p className="text-xs text-amber-500/80 leading-relaxed">
                                  {ev.unresolved_issues}
                                </p>
                              </div>
                            )}

                            {/* Impact files */}
                            {filterBusinessFiles(ev.impactFiles).length > 0 && (() => {
                              const files = filterBusinessFiles(ev.impactFiles);
                              const isOpen = expandedFiles.has(ev.id);
                              return (
                                <div className="mt-2.5">
                                  <button
                                    onClick={() => {
                                      setExpandedFiles(prev => {
                                        const next = new Set(prev);
                                        if (next.has(ev.id)) {
                                          next.delete(ev.id);
                                        } else {
                                          next.add(ev.id);
                                        }
                                        return next;
                                      });
                                    }}
                                    className="flex items-center gap-1 text-[10px] text-vt-text-muted hover:text-vt-text-alt transition-colors"
                                  >
                                    {isOpen
                                      ? <ChevronDown className="w-3 h-3" />
                                      : <ChevronRight className="w-3 h-3" />
                                    }
                                    {t('timeline.filesAffected', { count: files.length })}
                                  </button>
                                  {isOpen && (
                                    <div className="mt-1.5 space-y-1">
                                      {files.map((f) => (
                                        <button
                                          key={f.path}
                                          onClick={() => openFile(f.path)}
                                          className="w-full flex items-center gap-2 text-left text-[11px] px-2 py-1 rounded hover:bg-vt-surface/50 transition-colors cursor-pointer group"
                                        >
                                          <span className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded border font-mono ${actionBadge(f.action)}`}>
                                            {f.action}
                                          </span>
                                          <span className="font-mono text-vt-text-alt truncate group-hover:text-vt-text">
                                            {f.path}
                                          </span>
                                          {f.description && (
                                            <span className="text-vt-text-muted shrink-0 hidden sm:inline">&mdash; {f.description}</span>
                                          )}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
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
