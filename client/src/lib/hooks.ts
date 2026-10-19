import { useEffect, useRef, useState } from 'react';

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);
  return matches;
}

export const useIsDesktop = () => useMediaQuery('(min-width: 1024px)');

export function useEscape(active: boolean, onEscape: () => void) {
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onEscape();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, onEscape]);
}

export function useBodyLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [active]);
}

export function useOutsideClick<T extends HTMLElement>(active: boolean, onOutside: () => void) {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (!active) return;
    const onPointer = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onOutside();
    };
    // Defer so the opening click does not immediately close the layer.
    const id = setTimeout(() => document.addEventListener('mousedown', onPointer), 0);
    return () => {
      clearTimeout(id);
      document.removeEventListener('mousedown', onPointer);
    };
  }, [active, onOutside]);
  return ref;
}

/** Polling interval that continues running in background at intervalMs, with immediate execution on return. */
export function usePolling(callback: () => void, intervalMs: number, enabled = true) {
  const saved = useRef(callback);
  saved.current = callback;
  useEffect(() => {
    if (!enabled) return;
    saved.current();
    const id = setInterval(() => saved.current(), intervalMs);

    const onVisibility = () => {
      if (!document.hidden) {
        saved.current();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [intervalMs, enabled]);
}

export interface VisualViewportState {
  height: number;
  offsetTop: number;
}

/**
 * Tracks the mobile visual viewport height and offsetTop (accounting for virtual keyboards on iOS/Android).
 * Throttles state updates with requestAnimationFrame to prevent 60fps React render thrashing during keyboard open/close.
 */
export function useVisualViewport(): VisualViewportState | null {
  const [viewport, setViewport] = useState<VisualViewportState | null>(() => {
    if (typeof window !== 'undefined' && window.visualViewport) {
      return {
        height: Math.round(window.visualViewport.height),
        offsetTop: Math.round(window.visualViewport.offsetTop)
      };
    }
    return null;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;

    let rafId: number | null = null;
    const update = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        if (window.visualViewport) {
          const nextHeight = Math.round(window.visualViewport.height);
          const nextOffset = Math.round(window.visualViewport.offsetTop);
          setViewport((prev) => {
            if (prev && prev.height === nextHeight && prev.offsetTop === nextOffset) {
              return prev;
            }
            return { height: nextHeight, offsetTop: nextOffset };
          });
        }
      });
    };

    window.visualViewport.addEventListener('resize', update);
    window.visualViewport.addEventListener('scroll', update);

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      window.visualViewport?.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener('scroll', update);
    };
  }, []);

  return viewport;
}
