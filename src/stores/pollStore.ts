import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { Poll, PollStatus } from '@/types'
import { generateId } from '@/utils/id'

const STORAGE_KEY = 'vue-poll-polls'

function savePolls(polls: Poll[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(polls))
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
    return poll
  }

  function updatePoll(id: string, data: Partial<Poll>): void {
    const index = polls.value.findIndex(p => p.id === id)
    if (index === -1) return
    polls.value[index] = { ...polls.value[index], ...data, updatedAt: Date.now() }
    savePolls(polls.value)
  }

  function deletePoll(id: string): void {
    polls.value = polls.value.filter(p => p.id !== id)
    savePolls(polls.value)
  }

  function duplicatePoll(id: string): Poll | undefined {
    const source = polls.value.find(p => p.id === id)
    if (!source) return undefined
    const now = Date.now()
    const clone: Poll = {
      ...structuredClone(source),
      id: generateId(),
      title: source.title + '(副本)',
      createdAt: now,
      updatedAt: now,
      status: 'draft',
      isArchived: false,
      isSealed: false,
    }
    clone.options = clone.options.map(o => ({ ...o, id: generateId(), pollId: clone.id }))
    polls.value.push(clone)
    savePolls(polls.value)
    return clone
  }

  function archivePoll(id: string): void {
    const poll = polls.value.find(p => p.id === id)
    if (!poll) return
    poll.isArchived = true
    poll.updatedAt = Date.now()
    savePolls(polls.value)
  }

  function unarchivePoll(id: string): void {
    const poll = polls.value.find(p => p.id === id)
    if (!poll) return
    poll.isArchived = false
    poll.updatedAt = Date.now()
    savePolls(polls.value)
  }

  function sealPoll(id: string): void {
    const poll = polls.value.find(p => p.id === id)
    if (!poll) return
    poll.isSealed = true
    poll.status = 'closed' as PollStatus
    poll.updatedAt = Date.now()
    savePolls(polls.value)
  }

  function checkDeadlines(): void {
    const now = Date.now()
    for (const poll of polls.value) {
      if (poll.status === 'active' && poll.deadline && poll.deadline < now) {
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
