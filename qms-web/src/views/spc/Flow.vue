<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import { BANNERS } from '@/mock/roles'
import FlowChart from '@/components/charts/FlowChart.vue'
import { FLOWS } from '@/mock/flows'

const authStore = useAuthStore()
const banner = BANNERS.spc?.[authStore.role] || {
  title: 'SPC · 流转过程',
  desc: 'SPC 监控与报警流程可视化',
}
const flow = FLOWS.spc
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
        <p>流程按《流程图手册》§3（SPC 监控与报警）。关键参数（注塑压力 / 焊接温度 / 组装扭矩 / 密封性）采集后写入 SPC 数据表并更新控制图；子组数 ≥25 时自动计算控制限与 CPK/PPK。判异规则①②③⑤ 命中后按"预警(趋势)/报警(突破)"分级推送，30 分钟内同参数不重复通知，关闭须填原因。</p>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.mod-flow { display: flex; flex-direction: column; gap: 14px; }
</style>
