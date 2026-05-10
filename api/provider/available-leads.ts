import { supabaseSelect } from '../_lib/supabase.js'
import { normalizeDispatchArea, normalizeLeadServiceType, normalizeProviderDispatchAreas, normalizeProviderServiceTypes } from '../_lib/taxonomy.js'

type ProviderRow = { id: string; provider_token: string; approved: boolean; active: boolean; service_areas?: string[]; service_types?: string[] }
type LeadRow = {
  public_id: string
  community_or_postal: string
  area: string
  service_type: string
  job_size: string
  timeline: string
  notes: string
  status: string
  shared_claim_count: number
  shared_limit: number
  expires_at: string
}


export default async function handler(req: any, res: any) {
  try {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
    const token = String(req.query?.token || '')
    if (!token) return res.status(400).json({ error: 'Missing provider token' })

    const providers = await supabaseSelect<ProviderRow>(`providers?select=id,provider_token,approved,active,service_areas,service_types&provider_token=eq.${encodeURIComponent(token)}&approved=eq.true&active=eq.true&limit=1`)
    if (!providers.length) return res.status(403).json({ error: 'Provider is not approved or token is invalid.' })

    const provider = providers[0]
    const providerAreas = normalizeProviderDispatchAreas(provider.service_areas)
    const providerTypes = normalizeProviderServiceTypes(provider.service_types)

    const leads = await supabaseSelect<LeadRow>('leads?select=public_id,community_or_postal,area,service_type,job_size,timeline,notes,status,shared_claim_count,shared_limit,expires_at&or=(status.eq.published,status.eq.shared_active)&order=created_at.desc&limit=50')
    const matchingLeads = leads.filter(l => {
      const leadArea = normalizeDispatchArea(l.area, l.community_or_postal)
      const areaMatch = providerAreas.includes('all_calgary') || leadArea === 'unknown' || providerAreas.includes(leadArea)
      const typeMatch = providerTypes.includes(normalizeLeadServiceType(l.service_type))
      return areaMatch && typeMatch
    })

    const mapped = matchingLeads.map(l => ({
      lead_public_id: l.public_id,
      community_or_postal: l.community_or_postal,
      area: l.area,
      timing: l.timeline,
      rough_amount: l.job_size,
      item_location: '',
      request_categories: l.service_type ? [l.service_type] : [],
      regular_special_items: [],
      risk_flags: [],
      lead_grade: l.job_size || 'Lead',
      dispatch_summary: [l.service_type, l.timeline, l.notes].filter(Boolean).join(' · '),
      photo_count: 0,
      shared_claim_count: l.shared_claim_count,
      shared_claim_limit: l.shared_limit,
      spots_left: Math.max(0, Number(l.shared_limit || 3) - Number(l.shared_claim_count || 0)),
      expires_at: l.expires_at,
      provider_already_claimed: false,
    }))

    return res.status(200).json({ ok: true, leads: mapped })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return res.status(500).json({ error: message })
  }
}
