import type { MomentKind } from "../types/journey";

/** Border/text color per moment kind, shared by MomentCard and the /climb path's moment markers. */
export const MOMENT_KIND_STYLES: Record<MomentKind, string> = {
  challenge: "border-clay text-clay",
  highlight: "border-accent-strong text-accent-strong",
  funny: "border-accent text-accent",
  farewell: "border-ink-dim text-ink-dim",
};
