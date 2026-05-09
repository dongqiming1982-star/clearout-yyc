import { supabasePatch } from './supabase.js'

type ProviderLifecycleRow = {
  id?: string
  business_name?: string
  contact_name?: string
  email?: string
  provider_token?: string
  application_email_sent_at?: string | null
  approval_email_sent_at?: string | null
}

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function getClearoutBaseUrl() {
  return String(process.env.CLEAROUT_BASE_URL || 'https://clearout.aurorasitesolutions.com').replace(/\/+$/, '')
}

function preferenceLink(provider: ProviderLifecycleRow) {
  if (!provider.id || !provider.provider_token) return `${getClearoutBaseUrl()}/api/provider/unsubscribe`
  return `${getClearoutBaseUrl()}/api/provider/unsubscribe?provider=${encodeURIComponent(provider.id)}&token=${encodeURIComponent(provider.provider_token)}`
}

async function sendProviderLifecycleEmail(provider: ProviderLifecycleRow, subject: string, html: string, text: string) {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.LEAD_NOTIFY_FROM || 'Clearout YYC <leads@mail.aurorasitesolutions.com>'
  const to = String(provider.email || '').trim()

  if (!apiKey || !to) {
    return { skipped: true, reason: 'Missing RESEND_API_KEY or provider email.' }
  }

  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [to], subject, html, text }),
  })

  if (!r.ok) {
    return { skipped: false, sent: false, error: await r.text() }
  }

  return { skipped: false, sent: true }
}

export async function sendProviderApplicationReceivedEmail(provider: ProviderLifecycleRow) {
  if (!provider?.id) return { skipped: true, reason: 'Missing provider id.' }
  if (provider.application_email_sent_at) return { skipped: true, reason: 'Application email already sent.' }

  const name = provider.business_name || provider.contact_name || 'Provider'
  const link = preferenceLink(provider)
  const subject = 'Clearout YYC provider application received'

  const text = [
    `Hi ${name},`,
    '',
    'We received your Clearout YYC provider application.',
    '',
    'Your application is pending review. If approved, you will receive an approval email before receiving customer lead alerts.',
    '',
    `Manage email preferences: ${link}`,
    '',
    'Clearout YYC is operated by Aurora Site Solutions.',
    'Calgary, Alberta, Canada',
    'Contact: contact@aurorasitesolutions.com',
  ].join('\n')

  const html = [
    `<p>Hi ${escapeHtml(name)},</p>`,
    '<p>We received your Clearout YYC provider application.</p>',
    '<p>Your application is pending review. If approved, you will receive an approval email before receiving customer lead alerts.</p>',
    `<p><a href="${escapeHtml(link)}">Manage email preferences</a></p>`,
    '<hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0" />',
    '<p style="font-size:12px;color:#64748b">Clearout YYC is operated by Aurora Site Solutions.<br/>Calgary, Alberta, Canada<br/>Contact: contact@aurorasitesolutions.com</p>',
  ].join('')

  const sent = await sendProviderLifecycleEmail(provider, subject, html, text)

  if (sent.sent) {
    await supabasePatch(
      'providers',
      `id=eq.${encodeURIComponent(provider.id)}`,
      { application_email_sent_at: new Date().toISOString() }
    )
  }

  return sent
}

export async function sendProviderApprovalEmail(provider: ProviderLifecycleRow) {
  if (!provider?.id) return { skipped: true, reason: 'Missing provider id.' }
  if (provider.approval_email_sent_at) return { skipped: true, reason: 'Approval email already sent.' }

  const name = provider.business_name || provider.contact_name || 'Provider'
  const link = preferenceLink(provider)
  const subject = 'Your Clearout YYC provider application was approved'

  const text = [
    `Hi ${name},`,
    '',
    'Your Clearout YYC provider application has been approved.',
    '',
    'You may now receive Clearout YYC lead notifications when eligible customer requests are available.',
    '',
    `Manage email preferences: ${link}`,
    '',
    'Clearout YYC is operated by Aurora Site Solutions.',
    'Calgary, Alberta, Canada',
    'Contact: contact@aurorasitesolutions.com',
  ].join('\n')

  const html = [
    `<p>Hi ${escapeHtml(name)},</p>`,
    '<p>Your Clearout YYC provider application has been approved.</p>',
    '<p>You may now receive Clearout YYC lead notifications when eligible customer requests are available.</p>',
    `<p><a href="${escapeHtml(link)}">Manage email preferences</a></p>`,
    '<hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0" />',
    '<p style="font-size:12px;color:#64748b">Clearout YYC is operated by Aurora Site Solutions.<br/>Calgary, Alberta, Canada<br/>Contact: contact@aurorasitesolutions.com</p>',
  ].join('')

  const sent = await sendProviderLifecycleEmail(provider, subject, html, text)

  if (sent.sent) {
    await supabasePatch(
      'providers',
      `id=eq.${encodeURIComponent(provider.id)}`,
      { approval_email_sent_at: new Date().toISOString() }
    )
  }

  return sent
}
