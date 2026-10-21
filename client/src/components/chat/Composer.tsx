import { memo, useEffect, useRef, useState } from 'react';
import { Flame, Mic, Paperclip, Send, Smile } from 'lucide-react';
import { cn } from '../../lib/cn';
import { ReplyStrip } from './ReplyStrip';
import { Popover } from '../ui/Popover';
import { StickerTray } from './StickerTray';
import { durationLabel } from '../../lib/format';
import type { MessageType, ReplyRef } from '../../lib/api/types';
import { useGhostStore, processGhostCommand } from '../../lib/stealth';
import { VoiceNoteRecorder } from './VoiceNoteRecorder';
import { toast } from '../../features/toast';

const BURN_OPTIONS = [
  { label: '30s', value: 30 },
  { label: '60s', value: 60 },
  { label: '5m', value: 300 },
  { label: '1h', value: 3600 },
  { label: '1d', value: 86400 },
  { label: 'never', value: 0 }
];

interface ComposerProps {
  peer?: string;
  onSend: (text: string, options: { replyTo?: ReplyRef | null; ttlSeconds?: number; sticker?: string | null; type?: MessageType }) => void;
  onSendMedia?: (
    blob: Blob,
    mediaType: 'image' | 'video' | 'audio',
    options: { replyTo?: ReplyRef | null; ttlSeconds?: number; duration?: number }
  ) => void;
  onTyping: () => void;
  onStopTyping?: () => void;
  replyTo: ReplyRef | null;
  onClearReply: () => void;
  editing: string | null;
  onCancelEdit: () => void;
  onEditSubmit: (text: string) => void;
  me?: string;
  disabled?: boolean;
}

function ComposerComponent({
  peer,
  onSend,
  onSendMedia,
  onTyping,
  onStopTyping,
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
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [, setStealthRevision] = useState(0);

  const areaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Ghost Mode check:
  // When Ghost Mode is unlocked, voice notes, photos and video sending are enabled
  const isGhost = useGhostStore((s) => s.unlocked);
  const isMediaPermitted = isGhost;

  const grow = () => {
    const el = areaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const nextH = Math.min(Math.max(el.scrollHeight, 38), 120);
    el.style.height = `${nextH}px`;
    el.style.overflowY = el.scrollHeight > 120 ? 'auto' : 'hidden';
  };

  const submit = async () => {
    const text = value.trim();
    if (!text) return;

    // Check for stealth ghost commands (e.g. //ghost <key>, //lock, //allow, //cloud ...)
    const ghostRes = await processGhostCommand(text, peer);
    if (ghostRes.isGhostCommand) {
      setValue('');
      setStealthRevision((r) => r + 1);
      requestAnimationFrame(() => {
        const el = areaRef.current;
        if (el) {
          el.style.height = '38px';
          el.style.overflowY = 'hidden';
        }
      });
      return;
    }

    onStopTyping?.();
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

  const handleSendVoice = (audioBlob: Blob, duration: number) => {
    setIsRecordingVoice(false);
    if (onSendMedia) {
      onSendMedia(audioBlob, 'audio', { replyTo, ttlSeconds: ttl, duration });
    }
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');
    if (!isVideo && !isImage) {
      toast.error('Unsupported file', 'Please choose an image or video.');
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      toast.error('File too large', 'Please choose a file under 50MB.');
      return;
    }

    if (onSendMedia) {
      onSendMedia(file, isVideo ? 'video' : 'image', { replyTo, ttlSeconds: ttl });
    }
  };

  return (
    <div className="shrink-0 border-t border-zinc-200 dark:border-zinc-800/80 bg-white/95 dark:bg-[#000000] p-2 sm:p-2.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-md">
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

      {/* Voice Recorder Mode (Active when recording) */}
      {isRecordingVoice ? (
        <div className="mx-auto max-w-4xl">
          <VoiceNoteRecorder
            onSend={handleSendVoice}
            onCancel={() => setIsRecordingVoice(false)}
          />
        </div>
      ) : (
        <div className="mx-auto flex max-w-4xl items-end gap-2 relative">
          {/* Hidden File Input for Image/Video Attachments (Stealth Mode only) */}
          {isMediaPermitted && (
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              onChange={handleFileSelected}
              className="hidden"
            />
          )}

          {/* Media / Emoji Popover */}
          <div className="shrink-0 flex items-center gap-1">
            <Popover
              open={trayOpen}
              onClose={() => setTrayOpen(false)}
              align="start"
              side="top"
              trigger={
                <button
                  type="button"
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

            {/* Attachment Button (RENDERED ONLY FOR AUTHORIZED STEALTH PEERS) */}
            {isMediaPermitted && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Send encrypted photo or video"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-[#000000] text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-white/10 transition-colors cursor-pointer"
              >
                <Paperclip size={16} />
              </button>
            )}
          </div>

          {/* Textarea container */}
          <div className="grow relative flex items-end min-w-0">
            <div className="relative w-full">
              <textarea
                ref={areaRef}
                value={value}
                rows={1}
                disabled={disabled}
                placeholder="Type a message…"
                onChange={(e) => {
                  const val = e.target.value;
                  setValue(val);
                  grow();
                  if (val.trim()) {
                    onTyping();
                  } else {
                    onStopTyping?.();
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    submit();
                  }
                }}
                className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/90 dark:bg-[#000000] text-[16px] sm:text-[14px] text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 outline-none focus:border-zinc-400 dark:focus:border-white/30 transition-all px-3 py-2 resize-none max-h-[120px] overflow-x-hidden overflow-y-hidden no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden leading-relaxed select-text block break-words"
                style={{ minHeight: '38px', height: '38px', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                inputMode="text"
                enterKeyHint="send"
                autoComplete="off"
                autoCorrect="on"
                autoCapitalize="sentences"
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
                  type="button"
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
                    type="button"
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

          {/* Right Action: Send Button OR Voice Note Button */}
          <div className="shrink-0 flex items-center">
            {isMediaPermitted && !value.trim() && !editing ? (
              /* Microphone Button (RENDERED ONLY IN STEALTH MEDIA MODE WHEN TEXT IS EMPTY) */
              <button
                type="button"
                onClick={() => setIsRecordingVoice(true)}
                title="Record encrypted voice note"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-100 dark:bg-[#000000] border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-white/10 hover:text-black dark:hover:text-white transition-all cursor-pointer shadow-sm active:scale-95"
              >
                <Mic size={17} />
              </button>
            ) : (
              /* Standard Send Button */
              <button
                type="button"
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
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export const Composer = memo(ComposerComponent);
