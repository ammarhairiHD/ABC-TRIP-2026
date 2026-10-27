-- Alya's captions for the Scenery exhibition, written through the website's
-- own editor (POST /api/unlock scope "scenery-editor" + PUT
-- /api/scenery/:id/caption) -- D1 is the single source of truth for these,
-- unlike every other piece of text on the site. publish.py's import.sql
-- must never INSERT, UPDATE or DELETE this table.
CREATE TABLE scenery_captions (
  media_id TEXT PRIMARY KEY REFERENCES media(id),
  text TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
