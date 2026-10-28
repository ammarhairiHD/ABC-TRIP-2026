import { useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { cn } from "../lib/utils";
import { PixelButton } from "./PixelButton";

interface UnlockSheetProps {
  open: boolean;
  title: string;
  body: string;
  codeLabel: string;
  submitLabel: string;
  cancelLabel: string;
  wrongCodeMessage: string;
  rateLimitedMessage: string;
  onSubmit: (code: string) => Promise<{ ok: boolean; error?: "wrongCode" | "rateLimited" }>;
  onUnlocked: () => void;
  onClose: () => void;
}

/** Generic code-entry bottom sheet -- no scope-specific text baked in, so
 * the download code (root CLAUDE.md) can reuse this with its own copy
 * later. Mirrors DialogueBox's bottom-sheet styling for consistency. */
export function UnlockSheet({
  open,
  title,
  body,
  codeLabel,
  submitLabel,
  cancelLabel,
  wrongCodeMessage,
  rateLimitedMessage,
  onSubmit,
  onUnlocked,
  onClose,
}: UnlockSheetProps) {
  const reducedMotion = useReducedMotion();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setCode("");
    setError(null);
    setSubmitting(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    setError(null);
    const result = await onSubmit(trimmed);
    setSubmitting(false);
    if (result.ok) {
      reset();
      onUnlocked();
    } else {
      setError(result.error === "rateLimited" ? rateLimitedMessage : wrongCodeMessage);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-bg/70"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
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
              <h2 className="font-pixel text-[11px] text-accent-strong">{title}</h2>
              <button
                type="button"
                onClick={handleClose}
                aria-label="Close"
                className="min-h-11 min-w-11 font-pixel text-ink-dim hover:text-ink"
              >
                X
              </button>
            </div>

            <p className="mt-2 text-sm leading-relaxed text-ink-dim">{body}</p>

            <form onSubmit={handleSubmit} className="mt-4">
              <label className="block font-pixel text-[10px] uppercase tracking-wide text-ink-dim">
                {codeLabel}
              </label>
              <input
                type="password"
                autoComplete="off"
                autoFocus
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="mt-2 min-h-11 w-full border-2 border-panel-border bg-bg px-3 py-2 text-sm text-ink"
              />
              {error && <p className="mt-2 text-sm text-clay">{error}</p>}
              <PixelButton type="submit" className="mt-4 w-full" disabled={submitting || !code.trim()}>
                {submitLabel}
              </PixelButton>
              <button
                type="button"
                onClick={handleClose}
                className="mt-2 w-full text-center text-xs text-ink-dim underline"
              >
                {cancelLabel}
              </button>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
