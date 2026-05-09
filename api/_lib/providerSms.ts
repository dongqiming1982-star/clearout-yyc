export type TwilioSmsResult = {
  skipped: boolean
  sent?: boolean
  to?: string
  sid?: string
  status?: string
  error?: string
  reason?: string
}

export function getProviderSmsBatchLimit(defaultLimit = 100) {
  const raw = Number(process.env.PROVIDER_SMS_BATCH_LIMIT || defaultLimit)
  if (!Number.isFinite(raw) || raw <= 0) return defaultLimit
  return Math.min(Math.floor(raw), 500)
}

export function normalizeNorthAmericanSmsPhone(value: unknown) {
  const raw = String(value || '').trim()
  const digits = raw.replace(/\D/g, '')

  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`

  return ''
}

function getErrorMessage(e: unknown) {
  return e instanceof Error ? e.message : String(e)
}

export async function sendTwilioSms(toRaw: unknown, body: string): Promise<TwilioSmsResult> {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN
    const fromNumber = process.env.TWILIO_FROM_NUMBER
    const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID

    if (!accountSid || !authToken) {
      return {
        skipped: true,
        reason: 'TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN is not configured.',
      }
    }

    const to = normalizeNorthAmericanSmsPhone(toRaw)
    if (!to) {
      return {
        skipped: false,
        sent: false,
        error: 'Invalid or missing recipient phone number.',
      }
    }

    if (!messagingServiceSid && !fromNumber) {
      return {
        skipped: true,
        reason: 'TWILIO_FROM_NUMBER or TWILIO_MESSAGING_SERVICE_SID is not configured.',
      }
    }

    const params = new URLSearchParams()
    params.set('To', to)
    params.set('Body', body)

    if (messagingServiceSid) {
      params.set('MessagingServiceSid', messagingServiceSid)
    } else if (fromNumber) {
      const normalizedFrom = normalizeNorthAmericanSmsPhone(fromNumber)
      params.set('From', normalizedFrom || fromNumber)
    }

    const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64')

    const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    })

    const text = await r.text()
    let data: any = null

    try {
      data = text ? JSON.parse(text) : null
    } catch {
      data = null
    }

    if (!r.ok) {
      return {
        skipped: false,
        sent: false,
        to,
        error: data?.message || text || `Twilio error ${r.status}`,
      }
    }

    return {
      skipped: false,
      sent: true,
      to,
      sid: data?.sid,
      status: data?.status,
    }
  } catch (e) {
    return {
      skipped: false,
      sent: false,
      error: getErrorMessage(e),
    }
  }
}
