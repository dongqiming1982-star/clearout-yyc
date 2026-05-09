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
  v_existing_count integer := 0;
  v_dispatch_limit integer := 5;
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

  /*
    V26 rule:
    A lead gets only one first dispatch batch.
    If email notifications already exist for this lead, do not create more.
    This prevents repeated cron/admin calls from slowly notifying everyone.
  */
  select count(*)
  into v_existing_count
  from provider_notifications
  where lead_id = v_lead_id
    and channel = 'email';

  if v_existing_count > 0 then
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
    selected.provider_id,
    'email',
    'pending',
    v_base_url || '/provider/lead?lead=' || v_lead_public_id || '&token=' || selected.provider_token,
    null,
    null
  from (
    select
      p.id as provider_id,
      p.provider_token,
      max(n.created_at) as last_notified_at,
      count(n.id) as total_notifications
    from providers p
    left join provider_notifications n
      on n.provider_id = p.id
     and n.channel = 'email'
    where p.approved = true
      and p.active = true
      and coalesce(p.notify_by_email, true) = true
      and nullif(trim(coalesce(p.email, '')), '') is not null
      and nullif(trim(coalesce(p.provider_token, '')), '') is not null
    group by p.id, p.provider_token
    order by
      max(n.created_at) asc nulls first,
      count(n.id) asc,
      random()
    limit v_dispatch_limit
  ) selected
  on conflict (lead_id, provider_id, channel) do nothing;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
