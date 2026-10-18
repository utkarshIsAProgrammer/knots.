import { useEffect, useRef, useState } from 'react';
import { Flame, Send, Smile } from 'lucide-react';
import { cn } from '../../lib/cn';
import { ReplyStrip } from './ReplyStrip';
import { Popover } from '../ui/Popover';
import { StickerTray } from './StickerTray';
import { durationLabel } from '../../lib/format';
import type { ReplyRef } from '../../lib/api/types';

const BURN_OPTIONS = [
  { label: '30s', value: 30 },
  { label: '60s', value: 60 },
  { label: '5m', value: 300 },
  { label: '1h', value: 3600 },
  { label: '1d', value: 86400 },
  { label: 'never', value: 0 }
];

interface ComposerProps {
  onSend: (text: string, options: { replyTo?: ReplyRef | null; ttlSeconds?: number; sticker?: string | null }) => void;
  onTyping: () => void;
  replyTo: ReplyRef | null;
  onClearReply: () => void;
  editing: string | null;
  onCancelEdit: () => void;
  onEditSubmit: (text: string) => void;
  me?: string;
  disabled?: boolean;
}

export function Composer({
  onSend,
  onTyping,
  replyTo,
  onClearReply,
  editing,
  onCancelEdit,
  onEditSubmit,
  me,
  disabled
}: ComposerProps) {
  const [value, setValue] = useState('');
  const [ttl, setTtl] = useState(86400);
  const [trayOpen, setTrayOpen] = useState(false);
  const [burnOpen, setBurnOpen] = useState(false);
  const areaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing) {
      setValue(editing);
      areaRef.current?.focus();
    }
  }, [editing]);

  useEffect(() => {
    if (replyTo) {
      areaRef.current?.focus();
    }
  }, [replyTo]);

  const grow = () => {
    const el = areaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const nextH = Math.min(Math.max(el.scrollHeight, 38), 120);
    el.style.height = `${nextH}px`;
    el.style.overflowY = el.scrollHeight > 120 ? 'auto' : 'hidden';
  };

  const submit = () => {
    const text = value.trim();
    if (!text) return;
    if (editing) {
      onEditSubmit(text);
    } else {
      onSend(text, { replyTo, ttlSeconds: ttl });
    }
    setValue('');
    requestAnimationFrame(() => {
      const el = areaRef.current;
      if (el) {
        el.style.height = '38px';
        el.style.overflowY = 'hidden';
      }
    });
  };

  return (
    <div className="border-t border-zinc-200 dark:border-zinc-800/80 bg-white/95 dark:bg-[#000000] p-2 sm:p-2.5 backdrop-blur-md">
      {editing && (
        <div className="mx-auto mb-2 max-w-4xl">
          <div className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#000000] px-3 py-1.5">
            <span className="text-xs font-medium text-zinc-900 dark:text-white">Editing message</span>
            <button onClick={onCancelEdit} className="text-xs text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}
      {replyTo && !editing && (
        <div className="mx-auto mb-2 max-w-4xl">
          <ReplyStrip reply={replyTo} me={me} onClear={onClearReply} />
        </div>
      )}

      <div className="mx-auto flex max-w-4xl items-end gap-2 relative">
        {/* Media / Emoji Popover */}
        <div className="shrink-0 flex items-center">
          <Popover
            open={trayOpen}
            onClose={() => setTrayOpen(false)}
            align="start"
            side="top"
            trigger={
              <button
                onClick={() => setTrayOpen((v) => !v)}
                aria-label="Stickers, GIFs and emoji"
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-[#000000] text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-white/10 transition-colors cursor-pointer',
                  trayOpen && 'bg-zinc-200 dark:bg-white/10 text-zinc-900 dark:text-white border-zinc-300 dark:border-white/20'
                )}
              >
                <Smile size={18} />
              </button>
            }
          >
            <StickerTray
              onEmoji={(emoji) => {
                setValue((v) => v + emoji);
                setTrayOpen(false);
                requestAnimationFrame(() => {
                  grow();
                  areaRef.current?.focus();
                });
              }}
              onSticker={(sticker) => {
                onSend('', { sticker, ttlSeconds: ttl });
                setTrayOpen(false);
              }}
            />
          </Popover>
        </div>

        {/* Textarea container — auto-grows without collapsing siblings */}
        <div className="grow relative flex items-end min-w-0">
          <div className="relative w-full">
            <textarea
              ref={areaRef}
              value={value}
              rows={1}
              disabled={disabled}
              placeholder="Type a message…"
              onChange={(e) => {
                setValue(e.target.value);
                grow();
                onTyping();
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/90 dark:bg-[#000000] text-[14px] text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 outline-none focus:border-zinc-400 dark:focus:border-white/30 transition-all px-3 py-2 resize-none max-h-[120px] overflow-x-hidden overflow-y-hidden no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden leading-relaxed select-text block break-words"
              style={{ minHeight: '38px', height: '38px', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            />
          </div>
        </div>

        {/* Auto-delete timer */}
        <div className="shrink-0 flex items-center">
          <Popover
            open={burnOpen}
            onClose={() => setBurnOpen(false)}
            align="end"
            side="top"
            trigger={
              <button
                onClick={() => setBurnOpen((v) => !v)}
                aria-label="Auto-delete timer"
                className={cn(
                  'mono h-9 shrink-0 flex items-center justify-center gap-1.5 rounded-lg border px-2.5 text-xs transition-colors cursor-pointer',
                  ttl > 0
                    ? 'border-amber-500/30 bg-amber-500/10 text-amber-500 dark:text-amber-300'
                    : 'border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-[#000000] text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-white/10'
                )}
              >
                <Flame size={14} className={cn(ttl > 0 && 'text-amber-500 dark:text-amber-400')} />
                <span className="font-medium text-[11px]">{durationLabel(ttl)}</span>
              </button>
            }
          >
            <div className="w-36 flex flex-col gap-0.5 p-1">
              <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                Auto-delete
              </p>
              {BURN_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    setTtl(opt.value);
                    setBurnOpen(false);
                  }}
                  className={cn(
                    'flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-xs transition-colors',
                    ttl === opt.value
                      ? 'bg-black/10 dark:bg-white/10 text-zinc-900 dark:text-white font-medium'
                      : 'text-zinc-600 dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/10 hover:text-zinc-900 dark:hover:text-white'
                  )}
                >
                  <span>{opt.label}</span>
                  {ttl === opt.value && <span className="text-amber-500 dark:text-amber-400 text-[10px] font-semibold">active</span>}
                </button>
              ))}
            </div>
          </Popover>
        </div>

        {/* Send button */}
        <div className="shrink-0 flex items-center">
          <button
            onClick={submit}
            disabled={disabled || !value.trim()}
            aria-label="Send message"
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-all duration-200 cursor-pointer shadow-sm',
              value.trim()
                ? 'bg-zinc-900 text-white dark:bg-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-200 active:scale-95 font-semibold'
                : 'bg-zinc-100 dark:bg-[#000000] border border-zinc-200 dark:border-zinc-800 text-zinc-400 dark:text-zinc-600 cursor-not-allowed'
            )}
          >
            <Send size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
