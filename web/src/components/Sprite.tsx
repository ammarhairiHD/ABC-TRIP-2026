import { useState } from "react";
import { cn } from "../lib/utils";

const FRAME_SIZE = 32;
const ANIMATION_DURATION: Record<"walk" | "idle", string> = {
  walk: "0.6s",
  idle: "2.4s",
};

interface SpriteProps {
  /** File under web/public/sprites/, e.g. "ammar-walk.png" or "abang-kama.png". */
  fileName: string;
  /** Frames in the horizontal strip. Teammates: 1-2 (idle). Ammar: 4 (walk). */
  frameCount: number;
  /** Two letters shown in the placeholder block if the sprite file and fallback are both missing. */
  initials: string;
  /**
   * File to fall back to if `fileName` 404s, e.g. Ammar's walk strip while his
   * idle art isn't ready yet. Only its first frame is shown (static).
   */
  fallbackFileName?: string;
  fallbackFrameCount?: number;
  /** Integer pixel scale. 32px frames at scale 3 render at 96px. */
  scale?: number;
  facing?: "left" | "right";
  /** Cycle through frames (steps animation). Off for reduced motion. */
  animate?: boolean;
  /** Selects the loop speed: a brisk walk cycle or a slow idle/blink loop. */
  loop?: "walk" | "idle";
  className?: string;
}

/**
 * Renders a sprite strip at web/public/sprites/{fileName}. If it 404s and a
 * fallback is given, shows that file's first frame (static) instead; if both
 * are missing, shows a same-size placeholder block with initials — so real
 * art drops in later with no code change, per the sprite contract in CLAUDE.md.
 */
export function Sprite({
  fileName,
  frameCount,
  initials,
  fallbackFileName,
  fallbackFrameCount,
  scale = 3,
  facing = "right",
  animate = false,
  loop = "walk",
  className,
}: SpriteProps) {
  const [status, setStatus] = useState<"primary" | "fallback" | "placeholder">("primary");
  const size = FRAME_SIZE * scale;

  if (status === "placeholder") {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-sm bg-accent text-bg font-pixel",
          className
        )}
        style={{ width: size, height: size, fontSize: Math.max(8, scale * 3) }}
        aria-label={initials}
      >
        {initials}
      </div>
    );
  }

  const showingFallback = status === "fallback";
  const activeFileName = showingFallback ? fallbackFileName! : fileName;
  const activeFrameCount = showingFallback ? fallbackFrameCount! : frameCount;

  return (
    <div
      className={cn("overflow-hidden pixelated", className)}
      style={{
        width: size,
        height: size,
        transform: facing === "left" ? "scaleX(-1)" : undefined,
      }}
    >
      <div
        className="h-full"
        style={{
          width: size * activeFrameCount,
          backgroundImage: `url(/sprites/${activeFileName})`,
          backgroundSize: `${size * activeFrameCount}px ${size}px`,
          backgroundRepeat: "no-repeat",
          imageRendering: "pixelated",
          // Fallback art only ever shows its first (leftmost) frame, statically.
          animation:
            !showingFallback && animate && activeFrameCount > 1
              ? `sprite-cycle ${ANIMATION_DURATION[loop]} steps(${activeFrameCount}) infinite`
              : undefined,
        }}
      >
        {/* 1x1 probe: real sprite art loads here invisibly to detect a 404. */}
        <img
          src={`/sprites/${activeFileName}`}
          alt=""
          aria-hidden
          draggable={false}
          className="h-0 w-0 opacity-0"
          onError={() => setStatus(!showingFallback && fallbackFileName ? "fallback" : "placeholder")}
        />
      </div>
    </div>
  );
}
