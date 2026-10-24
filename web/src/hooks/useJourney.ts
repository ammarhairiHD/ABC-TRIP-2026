import { useQuery } from "@tanstack/react-query";
import type { JourneyResponse } from "../types/journey";

async function fetchJourney(): Promise<JourneyResponse> {
  const res = await fetch("/api/journey");
  if (!res.ok) throw new Error(`/api/journey ${res.status}`);
  return res.json();
}

export function useJourney() {
  return useQuery({ queryKey: ["journey"], queryFn: fetchJourney });
}
