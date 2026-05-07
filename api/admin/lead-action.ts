import { assertAdmin, handleAdminError, supabaseAdminFetch } from '../_lib/admin.js'

function daysFromNow(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
}

export default async function handler(req: any, res: any) {
  try {
    assertAdmin(req)
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

    const leadId = String(req.body?.lead_id || '')
    const action = String(req.body?.action || '')

    if (!leadId) return res.status(400).json({ error: 'Missing lead_id' })

    let patch: any = {}

    if (action === 'publish') {
      patch = {
        status: 'published',
        publish_at: new Date().toISOString(),
        published_at: new Date().toISOString(),
        expires_at: daysFromNow(7),
      }
    } else if (action === 'expire') {
      patch = { status: 'expired' }
    } else if (action === 'queue') {
      patch = { status: 'queued' }
    } else {
      return res.status(400).json({ error: 'Unknown action' })
    }

    const updated = await supabaseAdminFetch(
      `leads?id=eq.${encodeURIComponent(leadId)}`,
      { method: 'PATCH', body: JSON.stringify(patch) }
    )

    return res.status(200).json({ ok: true, lead: Array.isArray(updated) ? updated[0] : updated })
  } catch (e) {
    return handleAdminError(res, e)
  }
}
