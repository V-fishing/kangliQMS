<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useCompanyStore } from '@/stores/company'
import { BANNERS } from '@/mock/roles'
import { COMPANY_KPI } from '@/mock/company'
import KpiCard from '@/components/common/KpiCard.vue'
import TrendChart from '@/components/charts/TrendChart.vue'
import echarts from '@/utils/echarts'

const authStore = useAuthStore()
const companyStore = useCompanyStore()
const banner = BANNERS.fia?.[authStore.role] || { title: '首件检验看板', desc: '首件检验任务、合格率、锁定工单、超时任务一览' }

const kpi = computed(() => {
  const k = companyStore.kpi() || COMPANY_KPI.MZ
  return { pending: 8, passRate: k.passRate, locked: 3, overdue: 2 }
})
const taskStatus = ref([
  { name: '待检', value: 8, color: '#d4a017' },
  { name: '进行中', value: 5, color: '#1e4d8b' },
  { name: '已完成', value: 42, color: '#2f7d32' },
  { name: '超时', value: 3, color: '#c0392b' },
])
const pass7d = ref({ days: ['07-08', '07-09', '07-10', '07-11', '07-12', '07-13', '07-14'], vals: [97.2, 98.0, 96.5, 99.1, 98.3, 97.8, 98.2], target: 98 })
const triggers = ref([
  { name: '换模具', value: 18 },
  { name: '换批次', value: 12 },
  { name: '材料变更', value: 9 },
  { name: '换设备', value: 6 },
  { name: '系统升级', value: 4 },
])
const lines = ref([
  { line: '产线A-注塑', rate: 98.5 },
  { line: '产线B-组装', rate: 95.2 },
  { line: '产线C-焊接', rate: 92.8 },
  { line: '产线D-包装', rate: 99.1 },
  { line: '产线E-检测', rate: 90.4 },
])
const lockRate = ref(6.0)

// ECharts refs
const donutRef = ref<HTMLDivElement>()
const pieRef = ref<HTMLDivElement>()
const hbarRef = ref<HTMLDivElement>()
const gaugeRef = ref<HTMLDivElement>()
let donutInst: echarts.ECharts | null = null
let pieInst: echarts.ECharts | null = null
let hbarInst: echarts.ECharts | null = null
let gaugeInst: echarts.ECharts | null = null

function buildDonutOption() {
  return {
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { bottom: 0, icon: 'circle', textStyle: { fontSize: 11 } },
    series: [{
      type: 'pie', radius: ['45%', '70%'], center: ['50%', '45%'],
      avoidLabelOverlap: false,
      label: { show: true, formatter: '{c}', fontSize: 12, fontWeight: 600 },
      data: taskStatus.value.map(s => ({ name: s.name, value: s.value, itemStyle: { color: s.color } })),
    }],
  }
}
function buildPieOption() {
  const colors = ['#1e4d8b', '#2f7d32', '#d4a017', '#8e44ad', '#c0392b']
  return {
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { bottom: 0, icon: 'circle', textStyle: { fontSize: 11 } },
    series: [{
      type: 'pie', radius: '60%', center: ['50%', '45%'],
      label: { formatter: '{b}\n{d}%', fontSize: 11 },
      data: triggers.value.map((t, i) => ({ name: t.name, value: t.value, itemStyle: { color: colors[i % colors.length] } })),
    }],
  }
}
function buildHbarOption() {
  const data = lines.value
  return {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: '{b}: {c}%' },
    grid: { left: 80, right: 40, top: 16, bottom: 24 },
    xAxis: { type: 'value', max: 100, axisLabel: { formatter: '{value}%', fontSize: 10 } },
    yAxis: { type: 'category', data: data.map(d => d.line), axisLabel: { fontSize: 11 } },
    series: [{
      type: 'bar', barWidth: 16,
      data: data.map(d => ({
        value: d.rate,
        itemStyle: { color: d.rate >= 98 ? '#2f7d32' : d.rate >= 95 ? '#d4a017' : '#c0392b' },
      })),
      label: { show: true, position: 'right', formatter: '{c}%', fontSize: 11 },
    }],
  }
}
function buildGaugeOption() {
  return {
    series: [{
      type: 'gauge', radius: '90%', center: ['50%', '55%'],
      min: 0, max: 100,
      axisLine: { lineStyle: { width: 16, color: [[0.05, '#2f7d32'], [0.15, '#d4a017'], [1, '#c0392b']] } },
      pointer: { width: 5, length: '65%' },
      detail: { formatter: '{value}%', fontSize: 20, offsetCenter: [0, '70%'], color: '#1f2d3d' },
      data: [{ value: lockRate.value }],
      axisTick: { distance: -16, length: 6 },
      splitLine: { distance: -16, length: 12 },
      axisLabel: { distance: -28, fontSize: 9 },
    }],
  }
}

function initCharts() {
  if (donutRef.value) { donutInst = echarts.init(donutRef.value); donutInst.setOption(buildDonutOption()) }
  if (pieRef.value) { pieInst = echarts.init(pieRef.value); pieInst.setOption(buildPieOption()) }
  if (hbarRef.value) { hbarInst = echarts.init(hbarRef.value); hbarInst.setOption(buildHbarOption()) }
  if (gaugeRef.value) { gaugeInst = echarts.init(gaugeRef.value); gaugeInst.setOption(buildGaugeOption()) }
}
function resizeCharts() {
  donutInst?.resize()
  pieInst?.resize()
  hbarInst?.resize()
  gaugeInst?.resize()
}

onMounted(() => {
  initCharts()
  window.addEventListener('resize', resizeCharts)
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeCharts)
  donutInst?.dispose()
  pieInst?.dispose()
  hbarInst?.dispose()
  gaugeInst?.dispose()
})
watch([taskStatus, triggers, lines, lockRate], () => {
  donutInst?.setOption(buildDonutOption())
  pieInst?.setOption(buildPieOption())
  hbarInst?.setOption(buildHbarOption())
  gaugeInst?.setOption(buildGaugeOption())
}, { deep: true })
</script>

<template>
  <div class="fia-dash">
    <!-- 角色横幅 -->
    <div class="qms-banner">
      <div class="qms-banner__icon" :style="{ background: authStore.currentRole?.color }">
        {{ authStore.currentRole?.icon || '🔬' }}
      </div>
      <div>
        <div class="qms-banner__title">{{ banner.title }}</div>
        <div class="qms-banner__desc">{{ banner.desc }} · 当前公司：{{ companyStore.contextLabel() }}</div>
      </div>
    </div>

    <!-- KPI 行 -->
    <div class="kpi-row">
      <KpiCard label="待检任务" :value="kpi.pending" unit="项" status="warn" sub="含 1 急件" />
      <KpiCard label="一次合格率" :value="kpi.passRate" unit="%" status="ok" sub="目标 98%" />
      <KpiCard label="锁定工单" :value="kpi.locked" unit="个" status="bad" sub="首件未通过" />
      <KpiCard label="超时任务" :value="kpi.overdue" unit="项" status="bad" sub="SLA 2h" />
    </div>

    <!-- 第一行图表：3列 -->
    <div class="chart-grid chart-grid--3">
      <div class="qms-card">
        <div class="qms-card__header"><h3>F1 任务状态分布</h3></div>
        <div class="qms-card__body">
          <div ref="donutRef" class="chart-box"></div>
        </div>
      </div>
      <div class="qms-card">
        <div class="qms-card__header">
          <h3>F2 首件合格率趋势</h3>
          <span class="qms-pill g">98.2%</span>
        </div>
        <div class="qms-card__body">
          <TrendChart
            :x-data="pass7d.days"
            :series="[{ name: '合格率', data: pass7d.vals, color: '#2f7d32' }]"
            :target="pass7d.target"
            title="合格率"
            unit="%"
            :height="240"
          />
        </div>
      </div>
      <div class="qms-card">
        <div class="qms-card__header"><h3>F3 触发事件分布</h3></div>
        <div class="qms-card__body">
          <div ref="pieRef" class="chart-box"></div>
        </div>
      </div>
    </div>

    <!-- 第二行图表：2列 -->
    <div class="chart-grid chart-grid--2">
      <div class="qms-card">
        <div class="qms-card__header"><h3>F4 各产线首件完成率</h3></div>
        <div class="qms-card__body">
          <div ref="hbarRef" class="chart-box"></div>
        </div>
      </div>
      <div class="qms-card">
        <div class="qms-card__header">
          <h3>F5 工单锁定占比</h3>
          <span class="qms-pill r">{{ lockRate }}%</span>
        </div>
        <div class="qms-card__body">
          <div ref="gaugeRef" class="chart-box"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.fia-dash {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.qms-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: linear-gradient(90deg, #eef4fb 0%, #f7fbff 100%);
  border-radius: 8px;
  border-left: 4px solid #1e4d8b;

  .qms-banner__icon {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 22px;
    color: #fff;
    flex-shrink: 0;
  }
  .qms-banner__title {
    font-size: 15px;
    font-weight: 700;
    color: #1f2d3d;
  }
  .qms-banner__desc {
    font-size: 12px;
    color: #5a6b7e;
    margin-top: 2px;
  }
}
.kpi-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
}
.chart-grid {
  display: grid;
  gap: 14px;
  &--2 { grid-template-columns: repeat(2, 1fr); }
  &--3 { grid-template-columns: repeat(3, 1fr); }
}
.qms-card {
  background: #fff;
  border: 1px solid #e1e8f0;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(16, 42, 71, 0.06);
  overflow: hidden;

  .qms-card__header {
    padding: 10px 14px;
    border-bottom: 1px solid #e1e8f0;
    display: flex;
    align-items: center;
    gap: 8px;
    background: #fafcff;
    h3 { font-size: 13.5px; color: #1f2d3d; margin: 0; }
  }
  .qms-card__body { padding: 12px; }
}
.qms-pill {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 10.5px;
  font-weight: 600;
  &.g { background: #e8f5e9; color: #2f7d32; }
  &.y { background: #fff7e0; color: #d4a017; }
  &.r { background: #fdecea; color: #c0392b; }
  &.b { background: #eef4fb; color: #1e4d8b; }
  &.gray { background: #eef1f5; color: #5a6b7e; }
}
.chart-box {
  width: 100%;
  height: 260px;
}
</style>
