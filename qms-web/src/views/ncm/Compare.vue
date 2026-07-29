<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import echarts from '@/utils/echarts'
import { useChartResize } from '@/composables/useChartResize'
useChartResize(() => [inst])
import { useAuthStore } from '@/stores/auth'
import { BANNERS } from '@/config/banners'
import { ncmApi } from '@/api'
import type { NcmCompare } from '@/types/ncm'

const authStore = useAuthStore()
const banner = BANNERS.ncm?.[authStore.role] || {
  title: 'NCM · 环比同比',
  desc: '按工作日归一化的环比 / 同比 / MTD 不良对比',
}

// ---- 对比模式（对齐 HTML renderNcmCompare 的 seg 控件） ----
const modes = ['周环比', '月环比', '月同比', '年同比', 'MTD月至今'] as const
const mode = ref<typeof modes[number]>('月环比')
// 模式 -> 后端对比口径 type
const modeType: Record<typeof modes[number], string> = {
  周环比: 'week',
  月环比: 'month',
  月同比: 'month',
  年同比: 'year',
  'MTD月至今': 'mtd',
}

// ---- 异步加载：按当前模式向真实接口请求不良率% ----
const compare = ref<NcmCompare>({ labels: [], cur: [], prev: [], yoy: [] })
async function load() {
  try {
    compare.value = await ncmApi.getCompare(undefined, modeType[mode.value])
  } catch (e) {
    // 错误已由拦截器提示
  }
}
function setCmp(name: typeof modes[number]) {
  if (mode.value === name) return
  mode.value = name
  load()
}

onMounted(load)

// ---- KV 面板：从 compare 数据派生（无数据时显示 --） ----
const kvCards = computed(() => {
  const c = compare.value
  const unit = c.unit || '%'
  const curLabel = c.curLabel || '当前'
  const prevLabel = c.prevLabel || '上一期'
  const yoyLabel = c.yoyLabel || '去年同期'
  const cur = c.cur
  const prev = c.prev
  const yoy = c.yoy
  const curLast = cur.length ? cur[cur.length - 1] : 0
  const prevLast = prev.length ? prev[prev.length - 1] : 0
  const yoyLast = yoy.length ? yoy[yoy.length - 1] : 0
  const momChange = prevLast > 0 ? +(((curLast - prevLast) / prevLast) * 100).toFixed(1) : null
  const yoyChange = yoyLast > 0 ? +(((curLast - yoyLast) / yoyLast) * 100).toFixed(1) : null
  const fmtChange = (v: number | null) =>
    v == null ? null : { txt: `${v > 0 ? '↑' : '↓'} ${Math.abs(v)}%`, up: v > 0 }
  return [
    {
      title: `${curLabel} 不良率`,
      rows: [[curLabel, `${curLast}${unit}`]],
      change: null,
    },
    {
      title: `环比 · ${curLabel} vs ${prevLabel}`,
      rows: [[curLabel, `${curLast}${unit}`], [prevLabel, `${prevLast}${unit}`]],
      change: fmtChange(momChange),
    },
    {
      title: `同比 · ${curLabel} vs ${yoyLabel}`,
      rows: [[curLabel, `${curLast}${unit}`], [yoyLabel, `${yoyLast}${unit}`]],
      change: fmtChange(yoyChange),
    },
  ]
})

// ---- 图表 option ----
function compareOption() {
  const c = compare.value
  const labels = [c.curLabel || '当前', c.prevLabel || '上一期', c.yoyLabel || '去年同期']
  return {
    tooltip: { trigger: 'axis', valueFormatter: (v: number) => `${v}${c.unit || '%'}` },
    legend: { data: labels, bottom: 0, textStyle: { fontSize: 11 } },
    grid: { left: 42, right: 18, top: 24, bottom: 40 },
    xAxis: { type: 'category', data: c.labels.length ? c.labels : ['不良率'], axisLabel: { fontSize: 11 } },
    yAxis: { type: 'value', name: `不良率${c.unit || '%'}`, axisLabel: { fontSize: 10 } },
    series: [
      { name: labels[0], type: 'bar', data: c.cur, barWidth: '20%', itemStyle: { color: '#1e4d8b', borderRadius: [3, 3, 0, 0] } },
      { name: labels[1], type: 'bar', data: c.prev, barWidth: '20%', itemStyle: { color: '#5b8def', borderRadius: [3, 3, 0, 0] } },
      { name: labels[2], type: 'bar', data: c.yoy, barWidth: '20%', itemStyle: { color: '#a0c4f0', borderRadius: [3, 3, 0, 0] } },
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
function refresh() {
  inst?.setOption(compareOption())
}
onMounted(() => { init(); window.addEventListener('resize', () => inst?.resize()) })
watch(compare, refresh, { deep: true })
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
