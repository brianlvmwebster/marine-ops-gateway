CREATE TABLE IF NOT EXISTS gateway_access (
 email TEXT PRIMARY KEY CHECK (email = lower(email)),
 role TEXT NOT NULL CHECK (role IN ('user','admin')),
 enabled BOOLEAN NOT NULL DEFAULT TRUE,
 setup_token_hash TEXT UNIQUE,
 setup_expires_at TIMESTAMPTZ,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
