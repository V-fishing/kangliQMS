<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import echarts from '@/utils/echarts'

export interface TrendSeries {
  name: string
  data: number[]
  color?: string
  type?: 'line' | 'bar'
  stack?: string
}

const props = withDefaults(defineProps<{
  xData: string[]
  series: TrendSeries[]
  target?: number
  height?: number
  yLabel?: string
  unit?: string
  /** 折线是否填充面积 */
  area?: boolean
  /** 高亮区间（x 轴类目标签区间） */
  markArea?: { start: string; end: string }[]
  /** 数据值 >= 该阈值时该点标红（仅折线生效） */
  pointThreshold?: number
}>(), {
  height: 280,
  area: false,
})

const chartRef = ref<HTMLDivElement>()
let inst: echarts.ECharts | null = null

function hexToRgba(hex: string, a: number): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.substring(0, 2), 16)
  const g = parseInt(h.substring(2, 4), 16)
  const b = parseInt(h.substring(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${a})`
}

function buildOption() {
  const series = props.series ?? []
  const xData = props.xData ?? []
  const hasBar = series.some((s) => s.type === 'bar')

  const markLines: Record<string, unknown>[] = []
  if (props.target != null) {
    markLines.push({
      yAxis: props.target,
      lineStyle: { color: '#2f7d32', type: 'dashed' as const },
      label: { formatter: `目标${props.target}` },
    })
  }

  const markAreaData = (props.markArea ?? []).map((m) => [
    { xAxis: m.start },
    { xAxis: m.end },
  ])

  const seriesOpts = series.map((s) => {
    const color = s.color ?? '#1e4d8b'
    const isBar = s.type === 'bar'
    const base: Record<string, unknown> = {
      name: s.name,
      type: isBar ? 'bar' : 'line',
      itemStyle: { color },
    }
    if (isBar) {
      base.data = s.data
      base.barMaxWidth = 28
    }
    else {
      base.smooth = true
      base.symbol = 'circle'
      base.symbolSize = 6
      base.lineStyle = { color, width: 2 }
      if (props.area) {
        base.areaStyle = { color: hexToRgba(color, 0.12) }
      }
      if (props.pointThreshold != null) {
        base.data = s.data.map((v) => ({
          value: v,
          itemStyle: { color: v >= props.pointThreshold! ? '#c0392b' : color },
        }))
      }
      else {
        base.data = s.data
      }
    }
    if (s.stack) base.stack = s.stack
    if (markLines.length) {
      base.markLine = {
        silent: true,
        symbol: 'none',
        lineStyle: { type: 'dashed' },
        data: markLines,
      }
    }
    if (markAreaData.length) {
      base.markArea = {
        silent: true,
        itemStyle: { color: 'rgba(192,57,43,.10)' },
        data: markAreaData,
      }
    }
    return base
  })

  return {
    tooltip: { trigger: 'axis' },
    legend: { data: series.map((s) => s.name) },
    grid: { left: 50, right: 20, top: 40, bottom: 30 },
    xAxis: {
      type: 'category',
      data: xData,
      boundaryGap: hasBar,
      axisLabel: { fontSize: 10 },
    },
    yAxis: {
      type: 'value',
      name: props.yLabel,
      axisLabel: { formatter: props.unit ? `{value}${props.unit}` : '{value}' },
    },
    series: seriesOpts,
  }
}

onMounted(() => {
  if (chartRef.value) {
    inst = echarts.init(chartRef.value)
    inst.setOption(buildOption())
  }
})

watch(() => props, () => inst?.setOption(buildOption()), { deep: true })
onBeforeUnmount(() => inst?.dispose())
</script>

<template>
  <div ref="chartRef" class="chart" :style="{ height: height + 'px' }"></div>
</template>

<style scoped>
.chart { width: 100%; }
</style>
