import { useQuery } from "@tanstack/react-query";
import type { PersonDetailResponse } from "../types/people";

async function fetchPerson(id: string): Promise<PersonDetailResponse> {
  const res = await fetch(`/api/people/${id}`);
  if (!res.ok) throw new Error(`/api/people/${id} ${res.status}`);
  return res.json();
}

export function usePerson(id: string | null) {
  return useQuery({
    queryKey: ["person", id],
    queryFn: () => fetchPerson(id!),
    enabled: id !== null,
  });
}
