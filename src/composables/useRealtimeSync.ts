import { ref } from 'vue'
import type { WSMessage } from '@/types'

const CHANNEL_NAME = 'vue-poll-sync'
const STORAGE_EVENT_KEY = 'vue-poll-sync-storage'

let broadcastChannel: BroadcastChannel | null = null
const listeners = new Set<(msg: WSMessage) => void>()
const storageHandlerRegistered = ref(false)
const connectedClients = new Set<string>()
const clientId = (typeof crypto !== 'undefined' && crypto.randomUUID)
  ? crypto.randomUUID()
  : 'client-' + Math.random().toString(36).slice(2, 10)

function getChannel(): BroadcastChannel | null {
  if (typeof BroadcastChannel === 'undefined') return null
  if (!broadcastChannel) {
    try {
      broadcastChannel = new BroadcastChannel(CHANNEL_NAME)
      broadcastChannel.onmessage = (ev: MessageEvent) => {
        const msg = ev.data as WSMessage & { __sender?: string }
        if (msg.__sender === clientId) return
        for (const l of listeners) {
          try { l(msg) } catch (e) { /* ignore */ }
        }
      }
    } catch {
      broadcastChannel = null
    }
  }
  return broadcastChannel
}

function ensureStorageHandler() {
  if (storageHandlerRegistered.value) return
  if (typeof window === 'undefined') return
  window.addEventListener('storage', (e: StorageEvent) => {
    if (e.key !== STORAGE_EVENT_KEY || !e.newValue) return
    try {
      const msg = JSON.parse(e.newValue) as WSMessage & { __sender?: string; __ts?: number }
      if (msg.__sender === clientId) return
      const lastSeen = Number(sessionStorage.getItem(STORAGE_EVENT_KEY + '_last') || '0')
      if (msg.__ts && msg.__ts <= lastSeen) return
      if (msg.__ts) sessionStorage.setItem(STORAGE_EVENT_KEY + '_last', String(msg.__ts))
      for (const l of listeners) {
        try { l(msg) } catch (e) { /* ignore */ }
      }
    } catch { /* ignore parse errors */ }
  })
  storageHandlerRegistered.value = true
}

export function broadcast(msg: WSMessage) {
  const envelope = msg as WSMessage & { __sender: string; __ts: number }
  envelope.__sender = clientId
  envelope.__ts = Date.now()

  const channel = getChannel()
  if (channel) {
    try { channel.postMessage(envelope) } catch { /* ignore */ }
  }

  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_EVENT_KEY, JSON.stringify(envelope))
    } catch { /* ignore quota errors */ }
  }

  connectedClients.add(clientId)
}

export function subscribeToPollSync(callback: (msg: WSMessage) => void): () => void {
  getChannel()
  ensureStorageHandler()
  listeners.add(callback)
  return () => { listeners.delete(callback) }
}

export function getClientId(): string {
  return clientId
}

export function hasConnectedPeers(): boolean {
  return connectedClients.size > 1
}

export function heartbeat(pollId: string) {
  broadcast({
    type: 'connection_established',
    payload: { pollId, timestamp: Date.now() },
  })
}
