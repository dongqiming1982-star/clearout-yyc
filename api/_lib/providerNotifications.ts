import { supabasePatch, supabaseSelect } from './supabase'

type NotificationRow = {
  id: string
  claim_url: string
  channel: 'email' | 'sms'
  providers?: { email?: string; business_name?: string; contact_name?: string }
  leads?: { community_or_postal?: string; area?: string; service_type?: string; job_size?: string; timeline?: string; notes?: string }
}

export async function sendPendingProviderEmails(limit = 25) {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.LEAD_NOTIFY_FROM || 'Clearout YYC <onboarding@resend.dev>'
  if (!apiKey) return { skipped: true, reason: 'RESEND_API_KEY is not configured', pending: 0, sent: 0, failed: 0 }

  const pending = await supabaseSelect<NotificationRow>(`provider_notifications?select=id,claim_url,channel,providers(email,business_name,contact_name),leads(community_or_postal,area,service_type,job_size,timeline,notes)&status=eq.pending&channel=eq.email&limit=${limit}`)
  let sent = 0
  let failed = 0
  let skipped = 0

  for (const n of pending) {
    const providerEmail = n.providers?.email
    if (!providerEmail) {
      await supabasePatch('provider_notifications', `id=eq.${encodeURIComponent(n.id)}`, { status: 'skipped', error_message: 'Provider email missing' })
      skipped += 1
      continue
    }

    const lead = n.leads || {}
    const subject = `Clearout YYC beta lead — ${lead.community_or_postal || 'Calgary'} ${lead.service_type || ''}`.trim()
    const text = [
      'New Clearout YYC beta lead',
      `Area: ${lead.community_or_postal || 'Calgary'} ${lead.area || ''}`.trim(),
      `Type: ${lead.service_type || 'junk removal'}`,
      `Size: ${lead.job_size || 'not sure'}`,
      `Timing: ${lead.timeline || 'not specified'}`,
      '',
      `Claim beta access: ${n.claim_url}`,
      '',
      'Beta access is currently free. Customer contact details are shown only after a successful claim.',
      'Provider support is online only. No phone dispatch.',
    ].join('\n')
    const html = `<h2>New Clearout YYC beta lead</h2><p><b>Area:</b> ${lead.community_or_postal || 'Calgary'} ${lead.area || ''}</p><p><b>Type:</b> ${lead.service_type || 'junk removal'}</p><p><b>Size:</b> ${lead.job_size || 'not sure'}</p><p><b>Timing:</b> ${lead.timeline || 'not specified'}</p><p><a href="${n.claim_url}">Claim beta access</a></p><p>Beta access is currently free. Customer contact details are shown only after a successful claim.</p><p>Provider support is online only. No phone dispatch.</p>`

    try {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to: [providerEmail], subject, html, text }),
      })
      if (!r.ok) throw new Error(await r.text())
      await supabasePatch('provider_notifications', `id=eq.${encodeURIComponent(n.id)}`, { status: 'sent', sent_at: new Date().toISOString(), error_message: null })
      sent += 1
    } catch (err) {
      await supabasePatch('provider_notifications', `id=eq.${encodeURIComponent(n.id)}`, { status: 'failed', error_message: err instanceof Error ? err.message : String(err) })
      failed += 1
    }
  }

  return { skipped: false, pending: pending.length, sent, failed, skippedRows: skipped }
}
