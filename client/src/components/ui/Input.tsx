import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

interface FieldShellProps {
  label?: string;
  hint?: string;
  error?: string | null;
  children: ReactNode;
  htmlFor?: string;
}

function FieldShell({ label, hint, error, children, htmlFor }: FieldShellProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={htmlFor}
          className="px-1 text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--text-3)]"
        >
          {label}
        </label>
      )}
      {children}
      {error ? (
        <p className="px-1 text-[12px] text-[var(--danger)]">{error}</p>
      ) : hint ? (
        <p className="px-1 text-[12px] text-[var(--text-3)]">{hint}</p>
      ) : null}
    </div>
  );
}

const fieldBase =
  'w-full rounded-xl border border-zinc-200 dark:border-white/[0.09] bg-zinc-50 dark:bg-[#000000] px-4 text-[15px] text-zinc-900 dark:text-white outline-none transition-all duration-200 ' +
  'placeholder:text-[var(--text-3)] focus:border-zinc-400 dark:focus:border-white/30 focus:bg-white dark:focus:bg-white/[0.02] ' +
  'disabled:opacity-45';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string | null;
  mono?: boolean;
  icon?: ReactNode;
  trailing?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, mono, icon, trailing, className, id, ...rest },
  ref
) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <FieldShell label={label} hint={hint} error={error} htmlFor={fieldId}>
      <div className="relative flex items-center">
        {icon && <span className="pointer-events-none absolute left-3.5 text-[var(--text-3)]">{icon}</span>}
        <input
          ref={ref}
          id={fieldId}
          aria-invalid={!!error}
          className={cn(fieldBase, 'h-12', icon ? 'pl-10' : null, trailing ? 'pr-11' : null, mono ? 'mono tracking-tight' : null, className)}
          {...rest}
        />
        {trailing && <span className="absolute right-2 flex items-center">{trailing}</span>}
      </div>
    </FieldShell>
  );
});

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string | null;
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea(
  { label, hint, error, className, id, ...rest },
  ref
) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <FieldShell label={label} hint={hint} error={error} htmlFor={fieldId}>
      <textarea
        ref={ref}
        id={fieldId}
        aria-invalid={!!error}
        className={cn(fieldBase, 'min-h-28 resize-none py-3 leading-relaxed', className)}
        {...rest}
      />
    </FieldShell>
  );
});
