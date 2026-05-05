export async function verifyTurnstile(token?: string, remoteIp?: string | string[]) {
  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) throw new Error('Missing TURNSTILE_SECRET_KEY')
  if (!token) throw new Error('Missing Turnstile token')

  const formData = new URLSearchParams()
  formData.append('secret', secret)
  formData.append('response', token)
  if (remoteIp && typeof remoteIp === 'string') formData.append('remoteip', remoteIp)

  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: formData,
  })
  const data = await res.json() as { success?: boolean; 'error-codes'?: string[] }
  if (!data.success) {
    throw new Error(`Turnstile verification failed: ${(data['error-codes'] || []).join(', ')}`)
  }
  return true
}
