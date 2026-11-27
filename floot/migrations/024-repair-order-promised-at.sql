BEGIN;
ALTER TABLE service_jobs ADD COLUMN IF NOT EXISTS repair_order_promised_at timestamptz;
COMMIT;
