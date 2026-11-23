BEGIN;
CREATE TABLE IF NOT EXISTS inventory_parts (
 id uuid PRIMARY KEY, company_id uuid NOT NULL REFERENCES platform_companies(id),
 supplier_code text NOT NULL, part_number text NOT NULL, description text NOT NULL,
 active boolean NOT NULL, data jsonb NOT NULL, source_record jsonb NOT NULL,
 source_sha text NOT NULL, source_batch text NOT NULL, source_row integer NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(company_id,supplier_code,part_number)
);
CREATE INDEX IF NOT EXISTS inventory_parts_directory ON inventory_parts(company_id,part_number,id);
INSERT INTO platform_tools(key,name,path,available,rollout_company_id) VALUES
 ('parts-inventory','Parts Inventory','/inventory/parts',true,'00000000-0000-4000-8000-000000000001') ON CONFLICT DO NOTHING;
INSERT INTO platform_entitlements(company_id,tool_key,status) VALUES
 ('00000000-0000-4000-8000-000000000001','parts-inventory','enabled') ON CONFLICT DO NOTHING;
COMMIT;
