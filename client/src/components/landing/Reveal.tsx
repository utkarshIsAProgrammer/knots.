import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/cn';

/** Scroll-reveal wrapper — glass panels fade + rise 10px as they enter. */
export function Reveal({
  children,
  delay = 0,
  className
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay }}
      className={cn(className)}
    >
      {children}
    </motion.div>
  );
}

export function Overline({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn('text-[11px] font-medium uppercase tracking-[0.22em] text-[var(--text-3)]', className)}>
      {children}
    </span>
  );
}
