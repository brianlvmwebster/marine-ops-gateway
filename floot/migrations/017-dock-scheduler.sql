BEGIN;
CREATE SCHEMA IF NOT EXISTS dock_scheduler_lakeview;
SET LOCAL search_path=dock_scheduler_lakeview,public;
CREATE TABLE IF NOT EXISTS scheduler_imports(id uuid PRIMARY KEY,source_hash text NOT NULL,snapshot_hash text NOT NULL,headers jsonb NOT NULL,expected_count integer NOT NULL,completed_at timestamptz,created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS scheduler_schedules(id uuid PRIMARY KEY,name text NOT NULL CHECK(length(name) BETWEEN 1 AND 120),archived boolean NOT NULL DEFAULT false,created_at timestamptz NOT NULL DEFAULT now(),deleted_at timestamptz,outlook_calendar_name text,booking_window jsonb NOT NULL DEFAULT '{"days":[0,1,2,3,4,5,6],"start":"07:00","end":"17:00"}');
CREATE TABLE IF NOT EXISTS scheduler_jobs(id uuid PRIMARY KEY,sequence_id bigserial UNIQUE NOT NULL,import_id uuid REFERENCES scheduler_imports(id),source_key text UNIQUE NOT NULL,source_row integer,original_values jsonb,data jsonb NOT NULL CHECK(jsonb_typeof(data)='object'),calendar jsonb,last_edit jsonb,version integer NOT NULL DEFAULT 1,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),source_headers jsonb,deleted_at timestamptz,deletion_request_id uuid,deletion_requested_at timestamptz,schedule_id uuid NOT NULL DEFAULT '00000000-0000-4000-8000-000000000001' REFERENCES scheduler_schedules(id));
CREATE INDEX IF NOT EXISTS scheduler_jobs_schedule ON scheduler_jobs(schedule_id);
CREATE INDEX IF NOT EXISTS scheduler_jobs_submission ON scheduler_jobs((data->>'Submission ID'));
CREATE TABLE IF NOT EXISTS scheduler_record_state(singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),active_import uuid REFERENCES scheduler_imports(id),activated_at timestamptz);
-- No credentials, launch tickets, or external integration state are migrated.
INSERT INTO public.platform_tools(key,name,path,available,rollout_company_id) VALUES('dock-scheduler','Dock Crew Scheduler','/dockscheduler',true,'00000000-0000-4000-8000-000000000001') ON CONFLICT DO NOTHING;
INSERT INTO public.platform_entitlements(company_id,tool_key,status) VALUES('00000000-0000-4000-8000-000000000001','dock-scheduler','enabled') ON CONFLICT DO NOTHING;
COMMIT;
