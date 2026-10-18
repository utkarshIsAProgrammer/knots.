import { type ReactNode, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '../../lib/cn';
import { useBodyLock, useEscape } from '../../lib/hooks';

type Side = 'bottom' | 'right';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  side?: Side;
  title?: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export function Sheet({ open, onClose, side = 'bottom', title, description, children, footer, className }: SheetProps) {
  useBodyLock(open);
  useEscape(open, onClose);
  const isBottom = side === 'bottom';

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    return () => previous?.focus?.();
  }, [open]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-label={title}>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.24 }}
            onClick={onClose}
            className="absolute inset-0"
            style={{ background: 'var(--scrim)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
          />
          <motion.div
            initial={isBottom ? { y: '100%' } : { x: '100%' }}
            animate={isBottom ? { y: 0 } : { x: 0 }}
            exit={isBottom ? { y: '100%' } : { x: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 40, mass: 0.9 }}
            drag={side === 'bottom' ? 'y' : 'x'}
            dragConstraints={side === 'bottom' ? { top: 0, bottom: 0 } : { left: 0, right: 0 }}
            dragElastic={{ top: 0, bottom: 0.4, left: 0, right: 0.4 }}
            onDragEnd={(_, info) => {
              if (side === 'bottom' && info.offset.y > 110) onClose();
              if (side === 'right' && info.offset.x > 110) onClose();
            }}
            className={cn(
              'glass-floating absolute flex flex-col overflow-hidden',
              side === 'bottom'
                ? 'inset-x-0 bottom-0 max-h-[88vh] rounded-t-sheet pb-[env(safe-area-inset-bottom)]'
                : 'inset-y-0 right-0 w-full max-w-md rounded-l-sheet',
              className
            )}
          >
            {side === 'bottom' && (
              <div className="flex justify-center pb-1 pt-2.5">
                <span className="h-1.5 w-11 rounded-full bg-white/20" />
              </div>
            )}
            {(title || description) && (
              <header className="flex items-start justify-between gap-4 px-5 pb-3 pt-3">
                <div className="space-y-0.5">
                  {title && <h2 className="text-[17px] font-semibold tracking-[-0.02em]">{title}</h2>}
                  {description && <p className="text-[13px] text-[var(--text-2)]">{description}</p>}
                </div>
                <button
                  onClick={onClose}
                  aria-label="Close"
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-zinc-800 bg-zinc-900/60 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
                >
                  <X size={16} />
                </button>
              </header>
            )}
            <div className="scroll-area flex-1 overflow-y-auto px-5 pb-5">{children}</div>
            {footer && (
              <footer className="border-t border-[var(--hairline)] px-5 py-4 pt-4">{footer}</footer>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
