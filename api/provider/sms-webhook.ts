import { normalizeNorthAmericanSmsPhone } from '../_lib/providerSms.js'
import { supabasePatch, supabaseSelect } from '../_lib/supabase.js'

type ProviderRow = {
  id: string
  phone?: string | null
  notify_by_sms?: boolean | null
  sms_opt_in_at?: string | null
  sms_opt_out_at?: string | null
}

const STOP_WORDS = new Set([
  'STOP',
  'STOPALL',
  'UNSUBSCRIBE',
  'CANCEL',
  'END',
  'QUIT',
  'OPTOUT',
  'REVOKE',
])

const START_WORDS = new Set([
  'START',
  'YES',
  'UNSTOP',
])

function xmlResponse(res: any, statusCode = 200) {
  res.setHeader('Content-Type', 'text/xml; charset=utf-8')
  return res.status(statusCode).send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>')
}

function getBodyValue(req: any, key: string) {
  return String(req.body?.[key] || req.query?.[key] || '').trim()
}

function webhookSecretOk(req: any) {
  const expected = String(process.env.SMS_WEBHOOK_SECRET || '').trim()
  if (!expected) return true

  const provided = String(req.query?.secret || req.body?.secret || '').trim()
  return provided === expected
}

function normalizeKeyword(body: string) {
  return body.trim().split(/\s+/)[0]?.toUpperCase() || ''
}

export default async function handler(req: any, res: any) {
  try {
    if (!['GET', 'POST'].includes(req.method)) {
      return xmlResponse(res, 405)
    }

    if (req.method === 'GET') {
      return res.status(200).json({ ok: true, endpoint: 'provider sms webhook' })
    }

    if (!webhookSecretOk(req)) {
      return xmlResponse(res, 401)
    }

    const fromRaw = getBodyValue(req, 'From')
    const bodyRaw = getBodyValue(req, 'Body')

    const fromPhone = normalizeNorthAmericanSmsPhone(fromRaw)
    const keyword = normalizeKeyword(bodyRaw)

    if (!fromPhone) {
      return xmlResponse(res)
    }

    const providers = await supabaseSelect<ProviderRow>(
      `providers?select=id,phone,notify_by_sms,sms_opt_in_at,sms_opt_out_at&phone=eq.${encodeURIComponent(fromPhone)}&limit=20`
    )

    if (!providers.length) {
      return xmlResponse(res)
    }

    const now = new Date().toISOString()

    if (STOP_WORDS.has(keyword)) {
      for (const provider of providers) {
        await supabasePatch('providers', `id=eq.${encodeURIComponent(provider.id)}`, {
          notify_by_sms: false,
          sms_opt_out_at: now,
        })
      }

      return xmlResponse(res)
    }

    if (START_WORDS.has(keyword)) {
      for (const provider of providers) {
        await supabasePatch('providers', `id=eq.${encodeURIComponent(provider.id)}`, {
          notify_by_sms: true,
          sms_opt_in_at: now,
          sms_opt_out_at: null,
        })
      }

      return xmlResponse(res)
    }

    return xmlResponse(res)
  } catch (e) {
    console.error('SMS webhook error', e)
    return xmlResponse(res, 200)
  }
}
