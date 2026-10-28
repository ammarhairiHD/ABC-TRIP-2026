import { useQuery } from "@tanstack/react-query";

interface ConfigResponse {
  downloadsEnabled: boolean;
}

async function fetchConfig(): Promise<ConfigResponse> {
  const res = await fetch("/api/config");
  if (!res.ok) throw new Error(`/api/config ${res.status}`);
  return res.json();
}

// A kill switch that only ever changes via redeploy -- never worth
// refetching once we have it.
export function useConfig() {
  return useQuery({ queryKey: ["config"], queryFn: fetchConfig, staleTime: Infinity });
}
