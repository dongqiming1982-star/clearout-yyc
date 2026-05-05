import { appendToGoogleSheet, flatProviderApplication, providerApplicationEmail, sendResendEmail, verifyTurnstileIfConfigured } from './_lib/launch'

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
    const { application, turnstileToken, source_url } = req.body || {}
    if (!application || typeof application !== 'object') return res.status(400).json({ error: 'Missing application payload' })

    await verifyTurnstileIfConfigured(turnstileToken, req.headers?.['x-forwarded-for'])

    const row = flatProviderApplication(application, String(source_url || req.headers?.referer || ''))
    const sheet = await appendToGoogleSheet('provider_application', row, application)
    const emailBody = providerApplicationEmail(row)
    const email = await sendResendEmail(emailBody.subject, emailBody.html, emailBody.text)

    const warning = sheet.skipped && email.skipped
      ? 'No SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY, GOOGLE_SHEETS_WEBHOOK_URL, or RESEND_API_KEY/LEAD_NOTIFY_TO configured. The API accepted the form but did not store/send it anywhere.'
      : ''

    return res.status(200).json({ ok: true, application_id: row.application_id, sheet, email, warning })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return res.status(500).json({ error: message })
  }
}
