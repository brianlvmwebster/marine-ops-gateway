BEGIN;
CREATE TABLE IF NOT EXISTS repair_order_intakes (
 order_id uuid PRIMARY KEY REFERENCES service_jobs(id),
 submission_hash text NOT NULL
);
CREATE TABLE IF NOT EXISTS repair_order_lines (
 id uuid PRIMARY KEY,
 order_id uuid NOT NULL REFERENCES service_jobs(id),
 position integer NOT NULL CHECK (position > 0),
 title text NOT NULL,
 notes text NOT NULL DEFAULT '',
 status text NOT NULL CHECK (status IN ('Pending','In progress','Done','Cancelled')),
 UNIQUE (order_id,position)
);
COMMIT;
