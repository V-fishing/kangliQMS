<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import echarts from '@/utils/echarts'
import type { FlowNode, FlowEdge } from '@/mock/flows'

const props = defineProps<{
  nodes: FlowNode[]
  edges: FlowEdge[]
  height?: number
}>()

const elRef = ref<HTMLDivElement>()
let inst: echarts.ECharts | null = null

function flowColor(name: string) {
  if (/触发|开始/.test(name)) return '#16a085'
  if (/\?/.test(name)) return '#d4a017'
  if (/报警|拦截|未通过|不合格|超标|异常/.test(name)) return '#c0392b'
  if (/通过|解锁|继续|合格|归档|完成/.test(name)) return '#2f7d32'
  return '#1e4d8b'
}

function buildOption(): echarts.EChartsOption {
  const data = props.nodes.map((n) => ({
    id: n.id,
    name: n.id,
    value: n.name,
    x: n.x,
    y: n.y,
    symbol: 'roundRect',
    symbolSize: [Math.max(84, n.name.length * 8.4 + 16), 34],
    itemStyle: {
      color: flowColor(n.name),
      borderColor: '#fff',
      borderWidth: 1,
      shadowBlur: 3,
      shadowColor: 'rgba(0,0,0,.12)',
    },
    label: { show: true, formatter: n.name, fontSize: 10.5, color: '#fff', fontWeight: 600 },
  }))
  const links = props.edges.map((e) => ({
    source: e.source,
    target: e.target,
    label: e.label ? { show: true, formatter: e.label, fontSize: 9, color: '#5a6b7e' } : undefined,
    lineStyle: { color: '#9fb2c8', width: 1.6, curveness: 0.08 },
  }))
  return {
    tooltip: {
      formatter: (p: any) => p.data?.value || '',
    },
    series: [
      {
        type: 'graph',
        layout: 'none',
        roam: true,
        draggable: true,
        edgeSymbol: ['none', 'arrow'],
        edgeSymbolSize: 8,
        emphasis: { focus: 'adjacency', lineStyle: { width: 3, color: '#1e4d8b' } },
        labelLayout: { moveOverlap: 'shiftY' },
        data,
        links,
      },
    ],
  }
}

function render() {
  if (!elRef.value) return
  if (!inst) inst = echarts.init(elRef.value)
  inst.setOption(buildOption(), true)
}

function onResize() {
  inst?.resize()
}

onMounted(() => {
  render()
  window.addEventListener('resize', onResize)
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
  inst?.dispose()
  inst = null
})
watch(() => [props.nodes, props.edges], render, { deep: true })
</script>

<template>
  <div ref="elRef" class="flow-chart" :style="{ height: (height ?? 480) + 'px' }"></div>
</template>

<style scoped>
.flow-chart {
  width: 100%;
}
</style>
