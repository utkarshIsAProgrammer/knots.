import { MessageSquare, Moon, ShieldCheck, Sun } from 'lucide-react';
import { KnotMark, Wordmark } from '../ui/Logo';
import { ContactPanel } from '../contacts/ContactPanel';
import { cn } from '../../lib/cn';
import { useUI, type Section } from '../../features/ui';
import { useIdentity } from '../../features/identity';
import { useTheme } from '../../features/theme';
import { shortKnotId } from '../../lib/format';
import { Avatar } from '../ui/Avatar';

const NAV: { value: Section; label: string; icon: typeof MessageSquare }[] = [
  { value: 'chats', label: 'Chats', icon: MessageSquare },
  { value: 'vault', label: 'Security', icon: ShieldCheck }
];

export function Sidebar() {
  const { section, setSection } = useUI();
  const identity = useIdentity((s) => s.identity);
  const alias = useIdentity((s) => s.alias);
  const avatarSeed = useIdentity((s) => s.avatarSeed);
  const relayOk = useIdentity((s) => s.relayOk);
  const { resolved, toggle } = useTheme();

  return (
    <aside className="hidden h-full w-[372px] shrink-0 flex-col border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#000000] lg:flex select-none">
      <div className="flex items-center justify-between px-4 pb-3 pt-4">
        <div className="flex items-center gap-2.5">
          <KnotMark className="h-7 w-7" />
          <Wordmark />
        </div>
        <button
          onClick={toggle}
          aria-label="Toggle theme"
          className="grid h-9 w-9 place-items-center rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#000000] text-zinc-600 dark:text-zinc-400 transition-colors hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/10 shadow-sm"
        >
          {resolved === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </button>
      </div>

      <nav className="flex gap-1.5 px-3 pb-2">
        {NAV.map((item) => {
          const active = section === item.value;
          return (
            <button
              key={item.value}
              onClick={() => setSection(item.value)}
              className={cn(
                'flex flex-1 flex-col items-center gap-1 rounded-lg py-2 text-[11px] font-medium transition-all duration-200',
                active
                  ? 'bg-white dark:bg-white/10 text-zinc-900 dark:text-white font-semibold border border-zinc-300 dark:border-white/20 shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/60 dark:hover:bg-white/5'
              )}
            >
              <item.icon size={17} />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="min-h-0 flex-1 border-t border-zinc-200 dark:border-zinc-800">
        <ContactPanel />
      </div>

      <button
        onClick={() => setSection('profile')}
        className={cn(
          'flex items-center gap-3 border-t border-zinc-200 dark:border-zinc-800 px-4 py-3.5 text-left transition-colors',
          section === 'profile'
            ? 'bg-white dark:bg-white/10 text-zinc-900 dark:text-white shadow-sm'
            : 'hover:bg-zinc-100 dark:hover:bg-white/[0.03]'
        )}
      >
        <Avatar knotId={avatarSeed || identity?.knotId || 'knot'} size="sm" online={relayOk} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13.5px] font-medium text-zinc-900 dark:text-white">{alias || 'No name set'}</p>
          <p className="mono truncate text-[11px] text-zinc-500 dark:text-zinc-400">
            {identity ? shortKnotId(identity.knotId) : '—'}
          </p>
        </div>
        {relayOk && <span className="h-2 w-2 shrink-0 rounded-full bg-[#22c55e] shadow-[0_0_6px_rgba(34,197,94,0.6)]" />}
      </button>
    </aside>
  );
}
