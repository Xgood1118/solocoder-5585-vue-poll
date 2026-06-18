<script setup lang="ts">
import { ref, onMounted, provide } from 'vue'
import { RouterView } from 'vue-router'
import { Icon } from '@iconify/vue'
import { usePollStore } from '@/stores/pollStore'

const pollStore = usePollStore()

const isDark = ref(false)

function initTheme() {
  const stored = localStorage.getItem('vue-poll-theme')
  if (stored === 'dark') {
    isDark.value = true
  } else if (stored === 'light') {
    isDark.value = false
  } else {
    isDark.value = window.matchMedia('(prefers-color-scheme: dark)').matches
  }
  document.documentElement.classList.toggle('dark', isDark.value)
}

function toggleTheme() {
  isDark.value = !isDark.value
  document.documentElement.classList.toggle('dark', isDark.value)
  localStorage.setItem('vue-poll-theme', isDark.value ? 'dark' : 'light')
}

provide('toggleTheme', toggleTheme)

onMounted(() => {
  initTheme()
  pollStore.checkDeadlines()
})
</script>

<template>
  <nav class="navbar">
    <span class="navbar__title">投票系统</span>
    <button class="navbar__theme-btn" @click="toggleTheme">
      <Icon :icon="isDark ? 'mdi:weather-sunny' : 'mdi:weather-night'" />
    </button>
  </nav>
  <main class="main-content">
    <RouterView />
  </main>
</template>

<style lang="scss" scoped>
.navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 56px;
  @include flex-between;
  padding: 0 $spacing-lg;
  background: $color-card;
  box-shadow: $shadow-sm;
  z-index: 100;

  @include dark-mode {
    background: $color-dark-card;
  }

  &__title {
    font-size: $font-size-lg;
    font-weight: 700;
    color: $color-primary;

    @include dark-mode {
      color: $color-dark-text;
    }
  }

  &__theme-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border: none;
    border-radius: $radius-md;
    background: transparent;
    cursor: pointer;
    font-size: $font-size-xl;
    color: $color-text;
    transition: background $transition-fast;

    &:hover {
      background: $color-bg;
    }

    @include dark-mode {
      color: $color-dark-text;

      &:hover {
        background: $color-dark-bg;
      }
    }
  }
}

.main-content {
  margin-top: 56px;
}
</style>
