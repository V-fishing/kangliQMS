<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import type { RoleId } from '@/mock/roles'
import { BANNERS } from '@/mock/roles'
import { abnormals, d8Links, suppliers } from '@/mock/sqm'
import type { Abnormal, D8Link, MeasureLog, Attachment } from '@/types/sqm'

const authStore = useAuthStore()
const banner = BANNERS.sqm?.[authStore.role] || {
  title: 'SQM · 来料异常整改',
  desc: '来料异常处置、整改执行记录、连续三批验证与闭环归档（SR-CAR-007~012）',
}

// 数据源（可变，模拟 HTML 的 MOCK 状态流转）
const list = ref<Abnormal[]>([...abnormals])
const d8List = computed(() => Object.entries(d8Links) as [string, D8Link][])

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
function openHandle(id: string) {
  const a = list.value.find((x) => x.id === id)
  if (a) { current.value = a; handleVisible.value = true }
}

// 上报异常
const reportVisible = ref(false)
const reportForm = reactive({ lotId: '', supId: '', partNo: '', desc: '', qty: 1, level: '严重' as '严重' | '一般', triggerRule: '一键即触发' as '一键即触发' | '累计≥3件' })
function openReport() {
  reportForm.lotId = ''; reportForm.supId = ''; reportForm.partNo = ''
  reportForm.desc = ''; reportForm.qty = 1; reportForm.level = '严重'; reportForm.triggerRule = '一键即触发'
  reportVisible.value = true
}
function submitReport() {
  if (!reportForm.lotId || !reportForm.supId || !reportForm.partNo || !reportForm.desc) {
    ElMessage.warning('请填写批次号、供应商、物料料号与异常描述')
    return
  }
  const sup = suppliers.find((s) => s.id === reportForm.supId)
  const id = `ABN-${new Date().getFullYear()}-${String(list.value.length + 1).padStart(3, '0')}`
  list.value.unshift({
    id, lotId: reportForm.lotId, supId: reportForm.supId, supName: sup?.name || reportForm.supId,
    partNo: reportForm.partNo, partName: reportForm.partNo, desc: reportForm.desc, qty: reportForm.qty,
    level: reportForm.level, date: new Date().toISOString().slice(0, 10), handler: authStore.currentRole?.name || '—',
    status: '待处理', d8Id: null, capaId: null, noticeSent: false, noticeDate: null, noticeContent: null,
    planDate: null, extensionApproved: false, extensionDate: null, measures: null, measuresDate: null, measuresContent: null,
    measureLogs: [], verifyResult: null, verifyDate: null, verifyComment: null, returnReason: null,
    batchTrack: [], closeDate: null, closeAuditor: null, archived: false, notify7: false, notify14: false, notify21: false, overdueDays: 0,
    triggerRule: reportForm.triggerRule,
  })
  reportVisible.value = false
  ElMessage.success('异常已上报，请在异常列表中手动发起整改')
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
const capaId = ref('')
const capaForm = reactive({ type: '纠正措施', problem: '', rootcause: '', plan: '', owner: '', deadline: '' })
function openCapa(id: string) {
  const a = list.value.find((x) => x.id === id)
  capaId.value = a?.d8Id || ''
  capaForm.type = '纠正措施'; capaForm.problem = ''; capaForm.rootcause = ''
  capaForm.plan = ''; capaForm.owner = ''; capaForm.deadline = ''
  capaVisible.value = true
}
function submitCapa() {
  capaVisible.value = false
  ElMessage.success('CAPA已触发并关联到8D流程')
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
function start8D() {
  if (!current.value) return
  if (!current.value.d8Id) current.value.d8Id = 'D8-' + current.value.id
  handleVisible.value = false
  ElMessage.success('已手动发起8D流程')
}
function startCapa() {
  if (!current.value) return
  handleVisible.value = false
  ElMessage.success('已手动发起CAPA流程')
}
function toast(msg: string) {
  ElMessage.success(msg)
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

    <!-- 工具栏 -->
    <div class="toolbar">
      <select v-model="fLevel" class="qms-select">
        <option value="">全部等级</option><option>严重</option><option>一般</option>
      </select>
      <select v-model="fStatus" class="qms-select">
        <option value="">全部状态</option><option>待处理</option><option>整改中</option><option>待验证</option><option>三批验证</option><option>已关闭</option>
      </select>
      <select v-model="fSup" class="qms-select">
        <option value="">全部供应商</option>
        <option v-for="s in suppliers" :key="s.id" :value="s.id">{{ s.name }}</option>
      </select>
      <input v-model="fSearch" type="text" class="qms-input" placeholder="搜索异常单号或物料..." />
      <span class="sp" />
      <button v-if="canReport" class="btn pri" @click="openReport">+ 上报异常</button>
    </div>

    <!-- 0. 超期预警与升级通知（SR-CAR-010 / SR-CAR-011） -->
    <div class="qms-card" v-if="overdueList.length">
      <div class="qms-card__header">
        <h3>超期预警与升级通知 <span class="sr-tag" title="SR-CAR-010,SR-CAR-011">SR-CAR-010,011</span></h3>
        <span class="badge r">{{ overdueList.length }} 单超期</span>
      </div>
      <div class="qms-card__body" style="padding: 0; overflow-x: auto">
        <table class="tbl">
          <thead><tr><th>异常单号</th><th>供应商</th><th>状态</th><th>超期情况</th><th>通知状态</th><th>操作</th></tr></thead>
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
              <td>
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
      <div class="qms-card__header"><h3>来料异常记录 <span class="sr-tag" title="SR-CAR-001,002,003">SR-CAR-001,002,003</span></h3></div>
      <div class="qms-card__body" style="padding: 0; overflow-x: auto">
        <table class="tbl" style="min-width: 1180px">
          <thead>
            <tr>
              <th>异常单号</th><th>批次号</th><th>供应商</th><th>物料</th>              <th>异常描述</th>
              <th>数量</th><th>等级</th><th>触发意见</th><th>日期</th><th>处理人</th><th>状态</th><th>操作</th>
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
              <td>
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
      <div class="qms-card__header"><h3>8D整改进度概览 <span class="sr-tag" title="SR-PTL-010,014,015,016,017,018">SR-PTL-010,014,015,016,017,018</span></h3></div>
      <div class="qms-card__body">
        <div v-if="d8List.length === 0" class="note">当前无进行中的8D整改</div>
        <div v-for="[d8Id, d8] in d8List" :key="d8Id" class="d8-block">
          <div class="d8-head">
            <strong>{{ d8Id }}</strong>
            <span>当前阶段：<span class="qms-pill p">D{{ d8.stage.replace('D', '') }}</span></span>
            <span v-if="d8.capaTriggered" class="qms-pill y">已触发CAPA</span>
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
      <div class="qms-card__header"><h3>供应商升级管理 <span class="sr-tag" title="SR-CAR-020,022,SR-SBM-015">SR-CAR-020,022,SR-SBM-015</span></h3></div>
      <div class="qms-card__body" style="padding: 0; overflow-x: auto">
        <table class="tbl">
          <thead><tr><th>供应商</th><th>当前等级</th><th>质量问题次数(近6月)</th><th>建议措施</th><th>升级状态</th><th>操作</th></tr></thead>
          <tbody>
            <tr v-for="r in upgradeRows" :key="r.sup">
              <td>{{ r.sup }}</td>
              <td><span class="qms-pill y">{{ r.level }}</span></td>
              <td>{{ r.cnt }}</td>
              <td>{{ r.plan }}</td>
              <td><span class="qms-pill" :class="r.statusCls">{{ r.status }}</span></td>
              <td><button class="btn sm" @click="toast('已发送整改通知')">发送通知</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 上报异常弹窗 -->
    <el-dialog v-model="reportVisible" title="上报来料异常" width="520px">
      <div class="form-row">
        <label>批次号</label>
        <input v-model="reportForm.lotId" type="text" class="qms-input" placeholder="输入来料批次号" />
        <label>供应商</label>
        <select v-model="reportForm.supId" class="qms-select">
          <option value="">选择供应商</option>
          <option v-for="s in suppliers" :key="s.id" :value="s.id">{{ s.name }}</option>
        </select>
        <label>物料料号</label>
        <input v-model="reportForm.partNo" type="text" class="qms-input" placeholder="输入物料料号" />
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
        <div class="note" style="margin-top:4px">⚠ 触发意见将记录在异常单中，用于区分「严重1件即触发 / 人工一键发起」与「同物料一般不良滚动30天累计≥3件自动触发」（SR-CAR-001 / SR-CAR-002）。</div>
      </div>
      <div class="note" style="margin-top:8px">📌 异常上报后，需<strong>手动选择</strong>整改方式（8D 或 CAPA）。</div>
      <template #footer>
        <button class="btn pri" @click="submitReport">提交</button>
        <button class="btn ghost" @click="reportVisible = false">取消</button>
      </template>
    </el-dialog>

    <!-- 异常处理弹窗（按状态分支，含整改记录与闭环） -->
    <el-dialog v-model="handleVisible" :title="(current?.archived ? '【已归档】' : '') + '异常处理 · ' + (current?.id || '')" width="640px">
      <template v-if="current">
        <div class="kv">
          <div class="k">异常单号</div><div>{{ current.id }}</div>
          <div class="k">批次号</div><div>{{ current.lotId }}</div>
          <div class="k">供应商</div><div>{{ current.supName }}</div>
          <div class="k">物料</div><div>{{ current.partName }} ({{ current.partNo }})</div>
          <div class="k">异常描述</div><div>{{ current.desc }}</div>
          <div class="k">异常数量</div><div>{{ current.qty }}</div>
          <div class="k">等级</div><div><span class="qms-pill" :class="levelPill(current.level)">{{ current.level }}</span></div>
          <div class="k">整改触发意见</div><div>
            <span class="qms-pill" :class="triggerRulePill(current.triggerRule)">{{ current.triggerRule || '—' }}</span>
            <span class="meta" style="margin-left:6px">{{ triggerRuleHint(current.triggerRule) }}</span>
          </div>
          <div class="k">处理人</div><div>{{ current.handler }}</div>
          <div class="k">关联8D</div><div>{{ current.d8Id || '未启动' }}</div>
          <div class="k">计划完成</div><div>{{ current.extensionApproved && current.extensionDate ? current.extensionDate + '（延期获批）' : current.planDate || '—' }}</div>
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

        <!-- 待处理 -->
        <template v-if="current.status === '待处理'">
          <hr style="margin:12px 0;border:0;border-top:1px solid #e5e7eb" />
          <div class="form-row">
            <label>处置措施</label>
            <select v-model="disposal" class="qms-select">
              <option>退货</option><option>特采</option><option>挑选使用</option><option>报废</option>
            </select>
            <label>备注</label>
            <textarea v-model="remark" rows="2" class="qms-input" placeholder="备注..." />
          </div>
          <hr style="margin:12px 0;border:0;border-top:1px solid #e5e7eb" />
          <div style="font-weight:600;margin-bottom:6px">整改方式（手动触发）</div>
          <div style="display:flex;gap:8px;margin-bottom:8px">
            <button class="btn" :class="current.d8Id ? '' : 'pri'" @click="start8D">{{ current.d8Id ? '✓ 8D已启动' : '发起8D' }}</button>
            <button class="btn" @click="startCapa">发起CAPA</button>
          </div>
          <hr style="margin:12px 0;border:0;border-top:1px solid #e5e7eb" />
          <button class="btn pri" style="width:100%" @click="openNotice">推送整改通知</button>
        </template>

        <!-- 整改中：措施执行时间线（SR-CAR-007） -->
        <template v-else-if="current.status === '整改中'">
          <hr style="margin:12px 0;border:0;border-top:1px solid #e5e7eb" />
          <div class="kv-box">
            <div style="font-weight:600;margin-bottom:6px">已发送的整改通知</div>
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

        <!-- 待验证：SQE验证（SR-CAR-008） -->
        <template v-else-if="current.status === '待验证'">
          <hr style="margin:12px 0;border:0;border-top:1px solid #e5e7eb" />
          <div class="kv-box ok">
            <div style="font-weight:600;margin-bottom:6px">措施执行时间线</div>
            <div v-for="(m, i) in current.measureLogs" :key="i" class="rectify-timeline" style="margin-bottom:8px">
              <div class="timeline-item done">
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
          </div>
          <button class="btn pri" style="width:100%;margin-top:12px" @click="openVerify" :disabled="!isSqe">SQE验证（通过→三批验证 / 不通过→退回）</button>
          <div v-if="!isSqe" class="note" style="margin-top:6px">当前角色无 SQE 验证权限</div>
        </template>

        <!-- 三批验证（SR-CAR-009） -->
        <template v-else-if="current.status === '三批验证'">
          <hr style="margin:12px 0;border:0;border-top:1px solid #e5e7eb" />
          <div style="font-weight:600;margin-bottom:6px">连续 3 批合格验证（SR-CAR-009）</div>
          <div class="batch-progress">
            <div v-for="n in 3" :key="n" class="bp-item" :class="(current.batchTrack[n-1]?.result) || 'empty'">
              {{ n }}
              <span v-if="current.batchTrack[n-1]">{{ current.batchTrack[n-1].result }}</span>
            </div>
          </div>
          <div v-if="current.batchTrack.length" class="rectify-timeline" style="margin:10px 0">
            <div v-for="(b, i) in current.batchTrack" :key="i" class="timeline-item" :class="b.result === '合格' ? 'done' : 'fail'">
              <div class="timeline-date">{{ b.date }}</div>
              <div class="timeline-content">
                <div class="timeline-title">批次 {{ b.batchNo }} · {{ b.result }}</div>
                <div class="timeline-desc">检验结果已自动关联整改单</div>
              </div>
            </div>
          </div>
          <div style="display:flex;gap:8px">
            <button class="btn pri" style="flex:1" @click="passBatch">登记一批合格</button>
            <button class="btn r" style="flex:1" @click="failBatch">登记一批不合格</button>
          </div>
          <div class="note" style="margin-top:6px">3 批全部合格将自动闭环；任一不合格则计数器清零并通知 SQE 重新评估。</div>

        </template>

        <!-- 已关闭：只读归档 + 完整时间线 + 历史关联（SR-CAR-012） -->
        <template v-else-if="current.status === '已关闭'">
          <hr style="margin:12px 0;border:0;border-top:1px solid #e5e7eb" />
          <div class="archived-flag">🔒 已归档（只读） · 闭环人：{{ current.closeAuditor }} · 闭环时间：{{ current.closeDate }}</div>
          <div style="font-weight:600;margin:12px 0 6px">整改完整时间线</div>
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

    <!-- 触发CAPA弹窗 -->
    <el-dialog v-model="capaVisible" title="触发CAPA" width="560px">
      <div class="form-row">
        <p><strong>关联8D：</strong>{{ capaId }}</p>
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
      <template #footer>
        <button class="btn pri" @click="submitCapa">确认触发</button>
        <button class="btn ghost" @click="capaVisible = false">取消</button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.sqm-abn { display: flex; flex-direction: column; gap: 14px; }

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
</style>
