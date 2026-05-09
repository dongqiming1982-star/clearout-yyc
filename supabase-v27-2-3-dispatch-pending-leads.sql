create or replace function dispatch_pending_leads(
  p_base_url text default 'https://clearout.aurorasitesolutions.com',
  p_limit integer default 50
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lead record;
  v_created integer := 0;
  v_total_created integer := 0;
  v_checked integer := 0;
begin
  if get_platform_setting_bool('lead_dispatch_enabled', true) is not true then
    return jsonb_build_object(
      'ok', false,
      'reason', 'lead_dispatch_paused',
      'checked', 0,
      'created', 0
    );
  end if;

  for v_lead in
    select
      l.id,
      l.public_id,
      l.customer_name,
      l.created_at
    from leads l
    where l.status in ('published', 'shared_active')
      and nullif(trim(coalesce(l.public_id, '')), '') is not null
      and not exists (
        select 1
        from provider_notifications n
        where n.lead_id = l.id
      )
    order by l.created_at asc
    limit greatest(1, least(coalesce(p_limit, 50), 200))
  loop
    v_checked := v_checked + 1;

    select create_provider_notifications_for_lead(v_lead.public_id, p_base_url)
    into v_created;

    v_total_created := v_total_created + coalesce(v_created, 0);
  end loop;

  return jsonb_build_object(
    'ok', true,
    'checked', v_checked,
    'created', v_total_created
  );
end;
$$;
