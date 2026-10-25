import { useQuery } from "@tanstack/react-query";
import type { DayResponse } from "../types/journey";

async function fetchDay(dayNumber: number): Promise<DayResponse> {
  const res = await fetch(`/api/days/${dayNumber}`);
  if (!res.ok) throw new Error(`/api/days/${dayNumber} ${res.status}`);
  return res.json();
}

export function useDay(dayNumber: number | null) {
  return useQuery({
    queryKey: ["day", dayNumber],
    queryFn: () => fetchDay(dayNumber!),
    enabled: dayNumber !== null,
  });
}
