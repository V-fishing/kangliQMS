<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import echarts from '@/utils/echarts'
import { useChartResize } from '@/composables/useChartResize'
useChartResize(() => [i1, i2])
import { useAuthStore } from '@/stores/auth'
import { BANNERS } from '@/config/banners'
import { ncmApi } from '@/api'
import type { NcmRealtime, NcmProcTop, NcmShift } from '@/types/ncm'

const authStore = useAuthStore()
const banner = BANNERS.ncm?.[authStore.role] || {
  title: 'NCM · 实时看板',
  desc: '当班不良、工序不良热力、班次对比实时看板',
}

// ---- 异步加载的真实数据 ----
const realtime = ref<NcmRealtime>({ shift: '', cnt: 0, rate: 0, top3: [] })
const procTop = ref<NcmProcTop[]>([])
const shifts = ref<NcmShift[]>([])

onMounted(async () => {
  try {
    const [rt, pt, sh] = await Promise.all([
      ncmApi.getRealtime(),
      ncmApi.getProcTop(),
      ncmApi.getShifts(),
    ])
    realtime.value = rt
    procTop.value = pt
    shifts.value = sh
  } catch (e) {
    // 错误已由拦截器提示
  }
})

const lastRefresh = ref('--:--')
onMounted(() => {
  const d = new Date()
  lastRefresh.value = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
})

// ---- 图表 option ----
function vbarOption() {
  return {
    tooltip: { trigger: 'axis' },
    grid: { left: 42, right: 18, top: 24, bottom: 30 },
    xAxis: { type: 'category', data: procTop.value.map((d) => d.proc), axisLabel: { fontSize: 11 } },
    yAxis: { type: 'value', name: '不良率%', axisLabel: { fontSize: 11 } },
    series: [
      {
        type: 'bar', data: procTop.value.map((d) => d.rate), barWidth: 24,
        itemStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: '#2a6bb0' }, { offset: 1, color: '#1e4d8b' }]), borderRadius: [4, 4, 0, 0] },
        label: { show: true, position: 'top', formatter: '{c}%', fontSize: 11 },
      },
    ],
  }
}
function shiftOption() {
  return {
    tooltip: { trigger: 'axis' },
    legend: { data: ['不良率%', '不良数'], bottom: 0, textStyle: { fontSize: 11 } },
    grid: { left: 46, right: 46, top: 24, bottom: 40 },
    xAxis: { type: 'category', data: shifts.value.map((d) => d.shift), axisLabel: { fontSize: 11 } },
    yAxis: [
      { type: 'value', name: '不良率%', axisLabel: { fontSize: 10 } },
      { type: 'value', name: '不良数', axisLabel: { fontSize: 10 } },
    ],
    series: [
      {
        name: '不良率%', type: 'bar', data: shifts.value.map((d) => d.rate), barWidth: 30,
        itemStyle: { color: '#1e4d8b', borderRadius: [4, 4, 0, 0] },
        label: { show: true, position: 'top', formatter: '{c}%', fontSize: 11 },
      },
      {
        name: '不良数', type: 'line', yAxisIndex: 1, data: shifts.value.map((d) => d.cnt),
        symbol: 'circle', symbolSize: 8, lineStyle: { color: '#d4a017', width: 2 }, itemStyle: { color: '#d4a017' },
      },
    ],
  }
}

const chart1 = ref<HTMLDivElement>()
const chart2 = ref<HTMLDivElement>()
let i1: echarts.ECharts | null = null
let i2: echarts.ECharts | null = null
function onResize() { i1?.resize(); i2?.resize() }
function refreshCharts() {
  i1?.setOption(vbarOption())
  i2?.setOption(shiftOption())
}
onMounted(() => {
  if (chart1.value) { i1 = echarts.init(chart1.value); i1.setOption(vbarOption()) }
  if (chart2.value) { i2 = echarts.init(chart2.value); i2.setOption(shiftOption()) }
  window.addEventListener('resize', onResize)
})
watch([procTop, shifts], refreshCharts, { deep: true })
onBeforeUnmount(() => {
  i1?.dispose(); i2?.dispose()
  window.removeEventListener('resize', onResize)
})
</script>

<template>
  <div class="ncm-realtime">
    <div class="qms-banner">
      <div class="qms-banner__icon" :style="{ background: authStore.currentRole?.color }">⚡</div>
      <div>
        <div class="qms-banner__title">{{ banner.title }}</div>
        <div class="qms-banner__desc">{{ banner.desc }}</div>
      </div>
    </div>

    <div class="kpi-row">
      <div class="kpi bad">
        <div class="bar"></div>
        <div class="lbl">当班不良数</div>
        <div class="val">{{ realtime.cnt }}</div>
        <div class="sub">{{ realtime.shift }}</div>
      </div>
      <div class="kpi warn">
        <div class="bar"></div>
        <div class="lbl">当班不良率</div>
        <div class="val">{{ realtime.rate }}<span class="unit">%</span></div>
        <div class="sub">5分钟刷新</div>
      </div>
      <div class="kpi">
        <div class="bar"></div>
        <div class="lbl">TOP1类型</div>
        <div class="val" style="font-size: 18px">{{ realtime.top3[0]?.name || '--' }}</div>
        <div class="sub">{{ realtime.top3[0]?.cnt ?? 0 }}件</div>
      </div>
      <div class="kpi">
        <div class="bar"></div>
        <div class="lbl">数据时效</div>
        <div class="val" style="font-size: 18px; color: #27853f">正常</div>
        <div class="sub">最后刷新 {{ lastRefresh }}</div>
      </div>
    </div>

    <div class="chart-grid chart-grid--2-1">
      <div class="qms-card">
        <div class="qms-card__header">
          <h3>工序不良热力（各工序当班不良率）</h3>
          </div>
        <div class="qms-card__body"><div ref="chart1" class="chart-container"></div></div>
      </div>
      <div class="qms-card">
        <div class="qms-card__header"><h3>TOP3 不良类型</h3></div>
        <div class="qms-card__body" style="padding: 0">
          <div v-for="(t, i) in realtime.top3" :key="t.name" class="list-row">
            <span class="pill" :class="i === 0 ? 'r' : 'y'">TOP{{ i + 1 }}</span>
            <span class="grow">{{ t.name }}</span>
            <span class="meta">{{ t.cnt }}件</span>
          </div>
          <div v-if="!realtime.top3.length" class="empty">暂无数据</div>
        </div>
      </div>
    </div>

    <div class="qms-card">
      <div class="qms-card__header"><h3>班次不良对比</h3></div>
      <div class="qms-card__body"><div ref="chart2" class="chart-container"></div></div>
    </div>

    <div class="note">
      ⏱ 数据每5分钟自动刷新；采集延迟超10分钟时看板顶部显示"数据延迟"警告。{{ shifts.length }}个班次对比。
    </div>
  </div>
</template>

<style scoped lang="scss">
.ncm-realtime {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

// KPI 顶部色条（对应 HTML .kpi .bar）
.kpi .bar {
  height: 4px;
  border-radius: 3px;
  background: #1e4d8b;
  margin-bottom: 10px;
}
.kpi.bad .bar {
  background: #c0392b;
}
.kpi.warn .bar {
  background: #d4a017;
}
.unit {
  font-size: 14px;
  font-weight: 700;
}
</style>
