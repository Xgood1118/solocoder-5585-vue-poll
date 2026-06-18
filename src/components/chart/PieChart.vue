<script setup lang="ts">
import { computed } from 'vue'
import { Doughnut } from 'vue-chartjs'
import {
  Chart as ChartJS,
  Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale,
  ArcElement, PointElement, LineElement, Filler
} from 'chart.js'

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale, ArcElement, PointElement, LineElement, Filler)

const props = defineProps<{
  labels: string[]
  data: number[]
  colors: string[]
}>()

const total = computed(() => props.data.reduce((sum, v) => sum + v, 0))

const chartData = computed(() => ({
  labels: props.labels,
  datasets: [
    {
      data: props.data,
      backgroundColor: props.colors,
      borderWidth: 2,
      borderColor: '#ffffff',
      hoverOffset: 6,
    },
  ],
}))

const chartOptions = {
  responsive: true,
  cutout: '60%',
  plugins: {
    legend: {
      position: 'bottom' as const,
      labels: {
        padding: 16,
        usePointStyle: true,
        pointStyleWidth: 10,
      },
    },
    tooltip: {
      enabled: true,
      callbacks: {
        label(ctx: { label?: string; parsed: number; dataset: { data: number[] } }) {
          const value = ctx.parsed
          const pct = total.value > 0 ? ((value / total.value) * 100).toFixed(1) : '0.0'
          return ` ${ctx.label}: ${value} (${pct}%)`
        },
      },
    },
  },
}
</script>

<template>
  <div class="pie-chart">
    <Doughnut :data="chartData" :options="chartOptions" />
  </div>
</template>

<style lang="scss" scoped>
.pie-chart {
  width: 100%;
  max-width: 400px;
  margin: 0 auto;
}
</style>
