<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { BANNERS } from '@/config/banners'
import { sqmApi } from '@/api'
import type {
  Supplier, SupQualification, SupplierPerformance, GradeRule, SupplierShare,
  SupplierEscalation, AuditFreqRule,
} from '@/types/sqm'

const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()
/** 从生命周期跳转审核页（Flow 3: 生命周期→现场审核） */
function goAudit(supId: string, supName: string) {
  router.push({ path: '/sqm/audit', query: { supId, supName, from: 'lifecycle' } })
}
const banner = BANNERS.sqm?.[authStore.role] || {
  title: 'SQM · 供应商全生命周期管理',
  desc: '从供应商准入申请、建档、资质预警、绩效采集与分级、份额调整、审核频次联动、升级淘汰到续期冻结的全过程电子档案',
}

// 真实今天（用于资质到期预警计算）
const TODAY = new Date().toISOString().slice(0, 10)
const now = new Date()
const curPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

// 供应商主数据：真实后端 /v1/sqm/suppliers
const suppliers = ref<Supplier[]>([])
async function load() {
  try {
    suppliers.value = await sqmApi.getSuppliers()
    const qSupId = route.query.supId as string | undefined
    if (qSupId && suppliers.value.find((s) => s.id === qSupId)) {
      curId.value = qSupId
    } else if (suppliers.value.length && !curId.value) {
      curId.value = suppliers.value[0].id
    }
    await Promise.all([loadGlobal(), loadExtensions(), loadRanking()])
  } catch (e) {
    // 错误已由 request 拦截器统一提示
  }
}
onMounted(load)
// keep-alive 场景：从审核页下钻时自动选中供应商
watch(() => route.query.supId, (id) => { if (id && suppliers.value.find((s) => s.id === id)) curId.value = id as string })

const curId = ref('')
const cur = computed(() => suppliers.value.find((s) => s.id === curId.value) || suppliers.value[0])
function select(id: string) { curId.value = id }

function statusPill(st: Supplier['status']) {
  return {
    '待审核': 'gray', '合格': 'g', '启用': 'g', '观察': 'y', '整改中': 'y',
    '不合格': 'r', '暂停': 'y', '淘汰': 'r',
  }[st] || 'gray'
}
function levelColor(l?: string) {
  return ({ A: '#2f7d32', B: '#1e88e5', C: '#f59e0b', D: '#c0392b' } as Record<string, string>)[l || ''] || '#6b7785'
}

// ===== 供应商准入申请（供应商自助发起，作为流程起点） =====
const applyVisible = ref(false)
const submitting = ref(false)
const applyForm = reactive<{
  supplierCode: string; name: string; category: string; creditCode: string
  contactPerson: string; contactPhone: string; address: string
  qualifications: { name: string; type: string; expireDate: string }[]
}>({
  supplierCode: '', name: '', category: '', creditCode: '',
  contactPerson: '', contactPhone: '', address: '',
  qualifications: [{ name: '', type: '', expireDate: '' }],
})
function addQual() { applyForm.qualifications.push({ name: '', type: '', expireDate: '' }) }
function delQual(i: number) { applyForm.qualifications.splice(i, 1) }
function resetApply() {
  applyForm.supplierCode = ''; applyForm.name = ''; applyForm.category = ''; applyForm.creditCode = ''
  applyForm.contactPerson = ''; applyForm.contactPhone = ''; applyForm.address = ''
  applyForm.qualifications = [{ name: '', type: '', expireDate: '' }]
}
async function submitApply() {
  if (!applyForm.name || !applyForm.supplierCode || !applyForm.category) {
    ElMessage.warning('请填写供应商名称、编码与类别'); return
  }
  const quals = applyForm.qualifications.filter((q) => q.name && q.expireDate)
  if (!quals.length) { ElMessage.warning('请至少填写一项资质及到期日'); return }
  submitting.value = true
  try {
    await sqmApi.createSupplier({
      supplierCode: applyForm.supplierCode,
      name: applyForm.name,
      category: applyForm.category,
      creditCode: applyForm.creditCode || undefined,
      contactPerson: applyForm.contactPerson,
      contactPhone: applyForm.contactPhone,
      address: applyForm.address,
      certs: JSON.stringify(quals),
      status: '待审核',
    })
    ElMessage.success('供应商准入申请已提交，等待资质审核')
    applyVisible.value = false
    resetApply()
    await load()
  } finally { submitting.value = false }
}

// 已通过审核的供应商(可进入合作阶段,展示完整生命周期)
const approvedSuppliers = computed(() => suppliers.value.filter((s) => s.status !== '待审核' && s.status !== '不合格'))
// 待审核申请列表（供应商身份提交的准入申请）
const pendingApplies = computed(() => suppliers.value.filter((s) => s.status === '待审核'))
const approveTarget = reactive<Record<string, Supplier['status']>>({})
function getTarget(id: string): Supplier['status'] {
  if (!approveTarget[id]) approveTarget[id] = '合格'
  return approveTarget[id]
}
async function approveApply(s: Supplier) {
  const st = approveTarget[s.id] || '合格'
  await sqmApi.updateSupplier(s.id, { id: s.id, status: st })
  ElMessage.success(`【${s.name}】准入审核通过，已进入「${st}」状态`)
  await load()
}
async function rejectApply(s: Supplier) {
  await sqmApi.updateSupplier(s.id, { id: s.id, status: '不合格' })
  ElMessage.success(`【${s.name}】准入申请已拒绝`)
  await load()
}

// ===== 状态升级 / 冻结 / 解冻（手动将供应商升级到新状态） =====
const upgradeVisible = ref(false)
const upgradeTarget = ref<Supplier['status']>('合格')
const UPGRADE_OPTIONS: { label: string; value: Supplier['status'] }[] = [
  { label: '合格（正式合作）', value: '合格' },
  { label: '观察（观察期）', value: '观察' },
  { label: '整改中', value: '整改中' },
  { label: '暂停（冻结）', value: '暂停' },
  { label: '淘汰（退出合作）', value: '淘汰' },
  { label: '不合格（暂停）', value: '不合格' },
]
function openUpgrade(s: Supplier) {
  curId.value = s.id
  upgradeTarget.value = '合格'
  upgradeVisible.value = true
}
async function doUpgrade() {
  if (!cur.value) return
  await sqmApi.updateSupplier(cur.value.id, { id: cur.value.id, status: upgradeTarget.value })
  ElMessage.success(`【${cur.value.name}】状态已升级为「${upgradeTarget.value}」`)
  upgradeVisible.value = false
  await load()
}
async function freezeSupplier() {
  if (!cur.value) return
  await sqmApi.updateSupplier(cur.value.id, { id: cur.value.id, status: '暂停' })
  ElMessage.success(`【${cur.value.name}】已冻结`)
  await load()
}
async function unfreezeSupplier() {
  if (!cur.value) return
  await sqmApi.updateSupplier(cur.value.id, { id: cur.value.id, status: '合格' })
  ElMessage.success(`【${cur.value.name}】已解冻，恢复合作`)
  await load()
}

// ===== 资质到期预警（三级预警 90/60/30 天，基于真实 expireDate） =====
function daysLeft(q: SupQualification) {
  return Math.ceil((new Date(q.expireDate).getTime() - new Date(TODAY).getTime()) / 86400000)
}
function calcWarn(q: SupQualification): SupQualification['warnLevel'] {
  const d = daysLeft(q)
  if (d <= 0) return '已过期'
  if (d <= 30) return '紧急'
  if (d <= 60) return '警告'
  if (d <= 90) return '提醒'
  return '正常'
}
function warnColor(w: SupQualification['warnLevel']) {
  return { 正常: '#2f7d32', 提醒: '#1e88e5', 警告: '#f59e0b', 紧急: '#ef6c00', 已过期: '#c0392b' }[w] || '#6b7785'
}
const warnList = computed(() => {
  const out: { sup: string; q: SupQualification; supId: string; idx: number }[] = []
  suppliers.value.forEach((s) => (s.qualifications || []).forEach((q, idx) => {
    if (daysLeft(q) <= 90) out.push({ sup: s.name, q, supId: s.id, idx })
  }))
  return out.sort((a, b) => daysLeft(a.q) - daysLeft(b.q))
})
// 资质续期（R：续期，写回 certs JSON）
const renewVisible = ref(false)
const renewIndex = ref(-1)
const renewForm = reactive<{ name: string; expireDate: string }>({ name: '', expireDate: '' })
function openRenew(supId: string, idx: number) {
  const s = suppliers.value.find((x) => x.id === supId)
  if (!s) return
  const q = (s.qualifications || [])[idx]
  if (!q) return
  curId.value = supId
  renewIndex.value = idx
  renewForm.name = q.name
  const base = new Date(TODAY)
  base.setFullYear(base.getFullYear() + 1)
  renewForm.expireDate = base.toISOString().slice(0, 10)
  renewVisible.value = true
}
async function saveRenew() {
  if (!cur.value) return
  const quals = (cur.value.qualifications || []).map((q, i) =>
    i === renewIndex.value ? { ...q, expireDate: renewForm.expireDate } : q)
  await sqmApi.updateSupplier(cur.value.id, { id: cur.value.id, certs: JSON.stringify(quals) })
  ElMessage.success(`【${cur.value.name}】资质「${renewForm.name}」已续期至 ${renewForm.expireDate}`)
  renewVisible.value = false
  await load()
}

// ===== 生命周期流程图（高亮当前供应商所处阶段） =====
const FLOW = ['准入申请', '建立电子档案', '资质审核', '正式合作', '绩效采集', '绩效评审', '绩效分级', '现场审核', '审核结果', '整改/闭环', '淘汰']
function stageOf(s: Supplier): number {
  switch (s.status) {
    case '待审核': return 0
    case '合格': case '启用': {
      if (performances.value.length) {
        const lvl = curPerf.value?.level
        if (lvl && lvl !== 'D') return 6
        return 4
      }
      return 3
    }
    case '观察': return 5
    case '整改中': case '暂停': return 8
    case '淘汰': case '不合格': return 10
    default: return 0
  }
}
const curStage = computed(() => (cur.value ? stageOf(cur.value) : 0))

// ===== 绩效采集 / 分级（F / H） =====
const perfPeriod = ref(curPeriod)
const performances = ref<SupplierPerformance[]>([])
const curPerf = computed(() => {
  const list = performances.value
  if (!list.length) return null
  return list.slice().sort((a, b) => b.period.localeCompare(a.period))[0]
})
const perfAddVisible = ref(false)
const perfForm = reactive<{
  period: string; score: number; incomingPassRate: number; deliveryTimelyRate: number
}>({ period: curPeriod, score: 0, incomingPassRate: 0, deliveryTimelyRate: 100 })
async function calcPerf() {
  if (!cur.value) return
  try {
    await sqmApi.calcPerformance(cur.value.id, perfPeriod.value)
    ElMessage.success(`已基于来料批次自动采集【${cur.value.name}】${perfPeriod.value} 绩效`)
    await loadExtensions(); await loadRanking()
  } catch (e) { /* 拦截器已提示 */ }
}
function openPerfAdd() {
  if (!cur.value) return
  perfForm.period = perfPeriod.value
  perfForm.score = 0; perfForm.incomingPassRate = 0; perfForm.deliveryTimelyRate = 100
  perfAddVisible.value = true
}
async function savePerf() {
  if (!cur.value) return
  if (!perfForm.period || perfForm.score <= 0) { ElMessage.warning('请填写周期与有效得分'); return }
  try {
    await sqmApi.createPerformance({
      supplierId: cur.value.id, period: perfForm.period,
      score: perfForm.score, incomingPassRate: perfForm.incomingPassRate,
      deliveryTimelyRate: perfForm.deliveryTimelyRate,
    })
    ElMessage.success('绩效记录已保存')
    perfAddVisible.value = false
    await loadExtensions(); await loadRanking()
  } catch (e) { /* 拦截器已提示 */ }
}

// ===== 供应商绩效排名（G） =====
const ranking = ref<{ supplierId: string; supName: string; score: number; level: string; period: string }[]>([])
async function loadRanking() {
  try {
    const list = await sqmApi.getPerformanceRanking(perfPeriod.value)
    const supMap: Record<string, string> = {}
    suppliers.value.forEach((s) => { supMap[s.id] = s.name })
    ranking.value = list
      .map((m) => ({
        supplierId: String(m.supplierId || ''),
        supName: supMap[String(m.supplierId || '')] || '',
        score: Number(m.score || 0),
        level: String(m.level || ''),
        period: String(m.period || ''),
      }))
      .sort((a, b) => b.score - a.score)
  } catch (e) { /* 忽略 */ }
}
watch(perfPeriod, loadRanking)

// ===== 评级规则（H，全局） =====
const gradeRules = ref<GradeRule[]>([])
const gradeVisible = ref(false)
const gradeForm = reactive<{ id: string; scoreMin: number; scoreMax: number; level: 'A' | 'B' | 'C' | 'D'; observeFirstYear: boolean }>({
  id: '', scoreMin: 90, scoreMax: 100, level: 'A', observeFirstYear: false,
})
function openGradeAdd() {
  gradeForm.id = ''; gradeForm.scoreMin = 90; gradeForm.scoreMax = 100; gradeForm.level = 'A'; gradeForm.observeFirstYear = false
  gradeVisible.value = true
}
async function saveGrade() {
  try {
    if (gradeForm.id) {
      await sqmApi.updateGradeRule({ id: gradeForm.id, scoreMin: gradeForm.scoreMin, scoreMax: gradeForm.scoreMax, level: gradeForm.level, observeFirstYear: gradeForm.observeFirstYear })
    } else {
      await sqmApi.createGradeRule({ scoreMin: gradeForm.scoreMin, scoreMax: gradeForm.scoreMax, level: gradeForm.level, observeFirstYear: gradeForm.observeFirstYear })
    }
    ElMessage.success('评级规则已保存')
    gradeVisible.value = false
    await loadGlobal()
  } catch (e) { /* 拦截器已提示 */ }
}
async function editGrade(g: GradeRule) {
  gradeForm.id = g.id; gradeForm.scoreMin = g.scoreMin; gradeForm.scoreMax = g.scoreMax; gradeForm.level = g.level; gradeForm.observeFirstYear = !!g.observeFirstYear
  gradeVisible.value = true
}
async function delGrade(id: string) {
  try { await sqmApi.deleteGradeRule(id); ElMessage.success('已删除'); await loadGlobal() } catch (e) { /* 忽略 */ }
}

// ===== 份额管理（I） =====
const shares = ref<SupplierShare[]>([])
const shareVisible = ref(false)
const SHARE_BY_LEVEL: Record<string, number> = { A: 70, B: 50, C: 30, D: 10 }
const shareForm = reactive<{
  partNo: string; shareRatio: number; effectiveDate: string; changeReason: string; linkedLevel: 'A' | 'B' | 'C' | 'D'
}>({ partNo: '', shareRatio: 50, effectiveDate: TODAY, changeReason: '', linkedLevel: 'B' })
function openShareAdd() {
  if (!cur.value) return
  shareForm.partNo = ''
  shareForm.linkedLevel = (cur.value.level || 'D') as 'A' | 'B' | 'C' | 'D'
  shareForm.shareRatio = SHARE_BY_LEVEL[shareForm.linkedLevel] || 50
  shareForm.effectiveDate = TODAY
  shareForm.changeReason = `按 ${shareForm.linkedLevel} 级绩效联动调整`
  shareVisible.value = true
}
async function saveShare() {
  if (!cur.value) return
  if (!shareForm.partNo) { ElMessage.warning('请填写物料编码'); return }
  try {
    await sqmApi.createShare({
      supplierId: cur.value.id, partNo: shareForm.partNo,
      shareRatio: shareForm.shareRatio, effectiveDate: shareForm.effectiveDate,
      changeReason: shareForm.changeReason, linkedLevel: shareForm.linkedLevel,
    })
    ElMessage.success('份额调整已提交')
    shareVisible.value = false
    await loadExtensions()
  } catch (e) { /* 拦截器已提示 */ }
}

// ===== 审核频次联动（J） =====
const freqRules = ref<AuditFreqRule[]>([])
const freqVisible = ref(false)
const freqForm = reactive<{
  id: string; level: 'A' | 'B' | 'C' | 'D'; freqPerYear: number; auditType: string; riskLevel: string
}>({ id: '', level: 'A', freqPerYear: 1, auditType: '年度复审', riskLevel: '' })
const curFreqRule = computed(() => freqRules.value.find((r) => r.level === (cur.value?.level || 'D')) || null)
function openFreqAdd() {
  freqForm.id = ''; freqForm.level = 'A'; freqForm.freqPerYear = 1; freqForm.auditType = '年度复审'; freqForm.riskLevel = ''
  freqVisible.value = true
}
async function saveFreq() {
  try {
    if (freqForm.id) {
      await sqmApi.updateAuditFreqRule({ id: freqForm.id, level: freqForm.level, freqPerYear: freqForm.freqPerYear, auditType: freqForm.auditType, riskLevel: freqForm.riskLevel })
    } else {
      await sqmApi.createAuditFreqRule({ level: freqForm.level, freqPerYear: freqForm.freqPerYear, auditType: freqForm.auditType, riskLevel: freqForm.riskLevel })
    }
    ElMessage.success('审核频次规则已保存')
    freqVisible.value = false
    await loadGlobal()
  } catch (e) { /* 拦截器已提示 */ }
}
async function delFreq(id: string) {
  try { await sqmApi.deleteAuditFreqRule(id); ElMessage.success('已删除'); await loadGlobal() } catch (e) { /* 忽略 */ }
}

// ===== 升级与淘汰（O） =====
const escalations = ref<SupplierEscalation[]>([])
const escVisible = ref(false)
const escForm = reactive<{
  currentLevel: 'A' | 'B' | 'C' | 'D'; qualityIssueCount6m: number; repeatProblemCount: number
  suggestedAction: string; escalationStatus: string; escalationAction: string
}>({ currentLevel: 'D', qualityIssueCount6m: 0, repeatProblemCount: 0, suggestedAction: '观察', escalationStatus: '待处理', escalationAction: '' })
function openEsc() {
  if (!cur.value) return
  escForm.currentLevel = (cur.value.level || 'D') as 'A' | 'B' | 'C' | 'D'
  escForm.qualityIssueCount6m = 0; escForm.repeatProblemCount = 0
  escForm.suggestedAction = '观察'; escForm.escalationStatus = '待处理'; escForm.escalationAction = ''
  escVisible.value = true
}
async function saveEsc() {
  if (!cur.value) return
  const isEliminate = escForm.suggestedAction === '淘汰'
  try {
    await sqmApi.createEscalation({
      supplierId: cur.value.id, currentLevel: escForm.currentLevel,
      qualityIssueCount6m: escForm.qualityIssueCount6m, repeatProblemCount: escForm.repeatProblemCount,
      suggestedAction: escForm.suggestedAction, escalationStatus: escForm.escalationStatus,
      escalationAction: escForm.escalationAction,
    })
    ElMessage.success('升级/淘汰记录已提交')
    if (isEliminate) {
      await sqmApi.updateSupplier(cur.value.id, { id: cur.value.id, status: '淘汰' })
      ElMessage.warning(`【${cur.value.name}】已被标记为淘汰`)
    }
    escVisible.value = false
    await loadExtensions()
  } catch (e) { /* 拦截器已提示 */ }
}

// ===== 加载编排 =====
let globalLoaded = false
async function loadGlobal() {
  if (globalLoaded) {
    // 仅刷新规则类（开销小）
    try { gradeRules.value = await sqmApi.getGradeRules() } catch (e) { /* 忽略 */ }
    try { freqRules.value = await sqmApi.getAuditFreqRules() } catch (e) { /* 忽略 */ }
    return
  }
  try {
    ;[gradeRules.value, freqRules.value] = await Promise.all([
      sqmApi.getGradeRules(), sqmApi.getAuditFreqRules(),
    ])
    globalLoaded = true
  } catch (e) { /* 忽略 */ }
}
async function loadExtensions() {
  if (!cur.value) return
  const id = cur.value.id
  try { performances.value = await sqmApi.getPerformance(id) } catch (e) { performances.value = [] }
  try { shares.value = await sqmApi.getShares(id) } catch (e) { shares.value = [] }
  try { escalations.value = await sqmApi.getEscalations(id) } catch (e) { escalations.value = [] }
}
watch(curId, loadExtensions)
</script>

<template>
  <div class="sqm-life">
    <div class="qms-banner">
      <div class="qms-banner__icon" :style="{ background: authStore.currentRole?.color }">🗂️</div>
      <div>
        <div class="qms-banner__title">{{ banner.title }}</div>
        <div class="qms-banner__desc">{{ banner.desc }}</div>
      </div>
      <el-button type="primary" size="small" style="margin-left:auto" @click="applyVisible = true">
        ＋ 发起供应商准入申请
      </el-button>
    </div>

    <!-- KPI -->
    <div class="kpi-row" style="grid-template-columns: repeat(4, 1fr)">
      <div class="kpi"><div class="val">{{ approvedSuppliers.length }}</div><div class="lbl">在管供应商</div></div>
      <div class="kpi"><div class="val" style="color:#f59e0b">{{ pendingApplies.length }}</div><div class="lbl">待审核申请</div></div>
      <div class="kpi"><div class="val" style="color:#2f7d32">{{ suppliers.filter(s => s.status === '合格' || s.status === '启用').length }}</div><div class="lbl">已合作</div></div>
      <div class="kpi"><div class="val" style="color:#c0392b">{{ suppliers.filter(s => s.status === '不合格' || s.status === '淘汰' || s.status === '暂停').length }}</div><div class="lbl">冻结/淘汰</div></div>
    </div>

    <!-- 待审核的供应商准入申请（内部审核入口） -->
    <div class="qms-card">
      <div class="qms-card__header"><h3>待审核的供应商准入申请</h3><span class="tag" :class="pendingApplies.length ? '': 'dim'">{{ pendingApplies.length }} 条</span></div>
      <div class="qms-card__body" style="padding:0">
        <table v-if="pendingApplies.length" class="tbl">
          <thead><tr><th>供应商</th><th>编码</th><th>类别</th><th>联系人</th><th>资质</th><th>操作</th></tr></thead>
          <tbody>
            <tr v-for="s in pendingApplies" :key="s.id">
              <td><strong>{{ s.name }}</strong></td>
              <td>{{ s.code }}</td>
              <td>{{ s.category }}</td>
              <td>{{ s.contact }} / {{ s.tel }}</td>
              <td>{{ (s.qualifications || []).length }} 项</td>
              <td>
                <el-select v-model="approveTarget[s.id]" size="small" style="width:110px" @click.stop>
                  <el-option label="合格（正式合作）" value="合格" />
                  <el-option label="观察（观察期）" value="观察" />
                  <el-option label="整改中" value="整改中" />
                </el-select>
                <el-button type="success" size="small" @click="approveApply(s)" style="margin-left:4px">通过</el-button>
                <el-button type="danger" size="small" plain @click="rejectApply(s)">拒绝</el-button>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-else style="padding:24px;text-align:center;color:#9ca3af;font-size:13px">
          暂无待审核的准入申请。使用上方「＋ 发起供应商准入申请」提交新申请。
        </div>
      </div>
    </div>

    <!-- 资质到期预警 -->
    <el-alert
      v-if="warnList.length"
      type="warning" :closable="false" show-icon
      :title="`资质到期预警：${warnList.length} 项资质将在 90 天内到期，需及时换证/更新`"
    />
    <div v-if="warnList.length" class="qms-card warn-card">
      <div class="qms-card__header"><h3>资质到期预警（R：可续期）</h3></div>
      <div class="qms-card__body" style="padding:10px 12px">
        <div v-for="(w, i) in warnList" :key="i" class="warn-item">
          <span class="qms-pill" :style="{ background: warnColor(w.q.warnLevel), color:'#fff' }">{{ w.q.warnLevel }}</span>
          <span class="wsup">{{ w.sup }}</span>
          <span class="wname">{{ w.q.name }}</span>
          <span class="wmuted">到期 {{ w.q.expireDate }} · 剩余 {{ daysLeft(w.q) }} 天</span>
          <el-button size="small" type="warning" plain style="margin-left:8px" @click="openRenew(w.supId, w.idx)">续期</el-button>
        </div>
      </div>
    </div>

    <!-- 生命周期流程图（高亮当前供应商所处阶段） -->
    <div v-if="cur" class="qms-card">
      <div class="qms-card__header">
        <h3>供应商全生命周期流程</h3>
        <span class="qms-pill" :class="statusPill(cur.status)">{{ cur.status }}</span>
      </div>
      <!-- TODO：11 阶段流程未定，具体待实现（与 CAPA 一致） -->
      <div class="lc-placeholder">
        <span class="lc-placeholder__icon">🚧</span>
        <div class="lc-placeholder__body">
          <div class="lc-placeholder__title">生命周期阶段门控待实现</div>
          <div class="lc-placeholder__desc">
            当前阶段仅由 <code>status</code> 字段映射展示，未与准入申请/资质审核/绩效/审核/CAPA 等子模块真正打通。
            后续将参照 8D <code>qms_8d_stage</code> 表建立 <code>qms_supplier_lifecycle</code> 阶段表，
            记录每阶段内容、责任人、审批签字与阶段门控。
          </div>
        </div>
      </div>
      <div class="qms-card__body">
        <div class="flow-bar">
          <template v-for="(n, i) in FLOW" :key="i">
            <div class="fnode" :class="i === curStage ? 'now' : (i < curStage ? 'done' : 'todo')">
              <div class="fdot" />
              <div class="ftext">{{ n }}</div>
            </div>
            <div v-if="i < FLOW.length - 1" class="fline" :class="i < curStage ? 'done' : ''" />
          </template>
        </div>
        <div class="fstage-tip">当前【{{ cur.name }}】所处阶段：<b>{{ FLOW[curStage] }}</b></div>
      </div>
    </div>

    <!-- 已合作供应商选择条(按状态分组) -->
    <div class="qms-card">
      <div class="qms-card__header">
        <h3>已合作供应商 ({{ approvedSuppliers.length }})</h3>
        <span class="muted" style="font-size:11px">点击切换查看详情</span>
      </div>
      <div class="qms-card__body">
        <div v-if="!approvedSuppliers.length" class="muted" style="padding:18px;text-align:center">暂无已合作供应商。请先在「待审核申请」中审核通过准入申请。</div>
        <div v-else class="sup-grid">
          <div
            v-for="s in approvedSuppliers" :key="s.id"
            class="sup-chip" :class="{ active: s.id === curId }"
            @click="select(s.id)"
          >
            <div class="sc-name">{{ s.name }}</div>
            <div class="sc-meta">
              <span class="qms-pill" :class="statusPill(s.status)">{{ s.status }}</span>
              <span class="sc-level" v-if="s.level">{{ s.level }}级</span>
            </div>
            <div class="sc-foot">
              <span>{{ (s.qualifications || []).length }} 资质</span>
              <span>· {{ s.perfScore || '—' }} 绩效</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="cur" class="detail-grid">
      <!-- 基本档案 -->
      <div class="qms-card">
        <div class="qms-card__header"><h3>基本档案</h3></div>
        <div class="qms-card__body">
          <div class="kv-box">
            <div class="kv"><div class="k">供应商编号</div><div>{{ cur.supplierNo || cur.id }}（{{ cur.code }}）</div></div>
            <div class="kv"><div class="k">类别</div><div>{{ cur.category }}</div></div>
            <div class="kv">
              <div class="k">状态</div>
              <div>
                <span class="qms-pill" :class="statusPill(cur.status)">{{ cur.status }}</span>
                <el-button size="small" text type="warning" style="margin-left:8px" @click="openUpgrade(cur)">状态升级</el-button>
                <el-button v-if="cur.status !== '暂停'" size="small" text type="info" style="margin-left:4px" @click="freezeSupplier">冻结</el-button>
                <el-button v-else size="small" text type="success" style="margin-left:4px" @click="unfreezeSupplier">解冻</el-button>
                <el-button size="small" text type="primary" style="margin-left:4px" @click="goAudit(cur.id, cur.name)">发起审核</el-button>
              </div>
            </div>
            <div class="kv">
              <div class="k">绩效等级</div>
              <div>
                <span class="qms-pill" :style="{ background: levelColor(cur.level), color:'#fff' }">{{ cur.level || '未评级' }}</span>
                <span v-if="curFreqRule" class="wmuted" style="margin-left:8px">建议审核频次：{{ curFreqRule.freqPerYear }} 次/年（{{ curFreqRule.auditType }}）</span>
                <span v-else class="wmuted" style="margin-left:8px">未配置频次规则</span>
              </div>
            </div>
            <div class="kv"><div class="k">联系人</div><div>{{ cur.contact }} / {{ cur.tel }}</div></div>
            <div class="kv"><div class="k">地址</div><div>{{ cur.address }}</div></div>
          </div>
        </div>
      </div>

      <!-- 资质证书 + 三级预警 -->
      <div class="qms-card">
        <div class="qms-card__header"><h3>资质证书与到期预警</h3></div>
        <div class="qms-card__body" style="padding:0;overflow-x:auto">
          <table v-if="(cur.qualifications || []).length" class="tbl" style="min-width:520px">
            <thead><tr><th>资质名称</th><th>类型</th><th>上传人</th><th>到期日</th><th>剩余</th><th>预警</th><th>操作</th></tr></thead>
            <tbody>
              <tr v-for="(q, i) in cur.qualifications" :key="i">
                <td><strong>{{ q.name }}</strong></td>
                <td>{{ q.type }}</td>
                <td>{{ q.uploader }}<div class="muted" style="font-size:11px">{{ q.uploadDate }}</div></td>
                <td>{{ q.expireDate }}</td>
                <td :class="daysLeft(q) <= 30 ? 'od' : (daysLeft(q) <= 90 ? 'warn-t' : 'muted')">{{ daysLeft(q) }} 天</td>
                <td><span class="qms-pill" :style="{ background: warnColor(calcWarn(q)), color:'#fff' }">{{ calcWarn(q) }}</span></td>
                <td><el-button size="small" text type="warning" @click="openRenew(cur.id, i)">续期</el-button></td>
              </tr>
            </tbody>
          </table>
          <div v-else class="muted" style="padding:14px">该供应商暂无资质信息</div>
        </div>
      </div>
    </div>

    <!-- F/H 绩效采集与分级 -->
    <div v-if="cur" class="qms-card">
      <div class="qms-card__header">
        <h3>绩效采集与分级（F / H）</h3>
        <div style="margin-left:auto;display:flex;gap:8px;align-items:center">
          <el-date-picker v-model="perfPeriod" type="month" value-format="YYYY-MM" size="small" style="width:130px" placeholder="周期" />
          <el-button size="small" type="primary" @click="calcPerf">一键采集（自动计算）</el-button>
          <el-button size="small" @click="openPerfAdd">手动录入</el-button>
        </div>
      </div>
      <div class="qms-card__body">
        <div v-if="curPerf" class="perf-head">
          <span class="qms-pill" :style="{ background: levelColor(curPerf.level), color:'#fff' }">等级 {{ curPerf.level }}</span>
          <span>周期 {{ curPerf.period }}</span>
          <span>综合分 <b>{{ curPerf.score }}</b></span>
          <span>来料合格率 {{ curPerf.incomingPassRate }}%</span>
          <span>交付及时率 {{ curPerf.deliveryTimelyRate }}%</span>
          <span v-if="curPerf.dataMissingFlag" class="wmuted">（暂无来料数据，按默认逻辑分级）</span>
        </div>
        <table v-if="performances.length" class="tbl">
          <thead><tr><th>周期</th><th>综合分</th><th>来料合格%</th><th>交付及时%</th><th>等级</th></tr></thead>
          <tbody>
            <tr v-for="p in performances" :key="p.id">
              <td>{{ p.period }}</td>
              <td>{{ p.score }}</td>
              <td>{{ p.incomingPassRate }}</td>
              <td>{{ p.deliveryTimelyRate }}</td>
              <td><span class="qms-pill" :style="{ background: levelColor(p.level), color:'#fff' }">{{ p.level }}</span></td>
            </tr>
          </tbody>
        </table>
        <div v-else class="muted" style="padding:14px">暂无绩效记录，点击「一键采集」基于来料批次自动计算，或「手动录入」。</div>
      </div>
    </div>

    <!-- G 供应商绩效排名 -->
    <div class="qms-card">
      <div class="qms-card__header"><h3>供应商绩效排名（G）</h3>
        <span class="tag dim">周期 {{ perfPeriod }}</span>
      </div>
      <div class="qms-card__body" style="padding:0">
        <table v-if="ranking.length" class="tbl">
          <thead><tr><th>排名</th><th>供应商</th><th>等级</th><th>综合分</th><th>周期</th></tr></thead>
          <tbody>
            <tr v-for="(r, i) in ranking" :key="r.supplierId" :class="{ 'me': r.supplierId === curId }">
              <td>{{ i + 1 }}</td>
              <td><strong>{{ r.supName || r.supplierId }}</strong></td>
              <td><span class="qms-pill" :style="{ background: levelColor(r.level), color:'#fff' }">{{ r.level || '—' }}</span></td>
              <td>{{ r.score }}</td>
              <td>{{ r.period }}</td>
            </tr>
          </tbody>
        </table>
        <div v-else class="muted" style="padding:14px">暂无绩效排名数据。</div>
      </div>
    </div>

    <!-- H 评级规则 -->
    <div class="qms-card">
      <div class="qms-card__header"><h3>评级规则 A/B/C/D（H）</h3>
        <el-button size="small" style="margin-left:auto" @click="openGradeAdd">＋ 新增规则</el-button>
      </div>
      <div class="qms-card__body" style="padding:0">
        <table v-if="gradeRules.length" class="tbl">
          <thead><tr><th>等级</th><th>分数区间</th><th>首年观察</th><th>操作</th></tr></thead>
          <tbody>
            <tr v-for="g in gradeRules" :key="g.id">
              <td><span class="qms-pill" :style="{ background: levelColor(g.level), color:'#fff' }">{{ g.level }}</span></td>
              <td>[{{ g.scoreMin }}, {{ g.scoreMax }})</td>
              <td>{{ g.observeFirstYear ? '是' : '否' }}</td>
              <td>
                <el-button size="small" text @click="editGrade(g)">编辑</el-button>
                <el-button size="small" text type="danger" @click="delGrade(g.id)">删除</el-button>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-else class="muted" style="padding:14px">暂无评级规则，绩效将按默认 90/80/70 分阈值分为 A/B/C/D。</div>
      </div>
    </div>

    <!-- I 份额管理 -->
    <div v-if="cur" class="qms-card">
      <div class="qms-card__header"><h3>份额管理（I，按等级联动）</h3>
        <el-button size="small" style="margin-left:auto" @click="openShareAdd">调整份额</el-button>
      </div>
      <div class="qms-card__body" style="padding:0">
        <table v-if="shares.length" class="tbl">
          <thead><tr><th>物料</th><th>关联等级</th><th>份额%</th><th>生效日</th><th>调整原因</th></tr></thead>
          <tbody>
            <tr v-for="s in shares" :key="s.id">
              <td>{{ s.partNo }}</td>
              <td><span class="qms-pill" :style="{ background: levelColor(s.linkedLevel), color:'#fff' }">{{ s.linkedLevel }}</span></td>
              <td>{{ s.shareRatio }}</td>
              <td>{{ s.effectiveDate }}</td>
              <td>{{ s.changeReason }}</td>
            </tr>
          </tbody>
        </table>
        <div v-else class="muted" style="padding:14px">该供应商暂无份额记录，点击「调整份额」按绩效等级联动设置。</div>
      </div>
    </div>

    <!-- J 审核频次联动 -->
    <div class="qms-card">
      <div class="qms-card__header"><h3>审核频次联动规则（J）</h3>
        <el-button size="small" style="margin-left:auto" @click="openFreqAdd">＋ 新增规则</el-button>
      </div>
      <div class="qms-card__body" style="padding:0">
        <table v-if="freqRules.length" class="tbl">
          <thead><tr><th>等级</th><th>风险</th><th>频次(次/年)</th><th>审核类型</th><th>操作</th></tr></thead>
          <tbody>
            <tr v-for="f in freqRules" :key="f.id">
              <td><span class="qms-pill" :style="{ background: levelColor(f.level), color:'#fff' }">{{ f.level }}</span></td>
              <td>{{ f.riskLevel || '—' }}</td>
              <td>{{ f.freqPerYear }}</td>
              <td>{{ f.auditType }}</td>
              <td><el-button size="small" text type="danger" @click="delFreq(f.id)">删除</el-button></td>
            </tr>
          </tbody>
        </table>
        <div v-else class="muted" style="padding:14px">暂无频次规则。</div>
      </div>
    </div>

    <!-- O 升级与淘汰 -->
    <div v-if="cur" class="qms-card">
      <div class="qms-card__header"><h3>升级与淘汰（O，持续不达标）</h3>
        <el-button size="small" type="danger" plain style="margin-left:auto" @click="openEsc">发起升级/淘汰</el-button>
      </div>
      <div class="qms-card__body" style="padding:0">
        <table v-if="escalations.length" class="tbl">
          <thead><tr><th>当前等级</th><th>6月质量问题</th><th>重复问题</th><th>建议动作</th><th>状态</th><th>执行动作</th></tr></thead>
          <tbody>
            <tr v-for="e in escalations" :key="e.id">
              <td><span class="qms-pill" :style="{ background: levelColor(e.currentLevel), color:'#fff' }">{{ e.currentLevel }}</span></td>
              <td>{{ e.qualityIssueCount6m }}</td>
              <td>{{ e.repeatProblemCount }}</td>
              <td>{{ e.suggestedAction }}</td>
              <td>{{ e.escalationStatus }}</td>
              <td>{{ e.escalationAction || '—' }}</td>
            </tr>
          </tbody>
        </table>
        <div v-else class="muted" style="padding:14px">该供应商暂无升级/淘汰记录。</div>
      </div>
    </div>

    <!-- 供应商准入申请弹窗 -->
    <el-dialog v-model="applyVisible" title="供应商准入申请（供应商自助提交）" width="640px" @closed="resetApply">
      <el-form label-width="92px" size="small">
        <el-form-item label="供应商名称" required><el-input v-model="applyForm.name" placeholder="如：康立精密制造有限公司" /></el-form-item>
        <el-form-item label="供应商编码" required><el-input v-model="applyForm.supplierCode" placeholder="如：SUP-1001" /></el-form-item>
        <el-form-item label="类别" required>
          <el-select v-model="applyForm.category" placeholder="选择类别" style="width:100%">
            <el-option v-for="c in ['原材料','电子元件','结构件','包装材料','外协加工','设备/仪器']" :key="c" :label="c" :value="c" />
          </el-select>
        </el-form-item>
        <el-form-item label="信用代码"><el-input v-model="applyForm.creditCode" placeholder="统一社会信用代码（选填，默认与编码相同）" /></el-form-item>
        <el-form-item label="联系人"><el-input v-model="applyForm.contactPerson" /></el-form-item>
        <el-form-item label="联系电话"><el-input v-model="applyForm.contactPhone" /></el-form-item>
        <el-form-item label="地址"><el-input v-model="applyForm.address" /></el-form-item>
        <el-form-item label="资质证书">
          <div class="qual-edit">
            <div v-for="(q, i) in applyForm.qualifications" :key="i" class="qual-row">
              <el-input v-model="q.name" placeholder="资质名称（如：ISO13485）" style="width:180px" />
              <el-input v-model="q.type" placeholder="类型" style="width:110px" />
              <el-date-picker v-model="q.expireDate" type="date" value-format="YYYY-MM-DD" placeholder="到期日" style="width:150px" />
              <el-button size="small" text type="danger" @click="delQual(i)">删</el-button>
            </div>
            <el-button size="small" @click="addQual">＋ 增加资质</el-button>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button size="small" @click="applyVisible = false">取消</el-button>
        <el-button size="small" type="primary" :loading="submitting" @click="submitApply">提交申请</el-button>
      </template>
    </el-dialog>

    <!-- 状态升级弹窗 -->
    <el-dialog v-model="upgradeVisible" title="供应商状态升级" width="420px">
      <template v-if="cur">
        <div style="margin-bottom:12px;font-size:13px;color:#44515f">
          当前供应商：<b>{{ cur.name }}</b> · 当前状态：<span class="qms-pill" :class="statusPill(cur.status)">{{ cur.status }}</span>
        </div>
        <el-form label-width="80px" size="small">
          <el-form-item label="升级至">
            <el-select v-model="upgradeTarget" style="width:100%">
              <el-option v-for="o in UPGRADE_OPTIONS" :key="o.value" :label="o.label" :value="o.value" />
            </el-select>
          </el-form-item>
        </el-form>
      </template>
      <template #footer>
        <el-button size="small" @click="upgradeVisible = false">取消</el-button>
        <el-button size="small" type="primary" @click="doUpgrade">确认升级</el-button>
      </template>
    </el-dialog>

    <!-- 资质续期弹窗 -->
    <el-dialog v-model="renewVisible" title="资质续期（R）" width="420px">
      <el-form label-width="80px" size="small">
        <el-form-item label="资质"><div>{{ renewForm.name }}</div></el-form-item>
        <el-form-item label="新到期日">
          <el-date-picker v-model="renewForm.expireDate" type="date" value-format="YYYY-MM-DD" placeholder="新到期日" style="width:100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button size="small" @click="renewVisible = false">取消</el-button>
        <el-button size="small" type="primary" @click="saveRenew">确认续期</el-button>
      </template>
    </el-dialog>

    <!-- 绩效录入弹窗 -->
    <el-dialog v-model="perfAddVisible" title="录入绩效记录" width="460px">
      <el-form label-width="96px" size="small">
        <el-form-item label="周期"><el-input v-model="perfForm.period" placeholder="YYYY-MM" /></el-form-item>
        <el-form-item label="综合得分"><el-input-number v-model="perfForm.score" :min="0" :max="100" :precision="1" style="width:100%" /></el-form-item>
        <el-form-item label="来料合格率%"><el-input-number v-model="perfForm.incomingPassRate" :min="0" :max="100" :precision="1" style="width:100%" /></el-form-item>
        <el-form-item label="交付及时率%"><el-input-number v-model="perfForm.deliveryTimelyRate" :min="0" :max="100" :precision="1" style="width:100%" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button size="small" @click="perfAddVisible = false">取消</el-button>
        <el-button size="small" type="primary" @click="savePerf">保存</el-button>
      </template>
    </el-dialog>

    <!-- 评级规则弹窗 -->
    <el-dialog v-model="gradeVisible" title="评级规则" width="460px">
      <el-form label-width="96px" size="small">
        <el-form-item label="等级">
          <el-select v-model="gradeForm.level" style="width:100%">
            <el-option label="A" value="A" /><el-option label="B" value="B" /><el-option label="C" value="C" /><el-option label="D" value="D" />
          </el-select>
        </el-form-item>
        <el-form-item label="分数下限"><el-input-number v-model="gradeForm.scoreMin" :precision="0" style="width:100%" /></el-form-item>
        <el-form-item label="分数上限"><el-input-number v-model="gradeForm.scoreMax" :precision="0" style="width:100%" /></el-form-item>
        <el-form-item label="首年观察"><el-switch v-model="gradeForm.observeFirstYear" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button size="small" @click="gradeVisible = false">取消</el-button>
        <el-button size="small" type="primary" @click="saveGrade">保存</el-button>
      </template>
    </el-dialog>

    <!-- 份额调整弹窗 -->
    <el-dialog v-model="shareVisible" title="调整份额（I）" width="460px">
      <el-form label-width="96px" size="small">
        <el-form-item label="物料编码"><el-input v-model="shareForm.partNo" placeholder="如：P-1001" /></el-form-item>
        <el-form-item label="关联等级">
          <el-select v-model="shareForm.linkedLevel" style="width:100%">
            <el-option label="A" value="A" /><el-option label="B" value="B" /><el-option label="C" value="C" /><el-option label="D" value="D" />
          </el-select>
        </el-form-item>
        <el-form-item label="份额%"><el-input-number v-model="shareForm.shareRatio" :min="0" :max="100" :precision="1" style="width:100%" /></el-form-item>
        <el-form-item label="生效日"><el-date-picker v-model="shareForm.effectiveDate" type="date" value-format="YYYY-MM-DD" style="width:100%" /></el-form-item>
        <el-form-item label="调整原因"><el-input v-model="shareForm.changeReason" type="textarea" :rows="2" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button size="small" @click="shareVisible = false">取消</el-button>
        <el-button size="small" type="primary" @click="saveShare">提交</el-button>
      </template>
    </el-dialog>

    <!-- 审核频次规则弹窗 -->
    <el-dialog v-model="freqVisible" title="审核频次规则" width="460px">
      <el-form label-width="96px" size="small">
        <el-form-item label="等级">
          <el-select v-model="freqForm.level" style="width:100%">
            <el-option label="A" value="A" /><el-option label="B" value="B" /><el-option label="C" value="C" /><el-option label="D" value="D" />
          </el-select>
        </el-form-item>
        <el-form-item label="风险等级"><el-input v-model="freqForm.riskLevel" placeholder="如：高/中/低（选填）" /></el-form-item>
        <el-form-item label="频次(次/年)"><el-input-number v-model="freqForm.freqPerYear" :min="0" :max="12" :precision="0" style="width:100%" /></el-form-item>
        <el-form-item label="审核类型"><el-input v-model="freqForm.auditType" placeholder="如：年度复审" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button size="small" @click="freqVisible = false">取消</el-button>
        <el-button size="small" type="primary" @click="saveFreq">保存</el-button>
      </template>
    </el-dialog>

    <!-- 升级/淘汰弹窗 -->
    <el-dialog v-model="escVisible" title="升级与淘汰（O）" width="480px">
      <el-form label-width="110px" size="small">
        <el-form-item label="当前等级">
          <el-select v-model="escForm.currentLevel" style="width:100%">
            <el-option label="A" value="A" /><el-option label="B" value="B" /><el-option label="C" value="C" /><el-option label="D" value="D" />
          </el-select>
        </el-form-item>
        <el-form-item label="6月质量问题数"><el-input-number v-model="escForm.qualityIssueCount6m" :min="0" :precision="0" style="width:100%" /></el-form-item>
        <el-form-item label="重复问题数"><el-input-number v-model="escForm.repeatProblemCount" :min="0" :precision="0" style="width:100%" /></el-form-item>
        <el-form-item label="建议动作">
          <el-select v-model="escForm.suggestedAction" style="width:100%">
            <el-option label="观察" value="观察" /><el-option label="整改" value="整改" /><el-option label="暂停" value="暂停" /><el-option label="淘汰" value="淘汰" />
          </el-select>
        </el-form-item>
        <el-form-item label="升级状态">
          <el-select v-model="escForm.escalationStatus" style="width:100%">
            <el-option label="待处理" value="待处理" /><el-option label="已通知" value="已通知" /><el-option label="已执行" value="已执行" />
          </el-select>
        </el-form-item>
        <el-form-item label="执行动作"><el-input v-model="escForm.escalationAction" placeholder="如：发起专项审核 / 减少份额" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button size="small" @click="escVisible = false">取消</el-button>
        <el-button size="small" type="danger" @click="saveEsc">提交</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.sqm-life { display: flex; flex-direction: column; gap: 14px; }
.kpi-row { display: grid; gap: 14px; }
.kpi { background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 14px; text-align: center;
  .val { font-size: 24px; font-weight: 700; color: #1e4d8b; }
  .lbl { font-size: 12px; color: #6b7785; margin-top: 4px; }
}
.warn-card { border-color: #f5d6a8; }
.warn-item { display: flex; align-items: center; gap: 10px; padding: 5px 0; font-size: 13px; border-bottom: 1px dashed #eef2f7;
  &:last-child { border-bottom: none; }
  .wsup { font-weight: 600; color: #2c3a47; }
  .wname { color: #44515f; }
  .wmuted { color: #8a94a6; margin-left: auto; }
}
.sup-strip { display: flex; gap: 12px; flex-wrap: wrap; }
.sup-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 10px; }
.sup-chip { border: 1px solid #e5e7eb; border-radius: 10px; padding: 10px 12px; cursor: pointer; background: #fff; transition: 0.15s;
  display: flex; flex-direction: column; gap: 4px;
  &:hover { border-color: #9db8dd; }
  &.active { border-color: #1e4d8b; box-shadow: 0 0 0 2px rgba(30,77,139,.12); }
  .sc-name { font-weight: 600; font-size: 13px; color: #1f2d3d; }
  .sc-meta { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
  .sc-level { font-size: 11px; padding: 1px 6px; border-radius: 3px; background: #e8f5e9; color: #2e7d32; font-weight: 600; }
  .sc-score { font-size: 12px; color: #6b7785; margin-left: auto; }
  .sc-foot { font-size: 11px; color: #8a94a6; display: flex; gap: 4px; border-top: 1px dashed #eef0f3; padding-top: 4px; margin-top: 2px; }
}
.lc-placeholder {
  display: flex; align-items: flex-start; gap: 10px;
  background: #fff8e1; border: 1px solid #f0c14b; border-radius: 6px;
  padding: 10px 12px; margin: 10px 12px 12px;
  &__icon { font-size: 20px; line-height: 1; }
  &__title { font-size: 12.5px; font-weight: 600; color: #b58a00; }
  &__desc { font-size: 11.5px; color: #7a6500; margin-top: 2px; line-height: 1.5;
    code { background: rgba(0,0,0,0.06); padding: 1px 4px; border-radius: 3px; font-size: 10.5px; }
  }
}
.detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
@media (max-width: 980px) { .detail-grid { grid-template-columns: 1fr; } }
.kv-box { display: flex; flex-direction: column; gap: 8px; }
.kv { display: grid; grid-template-columns: 96px 1fr; gap: 8px; font-size: 13px; align-items: start; }
.kv .k { color: #6b7785; }
.tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
.tbl th, .tbl td { border-bottom: 1px solid #eef2f7; padding: 8px 10px; text-align: left; }
.tbl th { background: #f7f9fc; color: #5a6b7e; font-weight: 600; }
.tbl .me { background: #eef4fb; }
.qual-edit { display: flex; flex-direction: column; gap: 8px; }
.qual-row { display: flex; gap: 6px; align-items: center; }
.flow-bar { display: flex; align-items: center; flex-wrap: wrap; gap: 0; }
.fnode { display: flex; flex-direction: column; align-items: center; gap: 4px; }
.fdot { width: 14px; height: 14px; border-radius: 50%; border: 2px solid #cbd5e0; background: #fff; }
.ftext { font-size: 11px; color: #8a94a6; white-space: nowrap; }
.fline { flex: 1; height: 2px; background: #e5e7eb; min-width: 14px; margin: 0 2px; }
.fnode.done .fdot { background: #2f7d32; border-color: #2f7d32; }
.fnode.done .ftext { color: #2f7d32; }
.fnode.now .fdot { background: #1e4d8b; border-color: #1e4d8b; box-shadow: 0 0 0 3px rgba(30,77,139,.18); }
.fnode.now .ftext { color: #1e4d8b; font-weight: 700; }
.fline.done { background: #2f7d32; }
.fstage-tip { margin-top: 10px; font-size: 13px; color: #44515f; }
.perf-head { display: flex; flex-wrap: wrap; gap: 14px; align-items: center; font-size: 13px; color: #44515f; margin-bottom: 10px; }
.muted { color: #8a94a6; }
.od { color: #c0392b; font-weight: 600; }
.warn-t { color: #ef6c00; font-weight: 600; }
</style>
