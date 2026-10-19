import { memo, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Check,
  CheckCheck,
  Copy,
  Forward,
  Loader2,
  Pencil,
  Plus,
  Reply,
  RotateCcw,
  Trash2
} from 'lucide-react';
import { cn } from '../../lib/cn';
import { clockTime } from '../../lib/format';
import type { StoredMessage } from '../../lib/storage/db';
import { BurnChip } from './BurnChip';
import { ReactionPill } from './ReactionPill';
import { FullReactionPicker } from './FullReactionPicker';
import { toast } from '../../features/toast';

const QUICK_REACTIONS = ['👍', '❤️', '🔥', '😂', '😮', '🙏'];

export interface MessageBubbleProps {
  message: StoredMessage;
  mine: boolean;
  me: string;
  onReply: (message: StoredMessage) => void;
  onForward?: (message: StoredMessage) => void;
  onEdit: (message: StoredMessage) => void;
  onDelete: (message: StoredMessage) => void;
  onReact: (message: StoredMessage, emoji: string) => void;
  onRetry?: (message: StoredMessage) => void;
}

function getMenuCoordinates(x: number, y: number, isOutgoing: boolean) {
  const menuWidth = 260;
  const menuHeight = 280;
  const pad = 12;
  const vw = typeof window !== 'undefined' ? window.innerWidth : 800;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 600;

  let posX = isOutgoing ? x - menuWidth + 30 : x - 30;
  posX = Math.max(pad, Math.min(posX, vw - menuWidth - pad));

  let posY: number;
  const spaceBelow = vh - y;
  const spaceAbove = y;

  if (spaceBelow >= menuHeight + 20) {
    posY = y + 10;
  } else if (spaceAbove >= menuHeight + 20) {
    posY = y - menuHeight - 10;
  } else {
    posY = Math.max(pad, Math.min(y - 140, vh - menuHeight - pad));
  }

  return { posX, posY };
}

function MessageBubbleComponent({
  message,
  mine,
  me,
  onReply,
  onForward,
  onEdit,
  onDelete,
  onReact,
  onRetry
}: MessageBubbleProps) {
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const [showFullPicker, setShowFullPicker] = useState(false);
  const [copied, setCopied] = useState(false);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);

  const longPress = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStart = useRef<{ x: number; y: number; time: number } | null>(null);
  const hasTriggeredSwipeHaptic = useRef(false);
  const menuContainerRef = useRef<HTMLDivElement>(null);

  const deleted = message.status === 'deleted';
  const stickerSrc = message.sticker || (message.type === 'sticker' ? message.plaintext : null);
  const sticker = message.type === 'sticker' && Boolean(stickerSrc);

  // Close context menu on Esc or outside click
  useEffect(() => {
    if (!menu) return;
    const close = () => {
      setMenu(null);
      setShowFullPicker(false);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [menu]);

  const openMenu = (x: number, y: number) => {
    const coords = getMenuCoordinates(x, y, mine);
    setMenu({ x: coords.posX, y: coords.posY });
  };

  const copy = async () => {
    if (!message.plaintext) return;
    await navigator.clipboard.writeText(message.plaintext).catch(() => undefined);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 1400);
  };

  // High-performance native touch gesture handling: swipe-to-reply + snappy long press
  const handleTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY, time: Date.now() };
    hasTriggeredSwipeHaptic.current = false;
    setIsSwiping(false);

    if (longPress.current) clearTimeout(longPress.current);
    longPress.current = setTimeout(() => {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
          navigator.vibrate(25);
        } catch {}
      }
      openMenu(t.clientX, t.clientY);
    }, 300);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const t = e.touches[0];
    const dx = t.clientX - touchStart.current.x;
    const dy = t.clientY - touchStart.current.y;

    // If movement is mostly vertical, it's a scroll: cancel long press and don't swipe
    if (Math.abs(dy) > 8 && Math.abs(dy) > Math.abs(dx)) {
      if (longPress.current) {
        clearTimeout(longPress.current);
        longPress.current = null;
      }
      if (swipeOffset !== 0) {
        setSwipeOffset(0);
        setIsSwiping(false);
      }
      return;
    }

    // Horizontal swipe-to-reply gesture
    if (Math.abs(dx) > 10) {
      if (longPress.current) {
        clearTimeout(longPress.current);
        longPress.current = null;
      }
      setIsSwiping(true);

      // Elastic rubberbanding (swiping left for incoming or mine, or swiping right for mine)
      const direction = dx < 0 ? -1 : 1;
      const rawDistance = Math.abs(dx);
      const elastic = Math.min(rawDistance * 0.45, 65) * direction;
      setSwipeOffset(elastic);

      if (Math.abs(elastic) >= 36 && !hasTriggeredSwipeHaptic.current) {
        hasTriggeredSwipeHaptic.current = true;
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          try {
            navigator.vibrate(15);
          } catch {}
        }
      }
    }
  };

  const handleTouchEnd = () => {
    if (longPress.current) {
      clearTimeout(longPress.current);
      longPress.current = null;
    }

    if (Math.abs(swipeOffset) >= 36) {
      onReply(message);
    }

    setSwipeOffset(0);
    setIsSwiping(false);
    touchStart.current = null;
  };

  return (
    <>
      <div
        onContextMenu={(e) => {
          e.preventDefault();
          openMenu(e.clientX, e.clientY);
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        className={cn('group relative flex w-full select-none touch-pan-y', mine ? 'justify-end' : 'justify-start')}
      >
        {/* Swipe-to-reply visual indicator */}
        {swipeOffset !== 0 && (
          <div
            className={cn(
              'pointer-events-none absolute top-1/2 -translate-y-1/2 flex items-center justify-center transition-opacity duration-150',
              mine ? 'right-2' : 'left-2',
              Math.abs(swipeOffset) >= 36 ? 'opacity-100 scale-110' : 'opacity-40 scale-90'
            )}
          >
            <div className="grid h-7 w-7 place-items-center rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 shadow-md">
              <Reply size={14} className={mine ? '' : '-scale-x-100'} />
            </div>
          </div>
        )}

        <div
          style={{
            transform: swipeOffset ? `translate3d(${swipeOffset}px, 0, 0)` : undefined,
            transition: isSwiping ? 'none' : 'transform 0.22s cubic-bezier(0.2, 0.9, 0.4, 1.1)'
          }}
          className={cn(
            'relative max-w-[84%] sm:max-w-[70%]',
            deleted && 'opacity-60',
            !deleted && (message.reactions?.length ?? 0) > 0 && 'mb-3'
          )}
        >
          {sticker ? (
            <div className="flex flex-col items-end">
              <button
                type="button"
                onClick={(e) => {
                  const r = e.currentTarget.getBoundingClientRect();
                  openMenu(r.left + r.width / 2, r.top + r.height / 2);
                }}
                className={cn(
                  'relative flex items-center justify-center rounded-lg transition-transform hover:scale-[1.02] active:scale-95',
                  stickerSrc?.startsWith('data:') || stickerSrc?.startsWith('http') || stickerSrc?.includes('/')
                    ? 'p-0.5'
                    : 'rounded-lg border border-zinc-800 bg-zinc-950/80 h-24 w-24 sm:h-28 sm:w-28 text-[48px] sm:text-[54px] leading-none'
                )}
              >
                {stickerSrc?.startsWith('data:') || stickerSrc?.startsWith('http') || stickerSrc?.includes('/') ? (
                  <img
                    src={stickerSrc}
                    alt="Sticker"
                    className="max-h-52 max-w-52 sm:max-h-60 sm:max-w-60 rounded-lg object-contain drop-shadow-[0_8px_24px_rgba(0,0,0,0.8)] pointer-events-none"
                  />
                ) : (
                  stickerSrc
                )}
              </button>
              <div className="mt-1 flex items-center gap-1.5 px-1 text-[10px] text-zinc-500">
                {message.expiresAt && !message.pending && !message.failed && !deleted && (
                  <BurnChip expiresAt={message.expiresAt} />
                )}
                <TimeStamp ts={message.createdAt} />
                {mine && <StatusIndicator message={message} onRetry={onRetry} />}
              </div>
            </div>
          ) : (
            <div
              className={cn(
                'relative px-3.5 py-2 text-[14px] leading-relaxed select-text shadow-sm',
                mine
                  ? 'bg-[#e4e4e7] dark:bg-[#1f1f23] rounded-lg rounded-tr-xs border border-[#d4d4d8] dark:border-white/15 text-zinc-900 dark:text-white shadow-sm dark:shadow-[0_2px_12px_rgba(0,0,0,0.8)]'
                  : 'bg-white dark:bg-[#000000] rounded-lg rounded-tl-xs border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-200 shadow-sm dark:shadow-[0_2px_12px_rgba(0,0,0,0.8)]'
              )}
            >
              {deleted ? (
                <span className="italic text-zinc-500 dark:text-zinc-400">This message was deleted.</span>
              ) : (
                <>
                  {message.replyTo && (
                    <div
                      className={cn(
                        'mb-2 flex items-start gap-2 rounded-md px-2.5 py-1.5',
                        mine
                          ? 'border-l-2 border-l-zinc-700 bg-black/[0.04] dark:border-l-white dark:bg-white/10'
                          : 'border-l-2 border-l-zinc-500 bg-black/[0.03] dark:bg-white/5'
                      )}
                    >
                      <div className="min-w-0">
                        <p className="mono truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-600 dark:text-zinc-400">
                          {(message.replyTo.sender || '').trim().toLowerCase() === (me || '').trim().toLowerCase()
                            ? 'You'
                            : `${(message.replyTo.sender || '').slice(0, 14)}…`}
                        </p>
                        <p className="truncate text-[12px] text-zinc-800 dark:text-zinc-300 font-normal">
                          {message.replyTo.text}
                        </p>
                      </div>
                    </div>
                  )}
                  <p className="whitespace-pre-wrap break-words">{message.plaintext}</p>
                </>
              )}

              <div className="mt-1.5 flex items-center justify-end gap-1.5 text-[10.5px] text-zinc-500 dark:text-zinc-400 font-mono">
                {message.edited && !deleted && <span className="italic font-sans text-zinc-400">edited</span>}
                {message.expiresAt && !message.pending && !message.failed && !deleted && (
                  <BurnChip expiresAt={message.expiresAt} />
                )}
                <TimeStamp ts={message.createdAt} />
                {mine && <StatusIndicator message={message} onRetry={onRetry} />}
              </div>
            </div>
          )}

          {/* Quick Hover Action Bar (Desktop only) */}
          {!deleted && (
            <div
              className={cn(
                'absolute -top-3 z-20 hidden items-center gap-0.5 rounded-md border border-zinc-300 dark:border-zinc-800 bg-white/95 dark:bg-[#000000] px-1 py-0.5 shadow-md backdrop-blur-md transition-opacity duration-150 group-hover:flex',
                mine ? 'right-1' : 'left-1'
              )}
            >
              {message.failed && onRetry && (
                <button
                  type="button"
                  onClick={() => onRetry(message)}
                  title="Retry sending"
                  className="grid h-6 w-6 place-items-center rounded text-red-500 hover:bg-red-500/10 hover:text-red-600 transition-colors"
                >
                  <RotateCcw size={13} />
                </button>
              )}
              <button
                type="button"
                onClick={() => onReply(message)}
                title="Reply"
                className="grid h-6 w-6 place-items-center rounded text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white transition-colors"
              >
                <Reply size={13} />
              </button>
              {onForward && (
                <button
                  type="button"
                  onClick={() => onForward(message)}
                  title="Forward"
                  className="grid h-6 w-6 place-items-center rounded text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white transition-colors"
                >
                  <Forward size={13} />
                </button>
              )}
              {message.plaintext && message.type !== 'sticker' && (
                <button
                  type="button"
                  onClick={() => {
                    void copy();
                  }}
                  title="Copy text"
                  className="grid h-6 w-6 place-items-center rounded text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white transition-colors"
                >
                  {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                </button>
              )}
              <button
                type="button"
                onClick={(e) => {
                  const r = e.currentTarget.getBoundingClientRect();
                  openMenu(r.left, r.bottom);
                }}
                title="More actions"
                className="grid h-6 w-6 place-items-center rounded text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white transition-colors"
              >
                <Plus size={13} />
              </button>
            </div>
          )}

          {!deleted && (message.reactions?.length ?? 0) > 0 && (
            <ReactionPill
              reactions={message.reactions || []}
              mine={me}
              onToggle={(emoji) => onReact(message, emoji)}
              className="left-2 -bottom-2.5"
            />
          )}
        </div>
      </div>

      {/* Context Menu Overlay */}
      {menu &&
        createPortal(
          <div
            className="fixed inset-0 z-[1000] flex bg-black/25 dark:bg-black/60 select-none animate-fadeIn"
            onClick={(e) => {
              e.stopPropagation();
              setMenu(null);
              setShowFullPicker(false);
            }}
          >
            <div
              ref={menuContainerRef}
              style={{
                position: 'fixed',
                left: `${menu.x}px`,
                top: `${menu.y}px`,
                transformOrigin: mine ? 'top right' : 'top left'
              }}
              className="flex flex-col gap-1.5 animate-scaleUp z-[1001]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* 1. Quick Reaction Bar */}
              {!deleted && (
                <div className="flex items-center gap-1 rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-[#000000] px-2 py-1 shadow-2xl backdrop-blur-xl">
                  {QUICK_REACTIONS.map((emoji) => {
                    const isSelected = message.reactions?.some(
                      (r) => (r.knotId || '').toLowerCase() === (me || '').toLowerCase() && r.emoji === emoji
                    );
                    return (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => {
                          onReact(message, emoji);
                          setMenu(null);
                          setShowFullPicker(false);
                        }}
                        className={cn(
                          'grid h-8 w-8 place-items-center rounded-md text-[16px] transition-transform hover:scale-115 hover:bg-zinc-100 dark:hover:bg-white/10 active:scale-95 cursor-pointer',
                          isSelected && 'bg-zinc-200 dark:bg-white/20 ring-1 ring-zinc-400 dark:ring-white/30'
                        )}
                      >
                        {emoji}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => setShowFullPicker((v) => !v)}
                    title="More emojis"
                    className={cn(
                      'ml-0.5 grid h-7 w-7 place-items-center rounded-md text-[12px] transition-colors cursor-pointer',
                      showFullPicker
                        ? 'bg-zinc-900 text-white dark:bg-white dark:text-black font-semibold'
                        : 'bg-zinc-100 dark:bg-white/10 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-white/20 hover:text-black dark:hover:text-white'
                    )}
                  >
                    <Plus size={13} />
                  </button>
                </div>
              )}

              {/* Full Emoji Picker on demand */}
              {showFullPicker && (
                <FullReactionPicker
                  onSelect={(emoji) => {
                    onReact(message, emoji);
                    setMenu(null);
                    setShowFullPicker(false);
                  }}
                  onClose={() => {
                    setMenu(null);
                    setShowFullPicker(false);
                  }}
                />
              )}

              {/* 2. Action Menu List */}
              <div className="flex w-52 flex-col gap-0.5 rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-[#000000] p-1.5 shadow-2xl backdrop-blur-xl">
                {message.failed && onRetry && (
                  <MenuItem
                    icon={<RotateCcw size={15} className="text-red-500 animate-pulse" />}
                    label="Retry sending"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRetry(message);
                      setMenu(null);
                    }}
                  />
                )}

                {!deleted && (
                  <MenuItem
                    icon={<Reply size={15} className="text-zinc-600 dark:text-zinc-400" />}
                    label="Reply"
                    onClick={(e) => {
                      e.stopPropagation();
                      onReply(message);
                      setMenu(null);
                    }}
                  />
                )}

                {!deleted && onForward && (
                  <MenuItem
                    icon={<Forward size={15} className="text-zinc-600 dark:text-zinc-400" />}
                    label="Forward message"
                    onClick={(e) => {
                      e.stopPropagation();
                      onForward(message);
                      setMenu(null);
                    }}
                  />
                )}

                {message.plaintext && !deleted && message.type !== 'sticker' && (
                  <MenuItem
                    icon={
                      copied ? (
                        <Check size={15} className="text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <Copy size={15} className="text-zinc-600 dark:text-zinc-400" />
                      )
                    }
                    label={copied ? 'Copied!' : 'Copy text'}
                    onClick={(e) => {
                      e.stopPropagation();
                      void copy();
                      setTimeout(() => setMenu(null), 500);
                    }}
                  />
                )}

                {mine && !deleted && message.type === 'text' && (
                  <MenuItem
                    icon={<Pencil size={15} className="text-zinc-600 dark:text-zinc-400" />}
                    label="Edit message"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(message);
                      setMenu(null);
                    }}
                  />
                )}

                {mine && (
                  <>
                    <div className="my-1 h-px bg-zinc-200 dark:bg-zinc-800" />
                    <MenuItem
                      icon={<Trash2 size={15} className="text-red-600 dark:text-red-400" />}
                      label="Delete for everyone"
                      tone="danger"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenu(null);
                        setTimeout(() => {
                          onDelete(message);
                        }, 50);
                      }}
                    />
                  </>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

function StatusIndicator({
  message,
  onRetry
}: {
  message: StoredMessage;
  onRetry?: (message: StoredMessage) => void;
}) {
  return (
    <span
      title={
        message.failed
          ? 'Failed'
          : message.pending
            ? 'Sending…'
            : message.status === 'read'
              ? 'Read'
              : message.status === 'delivered'
                ? 'Delivered'
                : 'Sent'
      }
      className="inline-flex items-center ml-0.5"
    >
      {message.failed ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRetry?.(message);
          }}
          className="inline-flex items-center gap-1 rounded bg-red-500/15 hover:bg-red-500/25 px-1.5 py-0.5 text-[10px] font-semibold text-red-500 transition-colors cursor-pointer"
          title="Retry sending"
        >
          <RotateCcw size={11} className="shrink-0 text-red-500" />
          <span>Retry</span>
        </button>
      ) : message.pending ? (
        <Loader2 size={13} className="shrink-0 animate-spin text-zinc-400" />
      ) : message.status === 'read' ? (
        <CheckCheck size={16} strokeWidth={2.4} className="shrink-0 text-[#0284c7] dark:text-[#38bdf8]" />
      ) : message.status === 'delivered' ? (
        <CheckCheck size={16} strokeWidth={2.2} className="shrink-0 text-zinc-600 dark:text-zinc-400" />
      ) : (
        <Check size={15} strokeWidth={2.2} className="shrink-0 text-zinc-600 dark:text-zinc-400" />
      )}
    </span>
  );
}

function TimeStamp({ ts }: { ts?: number | string | null }) {
  return <span className="mono">{clockTime(ts)}</span>;
}

function MenuItem({
  icon,
  label,
  onClick,
  tone = 'default'
}: {
  icon: React.ReactNode;
  label: string;
  onClick: (e: React.MouseEvent) => void;
  tone?: 'default' | 'danger';
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={(e) => {
        e.stopPropagation();
        onClick(e);
      }}
      className={cn(
        'group flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-[13px] font-medium transition-colors select-none cursor-pointer',
        tone === 'danger'
          ? 'text-red-600 dark:text-red-400 hover:bg-red-500/10 dark:hover:bg-red-500/15'
          : 'text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 hover:text-black dark:hover:text-white'
      )}
    >
      <span className="font-medium text-inherit">{label}</span>
      <span className="shrink-0">{icon}</span>
    </button>
  );
}

function areReactionsEqual(
  a?: StoredMessage['reactions'],
  b?: StoredMessage['reactions']
): boolean {
  if (a === b) return true;
  if (!a && !b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i].emoji !== b[i].emoji || a[i].knotId !== b[i].knotId) return false;
  }
  return true;
}

function areReplyToEqual(
  a?: StoredMessage['replyTo'],
  b?: StoredMessage['replyTo']
): boolean {
  if (a === b) return true;
  if (!a && !b) return true;
  if (!a || !b) return false;
  return a.id === b.id && a.text === b.text && a.sender === b.sender;
}

/**
 * Custom memo comparison ensures that in a thread of 100+ messages,
 * only the messages that actually mutated will re-render, giving native 60-120fps performance.
 */
export const MessageBubble = memo(MessageBubbleComponent, (prev, next) => {
  return (
    prev.mine === next.mine &&
    prev.me === next.me &&
    prev.message.id === next.message.id &&
    prev.message.status === next.message.status &&
    prev.message.plaintext === next.message.plaintext &&
    prev.message.edited === next.message.edited &&
    prev.message.failed === next.message.failed &&
    prev.message.pending === next.message.pending &&
    prev.message.expiresAt === next.message.expiresAt &&
    prev.message.type === next.message.type &&
    prev.message.sticker === next.message.sticker &&
    areReactionsEqual(prev.message.reactions, next.message.reactions) &&
    areReplyToEqual(prev.message.replyTo, next.message.replyTo)
  );
});
