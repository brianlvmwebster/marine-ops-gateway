-- Run against the standalone staging database first, never automatically at startup.
-- Requires the exported users/native_gateway_members tables (migration 004).
BEGIN;
CREATE TABLE IF NOT EXISTS platform_companies (
 id uuid PRIMARY KEY, slug text NOT NULL UNIQUE CHECK(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
 name text NOT NULL CHECK(length(name) BETWEEN 1 AND 120),
 status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','suspended')),
 version integer NOT NULL DEFAULT 1, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS platform_tools (
 key text PRIMARY KEY, name text NOT NULL, path text NOT NULL,
 available boolean NOT NULL DEFAULT false,
 rollout_company_id uuid REFERENCES platform_companies(id)
);
CREATE TABLE IF NOT EXISTS platform_memberships (
 company_id uuid NOT NULL REFERENCES platform_companies(id),
 user_id integer NOT NULL REFERENCES users(id),
 role text NOT NULL CHECK(role IN ('owner','admin','member')),
 status text NOT NULL CHECK(status IN ('active','suspended')),
 version integer NOT NULL DEFAULT 1, created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(company_id,user_id)
);
CREATE INDEX IF NOT EXISTS platform_memberships_user ON platform_memberships(user_id,company_id);
CREATE TABLE IF NOT EXISTS platform_entitlements (
 company_id uuid NOT NULL REFERENCES platform_companies(id), tool_key text NOT NULL REFERENCES platform_tools(key),
 status text NOT NULL CHECK(status IN ('enabled','disabled')),
 version integer NOT NULL DEFAULT 1, updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(company_id,tool_key)
);
-- Explicit operator bootstrap only. Company/gateway admins never become platform operators implicitly.
CREATE TABLE IF NOT EXISTS platform_operators (
 user_id integer PRIMARY KEY REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS platform_audit (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 actor_user_id integer REFERENCES users(id), company_id uuid REFERENCES platform_companies(id),
 action text NOT NULL, detail jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO platform_companies(id,slug,name) VALUES
 ('00000000-0000-4000-8000-000000000001','lakeview','Lakeview') ON CONFLICT DO NOTHING;
INSERT INTO platform_tools(key,name,path,available,rollout_company_id) VALUES
 ('service-desk','Service Desk','/dashboard/',true,'00000000-0000-4000-8000-000000000001') ON CONFLICT DO NOTHING;
INSERT INTO platform_entitlements(company_id,tool_key,status) VALUES
 ('00000000-0000-4000-8000-000000000001','service-desk','enabled') ON CONFLICT DO NOTHING;
-- Import existing linked identities only. No personal records or email fixtures in source.
-- Gateway admins become company owners; existing Service Admin privileges stay separate.
INSERT INTO platform_memberships(company_id,user_id,role,status)
 SELECT '00000000-0000-4000-8000-000000000001',m.auth_user_id,
 CASE WHEN m.role='admin' THEN 'owner' ELSE 'member' END,
 CASE WHEN m.enabled THEN 'active' ELSE 'suspended' END
 FROM native_gateway_members m JOIN users u ON u.id=m.auth_user_id
 WHERE m.auth_user_id IS NOT NULL
 ON CONFLICT DO NOTHING;
COMMIT;
