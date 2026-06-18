<script setup lang="ts">
import { reactive, ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Icon } from '@iconify/vue'
import draggable from 'vuedraggable'
import { usePollStore } from '@/stores/pollStore'
import { generateId } from '@/utils/id'
import type { PollType } from '@/types'

const router = useRouter()
const route = useRoute()
const pollStore = usePollStore()

const title = ref('')
const description = ref('')
const type = ref<PollType>('single')
const deadline = ref('')
const passwordEnabled = ref(false)
const password = ref('')
const pollId = ref('')
let options = reactive<Array<{ id: string; label: string; imageUrl: string; backgroundColor: string; displayOrder: number }>>([])
const settings = reactive({
  ratingMin: 1,
  ratingMax: 5,
  ratingStep: 1,
  maxSelections: 1,
})

onMounted(() => {
  const id = route.params.id as string
  const poll = pollStore.getPollById(id)
  if (!poll) {
    router.push('/')
    return
  }
  pollId.value = poll.id
  title.value = poll.title
  description.value = poll.description
  type.value = poll.type
  deadline.value = poll.deadline ? new Date(poll.deadline).toISOString().slice(0, 16) : ''
  passwordEnabled.value = !!poll.password
  password.value = poll.password ?? ''
  settings.ratingMin = poll.settings.ratingMin
  settings.ratingMax = poll.settings.ratingMax
  settings.ratingStep = poll.settings.ratingStep
  settings.maxSelections = poll.settings.maxSelections ?? 1
  options.splice(0, options.length, ...poll.options.map(o => ({
    id: o.id,
    label: o.label,
    imageUrl: o.imageUrl ?? '',
    backgroundColor: o.backgroundColor ?? '#ffffff',
    displayOrder: o.displayOrder,
  })))
})

function addOption() {
  options.push({
    id: generateId(),
    label: '',
    imageUrl: '',
    backgroundColor: '#ffffff',
    displayOrder: options.length,
  })
}

function removeOption(index: number) {
  options.splice(index, 1)
}

function updateOptionImage(index: number, value: string) {
  options[index].imageUrl = value
}

function updateOptionColor(index: number, value: string) {
  options[index].backgroundColor = value
}

const optionEditorComponent = computed(() => {
  switch (type.value) {
    case 'ranking': return 'RankingEditor'
    case 'rating': return 'RatingEditor'
    default: return 'DefaultEditor'
  }
})

function buildPollData() {
  return {
    title: title.value,
    description: description.value,
    type: type.value,
    deadline: deadline.value ? new Date(deadline.value).getTime() : 0,
    password: passwordEnabled.value ? password.value : undefined,
    options: options.map((o, i) => ({
      ...o,
      displayOrder: i,
      pollId: pollId.value,
    })),
    settings: {
      ratingMin: settings.ratingMin,
      ratingMax: settings.ratingMax,
      ratingStep: settings.ratingStep,
      maxSelections: type.value === 'multiple' ? settings.maxSelections : undefined,
    },
  }
}

function submitPoll() {
  if (!title.value.trim()) return
  if (options.length < 2) return
  pollStore.updatePoll(pollId.value, buildPollData())
  router.push('/')
}

function saveDraft() {
  pollStore.updatePoll(pollId.value, { ...buildPollData(), status: 'draft' })
  router.push('/')
}
</script>

<template>
  <div class="create-form">
    <h1 class="create-form__title">编辑投票</h1>

    <section class="form-section">
      <h2 class="form-section__title">基础信息</h2>
      <div class="form-group">
        <label class="form-group__label">标题</label>
        <input v-model="title" type="text" placeholder="输入投票标题" />
      </div>
      <div class="form-group">
        <label class="form-group__label">描述</label>
        <textarea v-model="description" placeholder="输入投票描述" rows="3"></textarea>
      </div>
      <div class="form-group">
        <label class="form-group__label">类型</label>
        <select v-model="type">
          <option value="single">单选</option>
          <option value="multiple">多选</option>
          <option value="ranking">排序</option>
          <option value="rating">评分</option>
        </select>
      </div>
    </section>

    <section class="form-section">
      <div class="form-section__header">
        <h2 class="form-section__title">选项编辑</h2>
        <button class="btn-add" @click="addOption">
          <Icon icon="mdi:plus" />
          添加选项
        </button>
      </div>

      <template v-if="type === 'ranking'">
        <draggable v-model="options" item-key="id" handle=".drag-handle">
          <template #item="{ element, index }">
            <div class="option-row">
              <span class="drag-handle"><Icon icon="mdi:drag" /></span>
              <input v-model="element.label" type="text" placeholder="选项内容" />
              <input :value="element.imageUrl" type="text" placeholder="图片URL" @input="updateOptionImage(index, ($event.target as HTMLInputElement).value)" />
              <input type="color" class="color-input" :value="element.backgroundColor" @input="updateOptionColor(index, ($event.target as HTMLInputElement).value)" />
              <button class="btn-delete" @click="removeOption(index)">
                <Icon icon="mdi:delete-outline" />
              </button>
            </div>
          </template>
        </draggable>
      </template>

      <template v-else>
        <div v-for="(option, index) in options" :key="option.id" class="option-row">
          <input v-model="option.label" type="text" placeholder="选项内容" />
          <input :value="option.imageUrl" type="text" placeholder="图片URL" @input="updateOptionImage(index, ($event.target as HTMLInputElement).value)" />
          <input type="color" class="color-input" :value="option.backgroundColor" @input="updateOptionColor(index, ($event.target as HTMLInputElement).value)" />
          <button class="btn-delete" @click="removeOption(index)">
            <Icon icon="mdi:delete-outline" />
          </button>
        </div>
      </template>

      <template v-if="type === 'rating'">
        <div class="rating-config">
          <h3 class="form-group__label">评分配置</h3>
          <div class="rating-config__row">
            <div class="form-group">
              <label class="form-group__label">最小值</label>
              <input v-model.number="settings.ratingMin" type="number" min="0" />
            </div>
            <div class="form-group">
              <label class="form-group__label">最大值</label>
              <input v-model.number="settings.ratingMax" type="number" min="1" />
            </div>
            <div class="form-group">
              <label class="form-group__label">步长</label>
              <input v-model.number="settings.ratingStep" type="number" min="0.1" step="0.1" />
            </div>
          </div>
        </div>
      </template>
    </section>

    <section class="form-section">
      <h2 class="form-section__title">截止设置</h2>
      <div class="form-group">
        <label class="form-group__label">截止时间</label>
        <input v-model="deadline" type="datetime-local" />
      </div>
    </section>

    <section class="form-section">
      <h2 class="form-section__title">口令保护</h2>
      <div class="form-group">
        <label class="toggle-row">
          <span class="form-group__label">启用口令</span>
          <input v-model="passwordEnabled" type="checkbox" class="toggle-switch" />
        </label>
      </div>
      <div v-if="passwordEnabled" class="form-group">
        <label class="form-group__label">口令</label>
        <input v-model="password" type="text" placeholder="输入访问口令" />
      </div>
    </section>

    <section v-if="type === 'multiple'" class="form-section">
      <h2 class="form-section__title">多选设置</h2>
      <div class="form-group">
        <label class="form-group__label">最多可选</label>
        <input v-model.number="settings.maxSelections" type="number" min="1" />
      </div>
    </section>

    <div class="actions">
      <button class="btn-secondary" @click="saveDraft">保存草稿</button>
      <button class="btn-primary" @click="submitPoll">发布投票</button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.create-form {
  max-width: 720px;
  margin: 0 auto;
  padding: $spacing-lg;
}

.create-form__title {
  font-size: $font-size-xl;
  font-weight: 700;
  margin-bottom: $spacing-lg;
  color: $color-text;

  @include dark-mode {
    color: $color-dark-text;
  }
}

.form-section {
  background: $color-card;
  padding: 20px;
  margin-bottom: $spacing-md;
  border-radius: $radius-lg;

  @include dark-mode {
    background: $color-dark-card;
  }
}

.form-section__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: $spacing-md;
}

.form-section__title {
  font-size: $font-size-base;
  font-weight: 700;
  margin-bottom: $spacing-md;
  border-bottom: 1px solid $color-border;
  padding-bottom: $spacing-sm;
  color: $color-text;

  @include dark-mode {
    color: $color-dark-text;
    border-bottom-color: $color-dark-bg;
  }
}

.form-section__header .form-section__title {
  margin-bottom: 0;
  border-bottom: none;
  padding-bottom: 0;
}

.form-group {
  margin-bottom: $spacing-md;

  input[type="text"],
  input[type="number"],
  input[type="datetime-local"],
  textarea,
  select {
    width: 100%;
    padding: $spacing-sm $spacing-md;
    border: 1px solid $color-border;
    border-radius: $radius-md;
    font-size: $font-size-sm;
    font-family: $font-display;
    background: $color-card;
    color: $color-text;

    @include dark-mode {
      background: $color-dark-bg;
      border-color: $color-dark-text;
      color: $color-dark-text;
    }
  }

  textarea {
    resize: vertical;
  }
}

.form-group__label {
  font-size: $font-size-sm;
  font-weight: 500;
  margin-bottom: 6px;
  display: block;
  color: $color-text;

  @include dark-mode {
    color: $color-dark-text;
  }
}

.option-row {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  margin-bottom: $spacing-sm;
  padding: $spacing-sm;
  border-radius: $radius-md;
  background: $color-bg;

  @include dark-mode {
    background: $color-dark-bg;
  }

  input[type="text"] {
    flex: 1;
    padding: 6px $spacing-sm;
    border: 1px solid $color-border;
    border-radius: $radius-sm;
    font-size: $font-size-sm;
    background: $color-card;
    color: $color-text;

    @include dark-mode {
      background: $color-dark-card;
      border-color: $color-dark-text;
      color: $color-dark-text;
    }
  }
}

.drag-handle {
  cursor: grab;
  display: inline-flex;
  align-items: center;
  font-size: $font-size-lg;
  color: $color-text-light;

  @include dark-mode {
    color: $color-dark-text;
  }
}

.color-input {
  width: 40px;
  height: 40px;
  border-radius: $radius-md;
  border: none;
  cursor: pointer;
  padding: 0;
}

.btn-add {
  @include button-base;
  background: $color-primary;
  color: #fff;
  gap: $spacing-xs;

  &:hover {
    opacity: 0.85;
  }
}

.btn-delete {
  @include button-base;
  background: transparent;
  color: $color-danger;
  padding: $spacing-xs;

  &:hover {
    background: rgba($color-danger, 0.1);
  }
}

.rating-config {
  margin-top: $spacing-md;
  padding-top: $spacing-md;
  border-top: 1px solid $color-border;

  @include dark-mode {
    border-top-color: $color-dark-bg;
  }
}

.rating-config__row {
  display: flex;
  gap: $spacing-md;

  .form-group {
    flex: 1;
    margin-bottom: 0;
  }
}

.toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
}

.toggle-switch {
  width: 44px;
  height: 24px;
  appearance: none;
  background: $color-border;
  border-radius: 12px;
  position: relative;
  cursor: pointer;
  transition: background $transition-fast;

  &::after {
    content: '';
    position: absolute;
    top: 2px;
    left: 2px;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #fff;
    transition: transform $transition-fast;
  }

  &:checked {
    background: $color-primary;

    &::after {
      transform: translateX(20px);
    }
  }
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: $spacing-md;
  margin-top: $spacing-lg;
}

.btn-primary {
  @include button-base;
  background: $color-primary;
  color: #fff;
  padding: $spacing-sm $spacing-lg;

  &:hover {
    opacity: 0.85;
  }
}

.btn-secondary {
  @include button-base;
  background: $color-bg;
  color: $color-text;
  padding: $spacing-sm $spacing-lg;
  border: 1px solid $color-border;

  @include dark-mode {
    background: $color-dark-bg;
    color: $color-dark-text;
    border-color: $color-dark-text;
  }

  &:hover {
    opacity: 0.85;
  }
}
</style>
