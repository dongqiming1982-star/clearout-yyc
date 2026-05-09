import { supabasePatch, supabaseSelect } from '../_lib/supabase.js'

type ProviderRow = {
  id: string
  business_name?: string
  contact_name?: string
  email?: string
  provider_token?: string
  notify_by_email?: boolean | null
  email_unsubscribed_at?: string | null
  email_unsubscribe_reason?: string | null
  email_resubscribed_at?: string | null
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

function layout(title: string, body: string, ok = true) {
  const color = ok ? '#166534' : '#991b1b'

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="robots" content="noindex,nofollow" />
  <title>${escapeHtml(title)}</title>
  <style>
    body {
      margin: 0;
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: #f8fafc;
      color: #0f172a;
    }
    .wrap {
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: 24px;
    }
    .card {
      max-width: 600px;
      width: 100%;
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 24px;
      padding: 32px;
      box-shadow: 0 20px 60px rgba(15, 23, 42, .08);
    }
    h1 {
      margin: 0 0 12px;
      font-size: 26px;
      line-height: 1.2;
      color: ${color};
    }
    p {
      margin: 10px 0;
      line-height: 1.6;
      color: #334155;
    }
    .status {
      margin: 18px 0;
      padding: 14px 16px;
      border-radius: 16px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      font-weight: 700;
      color: #0f172a;
    }
    .small {
      margin-top: 24px;
      font-size: 13px;
      color: #64748b;
    }
    input {
      box-sizing: border-box;
      width: 100%;
      border: 1px solid #cbd5e1;
      border-radius: 14px;
      padding: 13px 14px;
      font-size: 15px;
      margin-top: 12px;
    }
    button {
      margin-top: 18px;
      width: 100%;
      border: 0;
      border-radius: 999px;
      padding: 14px 18px;
      background: #991b1b;
      color: white;
      font-weight: 700;
      font-size: 15px;
      cursor: pointer;
    }
    button.secondary {
      background: #0f172a;
    }
    a {
      color: #b91c1c;
    }
  </style>
</head>
<body>
  <main class="wrap">
    <section class="card">
      ${body}
      <p class="small">Clearout YYC is operated by Aurora Site Solutions in Calgary, Alberta, Canada.</p>
      <p class="small">Contact: <a href="mailto:contact@aurorasitesolutions.com">contact@aurorasitesolutions.com</a></p>
    </section>
  </main>
</body>
</html>`
}

function messagePage(title: string, message: string, ok = true) {
  return layout(title, `<h1>${escapeHtml(title)}</h1><p>${escapeHtml(message)}</p>`, ok)
}

function requestLinkPage(sent = false) {
  if (sent) {
    return layout(
      'Check your email',
      `<h1>Check your email</h1>
      <p>If this email matches an approved Clearout YYC provider record, we have sent a secure email preferences link.</p>
      <p>Please open that email to manage your lead notification settings.</p>`
    )
  }

  return layout(
    'Manage provider email preferences',
    `<h1>Manage provider email preferences</h1>
    <p>Already applied as a Clearout YYC provider?</p>
    <p>Enter your provider email address and we will send you a secure link to manage lead notification emails.</p>
    <form method="POST" action="/api/provider/unsubscribe?action=request-link">
      <input type="email" name="email" placeholder="provider@example.com" required />
      <button type="submit">Send preferences link</button>
    </form>`
  )
}

function preferencesPage(provider: ProviderRow) {
  const providerId = provider.id
  const token = provider.provider_token || ''
  const isOn = provider.notify_by_email !== false
  const name = provider.business_name || provider.contact_name || 'Provider'

  const status = isOn
    ? 'Lead emails are currently ON.'
    : 'Lead emails are currently OFF.'

  const action = isOn ? 'unsubscribe' : 'resubscribe'
  const button = isOn ? 'Turn lead emails off' : 'Turn lead emails back on'
  const buttonClass = isOn ? '' : 'secondary'
  const note = isOn
    ? 'You may stop receiving Clearout YYC provider lead emails at any time.'
    : 'If this was a mistake, you can turn lead emails back on. Future lead emails may be sent to you again.'

  return layout(
    'Clearout YYC email preferences',
    `<h1>Clearout YYC email preferences</h1>
    <p>${escapeHtml(name)}</p>
    <div class="status">${escapeHtml(status)}</div>
    <p>${escapeHtml(note)}</p>
    <form method="POST" action="/api/provider/unsubscribe?action=${action}&provider=${encodeURIComponent(providerId)}&token=${encodeURIComponent(token)}">
      <input type="hidden" name="provider" value="${escapeHtml(providerId)}" />
      <input type="hidden" name="token" value="${escapeHtml(token)}" />
      <button class="${buttonClass}" type="submit">${escapeHtml(button)}</button>
    </form>`
  )
}

function getBodyValue(req: any, name: string) {
  const body = req.body

  if (body && typeof body === 'object') {
    return body[name]
  }

  if (typeof body === 'string') {
    try {
      return new URLSearchParams(body).get(name)
    } catch {
      return ''
    }
  }

  return ''
}

function getField(req: any, name: string) {
  const fromBody = getBodyValue(req, name)
  const fromQuery = req.query && typeof req.query === 'object' ? req.query[name] : undefined
  return String(fromBody || fromQuery || '').trim()
}

async function getProviderByToken(providerId: string, token: string) {
  const rows = await supabaseSelect<ProviderRow>(
    `providers?select=id,business_name,contact_name,email,provider_token,notify_by_email,email_unsubscribed_at,email_unsubscribe_reason,email_resubscribed_at&id=eq.${encodeURIComponent(providerId)}&provider_token=eq.${encodeURIComponent(token)}&limit=1`
  )
  return rows[0] || null
}

async function getProviderByEmail(email: string) {
  const rows = await supabaseSelect<ProviderRow>(
    `providers?select=id,business_name,contact_name,email,provider_token,notify_by_email&email=eq.${encodeURIComponent(email.toLowerCase())}&limit=1`
  )
  return rows[0] || null
}

async function sendPreferenceLink(provider: ProviderRow) {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.LEAD_NOTIFY_FROM || 'Clearout YYC <leads@mail.aurorasitesolutions.com>'
  const to = provider.email
  const providerId = provider.id
  const token = provider.provider_token

  if (!apiKey || !to || !providerId || !token) return

  const link = `${getClearoutBaseUrl()}/api/provider/unsubscribe?provider=${encodeURIComponent(providerId)}&token=${encodeURIComponent(token)}`
  const subject = 'Manage your Clearout YYC lead email preferences'

  const text = [
    'You requested a secure link to manage your Clearout YYC provider lead email preferences.',
    '',
    link,
    '',
    'If you did not request this email, you can ignore it.',
    '',
    'Clearout YYC is operated by Aurora Site Solutions.',
    'Calgary, Alberta, Canada',
    'Contact: contact@aurorasitesolutions.com',
  ].join('\n')

  const html = [
    '<p>You requested a secure link to manage your Clearout YYC provider lead email preferences.</p>',
    `<p><a href="${escapeHtml(link)}">Manage lead email preferences</a></p>`,
    '<p>If you did not request this email, you can ignore it.</p>',
    '<hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0" />',
    '<p style="font-size:12px;color:#64748b">Clearout YYC is operated by Aurora Site Solutions.<br/>Calgary, Alberta, Canada<br/>Contact: contact@aurorasitesolutions.com</p>',
  ].join('')

  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [to], subject, html, text }),
  })

  if (!r.ok) throw new Error(await r.text())

  await supabasePatch<any>(
    'providers',
    `id=eq.${encodeURIComponent(providerId)}`,
    { email_preference_link_requested_at: new Date().toISOString() }
  )
}

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
  res.setHeader('Content-Type', 'text/html; charset=utf-8')

  try {
    const action = getField(req, 'action')
    const providerId = getField(req, 'provider') || getField(req, 'provider_id')
    const token = getField(req, 'token')

    if (req.method === 'GET') {
      if (!providerId && !token) {
        return res.status(200).send(requestLinkPage(false))
      }

      if (!providerId || !token) {
        return res.status(400).send(
          messagePage('Invalid preferences link', 'This email preferences link is missing required information.', false)
        )
      }

      const provider = await getProviderByToken(providerId, token)
      if (!provider) {
        return res.status(404).send(
          messagePage('Invalid preferences link', 'This email preferences link is invalid or no longer matches a provider record.', false)
        )
      }

      return res.status(200).send(preferencesPage(provider))
    }

    if (req.method !== 'POST') {
      return res.status(405).send(
        messagePage('Method not allowed', 'This email preferences page only supports GET and POST requests.', false)
      )
    }

    if (action === 'request-link') {
      const email = getField(req, 'email').toLowerCase()
      if (email) {
        const provider = await getProviderByEmail(email)
        if (provider) await sendPreferenceLink(provider)
      }

      return res.status(200).send(requestLinkPage(true))
    }

    if (!providerId || !token) {
      return res.status(400).send(
        messagePage('Invalid preferences link', 'This email preferences request is missing required information.', false)
      )
    }

    const provider = await getProviderByToken(providerId, token)
    if (!provider) {
      return res.status(404).send(
        messagePage('Invalid preferences link', 'This email preferences link is invalid or no longer matches a provider record.', false)
      )
    }

    if (action === 'resubscribe') {
      await supabasePatch<any>(
        'providers',
        `id=eq.${encodeURIComponent(providerId)}&provider_token=eq.${encodeURIComponent(token)}`,
        {
          notify_by_email: true,
          email_resubscribed_at: new Date().toISOString(),
          email_resubscribe_source: 'provider_self_service',
          email_unsubscribe_reason: null,
        }
      )

      return res.status(200).send(
        messagePage('Lead emails are back on', 'You will receive Clearout YYC provider lead notification emails again.')
      )
    }

    if (action === 'unsubscribe') {
      await supabasePatch<any>(
        'providers',
        `id=eq.${encodeURIComponent(providerId)}&provider_token=eq.${encodeURIComponent(token)}`,
        {
          notify_by_email: false,
          email_unsubscribed_at: new Date().toISOString(),
          email_unsubscribe_reason: 'provider_lead_email_unsubscribe',
        }
      )

      return res.status(200).send(
        messagePage('You have been unsubscribed', 'You will no longer receive Clearout YYC provider lead notification emails.')
      )
    }

    return res.status(400).send(
      messagePage('Invalid request', 'This email preferences action is not supported.', false)
    )
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return res.status(500).send(messagePage('Email preferences failed', message, false))
  }
}
