import { httpClient } from '../../../shared/api/httpClient'

export function register({ email, password, name }) {
  return httpClient.post('/api/auth/register', { email, password, name })
}

export function login({ email, password }) {
  return httpClient.post('/api/auth/login', { email, password })
}

export function me() {
  return httpClient.get('/api/me')
}

export function logout() {
  return httpClient.post('/api/auth/logout')
}

export function changePassword({ oldPassword, newPassword }) {
  return httpClient.post('/api/auth/change-password', {
    old_password: oldPassword,
    new_password: newPassword,
  })
}

export function refreshToken() {
  return httpClient.post('/api/auth/refresh')
}
