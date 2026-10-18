import { motion } from 'framer-motion';
import { cn } from '../../lib/cn';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
}

export function Switch({ checked, onChange, label, disabled, className }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'glass relative inline-flex h-7 w-12 shrink-0 items-center rounded-pill p-0.5 transition-colors duration-300',
        'outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--canvas)]',
        'disabled:pointer-events-none disabled:opacity-45',
        className
      )}
      style={checked ? { borderColor: 'color-mix(in srgb, var(--accent) 60%, transparent)' } : undefined}
    >
      {checked && <span className="filament-bg absolute inset-0 rounded-pill opacity-80" />}
      <motion.span
        layout
        transition={{ type: 'spring', stiffness: 500, damping: 34 }}
        className={cn(
          'relative z-10 h-6 w-6 rounded-full bg-[var(--text)]',
          checked ? 'ml-auto' : 'ml-0'
        )}
        style={{ boxShadow: '0 2px 6px rgba(0,0,0,0.35)' }}
      />
    </button>
  );
}
