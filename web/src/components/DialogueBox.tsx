import { AnimatePresence, motion } from "motion/react";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { cn } from "../lib/utils";

interface DialogueBoxProps {
  open: boolean;
  onClose: () => void;
  dayNumber: number;
  altitudeM: number | null;
  title?: string;
  story?: string;
  loading?: boolean;
  error?: boolean;
}

/** Retro game dialogue window, bottom sheet on mobile. */
export function DialogueBox({
  open,
  onClose,
  dayNumber,
  altitudeM,
  title,
  story,
  loading,
  error,
}: DialogueBoxProps) {
  const reducedMotion = useReducedMotion();

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={`Day ${dayNumber}`}
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
            <div className="flex items-start justify-between gap-3">
              <div className="font-pixel text-[11px] text-accent-strong">
                Day {dayNumber}
                {altitudeM != null && (
                  <span className="ml-2 text-ink-dim">{altitudeM.toLocaleString()} m</span>
                )}
              </div>
              <button
                onClick={onClose}
                aria-label="Close"
                className="min-h-11 min-w-11 font-pixel text-ink-dim hover:text-ink"
              >
                X
              </button>
            </div>

            <div className="mt-3 min-h-16">
              {loading && <p className="text-ink-dim text-sm">Loading…</p>}
              {error && (
                <p className="text-sm text-clay">Couldn't load this day's story right now.</p>
              )}
              {!loading && !error && (
                <>
                  <h2 className="font-pixel text-sm leading-relaxed text-ink">{title}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-ink-dim">{story}</p>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
