<script setup lang="ts">
import { computed } from 'vue'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale,
  ArcElement, PointElement, LineElement, Filler
} from 'chart.js'

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale, ArcElement, PointElement, LineElement, Filler)

const props = defineProps<{
  labels: string[]
  datasets: Array<{
    label: string
    data: Array<{ x: number; y: number }>
    borderColor: string
    backgroundColor: string
  }>
}>()

const chartData = computed(() => ({
  labels: props.labels,
  datasets: props.datasets.map(ds => ({
    label: ds.label,
    data: ds.data,
    borderColor: ds.borderColor,
    backgroundColor: ds.backgroundColor,
    fill: true,
    tension: 0.3,
    pointRadius: 3,
    pointHoverRadius: 5,
  })),
}))

const chartOptions = {
  responsive: true,
  interaction: {
    mode: 'index' as const,
    intersect: false,
  },
  scales: {
    x: {
      type: 'linear' as const,
      title: { display: true, text: '时间' },
      ticks: {
        callback(value: string | number) {
          const d = new Date(Number(value))
          return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
        },
      },
      grid: { color: 'rgba(0,0,0,0.06)' },
    },
    y: {
      beginAtZero: true,
      ticks: { stepSize: 1 },
      grid: { color: 'rgba(0,0,0,0.06)' },
    },
  },
  plugins: {
    tooltip: {
      enabled: true,
      callbacks: {
        title(items: Array<{ parsed: { x: number } }>) {
          if (items.length === 0) return ''
          const d = new Date(items[0].parsed.x)
          return d.toLocaleString('zh-CN')
        },
      },
    },
    legend: {
      position: 'top' as const,
    },
  },
}
</script>

<template>
  <div class="timeline-chart">
    <Line :data="chartData" :options="chartOptions" />
  </div>
</template>

<style lang="scss" scoped>
.timeline-chart {
  width: 100%;
}
</style>
