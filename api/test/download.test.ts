import { env, exports } from "cloudflare:workers";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { signDownloadLink, signToken } from "../src/lib/auth.js";

const PHOTO_ID = "ddddaaaa1111bbbb";
const VIDEO_ID = "ddddaaaa2222cccc";
const HIDDEN_ID = "ddddaaaa3333dddd";
const UNKNOWN_HEX_ID = "ddddaaaa9999eeee";

const BASE = "https://example.com/api";

beforeAll(async () => {
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO media (id, type, day_id, seq, category, width, height, hidden) VALUES (?, 'photo', NULL, 1, 'people', 100, 100, 0)`
    ).bind(PHOTO_ID),
    env.DB.prepare(
      `INSERT INTO media (id, type, day_id, seq, category, width, height, duration_s, hidden) VALUES (?, 'video', NULL, 2, 'people', 100, 100, 3.5, 0)`
    ).bind(VIDEO_ID),
    env.DB.prepare(
      `INSERT INTO media (id, type, day_id, seq, category, width, height, hidden) VALUES (?, 'photo', NULL, 3, 'people', 100, 100, 1)`
    ).bind(HIDDEN_ID),
  ]);

  await env.ORIGINALS.put(`originals/${PHOTO_ID}.jpg`, new TextEncoder().encode("fake-jpg-bytes"), {
    httpMetadata: { contentType: "image/jpeg", contentDisposition: `attachment; filename="ABC-Trip-${PHOTO_ID}.jpg"` },
  });
  await env.ORIGINALS.put(`originals/${VIDEO_ID}.mp4`, new TextEncoder().encode("fake-mp4-bytes"), {
    httpMetadata: { contentType: "video/mp4", contentDisposition: `attachment; filename="ABC-Trip-${VIDEO_ID}.mp4"` },
  });
  await env.ORIGINALS.put(`originals/${HIDDEN_ID}.jpg`, new TextEncoder().encode("fake-jpg-bytes"));
});

// wrangler.jsonc ships DOWNLOADS_ENABLED="false"; vitest.config.mts turns it
// on by default so most cases here don't need per-test setup. One test
// flips it off and restores it, even on failure.
function setDownloadsEnabled(value: "true" | "false") {
  (env as unknown as { DOWNLOADS_ENABLED: string }).DOWNLOADS_ENABLED = value;
}
beforeEach(() => setDownloadsEnabled("true"));
afterEach(() => setDownloadsEnabled("true"));

async function downloadToken(scope = "download"): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  return signToken({ scope, exp }, env.TOKEN_SECRET);
}

function mintLink(id: string, token: string | null, ip = "203.0.113.20") {
  const headers: Record<string, string> = { "CF-Connecting-IP": ip };
  if (token) headers.Authorization = `Bearer ${token}`;
  return exports.default.fetch(`${BASE}/download/${id}/link`, { method: "POST", headers });
}

const ORIGIN = "https://example.com";

// `path` is the absolute path (e.g. "/api/download/:id?..."), matching what
// POST /link's `url` field returns -- not relative to BASE.
function getDownload(path: string) {
  return exports.default.fetch(`${ORIGIN}${path}`);
}

describe("POST /api/download/:id/link", () => {
  it("rejects a request with no token", async () => {
    const response = await mintLink(PHOTO_ID, null, "203.0.113.21");
    expect(response.status).toBe(401);
  });

  it("rejects a token for the wrong scope", async () => {
    const token = await downloadToken("scenery-editor");
    const response = await mintLink(PHOTO_ID, token, "203.0.113.22");
    expect(response.status).toBe(401);
  });

  it("rejects an unknown media id", async () => {
    const token = await downloadToken();
    const response = await mintLink(UNKNOWN_HEX_ID, token, "203.0.113.23");
    expect(response.status).toBe(404);
  });

  it("rejects a hidden media id", async () => {
    const token = await downloadToken();
    const response = await mintLink(HIDDEN_ID, token, "203.0.113.24");
    expect(response.status).toBe(404);
  });

  it("mints a link good for GET /api/download/:id", async () => {
    const token = await downloadToken();
    const linkResponse = await mintLink(PHOTO_ID, token, "203.0.113.25");
    expect(linkResponse.status).toBe(200);
    const { url } = (await linkResponse.json()) as { url: string };

    const fileResponse = await getDownload(url);
    expect(fileResponse.status).toBe(200);
    expect(fileResponse.headers.get("Content-Disposition")).toContain(`ABC-Trip-${PHOTO_ID}.jpg`);
    expect(new TextDecoder().decode(await fileResponse.arrayBuffer())).toBe("fake-jpg-bytes");
  });

  it("works for a video original too", async () => {
    const token = await downloadToken();
    const linkResponse = await mintLink(VIDEO_ID, token, "203.0.113.26");
    const { url } = (await linkResponse.json()) as { url: string };

    const fileResponse = await getDownload(url);
    expect(fileResponse.status).toBe(200);
    expect(fileResponse.headers.get("Content-Type")).toBe("video/mp4");
  });

  it("returns 404 from both endpoints when DOWNLOADS_ENABLED is off", async () => {
    setDownloadsEnabled("false");
    const token = await downloadToken();
    const linkResponse = await mintLink(PHOTO_ID, token, "203.0.113.27");
    expect(linkResponse.status).toBe(404);

    const exp = Math.floor(Date.now() / 1000) + 60;
    const sig = await signDownloadLink(PHOTO_ID, exp, env.TOKEN_SECRET);
    const fileResponse = await getDownload(`/api/download/${PHOTO_ID}?exp=${exp}&sig=${sig}`);
    expect(fileResponse.status).toBe(404);
  });

  it("rate-limits repeated link requests from the same IP (60/minute)", async () => {
    const token = await downloadToken();
    const ip = "203.0.113.28";
    let lastStatus = 0;
    for (let i = 0; i < 61; i++) {
      lastStatus = (await mintLink(PHOTO_ID, token, ip)).status;
    }
    expect(lastStatus).toBe(429);
  });
});

describe("GET /api/download/:id", () => {
  it("rejects an expired signature", async () => {
    const exp = Math.floor(Date.now() / 1000) - 10;
    const sig = await signDownloadLink(PHOTO_ID, exp, env.TOKEN_SECRET);
    const response = await getDownload(`/api/download/${PHOTO_ID}?exp=${exp}&sig=${sig}`);
    expect(response.status).toBe(401);
  });

  it("rejects a signature minted for a different id", async () => {
    const exp = Math.floor(Date.now() / 1000) + 60;
    const sig = await signDownloadLink(VIDEO_ID, exp, env.TOKEN_SECRET);
    const response = await getDownload(`/api/download/${PHOTO_ID}?exp=${exp}&sig=${sig}`);
    expect(response.status).toBe(401);
  });

  it("rejects a tampered signature", async () => {
    const exp = Math.floor(Date.now() / 1000) + 60;
    const sig = await signDownloadLink(PHOTO_ID, exp, env.TOKEN_SECRET);
    const tampered = sig.slice(0, -2) + (sig.slice(-2) === "aa" ? "bb" : "aa");
    const response = await getDownload(`/api/download/${PHOTO_ID}?exp=${exp}&sig=${tampered}`);
    expect(response.status).toBe(401);
  });

  it("re-checks hidden=0 even with an otherwise-valid signature", async () => {
    const exp = Math.floor(Date.now() / 1000) + 60;
    const sig = await signDownloadLink(HIDDEN_ID, exp, env.TOKEN_SECRET);
    const response = await getDownload(`/api/download/${HIDDEN_ID}?exp=${exp}&sig=${sig}`);
    expect(response.status).toBe(404);
  });

  it("never echoes the signature or token back", async () => {
    const exp = Math.floor(Date.now() / 1000) - 10;
    const sig = await signDownloadLink(PHOTO_ID, exp, env.TOKEN_SECRET);
    const response = await getDownload(`/api/download/${PHOTO_ID}?exp=${exp}&sig=${sig}`);
    const text = await response.text();
    expect(text).not.toContain(sig);
  });
});
