import { useQuery } from "@tanstack/react-query";
import type { DayContent } from "../types/journey";

// Story content (day titles/intros) lives in R2, not the database, per root
// CLAUDE.md: "All text through i18n files, never the database." Fetched
// same-origin through the Worker's /i18n/:lang/:file route (api/src/routes/i18n.ts),
// which proxies the MEDIA R2 bucket -- not the media CDN domain directly, so
// this doesn't depend on that domain's CORS allowlist. Day-9's data shape is
// `{ day: { "9": { title, story } } }`.
async function fetchDayContent(dayNumber: number): Promise<DayContent | null> {
  const res = await fetch(`/i18n/en/day-${dayNumber}.json`);
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
