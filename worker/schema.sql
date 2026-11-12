CREATE TABLE IF NOT EXISTS gifts (
  id         TEXT PRIMARY KEY,
  author     TEXT NOT NULL CHECK (length(author) BETWEEN 1 AND 20),
  message    TEXT NOT NULL CHECK (length(message) BETWEEN 1 AND 200),
  shape      TEXT NOT NULL DEFAULT 'box' CHECK (shape IN ('box', 'ornament')),
  color      TEXT NOT NULL CHECK (color GLOB '#[0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f]'),
  size       REAL NOT NULL CHECK (size BETWEEN 0.16 AND 0.32),
  created_at TEXT NOT NULL,
  ip_hash    TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_gifts_created_at ON gifts (created_at);
CREATE INDEX IF NOT EXISTS idx_gifts_ip_hash ON gifts (ip_hash, created_at);
