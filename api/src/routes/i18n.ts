import { Router } from "express";
import { env } from "cloudflare:workers";
import { notFound } from "../lib/errors.js";

export const i18nRouter = Router();

// Story/people/site text lives in R2 (himalaya-media, same bucket as the
// media files) at i18n/{lang}/{file} -- see abc-face-tools CLAUDE.md's
// publish.py. Proxying it through the Worker (same origin as the app) means
// the frontend no longer depends on the media R2 custom domain's CORS
// allowlist covering whatever origin it's being tested from.
const LANGS = new Set(["en", "ms", "ne"]);
const FILE_RE = /^(?:day-\d+|moments|people|site|scenery)\.json$/;

i18nRouter.get("/i18n/:lang/:file", async (req, res) => {
  const { lang, file } = req.params;
  if (!LANGS.has(lang) || !FILE_RE.test(file)) {
    notFound(res, "not found");
    return;
  }

  const object = await env.MEDIA.get(`i18n/${lang}/${file}`);
  if (!object) {
    notFound(res, "not found");
    return;
  }

  res.set("Content-Type", "application/json");
  res.set("Cache-Control", "public, max-age=300");
  res.send(await object.text());
});
