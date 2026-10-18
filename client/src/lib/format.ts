// Small, dependency-free formatting helpers used across the app.

export function clockTime(ts?: number | string | null): string {
  if (!ts) return '';
  const d = new Date(ts);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function dayLabel(ts?: number | string | null): string {
  if (!ts) return '';
  const d = new Date(ts);
  if (isNaN(d.getTime())) return '';
  const today = new Date();
  const yesterday = new Date(today.getTime() - 86400000);
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (sameDay(d, today)) return 'Today';
  if (sameDay(d, yesterday)) return 'Yesterday';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: d.getFullYear() === today.getFullYear() ? undefined : 'numeric' });
}

export function relativeTime(ts?: number | string | null): string {
  if (!ts) return '';
  const num = typeof ts === 'number' ? ts : new Date(ts).getTime();
  if (isNaN(num)) return '';
  const diff = Date.now() - num;
  if (diff < 60_000) return 'now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`;
  if (diff < 604_800_000) return `${Math.floor(diff / 86_400_000)}d`;
  return new Date(num).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function lastSeenLabel(ts: number | null): string {
  if (!ts) return 'offline';
  const diff = Date.now() - ts;
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

/** Countdown for burning messages, e.g. "4h 12m" or "0:42". */
export function burnCountdown(expiresAt: number | string | null | undefined): string | null {
  if (!expiresAt) return null;
  const num = typeof expiresAt === 'number' ? expiresAt : new Date(expiresAt).getTime();
  if (isNaN(num)) return null;
  const ms = num - Date.now();
  if (ms <= 0) return '0:00';
  const s = Math.floor(ms / 1000);
  if (s < 60) return `0:${String(s).padStart(2, '0')}`;
  if (s < 3600) return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
  return `${Math.floor(s / 86400)}d ${Math.floor((s % 86400) / 3600)}h`;
}

export function durationLabel(seconds: number): string {
  if (seconds <= 0) return 'never';
  if (seconds === 30) return '30s';
  if (seconds === 60) return '60s';
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h`;
  return `${Math.round(seconds / 86400)}d`;
}

/** Compact Knots ID for dense UI, e.g. KNT-4X9F…NP7Q */
export function shortKnotId(id?: string | null): string {
  if (!id) return '';
  if (id.length <= 16) return id;
  return `${id.slice(0, 8)}…${id.slice(-4)}`;
}

export function initialsFor(id: string): string {
  const clean = id.replace(/[^a-zA-Z0-9]/g, '');
  return `${clean.slice(0, 1)}${clean.slice(-1)}`.toUpperCase();
}
