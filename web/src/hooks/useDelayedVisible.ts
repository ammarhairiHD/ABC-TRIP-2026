import { useEffect, useRef, useState } from "react";

const SHOW_AFTER_MS = 300;
const MIN_VISIBLE_MS = 600;

interface DelayedVisibleOptions {
  /** Defaults to SHOW_AFTER_MS (300ms, the site-wide rule). */
  showAfterMs?: number;
  /** Defaults to MIN_VISIBLE_MS (600ms). */
  minVisibleMs?: number;
}

/**
 * Debounces a loading flag for an overlay like LoadingScreen: `active`
 * flipping true doesn't show anything for `showAfterMs` (so fast loads never
 * flash it), and once shown it stays visible for at least `minVisibleMs`
 * even if `active` goes false sooner (so it doesn't blink). Day-page level
 * transitions pass `{ showAfterMs: 0, minVisibleMs: 1000 }` to always show
 * for ~1s instead of following the 300ms rule; every other caller uses the
 * defaults.
 */
export function useDelayedVisible(active: boolean, options?: DelayedVisibleOptions): boolean {
  const showAfterMs = options?.showAfterMs ?? SHOW_AFTER_MS;
  const minVisibleMs = options?.minVisibleMs ?? MIN_VISIBLE_MS;
  const [visible, setVisible] = useState(false);
  const shownAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (active) {
      const showTimer = setTimeout(() => {
        shownAtRef.current = Date.now();
        setVisible(true);
      }, showAfterMs);
      return () => clearTimeout(showTimer);
    }

    if (shownAtRef.current === null) {
      setVisible(false);
      return;
    }
    const remaining = Math.max(0, minVisibleMs - (Date.now() - shownAtRef.current));
    const hideTimer = setTimeout(() => {
      shownAtRef.current = null;
      setVisible(false);
    }, remaining);
    return () => clearTimeout(hideTimer);
  }, [active, showAfterMs, minVisibleMs]);

  return visible;
}
