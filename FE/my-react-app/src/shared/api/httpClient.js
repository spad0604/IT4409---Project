import { env } from '../config/env'
import { getToken } from '../storage/token'

/**
 * Backend envelope:
 * { status: number, message: string, data: any }
 */
function isEnvelope(payload) {
  return Boolean(
    payload
      && typeof payload === 'object'
      && !Array.isArray(payload)
      && 'status' in payload
      && 'message' in payload
      && 'data' in payload,
  )
}

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

  // 204 No Content and non-json success responses should map to null.
  if (res.status === 204 || payload === null) {
    if (!res.ok) {
      const err = new Error(res.statusText || 'Request failed')
      err.status = res.status
      err.data = null
      throw err
    }
    return null
  }

  // Normalize errors
  if (!res.ok) {
    const message = payload?.message || payload?.error || res.statusText || 'Request failed'
    const err = new Error(message)
    err.status = res.status
    err.data = isEnvelope(payload) ? payload.data : payload
    throw err
  }

  return isEnvelope(payload) ? payload.data : payload
}

export const httpClient = {
  get: (path, options) => request(path, { ...options, method: 'GET' }),
  post: (path, body, options) => request(path, { ...options, method: 'POST', body }),
  put: (path, body, options) => request(path, { ...options, method: 'PUT', body }),
  patch: (path, body, options) => request(path, { ...options, method: 'PATCH', body }),
  delete: (path, options) => request(path, { ...options, method: 'DELETE' }),
}
