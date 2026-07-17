<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useCompanyStore } from '@/stores/company'
import { COMPANIES, COMPANY_KPI, KPI_METRICS, buildCompareRows } from '@/mock/company'
import type { CompanyId } from '@/types/company'
import echarts from '@/utils/echarts'

const companyStore = useCompanyStore()
const isGroupAdmin = computed(() => companyStore.isGroupAdmin)

const companyIds = COMPANIES.map((c) => c.id) as CompanyId[]
const companyMap = Object.fromEntries(COMPANIES.map((c) => [c.id, c]))

/** 核心指标对比行（所有分公司） */
const kpiRows = buildCompareRows(companyIds)
const months = COMPANY_KPI.MZ.monthlyTrend.map((_, i) => `${i + 1}月`)

const trendRef = ref<HTMLDivElement>()
let trendInst: echarts.ECharts | null = null
const pieRefs: (HTMLElement | null)[] = []
let pieInsts: echarts.ECharts[] = []

function trendOption() {
  return {
    tooltip: { trigger: 'axis' },
    legend: {
      data: COMPANIES.map((c) => c.shortName),
      bottom: 0,
      textStyle: { fontSize: 11 },
    },
    grid: { left: 44, right: 18, top: 20, bottom: 36 },
    xAxis: { type: 'category', data: months, axisLabel: { fontSize: 11 } },
    yAxis: { type: 'value', name: '合格率%', min: 90, max: 100, axisLabel: { fontSize: 10 } },
    series: COMPANIES.map((c) => ({
      name: c.shortName,
      type: 'line',
      data: COMPANY_KPI[c.id].monthlyTrend,
      smooth: true,
      symbol: 'circle',
      symbolSize: 6,
      itemStyle: { color: c.color },
      lineStyle: { width: 2.5 },
      areaStyle: { color: c.color + '1f' },
    })),
  }
}

function defectOption(companyId: CompanyId) {
  const data = COMPANY_KPI[companyId].topDefects
  return {
    tooltip: { trigger: 'item' },
    legend: { bottom: 0, icon: 'circle', textStyle: { fontSize: 11 }, type: 'scroll' },
    series: [
      {
        type: 'pie',
        roseType: 'radius',
        radius: ['25%', '68%'],
        center: ['50%', '46%'],
        itemStyle: { borderColor: '#fff', borderWidth: 2 },
        label: { fontSize: 11 },
        data,
      },
    ],
  }
}

function resize() {
  trendInst?.resize()
  pieInsts.forEach((p) => p.resize())
}

onMounted(() => {
  if (trendRef.value) {
    trendInst = echarts.init(trendRef.value)
    trendInst.setOption(trendOption())
  }
  pieInsts = pieRefs.map((el, i) => {
    if (!el) return null as unknown as echarts.ECharts
    const inst = echarts.init(el)
    inst.setOption(defectOption(companyIds[i]))
    return inst
  })
  window.addEventListener('resize', resize)
})
onBeforeUnmount(() => {
  trendInst?.dispose()
  pieInsts.forEach((p) => p?.dispose())
  window.removeEventListener('resize', resize)
})
</script>

<template>
  <div class="group-page">
    <div class="banner">
      <div class="banner-icon">🌐</div>
      <div>
        <h2>集团总览（只读聚合）</h2>
        <p>聚合 {{ COMPANIES.length }} 家分公司的核心质量指标，仅集团/跨公司管理员可访问</p>
      </div>
      <span v-if="!isGroupAdmin" class="noauth">当前账号无集团权限</span>
    </div>

    <!-- 核心指标对比（所有分公司） -->
    <div class="qms-card">
      <div class="qms-card__header">
        <h3>核心指标对比</h3>
        <span class="tag">领先方高亮（按各公司主题色）</span>
      </div>
      <div class="qms-card__body">
        <table class="cmp">
          <thead>
            <tr>
              <th>指标</th>
              <th v-for="c in COMPANIES" :key="c.id" :style="{ color: c.color }">{{ c.shortName }}</th>
              <th>领先方</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in kpiRows" :key="r.key">
              <td class="lbl">{{ r.label }}</td>
              <td
                v-for="c in COMPANIES"
                :key="c.id"
                :class="{ lead: r.leaderId === c.id }"
              >
                {{ r.values.find((v) => v.id === c.id)?.value }}{{ r.unit }}
              </td>
              <td class="winner" :style="{ color: companyMap[r.leaderId].color }">
                {{ companyMap[r.leaderId].shortName }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 趋势 + 不良 TOP -->
    <div class="chart-grid chart-grid--2">
      <div class="qms-card">
        <div class="qms-card__header"><h3>近 6 月合格率趋势对比</h3></div>
        <div class="qms-card__body"><div ref="trendRef" class="chart"></div></div>
      </div>
      <div class="qms-card">
        <div class="qms-card__header"><h3>各分公司不良 TOP</h3></div>
        <div class="qms-card__body">
          <div class="grid-n">
            <div v-for="(c, i) in COMPANIES" :key="c.id" class="pie-cell">
              <div class="sub-t" :style="{ color: c.color }">{{ c.shortName }}</div>
              <div :ref="(el) => (pieRefs[i] = el as HTMLElement | null)" class="chart sm"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.group-page {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.banner {
  background: linear-gradient(90deg, #efeafe, #fff);
  border: 1px solid #e1d8f5;
  border-left: 4px solid #7a5bb0;
  border-radius: 8px;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 14px;

  .banner-icon {
    width: 42px; height: 42px;
    border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    background: #7a5bb0; color: #fff; font-size: 20px; flex-shrink: 0;
  }
  h2 { font-size: 15px; color: #7a5bb0; margin: 0; }
  p { font-size: 12.5px; color: #5a6b7e; margin: 2px 0 0; }
  .noauth {
    margin-left: auto;
    font-size: 11px;
    background: #fdecea;
    color: #c0392b;
    padding: 4px 10px;
    border-radius: 10px;
  }
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
    .tag {
      font-size: 10.5px; padding: 2px 8px; border-radius: 10px;
      background: #eef4fb; color: #1e4d8b;
    }
  }
  .qms-card__body { padding: 12px; }
}

.cmp {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  th, td { padding: 10px 14px; text-align: left; border-bottom: 1px solid #eef4fb; }
  th { color: #5a6b7e; font-weight: 600; background: #f7fafd; }
  .lbl { font-weight: 600; color: #1f2d3d; }
  .winner { font-weight: 700; }
  td.lead {
    font-weight: 700;
    background: #eef4fb;
  }
}

.chart { width: 100%; height: 280px; }
.chart.sm { height: 240px; }

.grid-n {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 10px;
  .pie-cell { text-align: center; }
  .sub-t { font-size: 13px; font-weight: 700; margin-bottom: 4px; }
}

.chart-grid {
  display: grid;
  gap: 14px;
  &--2 { grid-template-columns: repeat(2, 1fr); }
}
</style>
