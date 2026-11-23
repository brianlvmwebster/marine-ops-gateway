BEGIN;
CREATE UNIQUE INDEX IF NOT EXISTS customer_units_company_id ON customer_units(company_id,id);
CREATE TABLE IF NOT EXISTS customer_unit_service_jobs (
 job_id uuid PRIMARY KEY REFERENCES service_jobs(id), company_id uuid NOT NULL,
 unit_id uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(company_id,unit_id) REFERENCES customer_units(company_id,id),
 CHECK(company_id='00000000-0000-4000-8000-000000000001')
);
CREATE INDEX IF NOT EXISTS customer_unit_service_jobs_unit ON customer_unit_service_jobs(company_id,unit_id);
COMMIT;
