import { useCallback, useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AnimatePresence, motion } from "motion/react";
import { useReducedMotion } from "../hooks/useReducedMotion";

interface TopBarProps {
  onMenuOpen: () => void;
}

const MENU_TUTORIAL_KEY = "abctrip2026:tutorial:menu-seen";
const MENU_TUTORIAL_MS = 5000;
const CLIMB_PATHS = ["/climb", "/ms/climb", "/ne/climb"];

/** One-time nudge toward the menu button, shown the first time someone
 * reaches /climb in this browser. `active` gates it to that route; `seen`
 * (localStorage, best-effort -- a private tab or blocked storage just means
 * it shows every time instead of breaking) makes it a once-ever thing. */
function useMenuTutorial(active: boolean): [boolean, () => void] {
  const [seen, setSeen] = useState(() => {
    try {
      return localStorage.getItem(MENU_TUTORIAL_KEY) === "1";
    } catch {
      return false;
    }
  });

  const dismiss = useCallback(() => {
    setSeen(true);
    try {
      localStorage.setItem(MENU_TUTORIAL_KEY, "1");
    } catch {
      /* best effort */
    }
  }, []);

  const visible = active && !seen;

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(dismiss, MENU_TUTORIAL_MS);
    return () => clearTimeout(timer);
  }, [visible, dismiss]);

  return [visible, dismiss];
}

/** Site-wide header: brand (taps to the journey map) + menu button. Shown on
 * every screen except Opening (see components/Layout.tsx). */
export function TopBar({ onMenuOpen }: TopBarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const reducedMotion = useReducedMotion();
  const [tutorialVisible, dismissTutorial] = useMenuTutorial(CLIMB_PATHS.includes(location.pathname));

  return (
    <header className="sticky top-0 z-30 flex h-[var(--topbar-h)] items-center justify-between border-b-2 border-panel-border bg-panel px-3">
      <button
        onClick={() => navigate("/")}
        className="min-h-11 py-2 font-pixel text-[11px] text-ink"
      >
        ABC Trip 2026
      </button>
      <div className="relative flex items-center">
        <button
          onClick={() => {
            dismissTutorial();
            onMenuOpen();
          }}
          aria-label={t("nav.menu")}
          className="flex min-h-11 min-w-11 items-center gap-1.5 px-2 font-pixel text-ink"
        >
          <span aria-hidden className="text-lg leading-none">☰</span>
          <span className="text-[10px] uppercase leading-none">{t("nav.menu")}</span>
        </button>
        <AnimatePresence>
          {tutorialVisible && (
            <motion.div
              role="note"
              onClick={dismissTutorial}
              className="absolute right-0 top-full z-40 mt-3 w-40 cursor-pointer border-2 border-panel-border bg-panel px-3 py-2 font-pixel text-[9px] leading-relaxed text-ink shadow-[3px_3px_0_0_var(--color-bg)]"
              initial={reducedMotion ? false : { opacity: 0, y: -4 }}
              animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
              exit={reducedMotion ? undefined : { opacity: 0 }}
              transition={{ duration: reducedMotion ? 0 : 0.2 }}
            >
              <span
                aria-hidden
                className="absolute -top-[9px] right-4 h-0 w-0 border-x-[9px] border-x-transparent border-b-[9px] border-b-panel-border"
              />
              <span
                aria-hidden
                className="absolute -top-[7px] right-[18px] h-0 w-0 border-x-[7px] border-x-transparent border-b-[7px] border-b-panel"
              />
              {t("nav.menuTutorial")}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
