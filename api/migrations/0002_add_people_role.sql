-- People page needs to group porters into their own section. The roster already
-- tags each person 'trekker' | 'porter' | 'agency' (people.roster.json's "group"),
-- this just surfaces it. publish.py writes it; words (section heading etc.) still
-- live in i18n, never here.
ALTER TABLE people ADD COLUMN role TEXT NOT NULL DEFAULT 'trekker';
