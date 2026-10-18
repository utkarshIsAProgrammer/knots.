import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { useToasts, type ToastTone } from '../../features/toast';
import { cn } from '../../lib/cn';

const icons: Record<ToastTone, { node: typeof Info; color: string }> = {
  default: { node: Info, color: 'var(--accent-2)' },
  success: { node: CheckCircle2, color: 'var(--success)' },
  warning: { node: AlertTriangle, color: 'var(--warning)' },
  danger: { node: AlertTriangle, color: 'var(--danger)' }
};

export function ToastViewport() {
  const items = useToasts((s) => s.items);
  const dismiss = useToasts((s) => s.dismiss);

  return createPortal(
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[120] flex flex-col items-center gap-2 px-4 pt-[max(1rem,env(safe-area-inset-top))]"
      aria-live="polite"
      role="status"
    >
      <AnimatePresence initial={false}>
        {items.map((item) => {
          const { node: Icon, color } = icons[item.tone];
          return (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, y: -16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 420, damping: 34, mass: 0.9 }}
              className="glass-floating pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg px-4 py-3"
            >
              <Icon size={17} className="mt-0.5 shrink-0" style={{ color }} />
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] font-medium text-[var(--text)]">{item.title}</p>
                {item.description && <p className="mt-0.5 text-[12.5px] leading-snug text-[var(--text-2)]">{item.description}</p>}
              </div>
              <button
                onClick={() => dismiss(item.id)}
                aria-label="Dismiss"
                className={cn('shrink-0 text-[var(--text-3)] transition-colors hover:text-[var(--text)]')}
              >
                <X size={15} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>,
    document.body
  );
}
