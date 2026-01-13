create table if not exists jobs (
  id uuid primary key,
  status text not null,
  attempts integer not null default 0,
  storage_key text not null,
  original_filename text,
  content_type text,
  webhook_url text,
  webhook_status text,
  result_text text,
  result_language text,
  result_segments jsonb,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists jobs_status_idx on jobs (status);
