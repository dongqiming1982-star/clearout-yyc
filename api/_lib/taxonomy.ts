export type DispatchArea = 'all_calgary' | 'central' | 'nw' | 'ne' | 'sw' | 'se' | 'unknown'
export type StandardJobType =
  | 'mattress_bed'
  | 'furniture_household'
  | 'moveout_garage_cleanout'
  | 'appliances_electronics'
  | 'yard_waste'
  | 'renovation_debris'
  | 'general_review'

export const areaOptions = [
  { id: 'central', en: 'Central / Downtown', zh: '市中心 / Central' },
  { id: 'nw', en: 'NW Calgary', zh: '西北 NW' },
  { id: 'ne', en: 'NE Calgary', zh: '东北 NE' },
  { id: 'sw', en: 'SW Calgary', zh: '西南 SW' },
  { id: 'se', en: 'SE Calgary', zh: '东南 SE' },
] as const

export const providerAreaOptions = [
  { id: 'all_calgary', en: 'All Calgary', zh: '全 Calgary' },
  ...areaOptions,
] as const

export const requestCategories = [
  { id: 'mattress_bed', standard: 'mattress_bed', en: 'Mattress / bed', zh: '床垫 / 床架', icon: '🛏️' },
  { id: 'sofa_furniture', standard: 'furniture_household', en: 'Sofa / furniture', zh: '沙发 / 家具', icon: '🛋️' },
  { id: 'move_out_leftovers', standard: 'moveout_garage_cleanout', en: 'Move-out leftovers', zh: '退租剩余杂物', icon: '📦' },
  { id: 'garage_basement', standard: 'moveout_garage_cleanout', en: 'Garage / basement junk', zh: '车库 / 地下室杂物', icon: '🧰' },
  { id: 'appliances_electronics', standard: 'appliances_electronics', en: 'Appliances / electronics', zh: '家电 / 电子废料', icon: '🔌' },
  { id: 'yard_waste', standard: 'yard_waste', en: 'Yard waste / branches', zh: '庭院垃圾 / 树枝', icon: '🌿' },
  { id: 'renovation_debris', standard: 'renovation_debris', en: 'Renovation debris', zh: '装修尾料', icon: '🧱' },
  { id: 'not_sure', standard: 'general_review', en: 'Not sure / upload photos', zh: '不确定 / 上传照片', icon: '📷' },
] as const

export const providerServiceOptions = [
  { id: 'mattress_bed', en: 'Mattress / bed', zh: '床垫 / 床架' },
  { id: 'furniture_household', en: 'Furniture / household items', zh: '家具 / 家庭杂物' },
  { id: 'moveout_garage_cleanout', en: 'Move-out / garage cleanout', zh: '退租 / 车库清理' },
  { id: 'appliances_electronics', en: 'Appliances / electronics', zh: '家电 / 电子废料' },
  { id: 'yard_waste', en: 'Yard waste', zh: '庭院垃圾' },
  { id: 'renovation_debris', en: 'Renovation debris', zh: '装修尾料' },
] as const

const AREA_ALIASES: Array<{ area: Exclude<DispatchArea, 'all_calgary' | 'unknown'>; terms: string[] }> = [
  { area: 'central', terms: ['beltline', 'downtown', 'city centre', 'city center', 'mission', 'kensington', 'bridgeland', 'inglewood', 'marda loop', 'altadore', 't2p', 't2r', 't2g'] },
  { area: 'nw', terms: ['northwest', 'panorama hills', 'evanston', 'sage hill', 'tuscany', 'royal oak', 'varsity', 'brentwood', 'bowness', 't2k', 't2l', 't2m', 't2n', 't3a', 't3b', 't3g', 't3k'] },
  { area: 'ne', terms: ['northeast', 'saddle ridge', 'saddleridge', 'taradale', 'skyview', 'falconridge', 'rundle', 'marlborough', 't1y', 't2a', 't2e', 't3j', 't3n'] },
  { area: 'sw', terms: ['southwest', 'signal hill', 'west springs', 'aspen', 'springbank hill', 'evergreen', 'shawnessy', 'somerset', 't2s', 't2t', 't2v', 't2w', 't2y', 't3c', 't3e', 't3h'] },
  { area: 'se', terms: ['southeast', 'mahogany', 'auburn bay', 'seton', 'mckenzie towne', 'mckenzie', 'cranston', 'new brighton', 'copperfield', 't2b', 't2c', 't2z', 't3m'] },
]

export function extractPostalFsa(value: unknown) {
  const match = String(value || '').toUpperCase().replace(/\s+/g, ' ').match(/\b(T\d[A-Z])\b/)
  return match ? match[1] : ''
}

export function normalizeDispatchArea(rawArea: unknown, locationText: unknown = ''): DispatchArea {
  const area = String(rawArea || '').trim().toLowerCase().replace(/[\s-]+/g, '_')
  if (['central', 'nw', 'ne', 'sw', 'se', 'all_calgary'].includes(area)) return area as DispatchArea

  const text = `${String(rawArea || '')} ${String(locationText || '')}`.trim().toLowerCase()
  const fsa = extractPostalFsa(locationText).toLowerCase()
  const haystack = fsa ? `${text} ${fsa}` : text

  if (/\bnw\b/.test(haystack)) return 'nw'
  if (/\bne\b/.test(haystack)) return 'ne'
  if (/\bsw\b/.test(haystack)) return 'sw'
  if (/\bse\b/.test(haystack)) return 'se'

  for (const item of AREA_ALIASES) {
    if (item.terms.some(term => haystack.includes(term))) return item.area
  }

  return 'unknown'
}

export function normalizeRequestCategory(value: unknown): StandardJobType {
  const id = String(value || '').trim().toLowerCase()
  const direct = providerServiceOptions.find(option => option.id === id)
  if (direct) return direct.id as StandardJobType
  const request = requestCategories.find(option => option.id === id)
  if (request) return request.standard as StandardJobType
  if (id.includes('sofa') || id.includes('furniture')) return 'furniture_household'
  if (id.includes('move') || id.includes('garage') || id.includes('basement')) return 'moveout_garage_cleanout'
  if (id.includes('appliance') || id.includes('electronic')) return 'appliances_electronics'
  if (id.includes('yard') || id.includes('branch')) return 'yard_waste'
  if (id.includes('renovation') || id.includes('construction')) return 'renovation_debris'
  if (id.includes('mattress') || id.includes('bed')) return 'mattress_bed'
  return 'general_review'
}

export function normalizeLeadServiceType(values: unknown): StandardJobType {
  const items = Array.isArray(values) ? values : [values]
  for (const item of items) {
    const normalized = normalizeRequestCategory(item)
    if (normalized !== 'general_review') return normalized
  }
  return 'general_review'
}

export function normalizeProviderServiceTypes(values: unknown): StandardJobType[] {
  const items = Array.isArray(values) ? values : []
  const normalized = [...new Set(items.map(normalizeRequestCategory).filter(v => v !== 'general_review'))]
  return normalized.length ? normalized : ['mattress_bed', 'furniture_household', 'moveout_garage_cleanout']
}

export function normalizeProviderDispatchAreas(values: unknown): DispatchArea[] {
  const items = Array.isArray(values) ? values : []
  const normalized = [...new Set(items.map(item => normalizeDispatchArea(item)).filter(v => v !== 'unknown'))]
  return normalized.length ? normalized : ['all_calgary']
}

export function getCompatibleJobTypes(type: StandardJobType): StandardJobType[] {
  if (['renovation_debris', 'appliances_electronics', 'yard_waste'].includes(type)) return [type]
  if (type === 'general_review') return ['mattress_bed', 'furniture_household', 'moveout_garage_cleanout']
  return ['mattress_bed', 'furniture_household', 'moveout_garage_cleanout']
}
