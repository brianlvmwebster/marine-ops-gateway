BEGIN;
-- Isolated standalone storage. Never overwrites the imported legacy Floot tables.
CREATE TABLE IF NOT EXISTS mapping_workspaces (
 company_id uuid NOT NULL REFERENCES platform_companies(id), owner_id integer NOT NULL REFERENCES users(id),
 sections jsonb NOT NULL DEFAULT '[]', revision integer NOT NULL DEFAULT 0,
 PRIMARY KEY(company_id,owner_id), CHECK(jsonb_typeof(sections)='array')
);
CREATE TABLE IF NOT EXISTS mapping_maps (
 id uuid PRIMARY KEY, company_id uuid NOT NULL, owner_id integer NOT NULL,
 name text NOT NULL, image_width integer NOT NULL, image_height integer NOT NULL,
 content_type text NOT NULL CHECK(content_type IN ('image/png','image/jpeg','image/webp')),
 expected_bytes integer NOT NULL CHECK(expected_bytes BETWEEN 1 AND 10485760),
 -- Phase-one staging storage: authenticated, bounded private bytes in Postgres.
 -- Move these bytes to Cloud Storage before production cutover.
 image_data bytea, source_kind text NOT NULL CHECK(source_kind IN ('plan','aerial')),
 ready boolean NOT NULL DEFAULT false, spaces jsonb NOT NULL DEFAULT '[]', columns jsonb NOT NULL DEFAULT '[]',
 section_id uuid, sort_order integer NOT NULL DEFAULT 0, archived boolean NOT NULL DEFAULT false,
 revision integer NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(company_id,owner_id) REFERENCES mapping_workspaces(company_id,owner_id),
 CHECK(image_data IS NULL OR octet_length(image_data)<=10485760), CHECK(jsonb_typeof(spaces)='array'), CHECK(jsonb_typeof(columns)='array')
);
CREATE INDEX IF NOT EXISTS mapping_maps_owner ON mapping_maps(company_id,owner_id,sort_order,created_at);
INSERT INTO platform_tools(key,name,path,available,rollout_company_id) VALUES
 ('mapping','Mapping & Storage','/mapping',true,'00000000-0000-4000-8000-000000000001') ON CONFLICT DO NOTHING;
INSERT INTO platform_entitlements(company_id,tool_key,status) VALUES
 ('00000000-0000-4000-8000-000000000001','mapping','enabled') ON CONFLICT DO NOTHING;
COMMIT;
