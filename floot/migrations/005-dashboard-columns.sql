ALTER TABLE service_dashboard_preferences
 ADD COLUMN IF NOT EXISTS columns integer NOT NULL DEFAULT 3
 CHECK (columns BETWEEN 1 AND 4);
