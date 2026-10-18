import { useIdentity } from '../../features/identity';

export function Relays() {
  const relayOk = useIdentity((s) => s.relayOk);
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <span className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#000000] px-3 py-1.5 shadow-sm">
        <span className={`h-1.5 w-1.5 rounded-full ${relayOk ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
        <span className="text-[11.5px] font-medium text-zinc-700 dark:text-zinc-300">{relayOk ? 'Connected' : 'Offline'}</span>
      </span>
      <span className="mono inline-flex items-center rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#000000] px-3 py-1.5 text-[11px] font-medium text-zinc-500 dark:text-zinc-400 shadow-sm">
        X3DH · AES-256-GCM
      </span>
      <span className="mono inline-flex items-center rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#000000] px-3 py-1.5 text-[11px] font-medium text-zinc-500 dark:text-zinc-400 shadow-sm">
        server can&apos;t read
      </span>
    </div>
  );
}
