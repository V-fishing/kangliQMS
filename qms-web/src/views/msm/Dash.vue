<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import echarts from '@/utils/echarts'
import { useChartResize } from '@/composables/useChartResize'
useChartResize(() => [pieInst])
import { useAuthStore } from '@/stores/auth'
import { BANNERS } from '@/config/banners'
import KpiCard from '@/components/common/KpiCard.vue'
import { gauges, calibPlans } from '@/mock/msm'

const authStore = useAuthStore()
const banner = BANNERS.msm?.[authStore.role] || {
  title: 'MSM · 计量管理总览',
  desc: '计量器具状态分布、校准计划与使用控制一屏掌控',
}

const kpi = computed(() => ({
  total: gauges.length,
  qualified: gauges.filter((g) => g.status === '合格').length,
  expired: gauges.filter((g) => g.status === '超期').length,
  failed: gauges.filter((g) => g.status === '失准').length,
  locked: gauges.filter((g) => g.status === '锁定').length,
  calibDue: calibPlans.filter((c) => c.status === '待校准').length,
}))

const statusDist = computed(() => {
  const order = ['合格', '降级', '超期', '失准', '锁定', '维修中', '报废']
  return order
    .map((name) => ({ name, value: gauges.filter((g) => g.status === name).length }))
    .filter((x) => x.value > 0)
})

const useControl = computed(() => ({
  allow: gauges.filter((g) => g.useStatus === '允许使用').length,
  reject: gauges.filter((g) => g.useStatus === '拒绝绑定').length,
}))

const pieRef = ref<HTMLDivElement>()
let pieInst: echarts.ECharts | null = null

onMounted(() => {
  if (pieRef.value) {
    pieInst = echarts.init(pieRef.value)
    pieInst.setOption({
      tooltip: { trigger: 'item' },
      legend: { bottom: 0 },
      color: ['#2f7d32', '#d4a017', '#e67e22', '#c0392b', '#8e44ad', '#3498db', '#8492a6'],
      series: [{
        type: 'pie', radius: ['40%', '70%'],
        itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
        label: { show: true, formatter: '{b}: {c}' },
        data: statusDist.value,
      }],
    })
  }
})
onBeforeUnmount(() => { pieInst?.dispose() })
</script>

<template>
  <div class="msm-dash">
    <el-alert type="warning" show-icon :closable="false" title="此模块后端尚未实现，当前为演示数据（@backend-pending）" style="margin-bottom:12px" />
    <div class="qms-banner">
      <div class="qms-banner__icon" :style="{ background: authStore.currentRole?.color }">📐</div>
      <div>
        <div class="qms-banner__title">{{ banner.title }}</div>
        <div class="qms-banner__desc">{{ banner.desc }}</div>
      </div>
    </div>

    <div class="kpi-row" style="grid-template-columns: repeat(6, 1fr)">
      <KpiCard label="器具总数" :value="kpi.total" unit="台" />
      <KpiCard label="合格" :value="kpi.qualified" unit="台" status="ok" />
      <KpiCard label="超期" :value="kpi.expired" unit="台" status="bad" />
      <KpiCard label="失准" :value="kpi.failed" unit="台" status="bad" />
      <KpiCard label="锁定" :value="kpi.locked" unit="台" status="warn" />
      <KpiCard label="待校准" :value="kpi.calibDue" unit="台" status="warn" />
    </div>

    <div class="chart-grid chart-grid--2">
      <div class="qms-card">
        <div class="qms-card__header"><h3>器具状态分布</h3></div>
        <div class="qms-card__body"><div ref="pieRef" class="chart-container"></div></div>
      </div>
      <div class="qms-card">
        <div class="qms-card__header"><h3>使用控制（防错绑定）</h3></div>
        <div class="qms-card__body">
          <div class="use-ctrl">
            <div class="uc-item ok">
              <div class="uc-val">{{ useControl.allow }}</div>
              <div class="uc-lbl">允许使用</div>
              <div class="uc-desc">合格 / 降级(限用) 器具可绑定工序</div>
            </div>
            <div class="uc-item bad">
              <div class="uc-val">{{ useControl.reject }}</div>
              <div class="uc-lbl">拒绝绑定</div>
              <div class="uc-desc">超期 / 失准 / 锁定 / 报废 器具系统禁止使用</div>
            </div>
          </div>
          <p class="tip">系统在检验绑定环节自动校验器具状态，不合格器具无法录入检测数据（SR-MSM-008）。</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.msm-dash {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.use-ctrl {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  padding: 8px 0;
  .uc-item {
    border-radius: 10px;
    padding: 18px;
    text-align: center;
    border: 1px solid #e1e8f0;
    &.ok { background: #f0f9f0; border-color: #bfe3c0; }
    &.bad { background: #fdf0ef; border-color: #f3c6c1; }
    .uc-val { font-size: 34px; font-weight: 800; }
    &.ok .uc-val { color: #2f7d32; }
    &.bad .uc-val { color: #c0392b; }
    .uc-lbl { font-size: 14px; font-weight: 600; margin-top: 4px; }
    .uc-desc { font-size: 11px; color: #5a6b7e; margin-top: 6px; }
  }
}
.tip { font-size: 12px; color: #5a6b7e; margin-top: 12px; }
</style>
