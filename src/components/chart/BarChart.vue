<script setup lang="ts">
import { computed } from 'vue'
import { Bar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale,
  ArcElement, PointElement, LineElement, Filler
} from 'chart.js'

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale, ArcElement, PointElement, LineElement, Filler)

const props = defineProps<{
  labels: string[]
  datasets: Array<{ label: string; data: number[]; backgroundColor: string[] }>
}>()

const chartData = computed(() => ({
  labels: props.labels,
  datasets: props.datasets.map(ds => ({
    label: ds.label,
    data: ds.data,
    backgroundColor: ds.backgroundColor,
    borderWidth: 0,
    borderRadius: 4,
  })),
}))

const chartOptions = {
  responsive: true,
  indexAxis: 'y' as const,
  plugins: {
    legend: { display: false },
    tooltip: { enabled: true },
  },
  scales: {
    x: {
      beginAtZero: true,
      ticks: { stepSize: 1 },
      grid: { color: 'rgba(0,0,0,0.06)' },
    },
    y: {
      grid: { display: false },
    },
  },
}
</script>

<template>
  <div class="bar-chart">
    <Bar :data="chartData" :options="chartOptions" />
  </div>
</template>

<style lang="scss" scoped>
.bar-chart {
  width: 100%;
}
</style>
