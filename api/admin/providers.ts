import { assertAdmin, handleAdminError, supabaseAdminFetch } from '../_lib/admin.js'

export default async function handler(req: any, res: any) {
  try {
    assertAdmin(req)
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

    const providers = await supabaseAdminFetch(
      'providers?select=id,public_id,business_name,contact_name,email,phone,approved,active,notify_by_email,notify_by_sms,sms_opt_in_at,sms_opt_out_at,created_at,updated_at&order=created_at.desc&limit=200'
    )

    return res.status(200).json({ ok: true, providers })
  } catch (e) {
    return handleAdminError(res, e)
  }
}
