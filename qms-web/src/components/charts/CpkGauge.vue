<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import * as echarts from 'echarts/core'
import { useChartResize } from '@/composables/useChartResize'
import { GaugeChart } from 'echarts/charts'
import { CanvasRenderer } from 'echarts/renderers'
import { TooltipComponent } from 'echarts/components'

echarts.use([GaugeChart, CanvasRenderer, TooltipComponent])

const props = withDefaults(
  defineProps<{
    cpk?: number
    ppk?: number
    title?: string
    height?: string
  }>(),
  {
    cpk: 1.42,
    ppk: 1.35,
    title: '过程能力指数',
    height: '260px',
  },
)

const chartRef = ref<HTMLElement>()
let chart: echarts.ECharts | null = null
useChartResize(() => [chart])

function getColor(val: number): string {
  if (val >= 1.33) return '#2f7d32'
  if (val >= 1.0) return '#d4a017'
  return '#c0392b'
}

function getLevel(val: number): string {
  if (val >= 1.33) return '充足'
  if (val >= 1.0) return '尚可'
  return '不足'
}

function buildOption() {
  const cpk = props.cpk
  const ppk = props.ppk
  return {
    tooltip: { formatter: (p: { name: string; value: number }) => `${p.name}: ${p.value}` },
    series: [
      {
        name: 'CPK',
        type: 'gauge',
        center: ['30%', '55%'],
        radius: '80%',
        min: 0,
        max: 2,
        startAngle: 200,
        endAngle: -20,
        splitNumber: 4,
        axisLine: {
          lineStyle: {
            width: 12,
            color: [
              [0.5, '#c0392b'],
              [0.665, '#d4a017'],
              [1, '#2f7d32'],
            ],
          },
        },
        pointer: { width: 4, length: '70%' },
        axisTick: { distance: -12, length: 5 },
        splitLine: { distance: -12, length: 8 },
        axisLabel: { distance: -22, fontSize: 9, color: '#8a9bb0' },
        detail: {
          valueAnimation: true,
          formatter: () => `{a|CPK}\n{b|${cpk}}\n{c|${getLevel(cpk)}}`,
          rich: {
            a: { fontSize: 11, color: '#5a6b7e' },
            b: { fontSize: 20, fontWeight: 'bold', color: getColor(cpk) },
            c: { fontSize: 10, color: getColor(cpk) },
          },
          offsetCenter: [0, '30%'],
        },
        data: [{ value: cpk, name: 'CPK' }],
      },
      {
        name: 'PPK',
        type: 'gauge',
        center: ['70%', '55%'],
        radius: '80%',
        min: 0,
        max: 2,
        startAngle: 200,
        endAngle: -20,
        splitNumber: 4,
        axisLine: {
          lineStyle: {
            width: 12,
            color: [
              [0.5, '#c0392b'],
              [0.665, '#d4a017'],
              [1, '#2f7d32'],
            ],
          },
        },
        pointer: { width: 4, length: '70%' },
        axisTick: { distance: -12, length: 5 },
        splitLine: { distance: -12, length: 8 },
        axisLabel: { distance: -22, fontSize: 9, color: '#8a9bb0' },
        detail: {
          valueAnimation: true,
          formatter: () => `{a|PPK}\n{b|${ppk}}\n{c|${getLevel(ppk)}}`,
          rich: {
            a: { fontSize: 11, color: '#5a6b7e' },
            b: { fontSize: 20, fontWeight: 'bold', color: getColor(ppk) },
            c: { fontSize: 10, color: getColor(ppk) },
          },
          offsetCenter: [0, '30%'],
        },
        data: [{ value: ppk, name: 'PPK' }],
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

watch(() => [props.cpk, props.ppk], () => {
  chart?.setOption(buildOption())
})
</script>

<template>
  <div ref="chartRef" :style="{ width: '100%', height }"></div>
</template>
