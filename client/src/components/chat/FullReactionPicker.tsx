import { memo, useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import { ALL_EMOJIS } from '../../lib/emojis';

interface FullReactionPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

export const FullReactionPicker = memo(function FullReactionPicker({
  onSelect,
  onClose
}: FullReactionPickerProps) {
  const [search, setSearch] = useState('');

  const emojis = useMemo(() => {
    if (!search.trim()) return ALL_EMOJIS;
    const q = search.trim().toLowerCase();
    return ALL_EMOJIS.filter(
      (e) => e.name.toLowerCase().includes(q) || e.emoji === q || e.keywords.some((k) => k.toLowerCase().includes(q))
    );
  }, [search]);

  return (
    <div
      className="flex w-72 max-h-64 flex-col gap-1.5 overflow-hidden rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-[#000000] p-2 shadow-2xl backdrop-blur-xl animate-scaleUp"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="relative flex items-center">
        <Search size={13} className="pointer-events-none absolute left-2 text-zinc-400 dark:text-zinc-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search all emojis…"
          autoFocus
          className="h-7 w-full rounded-md bg-zinc-100 dark:bg-zinc-950 pl-7 pr-6 text-[12px] text-zinc-900 dark:text-white outline-none placeholder:text-zinc-400 dark:placeholder:text-zinc-500 border border-zinc-300 dark:border-zinc-800 focus:border-zinc-500 dark:focus:border-zinc-600"
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
      <div className="no-scrollbar grid max-h-52 grid-cols-7 gap-1 overflow-y-auto p-0.5 touch-pan-y overscroll-contain">
        {emojis.slice(0, 140).map((item) => (
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
        ))}
      </div>
    </div>
  );
});
