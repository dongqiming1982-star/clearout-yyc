import type { VercelRequest, VercelResponse } from '@vercel/node'
import twilio from 'twilio'
import { supabaseInsert } from '../_lib/supabase.js'

const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN
const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID

const client = accountSid && authToken ? twilio(accountSid, authToken) : null

const ALLOWED_VERIFICATION_TYPES = new Set([
  'customer_lead',
  'provider_application',
])

function normalizePhone(raw: string) {
  return String(raw || '').replace(/[^\d+]/g, '')
}

function getClientIp(req: VercelRequest) {
  const forwarded = req.headers['x-forwarded-for']
  if (Array.isArray(forwarded)) return forwarded[0] || ''
  return String(forwarded || '')
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'method_not_allowed' })
  }

  try {
    if (!client || !verifyServiceSid) {
      return res.status(500).json({ ok: false, error: 'twilio_not_configured' })
    }

    const phone = normalizePhone(req.body?.phone)
    const code = String(req.body?.code || '').trim()
    const verificationType = String(
      req.body?.verification_type || req.body?.type || 'customer_lead'
    ).trim()

    if (!ALLOWED_VERIFICATION_TYPES.has(verificationType)) {
      return res.status(400).json({
        ok: false,
        error: 'invalid_verification_type',
      })
    }

    if (!phone || !code) {
      return res.status(400).json({ ok: false, error: 'missing_phone_or_code' })
    }

    if (!phone.startsWith('+1') || phone.length < 12 || phone.length > 13) {
      return res.status(400).json({
        ok: false,
        error: 'invalid_phone',
        message: 'Please enter a valid Canadian or US phone number.',
      })
    }

    const check = await client.verify.v2
      .services(verifyServiceSid)
      .verificationChecks.create({
        to: phone,
        code,
      })

    if (check.status !== 'approved') {
      return res.status(400).json({
        ok: false,
        verified: false,
        status: check.status,
        error: 'invalid_code',
      })
    }

    await supabaseInsert('verification_sessions', {
      phone,
      verification_type: verificationType,
      status: 'verified',
      ip_address: getClientIp(req),
      user_agent: String(req.headers['user-agent'] || ''),
      verified_at: new Date().toISOString(),
    })

    return res.status(200).json({
      ok: true,
      verified: true,
      status: check.status,
      verification_type: verificationType,
    })
  } catch (error: any) {
    console.error('verify_check_failed', error)

    return res.status(500).json({
      ok: false,
      error: 'verify_check_failed',
      message: error?.message || 'Failed to verify code.',
    })
  }
}
