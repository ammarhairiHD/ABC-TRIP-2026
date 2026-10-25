import { useQuery } from "@tanstack/react-query";
import type { PeopleResponse } from "../types/people";

async function fetchPeople(): Promise<PeopleResponse> {
  const res = await fetch("/api/people");
  if (!res.ok) throw new Error(`/api/people ${res.status}`);
  return res.json();
}

export function usePeople() {
  return useQuery({ queryKey: ["people"], queryFn: fetchPeople });
}
