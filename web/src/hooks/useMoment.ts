import { useQuery } from "@tanstack/react-query";
import type { MomentDetailResponse } from "../types/moments";

async function fetchMoment(id: string): Promise<MomentDetailResponse> {
  const res = await fetch(`/api/moments/${id}`);
  if (!res.ok) throw new Error(`/api/moments/${id} ${res.status}`);
  return res.json();
}

export function useMoment(id: string | null) {
  return useQuery({
    queryKey: ["moment", id],
    queryFn: () => fetchMoment(id!),
    enabled: id !== null,
  });
}
