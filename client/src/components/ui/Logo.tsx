import { useId } from 'react';
import { cn } from '../../lib/cn';

/**
 * The Knots monogram — two interlocking rings, drawn as one continuous link.
 * The over/under crossings are carved with masks so the mark reads as a real
 * knot at any size, from the 16px favicon to the boot screen.
 */
export function KnotMark({ className, gradient = true }: { className?: string; gradient?: boolean }) {
  const raw = useId().replace(/:/g, '');
  const gradId = `knot-grad-${raw}`;
  const leftMask = `knot-l-${raw}`;
  const rightMask = `knot-r-${raw}`;
  const stroke = gradient ? `url(#${gradId})` : 'currentColor';

  return (
    <svg viewBox="0 0 40 40" className={cn('h-8 w-8', className)} aria-hidden="true">
      <defs>
        <linearGradient id={gradId} x1="6" y1="6" x2="34" y2="34" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="var(--accent)" />
          <stop offset="48%" stopColor="var(--accent-2)" />
          <stop offset="100%" stopColor="var(--accent-3)" />
        </linearGradient>
        <mask id={leftMask} maskUnits="userSpaceOnUse" x="0" y="0" width="40" height="40">
          <rect width="40" height="40" fill="#fff" />
          <circle cx="20" cy="12.2" r="2.2" fill="#000" />
        </mask>
        <mask id={rightMask} maskUnits="userSpaceOnUse" x="0" y="0" width="40" height="40">
          <rect width="40" height="40" fill="#fff" />
          <circle cx="20" cy="27.8" r="2.2" fill="#000" />
        </mask>
      </defs>
      <g mask={`url(#${leftMask})`}>
        <circle cx="15.5" cy="20" r="9" fill="none" stroke={stroke} strokeWidth="3" strokeLinecap="round" />
      </g>
      <g mask={`url(#${rightMask})`}>
        <circle cx="24.5" cy="20" r="9" fill="none" stroke={stroke} strokeWidth="3" strokeLinecap="round" />
      </g>
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'font-logo text-[30px] font-normal tracking-normal select-none text-[var(--text)] leading-none inline-flex items-baseline',
        className
      )}
      style={{ fontFamily: 'var(--font-logo)' }}
    >
      Knots<span className="filament-text text-[30px]">.</span>
    </span>
  );
}

export function BrandLockup({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <KnotMark className={compact ? 'h-7 w-7' : 'h-8 w-8'} />
      <Wordmark />
    </div>
  );
}
