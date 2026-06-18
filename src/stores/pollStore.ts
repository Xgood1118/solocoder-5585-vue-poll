import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { Poll, PollStatus, WSMessage } from '@/types'
import { generateId } from '@/utils/id'
import { broadcast, subscribeToPollSync } from '@/composables/useRealtimeSync'
import { getCorrectedTime } from '@/utils/timeSync'

const STORAGE_KEY = 'vue-poll-polls'

function savePolls(polls: Poll[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(polls))
}

function broadcastPollChange(operation: 'create' | 'update' | 'delete' | 'duplicate' | 'archive' | 'unarchive' | 'seal' = 'update', pollId?: string) {
  const msg: WSMessage = {
    type: 'poll_updated',
    payload: {
      operation,
      pollId,
      timestamp: Date.now(),
    },
  }
  broadcast(msg)
}

export const usePollStore = defineStore('poll', () => {
  const polls = ref<Poll[]>([])

  const activePolls = computed(() =>
    polls.value
      .filter(p => p.status === 'active' && !p.isArchived)
      .sort((a, b) => b.createdAt - a.createdAt)
  )

  const closedPolls = computed(() =>
    polls.value
      .filter(p => p.status === 'closed' || p.isSealed)
      .sort((a, b) => b.createdAt - a.createdAt)
  )

  const draftPolls = computed(() =>
    polls.value
      .filter(p => p.status === 'draft')
      .sort((a, b) => b.createdAt - a.createdAt)
  )

  const archivedPolls = computed(() =>
    polls.value
      .filter(p => p.isArchived)
      .sort((a, b) => b.createdAt - a.createdAt)
  )

  function getPollById(id: string): Poll | undefined {
    return polls.value.find(p => p.id === id)
  }

  function createPoll(data: Partial<Poll>): Poll {
    const now = Date.now()
    const poll: Poll = {
      id: generateId(),
      title: data.title ?? '',
      description: data.description ?? '',
      type: data.type ?? 'single',
      deadline: data.deadline ?? 0,
      isArchived: false,
      isSealed: false,
      createdAt: now,
      updatedAt: now,
      status: data.status ?? 'draft',
      options: data.options ?? [],
      settings: {
        ratingMin: data.settings?.ratingMin ?? 1,
        ratingMax: data.settings?.ratingMax ?? 5,
        ratingStep: data.settings?.ratingStep ?? 1,
        maxSelections: data.type === 'multiple' ? (data.settings?.maxSelections ?? 1) : data.settings?.maxSelections,
      },
      ...(data.password ? { password: data.password } : {}),
    }
    polls.value.push(poll)
    savePolls(polls.value)
    broadcastPollChange('create', poll.id)
    return poll
  }

  function updatePoll(id: string, data: Partial<Poll>): void {
    const index = polls.value.findIndex(p => p.id === id)
    if (index === -1) return
    polls.value[index] = { ...polls.value[index], ...data, updatedAt: Date.now() }
    savePolls(polls.value)
    broadcastPollChange('update', id)
  }

  function deletePoll(id: string): void {
    polls.value = polls.value.filter(p => p.id !== id)
    savePolls(polls.value)
    broadcastPollChange('delete', id)
  }

  function duplicatePoll(id: string): Poll | undefined {
    const source = polls.value.find(p => p.id === id)
    if (!source) return undefined
    const now = Date.now()
    const rawSource: Poll = JSON.parse(JSON.stringify(source))
    const clone: Poll = {
      ...rawSource,
      id: generateId(),
      title: source.title + '(副本)',
      createdAt: now,
      updatedAt: now,
      status: 'draft',
      isArchived: false,
      isSealed: false,
      password: undefined,
    }
    clone.options = rawSource.options.map(o => ({
      ...o,
      id: generateId(),
      pollId: clone.id,
    }))
    polls.value.push(clone)
    savePolls(polls.value)
    broadcastPollChange()
    return clone
  }

  function archivePoll(id: string): void {
    const poll = polls.value.find(p => p.id === id)
    if (!poll) return
    poll.isArchived = true
    poll.updatedAt = Date.now()
    savePolls(polls.value)
    broadcastPollChange('archive', id)
  }

  function unarchivePoll(id: string): void {
    const poll = polls.value.find(p => p.id === id)
    if (!poll) return
    poll.isArchived = false
    poll.updatedAt = Date.now()
    savePolls(polls.value)
    broadcastPollChange('unarchive', id)
  }

  function sealPoll(id: string): void {
    const poll = polls.value.find(p => p.id === id)
    if (!poll) return
    poll.isSealed = true
    poll.status = 'closed' as PollStatus
    poll.updatedAt = Date.now()
    savePolls(polls.value)
    broadcastPollChange('seal', id)
  }

  function checkDeadlines(): void {
    const now = getCorrectedTime()
    for (const poll of polls.value) {
      if (poll.status === 'active' && !poll.isSealed && poll.deadline && poll.deadline < now) {
        sealPoll(poll.id)
      }
    }
  }

  function saveToStorage(): void {
    savePolls(polls.value)
  }

  function loadFromStorage(): void {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      try {
        polls.value = JSON.parse(raw)
      } catch {
        polls.value = []
      }
    }
  }

  loadFromStorage()

  if (typeof window !== 'undefined') {
    subscribeToPollSync((msg) => {
      if (msg.type === 'poll_updated') {
        loadFromStorage()
      }
    })
  }

  return {
    polls,
    activePolls,
    closedPolls,
    draftPolls,
    archivedPolls,
    getPollById,
    createPoll,
    updatePoll,
    deletePoll,
    duplicatePoll,
    archivePoll,
    unarchivePoll,
    sealPoll,
    checkDeadlines,
    saveToStorage,
    loadFromStorage,
  }
})
