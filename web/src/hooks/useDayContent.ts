import { useQuery } from "@tanstack/react-query";
import { MEDIA_BASE_URL } from "../lib/env";
import type { DayContent } from "../types/journey";

// Story content (day titles/intros) lives in R2, not the database, per root
// CLAUDE.md: "All text through i18n files, never the database." It's fetched
// straight from the public media domain (R2 CORS), matching the loadPath the
// repo's own CLAUDE.md already commits react-i18next's http-backend to for
// story content. That domain needs a CORS rule allowing this app's origin —
// see README. Day-9's data shape is `{ day: { "9": { title, story } } }`.
async function fetchDayContent(dayNumber: number): Promise<DayContent | null> {
  const res = await fetch(`${MEDIA_BASE_URL}/i18n/en/day-${dayNumber}.json`);
  if (!res.ok) throw new Error(`day-${dayNumber}.json ${res.status}`);
  const body = (await res.json()) as { day: Record<string, DayContent> };
  return body.day[String(dayNumber)] ?? null;
}

export function useDayContent(dayNumber: number | null) {
  return useQuery({
    queryKey: ["day-content", dayNumber],
    queryFn: () => fetchDayContent(dayNumber!),
    enabled: dayNumber !== null,
    staleTime: Infinity,
  });
}
