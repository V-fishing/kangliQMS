<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { ElMessage } from 'element-plus'
import echarts from '@/utils/echarts'
import { useAuthStore } from '@/stores/auth'
import { BANNERS } from '@/mock/roles'

const authStore = useAuthStore()
const banner = BANNERS.ncm?.[authStore.role] || {
  title: 'NCM · 环比同比',
  desc: '按工作日归一化的环比 / 同比 / MTD 不良对比',
}

// ---- 对比模式（对齐 HTML renderNcmCompare 的 seg 控件） ----
const modes = ['周环比', '月环比', '月同比', '年同比', 'MTD月至今'] as const
const mode = ref<typeof modes[number]>('周环比')
function setCmp(name: typeof modes[number]) {
  mode.value = name
  ElMessage({ message: `${name}视图（演示）`, duration: 1200 })
}

// ---- 数据（对齐 HTML MOCK.ncm.compare 与 g-3 三个 KV 面板） ----
const compare = {
  labels: ['第一周', '第二周', '第三周', '第四周'],
  cur: [1.6, 1.9, 2.1, 1.82],
  prev: [1.7, 1.8, 1.6, 1.5],
  yoy: [2.1, 2.0, 1.9, 1.8],
}
const kvCards = [
  { title: '周环比', rows: [['本周', '1.82%'], ['上周', '1.50%']], change: { txt: '↑ +21.3% ↑', up: true } },
  { title: '月同比', rows: [['本月', '1.82%'], ['去年同月', '2.10%']], change: { txt: '↓ -13.3% ↓', up: false } },
  {
    title: 'MTD对比',
    rows: [['本月截止', '1.82%'], ['上月同期', '1.55%'], ['去年同期', '2.05%']],
    change: null,
  },
] as const

// ---- 图表 option（对齐 HTML compareOption） ----
function compareOption() {
  return {
    tooltip: { trigger: 'axis' },
    legend: { data: ['本月', '上月', '去年同月'], bottom: 0, textStyle: { fontSize: 11 } },
    grid: { left: 42, right: 18, top: 24, bottom: 40 },
    xAxis: { type: 'category', data: compare.labels, axisLabel: { fontSize: 11 } },
    yAxis: { type: 'value', name: '不良率%', axisLabel: { fontSize: 10 } },
    series: [
      { name: '本月', type: 'bar', data: compare.cur, barWidth: '20%', itemStyle: { color: '#1e4d8b', borderRadius: [3, 3, 0, 0] } },
      { name: '上月', type: 'bar', data: compare.prev, barWidth: '20%', itemStyle: { color: '#5b8def', borderRadius: [3, 3, 0, 0] } },
      { name: '去年同月', type: 'bar', data: compare.yoy, barWidth: '20%', itemStyle: { color: '#a0c4f0', borderRadius: [3, 3, 0, 0] } },
    ],
  }
}

const chartRef = ref<HTMLDivElement>()
let inst: echarts.ECharts | null = null
function init() {
  if (chartRef.value) {
    inst = echarts.init(chartRef.value)
    inst.setOption(compareOption())
  }
}
onMounted(() => { init(); window.addEventListener('resize', () => inst?.resize()) })
onBeforeUnmount(() => inst?.dispose())
</script>

<template>
  <div class="ncm-compare">
    <div class="qms-banner">
      <div class="qms-banner__icon" :style="{ background: authStore.currentRole?.color }">📊</div>
      <div>
        <div class="qms-banner__title">{{ banner.title }}</div>
        <div class="qms-banner__desc">{{ banner.desc }}</div>
      </div>
    </div>

    <div class="filter-bar">
      <label>对比模式：</label>
      <div class="seg">
        <button v-for="m in modes" :key="m" :class="{ on: mode === m }" @click="setCmp(m)">{{ m }}</button>
      </div>
    </div>

    <div class="qms-card">
      <div class="qms-card__header">
        <h3>{{ mode }}对比</h3>
        <span class="tag">工作日归一化</span>
        <span class="sr-tag">SR-NCM-018</span>
        <span class="sr-tag">SR-NCM-019</span>
        <span class="sr-tag">SR-NCM-020</span>
        <span class="sr-tag">SR-NCM-021</span>
      </div>
      <div class="qms-card__body">
        <div ref="chartRef" class="chart-container lg"></div>
      </div>
    </div>

    <div class="chart-grid chart-grid--3">
      <div v-for="c in kvCards" :key="c.title" class="qms-card">
        <div class="qms-card__header"><h3>{{ c.title }}</h3></div>
        <div class="qms-card__body">
          <div class="kv">
            <template v-for="r in c.rows" :key="r[0]">
              <span class="k">{{ r[0] }}</span>
              <span class="v">{{ r[1] }}</span>
            </template>
            <template v-if="c.change">
              <span class="k">变化</span>
              <span class="v" :class="c.change.up ? 'up' : 'down'">{{ c.change.txt }}</span>
            </template>
          </div>
        </div>
      </div>
    </div>

    <div class="note">
      📌 按实际工作日归一化(剔除节假日/停产日)；工作日历未配置时按自然日计算并标注"未归一化"；去年同期无数据时显示"--"。
    </div>
  </div>
</template>

<style scoped lang="scss">
.ncm-compare {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

// 分段按钮（对应 HTML .seg button）
.seg button {
  padding: 7px 16px;
  border: 1px solid #d7e0ec;
  background: #fff;
  border-radius: 8px;
  font-size: 13px;
  color: #46566b;
  cursor: pointer;
  transition: 0.15s;

  &:hover {
    border-color: #1e4d8b;
    color: #1e4d8b;
  }
  &.on {
    background: #1e4d8b;
    border-color: #1e4d8b;
    color: #fff;
    font-weight: 600;
  }
}

// KV 面板（对应 HTML .kv）
.kv {
  display: grid;
  grid-template-columns: 84px 1fr;
  row-gap: 8px;
  column-gap: 10px;
  font-size: 13px;

  .k {
    color: #8a94a6;
  }
  .v {
    font-weight: 600;
    color: #1e3a5f;

    &.up {
      color: #c0392b;
    }
    &.down {
      color: #27853f;
    }
  }
}
</style>
