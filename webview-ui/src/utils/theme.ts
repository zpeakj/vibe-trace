// Shared theme-aware utilities used by all three views

export function actionBadge(action: string) {
  const map: Record<string, string> = {
    create: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    modify: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    delete: 'bg-red-500/20 text-red-400 border-red-500/30',
    read: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
  };
  return map[action] ?? map.read;
}

export function actionDot(action: string) {
  const map: Record<string, string> = {
    create: 'bg-emerald-500',
    modify: 'bg-yellow-500',
    delete: 'bg-red-500',
    read: 'bg-zinc-500',
  };
  return map[action] ?? map.read;
}
