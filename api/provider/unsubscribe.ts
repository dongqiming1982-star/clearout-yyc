import { supabasePatch } from '../_lib/supabase.js'

function page(title: string, message: string, ok = true) {
  const color = ok ? '#166534' : '#991b1b'
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="robots" content="noindex,nofollow" />
  <title>${title}</title>
  <style>
    body { margin:0; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background:#f8fafc; color:#0f172a; }
    .wrap { min-height:100vh; display:grid; place-items:center; padding:24px; }
    .card { max-width:560px; width:100%; background:white; border:1px solid #e2e8f0; border-radius:24px; padding:32px; box-shadow:0 20px 60px rgba(15,23,42,.08); }
    h1 { margin:0 0 12px; font-size:26px; line-height:1.2; color:${color}; }
    p { margin:10px 0; line-height:1.6; color:#334155; }
    .small { margin-top:24px; font-size:13px; color:#64748b; }
    a { color:#b91c1c; }
  </style>
</head>
<body>
  <main class="wrap">
    <section class="card">
      <h1>${title}</h1>
      <p>${message}</p>
      <p class="small">Clearout YYC is operated by Aurora Site Solutions in Calgary, Alberta, Canada.</p>
      <p class="small">Contact: <a href="mailto:contact@aurorasitesolutions.com">contact@aurorasitesolutions.com</a></p>
    </section>
  </main>
</body>
</html>`
}

export default async function handler(req: any, res: any) {
  try {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
    res.setHeader('Content-Type', 'text/html; charset=utf-8')

    if (req.method !== 'GET') {
      return res.status(405).send(page('Method not allowed', 'This unsubscribe link only supports GET requests.', false))
    }

    const providerId = String(req.query?.provider || req.query?.provider_id || '').trim()
    const token = String(req.query?.token || '').trim()

    if (!providerId || !token) {
      return res.status(400).send(page('Invalid unsubscribe link', 'This unsubscribe link is missing required information.', false))
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
      return res.status(404).send(page('Invalid unsubscribe link', 'This unsubscribe link is invalid or no longer matches an active provider record.', false))
    }

    return res.status(200).send(page(
      'You have been unsubscribed',
      'You will no longer receive Clearout YYC provider lead notification emails. Your provider record remains in the system, but lead email notifications are now turned off.'
    ))
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return res.status(500).send(page('Unsubscribe failed', message, false))
  }
}
