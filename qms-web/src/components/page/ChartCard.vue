<!--
  图表卡片 — 替代手工 ECharts 生命周期管理
  用法: <ChartCard title="Pareto 分析" :option="paretoOption" height="320" />
        只需传入 ECharts option，init/dispose/resize 全部内部处理
-->
<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount, shallowRef } from 'vue'
import echarts from '@/utils/echarts'

const props = withDefaults(defineProps<{
  title?: string; subtitle?: string; option: any; height?: number|string
  loading?: boolean; empty?: boolean
}>(), { height: 260 })

const el = ref<HTMLDivElement>()
const chart = shallowRef<echarts.ECharts>()

function init() {
  if (!el.value) return
  chart.value?.dispose()
  chart.value = echarts.init(el.value)
  if (props.option) chart.value.setOption(props.option)
}

function resize() { chart.value?.resize() }

watch(() => props.option, (opt) => { if (opt) chart.value?.setOption(opt, true) }, { deep: true })

onMounted(() => { init(); window.addEventListener('resize', resize) })
onBeforeUnmount(() => { window.removeEventListener('resize', resize); chart.value?.dispose() })
</script>

<template>
  <div class="chart-card">
    <div v-if="title" class="cc-header">
      <h4 class="cc-title">{{ title }}</h4>
      <span v-if="subtitle" class="cc-sub">{{ subtitle }}</span>
    </div>
    <div v-loading="loading" class="cc-body">
      <div v-if="empty" class="cc-empty">暂无数据</div>
      <div ref="el" :style="{ height: typeof height === 'number' ? height + 'px' : height }" />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.chart-card { background: #fff; border-radius: 8px; box-shadow: 0 1px 4px rgba(0,0,0,.04); overflow: hidden; }
.cc-header { display: flex; align-items: center; gap: 10px; padding: 12px 16px; border-bottom: 1px solid #eef1f5; }
.cc-title { margin: 0; font-size: 14px; font-weight: 600; color: #1f2d3d; }
.cc-sub { font-size: 11px; color: #8a9bb0; }
.cc-body { padding: 12px 8px 8px; position: relative; }
.cc-empty { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; color: #a0aec0; font-size: 13px; }
</style>
