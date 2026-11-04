CREATE TABLE IF NOT EXISTS gateway (
  id TEXT PRIMARY KEY,
  contents JSONB NOT NULL CHECK (jsonb_typeof(contents) = 'array'),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1)
);
