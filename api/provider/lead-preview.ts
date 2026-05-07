import { supabaseRpc } from '../_lib/supabase.js'

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
    const lead = String(req.query?.lead || req.query?.lead_public_id || '')
    const token = String(req.query?.token || '')
    if (!lead || !token) return res.status(400).json({ error: 'Missing lead or token' })
    const result = await supabaseRpc<any>('get_provider_lead_preview', {
      p_lead_public_id: lead,
      p_provider_token: token,
    })
    if (result?.ok === false) return res.status(403).json({ error: result.message || 'Cannot load lead', result })
    return res.status(200).json({ ok: true, result })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return res.status(500).json({ error: message })
  }
}
