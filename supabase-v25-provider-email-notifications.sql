-- Clearout YYC V25 migration
-- Provider email notifications for approved + active providers.
-- Run once in Supabase SQL Editor before deploying the V25 API code.

create extension if not exists pgcrypto;

create table if not exists provider_notifications (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  provider_id uuid not null references providers(id) on delete cascade,
  channel text not null default 'email',
  status text not null default 'pending',
  claim_url text not null,
  error_message text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table provider_notifications add column if not exists lead_id uuid;
alter table provider_notifications add column if not exists provider_id uuid;
alter table provider_notifications add column if not exists channel text not null default 'email';
alter table provider_notifications add column if not exists status text not null default 'pending';
alter table provider_notifications add column if not exists claim_url text;
alter table provider_notifications add column if not exists error_message text;
alter table provider_notifications add column if not exists sent_at timestamptz;
alter table provider_notifications add column if not exists created_at timestamptz not null default now();
alter table provider_notifications add column if not exists updated_at timestamptz not null default now();

do $$
begin
  alter table provider_notifications
  add constraint provider_notifications_lead_fk
  foreign key (lead_id) references leads(id) on delete cascade;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table provider_notifications
  add constraint provider_notifications_provider_fk
  foreign key (provider_id) references providers(id) on delete cascade;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table provider_notifications
  add constraint provider_notifications_unique_lead_provider_channel
  unique (lead_id, provider_id, channel);
exception
  when duplicate_object or duplicate_table then null;
end $$;

create index if not exists provider_notifications_status_channel_created_idx
on provider_notifications (status, channel, created_at);

create index if not exists provider_notifications_lead_id_idx
on provider_notifications (lead_id);

create index if not exists provider_notifications_provider_id_idx
on provider_notifications (provider_id);

create or replace function create_provider_notifications_for_lead(
  p_lead_public_id text,
  p_base_url text default 'https://clearout.aurorasitesolutions.com'
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lead_id uuid;
  v_lead_public_id text;
  v_base_url text;
  v_count integer := 0;
begin
  select id, public_id
  into v_lead_id, v_lead_public_id
  from leads
  where public_id = p_lead_public_id
    and status in ('published', 'shared_active')
  limit 1;

  if v_lead_id is null then
    return 0;
  end if;

  v_base_url := regexp_replace(
    coalesce(nullif(trim(p_base_url), ''), 'https://clearout.aurorasitesolutions.com'),
    '/+$',
    ''
  );

  insert into provider_notifications (
    lead_id,
    provider_id,
    channel,
    status,
    claim_url,
    error_message,
    sent_at
  )
  select
    v_lead_id,
    p.id,
    'email',
    'pending',
    v_base_url || '/provider/lead?lead=' || v_lead_public_id || '&token=' || p.provider_token,
    null,
    null
  from providers p
  where p.approved = true
    and p.active = true
    and coalesce(p.notify_by_email, true) = true
    and nullif(trim(coalesce(p.email, '')), '') is not null
    and nullif(trim(coalesce(p.provider_token, '')), '') is not null
  on conflict (lead_id, provider_id, channel) do nothing;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
