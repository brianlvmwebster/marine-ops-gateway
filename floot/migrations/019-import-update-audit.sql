BEGIN;

CREATE TABLE IF NOT EXISTS import_update_runs (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 company_id uuid NOT NULL REFERENCES platform_companies(id),
 actor_user_id integer REFERENCES users(id),
 dataset text NOT NULL CHECK(dataset IN ('customers','parts','ros','units')),
 source text NOT NULL,
 checked_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 status text NOT NULL CHECK(status IN ('pending','not_applied','applied','partial','unchanged','failed')),
 summary jsonb NOT NULL,
 preview_hash text,
 applied_at timestamptz,
 UNIQUE(company_id,id)
);
CREATE INDEX IF NOT EXISTS import_update_history ON import_update_runs(company_id,dataset,id DESC);

INSERT INTO import_update_runs(company_id,dataset,source,created_at,status,summary,applied_at)
SELECT id,'customers','Lightspeed Customer Bulk','2026-11-26T05:55:17Z','applied',
       '{"compared":8851,"added":0,"updated":2,"missing":0,"conflicts":0,"applied":2,"note":"Two address changes; both verified. Comparison time unavailable."}'::jsonb,
       '2026-11-26T05:55:17Z'
FROM platform_companies
WHERE slug='lakeview'
AND NOT EXISTS (SELECT 1 FROM import_update_runs
                WHERE source='Lightspeed Customer Bulk' AND applied_at='2026-11-26T05:55:17Z');

COMMIT;
