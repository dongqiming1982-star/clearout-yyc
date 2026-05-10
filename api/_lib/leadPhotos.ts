import { supabaseInsert, supabasePatch, supabaseSelect } from './supabase.js'

const PHOTO_BUCKET = 'lead-photos'
const MAX_PHOTOS_PER_LEAD = 2
const MAX_PHOTO_BYTES = 1024 * 1024
const SIGNED_URL_TTL_SECONDS = 60 * 60
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

type LeadPhotoUpload = {
  file_name?: string
  mime_type?: string
  data_url?: string
  file_size?: number
  width?: number
  height?: number
  sort_order?: number
}

type LeadPhotoRow = {
  id: string
  public_id: string
  lead_id: string
  storage_bucket: string
  storage_path: string
  file_name?: string
  mime_type: string
  file_size: number
  width?: number
  height?: number
  sort_order: number
  expires_at: string
  deleted_at?: string | null
  created_at: string
}

function requiredEnv(name: string) {
  const value = process.env[name]
  if (!value) throw new Error(`Missing ${name}. Add it in Vercel Environment Variables.`)
  return value.replace(/\/+$/, '')
}

function storageHeaders(extra: Record<string, string> = {}) {
  const key = requiredEnv('SUPABASE_SERVICE_ROLE_KEY')
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    ...extra,
  }
}

function safeFileName(value: unknown, fallback: string) {
  const raw = String(value || '').trim().toLowerCase()
  const clean = raw.replace(/[^a-z0-9._-]+/g, '-').replace(/-+/g, '-').slice(0, 80)
  return clean || fallback
}

function extensionForMime(mime: string) {
  if (mime === 'image/png') return 'png'
  if (mime === 'image/webp') return 'webp'
  return 'jpg'
}

function parseDataUrl(dataUrl: string) {
  const match = String(dataUrl || '').match(/^data:(image\/(?:jpeg|png|webp));base64,([a-z0-9+/=\s]+)$/i)
  if (!match) throw new Error('Invalid image upload payload.')

  const mimeType = match[1].toLowerCase()
  if (!ALLOWED_MIME_TYPES.has(mimeType)) throw new Error('Unsupported image type.')

  const base64 = match[2].replace(/\s/g, '')
  const buffer = Buffer.from(base64, 'base64')

  if (!buffer.length || buffer.length > MAX_PHOTO_BYTES) {
    throw new Error('Compressed photo is too large. Maximum is 1 MB per photo.')
  }

  return { mimeType, buffer }
}

async function uploadStorageObject(bucket: string, path: string, body: Buffer, mimeType: string) {
  const base = requiredEnv('SUPABASE_URL')
  const response = await fetch(`${base}/storage/v1/object/${encodeURIComponent(bucket)}/${path.split('/').map(encodeURIComponent).join('/')}`, {
    method: 'PUT',
    headers: storageHeaders({
      'Content-Type': mimeType,
      'Cache-Control': '3600',
      'x-upsert': 'false',
    }),
    body,
  })

  const text = await response.text()
  if (!response.ok) {
    let message = text || 'Storage upload failed'
    try { message = JSON.parse(text)?.message || message } catch {}
    throw new Error(message)
  }
}

async function deleteStorageObjects(bucket: string, paths: string[]) {
  if (!paths.length) return

  const base = requiredEnv('SUPABASE_URL')
  const response = await fetch(`${base}/storage/v1/object/${encodeURIComponent(bucket)}`, {
    method: 'DELETE',
    headers: storageHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ prefixes: paths }),
  })

  const text = await response.text()
  if (!response.ok) {
    let message = text || 'Storage delete failed'
    try { message = JSON.parse(text)?.message || message } catch {}
    throw new Error(message)
  }
}

export async function createStorageSignedUrl(bucket: string, path: string, expiresIn = SIGNED_URL_TTL_SECONDS) {
  const base = requiredEnv('SUPABASE_URL')
  const response = await fetch(`${base}/storage/v1/object/sign/${encodeURIComponent(bucket)}/${path.split('/').map(encodeURIComponent).join('/')}`, {
    method: 'POST',
    headers: storageHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ expiresIn }),
  })

  const text = await response.text()
  let data: any = null
  try { data = text ? JSON.parse(text) : null } catch { data = null }

  if (!response.ok) {
    throw new Error(data?.message || text || 'Storage signed URL failed')
  }

  const signed = data?.signedURL || data?.signedUrl || data?.signed_url || ''
  if (!signed) throw new Error('Storage did not return a signed URL.')

  return signed.startsWith('http') ? signed : `${base}${signed}`
}

export async function uploadLeadPhotosForLead(leadId: string, leadPublicId: string, photos: LeadPhotoUpload[] = []) {
  const incoming = Array.isArray(photos) ? photos.slice(0, MAX_PHOTOS_PER_LEAD) : []
  if (!incoming.length) return { attempted: 0, uploaded: 0, failed: 0, errors: [] as string[] }

  let uploaded = 0
  let failed = 0
  const errors: string[] = []

  for (let i = 0; i < incoming.length; i++) {
    const photo = incoming[i]

    try {
      const { mimeType, buffer } = parseDataUrl(String(photo.data_url || ''))
      const ext = extensionForMime(mimeType)
      const fileName = safeFileName(photo.file_name, `photo-${i + 1}.${ext}`)
      const storagePath = `${leadPublicId}/${Date.now()}-${i + 1}-${Math.random().toString(16).slice(2)}.${ext}`

      await uploadStorageObject(PHOTO_BUCKET, storagePath, buffer, mimeType)

      await supabaseInsert('lead_photos', {
        lead_id: leadId,
        storage_bucket: PHOTO_BUCKET,
        storage_path: storagePath,
        file_name: fileName,
        mime_type: mimeType,
        file_size: buffer.length,
        width: Number(photo.width || 0) || null,
        height: Number(photo.height || 0) || null,
        sort_order: Number(photo.sort_order ?? i),
      })

      uploaded += 1
    } catch (err) {
      failed += 1
      errors.push(err instanceof Error ? err.message : String(err))
    }
  }

  return { attempted: incoming.length, uploaded, failed, errors }
}

export async function getLeadPhotosByLeadIds(leadIds: string[], includeSignedUrls = true) {
  const ids = leadIds.filter(Boolean)
  if (!ids.length) return {} as Record<string, any[]>

  const rows = await supabaseSelect<LeadPhotoRow>(
    `lead_photos?select=id,public_id,lead_id,storage_bucket,storage_path,file_name,mime_type,file_size,width,height,sort_order,expires_at,deleted_at,created_at&lead_id=in.(${ids.map(encodeURIComponent).join(',')})&order=sort_order.asc,created_at.asc&limit=1000`
  )

  const now = Date.now()
  const grouped: Record<string, any[]> = {}

  for (const row of rows) {
    const expired = row.expires_at ? new Date(row.expires_at).getTime() <= now : false
    const active = !row.deleted_at && !expired
    let signed_url = ''

    if (includeSignedUrls && active) {
      try {
        signed_url = await createStorageSignedUrl(row.storage_bucket || PHOTO_BUCKET, row.storage_path)
      } catch {
        signed_url = ''
      }
    }

    const item = {
      id: row.id,
      public_id: row.public_id,
      file_name: row.file_name || '',
      mime_type: row.mime_type,
      file_size: row.file_size,
      width: row.width,
      height: row.height,
      sort_order: row.sort_order,
      expires_at: row.expires_at,
      deleted_at: row.deleted_at,
      expired,
      active,
      signed_url,
    }

    if (!grouped[row.lead_id]) grouped[row.lead_id] = []
    grouped[row.lead_id].push(item)
  }

  return grouped
}

export async function cleanupExpiredLeadPhotos(limit = 100) {
  const safeLimit = Math.max(1, Math.min(Number(limit) || 100, 500))
  const now = new Date().toISOString()
  const rows = await supabaseSelect<LeadPhotoRow>(
    `lead_photos?select=id,storage_bucket,storage_path&deleted_at=is.null&expires_at=lt.${encodeURIComponent(now)}&order=expires_at.asc&limit=${safeLimit}`
  )

  let deleted = 0
  let failed = 0
  const errors: string[] = []

  for (const row of rows) {
    try {
      await deleteStorageObjects(row.storage_bucket || PHOTO_BUCKET, [row.storage_path])
      await supabasePatch('lead_photos', `id=eq.${encodeURIComponent(row.id)}`, { deleted_at: new Date().toISOString() })
      deleted += 1
    } catch (err) {
      failed += 1
      errors.push(err instanceof Error ? err.message : String(err))
    }
  }

  return { checked: rows.length, deleted, failed, errors }
}
