<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import echarts from '@/utils/echarts'
import { useAuthStore } from '@/stores/auth'
import { BANNERS } from '@/mock/roles'
import KpiCard from '@/components/common/KpiCard.vue'
import { tools } from '@/mock/tlm'

const authStore = useAuthStore()
const banner = BANNERS.tlm?.[authStore.role] || {
  title: 'TLM · 工装管理总览',
  desc: '工装全生命周期、寿命预警与保养状态一屏掌控',
}

const kpi = computed(() => ({
  total: tools.length,
  inUse: tools.filter((t) => t.status === '使用中').length,
  repairing: tools.filter((t) => t.status === '维修中').length,
  scrapped: tools.filter((t) => t.status === '报废').length,
  locked: tools.filter((t) => t.lock === '锁定').length,
  nearLife: tools.filter((t) => t.status !== '报废' && t.lifeUsed / t.lifeLimit >= 0.9).length,
}))

const statusDist = computed(() => {
  const order = ['使用中', '维修中', '停用', '报废']
  return order.map((name) => ({ name, value: tools.filter((t) => t.status === name).length }))
})

// 寿命使用率 TOP
const lifeRank = computed(() =>
  [...tools]
    .filter((t) => t.status !== '报废')
    .map((t) => ({ name: t.name, rate: Number(((t.lifeUsed / t.lifeLimit) * 100).toFixed(1)) }))
    .sort((a, b) => b.rate - a.rate)
    .slice(0, 6),
)

const pieRef = ref<HTMLDivElement>()
const barRef = ref<HTMLDivElement>()
let pieInst: echarts.ECharts | null = null
let barInst: echarts.ECharts | null = null

onMounted(() => {
  if (pieRef.value) {
    pieInst = echarts.init(pieRef.value)
    pieInst.setOption({
      tooltip: { trigger: 'item' },
      legend: { bottom: 0 },
      color: ['#2f7d32', '#d4a017', '#8492a6', '#c0392b'],
      series: [{
        type: 'pie', radius: ['40%', '70%'],
        itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
        label: { show: true, formatter: '{b}: {c}' },
        data: statusDist.value,
      }],
    })
  }
  if (barRef.value) {
    barInst = echarts.init(barRef.value)
    barInst.setOption({
      tooltip: { trigger: 'axis', formatter: '{b}: {c}%' },
      grid: { left: 120, right: 30, top: 20, bottom: 20 },
      xAxis: { type: 'value', max: 100, axisLabel: { formatter: '{value}%' } },
      yAxis: { type: 'category', data: lifeRank.value.map((r) => r.name).reverse() },
      series: [{
        type: 'bar', data: lifeRank.value.map((r) => r.rate).reverse(), barWidth: '55%',
        itemStyle: {
          color: (p: any) => (p.value >= 90 ? '#c0392b' : p.value >= 70 ? '#d4a017' : '#1e4d8b'),
          borderRadius: [0, 4, 4, 0],
        },
        label: { show: true, position: 'right', formatter: '{c}%' },
      }],
    })
  }
})
onBeforeUnmount(() => { pieInst?.dispose(); barInst?.dispose() })
</script>

<template>
  <div class="tlm-dash">
    <div class="qms-banner">
      <div class="qms-banner__icon" :style="{ background: authStore.currentRole?.color }">🔧</div>
      <div>
        <div class="qms-banner__title">{{ banner.title }}</div>
        <div class="qms-banner__desc">{{ banner.desc }}</div>
      </div>
    </div>

    <div class="kpi-row" style="grid-template-columns: repeat(6, 1fr)">
      <KpiCard label="工装总数" :value="kpi.total" unit="套" />
      <KpiCard label="使用中" :value="kpi.inUse" unit="套" status="ok" />
      <KpiCard label="维修中" :value="kpi.repairing" unit="套" status="warn" />
      <KpiCard label="已报废" :value="kpi.scrapped" unit="套" />
      <KpiCard label="锁定(首件未过)" :value="kpi.locked" unit="套" status="bad" />
      <KpiCard label="寿命临界" :value="kpi.nearLife" unit="套" status="bad" />
    </div>

    <div class="chart-grid chart-grid--2">
      <div class="qms-card">
        <div class="qms-card__header"><h3>工装状态分布</h3><span class="sr-tag">SR-TLM-001</span></div>
        <div class="qms-card__body"><div ref="pieRef" class="chart-container"></div></div>
      </div>
      <div class="qms-card">
        <div class="qms-card__header"><h3>寿命使用率 TOP6</h3><span class="sr-tag">SR-TLM-012</span></div>
        <div class="qms-card__body"><div ref="barRef" class="chart-container"></div></div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.tlm-dash {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
</style>
