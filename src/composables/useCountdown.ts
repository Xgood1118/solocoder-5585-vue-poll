import { ref, computed, onUnmounted, type Ref } from 'vue'
import { getCorrectedTime } from '@/utils/timeSync'

export function useCountdown(deadline: Ref<number> | number) {
  const days = ref(0)
  const hours = ref(0)
  const minutes = ref(0)
  const seconds = ref(0)
  const isExpired = ref(false)

  let timer: ReturnType<typeof setInterval> | null = null

  function update() {
    const deadlineValue = typeof deadline === 'number' ? deadline : deadline.value

    if (!deadlineValue || deadlineValue <= 0) {
      days.value = 0
      hours.value = 0
      minutes.value = 0
      seconds.value = 0
      isExpired.value = false
      return
    }

    const remaining = deadlineValue - getCorrectedTime()

    if (remaining <= 0) {
      days.value = 0
      hours.value = 0
      minutes.value = 0
      seconds.value = 0
      isExpired.value = true
      if (timer) {
        clearInterval(timer)
        timer = null
      }
      return
    }

    isExpired.value = false
    const totalSeconds = Math.floor(remaining / 1000)
    days.value = Math.floor(totalSeconds / 86400)
    hours.value = Math.floor((totalSeconds % 86400) / 3600)
    minutes.value = Math.floor((totalSeconds % 3600) / 60)
    seconds.value = totalSeconds % 60
  }

  update()
  timer = setInterval(update, 1000)

  onUnmounted(() => {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
  })

  const formatted = computed(() => {
    const deadlineValue = typeof deadline === 'number' ? deadline : deadline.value
    if (!deadlineValue || deadlineValue <= 0) {
      return '长期有效'
    }
    const pad = (n: number) => n.toString().padStart(2, '0')
    if (days.value > 0) {
      return `${days.value}天 ${pad(hours.value)}:${pad(minutes.value)}:${pad(seconds.value)}`
    }
    return `${pad(hours.value)}:${pad(minutes.value)}:${pad(seconds.value)}`
  })

  return {
    days,
    hours,
    minutes,
    seconds,
    isExpired,
    formatted
  }
}
