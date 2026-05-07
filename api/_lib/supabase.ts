function requiredEnv(name: string) {
  const value = process.env[name]
  if (!value) throw new Error(`Missing ${name}. Add it in Vercel Environment Variables.`)
  return value.replace(/\/+$/, '')
}

export function hasSupabaseConfig() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
}

function supabaseHeaders(extra: Record<string, string> = {}) {
  const key = requiredEnv('SUPABASE_SERVICE_ROLE_KEY')
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    ...extra,
  }
}

export async function supabaseRpc<T = any>(fn: string, payload: Record<string, unknown> = {}): Promise<T> {
  const base = requiredEnv('SUPABASE_URL')
  const response = await fetch(`${base}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: supabaseHeaders(),
    body: JSON.stringify(payload),
  })
  const text = await response.text()
  let data: any = null
  try { data = text ? JSON.parse(text) : null } catch { data = text }
  if (!response.ok) {
    const message = typeof data === 'object' && data?.message ? data.message : text || `Supabase RPC ${fn} failed`
    throw new Error(message)
  }
  return data as T
}

export async function supabaseInsert<T = any>(table: string, row: Record<string, unknown>): Promise<T[]> {
  const base = requiredEnv('SUPABASE_URL')
  const response = await fetch(`${base}/rest/v1/${table}`, {
    method: 'POST',
    headers: supabaseHeaders({ Prefer: 'return=representation' }),
    body: JSON.stringify(row),
  })
  const text = await response.text()
  let data: any = null
  try { data = text ? JSON.parse(text) : null } catch { data = text }
  if (!response.ok) {
    const message = typeof data === 'object' && data?.message ? data.message : text || `Supabase insert ${table} failed`
    throw new Error(message)
  }
  return data as T[]
}

export async function supabaseSelect<T = any>(path: string): Promise<T[]> {
  const base = requiredEnv('SUPABASE_URL')
  const response = await fetch(`${base}/rest/v1/${path}`, {
    method: 'GET',
    headers: supabaseHeaders(),
  })
  const text = await response.text()
  let data: any = null
  try { data = text ? JSON.parse(text) : null } catch { data = text }
  if (!response.ok) {
    const message = typeof data === 'object' && data?.message ? data.message : text || `Supabase select ${path} failed`
    throw new Error(message)
  }
  return data as T[]
}

export async function supabasePatch<T = any>(table: string, query: string, row: Record<string, unknown>): Promise<T[]> {
  const base = requiredEnv('SUPABASE_URL')
  const response = await fetch(`${base}/rest/v1/${table}?${query}`, {
    method: 'PATCH',
    headers: supabaseHeaders({ Prefer: 'return=representation' }),
    body: JSON.stringify(row),
  })
  const text = await response.text()
  let data: any = null
  try { data = text ? JSON.parse(text) : null } catch { data = text }
  if (!response.ok) {
    const message = typeof data === 'object' && data?.message ? data.message : text || `Supabase patch ${table} failed`
    throw new Error(message)
  }
  return data as T[]
}
