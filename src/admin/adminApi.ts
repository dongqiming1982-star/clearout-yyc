export type AdminResource =
  | 'summary'
  | 'launch-funnel'
  | 'providers'
  | 'leads'
  | 'claims'
  | 'settings'
  | 'dispatch-status'
  | 'dispatch-overview'

async function parseResponse(res: Response) {
  const text = await res.text()
  let data: any = null

  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = { error: text || 'Invalid JSON response' }
  }

  if (!res.ok || data?.error) {
    throw new Error(data?.error || `Admin request failed: ${res.status}`)
  }

  return data
}

export async function adminGet<T = any>(
  resource: AdminResource,
  token: string,
): Promise<T> {
  const url = `/api/admin?resource=${encodeURIComponent(resource)}&_=${Date.now()}`

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'x-admin-token': token,
    },
    cache: 'no-store',
  })

  return parseResponse(res) as Promise<T>
}

export async function adminPost<T = any>(
  path: string,
  token: string,
  body?: Record<string, any>,
): Promise<T> {
  const res = await fetch(path, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-admin-token': token,
    },
    body: JSON.stringify(body || {}),
    cache: 'no-store',
  })

  return parseResponse(res) as Promise<T>
}
