import { Router } from "express";
import { z } from "zod";
import { env } from "cloudflare:workers";
import { signToken, verifyCode } from "../lib/auth.js";
import { badRequest, tooManyRequests, unauthorized } from "../lib/errors.js";

export const unlockRouter = Router();

interface ScopeConfig {
  codeHash: string;
  ttlSeconds: number;
}

// Reusable across scopes: when the download code (root CLAUDE.md) is built,
// it gets its own case here (its own secret, its own TTL), not a second
// endpoint or a second copy of the sign/verify logic.
function scopeConfig(scope: string): ScopeConfig | null {
  switch (scope) {
    case "scenery-editor":
      return { codeHash: env.EDITOR_CODE_HASH, ttlSeconds: 6 * 60 * 60 };
    default:
      return null;
  }
}

const unlockSchema = z.object({
  code: z.string().min(1).max(200),
  scope: z.string().min(1).max(100),
});

unlockRouter.post("/unlock", async (req, res) => {
  const parsed = unlockSchema.safeParse(req.body);
  if (!parsed.success) {
    badRequest(res, "code and scope are required");
    return;
  }
  const { code, scope } = parsed.data;
  const config = scopeConfig(scope);
  if (!config) {
    badRequest(res, "unknown scope");
    return;
  }

  // Checked before verifyCode does any hashing, so a flood of guesses is
  // capped at the edge rather than spending Worker CPU on each one.
  const ip = req.headers["cf-connecting-ip"];
  const clientIp = typeof ip === "string" && ip.length > 0 ? ip : "unknown";
  const { success } = await env.UNLOCK_LIMITER.limit({ key: clientIp });
  if (!success) {
    tooManyRequests(res, "too many attempts, try again in a minute");
    return;
  }

  const ok = await verifyCode(code.trim(), config.codeHash);
  if (!ok) {
    unauthorized(res, "wrong code");
    return;
  }

  const exp = Math.floor(Date.now() / 1000) + config.ttlSeconds;
  const token = await signToken({ scope, exp }, env.TOKEN_SECRET);
  res.json({ token, exp });
});
