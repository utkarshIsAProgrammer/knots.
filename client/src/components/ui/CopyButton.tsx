import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { cn } from '../../lib/cn';
import { toast } from '../../features/toast';

interface CopyButtonProps {
  value: string;
  label?: string;
  className?: string;
  size?: number;
  compact?: boolean;
}

export function CopyButton({ value, label, className, size = 15, compact }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const el = document.createElement('textarea');
      el.value = value;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      el.remove();
    }
    setCopied(true);
    toast.success('Copied to clipboard', label ? `${label} is ready to share.` : undefined);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <button
      onClick={copy}
      aria-label={`Copy ${label ?? 'value'}`}
      className={cn(
        'glass inline-flex items-center gap-1.5 rounded-pill text-[var(--text-2)] transition-colors hover:text-[var(--text)]',
        compact ? 'h-8 px-2.5 text-[12px]' : 'h-9 px-3 text-[12.5px]',
        className
      )}
    >
      {copied ? <Check size={size} className="text-[var(--success)]" /> : <Copy size={size} />}
      {!compact && (label ?? 'Copy')}
    </button>
  );
}
