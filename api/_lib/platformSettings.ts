import { hasSupabaseConfig, supabaseInsert, supabasePatch, supabaseSelect } from './supabase.js'

export type LeadDispatchChannel = 'email' | 'sms'

export type PlatformSettings = {
  customer_requests_enabled: boolean
  lead_dispatch_enabled: boolean
  provider_claims_enabled: boolean
  exclusive_claims_enabled: boolean
  lead_dispatch_channel: LeadDispatchChannel
}

type PlatformSettingKey = keyof PlatformSettings

const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  customer_requests_enabled: true,
  lead_dispatch_enabled: true,
  provider_claims_enabled: true,
  exclusive_claims_enabled: false,
  lead_dispatch_channel: 'email',
  exclusive_claims_enabled: false,
}

const SETTING_KEYS: PlatformSettingKey[] = [
  'customer_requests_enabled',
  'lead_dispatch_enabled',
  'provider_claims_enabled',
  'lead_dispatch_channel',
]

function normalizeKey(key: string): PlatformSettingKey {
  if ((SETTING_KEYS as string[]).includes(key)) return key as PlatformSettingKey
  throw new Error(`Unknown platform setting: ${key}`)
}

function normalizeBoolean(value: unknown) {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  const text = String(value || '').trim().toLowerCase()
  return ['true', '1', 'yes', 'enabled', 'on'].includes(text)
}

function normalizeChannel(value: unknown): LeadDispatchChannel {
  return String(value || '').trim().toLowerCase() === 'sms' ? 'sms' : 'email'
}

function normalizeValue(key: PlatformSettingKey, value: unknown): boolean | LeadDispatchChannel {
  if (key === 'lead_dispatch_channel') return normalizeChannel(value)
  return normalizeBoolean(value)
}

export async function getPlatformSettings(): Promise<PlatformSettings> {
  if (!hasSupabaseConfig()) return { ...DEFAULT_PLATFORM_SETTINGS }

  try {
    const rows = await supabaseSelect<{ key: string; value: any }>(
      `platform_settings?select=key,value&key=in.(${SETTING_KEYS.join(',')})`
    )

    const settings: PlatformSettings = { ...DEFAULT_PLATFORM_SETTINGS }

    for (const row of rows || []) {
      const key = normalizeKey(row.key)
      ;(settings as any)[key] = normalizeValue(key, row.value)
    }

    return settings
  } catch {
    return { ...DEFAULT_PLATFORM_SETTINGS }
  }
}

export async function updatePlatformSetting(key: string, value: unknown): Promise<PlatformSettings> {
  const settingKey = normalizeKey(key)
  const normalized = normalizeValue(settingKey, value)
  const updatedAt = new Date().toISOString()

  const updated = await supabasePatch(
    'platform_settings',
    `key=eq.${encodeURIComponent(settingKey)}`,
    {
      value: normalized,
      updated_at: updatedAt,
    }
  )

  if (!Array.isArray(updated) || updated.length === 0) {
    await supabaseInsert('platform_settings', {
      key: settingKey,
      value: normalized,
      description: settingKey,
      updated_at: updatedAt,
    })
  }

  return getPlatformSettings()
}
