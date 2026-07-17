<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useCompanyStore } from '@/stores/company'
import {
  COMPANIES,
  COMPANY_KPI,
  KPI_METRICS,
  buildCompareRows,
  normalizeScore,
} from '@/mock/company'
import type { CompanyId } from '@/types/company'
import echarts from '@/utils/echarts'

const companyStore = useCompanyStore()
const isGroupAdmin = computed(() => companyStore.isGroupAdmin)

/** 用户自选的两家分公司 */
const selA = ref<CompanyId>('MZ')
const selB = ref<CompanyId>('SZ')
const companyMap = Object.fromEntries(COMPANIES.map((c) => [c.id, c]))

const sameCompany = computed(() => selA.value === selB.value)

/** 对比行（基于 A/B 两家） */
const rows = computed(() => buildCompareRows([selA.value, selB.value]))

function delta(row: (typeof rows.value)[number]): string {
  const a = row.values[0].value
  const b = row.values[1].value
  const d = +(a - b).toFixed(2)
  return (d > 0 ? '+' : '') + d
}

/** 领先方短名 */
function leaderName(row: (typeof rows.value)[number]): string {
  return companyMap[row.leaderId].shortName
}

function swap() {
  const t = selA.value
  selA.value = selB.value
  selB.value = t
}

const months = COMPANY_KPI.MZ.monthlyTrend.map((_, i) => `${i + 1}月`)

const trendRef = ref<HTMLDivElement>()
const radarRef = ref<HTMLDivElement>()
const pieARef = ref<HTMLDivElement>()
const pieBRef = ref<HTMLDivElement>()
let trendInst: echarts.ECharts | null = null
let radarInst: echarts.ECharts | null = null
let pieAInst: echarts.ECharts | null = null
let pieBInst: echarts.ECharts | null = null

function resize() {
  trendInst?.resize()
  radarInst?.resize()
  pieAInst?.resize()
  pieBInst?.resize()
}

function trendOption() {
  const a = companyMap[selA.value]
  const b = companyMap[selB.value]
  return {
    tooltip: { trigger: 'axis' },
    legend: { data: [a.shortName, b.shortName], bottom: 0, textStyle: { fontSize: 11 } },
    grid: { left: 44, right: 18, top: 20, bottom: 36 },
    xAxis: { type: 'category', data: months, axisLabel: { fontSize: 11 } },
    yAxis: { type: 'value', name: '合格率%', min: 90, max: 100, axisLabel: { fontSize: 10 } },
    series: [
      {
        name: a.shortName, type: 'line', data: COMPANY_KPI[selA.value].monthlyTrend,
        smooth: true, symbol: 'circle', symbolSize: 6,
        itemStyle: { color: a.color }, lineStyle: { width: 2.5 }, areaStyle: { color: a.color + '1f' },
      },
      {
        name: b.shortName, type: 'line', data: COMPANY_KPI[selB.value].monthlyTrend,
        smooth: true, symbol: 'circle', symbolSize: 6,
        itemStyle: { color: b.color }, lineStyle: { width: 2.5 }, areaStyle: { color: b.color + '1f' },
      },
    ],
  }
}

function radarOption() {
  const a = companyMap[selA.value]
  const b = companyMap[selB.value]
  const indicator = KPI_METRICS.map((m) => ({ name: m.label, max: 100 }))
  const seriesA = KPI_METRICS.map((m) =>
    normalizeScore(m.key, COMPANY_KPI[selA.value][m.key], m.better, m.refMax),
  )
  const seriesB = KPI_METRICS.map((m) =>
    normalizeScore(m.key, COMPANY_KPI[selB.value][m.key], m.better, m.refMax),
  )
  return {
    tooltip: {},
    legend: { data: [a.shortName, b.shortName], bottom: 0, textStyle: { fontSize: 11 } },
    radar: {
      indicator,
      radius: '62%',
      axisName: { fontSize: 10, color: '#5a6b7e' },
      splitArea: { areaStyle: { color: ['#fafcff', '#fff'] } },
    },
    series: [
      {
        type: 'radar',
        data: [
          { value: seriesA, name: a.shortName, itemStyle: { color: a.color }, areaStyle: { color: a.color + '33' } },
          { value: seriesB, name: b.shortName, itemStyle: { color: b.color }, areaStyle: { color: b.color + '33' } },
        ],
      },
    ],
  }
}

function defectOption(companyId: CompanyId) {
  return {
    tooltip: { trigger: 'item' },
    legend: { bottom: 0, icon: 'circle', textStyle: { fontSize: 11 }, type: 'scroll' },
    series: [
      {
        type: 'pie', roseType: 'radius', radius: ['25%', '68%'], center: ['50%', '46%'],
        itemStyle: { borderColor: '#fff', borderWidth: 2 }, label: { fontSize: 11 },
        data: COMPANY_KPI[companyId].topDefects,
      },
    ],
  }
}

/** 选择变化时刷新图表 */
function refreshCharts() {
  trendInst?.setOption(trendOption(), true)
  radarInst?.setOption(radarOption(), true)
  pieAInst?.setOption(defectOption(selA.value), true)
  pieBInst?.setOption(defectOption(selB.value), true)
}

onMounted(() => {
  if (trendRef.value) { trendInst = echarts.init(trendRef.value); trendInst.setOption(trendOption()) }
  if (radarRef.value) { radarInst = echarts.init(radarRef.value); radarInst.setOption(radarOption()) }
  if (pieARef.value) { pieAInst = echarts.init(pieARef.value); pieAInst.setOption(defectOption(selA.value)) }
  if (pieBRef.value) { pieBInst = echarts.init(pieBRef.value); pieBInst.setOption(defectOption(selB.value)) }
  window.addEventListener('resize', resize)
})
onBeforeUnmount(() => {
  trendInst?.dispose()
  radarInst?.dispose()
  pieAInst?.dispose()
  pieBInst?.dispose()
  window.removeEventListener('resize', resize)
})
</script>

<template>
  <div class="cmp-page">
    <div class="banner">
      <div class="banner-icon">⇄</div>
      <div>
        <h2>分公司 KPI 对比</h2>
        <p>任选两家分公司，对比核心质量 KPI、趋势与不良结构（数据驱动，可扩展至 N 家）</p>
      </div>
      <span v-if="!isGroupAdmin" class="noauth">当前账号无集团权限</span>
    </div>

    <!-- 选择器 -->
    <div class="selector qms-card">
      <div class="qms-card__body sel-body">
        <div class="sel">
          <label>分公司 A</label>
          <select v-model="selA" class="sel-box" :style="{ borderColor: companyMap[selA].color }" @change="refreshCharts">
            <option v-for="c in COMPANIES" :key="c.id" :value="c.id">{{ c.shortName }}（{{ c.region }}）</option>
          </select>
        </div>
        <button class="swap" title="交换 A / B" @click="swap(); refreshCharts()">⇄</button>
        <div class="sel">
          <label>分公司 B</label>
          <select v-model="selB" class="sel-box" :style="{ borderColor: companyMap[selB].color }" @change="refreshCharts">
            <option v-for="c in COMPANIES" :key="c.id" :value="c.id">{{ c.shortName }}（{{ c.region }}）</option>
          </select>
        </div>
        <span v-if="sameCompany" class="warn">请选择两家不同的分公司</span>
      </div>
    </div>

    <!-- 对比表 -->
    <div class="qms-card">
      <div class="qms-card__header">
        <h3>核心指标对比</h3>
        <span class="tag">领先方高亮（按各公司主题色）</span>
      </div>
      <div class="qms-card__body">
        <table class="cmp" v-if="!sameCompany">
          <thead>
            <tr>
              <th>指标</th>
              <th :style="{ color: companyMap[selA].color }">{{ companyMap[selA].shortName }}（A）</th>
              <th :style="{ color: companyMap[selB].color }">{{ companyMap[selB].shortName }}（B）</th>
              <th>差距 A−B</th>
              <th>领先方</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in rows" :key="r.key">
              <td class="lbl">{{ r.label }}</td>
              <td :class="{ lead: r.leaderId === selA }">{{ r.values[0].value }}{{ r.unit }}</td>
              <td :class="{ lead: r.leaderId === selB }">{{ r.values[1].value }}{{ r.unit }}</td>
              <td class="delta">{{ delta(r) }}{{ r.unit }}</td>
              <td class="winner" :style="{ color: companyMap[r.leaderId].color }">{{ leaderName(r) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 趋势 + 雷达 -->
    <div class="chart-grid chart-grid--2">
      <div class="qms-card">
        <div class="qms-card__header"><h3>近 6 月合格率趋势对比</h3></div>
        <div class="qms-card__body"><div ref="trendRef" class="chart"></div></div>
      </div>
      <div class="qms-card">
        <div class="qms-card__header"><h3>综合 KPI 雷达（归一化得分）</h3></div>
        <div class="qms-card__body"><div ref="radarRef" class="chart"></div></div>
      </div>
    </div>

    <!-- 不良 TOP -->
    <div class="qms-card">
      <div class="qms-card__header"><h3>不良 TOP 结构对比</h3></div>
      <div class="qms-card__body">
        <div class="grid2">
          <div>
            <div class="sub-t" :style="{ color: companyMap[selA].color }">{{ companyMap[selA].shortName }}</div>
            <div ref="pieARef" class="chart sm"></div>
          </div>
          <div>
            <div class="sub-t" :style="{ color: companyMap[selB].color }">{{ companyMap[selB].shortName }}</div>
            <div ref="pieBRef" class="chart sm"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.cmp-page {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.banner {
  background: linear-gradient(90deg, #e6f4ec, #fff);
  border: 1px solid #d6ecdf;
  border-left: 4px solid #2f9e6b;
  border-radius: 8px;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 14px;

  .banner-icon {
    width: 42px; height: 42px;
    border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    background: #2f9e6b; color: #fff; font-size: 20px; flex-shrink: 0;
  }
  h2 { font-size: 15px; color: #2f9e6b; margin: 0; }
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

.selector {
  background: #fff;
  border: 1px solid #e1e8f0;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(16, 42, 71, 0.06);
  .sel-body {
    display: flex;
    align-items: flex-end;
    gap: 14px;
    flex-wrap: wrap;
  }
  .sel {
    display: flex;
    flex-direction: column;
    gap: 4px;
    label { font-size: 12px; color: #5a6b7e; font-weight: 600; }
    .sel-box {
      min-width: 200px;
      padding: 8px 10px;
      border: 2px solid #2a6bb0;
      border-radius: 6px;
      font-size: 13px;
      color: #1f2d3d;
      background: #fff;
      cursor: pointer;
    }
  }
  .swap {
    width: 38px; height: 38px;
    border: 1px solid #e1e8f0;
    border-radius: 8px;
    background: #f3f7fb;
    color: #2a6bb0;
    font-size: 18px;
    cursor: pointer;
    &:hover { background: #e6f0fa; }
  }
  .warn {
    margin-left: auto;
    align-self: center;
    font-size: 12px;
    background: #fff4e5;
    color: #b06a00;
    padding: 5px 12px;
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
    .tag { font-size: 10.5px; padding: 2px 8px; border-radius: 10px; background: #eef4fb; color: #1e4d8b; }
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
  .delta { color: #5a6b7e; }
  .winner { font-weight: 700; }
  td.lead { font-weight: 700; background: #eef4fb; }
}

.chart { width: 100%; height: 280px; }
.chart.sm { height: 240px; }

.grid2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  .sub-t { font-size: 13px; font-weight: 700; margin-bottom: 4px; text-align: center; }
}

.chart-grid {
  display: grid;
  gap: 14px;
  &--2 { grid-template-columns: repeat(2, 1fr); }
}
</style>
