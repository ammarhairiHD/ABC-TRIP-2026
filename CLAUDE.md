# himalaya-gallery

The website. Shared project rules: `../CLAUDE.md`. Can be a public repo (portfolio); never commit media, secrets or personal data.

## Stack

- **web/**: React 19 + Vite + TypeScript, Tailwind + shadcn/ui, Motion (scroll story, altitude line), React Router (`/`, `/ms/`, `/ne/` prefixes), TanStack Query, react-i18next + i18next-http-backend: UI strings bundled from `src/locales/{en,ms,ne}.json`, story content loaded per day from `https://abctrip2026-media.ammarhairi.tech/i18n/{lang}/day-{n}.json` (fallback to English), yet-another-react-lightbox + Video plugin, BlurHash. Noto Sans Devanagari for Nepali.
- **api/**: Express + TypeScript on Cloudflare Workers (`httpServerHandler` from `cloudflare:node`, `nodejs_compat`), Zod. Read-only except unlock. Language-free: returns ids and structure; the app looks words up in i18n.
- **Cloudflare**: one Worker (`abctrip2026.ammarhairi.tech`, not deployed yet) serves the React build + `/api/*`; D1 database `himalaya` (id `ccdacd9a-0a6f-4a39-b20f-c2228044a1a3`, APAC; migrations `0001_init.sql`–`0003_scenery_captions.sql` applied); R2 `himalaya-media` (public at `abctrip2026-media.ammarhairi.tech`) and `himalaya-originals` (private, no domain). Secrets: `EDITOR_CODE_HASH` (scenery captions), `DOWNLOAD_CODE_HASH` (not yet generated), `TOKEN_SECRET`. `wrangler.jsonc` binds `DB`, `MEDIA`, `ORIGINALS`, `UNLOCK_LIMITER` (rate limit on `/api/unlock`).
- Schema: `api/migrations/0001_init.sql` is the contract with `abc-face-tools`. `scenery_captions` (added in `0003`) is the one table `publish.py`'s `import.sql` never touches -- D1 is the sole source of truth for Alya's captions, written only through the site's own editor.

## API

`GET /api/journey` · `/api/days/:n` · `/api/days/:n/media` · `/api/moments/:id` · `/api/people` · `/api/people/:slug` · `/api/media?person=` / `?together=a,b` · `/api/scenery` (includes each item's caption) · `/api/media/:id` · `/api/credits` · `POST /api/unlock {code, scope}` → HMAC-signed token, scoped and TTL'd per `scope` (`scenery-editor`: 6 h; `download` will reuse the same endpoint later) · `PUT /api/scenery/:id/caption` (requires a `scenery-editor` token) · `GET /api/download/:id?t=` streams the original from the private bucket.

## Screens

Opening (muted video loop, three numbers, *Begin the climb*) → the climb (altitude line, day chapters, moment cards) → the way home → people → Scenery by Alya → credits. Also: person journey, day page, full view with story, unlock dialog, gallery mode. **Mobile first** (design at 390px, then widen); bottom sheets for the story, unlock and menu; 44px touch targets; respect reduce-motion. Designs: https://claude.ai/artifact/Xem7fNCFaGxtU725QWf3cX

## Language switcher: English-only launch

Launching with **English only** (see root `CLAUDE.md`). The `/ms/` and `/ne/` routes, `src/locales/{ms,ne}.json` and the `i18n/{ms,ne}/` story content path all stay wired up in the stack, but ship with nothing or stale content behind them. The language switcher (`nav.language`) must therefore:

- Show all three languages (English, Bahasa Melayu, Nepali).
- English: normal, selectable.
- Bahasa Melayu and Nepali: **greyed out and not clickable** (disabled, not hidden — so people can see they're coming).
- On or near the disabled options, show the note: **"I'm still working on Bahasa Melayu and Nepali so they read right. Coming soon, insyaAllah."**

Turn `ms`/`ne` on for real only once `abc-face-tools` has reviewed translations flowing through `publish.py` for them — this is a flag to flip in the switcher component, not a reason to rip out the i18n plumbing.

## Status

Not started; waits for Phase 1 in `abc-face-tools` to prove face recognition works. Start with the Express Worker + D1 migration + seed data from `abc-face-tools/data/days.json`.
