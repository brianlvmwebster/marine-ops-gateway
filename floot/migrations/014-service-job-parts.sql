BEGIN;
CREATE TABLE IF NOT EXISTS service_job_parts (
 company_id uuid NOT NULL REFERENCES platform_companies(id),job_id uuid NOT NULL REFERENCES service_jobs(id),
 part_id uuid NOT NULL,quantity numeric NOT NULL CHECK(quantity>=0),snapshot jsonb NOT NULL,
 version integer NOT NULL DEFAULT 1,updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(company_id,job_id,part_id),
 FOREIGN KEY(company_id,part_id) REFERENCES inventory_parts(company_id,id)
);
ALTER TABLE part_stock_movements DROP CONSTRAINT IF EXISTS part_stock_movements_kind_check;
ALTER TABLE part_stock_movements ADD CONSTRAINT part_stock_movements_kind_check CHECK(kind IN ('receive','adjust','job_use','job_return'));
ALTER TABLE part_stock_movements ADD COLUMN IF NOT EXISTS job_id uuid REFERENCES service_jobs(id);
ALTER TABLE part_stock_movements DROP CONSTRAINT IF EXISTS job_movement_direction;
ALTER TABLE part_stock_movements ADD CONSTRAINT job_movement_direction CHECK(
 (kind<>'job_use' OR quantity<0) AND (kind<>'job_return' OR quantity>0)
 AND ((kind IN ('job_use','job_return'))=(job_id IS NOT NULL))
);
COMMIT;
