BEGIN;
CREATE TABLE IF NOT EXISTS customers (
 id uuid PRIMARY KEY, company_id uuid NOT NULL REFERENCES platform_companies(id),
 source_system text, source_number text, source_active text, source_record jsonb,
 first_name text NOT NULL DEFAULT '', last_name text NOT NULL DEFAULT '',
 email text NOT NULL DEFAULT '', home_phone text NOT NULL DEFAULT '', work_phone text NOT NULL DEFAULT '', mobile_phone text NOT NULL DEFAULT '',
 addresses jsonb NOT NULL DEFAULT '[]', notes text NOT NULL DEFAULT '',
 status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','archived')),
 version integer NOT NULL DEFAULT 1, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(length(trim(first_name||last_name))>0),
 UNIQUE(company_id,source_system,source_number), UNIQUE(company_id,id)
);
CREATE INDEX IF NOT EXISTS customers_company_name ON customers(company_id,last_name,first_name,id);
-- Service jobs are currently Lakeview-only. Composite keys protect the customer side.
CREATE TABLE IF NOT EXISTS customer_service_jobs (
 company_id uuid NOT NULL, customer_id uuid NOT NULL, job_id uuid PRIMARY KEY REFERENCES service_jobs(id),
 FOREIGN KEY(company_id,customer_id) REFERENCES customers(company_id,id),
 CHECK(company_id='00000000-0000-4000-8000-000000000001')
);
INSERT INTO platform_tools(key,name,path,available,rollout_company_id) VALUES
 ('customers','Customers','/customers',true,'00000000-0000-4000-8000-000000000001') ON CONFLICT DO NOTHING;
INSERT INTO platform_entitlements(company_id,tool_key,status) VALUES
 ('00000000-0000-4000-8000-000000000001','customers','enabled') ON CONFLICT DO NOTHING;
COMMIT;
