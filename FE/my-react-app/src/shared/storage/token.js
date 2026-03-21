const KEY = 'it4409_token'

export function getToken() {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

export function setToken(token) {
  try {
    if (!token) localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, token)
  } catch {
    // ignore
  }
}
