import { ShieldCheck } from 'lucide-react';
import { Button } from '../ui/Button';
import { KnotMark } from '../ui/Logo';
import { Relays } from './Relays';
import { useUI } from '../../features/ui';

export function Standby() {
  const setSection = useUI((s) => s.setSection);

  return (
    <div className="relative flex h-full items-center justify-center px-6">
      <div className="max-w-md space-y-7 text-center">
        <div className="mx-auto flex h-24 w-24 items-center justify-center">
          <KnotMark className="h-24 w-24" />
        </div>
        <div className="space-y-3">
          <h1 className="font-display text-[clamp(1.8rem,3.4vw,2.4rem)] font-semibold leading-[1.06] tracking-[-0.04em] text-zinc-900 dark:text-white">
            Pick a chat,
            <br />
            or start a new one.
          </h1>
          <p className="text-[14px] leading-relaxed text-zinc-600 dark:text-zinc-400">
            Choose a contact to continue your conversation, or use the + button to connect with a new Knots ID.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2.5">
          <Button variant="glass" onClick={() => setSection('vault')}>
            <ShieldCheck size={16} /> Security
          </Button>
        </div>
        <Relays />
      </div>
    </div>
  );
}
