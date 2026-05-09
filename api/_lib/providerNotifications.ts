import { supabasePatch, supabaseSelect } from './supabase.js'
import { getProviderSmsBatchLimit, normalizeNorthAmericanSmsPhone, sendTwilioSms } from './providerSms.js'

type NotificationRow = {
  id: string
  claim_url: string
  channel: 'email' | 'sms'
  provider?: { id?: string; provider_token?: string; email?: string; phone?: string; business_name?: string; contact_name?: string; notify_by_sms?: boolean | null; sms_opt_out_at?: string | null }
  lead?: { community_or_postal?: string; area?: string; service_type?: string; job_size?: string; timeline?: string; notes?: string }
}

function escapeHtml(value: unknown) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function sendResendEmail(apiKey: string, payload: Record<string, unknown>) {
  const sendOnce = async () => fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const first = await sendOnce()
  if (first.ok) return

  const firstMessage = await first.text()
  const rateLimited = first.status === 429 || firstMessage.includes('rate_limit_exceeded')

  if (rateLimited) {
    await sleep(1500)
    const retry = await sendOnce()
    if (retry.ok) return
    throw new Error(await retry.text())
  }

  throw new Error(firstMessage)
}

export function getClearoutBaseUrl() {
  return String(process.env.CLEAROUT_BASE_URL || 'https://clearout.aurorasitesolutions.com').replace(/\/+$/, '')
}

export function getProviderEmailBatchLimit(defaultLimit = 200) {
  const raw = Number(process.env.PROVIDER_EMAIL_BATCH_LIMIT || defaultLimit)
  if (!Number.isFinite(raw) || raw <= 0) return defaultLimit
  return Math.min(Math.floor(raw), 500)
}

export async function sendPendingProviderEmails(limit = getProviderEmailBatchLimit()) {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.LEAD_NOTIFY_FROM || 'Clearout YYC <onboarding@resend.dev>'
  if (!apiKey) return { skipped: true, reason: 'RESEND_API_KEY is not configured', pending: 0, sent: 0, failed: 0 }

  const safeLimit = Math.max(1, Math.min(Number(limit) || 200, 500))
  const pending = await supabaseSelect<NotificationRow>(`provider_notifications?select=id,claim_url,channel,provider:providers!provider_notifications_provider_fk(id,provider_token,email,business_name,contact_name),lead:leads!provider_notifications_lead_fk(community_or_postal,area,service_type,job_size,timeline,notes)&status=eq.pending&channel=eq.email&order=created_at.asc&limit=${safeLimit}`)
  let sent = 0
  let failed = 0
  let skipped = 0

  for (const n of pending) {
    const providerEmail = String(n.provider?.email || '').trim()
    if (!providerEmail) {
      await supabasePatch('provider_notifications', `id=eq.${encodeURIComponent(n.id)}`, { status: 'skipped', error_message: 'Provider email missing' })
      skipped += 1
      continue
    }

    const lead = n.lead || {}
    const area = `${lead.community_or_postal || 'Calgary'} ${lead.area || ''}`.trim()
    const serviceType = lead.service_type || 'junk removal'
    const jobSize = lead.job_size || 'not sure'
    const timing = lead.timeline || 'not specified'
    const providerName = n.provider?.business_name || n.provider?.contact_name || 'there'
    const providerId = String(n.provider?.id || '')
    const providerToken = String(n.provider?.provider_token || '')
    const unsubscribeUrl = providerId && providerToken
      ? `${getClearoutBaseUrl()}/api/provider/unsubscribe?provider=${encodeURIComponent(providerId)}&token=${encodeURIComponent(providerToken)}`
      : `${getClearoutBaseUrl()}/provider`
    const subject = `Clearout YYC beta lead — ${area} ${serviceType}`.trim()
    const text = [
      `Hi ${providerName},`,
      '',
      'A new Clearout YYC beta lead is available.',
      '',
      `Area: ${area}`,
      `Type: ${serviceType}`,
      `Size: ${jobSize}`,
      `Timing: ${timing}`,
      '',
      `Claim beta access: ${n.claim_url}`,
      '',
      'Beta access is currently free. Customer contact details are shown only after a successful claim.',
      '',
      'You are receiving this email because you applied as a Clearout YYC provider.',
      'Clearout YYC is operated by Aurora Site Solutions.',
      'Calgary, Alberta, Canada',
      'Contact: contact@aurorasitesolutions.com',
      `Manage or unsubscribe from provider lead emails: ${unsubscribeUrl}`,
      '',
      'Provider support is online only. No phone dispatch.',
    ].join('\n')
    const html = [
      '<h2>New Clearout YYC beta lead</h2>',
      `<p>Hi ${escapeHtml(providerName)},</p>`,
      '<p>A new Clearout YYC beta lead is available.</p>',
      `<p><b>Area:</b> ${escapeHtml(area)}</p>`,
      `<p><b>Type:</b> ${escapeHtml(serviceType)}</p>`,
      `<p><b>Size:</b> ${escapeHtml(jobSize)}</p>`,
      `<p><b>Timing:</b> ${escapeHtml(timing)}</p>`,
      `<p><a href="${escapeHtml(n.claim_url)}">Claim beta access</a></p>`,
      '<p>Beta access is currently free. Customer contact details are shown only after a successful claim.</p>',
      '<hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0" />',
      '<p style="font-size:12px;color:#64748b">You are receiving this email because you applied as a Clearout YYC provider.</p>',
      '<p style="font-size:12px;color:#64748b">Clearout YYC is operated by Aurora Site Solutions.<br/>Calgary, Alberta, Canada<br/>Contact: contact@aurorasitesolutions.com</p>',
      `<p style="font-size:12px;color:#64748b"><a href="${escapeHtml(unsubscribeUrl)}">Manage or unsubscribe from provider lead emails</a></p>`,
      '<p style="font-size:12px;color:#64748b">Provider support is online only. No phone dispatch.</p>',
    ].join('')

    try {
      await sleep(250)
      await sendResendEmail(apiKey, { from, to: [providerEmail], subject, html, text })
      await supabasePatch('provider_notifications', `id=eq.${encodeURIComponent(n.id)}`, { status: 'sent', sent_at: new Date().toISOString(), error_message: null })
      sent += 1
    } catch (err) {
      await supabasePatch('provider_notifications', `id=eq.${encodeURIComponent(n.id)}`, { status: 'failed', error_message: err instanceof Error ? err.message : String(err) })
      failed += 1
    }
  }

  return { skipped: false, pending: pending.length, sent, failed, skippedRows: skipped }
}


export async function sendPendingProviderSms(limit = getProviderSmsBatchLimit()) {
  const safeLimit = Math.max(1, Math.min(Number(limit) || 100, 500))
  const pending = await supabaseSelect<NotificationRow>(`provider_notifications?select=id,claim_url,channel,provider:providers!provider_notifications_provider_fk(id,provider_token,phone,business_name,contact_name,notify_by_sms,sms_opt_out_at),lead:leads!provider_notifications_lead_fk(community_or_postal,area,service_type,job_size,timeline,notes)&status=eq.pending&channel=eq.sms&order=created_at.asc&limit=${safeLimit}`)

  let sent = 0
  let failed = 0
  let skipped = 0

  for (const n of pending) {
    const providerPhone = normalizeNorthAmericanSmsPhone(n.provider?.phone)

    if (!providerPhone) {
      await supabasePatch('provider_notifications', `id=eq.${encodeURIComponent(n.id)}`, {
        status: 'skipped',
        error_message: 'Provider phone missing or invalid',
      })
      skipped += 1
      continue
    }

    if (n.provider?.notify_by_sms === false || n.provider?.sms_opt_out_at) {
      await supabasePatch('provider_notifications', `id=eq.${encodeURIComponent(n.id)}`, {
        status: 'skipped',
        error_message: 'Provider SMS notifications are disabled or opted out',
      })
      skipped += 1
      continue
    }

    const lead = n.lead || {}
    const area = `${lead.community_or_postal || 'Calgary'} ${lead.area || ''}`.trim()
    const serviceType = lead.service_type || 'junk removal'
    const timing = lead.timeline || 'timing not specified'

    const body = [
      `Clearout YYC: New lead in ${area}.`,
      `${serviceType}. ${timing}.`,
      `Claim: ${n.claim_url}`,
      'Reply STOP to opt out.'
    ].join(' ')

    try {
      await sleep(250)
      const result = await sendTwilioSms(providerPhone, body)

      if (result.sent) {
        await supabasePatch('provider_notifications', `id=eq.${encodeURIComponent(n.id)}`, {
          status: 'sent',
          sent_at: new Date().toISOString(),
          error_message: null,
        })
        sent += 1
      } else {
        await supabasePatch('provider_notifications', `id=eq.${encodeURIComponent(n.id)}`, {
          status: result.skipped ? 'skipped' : 'failed',
          error_message: result.reason || result.error || 'Twilio SMS send failed',
        })

        if (result.skipped) skipped += 1
        else failed += 1
      }
    } catch (err) {
      await supabasePatch('provider_notifications', `id=eq.${encodeURIComponent(n.id)}`, {
        status: 'failed',
        error_message: err instanceof Error ? err.message : String(err),
      })
      failed += 1
    }
  }

  return {
    skipped: false,
    pending: pending.length,
    sent,
    failed,
    skippedRows: skipped,
  }
}
