# himalaya-gallery

The website. Shared project rules: `../CLAUDE.md`. Can be a public repo (portfolio); never commit media, secrets or personal data.

## Stack

- **web/**: React 19 + Vite + TypeScript, Tailwind + shadcn/ui, Motion (scroll story, altitude line), React Router (`/`, `/ms/`, `/ne/` prefixes), TanStack Query, react-i18next + i18next-http-backend: UI strings bundled from `src/locales/{en,ms,ne}.json`, story content loaded per day from `img.<domain>/i18n/{lang}/day-{n}.json` (fallback to English), yet-another-react-lightbox + Video plugin, BlurHash. Noto Sans Devanagari for Nepali.
- **api/**: Express + TypeScript on Cloudflare Workers (`httpServerHandler` from `cloudflare:node`, `nodejs_compat`), Zod. Read-only except unlock. Language-free: returns ids and structure; the app looks words up in i18n.
- **Cloudflare**: one Worker serves the React build + `/api/*`; D1 database `himalaya`; R2 `himalaya-media` (public at `img.<domain>`) and `himalaya-originals` (private). Secrets: `DOWNLOAD_CODE_HASH`, `TOKEN_SECRET`.
- Schema: `api/migrations/0001_init.sql` is the contract with `abc-face-tools`.

## API

`GET /api/journey` · `/api/days/:n/media` · `/api/moments/:id` · `/api/people` · `/api/people/:slug` · `/api/media?person=` / `?together=a,b` · `/api/scenery` · `/api/media/:id` · `/api/credits` · `POST /api/unlock` → HMAC token (12 h) · `GET /api/download/:id?t=` streams the original from the private bucket.

## Screens

Opening (muted video loop, three numbers, *Begin the climb*) → the climb (altitude line, day chapters, moment cards) → the way home → people → Scenery by Alya → credits. Also: person journey, day page, full view with story, unlock dialog, gallery mode. **Mobile first** (design at 390px, then widen); bottom sheets for the story, unlock and menu; 44px touch targets; respect reduce-motion. Designs: https://claude.ai/artifact/Xem7fNCFaGxtU725QWf3cX

## Status

Not started; waits for Phase 1 in `abc-face-tools` to prove face recognition works. Start with the Express Worker + D1 migration + seed data from `abc-face-tools/data/days.json`.
