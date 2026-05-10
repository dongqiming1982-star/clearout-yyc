import { supabaseRpc, supabaseSelect } from '../_lib/supabase.js'
import { getClearoutBaseUrl, getProviderEmailBatchLimit, sendPendingProviderEmails, sendPendingProviderSms } from '../_lib/providerNotifications.js'
import { cleanupExpiredLeadPhotos } from '../_lib/leadPhotos.js'

type LeadRow = { public_id: string }

function authOk(req: any) {
  const secret = process.env.CRON_SECRET
  if (!secret) return true
  const header = String(req.headers?.authorization || '')
  return header === `Bearer ${secret}`
}

export default async function handler(req: any, res: any) {
  try {
    if (!['GET', 'POST'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed' })
    if (!authOk(req)) return res.status(401).json({ error: 'Unauthorized' })

    const publishedCount = await supabaseRpc<number>('publish_due_leads')

    const published = await supabaseSelect<LeadRow>('leads?select=public_id&status=eq.published&order=published_at.desc&limit=50')
    let notificationRecords = 0
    for (const lead of published) {
      const count = await supabaseRpc<number>('create_provider_notifications_for_lead', {
        p_lead_public_id: lead.public_id,
        p_base_url: getClearoutBaseUrl(),
      })
      notificationRecords += Number(count || 0)
    }

    const emailSend = await sendPendingProviderEmails(getProviderEmailBatchLimit())
    const smsSend = await sendPendingProviderSms()
    const photoCleanup = await cleanupExpiredLeadPhotos()
    return res.status(200).json({ ok: true, publishedCount, notificationRecords, emailSend, smsSend, photoCleanup })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return res.status(500).json({ error: message })
  }
}
