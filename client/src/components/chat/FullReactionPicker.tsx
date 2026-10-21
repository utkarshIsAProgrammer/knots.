import { memo, useMemo, useRef, useState } from 'react';
import { ImagePlus, Link2, Plus, Search, Smile, Sticker as StickerIcon, X } from 'lucide-react';
import { ALL_EMOJIS, EMOJI_CATEGORIES, type EmojiEntry } from '../../lib/emojis';
import { normalizeMediaUrl } from '../../lib/mediaUrl';
import { cn } from '../../lib/cn';
import { toast } from '../../features/toast';

interface FullReactionPickerProps {
  onSelect: (emojiOrSticker: string) => void;
  onClose: () => void;
}

const OLD_DEFAULTS = new Set([
  'https://media.giphy.com/media/111ebonMs90YLu/giphy.gif',
  'https://media.giphy.com/media/NEvPzZ8bdvV4Y/giphy.gif',
  'https://media.giphy.com/media/bC9czlgCMtw4cj8RgH/giphy.gif',
  'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif',
  'https://media.giphy.com/media/artj92V8o75VPL7AeQ/giphy.gif',
  'https://media.giphy.com/media/jpbnoe3UIa8TU8LM13/giphy.gif',
  'https://media.giphy.com/media/YQitE4YNQNahy/giphy.gif',
  'https://media.giphy.com/media/gl0mkIZOW6Nwc/giphy.gif',
  'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f525.png',
  'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f44d.png',
  'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/2764.png',
  'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f4af.png',
  'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f680.png',
  'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f512.png',
  'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f480.png',
  'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/2728.png'
]);

export const FullReactionPicker = memo(function FullReactionPicker({
  onSelect,
  onClose
}: FullReactionPickerProps) {
  const [activeTab, setActiveTab] = useState<'emoji' | 'stickers'>('emoji');
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');

  // Custom Stickers & GIFs from local storage
  const [customStickers, setCustomStickers] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('knots_custom_stickers');
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed.filter((url) => typeof url === 'string' && !OLD_DEFAULTS.has(url)) : [];
    } catch {
      return [];
    }
  });

  const [customGifs, setCustomGifs] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('knots_custom_gifs');
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed.filter((url) => typeof url === 'string' && !OLD_DEFAULTS.has(url)) : [];
    } catch {
      return [];
    }
  });

  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlDraft, setUrlDraft] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Combined sticker & GIF collection
  const allStickers = useMemo(() => {
    return [...customStickers, ...customGifs];
  }, [customStickers, customGifs]);

  const filteredEmojis = useMemo(() => {
    let list: EmojiEntry[] = ALL_EMOJIS;

    if (activeCategory !== 'all') {
      list = list.filter((e) => e.category === activeCategory);
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.emoji === q ||
          e.keywords.some((k) => k.toLowerCase().includes(q))
      );
    }

    return list;
  }, [search, activeCategory]);

  const handleUploadSticker = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File too large', 'Please choose an image under 5MB.');
      e.target.value = '';
      return;
    }

    const type = file.type.toLowerCase();
    const name = file.name.toLowerCase();
    const isAnimatedOrVector =
      type === 'image/gif' ||
      type === 'image/webp' ||
      type === 'image/apng' ||
      type === 'image/svg+xml' ||
      name.endsWith('.gif') ||
      name.endsWith('.webp') ||
      name.endsWith('.apng') ||
      name.endsWith('.svg');

    if (isAnimatedOrVector || file.size <= 800 * 1024) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        if (dataUrl) {
          const updated = [dataUrl, ...customStickers.slice(0, 49)];
          setCustomStickers(updated);
          try {
            localStorage.setItem('knots_custom_stickers', JSON.stringify(updated));
            toast.success('Sticker added');
          } catch {}
          onSelect(dataUrl);
          onClose();
        }
      };
      reader.readAsDataURL(file);
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 320;
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
        canvas.width = Math.round(w);
        canvas.height = Math.round(h);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/webp', 0.9);
          const updated = [dataUrl, ...customStickers.slice(0, 49)];
          setCustomStickers(updated);
          try {
            localStorage.setItem('knots_custom_stickers', JSON.stringify(updated));
            toast.success('Sticker added');
          } catch {}
          onSelect(dataUrl);
          onClose();
        }
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleAddUrl = () => {
    const raw = urlDraft.trim();
    if (!raw) return;
    const cleanUrl = normalizeMediaUrl(raw);

    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://') && !cleanUrl.startsWith('data:')) {
      toast.error('Invalid URL', 'Please enter a valid link.');
      return;
    }

    if (cleanUrl.toLowerCase().includes('.gif') || cleanUrl.includes('giphy.com')) {
      const updated = [cleanUrl, ...customGifs.slice(0, 49)];
      setCustomGifs(updated);
      try {
        localStorage.setItem('knots_custom_gifs', JSON.stringify(updated));
        toast.success('Custom GIF added');
      } catch {}
    } else {
      const updated = [cleanUrl, ...customStickers.slice(0, 49)];
      setCustomStickers(updated);
      try {
        localStorage.setItem('knots_custom_stickers', JSON.stringify(updated));
        toast.success('Sticker added');
      } catch {}
    }
    setUrlDraft('');
    setShowUrlInput(false);
    onSelect(cleanUrl);
    onClose();
  };

  return (
    <div
      className="flex w-[290px] sm:w-[330px] max-w-[calc(100vw-24px)] flex-col gap-1.5 overflow-hidden rounded-xl border border-zinc-300 dark:border-zinc-800 bg-white/98 dark:bg-[#000000] p-2 shadow-2xl backdrop-blur-xl animate-scaleUp select-none"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Top Segmented Tabs: Emojis vs Stickers */}
      <div className="flex items-center gap-1 rounded-md bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-0.5">
        <button
          type="button"
          onClick={() => setActiveTab('emoji')}
          className={cn(
            'flex flex-1 items-center justify-center gap-1.5 rounded py-1 text-[11.5px] font-medium transition-all cursor-pointer',
            activeTab === 'emoji'
              ? 'bg-white dark:bg-white/15 text-zinc-900 dark:text-white font-semibold shadow-xs border border-zinc-200 dark:border-white/20'
              : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
          )}
        >
          <Smile size={13} /> Emojis
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('stickers')}
          className={cn(
            'flex flex-1 items-center justify-center gap-1.5 rounded py-1 text-[11.5px] font-medium transition-all cursor-pointer',
            activeTab === 'stickers'
              ? 'bg-white dark:bg-white/15 text-zinc-900 dark:text-white font-semibold shadow-xs border border-zinc-200 dark:border-white/20'
              : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
          )}
        >
          <StickerIcon size={13} /> Stickers {allStickers.length > 0 && `(${allStickers.length})`}
        </button>
      </div>

      {/* Hidden file input for uploading stickers directly from the reaction picker */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/webp,image/gif,image/png,image/svg+xml,image/apng,image/*"
        onChange={handleUploadSticker}
        className="hidden"
      />

      {/* TAB 1: EMOJIS */}
      {activeTab === 'emoji' && (
        <div className="flex flex-col gap-1.5">
          {/* Search Input — explicitly WITHOUT autoFocus so mobile virtual keyboard stays closed */}
          <div className="relative flex items-center">
            <Search size={13} className="pointer-events-none absolute left-2 text-zinc-400 dark:text-zinc-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search emojis…"
              autoFocus={false}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              className="h-7 w-full rounded-md bg-zinc-100 dark:bg-zinc-900 pl-7 pr-6 text-[12px] text-zinc-900 dark:text-white outline-none placeholder:text-zinc-400 dark:placeholder:text-zinc-500 border border-zinc-200 dark:border-zinc-800 focus:border-zinc-500 dark:focus:border-zinc-600"
            />
            {search ? (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-1.5 grid h-4 w-4 place-items-center text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
              >
                <X size={11} />
              </button>
            ) : null}
          </div>

          {/* Category Pills */}
          {!search && (
            <div className="no-scrollbar flex items-center gap-1 overflow-x-auto py-0.5">
              {EMOJI_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  className={cn(
                    'inline-flex shrink-0 items-center justify-center rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors cursor-pointer',
                    activeCategory === cat.id
                      ? 'bg-zinc-900 text-white dark:bg-white dark:text-black font-semibold'
                      : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800'
                  )}
                >
                  <span className="mr-1 text-[11px]">{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>
          )}

          {/* Emoji Grid */}
          <div className="no-scrollbar grid max-h-[220px] sm:max-h-[250px] grid-cols-7 sm:grid-cols-8 gap-1 overflow-y-auto p-0.5 touch-pan-y overscroll-contain">
            {filteredEmojis.length === 0 ? (
              <div className="col-span-7 sm:col-span-8 flex flex-col items-center justify-center py-6 text-center text-[12px] text-zinc-400">
                <span>No emojis found</span>
              </div>
            ) : (
              filteredEmojis.map((item) => (
                <button
                  key={`${item.emoji}-${item.name}`}
                  type="button"
                  onClick={() => {
                    onSelect(item.emoji);
                    onClose();
                  }}
                  title={item.name}
                  className="grid h-8 w-8 place-items-center rounded-md text-[18px] transition-transform hover:scale-120 hover:bg-zinc-100 dark:hover:bg-white/10 active:scale-90 cursor-pointer"
                >
                  {item.emoji}
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 2: STICKERS & GIFS */}
      {activeTab === 'stickers' && (
        <div className="flex flex-col gap-1.5">
          {/* Action bar for adding new sticker reaction */}
          <div className="flex items-center justify-between px-0.5 pb-0.5">
            <span className="text-[11px] font-medium text-zinc-500">
              React with your stickers
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium text-zinc-900 dark:text-white border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 cursor-pointer transition-colors"
              >
                <Plus size={11} /> Upload
              </button>
              <button
                type="button"
                onClick={() => setShowUrlInput((v) => !v)}
                className={cn(
                  'flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium transition-colors border cursor-pointer',
                  showUrlInput
                    ? 'border-black/30 dark:border-white/30 bg-black/10 dark:bg-white/10 text-zinc-900 dark:text-white'
                    : 'border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-800'
                )}
              >
                <Link2 size={11} /> Link
              </button>
            </div>
          </div>

          {/* Inline URL Add input */}
          {showUrlInput && (
            <div className="flex items-center gap-1.5 rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 p-1">
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
                placeholder="Paste Image/GIF URL (https://...)"
                autoFocus={false}
                className="h-6 grow rounded bg-white dark:bg-black px-2 text-[11px] text-zinc-900 dark:text-zinc-100 outline-none placeholder:text-zinc-400 dark:placeholder:text-zinc-600 border border-zinc-200 dark:border-zinc-800"
              />
              <button
                type="button"
                onClick={handleAddUrl}
                disabled={!urlDraft.trim()}
                className="h-6 rounded bg-zinc-900 text-white dark:bg-white/15 px-2 text-[11px] font-medium hover:bg-zinc-800 dark:hover:bg-white/25 disabled:opacity-40 cursor-pointer transition-colors"
              >
                React
              </button>
            </div>
          )}

          {/* Stickers Grid */}
          <div className="no-scrollbar grid max-h-[220px] sm:max-h-[250px] grid-cols-4 gap-1.5 overflow-y-auto p-0.5 touch-pan-y overscroll-contain">
            {allStickers.length === 0 ? (
              <div className="col-span-4 flex flex-col items-center justify-center py-6 px-3 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg">
                <ImagePlus size={20} className="text-zinc-400 dark:text-zinc-600 mb-1.5" />
                <p className="text-[12px] font-medium text-zinc-800 dark:text-zinc-300">No custom stickers yet</p>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  Upload an animated WebP, GIF, or APNG to react with it.
                </p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-2.5 flex items-center gap-1 rounded bg-black/10 dark:bg-white/10 border border-black/10 dark:border-white/20 px-2.5 py-1 text-[11px] font-medium text-zinc-900 dark:text-white hover:bg-black/15 dark:hover:bg-white/15 cursor-pointer"
                >
                  <Plus size={12} /> Upload sticker
                </button>
              </div>
            ) : (
              allStickers.map((src, idx) => (
                <button
                  key={`${src.slice(0, 32)}-${idx}`}
                  type="button"
                  onClick={() => {
                    onSelect(src);
                    onClose();
                  }}
                  title="React with this sticker"
                  className="group relative aspect-square rounded-lg bg-zinc-100 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 p-1 flex items-center justify-center transition-transform hover:scale-108 active:scale-95 cursor-pointer"
                >
                  <img
                    src={src}
                    alt="Sticker reaction"
                    referrerPolicy="no-referrer"
                    loading="lazy"
                    className="max-h-full max-w-full object-contain pointer-events-none rounded-[2px]"
                  />
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
});
