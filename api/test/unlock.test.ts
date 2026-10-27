import { exports } from "cloudflare:workers";
import { describe, expect, it } from "vitest";

const UNLOCK_URL = "https://example.com/api/unlock";
const CORRECT_CODE = "unit-test-code-0000"; // matches vitest.config.ts's EDITOR_CODE_HASH

function unlock(code: string, ip: string) {
  return exports.default.fetch(UNLOCK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "CF-Connecting-IP": ip },
    body: JSON.stringify({ code, scope: "scenery-editor" }),
  });
}

describe("POST /api/unlock", () => {
  it("rejects a wrong code", async () => {
    const response = await unlock("not-the-code", "203.0.113.10");
    expect(response.status).toBe(401);
  });

  it("accepts the correct code and returns a token", async () => {
    const response = await unlock(CORRECT_CODE, "203.0.113.11");
    expect(response.status).toBe(200);
    const body = (await response.json()) as { token: string; exp: number };
    expect(typeof body.token).toBe("string");
    expect(body.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });

  it("never echoes the submitted code back", async () => {
    const response = await unlock("not-the-code", "203.0.113.13");
    const text = await response.text();
    expect(text).not.toContain("not-the-code");
  });

  it("rate-limits repeated attempts from the same IP (5/minute)", async () => {
    const ip = "203.0.113.12";
    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) {
      const response = await unlock("not-the-code", ip);
      statuses.push(response.status);
    }
    expect(statuses.slice(0, 5)).toEqual([401, 401, 401, 401, 401]);
    expect(statuses[5]).toBe(429);
  });
});
