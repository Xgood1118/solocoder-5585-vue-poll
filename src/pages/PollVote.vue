<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Icon } from '@iconify/vue'
import { usePollStore } from '@/stores/pollStore'
import { useVoteStore } from '@/stores/voteStore'
import { useCountdown } from '@/composables/useCountdown'
import { useAntiFraud } from '@/composables/useAntiFraud'
import { heartbeat, subscribeToPollSync } from '@/composables/useRealtimeSync'
import { generateId } from '@/utils/id'
import type { PollOption, VoteSelection, VoteRecord } from '@/types'
import { getCorrectedTime } from '@/utils/timeSync'

const route = useRoute()
const router = useRouter()
const pollStore = usePollStore()
const voteStore = useVoteStore()

const pollId = route.params.id as string
const poll = pollStore.getPollById(pollId)

if (poll?.password) {
  const unlocked = sessionStorage.getItem(`vue-poll-unlocked-${pollId}`)
  if (!unlocked) {
    router.replace(`/verify/${pollId}`)
  }
}

const deadline = computed(() => poll?.deadline ?? 0)
const { days, hours, minutes, seconds, isExpired, formatted } = useCountdown(deadline)
const antiFraud = useAntiFraud()

const selectedOptionId = ref<string | null>(null)
const selectedOptionIds = ref<string[]>([])
const orderedOptions = ref<PollOption[]>(poll ? [...poll.options] : [])
const ratings = ref<Record<string, number>>({})

const showConfirm = ref(false)
const submitMessage = ref('')
const isSubmitting = ref(false)
const riskInfo = ref<{ score: number; reasons: string[] } | null>(null)
const livePulse = ref(false)

watch(isExpired, (v) => {
  if (v && poll && poll.status !== 'closed') {
    pollStore.checkDeadlines()
  }
})

if (typeof window !== 'undefined') {
  subscribeToPollSync((msg) => {
    if (msg.type === 'vote_submitted' && msg.payload?.pollId === pollId) {
      livePulse.value = true
      setTimeout(() => { livePulse.value = false }, 1500)
    }
    if (msg.type === 'poll_updated' && msg.payload?.pollId === pollId) {
      pollStore.loadFromStorage()
    }
  })
  setTimeout(() => heartbeat(pollId), 300)
}

const maxSelections = computed(() => poll?.settings?.maxSelections ?? 1)

const hasSelection = computed(() => {
  if (!poll) return false
  switch (poll.type) {
    case 'single':
      return selectedOptionId.value !== null
    case 'multiple':
      return selectedOptionIds.value.length > 0
    case 'ranking':
      return orderedOptions.value.length > 0
    case 'rating':
      return Object.keys(ratings.value).length > 0
    default:
      return false
  }
})

const canSubmit = computed(() => hasSelection.value && !isExpired.value && !isSubmitting.value &&
  !poll?.isSealed && poll?.status !== 'closed')

const isSealedOrClosed = computed(() => poll?.isSealed || poll?.status === 'closed')

function selectSingle(optionId: string) {
  selectedOptionId.value = selectedOptionId.value === optionId ? null : optionId
}

function toggleMultiple(optionId: string) {
  const idx = selectedOptionIds.value.indexOf(optionId)
  if (idx >= 0) {
    selectedOptionIds.value.splice(idx, 1)
  } else if (selectedOptionIds.value.length < maxSelections.value) {
    selectedOptionIds.value.push(optionId)
  }
}

function moveOption(fromIndex: number, toIndex: number) {
  const item = orderedOptions.value.splice(fromIndex, 1)[0]
  orderedOptions.value.splice(toIndex, 0, item)
}

function moveUp(index: number) {
  if (index > 0) moveOption(index, index - 1)
}

function moveDown(index: number) {
  if (index < orderedOptions.value.length - 1) moveOption(index, index + 1)
}

function setRating(optionId: string, value: number) {
  ratings.value = { ...ratings.value, [optionId]: value }
}

function getRating(optionId: string): number {
  return ratings.value[optionId] ?? 0
}

function buildSelections(): VoteSelection[] {
  if (!poll) return []
  switch (poll.type) {
    case 'single':
      return selectedOptionId.value ? [{ optionId: selectedOptionId.value }] : []
    case 'multiple':
      return selectedOptionIds.value.map(id => ({ optionId: id }))
    case 'ranking':
      return orderedOptions.value.map((opt, idx) => ({
        optionId: opt.id,
        rankOrder: idx + 1,
      }))
    case 'rating':
      return Object.entries(ratings.value).map(([optionId, ratingValue]) => ({
        optionId,
        ratingValue,
      }))
    default:
      return []
  }
}

async function submitVote() {
  if (!poll) return

  const fp = antiFraud.getFingerprint()
  if (voteStore.hasVoted(pollId, fp.combined)) {
    submitMessage.value = '您已经投过票了'
    showConfirm.value = false
    return
  }

  const allVotes = voteStore.getVotesByPollId(pollId)
  const fraudCheck = antiFraud.evaluate(pollId, allVotes)

  riskInfo.value = { score: fraudCheck.riskScore, reasons: fraudCheck.riskReasons }

  if (!fraudCheck.allowed) {
    submitMessage.value = fraudCheck.reason ?? '投票被拒绝'
    showConfirm.value = false
    return
  }

  isSubmitting.value = true

  const selections = buildSelections()
  const record: VoteRecord = {
    id: generateId(),
    pollId,
    selections,
    voterFingerprint: fp.combined,
    votedAt: getCorrectedTime(),
  }

  antiFraud.recordVote(pollId)
  voteStore.addVote(record)
  isSubmitting.value = false
  showConfirm.value = false
  submitMessage.value = '投票成功！'
  setTimeout(() => {
    router.push(`/result/${pollId}`)
  }, 600)
}

function confirmSubmit() {
  showConfirm.value = true
}

function cancelConfirm() {
  showConfirm.value = false
}

const ratingMax = computed(() => poll?.settings?.ratingMax ?? 5)
</script>

<template>
  <div v-if="!poll" class="vote-page">
    <div class="poll-info">
      <p>投票不存在</p>
    </div>
  </div>

  <div v-else class="vote-page">
    <div class="poll-info">
      <h1 class="poll-info__title">{{ poll.title }}</h1>
      <p v-if="poll.description" class="poll-info__desc">{{ poll.description }}</p>

      <div v-if="isSealedOrClosed" class="countdown countdown--expired">投票已结束</div>
      <div v-else-if="isExpired" class="countdown countdown--expired">
        <span>已截止</span>
      </div>
      <div v-else class="countdown">{{ formatted }}</div>
    </div>

    <div v-if="isSealedOrClosed || isExpired" class="expired-banner">
      <Icon icon="mdi:clock-alert-outline" />
      <span>投票已截止，无法继续投票</span>
    </div>

    <div class="vote-area">
      <template v-if="poll.type === 'single'">
        <div
          v-for="option in poll.options"
          :key="option.id"
          class="option-card"
          :class="{ 'option-card--selected': selectedOptionId === option.id }"
          :style="{ borderLeftColor: option.backgroundColor || undefined }"
          @click="selectSingle(option.id)"
        >
          <img v-if="option.imageUrl" :src="option.imageUrl" class="option-card__image" />
          <span class="option-card__label">{{ option.label }}</span>
          <span class="option-card__radio" :class="{ 'option-card__radio--checked': selectedOptionId === option.id }" />
        </div>
      </template>

      <template v-if="poll.type === 'multiple'">
        <p v-if="maxSelections > 1" class="hint">最多可选 {{ maxSelections }} 项</p>
        <div
          v-for="option in poll.options"
          :key="option.id"
          class="option-card"
          :class="{ 'option-card--selected': selectedOptionIds.includes(option.id) }"
          :style="{ borderLeftColor: option.backgroundColor || undefined }"
          @click="toggleMultiple(option.id)"
        >
          <img v-if="option.imageUrl" :src="option.imageUrl" class="option-card__image" />
          <span class="option-card__label">{{ option.label }}</span>
          <span
            class="option-card__checkbox"
            :class="{ 'option-card__checkbox--checked': selectedOptionIds.includes(option.id) }"
          />
        </div>
      </template>

      <template v-if="poll.type === 'ranking'">
        <div
          v-for="(option, index) in orderedOptions"
          :key="option.id"
          class="option-card"
          :class="{ 'option-card--selected': true }"
          :style="{ borderLeftColor: option.backgroundColor || undefined }"
        >
          <span class="option-card__rank">{{ index + 1 }}</span>
          <img v-if="option.imageUrl" :src="option.imageUrl" class="option-card__image" />
          <span class="option-card__label">{{ option.label }}</span>
          <div class="option-card__drag">
            <button class="drag-btn" :disabled="index === 0" @click="moveUp(index)">
              <Icon icon="mdi:chevron-up" />
            </button>
            <button class="drag-btn" :disabled="index === orderedOptions.length - 1" @click="moveDown(index)">
              <Icon icon="mdi:chevron-down" />
            </button>
          </div>
        </div>
      </template>

      <template v-if="poll.type === 'rating'">
        <div
          v-for="option in poll.options"
          :key="option.id"
          class="option-card"
          :class="{ 'option-card--selected': getRating(option.id) > 0 }"
          :style="{ borderLeftColor: option.backgroundColor || undefined }"
        >
          <img v-if="option.imageUrl" :src="option.imageUrl" class="option-card__image" />
          <span class="option-card__label">{{ option.label }}</span>
          <div class="star-rating">
            <span
              v-for="star in ratingMax"
              :key="star"
              class="star-rating__star"
              :class="{ 'star-rating__star--active': star <= getRating(option.id) }"
              @click="setRating(option.id, star)"
            >★</span>
            <span v-if="getRating(option.id) > 0" class="star-rating__value">{{ getRating(option.id) }}</span>
          </div>
        </div>
      </template>
    </div>

    <p v-if="submitMessage" class="submit-message">{{ submitMessage }}</p>

    <button
      class="submit-btn"
      :disabled="!canSubmit"
      @click="confirmSubmit"
    >
      提交投票
    </button>

    <Teleport to="body">
      <div v-if="showConfirm" class="confirm-overlay" @click.self="cancelConfirm">
        <div class="confirm-dialog">
          <h3>确认提交？</h3>
          <p>提交后将无法修改</p>
          <div class="confirm-dialog__actions">
            <button class="confirm-dialog__btn confirm-dialog__btn--cancel" @click="cancelConfirm">取消</button>
            <button class="confirm-dialog__btn confirm-dialog__btn--confirm" @click="submitVote">确认</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style lang="scss" scoped>
.vote-page {
  max-width: 640px;
  margin: 0 auto;
  padding: $spacing-md;
}

.poll-info {
  background: $color-card;
  border-radius: $radius-lg;
  box-shadow: $shadow-sm;
  padding: 20px;
  margin-bottom: $spacing-md;

  @include dark-mode {
    background: $color-dark-card;
  }

  &__title {
    font-size: $font-size-xl;
    font-weight: 700;
    color: $color-primary;
    margin-bottom: $spacing-sm;

    @include dark-mode {
      color: $color-dark-text;
    }
  }

  &__desc {
    font-size: $font-size-sm;
    color: $color-text-light;
    margin-bottom: $spacing-sm;

    @include dark-mode {
      color: $color-dark-text;
    }
  }
}

.countdown {
  font-family: $font-mono;
  font-size: 32px;
  color: #ff6b35;
  text-align: center;
  margin: 16px 0;

  &--expired {
    color: #e53e3e;
  }
}

.expired-banner {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  padding: $spacing-md;
  background: rgba(#e53e3e, 0.1);
  border-radius: $radius-md;
  color: #e53e3e;
  font-size: $font-size-sm;
  margin-bottom: $spacing-md;
}

.hint {
  font-size: $font-size-sm;
  color: $color-text-light;
  margin-bottom: $spacing-sm;

  @include dark-mode {
    color: $color-dark-text;
  }
}

.vote-area {
  margin-bottom: $spacing-md;
}

.option-card {
  display: flex;
  align-items: center;
  background: $color-card;
  padding: 12px 16px;
  margin-bottom: 8px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s;
  border-left: 4px solid transparent;

  @include dark-mode {
    background: $color-dark-card;
  }

  &--selected {
    border-left-color: #ff6b35;
    background: #fff7ed;

    @include dark-mode {
      background: rgba(#ff6b35, 0.1);
    }
  }

  &__image {
    width: 64px;
    height: 64px;
    border-radius: 8px;
    object-fit: cover;
    margin-right: 12px;
    flex-shrink: 0;
  }

  &__label {
    flex: 1;
    font-size: 16px;
    color: $color-text;

    @include dark-mode {
      color: $color-dark-text;
    }
  }

  &__radio {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    border: 2px solid $color-border;
    flex-shrink: 0;
    position: relative;
    transition: all 0.15s;

    &--checked {
      border-color: #ff6b35;

      &::after {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: #ff6b35;
      }
    }
  }

  &__checkbox {
    width: 20px;
    height: 20px;
    border-radius: $radius-sm;
    border: 2px solid $color-border;
    flex-shrink: 0;
    position: relative;
    transition: all 0.15s;

    &--checked {
      border-color: #ff6b35;
      background: #ff6b35;

      &::after {
        content: '';
        position: absolute;
        top: 2px;
        left: 6px;
        width: 5px;
        height: 10px;
        border: solid white;
        border-width: 0 2px 2px 0;
        transform: rotate(45deg);
      }
    }
  }

  &__rank {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: #1a365d;
    color: white;
    text-align: center;
    font-size: 14px;
    line-height: 28px;
    flex-shrink: 0;
    margin-right: 12px;
  }

  &__drag {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin-left: $spacing-sm;
  }
}

.drag-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 22px;
  border: none;
  background: $color-bg;
  border-radius: $radius-sm;
  cursor: pointer;
  color: $color-text-light;
  font-size: 16px;
  transition: all $transition-fast;

  &:hover:not(:disabled) {
    background: $color-border;
    color: $color-text;
  }

  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
}

.star-rating {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;

  &__star {
    cursor: pointer;
    font-size: 24px;
    color: #d1d5db;
    transition: color 0.15s;
    user-select: none;

    &--active {
      color: #f59e0b;
    }
  }

  &__value {
    font-size: $font-size-sm;
    color: $color-text-light;
    margin-left: $spacing-xs;
    min-width: 16px;
  }
}

.submit-message {
  text-align: center;
  color: $color-success;
  font-size: $font-size-sm;
  margin-bottom: $spacing-sm;
}

.submit-btn {
  width: 100%;
  padding: 14px;
  background: #1a365d;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-family: $font-display;
  cursor: pointer;
  margin-top: 24px;
  transition: opacity $transition-fast;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &:hover:not(:disabled) {
    opacity: 0.9;
  }
}

.confirm-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
}

.confirm-dialog {
  background: $color-card;
  border-radius: $radius-lg;
  padding: $spacing-lg;
  width: 320px;
  text-align: center;
  box-shadow: $shadow-lg;

  @include dark-mode {
    background: $color-dark-card;
  }

  h3 {
    font-size: $font-size-lg;
    margin-bottom: $spacing-sm;
    color: $color-text;

    @include dark-mode {
      color: $color-dark-text;
    }
  }

  p {
    font-size: $font-size-sm;
    color: $color-text-light;
    margin-bottom: $spacing-lg;
  }

  &__actions {
    display: flex;
    gap: $spacing-md;
    justify-content: center;
  }

  &__btn {
    padding: $spacing-sm $spacing-lg;
    border-radius: $radius-md;
    border: none;
    cursor: pointer;
    font-family: $font-display;
    font-size: $font-size-sm;
    font-weight: 500;
    transition: all $transition-fast;

    &--cancel {
      background: $color-bg;
      color: $color-text;

      @include dark-mode {
        background: $color-dark-bg;
        color: $color-dark-text;
      }

      &:hover {
        background: $color-border;
      }
    }

    &--confirm {
      background: #1a365d;
      color: white;

      &:hover {
        opacity: 0.9;
      }
    }
  }
}
</style>
