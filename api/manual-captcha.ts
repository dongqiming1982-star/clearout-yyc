import { createManualCaptchaChallenge, verifyManualCaptcha } from './_lib/manualCaptcha.js'

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store, max-age=0')

  if (req.method === 'GET') {
    return res.status(200).json(createManualCaptchaChallenge())
  }

  if (req.method === 'POST') {
    const payload = req.body?.manualCaptcha || req.body?.captcha || req.body
    const result = verifyManualCaptcha(payload)

    if (!result.ok) {
      return res.status(400).json({
        ok: false,
        error: 'manual_captcha_failed',
        message: result.error,
      })
    }

    return res.status(200).json({
      ok: true,
      verified: true,
    })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
