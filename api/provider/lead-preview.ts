import { supabaseSelect } from '../_lib/supabase.js'
import { getPlatformSettings } from '../_lib/platformSettings.js'

type ProviderRow = {
  id: string
  public_id: string
  provider_token: string
  approved: boolean
  active: boolean
}

type LeadRow = {
  id: string
  public_id: string
  status: string
  customer_name: string
  customer_phone: string
  customer_email: string
  community_or_postal: string
  area: string
  service_type: string
  job_size: string
  timeline: string
  notes: string
  shared_claim_count: number
  shared_limit: number
  expires_at: string
  created_at: string
}

type ClaimRow = {
  id: string
  access: 'shared' | 'exclusive'
  status: string
  created_at: string
}

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

    const leadPublicId = String(req.query?.lead || req.query?.lead_public_id || '')
    const providerToken = String(req.query?.token || '')

    if (!leadPublicId || !providerToken) {
      return res.status(400).json({ error: 'Missing lead or token' })
    }

    const providers = await supabaseSelect<ProviderRow>(
      `providers?select=id,public_id,provider_token,approved,active&provider_token=eq.${encodeURIComponent(providerToken)}&approved=eq.true&active=eq.true&limit=1`
    )

    if (!providers.length) {
      return res.status(403).json({ error: 'Provider is not approved or token is invalid.' })
    }

    const provider = providers[0]
    const platformSettings = await getPlatformSettings()

    const leads = await supabaseSelect<LeadRow>(
      `leads?select=id,public_id,status,customer_name,customer_phone,customer_email,community_or_postal,area,service_type,job_size,timeline,notes,shared_claim_count,shared_limit,expires_at,created_at&public_id=eq.${encodeURIComponent(leadPublicId)}&limit=1`
    )

    if (!leads.length) {
      return res.status(404).json({ error: 'Lead not found.' })
    }

    const lead = leads[0]

    const claims = await supabaseSelect<ClaimRow>(
      `lead_claims?select=id,access,status,created_at&lead_id=eq.${encodeURIComponent(lead.id)}&provider_id=eq.${encodeURIComponent(provider.id)}&status=eq.granted_free&limit=1`
    )

    const existingClaim = claims[0] || null
    const alreadyClaimed = Boolean(existingClaim)

    const sharedLimit = Number(lead.shared_limit || 3)
    const sharedCount = Number(lead.shared_claim_count || 0)

    const result: any = {
      ok: true,
      provider_already_claimed: alreadyClaimed,
      already_claimed_by_you: alreadyClaimed,
      claimed_access: existingClaim?.access || null,

      lead: {
        public_id: lead.public_id,
        status: lead.status,
        community_or_postal: lead.community_or_postal,
        area: lead.area,
        service_type: lead.service_type,
        job_size: lead.job_size,
        timeline: lead.timeline,
        notes_preview: lead.notes,
        shared_claim_count: sharedCount,
        shared_limit: sharedLimit,
        expires_at: lead.expires_at,
        created_at: lead.created_at,
        already_claimed_by_you: alreadyClaimed,
        shared_available: alreadyClaimed ? false : ['published', 'shared_active'].includes(lead.status) && sharedCount < sharedLimit,
        exclusive_available: alreadyClaimed ? false : Boolean(platformSettings.exclusive_claims_enabled) && lead.status === 'published' && sharedCount === 0,
      },
    }

    if (alreadyClaimed) {
      result.customer = {
        name: lead.customer_name || '',
        phone: lead.customer_phone || '',
        email: lead.customer_email || '',
        community_or_postal: lead.community_or_postal || '',
        area: lead.area || '',
        notes: lead.notes || '',
      }

      result.customer_name = lead.customer_name || ''
      result.customer_phone = lead.customer_phone || ''
      result.customer_email = lead.customer_email || ''
      result.community_or_postal = lead.community_or_postal || ''
      result.area = lead.area || ''
      result.request_description = lead.notes || ''
      result.access = existingClaim?.access || 'shared'
      result.lead_public_id = lead.public_id
    }

    return res.status(200).json({ ok: true, result })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return res.status(500).json({ error: message })
  }
}
