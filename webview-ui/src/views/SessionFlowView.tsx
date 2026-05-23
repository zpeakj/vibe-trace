import { useState, useMemo } from 'react';
import { VibeEvent, openFile } from '../api';
import { filterBusinessFiles } from '../utils/filter';
import { actionBadge } from '../utils/theme';
import { t } from '../i18n';
import {
  MessageSquare,
  Clock,
  FolderGit2,
  ChevronRight,
  ChevronDown,
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

export function SessionFlowView({ events }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());

  const sessions = useMemo(() => {
    const map = new Map<string, VibeEvent[]>();
    for (const ev of events) {
      const list = map.get(ev.session_id) ?? [];
      list.push(ev);
      map.set(ev.session_id, list);
    }
    const result: { id: string; events: VibeEvent[]; modules: string[] }[] = [];
    for (const [id, evts] of map) {
      evts.sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      const modSet = new Set(evts.map((e) => e.module));
      result.push({ id, events: evts, modules: Array.from(modSet).sort() });
    }
    result.sort(
      (a, b) =>
        new Date(b.events[0].timestamp).getTime() -
        new Date(a.events[0].timestamp).getTime()
    );
    return result;
  }, [events]);

  const active = selected
    ? sessions.find((s) => s.id === selected)
    : sessions[0];

  if (sessions.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-vt-text-muted">
        <div className="text-center">
          <MessageSquare className="w-12 h-12 mx-auto mb-3 text-vt-empty-icon" />
          <p className="text-lg font-medium">{t('sessions.empty.title')}</p>
          <p className="text-sm mt-1">{t('sessions.empty.desc')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Left: session list */}
      <aside className="w-72 shrink-0 border-r border-vt-border overflow-y-auto bg-vt-bg-alt/50">
        <div className="px-3 py-3 border-b border-vt-border text-xs font-semibold text-vt-text-muted uppercase tracking-wider">
          {t('sessions.sidebarTitle', { count: sessions.length })}
        </div>
        {sessions.map((s) => (
          <button
            key={s.id}
            onClick={() => setSelected(s.id)}
            className={cn(
              'w-full text-left px-3 py-3 border-b border-vt-border/50 transition-colors hover:bg-vt-surface/50',
              active?.id === s.id
                ? 'bg-vt-bg-alt border-l-2 border-l-emerald-500 pl-[10px]'
                : 'border-l-2 border-l-transparent pl-[10px]'
            )}
          >
            <div className="flex items-center gap-2">
              <ChevronRight
                className={cn(
                  'w-3 h-3 shrink-0 transition-transform',
                  active?.id === s.id ? 'text-emerald-400 rotate-90' : 'text-vt-text-subtle'
                )}
              />
              <span
                className={cn(
                  'text-sm font-medium truncate',
                  active?.id === s.id ? 'text-emerald-300' : 'text-vt-text-alt'
                )}
              >
                {s.id}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1.5 ml-5">
              <span className="text-[11px] text-vt-text-muted">
                {t('sessions.turnCount', { count: s.events.length })}
              </span>
              <span className="text-[11px] text-vt-text-subtle">&middot;</span>
              <span className="text-[11px] text-vt-text-subtle truncate">
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
                <h2 className="text-lg font-bold text-vt-text">{active.id}</h2>
                <p className="text-sm text-vt-text-muted">
                  {t('sessions.turnCount', { count: active.events.length })}
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
                  className="rounded-lg border border-vt-border bg-vt-bg-alt/80"
                >
                  {/* Turn header */}
                  <div className="flex items-center justify-between px-4 py-2 border-b border-vt-border/60">
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] font-mono text-vt-text-subtle">
                        #{active.events.length - i}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-vt-text-muted">
                        <Clock className="w-3 h-3" />
                        {formatTime(ev.timestamp)}
                      </span>
                      <span className="flex items-center gap-1 text-xs font-medium text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">
                        <FolderGit2 className="w-3 h-3" />
                        {ev.module}
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
                  <div className="px-4 py-3">
                    <h3 className="font-semibold text-sm text-vt-text">
                      {ev.intent}
                    </h3>
                    {ev.original_prompt && (
                      <p className="text-[11px] text-vt-text-quote/70 italic mt-1.5 leading-relaxed">
                        &ldquo;{ev.original_prompt}&rdquo;
                      </p>
                    )}
                    <p className="text-xs text-vt-text-muted mt-1.5 leading-relaxed">
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

                    {/* Files */}
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
                            {t('sessions.filesAffected', { count: files.length })}
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
              ))}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-vt-text-muted">
            {t('sessions.selectPrompt')}
          </div>
        )}
      </main>
    </div>
  );
}
