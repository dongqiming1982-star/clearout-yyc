import { appendToGoogleSheet, flatProviderApplication, providerApplicationEmail, sendResendEmail, verifyTurnstileIfConfigured } from './_lib/launch.js'
import { hasSupabaseConfig, supabaseInsert } from './_lib/supabase.js'

function asArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : []
}

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
    const { application, turnstileToken, source_url } = req.body || {}
    if (!application || typeof application !== 'object') return res.status(400).json({ error: 'Missing application payload' })

    await verifyTurnstileIfConfigured(turnstileToken, req.headers?.['x-forwarded-for'])

    const row = flatProviderApplication(application, String(source_url || req.headers?.referer || ''))
    let supabase: any = { skipped: true }

    if (hasSupabaseConfig()) {
      const wantsEmail = application.accepts_email_leads !== false
      const wantsSms = application.accepts_sms_leads === true && application.sms_consent_confirmed === true
      const inserted = await supabaseInsert('providers', {
        business_name: String(application.provider_display_name || application.business_name || 'Provider'),
        contact_name: String(application.contact_name || ''),
        email: String(application.email || ''),
        phone: String(application.phone || ''),
        approved: false,
        active: false,
        service_areas: asArray(application.service_areas).length ? asArray(application.service_areas) : ['calgary'],
        speaks_english: true,
        speaks_chinese: false,
        notify_by_email: wantsEmail,
        notify_by_sms: wantsSms,
        email_opt_in_at: wantsEmail ? new Date().toISOString() : null,
        sms_opt_in_at: wantsSms ? new Date().toISOString() : null,
        consent_text_version: 'provider-beta-v23',
        consent_ip: String(req.headers?.['x-forwarded-for'] || ''),
        consent_user_agent: String(req.headers?.['user-agent'] || ''),
        daily_claim_limit: Number(application.daily_lead_limit || 20),
        notes: JSON.stringify({ source_url, application }),
      })
      supabase = { skipped: false, provider: inserted?.[0] || null }
    }

    const sheet = await appendToGoogleSheet('provider_application', row, application)
    const emailBody = providerApplicationEmail(row)
    const email = await sendResendEmail(emailBody.subject, emailBody.html, emailBody.text)

    const warning = supabase.skipped && sheet.skipped && email.skipped
      ? 'No SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY, GOOGLE_SHEETS_WEBHOOK_URL, or RESEND_API_KEY/LEAD_NOTIFY_TO configured. The API accepted the form but did not store/send it anywhere.'
      : ''

    return res.status(200).json({ ok: true, application_id: row.application_id, supabase, sheet, email, warning })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return res.status(500).json({ error: message })
  }
}
