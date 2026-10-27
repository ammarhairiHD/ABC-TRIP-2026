import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { SceneryResponse } from "../types/scenery";

interface SaveCaptionInput {
  id: string;
  text: string;
  token: string;
}

interface SaveCaptionResult {
  id: string;
  caption: string | null;
}

async function saveCaption({ id, text, token }: SaveCaptionInput): Promise<SaveCaptionResult> {
  const res = await fetch(`/api/scenery/${id}/caption`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error(`caption save failed: ${res.status}`);
  return res.json();
}

/** Patches the already-fetched /api/scenery cache directly on success, so
 * the new caption shows up instantly without waiting on a refetch. */
export function useSaveCaption() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: saveCaption,
    onSuccess: (data) => {
      queryClient.setQueryData<SceneryResponse>(["scenery"], (prev) =>
        prev
          ? { media: prev.media.map((item) => (item.id === data.id ? { ...item, caption: data.caption } : item)) }
          : prev
      );
    },
  });
}
