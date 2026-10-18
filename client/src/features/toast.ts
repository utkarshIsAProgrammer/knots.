import { create } from 'zustand';

export type ToastTone = 'default' | 'success' | 'warning' | 'danger';

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  tone: ToastTone;
}

interface ToastState {
  items: ToastItem[];
  push: (title: string, opts?: { description?: string; tone?: ToastTone }) => string;
  dismiss: (id: string) => void;
}

export const useToasts = create<ToastState>((set) => ({
  items: [],
  push: (title, opts) => {
    const id = crypto.randomUUID();
    set((s) => ({
      items: [...s.items, { id, title, description: opts?.description, tone: opts?.tone ?? 'default' }].slice(-4)
    }));
    const ttl = opts?.tone === 'danger' ? 6500 : 4200;
    setTimeout(() => set((s) => ({ items: s.items.filter((t) => t.id !== id) })), ttl);
    return id;
  },
  dismiss: (id) => set((s) => ({ items: s.items.filter((t) => t.id !== id) }))
}));

/** Imperative toast helpers for use outside React components. */
export const toast = {
  info: (title: string, description?: string) => useToasts.getState().push(title, { description }),
  success: (title: string, description?: string) => useToasts.getState().push(title, { description, tone: 'success' }),
  warn: (title: string, description?: string) => useToasts.getState().push(title, { description, tone: 'warning' }),
  error: (title: string, description?: string) => useToasts.getState().push(title, { description, tone: 'danger' })
};
