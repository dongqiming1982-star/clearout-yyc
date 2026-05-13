import { verifyManualCaptcha } from './_lib/manualCaptcha.js'
import { normalizeNorthAmericanPhone, normalizeOptionalEmail } from './_lib/validation.js'
import { appendToGoogleSheet, customerLeadEmail, flatCustomerLead, sendResendEmail, verifyTurnstileIfConfigured } from './_lib/launch.js'
import { hasSupabaseConfig, supabaseRpc, supabasePatch, supabaseSelect } from './_lib/supabase.js'
import { getPlatformSettings } from './_lib/platformSettings.js'
import { getClearoutBaseUrl, getProviderEmailBatchLimit, sendPendingProviderEmails, sendPendingProviderSms } from './_lib/providerNotifications.js'
import { uploadLeadPhotosForLead } from './_lib/leadPhotos.js'
import { normalizeDispatchArea, normalizeLeadServiceType } from './_lib/taxonomy.js'

const CUSTOMER_DESCRIPTION_MAX = 150

function firstText(value: unknown) {
  return Array.isArray(value) ? value.filter(Boolean).join(', ') : String(value || '')
}

function serviceTypeFromLead(lead: any) {
  if (Array.isArray(lead?.service_tags) && lead.service_tags.length) return normalizeLeadServiceType(lead.service_tags)
  if (Array.isArray(lead?.request_categories) && lead.request_categories.length) return normalizeLeadServiceType(lead.request_categories)
  return 'general_review'
}


async function hasRecentPhoneVerification(phone: string, verificationType: string) {
  const since = new Date(Date.now() - 15 * 60 * 1000).toISOString()
  const rows = await supabaseSelect<any>(
    `verification_sessions?select=id,verified_at&phone=eq.${encodeURIComponent(phone)}&verification_type=eq.${encodeURIComponent(verificationType)}&status=eq.verified&verified_at=gte.${encodeURIComponent(since)}&order=verified_at.desc&limit=1`
  )
  return rows.length > 0
}

function mapLeadToRpc(lead: any, sourceUrl: string) {
  return {
    p_customer_name: String(lead?.customer_name || ''),
    p_customer_phone: String(lead?.customer_phone || ''),
    p_customer_email: String(lead?.customer_email || ''),
    p_community_slug: String(lead?.community_slug || ''),
    p_community_or_postal: String(lead?.community_or_postal || ''),
    p_area: normalizeDispatchArea(lead?.area, lead?.community_or_postal),
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
    const { lead, turnstileToken, source_url, manualCaptcha, leadPhotos } = req.body || {}
    if (!lead || typeof lead !== 'object') return res.status(400).json({ error: 'Missing lead payload' })

    if (!Array.isArray(leadPhotos) || leadPhotos.length < 1) {
      return res.status(400).json({ error: 'Please upload at least one photo before submitting.' })
    }

    if (leadPhotos.length > 2) {
      return res.status(400).json({ error: 'You can upload up to 2 photos.' })
    }

    const platformSettings = await getPlatformSettings()
    if (!platformSettings.customer_requests_enabled) {
      return res.status(503).json({
        error: 'Clearout YYC is temporarily not accepting new requests. Please check back later.',
        code: 'customer_requests_paused',
      })
    }

    const captchaCheck = verifyManualCaptcha(manualCaptcha)
    if (!captchaCheck.ok) return res.status(400).json({ error: captchaCheck.error })

    await verifyTurnstileIfConfigured(turnstileToken, req.headers?.['x-forwarded-for'])

    const normalizedCustomerPhone = normalizeNorthAmericanPhone(lead.customer_phone)
    if (!normalizedCustomerPhone) {
      return res.status(400).json({ error: 'Please enter a valid Canadian phone number, such as 403-555-1234.' })
    }

    if (!hasSupabaseConfig()) {
      return res.status(500).json({
        error: 'Phone verification is not configured. Please try again later.',
        code: 'phone_verification_not_configured',
      })
    }

    const phoneVerified = await hasRecentPhoneVerification(normalizedCustomerPhone, 'customer_lead')
    if (!phoneVerified) {
      return res.status(403).json({
        error: 'Please verify your phone number before submitting your request.',
        code: 'phone_not_verified',
      })
    }

    const normalizedCustomerEmail = normalizeOptionalEmail(lead.customer_email)
    if (normalizedCustomerEmail === null) {
      return res.status(400).json({ error: 'Please enter a valid email address, or leave this field blank.' })
    }

    lead.customer_phone = normalizedCustomerPhone
    lead.customer_email = normalizedCustomerEmail

    const requestDescription = String(lead.request_description || '').trim()
    if (requestDescription.length > CUSTOMER_DESCRIPTION_MAX) {
      return res.status(400).json({
        error: `Description is too long. Please keep it under ${CUSTOMER_DESCRIPTION_MAX} characters.`,
        code: 'description_too_long',
      })
    }
    lead.request_description = requestDescription
    lead.area = normalizeDispatchArea(lead.area, lead.community_or_postal)
    lead.service_tags = [serviceTypeFromLead(lead)]

    const sourceUrl = String(source_url || req.headers?.referer || '')
    const row = flatCustomerLead(lead, sourceUrl)
    let supabase: any = { skipped: true }
    let notificationRecords: any = { skipped: true }
    let providerEmailSend: any = { skipped: true }
    let providerSmsSend: any = { skipped: true }
    let photoUpload: any = { skipped: true, reason: 'No accepted Supabase lead yet.' }

    if (hasSupabaseConfig()) {
      const created = await supabaseRpc<any>('create_public_lead', mapLeadToRpc(lead, sourceUrl))
      supabase = { skipped: false, result: created }

      if (created?.lead_public_id) {
        await supabasePatch(
          'leads',
          `public_id=eq.${encodeURIComponent(created.lead_public_id)}`,
          {
            phone_verified: true,
            verification_status: 'verified',
          }
        )

        supabase = {
          ...supabase,
          result: {
            ...created,
            phone_verified: true,
            verification_status: 'verified',
          },
        }
      }

      if (created?.accepted && created?.lead_public_id) {
        const photoPayload = leadPhotos.slice(0, 2)
        if (photoPayload.length) {
          const leadRows = await supabaseSelect<any>(`leads?select=id,public_id&public_id=eq.${encodeURIComponent(created.lead_public_id)}&limit=1`)
          const savedLead = leadRows[0]
          if (savedLead?.id) {
            photoUpload = await uploadLeadPhotosForLead(savedLead.id, created.lead_public_id, photoPayload)
          } else {
            photoUpload = { skipped: true, reason: 'Lead was accepted but could not be reloaded for photo upload.' }
          }
        } else {
          photoUpload = { skipped: false, attempted: 0, uploaded: 0, failed: 0, errors: [] }
        }

        if (!platformSettings.lead_dispatch_enabled) {
          await supabasePatch(
            'leads',
            `public_id=eq.${encodeURIComponent(created.lead_public_id)}`,
            {
              status: 'queued',
              publish_at: null,
              published_at: null,
            }
          )

          supabase = {
            ...supabase,
            result: {
              ...created,
              status: 'queued',
              dispatch_paused: true,
            },
          }

          notificationRecords = {
            skipped: true,
            reason: 'Lead dispatch is paused. Lead was queued instead of published.',
            created: 0,
          }
        } else if (created?.status === 'published') {
          const count = await supabaseRpc<number>('create_provider_notifications_for_lead', {
            p_lead_public_id: created.lead_public_id,
            p_base_url: getClearoutBaseUrl(),
          })
          notificationRecords = { skipped: false, created: count }
          providerEmailSend = await sendPendingProviderEmails(getProviderEmailBatchLimit())
          providerSmsSend = await sendPendingProviderSms()
        }
      }
    }

    // Optional legacy launch notifications. These are skipped unless configured.
    const sheet = await appendToGoogleSheet('customer_lead', row, lead)
    const emailBody = customerLeadEmail(row)
    const email = await sendResendEmail(emailBody.subject, emailBody.html, emailBody.text)

    const warning = supabase.skipped && sheet.skipped && email.skipped
      ? 'No SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY, GOOGLE_SHEETS_WEBHOOK_URL, or RESEND_API_KEY/LEAD_NOTIFY_TO configured. The API accepted the form but did not store/send it anywhere.'
      : ''

    return res.status(200).json({ ok: true, lead_id: row.lead_id, supabase, photoUpload, notificationRecords, providerEmailSend, providerSmsSend, createdDispatches: notificationRecords.created || 0, sheet, email, warning })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return res.status(500).json({ error: message })
  }
}
