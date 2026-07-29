<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import echarts from '@/utils/echarts'
import { useChartResize } from '@/composables/useChartResize'
useChartResize(() => [radarInst, pieInst])
import { useAuthStore } from '@/stores/auth'
import { BANNERS } from '@/config/banners'
import KpiCard from '@/components/common/KpiCard.vue'
import { qsmApi } from '@/api'
import type { InternalAudit, NcFinding, HealthDim, QsmKpi } from '@/types/qsm'

const authStore = useAuthStore()
const banner = BANNERS.qsm?.[authStore.role] || {
  title: 'QSM · 体系管理总览',
  desc: '内审进度、不符合项与体系健康度一屏掌控',
}

const kpi = ref<QsmKpi>({
  auditPlan: 0,
  auditDoing: 0,
  ncOpen: 0,
  ncSevere: 0,
  healthScore: 0,
  rectifyRate: 0,
})
const audits = ref<InternalAudit[]>([])
const findings = ref<NcFinding[]>([])
const healthDims = ref<HealthDim[]>([])

const ncByLevel = computed(() => {
  const open = findings.value.filter((n) => n.status !== '已关闭')
  return ['严重', '一般', '观察项'].map((lv) => ({ name: lv, value: open.filter((n) => n.level === lv).length }))
})

const auditProgress = computed(() =>
  audits.value.map((a) => ({ name: a.planName, status: a.status, score: a.score })),
)

const radarRef = ref<HTMLDivElement>()
const pieRef = ref<HTMLDivElement>()
let radarInst: echarts.ECharts | null = null
let pieInst: echarts.ECharts | null = null

async function loadAll() {
  const [k, a, f, d] = await Promise.all([
    qsmApi.getKpi(),
    qsmApi.getAudits(),
    qsmApi.getNcFindings(),
    qsmApi.getHealthDims(),
  ])
  kpi.value = k
  audits.value = a
  findings.value = f
  healthDims.value = d
  // 数据到达后刷新图表
  if (radarInst) {
    radarInst.setOption({
      radar: { indicator: healthDims.value.map((dim) => ({ name: dim.name, max: 100 })) },
      series: [{
        type: 'radar',
        data: [
          { value: healthDims.value.map((dim) => dim.value), name: '当前值', areaStyle: { opacity: 0.2 }, itemStyle: { color: '#1e4d8b' } },
          { value: healthDims.value.map((dim) => dim.threshold), name: '预警阈值', lineStyle: { type: 'dashed', color: '#c0392b' }, itemStyle: { color: '#c0392b' } },
        ],
      }],
    })
  }
  if (pieInst) {
    pieInst.setOption({ series: [{ data: ncByLevel.value }] })
  }
}

onMounted(async () => {
  await loadAll()
  if (radarRef.value) {
    radarInst = echarts.init(radarRef.value)
    radarInst.setOption({
      tooltip: {},
      radar: {
        indicator: healthDims.value.map((d) => ({ name: d.name, max: 100 })),
        radius: '65%',
      },
      series: [{
        type: 'radar',
        data: [
          { value: healthDims.value.map((d) => d.value), name: '当前值', areaStyle: { opacity: 0.2 }, itemStyle: { color: '#1e4d8b' } },
          { value: healthDims.value.map((d) => d.threshold), name: '预警阈值', lineStyle: { type: 'dashed', color: '#c0392b' }, itemStyle: { color: '#c0392b' } },
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
    <el-alert type="warning" show-icon :closable="false" title="此模块后端尚未实现，当前为演示数据（@backend-pending）" style="margin-bottom:12px" />
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
        <div class="qms-card__header"><h3>体系健康度雷达</h3></div>
        <div class="qms-card__body"><div ref="radarRef" class="chart-container"></div></div>
      </div>
      <div class="qms-card">
        <div class="qms-card__header"><h3>未关闭不符合项分级</h3></div>
        <div class="qms-card__body"><div ref="pieRef" class="chart-container"></div></div>
      </div>
    </div>

    <div class="qms-card">
      <div class="qms-card__header"><h3>内审计划进度</h3></div>
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
