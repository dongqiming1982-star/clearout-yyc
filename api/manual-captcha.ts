import { createManualCaptchaChallenge } from './_lib/manualCaptcha.js'

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  res.setHeader('Cache-Control', 'no-store, max-age=0')
  return res.status(200).json(createManualCaptchaChallenge())
}
