import { assertAdmin, handleAdminError, supabaseAdminFetch } from '../_lib/admin.js'

export default async function handler(req: any, res: any) {
  try {
    assertAdmin(req)
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

    const claims: any[] = await supabaseAdminFetch(
      'lead_claims?select=id,lead_id,provider_id,access,status,created_at&order=created_at.desc&limit=200'
    )

    const leadIds = [...new Set(claims.map(c => c.lead_id).filter(Boolean))]
    const providerIds = [...new Set(claims.map(c => c.provider_id).filter(Boolean))]

    const leads: any[] = leadIds.length
      ? await supabaseAdminFetch(`leads?select=id,public_id,status,customer_name,customer_phone,customer_email,community_or_postal,service_type&id=in.(${leadIds.join(',')})`)
      : []

    const providers: any[] = providerIds.length
      ? await supabaseAdminFetch(`providers?select=id,business_name,email,phone&id=in.(${providerIds.join(',')})`)
      : []

    const leadMap = Object.fromEntries(leads.map(l => [l.id, l]))
    const providerMap = Object.fromEntries(providers.map(p => [p.id, p]))

    const enriched = claims.map(c => ({
      ...c,
      lead: leadMap[c.lead_id] || null,
      provider: providerMap[c.provider_id] || null,
    }))

    return res.status(200).json({ ok: true, claims: enriched })
  } catch (e) {
    return handleAdminError(res, e)
  }
}
