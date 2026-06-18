<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Icon } from '@iconify/vue'
import { usePollStore } from '@/stores/pollStore'

const route = useRoute()
const router = useRouter()
const pollStore = usePollStore()

const pollId = route.params.id as string
const poll = pollStore.getPollById(pollId)

if (!poll) {
  router.replace('/')
} else if (!poll.password) {
  router.replace(`/poll/${pollId}`)
}

const inputPassword = ref('')
const error = ref('')
const showPassword = ref(false)

function submitPassword() {
  if (!poll) return

  if (inputPassword.value === poll.password) {
    sessionStorage.setItem(`vue-poll-unlocked-${pollId}`, 'true')
    router.replace(`/poll/${pollId}`)
  } else {
    error.value = '口令错误，请重试'
  }
}

function toggleShowPassword() {
  showPassword.value = !showPassword.value
}
</script>

<template>
  <div v-if="poll" class="verify-page">
    <div class="verify-card">
      <Icon icon="mdi:lock-outline" class="verify-card__icon" />
      <h2 class="verify-card__title">输入口令</h2>
      <p class="verify-card__desc">此投票需要口令才能参与</p>

      <div class="verify-card__input-wrap">
        <input
          v-model="inputPassword"
          :type="showPassword ? 'text' : 'password'"
          class="form-input verify-card__input"
          placeholder="请输入口令"
          @keyup.enter="submitPassword"
        />
        <button class="verify-card__toggle" @click="toggleShowPassword">
          <Icon :icon="showPassword ? 'mdi:eye-outline' : 'mdi:eye-off-outline'" />
        </button>
      </div>

      <p v-if="error" class="verify-card__error">{{ error }}</p>

      <button class="verify-card__submit" @click="submitPassword">
        验证
      </button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.verify-page {
  min-height: calc(100vh - 56px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: $spacing-md;
}

.verify-card {
  width: 100%;
  max-width: 400px;
  background: $color-card;
  border-radius: $radius-lg;
  box-shadow: $shadow-md;
  padding: $spacing-xl;
  text-align: center;

  @include dark-mode {
    background: $color-dark-card;
  }

  &__icon {
    font-size: 48px;
    color: $color-primary;
    margin-bottom: $spacing-md;

    @include dark-mode {
      color: $color-dark-text;
    }
  }

  &__title {
    font-size: $font-size-xl;
    font-weight: 700;
    color: $color-text;
    margin-bottom: $spacing-xs;

    @include dark-mode {
      color: $color-dark-text;
    }
  }

  &__desc {
    font-size: $font-size-sm;
    color: $color-text-light;
    margin-bottom: $spacing-lg;
  }

  &__input-wrap {
    position: relative;
    margin-bottom: $spacing-sm;
  }

  &__input {
    padding-right: 44px;
  }

  &__toggle {
    position: absolute;
    right: 8px;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    cursor: pointer;
    color: $color-text-light;
    font-size: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: $spacing-xs;

    &:hover {
      color: $color-text;
    }
  }

  &__error {
    color: $color-danger;
    font-size: $font-size-sm;
    margin-bottom: $spacing-sm;
  }

  &__submit {
    width: 100%;
    padding: 12px;
    background: $color-primary;
    color: white;
    border: none;
    border-radius: $radius-md;
    font-size: $font-size-base;
    font-family: $font-display;
    font-weight: 500;
    cursor: pointer;
    margin-top: $spacing-sm;
    transition: opacity $transition-fast;

    &:hover {
      opacity: 0.9;
    }
  }
}
</style>
