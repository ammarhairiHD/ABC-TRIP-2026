import { useQuery } from "@tanstack/react-query";
import type { MomentsContent } from "../types/moments";

// Moment titles/stories live in i18n, not the database, same as day content
// -- see root CLAUDE.md. One file covers every moment, so this fetches once
// and callers pick their own id, same pattern as usePeopleContent. Fetched
// same-origin through the Worker's /i18n/:lang/:file route.
async function fetchMomentsContent(): Promise<MomentsContent> {
  const res = await fetch(`/i18n/en/moments.json`);
  if (!res.ok) throw new Error(`i18n/en/moments.json ${res.status}`);
  return res.json();
}

export function useMomentsContent() {
  return useQuery({
    queryKey: ["moments-content"],
    queryFn: fetchMomentsContent,
    staleTime: Infinity,
  });
}
