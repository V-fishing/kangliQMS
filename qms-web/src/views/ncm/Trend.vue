<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { BANNERS } from '@/mock/roles'
import TrendChart from '@/components/charts/TrendChart.vue'
import { ncmTrend30, ncmTypes, ncmProcTop } from '@/mock/ncm'

const authStore = useAuthStore()
const banner = BANNERS.ncm?.[authStore.role] || {
  title: '趋势报表',
  desc: '不良率与不良数量趋势分析',
}

const period = ref<'日报' | '周报' | '月报'>('日报')

const typeColors = ['#1e4d8b', '#5b8def', '#8e44ad', '#d4a017', '#2f7d32', '#c0392b']
const procColors = ['#c0392b', '#d4a017', '#1e4d8b', '#2f7d32', '#8e44ad']

// 总览不良率趋势：按周期聚合 ncmTrend30.vals（日报=逐日，周报=周均，月报=月均）
const overview = computed(() => {
  const vals = ncmTrend30.vals
  if (period.value === '周报') {
    const weeks = 5
    const bucket = Math.ceil(vals.length / weeks)
    const x: string[] = []
    const data: number[] = []
    for (let i = 0; i < weeks; i++) {
      const slice = vals.slice(i * bucket, (i + 1) * bucket)
      if (!slice.length) break
      x.push(`第${i + 1}周`)
      data.push(+(slice.reduce((s, v) => s + v, 0) / slice.length).toFixed(2))
    }
    return { x, series: [{ name: '不良率', data, color: '#1e4d8b' }], markArea: undefined }
  }
  if (period.value === '月报') {
    const months = 3
    const bucket = Math.ceil(vals.length / months)
    const x: string[] = []
    const data: number[] = []
    for (let i = 0; i < months; i++) {
      const slice = vals.slice(i * bucket, (i + 1) * bucket)
      if (!slice.length) break
      x.push(`第${i + 1}月`)
      data.push(+(slice.reduce((s, v) => s + v, 0) / slice.length).toFixed(2))
    }
    return { x, series: [{ name: '不良率', data, color: '#1e4d8b' }], markArea: undefined }
  }
  // 日报：30 日逐日，连续 5 天上升时高亮末 5 日区间
  const x = vals.map((_, i) => String(i + 1))
  const markArea = ncmTrend30.last5up
    ? [{ start: String(vals.length - 4), end: String(vals.length) }]
    : undefined
  return { x, series: [{ name: '不良率', data: vals, color: '#1e4d8b' }], markArea }
})

// 分不良类型趋势（堆叠）：周维度，参照原型 t.v*2/3/2/4 缩放
const typeX = ['第1周', '第2周', '第3周', '第4周']
const typeSeries = ncmTypes.map((t, i) => ({
  name: t.name,
  type: 'bar' as const,
  stack: 'a',
  color: typeColors[i % typeColors.length],
  data: [t.v * 2, t.v * 3, t.v * 2, t.v * 4].map((v) => Math.round(v / 4)),
}))

// 分工序趋势 TOP5：周维度，参照原型 rate*0.8/1/1.1/0.9 波动
const procX = ['W1', 'W2', 'W3', 'W4']
const procSeries = ncmProcTop.map((p, i) => ({
  name: p.proc,
  type: 'line' as const,
  color: procColors[i % procColors.length],
  data: [p.rate * 0.8, p.rate, p.rate * 1.1, p.rate * 0.9].map((v) => +v.toFixed(2)),
}))

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
        <span v-if="ncmTrend30.last5up" class="tag r">连续5天上升 · 预警</span>
      </div>
      <div class="qms-card__body">
        <TrendChart
          :x-data="overview.x"
          :series="overview.series"
          :target="ncmTrend30.target"
          :area="true"
          :point-threshold="ncmTrend30.target * 1.3"
          :mark-area="overview.markArea"
          y-label="不良率%"
          :height="300"
        />
      </div>
    </div>

    <div class="chart-grid chart-grid--2">
      <div class="qms-card">
        <div class="qms-card__header">
          <h3>分不良类型趋势（堆叠）</h3>
          </div>
        <div class="qms-card__body">
          <TrendChart :x-data="typeX" :series="typeSeries" y-label="件" :height="280" />
        </div>
      </div>

      <div class="qms-card">
        <div class="qms-card__header">
          <h3>分工序趋势（TOP5）</h3>
          </div>
        <div class="qms-card__body">
          <TrendChart :x-data="procX" :series="procSeries" y-label="不良率%" :height="280" />
        </div>
      </div>
    </div>

    <div class="note">⚠ 趋势异常判定：连续5天上升 或 超历史均值+2σ 时标红预警，向质量工程师发送告警；新产线数据不足5天跳过检测。周期内数据不完整时报表标注缺失日期。</div>
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
