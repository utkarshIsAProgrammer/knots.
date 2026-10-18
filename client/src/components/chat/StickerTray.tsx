import { useMemo, useRef, useState } from 'react';
import { Film, ImagePlus, Link2, Plus, Search, Smile, Sticker as StickerIcon, Trash2, X } from 'lucide-react';
import { ALL_EMOJIS, type EmojiEntry } from '../../lib/emojis';
import { cn } from '../../lib/cn';
import { toast } from '../../features/toast';

type TrayTab = 'emoji' | 'gifs' | 'stickers';

const DEFAULT_GIFS = [
  'https://media.giphy.com/media/111ebonMs90YLu/giphy.gif', // Thumbs up
  'https://media.giphy.com/media/NEvPzZ8bdvV4Y/giphy.gif', // Nod
  'https://media.giphy.com/media/bC9czlgCMtw4cj8RgH/giphy.gif', // Laugh
  'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif', // Mind blown
  'https://media.giphy.com/media/artj92V8o75VPL7AeQ/giphy.gif', // Celebration
  'https://media.giphy.com/media/jpbnoe3UIa8TU8LM13/giphy.gif', // Vibing cat
  'https://media.giphy.com/media/YQitE4YNQNahy/giphy.gif', // Matrix hacker
  'https://media.giphy.com/media/gl0mkIZOW6Nwc/giphy.gif'  // Popcorn
];

const DEFAULT_STICKERS = [
  'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f525.png', // Fire
  'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f44d.png', // Thumbs up
  'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/2764.png',  // Red heart
  'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f4af.png', // 100
  'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f680.png', // Rocket
  'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f512.png', // Lock
  'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f480.png', // Skull
  'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/2728.png'  // Sparkles
];

export function StickerTray({
  onEmoji,
  onSticker
}: {
  onEmoji: (emoji: string) => void;
  onSticker: (sticker: string) => void;
}) {
  const [tab, setTab] = useState<TrayTab>('emoji');
  const [search, setSearch] = useState('');

  // Custom GIFs (persisted locally)
  const [customGifs, setCustomGifs] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('knots_custom_gifs');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Custom Stickers (persisted locally)
  const [customStickers, setCustomStickers] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('knots_custom_stickers');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const allGifs = useMemo(() => {
    const list = [...customGifs];
    for (const g of DEFAULT_GIFS) {
      if (!list.includes(g)) list.push(g);
    }
    return list;
  }, [customGifs]);

  const allStickers = useMemo(() => {
    const list = [...customStickers];
    for (const s of DEFAULT_STICKERS) {
      if (!list.includes(s)) list.push(s);
    }
    return list;
  }, [customStickers]);

  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlDraft, setUrlDraft] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'gif' | 'sticker'; index: number } | null>(null);

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchOrigin = useRef<{ x: number; y: number } | null>(null);
  const didLongPress = useRef(false);

  const gifFileInputRef = useRef<HTMLInputElement>(null);
  const stickerFileInputRef = useRef<HTMLInputElement>(null);

  // Filter emojis directly by keyword
  const filteredEmojis = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return ALL_EMOJIS;
    return ALL_EMOJIS.filter(
      (item: EmojiEntry) =>
        item.name.toLowerCase().includes(q) ||
        item.emoji.includes(q) ||
        item.keywords.some((k) => k.toLowerCase().includes(q))
    );
  }, [search]);

  // Long-press handling for individual custom stickers/gifs
  const startLongPress = (type: 'gif' | 'sticker', index: number, e: React.TouchEvent | React.MouseEvent) => {
    if ('touches' in e) {
      const t = e.touches[0];
      touchOrigin.current = { x: t.clientX, y: t.clientY };
    }
    didLongPress.current = false;
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    longPressTimer.current = setTimeout(() => {
      didLongPress.current = true;
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
          navigator.vibrate(35);
        } catch {}
      }
      setDeleteConfirm({ type, index });
      longPressTimer.current = null;
    }, 450);
  };

  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    touchOrigin.current = null;
  };

  const checkTouchMove = (e: React.TouchEvent) => {
    if (!touchOrigin.current || !longPressTimer.current) return;
    const t = e.touches[0];
    const dist = Math.hypot(t.clientX - touchOrigin.current.x, t.clientY - touchOrigin.current.y);
    if (dist > 8) cancelLongPress();
  };

  // Handle GIF file upload (direct data URL to preserve animated GIF frames)
  const handleUploadGif = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2.5 * 1024 * 1024) {
      toast.error('File too large', 'Please choose a GIF under 2.5MB for fast delivery, or paste a GIF URL.');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      if (dataUrl) {
        const updated = [dataUrl, ...customGifs.slice(0, 49)];
        setCustomGifs(updated);
        try {
          localStorage.setItem('knots_custom_gifs', JSON.stringify(updated));
          toast.success('Custom GIF added');
        } catch {
          toast.error('Storage full', 'Could not save GIF to local storage.');
        }
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Handle custom sticker upload
  const handleUploadSticker = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 240;
        let w = img.width;
        let h = img.height;
        if (w > h) {
          if (w > maxDim) {
            h = (h * maxDim) / w;
            w = maxDim;
          }
        } else {
          if (h > maxDim) {
            w = (w * maxDim) / h;
            h = maxDim;
          }
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          const dataUrl = canvas.toDataURL('image/webp', 0.9);
          const updated = [dataUrl, ...customStickers.slice(0, 49)];
          setCustomStickers(updated);
          try {
            localStorage.setItem('knots_custom_stickers', JSON.stringify(updated));
            toast.success('Custom sticker added');
          } catch {}
        }
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Add custom item by URL
  const handleAddUrl = () => {
    const trimmed = urlDraft.trim();
    if (!trimmed) return;
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://') && !trimmed.startsWith('data:')) {
      toast.error('Invalid URL', 'Please enter a valid HTTP or HTTPS link.');
      return;
    }

    if (tab === 'gifs') {
      const updated = [trimmed, ...customGifs.slice(0, 49)];
      setCustomGifs(updated);
      try {
        localStorage.setItem('knots_custom_gifs', JSON.stringify(updated));
        toast.success('Custom GIF added');
      } catch {}
    } else {
      const updated = [trimmed, ...customStickers.slice(0, 49)];
      setCustomStickers(updated);
      try {
        localStorage.setItem('knots_custom_stickers', JSON.stringify(updated));
        toast.success('Custom sticker added');
      } catch {}
    }
    setUrlDraft('');
    setShowUrlInput(false);
  };

  const removeCustomGif = (idx: number) => {
    const updated = customGifs.filter((_, i) => i !== idx);
    setCustomGifs(updated);
    try {
      localStorage.setItem('knots_custom_gifs', JSON.stringify(updated));
      toast.info('GIF removed');
    } catch {}
  };

  const removeCustomSticker = (idx: number) => {
    const updated = customStickers.filter((_, i) => i !== idx);
    setCustomStickers(updated);
    try {
      localStorage.setItem('knots_custom_stickers', JSON.stringify(updated));
      toast.info('Sticker removed');
    } catch {}
  };

  return (
    <div className="relative w-[21.5rem] max-w-[calc(100vw-24px)] p-2 select-none">
      {/* Individual Item Delete Confirmation Prompt (triggered on long-press) */}
      {deleteConfirm && (
        <div className="absolute inset-2 z-40 flex flex-col items-center justify-center rounded-lg bg-black/95 p-4 text-center border border-zinc-800 shadow-2xl animate-fadeIn">
          <Trash2 size={24} className="text-red-400 mb-2" />
          <p className="text-[13px] font-semibold text-white">
            Remove this {deleteConfirm.type === 'gif' ? 'GIF' : 'sticker'}?
          </p>
          <p className="text-[11px] text-zinc-400 mt-0.5">
            It will be removed from your personal collection.
          </p>
          <div className="flex gap-2 mt-3.5">
            <button
              type="button"
              onClick={() => setDeleteConfirm(null)}
              className="rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-[11.5px] font-medium text-zinc-300 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                if (deleteConfirm.type === 'gif') {
                  removeCustomGif(deleteConfirm.index);
                } else {
                  removeCustomSticker(deleteConfirm.index);
                }
                setDeleteConfirm(null);
              }}
              className="rounded-md bg-red-600 px-3 py-1.5 text-[11.5px] font-medium text-white shadow-sm hover:bg-red-500"
            >
              Remove
            </button>
          </div>
        </div>
      )}

      {/* Sleek Boxy Tabs */}
      <div className="flex items-center gap-1 rounded-md bg-zinc-100 dark:bg-[#000000] border border-zinc-200 dark:border-zinc-800 p-0.5 mb-2">
        <button
          type="button"
          onClick={() => {
            setTab('emoji');
            setSearch('');
            setShowUrlInput(false);
          }}
          className={cn(
            'flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-[12px] font-medium transition-all',
            tab === 'emoji' ? 'bg-white dark:bg-white/10 text-zinc-900 dark:text-white font-medium border border-zinc-200 dark:border-white/20 shadow-sm' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
          )}
        >
          <Smile size={14} /> Emoji
        </button>
        <button
          type="button"
          onClick={() => {
            setTab('gifs');
            setSearch('');
            setShowUrlInput(false);
          }}
          className={cn(
            'flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-[12px] font-medium transition-all',
            tab === 'gifs' ? 'bg-white dark:bg-white/10 text-zinc-900 dark:text-white font-medium border border-zinc-200 dark:border-white/20 shadow-sm' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
          )}
        >
          <Film size={14} /> GIFs
        </button>
        <button
          type="button"
          onClick={() => {
            setTab('stickers');
            setSearch('');
            setShowUrlInput(false);
          }}
          className={cn(
            'flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-[12px] font-medium transition-all',
            tab === 'stickers' ? 'bg-white dark:bg-white/10 text-zinc-900 dark:text-white font-medium border border-zinc-200 dark:border-white/20 shadow-sm' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
          )}
        >
          <StickerIcon size={14} /> Stickers
        </button>
      </div>

      {/* Hidden File Inputs */}
      <input
        ref={gifFileInputRef}
        type="file"
        accept="image/gif"
        onChange={handleUploadGif}
        className="hidden"
      />
      <input
        ref={stickerFileInputRef}
        type="file"
        accept="image/*"
        onChange={handleUploadSticker}
        className="hidden"
      />

      {/* TAB 1: EMOJI (Sleek, No Categories, Fast Search) */}
      {tab === 'emoji' && (
        <div className="space-y-2">
          <div className="relative flex items-center">
            <Search size={14} className="pointer-events-none absolute left-2.5 text-zinc-400 dark:text-zinc-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search emojis…"
              className="h-8 w-full rounded-md bg-zinc-100 dark:bg-[#000000] pl-8 pr-7 text-[12.5px] text-zinc-900 dark:text-zinc-100 outline-none placeholder:text-zinc-400 dark:placeholder:text-zinc-500 border border-zinc-200 dark:border-zinc-800 focus:border-zinc-400 dark:focus:border-zinc-700 transition-colors"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2 grid h-4 w-4 place-items-center text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
              >
                <X size={12} />
              </button>
            )}
          </div>

          <div className="no-scrollbar grid max-h-56 grid-cols-8 gap-0.5 overflow-y-auto px-0.5 touch-pan-y overscroll-contain">
            {filteredEmojis.length === 0 ? (
              <div className="col-span-8 flex flex-col items-center justify-center py-8 text-center text-[12px] text-zinc-500">
                <p>No matching emoji</p>
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="mt-1 text-white underline text-[11px]"
                >
                  Clear search
                </button>
              </div>
            ) : (
              filteredEmojis.map((item) => (
                <button
                  key={`${item.name}-${item.emoji}`}
                  type="button"
                  title={item.name}
                  onClick={() => onEmoji(item.emoji)}
                  className="grid h-8 w-8 place-items-center rounded-md text-[19px] leading-none transition-transform hover:scale-120 hover:bg-white/10 active:scale-90"
                >
                  {item.emoji}
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 2: CUSTOM GIFS */}
      {tab === 'gifs' && (
        <div className="space-y-2">
          {/* Header Actions */}
          <div className="flex items-center justify-between px-1 pb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              My GIFs {customGifs.length > 0 && `(${customGifs.length})`}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => gifFileInputRef.current?.click()}
                className="flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium text-zinc-900 dark:text-white border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-[#000000] hover:bg-zinc-200 dark:hover:bg-white/10 transition-colors"
              >
                <Plus size={12} /> Upload .gif
              </button>
              <button
                type="button"
                onClick={() => setShowUrlInput((v) => !v)}
                className={cn(
                  'flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium transition-colors border',
                  showUrlInput
                    ? 'border-black/30 dark:border-white/30 bg-black/10 dark:bg-white/10 text-zinc-900 dark:text-white'
                    : 'border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-[#000000] text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-white/10'
                )}
              >
                <Link2 size={12} /> Link
              </button>
            </div>
          </div>

          {/* Inline URL Add input */}
          {showUrlInput && (
            <div className="flex items-center gap-1.5 rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-[#000000] p-1.5">
              <input
                type="url"
                value={urlDraft}
                onChange={(e) => setUrlDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddUrl();
                  }
                }}
                placeholder="Paste GIF URL (https://...)"
                className="h-7 grow rounded bg-white dark:bg-[#000000] px-2 text-[12px] text-zinc-900 dark:text-zinc-100 outline-none placeholder:text-zinc-400 dark:placeholder:text-zinc-600 border border-zinc-200 dark:border-zinc-800 focus:border-zinc-400 dark:focus:border-zinc-700"
              />
              <button
                type="button"
                onClick={handleAddUrl}
                disabled={!urlDraft.trim()}
                className="h-7 rounded bg-zinc-900 text-white dark:bg-white/15 px-2.5 text-[11.5px] font-medium hover:bg-zinc-800 dark:hover:bg-white/25 disabled:opacity-40 transition-colors"
              >
                Add
              </button>
            </div>
          )}

          {/* Grid or Empty State */}
          {allGifs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 px-4 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg">
              <Film size={24} className="text-zinc-400 dark:text-zinc-600 mb-2" />
              <p className="text-[13px] font-medium text-zinc-800 dark:text-zinc-300">No GIFs available</p>
              <p className="text-[11.5px] text-zinc-500 mt-0.5 max-w-[200px]">
                Upload your own .gif files or paste a direct GIF link. Press and hold custom GIFs to delete.
              </p>
              <div className="flex gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => gifFileInputRef.current?.click()}
                  className="flex items-center gap-1 rounded-md bg-black/10 dark:bg-white/10 border border-black/10 dark:border-white/20 px-2.5 py-1 text-[11.5px] font-medium text-zinc-900 dark:text-white hover:bg-black/15 dark:hover:bg-white/15 transition-all"
                >
                  <Plus size={12} /> Upload GIF
                </button>
                <button
                  type="button"
                  onClick={() => setShowUrlInput(true)}
                  className="flex items-center gap-1 rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-[#000000] px-2.5 py-1 text-[11.5px] font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-white/10 transition-all"
                >
                  <Link2 size={12} /> Paste URL
                </button>
              </div>
            </div>
          ) : (
            <div className="no-scrollbar grid max-h-60 grid-cols-2 gap-1.5 overflow-y-auto px-0.5 touch-pan-y overscroll-contain">
              {allGifs.map((url, idx) => {
                const isCustom = idx < customGifs.length;
                return (
                  <div
                    key={`${url.slice(0, 32)}-${idx}`}
                    onTouchStart={isCustom ? (e) => startLongPress('gif', idx, e) : undefined}
                    onTouchMove={isCustom ? checkTouchMove : undefined}
                    onTouchEnd={isCustom ? cancelLongPress : undefined}
                    onMouseDown={isCustom ? (e) => startLongPress('gif', idx, e) : undefined}
                    onMouseUp={isCustom ? cancelLongPress : undefined}
                    onMouseLeave={isCustom ? cancelLongPress : undefined}
                    onContextMenu={isCustom ? (e) => {
                      e.preventDefault();
                      setDeleteConfirm({ type: 'gif', index: idx });
                    } : undefined}
                    className="group relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-zinc-100 dark:bg-[#000000] border border-zinc-200 dark:border-zinc-800 transition-transform hover:scale-[1.02] active:scale-95"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        if (didLongPress.current) {
                          didLongPress.current = false;
                          return;
                        }
                        onSticker(url);
                      }}
                      className="h-full w-full"
                    >
                      <img
                        src={url}
                        alt="GIF"
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105 pointer-events-none"
                      />
                    </button>
                    {isCustom && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirm({ type: 'gif', index: idx });
                        }}
                        title="Remove GIF (or long press)"
                        className="absolute top-1 right-1 grid h-5 w-5 place-items-center rounded-md bg-black/90 text-red-400 border border-zinc-800 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/20"
                      >
                        <Trash2 size={11} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: STICKERS */}
      {tab === 'stickers' && (
        <div className="space-y-2">
          {/* Header Actions */}
          <div className="flex items-center justify-between px-1 pb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              Stickers ({allStickers.length})
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => stickerFileInputRef.current?.click()}
                className="flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium text-zinc-900 dark:text-white border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-[#000000] hover:bg-zinc-200 dark:hover:bg-white/10 transition-colors"
              >
                <Plus size={12} /> Upload Sticker
              </button>
              <button
                type="button"
                onClick={() => setShowUrlInput((v) => !v)}
                className={cn(
                  'flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium transition-colors border',
                  showUrlInput
                    ? 'border-black/30 dark:border-white/30 bg-black/10 dark:bg-white/10 text-zinc-900 dark:text-white'
                    : 'border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-[#000000] text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-white/10'
                )}
              >
                <Link2 size={12} /> Link
              </button>
            </div>
          </div>

          {/* Inline URL Add input */}
          {showUrlInput && (
            <div className="flex items-center gap-1.5 rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-[#000000] p-1.5">
              <input
                type="url"
                value={urlDraft}
                onChange={(e) => setUrlDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddUrl();
                  }
                }}
                placeholder="Paste Sticker Image URL (https://...)"
                className="h-7 grow rounded bg-white dark:bg-[#000000] px-2 text-[12px] text-zinc-900 dark:text-zinc-100 outline-none placeholder:text-zinc-400 dark:placeholder:text-zinc-600 border border-zinc-200 dark:border-zinc-800 focus:border-zinc-400 dark:focus:border-zinc-700"
              />
              <button
                type="button"
                onClick={handleAddUrl}
                disabled={!urlDraft.trim()}
                className="h-7 rounded bg-zinc-900 text-white dark:bg-white/15 px-2.5 text-[11.5px] font-medium hover:bg-zinc-800 dark:hover:bg-white/25 disabled:opacity-40 transition-colors"
              >
                Add
              </button>
            </div>
          )}

          {/* Grid or Empty State */}
          {allStickers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 px-4 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg">
              <ImagePlus size={24} className="text-zinc-400 dark:text-zinc-600 mb-2" />
              <p className="text-[13px] font-medium text-zinc-800 dark:text-zinc-300">No stickers available</p>
              <p className="text-[11.5px] text-zinc-500 mt-0.5 max-w-[200px]">
                Upload PNG, WebP, or SVG images. Press and hold to delete.
              </p>
              <div className="flex gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => stickerFileInputRef.current?.click()}
                  className="flex items-center gap-1 rounded-md bg-black/10 dark:bg-white/10 border border-black/10 dark:border-white/20 px-2.5 py-1 text-[11.5px] font-medium text-zinc-900 dark:text-white hover:bg-black/15 dark:hover:bg-white/15 transition-all"
                >
                  <Plus size={12} /> Upload Sticker
                </button>
                <button
                  type="button"
                  onClick={() => setShowUrlInput(true)}
                  className="flex items-center gap-1 rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-[#000000] px-2.5 py-1 text-[11.5px] font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-white/10 transition-all"
                >
                  <Link2 size={12} /> Paste URL
                </button>
              </div>
            </div>
          ) : (
            <div className="no-scrollbar grid max-h-60 grid-cols-4 gap-1.5 overflow-y-auto px-0.5 touch-pan-y overscroll-contain">
              {allStickers.map((src, idx) => {
                const isCustom = idx < customStickers.length;
                return (
                  <div
                    key={`${src.slice(0, 32)}-${idx}`}
                    onTouchStart={isCustom ? (e) => startLongPress('sticker', idx, e) : undefined}
                    onTouchMove={isCustom ? checkTouchMove : undefined}
                    onTouchEnd={isCustom ? cancelLongPress : undefined}
                    onMouseDown={isCustom ? (e) => startLongPress('sticker', idx, e) : undefined}
                    onMouseUp={isCustom ? cancelLongPress : undefined}
                    onMouseLeave={isCustom ? cancelLongPress : undefined}
                    onContextMenu={isCustom ? (e) => {
                      e.preventDefault();
                      setDeleteConfirm({ type: 'sticker', index: idx });
                    } : undefined}
                    className="group relative aspect-square rounded-lg bg-zinc-100 dark:bg-[#000000] border border-zinc-200 dark:border-zinc-800 p-1 transition-transform hover:scale-105"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        if (didLongPress.current) {
                          didLongPress.current = false;
                          return;
                        }
                        onSticker(src);
                      }}
                      className="h-full w-full flex items-center justify-center"
                    >
                      <img
                        src={src}
                        alt="Sticker"
                        className="max-h-full max-w-full object-contain pointer-events-none"
                      />
                    </button>
                    {isCustom && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirm({ type: 'sticker', index: idx });
                        }}
                        title="Remove sticker (or long press)"
                        className="absolute top-1 right-1 grid h-5 w-5 place-items-center rounded-md bg-black/90 text-red-400 border border-zinc-800 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/20"
                      >
                        <Trash2 size={11} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
