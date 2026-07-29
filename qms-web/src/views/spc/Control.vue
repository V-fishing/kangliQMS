<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { BANNERS } from '@/config/banners'
import { spcApi, fiaApi } from '@/api'
import SpcControlChart from '@/components/charts/SpcControlChart.vue'
import FiaReportDialog from '@/components/fia/FiaReportDialog.vue'
import type { SpcSubgroup, SpcLimit, SpcMark, SpcParam, SpcControlData } from '@/types/spc'

const router = useRouter()
const authStore = useAuthStore()
const banner = BANNERS.spc?.[authStore.role] || {
  title: 'SPC · 控制图监控',
  desc: 'Xbar-R 控制图实时监控与判异（SR-SPC-005/008）',
}

// ====== 8 步原子流程（对应 HTML renderSpcControl 监控原子流程） ======
const steps = [
  { cn: '①数据采集', cd: '人工/设备录入', st: 'done' },
  { cn: '②完整性校验', cd: '缺失标记告警', st: 'done' },
  { cn: '③基线建立', cd: '前25子组', st: 'done' },
  { cn: '④控制限计算', cd: 'UCL/CL/LCL动态', st: 'done' },
  { cn: '⑤判异规则', cd: 'WE①②③⑤检测', st: 'current' },
  { cn: '⑥告警分级', cd: '预警/报警', st: 'current' },
  { cn: '⑦多渠道通知', cd: '弹窗+企微', st: 'pending' },
  { cn: '⑧关闭填因', cd: '30分钟抑制', st: 'pending' },
] as const



// ====== 筛选栏（参数 / 时间范围 / 导出） ======
const params = ref<(SpcParam & { id: string })[]>([])
const ranges = ['近25子组', '今日', '本周']
const selectedParamId = ref('')
const selectedRange = ref(ranges[0])
const paramLabel = computed(() => {
  const p = params.value.find((x) => x.id === selectedParamId.value)
  return p ? `${p.p}(${p.unit})` : ''
})
async function loadParams() {
  params.value = await spcApi.getParams()
  if (params.value.length && !selectedParamId.value) {
    selectedParamId.value = params.value[0].id
  }
  await loadChart()
}
function onExport() {
  ElMessage.success('已导出 Excel + 图片（演示）')
}

// ====== 控制图（后端 /spc/control-chart） ======
const subgroups = ref<SpcSubgroup[]>([])
const limit = ref<SpcLimit>({ ucl: 0, cl: 0, lcl: 0 })
const marks = ref<SpcMark[]>([])
const chartType = ref<'Xbar-R' | 'Xbar-s' | 'I-MR'>('Xbar-R')
// rules：用于 SpcControlChart 着色（code 与 sub.outlierRule 对应）
const rules = computed(() => marks.value.map((m: SpcMark) => ({
  code: m.rule.charAt(0),
  level: m.level as '预警' | '报警',
})))
const anomalyCount = computed(() => marks.value.length)
// 判异规则编号 -> 规则名（用于子组表"规则"列显示 编号+名称，反查 ops.spc_rule 主数据表）
const spcRuleMap = ref<Record<string, string>>({})
async function loadSpcRules() {
  try {
    const rs = await spcApi.getRules()
    spcRuleMap.value = Object.fromEntries(rs.map((r) => [r.code, r.name]))
  } catch {
    spcRuleMap.value = {}
  }
}
const loading = ref(false)

async function loadChart() {
  if (!selectedParamId.value) return
  loading.value = true
  try {
    const data: SpcControlData = await spcApi.getControlChart(selectedParamId.value)
    subgroups.value = data.subgroups
    limit.value = data.limit
    marks.value = data.marks
    chartType.value = data.chartType
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await loadParams()
  await loadSpcRules()
})

// 控制限信息（对应 HTML 控制限信息卡）
const controlInfo = computed(() => [
  { k: '子组大小', v: String(subgroups.value.length ? 5 : '') },
  { k: '子组数', v: String(limit.value.nSubgroups ?? subgroups.value.length) },
  { k: '图表类型', v: chartType.value + '(子组<10)' },
  { k: 'UCL(Xbar)', v: limit.value.ucl.toFixed(2), danger: true },
  { k: 'CL(Xbar)', v: limit.value.cl.toFixed(2), ok: true },
  { k: 'LCL(Xbar)', v: limit.value.lcl.toFixed(2), danger: true },
  { k: '基线来源', v: limit.value.baselineSource || '前25子组' },
])

// ====== 异常点（对应 HTML 异常点与判异规则命中） ======
const anomalies = computed(() => marks.value.map((m: SpcMark) => {
  if (m.range) {
    return {
      sub: `#${m.i + 1}-${m.i + 6}`,
      level: m.level,
      desc: `子组 #${m.i + 1}-${m.i + 6} ${m.rule} · 规则${m.rule.charAt(0)}`,
    }
  }
  return {
    sub: `#${m.i + 1}`,
    level: m.level,
    desc: `子组 #${m.i + 1} Xbar=${subgroups.value[m.i]?.xbar.toFixed(2) ?? '-'} 超 UCL(${limit.value.ucl.toFixed(2)}) · 规则${m.rule.charAt(0)}`,
  }
}))
function goAlarm() {
  router.push({ name: 'SpcAlarm' })
}

// ====== 首件 → SPC 联动（过程控制初始基准） ======
// 首件检验合格/审批放行后，其 CTQ 实测值以 dataSource='fia' 写入本参数首个 SPC 子组，
// 作为「前25子组动态」基线的初始基准。此处用于标注与溯源。
const fiaSubgroups = computed(() => subgroups.value.filter((s) => s.dataSource === 'fia'))
const firstFiaSub = computed(() => {
  const list = fiaSubgroups.value
  if (!list.length) return null
  return list.reduce((a, b) => (a.no <= b.no ? a : b))
})

const resolving = ref(false)
const reportVisible = ref(false)
const reportTaskId = ref('')

/** 由 SPC 子组的工单/批次反查首件检验任务（前端按工单+批次匹配，无需后端改动） */
async function resolveFiaTaskId(sub: SpcSubgroup): Promise<string> {
  if (!sub.woNo) return ''
  const tasks = await fiaApi.getTasks()
  if (!tasks.length) return ''
  const hit = tasks.find((t) => t.wo === sub.woNo && (!sub.batchNo || t.batchNo === sub.batchNo)) || tasks.find((t) => t.wo === sub.woNo)
  return hit?.id || ''
}

async function openFiaReport(sub: SpcSubgroup) {
  resolving.value = true
  try {
    const id = await resolveFiaTaskId(sub)
    if (!id) {
      ElMessage.warning(`未找到工单「${sub.woNo}」对应的首件检验任务（可能尚未录入或已清理）`)
      return
    }
    reportTaskId.value = id
    reportVisible.value = true
  } catch {
    ElMessage.error('溯源首件报告失败')
  } finally {
    resolving.value = false
  }
}

const subInfoDlg = reactive({ visible: false, sub: null as SpcSubgroup | null })
function onSubgroupClick(sub: SpcSubgroup) {
  if (sub.dataSource === 'fia') {
    openFiaReport(sub)
  } else {
    subInfoDlg.visible = true
    subInfoDlg.sub = sub
  }
}
</script>

<template>
  <div class="spc-control">
    <div class="qms-banner">
      <div class="qms-banner__icon" :style="{ background: authStore.currentRole?.color }">📈</div>
      <div>
        <div class="qms-banner__title">{{ banner.title }}</div>
        <div class="qms-banner__desc">{{ banner.desc }}</div>
      </div>
    </div>

    <!-- 8 步原子流程链 -->
    <div class="qms-card">
      <div class="qms-card__header"><h3>SPC 监控原子流程</h3><span class="tag">8 个原子节点</span></div>
      <div class="qms-card__body">
        <div class="step-chain">
          <div v-for="(s, i) in steps" :key="i" class="chain-step" :class="s.st">
            <div class="cn">{{ s.cn }}</div>
            <div class="cd">{{ s.cd }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 筛选栏 -->
    <div class="filter-bar">
      <label>参数：</label>
      <el-select v-model="selectedParamId" style="width: 180px" @change="loadChart">
        <el-option v-for="p in params" :key="p.id" :label="`${p.p}(${p.unit})`" :value="p.id" />
      </el-select>
      <label>时间范围：</label>
      <el-select v-model="selectedRange" style="width: 140px">
        <el-option v-for="r in ranges" :key="r" :label="r" :value="r" />
      </el-select>
      <span class="sp" />
      <el-button type="primary" size="small" @click="onExport">导出</el-button>
    </div>

    <div class="chart-grid chart-grid--2-1">
      <!-- 控制图 -->
      <div class="qms-card">
        <div class="qms-card__header">
          <h3>{{ chartType }} 控制图（{{ paramLabel }}）</h3>
          <span class="tag r">{{ anomalyCount }} 处异常</span>
        </div>
        <div class="qms-card__body">
          <div class="legend-inline">
            <span><i style="background:#c0392b" />报警(①超3σ)</span>
            <span><i style="background:#d4a017" />预警(③连续6点递增)</span>
            <span><i style="background:#2f7d32" />UCL/CL/LCL</span>
            <span><i style="background:#8e44ad;border-radius:50% 0 50% 0" />首件联动(fia) 初始基准</span>
          </div>
          <SpcControlChart :subgroups="subgroups" :limit="limit" :rules="rules" :chart-type="chartType" :height="320" @click-subgroup="onSubgroupClick" />
        </div>
      </div>

      <!-- 控制限信息 -->
      <div class="qms-card">
        <div class="qms-card__header"><h3>控制限信息</h3></div>
        <div class="qms-card__body">
          <el-alert
            v-if="limit.insufficient" type="warning" show-icon :closable="false" style="margin-bottom: 10px"
            title="数据不足,结果仅供参考"
            :description="`当前子组数 ${limit.nSubgroups ?? 0} < 25,控制基线尚未正式建立(SR-SPC-007),控制限仅供参考,持续采集至 25 子组后自动建立基线。`"
          />
          <div class="kv">
            <template v-for="row in controlInfo" :key="row.k">
              <span class="k">{{ row.k }}</span>
              <span :class="{ danger: row.danger, ok: row.ok }">{{ row.v }}</span>
            </template>
          </div>
          <div class="ex-box">前25子组含异常点时提示管理员决定是否剔除后重建基线；大数据量自动聚合并支持手动加载。</div>
        </div>
      </div>
    </div>

    <!-- 子组数据表 -->
    <div class="qms-card">
      <div class="qms-card__header"><h3>子组数据表（{{ subgroups.length }} 组）</h3></div>
      <div class="qms-card__body" style="padding: 0; max-height: 260px; overflow: auto">
        <el-table :data="subgroups" border size="small">
          <el-table-column prop="no" label="子组" width="70" />
          <el-table-column prop="time" label="时间" width="110" />
          <el-table-column prop="xbar" label="Xbar" width="100" />
          <el-table-column prop="r" label="R" width="100" />
          <el-table-column label="判定" width="100">
            <template #default="{ row }">
              <span class="qms-pill" :class="row.outlierRule ? (row.outlierRule === '①' ? 'r' : 'y') : 'g'">
                {{ row.outlierRule ? '异常' : '正常' }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="规则" width="200">
            <template #default="{ row }">
              <span v-if="row.outlierRule">{{ row.outlierRule }} {{ spcRuleMap[row.outlierRule] || '' }}</span>
              <span v-else class="muted">—</span>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <!-- 异常点与判异规则命中 -->
    <div class="qms-card">
      <div class="qms-card__header"><h3>异常点与判异规则命中</h3><span class="tag r">{{ anomalyCount }} 处</span></div>
      <div class="qms-card__body">
        <div v-for="(a, i) in anomalies" :key="i" class="list-row">
          <span class="qms-pill" :class="a.level === '报警' ? 'r' : 'y'">{{ a.level }}</span>
          <span class="grow"><b>子组 {{ a.sub }}</b> {{ a.desc }}</span>
          <el-button size="small" @click="goAlarm">去处理</el-button>
        </div>
      </div>
    </div>

    <!-- 首件 → SPC 联动（过程控制初始基准） -->
    <div class="qms-card">
      <div class="qms-card__header">
        <h3>首件 → SPC 联动（过程控制初始基准）</h3>
        <span class="tag" :class="fiaSubgroups.length ? 'g' : 'n'">{{ fiaSubgroups.length ? fiaSubgroups.length + ' 条' : '暂无' }}</span>
      </div>
      <div class="qms-card__body">
        <div v-if="!fiaSubgroups.length" class="muted">
          当前参数的控制图中尚未发现首件联动(fia)子组。首件检验合格 / 审批放行后，其 CTQ 实测值会自动写入本参数的首个 SPC 子组（dataSource=fia），
          作为「前25子组动态」基线的第 1 个子组（初始基准）。
        </div>
        <template v-else>
          <div class="fia-note">
            首件数据经合格 / 审批放行后自动同步为 SPC 子组（◆ 紫色菱形、控制图上以「首件基准」标注），是过程能力控制限的初始基准。
            点击「回看首件报告」可溯源至对应首件检验归档报告。
          </div>
          <el-table :data="fiaSubgroups" border size="small">
            <el-table-column label="子组" width="92">
              <template #default="{ row }">
                <span v-if="firstFiaSub && row.no === firstFiaSub.no" class="fia-badge">基准</span>
                #{{ row.no }}
              </template>
            </el-table-column>
            <el-table-column prop="time" label="时间" width="140" />
            <el-table-column prop="woNo" label="工单" min-width="120" />
            <el-table-column prop="batchNo" label="批次" min-width="120" />
            <el-table-column label="Xbar" width="100">
              <template #default="{ row }">{{ row.xbar.toFixed(3) }}</template>
            </el-table-column>
            <el-table-column label="基准" width="80" align="center">
              <template #default="{ row }">
                <span v-if="firstFiaSub && row.no === firstFiaSub.no" class="qms-pill g">是</span>
                <span v-else class="muted">—</span>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="132" fixed="right">
              <template #default="{ row }">
                <el-button type="primary" link :loading="resolving" @click="openFiaReport(row)">回看首件报告</el-button>
              </template>
            </el-table-column>
          </el-table>
        </template>
      </div>
    </div>

    <!-- 首件报告溯源弹窗 -->
    <FiaReportDialog :task-id="reportTaskId" v-model="reportVisible" />

    <!-- 非首件子组详情弹窗 -->
    <el-dialog v-model="subInfoDlg.visible" title="子组详情" width="460px">
      <div v-if="subInfoDlg.sub" class="kv subinfo">
        <div class="kv"><span class="kv-k">子组号</span><span class="kv-v">#{{ subInfoDlg.sub.no }}</span></div>
        <div class="kv"><span class="kv-k">时间</span><span class="kv-v">{{ subInfoDlg.sub.time || '—' }}</span></div>
        <div class="kv"><span class="kv-k">班次</span><span class="kv-v">{{ subInfoDlg.sub.shift || '—' }}</span></div>
        <div class="kv"><span class="kv-k">Xbar</span><span class="kv-v">{{ subInfoDlg.sub.xbar }}</span></div>
        <div class="kv"><span class="kv-k">R</span><span class="kv-v">{{ subInfoDlg.sub.r }}</span></div>
        <div class="kv"><span class="kv-k">工单</span><span class="kv-v">{{ subInfoDlg.sub.woNo || '—' }}</span></div>
        <div class="kv"><span class="kv-k">批次</span><span class="kv-v">{{ subInfoDlg.sub.batchNo || '—' }}</span></div>
        <div class="kv"><span class="kv-k">判定</span><span class="kv-v">{{ subInfoDlg.sub.outlierRule ? '异常' : '正常' }}</span></div>
        <div class="kv-note">该子组非首件联动数据（dataSource={{ subInfoDlg.sub.dataSource || 'manual' }}）。</div>
      </div>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.spc-control { display: flex; flex-direction: column; gap: 14px; }
.filter-bar { display: flex; gap: 10px; align-items: center; label { font-size: 12.5px; color: #5a6b7e; } .sp { flex: 1; } }
.chart-grid { display: grid; gap: 14px; &--2-1 { grid-template-columns: 2fr 1fr; } }

// 8 步原子流程链
.step-chain { display: flex; gap: 6px; flex-wrap: wrap; }
.chain-step {
  flex: 1 1 120px; min-width: 120px; padding: 10px 12px; border-radius: 8px; font-size: 12px;
  background: #eef4fb; color: #5a6b7e; border: 1px solid #e4ecf5;
  .cn { font-weight: 600; color: #1f2d3d; }
  .cd { font-size: 11px; color: #5a6b7e; margin-top: 2px; }
  .cs { margin-top: 5px; display: flex; flex-wrap: wrap; gap: 4px; }
  &.done { background: #e8f5e9; border-color: #cdeccd; .cn { color: #2f7d32; } }
  &.current { background: #fff7e0; border-color: #f3e2b0; .cn { color: #d4a017; } }
}

.legend-inline { display: flex; gap: 16px; font-size: 11.5px; color: #5a6b7e; padding: 0 0 8px; flex-wrap: wrap;
  span { display: inline-flex; align-items: center; }
  i { width: 10px; height: 10px; border-radius: 2px; margin-right: 5px; display: inline-block; } }

// 控制限信息 kv
.kv { display: grid; grid-template-columns: auto 1fr; gap: 0; font-size: 13px;
  .k { padding: 8px 4px; color: #5a6b7e; border-bottom: 1px solid #eef4fb; }
  span:not(.k) { padding: 8px 4px; color: #1f2d3d; font-weight: 600; border-bottom: 1px solid #eef4fb; text-align: right;
    &.danger { color: #c0392b; } &.ok { color: #2f7d32; } } }
.ex-box { font-size: 12px; color: #5a6b7e; padding: 10px 12px; background: #fffbeb; border: 1px solid #fde9b8; border-radius: 6px; margin-top: 10px; line-height: 1.6; }

.list-row { display: flex; align-items: center; gap: 10px; padding: 10px 4px; border-bottom: 1px solid #eef4fb; font-size: 12.5px;
  .grow { flex: 1; } }

// 首件 → SPC 联动卡片
.fia-note { font-size: 12px; color: #5a6b7e; background: #f3eefb; border: 1px solid #e0d2f3; border-radius: 8px; padding: 8px 10px; margin-bottom: 10px; line-height: 1.6; }
.fia-badge { display: inline-block; font-size: 11px; padding: 1px 6px; border-radius: 8px; background: #8e44ad; color: #fff; margin-right: 4px; vertical-align: middle; }

// 子组详情弹窗
.subinfo { display: flex; flex-direction: column; gap: 4px; }
.subinfo .kv { display: flex; gap: 8px; font-size: 13px; padding: 2px 0; }
.subinfo .kv-k { color: #8a98a8; min-width: 56px; }
.subinfo .kv-v { color: #1f2d3d; font-weight: 600; }
.kv-note { font-size: 12px; color: #b26a00; margin-top: 6px; }
</style>
