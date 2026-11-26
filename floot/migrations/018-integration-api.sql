BEGIN;

CREATE TABLE IF NOT EXISTS integration_api_keys (
 id uuid PRIMARY KEY,
 company_id uuid NOT NULL REFERENCES platform_companies(id),
 name text NOT NULL CHECK(length(trim(name)) BETWEEN 1 AND 120),
 token_hash text NOT NULL UNIQUE CHECK(token_hash ~ '^[0-9a-f]{64}$'),
 customers_read boolean NOT NULL DEFAULT false,
 parts_read boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL,
 revoked_at timestamptz,
 CHECK(customers_read OR parts_read),
 CHECK(expires_at > created_at)
);

COMMIT;
