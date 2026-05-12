import type { VercelRequest, VercelResponse } from '@vercel/node'
import twilio from 'twilio'
import { verifyManualCaptcha } from '../_lib/manualCaptcha.js'
import { hasSupabaseConfig, supabaseInsert, supabasePatch, supabaseSelect } from '../_lib/supabase.js'

const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN
const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID

const client = accountSid && authToken ? twilio(accountSid, authToken) : null

const ALLOWED_VERIFICATION_TYPES = new Set([
  'customer_lead',
  'provider_application',
])

const CODE_ACTIVE_MS = 10 * 60 * 1000
const LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000
const MAX_SENDS_PER_PHONE_24H = 3
const MAX_SENDS_PER_IP_24H = 3

function normalizePhone(raw: string) {
  return String(raw || '').replace(/[^\d+]/g, '')
}

function getClientIp(req: VercelRequest) {
  const forwarded = req.headers['x-forwarded-for']
  if (Array.isArray(forwarded)) return forwarded[0] || ''
  return String(forwarded || '').split(',')[0].trim()
}

function jsonLimit(res: VercelResponse, error: string, message: string, retryAfterSeconds?: number) {
  if (retryAfterSeconds) res.setHeader('Retry-After', String(retryAfterSeconds))
  return res.status(429).json({
    ok: false,
    error,
    message,
    retry_after_seconds: retryAfterSeconds || null,
  })
}

async function countSentByPhone(phone: string, sinceIso: string) {
  const rows = await supabaseSelect(
    `verification_send_events?select=id&phone=eq.${encodeURIComponent(phone)}&status=eq.sent&created_at=gte.${encodeURIComponent(sinceIso)}&limit=100`
  )
  return rows.length
}

async function countSentByIp(ip: string, sinceIso: string) {
  if (!ip) return 0
  const rows = await supabaseSelect(
    `verification_send_events?select=id&ip_address=eq.${encodeURIComponent(ip)}&status=eq.sent&created_at=gte.${encodeURIComponent(sinceIso)}&limit=100`
  )
  return rows.length
}

async function getRecentActiveSend(phone: string, sinceIso: string) {
  const rows = await supabaseSelect(
    `verification_send_events?select=id,created_at&phone=eq.${encodeURIComponent(phone)}&status=eq.sent&created_at=gte.${encodeURIComponent(sinceIso)}&order=created_at.desc&limit=1`
  )
  return rows[0] || null
}

async function hasUsedCaptchaNonce(nonce: string) {
  if (!nonce) return false
  const rows = await supabaseSelect(
    `verification_send_events?select=id&captcha_nonce=eq.${encodeURIComponent(nonce)}&limit=1`
  )
  return rows.length > 0
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'method_not_allowed' })
  }

  let eventId = ''

  try {
    if (!client || !verifyServiceSid) {
      return res.status(500).json({ ok: false, error: 'twilio_not_configured' })
    }

    if (!hasSupabaseConfig()) {
      return res.status(500).json({
        ok: false,
        error: 'supabase_not_configured',
        message: 'SMS protection is not configured.',
      })
    }

    const phone = normalizePhone(req.body?.phone)
    const verificationType = String(
      req.body?.verification_type || req.body?.type || 'customer_lead'
    ).trim()

    if (!ALLOWED_VERIFICATION_TYPES.has(verificationType)) {
      return res.status(400).json({
        ok: false,
        error: 'invalid_verification_type',
      })
    }

    if (!phone) {
      return res.status(400).json({ ok: false, error: 'missing_phone' })
    }

    if (!phone.startsWith('+1') || phone.length < 12 || phone.length > 13) {
      return res.status(400).json({
        ok: false,
        error: 'invalid_phone',
        message: 'Please enter a valid Canadian or US phone number.',
      })
    }

    const manualCaptcha = req.body?.manualCaptcha || req.body?.captcha || null
    const captchaCheck = verifyManualCaptcha(manualCaptcha)

    if (!captchaCheck.ok) {
      return res.status(400).json({
        ok: false,
        error: 'manual_captcha_failed',
        message: captchaCheck.error,
      })
    }

    const captchaNonce = String(manualCaptcha?.nonce || '').trim()

    if (!captchaNonce) {
      return res.status(400).json({
        ok: false,
        error: 'manual_captcha_missing_nonce',
        message: 'Please refresh the verification question and try again.',
      })
    }

    if (await hasUsedCaptchaNonce(captchaNonce)) {
      return res.status(400).json({
        ok: false,
        error: 'manual_captcha_already_used',
        message: 'This verification question was already used. Please refresh and try again.',
      })
    }

    const ipAddress = getClientIp(req)
    const userAgent = String(req.headers['user-agent'] || '')

    const activeSinceIso = new Date(Date.now() - CODE_ACTIVE_MS).toISOString()
    const recentSend = await getRecentActiveSend(phone, activeSinceIso)

    if (recentSend) {
      const sentAt = new Date(recentSend.created_at).getTime()
      const retryAfterSeconds = Math.max(1, Math.ceil((CODE_ACTIVE_MS - (Date.now() - sentAt)) / 1000))

      return jsonLimit(
        res,
        'recent_code_still_active',
        'A code was already sent. Please use the existing code or wait before requesting another.',
        retryAfterSeconds
      )
    }

    const since24hIso = new Date(Date.now() - LIMIT_WINDOW_MS).toISOString()

    const phoneSendCount = await countSentByPhone(phone, since24hIso)
    if (phoneSendCount >= MAX_SENDS_PER_PHONE_24H) {
      return jsonLimit(
        res,
        'phone_24h_limit_reached',
        'This phone number has reached the 24-hour verification limit. Please try again later.'
      )
    }

    const ipSendCount = await countSentByIp(ipAddress, since24hIso)
    if (ipSendCount >= MAX_SENDS_PER_IP_24H) {
      return jsonLimit(
        res,
        'ip_24h_limit_reached',
        'This network has reached the 24-hour verification limit. Please try again later.'
      )
    }

    let inserted: any[] = []

    try {
      inserted = await supabaseInsert('verification_send_events', {
        phone,
        verification_type: verificationType,
        ip_address: ipAddress,
        user_agent: userAgent,
        captcha_nonce: captchaNonce,
        status: 'pending',
        created_at: new Date().toISOString(),
      }) as any[]
    } catch (error: any) {
      const message = String(error?.message || '')

      if (message.includes('duplicate') || message.includes('unique') || message.includes('captcha_nonce')) {
        return res.status(400).json({
          ok: false,
          error: 'manual_captcha_already_used',
          message: 'This verification question was already used. Please refresh and try again.',
        })
      }

      throw error
    }

    eventId = inserted?.[0]?.id || ''

    const verification = await client.verify.v2
      .services(verifyServiceSid)
      .verifications.create({
        to: phone,
        channel: 'sms',
      })

    if (eventId) {
      await supabasePatch(
        'verification_send_events',
        `id=eq.${encodeURIComponent(eventId)}`,
        {
          status: 'sent',
          twilio_status: verification.status,
          updated_at: new Date().toISOString(),
        }
      )
    }

    return res.status(200).json({
      ok: true,
      status: verification.status,
      valid_for_seconds: 600,
    })
  } catch (error: any) {
    console.error('verify_start_failed', error)

    if (eventId) {
      try {
        await supabasePatch(
          'verification_send_events',
          `id=eq.${encodeURIComponent(eventId)}`,
          {
            status: 'failed',
            error_code: error?.code ? String(error.code) : 'verify_start_failed',
            updated_at: new Date().toISOString(),
          }
        )
      } catch (patchError) {
        console.error('verify_start_failed_event_patch_failed', patchError)
      }
    }

    return res.status(500).json({
      ok: false,
      error: 'verify_start_failed',
      message: error?.message || 'Failed to send verification code.',
    })
  }
}
