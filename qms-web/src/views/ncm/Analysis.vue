<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import echarts from '@/utils/echarts'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { BANNERS } from '@/config/banners'
import { ncmApi } from '@/api'
import type { NcmRecord, NcmAnalysisAgg } from '@/types/ncm'

const authStore = useAuthStore()
const banner = BANNERS.ncm?.[authStore.role] || {
  title: 'NCM · 不良分析',
  desc: '不良帕累托分析与分类下钻',
}

// ===== 异步加载的真实数据（后端聚合驱动） =====
const records = ref<NcmRecord[]>([])
const agg = ref<NcmAnalysisAgg>({ count: 0, rate: 0, ppm: 0, scrap: 0, topN: '' })

/** 后端聚合 Top N 排名：每个维度的 top 条目 */
const topRankings = ref<Record<string, { name: string; cnt: number }[]>>({})

onMounted(async () => {
  try {
    const [recs, ag] = await Promise.all([
      ncmApi.getRecords(),
      ncmApi.getAnalysisAgg(),
    ])
    records.value = recs
    agg.value = ag
    // 加载 6 个维度的后端聚合排名
    const dims = ['supplier', 'type', 'proc', 'dev', 'batch', 'product']
    const results = await Promise.all(dims.map((d) => ncmApi.aggregateByDim(d).catch(() => [])))
    const ranking: Record<string, { name: string; cnt: number }[]> = {}
    dims.forEach((d, i) => { ranking[d] = results[i].slice(0, 10) })
    topRankings.value = ranking
  } catch (e) {
    // 错误已由拦截器提示
  }
})

// 筛选维度
const fType = ref('')
const fProc = ref('')
const fDev = ref('')
const fBatch = ref('')
const fProd = ref('')

const typeOpts = computed(() => [...new Set(records.value.map((r) => r.type))])
const procOpts = computed(() => [...new Set(records.value.map((r) => r.proc))])
const devOpts = computed(() => [...new Set(records.value.map((r) => r.dev))])
const batchOpts = computed(() => [...new Set(records.value.map((r) => r.batch))])
const prodOpts = computed(() => [...new Set(records.value.map((r) => r.prod))])

const filtered = computed(() =>
  records.value.filter(
    (r) =>
      (!fType.value || r.type === fType.value) &&
      (!fProc.value || r.proc === fProc.value) &&
      (!fDev.value || r.dev === fDev.value) &&
      (!fBatch.value || r.batch === fBatch.value) &&
      (!fProd.value || r.prod === fProd.value),
  ),
)
const filteredCnt = computed(() => filtered.value.length)
const filteredQty = computed(() => filtered.value.reduce((s, r) => s + r.cnt, 0))
const countText = computed(() => `共 ${filteredCnt.value} 条 / 不良件数 ${filteredQty.value}`)

function shortId(id?: string): string {
  if (!id) return '—'
  return id.length > 8 ? '…' + id.slice(-8) : id
}
function savePlan() {
  ElMessage.success('已保存为常用方案（演示）')
}
function genReport(name: string) {
  ElMessage.success(`${name} 已生成（演示）`)
}
function exportFile(fmt: string) {
  ElMessage.success(`${fmt} 已导出（演示）`)
}

// 层级下钻数据（占位：后端接口未对接前展示静态层级）
const drill = ref<{ lvl: string; name: string; rate: string }[]>([
  { lvl: 'L1', name: '焊接工序', rate: '3.2%' },
  { lvl: 'L2', name: '工位 03', rate: '5.8%' },
  { lvl: 'L3', name: '参数 电流', rate: '8.4%' },
])

// 聚合当前筛选后的数据：类型分布（用于玫瑰图/Pareto）
const typeAgg = computed(() => {
  const m = new Map<string, number>()
  filtered.value.forEach((r) => m.set(r.type, (m.get(r.type) || 0) + r.cnt))
  return Array.from(m, ([name, v]) => ({ name, v })).sort((a, b) => b.v - a.v)
})
const paretoData = computed(() => typeAgg.value.map((d) => ({ name: d.name, value: d.v })))
const roseData = computed(() => typeAgg.value.map((d) => ({ name: d.name, value: d.v })))

// 类型分布玫瑰图（内联 echarts）
const roseRef = ref<HTMLDivElement>()
let roseInst: echarts.ECharts | null = null
function renderRose() {
  if (!roseRef.value) return
  roseInst = echarts.init(roseRef.value)
  roseInst.setOption({
    tooltip: { trigger: 'item' },
    legend: { bottom: 0, icon: 'circle', textStyle: { fontSize: 11 }, type: 'scroll' },
    series: [
      {
        type: 'pie',
        roseType: 'radius',
        radius: ['25%', '68%'],
        center: ['50%', '46%'],
        itemStyle: { borderColor: '#fff', borderWidth: 2 },
        label: { fontSize: 11 },
        data: roseData.value,
      },
    ],
  })
}
onMounted(() => {
  renderRose()
  window.addEventListener('resize', resizeRose)
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeRose)
  roseInst?.dispose()
  roseInst = null
})
function resizeRose() {
  roseInst?.resize()
}
watch(roseData, () => roseInst?.setOption({ series: [{ data: roseData.value }] }), { deep: true })
</script>

<template>
  <div class="ncm-analysis">
    <div class="qms-banner">
      <div class="qms-banner__icon" :style="{ background: authStore?.currentRole?.color }">📊</div>
      <div>
        <div class="qms-banner__title">{{ banner.title }}</div>
        <div class="qms-banner__desc">{{ banner.desc }}</div>
      </div>
    </div>

    <!-- KPI 卡片（聚合指标） -->
    <div class="kpi-row">
      <div class="kpi-card"><span class="kpi-num">{{ agg.count }}</span><span class="kpi-label">不良数量</span></div>
      <div class="kpi-card warn"><span class="kpi-num">{{ agg.rate }}<small>%</small></span><span class="kpi-label">不良率</span></div>
      <div class="kpi-card alert"><span class="kpi-num">{{ agg.ppm }}</span><span class="kpi-label">PPM</span><span class="kpi-sub">总产量 0 显示 --</span></div>
      <div class="kpi-card"><span class="kpi-num">{{ agg.scrap }}<small>%</small></span><span class="kpi-label">报废率</span><span class="kpi-sub">TOP: {{ agg.topN || '—' }}</span></div>
    </div>

    <!-- Top N 排名（后端聚合 6 维度） -->
    <div class="top-rankings">
      <div v-for="(dimLabel, dim) in { type: '不良类型', proc: '工序', dev: '设备', product: '产品', batch: '批次' }" :key="dim" class="rank-card">
        <div class="rank-card__title">Top {{ dimLabel }}</div>
        <div v-if="(topRankings[dim] || []).length" class="rank-list">
          <div v-for="(item, idx) in (topRankings[dim] || []).slice(0, 5)" :key="idx" class="rank-row">
            <span class="rank-num" :class="{ top1: idx === 0, top2: idx === 1, top3: idx === 2 }">{{ idx + 1 }}</span>
            <span class="rank-name">{{ item.name }}</span>
            <span class="rank-cnt">{{ item.cnt }} 次</span>
          </div>
        </div>
        <div v-else class="rank-empty">暂无数据</div>
      </div>
    </div>

    <!-- 多维度筛选移到下方"不良记录明细"卡片内 -->

    <!-- 图表区 -->
    <div class="chart-grid chart-grid--2">
      <div class="qms-card">
        <div class="qms-card__header"><h3>不良 Pareto</h3></div>
        <div class="qms-card__body"><ParetoChart :data="paretoData" :height="'300px'" /></div>
      </div>
      <div class="qms-card">
        <div class="qms-card__header"><h3>类型分布</h3></div>
        <div class="qms-card__body"><div ref="roseRef" style="width: 100%; height: 300px"></div></div>
      </div>
    </div>

    <!-- 层级下钻 -->
    <div class="qms-card">
      <div class="qms-card__header">
        <h3>层级下钻分析（工序 → 工位 → 参数）</h3>
        <span class="tag">点击下钻</span>
      </div>
      <div class="qms-card__body" style="padding: 0">
        <div v-for="(d, i) in drill" :key="i" class="list-row clickable" :style="{ paddingLeft: 12 + i * 22 + 'px' }">
          <span class="qms-pill r">{{ d.lvl }}</span>
          <span class="grow"><b>{{ d.name }}</b>（不良率 {{ d.rate }}）</span>
          <span v-if="i < drill.length - 1" class="meta">下钻 ›</span>
        </div>
      </div>
    </div>

    <!-- BI 固定报表（TODO: 流程未定） -->
    <div class="qms-card">
      <div class="qms-card__header"><h3>BI 固定报表</h3><span class="tag">流程待实现</span></div>
      <div class="qms-card__body">
        <div class="wip-note">🚧 按日/周/月维度拉取 ETL 聚合 & 导出，接口待对接，当前展示为占位。(genReport / export 方法均为演示 toast)。</div>
        <div class="list-row flex"><span class="grow">日/周/月不良汇总 / 工序对比 / 设备排名</span><div><button class="btn sm" @click="exportFile('Excel')">导出 Excel</button><button class="btn sm" style="margin-left:6px" @click="exportFile('PDF')">PDF</button></div></div>
      </div>
    </div>

    <!-- 不良记录明细（随筛选联动） -->
    <div class="qms-card">
      <div class="qms-card__header">
        <h3>不良记录明细</h3>
        <span class="tag">{{ countText }}</span>
        <button class="btn sm" @click="savePlan">💾 保存方案</button>
      </div>
      <div class="filter-panel" style="margin: 0 14px 10px">
        <el-select v-model="fType" placeholder="不良类型" clearable size="small" style="width:120px"><el-option v-for="o in typeOpts" :key="o" :label="o" :value="o" /></el-select>
        <el-select v-model="fProc" placeholder="工序" clearable size="small" style="width:100px"><el-option v-for="o in procOpts" :key="o" :label="o" :value="o" /></el-select>
        <el-select v-model="fDev" placeholder="设备" clearable size="small" style="width:150px"><el-option v-for="o in devOpts" :key="o" :label="o" :value="o" /></el-select>
        <el-select v-model="fBatch" placeholder="批次" clearable size="small" style="width:100px"><el-option v-for="o in batchOpts" :key="o" :label="o" :value="o" /></el-select>
        <el-select v-model="fProd" placeholder="产品型号" clearable size="small" style="width:130px"><el-option v-for="o in prodOpts" :key="o" :label="o" :value="o" /></el-select>
        <span class="sp"></span>
      </div>
      <div class="qms-card__body" style="padding: 0">
        <el-table :data="filtered" border size="small" empty-text="无匹配数据，请调整筛选条件">
          <el-table-column label="编号" width="80">
            <template #default="{ row }">
              <el-tooltip :content="row.id" placement="top"><span class="ellipsis">{{ shortId(row.id) }}</span></el-tooltip>
            </template>
          </el-table-column>
          <el-table-column prop="wo" label="工单" width="100" show-overflow-tooltip />
          <el-table-column prop="proc" label="工序" width="80" />
          <el-table-column prop="type" label="不良类型" width="100" show-overflow-tooltip />
          <el-table-column prop="cnt" label="件数" width="70" align="center" />
          <el-table-column prop="dev" label="设备" min-width="120" show-overflow-tooltip />
          <el-table-column prop="batch" label="批次" width="80" />
          <el-table-column prop="prod" label="产品" width="80" show-overflow-tooltip />
          <el-table-column label="等级" width="70" align="center">
            <template #default="{ row }"><span class="qms-pill" :class="row.sev === '严重' ? 'r' : row.sev === '轻微' ? 'gray' : 'y'">{{ row.sev }}</span></template>
          </el-table-column>
          <el-table-column label="操作员" width="100">
            <template #default="{ row }">
              <el-tooltip :content="row.who" placement="top"><span class="ellipsis">{{ shortId(row.who) }}</span></el-tooltip>
            </template>
          </el-table-column>
          <el-table-column prop="t" label="时间" width="100" />
        </el-table>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.ncm-analysis { display: flex; flex-direction: column; gap: 14px; }

/* KPI 卡片 */
.kpi-row { display: flex; gap: 10px; flex-wrap: wrap; }
.kpi-card {
  flex: 1; min-width: 100px;
  background: #f4f8ff; border: 1px solid #dbe7f7; border-radius: 8px;
  padding: 10px 12px; display: flex; flex-direction: column; gap: 1px;
  &.warn { background: #fff8e1; border-color: #f0c14b; .kpi-num { color: #b58a00; } }
  &.alert { background: #fdecea; border-color: #f5c6c0; .kpi-num { color: #c0392b; } }
  .kpi-num { font-size: 22px; font-weight: 700; color: #1e4d8b; line-height: 1.2; small { font-size: 14px; font-weight: 500; } }
  .kpi-label { font-size: 11px; color: #6b7785; }
  .kpi-sub { font-size: 10px; color: #8a94a6; }
}

/* 筛选面板 */
.filter-panel {
  display: flex; gap: 8px; align-items: center; flex-wrap: wrap;
  background: #f4f8ff; border: 1px solid #dbe7f7; border-radius: 8px;
  padding: 8px 12px;
  .sp { flex: 1; }
  .meta { font-size: 12px; color: #6b7785; }
}

/* 下钻行 */
.list-row {
  display: flex; align-items: center; gap: 8px; padding: 8px 14px; border-bottom: 1px solid #f0f2f4; font-size: 12.5px;
  .grow { flex: 1; }
  &.flex { flex-wrap: wrap; }
}

/* TODO 标注 */
.wip-note {
  background: #fff8e1; border: 1px dashed #f0c14b; border-radius: 4px;
  padding: 6px 10px; font-size: 11.5px; color: #7a6500; margin-bottom: 8px;
}

.btn {
  border: 1px solid #e1e8f0; background: #fff; border-radius: 6px;
  padding: 4px 10px; font-size: 12px; cursor: pointer; transition: 0.15s;
  display: inline-flex; align-items: center; gap: 4px;
  &.sm { padding: 3px 8px; }
  &:hover { border-color: #1e4d8b; color: #1e4d8b; }
}
.ellipsis { font-family: ui-monospace, "Cascadia Mono", Consolas, monospace; color: #1e4d8b; cursor: help; }

/* Top N 排名卡片 */
.top-rankings {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 10px;
  @media (max-width: 900px) { grid-template-columns: repeat(3, 1fr); }
  @media (max-width: 600px) { grid-template-columns: 1fr 1fr; }
}
.rank-card {
  border: 1px solid #dbe7f7;
  border-radius: 8px;
  background: #fff;
  padding: 10px 12px;
  &__title { font-size: 11px; font-weight: 600; color: #1e4d8b; margin-bottom: 8px; border-bottom: 1px solid #eef3fa; padding-bottom: 6px; }
}
.rank-list { display: flex; flex-direction: column; gap: 4px; }
.rank-row { display: flex; align-items: center; gap: 6px; font-size: 12px; }
.rank-num {
  width: 18px; height: 18px; border-radius: 4px;
  background: #eef3fa; color: #5a6b7e;
  font-size: 10px; font-weight: 600; display: flex; align-items: center; justify-content: center;
  &.top1 { background: #e74c3c; color: #fff; }
  &.top2 { background: #e67e22; color: #fff; }
  &.top3 { background: #f39c12; color: #fff; }
}
.rank-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #2c3e50; }
.rank-cnt { font-size: 11px; color: #8a94a6; font-weight: 500; }
.rank-empty { font-size: 11px; color: #b0bac4; text-align: center; padding: 8px; }
</style>
