<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useCompanyStore } from '@/stores/company'
import { BANNERS } from '@/config/banners'
import { StatCards, ChartCard } from '@/components/page'
import { spcApi } from '@/api'
import type { SpcKpi, SpcLevel, SpcCpkTrend, SpcHistogram, SpcControlData, SpcRule, SpcSupplierCpk, SpcSubgroup, SpcLimit, SpcMark } from '@/types/spc'

const authStore = useAuthStore()
const companyStore = useCompanyStore()
const banner = BANNERS.spc?.[authStore.role] || {
  title: 'SPC 过程能力',
  desc: '控制图监控、数据采集、告警处理',
}

// ---- 数据（后端 /spc/dashboard + /spc/control-chart + /spc/capability/trend + /spc/rules + ...） ----
const kpi = ref<SpcKpi>({ cpk: 0, ppk: 0, alarm: 0, monitor: 0, passRate: 0, window: '', capPassRate: 0, capPassParams: '' })
const subgroups = ref<SpcSubgroup[]>([])
const limit = ref<SpcLimit>({ ucl: 0, cl: 0, lcl: 0 })
const marks = ref<SpcMark[]>([])
const chartType = ref<'Xbar-R' | 'Xbar-s' | 'I-MR'>('Xbar-R')
const hist = ref<SpcHistogram>({ bins: [], freq: [], usl: 0, lsl: 0 })
const levels = ref<SpcLevel[]>([])
const cpkTrend = ref<SpcCpkTrend>({ m: [], v: [] })
const rules = ref<SpcRule[]>([])
const supplierCpk = ref<SpcSupplierCpk[]>([])
const cpk = computed(() => kpi.value.cpk)
const ppk = computed(() => kpi.value.ppk)

const loading = ref(false)
onMounted(async () => {
  loading.value = true
  try {
    // 先取参数，确定直方图/控制图所用的首个真实 paramId
    const params = await spcApi.getParams()
    const firstParamId = params[0]?.id
    const [dash, rulesList, supList, histData] = await Promise.all([
      spcApi.getDashboard(),
      spcApi.getRuleTriggers(),
      spcApi.getSupplierCpk(),
      spcApi.getHistogram(firstParamId),
    ])
    kpi.value = dash.kpi
    levels.value = dash.levels
    rules.value = rulesList
    supplierCpk.value = supList
    hist.value = histData
    // 控制图：取第一个真实 paramId
    if (firstParamId) {
      const ctrl: SpcControlData = await spcApi.getControlChart(firstParamId)
      subgroups.value = ctrl.subgroups
      limit.value = ctrl.limit
      marks.value = ctrl.marks
      chartType.value = ctrl.chartType
    }
    // CPK 趋势
    cpkTrend.value = await spcApi.getCpkTrend(firstParamId, 12)
  } finally { loading.value = false }
})

// ---- 图表 option（对齐 HTML） ----
function controlChartOption() {
  const sg = subgroups.value
  const xs = sg.map((_, i) => '#' + (i + 1))
  const xbarPts = sg.map((s, i) => {
    let color = '#1e4d8b'
    marks.value.forEach((m) => {
      const rangeArr = m.range ? String(m.range).split(',').map(Number) : null
      if (m.level === '报警' && m.i === i) color = '#c0392b'
      if (m.level === '预警' && rangeArr && i >= rangeArr[0] && i <= rangeArr[1]) color = '#d4a017'
    })
    return { value: s.xbar, itemStyle: { color } }
  })
  const lim = limit.value
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
          { yAxis: lim.ucl, lineStyle: { color: '#c0392b' }, label: { formatter: 'UCL ' + lim.ucl, fontSize: 9, color: '#c0392b', position: 'insideEndTop' } },
          { yAxis: lim.cl, lineStyle: { color: '#2f7d32' }, label: { formatter: 'CL ' + lim.cl, fontSize: 9, color: '#2f7d32', position: 'insideEndTop' } },
          { yAxis: lim.lcl, lineStyle: { color: '#c0392b' }, label: { formatter: 'LCL ' + lim.lcl, fontSize: 9, color: '#c0392b', position: 'insideEndTop' } },
        ] },
      },
      {
        name: 'R', type: 'line', xAxisIndex: 1, yAxisIndex: 1, data: sg.map((s) => s.r), symbol: 'circle', symbolSize: 5, lineStyle: { color: '#8e44ad', width: 1.8 },
        markLine: { silent: true, symbol: 'none', lineStyle: { type: 'dashed' }, data: [
          { yAxis: lim.rUcl ?? 0, lineStyle: { color: '#c0392b' }, label: { formatter: 'UCL', fontSize: 9, color: '#c0392b', position: 'insideEndTop' } },
          { yAxis: lim.rCl ?? 0, lineStyle: { color: '#2f7d32' }, label: { formatter: 'CL', fontSize: 9, color: '#2f7d32', position: 'insideEndTop' } },
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
  return { series: [gauge(cpk.value, 'CPK 短期能力', '30%'), gauge(ppk.value, 'PPK 长期性能', '72%')] }
}
function histOption() {
  const h = hist.value
  const xs = h.bins.map((b) => (typeof b === 'number' ? b : parseFloat(b)))
  const fs = h.freq
  const n = fs.reduce((s, v) => s + v, 0)
  // 用真实频次数据拟合正态分布曲线（均值/标准差由实际测量值计算，非写死）
  const curve = (() => {
    if (!n) return xs.map(() => 0)
    const mu = xs.reduce((s, x, i) => s + x * fs[i], 0) / n
    const variance = xs.reduce((s, x, i) => s + fs[i] * (x - mu) ** 2, 0) / n
    const sig = Math.sqrt(variance) || 1e-6
    return xs.map((x) =>
      +(n * Math.exp(-((x - mu) ** 2) / (2 * sig * sig)) / (sig * Math.sqrt(2 * Math.PI))).toFixed(1),
    )
  })()
  // USL/LSL 落在最贴近的分箱中心，避免 indexOf 找不到返回 -1 导致标线错位
  const nearest = (val: number) => {
    let best = -1, bd = Infinity
    xs.forEach((x, i) => { const d = Math.abs(x - val); if (d < bd) { bd = d; best = i } })
    return best
  }
  return {
    tooltip: { trigger: 'axis' }, grid: { left: 42, right: 18, top: 24, bottom: 28 },
    legend: { data: ['频次', '正态分布'], bottom: 0, textStyle: { fontSize: 10 } },
    xAxis: { type: 'category', data: h.bins.map(String), name: '测量值', axisLabel: { fontSize: 10 } },
    yAxis: { type: 'value', axisLabel: { fontSize: 10 } },
    series: [
      {
        name: '频次', type: 'bar', data: h.freq, barWidth: '60%', itemStyle: { color: '#5b8def', borderRadius: [4, 4, 0, 0] },
        markLine: { silent: true, symbol: 'none', lineStyle: { type: 'dashed' }, data: [
          { xAxis: nearest(h.lsl), lineStyle: { color: '#c0392b' }, label: { formatter: 'LSL', fontSize: 9, color: '#c0392b' } },
          { xAxis: nearest(h.usl), lineStyle: { color: '#c0392b' }, label: { formatter: 'USL', fontSize: 9, color: '#c0392b' } },
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
      data: levels.value.map((d) => ({ value: d.value, name: d.name, itemStyle: { color: d.color } })),
    }],
  }
}
function ruleBarOption() {
  return {
    tooltip: { trigger: 'axis' }, grid: { left: 42, right: 18, top: 24, bottom: 50 },
    xAxis: { type: 'category', data: rules.value.map((x) => x.name), axisLabel: { fontSize: 9, interval: 0, rotate: 15 } },
    yAxis: { type: 'value', axisLabel: { fontSize: 10 } },
    series: [{
      type: 'bar', data: rules.value.map((x) => x.cnt), barWidth: 24,
      itemStyle: { color: '#8e44ad', borderRadius: [4, 4, 0, 0] }, label: { show: true, position: 'top', fontSize: 11 },
    }],
  }
}
function cpkTrendOption() {
  const t = cpkTrend.value
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
    yAxis: { type: 'category', data: supplierCpk.value.map((s) => s.mat), axisLabel: { fontSize: 11 } },
    series: [{
      type: 'bar', barWidth: 14,
      data: supplierCpk.value.map((s) => ({ value: s.cpk, itemStyle: { color: s.cpk >= 1.33 ? '#2f7d32' : s.cpk >= 1.0 ? '#d4a017' : '#c0392b' } })),
      label: { show: true, position: 'right', formatter: '{c}', fontSize: 11 },
      markLine: { silent: true, symbol: 'none', lineStyle: { type: 'dashed', color: '#2f7d32' }, data: [{ xAxis: 1.33, label: { formatter: '达标1.33', fontSize: 9, color: '#2f7d32', position: 'insideEndTop' } }] },
    }],
  }
}

const isQManager = computed(() => authStore.role === 'qmanager')
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
    <StatCards :items="[
      { label:'当前 CPK', value:kpi.cpk.toFixed(2), color:'#2f7d32' },
      { label:'今日报警', value:kpi.alarm, color:'#c0392b' },
      { label:'监控参数', value:kpi.monitor, color:'#1e4d8b' },
      { label:'受控率', value:kpi.passRate+'%', color:'#2f7d32' },
    ]" :loading="loading" />

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
        <div class="qms-card__body"><ChartCard :option="controlChartOption()" height="380" /></div>
      </div>
      <div class="qms-card">
        <div class="qms-card__header"><h3>S2 过程能力指数</h3><span class="tag g">CPK {{ cpk }}</span></div>
        <div class="qms-card__body"><ChartCard :option="dualGaugeOption()" height="380" /></div>
      </div>
    </div>

    <!-- S3 直方图 + S4 等级分布 + S6 规则触发 -->
    <div class="chart-grid chart-grid--3">
      <div class="qms-card">
        <div class="qms-card__header"><h3>S3 过程能力直方图</h3></div>
        <div class="qms-card__body"><ChartCard :option="histOption()" /></div>
      </div>
      <div class="qms-card">
        <div class="qms-card__header"><h3>S4 参数能力等级分布</h3></div>
        <div class="qms-card__body"><ChartCard :option="pieOption()" /></div>
      </div>
      <div class="qms-card">
        <div class="qms-card__header"><h3>S6 判异规则触发</h3></div>
        <div class="qms-card__body"><ChartCard :option="ruleBarOption()" /></div>
      </div>
    </div>

    <!-- S5 趋势 + 角色面板 -->
    <div class="chart-grid chart-grid--2">
      <div class="qms-card">
        <div class="qms-card__header">
          <h3>S5 CPK 月度趋势</h3>
          <span class="tag g">上升</span>
        </div>
        <div class="qms-card__body"><ChartCard :option="cpkTrendOption()" /></div>
      </div>

      <!-- qmanager：过程能力总览 + 跨参数 CPK 对比 -->
      <template v-if="isQManager">
        <div class="qms-card">
          <div class="qms-card__header"><h3>过程能力总览</h3><span class="tag">质量主管</span></div>
          <div class="qms-card__body">
            <div class="kpi-row" style="margin: 0">
              <StatCards :items="[
                { label:'平均 CPK', value:cpk.toFixed(2), color:'#2f7d32' },
                { label:'达标参数', value:'17/19', color:'#2f7d32' },
                { label:'临界参数', value:5, color:'#d4a017' },
                { label:'不足参数', value:2, color:'#c0392b' },
              ]" />
            </div>
          </div>
        </div>
        <div class="qms-card">
          <div class="qms-card__header"><h3>跨参数 CPK 对比</h3><span class="tag">决策</span></div>
          <div class="qms-card__body"><ChartCard :option="supplierCpkOption()" height="220" /></div>
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
