<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import echarts from '@/utils/echarts'
import { useAuthStore } from '@/stores/auth'
import { BANNERS } from '@/mock/roles'
import KpiCard from '@/components/common/KpiCard.vue'
import { internalAudits, ncFindings, healthDims, qsmKpi } from '@/mock/qsm'

const authStore = useAuthStore()
const banner = BANNERS.qsm?.[authStore.role] || {
  title: 'QSM · 体系管理总览',
  desc: '内审进度、不符合项与体系健康度一屏掌控',
}

const kpi = qsmKpi

const ncByLevel = computed(() => {
  const open = ncFindings.filter((n) => n.status !== '已关闭')
  return ['严重', '一般', '观察项'].map((lv) => ({ name: lv, value: open.filter((n) => n.level === lv).length }))
})

const auditProgress = computed(() =>
  internalAudits.map((a) => ({ name: a.planName, status: a.status, score: a.score })),
)

const radarRef = ref<HTMLDivElement>()
const pieRef = ref<HTMLDivElement>()
let radarInst: echarts.ECharts | null = null
let pieInst: echarts.ECharts | null = null

onMounted(() => {
  if (radarRef.value) {
    radarInst = echarts.init(radarRef.value)
    radarInst.setOption({
      tooltip: {},
      radar: {
        indicator: healthDims.map((d) => ({ name: d.name, max: 100 })),
        radius: '65%',
      },
      series: [{
        type: 'radar',
        data: [
          { value: healthDims.map((d) => d.value), name: '当前值', areaStyle: { opacity: 0.2 }, itemStyle: { color: '#1e4d8b' } },
          { value: healthDims.map((d) => d.threshold), name: '预警阈值', lineStyle: { type: 'dashed', color: '#c0392b' }, itemStyle: { color: '#c0392b' } },
        ],
      }],
      legend: { bottom: 0, data: ['当前值', '预警阈值'] },
    })
  }
  if (pieRef.value) {
    pieInst = echarts.init(pieRef.value)
    pieInst.setOption({
      tooltip: { trigger: 'item' },
      legend: { bottom: 0 },
      color: ['#c0392b', '#d4a017', '#8492a6'],
      series: [{
        type: 'pie', radius: ['40%', '70%'],
        itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
        label: { show: true, formatter: '{b}: {c}' },
        data: ncByLevel.value,
      }],
    })
  }
})
onBeforeUnmount(() => { radarInst?.dispose(); pieInst?.dispose() })

const stMap: Record<string, string> = { 计划中: 'y', 进行中: 'b', 已完成: 'g' }
function pillCls(s: string) { return stMap[s] || 'y' }
</script>

<template>
  <div class="qsm-dash">
    <div class="qms-banner">
      <div class="qms-banner__icon" :style="{ background: authStore.currentRole?.color }">📈</div>
      <div>
        <div class="qms-banner__title">{{ banner.title }}</div>
        <div class="qms-banner__desc">{{ banner.desc }}</div>
      </div>
    </div>

    <div class="kpi-row" style="grid-template-columns: repeat(6, 1fr)">
      <KpiCard label="体系健康度" :value="kpi.healthScore" unit="分" status="ok" />
      <KpiCard label="内审计划中" :value="kpi.auditPlan" unit="项" status="warn" />
      <KpiCard label="内审进行中" :value="kpi.auditDoing" unit="项" status="warn" />
      <KpiCard label="未关闭不符合" :value="kpi.ncOpen" unit="项" status="bad" />
      <KpiCard label="严重不符合" :value="kpi.ncSevere" unit="项" status="bad" />
      <KpiCard label="整改完成率" :value="kpi.rectifyRate" unit="%" :status="kpi.rectifyRate < 90 ? 'warn' : 'ok'" />
    </div>

    <div class="chart-grid chart-grid--2">
      <div class="qms-card">
        <div class="qms-card__header"><h3>体系健康度雷达</h3><span class="sr-tag">SR-QSM-013</span><span class="sr-tag">SR-QSM-014</span></div>
        <div class="qms-card__body"><div ref="radarRef" class="chart-container"></div></div>
      </div>
      <div class="qms-card">
        <div class="qms-card__header"><h3>未关闭不符合项分级</h3><span class="sr-tag">SR-QSM-009</span></div>
        <div class="qms-card__body"><div ref="pieRef" class="chart-container"></div></div>
      </div>
    </div>

    <div class="qms-card">
      <div class="qms-card__header"><h3>内审计划进度</h3><span class="sr-tag">SR-QSM-007</span></div>
      <div class="qms-card__body" style="padding: 0">
        <el-table :data="auditProgress" border size="small">
          <el-table-column prop="name" label="内审计划" min-width="220" />
          <el-table-column label="状态" width="100">
            <template #default="{ row }"><span class="qms-pill" :class="pillCls(row.status)">{{ row.status }}</span></template>
          </el-table-column>
          <el-table-column label="评分" width="100">
            <template #default="{ row }"><b v-if="row.score" :style="{ color: row.score >= 90 ? '#2f7d32' : '#d4a017' }">{{ row.score }}</b><span v-else class="meta">—</span></template>
          </el-table-column>
        </el-table>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.qsm-dash {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.meta { font-size: 11px; color: #8492a6; }
</style>
