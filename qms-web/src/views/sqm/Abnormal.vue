<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { useCompanyStore } from '@/stores/company'
import type { RoleId } from '@/mock/roles'
import { BANNERS } from '@/config/banners'
import { sqmApi } from '@/api'
import type { Abnormal, D8Link, MeasureLog, Attachment, Supplier, Capa } from '@/types/sqm'

const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()
const overdueExpanded = ref(false)
const d8Expanded = ref(false)
const banner = BANNERS.sqm?.[authStore.role] || {
  title: 'SQM · 来料异常整改',
  desc: '来料异常处置、整改执行记录、连续三批验证与闭环归档（SR-CAR-007~012）',
}

// 数据源（异步加载后端真实数据）
const list = ref<Abnormal[]>([])
const suppliers = ref<Supplier[]>([])
const d8LinkMap = ref<Record<string, D8Link>>({})
const d8List = computed(() => Object.entries(d8LinkMap.value) as [string, D8Link][])
const capaList = ref<Capa[]>([])

// 异步加载
async function loadData() {
  try {
  const [supList, abnList, d8Map, capaData] = await Promise.all([
    sqmApi.getSuppliers(),
    sqmApi.getAbnormals(),
    sqmApi.getD8Links(),
    sqmApi.getCapaList(),
  ])
  suppliers.value = supList
  const supMap: Record<string, Supplier> = {}
  supList.forEach((s) => { supMap[s.id] = s })
  list.value = abnList.map((a) => ({ ...a, supName: a.supName || supMap[a.supId]?.name || a.supId }))
  d8LinkMap.value = d8Map
  capaList.value = capaData
  tryOpenFromQuery()
  } catch (e) {
    // 错误已由 request 拦截器统一提示
  }
}
onMounted(loadData)

// 角色门控
const canReport = (['inspector', 'sqe', 'shiftleader', 'qmanager', 'sysadmin'] as RoleId[]).includes(authStore.role)
const isSqe = (['sqe', 'qmanager', 'sysadmin'] as RoleId[]).includes(authStore.role)
function canCapaRow(a: Abnormal) {
  return a.status !== '已关闭' && a.d8Id && (['sqe', 'qmanager', 'sysadmin'] as RoleId[]).includes(authStore.role)
}

// 筛选
const fLevel = ref('')
const fStatus = ref('')
const fSup = ref('')
const fSearch = ref('')
const filtered = computed(() => {
  const lv = fLevel.value
  const st = fStatus.value
  const sp = fSup.value
  const kw = fSearch.value.trim().toLowerCase()
  return list.value.filter((a) => {
    if (lv && a.level !== lv) return false
    if (st && a.status !== st) return false
    if (sp && a.supId !== sp) return false
    if (kw && !`${a.id} ${a.partName} ${a.partNo} ${a.desc}`.toLowerCase().includes(kw)) return false
    return true
  })
})

// 药丸配色
function statusPill(s: Abnormal['status']): string {
  return { 待处理: 'y', 整改中: 'b', 待验证: 'p', 三批验证: 'o', 已关闭: 'g' }[s] || 'gray'
}
function capaStatusPill(s: string): string {
  return { 待启动: 'y', 原因分析: 'b', 措施制定: 'p', 实施验证: 'o', 效果确认: 'o', 已关闭: 'g' }[s] || 'gray'
}
function levelPill(l: Abnormal['level']): string {
  return l === '严重' ? 'r' : 'y'
}
// 整改触发意见（SR-CAR-001 严重1件即触发 / SR-CAR-002 一般累计≥3件）
function triggerRulePill(r: Abnormal['triggerRule']): string {
  return r === '累计≥3件' ? 'y' : r === '一键即触发' ? 'b' : 'gray'
}
function triggerRuleHint(r: Abnormal['triggerRule']): string {
  return r === '累计≥3件'
    ? '同供应商 + 同物料一般不良，滚动30天内累计达到阈值（默认3件，可配置）→ 系统自动生成整改单（SR-CAR-002）'
    : r === '一键即触发'
      ? '严重不良1件即触发整改单，或检验员/质量主管人工一键发起（SR-CAR-001）'
      : '—'
}
function d8StageColor(s: 'done' | 'doing' | 'pending'): string {
  return s === 'done' ? '#10b981' : s === 'doing' ? '#f59e0b' : '#e5e7eb'
}

// ===== SR-CAR-010 / SR-CAR-011 超期与升级计算 =====
const TODAY = new Date()
function daysBetween(a: string, b: Date): number {
  return Math.floor((b.getTime() - new Date(a).getTime()) / 86400000)
}
function calcOverdue(a: Abnormal): number {
  const base = a.extensionApproved && a.extensionDate ? a.extensionDate : a.planDate
  if (!base) return 0
  const d = daysBetween(base, TODAY)
  return d > 0 ? d : 0
}
function escalateLevel(a: Abnormal): number {
  const od = calcOverdue(a)
  if (od >= 21) return 3
  if (od >= 14) return 2
  if (od >= 7) return 1
  return 0
}
function overdueText(a: Abnormal): string {
  const od = calcOverdue(a)
  const lvl = escalateLevel(a)
  if (lvl === 3) return `超期 ${od} 天 · 已升级至质量总监（≥21天）`
  if (lvl === 2) return `超期 ${od} 天 · 已升级至质量经理/采购经理（≥14天）`
  if (lvl === 1) return `超期 ${od} 天 · 已通知责任SQE（≥7天）`
  return `未超期（计划 ${a.extensionApproved && a.extensionDate ? a.extensionDate : a.planDate || '—'}）`
}
const overdueList = computed(() => list.value.filter((a) => a.status !== '已关闭' && calcOverdue(a) > 0))

// ===== 供应商升级管理（SR-CAR-020,022） =====
const upgradeRows = [
  { sup: '山东鲁南包装材料', level: 'C', cnt: 5, plan: '暂停新订单，限期整改', status: '已暂停', statusCls: 'r' },
  { sup: '河北钢铁精密加工', level: 'B', cnt: 3, plan: '加严检验，增加审核频次', status: '观察中', statusCls: 'y' },
  { sup: '浙江精工金属制品', level: 'B', cnt: 2, plan: '保持观察，跟踪改进', status: '正常', statusCls: 'g' },
]

// ===== 当前处理中的异常 =====
const current = ref<Abnormal | null>(null)
const handleVisible = ref(false)
async function openHandle(id: string) {
  const a = list.value.find((x) => x.id === id)
  if (!a) return
  current.value = a
  handleVisible.value = true
  // V21: 加载后端持久化的整改记录（措施 + 三批验证）
  try {
    const detail = await sqmApi.loadAbnormalRectification(id)
    if (detail?.measures) measureLogs.value = detail.measures.map((m: any) => ({
      id: m.id, seq: m.seq, content: m.content || '', operator: m.operator || '',
      completeDate: m.completeDate || '', status: m.status || '待完成',
    }))
    if (detail?.batchVerifies) batchTrack.value = detail.batchVerifies.map((b: any) => ({
      id: b.id, batchNo: b.batchNo || '', result: b.result || '待验证',
      verifyDate: b.verifyDate || '',
    }))
  } catch (_) {}
}
/** V21: 序列化当前整改状态并持久化到后端 */
async function syncRectification() {
  if (!current.value) return
  try {
    await sqmApi.saveAbnormalRectification(current.value.id, {
      abnormal: {
        id: current.value.id,
        status: current.value.status,
        disposal: current.value.disposal,
        disposalRemark: current.value.disposalRemark,
        noticeDate: current.value.noticeDate ?? null,
        noticeContent: current.value.noticeContent ?? '',
        planDate: current.value.planDate ?? null,
        extensionApproved: current.value.extensionApproved ?? false,
        extensionDate: current.value.extensionDate ?? null,
        verifyResult: current.value.verifyResult ?? '',
        verifyComment: current.value.verifyComment ?? '',
        verifyDate: current.value.verifyDate ?? null,
        verifyBy: current.value.verifyBy ?? '',
        returnReason: current.value.returnReason ?? '',
        closeDate: current.value.closeDate ?? null,
        closeAuditor: current.value.closeAuditor ?? '',
      },
      measures: measureLogs.value.map((m) => ({
        seq: m.seq, content: m.content, operator: m.operator,
        completeDate: m.completeDate || null, status: m.status || '待完成',
      })),
      batchVerifies: batchTrack.value.map((b) => ({
        batchNo: b.batchNo, result: b.result, verifyDate: b.verifyDate || null,
      })),
    })
  } catch (_) {}
}
// 从总览看板「详情」下钻：?id= 自动打开该异常详情
function tryOpenFromQuery() {
  const id = route.query.id as string | undefined
  if (id) openHandle(id)
}
watch(() => route.query.id, () => tryOpenFromQuery())
/** V21: 异常处理弹窗关闭时自动持久化整改状态（防止刷新丢失措施/通知/验证等） */
watch(handleVisible, (v) => { if (!v) syncRectification() })

// 上报异常
const reportVisible = ref(false)
const reportForm = reactive({ lotId: '', supId: '', partNo: '', desc: '', qty: 1, level: '严重' as '严重' | '一般', triggerRule: '一键即触发' as '一键即触发' | '累计≥3件' })
function openReport() {
  reportForm.lotId = ''; reportForm.supId = ''; reportForm.partNo = ''
  reportForm.desc = ''; reportForm.qty = 1; reportForm.level = '严重'; reportForm.triggerRule = '一键即触发'
  reportVisible.value = true
}
async function submitReport() {
  if (!reportForm.lotId || !reportForm.supId || !reportForm.partNo || !reportForm.desc) {
    ElMessage.warning('请填写批次号、供应商、物料料号与异常描述')
    return
  }
  try {
    await sqmApi.createAbnormal({
      lotId: reportForm.lotId,
      supplierId: reportForm.supId,
      partNo: reportForm.partNo,
      partName: reportForm.partNo,
      description: reportForm.desc,
      qty: reportForm.qty,
      level: reportForm.level,
      occurDate: new Date().toISOString().slice(0, 10),
      status: '待处理',
    })
    reportVisible.value = false
    ElMessage.success('异常已上报')
    // Flow 6: 严重异常自动提示发起现场审核
    if (reportForm.level === '严重') {
      try {
        await ElMessageBox.confirm('严重来料异常建议同步发起现场审核，是否立即创建审核计划？', '自动触发审核', { confirmButtonText: '立即创建', cancelButtonText: '稍后' })
        router.push({ path: '/sqm/audit', query: { supId: reportForm.supId, from: 'abnormal', level: '严重' } })
      } catch { /* 用户取消，不做跳转但仍需刷新列表 */ }
    }
    await loadData()
  } catch (e) {
    // 错误已由 request 拦截器统一提示
    ElMessage.error('上报失败，请稍后重试')
  }
}

// 推送整改通知（SR-CAR-006，并设置计划完成日期）
const noticeVisible = ref(false)
const noticeForm = reactive({ title: '', content: '', deadline: '' })
function openNotice() {
  if (!current.value) return
  noticeForm.title = `关于${current.value.partName}来料异常整改通知`
  noticeForm.content = `贵司供应的${current.value.partName}（批次：${current.value.lotId}）在来料检验中发现${current.value.desc}。请在7个工作日内提交整改措施报告。`
  noticeForm.deadline = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
  noticeVisible.value = true
}
function submitNotice() {
  if (!current.value) return
  current.value.noticeSent = true
  current.value.noticeDate = new Date().toISOString().slice(0, 10)
  current.value.noticeContent = noticeForm.content
  current.value.planDate = noticeForm.deadline
  current.value.status = '整改中'
  noticeVisible.value = false
  handleVisible.value = false
  ElMessage.success('整改通知已发送给供应商')
}

// 措施执行进展更新（SR-CAR-007：逐次记录 + 附件）
const measuresVisible = ref(false)
const measuresForm = reactive({ content: '', completeDate: new Date().toISOString().slice(0, 10), operator: authStore.currentRole?.name || '供应商', evidence: [] as Attachment[] })
const MAX_ATTACH = 20 * 1024 * 1024
function fmtSize(n: number): string {
  if (n >= 1024 * 1024) return (n / 1024 / 1024).toFixed(1) + 'MB'
  if (n >= 1024) return Math.round(n / 1024) + 'KB'
  return n + 'B'
}
function openMeasures() {
  measuresForm.content = ''
  measuresForm.completeDate = new Date().toISOString().slice(0, 10)
  measuresForm.operator = authStore.currentRole?.name || '供应商'
  measuresForm.evidence = []
  measuresVisible.value = true
}
function onAttach(e: Event) {
  const input = e.target as HTMLInputElement
  for (const f of Array.from(input.files || [])) {
    if (f.size > MAX_ATTACH) {
      ElMessage.warning(`附件「${f.name}」超过 20MB 限制，请压缩后重新上传`)
      continue
    }
    measuresForm.evidence.push({ name: f.name, size: f.size })
  }
  input.value = ''
}
function removeAttach(i: number) {
  measuresForm.evidence.splice(i, 1)
}
function submitMeasures() {
  if (!current.value) return
  if (!measuresForm.content.trim()) {
    ElMessage.warning('请填写本次措施进展描述')
    return
  }
  const log: MeasureLog = {
    content: measuresForm.content.trim(),
    completeDate: measuresForm.completeDate,
    operator: measuresForm.operator,
    evidence: [...measuresForm.evidence],
  }
  current.value.measureLogs.push(log)
  current.value.measures = { content: log.content, rootcause: '', prevention: '', deadline: current.value.planDate || '', owner: log.operator }
  current.value.measuresDate = log.completeDate
  current.value.measuresContent = log.content
  current.value.status = '待验证'
  measuresVisible.value = false
  handleVisible.value = false
  ElMessage.success('措施进展已记录，等待 SQE 验证')
}

// SQE 验证（SR-CAR-008：通过→三批验证 / 不通过→退回整改并重新计时）
const verifyVisible = ref(false)
const verifyForm = reactive({ result: '通过' as '通过' | '不通过', comment: '' })
function openVerify() {
  verifyForm.result = '通过'; verifyForm.comment = ''
  verifyVisible.value = true
}
function submitVerify() {
  if (!current.value) return
  current.value.verifyResult = verifyForm.result
  current.value.verifyComment = verifyForm.comment
  current.value.verifyDate = new Date().toISOString().slice(0, 10)
  if (verifyForm.result === '通过') {
    current.value.status = '三批验证'
    ElMessage.success('SQE 验证通过，自动启动连续 3 批来料跟踪验证')
  } else {
    current.value.returnReason = verifyForm.comment || '验证不通过，退回整改'
    current.value.status = '整改中'
    current.value.planDate = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
    current.value.notify7 = current.value.notify14 = current.value.notify21 = false
    ElMessage.warning('验证不通过，退回供应商继续整改，已重新计时')
  }
  verifyVisible.value = false
  handleVisible.value = false
}

// 连续三批合格验证（SR-CAR-009）
function passBatch() {
  if (!current.value) return
  const n = current.value.batchTrack.length + 1
  current.value.batchTrack.push({ batchNo: `LOT-${new Date().getFullYear()}-${String(90000 + n).padStart(5, '0')}`, result: '合格', date: new Date().toISOString().slice(0, 10), linked: true })
  if (current.value.batchTrack.length >= 3) {
    doClose('连续 3 批合格，自动闭环')
  } else {
    ElMessage.success(`第 ${n} 批合格，已关联整改单（${n}/3）`)
  }
}
function failBatch() {
  if (!current.value) return
  current.value.batchTrack = []
  ElMessage.warning('该批不合格，连续 3 批验证计数器已清零，已通知 SQE 重新评估整改措施')
}

// 闭环归档（SR-CAR-012：只读归档 + 记录闭环人/时间）
function doClose(reason: string) {
  if (!current.value) return
  current.value.status = '已关闭'
  current.value.closeDate = new Date().toISOString().slice(0, 10)
  current.value.closeAuditor = authStore.currentRole?.name || 'SQE'
  current.value.archived = true
  ElMessage.success(`${reason}，整改单已闭环归档（只读）`)
}

// 超期升级通知（SR-CAR-010 / SR-CAR-011）
function sendNotify(a: Abnormal, level: 1 | 2 | 3) {
  if (level === 1) { a.notify7 = true; ElMessage.success(`已向责任SQE发送超期提醒：${a.id}（超期 ${calcOverdue(a)} 天）`) }
  if (level === 2) { a.notify14 = true; ElMessage.success(`已向质量经理、采购经理发送升级通知：${a.id}（超期 ${calcOverdue(a)} 天）`) }
  if (level === 3) { a.notify21 = true; ElMessage.success(`已向质量总监发送升级通知：${a.id}（超期 ${calcOverdue(a)} 天）`) }
}
// 延期获批（SR-CAR-010 异常）
function approveExtension(a: Abnormal) {
  a.extensionDate = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10)
  a.extensionApproved = true
  a.notify7 = a.notify14 = a.notify21 = false
  ElMessage.success(`延期申请已批准：${a.id}，按新截止日期 ${a.extensionDate} 计算超期`)
}

// 关联历史整改单（SR-CAR-012 异常：重复问题关联）
const relatedHistory = computed(() => {
  if (!current.value) return []
  return list.value.filter(
    (x) => x.id !== current.value!.id && x.archived && x.status === '已关闭' && x.supId === current.value!.supId,
  )
})

// 触发 CAPA
const capaVisible = ref(false)
const capaMode = ref<'create' | 'view'>('create')
const capaAbnId = ref('')
const currentCapa = ref<Capa | null>(null)
const capaId = ref('')
const capaForm = reactive({ type: '纠正措施', problem: '', rootcause: '', plan: '', owner: '', deadline: '' })
function openCapa(id: string) {
  const a = list.value.find((x) => x.id === id)
  if (!a) return
  capaAbnId.value = a.id
  capaId.value = a.d8Id || ''
  // 优先复用已存在（D4 自动触发 / 手动创建）的 CAPA
  const existing = capaList.value.find(
    (c) => c.id === a.capaId || c.d8Id === a.d8Id || c.abnormalId === a.id,
  )
  if (existing) {
    capaMode.value = 'view'
    currentCapa.value = existing
    capaForm.type = existing.type
    capaForm.problem = existing.problem
    capaForm.rootcause = existing.rootcause || ''
    capaForm.plan = existing.corrective?.action || ''
    capaForm.owner = existing.owner || ''
    capaForm.deadline = existing.dueDate || ''
  } else {
    capaMode.value = 'create'
    currentCapa.value = null
    capaForm.type = '纠正措施'
    capaForm.problem = a.desc || ''
    capaForm.rootcause = ''
    capaForm.plan = ''
    capaForm.owner = ''
    capaForm.deadline = ''
  }
  capaVisible.value = true
}
async function submitCapa() {
  try {
    if (capaMode.value === 'view' && currentCapa.value) {
      await sqmApi.closeCapa(currentCapa.value.id)
      ElMessage.success('CAPA 已闭环，已级联关闭关联的 8D 与来料异常单')
    } else {
      const a = list.value.find((x) => x.id === capaAbnId.value)
      if (!a) { capaVisible.value = false; return }
      await sqmApi.createCapa({
        abnormalId: a.id,
        d8Id: a.d8Id || undefined,
        orgId: useCompanyStore().currentOrgId || '',
        capaType: capaForm.type,
        issue: capaForm.problem,
        rootcause: capaForm.rootcause,
        actionPlan: capaForm.plan,
        owner: capaForm.owner || 'SQE',
        dueDate: capaForm.deadline,
        triggerType: a.d8Id ? '8D' : 'SQM异常',
        triggerStage: 'D4',
      })
      ElMessage.success('CAPA 已发起并关联到整改流程')
    }
    capaVisible.value = false
    await loadData()
  } catch (e) {
    // 错误已由 request 拦截器统一提示
  }
}

// 处置措施（待处理）
const disposal = ref('退货')
const remark = ref('')
function submitDisposal() {
  if (!current.value) return
  current.value.status = '整改中'
  handleVisible.value = false
  ElMessage.success('处置已提交')
}
async function start8D() {
  if (!current.value) return
  try {
    const report = await sqmApi.launch8d(current.value.id, {
      issue: current.value.desc || current.value.partName || '来料异常',
      severity: current.value.level || '一般',
      team: 'SQE整改小组',
    })
    ElMessage.success(`已发起 8D（${report.d8No || report.id}），已关联本异常单`)
    handleVisible.value = false
    await loadData()
    if (report.id) {
      // 跳转到 8D 整改模块并定位到新建的 8D
      router.push({ name: 'Ncm8D', query: { focus: report.id } })
    }
  } catch (e) {
    // 错误已由 request 拦截器统一提示
  }
}
/** 跳转 8D 整改模块查看关联的 8D（focus=报告Id） */
function go8D(reportId?: string) {
  if (!reportId && !current.value?.d8Id) return
  const id = reportId || current.value?.d8Id
  router.push({ name: 'Ncm8D', query: { focus: id } })
}
async function startCapa() {
  if (!current.value) return
  try {
    await sqmApi.createCapa({
      abnormalId: current.value.id,
      capaType: '纠正措施',
      issue: current.value.desc || '来料异常整改',
      owner: 'SQE',
      triggerType: 'SQM异常',
      dueDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    })
    ElMessage.success('已直接发起 CAPA 并关联异常单')
    handleVisible.value = false
    await loadData()
  } catch (e) {
    // 错误已由 request 拦截器统一提示
  }
}
/** 从异常处理弹窗发起现场审核（Flow 4: 来料异常→现场审核） */
function triggerAudit() {
  if (!current.value) return
  handleVisible.value = false
  router.push({
    path: '/sqm/audit',
    query: {
      supId: current.value.supId,
      supName: current.value.supName,
      from: 'abnormal',
      abnormalId: current.value.id,
    },
  })
}
/** 推进 8D 当前阶段（D4 触发 CAPA，D8 闭环） */
async function advance8d(id: string, stage: string) {
  try {
    await sqmApi.advance8d(id, stage)
    ElMessage.success(`8D ${stage} 阶段已推进`)
    await loadData()
  } catch (e) {
    // 错误已由 request 拦截器统一提示
  }
}
/** 计算 8D 下一阶段 */
function nextStage(s: string): string {
  const i = ['D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8'].indexOf(s)
  return i < 0 || i >= 7 ? '完成(D8)' : ['D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8'][i]
}
function toast(msg: string) {
  ElMessage.success(msg)
}
/** 手动触发重复问题升级扫描（≥2次→升级，≥3次→降份额） */
async function triggerEscalation() {
  try {
    await sqmApi.triggerEscalation()
    ElMessage.success('重复问题升级扫描已触发：≥2次异常→升级记录，≥3次→自动降份额 5%')
  } catch (_) {}
}
</script>

<template>
  <div class="sqm-abn">
    <div class="qms-banner">
      <div class="qms-banner__icon" :style="{ background: authStore.currentRole?.color }">⚠️</div>
      <div>
        <div class="qms-banner__title">{{ banner.title }}</div>
        <div class="qms-banner__desc">{{ banner.desc }}</div>
      </div>
    </div>

    <!-- KPI 概览卡片 -->
    <div class="kpi-row">
      <div class="kpi-card">
        <span class="kpi-num">{{ list.length }}</span><span class="kpi-label">总异常</span>
      </div>
      <div class="kpi-card warn">
        <span class="kpi-num">{{ list.filter((a) => a.status === '待处理').length }}</span><span class="kpi-label">待处理</span>
      </div>
      <div class="kpi-card danger">
        <span class="kpi-num">{{ list.filter((a) => a.level === '严重').length }}</span><span class="kpi-label">严重</span>
      </div>
      <div class="kpi-card alert">
        <span class="kpi-num">{{ list.filter((a) => calcOverdue(a) > 0 && a.status !== '已关闭').length }}</span><span class="kpi-label">超期</span>
      </div>
      <div class="kpi-card done">
        <span class="kpi-num">{{ list.filter((a) => a.status === '已关闭').length }}</span><span class="kpi-label">已关闭</span>
      </div>
    </div>

    <!-- 工具栏整合到「来料异常记录」卡片 header（按 FMEA 统一设计） -->


    <!-- 超期预警（可折叠） -->
    <div class="qms-card" v-if="overdueList.length">
      <div class="qms-card__header" style="cursor:pointer" @click="overdueExpanded = !overdueExpanded">
        <h3>{{ overdueExpanded ? '▼' : '▶' }} 超期预警与升级通知</h3>
        <span class="badge r">{{ overdueList.length }} 单超期</span>
      </div>
      <div v-if="overdueExpanded" class="qms-card__body sticky-wrap">
        <table class="tbl">
          <thead><tr><th>异常单号</th><th>供应商</th><th>状态</th><th>超期情况</th><th>通知状态</th><th class="col-fixed">操作</th></tr></thead>
          <tbody>
            <tr v-for="a in overdueList" :key="a.id">
              <td>{{ a.id }}</td>
              <td>{{ a.supName }}</td>
              <td><span class="qms-pill" :class="statusPill(a.status)">{{ a.status }}</span></td>
              <td>
                <span class="qms-pill r">{{ calcOverdue(a) }} 天</span>
                <div class="meta">{{ overdueText(a) }}</div>
              </td>
              <td>
                <span class="ntag" :class="a.notify7 ? 'done' : 'todo'">SQE·7天{{ a.notify7 ? '✓' : '未发' }}</span>
                <span class="ntag" :class="a.notify14 ? 'done' : 'todo'">经理·14天{{ a.notify14 ? '✓' : '未发' }}</span>
                <span class="ntag" :class="a.notify21 ? 'done' : 'todo'">总监·21天{{ a.notify21 ? '✓' : '未发' }}</span>
              </td>
              <td class="col-fixed">
                <button class="btn sm" @click="openHandle(a.id)">处理</button>
                <button class="btn sm ghost" @click="sendNotify(a, 1)" v-if="escalateLevel(a) >= 1 && !a.notify7">通知SQE</button>
                <button class="btn sm ghost" @click="sendNotify(a, 2)" v-if="escalateLevel(a) >= 2 && !a.notify14">升级经理</button>
                <button class="btn sm ghost" @click="sendNotify(a, 3)" v-if="escalateLevel(a) >= 3 && !a.notify21">升级总监</button>
                <button class="btn sm" @click="approveExtension(a)">延期获批</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 1. 来料异常记录 -->
    <div class="qms-card">
      <div class="qms-card__header">
        <h3>来料异常记录</h3>
        <el-select v-model="fLevel" placeholder="等级" style="width:108px">
          <el-option label="全部" value="" />
          <el-option label="严重" value="严重" />
          <el-option label="一般" value="一般" />
        </el-select>
        <el-select v-model="fStatus" placeholder="状态" style="width:130px">
          <el-option label="全部状态" value="" />
          <el-option label="待处理" value="待处理" />
          <el-option label="整改中" value="整改中" />
          <el-option label="待验证" value="待验证" />
          <el-option label="三批验证" value="三批验证" />
          <el-option label="已关闭" value="已关闭" />
        </el-select>
        <div class="grow"></div>
        <input v-model="fSearch" type="text" class="qms-input" placeholder="搜索异常单号..." style="width:170px" />
        <el-select v-model="fSup" placeholder="全部供应商" clearable filterable style="width:160px">
          <el-option v-for="s in suppliers" :key="s.id" :label="s.name" :value="s.id" />
        </el-select>
        <button v-if="canReport" class="btn pri sm" @click="openReport">+ 上报异常</button>
      </div>
      <div class="qms-card__body sticky-wrap">
        <table class="tbl" style="min-width: 1180px">
          <thead>
            <tr>
              <th>异常单号</th><th>批次号</th><th>供应商</th><th>物料</th>              <th>异常描述</th>
              <th>数量</th><th>等级</th><th>触发意见</th><th>日期</th><th>处理人</th><th>状态</th>
              <th class="col-fixed">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="a in filtered" :key="a.id">
              <td>{{ a.id }}</td>
              <td>{{ a.lotId }}</td>
              <td>{{ a.supName }}</td>
              <td>{{ a.partName }}<br><span class="meta">{{ a.partNo }}</span></td>
              <td>{{ a.desc }}</td>
              <td>{{ a.qty }}</td>
              <td><span class="qms-pill" :class="levelPill(a.level)">{{ a.level }}</span></td>
              <td>
                <span class="qms-pill" :class="triggerRulePill(a.triggerRule)">{{ a.triggerRule || '—' }}</span>
                <div class="meta" style="margin-top:2px">{{ triggerRuleHint(a.triggerRule) }}</div>
              </td>
              <td>{{ a.date }}</td>
              <td>{{ a.handler }}</td>
              <td>
                <span class="qms-pill" :class="statusPill(a.status)">{{ a.status }}</span>
                <span v-if="calcOverdue(a) > 0" class="qms-pill r" style="margin-left:4px">超期{{ calcOverdue(a) }}天</span>
                <span v-if="a.noticeDate" class="meta">通知:{{ a.noticeDate }}</span>
                <span v-if="a.measuresDate" class="meta">措施:{{ a.measuresDate }}</span>
              </td>
              <td class="col-fixed">
                <button class="btn sm" @click="openHandle(a.id)">{{ { '待处理': '处理', '整改中': '处理', '待验证': '验证', '三批验证': '批次', '已关闭': '详情' }[a.status] }}</button>
                <button v-if="canCapaRow(a)" class="btn sm ghost" @click="openCapa(a.id)">触发CAPA</button>
              </td>
            </tr>
            <tr v-if="filtered.length === 0">
              <td colspan="11" class="muted" style="text-align:center;padding:20px">无匹配数据</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 2. 8D整改进度概览 -->
    <div class="qms-card">
      <div class="qms-card__header" style="cursor:pointer" @click="d8Expanded = !d8Expanded">
        <h3>{{ d8Expanded ? '▼' : '▶' }} 8D整改进度概览 </h3>
      </div>
      <div v-if="d8Expanded" class="qms-card__body">
        <div v-if="d8List.length === 0" class="note">当前无进行中的8D整改</div>
        <div v-for="[d8Id, d8] in d8List" :key="d8Id" class="d8-block">
          <div class="d8-head">
            <strong>{{ d8.d8No || d8Id }}</strong>
            <span>当前阶段：<span class="qms-pill p">D{{ d8.stage.replace('D', '') }}</span></span>
            <span v-if="d8.status === '已闭环'" class="qms-pill g">已闭环</span>
            <span v-else-if="d8.capaTriggered" class="qms-pill y">已触发CAPA</span>
            <button
              class="btn sm pri"
              style="margin-left:auto"
              :disabled="d8.status === '已闭环'"
              @click="advance8d(d8.id, d8.stage)"
            >推进阶段 → {{ nextStage(d8.stage) }}</button>
          </div>
          <div class="stepper">
            <template v-for="(st, i) in d8.stages" :key="st.d">
              <div class="step">
                <div class="scirc" :style="{ background: d8StageColor(st.status), color: '#fff' }">{{ st.d }}</div>
                <div class="sname">{{ st.name }}</div>
              </div>
              <div v-if="i < d8.stages.length - 1" class="sline" />
            </template>
          </div>
        </div>
      </div>
    </div>

    <!-- 3. 供应商升级管理 -->
    <div class="qms-card">
      <div class="qms-card__header">
        <h3>供应商升级管理</h3>
        <div class="grow"></div>
        <span class="meta">定时扫描：每天凌晨 3:00 · ≥2次自动升级 · ≥3次自动降份额</span>
        <button class="btn pri sm" @click="triggerEscalation" style="margin-left:10px">手动触发升级扫描</button>
      </div>
      <div class="qms-card__body sticky-wrap">
        <table class="tbl">
          <thead><tr><th>供应商</th><th>当前等级</th><th>质量问题次数(近6月)</th><th>建议措施</th><th>升级状态</th><th class="col-fixed">操作</th></tr></thead>
          <tbody>
            <tr v-for="r in upgradeRows" :key="r.sup">
              <td>{{ r.sup }}</td>
              <td><span class="qms-pill y">{{ r.level }}</span></td>
              <td>{{ r.cnt }}</td>
              <td>{{ r.plan }}</td>
              <td><span class="qms-pill" :class="r.statusCls">{{ r.status }}</span></td>
              <td class="col-fixed"><button class="btn sm" @click="toast('已发送整改通知')">发送通知</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 上报异常弹窗（section化） -->
    <el-dialog v-model="reportVisible" title="上报来料异常" width="540px">
      <div class="report-sections">
        <div class="report-sec">
          <div class="report-sec__title">基础信息</div>
          <label>批次号</label>
          <input v-model="reportForm.lotId" type="text" class="qms-input" placeholder="输入来料批次号" />
          <label>供应商</label>
          <select v-model="reportForm.supId" class="qms-select">
            <option value="">选择供应商</option>
            <option v-for="s in suppliers" :key="s.id" :value="s.id">{{ s.name }}</option>
          </select>
          <label>物料料号</label>
          <input v-model="reportForm.partNo" type="text" class="qms-input" placeholder="输入物料料号" />
        </div>
        <div class="report-sec">
          <div class="report-sec__title">异常详情</div>
          <label>异常描述</label>
          <textarea v-model="reportForm.desc" rows="3" class="qms-input" placeholder="详细描述异常现象..." />
          <label>异常数量</label>
          <input v-model.number="reportForm.qty" type="number" class="qms-input" />
          <label>严重等级</label>
          <select v-model="reportForm.level" class="qms-select"><option>严重</option><option>一般</option></select>
          <label>整改触发意见</label>
          <select v-model="reportForm.triggerRule" class="qms-select">
            <option>一键即触发</option><option>累计≥3件</option>
          </select>
          <div class="note">📌 提交后需手动选择整改方式（8D / CAPA）。</div>
        </div>
      </div>
      <template #footer>
        <button class="btn pri" @click="submitReport">提交</button>
        <button class="btn ghost" @click="reportVisible = false">取消</button>
      </template>
    </el-dialog>

    <!-- 异常处理弹窗（按状态分支，紧凑布局） -->
    <el-dialog v-model="handleVisible" :title="(current?.archived ? '【已归档】' : '') + '异常处理 · ' + (current?.id || '')" width="660px">
      <template v-if="current">
        <!-- 信息卡（紧凑 2 列） -->
        <div class="handle-info">
          <div class="hi-row"><span class="hi-k">单号</span>{{ current.id }}</div>
          <div class="hi-row"><span class="hi-k">批次</span>{{ current.lotId }}</div>
          <div class="hi-row"><span class="hi-k">供应商</span>{{ current.supName }}</div>
          <div class="hi-row"><span class="hi-k">物料</span>{{ current.partName || current.partNo }}</div>
          <div class="hi-row"><span class="hi-k">数量</span>{{ current.qty }}</div>
          <div class="hi-row"><span class="hi-k">等级</span><span class="qms-pill" :class="levelPill(current.level)">{{ current.level }}</span></div>
          <div class="hi-row"><span class="hi-k">8D</span>
            <template v-if="current.d8Id"><a class="hi-link" @click="go8D()">{{ current.d8Id.slice(-12) }} →</a></template>
            <span v-else class="muted">未启动</span>
          </div>
          <div class="hi-row"><span class="hi-k">计划完成</span>{{ current.extensionApproved && current.extensionDate ? current.extensionDate + '(延)' : current.planDate || '—' }}</div>
        </div>

        <!-- 超期提示（SR-CAR-010/011） -->
        <div v-if="calcOverdue(current) > 0 && current.status !== '已关闭'" class="overdue-alert">
          <div class="oa-h">⏰ {{ overdueText(current) }}</div>
          <div class="oa-actions">
            <button class="btn sm" @click="sendNotify(current, 1)" :disabled="current.notify7">通知SQE(7天)</button>
            <button class="btn sm" @click="sendNotify(current, 2)" :disabled="current.notify14">升级经理(14天)</button>
            <button class="btn sm" @click="sendNotify(current, 3)" :disabled="current.notify21">升级总监(21天)</button>
            <button class="btn sm ghost" @click="approveExtension(current)">延期获批</button>
          </div>
        </div>

        <!-- 待处理：处置 + 整改方式 -->
        <template v-if="current.status === '待处理'">
          <div class="action-panel">
            <div class="ap-title">处置措施</div>
            <div class="ap-row">
              <select v-model="disposal" class="qms-select"><option>退货</option><option>特采</option><option>挑选使用</option><option>报废</option></select>
              <textarea v-model="remark" rows="2" class="qms-input" placeholder="备注..." />
            </div>
            <div class="ap-title" style="margin-top:14px">整改方式（手动触发）</div>
            <div class="ap-btns">
              <button class="btn" :class="current.d8Id ? '' : 'pri'" @click="start8D">{{ current.d8Id ? '✓ 8D已启动' : '发起8D' }}</button>
              <button class="btn pri" @click="startCapa">发起CAPA</button>
              <button class="btn" style="background:#1e4d8b;color:#fff" @click="triggerAudit">发起现场审核</button>
            </div>
            <button class="btn pri" style="width:100%;margin-top:12px" @click="openNotice">推送整改通知</button>
          </div>
        </template>

        <!-- 整改中 -->
        <template v-else-if="current.status === '整改中'">
          <div class="action-panel">
            <div class="ap-title">已发送的整改通知</div>
            <div class="kv">
              <div class="k">通知日期</div><div>{{ current.noticeDate || '—' }}</div>
              <div class="k">要求完成</div><div>{{ current.planDate || '—' }}</div>
              <div class="k">通知内容</div><div>{{ current.noticeContent || '—' }}</div>
            </div>
          </div>

          <div style="font-weight:600;margin:12px 0 6px">措施执行时间线（SR-CAR-007）</div>
          <div v-if="current.measureLogs.length === 0" class="note">尚无措施执行记录</div>
          <div v-else class="rectify-timeline">
            <div v-for="(m, i) in current.measureLogs" :key="i" class="timeline-item done">
              <div class="timeline-date">{{ m.completeDate }} · {{ m.operator }}</div>
              <div class="timeline-content">
                <div class="timeline-title">措施更新 #{{ i + 1 }}</div>
                <div class="timeline-desc">{{ m.content }}</div>
                <div v-if="m.evidence.length" class="evi">
                  <span v-for="(ev, j) in m.evidence" :key="j" class="evi-tag">📎 {{ ev.name }}（{{ fmtSize(ev.size) }}）</span>
                </div>
              </div>
            </div>
          </div>
          <button class="btn pri" style="width:100%;margin-top:12px" @click="openMeasures">更新措施进展（提交执行记录）</button>
        </template>

        <!-- 待验证：措施时间线 + SQE 验证按钮 -->
        <template v-else-if="current.status === '待验证'">
          <div class="action-panel">
            <div class="ap-title">措施执行时间线</div>
            <div v-if="current.measureLogs.length" class="rectify-timeline">
              <div v-for="(m, i) in current.measureLogs" :key="i" class="timeline-item done">
                <div class="timeline-date">{{ m.completeDate }} · {{ m.operator }}</div>
                <div class="timeline-content">
                  <div class="timeline-title">措施 #{{ i + 1 }}</div>
                  <div class="timeline-desc">{{ m.content }}</div>
                </div>
              </div>
            </div>
            <div v-else class="note">暂无措施记录</div>
            <button class="btn pri" style="width:100%;margin-top:12px" @click="openVerify" :disabled="!isSqe">SQE 验证（通过→三批验证 / 不通过→退回）</button>
            <div v-if="!isSqe" class="note" style="margin-top:4px">当前角色无 SQE 验证权限</div>
          </div>
        </template>

        <!-- 三批验证：批次进度 + 操作按钮 -->
        <template v-else-if="current.status === '三批验证'">
          <div class="action-panel">
            <div class="ap-title">连续 3 批合格验证</div>
            <div class="batch-progress">
              <div v-for="n in 3" :key="n" class="bp-item" :class="(current.batchTrack[n-1]?.result) || 'empty'">{{ n }}<span v-if="current.batchTrack[n-1]">{{ current.batchTrack[n-1].result }}</span></div>
            </div>
            <div class="ap-btns" style="margin-top:10px">
              <button class="btn pri" style="flex:1" @click="passBatch">登记合格</button>
              <button class="btn r" style="flex:1" @click="failBatch">登记不合格</button>
            </div>
            <div class="note" style="margin-top:8px">3 批合格 → 自动闭环；不合格 → 清零重新评估。</div>
          </div>
        </template>

        <!-- 已关闭：归档展示 + 完整时间线 -->
        <template v-else-if="current.status === '已关闭'">
          <div class="action-panel">
            <div class="archived-flag">🔒 已归档（只读） · {{ current.closeAuditor }} · {{ current.closeDate }}</div>
          <div style="font-weight:600;margin-top:12px;margin-bottom:4px">整改完整时间线</div>
          <div class="rectify-timeline">
            <div v-if="current.noticeDate" class="timeline-item done">
              <div class="timeline-date">{{ current.noticeDate }}</div>
              <div class="timeline-content"><div class="timeline-title">推送整改通知</div><div class="timeline-desc">{{ current.noticeContent }}</div></div>
            </div>
            <div v-for="(m, i) in current.measureLogs" :key="'m' + i" class="timeline-item done">
              <div class="timeline-date">{{ m.completeDate }} · {{ m.operator }}</div>
              <div class="timeline-content">
                <div class="timeline-title">措施更新 #{{ i + 1 }}</div>
                <div class="timeline-desc">{{ m.content }}</div>
                <div v-if="m.evidence.length" class="evi">
                  <span v-for="(ev, j) in m.evidence" :key="j" class="evi-tag">📎 {{ ev.name }}（{{ fmtSize(ev.size) }}）</span>
                </div>
              </div>
            </div>
            <div v-if="current.verifyResult" class="timeline-item done">
              <div class="timeline-date">{{ current.verifyDate }}</div>
              <div class="timeline-content">
                <div class="timeline-title">SQE验证 — {{ current.verifyResult }}</div>
                <div class="timeline-desc">{{ current.verifyComment }}<template v-if="current.returnReason">（退回原因：{{ current.returnReason }}）</template></div>
              </div>
            </div>
            <div v-for="(b, i) in current.batchTrack" :key="'b' + i" class="timeline-item done">
              <div class="timeline-date">{{ b.date }}</div>
              <div class="timeline-content"><div class="timeline-title">连续验证批次 {{ b.batchNo }} · {{ b.result }}</div><div class="timeline-desc">已关联整改单</div></div>
            </div>
            <div class="timeline-item done">
              <div class="timeline-date">{{ current.closeDate }}</div>
              <div class="timeline-content"><div class="timeline-title">整改单闭环归档</div><div class="timeline-desc">闭环人：{{ current.closeAuditor }}</div></div>
            </div>
          </div>

          <!-- 重复问题关联（SR-CAR-012 异常） -->
          <div v-if="relatedHistory.length" class="kv-box" style="margin-top:12px">
            <div style="font-weight:600;margin-bottom:6px">⚠ 同供应商历史整改单参考</div>
            <div v-for="h in relatedHistory" :key="h.id" class="rel-hist">
              <span>{{ h.id }}</span><span class="meta">{{ h.partName }} · {{ h.closeDate }}</span>
            </div>
          </div>
          </div><!-- /action-panel 已关闭 -->
        </template>
      </template>
      <template #footer>
        <button v-if="current && current.status === '待处理'" class="btn pri" @click="submitDisposal">提交处置</button>
        <button class="btn ghost" @click="handleVisible = false">关闭</button>
      </template>
    </el-dialog>

    <!-- 推送整改通知弹窗 -->
    <el-dialog v-model="noticeVisible" title="推送整改通知" width="520px">
      <template v-if="current">
        <p><strong>收件人：</strong>{{ current.supName }}</p>
        <p><strong>关联异常：</strong>{{ current.id }} · {{ current.partName }}</p>
        <div class="form-row">
          <label>通知标题</label>
          <input v-model="noticeForm.title" type="text" class="qms-input" />
          <label>通知内容</label>
          <textarea v-model="noticeForm.content" rows="5" class="qms-input" placeholder="请描述整改要求和期限..." />
          <label>要求整改期限（计划完成日期）</label>
          <input v-model="noticeForm.deadline" type="date" class="qms-input" />
        </div>
      </template>
      <template #footer>
        <button class="btn pri" @click="submitNotice">发送通知</button>
        <button class="btn ghost" @click="noticeVisible = false">取消</button>
      </template>
    </el-dialog>

    <!-- 措施执行进展更新弹窗（SR-CAR-007） -->
    <el-dialog v-model="measuresVisible" title="更新措施进展（整改执行记录）" width="540px">
      <div class="form-row">
        <label>措施进展描述</label>
        <textarea v-model="measuresForm.content" rows="4" class="qms-input" placeholder="描述本次整改执行内容与结果..." />
        <label>完成日期</label>
        <input v-model="measuresForm.completeDate" type="date" class="qms-input" />
        <label>执行人</label>
        <input v-model="measuresForm.operator" type="text" class="qms-input" placeholder="执行人姓名" />
        <label>执行证据（附件，单文件≤20MB）</label>
        <input type="file" multiple class="qms-input" @change="onAttach" />
        <div v-if="measuresForm.evidence.length" class="evi" style="margin-top:6px">
          <span v-for="(ev, j) in measuresForm.evidence" :key="j" class="evi-tag">
            📎 {{ ev.name }}（{{ fmtSize(ev.size) }}）
            <button class="x" @click="removeAttach(j)">×</button>
          </span>
        </div>
        <div class="note" style="margin-top:4px">超过 20MB 的附件将被拒绝，请压缩后重新上传。</div>
      </div>
      <template #footer>
        <button class="btn pri" @click="submitMeasures">保存为执行记录</button>
        <button class="btn ghost" @click="measuresVisible = false">取消</button>
      </template>
    </el-dialog>

    <!-- SQE验证弹窗（SR-CAR-008） -->
    <el-dialog v-model="verifyVisible" title="SQE验证整改措施" width="520px">
      <template v-if="current">
        <p><strong>关联异常：</strong>{{ current.id }}</p>
        <p><strong>供应商：</strong>{{ current.supName }}</p>
        <div class="kv-box" style="margin:10px 0">
          <div style="font-weight:600;margin-bottom:6px">已提交的措施执行记录</div>
          <div v-for="(m, i) in current.measureLogs" :key="i" class="rectify-timeline" style="margin-bottom:6px">
            <div class="timeline-item done">
              <div class="timeline-date">{{ m.completeDate }} · {{ m.operator }}</div>
              <div class="timeline-content"><div class="timeline-title">措施更新 #{{ i + 1 }}</div><div class="timeline-desc">{{ m.content }}</div></div>
            </div>
          </div>
          <div v-if="current.measureLogs.length === 0" class="note">供应商尚未提交措施执行记录</div>
        </div>
        <label>验证结果</label>
        <select v-model="verifyForm.result" class="qms-select">
          <option value="通过">通过 → 启动连续3批验证</option>
          <option value="不通过">不通过 → 退回整改（记录原因并重新计时）</option>
        </select>
        <label style="margin-top:8px">验证意见 / 退回原因</label>
        <textarea v-model="verifyForm.comment" rows="3" class="qms-input" placeholder="填写验证意见，不通过时记录退回原因..." />
      </template>
      <template #footer>
        <button class="btn pri" @click="submitVerify">提交验证</button>
        <button class="btn ghost" @click="verifyVisible = false">取消</button>
      </template>
    </el-dialog>

    <!-- 触发CAPA弹窗 / CAPA闭环 -->
    <el-dialog v-model="capaVisible" :title="capaMode === 'view' ? 'CAPA 详情 · 闭环' : '触发CAPA'" width="560px">
      <template v-if="capaMode === 'view' && currentCapa">
        <div class="kv-box">
          <div class="kv"><span class="k">CAPA编号</span><span>{{ currentCapa.title || currentCapa.id }}</span></div>
          <div class="kv"><span class="k">状态</span><span><span class="qms-pill" :class="capaStatusPill(currentCapa.status)">{{ currentCapa.status }}</span></span></div>
          <div class="kv"><span class="k">类型</span><span>{{ currentCapa.type }}</span></div>
          <div class="kv"><span class="k">关联8D</span><span>{{ currentCapa.d8Id || '—' }}</span></div>
          <div class="kv"><span class="k">责任人</span><span>{{ currentCapa.owner }}</span></div>
          <div class="kv"><span class="k">目标日期</span><span>{{ currentCapa.dueDate }}</span></div>
          <div class="kv"><span class="k">问题描述</span><span>{{ currentCapa.problem }}</span></div>
          <div class="kv"><span class="k">根本原因</span><span>{{ currentCapa.rootcause || '—' }}</span></div>
        </div>
        <div class="note">关闭 CAPA 将级联闭环其关联的 8D 与来料异常单。</div>
      </template>
      <template v-else>
        <div class="form-row">
          <p><strong>关联8D：</strong>{{ capaId || '（直接关联异常单）' }}</p>
          <label>CAPA类型</label>
          <select v-model="capaForm.type" class="qms-select">
            <option>纠正措施</option><option>预防措施</option><option>系统改进</option>
          </select>
          <label>问题描述</label>
          <textarea v-model="capaForm.problem" rows="3" class="qms-input" placeholder="描述需要CAPA解决的核心问题..." />
          <label>根本原因分析</label>
          <textarea v-model="capaForm.rootcause" rows="3" class="qms-input" placeholder="输入根本原因..." />
          <label>行动计划</label>
          <textarea v-model="capaForm.plan" rows="3" class="qms-input" placeholder="输入具体行动计划..." />
          <label>责任人</label>
          <input v-model="capaForm.owner" type="text" class="qms-input" placeholder="输入责任人" />
          <label>目标完成日期</label>
          <input v-model="capaForm.deadline" type="date" class="qms-input" />
        </div>
      </template>
      <template #footer>
        <button v-if="capaMode === 'view' && currentCapa" class="btn pri" @click="submitCapa">确认闭环</button>
        <button v-else class="btn pri" @click="submitCapa">确认触发</button>
        <button class="btn ghost" @click="capaVisible = false">取消</button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.sqm-abn { display: flex; flex-direction: column; gap: 14px; }

/* 原生 table "操作"列右固定（与 el-table fixed="right" 等效） */
.sticky-wrap { overflow-x: auto; padding: 0; }
.sticky-wrap .tbl th.col-fixed,
.sticky-wrap .tbl td.col-fixed {
  position: sticky; right: 0; z-index: 1;
  background: #fff; box-shadow: -2px 0 4px rgba(0,0,0,.06);
  min-width: 90px;
}
.sticky-wrap .tbl thead th.col-fixed { background: #f4f8ff; }

.grow { flex: 1; }

/* KPI 概览卡片 */
.kpi-row {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}
.kpi-card {
  flex: 1;
  min-width: 100px;
  background: #f4f8ff;
  border: 1px solid #dbe7f7;
  border-radius: 8px;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  &.warn { background: #fff8e1; border-color: #f0c14b; .kpi-num { color: #b58a00; } }
  &.danger { background: #fdecea; border-color: #f5c6c0; .kpi-num { color: #c0392b; } }
  &.alert { background: #fdeaea; border-color: #f9b8b8; .kpi-num { color: #d63031; } }
  &.done { background: #e8f5e9; border-color: #b7e0bb; .kpi-num { color: #2f7d32; } }
  .kpi-num { font-size: 24px; font-weight: 700; color: #1e4d8b; line-height: 1.1; }
  .kpi-label { font-size: 11px; color: #6b7785; }
}

.qms-select, .qms-input {
  height: 32px;
  border: 1px solid var(--line, #d8dee6);
  border-radius: 6px;
  padding: 0 10px;
  font-size: 13px;
  background: #fff;
  color: #1f2d3d;
}
.qms-input { min-width: 200px; }
textarea.qms-input { height: auto; padding: 8px 10px; resize: vertical; }
.sp { flex: 1; }

.d8-block { margin-bottom: 18px; padding: 14px; border: 1px solid #e5e7eb; border-radius: 8px; }
.d8-block:last-child { margin-bottom: 0; }
.d8-head { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; flex-wrap: wrap; }
.stepper { display: flex; align-items: flex-start; gap: 0; flex-wrap: wrap; }
.step { display: flex; flex-direction: column; align-items: center; width: 64px; flex-shrink: 0; }
.scirc { width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; }
.sname { font-size: 11px; color: #6b7785; margin-top: 6px; text-align: center; }
.sline { flex: 1; border-top: 2px dashed #d1d5db; margin-top: 17px; min-width: 16px; }

.kv-box { background: #f8fafc; padding: 12px; border-radius: 6px; margin-bottom: 12px; }
.kv-box.ok { background: #f0fdf4; }

/* 时间线 */
.rectify-timeline { display: flex; flex-direction: column; gap: 0; }
.timeline-item { position: relative; padding: 0 0 16px 22px; border-left: 2px solid #10b981; }
.timeline-item:last-child { border-left-color: transparent; padding-bottom: 0; }
.timeline-item::before { content: ''; position: absolute; left: -6px; top: 2px; width: 10px; height: 10px; border-radius: 50%; background: #10b981; }
.timeline-item.fail { border-left-color: #c0392b; }
.timeline-item.fail::before { background: #c0392b; }
.timeline-date { font-size: 12px; color: #8a94a6; }
.timeline-title { font-weight: 600; font-size: 13px; }
.timeline-desc { font-size: 12px; color: #6b7785; margin-top: 2px; }
.evi { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
.evi-tag { display: inline-flex; align-items: center; gap: 4px; background: #eef2f7; border: 1px solid #dfe6ee; border-radius: 10px; padding: 2px 8px; font-size: 11px; color: #44515f; }
.evi-tag .x { border: 0; background: transparent; cursor: pointer; color: #c0392b; font-size: 13px; line-height: 1; padding: 0 2px; }

/* 超期告警 */
.overdue-alert { margin-top: 12px; background: #fdecea; border: 1px solid #f5c6c0; border-radius: 8px; padding: 10px 12px; }
.oa-h { font-weight: 600; color: #c0392b; font-size: 13px; margin-bottom: 8px; }
.oa-actions { display: flex; gap: 8px; flex-wrap: wrap; }
.ntag { display: inline-block; font-size: 11px; padding: 2px 6px; border-radius: 8px; margin-right: 4px; }
.ntag.todo { background: #fdecea; color: #c0392b; border: 1px solid #f3b6af; }
.ntag.done { background: #e8f5e9; color: #2f7d32; border: 1px solid #b7e0bb; }

.badge { display: inline-block; font-size: 12px; padding: 2px 8px; border-radius: 10px; }
.badge.r { background: #fdecea; color: #c0392b; }

/* 三批验证进度 */
.batch-progress { display: flex; gap: 10px; margin-bottom: 6px; }
.bp-item { width: 64px; height: 56px; border-radius: 8px; border: 2px dashed #cbd5e1; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 12px; color: #8a94a6; }
.bp-item.合格 { border-style: solid; border-color: #10b981; background: #e8f5e9; color: #2f7d32; font-weight: 600; }
.bp-item.不合格 { border-style: solid; border-color: #c0392b; background: #fdecea; color: #c0392b; font-weight: 600; }

.archived-flag { background: #eef2f7; border: 1px solid #dfe6ee; border-radius: 6px; padding: 8px 10px; font-size: 12px; color: #44515f; }
.rel-hist { display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px dashed #e5e7eb; font-size: 12px; }

.form-row { display: flex; flex-direction: column; gap: 6px; }
.form-row label { font-size: 13px; color: #44515f; margin-top: 6px; }
.kv { display: grid; grid-template-columns: 110px 1fr; gap: 4px 12px; font-size: 13px; }
.kv .k { color: #6b7785; }

.btn {
  border: 1px solid #e1e8f0; background: #fff; border-radius: 6px; padding: 4px 10px; font-size: 12px; cursor: pointer; transition: 0.15s;
  &.sm { padding: 3px 8px; }
  &.pri { background: #1e4d8b; border-color: #1e4d8b; color: #fff; }
  &.ghost { background: #fff; color: #5a6b7e; }
  &.r { background: #c0392b; border-color: #c0392b; color: #fff; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
  &:not(:disabled):hover { filter: brightness(0.96); }
}

/* ======== 弹窗优化：信息卡 + 操作面板 ======== */
.handle-info {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 3px 12px;
  background: #f4f8ff;
  border: 1px solid #dbe7f7;
  border-radius: 8px;
  padding: 10px 12px;
  margin-bottom: 14px;
  font-size: 12px;
}
.hi-row { display: flex; gap: 6px; align-items: baseline; overflow: hidden; }
.hi-k { color: #6b7785; font-weight: 500; min-width: 56px; flex-shrink: 0; }
.hi-link { color: #1e4d8b; cursor: pointer; text-decoration: underline; font-size: 11px; }

.action-panel {
  background: #fafbfc;
  border: 1px solid #eef0f3;
  border-radius: 8px;
  padding: 12px 14px;
  margin-top: 10px;
  &:first-child { margin-top: 0; }
}
.ap-title { font-weight: 600; font-size: 12px; color: #1e4d8b; margin-bottom: 8px; }
.ap-row { display: flex; flex-direction: column; gap: 6px; }
.ap-btns { display: flex; gap: 8px; flex-wrap: wrap; }

/* ======== 上报弹窗：section 表单 ======== */
.report-sections { display: flex; flex-direction: column; gap: 14px; }
.report-sec {
  border: 1px solid #eef0f3;
  border-radius: 8px;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  &__title { font-weight: 600; font-size: 12.5px; color: #1e4d8b; margin-bottom: 4px; }
  label { font-size: 12px; color: #6b7785; }
}
</style>
