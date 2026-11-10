CREATE TABLE IF NOT EXISTS service_gateway_trust (
 issuer text PRIMARY KEY, public_key text NOT NULL, enabled boolean NOT NULL DEFAULT false
);
CREATE TABLE IF NOT EXISTS service_gateway_identities (
 gateway_user_id text PRIMARY KEY, service_user_id text UNIQUE NOT NULL, email text NOT NULL
);
CREATE TABLE IF NOT EXISTS service_gateway_request_nonces (
 id text PRIMARY KEY, expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS service_gateway_nonce_expiry ON service_gateway_request_nonces(expires_at);
-- Explicit trust/key and owner mappings are configured privately after deployment validation.
