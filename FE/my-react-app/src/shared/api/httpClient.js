import { env } from '../config/env'
import { getToken } from '../storage/token'

/**
 * Backend envelope:
 * { status: number, message: string, data: any }
 */
async function request(path, { method = 'GET', body, headers } = {}) {
  const url = `${env.apiBaseUrl}${path}`

  const token = getToken()
  const res = await fetch(url, {
    method,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(headers ?? {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  let payload = null
  try {
    payload = await res.json()
  } catch {
    // non-json
  }

  // Normalize errors
  if (!res.ok) {
    const message = payload?.message || payload?.error || res.statusText || 'Request failed'
    const err = new Error(message)
    err.status = res.status
    err.data = payload?.data
    throw err
  }

  return payload?.data
}

export const httpClient = {
  get: (path, options) => request(path, { ...options, method: 'GET' }),
  post: (path, body, options) => request(path, { ...options, method: 'POST', body }),
}
