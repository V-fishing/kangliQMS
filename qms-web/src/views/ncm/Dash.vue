<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useCompanyStore } from '@/stores/company'
import { BANNERS } from '@/config/banners'
import { ncmApi } from '@/api'
import { StatCards, ChartCard } from '@/components/page'
import type { NcmKpi, NcmPareto, NcmTrend30, NcmType, NcmProcTop, NcmCompare, NcmShift, NcmRealtime, NcmCorrective } from '@/types/ncm'

const auth = useAuthStore()
const company = useCompanyStore()
const banner = BANNERS.ncm?.[auth.role] || { title: '不良管理 NCM', desc: '不良看板、Pareto 分析、趋势监控、8D 整改' }

const kpi = ref<NcmKpi>({ defectCnt: 0, defectRate: 0, ppm: 0, scrap: 0 })
const pareto = ref<NcmPareto[]>([])
const trend30 = ref<NcmTrend30>({ last5up: false, over2sigma: false, vals: [], target: 0.85 })
const types = ref<NcmType[]>([])
const procTop = ref<NcmProcTop[]>([])
const compare = ref<NcmCompare>({ labels: [], cur: [], prev: [], yoy: [] })
const shifts = ref<NcmShift[]>([])
const realtime = ref<NcmRealtime>({ shift: '', cnt: 0, rate: 0, top3: [] })
const corrective = ref<NcmCorrective[]>([])

const loading = ref(true)

onMounted(async () => {
  try {
    const [k, pa, tr, ty, pt, cp, sh, rt, co] = await Promise.all([
      ncmApi.getKpi(), ncmApi.getPareto(), ncmApi.getTrend30(),
      ncmApi.getTypes(), ncmApi.getProcTop(), ncmApi.getCompare(),
      ncmApi.getShifts(), ncmApi.getRealtime(), ncmApi.getCorrective(),
    ])
    kpi.value = k; pareto.value = pa; trend30.value = tr; types.value = ty
    procTop.value = pt; compare.value = cp; shifts.value = sh; realtime.value = rt; corrective.value = co
  } finally { loading.value = false }
})

// ── 图表 option ──

function paretoOption(): any {
  const sorted = [...pareto.value].sort((a, b) => b.v - a.v)
  const total = sorted.reduce((s, d) => s + d.v, 0) || 1
  let acc = 0
  const cum = sorted.map((d) => { acc += d.v; return +(acc / total * 100).toFixed(1) })
  return barLineOption({
    xData: sorted.map((d) => d.name), barData: sorted.map((d) => d.v), barName: '不良数',
    lineData: cum, lineName: '累积%', markLine80: true,
  })
}

function trendOption(): any {
  const t = trend30.value
  return trendOpt({ days: Array.from({ length: t.vals.length }, (_, i) => i + 1), vals: t.vals, target: t.target, last5up: t.last5up })
}

function roseOption(): any {
  return { tooltip: { trigger: 'item' }, legend: { bottom: 0, textStyle: { fontSize: 11 } },
    series: [{ type: 'pie', roseType: 'radius', radius: ['25%', '68%'], center: ['50%', '46%'],
      data: types.value.map((d) => ({ name: d.name, value: d.v })) }] }
}

function vbarOption(): any {
  return vbarOpt({ xData: procTop.value.map((d) => d.proc), data: procTop.value.map((d) => d.rate), name: '不良率%' })
}

function compareOption(): any {
  const c = compare.value
  return { tooltip: { trigger: 'axis' }, legend: { data: ['本月','上月','去年同月'], bottom: 0 },
    grid: { left: 42, right: 18, top: 24, bottom: 40 },
    xAxis: { type: 'category', data: c.labels }, yAxis: { type: 'value', name: '不良率%' },
    series: [
      { name: '本月', type: 'bar', data: c.cur, barWidth: '20%', itemStyle: { color: '#1e4d8b' } },
      { name: '上月', type: 'bar', data: c.prev, barWidth: '20%', itemStyle: { color: '#5b8def' } },
      { name: '去年同月', type: 'bar', data: c.yoy, barWidth: '20%', itemStyle: { color: '#a0c4f0' } },
    ] }
}

function shiftOption(): any {
  return comboOption({ xData: shifts.value.map((d) => d.shift), barData: shifts.value.map((d) => d.rate), barName: '不良率%', lineData: shifts.value.map((d) => d.cnt), lineName: '不良数' })
}

const isQManager = computed(() => auth.role === 'qmanager')

// ── 共享 chart option 工厂 ──
import { barLineOption, trendOption as trendOpt, comboOption, vbarOption as vbarOpt } from '@/utils/echarts'
</script>

<template>
  <div class="dash">
    <!-- Banner -->
    <div class="qms-banner">
      <div class="qms-banner__icon" :style="{ background: auth.currentRole?.color }">③</div>
      <div>
        <div class="qms-banner__title">{{ banner.title }}</div>
        <div class="qms-banner__desc">{{ banner.desc }} · {{ company.contextLabel() }}</div>
      </div>
    </div>

    <!-- KPI -->
    <StatCards :items="[
      { label:'今日不良数', value:kpi.defectCnt, unit:'件', color:'#c0392b' },
      { label:'不良率', value:kpi.defectRate, unit:'%', color:'#d4a017' },
      { label:'PPM', value:kpi.ppm, color:'#d4a017' },
      { label:'报废率', value:kpi.scrap, unit:'%', color:'#16a085' },
    ]" :loading="loading" />

    <!-- Charts Grid -->
    <div class="grid-2">
      <ChartCard title="N1 不良 Pareto 图" subtitle="80% 关键类型已标注" :option="paretoOption()" height="340" :loading="loading" />
      <ChartCard :title="'N7 实时不良看板'" :subtitle="realtime.shift" :option="null" height="340">
        <div class="realtime-inner">
          <StatCards :items="[
            { label:'当班不良', value:realtime.cnt, unit:'件', color:'#c0392b' },
            { label:'不良率', value:realtime.rate, unit:'%', color:'#d4a017' },
          ]" />
          <div class="top3"><div v-for="(t,i) in realtime.top3" :key="i" class="top3-row">
            <span class="pill" :class="i===0?'r':'y'">TOP{{i+1}}</span>
            <span class="grow">{{t.n}}</span><span class="meta">{{t.c}}件</span>
          </div></div>
        </div>
      </ChartCard>
    </div>

    <div class="grid-3">
      <ChartCard title="N2 不良率趋势(30天)" subtitle="预警" :option="trendOption()" :loading="loading" />
      <ChartCard title="N3 不良类型分布" :option="roseOption()" :loading="loading" />
      <ChartCard title="N4 工序不良率 TOP5" :option="vbarOption()" :loading="loading" />
    </div>

    <div class="grid-2">
      <ChartCard title="N5 环比/同比" subtitle="本月/上月/去年同月" :option="compareOption()" :loading="loading" />
      <ChartCard title="N6 班次不良对比" :option="shiftOption()" :loading="loading" />
    </div>

    <!-- 质量主管专属 -->
    <template v-if="isQManager">
      <div class="grid-2">
        <ChartCard title="环比/同比分析" :option="compareOption()" height="260" :loading="loading" />
        <div class="table-card">
          <div class="tbl-head"><h4>纠正措施跟踪</h4><span class="tag r">{{corrective.filter(c=>c.st==='超期').length}}超期</span></div>
          <el-table :data="corrective" size="small" stripe>
            <el-table-column prop="id" label="编号" width="70" />
            <el-table-column prop="issue" label="问题" />
            <el-table-column prop="owner" label="责任人" width="80" />
            <el-table-column prop="due" label="截止日期" width="100" />
            <el-table-column prop="progress" label="进度" width="70"><template #default="{row}">{{row.progress}}%</template></el-table-column>
            <el-table-column prop="st" label="状态" width="70">
              <template #default="{row}"><el-tag :type="row.st==='超期'?'danger':row.st==='进行中'?'warning':'info'" size="small">{{row.st}}</el-tag></template>
            </el-table-column>
          </el-table>
        </div>
      </div>
    </template>
    <div v-else class="readonly-note">
      <el-alert type="info" :closable="false" title="只读概览"
        :description="`今日不良 ${kpi.defectCnt} 件 · 不良率 ${kpi.defectRate}% · PPM ${kpi.ppm} · 报废率 ${kpi.scrap}%`" />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.dash { display: flex; flex-direction: column; gap: 14px; }
.grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }

.realtime-inner { padding: 8px; }
.top3 { margin-top: 8px; }
.top3-row { display: flex; align-items: center; gap: 10px; padding: 6px 0; font-size: 12.5px; border-bottom: 1px solid #eef4fb; .grow { flex:1; color:#1f2d3d; } .meta { color:#5a6b7e; font-weight:600; } }
.pill { font-size:10px; padding:1px 6px; border-radius:8px; font-weight:600; &.r { background:#fdecea; color:#c0392b; } &.y { background:#fef3e2; color:#d4a017; } }

.table-card { background:#fff; border-radius:8px; box-shadow:0 1px 4px rgba(0,0,0,.04); overflow:hidden; }
.tbl-head { display:flex; align-items:center; gap:10px; padding:12px 16px; border-bottom:1px solid #eef1f5; h4 { margin:0; font-size:14px; font-weight:600; } .tag { font-size:11px; padding:1px 8px; border-radius:10px; &.r { background:#fdecea; color:#c0392b; } } }

.readonly-note { padding: 8px 0; }

.qms-banner { display:flex; align-items:center; gap:12px; background:#fff; border-radius:8px; padding:14px 18px; box-shadow:0 1px 4px rgba(0,0,0,.04); }
.qms-banner__icon { width:36px; height:36px; border-radius:8px; display:flex; align-items:center; justify-content:center; color:#fff; font-weight:700; font-size:18px; flex-shrink:0; }
.qms-banner__title { font-size:15px; font-weight:600; color:#1f2d3d; }
.qms-banner__desc { font-size:12px; color:#8a9bb0; margin-top:2px; }

@media (max-width: 1200px) { .grid-3 { grid-template-columns: 1fr; } .grid-2 { grid-template-columns: 1fr; } }
</style>
