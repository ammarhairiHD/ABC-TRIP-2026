import { Router } from "express";
import { env } from "cloudflare:workers";

export const configRouter = Router();

// Lets the frontend hide the Download button without fetching /api/journey
// (not every screen that needs this loads that) or hard-coding the flag.
configRouter.get("/config", (_req, res) => {
  // See download.ts's downloadsEnabled() for why this goes through a
  // `string`-typed local first.
  const value: string = env.DOWNLOADS_ENABLED;
  res.json({ downloadsEnabled: value === "true" });
});
