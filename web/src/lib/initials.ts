/** Fallback initials for a sprite that hasn't loaded yet, e.g. "Abang Kama" -> "AK". */
export function initials(nickname: string): string {
  return nickname
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
