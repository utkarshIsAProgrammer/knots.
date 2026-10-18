import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/cn';

type Elevation = 'panel' | 'raised' | 'floating';

const material: Record<Elevation, string> = {
  panel: 'border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#000000] shadow-sm dark:shadow-[0_4px_24px_rgba(0,0,0,0.8)] backdrop-blur-xl',
  raised: 'border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#111114] shadow-sm dark:shadow-2xl backdrop-blur-xl',
  floating: 'border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#16161a] shadow-md dark:shadow-2xl backdrop-blur-2xl'
};

interface GlassPanelProps extends HTMLAttributes<HTMLDivElement> {
  elevation?: Elevation;
  radius?: 'md' | 'lg' | 'xl' | '2xl' | 'sheet';
  padded?: boolean;
  children?: ReactNode;
}

const radii = {
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  '2xl': 'rounded-2xl',
  sheet: 'rounded-sheet'
} as const;

export function GlassPanel({
  elevation = 'panel',
  radius = 'lg',
  padded = true,
  className,
  children,
  ...rest
}: GlassPanelProps) {
  return (
    <div
      className={cn(material[elevation], radii[radius], padded && 'p-5', 'relative overflow-hidden', className)}
      {...rest}
    >
      {children}
    </div>
  );
}
