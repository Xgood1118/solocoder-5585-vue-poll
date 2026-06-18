import { ref } from 'vue'
import type { WSMessage } from '@/types'

export const isWsConnected = ref(false)
export const lastWsMessage = ref<WSMessage | null>(null)
export const lastServerTime = ref<number | null>(null)

const WS_URLS = [
  typeof window !== 'undefined' ? `ws://${window.location.hostname}:8136/ws` : 'ws://localhost:8136/ws',
  'ws://localhost:8136/ws',
]

let ws: WebSocket | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let reconnectAttempts = 0
let currentPollId: string | null = null
let closeIntentionally = false

const listeners = new Set<(msg: WSMessage) => void>()

function getReconnectDelay(): number {
  const base = Math.min(1000 * Math.pow(2, reconnectAttempts), 15_000)
  reconnectAttempts += 1
  return base + Math.floor(Math.random() * 500)
}

function pickNextUrl(attempt: number): string {
  return WS_URLS[attempt % WS_URLS.length]
}

function triggerLocalSync(msg: WSMessage) {
  import('@/composables/useRealtimeSync')
    .then((mod) => {
      try { mod.broadcast(msg) } catch { /* ignore */ }
    })
    .catch(() => { /* ignore circular import failures */ })
}

function dispatchToListeners(msg: WSMessage) {
  lastWsMessage.value = msg
  for (const l of listeners) {
    try { l(msg) } catch { /* ignore */ }
  }
}

export function connect(pollId: string) {
  if (typeof window === 'undefined') return
  closeIntentionally = false
  disconnect()
  currentPollId = pollId

  const url = pickNextUrl(reconnectAttempts)
  try {
    ws = new WebSocket(url)
  } catch {
    scheduleReconnect()
    return
  }

  ws.onopen = () => {
    isWsConnected.value = true
    reconnectAttempts = 0
    if (!ws) return
    try {
      ws.send(JSON.stringify({ type: 'subscribe', payload: { pollId } }))
      ws.send(JSON.stringify({ type: 'time_sync', payload: { clientBefore: Date.now() } }))
    } catch {
      /* ignore */
    }
  }

  ws.onmessage = (ev: MessageEvent) => {
    try {
      const raw = typeof ev.data === 'string' ? ev.data : ''
      if (!raw) return
      const parsed = JSON.parse(raw) as WSMessage
      const payload = parsed.payload ?? {}
      if (typeof payload.serverTime === 'number') {
        lastServerTime.value = payload.serverTime
      }
      if (parsed.type === 'time_sync' && typeof payload.clientBefore === 'number' && typeof payload.serverTime === 'number') {
        const after = Date.now()
        const rtt = after - payload.clientBefore
        const mid = payload.clientBefore + Math.floor(rtt / 2)
        const offset = payload.serverTime - mid
        try {
          const ev2 = new CustomEvent('vue-poll-time-offset', { detail: { offset, rtt, source: 'ws' } })
          window.dispatchEvent(ev2)
        } catch {
          /* ignore */
        }
      }
      dispatchToListeners(parsed)
      if (parsed.type === 'storage_update' && payload.key) {
        triggerLocalSync({
          type: payload.key === 'vue-poll-votes' ? 'vote_submitted' : 'poll_updated',
          payload: { serverTime: payload.serverTime },
        })
      }
    } catch {
      /* ignore malformed */
    }
  }

  ws.onclose = () => {
    isWsConnected.value = false
    scheduleReconnect()
  }

  ws.onerror = () => {
    isWsConnected.value = false
  }
}

export function scheduleReconnect() {
  if (closeIntentionally) return
  if (reconnectTimer) clearTimeout(reconnectTimer)
  const delay = getReconnectDelay()
  reconnectTimer = setTimeout(() => {
    if (currentPollId) connect(currentPollId)
  }, delay)
}

export function disconnect() {
  closeIntentionally = true
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
  if (ws) {
    try { ws.close() } catch { /* ignore */ }
    ws.onopen = null
    ws.onmessage = null
    ws.onclose = null
    ws.onerror = null
    ws = null
  }
  isWsConnected.value = false
  currentPollId = null
}

export function send(msg: WSMessage): boolean {
  if (!ws || ws.readyState !== WebSocket.OPEN) return false
  try {
    ws.send(JSON.stringify(msg))
    return true
  } catch {
    return false
  }
}

export function requestTimeSync() {
  if (!ws || ws.readyState !== WebSocket.OPEN) return
  try {
    ws.send(JSON.stringify({ type: 'time_sync', payload: { clientBefore: Date.now() } }))
  } catch {
    /* ignore */
  }
}

export function subscribe(callback: (msg: WSMessage) => void): () => void {
  listeners.add(callback)
  return () => { listeners.delete(callback) }
}

export function useWebSocket() {
  return {
    connect,
    disconnect,
    send,
    requestTimeSync,
    subscribe,
    isWsConnected,
    lastWsMessage,
    lastServerTime,
  }
}
