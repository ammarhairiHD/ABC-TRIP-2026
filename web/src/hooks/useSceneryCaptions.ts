import { useQuery } from "@tanstack/react-query";

// Captions aren't on /api/scenery -- like every other piece of text, they
// live in i18n, not the database (root CLAUDE.md). abc-face-tools' publish.py
// writes them into each day's own file (day-{n}.json's `media.{id}.caption`,
// same spot a day's photo captions would land -- see api/src/routes/scenery.ts's
// sibling day routes), so a scenery set spanning several days means fetching
// each of those day files once and merging their `media` maps. A scenery item
// with no day yet (dayId null) has its caption in scenery.json instead.
async function fetchCaptions(path: string): Promise<Record<string, string>> {
  const res = await fetch(`/i18n/en/${path}`);
  if (!res.ok) throw new Error(`${path} ${res.status}`);
  const body = (await res.json()) as { media?: Record<string, { caption: string }> };
  const out: Record<string, string> = {};
  for (const [id, entry] of Object.entries(body.media ?? {})) {
    out[id] = entry.caption;
  }
  return out;
}

export function useSceneryCaptions(dayIds: (number | null)[]) {
  const uniqueDays = [...new Set(dayIds.filter((d): d is number => d !== null))].sort((a, b) => a - b);
  const hasDayless = dayIds.includes(null);
  const paths = [
    ...uniqueDays.map((n) => `day-${n}.json`),
    ...(hasDayless ? ["scenery.json"] : []),
  ];
  return useQuery({
    queryKey: ["scenery-captions", uniqueDays, hasDayless],
    queryFn: async () => {
      const perFile = await Promise.all(paths.map(fetchCaptions));
      return Object.assign({}, ...perFile) as Record<string, string>;
    },
    enabled: paths.length > 0,
    staleTime: Infinity,
  });
}
