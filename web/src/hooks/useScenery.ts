import { useQuery } from "@tanstack/react-query";
import type { SceneryResponse } from "../types/scenery";

async function fetchScenery(): Promise<SceneryResponse> {
  const res = await fetch("/api/scenery");
  if (!res.ok) throw new Error(`/api/scenery ${res.status}`);
  return res.json();
}

export function useScenery() {
  return useQuery({ queryKey: ["scenery"], queryFn: fetchScenery });
}
