import { assertAdmin, handleAdminError, supabaseAdminFetch } from '../_lib/admin.js'

export default async function handler(req: any, res: any) {
  try {
    assertAdmin(req)
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

    const leads = await supabaseAdminFetch(
      'leads?select=id,public_id,status,customer_name,customer_phone,customer_email,community_or_postal,area,service_type,job_size,timeline,notes,shared_claim_count,shared_limit,created_at,publish_at,published_at,expires_at&order=created_at.desc&limit=200'
    )

    return res.status(200).json({ ok: true, leads })
  } catch (e) {
    return handleAdminError(res, e)
  }
}
