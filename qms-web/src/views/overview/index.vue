<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useCompanyStore } from '@/stores/company'
import { overviewApi } from '@/api'
import type { OverviewTodo, OverviewAlert } from '@/api/modules/overview'
import { BANNERS } from '@/config/banners'
import KpiCard from '@/components/common/KpiCard.vue'
import TodoList from '@/components/common/TodoList.vue'
import TrendChart from '@/components/charts/TrendChart.vue'
import echarts from '@/utils/echarts'
import type { KpiData } from '@/types/common'

const authStore = useAuthStore()
const companyStore = useCompanyStore()

const kpiData = ref<KpiData[]>([])
const trendData = ref({ days: [] as string[], passRate: [] as number[], defectRate: [] as number[] })
const todos = ref<OverviewTodo[]>([])
const alerts = ref<OverviewAlert[]>([])

const ctxLabel = computed(() => companyStore.contextLabel())
const isGroup = computed(() => companyStore.isGroup)

const bannerInfo = computed(() => {
  return BANNERS.overview?.[authStore.role] ?? { title: '工作台', desc: '欢迎使用质量管理系统' }
})

// 切换公司时同步刷新（RouterView key 也会重挂载，此处作为冗余保险）
watch(() => companyStore.currentCompanyId, () => loadAll())

const alertLevelMap: Record<string, string> = {
  alarm: '#c0392b', warn: '#d4a017', info: '#1e4d8b',
}

async function loadAll() {
  const [kpi, trend, t, a] = await Promise.all([
    overviewApi.getKpi(),
    overviewApi.getTrend(),
    overviewApi.getTodos(),
    overviewApi.getAlerts(),
  ])
  kpiData.value = kpi
  trendData.value = trend
  todos.value = t
  alerts.value = a
}

onMounted(loadAll)

// 趋势图
function trendSeries() {
  return [
    { name: '合格率', data: trendData.value.passRate, color: '#2f7d32' },
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
          <h3>近7日质量趋势</h3>
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
