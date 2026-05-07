export function normalizeNorthAmericanPhone(input: unknown): string | null {
  const raw = String(input || '').trim()
  let digits = raw.replace(/\D/g, '')

  // The UI shows +1 as a fixed country-code prefix.
  // Users enter the 10-digit local number only.
  // Backend also tolerates a normalized +1 number from the frontend.
  if (digits.length === 11 && digits.startsWith('1')) {
    digits = digits.slice(1)
  }

  if (digits.length !== 10) return null

  // NANP rule: area code and exchange cannot start with 0 or 1.
  if (!/^[2-9]\d{2}[2-9]\d{6}$/.test(digits)) return null

  // Reject obvious fake numbers.
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
