import { useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { cn } from "../lib/utils";

interface MenuSheetProps {
  open: boolean;
  onClose: () => void;
}

function LanguagePill({
  label,
  selected,
  disabled,
  describedBy,
}: {
  label: string;
  selected?: boolean;
  disabled?: boolean;
  describedBy?: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={!!selected}
      disabled={disabled}
      aria-describedby={describedBy}
      className={cn(
        "min-h-11 flex-1 border-2 font-pixel text-[11px]",
        selected && "border-bg bg-accent text-bg",
        disabled && "cursor-not-allowed border-dashed border-panel-border bg-bg-soft text-ink-dim",
        !selected && !disabled && "border-panel-border bg-transparent text-ink"
      )}
    >
      {label}
    </button>
  );
}

/** Bottom-sheet nav menu: language picker + section links. Follows the
 * Menu.dc.html screen design (root CLAUDE.md's design canvas link),
 * reskinned to this app's 8-bit dark style and this site's actual section
 * list. Closes on tap outside, Escape, or the device/browser back button. */
export function MenuSheet({ open, onClose }: MenuSheetProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const reducedMotion = useReducedMotion();

  // Closing via the back button (not just the X/overlay/Escape) means a
  // history entry has to exist to go back to: push one when the sheet opens,
  // and treat every other close trigger below as "go back" too, so they all
  // pop that same entry instead of leaving it dangling in history.
  useEffect(() => {
    if (!open) return;
    window.history.pushState({ menuOpen: true }, "");
    const onPopState = () => onClose();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") window.history.back();
    };
    window.addEventListener("popstate", onPopState);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("popstate", onPopState);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  const sections = [
    { label: t("nav.climb"), sub: t("nav.climbDays"), to: "/climb", scrollToDay: 1 },
    { label: t("nav.wayHome"), sub: t("nav.wayHomeDays"), to: "/climb", scrollToDay: 6 },
    { label: t("nav.people"), to: "/people" },
    { label: t("nav.howItsBuilt"), to: "/built" },
  ];

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => window.history.back()}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={t("nav.menu")}
            className={cn(
              "fixed inset-x-0 bottom-0 z-50 mx-auto max-w-md",
              "border-2 border-panel-border bg-panel p-5 pb-7",
              "shadow-[0_-4px_0_0_var(--color-bg)]"
            )}
            initial={reducedMotion ? { opacity: 0 } : { y: "100%" }}
            animate={reducedMotion ? { opacity: 1 } : { y: 0 }}
            exit={reducedMotion ? { opacity: 0 } : { y: "100%" }}
            transition={{ duration: reducedMotion ? 0.15 : 0.25, ease: "easeOut" }}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-pixel text-[11px] text-accent-strong">{t("nav.language")}</h2>
              <button
                onClick={() => window.history.back()}
                aria-label={t("common.back")}
                className="min-h-11 min-w-11 font-pixel text-ink-dim hover:text-ink"
              >
                X
              </button>
            </div>

            <div role="radiogroup" aria-label={t("nav.language")} className="mt-2 flex gap-2">
              <LanguagePill label="English" selected />
              <LanguagePill label="Melayu" disabled describedBy="lang-note" />
              <LanguagePill label="नेपाली" disabled describedBy="lang-note" />
            </div>
            <p id="lang-note" className="mt-2 text-[11px] leading-relaxed text-ink-dim">
              {t("nav.comingSoonNote")}
            </p>

            <nav aria-label="Sections" className="mt-4 flex flex-col border-t-2 border-panel-border">
              {sections.map((s) => (
                <button
                  key={s.label}
                  onClick={() => {
                    onClose();
                    navigate(s.to, s.scrollToDay != null ? { state: { scrollToDay: s.scrollToDay } } : undefined);
                  }}
                  className="flex min-h-11 items-center justify-between border-b-2 border-panel-border py-2 text-left text-sm text-ink"
                >
                  {s.label}
                  {s.sub && <span className="text-[11px] text-ink-dim">{s.sub}</span>}
                </button>
              ))}
              <div
                aria-disabled="true"
                className="flex min-h-11 cursor-not-allowed items-center justify-between border-b-2 border-dashed border-panel-border py-2 text-left text-sm text-ink-dim"
              >
                {t("nav.scenery")}
                <span className="text-[11px]">{t("nav.comingSoon")}</span>
              </div>
            </nav>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
