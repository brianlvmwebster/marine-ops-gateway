-- Applied to the Floot database on 2026-11-09. No customer data is included.
CREATE TABLE IF NOT EXISTS service_assignment_options (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 kind text NOT NULL CHECK (kind IN ('person','group')),
 name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 100),
 member_ids uuid[] NOT NULL DEFAULT '{}',
 version integer NOT NULL DEFAULT 1,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK (kind = 'group' OR cardinality(member_ids) = 0)
);
CREATE UNIQUE INDEX IF NOT EXISTS service_assignment_options_kind_name
 ON service_assignment_options(kind, lower(btrim(name)));
