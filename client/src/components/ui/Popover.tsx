import { type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '../../lib/cn';
import { useEscape, useOutsideClick } from '../../lib/hooks';

interface PopoverProps {
  open: boolean;
  onClose: () => void;
  trigger: ReactNode;
  children: ReactNode;
  align?: 'start' | 'end' | 'center';
  side?: 'top' | 'bottom';
  className?: string;
}

export function Popover({ open, onClose, trigger, children, align = 'end', side = 'bottom', className }: PopoverProps) {
  const ref = useOutsideClick<HTMLDivElement>(open, onClose);
  useEscape(open, onClose);

  const isTop = side === 'top';

  return (
    <div ref={ref} className="relative inline-flex">
      {trigger}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: isTop ? 6 : -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: isTop ? 4 : -4 }}
            transition={{ type: 'spring', stiffness: 460, damping: 34 }}
            className={cn(
              'absolute z-50 overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-[#000000] shadow-2xl backdrop-blur-xl',
              isTop ? 'bottom-[calc(100%+8px)] origin-bottom' : 'top-[calc(100%+8px)] origin-top',
              align === 'end' && 'right-0',
              align === 'start' && 'left-0',
              align === 'center' && 'left-1/2 -translate-x-1/2',
              className
            )}
            role="menu"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function MenuItem({
  children,
  onClick,
  icon,
  tone = 'default',
  disabled
}: {
  children: ReactNode;
  onClick?: () => void;
  icon?: ReactNode;
  tone?: 'default' | 'danger';
  disabled?: boolean;
}) {
  return (
    <button
      role="menuitem"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs transition-colors',
        'disabled:pointer-events-none disabled:opacity-40',
        tone === 'danger'
          ? 'text-red-600 dark:text-red-400 hover:bg-red-500/10 dark:hover:bg-red-500/15'
          : 'text-zinc-900 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/10 hover:text-black dark:hover:text-white font-medium'
      )}
    >
      <span className="shrink-0 text-zinc-600 dark:text-zinc-400">{icon}</span>
      <span>{children}</span>
    </button>
  );
}
