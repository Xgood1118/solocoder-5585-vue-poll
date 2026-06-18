import { ref } from 'vue'
import type { TimeSyncResult } from '@/types'

export const timeOffset = ref<number>(0)
export const syncAttempts = ref<number>(0)
export const lastSyncAt = ref<number | null>(null)
export const syncSource = ref<string>('none')

const OFFSET_STORAGE_KEY = 'vue-poll-time-offset'
const SYNC_AT_STORAGE_KEY = 'vue-poll-time-offset-at'

function loadPersistedOffset() {
  try {
    const raw = localStorage.getItem(OFFSET_STORAGE_KEY)
    const rawAt = localStorage.getItem(SYNC_AT_STORAGE_KEY)
    if (raw && rawAt) {
      const savedOffset = Number(raw)
      const savedAt = Number(rawAt)
      if (!Number.isNaN(savedOffset) && !Number.isNaN(savedAt) && Date.now() - savedAt < 12 * 3600 * 1000) {
        timeOffset.value = savedOffset
        lastSyncAt.value = savedAt
        syncSource.value = 'persisted'
        return true
      }
    }
  } catch {
    /* ignore */
  }
  return false
}

function persistOffset(offset: number, source: string) {
  try {
    localStorage.setItem(OFFSET_STORAGE_KEY, String(offset))
    localStorage.setItem(SYNC_AT_STORAGE_KEY, String(Date.now()))
    lastSyncAt.value = Date.now()
    syncSource.value = source
  } catch {
    /* ignore */
  }
}

if (typeof window !== 'undefined') {
  loadPersistedOffset()
  window.addEventListener('vue-poll-time-offset', ((ev: CustomEvent<{ offset: number; rtt?: number; source?: string }>) => {
    const { offset, source } = ev.detail
    if (typeof offset === 'number' && Number.isFinite(offset)) {
      timeOffset.value = offset
      persistOffset(offset, source ?? 'ws-event')
    }
  }) as EventListener)
}

const TIME_ENDPOINTS: Array<{ url: string; kind: 'worldtime' | 'timeapi' | 'local' }> = [
  { url: typeof window !== 'undefined' ? `http://${window.location.hostname}:8136/time` : 'http://localhost:8136/time', kind: 'local' },
  { url: 'http://localhost:8136/time', kind: 'local' },
  { url: 'https://timeapi.io/api/Time/current/zone?timeZone=UTC', kind: 'timeapi' },
  { url: 'https://worldtimeapi.org/api/timezone/Etc/UTC', kind: 'worldtime' },
]

async function fetchEndpoint(ep: typeof TIME_ENDPOINTS[number], signal?: AbortSignal): Promise<number | null> {
  const clientBefore = Date.now()
  try {
    const resp = await fetch(ep.url, { signal, cache: 'no-store' })
    const clientAfter = Date.now()
    if (!resp.ok) return null
    const data = await resp.json()
    let serverTime: number | null = null
    if (ep.kind === 'worldtime' && typeof data.unixtime === 'number') {
      serverTime = data.unixtime * 1000
    } else if (ep.kind === 'timeapi' && typeof data.milliSeconds === 'number') {
      serverTime = data.milliSeconds
    } else if (ep.kind === 'local' && typeof data.serverTime === 'number') {
      serverTime = data.serverTime
    } else if (typeof data.unixtime === 'number') {
      serverTime = data.unixtime * 1000
    }
    if (!serverTime) return null
    const rtt = clientAfter - clientBefore
    const clientMid = clientBefore + Math.floor(rtt / 2)
    return serverTime - clientMid
  } catch {
    return null
  }
}

export async function syncTime(options?: { force?: boolean; timeoutMs?: number }): Promise<number> {
  const timeoutMs = options?.timeoutMs ?? 3500
  syncAttempts.value += 1

  import('@/composables/useWebSocket')
    .then((mod) => {
      if (mod.isWsConnected.value) {
        try { mod.requestTimeSync() } catch { /* ignore */ }
      }
    })
    .catch(() => { /* ignore */ })

  let offset: number | null = null
  let usedSource = ''
  for (let i = 0; i < TIME_ENDPOINTS.length; i++) {
    const ep = TIME_ENDPOINTS[i]
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), timeoutMs)
    const candidate = await fetchEndpoint(ep, ctrl.signal)
    clearTimeout(timer)
    if (candidate !== null && Number.isFinite(candidate)) {
      offset = candidate
      usedSource = `${ep.kind}:${i}`
      break
    }
  }

  if (offset !== null) {
    timeOffset.value = offset
    persistOffset(offset, usedSource)
    return offset
  }

  if (options?.force) {
    timeOffset.value = 0
    return 0
  }

  return timeOffset.value
}

export function getCorrectedTime(): number {
  return Date.now() + timeOffset.value
}

export function getTimeSyncResult(): TimeSyncResult {
  const clientTime = Date.now()
  return {
    serverTime: clientTime + timeOffset.value,
    clientTime,
    offset: timeOffset.value,
  }
}
