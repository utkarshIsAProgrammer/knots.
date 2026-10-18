import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '../../lib/cn';

interface HoldToConfirmProps {
  onConfirm: () => void;
  label: string;
  holdingLabel?: string;
  duration?: number;
  tone?: 'default' | 'danger';
  children?: ReactNode;
}

/** Press-and-hold gate for irreversible actions. */
export function HoldToConfirm({
  onConfirm,
  label,
  holdingLabel = 'Keep holding…',
  duration = 1600,
  tone = 'danger'
}: HoldToConfirmProps) {
  const [progress, setProgress] = useState(0);
  const [holding, setHolding] = useState(false);
  const frame = useRef<number | null>(null);
  const start = useRef(0);

  useEffect(() => () => {
    if (frame.current) cancelAnimationFrame(frame.current);
  }, []);

  const tick = () => {
    const elapsed = Date.now() - start.current;
    const pct = Math.min(elapsed / duration, 1);
    setProgress(pct);
    if (pct >= 1) {
      setHolding(false);
      setProgress(0);
      onConfirm();
      return;
    }
    frame.current = requestAnimationFrame(tick);
  };

  const begin = () => {
    setHolding(true);
    start.current = Date.now();
    frame.current = requestAnimationFrame(tick);
  };

  const end = () => {
    if (frame.current) cancelAnimationFrame(frame.current);
    frame.current = null;
    setHolding(false);
    setProgress(0);
  };

  return (
    <button
      onPointerDown={begin}
      onPointerUp={end}
      onPointerLeave={end}
      onPointerCancel={end}
      className={cn(
        'relative w-full select-none overflow-hidden rounded-md px-5 py-3.5 text-[14px] font-medium transition-colors',
        tone === 'danger'
          ? 'border border-[color-mix(in_srgb,var(--danger)_50%,transparent)] text-[var(--danger)]'
          : 'glass text-[var(--text)]'
      )}
    >
      <span
        className="absolute inset-y-0 left-0 transition-[width] duration-75"
        style={{
          width: `${progress * 100}%`,
          background:
            tone === 'danger'
              ? 'color-mix(in srgb, var(--danger) 26%, transparent)'
              : 'color-mix(in srgb, var(--accent) 26%, transparent)'
        }}
      />
      <span className="relative">{holding ? holdingLabel : label}</span>
    </button>
  );
}
