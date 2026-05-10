function env(name: string) {
  return typeof process !== 'undefined' ? process.env[name] : undefined
}

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function list(value: unknown) {
  return Array.isArray(value) ? value.join(', ') : String(value ?? '')
}

export function str(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

export function bool(value: unknown) {
  return Boolean(value)
}

export function flatCustomerLead(lead: Record<string, unknown>, sourceUrl = '') {
  return {
    submitted_at: new Date().toISOString(),
    lead_id: str(lead.lead_id),
    customer_name: str(lead.customer_name),
    customer_phone: str(lead.customer_phone),
    customer_email: str(lead.customer_email),
    community_slug: str(lead.community_slug),
    community_or_postal: str(lead.community_or_postal),
    area: str(lead.area),
    timing: str(lead.timing),
    rough_amount: str(lead.rough_amount),
    item_location: str(lead.item_location),
    request_categories: list(lead.request_categories),
    regular_special_items: list(lead.regular_special_items),
    blocked_or_hazardous_items: list(lead.blocked_or_hazardous_items),
    dispatch_eligible: String(bool(lead.dispatch_eligible)),
    lead_grade: str(lead.lead_grade),
    required_vehicle_level: String(lead.required_vehicle_level ?? ''),
    required_crew_size: String(lead.required_crew_size ?? ''),
    request_description: str(lead.request_description),
    consent_contact_share: String(bool(lead.consent_contact_share)),
    consent_real_request: String(bool(lead.consent_real_request)),
    phone_verified: String(bool(lead.phone_verified)),
    verification_method: str(lead.verification_method),
    source_url: sourceUrl,
    raw_json: JSON.stringify(lead),
  }
}

export function flatProviderApplication(application: Record<string, unknown>, sourceUrl = '') {
  return {
    submitted_at: new Date().toISOString(),
    application_id: str(application.application_id),
    provider_display_name: str(application.provider_display_name),
    contact_name: str(application.contact_name),
    business_description: str(application.business_description),
    phone: str(application.phone),
    email: str(application.email),
    service_areas: list(application.service_areas),
    services_accepted: list(application.services_accepted),
    vehicle_capabilities: list(application.vehicle_capabilities),
    max_vehicle_level: String(application.max_vehicle_level ?? ''),
    crew_capacity: str(application.crew_capacity),
    preferred_notification: str(application.preferred_notification),
    daily_lead_limit: String(application.daily_lead_limit ?? ''),
    available_days: list(application.available_days),
    available_time_windows: list(application.available_time_windows),
    accepts_same_day: str(application.accepts_same_day),
    sms_consent_confirmed: String(bool(application.sms_consent_confirmed)),
    legal_operation_confirmed: String(bool(application.legal_operation_confirmed)),
    no_illegal_dumping_confirmed: String(bool(application.no_illegal_dumping_confirmed)),
    terms_confirmed: String(bool(application.terms_confirmed)),
    source_url: sourceUrl,
    raw_json: JSON.stringify(application),
  }
}

export async function verifyTurnstileIfConfigured(token: string | undefined, remoteIp: string | string[] | undefined) {
  const secret = env('TURNSTILE_SECRET_KEY')
  if (!secret) return { skipped: true }
  if (!token) throw new Error('Missing Turnstile token')

  const formData = new URLSearchParams()
  formData.append('secret', secret)
  formData.append('response', token)
  if (remoteIp && typeof remoteIp === 'string') formData.append('remoteip', remoteIp)

  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: formData,
  })
  const data = await response.json() as { success?: boolean; 'error-codes'?: string[] }
  if (!data.success) throw new Error(`Turnstile verification failed: ${(data['error-codes'] || []).join(', ')}`)
  return { skipped: false }
}

export async function appendToGoogleSheet(kind: 'customer_lead' | 'provider_application', row: Record<string, unknown>, payload: Record<string, unknown>) {
  const webhookUrl = env('GOOGLE_SHEETS_WEBHOOK_URL') || env('GOOGLE_SCRIPT_URL')
  if (!webhookUrl) return { skipped: true }

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      secret: env('GOOGLE_SHEETS_WEBHOOK_SECRET') || '',
      kind,
      row,
      payload,
    }),
  })
  const text = await response.text()
  let data: any = null
  try { data = text ? JSON.parse(text) : null } catch { data = null }
  if (!response.ok || data?.ok === false) throw new Error(`Google Sheet webhook failed: ${data?.error || text || response.status}`)
  return { skipped: false, response: data || text }
}

export async function sendResendEmail(subject: string, html: string, text: string) {
  const apiKey = env('RESEND_API_KEY')
  const to = env('LEAD_NOTIFY_TO') || env('NOTIFY_TO')
  const from = env('LEAD_NOTIFY_FROM') || 'Clearout YYC <onboarding@resend.dev>'
  if (!apiKey || !to) return { skipped: true }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to: to.split(',').map(x => x.trim()).filter(Boolean), subject, html, text }),
  })
  const data = await response.text()
  if (!response.ok) throw new Error(`Email send failed: ${data || response.status}`)
  return { skipped: false, response: data }
}

export function customerLeadEmail(row: Record<string, unknown>) {
  const subject = `New Clearout YYC request — ${row.community_or_postal || 'Calgary'}`
  const text = [
    subject,
    `Name: ${row.customer_name}`,
    `Phone: ${row.customer_phone}`,
    `Email: ${row.customer_email}`,
    `Community: ${row.community_or_postal}`,
    `Area: ${row.area}`,
    `Timing: ${row.timing}`,
    `Amount: ${row.rough_amount}`,
    `Location: ${row.item_location}`,
    `Categories: ${row.request_categories}`,
    `Description: ${row.request_description}`,
    `Source: ${row.source_url}`,
  ].join('\n')
  const html = `<h2>${escapeHtml(subject)}</h2><p><b>Name:</b> ${escapeHtml(row.customer_name)}</p><p><b>Phone:</b> ${escapeHtml(row.customer_phone)}</p><p><b>Email:</b> ${escapeHtml(row.customer_email)}</p><p><b>Community:</b> ${escapeHtml(row.community_or_postal)} / ${escapeHtml(row.area)}</p><p><b>Timing:</b> ${escapeHtml(row.timing)}</p><p><b>Amount:</b> ${escapeHtml(row.rough_amount)}</p><p><b>Location:</b> ${escapeHtml(row.item_location)}</p><p><b>Categories:</b> ${escapeHtml(row.request_categories)}</p><p><b>Description:</b><br>${escapeHtml(row.request_description)}</p><p><b>Source:</b> ${escapeHtml(row.source_url)}</p>`
  return { subject, text, html }
}

export function providerApplicationEmail(row: Record<string, unknown>) {
  const subject = `New Clearout YYC provider beta signup — ${row.provider_display_name || 'Provider'}`
  const text = [
    subject,
    `Provider: ${row.provider_display_name}`,
    `Contact: ${row.contact_name}`,
    `Phone: ${row.phone}`,
    `Email: ${row.email}`,
    `Description: ${row.business_description}`,
    `Areas: ${row.service_areas}`,
    `Services: ${row.services_accepted}`,
    `Vehicles: ${row.vehicle_capabilities}`,
    `Notification: ${row.preferred_notification}`,
    `Source: ${row.source_url}`,
  ].join('\n')
  const html = `<h2>${escapeHtml(subject)}</h2><p><b>Provider:</b> ${escapeHtml(row.provider_display_name)}</p><p><b>Contact:</b> ${escapeHtml(row.contact_name)}</p><p><b>Phone:</b> ${escapeHtml(row.phone)}</p><p><b>Email:</b> ${escapeHtml(row.email)}</p><p><b>Description:</b> ${escapeHtml(row.business_description)}</p><p><b>Areas:</b> ${escapeHtml(row.service_areas)}</p><p><b>Services:</b> ${escapeHtml(row.services_accepted)}</p><p><b>Vehicles:</b> ${escapeHtml(row.vehicle_capabilities)}</p><p><b>Notification:</b> ${escapeHtml(row.preferred_notification)}</p><p><b>Source:</b> ${escapeHtml(row.source_url)}</p>`
  return { subject, text, html }
}
