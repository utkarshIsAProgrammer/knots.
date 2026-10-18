import { create } from 'zustand';
import type { ThemeMode } from '../lib/api/types';
import { getSetting, setSetting } from '../lib/storage/db';

type Resolved = 'dark' | 'light';

interface ThemeState {
  mode: ThemeMode;
  resolved: Resolved;
  ready: boolean;
  init: () => Promise<void>;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
}

function systemPrefers(): Resolved {
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function resolve(mode: ThemeMode): Resolved {
  return mode === 'system' ? systemPrefers() : mode;
}

function apply(resolved: Resolved) {
  document.documentElement.dataset.theme = resolved;
  document.documentElement.classList.toggle('dark', resolved === 'dark');
  document.documentElement.classList.toggle('light', resolved === 'light');
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', resolved === 'dark' ? '#000000' : '#ffffff');
}

export const useTheme = create<ThemeState>((set, get) => ({
  mode: 'dark',
  resolved: 'dark',
  ready: false,
  init: async () => {
    const mode = await getSetting<ThemeMode>('theme', 'system');
    const resolved = resolve(mode);
    apply(resolved);
    set({ mode, resolved, ready: true });
    window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => {
      if (get().mode === 'system') {
        const r = systemPrefers();
        apply(r);
        set({ resolved: r });
      }
    });
  },
  setMode: (mode) => {
    const resolved = resolve(mode);
    apply(resolved);
    set({ mode, resolved });
    void setSetting('theme', mode);
  },
  toggle: () => {
    const next: ThemeMode = get().resolved === 'dark' ? 'light' : 'dark';
    get().setMode(next);
  }
}));
