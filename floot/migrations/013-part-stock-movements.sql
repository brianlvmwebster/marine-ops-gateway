BEGIN;
ALTER TABLE inventory_parts ADD COLUMN IF NOT EXISTS opening_data jsonb;
UPDATE inventory_parts SET opening_data=data WHERE opening_data IS NULL;
ALTER TABLE inventory_parts ALTER COLUMN opening_data SET NOT NULL;
ALTER TABLE inventory_parts ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;
CREATE UNIQUE INDEX IF NOT EXISTS inventory_parts_company_id ON inventory_parts(company_id,id);
CREATE TABLE IF NOT EXISTS part_stock_movements (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 company_id uuid NOT NULL, part_id uuid NOT NULL,
 request_id uuid NOT NULL, request jsonb NOT NULL,
 kind text NOT NULL CHECK(kind IN ('receive','adjust')),
 quantity numeric NOT NULL CHECK(quantity<>0),
 before_on_hand numeric NOT NULL,after_on_hand numeric NOT NULL,
 before_available numeric NOT NULL,after_available numeric NOT NULL,
 reason text NOT NULL CHECK(length(trim(reason)) BETWEEN 1 AND 1000),
 reference text NOT NULL DEFAULT '',
 actor_user_id integer NOT NULL REFERENCES users(id),actor_name text NOT NULL,
 part_version integer NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(company_id,part_id) REFERENCES inventory_parts(company_id,id),
 UNIQUE(company_id,request_id),UNIQUE(company_id,part_id,part_version),
 CHECK(kind<>'receive' OR quantity>0),
 CHECK(after_on_hand=before_on_hand+quantity),
 CHECK(after_available=before_available+quantity)
);
CREATE INDEX IF NOT EXISTS part_stock_history ON part_stock_movements(company_id,part_id,id DESC);
CREATE OR REPLACE FUNCTION prevent_stock_history_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Stock history cannot be edited or deleted. Record a correcting adjustment.'; END; $$;
DROP TRIGGER IF EXISTS immutable_stock_history ON part_stock_movements;
CREATE TRIGGER immutable_stock_history BEFORE UPDATE OR DELETE ON part_stock_movements FOR EACH ROW EXECUTE FUNCTION prevent_stock_history_mutation();
COMMIT;
