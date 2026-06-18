import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { VoteRecord, TimelinePoint, WSMessage } from '@/types'
import { broadcast, subscribeToPollSync } from '@/composables/useRealtimeSync'

const STORAGE_KEY = 'vue-poll-votes'

export const useVoteStore = defineStore('vote', () => {
  const votes = ref<VoteRecord[]>([])
  const timelinePoints = ref<TimelinePoint[]>([])

  function getVotesByPollId(pollId: string): VoteRecord[] {
    return votes.value.filter(v => v.pollId === pollId)
  }

  function getVoteCountsByPoll(pollId: string): Record<string, number> {
    const counts: Record<string, number> = {}
    for (const vote of getVotesByPollId(pollId)) {
      for (const sel of vote.selections) {
        counts[sel.optionId] = (counts[sel.optionId] ?? 0) + 1
      }
    }
    return counts
  }

  function getAverageRatings(pollId: string): Record<string, number> {
    const sums: Record<string, number> = {}
    const counts: Record<string, number> = {}
    for (const vote of getVotesByPollId(pollId)) {
      for (const sel of vote.selections) {
        if (sel.ratingValue !== undefined) {
          sums[sel.optionId] = (sums[sel.optionId] ?? 0) + sel.ratingValue
          counts[sel.optionId] = (counts[sel.optionId] ?? 0) + 1
        }
      }
    }
    const result: Record<string, number> = {}
    for (const optionId of Object.keys(sums)) {
      result[optionId] = sums[optionId] / counts[optionId]
    }
    return result
  }

  function getRankingScores(pollId: string): Record<string, number> {
    const scores: Record<string, number> = {}
    for (const vote of getVotesByPollId(pollId)) {
      for (const sel of vote.selections) {
        if (sel.rankOrder !== undefined) {
          scores[sel.optionId] = (scores[sel.optionId] ?? 0) + sel.rankOrder
        }
      }
    }
    return scores
  }

  function getVoterCount(pollId: string): number {
    const fingerprints = new Set(
      getVotesByPollId(pollId).map(v => v.voterFingerprint)
    )
    return fingerprints.size
  }

  function getTimelineByPoll(pollId: string): TimelinePoint[] {
    const pollVotes = getVotesByPollId(pollId)
    const pollOptionIds = new Set(pollVotes.flatMap(v => v.selections.map(s => s.optionId)))
    return timelinePoints.value.filter(tp => pollOptionIds.has(tp.optionId))
  }

  function addVote(record: VoteRecord): void {
    votes.value.push(record)
    for (const sel of record.selections) {
      const existing = timelinePoints.value.find(
        tp => tp.optionId === sel.optionId && tp.timestamp === record.votedAt
      )
      if (existing) {
        existing.count += 1
      } else {
        timelinePoints.value.push({
          timestamp: record.votedAt,
          optionId: sel.optionId,
          count: 1,
        })
      }
    }
    saveToStorage()
    const msg: WSMessage = {
      type: 'vote_submitted',
      payload: {
        pollId: record.pollId,
        voteId: record.id,
        counts: getVoteCountsByPoll(record.pollId),
        timestamp: record.votedAt,
      },
    }
    broadcast(msg)
  }

  function checkAntiFraud(pollId: string, fingerprint: string): { allowed: boolean; reason?: string } {
    const pollVotes = getVotesByPollId(pollId)
    const alreadyVoted = pollVotes.some(v => v.voterFingerprint === fingerprint)
    if (alreadyVoted) {
      return { allowed: false, reason: '该指纹已在此投票中投过票' }
    }
    const now = Date.now()
    const recentVotes = votes.value.filter(v => now - v.votedAt < 60_000)
    if (recentVotes.length > 5) {
      return { allowed: false, reason: '投票频率过高，请稍后再试' }
    }
    return { allowed: true }
  }

  function hasVoted(pollId: string, fingerprint: string): boolean {
    return getVotesByPollId(pollId).some(v => v.voterFingerprint === fingerprint)
  }

  function saveToStorage(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ votes: votes.value, timelinePoints: timelinePoints.value }))
  }

  function loadFromStorage(): void {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      try {
        const data = JSON.parse(raw)
        votes.value = data.votes ?? []
        timelinePoints.value = data.timelinePoints ?? []
      } catch {
        votes.value = []
        timelinePoints.value = []
      }
    }
  }

  loadFromStorage()

  if (typeof window !== 'undefined') {
    subscribeToPollSync((msg) => {
      if (msg.type === 'vote_submitted') {
        loadFromStorage()
      }
    })
  }

  return {
    votes,
    timelinePoints,
    getVotesByPollId,
    getVoteCountsByPoll,
    getAverageRatings,
    getRankingScores,
    getVoterCount,
    getTimelineByPoll,
    addVote,
    checkAntiFraud,
    hasVoted,
    saveToStorage,
    loadFromStorage,
  }
})
