import { verifyManualCaptcha } from './_lib/manualCaptcha.js'
import { normalizeNorthAmericanPhone, normalizeOptionalEmail, normalizeOptionalEmail } from './_lib/validation.js'
import { appendToGoogleSheet, customerLeadEmail, flatCustomerLead, sendResendEmail, verifyTurnstileIfConfigured } from './_lib/launch.js'
import { hasSupabaseConfig, supabaseRpc } from './_lib/supabase.js'
import { sendPendingProviderEmails } from './_lib/providerNotifications.js'

function firstText(value: unknown) {
  return Array.isArray(value) ? value.filter(Boolean).join(', ') : String(value || '')
}

function serviceTypeFromLead(lead: any) {
  if (Array.isArray(lead?.service_tags) && lead.service_tags.length) return firstText(lead.service_tags)
  if (Array.isArray(lead?.request_categories) && lead.request_categories.length) return firstText(lead.request_categories)
  return 'junk removal'
}

function mapLeadToRpc(lead: any, sourceUrl: string) {
  return {
    p_customer_name: String(lead?.customer_name || ''),
    p_customer_phone: String(lead?.customer_phone || ''),
    p_customer_email: String(lead?.customer_email || ''),
    p_community_slug: String(lead?.community_slug || ''),
    p_community_or_postal: String(lead?.community_or_postal || ''),
    p_area: String(lead?.area || ''),
    p_service_type: serviceTypeFromLead(lead),
    p_job_size: String(lead?.rough_amount || lead?.job_size || ''),
    p_timeline: String(lead?.timing || lead?.timeline || ''),
    p_notes: String(lead?.request_description || lead?.dispatch_summary || lead?.notes || ''),
    p_source_url: sourceUrl,
    p_is_moving: false,
    p_has_hazardous_items: Array.isArray(lead?.blocked_or_hazardous_items) && lead.blocked_or_hazardous_items.length > 0,
    p_has_valuable_items: false,
  }
}

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
    const { lead, turnstileToken, source_url, manualCaptcha } = req.body || {}
    if (!lead || typeof lead !== 'object') return res.status(400).json({ error: 'Missing lead payload' })

    const captchaCheck = verifyManualCaptcha(manualCaptcha)
    if (!captchaCheck.ok) return res.status(400).json({ error: captchaCheck.error })

    await verifyTurnstileIfConfigured(turnstileToken, req.headers?.['x-forwarded-for'])

    const normalizedCustomerPhone = normalizeNorthAmericanPhone(lead.customer_phone)
    if (!normalizedCustomerPhone) {
      return res.status(400).json({ error: 'Please enter a valid Canadian phone number, such as 403-555-1234.' })
    }

    const normalizedCustomerEmail = normalizeOptionalEmail(lead.customer_email)
    if (normalizedCustomerEmail === null) {
      return res.status(400).json({ error: 'Please enter a valid email address, or leave this field blank.' })
    }

    lead.customer_phone = normalizedCustomerPhone
    lead.customer_email = normalizedCustomerEmail

    const sourceUrl = String(source_url || req.headers?.referer || '')
    const row = flatCustomerLead(lead, sourceUrl)
    let supabase: any = { skipped: true }
    let notificationRecords: any = { skipped: true }
    let providerEmailSend: any = { skipped: true }

    if (hasSupabaseConfig()) {
      const created = await supabaseRpc<any>('create_public_lead', mapLeadToRpc(lead, sourceUrl))
      supabase = { skipped: false, result: created }
      if (created?.accepted && created?.status === 'published' && created?.lead_public_id) {
        const count = await supabaseRpc<number>('create_provider_notifications_for_lead', {
          p_lead_public_id: created.lead_public_id,
          p_base_url: 'https://clearout.aurorasitesolutions.com',
        })
        notificationRecords = { skipped: false, created: count }
        providerEmailSend = await sendPendingProviderEmails(25)
      }
    }

    // Optional legacy launch notifications. These are skipped unless configured.
    const sheet = await appendToGoogleSheet('customer_lead', row, lead)
    const emailBody = customerLeadEmail(row)
    const email = await sendResendEmail(emailBody.subject, emailBody.html, emailBody.text)

    const warning = supabase.skipped && sheet.skipped && email.skipped
      ? 'No SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY, GOOGLE_SHEETS_WEBHOOK_URL, or RESEND_API_KEY/LEAD_NOTIFY_TO configured. The API accepted the form but did not store/send it anywhere.'
      : ''

    return res.status(200).json({ ok: true, lead_id: row.lead_id, supabase, notificationRecords, providerEmailSend, createdDispatches: notificationRecords.created || 0, sheet, email, warning })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return res.status(500).json({ error: message })
  }
}
