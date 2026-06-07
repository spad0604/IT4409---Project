import { httpClient } from '../../../shared/api/httpClient'

function encodeId(value) {
  return encodeURIComponent(String(value ?? ''))
}

export function getMyProfile() {
  return httpClient.get('/api/users/me')
}

export function updateMyProfile(patch) {
  return httpClient.patch('/api/users/me', patch)
}

export function getUser(userId) {
  return httpClient.get(`/api/users/${encodeId(userId)}`)
}

export function searchUsers({ search, page, perPage } = {}) {
  const params = new URLSearchParams()
  if (search) params.set('search', search)
  if (page !== undefined && page !== null) params.set('page', String(page))
  if (perPage !== undefined && perPage !== null) params.set('per_page', String(perPage))
  const qs = params.toString()
  return httpClient.get(`/api/users${qs ? `?${qs}` : ''}`)
}
