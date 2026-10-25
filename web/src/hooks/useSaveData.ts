// navigator.connection is experimental and unsupported in several browsers
// (notably Safari), so this is read once at mount, not reactive like
// useReducedMotion -- a data-saver toggle mid-session isn't worth tracking.
export function useSaveData(): boolean {
  const nav = navigator as Navigator & { connection?: { saveData?: boolean } };
  return nav.connection?.saveData ?? false;
}
