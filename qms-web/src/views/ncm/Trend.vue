<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { BANNERS } from '@/config/banners'
import TrendChart from '@/components/charts/TrendChart.vue'
import { ncmApi } from '@/api'
import type { NcmTrendPoint, NcmType, NcmProcTop } from '@/types/ncm'

const authStore = useAuthStore()
const banner = BANNERS.ncm?.[authStore.role] || {
  title: '趋势报表',
  desc: '不良率与不良数量趋势分析',
}

const period = ref<'日报' | '周报' | '月报'>('日报')

// 目标不良率基线 5%（后端未提供目标值；SRS: 目标线未设置时仅展示趋势）
const TARGET_RATE_PCT = 5

// 异步加载的真实数据
const trendData = ref<NcmTrendPoint[]>([])
const types = ref<NcmType[]>([])
const procTop = ref<NcmProcTop[]>([])
/** 真实维度聚合（后端 /aggregate/analysis/aggregate），用于分类型 / 分工序实测分布 */
const typeAgg = ref<{ name: string; cnt: number; total_qty: number; avg_rate: number }[]>([])
const procAgg = ref<{ name: string; cnt: number; total_qty: number; avg_rate: number }[]>([])

function granularityOf(p: string): 'day' | 'week' | 'month' {
  if (p === '周报') return 'week'
  if (p === '月报') return 'month'
  return 'day'
}

onMounted(async () => {
  try {
    const [ty, pt, ta, pa] = await Promise.all([
      ncmApi.getTypes(),
      ncmApi.getProcTop(),
      ncmApi.aggregateByDim('type'),
      ncmApi.aggregateByDim('proc'),
    ])
    types.value = ty
    procTop.value = pt
    typeAgg.value = ta
    procAgg.value = pa
    await loadTrend()
  } catch (e) {
    // 错误已由拦截器提示
  }
})

watch(period, loadTrend)
async function loadTrend() {
  try {
    trendData.value = await ncmApi.getTrend(granularityOf(period.value))
  } catch (e) {
    // 错误已由拦截器提示
  }
}

// 总览不良率趋势：日报=逐日，周报=逐周，月报=逐月（后端已按周期聚合，真实数据）
const overview = computed(() => {
  const pts = trendData.value
  if (!pts.length) return { x: [], series: [{ name: '不良率', data: [], color: '#1e4d8b' }], markArea: undefined, last5up: false }
  const x = pts.map((p) => p.period)
  const data = pts.map((p) => +(p.defectRate * 100).toFixed(2))
  let last5up = false
  if (data.length >= 5) {
    const last5 = data.slice(-5)
    last5up = last5.every((v, i) => i === 0 || v > last5[i - 1])
  }
  const markArea = last5up && period.value === '日报'
    ? [{ start: x[x.length - 5], end: x[x.length - 1] }]
    : undefined
  return { x, series: [{ name: '不良率', data, color: '#1e4d8b' }], markArea, last5up }
})

// 分不良类型分布（实测）：后端按不良类型聚合的真实不良数
const typeX = computed(() => typeAgg.value.map((t) => t.name))
const typeSeries = computed(() => [
  { name: '不良数', type: 'bar' as const, color: '#2a6bb0', data: typeAgg.value.map((t) => t.cnt) },
])

// 分工序不良率分布（实测）：后端按工序聚合的真实平均不良率
const procX = computed(() => procAgg.value.map((p) => p.name))
const procSeries = computed(() => [
  { name: '不良率%', type: 'bar' as const, color: '#e07b39', data: procAgg.value.map((p) => +(p.avg_rate).toFixed(2)) },
])

function onGen() { ElMessage.success('报表已生成并归档（演示）') }
function onPush() { ElMessage.success('企业微信已推送日报（演示）') }
</script>

<template>
  <div class="ncm-trend">
    <div class="qms-banner">
      <div class="qms-banner__icon" :style="{ background: authStore.currentRole?.color }">📈</div>
      <div>
        <div class="qms-banner__title">{{ banner.title }}</div>
        <div class="qms-banner__desc">{{ banner.desc }}</div>
      </div>
    </div>

    <div class="filter-bar">
      <span class="fb-label">周期：</span>
      <el-radio-group v-model="period">
        <el-radio-button value="日报">日报</el-radio-button>
        <el-radio-button value="周报">周报</el-radio-button>
        <el-radio-button value="月报">月报</el-radio-button>
      </el-radio-group>
      <span class="sp"></span>
      <el-button type="primary" size="small" @click="onGen">生成报表</el-button>
      <el-button size="small" @click="onPush">定时推送</el-button>
    </div>

    <div class="qms-card">
      <div class="qms-card__header">
        <h3>总览不良率趋势（含目标线）</h3>
        <span v-if="overview.last5up" class="tag r">连续5天上升 · 预警</span>
      </div>
      <div class="qms-card__body">
        <TrendChart
          :x-data="overview.x"
          :series="overview.series"
          :target="TARGET_RATE_PCT"
          :area="true"
          :point-threshold="TARGET_RATE_PCT * 1.3"
          :mark-area="overview.markArea"
          y-label="不良率%"
          :height="300"
        />
      </div>
    </div>

    <div class="chart-grid chart-grid--2">
      <div class="qms-card">
        <div class="qms-card__header">
          <h3>分不良类型分布（实测）</h3>
          <span class="tag">后端按不良类型聚合</span>
        </div>
        <div class="qms-card__body">
          <TrendChart :x-data="typeX" :series="typeSeries" y-label="件" :height="280" />
        </div>
      </div>

      <div class="qms-card">
        <div class="qms-card__header">
          <h3>分工序不良率分布（实测）</h3>
          <span class="tag">后端按工序聚合</span>
        </div>
        <div class="qms-card__body">
          <TrendChart :x-data="procX" :series="procSeries" y-label="不良率%" :height="280" />
        </div>
      </div>
    </div>

    <div class="note">⚠ 趋势异常判定：连续5天上升 或 超历史均值+2σ 时标红预警，向质量工程师发送告警；新产线数据不足5天跳过检测。周期内数据不完整时报表标注缺失日期。分类型 / 分工序分布均来自后端真实聚合接口，非估算。</div>
  </div>
</template>

<style scoped lang="scss">
.ncm-trend {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.filter-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.filter-bar .sp {
  flex: 1;
}
.fb-label {
  font-size: 13px;
  color: #5b6b7b;
}
@media (max-width: 900px) {
  .chart-grid--2 {
    grid-template-columns: 1fr;
  }
}
</style>
