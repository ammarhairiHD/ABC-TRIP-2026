import { useQuery } from "@tanstack/react-query";
import type { PeopleContent } from "../types/people";

// Traits and badges (people.notes.json / people.badges.json -> publish.py)
// live in i18n, not the database, same as day stories -- see root CLAUDE.md.
// One file covers everyone, unlike day content which is per-day, so this
// fetches once and callers pick their own id. Fetched same-origin through the
// Worker's /i18n/:lang/:file route (api/src/routes/i18n.ts), which proxies
// the MEDIA R2 bucket -- not the media CDN domain directly, so this doesn't
// depend on that domain's CORS allowlist.
async function fetchPeopleContent(): Promise<PeopleContent> {
  const res = await fetch(`/i18n/en/people.json`);
  if (!res.ok) throw new Error(`i18n/en/people.json ${res.status}`);
  return res.json();
}

export function usePeopleContent() {
  return useQuery({
    queryKey: ["people-content"],
    queryFn: fetchPeopleContent,
    staleTime: Infinity,
  });
}
