<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import type { VoteRecord, PollOption, PollType, VoteSelection } from '@/types'

const props = defineProps<{
  votes: VoteRecord[]
  options: PollOption[]
  pollType: PollType
  hiddenOptions: Set<string>
}>()

const emit = defineEmits<{
  toggleOption: [optionId: string]
}>()

const optionMap = computed(() => {
  const map = new Map<string, PollOption>()
  for (const opt of props.options) {
    map.set(opt.id, opt)
  }
  return map
})

function truncateFingerprint(fp: string): string {
  return fp.slice(0, 8)
}

function formatTime(ts: number): string {
  const d = new Date(ts)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function getSelectionForOption(selections: VoteSelection[], optionId: string): VoteSelection | undefined {
  return selections.find(s => s.optionId === optionId)
}

function displayOptionValue(selection: VoteSelection | undefined, optionId: string): string {
  if (!selection) return '-'
  if (props.hiddenOptions.has(optionId)) return '***'
  switch (props.pollType) {
    case 'rating':
      return selection.ratingValue != null ? `${optionMap.value.get(optionId)?.label ?? ''}: ${selection.ratingValue}` : '-'
    case 'ranking':
      return selection.rankOrder != null ? `${optionMap.value.get(optionId)?.label ?? ''}: #${selection.rankOrder}` : '-'
    default:
      return optionMap.value.get(optionId)?.label ?? ''
  }
}

function hasVotedForOption(selections: VoteSelection[], optionId: string): boolean {
  return selections.some(s => s.optionId === optionId)
}

function isHidden(optionId: string): boolean {
  return props.hiddenOptions.has(optionId)
}

function toggleOption(optionId: string) {
  emit('toggleOption', optionId)
}

function maskIfHidden(text: string, optionId: string): string {
  return props.hiddenOptions.has(optionId) ? '***' : text
}
</script>

<template>
  <div class="voter-list">
    <div class="voter-list__header">
      <span class="voter-list__cell voter-list__cell--fingerprint">投票人</span>
      <span class="voter-list__cell voter-list__cell--time">时间</span>
      <span
        v-for="opt in options"
        :key="opt.id"
        class="voter-list__cell voter-list__cell--option"
      >
        <span class="voter-list__option-label">{{ opt.label }}</span>
        <button
          class="voter-list__toggle-btn"
          :class="{ 'voter-list__toggle-btn--hidden': isHidden(opt.id) }"
          @click="toggleOption(opt.id)"
        >
          <Icon :icon="isHidden(opt.id) ? 'mdi:eye-off' : 'mdi:eye'" />
        </button>
      </span>
    </div>

    <div
      v-for="vote in votes"
      :key="vote.id"
      class="voter-list__row"
    >
      <span class="voter-list__cell voter-list__cell--fingerprint">
        {{ maskIfHidden(truncateFingerprint(vote.voterFingerprint), vote.selections[0]?.optionId ?? '') }}
      </span>
      <span class="voter-list__cell voter-list__cell--time">
        {{ formatTime(vote.votedAt) }}
      </span>
      <span
        v-for="opt in options"
        :key="opt.id"
        class="voter-list__cell voter-list__cell--option"
      >
        <template v-if="hasVotedForOption(vote.selections, opt.id)">
          {{ displayOptionValue(getSelectionForOption(vote.selections, opt.id), opt.id) }}
        </template>
        <template v-else>
          -
        </template>
      </span>
    </div>

    <div v-if="votes.length === 0" class="voter-list__empty">
      暂无投票记录
    </div>
  </div>
</template>

<style lang="scss" scoped>
.voter-list {
  background: $color-card;
  border-radius: $radius-lg;
  box-shadow: $shadow-sm;
  overflow: hidden;

  @include dark-mode {
    background: $color-dark-card;
  }

  &__header {
    display: flex;
    background: $color-bg;
    font-weight: 600;
    font-size: $font-size-sm;
    color: $color-text;
    border-bottom: 2px solid $color-border;

    @include dark-mode {
      background: $color-dark-bg;
      color: $color-dark-text;
      border-bottom-color: rgba(255, 255, 255, 0.1);
    }
  }

  &__row {
    display: flex;
    font-size: $font-size-sm;
    color: $color-text;
    border-bottom: 1px solid $color-border;
    transition: background $transition-fast;

    &:nth-child(even) {
      background: rgba($color-bg, 0.5);

      @include dark-mode {
        background: rgba(255, 255, 255, 0.02);
      }
    }

    &:hover {
      background: rgba($color-accent, 0.04);
    }

    &:last-child {
      border-bottom: none;
    }

    @include dark-mode {
      color: $color-dark-text;
      border-bottom-color: rgba(255, 255, 255, 0.06);
    }
  }

  &__cell {
    padding: $spacing-sm $spacing-md;
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;

    &--fingerprint {
      flex: 0 0 80px;
      font-family: $font-mono;
      font-size: $font-size-xs;
    }

    &--time {
      flex: 0 0 150px;
      font-size: $font-size-xs;
      color: $color-text-light;

      @include dark-mode {
        color: $color-dark-text;
      }
    }

    &--option {
      flex: 1;
    }
  }

  &__option-label {
    margin-right: $spacing-xs;
  }

  &__toggle-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border: none;
    background: transparent;
    border-radius: $radius-sm;
    cursor: pointer;
    color: $color-text-light;
    font-size: 14px;
    transition: all $transition-fast;
    vertical-align: middle;

    &:hover {
      background: $color-border;
      color: $color-text;
    }

    &--hidden {
      color: $color-danger;
    }
  }

  &__empty {
    padding: $spacing-xl;
    text-align: center;
    color: $color-text-light;
    font-size: $font-size-sm;

    @include dark-mode {
      color: $color-dark-text;
    }
  }
}
</style>
