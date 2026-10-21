import { memo, useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import { ALL_EMOJIS, EMOJI_CATEGORIES, type EmojiEntry } from '../../lib/emojis';
import { cn } from '../../lib/cn';

interface FullReactionPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

export const FullReactionPicker = memo(function FullReactionPicker({
  onSelect,
  onClose
}: FullReactionPickerProps) {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');

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

  return (
    <div
      className="flex w-[290px] sm:w-[320px] max-w-[calc(100vw-24px)] flex-col gap-1.5 overflow-hidden rounded-xl border border-zinc-300 dark:border-zinc-800 bg-white/98 dark:bg-[#000000] p-2 shadow-2xl backdrop-blur-xl animate-scaleUp select-none"
      onClick={(e) => e.stopPropagation()}
    >
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
  );
});
