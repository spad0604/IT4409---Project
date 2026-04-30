import { env } from '../config/env'
import { getToken } from '../storage/token'

function toWsBaseUrl(httpBaseUrl) {
  const raw = String(httpBaseUrl ?? '').trim()
  const normalized = raw.startsWith('https://')
    ? `wss://${raw.slice('https://'.length)}`
    : raw.startsWith('http://')
      ? `ws://${raw.slice('http://'.length)}`
      : raw

  try {
    const url = new URL(normalized)
    if (url.pathname.endsWith('/api')) {
      url.pathname = url.pathname.slice(0, -4) || '/'
    }
    return url.toString().replace(/\/$/, '')
  } catch {
    // Fallback for already-formed ws(s) URLs or non-standard env values.
    return normalized.replace(/\/api\/?$/, '')
  }
}

/**
 * Minimal WS connector for `/ws?token=...`.
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
  const url = `${wsBase}/ws?token=${encodeURIComponent(String(resolvedToken))}`
  return new WebSocket(url)
}

/**
 * Enhanced WS client with automatic reconnection and event listeners
 *
 * Usage:
 * const client = new WsClient()
 * client.on('issue_updated', (data) => { ... })
 * client.on('comment_added', (data) => { ... })
 * client.connect()
 * client.disconnect()
 */
export class WsClient {
  constructor() {
    this.ws = null
    this.listeners = new Map()
    this.reconnectDelay = 1000
    this.maxReconnectDelay = 30000
    this.isConnecting = false
    this.shouldReconnect = false
    this.reconnectTimeout = null
  }

  /**
   * Register event listener
   * Events: issue_updated, issue_created, comment_added, member_online, etc.
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }
    this.listeners.get(event).push(callback)
    return () => this.off(event, callback) // unsubscribe function
  }

  /**
   * Unregister event listener
   */
  off(event, callback) {
    if (!this.listeners.has(event)) return
    const callbacks = this.listeners.get(event)
    const index = callbacks.indexOf(callback)
    if (index >= 0) callbacks.splice(index, 1)
  }

  /**
   * Emit event to all listeners
   */
  emit(event, data) {
    if (!this.listeners.has(event)) return
    this.listeners.get(event).forEach((cb) => {
      try {
        cb(data)
      } catch (err) {
        console.error(`[WsClient] Error in listener for event "${event}":`, err)
      }
    })
  }

  /**
   * Connect to WebSocket
   */
  connect(token = null) {
    if (this.isConnecting || this.ws?.readyState === WebSocket.OPEN) return
    this.isConnecting = true
    this.shouldReconnect = true

    try {
      this.ws = connectWs({ token })
      this.ws.onopen = () => {
        this.isConnecting = false
        this.reconnectDelay = 1000 // reset delay on successful connection
        this.emit('connected')
      }

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          if (message?.type && message?.data) {
            this.emit(message.type, message.data)
          }
        } catch (err) {
          console.error('[WsClient] Failed to parse message:', err)
        }
      }

      this.ws.onerror = (err) => {
        console.error('[WsClient] WebSocket error:', err)
        this.emit('error', err)
      }

      this.ws.onclose = () => {
        this.isConnecting = false
        this.emit('disconnected')
        if (this.shouldReconnect) {
          this.scheduleReconnect()
        }
      }
    } catch (err) {
      this.isConnecting = false
      console.error('[WsClient] Failed to connect:', err)
      this.emit('error', err)
      if (this.shouldReconnect) {
        this.scheduleReconnect()
      }
    }
  }

  /**
   * Schedule automatic reconnection
   */
  scheduleReconnect() {
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout)
    this.reconnectTimeout = setTimeout(() => {
      if (this.shouldReconnect) {
        this.connect()
        // Exponential backoff, but cap at maxReconnectDelay
        this.reconnectDelay = Math.min(
          this.reconnectDelay * 1.5,
          this.maxReconnectDelay,
        )
      }
    }, this.reconnectDelay)
  }

  /**
   * Disconnect and clean up
   */
  disconnect() {
    this.shouldReconnect = false
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout)
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.emit('disconnected')
  }

  /**
   * Check if currently connected
   */
  isConnected() {
    return this.ws?.readyState === WebSocket.OPEN
  }

  /**
   * Send message to server
   */
  send(type, data) {
    if (!this.isConnected()) {
      console.warn('[WsClient] Not connected, cannot send message')
      return
    }
    try {
      this.ws.send(JSON.stringify({ type, data }))
    } catch (err) {
      console.error('[WsClient] Failed to send message:', err)
    }
  }
}
