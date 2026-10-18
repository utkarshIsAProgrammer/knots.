import { dayLabel } from '../../lib/format';

export function DateDivider({ ts }: { ts: number }) {
  return (
    <div className="flex items-center gap-3 py-3">
      <span className="h-px flex-1 bg-[var(--hairline)]" />
      <span className="mono text-[10.5px] uppercase tracking-[0.18em] text-[var(--text-3)]">{dayLabel(ts)}</span>
      <span className="h-px flex-1 bg-[var(--hairline)]" />
    </div>
  );
}
