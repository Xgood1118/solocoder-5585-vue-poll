<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Icon } from '@iconify/vue'
import { usePollStore } from '@/stores/pollStore'
import { useVoteStore } from '@/stores/voteStore'
import type { PollType, PollStatus } from '@/types'

const pollStore = usePollStore()
const voteStore = useVoteStore()
const router = useRouter()

const searchQuery = ref('')
const statusFilter = ref<'all' | 'active' | 'draft' | 'closed' | 'archived'>('all')

const typeLabels: Record<PollType, string> = {
  single: '单选',
  multiple: '多选',
  ranking: '排序',
  rating: '评分',
}

const statusLabels: Record<PollStatus, string> = {
  active: '进行中',
  draft: '草稿',
  closed: '已结束',
}

const typeColors: Record<PollType, string> = {
  single: '#3b82f6',
  multiple: '#22c55e',
  ranking: '#8b5cf6',
  rating: '#f59e0b',
}

const statusColors: Record<PollStatus, string> = {
  active: '#22c55e',
  draft: '#6b7280',
  closed: '#ef4444',
}

const filteredPolls = computed(() => {
  let list: typeof pollStore.polls = []

  switch (statusFilter.value) {
    case 'active':
      list = pollStore.activePolls
      break
    case 'draft':
      list = pollStore.draftPolls
      break
    case 'closed':
      list = pollStore.closedPolls
      break
    case 'archived':
      list = pollStore.archivedPolls
      break
    default:
      list = [...pollStore.polls].sort((a, b) => b.createdAt - a.createdAt)
  }

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase()
    list = list.filter(p => p.title.toLowerCase().includes(q))
  }

  return list
})

const tabs: { key: typeof statusFilter.value; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'active', label: '进行中' },
  { key: 'draft', label: '草稿' },
  { key: 'closed', label: '已结束' },
  { key: 'archived', label: '已归档' },
]

function formatDeadline(deadline: number): string {
  if (!deadline) return '无截止时间'
  return new Date(deadline).toLocaleString()
}

function getVoterCount(pollId: string): number {
  return voteStore.getVoterCount(pollId)
}

const confirmDeleteId = ref<string | null>(null)

function handleDelete(id: string) {
  confirmDeleteId.value = id
}

function confirmDelete() {
  if (confirmDeleteId.value) {
    pollStore.deletePoll(confirmDeleteId.value)
    confirmDeleteId.value = null
  }
}

function cancelDelete() {
  confirmDeleteId.value = null
}

function handleDuplicate(id: string) {
  pollStore.duplicatePoll(id)
}

function handleArchive(id: string) {
  pollStore.archivePoll(id)
}

function handleUnarchive(id: string) {
  pollStore.unarchivePoll(id)
}

function goToResult(id: string) {
  router.push({ name: 'PollResult', params: { id } })
}

function goToVote(id: string) {
  router.push({ name: 'PollVote', params: { id } })
}

function goToEdit(id: string) {
  router.push({ name: 'PollEdit', params: { id } })
}
</script>

<template>
  <div class="poll-list">
    <div class="poll-list__header">
      <h1>投票管理</h1>
      <router-link to="/create" class="poll-list__create-btn">
        <Icon icon="mdi:plus" />
        <span>新建投票</span>
      </router-link>
    </div>

    <div class="poll-list__search">
      <Icon icon="mdi:magnify" class="poll-list__search-icon" />
      <input
        v-model="searchQuery"
        type="text"
        placeholder="搜索投票..."
        class="poll-list__search-input"
      />
    </div>

    <div class="poll-list__tabs">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        :class="['poll-list__tab', { 'poll-list__tab--active': statusFilter === tab.key }]"
        @click="statusFilter = tab.key"
      >
        {{ tab.label }}
      </button>
    </div>

    <div v-if="filteredPolls.length" class="poll-list__grid">
      <div v-for="poll in filteredPolls" :key="poll.id" class="poll-card">
        <h3 class="poll-card__title" @click="goToResult(poll.id)">
          {{ poll.title }}
        </h3>

        <div class="poll-card__badges">
          <span
            class="poll-card__badge poll-card__badge--type"
            :style="{ backgroundColor: typeColors[poll.type] + '1a', color: typeColors[poll.type] }"
          >
            {{ typeLabels[poll.type] }}
          </span>
          <span
            class="poll-card__badge poll-card__badge--status"
            :style="{ backgroundColor: statusColors[poll.status] + '1a', color: statusColors[poll.status] }"
          >
            {{ statusLabels[poll.status] }}
          </span>
          <span v-if="poll.isArchived" class="poll-card__badge poll-card__badge--archived">
            已归档
          </span>
        </div>

        <div class="poll-card__meta">
          <div class="poll-card__deadline">
            <Icon icon="mdi:clock-outline" />
            <span>{{ formatDeadline(poll.deadline) }}</span>
          </div>
          <div class="poll-card__voters">
            <Icon icon="mdi:account-group" />
            <span>{{ getVoterCount(poll.id) }} 人已投票</span>
          </div>
        </div>

        <div class="poll-card__actions">
          <button class="poll-card__action-btn" title="编辑" @click="goToEdit(poll.id)">
            <Icon icon="mdi:pencil" />
          </button>
          <button class="poll-card__action-btn" title="复制" @click="handleDuplicate(poll.id)">
            <Icon icon="mdi:content-copy" />
          </button>
          <button
            v-if="!poll.isArchived"
            class="poll-card__action-btn"
            title="归档"
            @click="handleArchive(poll.id)"
          >
            <Icon icon="mdi:archive" />
          </button>
          <button
            v-else
            class="poll-card__action-btn"
            title="取消归档"
            @click="handleUnarchive(poll.id)"
          >
            <Icon icon="mdi:archive-arrow-up" />
          </button>
          <button class="poll-card__action-btn poll-card__action-btn--danger" title="删除" @click="handleDelete(poll.id)">
            <Icon icon="mdi:delete" />
          </button>
        </div>

        <button class="poll-card__vote-btn" @click="goToVote(poll.id)">
          参与投票
        </button>
      </div>
    </div>

    <div v-else class="poll-list__empty">
      <Icon icon="mdi:vote" class="poll-list__empty-icon" />
      <p>暂无投票</p>
    </div>

    <Teleport to="body">
      <div v-if="confirmDeleteId" class="poll-list__overlay" @click.self="cancelDelete">
        <div class="poll-list__confirm">
          <p>确定要删除此投票吗？此操作不可撤销。</p>
          <div class="poll-list__confirm-actions">
            <button class="poll-list__confirm-cancel" @click="cancelDelete">取消</button>
            <button class="poll-list__confirm-ok" @click="confirmDelete">确定删除</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style lang="scss" scoped>
.poll-list {
  max-width: 1200px;
  margin: 0 auto;
  padding: $spacing-lg $spacing-md;

  &__header {
    @include flex-between;
    margin-bottom: $spacing-lg;

    h1 {
      font-size: $font-size-2xl;
      font-weight: 700;
      color: $color-text;

      @include dark-mode {
        color: $color-dark-text;
      }
    }
  }

  &__create-btn {
    @include button-base;
    background: $color-primary;
    color: #fff;
    gap: $spacing-xs;
    text-decoration: none;
    padding: $spacing-sm $spacing-md;

    &:hover {
      background: color.adjust($color-primary, $lightness: 8%);
    }
  }

  &__search {
    position: relative;
    margin-bottom: $spacing-md;
  }

  &__search-icon {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 20px;
    color: $color-text-light;

    @include dark-mode {
      color: $color-dark-text;
    }
  }

  &__search-input {
    width: 100%;
    padding: $spacing-sm $spacing-md $spacing-sm 40px;
    border: 1px solid $color-border;
    border-radius: $radius-md;
    font-family: $font-display;
    font-size: $font-size-sm;
    color: $color-text;
    background: $color-card;
    transition: border-color $transition-fast;

    &:focus {
      outline: none;
      border-color: $color-primary;
      box-shadow: 0 0 0 3px rgba($color-primary, 0.1);
    }

    &::placeholder {
      color: $color-text-light;
    }

    @include dark-mode {
      border-color: $color-dark-card;
      background: $color-dark-card;
      color: $color-dark-text;
    }
  }

  &__tabs {
    display: flex;
    gap: $spacing-sm;
    margin-bottom: $spacing-lg;
    overflow-x: auto;
  }

  &__tab {
    @include button-base;
    background: transparent;
    color: $color-text-light;
    border: 1px solid $color-border;
    white-space: nowrap;

    &:hover {
      background: $color-bg;
    }

    &--active {
      background: $color-primary;
      color: #fff;
      border-color: $color-primary;
    }

    @include dark-mode {
      border-color: $color-dark-card;
      color: $color-dark-text;

      &:hover {
        background: $color-dark-card;
      }

      &--active {
        background: $color-primary;
        color: #fff;
        border-color: $color-primary;
      }
    }
  }

  &__grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 24px;

    @include respond-to($bp-tablet) {
      grid-template-columns: repeat(2, 1fr);
    }

    @include respond-to($bp-mobile) {
      grid-template-columns: 1fr;
    }
  }

  &__empty {
    @include flex-center;
    flex-direction: column;
    gap: $spacing-md;
    padding: $spacing-2xl 0;
    color: $color-text-light;

    @include dark-mode {
      color: $color-dark-text;
    }
  }

  &__empty-icon {
    font-size: 64px;
    opacity: 0.3;
  }

  &__overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    @include flex-center;
    z-index: 200;
  }

  &__confirm {
    background: $color-card;
    border-radius: $radius-lg;
    padding: $spacing-lg;
    max-width: 400px;
    width: 90%;

    p {
      font-size: $font-size-base;
      margin-bottom: $spacing-md;
      color: $color-text;

      @include dark-mode {
        color: $color-dark-text;
      }
    }

    @include dark-mode {
      background: $color-dark-card;
    }
  }

  &__confirm-actions {
    display: flex;
    justify-content: flex-end;
    gap: $spacing-sm;
  }

  &__confirm-cancel {
    @include button-base;
    background: transparent;
    color: $color-text-light;
    border: 1px solid $color-border;

    @include dark-mode {
      border-color: $color-dark-card;
      color: $color-dark-text;
    }
  }

  &__confirm-ok {
    @include button-base;
    background: $color-danger;
    color: #fff;

    &:hover {
      background: color.adjust($color-danger, $lightness: 8%);
    }
  }
}

.poll-card {
  background: $color-card;
  border-radius: 12px;
  padding: 20px;
  box-shadow: $shadow-sm;
  transition: box-shadow $transition-base;

  &:hover {
    box-shadow: $shadow-md;
  }

  @include dark-mode {
    background: $color-dark-card;
  }

  &__title {
    font-size: 18px;
    font-weight: 700;
    cursor: pointer;
    color: $color-text;

    &:hover {
      color: $color-primary;
    }

    @include truncate;

    @include dark-mode {
      color: $color-dark-text;

      &:hover {
        color: color.adjust($color-primary, $lightness: 30%);
      }
    }
  }

  &__badges {
    display: flex;
    gap: 8px;
    margin-top: 8px;
    flex-wrap: wrap;
  }

  &__badge {
    display: inline-flex;
    align-items: center;
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 600;

    &--archived {
      background: rgba($color-warning, 0.1);
      color: $color-warning;
    }
  }

  &__meta {
    margin-top: 12px;
    font-size: 14px;
    color: $color-text-light;
    display: flex;
    flex-direction: column;
    gap: 4px;

    @include dark-mode {
      color: $color-dark-text;
    }
  }

  &__deadline,
  &__voters {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  &__actions {
    margin-top: 16px;
    display: flex;
    gap: 8px;
  }

  &__action-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 6px;
    border: none;
    background: transparent;
    cursor: pointer;
    font-size: 18px;
    color: $color-text-light;
    transition: background $transition-fast, color $transition-fast;

    &:hover {
      background: $color-bg;
      color: $color-text;
    }

    &--danger:hover {
      background: rgba($color-danger, 0.1);
      color: $color-danger;
    }

    @include dark-mode {
      color: $color-dark-text;

      &:hover {
        background: rgba(255, 255, 255, 0.08);
      }

      &--danger:hover {
        background: rgba($color-danger, 0.2);
        color: $color-danger;
      }
    }
  }

  &__vote-btn {
    @include button-base;
    width: 100%;
    margin-top: $spacing-md;
    background: $color-primary;
    color: #fff;

    &:hover {
      background: color.adjust($color-primary, $lightness: 8%);
    }
  }
}
</style>
