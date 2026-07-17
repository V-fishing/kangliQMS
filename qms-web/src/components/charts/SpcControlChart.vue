<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import echarts from '@/utils/echarts'
import type { SpcSubgroup, SpcLimit } from '@/types/spc'

interface RuleDef {
  code: string
  level: '预警' | '报警'
}

const props = withDefaults(defineProps<{
  subgroups: SpcSubgroup[]
  limit: SpcLimit
  rules: RuleDef[]
  chartType?: 'Xbar-R' | 'Xbar-s' | 'I-MR'
  shiftColor?: boolean
  height?: number
}>(), {
  chartType: 'Xbar-R',
  shiftColor: false,
  height: 280,
})

const emit = defineEmits<{
  clickSubgroup: [subgroup: SpcSubgroup]
}>()

const chartRef = ref<HTMLDivElement>()
let inst: echarts.ECharts | null = null

const RULE_COLOR = (ruleCode?: string): string => {
  if (!ruleCode) return '#1e4d8b'
  const r = props.rules.find((x) => x.code === ruleCode)
  return r?.level === '报警' ? '#c0392b' : r?.level === '预警' ? '#d4a017' : '#1e4d8b'
}

const SHIFT_SYMBOL = (shift?: string): string => {
  if (!shift) return 'circle'
  return shift === '早班' ? 'circle' : shift === '中班' ? 'rect' : 'triangle'
}

function buildOption() {
  const data = props.subgroups
  const limit = props.limit

  const xbarSeries: Record<string, unknown> = {
    name: props.chartType === 'I-MR' ? '单值(I)' : 'Xbar',
    type: 'line',
    data: data.map((s) => s.xbar),
    symbolSize: 8,
    itemStyle: {
      color: (p: { dataIndex: number }) => RULE_COLOR(data[p.dataIndex].outlierRule),
    },
    symbol: (value: unknown, params: { dataIndex: number }) =>
      props.shiftColor ? SHIFT_SYMBOL(data[params.dataIndex].shift) : 'circle',
    markLine: {
      data: [
        { yAxis: limit.ucl, lineStyle: { color: '#c0392b', type: 'dashed' }, label: { formatter: 'UCL' } },
        { yAxis: limit.cl, lineStyle: { color: '#2f7d32' }, label: { formatter: 'CL' } },
        { yAxis: limit.lcl, lineStyle: { color: '#c0392b', type: 'dashed' }, label: { formatter: 'LCL' } },
      ],
    },
  }

  const rSeries: Record<string, unknown> = {
    name: props.chartType === 'I-MR' ? '移动极差(MR)' : 'R',
    type: 'line',
    xAxisIndex: 1,
    yAxisIndex: 1,
    data: data.map((s) => s.r),
    symbolSize: 6,
    itemStyle: { color: '#5a6b7e' },
    markLine: limit.rUcl != null ? {
      data: [
        { yAxis: limit.rUcl, lineStyle: { color: '#c0392b', type: 'dashed' }, label: { formatter: 'UCL' } },
        limit.rCl != null ? { yAxis: limit.rCl, lineStyle: { color: '#2f7d32' }, label: { formatter: 'CL' } } : {},
      ].filter((x) => 'yAxis' in x),
    } : undefined,
  }

  return {
    tooltip: {
      trigger: 'axis',
      formatter: (params: { dataIndex: number }[]) => {
        const idx = params[0]?.dataIndex
        if (idx == null) return ''
        const s = data[idx]
        return `子组 #${s.no}<br/>
          Xbar: ${s.xbar.toFixed(4)}<br/>
          R: ${s.r.toFixed(4)}<br/>
          ${s.shift ? `班次: ${s.shift}<br/>` : ''}
          ${s.outlierRule ? `<span style="color:#c0392b">命中规则: ${s.outlierRule}</span>` : '正常'}`
      },
    },
    legend: { data: [xbarSeries.name, rSeries.name] },
    grid: [
      { left: 60, right: 20, top: 40, height: '45%' },
      { left: 60, right: 20, top: '62%', height: '30%' },
    ],
    xAxis: [
      { type: 'category', gridIndex: 0, data: data.map((s) => s.no), name: '子组号' },
      { type: 'category', gridIndex: 1, data: data.map((s) => s.no), show: false },
    ],
    yAxis: [
      { type: 'value', gridIndex: 0, name: xbarSeries.name as string },
      { type: 'value', gridIndex: 1, name: rSeries.name as string },
    ],
    series: [xbarSeries, rSeries],
    dataZoom: [
      { type: 'inside', xAxisIndex: [0, 1] },
      { type: 'slider', xAxisIndex: [0, 1], bottom: 5, height: 16 },
    ],
  }
}

function handleClick(params: { dataIndex: number; componentType: string }) {
  if (params.componentType === 'series') {
    const s = props.subgroups[params.dataIndex]
    if (s) emit('clickSubgroup', s)
  }
}

onMounted(() => {
  if (chartRef.value) {
    inst = echarts.init(chartRef.value)
    inst.setOption(buildOption())
    inst.on('click', handleClick)
  }
})

watch(() => props.subgroups, () => inst?.setOption(buildOption()), { deep: true })
onBeforeUnmount(() => inst?.dispose())
</script>

<template>
  <div ref="chartRef" class="chart" :style="{ height: height + 'px' }"></div>
</template>

<style scoped>
.chart {
  width: 100%;
}
</style>
