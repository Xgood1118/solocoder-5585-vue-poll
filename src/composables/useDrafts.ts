import type { Poll } from '@/types'
import { generateId } from '@/utils/id'
import { useLocalStorage } from '@/composables/useLocalStorage'

interface DraftPoll extends Partial<Poll> {
  id: string
  savedAt: number
}

export function useDrafts() {
  const drafts = useLocalStorage<DraftPoll[]>('vue-poll-drafts', [])

  function saveDraft(poll: Partial<Poll>) {
    const draft: DraftPoll = {
      ...poll,
      id: poll.id || generateId(),
      savedAt: Date.now()
    }
    drafts.value.push(draft)
  }

  function removeDraft(id: string) {
    drafts.value = drafts.value.filter(d => d.id !== id)
  }

  function restoreDraft(id: string): Partial<Poll> | undefined {
    return drafts.value.find(d => d.id === id)
  }

  return {
    drafts,
    saveDraft,
    removeDraft,
    restoreDraft
  }
}
