import { verifyManualCaptcha } from './_lib/manualCaptcha.js'
import { normalizeEmail, normalizeNorthAmericanPhone } from './_lib/validation.js'
import { appendToGoogleSheet, flatProviderApplication, providerApplicationEmail, sendResendEmail, verifyTurnstileIfConfigured } from './_lib/launch.js'
import { hasSupabaseConfig, supabaseInsert, supabaseSelect } from './_lib/supabase.js'
import { sendProviderApplicationReceivedEmail } from './_lib/providerLifecycleEmails.js'
import { normalizeProviderDispatchAreas, normalizeProviderServiceTypes } from './_lib/taxonomy.js'

const PROVIDER_DESCRIPTION_MAX = 300

function asArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : []
}

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
    const { application, turnstileToken, source_url, manualCaptcha } = req.body || {}
    if (!application || typeof application !== 'object') return res.status(400).json({ error: 'Missing application payload' })

    const captchaCheck = verifyManualCaptcha(manualCaptcha)
    if (!captchaCheck.ok) return res.status(400).json({ error: captchaCheck.error })

    await verifyTurnstileIfConfigured(turnstileToken, req.headers?.['x-forwarded-for'])

    const businessName = String(application.provider_display_name || application.business_name || '').trim()
    const contactName = String(application.contact_name || '').trim()
    const businessDescription = String(application.business_description || '').trim()

    if (!businessName || !contactName) {
      return res.status(400).json({ error: 'Please enter business name and contact name.' })
    }

    if (businessDescription.length > PROVIDER_DESCRIPTION_MAX) {
      return res.status(400).json({
        error: `Business introduction is too long. Please keep it under ${PROVIDER_DESCRIPTION_MAX} characters.`,
        code: 'business_description_too_long',
      })
    }

    const normalizedProviderPhone = normalizeNorthAmericanPhone(application.phone)
    if (!normalizedProviderPhone) {
      return res.status(400).json({ error: 'Please enter a valid business contact phone number, such as 403-555-1234.' })
    }

    const normalizedProviderEmail = normalizeEmail(application.email)
    if (!normalizedProviderEmail) {
      return res.status(400).json({ error: 'Please enter a valid business email address.' })
    }

    application.provider_display_name = businessName
    application.contact_name = contactName
    application.phone = normalizedProviderPhone
    application.email = normalizedProviderEmail
    application.business_description = businessDescription
    application.service_areas = normalizeProviderDispatchAreas(application.service_areas)
    application.services_accepted = normalizeProviderServiceTypes(application.services_accepted)
    application.accepts_email_leads = true
    application.accepts_sms_leads = Boolean(application.sms_consent_confirmed)
    application.preferred_notification = 'sms'
    application.available_days = []
    application.available_time_windows = []

    const row = flatProviderApplication(application, String(source_url || req.headers?.referer || ''))
    let supabase: any = { skipped: true }
    let providerLifecycleEmail: any = { skipped: true }

    if (hasSupabaseConfig()) {
      const providerEmail = String(application.email || '').trim().toLowerCase()
      const providerPhone = String(application.phone || '').trim()

      const existingProviders = await supabaseSelect<any>(
        `providers?select=id,email,phone&or=(email.eq.${encodeURIComponent(providerEmail)},phone.eq.${encodeURIComponent(providerPhone)})&limit=1`
      )

      if (existingProviders.length > 0) {
        return res.status(409).json({
          error: 'This phone number or email is already registered. If this is your business, please contact Clearout YYC support.'
        })
      }

      const wantsEmail = true
      const smsConsentConfirmed = application.sms_consent_confirmed === true
      const wantsSms = false
      const inserted = await supabaseInsert('providers', {
        business_name: String(application.provider_display_name || application.business_name || 'Provider'),
        contact_name: String(application.contact_name || ''),
        business_description: businessDescription,
        email: String(application.email || ''),
        phone: String(application.phone || ''),
        approved: false,
        active: false,
        service_areas: normalizeProviderDispatchAreas(application.service_areas),
        service_types: normalizeProviderServiceTypes(application.services_accepted),
        vehicle_capabilities: asArray(application.vehicle_capabilities),
        speaks_english: true,
        speaks_chinese: false,
        notify_by_email: true,
        notify_by_sms: wantsSms,
        email_opt_in_at: wantsEmail ? new Date().toISOString() : null,
        sms_opt_in_at: smsConsentConfirmed ? new Date().toISOString() : null,
        consent_text_version: 'provider-beta-v23',
        consent_ip: String(req.headers?.['x-forwarded-for'] || ''),
        consent_user_agent: String(req.headers?.['user-agent'] || ''),
        daily_claim_limit: Number(application.daily_lead_limit || 3),
        notes: JSON.stringify({ source_url, application }),
      })
      const provider = inserted?.[0] || null
      supabase = { skipped: false, provider }
      if (provider) providerLifecycleEmail = await sendProviderApplicationReceivedEmail(provider)
    }

    const sheet = await appendToGoogleSheet('provider_application', row, application)
    const emailBody = providerApplicationEmail(row)
    const email = await sendResendEmail(emailBody.subject, emailBody.html, emailBody.text)

    const warning = supabase.skipped && sheet.skipped && email.skipped
      ? 'No SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY, GOOGLE_SHEETS_WEBHOOK_URL, or RESEND_API_KEY/LEAD_NOTIFY_TO configured. The API accepted the form but did not store/send it anywhere.'
      : ''

    return res.status(200).json({ ok: true, application_id: row.application_id, supabase, sheet, email, providerLifecycleEmail, warning })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'

    if (
      message.includes('duplicate key') ||
      message.includes('providers_unique_email_lower') ||
      message.includes('providers_unique_phone')
    ) {
      return res.status(409).json({
        error: 'This phone number or email is already registered. If this is your business, please contact Clearout YYC support.'
      })
    }

    return res.status(500).json({ error: message })
  }
}
