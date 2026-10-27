import { env, exports } from "cloudflare:workers";
import { beforeAll, describe, expect, it } from "vitest";
import { signToken } from "../src/lib/auth.js";

const SCENERY_ID = "aaaa1111bbbb2222";
const UNKNOWN_HEX_ID = "deadbeefdeadbeef";
const CAPTION_URL = (id: string) => `https://example.com/api/scenery/${id}/caption`;
const SCENERY_URL = "https://example.com/api/scenery";

beforeAll(async () => {
  await env.DB.prepare(
    `INSERT INTO media (id, type, day_id, seq, category, width, height, hidden)
     VALUES (?, 'photo', NULL, 1, 'scenery', 100, 100, 0)`
  )
    .bind(SCENERY_ID)
    .run();
});

async function editorToken(scope = "scenery-editor"): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  return signToken({ scope, exp }, env.TOKEN_SECRET);
}

function putCaption(id: string, text: string, token?: string) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return exports.default.fetch(CAPTION_URL(id), {
    method: "PUT",
    headers,
    body: JSON.stringify({ text }),
  });
}

describe("PUT /api/scenery/:id/caption", () => {
  it("rejects a save with no token", async () => {
    const response = await putCaption(SCENERY_ID, "hello");
    expect(response.status).toBe(401);
  });

  it("rejects a save with a token for the wrong scope", async () => {
    const token = await editorToken("download");
    const response = await putCaption(SCENERY_ID, "hello", token);
    expect(response.status).toBe(401);
  });

  it("rejects an unknown media id", async () => {
    const token = await editorToken();
    const response = await putCaption(UNKNOWN_HEX_ID, "hello", token);
    expect(response.status).toBe(404);
  });

  it("rejects more than 25 words", async () => {
    const token = await editorToken();
    const text = Array.from({ length: 26 }, (_, i) => `w${i}`).join(" ");
    const response = await putCaption(SCENERY_ID, text, token);
    expect(response.status).toBe(400);
  });

  it("rejects more than 200 characters", async () => {
    const token = await editorToken();
    const response = await putCaption(SCENERY_ID, "a".repeat(201), token);
    expect(response.status).toBe(400);
  });

  it("deletes the caption when the text is empty after trimming", async () => {
    const token = await editorToken();
    await putCaption(SCENERY_ID, "temporary caption", token);
    const response = await putCaption(SCENERY_ID, "   ", token);
    expect(response.status).toBe(200);
    const body = (await response.json()) as { caption: string | null };
    expect(body.caption).toBeNull();
  });

  it("stores and returns an XSS string verbatim, as plain text, never as HTML", async () => {
    const token = await editorToken();
    const xss = "<script>alert(1)</script>";

    const putResponse = await putCaption(SCENERY_ID, xss, token);
    expect(putResponse.status).toBe(200);
    const putBody = (await putResponse.json()) as { caption: string | null };
    expect(putBody.caption).toBe(xss);

    const getResponse = await exports.default.fetch(SCENERY_URL);
    const getBody = (await getResponse.json()) as { media: Array<{ id: string; caption: string | null }> };
    const item = getBody.media.find((m) => m.id === SCENERY_ID);
    expect(item?.caption).toBe(xss);
  });
});
