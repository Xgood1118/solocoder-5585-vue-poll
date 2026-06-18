import { ref } from 'vue'
import type { TimeSyncResult } from '@/types'

export const timeOffset = ref(0)

export async function syncTime(): Promise<number> {
  try {
    const clientBefore = Date.now()
    const response = await fetch('https://worldtimeapi.org/api/timezone/Etc/UTC')
    const clientAfter = Date.now()
    const data = await response.json()
    const serverTime = data.unixtime * 1000
    const rtt = clientAfter - clientBefore
    const clientMid = clientBefore + Math.floor(rtt / 2)
    const offset = serverTime - clientMid
    timeOffset.value = offset
    return offset
  } catch {
    timeOffset.value = 0
    return 0
  }
}

export function getCorrectedTime(): number {
  return Date.now() + timeOffset.value
}

export function getTimeSyncResult(): TimeSyncResult {
  const clientTime = Date.now()
  return {
    serverTime: clientTime + timeOffset.value,
    clientTime,
    offset: timeOffset.value
  }
}
