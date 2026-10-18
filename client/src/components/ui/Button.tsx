import { forwardRef, type MouseEvent, type ReactNode } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { cn } from '../../lib/cn';

type Variant = 'primary' | 'glass' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg' | 'icon';

const variants: Record<Variant, string> = {
  primary:
    'bg-zinc-900 text-white dark:bg-white dark:text-black font-semibold shadow-md dark:shadow-[0_8px_24px_rgba(255,255,255,0.22)] hover:bg-zinc-800 dark:hover:bg-neutral-200 active:scale-98 transition-all',
  glass:
    'border border-zinc-200 dark:border-white/10 bg-black/[0.04] dark:bg-white/[0.035] text-zinc-900 dark:text-white hover:bg-black/[0.08] dark:hover:bg-white/[0.07] hover:border-zinc-300 dark:hover:border-white/20 active:scale-98 transition-all',
  ghost: 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/10 transition-all',
  danger: 'border border-red-500/30 bg-red-500/10 text-red-500 dark:text-red-400 hover:bg-red-500/20 active:scale-98 transition-all'
};

const sizes: Record<Size, string> = {
  sm: 'h-10 px-5 text-[13px] rounded-sm gap-1.5',
  md: 'h-12 px-6 text-[14.5px] rounded-md gap-2',
  lg: 'h-14 px-8 text-[15.5px] rounded-lg gap-2.5',
  icon: 'h-9 w-9 rounded-lg justify-center'
};

interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  children?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'glass', size = 'md', loading, className, children, disabled, onMouseMove, ...rest },
  ref
) {
  const handleMove = (e: MouseEvent<HTMLButtonElement>) => {
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${e.clientX - r.left}px`);
    el.style.setProperty('--my', `${e.clientY - r.top}px`);
    onMouseMove?.(e);
  };

  return (
    <motion.button
      ref={ref}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 420, damping: 34, mass: 0.9 }}
      onMouseMove={handleMove}
      disabled={disabled || loading}
      className={cn(
        'sheen relative inline-flex select-none items-center font-medium tracking-[-0.01em]',
        'transition-colors duration-200 outline-none',
        'focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--canvas)]',
        'disabled:pointer-events-none disabled:opacity-45',
        variants[variant],
        sizes[size],
        className
      )}
      {...rest}
    >
      {loading ? <span className="spin h-4 w-4 rounded-full border-2 border-current border-t-transparent" /> : children}
    </motion.button>
  );
});
