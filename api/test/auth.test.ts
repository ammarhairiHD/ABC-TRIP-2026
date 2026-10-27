import { describe, expect, it } from "vitest";
import { signToken, verifyCode, verifyToken } from "../src/lib/auth.js";

const SECRET = "test-secret";

describe("signToken / verifyToken", () => {
  it("round-trips a freshly signed token", async () => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const token = await signToken({ scope: "scenery-editor", exp }, SECRET);
    const result = await verifyToken(token, SECRET);
    expect(result).toEqual({ ok: true, payload: { scope: "scenery-editor", exp } });
  });

  it("rejects an expired token", async () => {
    const exp = Math.floor(Date.now() / 1000) - 10;
    const token = await signToken({ scope: "scenery-editor", exp }, SECRET);
    const result = await verifyToken(token, SECRET);
    expect(result).toEqual({ ok: false, reason: "expired" });
  });

  it("rejects a tampered signature", async () => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const token = await signToken({ scope: "scenery-editor", exp }, SECRET);
    const [payloadPart, signaturePart] = token.split(".");
    const tampered = `${payloadPart}.${signaturePart!.slice(0, -2)}aa`;
    const result = await verifyToken(tampered, SECRET);
    expect(result).toEqual({ ok: false, reason: "bad-signature" });
  });

  it("rejects a token signed with a different secret", async () => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const token = await signToken({ scope: "scenery-editor", exp }, SECRET);
    const result = await verifyToken(token, "a-different-secret");
    expect(result).toEqual({ ok: false, reason: "bad-signature" });
  });
});

describe("verifyCode", () => {
  const CODE = "unit-test-code-0000";
  const HASH = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa:6970be1e5e8e65254c6e9f7a036eeaba5fcec11ed71ef8a5f36d7e6c6da0735a";

  it("accepts the correct code", async () => {
    expect(await verifyCode(CODE, HASH)).toBe(true);
  });

  it("rejects a wrong code", async () => {
    expect(await verifyCode("wrong-code", HASH)).toBe(false);
  });
});
