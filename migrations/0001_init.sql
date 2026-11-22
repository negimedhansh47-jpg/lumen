-- Cache of public-repo analyses only. Never store chats, ideas or private code.
CREATE TABLE analyses (
  cache_key  TEXT PRIMARY KEY,
  payload    TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

-- Hashed IP per hour window.
CREATE TABLE rate_limits (
  ip_hash TEXT NOT NULL,
  window  INTEGER NOT NULL,
  count   INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (ip_hash, window)
);
