import { assertAdmin, handleAdminError, supabaseAdminFetch } from '../_lib/admin.js'

export default async function handler(req: any, res: any) {
  try {
    assertAdmin(req)
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

    const providerId = String(req.body?.provider_id || '')
    const action = String(req.body?.action || '')

    if (!providerId) return res.status(400).json({ error: 'Missing provider_id' })

    let patch: any = {}

    if (action === 'approve') patch = { approved: true, active: true }
    else if (action === 'suspend') patch = { active: false }
    else if (action === 'activate') patch = { active: true }
    else if (action === 'deactivate') patch = { active: false }
    else return res.status(400).json({ error: 'Unknown action' })

    const updated = await supabaseAdminFetch(
      `providers?id=eq.${encodeURIComponent(providerId)}`,
      { method: 'PATCH', body: JSON.stringify(patch) }
    )

    return res.status(200).json({ ok: true, provider: Array.isArray(updated) ? updated[0] : updated })
  } catch (e) {
    return handleAdminError(res, e)
  }
}
