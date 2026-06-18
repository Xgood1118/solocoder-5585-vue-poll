<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { Icon } from '@iconify/vue'
import { usePollStore } from '@/stores/pollStore'
import { useVoteStore } from '@/stores/voteStore'
import { useCountdown } from '@/composables/useCountdown'
import { subscribeToPollSync } from '@/composables/useRealtimeSync'
import { exportAsJson, exportAsIcs } from '@/utils/export'
import BarChart from '@/components/chart/BarChart.vue'
import PieChart from '@/components/chart/PieChart.vue'
import TimelineChart from '@/components/chart/TimelineChart.vue'
import VoterList from '@/components/chart/VoterList.vue'
import type { Poll, VoteRecord, PollOption, PollType, TimelinePoint } from '@/types'

const route = useRoute()
const pollStore = usePollStore()
const voteStore = useVoteStore()

const pollId = route.params.id as string
const poll = computed(() => pollStore.getPollById(pollId))

const deadline = computed(() => poll.value?.deadline ?? 0)
const { days, hours, minutes, seconds, isExpired, formatted } = useCountdown(deadline)

onMounted(() => {
  subscribeToPollSync((msg) => {
    if (msg.type === 'vote_submitted' && msg.payload?.pollId === pollId) {
      voteStore.loadFromStorage()
    }
    if (msg.type === 'poll_updated' && msg.payload?.pollId === pollId) {
      pollStore.loadFromStorage()
    }
  })
})

const activeView = ref<'bar' | 'pie' | 'timeline' | 'voter'>('bar')
const hiddenOptions = ref<Set<string>>(new Set())

function toggleOptionVisibility(optionId: string) {
  const next = new Set(hiddenOptions.value)
  if (next.has(optionId)) {
    next.delete(optionId)
  } else {
    next.add(optionId)
  }
  hiddenOptions.value = next
}

const visibleOptions = computed(() => {
  if (!poll.value) return []
  return poll.value.options.filter(o => !hiddenOptions.value.has(o.id))
})

const chartData = computed(() => {
  if (!poll.value) return { labels: [] as string[], datasets: [] as Array<{ label: string; data: number[]; backgroundColor: string[] }> }
  const p = poll.value
  const opts = visibleOptions.value
  const labels = opts.map(o => o.label)
  const colors = opts.map(o => o.backgroundColor || '#1a365d')

  if (p.type === 'single' || p.type === 'multiple') {
    const counts = voteStore.getVoteCountsByPoll(pollId)
    return {
      labels,
      datasets: [{
        label: '票数',
        data: opts.map(o => counts[o.id] ?? 0),
        backgroundColor: colors,
      }],
    }
  }

  if (p.type === 'ranking') {
    const scores = voteStore.getRankingScores(pollId)
    return {
      labels,
      datasets: [{
        label: '排名分数',
        data: opts.map(o => scores[o.id] ?? 0),
        backgroundColor: colors,
      }],
    }
  }

  if (p.type === 'rating') {
    const ratings = voteStore.getAverageRatings(pollId)
    return {
      labels,
      datasets: [{
        label: '平均评分',
        data: opts.map(o => Math.round((ratings[o.id] ?? 0) * 100) / 100),
        backgroundColor: colors,
      }],
    }
  }

  return { labels, datasets: [] as Array<{ label: string; data: number[]; backgroundColor: string[] }> }
})

const pieData = computed(() => {
  if (!poll.value) return { labels: [] as string[], data: [] as number[], colors: [] as string[] }
  const p = poll.value
  const opts = visibleOptions.value
  const labels = opts.map(o => o.label)
  const colors = opts.map(o => o.backgroundColor || '#1a365d')

  if (p.type === 'single' || p.type === 'multiple') {
    const counts = voteStore.getVoteCountsByPoll(pollId)
    return { labels, data: opts.map(o => counts[o.id] ?? 0), colors }
  }

  if (p.type === 'ranking') {
    const scores = voteStore.getRankingScores(pollId)
    return { labels, data: opts.map(o => scores[o.id] ?? 0), colors }
  }

  if (p.type === 'rating') {
    const ratings = voteStore.getAverageRatings(pollId)
    return { labels, data: opts.map(o => Math.round((ratings[o.id] ?? 0) * 100) / 100), colors }
  }

  return { labels, data: [] as number[], colors }
})

const timelineComputed = computed(() => {
  const raw = voteStore.getTimelineByPoll(pollId)
  if (!poll.value || raw.length === 0) {
    return { labels: [] as string[], datasets: [] as Array<{ label: string; data: Array<{ x: number; y: number }>; borderColor: string; backgroundColor: string }> }
  }
  const p = poll.value
  const sorted = [...raw].sort((a, b) => a.timestamp - b.timestamp)
  const timestamps = [...new Set(sorted.map(tp => tp.timestamp))].sort((a, b) => a - b)
  const palette = ['#ff6b35', '#1a365d', '#38a169', '#d69e2e', '#e53e3e', '#3182ce', '#805ad5', '#dd6b20']
  const datasets = p.options.map((opt, idx) => {
    const points = timestamps.map(ts => {
      const tp = sorted.find(t => t.timestamp === ts && t.optionId === opt.id)
      return { x: ts, y: tp ? tp.count : 0 }
    })
    return {
      label: opt.label,
      data: points,
      borderColor: palette[idx % palette.length],
      backgroundColor: palette[idx % palette.length] + '20',
    }
  })
  return { labels: p.options.map(o => o.label), datasets }
})

const votes = computed(() => voteStore.getVotesByPollId(pollId))

const shareLink = computed(() => window.location.origin + '/poll/' + pollId)

const showShareModal = ref(false)
const showToast = ref(false)
const toastMessage = ref('')

function copyLink() {
  navigator.clipboard.writeText(shareLink.value)
  toastMessage.value = '已复制链接'
  showToast.value = true
  setTimeout(() => { showToast.value = false }, 2000)
}

function exportJson() {
  if (!poll.value) return
  exportAsJson(poll.value, voteStore.getVotesByPollId(pollId))
}

function exportIcs() {
  if (!poll.value) return
  exportAsIcs(poll.value)
}

const pollTypeLabel: Record<PollType, string> = {
  single: '单选',
  multiple: '多选',
  ranking: '排名',
  rating: '评分',
}

const statusLabel: Record<string, string> = {
  draft: '草稿',
  active: '进行中',
  closed: '已结束',
}

const voterCount = computed(() => voteStore.getVoterCount(pollId))
const totalVotes = computed(() => votes.value.length)
</script>

<template>
  <div v-if="!poll" class="result-page">
    <div class="result-header">
      <p>投票不存在</p>
    </div>
  </div>

  <div v-else class="result-page">
    <div class="result-header">
      <h1 class="result-header__title">{{ poll.title }}</h1>
      <p v-if="poll.description" class="result-header__desc">{{ poll.description }}</p>
      <div class="result-header__countdown">
        <template v-if="isExpired">已截止</template>
        <template v-else>{{ formatted }}</template>
      </div>
    </div>

    <div class="action-bar">
      <button class="action-bar__btn" @click="showShareModal = true">
        <Icon icon="mdi:share-variant" />
        <span>分享</span>
      </button>
      <button class="action-bar__btn" @click="exportJson">
        <Icon icon="mdi:code-json" />
        <span>导出JSON</span>
      </button>
      <button class="action-bar__btn" @click="exportIcs">
        <Icon icon="mdi:calendar" />
        <span>导出ICS</span>
      </button>
    </div>

    <div class="view-tabs">
      <button
        class="view-tabs__tab"
        :class="{ 'view-tabs__tab--active': activeView === 'bar' }"
        @click="activeView = 'bar'"
      >柱状图</button>
      <button
        class="view-tabs__tab"
        :class="{ 'view-tabs__tab--active': activeView === 'pie' }"
        @click="activeView = 'pie'"
      >饼图</button>
      <button
        class="view-tabs__tab"
        :class="{ 'view-tabs__tab--active': activeView === 'timeline' }"
        @click="activeView = 'timeline'"
      >时间线</button>
      <button
        class="view-tabs__tab"
        :class="{ 'view-tabs__tab--active': activeView === 'voter' }"
        @click="activeView = 'voter'"
      >投票人列表</button>
    </div>

    <div class="chart-area">
      <BarChart
        v-if="activeView === 'bar'"
        :labels="chartData.labels"
        :datasets="chartData.datasets"
      />
      <PieChart
        v-if="activeView === 'pie'"
        :labels="pieData.labels"
        :data="pieData.data"
        :colors="pieData.colors"
      />
      <TimelineChart
        v-if="activeView === 'timeline'"
        :labels="timelineComputed.labels"
        :datasets="timelineComputed.datasets"
      />
      <VoterList
        v-if="activeView === 'voter'"
        :votes="votes"
        :options="poll.options"
        :poll-type="poll.type"
        :hidden-options="hiddenOptions"
        @toggle-option="toggleOptionVisibility"
      />
    </div>

    <div class="stats-footer">
      <span>投票人: {{ voterCount }}</span>
      <span>总票数: {{ totalVotes }}</span>
      <span class="stats-footer__badge">{{ pollTypeLabel[poll.type] }}</span>
      <span class="stats-footer__badge stats-footer__badge--status">{{ statusLabel[poll.status] }}</span>
    </div>

    <Teleport to="body">
      <div v-if="showShareModal" class="share-modal" @click.self="showShareModal = false">
        <div class="share-modal__card">
          <h3>分享投票</h3>
          <div class="share-modal__link">
            <input :value="shareLink" readonly class="share-modal__input" />
            <button class="share-modal__copy" @click="copyLink">复制</button>
          </div>
          <p class="share-modal__note">可通过二维码或链接分享</p>
          <button class="share-modal__close" @click="showShareModal = false">关闭</button>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="showToast" class="toast">{{ toastMessage }}</div>
    </Teleport>
  </div>
</template>

<style lang="scss" scoped>
.result-page {
  max-width: 960px;
  margin: 0 auto;
  padding: 24px;
}

.result-header {
  background: $color-card;
  border-radius: $radius-lg;
  box-shadow: $shadow-sm;
  padding: 24px;
  margin-bottom: 16px;

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

  &__countdown {
    font-family: $font-mono;
    font-size: $font-size-2xl;
    color: #ff6b35;
    text-align: center;
    margin-top: 16px;
  }
}

.action-bar {
  display: flex;
  gap: 8px;
  margin: 16px 0;

  &__btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 8px 16px;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
    background: $color-card;
    cursor: pointer;
    font-size: $font-size-sm;
    color: $color-text;
    transition: all $transition-fast;

    @include dark-mode {
      background: $color-dark-card;
      border-color: $color-dark-card;
      color: $color-dark-text;
    }

    &:hover {
      border-color: $color-primary;
      color: $color-primary;
    }
  }
}

.view-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 16px;
  background: #f1f5f9;
  border-radius: 8px;
  padding: 4px;

  @include dark-mode {
    background: $color-dark-card;
  }

  &__tab {
    padding: 8px 16px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    border: none;
    background: transparent;
    color: $color-text-light;
    transition: all $transition-fast;

    @include dark-mode {
      color: $color-dark-text;
    }

    &--active {
      background: $color-card;
      box-shadow: $shadow-sm;
      font-weight: 600;
      color: $color-text;

      @include dark-mode {
        background: $color-dark-bg;
        color: $color-dark-text;
      }
    }
  }
}

.chart-area {
  min-height: 300px;
  background: $color-card;
  border-radius: $radius-lg;
  box-shadow: $shadow-sm;
  padding: 20px;

  @include dark-mode {
    background: $color-dark-card;
  }
}

.stats-footer {
  display: flex;
  gap: 24px;
  margin-top: 16px;
  padding: 16px;
  font-size: 14px;
  color: #718096;

  &__badge {
    padding: 2px 10px;
    border-radius: $radius-sm;
    background: rgba($color-primary, 0.1);
    color: $color-primary;
    font-size: $font-size-xs;
    font-weight: 500;

    &--status {
      background: rgba(#38a169, 0.1);
      color: #38a169;
    }
  }
}

.share-modal {
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

  &__card {
    background: $color-card;
    border-radius: $radius-lg;
    padding: $spacing-lg;
    width: 420px;
    max-width: 90vw;
    box-shadow: $shadow-lg;

    @include dark-mode {
      background: $color-dark-card;
    }

    h3 {
      font-size: $font-size-lg;
      margin-bottom: $spacing-md;
      color: $color-text;

      @include dark-mode {
        color: $color-dark-text;
      }
    }
  }

  &__link {
    display: flex;
    gap: 8px;
    margin-bottom: $spacing-sm;
  }

  &__input {
    flex: 1;
    padding: 8px 12px;
    border: 1px solid $color-border;
    border-radius: $radius-md;
    font-size: $font-size-sm;
    background: $color-bg;
    color: $color-text;

    @include dark-mode {
      background: $color-dark-bg;
      border-color: $color-dark-card;
      color: $color-dark-text;
    }
  }

  &__copy {
    padding: 8px 16px;
    border: none;
    border-radius: $radius-md;
    background: $color-primary;
    color: white;
    cursor: pointer;
    font-size: $font-size-sm;
    transition: opacity $transition-fast;

    &:hover {
      opacity: 0.9;
    }
  }

  &__note {
    font-size: $font-size-xs;
    color: $color-text-light;
    margin-bottom: $spacing-md;
  }

  &__close {
    padding: 8px 16px;
    border: 1px solid $color-border;
    border-radius: $radius-md;
    background: transparent;
    color: $color-text;
    cursor: pointer;
    font-size: $font-size-sm;
    transition: all $transition-fast;

    &:hover {
      background: $color-bg;
    }
  }
}

.toast {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  padding: 12px 24px;
  background: #1a365d;
  color: white;
  border-radius: 8px;
  font-size: $font-size-sm;
  z-index: 300;
  box-shadow: $shadow-md;
}
</style>
