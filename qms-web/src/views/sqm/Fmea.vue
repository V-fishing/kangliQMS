<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { sqmApi } from '@/api'
import type { FmeaRisk, FmeaRiskTrack } from '@/types/sqm'

const risks = ref<FmeaRisk[]>([])
const loading = ref(false)
const filterStatus = ref<'全部' | '待闭环' | '进行中' | '已闭环'>('全部')
const sodFilter = ref<{ s: number; o: number } | null>(null)

const filtered = computed(() => {
  let list = risks.value
  if (sodFilter.value) list = list.filter(r => r.severity === sodFilter.value!.s && r.occurrence === sodFilter.value!.o)
  if (filterStatus.value !== '全部') list = list.filter(r => r.status === filterStatus.value)
  return list
})

const kpi = computed(() => {
  const list = risks.value
  const high = list.filter(r => r.highRiskFlag || r.rpn >= 100).length
  const pending = list.filter(r => r.status === '待闭环').length
  const doing = list.filter(r => r.status === '进行中').length
  const closed = list.filter(r => r.status === '已闭环').length
  const total = pending + doing + closed
  return { high, pending, doing, closed, rate: total > 0 ? Math.round((closed / total) * 100) : 0 }
})

const today = new Date()
const DAY = 86400000
const overdueList = computed(() => risks.value.filter(r => r.status !== '已闭环' && !!r.targetDate && new Date(r.targetDate).getTime() < today.getTime()))
const warnList = computed(() => risks.value.filter(r => r.status !== '已闭环' && !!r.targetDate && new Date(r.targetDate).getTime() - today.getTime() <= 14 * DAY && !overdueList.value.includes(r)))

/* S-O-D 矩阵 */
interface CellAgg { max: number; level: string }
function agg(s: number, o: number): CellAgg {
  let max = 0
  for (const r of risks.value) if (r.severity === s && r.occurrence === o) max = Math.max(max, r.rpn)
  return { max, level: max >= 100 ? '高' : max >= 50 ? '中' : '低' }
}
function cellColor(s: number, o: number): string {
  const { max } = agg(s, o)
  if (max >= 200) return 'rgba(180,0,0,.85)'
  if (max >= 100) return 'rgba(220,60,40,.65)'
  if (max >= 50) return 'rgba(240,160,40,.5)'
  if (max > 0) return 'rgba(100,160,80,.35)'
  return '#f0f2f4'
}
function cellTitle(s: number, o: number): string {
  const { max, level } = agg(s, o)
  return max > 0 ? `S=${s}, O=${o}, RPN=${max}(${level})` : `S=${s}, O=${o}, —`
}
function clickMatrix(s: number, o: number) {
  sodFilter.value = sodFilter.value?.s === s && sodFilter.value?.o === o ? null : { s, o }
}

async function loadRisks() { loading.value = true; try { risks.value = await sqmApi.getFmeaRisks() } finally { loading.value = false } }
onMounted(loadRisks)

/* 风险等级标签 */
const levelTag: Record<string, string> = { '高': 'danger', '中': 'warning', '低': 'info' }

/* 详情 */
const detailVisible = ref(false), detail = ref<FmeaRisk | null>(null), tracks = ref<FmeaRiskTrack[]>([])
async function openDetail(r: FmeaRisk) { detail.value = r; detailVisible.value = true; tracks.value = await sqmApi.getFmeaTracks(r.id) }
const stageIndex = computed(() => { const s = detail.value?.status; if (s === '已闭环') return 4; if (s === '进行中') return 2; return 1 })

/* ---------- 分配措施 ---------- */
const measureVisible = ref(false)
const measureForm = reactive({ id: '', action: '', owner: '', targetDate: '', status: '进行中' as FmeaRisk['status'] })
function openMeasure(r: FmeaRisk) {
  measureForm.id = r.id; measureForm.action = r.action || ''; measureForm.owner = r.owner || ''
  measureForm.targetDate = r.targetDate || ''; measureForm.status = r.status === '已闭环' ? '进行中' : r.status
  measureVisible.value = true
}
async function saveMeasure() {
  if (!measureForm.action.trim() || !measureForm.owner.trim()) { ElMessage.warning('请填写措施与责任人'); return }
  await sqmApi.updateFmea(measureForm.id, { action: measureForm.action, owner: measureForm.owner, targetDate: measureForm.targetDate, status: measureForm.status })
  ElMessage.success('措施已更新'); measureVisible.value = false; await loadRisks()
}

/* ---------- 闭环 ---------- */
const closing = ref(false)
const closeForm = reactive({ id: '', evidence: '', note: '', recurrenceVerified: false })
function openClose(r: FmeaRisk) {
  if (r.status === '已闭环') return ElMessage.info('该风险项已闭环')
  closeForm.id = r.id; closeForm.evidence = ''; closeForm.note = ''; closeForm.recurrenceVerified = false; closing.value = true
}
async function submitClose() {
  if (!closeForm.evidence.trim()) return ElMessage.warning('请填写闭环证据')
  if (!closeForm.recurrenceVerified) return ElMessage.warning('请确认「措施实施后3个月无同类问题复发」')
  await sqmApi.closeFmea(closeForm.id, { evidence: closeForm.evidence, note: closeForm.note, recurrenceVerified: true })
  ElMessage.success('高风险项已闭环'); closing.value = false; await loadRisks()
}

/* ---------- 新建 ---------- */
const creating = ref(false), fmeaTypes = ref<string[]>([])
const createForm = reactive({ fmeaType: 'PFMEA', product: '', process: '', failureMode: '', severity: 5, occurrence: 3, detection: 3, owner: '', targetDate: '', action: '' })
const predict = reactive({ rpn: 0, riskLevel: '低', highRisk: false })
async function refreshPredict() {
  const p = await sqmApi.predictRisk(Number(createForm.severity), Number(createForm.occurrence), Number(createForm.detection))
  predict.rpn = p.rpn; predict.riskLevel = p.riskLevel; predict.highRisk = p.highRisk
}
async function openCreate() {
  fmeaTypes.value = await sqmApi.getFmeaTypes()
  Object.assign(createForm, { fmeaType: 'PFMEA', product: '', process: '', failureMode: '', severity: 5, occurrence: 3, detection: 3, owner: '', targetDate: '', action: '' })
  creating.value = true; await refreshPredict()
}
async function saveCreate() {
  if (!createForm.product || !createForm.process || !createForm.failureMode || !createForm.owner) return ElMessage.warning('请完善产品/工序/失效模式/责任人')
  await sqmApi.createFmea({ fmeaType: createForm.fmeaType, product: createForm.product, process: createForm.process, failureMode: createForm.failureMode, severityS: Number(createForm.severity), occurrenceO: Number(createForm.occurrence), detectionD: Number(createForm.detection), owner: createForm.owner, targetDate: createForm.targetDate, action: createForm.action })
  ElMessage.success('FMEA 风险项已创建'); creating.value = false; await loadRisks()
}
</script>

<template>
  <div class="fmea-page">
    <!-- KPI 卡片 -->
    <div class="kpi-row">
      <div class="kpi-card danger">
        <span class="kpi-num">{{ kpi.high }}</span><span class="kpi-label">高风险项</span>
      </div>
      <div class="kpi-card warn">
        <span class="kpi-num">{{ kpi.pending }}</span><span class="kpi-label">待闭环</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-num">{{ kpi.doing }}</span><span class="kpi-label">措施进行中</span>
      </div>
      <div class="kpi-card done">
        <span class="kpi-num">{{ kpi.closed }} <small>({{ kpi.rate }}%)</small></span>
        <span class="kpi-label">已闭环/闭环率</span>
      </div>
    </div>

    <!-- 逾期/临期再预警 -->
    <el-alert v-if="overdueList.length" type="error" :closable="false" show-icon class="alert" title="逾期预警">
      <span v-for="r in overdueList" :key="r.id" class="alert-item">{{ r.riskNo || r.product }}·{{ r.owner }}</span>
    </el-alert>
    <el-alert v-else-if="warnList.length" type="warning" :closable="false" show-icon class="alert" title="临期预警（14天内）">
      <span v-for="r in warnList" :key="r.id" class="alert-item">{{ r.riskNo || r.product }}·{{ r.owner }}</span>
    </el-alert>

    <!-- 筛选 + 表格 -->
    <div class="qms-card">
      <div class="qms-card__header">
        <h3>FMEA 风险跟踪</h3>
        <div class="seg">
          <button v-for="s in ['全部', '待闭环', '进行中', '已闭环']" :key="s"
                  :class="['seg-btn', { on: filterStatus === s }]" @click="filterStatus = s as any">{{ s }}</button>
        </div>
        <div class="grow" />
        <button class="btn pri sm" @click="openCreate">+ 新建</button>
      </div>
      <div v-if="sodFilter" class="sod-tag-bar">
        矩阵筛选: S={{ sodFilter.s }} O={{ sodFilter.o }}
        <button class="btn sm" @click="sodFilter = null">清除</button>
      </div>
      <div class="qms-card__body" style="padding:0">
        <el-table :data="filtered" v-loading="loading" border size="small" empty-text="暂无 FMEA 风险项">
          <el-table-column prop="riskNo" label="编号" width="110" />
          <el-table-column prop="fmeaType" label="类型" width="80" />
          <el-table-column prop="product" label="产品" width="80" />
          <el-table-column prop="process" label="工序" width="80" />
          <el-table-column prop="failureMode" label="失效模式" min-width="140" show-overflow-tooltip />
          <el-table-column label="S/O/D · RPN" width="120" align="center">
            <template #default="{ row }">
              <span class="sod">{{ row.severity }}/{{ row.occurrence }}/{{ row.detection }}</span>
              <span class="rpn" :class="{ hot: row.rpn >= 100, mid: row.rpn >= 50 && row.rpn < 100 }">{{ row.rpn }}</span>
            </template>
          </el-table-column>
          <el-table-column label="风险等级" width="80" align="center">
            <template #default="{ row }"><el-tag :type="levelTag[row.riskLevel] as any" size="small">{{ row.riskLevel || '—' }}</el-tag></template>
          </el-table-column>
          <el-table-column label="状态" width="85" align="center">
            <template #default="{ row }"><el-tag :type="row.status === '已闭环' ? 'success' : row.status === '进行中' ? 'warning' : 'danger'" size="small">{{ row.status }}</el-tag></template>
          </el-table-column>
          <el-table-column prop="action" label="纠正措施" min-width="160" show-overflow-tooltip />
          <el-table-column prop="owner" label="责任人" width="80" />
          <el-table-column prop="targetDate" label="目标日期" width="98" />
          <el-table-column label="操作" width="160" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" size="small" @click="openDetail(row as FmeaRisk)">详情</el-button>
              <el-button link type="warning" size="small" :disabled="row.status === '已闭环'" @click="openMeasure(row as FmeaRisk)">措施</el-button>
              <el-button link type="success" size="small" :disabled="row.status === '已闭环'" @click="openClose(row as FmeaRisk)">闭环</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <!-- S-O-D 风险矩阵（可点击筛选） -->
    <div class="qms-card">
      <div class="qms-card__header">
        <h3>S-O-D 风险矩阵</h3>
        <span class="tag">点击格子筛选对应风险</span>
      </div>
      <div class="qms-card__body">
        <div class="sod-matrix">
          <div class="sod-corner">S ╲ O</div>
          <div v-for="o in 10" :key="'h'+o" class="sod-head">{{ o }}</div>
          <template v-for="s in 10" :key="'r'+s">
            <div class="sod-rowhead">{{ s }}</div>
            <div v-for="o in 10" :key="s+'-'+o" class="sod-cell"
                 :class="{ active: sodFilter?.s === s && sodFilter?.o === o }"
                 :style="{ background: cellColor(s, o) }"
                 :title="cellTitle(s, o)" @click="clickMatrix(s, o)">
              <span v-if="agg(s,o).max > 0" class="sod-num">{{ agg(s, o).max }}</span>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>

  <!-- ===== 详情弹窗 ===== -->
  <el-dialog v-model="detailVisible" title="FMEA 风险项详情" width="720px">
    <template v-if="detail">
      <el-descriptions :column="2" border size="small">
        <el-descriptions-item label="编号">{{ detail.riskNo }}</el-descriptions-item>
        <el-descriptions-item label="类型">{{ detail.fmeaType }}</el-descriptions-item>
        <el-descriptions-item label="产品/工序">{{ detail.product }} / {{ detail.process }}</el-descriptions-item>
        <el-descriptions-item label="失效模式">{{ detail.failureMode }}</el-descriptions-item>
        <el-descriptions-item label="S/O/D">{{ detail.severity }}/{{ detail.occurrence }}/{{ detail.detection }}</el-descriptions-item>
        <el-descriptions-item label="RPN/等级">{{ detail.rpn }} / {{ detail.riskLevel }}</el-descriptions-item>
        <el-descriptions-item label="责任人">{{ detail.owner }}</el-descriptions-item>
        <el-descriptions-item label="目标日期">{{ detail.targetDate }}</el-descriptions-item>
        <el-descriptions-item label="纠正措施" :span="2">{{ detail.action }}</el-descriptions-item>
        <el-descriptions-item label="闭环证据" :span="2">{{ detail.evidence || '—' }}</el-descriptions-item>
      </el-descriptions>
      <div class="sec-title">高风险闭环流程</div>
      <el-steps :active="stageIndex" align-center finish-status="success" class="flow-steps">
        <el-step title="识别" />
        <el-step title="措施分配" />
        <el-step title="措施验证" />
        <el-step title="闭环" />
      </el-steps>
      <div class="sec-title">闭环轨迹</div>
      <el-timeline v-if="tracks.length">
        <el-timeline-item v-for="t in tracks" :key="t.id" :timestamp="t.operateTime || ''" :type="t.toStatus === '已闭环' ? 'success' : 'primary'">
          <b>{{ t.toStatus }}</b> · {{ t.operator }}<br />
          <span class="note">{{ t.actionNote }}<span v-if="t.evidence">（{{ t.evidence }}）</span></span>
        </el-timeline-item>
      </el-timeline>
      <el-empty v-else description="暂无轨迹记录" :image-size="60" />
    </template>
  </el-dialog>

  <!-- ===== 分配措施弹窗 ===== -->
  <el-dialog v-model="measureVisible" title="分配纠正措施" width="500px">
    <el-form label-width="96px">
      <el-form-item label="纠正措施" required><el-input v-model="measureForm.action" type="textarea" :rows="2" /></el-form-item>
      <el-form-item label="责任人" required><el-input v-model="measureForm.owner" /></el-form-item>
      <el-form-item label="目标日期"><el-date-picker v-model="measureForm.targetDate" type="date" value-format="YYYY-MM-DD" /></el-form-item>
      <el-form-item label="状态"><el-radio-group v-model="measureForm.status"><el-radio label="待闭环">待闭环</el-radio><el-radio label="进行中">进行中</el-radio></el-radio-group></el-form-item>
    </el-form>
    <template #footer><el-button @click="measureVisible = false">取消</el-button><el-button type="primary" @click="saveMeasure">保存</el-button></template>
  </el-dialog>

  <!-- ===== 闭环弹窗 ===== -->
  <el-dialog v-model="closing" title="高风险闭环确认" width="500px">
    <el-alert type="warning" :closable="false" title="闭环条件" description="需同时满足：①已提交措施执行证据；②措施实施后3个月无同类问题复发。" style="margin-bottom:12px" />
    <el-form label-width="96px">
      <el-form-item label="闭环证据" required><el-input v-model="closeForm.evidence" type="textarea" :rows="2" /></el-form-item>
      <el-form-item label="说明"><el-input v-model="closeForm.note" /></el-form-item>
      <el-form-item><el-checkbox v-model="closeForm.recurrenceVerified">确认措施实施后 3 个月无同类问题复发</el-checkbox></el-form-item>
    </el-form>
    <template #footer><el-button @click="closing = false">取消</el-button><el-button type="success" @click="submitClose">确认闭环</el-button></template>
  </el-dialog>

  <!-- ===== 新建弹窗 ===== -->
  <el-dialog v-model="creating" title="新建 FMEA 风险项" width="580px">
    <el-form label-width="96px">
      <el-form-item label="FMEA 类型"><el-select v-model="createForm.fmeaType" style="width:100%"><el-option v-for="t in fmeaTypes" :key="t" :label="t" :value="t" /></el-select></el-form-item>
      <el-form-item label="产品" required><el-input v-model="createForm.product" /></el-form-item>
      <el-form-item label="工序" required><el-input v-model="createForm.process" /></el-form-item>
      <el-form-item label="失效模式" required><el-input v-model="createForm.failureMode" type="textarea" :rows="2" /></el-form-item>
      <el-form-item label="S / O / D">
        <el-input-number v-model="createForm.severity" :min="1" :max="10" size="small" @change="refreshPredict" style="width:90px" />
        <span class="sod-sep">/</span>
        <el-input-number v-model="createForm.occurrence" :min="1" :max="10" size="small" @change="refreshPredict" style="width:90px" />
        <span class="sod-sep">/</span>
        <el-input-number v-model="createForm.detection" :min="1" :max="10" size="small" @change="refreshPredict" style="width:90px" />
        <span class="sod-sep" style="margin-left:12px">→</span>
        <el-tag :type="predict.rpn >= 100 ? 'danger' : predict.rpn >= 50 ? 'warning' : 'info'">
          RPN={{ predict.rpn }} · {{ predict.riskLevel }}<span v-if="predict.highRisk"> · ⚠高风险</span>
        </el-tag>
      </el-form-item>
      <el-form-item label="责任人" required><el-input v-model="createForm.owner" /></el-form-item>
      <el-form-item label="目标日期"><el-date-picker v-model="createForm.targetDate" type="date" value-format="YYYY-MM-DD" /></el-form-item>
      <el-form-item label="拟采取措施"><el-input v-model="createForm.action" type="textarea" :rows="2" /></el-form-item>
    </el-form>
    <template #footer><el-button @click="creating = false">取消</el-button><el-button type="primary" @click="saveCreate">创建</el-button></template>
  </el-dialog>
</template>

<style scoped lang="scss">
.fmea-page { display: flex; flex-direction: column; gap: 14px; padding: 4px; }

/* KPI 统一卡片 */
.kpi-row { display: flex; gap: 10px; flex-wrap: wrap; }
.kpi-card {
  flex: 1; min-width: 100px;
  background: #f4f8ff; border: 1px solid #dbe7f7; border-radius: 8px;
  padding: 10px 12px; display: flex; flex-direction: column; gap: 2px;
  &.danger { background: #fdecea; border-color: #f5c6c0; .kpi-num { color: #c0392b; } }
  &.warn { background: #fff8e1; border-color: #f0c14b; .kpi-num { color: #b58a00; } }
  &.done { background: #e8f5e9; border-color: #b7e0bb; .kpi-num { color: #2e7d32; } }
  .kpi-num { font-size: 22px; font-weight: 700; color: #1e4d8b; line-height: 1.2; small { font-size: 14px; font-weight: 500; } }
  .kpi-label { font-size: 11px; color: #6b7785; }
}

.alert { margin-bottom: 0; }
.alert-item { margin-right: 10px; font-weight: 600; }

/* 筛选 seg */
.seg { display: inline-flex; gap: 4px; }
.seg-btn {
  border: 1px solid #dbe7f7; background: #fff; border-radius: 4px;
  padding: 3px 10px; font-size: 12px; cursor: pointer; transition: 0.15s;
  &:hover { border-color: #1e4d8b; }
  &.on { background: #1e4d8b; border-color: #1e4d8b; color: #fff; }
}
.grow { flex: 1; }
.btn { border: 1px solid #e1e8f0; background: #fff; border-radius: 6px; padding: 4px 10px; font-size: 12px; cursor: pointer; &.pri { background: #1e4d8b; color: #fff; } &.sm { padding: 3px 8px; } }

/* 矩阵筛选tag */
.sod-tag-bar { padding: 6px 14px; background: #fff3cd; border-bottom: 1px solid #f0c14b; font-size: 12px; color: #7a6500; display: flex; align-items: center; gap: 8px; }

/* 表格内 SOD/RPN */
.sod { font-family: monospace; font-weight: 700; color: #3a4a5c; }
.rpn { font-weight: 700; margin-left: 6px; font-size: 13.5px; &.hot { color: #c0392b; } &.mid { color: #e6a23c; } }

/* 矩阵 */
.sod-matrix { display: grid; grid-template-columns: 42px repeat(10, 1fr); gap: 2px; max-width: 680px; }
.sod-corner, .sod-head, .sod-rowhead { display: flex; align-items: center; justify-content: center; font-size: 11px; color: #606266; background: #f5f7fa; border-radius: 3px; }
.sod-cell { height: 24px; border-radius: 3px; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 10px; cursor: pointer; transition: 0.1s;
  &:hover { outline: 2px solid #1e4d8b; outline-offset: -1px; }
  &.active { outline: 2px solid #c0392b; outline-offset: -1px; }
}
.sod-num { font-weight: 700; }

/* 详情 */
.sec-title { font-weight: 600; margin: 16px 0 8px; color: #1e4d8b; font-size: 13px; }
.note { font-size: 12px; color: #909399; }

.sod-sep { margin: 0 6px; color: #909399; font-weight: 600; }

.tag { font-size: 11px; color: #8a94a6; padding: 2px 8px; background: #f0f2f4; border-radius: 3px; }
</style>
