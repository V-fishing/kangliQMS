<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import echarts from '@/utils/echarts'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { BANNERS } from '@/mock/roles'
import {
  ncmAnalysisAgg, ncmPareto, ncmTypes, ncmDrill, ncmRecords,
} from '@/mock/ncm'
import ParetoChart from '@/components/charts/ParetoChart.vue'

const authStore = useAuthStore()
const banner = BANNERS.ncm?.[authStore.role] || {
  title: 'NCM · 不良分析',
  desc: '不良帕累托分析与分类下钻',
}

const agg = ncmAnalysisAgg

// 筛选维度
const fType = ref('')
const fProc = ref('')
const fDev = ref('')
const fBatch = ref('')
const fProd = ref('')

const typeOpts = computed(() => [...new Set(ncmRecords.map((r) => r.type))])
const procOpts = computed(() => [...new Set(ncmRecords.map((r) => r.proc))])
const devOpts = computed(() => [...new Set(ncmRecords.map((r) => r.dev))])
const batchOpts = computed(() => [...new Set(ncmRecords.map((r) => r.batch))])
const prodOpts = computed(() => [...new Set(ncmRecords.map((r) => r.prod))])

const filtered = computed(() =>
  ncmRecords.filter(
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

function savePlan() {
  ElMessage.success('已保存为常用方案（演示）')
}
function genReport(name: string) {
  ElMessage.success(`${name} 已生成（演示）`)
}
function exportFile(fmt: string) {
  ElMessage.success(`${fmt} 已导出（演示）`)
}

// 帕累托 / 玫瑰图数据映射
const paretoData = computed(() => ncmPareto.map((d) => ({ name: d.name, value: d.v })))
const roseData = computed(() => ncmTypes.map((d) => ({ name: d.name, value: d.v })))

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
      <div class="qms-banner__icon" :style="{ background: authStore.currentRole?.color }">📊</div>
      <div>
        <div class="qms-banner__title">{{ banner.title }}</div>
        <div class="qms-banner__desc">{{ banner.desc }}</div>
      </div>
    </div>

    <!-- 多维度筛选 -->
    <div class="qms-card">
      <div class="qms-card__header">
        <h3>多维度筛选分析</h3>
        <span class="tag">六维度组合 · 实时联动</span>
      </div>
      <div class="qms-card__body">
        <div class="filter-bar">
          <el-select v-model="fType" placeholder="不良类型" clearable size="small" style="width: 140px">
            <el-option v-for="o in typeOpts" :key="o" :label="o" :value="o" />
          </el-select>
          <el-select v-model="fProc" placeholder="工序" clearable size="small" style="width: 120px">
            <el-option v-for="o in procOpts" :key="o" :label="o" :value="o" />
          </el-select>
          <el-select v-model="fDev" placeholder="设备" clearable size="small" style="width: 180px">
            <el-option v-for="o in devOpts" :key="o" :label="o" :value="o" />
          </el-select>
          <el-select v-model="fBatch" placeholder="批次" clearable size="small" style="width: 120px">
            <el-option v-for="o in batchOpts" :key="o" :label="o" :value="o" />
          </el-select>
          <el-select v-model="fProd" placeholder="产品型号" clearable size="small" style="width: 150px">
            <el-option v-for="o in prodOpts" :key="o" :label="o" :value="o" />
          </el-select>
          <span class="sp"></span>
          <span class="meta">{{ countText }}</span>
          <button class="btn sm" @click="savePlan">保存方案 </button>
        </div>
        <div class="ex-box">筛选条件组合后无数据显示“无匹配数据”并提供调整建议；方案名重复提示覆盖或重命名。</div>
      </div>
    </div>

    <!-- KPI 行 -->
    <div class="kpi-row">
      <div class="kpi"><div class="val">{{ agg.count }}</div><div class="lbl">不良数量</div></div>
      <div class="kpi warn"><div class="val">{{ agg.rate }}<span style="font-size:14px">%</span></div><div class="lbl">不良率</div></div>
      <div class="kpi warn">
        <div class="val">{{ agg.ppm }}</div><div class="lbl">PPM</div>
        <div class="sub">总产量 0 显示 --</div>
      </div>
      <div class="kpi"><div class="val">{{ agg.scrap }}<span style="font-size:14px">%</span></div><div class="lbl">报废率</div><div class="sub">TOP:{{ agg.topN }}</div></div>
    </div>
    <div class="ac-box">五项聚合指标完整：不良数 / 不良率 / PPM / 报废率 / TOP N；总产量为 0 时 PPM 显示 --；筛选方案可命名保存一键加载。</div>

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
        <div v-for="(d, i) in ncmDrill" :key="i" class="list-row clickable" :style="{ paddingLeft: 12 + i * 22 + 'px' }">
          <span class="qms-pill r">{{ d.lvl }}</span>
          <span class="grow"><b>{{ d.name }}</b>（不良率 {{ d.rate }}）</span>
          <span v-if="i < ncmDrill.length - 1" class="meta">下钻 ›</span>
        </div>
      </div>
    </div>

    <!-- BI 固定报表 -->
    <div class="qms-card">
      <div class="qms-card__header"><h3>BI 固定报表</h3></div>
      <div class="qms-card__body" style="padding: 0">
        <div class="list-row"><span class="grow">日 / 周 / 月不良汇总</span><button class="btn sm" @click="genReport('日周月不良汇总')">生成</button></div>
        <div class="list-row"><span class="grow">工序不良对比</span><button class="btn sm" @click="genReport('工序不良对比')">生成</button></div>
        <div class="list-row"><span class="grow">设备不良排名</span><button class="btn sm" @click="genReport('设备不良排名')">生成</button></div>
      </div>
      <div class="qms-card__body" style="padding-top: 0">
        <div class="toolbar" style="border: none; margin-top: 0; padding-top: 0">
          <button class="btn sm" @click="exportFile('Excel')">导出 Excel</button>
          <button class="btn sm" @click="exportFile('PDF')">导出 PDF</button>
        </div>
      </div>
    </div>

    <!-- 不良记录明细（随筛选联动） -->
    <div class="qms-card">
      <div class="qms-card__header">
        <h3>不良记录明细（随筛选联动）</h3>
        <span class="tag">{{ countText }}</span>
      </div>
      <div class="qms-card__body" style="padding: 0">
        <el-table :data="filtered" border size="small" empty-text="无匹配数据，请调整筛选条件">
          <el-table-column prop="id" label="编号" width="90" />
          <el-table-column prop="wo" label="工单" width="100" />
          <el-table-column prop="proc" label="工序" width="80" />
          <el-table-column prop="type" label="不良类型" width="100" />
          <el-table-column prop="cnt" label="件数" width="70" align="center" />
          <el-table-column prop="dev" label="设备" width="150" />
          <el-table-column prop="batch" label="批次" width="80" />
          <el-table-column prop="prod" label="产品" width="120" />
          <el-table-column label="等级" width="70" align="center"><template #default="{ row }"><span class="qms-pill" :class="row.sev === '严重' ? 'r' : row.sev === '轻微' ? 'gray' : 'y'">{{ row.sev }}</span></template></el-table-column>
          <el-table-column prop="who" label="操作员" width="80" />
          <el-table-column prop="t" label="时间" width="100" />
        </el-table>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.ncm-analysis { display: flex; flex-direction: column; gap: 14px; }
.btn {
  border: 1px solid #e1e8f0;
  background: #fff;
  border-radius: 6px;
  padding: 4px 10px;
  font-size: 12px;
  cursor: pointer;
  transition: 0.15s;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  &.sm { padding: 3px 8px; }
  &:hover { border-color: #1e4d8b; color: #1e4d8b; }
}
</style>
