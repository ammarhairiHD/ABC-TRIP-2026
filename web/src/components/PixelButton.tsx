import type { ButtonHTMLAttributes } from "react";
import { cn } from "../lib/utils";

interface PixelButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost";
}

/**
 * Chunky retro button: offset pixel shadow that collapses on press.
 * Lives here instead of components/ui/ for now; promote to a shadcn
 * `button` variant later if more button styles show up.
 */
export function PixelButton({ variant = "primary", className, children, ...props }: PixelButtonProps) {
  return (
    <button
      className={cn(
        "min-h-11 px-6 py-3 font-pixel text-xs uppercase tracking-wide border-2 transition-transform",
        "active:translate-x-[3px] active:translate-y-[3px] active:shadow-none",
        "disabled:pointer-events-none disabled:opacity-40",
        variant === "primary" &&
          "bg-accent text-bg border-bg shadow-[3px_3px_0_0_var(--color-bg)]",
        variant === "ghost" &&
          "bg-transparent text-ink border-panel-border shadow-[3px_3px_0_0_var(--color-panel-border)]",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
