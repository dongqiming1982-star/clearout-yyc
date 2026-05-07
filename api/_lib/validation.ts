export function normalizeNorthAmericanPhone(input: unknown): string | null {
  const raw = String(input || '').trim()
  const digits = raw.replace(/\D/g, '')

  // The +1 country code is fixed by the platform UI.
  // Users must enter the 10-digit local number only.
  if (digits.length !== 10) return null

  // NANP rule: area code and exchange cannot start with 0 or 1.
  if (!/^[2-9]\d{2}[2-9]\d{6}$/.test(digits)) return null

  // Reject obvious fake numbers like 1111111111 or 5555555555.
  if (/^(\d)\1{9}$/.test(digits)) return null

  return `+1${digits}`
}

export function normalizeEmail(input: unknown): string | null {
  const email = String(input || '').trim().toLowerCase()
  if (!email) return null
  if (email.length > 254) return null
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return null
  return email
}

export function normalizeOptionalEmail(input: unknown): string | null {
  const raw = String(input || '').trim()
  if (!raw) return ''
  return normalizeEmail(raw)
}
