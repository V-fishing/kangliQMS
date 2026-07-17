<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import { BANNERS } from '@/mock/roles'
import FlowChart from '@/components/charts/FlowChart.vue'
import { FLOWS } from '@/mock/flows'

const authStore = useAuthStore()
const banner = BANNERS.ncm?.[authStore.role] || {
  title: '不良管理 · 流转过程',
  desc: '不良信息管理流程可视化',
}
const flow = FLOWS.ncm
</script>

<template>
  <div class="mod-flow">
    <div class="qms-banner">
      <div class="qms-banner__icon" :style="{ background: authStore.currentRole?.color }">🔄</div>
      <div>
        <div class="qms-banner__title">{{ banner.title }}</div>
        <div class="qms-banner__desc">{{ banner.desc }}</div>
      </div>
    </div>

    <div class="qms-card">
      <div class="qms-card__header">
        <h3>{{ flow.title }}</h3>
        <span class="tag">可拖拽/缩放 · 点击节点查看原子需求</span>
      </div>
      <div class="qms-card__body">
        <FlowChart :nodes="flow.nodes" :edges="flow.edges" :height="flow.height" />
      </div>
    </div>

    <div class="qms-card">
      <div class="qms-card__header"><h3>流程说明</h3></div>
      <div class="qms-card__body" style="font-size: 12.5px; line-height: 1.9; color: #2f3a47">
        <p>流程按《流程图手册》§4（不良信息管理）。不良事件录入后绑定工序 / 设备 / 操作员并匹配字典分类定级，自动统计数量 / 不良率 / PPM。趋势异常（连续 5 天上升或超均值 +2σ）标红预警后，可一键发起 8D(SR-PTL-010) 或 CAPA(SR-PTL-019)；环比 / 同比按工作日归一化。</p>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.mod-flow { display: flex; flex-direction: column; gap: 14px; }
</style>
