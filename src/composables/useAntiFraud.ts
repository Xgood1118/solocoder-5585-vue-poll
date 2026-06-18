import { ref } from 'vue'
import { generateCanvasFingerprint } from '@/utils/fingerprint'
import { useVoteStore } from '@/stores/voteStore'

const UA_BLACKLIST = ['bot', 'crawl', 'spider', 'headless', 'phantomjs', 'selenium', 'puppeteer']

export function useAntiFraud() {
  const fingerprint = ref('')
  const voteTimestamps = new Map<string, number[]>()

  if (!fingerprint.value) {
    fingerprint.value = generateCanvasFingerprint()
  }

  function isUABlocked(): boolean {
    const ua = navigator.userAgent.toLowerCase()
    return UA_BLACKLIST.some(pattern => ua.includes(pattern))
  }

  function isVoteFrequent(pollId: string): boolean {
    const timestamps = voteTimestamps.get(pollId) || []
    const now = Date.now()
    const recentVotes = timestamps.filter(ts => now - ts < 60000)
    return recentVotes.length >= 3
  }

  function recordVote(pollId: string): void {
    const timestamps = voteTimestamps.get(pollId) || []
    timestamps.push(Date.now())
    voteTimestamps.set(pollId, timestamps)
  }

  function checkVote(pollId: string): { allowed: boolean; reason?: string } {
    if (isUABlocked()) {
      return { allowed: false, reason: '检测到自动化浏览器环境' }
    }

    if (isVoteFrequent(pollId)) {
      return { allowed: false, reason: '投票频率过高，请稍后再试' }
    }

    const voteStore = useVoteStore()
    const storeResult = voteStore.checkAntiFraud(pollId, fingerprint.value)

    if (!storeResult.allowed) {
      return storeResult
    }

    recordVote(pollId)
    return { allowed: true }
  }

  return {
    checkVote,
    fingerprint
  }
}
