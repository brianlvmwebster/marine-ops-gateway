CREATE TYPE map_source_kind AS ENUM ('plan','aerial');
CREATE TABLE storage_maps (
 id uuid PRIMARY KEY,
 owner_id text NOT NULL,
 name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
 image_key text NOT NULL,
 upload_key text NOT NULL,
 image_width integer NOT NULL CHECK (image_width BETWEEN 1 AND 20000),
 image_height integer NOT NULL CHECK (image_height BETWEEN 1 AND 20000),
 source_kind map_source_kind NOT NULL,
 ready boolean NOT NULL DEFAULT false,
 spaces jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(spaces) = 'array'),
 revision integer NOT NULL DEFAULT 0,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX storage_maps_owner_idx ON storage_maps(owner_id, created_at DESC);
ALTER TABLE storage_maps ADD COLUMN last_analysis_at timestamptz;

CREATE TABLE IF NOT EXISTS layout_organization (
 owner_id text PRIMARY KEY,
 revision integer NOT NULL DEFAULT 0,
 sections jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(sections) = 'array')
);
ALTER TABLE storage_maps ADD COLUMN IF NOT EXISTS section_id uuid;
ALTER TABLE storage_maps ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;
ALTER TABLE storage_maps ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS storage_maps_owner_layout_idx ON storage_maps(owner_id, archived, sort_order);
