BEGIN;
CREATE TABLE IF NOT EXISTS dock_quotes (
 id uuid PRIMARY KEY, company_id uuid NOT NULL REFERENCES platform_companies(id),
 customer_id uuid, name text NOT NULL CHECK(length(name) BETWEEN 1 AND 200),
 contact jsonb NOT NULL, document jsonb NOT NULL,
 version integer NOT NULL DEFAULT 1, created_by integer NOT NULL REFERENCES users(id),
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(company_id,customer_id) REFERENCES customers(company_id,id)
);
CREATE INDEX IF NOT EXISTS dock_quotes_customer ON dock_quotes(company_id,customer_id,updated_at DESC);
INSERT INTO platform_tools(key,name,path,available,rollout_company_id) VALUES
 ('dock-builder','Dock Builder','/dock-builder',true,'00000000-0000-4000-8000-000000000001') ON CONFLICT DO NOTHING;
INSERT INTO platform_entitlements(company_id,tool_key,status) VALUES
 ('00000000-0000-4000-8000-000000000001','dock-builder','enabled') ON CONFLICT DO NOTHING;
COMMIT;
