<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import echarts from '@/utils/echarts'
import { useChartResize } from '@/composables/useChartResize'
import type { NcmDefectHeatmap } from '@/types/ncm'

const props = withDefaults(defineProps<{
  data: NcmDefectHeatmap
  height?: number
}>(), {
  height: 300,
})

const chartRef = ref<HTMLDivElement>()
let inst: echarts.ECharts | null = null
useChartResize(() => [inst])

function buildOption() {
  const max = Math.max(...props.data.data.map((d) => d[2]))
  return {
    tooltip: {
      position: 'top',
      formatter: (p: { value: [number, number, number] }) =>
        `${props.data.processes[p.value[0]]} × ${props.data.types[p.value[1]]}<br/>不良数: ${p.value[2]}`,
    },
    grid: { left: 80, right: 20, top: 30, bottom: 60 },
    xAxis: { type: 'category', data: props.data.processes, splitArea: { show: true } },
    yAxis: { type: 'category', data: props.data.types, splitArea: { show: true } },
    visualMap: {
      min: 0,
      max,
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: 5,
      inRange: { color: ['#eef4fb', '#4ea3ff', '#c0392b'] },
    },
    series: [
      {
        type: 'heatmap',
        data: props.data.data,
        label: { show: true },
        emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0, 0, 0, 0.5)' } },
      },
    ],
  }
}

onMounted(() => {
  if (chartRef.value) {
    inst = echarts.init(chartRef.value)
    inst.setOption(buildOption())
  }
})

watch(() => props.data, () => inst?.setOption(buildOption()), { deep: true })
onBeforeUnmount(() => inst?.dispose())
</script>

<template>
  <div ref="chartRef" class="chart" :style="{ height: height + 'px' }"></div>
</template>

<style scoped>
.chart { width: 100%; }
</style>
