import { assertAdmin, handleAdminError, supabaseAdminFetch } from '../_lib/admin.js'

export default async function handler(req: any, res: any) {
  try {
    assertAdmin(req)
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

    const providers: any[] = await supabaseAdminFetch('providers?select=id,approved,active&limit=1000')
    const leads: any[] = await supabaseAdminFetch('leads?select=id,status&limit=1000')
    const claims: any[] = await supabaseAdminFetch('lead_claims?select=id,access,status&limit=1000')

    const leadStatus: Record<string, number> = {}
    for (const lead of leads) leadStatus[lead.status] = (leadStatus[lead.status] || 0) + 1

    return res.status(200).json({
      ok: true,
      summary: {
        providers_total: providers.length,
        providers_pending: providers.filter(p => !p.approved).length,
        providers_active: providers.filter(p => p.approved && p.active).length,
        leads_total: leads.length,
        lead_status: leadStatus,
        claims_total: claims.length,
        claims_shared: claims.filter(c => c.access === 'shared').length,
        claims_exclusive: claims.filter(c => c.access === 'exclusive').length,
      },
    })
  } catch (e) {
    return handleAdminError(res, e)
  }
}
