import { useState } from "react";
import { cn } from "../lib/utils";

const ICON_SIZE = 24;

interface BadgeIconProps {
  /** Badge id, e.g. "strong" -> /badges/strong.png (see sprite_fix.py --badge-ids). */
  badgeId: string;
  /** Badge display name, used for its placeholder initial if the icon file is missing. */
  label: string;
  /** Integer pixel scale. 24px icons at scale 2 render at 48px. */
  scale?: number;
  className?: string;
}

/**
 * Renders a badge icon at web/public/badges/{badgeId}.png. If it 404s, falls
 * back to a same-size placeholder block with the badge name's initial, same
 * contract as Sprite.tsx, so real art drops in later with no code change.
 */
export function BadgeIcon({ badgeId, label, scale = 2, className }: BadgeIconProps) {
  const [broken, setBroken] = useState(false);
  const size = ICON_SIZE * scale;

  if (broken) {
    return (
      <div
        className={cn("flex items-center justify-center rounded-sm bg-accent text-bg font-pixel", className)}
        style={{ width: size, height: size, fontSize: Math.max(8, scale * 5) }}
        aria-hidden
      >
        {label.slice(0, 1).toUpperCase()}
      </div>
    );
  }

  return (
    <img
      src={`/badges/${badgeId}.png`}
      alt=""
      aria-hidden
      onError={() => setBroken(true)}
      className={cn("pixelated", className)}
      style={{ width: size, height: size, imageRendering: "pixelated" }}
    />
  );
}
