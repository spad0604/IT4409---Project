import { env } from '../../../shared/config/env'
import { getToken } from '../../../shared/storage/token'

function encodeId(value) {
  return encodeURIComponent(String(value ?? ''))
}

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

async function parseJsonOrNull(res) {
  try {
    return await res.json()
  } catch {
    return null
  }
}

function normalizeError(res, payload) {
  const message = payload?.message || payload?.error || res.statusText || 'Request failed'
  const err = new Error(message)
  err.status = res.status
  err.data = isEnvelope(payload) ? payload.data : payload
  return err
}

/**
 * POST /api/issues/{issueKey}/attachments
 * Swagger: multipart/form-data field name: `file`
 */
export async function uploadAttachment(issueKey, file) {
  const url = `${env.apiBaseUrl}/api/issues/${encodeId(issueKey)}/attachments`

  const formData = new FormData()
  formData.append('file', file)

  const token = getToken()
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  })

  const payload = await parseJsonOrNull(res)

  if (!res.ok) throw normalizeError(res, payload)
  if (payload === null) return null
  return isEnvelope(payload) ? payload.data : payload
}

export async function listAttachments(issueKey) {
  const url = `${env.apiBaseUrl}/api/issues/${encodeId(issueKey)}/attachments`
  const token = getToken()

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })

  const payload = await parseJsonOrNull(res)
  if (!res.ok) throw normalizeError(res, payload)

  if (res.status === 204 || payload === null) return null
  return isEnvelope(payload) ? payload.data : payload
}

/**
 * GET /api/attachments/{attachmentID}
 * Returns a Blob + some metadata for callers to trigger download.
 */
export async function downloadAttachment(attachmentId) {
  const url = `${env.apiBaseUrl}/api/attachments/${encodeId(attachmentId)}`
  const token = getToken()

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })

  if (!res.ok) {
    const payload = await parseJsonOrNull(res)
    throw normalizeError(res, payload)
  }

  const blob = await res.blob()
  const contentType = res.headers.get('content-type') || ''
  const contentDisposition = res.headers.get('content-disposition') || ''

  return { blob, contentType, contentDisposition }
}

export async function deleteAttachment(attachmentId) {
  const url = `${env.apiBaseUrl}/api/attachments/${encodeId(attachmentId)}`
  const token = getToken()

  const res = await fetch(url, {
    method: 'DELETE',
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })

  if (res.status === 204) return null

  const payload = await parseJsonOrNull(res)
  if (!res.ok) throw normalizeError(res, payload)

  if (payload === null) return null
  return isEnvelope(payload) ? payload.data : payload
}
