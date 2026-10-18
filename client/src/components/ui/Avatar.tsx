import { useMemo } from 'react';
import { avatarVisual } from '../../lib/avatar';
import { cn } from '../../lib/cn';

type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const sizes: Record<Size, string> = {
  xs: 'h-7 w-7 text-[10px] rounded-xs',
  sm: 'h-9 w-9 text-[12px] rounded-sm',
  md: 'h-11 w-11 text-[14px] rounded-md',
  lg: 'h-14 w-14 text-[16px] rounded-lg',
  xl: 'h-20 w-20 text-[22px] rounded-xl'
};

const glyph: Record<Size, string> = {
  xs: 'h-[58%] w-[58%]',
  sm: 'h-[58%] w-[58%]',
  md: 'h-[60%] w-[60%]',
  lg: 'h-[60%] w-[60%]',
  xl: 'h-[62%] w-[62%]'
};

interface AvatarProps {
  /** Seed for the generated icon. Defaults to the Knots ID. */
  knotId: string;
  size?: Size;
  online?: boolean;
  className?: string;
}

/**
 * A squircle glass tile showing the identity's generated icon — a symmetric
 * monochrome glyph drawn deterministically from its seed. Variety comes from
 * the glyph + aura angle/intensity, never colour.
 */
export function Avatar({ knotId, size = 'md', online, className }: AvatarProps) {
  const visual = useMemo(() => avatarVisual(knotId), [knotId]);

  return (
    <div className={cn('relative shrink-0', className)}>
      <div
        className={cn(
          'relative grid place-items-center overflow-hidden font-semibold text-zinc-900 dark:text-white bg-zinc-100 dark:bg-[#000000] border border-zinc-200 dark:border-white/10 shadow-sm dark:shadow-[0_2px_12px_rgba(0,0,0,0.7)]',
          sizes[size]
        )}
      >
        <span
          className="absolute inset-0"
          style={{
            background: `linear-gradient(${visual.rotation}deg, color-mix(in srgb, var(--text) ${visual.intensity}%, transparent), transparent 62%)`
          }}
        />
        <svg
          viewBox="-0.7 -0.7 6.4 6.4"
          className={cn('relative', glyph[size])}
          fill="currentColor"
          aria-hidden="true"
        >
          {visual.cells.map((on, i) =>
            on ? (
              <rect
                key={i}
                x={i % 5}
                y={Math.floor(i / 5)}
                width={1}
                height={1}
                rx={visual.cellRadius}
                ry={visual.cellRadius}
              />
            ) : null
          )}
        </svg>
        {visual.ring && (
          <span className="pointer-events-none absolute inset-[14%] rounded-[inherit] border border-[color-mix(in_srgb,var(--text)_22%,transparent)]" />
        )}
      </div>
      {Boolean(online) && (
        <span
          className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-[#22c55e] ring-2 ring-[var(--canvas)] shadow-[0_0_8px_rgba(34,197,94,0.65)]"
          title="Active now"
        />
      )}
    </div>
  );
}
