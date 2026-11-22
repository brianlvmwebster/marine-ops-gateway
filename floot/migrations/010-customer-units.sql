BEGIN;
CREATE TABLE IF NOT EXISTS customer_unit_imports (
 company_id uuid PRIMARY KEY REFERENCES platform_companies(id),
 batch_hash text NOT NULL CHECK(batch_hash ~ '^[a-f0-9]{64}$'),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(company_id,batch_hash)
);
CREATE TABLE IF NOT EXISTS customer_units (
 id uuid PRIMARY KEY, company_id uuid NOT NULL REFERENCES platform_companies(id),
 customer_id uuid, make text NOT NULL DEFAULT '', model text NOT NULL DEFAULT '',
 vin text NOT NULL DEFAULT '', length text NOT NULL DEFAULT '',
 name text NOT NULL DEFAULT '', year text NOT NULL DEFAULT '', unit_type text NOT NULL DEFAULT '',
 notes text NOT NULL DEFAULT '', status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','archived')),
 reviewed boolean NOT NULL DEFAULT false, review_flags jsonb NOT NULL DEFAULT '[]',
 source_customer_number text, source_batch text, source_row integer, source_record jsonb,
 version integer NOT NULL DEFAULT 1, created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(company_id,customer_id) REFERENCES customers(company_id,id),
 FOREIGN KEY(company_id,source_batch) REFERENCES customer_unit_imports(company_id,batch_hash),
 UNIQUE(company_id,source_batch,source_row),
 CHECK((source_batch IS NULL AND source_row IS NULL) OR (source_batch IS NOT NULL AND source_row>0))
);
CREATE INDEX IF NOT EXISTS customer_units_owner ON customer_units(company_id,customer_id);
COMMIT;
