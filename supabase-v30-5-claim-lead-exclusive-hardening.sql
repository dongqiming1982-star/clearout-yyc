-- V30.5 Claim lead exclusive hardening
-- Applied to production Supabase during V30.5 Production Safety Checklist.
-- Purpose:
-- 1. Keep the production claim_lead_free_beta RPC in the repo.
-- 2. Add explicit protection so exclusive claim is unavailable when shared_claim_count > 0.
-- 3. Preserve FOR UPDATE row lock to prevent concurrent shared over-claims.

CREATE OR REPLACE FUNCTION public.claim_lead_free_beta(p_lead_public_id text, p_provider_token text, p_access access_type)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_provider providers;
  v_lead leads;
  v_claim lead_claims;
  v_new_count integer;
begin
  select *
  into v_provider
  from providers
  where provider_token = p_provider_token
    and approved = true
    and active = true
  limit 1;

  if not found then
    return jsonb_build_object(
      'ok', false,
      'code', 'invalid_provider',
      'message', 'Provider is not approved or token is invalid.'
    );
  end if;

  select *
  into v_lead
  from leads
  where public_id = p_lead_public_id
  for update;

  if not found then
    return jsonb_build_object(
      'ok', false,
      'code', 'lead_not_found',
      'message', 'Lead not found.'
    );
  end if;

  if v_lead.expires_at is not null and v_lead.expires_at < now() then
    update leads
    set status = 'expired'
    where id = v_lead.id;

    return jsonb_build_object(
      'ok', false,
      'code', 'expired',
      'message', 'This lead has expired.'
    );
  end if;

  select *
  into v_claim
  from lead_claims
  where lead_id = v_lead.id
    and provider_id = v_provider.id
  limit 1;

  if found then
    return jsonb_build_object(
      'ok', false,
      'code', 'already_claimed',
      'message', 'You have already claimed this lead.'
    );
  end if;

  if p_access = 'exclusive' then
    if v_lead.status <> 'published'
       or coalesce(v_lead.shared_claim_count, 0) > 0 then
      return jsonb_build_object(
        'ok', false,
        'code', 'exclusive_unavailable',
        'message', 'Exclusive access is no longer available for this lead.'
      );
    end if;

    insert into lead_claims (lead_id, provider_id, access, status)
    values (v_lead.id, v_provider.id, 'exclusive', 'granted_free')
    returning * into v_claim;

    update leads
    set status = 'exclusive_claimed',
        exclusive_provider_id = v_provider.id,
        updated_at = now()
    where id = v_lead.id;

    return jsonb_build_object(
      'ok', true,
      'access', 'exclusive',
      'message', 'Exclusive claim granted.',
      'customer', jsonb_build_object(
        'name', v_lead.customer_name,
        'phone', v_lead.customer_phone,
        'email', v_lead.customer_email,
        'community_or_postal', v_lead.community_or_postal,
        'area', v_lead.area,
        'notes', v_lead.notes
      )
    );
  end if;

  if p_access = 'shared' then
    if v_lead.status not in ('published', 'shared_active') then
      return jsonb_build_object(
        'ok', false,
        'code', 'shared_unavailable',
        'message', 'Shared access is no longer available for this lead.'
      );
    end if;

    if v_lead.shared_claim_count >= v_lead.shared_limit then
      update leads
      set status = 'shared_full'
      where id = v_lead.id;

      return jsonb_build_object(
        'ok', false,
        'code', 'shared_full',
        'message', 'This lead has already reached the shared access limit.'
      );
    end if;

    insert into lead_claims (lead_id, provider_id, access, status)
    values (v_lead.id, v_provider.id, 'shared', 'granted_free')
    returning * into v_claim;

    v_new_count := v_lead.shared_claim_count + 1;

    update leads
    set shared_claim_count = v_new_count,
        status = case
          when v_new_count >= shared_limit then 'shared_full'::lead_status
          else 'shared_active'::lead_status
        end,
        updated_at = now()
    where id = v_lead.id;

    return jsonb_build_object(
      'ok', true,
      'access', 'shared',
      'shared_claim_count', v_new_count,
      'shared_limit', v_lead.shared_limit,
      'message', 'Shared claim granted.',
      'customer', jsonb_build_object(
        'name', v_lead.customer_name,
        'phone', v_lead.customer_phone,
        'email', v_lead.customer_email,
        'community_or_postal', v_lead.community_or_postal,
        'area', v_lead.area,
        'notes', v_lead.notes
      )
    );
  end if;

  return jsonb_build_object(
    'ok', false,
    'code', 'invalid_access',
    'message', 'Invalid access type.'
  );
end;
$function$;
