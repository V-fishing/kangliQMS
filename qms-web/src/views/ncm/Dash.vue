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
const banner = BANNERS.ncm?.[authStore.role] || {
  title: '不良管理 NCM',
  desc: '不良看板、Pareto 分析、趋势监控、8D 整改',
}

// ---- 数据（对齐 HTML MOCK.ncm） ----
const kpi = computed(() => {
  const k = companyStore.kpi() || COMPANY_KPI.MZ
  return {
    defectCnt: k.openNc,
    defectRate: k.defectRate,
    ppm: Math.round(k.defectRate * 1000),
    scrap: 0.35,
  }
})
const pareto = [
  { name: '尺寸超差', v: 42 }, { name: '外观缺陷', v: 28 }, { name: '密封不良', v: 18 },
  { name: '装配错位', v: 14 }, { name: '功能异常', v: 10 }, { name: '其他', v: 16 },
]
const trend30 = {
  vals: [1.5, 1.6, 1.4, 1.7, 1.8, 1.9, 2.0, 2.1, 2.2, 2.3, 1.9, 1.8, 2.0, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.5, 2.6, 2.7, 2.8, 2.9, 3.0, 3.1, 3.2, 3.3, 1.82],
  target: 2.0,
}
const types = [
  { name: '尺寸超差', value: 42 }, { name: '外观缺陷', value: 28 }, { name: '密封不良', value: 18 },
  { name: '装配错位', value: 14 }, { name: '功能异常', value: 10 }, { name: '其他', value: 16 },
]
const procTop = [
  { proc: '注塑', rate: 3.2 }, { proc: '焊接', rate: 2.4 }, { proc: '组装', rate: 1.8 },
  { proc: '检测', rate: 1.1 }, { proc: '包装', rate: 0.6 },
]
const compare = { labels: ['第一周', '第二周', '第三周', '第四周'], cur: [1.6, 1.9, 2.1, 1.82], prev: [1.7, 1.8, 1.6, 1.5], yoy: [2.1, 2.0, 1.9, 1.8] }
const shifts = [
  { shift: '早班', rate: 1.6, cnt: 48 }, { shift: '中班', rate: 2.1, cnt: 52 }, { shift: '晚班', rate: 1.8, cnt: 28 },
]
const realtime = { shift: '中班', cnt: 52, rate: 2.1, top3: [{ n: '尺寸超差', c: 18 }, { n: '外观缺陷', c: 12 }, { n: '密封不良', c: 8 }] }
const corrective = [
  { id: 'CA-001', issue: '注塑尺寸超差', owner: '李工程师', due: '07-20', st: '进行中', progress: 60 },
  { id: 'CA-002', issue: '焊接密封不良', owner: '王工程师', due: '07-18', st: '超期', progress: 40 },
  { id: 'CA-003', issue: '组装错位', owner: '赵工程师', due: '07-22', st: '待启动', progress: 0 },
]

// ---- 图表 option（对齐 HTML） ----
function paretoOption() {
  const sorted = [...pareto].sort((a, b) => b.v - a.v)
  const total = sorted.reduce((s, d) => s + d.v, 0)
  let acc = 0
  const cum = sorted.map((d) => { acc += d.v; return +(acc / total * 100).toFixed(1) })
  return {
    tooltip: { trigger: 'axis' }, legend: { data: ['不良数', '累积占比%'], bottom: 0, textStyle: { fontSize: 11 } },
    grid: { left: 46, right: 46, top: 30, bottom: 40 },
    xAxis: { type: 'category', data: sorted.map((d) => d.name), axisLabel: { fontSize: 10, rotate: 18 } },
    yAxis: [
      { type: 'value', name: '不良数', axisLabel: { fontSize: 10 } },
      { type: 'value', name: '累积%', max: 100, axisLabel: { fontSize: 10, formatter: '{value}%' } },
    ],
    series: [
      { name: '不良数', type: 'bar', data: sorted.map((d) => d.v), barWidth: '48%', itemStyle: { color: '#1e4d8b', borderRadius: [4, 4, 0, 0] }, label: { show: true, position: 'top', fontSize: 10 } },
      {
        name: '累积占比%', type: 'line', yAxisIndex: 1, data: cum, symbol: 'circle', symbolSize: 6,
        lineStyle: { color: '#c0392b', width: 2 }, itemStyle: { color: '#c0392b' },
        markLine: { silent: true, symbol: 'none', lineStyle: { type: 'dashed', color: '#d4a017' }, data: [{ yAxis: 80, label: { formatter: '80%关键线', fontSize: 9, color: '#d4a017', position: 'insideEndTop' } }] },
      },
    ],
  }
}
function trendOption() {
  const t = trend30
  const days = Array.from({ length: 30 }, (_, i) => i + 1)
  const pts = t.vals.map((v) => ({ value: v, itemStyle: v >= t.target * 1.3 ? { color: '#c0392b' } : { color: '#1e4d8b' } }))
  return {
    tooltip: { trigger: 'axis' }, grid: { left: 42, right: 18, top: 24, bottom: 28 },
    xAxis: { type: 'category', data: days.map(String), axisLabel: { fontSize: 9, interval: 4 } },
    yAxis: { type: 'value', name: '不良率%', axisLabel: { fontSize: 10 } },
    series: [
      {
        type: 'line', data: pts, symbol: 'circle', symbolSize: 5, lineStyle: { color: '#1e4d8b', width: 2 },
        areaStyle: { color: 'rgba(30,77,139,.1)' },
        markLine: { silent: true, symbol: 'none', lineStyle: { type: 'dashed' }, data: [{ yAxis: t.target, lineStyle: { color: '#2f7d32' }, label: { formatter: '目标' + t.target + '%', fontSize: 9, color: '#2f7d32' } }] },
      },
      { type: 'line', data: [], markArea: { silent: true, itemStyle: { color: 'rgba(192,57,43,.10)' }, data: [[{ xAxis: '25' }, { xAxis: '29' }]] } },
    ],
  }
}
function roseOption() {
  return {
    tooltip: { trigger: 'item' }, legend: { bottom: 0, icon: 'circle', textStyle: { fontSize: 11 }, type: 'scroll' },
    series: [{ type: 'pie', roseType: 'radius', radius: ['25%', '68%'], center: ['50%', '46%'], itemStyle: { borderColor: '#fff', borderWidth: 2 }, label: { fontSize: 11 }, data: types }],
  }
}
function vbarOption() {
  return {
    tooltip: { trigger: 'axis' }, grid: { left: 42, right: 18, top: 24, bottom: 30 },
    xAxis: { type: 'category', data: procTop.map((d) => d.proc), axisLabel: { fontSize: 11 } },
    yAxis: { type: 'value', name: '不良率%', axisLabel: { fontSize: 11 } },
    series: [{
      type: 'bar', data: procTop.map((d) => d.rate), barWidth: 24,
      itemStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: '#2a6bb0' }, { offset: 1, color: '#1e4d8b' }]), borderRadius: [4, 4, 0, 0] },
      label: { show: true, position: 'top', formatter: '{c}%', fontSize: 11 },
    }],
  }
}
function compareOption() {
  const c = compare
  return {
    tooltip: { trigger: 'axis' }, legend: { data: ['本月', '上月', '去年同月'], bottom: 0, textStyle: { fontSize: 11 } },
    grid: { left: 42, right: 18, top: 24, bottom: 40 },
    xAxis: { type: 'category', data: c.labels, axisLabel: { fontSize: 11 } },
    yAxis: { type: 'value', name: '不良率%', axisLabel: { fontSize: 10 } },
    series: [
      { name: '本月', type: 'bar', data: c.cur, barWidth: '20%', itemStyle: { color: '#1e4d8b', borderRadius: [3, 3, 0, 0] } },
      { name: '上月', type: 'bar', data: c.prev, barWidth: '20%', itemStyle: { color: '#5b8def', borderRadius: [3, 3, 0, 0] } },
      { name: '去年同月', type: 'bar', data: c.yoy, barWidth: '20%', itemStyle: { color: '#a0c4f0', borderRadius: [3, 3, 0, 0] } },
    ],
  }
}
function shiftOption() {
  const s = shifts
  return {
    tooltip: { trigger: 'axis' }, legend: { data: ['不良率%', '不良数'], bottom: 0, textStyle: { fontSize: 11 } },
    grid: { left: 46, right: 46, top: 24, bottom: 40 },
    xAxis: { type: 'category', data: s.map((d) => d.shift), axisLabel: { fontSize: 11 } },
    yAxis: [
      { type: 'value', name: '不良率%', axisLabel: { fontSize: 10 } },
      { type: 'value', name: '不良数', axisLabel: { fontSize: 10 } },
    ],
    series: [
      { name: '不良率%', type: 'bar', data: s.map((d) => d.rate), barWidth: 30, itemStyle: { color: '#1e4d8b', borderRadius: [4, 4, 0, 0] }, label: { show: true, position: 'top', formatter: '{c}%', fontSize: 11 } },
      { name: '不良数', type: 'line', yAxisIndex: 1, data: s.map((d) => d.cnt), symbol: 'circle', symbolSize: 8, lineStyle: { color: '#d4a017', width: 2 }, itemStyle: { color: '#d4a017' } },
    ],
  }
}

// ---- 实例管理 ----
const n1Ref = ref<HTMLDivElement>()
const n2Ref = ref<HTMLDivElement>()
const n3Ref = ref<HTMLDivElement>()
const n4Ref = ref<HTMLDivElement>()
const n5Ref = ref<HTMLDivElement>()
const n6Ref = ref<HTMLDivElement>()
const qmRef = ref<HTMLDivElement>()
const inst: Record<string, echarts.ECharts> = {}

const isQManager = computed(() => authStore.role === 'qmanager')

function initAll() {
  if (n1Ref.value) { inst.n1 = echarts.init(n1Ref.value); inst.n1.setOption(paretoOption()) }
  if (n2Ref.value) { inst.n2 = echarts.init(n2Ref.value); inst.n2.setOption(trendOption()) }
  if (n3Ref.value) { inst.n3 = echarts.init(n3Ref.value); inst.n3.setOption(roseOption()) }
  if (n4Ref.value) { inst.n4 = echarts.init(n4Ref.value); inst.n4.setOption(vbarOption()) }
  if (n5Ref.value) { inst.n5 = echarts.init(n5Ref.value); inst.n5.setOption(compareOption()) }
  if (n6Ref.value) { inst.n6 = echarts.init(n6Ref.value); inst.n6.setOption(shiftOption()) }
  if (qmRef.value) { inst.qm = echarts.init(qmRef.value); inst.qm.setOption(compareOption()) }
}
function resizeAll() { Object.values(inst).forEach((c) => c.resize()) }

onMounted(() => {
  initAll()
  window.addEventListener('resize', resizeAll)
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeAll)
  Object.values(inst).forEach((c) => c.dispose())
})

function stStatus(st: string): 'ok' | 'warn' | 'bad' {
  if (st === '超期') return 'bad'
  if (st === '进行中') return 'warn'
  return 'ok'
}
</script>

<template>
  <div class="ncm-dash">
    <div class="qms-banner">
      <div class="qms-banner__icon" :style="{ background: authStore.currentRole?.color }">③</div>
      <div>
        <div class="qms-banner__title">{{ banner.title }}</div>
        <div class="qms-banner__desc">{{ banner.desc }} · 当前公司：{{ companyStore.contextLabel() }}</div>
      </div>
    </div>

    <!-- KPI 行 -->
    <div class="kpi-row">
      <KpiCard label="今日不良数" :value="kpi.defectCnt" unit="件" status="bad" sub="较昨日 +12" />
      <KpiCard label="不良率" :value="kpi.defectRate" unit="%" status="warn" sub="连续5天上升" />
      <KpiCard label="PPM" :value="kpi.ppm" status="warn" sub="目标 ≤2000" />
      <KpiCard label="报废率" :value="kpi.scrap" unit="%" status="ok" sub="正常" />
    </div>

    <!-- N1 Pareto + N7 实时看板 -->
    <div class="chart-grid chart-grid--2-1">
      <div class="qms-card">
        <div class="qms-card__header">
          <h3>N1 不良 Pareto 图</h3>
          <span class="tag">80% 关键类型已标注</span>
        </div>
        <div class="qms-card__body"><div ref="n1Ref" class="chart lg"></div></div>
      </div>
      <div class="qms-card">
        <div class="qms-card__header">
          <h3>N7 实时不良看板</h3>
          <span class="tag">{{ realtime.shift }}</span>
        </div>
        <div class="qms-card__body">
          <div class="kpi-row" style="grid-template-columns: repeat(2, 1fr); margin: 12px;">
            <KpiCard label="当班不良" :value="realtime.cnt" unit="件" status="bad" />
            <KpiCard label="不良率" :value="realtime.rate" unit="%" status="warn" />
          </div>
          <div class="top-list">
            <div v-for="(t, i) in realtime.top3" :key="i" class="list-row">
              <span class="qms-pill" :class="i === 0 ? 'r' : 'y'">TOP{{ i + 1 }}</span>
              <span class="grow">{{ t.n }}</span>
              <span class="meta">{{ t.c }}件</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- N2 趋势 + N3 类型分布 + N4 工序 TOP5 -->
    <div class="chart-grid chart-grid--3">
      <div class="qms-card">
        <div class="qms-card__header">
          <h3>N2 不良率趋势(30天)</h3>
          <span class="tag r">预警</span>
        </div>
        <div class="qms-card__body"><div ref="n2Ref" class="chart"></div></div>
      </div>
      <div class="qms-card">
        <div class="qms-card__header"><h3>N3 不良类型分布</h3></div>
        <div class="qms-card__body"><div ref="n3Ref" class="chart"></div></div>
      </div>
      <div class="qms-card">
        <div class="qms-card__header"><h3>N4 工序不良率 TOP5</h3></div>
        <div class="qms-card__body"><div ref="n4Ref" class="chart"></div></div>
      </div>
    </div>

    <!-- N5 环比/同比 + N6 班次对比 -->
    <div class="chart-grid chart-grid--2">
      <div class="qms-card">
        <div class="qms-card__header">
          <h3>N5 环比/同比</h3>
          <span class="tag">本月/上月/去年同月</span>
        </div>
        <div class="qms-card__body"><div ref="n5Ref" class="chart"></div></div>
      </div>
      <div class="qms-card">
        <div class="qms-card__header"><h3>N6 班次不良对比</h3></div>
        <div class="qms-card__body"><div ref="n6Ref" class="chart"></div></div>
      </div>
    </div>

    <!-- 角色面板 -->
    <template v-if="isQManager">
      <div class="chart-grid chart-grid--2">
        <div class="qms-card">
          <div class="qms-card__header"><h3>环比/同比分析</h3><span class="tag">质量主管</span></div>
          <div class="qms-card__body"><div ref="qmRef" class="chart sm"></div></div>
        </div>
        <div class="qms-card">
          <div class="qms-card__header">
            <h3>纠正措施跟踪</h3>
            <span class="tag r">{{ corrective.filter(c => c.st === '超期').length }} 超期</span>
          </div>
          <div class="qms-card__body">
            <table class="qms-table">
              <thead>
                <tr><th>编号</th><th>问题</th><th>责任人</th><th>计划完成</th><th>进度</th><th>状态</th></tr>
              </thead>
              <tbody>
                <tr v-for="c in corrective" :key="c.id">
                  <td>{{ c.id }}</td>
                  <td>{{ c.issue }}</td>
                  <td class="muted">{{ c.owner }}</td>
                  <td>{{ c.due }}</td>
                  <td>{{ c.progress }}%</td>
                  <td><span class="qms-pill" :class="{ r: c.st === '超期', y: c.st === '进行中', g: c.st === '待启动' }">{{ c.st }}</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </template>

    <div v-else class="qms-card">
      <div class="qms-card__header"><h3>不良管理（只读概览）</h3></div>
      <div class="qms-card__body">
        <div class="kv">
          <span class="k">今日不良数</span><span>{{ kpi.defectCnt }} 件</span>
          <span class="k">不良率</span><span>{{ kpi.defectRate }}%</span>
          <span class="k">PPM</span><span>{{ kpi.ppm }}</span>
          <span class="k">报废率</span><span>{{ kpi.scrap }}%</span>
          <span class="k">说明</span><span>本模块概览不良数据，供跨模块了解</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.ncm-dash { display: flex; flex-direction: column; gap: 14px; }

.chart { width: 100%; height: 260px; }
.chart.lg { height: 320px; }
.chart.sm { height: 220px; }

.list-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 14px;
  font-size: 12.5px;
  border-bottom: 1px solid #eef4fb;
  .grow { flex: 1; color: #1f2d3d; }
  .meta { color: #5a6b7e; font-weight: 600; }
}

.qms-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12.5px;
  th, td { padding: 8px 10px; text-align: left; border-bottom: 1px solid #eef4fb; }
  th { color: #5a6b7e; font-weight: 600; background: #f7fafd; }
  .muted { color: #5a6b7e; }
}

.kv {
  display: grid;
  grid-template-columns: 96px 1fr;
  gap: 8px 10px;
  font-size: 12.5px;
  .k { color: #5a6b7e; }
}
</style>
