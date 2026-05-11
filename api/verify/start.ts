import type { VercelRequest, VercelResponse } from '@vercel/node'
import twilio from 'twilio'

const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN
const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID

const client = accountSid && authToken ? twilio(accountSid, authToken) : null

function normalizePhone(raw: string) {
  return String(raw || '').replace(/[^\d+]/g, '')
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

    if (!phone) {
      return res.status(400).json({ ok: false, error: 'missing_phone' })
    }

    if (!phone.startsWith('+1') || phone.length < 12 || phone.length > 13) {
      return res.status(400).json({
        ok: false,
        error: 'invalid_phone',
        message: 'Please enter a valid Canadian or US phone number.'
      })
    }

    const verification = await client.verify.v2
      .services(verifyServiceSid)
      .verifications.create({
        to: phone,
        channel: 'sms'
      })

    return res.status(200).json({
      ok: true,
      status: verification.status
    })
  } catch (error: any) {
    console.error('verify_start_failed', error)

    return res.status(500).json({
      ok: false,
      error: 'verify_start_failed',
      message: error?.message || 'Failed to send verification code.'
    })
  }
}
