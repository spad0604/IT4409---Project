import { httpClient } from '../../../shared/api/httpClient'

function encodeId(value) {
  return encodeURIComponent(String(value ?? ''))
}

export function addComment(issueKey, { content }) {
  return httpClient.post(`/api/issues/${encodeId(issueKey)}/comments`, { content })
}

export function listComments(issueKey, { page, perPage } = {}) {
  const params = new URLSearchParams()
  if (page !== undefined && page !== null) params.set('page', String(page))
  if (perPage !== undefined && perPage !== null) params.set('per_page', String(perPage))
  const qs = params.toString()
  return httpClient.get(`/api/issues/${encodeId(issueKey)}/comments${qs ? `?${qs}` : ''}`)
}

export function editComment(commentId, { content }) {
  return httpClient.patch(`/api/comments/${encodeId(commentId)}`, { content })
}

export function deleteComment(commentId) {
  return httpClient.delete(`/api/comments/${encodeId(commentId)}`)
}
