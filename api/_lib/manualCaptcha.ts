import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

function captchaSecret() {
  return String(process.env.CAPTCHA_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || 'clearout-dev-captcha-secret')
}

function signCaptcha(nonce: string, expires: number, answer: string) {
  return createHmac('sha256', captchaSecret())
    .update(`v1.${nonce}.${expires}.${answer}`)
    .digest('hex')
}

export function createManualCaptchaChallenge() {
  const a = Math.floor(Math.random() * 8) + 2
  const b = Math.floor(Math.random() * 8) + 2
  const answer = String(a + b)
  const nonce = randomBytes(16).toString('hex')
  const expires = Date.now() + 10 * 60 * 1000
  const signature = signCaptcha(nonce, expires, answer)

  return {
    question: `${a} + ${b} = ?`,
    nonce,
    expires,
    signature,
  }
}

export function verifyManualCaptcha(payload: any) {
  const answer = String(payload?.answer || '').trim()
  const nonce = String(payload?.nonce || '')
  const expires = Number(payload?.expires || 0)
  const signature = String(payload?.signature || '')

  if (!answer || !nonce || !expires || !signature) {
    return { ok: false, error: 'Please complete the verification code.' }
  }

  if (!/^\d+$/.test(answer)) {
    return { ok: false, error: 'Please enter the verification answer using numbers only.' }
  }

  if (Date.now() > expires) {
    return { ok: false, error: 'Verification expired. Please refresh the code and try again.' }
  }

  const expected = signCaptcha(nonce, expires, answer)

  try {
    const a = Buffer.from(signature, 'hex')
    const b = Buffer.from(expected, 'hex')
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return { ok: false, error: 'Verification answer is incorrect.' }
    }
  } catch {
    return { ok: false, error: 'Verification answer is incorrect.' }
  }

  return { ok: true }
}
