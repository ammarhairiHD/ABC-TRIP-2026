import type { MomentKind } from "../types/journey";

/** Border/text color per moment kind, shared by MomentCard and the /climb path's moment markers. */
export const MOMENT_KIND_STYLES: Record<MomentKind, string> = {
  challenge: "border-clay text-clay",
  highlight: "border-lavender text-lavender",
  funny: "border-rose text-rose",
  farewell: "border-teal text-teal",
};
