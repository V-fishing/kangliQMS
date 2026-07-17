<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useCompanyStore } from '@/stores/company'
import { BANNERS } from '@/mock/roles'
import { COMPANY_KPI } from '@/mock/company'
import KpiCard from '@/components/common/KpiCard.vue'
import echarts from '@/utils/echarts'

const authStore = useAuthStore()
const companyStore = useCompanyStore()
const banner = BANNERS.spc?.[authStore.role] || {
  title: 'SPC 过程能力',
  desc: '控制图监控、数据采集、告警处理',
}

// ---- 数据（对齐 HTML MOCK.spc） ----
const kpi = computed(() => {
  const k = companyStore.kpi() || COMPANY_KPI.MZ
  return { cpk: 1.42, alarm: k.spcAlarm, monitor: 19, passRate: k.passRate }
})
const xbar = [10.02, 9.98, 10.05, 9.95, 10.01, 10.08, 9.97, 10.03, 10.34, 10.10, 9.96, 10.04, 10.06, 9.99, 10.10, 10.15, 10.18, 10.22, 10.25, 10.28, 9.94, 10.0, 10.11, 9.93, 10.07]
const r = [0.18, 0.22, 0.15, 0.25, 0.19, 0.21, 0.17, 0.20, 0.38, 0.24, 0.16, 0.19, 0.21, 0.18, 0.23, 0.26, 0.28, 0.30, 0.33, 0.35, 0.17, 0.20, 0.25, 0.16, 0.22]
const cl = 10.0, ucl = 10.3, lcl = 9.7, rcl = 0.22, rucl = 0.49
const marks = [
  { i: 8, rule: '①1点超3σ', level: '报警' },
  { i: 14, rule: '③连续6点递增', level: '预警', range: [14, 19] },
]
const cpk = 1.42, ppk = 1.35
const hist = { bins: ['9.7', '9.8', '9.9', '10.0', '10.1', '10.2', '10.3'], freq: [2, 5, 9, 12, 8, 4, 2], usl: 10.3, lsl: 9.7 }
const levels = [
  { name: '充足(CPK≥1.33)', value: 12, color: '#2f7d32' },
  { name: '尚可(1.0-1.33)', value: 5, color: '#d4a017' },
  { name: '不足(<1.0)', value: 2, color: '#c0392b' },
]
const cpkTrend = { m: ['2月', '3月', '4月', '5月', '6月', '7月'], v: [1.28, 1.31, 1.35, 1.33, 1.40, 1.42] }
const rules = [
  { name: '①1点超3σ', cnt: 3 },
  { name: '②连续9点同侧', cnt: 1 },
  { name: '③连续6点递增减', cnt: 2 },
  { name: '⑤3点中2点超2σ', cnt: 1 },
]
const supplierCpk = [
  { sup: '华星电子', mat: 'PCBA主板', cpk: 1.51, lvl: '充足' },
  { sup: '精工医疗', mat: '采样针组', cpk: 1.12, lvl: '尚可' },
  { sup: '联接科技', mat: '线束组件', cpk: 0.96, lvl: '不足' },
  { sup: '恒泰包装', mat: '包装材料', cpk: 1.38, lvl: '充足' },
]

// ---- 图表 option（对齐 HTML） ----
function controlChartOption() {
  const xs = xbar.map((_, i) => '#' + (i + 1))
  const xbarPts = xbar.map((v, i) => {
    let color = '#1e4d8b'
    marks.forEach((m) => {
      if (m.level === '报警' && m.i === i) color = '#c0392b'
      if (m.level === '预警' && m.range && i >= m.range[0] && i <= m.range[1]) color = '#d4a017'
    })
    return { value: v, itemStyle: { color } }
  })
  return {
    tooltip: { trigger: 'axis' },
    grid: [
      { left: 50, right: 20, top: 28, height: '46%' },
      { left: 50, right: 20, top: '78%', height: '18%' },
    ],
    xAxis: [
      { gridIndex: 0, type: 'category', data: xs, axisLabel: { fontSize: 9, interval: 1 } },
      { gridIndex: 1, type: 'category', data: xs, axisLabel: { fontSize: 9, interval: 2 } },
    ],
    yAxis: [
      { gridIndex: 0, type: 'value', name: 'Xbar', min: 9.6, max: 10.4, axisLabel: { fontSize: 10 } },
      { gridIndex: 1, type: 'value', name: 'R', min: 0, max: 0.6, axisLabel: { fontSize: 10 } },
    ],
    series: [
      {
        name: 'Xbar', type: 'line', xAxisIndex: 0, yAxisIndex: 0, data: xbarPts, symbol: 'circle', symbolSize: 7, lineStyle: { color: '#1e4d8b', width: 2 },
        markLine: { silent: true, symbol: 'none', lineStyle: { type: 'dashed' }, data: [
          { yAxis: ucl, lineStyle: { color: '#c0392b' }, label: { formatter: 'UCL ' + ucl, fontSize: 9, color: '#c0392b', position: 'insideEndTop' } },
          { yAxis: cl, lineStyle: { color: '#2f7d32' }, label: { formatter: 'CL ' + cl, fontSize: 9, color: '#2f7d32', position: 'insideEndTop' } },
          { yAxis: lcl, lineStyle: { color: '#c0392b' }, label: { formatter: 'LCL ' + lcl, fontSize: 9, color: '#c0392b', position: 'insideEndTop' } },
        ] },
      },
      {
        name: 'R', type: 'line', xAxisIndex: 1, yAxisIndex: 1, data: r, symbol: 'circle', symbolSize: 5, lineStyle: { color: '#8e44ad', width: 1.8 },
        markLine: { silent: true, symbol: 'none', lineStyle: { type: 'dashed' }, data: [
          { yAxis: rucl, lineStyle: { color: '#c0392b' }, label: { formatter: 'UCL', fontSize: 9, color: '#c0392b', position: 'insideEndTop' } },
          { yAxis: rcl, lineStyle: { color: '#2f7d32' }, label: { formatter: 'CL', fontSize: 9, color: '#2f7d32', position: 'insideEndTop' } },
        ] },
      },
    ],
  }
}
function dualGaugeOption() {
  const col = (v: number) => (v >= 1.33 ? '#2f7d32' : v >= 1.0 ? '#d4a017' : '#c0392b')
  const gauge = (val: number, name: string, cx: string) => ({
    type: 'gauge', min: 0, max: 3, radius: '60%', center: [cx, '55%'], startAngle: 200, endAngle: -20,
    progress: { show: true, width: 12, itemStyle: { color: col(val) } }, axisLine: { lineStyle: { width: 12, color: [[1, '#eef1f5']] } },
    pointer: { width: 3, length: '60%' }, axisTick: { show: false }, splitLine: { length: 6 }, axisLabel: { distance: 10, fontSize: 9, color: '#999' },
    detail: { valueAnimation: true, formatter: '{value}', fontSize: 20, color: col(val), offsetCenter: [0, '32%'] },
    title: { offsetCenter: [0, '58%'], fontSize: 12, color: '#5a6b7e' }, data: [{ value: val, name }],
  })
  return { series: [gauge(cpk, 'CPK 短期能力', '30%'), gauge(ppk, 'PPK 长期性能', '72%')] }
}
function histOption() {
  const h = hist
  const curve = h.bins.map((b) => {
    const x = parseFloat(b); const mu = 10.0, sig = 0.12
    return +(14 * Math.exp(-((x - mu) ** 2) / (2 * sig * sig))).toFixed(1)
  })
  return {
    tooltip: { trigger: 'axis' }, grid: { left: 42, right: 18, top: 24, bottom: 28 },
    legend: { data: ['频次', '正态分布'], bottom: 0, textStyle: { fontSize: 10 } },
    xAxis: { type: 'category', data: h.bins, name: '测量值', axisLabel: { fontSize: 10 } },
    yAxis: { type: 'value', axisLabel: { fontSize: 10 } },
    series: [
      {
        name: '频次', type: 'bar', data: h.freq, barWidth: '60%', itemStyle: { color: '#5b8def', borderRadius: [4, 4, 0, 0] },
        markLine: { silent: true, symbol: 'none', lineStyle: { type: 'dashed' }, data: [
          { xAxis: h.bins.indexOf(String(h.lsl)), lineStyle: { color: '#c0392b' }, label: { formatter: 'LSL', fontSize: 9, color: '#c0392b' } },
          { xAxis: h.bins.indexOf(String(h.usl)), lineStyle: { color: '#c0392b' }, label: { formatter: 'USL', fontSize: 9, color: '#c0392b' } },
        ] },
      },
      { name: '正态分布', type: 'line', data: curve, smooth: true, symbol: 'none', lineStyle: { color: '#d4a017', width: 2 } },
    ],
  }
}
function pieOption() {
  return {
    tooltip: { trigger: 'item' }, legend: { bottom: 0, icon: 'circle', textStyle: { fontSize: 11 }, type: 'scroll' },
    series: [{
      name: '能力等级', type: 'pie', radius: '62%', center: ['50%', '45%'], itemStyle: { borderColor: '#fff', borderWidth: 2 },
      label: { formatter: '{b}:{c}', fontSize: 11 },
      data: levels.map((d) => ({ value: d.value, name: d.name, itemStyle: { color: d.color } })),
    }],
  }
}
function ruleBarOption() {
  return {
    tooltip: { trigger: 'axis' }, grid: { left: 42, right: 18, top: 24, bottom: 50 },
    xAxis: { type: 'category', data: rules.map((x) => x.name), axisLabel: { fontSize: 9, interval: 0, rotate: 15 } },
    yAxis: { type: 'value', axisLabel: { fontSize: 10 } },
    series: [{
      type: 'bar', data: rules.map((x) => x.cnt), barWidth: 24,
      itemStyle: { color: '#8e44ad', borderRadius: [4, 4, 0, 0] }, label: { show: true, position: 'top', fontSize: 11 },
    }],
  }
}
function cpkTrendOption() {
  const t = cpkTrend
  return {
    tooltip: { trigger: 'axis' }, grid: { left: 42, right: 18, top: 30, bottom: 28 },
    xAxis: { type: 'category', data: t.m, axisLabel: { fontSize: 11 } },
    yAxis: { type: 'value', min: 1.0, max: 1.6, axisLabel: { fontSize: 11 } },
    series: [{
      type: 'line', data: t.v, smooth: true, symbol: 'circle', symbolSize: 7,
      itemStyle: { color: '#1e4d8b' }, lineStyle: { width: 2.5 }, areaStyle: { color: 'rgba(30,77,139,.12)' },
      markLine: { silent: true, symbol: 'none', lineStyle: { type: 'dashed' }, data: [
        { yAxis: 1.33, lineStyle: { color: '#2f7d32' }, label: { formatter: '充足 1.33', fontSize: 9, color: '#2f7d32', position: 'insideEndTop' } },
        { yAxis: 1.0, lineStyle: { color: '#c0392b' }, label: { formatter: '不足 1.0', fontSize: 9, color: '#c0392b', position: 'insideEndTop' } },
      ] },
    }],
  }
}
function supplierCpkOption() {
  return {
    tooltip: { trigger: 'axis' }, grid: { left: 80, right: 30, top: 14, bottom: 24 },
    xAxis: { type: 'value', min: 0.8, max: 2, axisLabel: { fontSize: 11 } },
    yAxis: { type: 'category', data: supplierCpk.map((s) => s.mat), axisLabel: { fontSize: 11 } },
    series: [{
      type: 'bar', barWidth: 14,
      data: supplierCpk.map((s) => ({ value: s.cpk, itemStyle: { color: s.cpk >= 1.33 ? '#2f7d32' : s.cpk >= 1.0 ? '#d4a017' : '#c0392b' } })),
      label: { show: true, position: 'right', formatter: '{c}', fontSize: 11 },
      markLine: { silent: true, symbol: 'none', lineStyle: { type: 'dashed', color: '#2f7d32' }, data: [{ xAxis: 1.33, label: { formatter: '达标1.33', fontSize: 9, color: '#2f7d32', position: 'insideEndTop' } }] },
    }],
  }
}

// ---- 实例管理 ----
const s1Ref = ref<HTMLDivElement>()
const s2Ref = ref<HTMLDivElement>()
const s3Ref = ref<HTMLDivElement>()
const s4Ref = ref<HTMLDivElement>()
const s5Ref = ref<HTMLDivElement>()
const s6Ref = ref<HTMLDivElement>()
const qmRef = ref<HTMLDivElement>()
const inst: Record<string, echarts.ECharts> = {}

function initAll() {
  if (s1Ref.value) { inst.s1 = echarts.init(s1Ref.value); inst.s1.setOption(controlChartOption()) }
  if (s2Ref.value) { inst.s2 = echarts.init(s2Ref.value); inst.s2.setOption(dualGaugeOption()) }
  if (s3Ref.value) { inst.s3 = echarts.init(s3Ref.value); inst.s3.setOption(histOption()) }
  if (s4Ref.value) { inst.s4 = echarts.init(s4Ref.value); inst.s4.setOption(pieOption()) }
  if (s5Ref.value) { inst.s5 = echarts.init(s5Ref.value); inst.s5.setOption(cpkTrendOption()) }
  if (s6Ref.value) { inst.s6 = echarts.init(s6Ref.value); inst.s6.setOption(ruleBarOption()) }
  if (qmRef.value) { inst.qm = echarts.init(qmRef.value); inst.qm.setOption(supplierCpkOption()) }
}
function resizeAll() { Object.values(inst).forEach((c) => c.resize()) }

const isQManager = computed(() => authStore.role === 'qmanager')

onMounted(() => {
  initAll()
  window.addEventListener('resize', resizeAll)
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeAll)
  Object.values(inst).forEach((c) => c.dispose())
})
</script>

<template>
  <div class="spc-dash">
    <div class="qms-banner">
      <div class="qms-banner__icon" :style="{ background: authStore.currentRole?.color }">📊</div>
      <div>
        <div class="qms-banner__title">{{ banner.title }}</div>
        <div class="qms-banner__desc">{{ banner.desc }} · 当前公司：{{ companyStore.contextLabel() }}</div>
      </div>
    </div>

    <!-- KPI 行 -->
    <div class="kpi-row">
      <KpiCard label="当前 CPK" :value="kpi.cpk.toFixed(2)" sub="充足(≥1.33)" status="ok" />
      <KpiCard label="今日报警" :value="kpi.alarm" sub="2预警/1报警" status="warn" />
      <KpiCard label="监控参数" :value="kpi.monitor" sub="17 达标" />
      <KpiCard label="受控率" :value="kpi.passRate + '%'" sub="过程稳定" status="ok" />
    </div>

    <!-- S1 控制图 + S2 能力指数 -->
    <div class="chart-grid chart-grid--2-1">
      <div class="qms-card">
        <div class="qms-card__header">
          <h3>S1 Xbar-R 控制图</h3>
          <span class="tag r">2 处异常</span>
        </div>
        <div class="legend-inline">
          <span><i style="background:#c0392b"></i>报警(①超3σ)</span>
          <span><i style="background:#d4a017"></i>预警(③连续6点递增)</span>
          <span><i style="background:#2f7d32"></i>UCL/CL/LCL</span>
        </div>
        <div class="qms-card__body"><div ref="s1Ref" class="chart lg"></div></div>
      </div>
      <div class="qms-card">
        <div class="qms-card__header">
          <h3>S2 过程能力指数</h3>
          <span class="tag g">CPK {{ cpk }}</span>
        </div>
        <div class="qms-card__body"><div ref="s2Ref" class="chart lg"></div></div>
      </div>
    </div>

    <!-- S3 直方图 + S4 等级分布 + S6 规则触发 -->
    <div class="chart-grid chart-grid--3">
      <div class="qms-card">
        <div class="qms-card__header"><h3>S3 过程能力直方图</h3></div>
        <div class="qms-card__body"><div ref="s3Ref" class="chart"></div></div>
      </div>
      <div class="qms-card">
        <div class="qms-card__header"><h3>S4 参数能力等级分布</h3></div>
        <div class="qms-card__body"><div ref="s4Ref" class="chart"></div></div>
      </div>
      <div class="qms-card">
        <div class="qms-card__header"><h3>S6 判异规则触发</h3></div>
        <div class="qms-card__body"><div ref="s6Ref" class="chart"></div></div>
      </div>
    </div>

    <!-- S5 趋势 + 角色面板 -->
    <div class="chart-grid chart-grid--2">
      <div class="qms-card">
        <div class="qms-card__header">
          <h3>S5 CPK 月度趋势</h3>
          <span class="tag g">上升</span>
        </div>
        <div class="qms-card__body"><div ref="s5Ref" class="chart"></div></div>
      </div>

      <!-- qmanager：过程能力总览 + 跨参数 CPK 对比 -->
      <template v-if="isQManager">
        <div class="qms-card">
          <div class="qms-card__header"><h3>过程能力总览</h3><span class="tag">质量主管</span></div>
          <div class="qms-card__body">
            <div class="kpi-row" style="margin: 0">
              <KpiCard label="平均 CPK" :value="cpk.toFixed(2)" sub="充足" status="ok" />
              <KpiCard label="达标参数" value="17/19" sub="89.5%" status="ok" />
              <KpiCard label="临界参数" :value="5" sub="需关注" status="warn" />
              <KpiCard label="不足参数" :value="2" sub="需改进" status="bad" />
            </div>
          </div>
        </div>
        <div class="qms-card">
          <div class="qms-card__header"><h3>跨参数 CPK 对比</h3><span class="tag">决策</span></div>
          <div class="qms-card__body"><div ref="qmRef" class="chart sm"></div></div>
        </div>
      </template>

      <!-- 其他角色：只读概览 -->
      <div v-else class="qms-card">
        <div class="qms-card__header"><h3>SPC 模块（只读）</h3></div>
        <div class="qms-card__body">
          <div class="kv">
            <span class="k">本厂过程能力</span><span>整体 CPK {{ cpk }}（充足）</span>
            <span class="k">监控参数</span><span>{{ kpi.monitor }} 个</span>
            <span class="k">今日报警</span><span>{{ kpi.alarm }} 次</span>
            <span class="k">受控率</span><span>{{ kpi.passRate }}%</span>
            <span class="k">说明</span><span>SPC 数据为本厂生产过程数据，仅供了解</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.spc-dash { display: flex; flex-direction: column; gap: 14px; }

.chart { width: 100%; height: 260px; }
.chart.lg { height: 320px; }
.chart.sm { height: 220px; }

.legend-inline {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  padding: 8px 14px 0;
  font-size: 11.5px;
  color: #5a6b7e;
  span { display: inline-flex; align-items: center; gap: 5px; }
  i { width: 10px; height: 10px; border-radius: 2px; display: inline-block; }
}

.kv {
  display: grid;
  grid-template-columns: 96px 1fr;
  gap: 8px 10px;
  font-size: 12.5px;
  .k { color: #5a6b7e; }
}
</style>
