import { supabasePatch } from '../_lib/supabase.js'

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
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
      max-width: 560px;
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
    .small {
      margin-top: 24px;
      font-size: 13px;
      color: #64748b;
    }
    button {
      margin-top: 22px;
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

function confirmPage(providerId: string, token: string) {
  return layout(
    'Confirm unsubscribe',
    `<h1>Confirm unsubscribe</h1>
    <p>You are about to unsubscribe from Clearout YYC provider lead notification emails.</p>
    <p>Your provider record will remain in our system, but you will no longer receive new lead emails.</p>
    <form method="POST" action="/api/provider/unsubscribe">
      <input type="hidden" name="provider" value="${escapeHtml(providerId)}" />
      <input type="hidden" name="token" value="${escapeHtml(token)}" />
      <button type="submit">Confirm unsubscribe</button>
    </form>`,
    true
  )
}

function messagePage(title: string, message: string, ok = true) {
  return layout(
    title,
    `<h1>${escapeHtml(title)}</h1><p>${escapeHtml(message)}</p>`,
    ok
  )
}

function getField(req: any, name: string) {
  const fromBody = req.body && typeof req.body === 'object' ? req.body[name] : undefined
  const fromQuery = req.query && typeof req.query === 'object' ? req.query[name] : undefined
  return String(fromBody || fromQuery || '').trim()
}

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
  res.setHeader('Content-Type', 'text/html; charset=utf-8')

  try {
    const providerId = getField(req, 'provider') || getField(req, 'provider_id')
    const token = getField(req, 'token')

    if (!providerId || !token) {
      return res.status(400).send(
        messagePage('Invalid unsubscribe link', 'This unsubscribe link is missing required information.', false)
      )
    }

    if (req.method === 'GET') {
      return res.status(200).send(confirmPage(providerId, token))
    }

    if (req.method !== 'POST') {
      return res.status(405).send(
        messagePage('Method not allowed', 'This unsubscribe link only supports confirmation through the unsubscribe page.', false)
      )
    }

    const updated = await supabasePatch<any>(
      'providers',
      `id=eq.${encodeURIComponent(providerId)}&provider_token=eq.${encodeURIComponent(token)}`,
      {
        notify_by_email: false,
        email_unsubscribed_at: new Date().toISOString(),
        email_unsubscribe_reason: 'provider_lead_email_unsubscribe',
      }
    )

    if (!Array.isArray(updated) || updated.length === 0) {
      return res.status(404).send(
        messagePage('Invalid unsubscribe link', 'This unsubscribe link is invalid or no longer matches a provider record.', false)
      )
    }

    return res.status(200).send(
      messagePage(
        'You have been unsubscribed',
        'You will no longer receive Clearout YYC provider lead notification emails.'
      )
    )
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return res.status(500).send(messagePage('Unsubscribe failed', message, false))
  }
}
