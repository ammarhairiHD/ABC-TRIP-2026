import { useCallback, useState } from "react";

interface TokenPayload {
  scope: string;
  exp: number;
}

function storageKey(scope: string): string {
  return `unlock:${scope}`;
}

/** Only ever used to decide whether to show "unlocked" in the UI -- the
 * signature is never checked client-side. The server re-verifies it on
 * every request, so there's nothing to gain by trusting this locally. */
function decodeExpiry(token: string): number | null {
  const [payloadPart] = token.split(".");
  if (!payloadPart) return null;
  try {
    const json = atob(payloadPart.replace(/-/g, "+").replace(/_/g, "/"));
    const payload = JSON.parse(json) as TokenPayload;
    return typeof payload.exp === "number" ? payload.exp : null;
  } catch {
    return null;
  }
}

function readStoredToken(scope: string): string | null {
  let token: string | null;
  try {
    token = sessionStorage.getItem(storageKey(scope));
  } catch {
    return null;
  }
  if (!token) return null;
  const exp = decodeExpiry(token);
  if (exp === null || exp * 1000 <= Date.now()) {
    try {
      sessionStorage.removeItem(storageKey(scope));
    } catch {
      /* best effort */
    }
    return null;
  }
  return token;
}

/** One unlock per tab session, kept in sessionStorage (never a cookie, so a
 * third-party page can't ride along with it -- see the security plan).
 * Call this once per scope (e.g. once in SceneryPage) and pass the result
 * down -- two independent calls for the same scope wouldn't see each
 * other's `unlock()`, since each holds its own React state. */
export function useUnlockToken(scope: string) {
  const [token, setToken] = useState<string | null>(() => readStoredToken(scope));

  const unlock = useCallback(
    async (code: string): Promise<{ ok: boolean; error?: "wrongCode" | "rateLimited" }> => {
      const res = await fetch("/api/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, scope }),
      });
      if (res.status === 429) return { ok: false, error: "rateLimited" };
      if (!res.ok) return { ok: false, error: "wrongCode" };
      const body = (await res.json()) as { token: string };
      try {
        sessionStorage.setItem(storageKey(scope), body.token);
      } catch {
        /* best effort -- editing still works for the rest of this render */
      }
      setToken(body.token);
      return { ok: true };
    },
    [scope]
  );

  const logout = useCallback(() => {
    try {
      sessionStorage.removeItem(storageKey(scope));
    } catch {
      /* best effort */
    }
    setToken(null);
  }, [scope]);

  return { token, isUnlocked: token !== null, unlock, logout };
}
