export function normalizeNorthAmericanPhone(input: unknown): string | null {
  const raw = String(input || '').trim()
  let digits = raw.replace(/\D/g, '')

  // UI shows +1 as a fixed prefix. Users enter 10 local digits.
  // But frontend may submit the normalized +1 number, so backend accepts both:
  // 4035551234 and +14035551234.
  if (digits.length === 11 && digits.startsWith('1')) {
    digits = digits.slice(1)
  }

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
