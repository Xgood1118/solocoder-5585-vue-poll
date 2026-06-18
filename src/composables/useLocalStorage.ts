import { ref, watch } from 'vue'

export function useLocalStorage<T>(key: string, defaultValue: T) {
  const stored = localStorage.getItem(key)
  const data = ref<T>(stored ? JSON.parse(stored) : defaultValue) as ReturnType<typeof ref<T>>

  watch(
    data,
    (value) => {
      localStorage.setItem(key, JSON.stringify(value))
    },
    { deep: true }
  )

  return data
}
