-- Himalaya Trip Gallery · D1 schema (Plan v2, section 10)
-- Structure only. All words (places, titles, stories, captions) live in i18n files:
--   UI strings: web/src/locales/{en,ms,ne}.json
--   Story content: R2 himalaya-media/i18n/{lang}/day-{n}.json, moments.json, people.json, site.json

-- The altitude line: one row per day
CREATE TABLE days (
  id INTEGER PRIMARY KEY,            -- day number 1–11
  date TEXT NOT NULL,                -- '2026-10-13'
  altitude_m INTEGER,                -- highest/overnight point
  half TEXT NOT NULL,                -- 'climb' | 'home'
  cover_media_id TEXT
);                                   -- place, title, story → i18n: day.{id}.*

-- Photos and videos
CREATE TABLE media (
  id TEXT PRIMARY KEY,               -- short content hash
  type TEXT NOT NULL DEFAULT 'photo',      -- 'photo' | 'video'
  day_id INTEGER REFERENCES days(id),
  seq INTEGER,                             -- order within the day, set by hand
  category TEXT NOT NULL DEFAULT 'people', -- 'people' | 'scenery'
  photographer TEXT,                       -- 'alya'
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  duration_s REAL,                         -- videos
  blurhash TEXT,
  has_story INTEGER NOT NULL DEFAULT 0,    -- 1 = full story, 0 = caption or none
  source_url TEXT,                         -- Alya's Instagram post
  hidden INTEGER NOT NULL DEFAULT 0
);                                   -- R2 keys derive from id + type; caption/story → i18n: media.{id}.*

-- Moment cards on the altitude line
CREATE TABLE moments (
  id TEXT PRIMARY KEY,               -- 'abc-by-seven'
  day_id INTEGER NOT NULL REFERENCES days(id),
  kind TEXT NOT NULL,                -- 'challenge' | 'highlight' | 'funny' | 'farewell'
  hero_media_id TEXT REFERENCES media(id),
  sort_order INTEGER
);                                   -- title, story → i18n: moment.{id}.*

CREATE TABLE moment_media (
  moment_id TEXT NOT NULL REFERENCES moments(id),
  media_id TEXT NOT NULL REFERENCES media(id),
  PRIMARY KEY (moment_id, media_id)
);

CREATE TABLE people (
  id TEXT PRIMARY KEY,               -- 'abang-kama'
  nickname TEXT NOT NULL,            -- never translated
  media_count INTEGER NOT NULL DEFAULT 0,
  first_media_id TEXT,
  last_media_id TEXT,
  days_present TEXT,                 -- JSON [1,2,3,5]
  most_with TEXT,                    -- JSON [{"id":"aunty-esah","count":48}]
  sort_order INTEGER,
  hidden INTEGER NOT NULL DEFAULT 0  -- strangers, opt-outs, Simran
);

CREATE TABLE media_faces (
  id TEXT PRIMARY KEY,
  media_id TEXT NOT NULL REFERENCES media(id),
  person_id TEXT REFERENCES people(id),
  x REAL, y REAL, w REAL, h REAL,    -- 0–1 fractions
  t_s REAL,                          -- second in a video
  confidence REAL,
  source TEXT NOT NULL DEFAULT 'auto'
);

CREATE INDEX idx_mf_person ON media_faces(person_id);
CREATE INDEX idx_mf_media ON media_faces(media_id);
CREATE INDEX idx_media_day ON media(day_id, seq);
CREATE INDEX idx_media_cat ON media(category, day_id, seq);
CREATE INDEX idx_moments_day ON moments(day_id, sort_order);
