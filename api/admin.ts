import { assertAdmin, handleAdminError, supabaseAdminFetch } from './_lib/admin.js'
import { supabaseRpc } from './_lib/supabase.js'
import { getClearoutBaseUrl, getProviderEmailBatchLimit, sendPendingProviderEmails } from './_lib/providerNotifications.js'\nimport { sendProviderApprovalEmail } from './_lib/providerLifecycleEmails.js'

function daysFromNow(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
}

async function getSummary(res: any) {
  const providers: any[] = await supabaseAdminFetch('providers?select=id,approved,active&limit=1000')
  const leads: any[] = await supabaseAdminFetch('leads?select=id,status&limit=1000')
  const claims: any[] = await supabaseAdminFetch('lead_claims?select=id,access,status&limit=1000')

  const leadStatus: Record<string, number> = {}
  for (const lead of leads) leadStatus[lead.status] = (leadStatus[lead.status] || 0) + 1

  return res.status(200).json({
    ok: true,
    summary: {
      providers_total: providers.length,
      providers_pending: providers.filter(p => !p.approved).length,
      providers_active: providers.filter(p => p.approved && p.active).length,
      leads_total: leads.length,
      lead_status: leadStatus,
      claims_total: claims.length,
      claims_shared: claims.filter(c => c.access === 'shared').length,
      claims_exclusive: claims.filter(c => c.access === 'exclusive').length,
    },
  })
}

async function getProviders(res: any) {
  const providers = await supabaseAdminFetch(
    'providers?select=id,public_id,business_name,contact_name,email,phone,approved,active,notify_by_email,email_unsubscribed_at,email_unsubscribe_reason,email_resubscribed_at,email_resubscribe_source,email_preference_link_requested_at,application_email_sent_at,approval_email_sent_at,notify_by_sms,sms_opt_in_at,sms_opt_out_at,created_at,updated_at&order=created_at.desc&limit=200'
  )
  return res.status(200).json({ ok: true, providers })
}

async function providerAction(req: any, res: any) {
  const providerId = String(req.body?.provider_id || '')
  const action = String(req.body?.action || '')

  if (!providerId) return res.status(400).json({ error: 'Missing provider_id' })

  let patch: any = {}
  let providerBefore: any = null

  if (action === 'approve') {
    const beforeRows = await supabaseAdminFetch<any[]>(
      `providers?select=id,business_name,contact_name,email,provider_token,approved,approval_email_sent_at&id=eq.${encodeURIComponent(providerId)}&limit=1`
    )
    providerBefore = Array.isArray(beforeRows) ? beforeRows[0] : null
    patch = { approved: true, active: true }
  }
  else if (action === 'suspend') patch = { active: false }
  else if (action === 'activate') patch = { active: true }
  else if (action === 'deactivate') patch = { active: false }
  else return res.status(400).json({ error: 'Unknown action' })

  const updated = await supabaseAdminFetch(
    `providers?id=eq.${encodeURIComponent(providerId)}`,
    { method: 'PATCH', body: JSON.stringify(patch) }
  )

  const provider = Array.isArray(updated) ? updated[0] : updated
  let providerLifecycleEmail: any = { skipped: true }

  if (
    action === 'approve' &&
    providerBefore &&
    providerBefore.approved !== true &&
    !providerBefore.approval_email_sent_at
  ) {
    providerLifecycleEmail = await sendProviderApprovalEmail({ ...providerBefore, ...(provider || {}) })
  }

  return res.status(200).json({ ok: true, provider, providerLifecycleEmail })
}

async function getLeads(res: any) {
  const leads = await supabaseAdminFetch(
    'leads?select=id,public_id,status,customer_name,customer_phone,customer_email,community_or_postal,area,service_type,job_size,timeline,notes,shared_claim_count,shared_limit,created_at,publish_at,published_at,expires_at&order=created_at.desc&limit=200'
  )
  return res.status(200).json({ ok: true, leads })
}

async function leadAction(req: any, res: any) {
  const leadId = String(req.body?.lead_id || '')
  const action = String(req.body?.action || '')

  if (!leadId) return res.status(400).json({ error: 'Missing lead_id' })

  let patch: any = {}

  if (action === 'publish') {
    patch = {
      status: 'published',
      publish_at: new Date().toISOString(),
      published_at: new Date().toISOString(),
      expires_at: daysFromNow(7),
    }
  } else if (action === 'expire') {
    patch = { status: 'expired' }
  } else if (action === 'queue') {
    patch = { status: 'queued' }
  } else {
    return res.status(400).json({ error: 'Unknown action' })
  }

  const updated = await supabaseAdminFetch<any[]>(
    `leads?id=eq.${encodeURIComponent(leadId)}`,
    { method: 'PATCH', body: JSON.stringify(patch) }
  )

  const lead = Array.isArray(updated) ? updated[0] : updated
  let notificationRecords: any = { skipped: true }
  let providerEmailSend: any = { skipped: true }

  if (action === 'publish' && lead?.public_id) {
    const count = await supabaseRpc<number>('create_provider_notifications_for_lead', {
      p_lead_public_id: lead.public_id,
      p_base_url: getClearoutBaseUrl(),
    })
    notificationRecords = { skipped: false, created: count }
    providerEmailSend = await sendPendingProviderEmails(getProviderEmailBatchLimit())
  }

  return res.status(200).json({ ok: true, lead, notificationRecords, providerEmailSend })
}

async function getClaims(res: any) {
  const claims: any[] = await supabaseAdminFetch(
    'lead_claims?select=id,lead_id,provider_id,access,status,created_at&order=created_at.desc&limit=200'
  )

  const leadIds = [...new Set(claims.map(c => c.lead_id).filter(Boolean))]
  const providerIds = [...new Set(claims.map(c => c.provider_id).filter(Boolean))]

  const leads: any[] = leadIds.length
    ? await supabaseAdminFetch(`leads?select=id,public_id,status,customer_name,customer_phone,customer_email,community_or_postal,service_type&id=in.(${leadIds.join(',')})`)
    : []

  const providers: any[] = providerIds.length
    ? await supabaseAdminFetch(`providers?select=id,business_name,email,phone&id=in.(${providerIds.join(',')})`)
    : []

  const leadMap = Object.fromEntries(leads.map(l => [l.id, l]))
  const providerMap = Object.fromEntries(providers.map(p => [p.id, p]))

  const enriched = claims.map(c => ({
    ...c,
    lead: leadMap[c.lead_id] || null,
    provider: providerMap[c.provider_id] || null,
  }))

  return res.status(200).json({ ok: true, claims: enriched })
}

export default async function handler(req: any, res: any) {
  try {
    assertAdmin(req)

    const resource = String(req.query?.resource || '')
    const action = String(req.query?.action || '')

    if (req.method === 'GET') {
      if (resource === 'summary') return getSummary(res)
      if (resource === 'providers') return getProviders(res)
      if (resource === 'leads') return getLeads(res)
      if (resource === 'claims') return getClaims(res)
      return res.status(400).json({ error: 'Unknown admin resource' })
    }

    if (req.method === 'POST') {
      if (resource === 'provider' && action === 'update') return providerAction(req, res)
      if (resource === 'lead' && action === 'update') return leadAction(req, res)
      return res.status(400).json({ error: 'Unknown admin action' })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (e) {
    return handleAdminError(res, e)
  }
}
