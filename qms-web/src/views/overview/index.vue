<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useCompanyStore } from '@/stores/company'
import { overviewApi } from '@/api'
import { BANNERS } from '@/mock/roles'
import { COMPANY_KPI } from '@/mock/company'
import KpiCard from '@/components/common/KpiCard.vue'
import TodoList from '@/components/common/TodoList.vue'
import TrendChart from '@/components/charts/TrendChart.vue'
import echarts from '@/utils/echarts'
import type { KpiData } from '@/types/common'

const authStore = useAuthStore()
const companyStore = useCompanyStore()

const kpiData = ref<KpiData[]>([])
const trendData = ref({ days: [] as string[], passRate: [] as number[], defectRate: [] as number[] })
const todos = ref<{ id: string; title: string; module: string; priority: 'high' | 'medium' | 'low'; time: string }[]>([])
const alerts = ref<{ id: string; type: string; msg: string; time: string; level: string }[]>([])

const ctxLabel = computed(() => companyStore.contextLabel())
const isGroup = computed(() => companyStore.isGroup)

/** 当前视图所用 KPI（单公司按所选、集团视图取所有公司聚合） */
const kpiForView = computed(() => {
  if (companyStore.isGroup) {
    const list = Object.values(COMPANY_KPI)
    const n = list.length
    const sum = (key: keyof typeof list[number]) =>
      +(list.reduce((acc, c) => acc + (c[key] as number), 0) as number)
    const months = COMPANY_KPI.MZ.monthlyTrend.length
    return {
      passRate: +(sum('passRate') / n).toFixed(2),
      defectRate: +(sum('defectRate') / n).toFixed(2),
      openNc: sum('openNc'),
      spcAlarm: sum('spcAlarm'),
      supplierAbn: sum('supplierAbn'),
      auditPass: +(sum('auditPass') / n).toFixed(2),
      monthlyTrend: Array.from({ length: months }, (_, i) =>
        +(list.reduce((acc, c) => acc + c.monthlyTrend[i], 0) / n).toFixed(2),
      ),
    }
  }
  return companyStore.kpi() || COMPANY_KPI.MZ
})

function buildKpi() {
  const k = kpiForView.value
  kpiData.value = [
    { label: '一次交检合格率', value: k.passRate, unit: '%', status: k.passRate >= 98 ? 'ok' : 'warn', sub: '目标 ≥98%' },
    { label: '不良率', value: k.defectRate, unit: '%', status: k.defectRate <= 2 ? 'ok' : 'warn', sub: '越低越好' },
    { label: '在制不良', value: k.openNc, unit: '项', status: k.openNc <= 15 ? 'ok' : 'bad', sub: '需跟进' },
    { label: 'SPC 告警', value: k.spcAlarm, unit: '项', status: k.spcAlarm <= 4 ? 'ok' : 'warn', sub: '过程监控' },
    { label: '来料异常', value: k.supplierAbn, unit: '项', status: k.supplierAbn <= 6 ? 'ok' : 'warn', sub: '供应商' },
    { label: '审核通过率', value: k.auditPass, unit: '%', status: k.auditPass >= 92 ? 'ok' : 'warn', sub: '体系' },
  ]
  const months = ['1月', '2月', '3月', '4月', '5月', '6月']
  trendData.value = {
    days: months,
    passRate: k.monthlyTrend,
    defectRate: k.monthlyTrend.map((v) => +(100 - v).toFixed(2)),
  }
}

const bannerInfo = computed(() => {
  return BANNERS.overview?.[authStore.role] ?? { title: '工作台', desc: '欢迎使用质量管理系统' }
})

// 切换公司时同步刷新（RouterView key 也会重挂载，此处作为冗余保险）
watch(() => companyStore.currentCompanyId, () => buildKpi())

const alertLevelMap: Record<string, string> = {
  alarm: '#c0392b', warn: '#d4a017', info: '#1e4d8b',
}

onMounted(async () => {
  buildKpi()
  todos.value = await overviewApi.getTodos()
  alerts.value = await overviewApi.getAlerts()
})

// 趋势图
function trendSeries() {
  return [
    { name: '首件合格率', data: trendData.value.passRate, color: '#2f7d32' },
    { name: '不良率', data: trendData.value.defectRate, color: '#c0392b' },
  ]
}

function moduleColor(module: string) {
  const map: Record<string, string> = { fia: '#1e4d8b', spc: '#16a085', ncm: '#c0392b', sqm: '#d4a017' }
  return map[module] ?? '#1e4d8b'
}
</script>

<template>
  <div class="overview-page">
    <!-- 角色横幅 -->
    <div class="banner">
      <div class="banner-icon" :style="{ background: authStore.currentRole?.color }">
        {{ authStore.currentRole?.icon }}
      </div>
      <div>
        <h2>{{ bannerInfo.title }}</h2>
        <p>{{ bannerInfo.desc }}</p>
        <p class="ctx-line">
          <span
            class="ctx-pill"
            :style="{ background: isGroup ? '#7a5bb0' : companyStore.currentCompany?.color }"
          >{{ ctxLabel }}</span>
          当前数据按所选公司隔离（{{ isGroup ? '集团聚合视图' : '单公司视图' }}）
        </p>
      </div>
    </div>

    <!-- KPI 卡片行 -->
    <div class="kpi-row">
      <KpiCard
        v-for="k in kpiData"
        :key="k.label"
        :label="k.label"
        :value="k.value"
        :unit="k.unit"
        :sub="k.sub"
        :status="k.status"
      />
    </div>

    <!-- 趋势图 + 待办 -->
    <div class="chart-grid chart-grid--2-1">
      <div class="qms-card">
        <div class="card-h">
          <h3>近6月质量趋势</h3>
          <span class="tag g">合格率</span>
          <span class="tag r">不良率</span>
        </div>
        <div class="card-b">
          <TrendChart
            :x-data="trendData.days"
            :series="trendSeries()"
            :height="280"
          />
        </div>
      </div>
      <TodoList :items="todos" @click="() => {}" />
    </div>

    <!-- 实时告警 -->
    <div class="qms-card">
      <div class="card-h">
        <h3>实时告警</h3>
        <span class="tag r">{{ alerts.length }}</span>
      </div>
      <div class="card-b">
        <div v-for="a in alerts" :key="a.id" class="alert-row">
          <span class="dot" :style="{ background: alertLevelMap[a.level] ?? '#1e4d8b' }"></span>
          <span class="msg">{{ a.msg }}</span>
          <span class="time">{{ a.time }}</span>
          <span class="module" :style="{ color: moduleColor(a.type) }">{{ a.type.toUpperCase() }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.overview-page { animation: fade 0.18s ease; }

.banner {
  background: linear-gradient(90deg, #eef4fb, #fff);
  border: 1px solid #e1e8f0;
  border-left: 4px solid #1e4d8b;
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 14px;

  .banner-icon {
    width: 42px; height: 42px;
    border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    color: #fff; font-size: 20px; flex-shrink: 0;
  }
  h2 { font-size: 15px; color: #1e4d8b; }
  p { font-size: 12.5px; color: #5a6b7e; margin-top: 2px; }
  .ctx-line {
    font-size: 12px;
    color: #5a6b7e;
    margin-top: 6px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .ctx-pill {
    display: inline-block;
    padding: 2px 10px;
    border-radius: 10px;
    color: #fff;
    font-weight: 600;
    font-size: 11px;
  }
}

.card-h {
  padding: 10px 14px; border-bottom: 1px solid #e1e8f0;
  display: flex; align-items: center; gap: 8px; background: #fafcff;
  h3 { font-size: 13.5px; color: #1f2d3d; }
  .tag {
    font-size: 10.5px; padding: 2px 8px; border-radius: 10px;
    &.g { background: #e8f5e9; color: #2f7d32; }
    &.r { background: #fdecea; color: #c0392b; }
  }
}
.card-b { padding: 10px; }

.alert-row {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 14px; border-bottom: 1px solid #eef4fb; font-size: 12.5px;
  &:last-child { border-bottom: none; }

  .dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
  .msg { flex: 1; color: #1f2d3d; }
  .time { font-size: 11px; color: #8a9bb0; }
  .module { font-size: 10px; font-weight: 600; }
}
</style>
