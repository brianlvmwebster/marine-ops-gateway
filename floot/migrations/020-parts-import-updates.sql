BEGIN;

ALTER TABLE inventory_parts ADD COLUMN IF NOT EXISTS lightspeed_data jsonb;
ALTER TABLE inventory_parts ADD COLUMN IF NOT EXISTS lightspeed_quantity_updated_at timestamptz;

COMMIT;
