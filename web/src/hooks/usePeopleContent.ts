import { useQuery } from "@tanstack/react-query";
import { MEDIA_BASE_URL } from "../lib/env";
import type { PeopleContent } from "../types/people";

// Traits (people.notes.json -> publish.py) live in i18n, not the database, same
// as day stories -- see root CLAUDE.md. One file covers everyone, unlike day
// content which is per-day, so this fetches once and callers pick their own id.
async function fetchPeopleContent(): Promise<PeopleContent> {
  const res = await fetch(`${MEDIA_BASE_URL}/i18n/en/people.json`);
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
