import { type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '../../lib/cn';
import { useBodyLock, useEscape } from '../../lib/hooks';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  tone?: 'default' | 'danger';
  className?: string;
}

export function Dialog({ open, onClose, title, description, children, footer, tone = 'default', className }: DialogProps) {
  useBodyLock(open);
  useEscape(open, onClose);

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[90] grid place-items-center p-4" role="dialog" aria-modal="true" aria-label={title}>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={onClose}
            className="absolute inset-0"
            style={{ background: 'var(--scrim)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: 'spring', stiffness: 420, damping: 34, mass: 0.9 }}
            className={cn(
              'glass-floating relative w-full max-w-md overflow-hidden rounded-2xl',
              tone === 'danger' && 'border-[color-mix(in_srgb,var(--danger)_40%,transparent)]',
              className
            )}
          >
            <div className="space-y-2 px-6 pb-4 pt-6">
              {title && (
                <h2 className={cn('text-[20px] font-semibold tracking-[-0.03em]', tone === 'danger' && 'text-[var(--danger)]')}>
                  {title}
                </h2>
              )}
              {description && <p className="text-[14px] leading-relaxed text-[var(--text-2)]">{description}</p>}
            </div>
            {children && <div className="px-6 pb-5">{children}</div>}
            {footer && (
              <div className="flex justify-end gap-2 border-t border-[var(--hairline)] px-6 py-4">{footer}</div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
