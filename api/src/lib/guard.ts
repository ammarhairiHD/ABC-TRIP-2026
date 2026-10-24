/**
 * Simran (11) is a minor: her face is never shown and she has no person page
 * (see ../../../CLAUDE.md). publish.py already keeps her out of D1 entirely,
 * but every route checks again here on purpose -- belt and suspenders.
 */
export const HIDDEN_PERSON_IDS = new Set(["simran"]);

export function isHiddenPersonId(id: string): boolean {
  return HIDDEN_PERSON_IDS.has(id);
}
