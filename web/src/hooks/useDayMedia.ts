import { useQuery } from "@tanstack/react-query";
import type { DayMediaResponse } from "../types/journey";

async function fetchDayMedia(dayNumber: number): Promise<DayMediaResponse> {
  const res = await fetch(`/api/days/${dayNumber}/media`);
  if (!res.ok) throw new Error(`/api/days/${dayNumber}/media ${res.status}`);
  return res.json();
}

export function useDayMedia(dayNumber: number | null) {
  return useQuery({
    queryKey: ["day-media", dayNumber],
    queryFn: () => fetchDayMedia(dayNumber!),
    enabled: dayNumber !== null,
  });
}
