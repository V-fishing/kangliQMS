<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import echarts from '@/utils/echarts'
import { useChartResize } from '@/composables/useChartResize'
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
useChartResize(() => [inst])

const RULE_COLOR = (ruleCode?: string): string => {
  if (!ruleCode) return '#1e4d8b'
  const r = props.rules.find((x) => x.code === ruleCode)
  return r?.level === '报警' ? '#c0392b' : r?.level === '预警' ? '#d4a017' : '#1e4d8b'
}
/** 首件联动(fia) 子组的标记色 */
const FIA_COLOR = '#8e44ad'

const SHIFT_SYMBOL = (shift?: string): string => {
  if (!shift) return 'circle'
  return shift === '早班' ? 'circle' : shift === '中班' ? 'rect' : 'triangle'
}

function buildOption() {
  const data = props.subgroups
  const limit = props.limit

  /** 首个首件联动(fia) 子组索引，用于打「首件基准」标记 */
  const firstFiaIdx = data.findIndex((s) => s.dataSource === 'fia')

  const xbarSeries: Record<string, unknown> = {
    name: props.chartType === 'I-MR' ? '单值(I)' : 'Xbar',
    type: 'line',
    data: data.map((s) => s.xbar),
    symbolSize: 9,
    itemStyle: {
      color: (p: { dataIndex: number }) => {
        const s = data[p.dataIndex]
        return s?.dataSource === 'fia' ? FIA_COLOR : RULE_COLOR(s?.outlierRule)
      },
    },
    symbol: (value: unknown, params: { dataIndex: number }) => {
      const s = data[params.dataIndex]
      if (s?.dataSource === 'fia') return 'diamond'
      return props.shiftColor ? SHIFT_SYMBOL(s?.shift) : 'circle'
    },
    markLine: {
      data: [
        { yAxis: limit.ucl, lineStyle: { color: '#c0392b', type: 'dashed' }, label: { formatter: 'UCL' } },
        { yAxis: limit.cl, lineStyle: { color: '#2f7d32' }, label: { formatter: 'CL' } },
        { yAxis: limit.lcl, lineStyle: { color: '#c0392b', type: 'dashed' }, label: { formatter: 'LCL' } },
      ],
    },
    markPoint:
      firstFiaIdx >= 0
        ? {
            symbol: 'pin',
            symbolSize: 48,
            label: { formatter: '首件基准', color: '#fff', fontSize: 10 },
            itemStyle: { color: FIA_COLOR },
            data: [{ coord: [data[firstFiaIdx].no, data[firstFiaIdx].xbar] }],
          }
        : undefined,
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
          ${s.outlierRule ? `<span style="color:#c0392b">命中规则: ${s.outlierRule}</span>` : '正常'}
          ${s.dataSource === 'fia' ? `<br/><span style="color:${FIA_COLOR}">🔗 首件联动(fia) · 点击回看首件报告</span>` : ''}`
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
