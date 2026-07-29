<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import * as echarts from 'echarts/core'
import { useChartResize } from '@/composables/useChartResize'
import { BarChart, LineChart } from 'echarts/charts'
import {
  CanvasRenderer,
} from 'echarts/renderers'
import {
  TooltipComponent,
  GridComponent,
  LegendComponent,
} from 'echarts/components'

echarts.use([BarChart, LineChart, CanvasRenderer, TooltipComponent, GridComponent, LegendComponent])

interface ParetoItem {
  name: string
  value: number
  color?: string
}

const props = withDefaults(
  defineProps<{
    data?: ParetoItem[]
    title?: string
    height?: string
    unit?: string
  }>(),
  {
    title: '帕累托分析',
    height: '300px',
    unit: '次',
  },
)

const chartRef = ref<HTMLElement>()
let chart: echarts.ECharts | null = null
useChartResize(() => [chart])

function buildOption() {
  const sorted = [...props.data].sort((a, b) => b.value - a.value)
  const names = sorted.map((d) => d.name)
  const values = sorted.map((d) => d.value)
  const total = values.reduce((s, v) => s + v, 0)
  let cum = 0
  const cumulative = values.map((v) => {
    cum += v
    return Math.round((cum / total) * 1000) / 10
  })

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: Array<{ axisValue: string; data: number; seriesName: string }>) => {
        let s = params[0].axisValue
        for (const p of params) {
          s += `<br/>${p.seriesName}: ${p.data}${p.seriesName === '占比' ? '%' : props.unit}`
        }
        return s
      },
    },
    legend: { data: ['不良数', '占比'], bottom: 0, textStyle: { fontSize: 11 } },
    grid: { left: '3%', right: '4%', bottom: '12%', top: '8%', containLabel: true },
    xAxis: {
      type: 'category',
      data: names,
      axisLabel: { fontSize: 11, interval: 0, rotate: names.length > 5 ? 30 : 0 },
    },
    yAxis: [
      {
        type: 'value',
        name: '不良数',
        nameTextStyle: { fontSize: 11 },
        axisLabel: { fontSize: 10 },
      },
      {
        type: 'value',
        name: '占比(%)',
        nameTextStyle: { fontSize: 11 },
        axisLabel: { fontSize: 10, formatter: '{value}%' },
        max: 100,
      },
    ],
    series: [
      {
        name: '不良数',
        type: 'bar',
        barWidth: '50%',
        data: values.map((v, i) => ({
          value: v,
          itemStyle: { color: sorted[i].color || '#1e4d8b' },
        })),
        label: { show: true, position: 'top', fontSize: 10 },
      },
      {
        name: '占比',
        type: 'line',
        yAxisIndex: 1,
        smooth: false,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: { color: '#c0392b', width: 2 },
        itemStyle: { color: '#c0392b' },
        data: cumulative,
        label: { show: true, formatter: '{c}%', fontSize: 10, color: '#c0392b' },
      },
    ],
  }
}

function initChart() {
  if (!chartRef.value) return
  chart = echarts.init(chartRef.value)
  chart.setOption(buildOption())
}

onMounted(() => {
  initChart()
  window.addEventListener('resize', resize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', resize)
  chart?.dispose()
  chart = null
})

function resize() {
  chart?.resize()
}

watch(() => props.data, () => chart?.setOption(buildOption()), { deep: true })
</script>

<template>
  <div ref="chartRef" :style="{ width: '100%', height }"></div>
</template>
