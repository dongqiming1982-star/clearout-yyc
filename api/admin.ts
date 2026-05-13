import { assertAdmin, handleAdminError, supabaseAdminFetch } from './_lib/admin.js'
import { supabaseRpc } from './_lib/supabase.js'
import { getClearoutBaseUrl, getProviderEmailBatchLimit, sendPendingProviderEmails, sendPendingProviderSms } from './_lib/providerNotifications.js'
import { sendProviderApprovalEmail } from './_lib/providerLifecycleEmails.js'
import { getPlatformSettings, updatePlatformSetting } from './_lib/platformSettings.js'
import { getLeadPhotosByLeadIds } from './_lib/leadPhotos.js'

function daysFromNow(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
}

async function getSummary(res: any) {
  const providers: any[] = await supabaseAdminFetch('providers?select=id,approved,active,created_at&limit=1000')
  const leads: any[] = await supabaseAdminFetch('leads?select=id,status,created_at&limit=1000')
  const claims: any[] = await supabaseAdminFetch('lead_claims?select=id,access,status,created_at&limit=1000')

  function calgaryDateParts(value: any) {
    const d = value ? new Date(value) : new Date()
    if (Number.isNaN(d.getTime())) return { ymd: '', ym: '' }

    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Edmonton',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(d)

    const year = parts.find(p => p.type === 'year')?.value || ''
    const month = parts.find(p => p.type === 'month')?.value || ''
    const day = parts.find(p => p.type === 'day')?.value || ''

    return {
      ymd: `${year}-${month}-${day}`,
      ym: `${year}-${month}`,
    }
  }

  const nowParts = calgaryDateParts(new Date())
  const today = nowParts.ymd
  const thisMonth = nowParts.ym

  function isToday(row: any) {
    return calgaryDateParts(row?.created_at).ymd === today
  }

  function isThisMonth(row: any) {
    return calgaryDateParts(row?.created_at).ym === thisMonth
  }

  const leadStatus: Record<string, number> = {}
  for (const lead of leads) leadStatus[lead.status] = (leadStatus[lead.status] || 0) + 1

  const pendingProviders = providers.filter(p => !p.approved)

  return res.status(200).json({
    ok: true,
    summary: {
      providers_total: providers.length,
      providers_pending: pendingProviders.length,
      providers_active: providers.filter(p => p.approved && p.active).length,

      providers_today: providers.filter(isToday).length,
      providers_month: providers.filter(isThisMonth).length,
      providers_pending_today: pendingProviders.filter(isToday).length,
      providers_pending_month: pendingProviders.filter(isThisMonth).length,

      leads_total: leads.length,
      leads_today: leads.filter(isToday).length,
      leads_month: leads.filter(isThisMonth).length,
      lead_status: leadStatus,

      claims_total: claims.length,
      claims_today: claims.filter(isToday).length,
      claims_month: claims.filter(isThisMonth).length,
      claims_shared: claims.filter(c => c.access === 'shared').length,
      claims_exclusive: claims.filter(c => c.access === 'exclusive').length,
    },
  })
}
async function getLaunchFunnel(res: any) {
  const now = Date.now()

  const [
    verificationSessions,
    leads,
    leadPhotos,
    notifications,
    providers,
  ]: any[] = await Promise.all([
    supabaseAdminFetch('verification_sessions?select=*&order=created_at.desc&limit=5000'),
    supabaseAdminFetch('leads?select=id,created_at&order=created_at.desc&limit=5000'),
    supabaseAdminFetch('lead_photos?select=id,lead_id,created_at&order=created_at.desc&limit=5000'),
    supabaseAdminFetch('provider_notifications?select=id,lead_id,channel,status,sent_at,error_message,created_at&order=created_at.desc&limit=5000'),
    supabaseAdminFetch('providers?select=id,approved,active,notify_by_email,email_unsubscribed_at,notify_by_sms,sms_opt_out_at,created_at&order=created_at.desc&limit=5000'),
  ])

  const getTime = (row: any) => {
    const raw = row?.created_at || row?.createdAt || row?.sent_at || row?.verified_at
    const value = Date.parse(String(raw || ''))
    return Number.isFinite(value) ? value : 0
  }

  const statusOf = (row: any) => String(row?.status || '').toLowerCase()
  const channelOf = (row: any) => String(row?.channel || '').toLowerCase()
  const typeOf = (row: any) => String(row?.verification_type || row?.purpose || row?.type || '').toLowerCase()

  const isVerifiedSession = (row: any) => {
    const status = statusOf(row)
    return status === 'verified' || status === 'success' || status === 'approved' || Boolean(row?.verified_at)
  }

  const inLastHours = (row: any, hours: number) => {
    return getTime(row) >= now - hours * 60 * 60 * 1000
  }

  const windowStats = (hours: number) => {
    const windowSessions = verificationSessions.filter((row: any) => inLastHours(row, hours))
    const windowLeads = leads.filter((row: any) => inLastHours(row, hours))
    const windowLeadIds = new Set(windowLeads.map((lead: any) => String(lead.id)).filter(Boolean))

    const photosForWindowLeads = leadPhotos.filter((photo: any) => windowLeadIds.has(String(photo.lead_id)))
    const leadIdsWithPhotos = new Set(photosForWindowLeads.map((photo: any) => String(photo.lead_id)).filter(Boolean))

    const windowNotifications = notifications.filter((row: any) => inLastHours(row, hours))

    return {
      phone_verifications: windowSessions.length,
      verified_phones: windowSessions.filter(isVerifiedSession).length,
      customer_phone_verifications: windowSessions.filter((row: any) => typeOf(row).includes('customer')).length,
      provider_phone_verifications: windowSessions.filter((row: any) => typeOf(row).includes('provider')).length,

      customer_leads: windowLeads.length,
      leads_with_photos: leadIdsWithPhotos.size,
      leads_without_photos: Math.max(windowLeads.length - leadIdsWithPhotos.size, 0),
      lead_photos: photosForWindowLeads.length,

      dispatch_notifications: windowNotifications.length,
      dispatch_pending: windowNotifications.filter((row: any) => statusOf(row) === 'pending').length,
      dispatch_sent: windowNotifications.filter((row: any) => statusOf(row) === 'sent').length,
      dispatch_failed: windowNotifications.filter((row: any) => ['failed', 'error'].includes(statusOf(row))).length,
      email_sent: windowNotifications.filter((row: any) => channelOf(row) === 'email' && statusOf(row) === 'sent').length,
      sms_sent: windowNotifications.filter((row: any) => channelOf(row) === 'sms' && statusOf(row) === 'sent').length,
    }
  }

  const providerSupply = {
    providers_total: providers.length,
    providers_pending: providers.filter((p: any) => p.approved !== true).length,
    providers_approved_active: providers.filter((p: any) => p.approved === true && p.active !== false).length,
    providers_inactive: providers.filter((p: any) => p.approved === true && p.active === false).length,
    providers_email_subscribed: providers.filter((p: any) =>
      p.approved === true &&
      p.active !== false &&
      p.notify_by_email !== false &&
      !p.email_unsubscribed_at
    ).length,
    providers_sms_enabled: providers.filter((p: any) =>
      p.approved === true &&
      p.active !== false &&
      p.notify_by_sms === true &&
      !p.sms_opt_out_at
    ).length,
  }

  return res.status(200).json({
    ok: true,
    funnel: {
      generated_at: new Date(now).toISOString(),
      windows: {
        last_24h: windowStats(24),
        last_7d: windowStats(24 * 7),
        last_30d: windowStats(24 * 30),
      },
      provider_supply: providerSupply,
    },
  })
}

async function getProviders(res: any) {
  const providers = await supabaseAdminFetch(
    'providers?select=id,public_id,business_name,contact_name,business_description,email,phone,service_areas,service_types,vehicle_capabilities,daily_claim_limit,approved,active,notify_by_email,email_unsubscribed_at,email_unsubscribe_reason,email_resubscribed_at,email_resubscribe_source,email_preference_link_requested_at,application_email_sent_at,approval_email_sent_at,notify_by_sms,sms_opt_in_at,sms_opt_out_at,created_at,updated_at&order=created_at.desc&limit=200'
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
  const leads: any[] = await supabaseAdminFetch(
    'leads?select=id,public_id,status,customer_name,customer_phone,customer_email,community_or_postal,area,service_type,job_size,timeline,notes,shared_claim_count,shared_limit,created_at,publish_at,published_at,expires_at&order=created_at.desc&limit=200'
  )

  const leadIds = leads.map(l => l.id).filter(Boolean)

  const notifications: any[] = leadIds.length
    ? await supabaseAdminFetch(
        `provider_notifications?select=id,lead_id,channel,status,sent_at,error_message,created_at&lead_id=in.(${leadIds.join(',')})&order=created_at.desc&limit=5000`
      )
    : []

  const dispatchByLeadId: Record<string, any> = {}

  for (const lead of leads) {
    dispatchByLeadId[lead.id] = {
      total: 0,
      email: 0,
      sms: 0,
      pending: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
      last_channel: null,
      last_status: null,
      last_sent_at: null,
      last_error_message: null,
    }
  }

  for (const row of notifications) {
    const item = dispatchByLeadId[row.lead_id]
    if (!item) continue

    const channel = String(row.channel || '')
    const status = String(row.status || '')

    item.total += 1

    if (channel === 'email') item.email += 1
    if (channel === 'sms') item.sms += 1

    if (status === 'pending') item.pending += 1
    if (status === 'sent') item.sent += 1
    if (status === 'failed') item.failed += 1
    if (status === 'skipped') item.skipped += 1

    if (!item.last_status) {
      item.last_channel = channel || null
      item.last_status = status || null
      item.last_sent_at = row.sent_at || null
      item.last_error_message = row.error_message || null
    }
  }

  const photosByLeadId = await getLeadPhotosByLeadIds(leadIds, true)

  const enriched = leads.map(lead => {
    const photos = photosByLeadId[lead.id] || []
    const activePhotos = photos.filter((p: any) => p.active)
    return {
    ...lead,
    photos: activePhotos,
    photo_count: activePhotos.length,
    photo_expired_count: photos.filter((p: any) => p.expired || p.deleted_at).length,
    dispatch_status: dispatchByLeadId[lead.id] || {
      total: 0,
      email: 0,
      sms: 0,
      pending: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
      last_channel: null,
      last_status: null,
      last_sent_at: null,
      last_error_message: null,
    },
  }
  })

  return res.status(200).json({ ok: true, leads: enriched })
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
  let providerSmsSend: any = { skipped: true }

  if (action === 'publish' && lead?.public_id) {
    const count = await supabaseRpc<number>('create_provider_notifications_for_lead', {
      p_lead_public_id: lead.public_id,
      p_base_url: getClearoutBaseUrl(),
    })
    notificationRecords = { skipped: false, created: count }
    providerEmailSend = await sendPendingProviderEmails(getProviderEmailBatchLimit())
    providerSmsSend = await sendPendingProviderSms()
  }

  return res.status(200).json({ ok: true, lead, notificationRecords, providerEmailSend, providerSmsSend })
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


async function getSettings(res: any) {
  const settings = await getPlatformSettings()
  return res.status(200).json({ ok: true, settings })
}

async function settingsAction(req: any, res: any) {
  const key = String(req.body?.key || '')
  const value = req.body?.value

  if (!key) return res.status(400).json({ error: 'Missing setting key' })

  const settings = await updatePlatformSetting(key, value)
  return res.status(200).json({ ok: true, settings })
}


async function dispatchPendingLeadsAction(req: any, res: any) {
  const limitRaw = Number(req.body?.limit || 50)
  const limit = Math.max(1, Math.min(Number.isFinite(limitRaw) ? limitRaw : 50, 200))

  const result = await supabaseRpc<any>('dispatch_pending_leads', {
    p_base_url: getClearoutBaseUrl(),
    p_limit: limit,
  })

  const providerEmailSend = await sendPendingProviderEmails(getProviderEmailBatchLimit())
  const providerSmsSend = await sendPendingProviderSms()

  return res.status(200).json({
    ok: true,
    result,
    providerEmailSend,
    providerSmsSend,
  })
}


async function getDispatchStatus(res: any) {
  const leads: any[] = await supabaseAdminFetch(
    'leads?select=id,public_id&order=created_at.desc&limit=1000'
  )

  const notifications: any[] = await supabaseAdminFetch(
    'provider_notifications?select=id,lead_id,channel,status,sent_at,error_message,created_at&order=created_at.desc&limit=5000'
  )

  const byLeadId: Record<string, any> = {}

  for (const lead of leads) {
    byLeadId[lead.id] = {
      lead_id: lead.id,
      public_id: lead.public_id,
      total: 0,
      email: 0,
      sms: 0,
      pending: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
      last_channel: null,
      last_status: null,
      last_sent_at: null,
      last_error_message: null,
    }
  }

  for (const row of notifications) {
    const item = byLeadId[row.lead_id]
    if (!item) continue

    const channel = String(row.channel || '')
    const status = String(row.status || '')

    item.total += 1
    if (channel === 'email') item.email += 1
    if (channel === 'sms') item.sms += 1

    if (status === 'pending') item.pending += 1
    if (status === 'sent') item.sent += 1
    if (status === 'failed') item.failed += 1
    if (status === 'skipped') item.skipped += 1

    if (!item.last_status) {
      item.last_channel = channel || null
      item.last_status = status || null
      item.last_sent_at = row.sent_at || null
      item.last_error_message = row.error_message || null
    }
  }

  const dispatchStatus: Record<string, any> = {}

  for (const item of Object.values(byLeadId)) {
    dispatchStatus[(item as any).public_id] = item
  }

  return res.status(200).json({
    ok: true,
    dispatch_status: dispatchStatus,
  })
}


async function getDispatchOverview(res: any) {
  const leads: any[] = await supabaseAdminFetch(
    'leads?select=id,public_id,status,customer_name,shared_claim_count,shared_limit,created_at&or=(status.eq.queued,status.eq.published,status.eq.shared_active)&order=created_at.asc&limit=1000'
  )

  const notifications: any[] = await supabaseAdminFetch(
    'provider_notifications?select=id,lead_id,channel,status,sent_at,error_message,created_at&order=created_at.asc&limit=5000'
  )

  const notifiedLeadIds = new Set(notifications.map(n => n.lead_id).filter(Boolean))

  const pendingDispatchLeads = leads.filter(l => {
    const sharedCount = Number(l.shared_claim_count || 0)
    const sharedLimit = Number(l.shared_limit || 3)
    return !notifiedLeadIds.has(l.id) && sharedCount < sharedLimit
  })

  const notificationSummary = {
    total: notifications.length,
    pending: notifications.filter(n => n.status === 'pending').length,
    sent: notifications.filter(n => n.status === 'sent').length,
    failed: notifications.filter(n => n.status === 'failed').length,
    skipped: notifications.filter(n => n.status === 'skipped').length,

    email_pending: notifications.filter(n => n.channel === 'email' && n.status === 'pending').length,
    email_sent: notifications.filter(n => n.channel === 'email' && n.status === 'sent').length,
    email_failed: notifications.filter(n => n.channel === 'email' && n.status === 'failed').length,

    sms_pending: notifications.filter(n => n.channel === 'sms' && n.status === 'pending').length,
    sms_sent: notifications.filter(n => n.channel === 'sms' && n.status === 'sent').length,
    sms_failed: notifications.filter(n => n.channel === 'sms' && n.status === 'failed').length,
  }

  return res.status(200).json({
    ok: true,
    overview: {
      pending_dispatch_leads: pendingDispatchLeads.length,
      pending_dispatch_preview: pendingDispatchLeads.slice(0, 10).map(l => ({
        public_id: l.public_id,
        status: l.status,
        customer_name: l.customer_name,
        created_at: l.created_at,
      })),
      notifications: notificationSummary,
    },
  })
}

export default async function handler(req: any, res: any) {
  try {
    assertAdmin(req)

    const resource = String(req.query?.resource || '')
    const action = String(req.query?.action || '')

    if (req.method === 'GET') {
      if (resource === 'summary') return getSummary(res)
      if (resource === 'launch-funnel') return getLaunchFunnel(res)
      if (resource === 'providers') return getProviders(res)
      if (resource === 'leads') return getLeads(res)
      if (resource === 'claims') return getClaims(res)
      if (resource === 'settings') return getSettings(res)
      if (resource === 'dispatch-status') return getDispatchStatus(res)
      if (resource === 'dispatch-overview') return getDispatchOverview(res)
      return res.status(400).json({ error: 'Unknown admin resource' })
    }

    if (req.method === 'POST') {
      if (resource === 'provider' && action === 'update') return providerAction(req, res)
      if (resource === 'lead' && action === 'update') return leadAction(req, res)
      if (resource === 'settings' && action === 'update') return settingsAction(req, res)
      if (resource === 'dispatch' && action === 'pending') return dispatchPendingLeadsAction(req, res)
      return res.status(400).json({ error: 'Unknown admin action' })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (e) {
    return handleAdminError(res, e)
  }
}
