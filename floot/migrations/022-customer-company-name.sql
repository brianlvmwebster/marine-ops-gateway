BEGIN;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS company_name text NOT NULL DEFAULT '';
ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_check;
ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_name_required;
ALTER TABLE customers ADD CONSTRAINT customers_name_required
  CHECK (length(trim(first_name) || trim(last_name) || trim(company_name)) > 0);
COMMIT;
