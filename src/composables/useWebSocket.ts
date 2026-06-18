import { ref } from 'vue'
import type { WSMessage } from '@/types'

class MockWebSocket {
  readyState: number = 0
  onopen: ((ev: Event) => void) | null = null
  onmessage: ((ev: MessageEvent) => void) | null = null
  onclose: ((ev: CloseEvent) => void) | null = null
  onerror: ((ev: Event) => void) | null = null

  private _connectTimer: ReturnType<typeof setTimeout> | null = null

  constructor() {
    this._connectTimer = setTimeout(() => {
      this.readyState = 1
      this.onopen?.(new Event('open'))
    }, 500)
  }

  send(data: string): void {
    console.log('[MockWS] send:', data)
  }

  close(): void {
    if (this._connectTimer) {
      clearTimeout(this._connectTimer)
      this._connectTimer = null
    }
    this.readyState = 3
    this.onclose?.(new CloseEvent('close'))
  }

  dispatchMessage(data: WSMessage): void {
    if (this.readyState !== 1) return
    this.onmessage?.(new MessageEvent('message', { data: JSON.stringify(data) }))
  }
}

export function useWebSocket() {
  const isConnected = ref(false)
  const lastMessage = ref<WSMessage | null>(null)

  let ws: MockWebSocket | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let reconnectAttempts = 0
  let currentPollId = ''

  const maxReconnectDelay = 30000

  function getReconnectDelay(): number {
    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), maxReconnectDelay)
    reconnectAttempts++
    return delay
  }

  function scheduleReconnect() {
    if (reconnectTimer) clearTimeout(reconnectTimer)
    const delay = getReconnectDelay()
    reconnectTimer = setTimeout(() => {
      if (currentPollId) {
        connect(currentPollId)
      }
    }, delay)
  }

  function connect(pollId: string) {
    disconnect()
    currentPollId = pollId
    reconnectAttempts = 0

    ws = new MockWebSocket()

    ws.onopen = () => {
      isConnected.value = true
      ws!.send(JSON.stringify({ type: 'subscribe', pollId }))
    }

    ws.onmessage = (ev: MessageEvent) => {
      try {
        const parsed: WSMessage = JSON.parse(ev.data)
        lastMessage.value = parsed
      } catch {
        // ignore malformed messages
      }
    }

    ws.onclose = () => {
      isConnected.value = false
      scheduleReconnect()
    }

    ws.onerror = () => {
      isConnected.value = false
    }
  }

  function disconnect() {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
    if (ws) {
      ws.onclose = null
      ws.close()
      ws = null
    }
    isConnected.value = false
    currentPollId = ''
  }

  function simulateVoteUpdate(pollId: string, optionId: string) {
    if (!ws || ws.readyState !== 1) return
    ws.dispatchMessage({
      type: 'vote_update',
      payload: {
        pollId,
        optionId,
        timestamp: Date.now()
      }
    })
  }

  return {
    connect,
    disconnect,
    isConnected,
    lastMessage,
    simulateVoteUpdate
  }
}
