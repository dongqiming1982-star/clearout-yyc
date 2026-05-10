-- V29.2 taxonomy + smart dispatch foundation
-- Run in Supabase SQL Editor before deploying V29.2 code.

alter table public.providers
add column if not exists service_types text[];

alter table public.providers
add column if not exists vehicle_capabilities text[];

-- Normalize old all-city values and keep existing providers eligible.
update public.providers
set service_areas = array['all_calgary']::text[]
where service_areas is null
   or cardinality(service_areas) = 0
   or 'calgary' = any(service_areas);

update public.providers
set service_types = array[
  'mattress_bed',
  'furniture_household',
  'moveout_garage_cleanout',
  'appliances_electronics',
  'yard_waste',
  'renovation_debris'
]::text[]
where service_types is null
   or cardinality(service_types) = 0;

update public.providers
set vehicle_capabilities = array[]::text[]
where vehicle_capabilities is null;

create or replace function public.create_provider_notifications_for_lead(
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
  v_lead_area text;
  v_service_type text;
  v_base_url text;
  v_count integer := 0;
  v_existing_count integer := 0;
  v_dispatch_limit integer := 5;
  v_channel notification_channel := 'email'::notification_channel;
  v_channel_text text;
  v_general_types text[] := array['mattress_bed','furniture_household','moveout_garage_cleanout'];
  v_default_types text[] := array['mattress_bed','furniture_household','moveout_garage_cleanout','appliances_electronics','yard_waste','renovation_debris'];
  v_special_types text[] := array['appliances_electronics','yard_waste','renovation_debris'];
begin
  if public.get_platform_setting_bool('lead_dispatch_enabled', true) is not true then
    return 0;
  end if;

  v_channel_text := lower(public.get_platform_setting_text('lead_dispatch_channel', 'email'));

  if v_channel_text = 'sms' then
    v_channel := 'sms'::notification_channel;
  else
    v_channel := 'email'::notification_channel;
  end if;

  select
    id,
    public_id,
    lower(coalesce(nullif(area, ''), 'unknown')),
    lower(coalesce(nullif(service_type, ''), 'general_review'))
  into v_lead_id, v_lead_public_id, v_lead_area, v_service_type
  from public.leads
  where public_id = p_lead_public_id
    and status in ('published', 'shared_active')
  limit 1;

  if v_lead_id is null then
    return 0;
  end if;

  -- One first dispatch batch only.
  select count(*)
  into v_existing_count
  from public.provider_notifications
  where lead_id = v_lead_id;

  if v_existing_count > 0 then
    return 0;
  end if;

  v_base_url := regexp_replace(
    coalesce(nullif(trim(p_base_url), ''), 'https://clearout.aurorasitesolutions.com'),
    '/+$',
    ''
  );

  insert into public.provider_notifications (
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
    selected.provider_id,
    v_channel,
    'pending',
    v_base_url || '/provider/lead?lead=' || v_lead_public_id || '&token=' || selected.provider_token,
    null,
    null
  from (
    select
      ranked.provider_id,
      ranked.provider_token,
      ranked.match_tier,
      ranked.last_notified_at,
      ranked.total_notifications
    from (
      select
        p.id as provider_id,
        p.provider_token,
        (
          select max(n.created_at)
          from public.provider_notifications n
          where n.provider_id = p.id
            and n.channel = v_channel
        ) as last_notified_at,
        (
          select count(n.id)
          from public.provider_notifications n
          where n.provider_id = p.id
            and n.channel = v_channel
        ) as total_notifications,
        (
          select count(n.id)
          from public.provider_notifications n
          where n.provider_id = p.id
            and n.status in ('pending', 'sent')
            and n.created_at >= now() - interval '1 day'
        ) as today_notifications,
        case
          when (
            (
              'all_calgary' = any(coalesce(p.service_areas, array['all_calgary']::text[]))
              or v_lead_area = 'unknown'
              or v_lead_area = any(coalesce(p.service_areas, array['all_calgary']::text[]))
            )
            and v_service_type = any(coalesce(p.service_types, v_default_types))
          ) then 1
          when v_service_type = any(coalesce(p.service_types, v_default_types)) then 2
          when v_service_type <> all(v_special_types)
            and coalesce(p.service_types, v_default_types) && v_general_types then 3
          else 99
        end as match_tier
      from public.providers p
      where p.approved = true
        and p.active = true
        and nullif(trim(coalesce(p.provider_token, '')), '') is not null
        and coalesce(p.daily_claim_limit, 20) > 0
        and (
          (
            v_channel = 'email'::notification_channel
            and coalesce(p.notify_by_email, false) = true
            and p.email_unsubscribed_at is null
            and nullif(trim(coalesce(p.email, '')), '') is not null
          )
          or
          (
            v_channel = 'sms'::notification_channel
            and coalesce(p.notify_by_sms, false) = true
            and p.sms_opt_out_at is null
            and nullif(trim(coalesce(p.phone, '')), '') is not null
          )
        )
    ) ranked
    where ranked.match_tier < 99
      and ranked.today_notifications < coalesce((
        select p2.daily_claim_limit from public.providers p2 where p2.id = ranked.provider_id
      ), 20)
    order by
      ranked.match_tier asc,
      ranked.last_notified_at asc nulls first,
      ranked.total_notifications asc,
      random()
    limit v_dispatch_limit
  ) selected
  on conflict (lead_id, provider_id, channel) do nothing;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
