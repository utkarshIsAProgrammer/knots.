import { motion } from 'framer-motion';
import { MessageSquare, ShieldCheck, User } from 'lucide-react';
import { cn } from '../../lib/cn';
import { useUI, type Section } from '../../features/ui';
import { useIdentity } from '../../features/identity';
import { useChat } from '../../features/chat';
import { useContacts } from '../../features/contacts';

const TABS: { value: Section; label: string; icon: typeof MessageSquare }[] = [
  { value: 'chats', label: 'Chats', icon: MessageSquare },
  { value: 'vault', label: 'Security', icon: ShieldCheck },
  { value: 'profile', label: 'Profile', icon: User }
];

export function TabBar() {
  const { section, setSection, activeThread, closeThread } = useUI();
  const me = useIdentity((s) => s.identity);
  const threads = useChat((s) => s.threads);
  const incoming = useContacts((s) => s.incoming);

  const unread = me
    ? Object.values(threads)
        .flat()
        .filter((m) => m.recipientId === me.knotId && m.status !== 'read' && m.status !== 'deleted').length
    : 0;

  const totalBadges = unread + incoming.length;

  if (activeThread) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden">
      <div className="glass-floating pointer-events-auto flex w-full max-w-md items-center gap-1 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-[#000000] p-1 shadow-2xl backdrop-blur-xl">
        {TABS.map((tab) => {
          const active = section === tab.value;
          return (
            <button
              key={tab.value}
              onClick={() => {
                setSection(tab.value);
                if (tab.value !== 'chats') closeThread();
              }}
              className={cn(
                'relative flex flex-1 flex-col items-center gap-0.5 rounded-md py-2 text-[10.5px] font-medium transition-colors',
                active ? 'text-zinc-900 dark:text-white font-medium' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              )}
            >
              {active && (
                <motion.span
                  layoutId="tabbar-indicator"
                  transition={{ type: 'spring', stiffness: 420, damping: 34, mass: 0.9 }}
                  className="absolute inset-0 rounded-md border border-black/10 dark:border-white/20 bg-black/5 dark:bg-white/10 shadow-sm"
                />
              )}
              <span className="relative">
                <tab.icon size={19} />
                {tab.value === 'chats' && totalBadges > 0 && (
                  <span className="filament-bg absolute -right-2 -top-1 grid h-4 min-w-4 place-items-center rounded-sm px-1 text-[9px] font-semibold text-[var(--on-accent)]">
                    {totalBadges > 9 ? '9+' : totalBadges}
                  </span>
                )}
              </span>
              <span className="relative">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
