import { env } from '../config/env'
import { getToken } from '../storage/token'

function toWsBaseUrl(httpBaseUrl) {
  const raw = String(httpBaseUrl ?? '').trim()
  if (raw.startsWith('https://')) return `wss://${raw.slice('https://'.length)}`
  if (raw.startsWith('http://')) return `ws://${raw.slice('http://'.length)}`
  // fallback: assume already ws(s)
  return raw
}

/**
 * Minimal WS connector for `/api/ws?token=...`.
 *
 * Usage:
 * const ws = connectWs();
 * ws.onmessage = (evt) => { ... }
 * ws.close();
 */
export function connectWs({ token } = {}) {
  const resolvedToken = token ?? getToken()
  if (!resolvedToken) throw new Error('Missing token for WebSocket')

  const wsBase = toWsBaseUrl(env.apiBaseUrl)
  const url = `${wsBase}/api/ws?token=${encodeURIComponent(String(resolvedToken))}`
  return new WebSocket(url)
}
