import { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '../../lib/cn';

interface MnemonicGridProps {
  mnemonic: string;
  masked?: boolean;
}

export function MnemonicGrid({ mnemonic, masked: maskedDefault = false }: MnemonicGridProps) {
  const [revealed, setRevealed] = useState(!maskedDefault);
  const words = mnemonic.trim().split(/\s+/);

  return (
    <div className="space-y-3">
      <div className="relative grid grid-cols-2 gap-2 sm:grid-cols-3">
        {words.map((word, i) => (
          <motion.div
            key={`${word}-${i}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.025, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center gap-2 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50 dark:bg-[#000000] px-3.5 py-2.5 hover:border-zinc-300 dark:hover:border-white/20 transition-colors shadow-sm"
          >
            <span className="mono w-4 shrink-0 text-[10.5px] text-[var(--text-3)]">{i + 1}</span>
            <span
              className={cn(
                'mono truncate text-[14px] text-[var(--text)] transition-all duration-300',
                !revealed && 'select-none blur-[7px]'
              )}
            >
              {word}
            </span>
          </motion.div>
        ))}
      </div>
      {maskedDefault && (
        <button
          onClick={() => setRevealed((v) => !v)}
          className="inline-flex items-center gap-2 text-[13px] font-medium text-zinc-600 dark:text-zinc-300 transition-colors hover:text-zinc-900 dark:hover:text-white"
        >
          {revealed ? <EyeOff size={18} className="shrink-0 text-zinc-600 dark:text-zinc-300" /> : <Eye size={18} className="shrink-0 text-zinc-600 dark:text-zinc-300" />}
          <span>{revealed ? 'Hide phrase' : 'Reveal phrase'}</span>
        </button>
      )}
    </div>
  );
}
