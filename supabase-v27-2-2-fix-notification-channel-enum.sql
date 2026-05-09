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
  v_channel notification_channel := 'email'::notification_channel;
  v_channel_text text;
begin
  if get_platform_setting_bool('lead_dispatch_enabled', true) is not true then
    return 0;
  end if;

  v_channel_text := lower(get_platform_setting_text('lead_dispatch_channel', 'email'));

  if v_channel_text = 'sms' then
    v_channel := 'sms'::notification_channel;
  else
    v_channel := 'email'::notification_channel;
  end if;

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
    One first dispatch batch only.
    If the lead already has any notification records, do not create another batch.
  */
  select count(*)
  into v_existing_count
  from provider_notifications
  where lead_id = v_lead_id;

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
    v_channel,
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
     and n.channel = v_channel
    where p.approved = true
      and p.active = true
      and nullif(trim(coalesce(p.provider_token, '')), '') is not null
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
