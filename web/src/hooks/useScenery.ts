import { useQuery } from "@tanstack/react-query";
import type { SceneryResponse } from "../types/scenery";

async function fetchScenery(noStore: boolean): Promise<SceneryResponse> {
  const res = await fetch("/api/scenery", noStore ? { cache: "no-store" } : undefined);
  if (!res.ok) throw new Error(`/api/scenery ${res.status}`);
  return res.json();
}

/** `noStore`: pass true while the caption editor is unlocked, so a save
 * followed by a reload (or a second tab) never serves a 5-minute-stale
 * cached copy back to the person editing. Public visitors keep the normal
 * cache. */
export function useScenery(options: { noStore?: boolean } = {}) {
  const noStore = options.noStore ?? false;
  return useQuery({ queryKey: ["scenery"], queryFn: () => fetchScenery(noStore) });
}
