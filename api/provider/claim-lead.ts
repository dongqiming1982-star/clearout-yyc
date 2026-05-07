import { supabaseRpc } from '../_lib/supabase.js'

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
    const { lead_public_id, lead, token, access } = req.body || {}
    const leadId = String(lead_public_id || lead || '')
    const providerToken = String(token || '')
    const accessType = access === 'exclusive' ? 'exclusive' : 'shared'
    if (!leadId || !providerToken) return res.status(400).json({ error: 'Missing lead or token' })
    const result = await supabaseRpc<any>('claim_lead_free_beta', {
      p_lead_public_id: leadId,
      p_provider_token: providerToken,
      p_access: accessType,
    })
    if (result?.ok === false) return res.status(409).json({ error: result.message || 'Claim unavailable', result })
    const normalized = {
      ...result,
      lead_public_id: leadId,
      customer_name: result?.customer?.name || '',
      customer_phone: result?.customer?.phone || '',
      customer_email: result?.customer?.email || '',
      community_or_postal: result?.customer?.community_or_postal || '',
      area: result?.customer?.area || '',
      request_description: result?.customer?.notes || '',
      claim_position: result?.shared_claim_count || (result?.access === 'exclusive' ? 1 : undefined),
      shared_claim_limit: result?.shared_limit || 3,
    }
    return res.status(200).json({ ok: true, result: normalized })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return res.status(500).json({ error: message })
  }
}
