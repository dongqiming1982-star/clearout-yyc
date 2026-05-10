create table if not exists public.lead_photos (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  public_id text not null unique default ('photo_' || replace(gen_random_uuid()::text, '-', '')),
  storage_bucket text not null default 'lead-photos',
  storage_path text not null unique,
  file_name text,
  mime_type text not null,
  file_size integer not null check (file_size > 0 and file_size <= 1048576),
  width integer,
  height integer,
  sort_order integer not null default 0,
  expires_at timestamptz not null default (now() + interval '30 days'),
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists lead_photos_lead_id_idx
on public.lead_photos(lead_id);

create index if not exists lead_photos_expires_at_idx
on public.lead_photos(expires_at)
where deleted_at is null;

create index if not exists lead_photos_storage_path_idx
on public.lead_photos(storage_path);
