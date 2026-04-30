export function safeLower(value) {
  return String(value ?? '').trim().toLowerCase()
}

export function toInitials(text) {
  const raw = String(text ?? '').trim()
  if (!raw) return ''
  const parts = raw.split(/\s+/).filter(Boolean)
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] : parts[0]?.[1] ?? ''
  return `${first}${last}`.toUpperCase()
}

export function priorityDisplay(priority) {
  const p = safeLower(priority)
  if (p === 'critical' || p === 'high') return { label: 'High', tone: 'high' }
  if (p === 'medium') return { label: 'Medium', tone: 'medium' }
  return { label: 'Low', tone: 'low' }
}

export function formatShortDate(value, locale) {
  if (!value) return ''
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  try {
    return new Intl.DateTimeFormat(locale, { month: 'short', day: '2-digit' }).format(date)
  } catch {
    return date.toLocaleDateString()
  }
}
