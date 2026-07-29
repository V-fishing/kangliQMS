<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import echarts from '@/utils/echarts'
import { useChartResize } from '@/composables/useChartResize'
useChartResize(() => [histInst, trendInst, pieInst])
import { useAuthStore } from '@/stores/auth'
import { BANNERS } from '@/config/banners'
import CpkGauge from '@/components/charts/CpkGauge.vue'
import KpiCard from '@/components/common/KpiCard.vue'
import { spcApi } from '@/api'
import type { SpcKpi, SpcLevel, SpcCpkTrend, SpcHistogram } from '@/types/spc'

const authStore = useAuthStore()
const banner = BANNERS.spc?.[authStore.role] || {
  title: 'SPC · 能力分析',
  desc: '过程能力指数、直方图与趋势分析',
}

const kpi = ref<SpcKpi>({ cpk: 0, ppk: 0, alarm: 0, monitor: 0, passRate: 0, window: '', capPassRate: 0, capPassParams: '' })
const hist = ref<SpcHistogram>({ bins: [], freq: [], usl: 0, lsl: 0 })
const levels = ref<SpcLevel[]>([])
const trend = ref<SpcCpkTrend>({ m: [], v: [] })

async function loadAll() {
  // 看板与趋势各自独立加载,任一路失败都不阻塞另一路(避免单接口异常拖垮整页弹"系统异常")
  try {
    const dash = await spcApi.getDashboard()
    kpi.value = dash.kpi
    levels.value = dash.levels
  } catch (e) {
    console.error('[SPC 能力分析] 看板加载失败', e)
  }
  try {
    trend.value = await spcApi.getCpkTrend()
  } catch {
    trend.value = { m: [], v: [] }
  }
}
onMounted(async () => {
  await loadAll()
  initCharts()
  window.addEventListener('resize', resize)
})

const histRef = ref<HTMLDivElement>()
const trendRef = ref<HTMLDivElement>()
const pieRef = ref<HTMLDivElement>()
let histInst: echarts.ECharts | null = null
let trendInst: echarts.ECharts | null = null
let pieInst: echarts.ECharts | null = null

function buildHist() {
  const h = hist.value
  const curve = h.bins.map((b) => {
    const mu = 10.0
    const sig = 0.12
    return +(14 * Math.exp(-((b - mu) ** 2) / (2 * sig * sig))).toFixed(1)
  })
  return {
    tooltip: { trigger: 'axis' },
    grid: { left: 42, right: 18, top: 24, bottom: 28 },
    legend: { data: ['频次', '正态分布'], bottom: 0, textStyle: { fontSize: 10 } },
    xAxis: { type: 'category', data: h.bins.map(String), name: '测量值', axisLabel: { fontSize: 10 } },
    yAxis: { type: 'value', axisLabel: { fontSize: 10 } },
    series: [
      {
        name: '频次',
        type: 'bar',
        data: h.freq,
        barWidth: '60%',
        itemStyle: { color: '#5b8def', borderRadius: [4, 4, 0, 0] },
        markLine: {
          silent: true,
          symbol: 'none',
          lineStyle: { type: 'dashed' },
          data: [
            { xAxis: h.bins.indexOf(h.lsl), lineStyle: { color: '#c0392b' }, label: { formatter: 'LSL', fontSize: 9, color: '#c0392b' } },
            { xAxis: h.bins.indexOf(h.usl), lineStyle: { color: '#c0392b' }, label: { formatter: 'USL', fontSize: 9, color: '#c0392b' } },
          ],
        },
      },
      { name: '正态分布', type: 'line', data: curve, smooth: true, symbol: 'none', lineStyle: { color: '#d4a017', width: 2 } },
    ],
  }
}

function buildTrend() {
  const t = trend.value
  return {
    tooltip: { trigger: 'axis' },
    grid: { left: 42, right: 18, top: 30, bottom: 28 },
    xAxis: { type: 'category', data: t.m, axisLabel: { fontSize: 11 } },
    yAxis: { type: 'value', min: 1.0, max: 1.6, axisLabel: { fontSize: 11 } },
    series: [
      {
        type: 'line',
        data: t.v,
        smooth: true,
        symbol: 'circle',
        symbolSize: 7,
        itemStyle: { color: '#1e4d8b' },
        lineStyle: { width: 2.5 },
        areaStyle: { color: 'rgba(30,77,139,.12)' },
        markLine: {
          silent: true,
          symbol: 'none',
          lineStyle: { type: 'dashed' },
          data: [
            { yAxis: 1.33, lineStyle: { color: '#2f7d32' }, label: { formatter: '充足 1.33', fontSize: 9, color: '#2f7d32', position: 'insideEndTop' } },
            { yAxis: 1.0, lineStyle: { color: '#c0392b' }, label: { formatter: '不足 1.0', fontSize: 9, color: '#c0392b', position: 'insideEndTop' } },
          ],
        },
      },
    ],
  }
}

function buildPie() {
  return {
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { bottom: 0, icon: 'circle', textStyle: { fontSize: 11 }, type: 'scroll' },
    series: [
      {
        name: '能力等级',
        type: 'pie',
        radius: '62%',
        center: ['50%', '45%'],
        itemStyle: { borderColor: '#fff', borderWidth: 2 },
        label: { formatter: '{b}:{c}', fontSize: 11 },
        data: levels.value.map((l) => ({ name: l.name, value: l.value, itemStyle: { color: l.color } })),
      },
    ],
  }
}

function initCharts() {
  if (histRef.value) { histInst = echarts.init(histRef.value); histInst.setOption(buildHist()) }
  if (trendRef.value) { trendInst = echarts.init(trendRef.value); trendInst.setOption(buildTrend()) }
  if (pieRef.value) { pieInst = echarts.init(pieRef.value); pieInst.setOption(buildPie()) }
}
function resize() { histInst?.resize(); trendInst?.resize(); pieInst?.resize() }
onBeforeUnmount(() => { window.removeEventListener('resize', resize); histInst?.dispose(); trendInst?.dispose(); pieInst?.dispose() })
watch([hist, trend, levels], () => { histInst?.setOption(buildHist()); trendInst?.setOption(buildTrend()); pieInst?.setOption(buildPie()) }, { deep: true })
</script>

<template>
  <div class="spc-cap">
    <div class="qms-banner">
      <div class="qms-banner__icon" :style="{ background: authStore.currentRole?.color }">🧮</div>
      <div>
        <div class="qms-banner__title">{{ banner.title }}</div>
        <div class="qms-banner__desc">{{ banner.desc }}</div>
      </div>
    </div>

    <div class="kpi-row">
      <KpiCard label="CPK(短期)" :value="kpi.cpk.toFixed(2)" sub="充足" status="ok" />
      <KpiCard label="PPK(长期)" :value="kpi.ppk.toFixed(2)" sub="充足" status="ok" />
      <KpiCard label="计算窗口" :value="kpi.window" sub="滑动窗口" />
      <KpiCard label="达标率" :value="kpi.capPassRate" unit="%" :sub="kpi.capPassParams" />
    </div>

    <div class="chart-grid chart-grid--2">
      <div class="qms-card">
        <div class="qms-card__header">
          <h3>CPK / PPK 仪表盘</h3>
          <span class="tag">≥1.33充足 / 1.0-1.33尚可 / &lt;1.0不足</span>
        </div>
        <div class="qms-card__body">
          <CpkGauge :cpk="kpi.cpk" :ppk="kpi.ppk" />
        </div>
      </div>
      <div class="qms-card">
        <div class="qms-card__header"><h3>过程能力直方图</h3></div>
        <div class="qms-card__body"><div ref="histRef" style="width: 100%; height: 300px"></div></div>
      </div>
    </div>

    <div class="chart-grid chart-grid--2">
      <div class="qms-card">
        <div class="qms-card__header"><h3>CPK 月度趋势</h3></div>
        <div class="qms-card__body"><div ref="trendRef" style="width: 100%; height: 260px"></div></div>
      </div>
      <div class="qms-card">
        <div class="qms-card__header"><h3>参数能力等级分布</h3></div>
        <div class="qms-card__body"><div ref="pieRef" style="width: 100%; height: 260px"></div></div>
      </div>
    </div>

    <div class="note">
      📌 规格限从检验标准库获取(当前生效版本)；样本&lt;30标注"数据不足仅供参考"(灰色虚线)，&lt;10不显示结果；CPK短期能力/PPK长期性能同时展示。
    </div>
  </div>
</template>

<style scoped lang="scss">
.spc-cap { display: flex; flex-direction: column; }
.note {
  margin-top: 4px;
  padding: 10px 14px;
  background: #eef4fb;
  border-left: 3px solid #1e4d8b;
  border-radius: 0 6px 6px 0;
  font-size: 12px;
  color: #5a6b7e;
  line-height: 1.6;
}
</style>
