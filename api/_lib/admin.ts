import { timingSafeEqual } from 'node:crypto'

function env(name: string) {
  const value = process.env[name]
  if (!value) throw new Error(`Missing environment variable: ${name}`)
  return value
}

export function getAdminToken(req: any) {
  return String(req.headers?.['x-admin-token'] || req.query?.token || req.body?.token || '').trim()
}

export function assertAdmin(req: any) {
  const expected = String(process.env.ADMIN_TOKEN || '').trim()
  const given = getAdminToken(req)

  if (!expected) {
    const error: any = new Error('ADMIN_TOKEN is not configured.')
    error.statusCode = 500
    throw error
  }

  const a = Buffer.from(given)
  const b = Buffer.from(expected)

  if (!given || a.length !== b.length || !timingSafeEqual(a, b)) {
    const error: any = new Error('Unauthorized admin request.')
    error.statusCode = 401
    throw error
  }
}

export async function supabaseAdminFetch<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  const url = `${env('SUPABASE_URL').replace(/\/$/, '')}/rest/v1/${path}`
  const key = env('SUPABASE_SERVICE_ROLE_KEY')

  const response = await fetch(url, {
    ...init,
    headers: {
      apikey: key,
      authorization: `Bearer ${key}`,
      'content-type': 'application/json',
      prefer: 'return=representation',
      ...(init.headers || {}),
    },
  })

  const text = await response.text()
  const data = text ? JSON.parse(text) : null

  if (!response.ok) {
    throw new Error(data?.message || data?.error || text || `Supabase error ${response.status}`)
  }

  return data as T
}

export function handleAdminError(res: any, e: any) {
  const status = e?.statusCode || 500
  return res.status(status).json({ error: e instanceof Error ? e.message : 'Unknown error' })
}
