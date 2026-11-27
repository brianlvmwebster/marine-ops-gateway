BEGIN;
LOCK TABLE customer_units IN SHARE ROW EXCLUSIVE MODE;

CREATE TABLE IF NOT EXISTS unit_customer_assignments (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 company_id uuid NOT NULL,
 unit_id uuid NOT NULL,
 customer_id uuid NOT NULL,
 started_at timestamptz,
 ended_at timestamptz,
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 FOREIGN KEY (company_id,unit_id) REFERENCES customer_units(company_id,id),
 FOREIGN KEY (company_id,customer_id) REFERENCES customers(company_id,id),
 CHECK (started_at IS NULL OR ended_at IS NULL OR started_at <= ended_at)
);
CREATE UNIQUE INDEX IF NOT EXISTS unit_customer_assignments_open
  ON unit_customer_assignments(company_id,unit_id) WHERE ended_at IS NULL;
CREATE INDEX IF NOT EXISTS unit_customer_assignments_customer
  ON unit_customer_assignments(company_id,customer_id,unit_id);

-- A current assignment by itself does not establish when it began.
INSERT INTO unit_customer_assignments(company_id,unit_id,customer_id)
SELECT company_id,id,customer_id FROM customer_units WHERE customer_id IS NOT NULL
ON CONFLICT (company_id,unit_id) WHERE ended_at IS NULL DO NOTHING;

CREATE OR REPLACE FUNCTION record_unit_customer_assignment() RETURNS trigger
LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
DECLARE effective_at timestamptz := clock_timestamp();
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.customer_id IS NOT DISTINCT FROM NEW.customer_id THEN RETURN NEW; END IF;
    UPDATE unit_customer_assignments SET ended_at=effective_at
    WHERE company_id=OLD.company_id AND unit_id=OLD.id AND ended_at IS NULL;
  END IF;
  IF NEW.customer_id IS NOT NULL THEN
    INSERT INTO unit_customer_assignments(company_id,unit_id,customer_id,started_at,recorded_at)
    VALUES(NEW.company_id,NEW.id,NEW.customer_id,effective_at,effective_at);
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS unit_customer_assignment_history ON customer_units;
CREATE TRIGGER unit_customer_assignment_history
AFTER INSERT OR UPDATE OF customer_id ON customer_units
FOR EACH ROW EXECUTE FUNCTION record_unit_customer_assignment();

-- A service order is evidence of the pairing on a date, not an ownership interval.
CREATE OR REPLACE VIEW unit_customer_order_observations AS
SELECT u.company_id,u.unit_id,c.customer_id,j.id AS order_id,
  coalesce(CASE WHEN j.data->>'serviceDate' ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
    AND pg_input_is_valid(j.data->>'serviceDate','date') THEN (j.data->>'serviceDate')::date END,
    (j.created_at AT TIME ZONE 'America/New_York')::date) AS observed_on,
  j.data->>'make' AS make,j.data->>'hullId' AS vin
FROM customer_unit_service_jobs u
JOIN customer_service_jobs c ON c.job_id=u.job_id AND c.company_id=u.company_id
JOIN service_jobs j ON j.id=u.job_id;
COMMIT;
