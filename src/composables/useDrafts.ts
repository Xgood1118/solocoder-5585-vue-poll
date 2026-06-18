import { ref, watch, onBeforeUnmount } from 'vue'
import type { Poll, PollType } from '@/types'
import { useLocalStorage } from '@/composables/useLocalStorage'

export interface DraftSnapshot {
  mode: 'create' | 'edit'
  pollId?: string
  title: string
  description: string
  type: PollType
  deadline: string
  passwordEnabled: boolean
  password: string
  options: Array<{ id: string; label: string; imageUrl: string; backgroundColor: string; displayOrder: number }>
  settings: {
    ratingMin: number
    ratingMax: number
    ratingStep: number
    maxSelections: number
  }
  savedAt: number
}

const KEY = 'vue-poll-autosave-draft'

export function useDrafts() {
  const draft = useLocalStorage<DraftSnapshot | null>(KEY, null)
  const lastSavedAt = ref<number | null>(draft.value?.savedAt ?? null)
  const showRestoreBanner = ref(false)

  function save(snapshot: DraftSnapshot) {
    const payload: DraftSnapshot = { ...snapshot, savedAt: Date.now() }
    draft.value = payload
    lastSavedAt.value = payload.savedAt
  }

  function restore(): DraftSnapshot | null {
    const snapshot = draft.value
    if (!snapshot) return null
    showRestoreBanner.value = false
    return { ...snapshot }
  }

  function clear() {
    draft.value = null
    lastSavedAt.value = null
    showRestoreBanner.value = false
  }

  function hasDraft(): boolean {
    return !!draft.value
  }

  function promptRestoreIfAny(mode: 'create' | 'edit', pollId?: string): boolean {
    if (!draft.value) {
      showRestoreBanner.value = false
      return false
    }
    const modeMatch = draft.value.mode === mode
    const idMatch = mode === 'edit'
      ? (draft.value.pollId === pollId)
      : true
    if (modeMatch && idMatch) {
      showRestoreBanner.value = true
      return true
    }
    return false
  }

  function bindAutoSave<T extends object>(
    collectFn: () => DraftSnapshot,
    debounceMs: number = 800,
  ) {
    let timer: ReturnType<typeof setTimeout> | null = null
    let latestRevision = 0

    const schedule = () => {
      const revision = ++latestRevision
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        if (revision !== latestRevision) return
        try {
          const snapshot = collectFn()
          const hasContent =
            snapshot.title.trim().length > 0 ||
            snapshot.description.trim().length > 0 ||
            snapshot.options.some(o => o.label.trim().length > 0) ||
            snapshot.options.length > 2
          if (hasContent) save(snapshot)
        } catch { /* ignore collect errors */ }
      }, debounceMs)
    }

    onBeforeUnmount(() => {
      if (timer) clearTimeout(timer)
    })

    return { schedule }
  }

  return {
    draft,
    lastSavedAt,
    showRestoreBanner,
    save,
    restore,
    clear,
    hasDraft,
    promptRestoreIfAny,
    bindAutoSave,
  }
}
