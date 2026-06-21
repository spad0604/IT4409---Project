import { httpClient } from '../../../shared/api/httpClient'
import { env } from '../../../shared/config/env'
import { getToken } from '../../../shared/storage/token'

function encodeId(value) {
  return encodeURIComponent(String(value ?? ''))
}

export function getMyProfile() {
  return httpClient.get('/api/users/me')
}

export function updateMyProfile(patch) {
  return httpClient.patch('/api/users/me', patch)
}

export async function uploadMyAvatar(file) {
  const formData = new FormData()
  formData.append('file', file)
  const token = getToken()
  const response = await fetch(`${env.apiBaseUrl}/api/users/me/avatar`, {
    method: 'POST', headers: { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: formData,
  })
  const payload = await response.json().catch(() => null)
  if (!response.ok) throw new Error(payload?.message || 'Không thể tải ảnh lên')
  return payload?.data || payload
}

export function getMyPreferences() {
  return httpClient.get('/api/users/me/preferences')
}

export function updateMyPreferences(preferences) {
  return httpClient.put('/api/users/me/preferences', preferences)
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

export const changePassword = async (payload) => {
  const response = await httpClient.post('/api/auth/change-password', payload);
  return response?.data;
};
