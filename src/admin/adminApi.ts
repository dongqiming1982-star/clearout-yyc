export type AdminResource =
  | 'summary'
  | 'providers'
  | 'leads'
  | 'claims'
  | 'settings'
  | 'dispatch-status'
  | 'dispatch-overview'

export async function adminGet<T = any>(
  resource: AdminResource,
  token: string,
): Promise<T> {
  const res = await fetch(`/api/admin?resource=${encodeURIComponent(resource)}`, {
    method: 'GET',
    headers: {
      'x-admin-token': token,
    },
    cache: 'no-store',
  })

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

  return data as T
}
