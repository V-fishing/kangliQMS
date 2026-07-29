<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import echarts from '@/utils/echarts'
import { useChartResize } from '@/composables/useChartResize'
useChartResize(() => [calInst])
import { useAuthStore } from '@/stores/auth'
import { useRoute, useRouter } from 'vue-router'
import { BANNERS } from '@/config/banners'
import { sqmApi } from '@/api'
import type { AuditPlan, AuditRecord, NcItem, Supplier } from '@/types/sqm'
import SchemaForm from '@/components/form/SchemaForm.vue'

const authStore = useAuthStore()
const route = useRoute()
const router = useRouter()
const banner = BANNERS.sqm?.[authStore.role] || {
  title: 'SQM · 供应商审核',
  desc: '审核计划、审核记录与不符合项管理',
}

// 角色门控：SQE/质量经理/体系/系统管理员可新增审核计划
const canAdd = ['sqe', 'qmanager', 'qualitysys', 'sysadmin'].includes(authStore.role)

// ---- 视图切换（列表 / 日历，对齐 HTML switchAuditView） ----
const view = ref<'list' | 'calendar'>('list')

// ---- 审核计划（可新增、可筛选） ----
const plans = ref<AuditPlan[]>([])
const supplierMap = ref<Record<string, Supplier>>({})

// ===== 供应商准入申请审批（预选目标状态） =====
const pendingApplies = computed(() =>
  Object.values(supplierMap.value).filter((s) => s.status === '待审核'),
)
const approveTarget = reactive<Record<string, Supplier['status']>>({})
async function approveApply(s: Supplier) {
  const st = approveTarget[s.id] || '合格'
  await sqmApi.updateSupplier(s.id, { id: s.id, status: st })
  ElMessage.success(`【${s.name}】准入审核通过，已进入「${st}」状态 · 后续可在生命周期页进行状态升级`)
  await loadData()
}
async function rejectApply(s: Supplier) {
  await sqmApi.updateSupplier(s.id, { id: s.id, status: '不合格' })
  ElMessage.success(`【${s.name}】准入申请已拒绝`)
  await loadData()
}
const fType = ref('')
const fStatus = ref('')
const fSearch = ref('')
const filteredPlans = computed(() =>
  plans.value.filter((p) =>
    (!fType.value || p.type === fType.value) &&
    (!fStatus.value || p.status === fStatus.value) &&
    (!fSearch.value || (p.supName || p.supId).toLowerCase().includes(fSearch.value.toLowerCase())),
  ),
)

// ---- 审核记录（对齐 HTML MOCK.sqm.auditRecords） ----
const records = ref<AuditRecord[]>([])

// ---- 不符合项跟踪（可筛选） ----
const ncs = ref<NcItem[]>([])
const fNcLevel = ref('')
const fNcStatus = ref('')
const filteredNc = computed(() =>
  ncs.value.filter((n) =>
    (!fNcLevel.value || n.level === fNcLevel.value) &&
    (!fNcStatus.value || n.status === fNcStatus.value),
  ),
)

// ---- 异步加载后端数据 ----
const loading = ref(false)
async function loadData() {
  loading.value = true
  try {
    const [suppliers, planList, recordList, ncList] = await Promise.all([
      sqmApi.getSuppliers(),
      sqmApi.getAuditPlans(),
      sqmApi.getAuditRecords(),
      sqmApi.getNcItems(),
    ])
    const map: Record<string, Supplier> = {}
    suppliers.forEach((s) => { map[s.id] = s })
    supplierMap.value = map
    // 关联供应商名称
    plans.value = planList.map((p) => ({ ...p, supName: map[p.supId]?.name || p.supId }))
    records.value = recordList.map((r) => ({ ...r, supName: map[r.supId]?.name || r.supId }))
    ncs.value = ncList.map((n) => ({ ...n, supName: map[n.supId]?.name || n.supId }))
    tryOpenFromQuery()
  } catch (e) {
    // 错误已由 request 拦截器统一提示
  } finally {
    loading.value = false
  }
}
onMounted(loadData)

// ---- 药丸配色（对齐 HTML stPill / lvlPill） ----
const STATUS_MAP: Record<string, string> = {
  待检: 'y', 进行中: 'b', 已完成: 'g', 超时: 'r', 合格: 'g', 不合格: 'r', 正常: 'g', 锁定: 'r',
  待首检: 'y', 充足: 'g', 尚可: 'y', 不足: 'r', 严重: 'r', 一般: 'y', 观察项: 'gray',
  待确认: 'y', 已关闭: 'g', 待提交: 'y', 整改中: 'b', 待启动: 'gray', 超期: 'r', 即将到期: 'y',
  报警: 'r', 预警: 'y', 待处理: 'y', 待验证: 'p', '8D进行中': 'b', 'CAPA执行中': 'p',
  计划中: 'gray', 待执行: 'gray', 已验证: 'p', '已整改待验证': 'p',
}
function statusClass(st: string) { return STATUS_MAP[st] || 'gray' }
function resultClass(r: string) { return r === '通过' ? 'g' : r === '不通过' ? 'r' : 'y' }
function levelClass(l: string) { return l === '严重' ? 'r' : l === '一般' ? 'y' : 'g' }

// ---- 交互（对齐 HTML actAudit*） ----
async function confirmPlan(p: AuditPlan) {
  try {
    await sqmApi.confirmAuditPlan(p.id)
    ElMessage.success(`排期已确认：${p.id}（${p.supName}）`)
    await loadData()
  } catch (e) {
    // 错误已由 request 拦截器统一提示
  }
}
async function startAudit(p: AuditPlan) {
  try {
    await sqmApi.startAuditPlan(p.id)
    ElMessage.success(`审核已开始：${p.id}（${p.supName}）`)
    await loadData()
  } catch (e) {
    // 错误已由 request 拦截器统一提示
  }
}
function detailPlan(p: AuditPlan) {
  detailTarget.value = p
  detailVisible.value = true
}
// 从总览看板「查看」下钻：?id= 自动打开该审核计划详情
const detailVisible = ref(false)
const detailTarget = ref<AuditPlan | null>(null)
// 从异常/生命周期下钻：?supId=&supName=&from=abnormal 自动打开新增审核计划弹窗并预填供应商
function tryOpenFromQuery() {
  const id = route.query.id as string | undefined
  if (id) { const p = plans.value.find((x) => x.id === id); if (p) { detailPlan(p); return } }
  const supId = route.query.supId as string | undefined
  const supName = route.query.supName as string | undefined
  const from = route.query.from as string | undefined
  if ((from === 'abnormal' || from === 'lifecycle') && supId && canAdd) {
    const s = supplierMap.value[supId]
    const type = from === 'abnormal' ? '专项审核' : '年度复审'
    const scope = from === 'abnormal' ? '来料异常专项审核' : 'QMS全覆盖'
    model.value = { supName: supName || s?.name || supId, type, planDate: new Date().toISOString().slice(0, 10), auditor: authStore.userName || authStore.account || 'SQE', scope }
    dialog.value = true
  }
}
watch([() => route.query.id, () => route.query.supId], () => tryOpenFromQuery())
/** 跳转到供应商档案页 */
function goSupplierProfile(supId: string) {
  router.push({ path: '/sqm/lifecycle', query: { supId } })
}

// ===== 审核计划自身生命周期（时间线） =====
const lifecycleVisible = ref(false)
const lifecycleTarget = ref<AuditPlan | null>(null)
const lifecycleTimeline = computed(() => {
  const p = lifecycleTarget.value
  if (!p) return [] as { label: string; time: string; desc: string; cls: string }[]

  const lines: { label: string; time: string; desc: string; cls: string }[] = []
  const statusOrder = ['计划中', '待执行', '进行中', '已完成']
  const statusCls: Record<string, string> = { 计划中: 'gray', 待执行: 'y', 进行中: 'b', 已完成: 'g' }

  // 阶段1: 计划创建
  lines.push({ label: '计划创建', time: p.planDate, desc: `${p.type} · ${p.auditor} · ${p.scope}`, cls: 'g' })

  // 阶段2: 审核启动（状态 >= 待执行）
  const curIdx = statusOrder.indexOf(p.status)
  if (curIdx >= 1) {
    lines.push({ label: '审核已启动', time: p.planDate, desc: `计划号 ${p.id}`, cls: 'b' })
  }

  // 阶段3: 关联审核记录
  const relatedRecords = records.value.filter((r) => r.planId === p.id)
  relatedRecords.forEach((r) => {
    const cls = r.result === '通过' ? 'g' : r.result === '不通过' ? 'r' : 'y'
    lines.push({ label: '审核执行', time: r.date, desc: `${r.auditor} · 结论：${r.result} · 得分：${r.score} · 不符合项：${r.ncCount}`, cls })
  })

  // 阶段4: 不符合项跟进
  const recordIds = relatedRecords.map((r) => r.id)
  const relatedNcs = ncs.value.filter((n) => recordIds.includes(n.arId))
  relatedNcs.slice(0, 5).forEach((n) => {
    const cls = n.status === '已关闭' || n.status === '已验证' ? 'g' : n.level === '严重' ? 'r' : 'y'
    lines.push({ label: `不符合项[${n.level}]`, time: n.deadline, desc: `${n.desc} · ${n.clause} · 状态：${n.status}`, cls })
  })

  // 阶段5: 计划完成
  if (p.status === '已完成') {
    lines.push({ label: '计划完成', time: new Date().toISOString().slice(0, 10), desc: '审核计划已完成', cls: 'g' })
  } else if (p.status === '已取消') {
    lines.push({ label: '计划取消', time: new Date().toISOString().slice(0, 10), desc: '该审核计划已取消', cls: 'gray' })
  }

  return lines
})
function openLifecycle(p: AuditPlan) {
  lifecycleTarget.value = p
  lifecycleVisible.value = true
}
// 审核记录详情弹窗（声明必须在 viewRecord 之前，因为函数体内引用它们）
const recordVisible = ref(false)
const recordTarget = ref<AuditRecord | null>(null)
function viewRecord(r: any) {
  recordTarget.value = r
  recordVisible.value = true
}
function trackNc(n: NcItem) {
  router.push({ path: '/sqm/abnormal', query: { supId: n.supId, supName: n.supName, from: 'audit', ncId: n.id } })
}

// ---- 执行审核（SR-SQA-007 检查表 / SR-SQA-009 不符合项分级 / SR-SQA-021 结论建议） ----
const execVisible = ref(false)
const execTarget = ref<AuditPlan | null>(null)
const checklist = reactive([
  { clause: 'ISO13485-7.5.1 生产与服务控制', judge: '' as '' | '符合' | '不符合' | '不适用', note: '' },
  { clause: 'GMP-8.3 不合格品控制', judge: '' as '' | '符合' | '不符合' | '不适用', note: '' },
  { clause: 'ISO13485-8.2.4 监视与测量', judge: '' as '' | '符合' | '不符合' | '不适用', note: '' },
  { clause: 'ISO13485-7.4 采购控制', judge: '' as '' | '符合' | '不符合' | '不适用', note: '' },
])
const execNcs = ref<{ clause: string; desc: string; level: '严重' | '一般' | '观察项'; contain?: string }[]>([])
const newNc = reactive({ clause: '', desc: '', level: '一般' as '严重' | '一般' | '观察项', contain: '' })
function openExec(p: AuditPlan) {
  execTarget.value = p
  checklist.forEach((c) => { c.judge = ''; c.note = '' })
  execNcs.value = []
  newNc.clause = ''; newNc.desc = ''; newNc.level = '一般'; newNc.contain = ''
  execVisible.value = true
}
function addNc() {
  if (!newNc.desc.trim()) { ElMessage.warning('请填写不符合描述'); return }
  if (newNc.level === '严重' && !newNc.contain.trim()) { ElMessage.warning('严重不符合项需填写即时遏制措施（SR-SQA-009）'); return }
  execNcs.value.push({ clause: newNc.clause, desc: newNc.desc.trim(), level: newNc.level, contain: newNc.contain.trim() || undefined })
  newNc.clause = ''; newNc.desc = ''; newNc.level = '一般'; newNc.contain = ''
  ElMessage.success('不符合项已录入（' + newNc.level + '）')
}
// 结论自动建议（SR-SQA-021）：无不符合/仅观察项=推荐通过；存在一般项无严重=有条件通过；严重或一般>5=不通过
function conclusionSuggestion() {
  const hasSerious = execNcs.value.some((n) => n.level === '严重')
  const generalCount = execNcs.value.filter((n) => n.level === '一般').length
  if (hasSerious) return { txt: '不通过', cls: 'r' }
  if (generalCount > 5) return { txt: '不通过', cls: 'r' }
  if (generalCount > 0) return { txt: '有条件通过', cls: 'y' }
  return { txt: '推荐通过', cls: 'g' }
}
/** 从检查表计算审核得分：符合/(符合+不符合)*100，不适用排除 */
function computedScore(): number {
  const pass = checklist.filter((c) => c.judge === '符合').length
  const fail = checklist.filter((c) => c.judge === '不符合').length
  if (pass + fail === 0) return 100
  return Math.round((pass / (pass + fail)) * 100 * 100) / 100
}
async function submitExec() {
  if (checklist.some((c) => !c.judge)) { ElMessage.warning('请完成检查表逐项判定（符合/不符合/不适用）'); return }
  const p = execTarget.value
  if (!p) return
  // 整改期限按分级：严重=15天/一般=30天/观察项无期限（SR-SQA-013）
  const serious = execNcs.value.filter((n) => n.level === '严重').length
  const general = execNcs.value.filter((n) => n.level === '一般').length
  try {
    const rec = await sqmApi.createAuditRecord({
      planId: p.id, supplierId: p.supId, auditType: p.type,
      auditDate: new Date().toISOString().slice(0, 10),
      auditLead: p.auditor, conclusion: conclusionSuggestion().txt,
      findings: checklist.map((c) => `${c.clause}:${c.judge}${c.note ? `(${c.note})` : ''}`).join('; '),
      score: computedScore(),
      status: '已完成',
    })
    for (const n of execNcs.value) {
      const days = n.level === '严重' ? 15 : n.level === '一般' ? 30 : undefined
      let dueDate: string | undefined
      if (days) {
        const d = new Date()
        d.setDate(d.getDate() + days)
        dueDate = d.toISOString().slice(0, 10)
      }
      await sqmApi.createAuditNc({
        auditId: rec.id, supplierId: p.supId,
        clause: n.clause || undefined, description: n.desc, level: n.level,
        containment: n.contain, dueDate, status: '整改中',
      })
    }
    ElMessage.success(`审核已提交，结论建议「${conclusionSuggestion().txt}」；${serious} 项严重(15天)/${general} 项一般(30天)不符合项已双通道推送整改`)
    execVisible.value = false
    await loadData()
  } catch (e) {
    // 错误已由 request 拦截器统一提示
  }
}

// ---- 不符合项整改闭环（SR-SQA-018：SQE确认 + 连续3批合格） ----
const ncClosure = reactive<Record<string, number>>({})
async function passNcBatch(n: NcItem) {
  const k = n.id
  ncClosure[k] = (ncClosure[k] || 0) + 1
  if (ncClosure[k] >= 3) {
    try {
      await sqmApi.closeAuditNc(n.id, '合格', '连续 3 批合格 + SQE 确认闭环（SR-SQA-018）')
      ElMessage.success(`${n.id} 连续 3 批合格 + SQE 确认，已闭环（SR-SQA-018）`)
    } catch (e) {
      // 错误已由 request 拦截器统一提示
    }
    await loadData()
  } else {
    ElMessage.success(`${n.id} 第 ${ncClosure[k]} 批合格（${ncClosure[k]}/3），需 SQE 确认签字`)
  }
}

// ---- 新增审核计划 ----
const dialog = ref(false)
const schema = [
  { prop: 'supName', label: '供应商', type: 'input', required: true },
  { prop: 'type', label: '审核类型', type: 'select', options: [
    { label: '物料变更审核', value: '物料变更审核' }, { label: '资质审核', value: '资质审核' },
    { label: '年度审核', value: '年度审核' }, { label: '季度审核', value: '季度审核' },
    { label: '来料异常审核', value: '来料异常审核' }, { label: '临时审核', value: '临时审核' },
    { label: '重大来料异常审核', value: '重大来料异常审核' }, { label: '供应商准入审核', value: '供应商准入审核' },
    { label: '年度复审', value: '年度复审' }, { label: '过程审核', value: '过程审核' },
    { label: '专项审核', value: '专项审核' }, { label: '飞行检查', value: '飞行检查' },
    { label: '初次审核', value: '初次审核' },
    { label: '附加审核', value: '附加审核' }, { label: '重新审核', value: '重新审核' },
  ] },
  { prop: 'planDate', label: '计划日期', type: 'date', required: true },
  { prop: 'auditor', label: '审核员', type: 'input', required: true },
  { prop: 'scope', label: '审核范围', type: 'textarea' },
]
const model = ref<Record<string, unknown>>({})
function openAdd() { model.value = {}; dialog.value = true }
async function onSubmit(v: Record<string, unknown>) {
  const supName = (v.supName as string) || ''
  const s = Object.values(supplierMap.value).find((x) => x.name === supName)
  if (!s) {
    ElMessage.warning('未找到匹配的供应商，请先在供应商列表中维护该供应商')
    return
  }
  try {
    await sqmApi.createAuditPlan({
      supplierId: s.id,
      auditType: v.type as string,
      planDate: v.planDate as string,
      auditLead: v.auditor as string,
      scope: (v.scope as string) || undefined,
      status: '待执行',
    })
    dialog.value = false
    ElMessage.success('审核计划已创建')
    await loadData()
    // 关键修复：清掉下钻 query,避免 tryOpenFromQuery 被 watch 再次触发 → 弹窗反复出现
    if (route.query.supId || route.query.supName || route.query.from) {
      router.replace({ path: route.path, query: { ...route.query, supId: undefined, supName: undefined, from: undefined } })
    }
  } catch (e) {
    // 错误已由 request 拦截器统一提示
  }
}

// ---- 日历视图（对齐 HTML switchAuditView 的 calendar + scatter） ----
const calRef = ref<HTMLDivElement>()
let calInst: echarts.ECharts | null = null

/** 仅取日期部分 yyyy-MM-dd（兼容后端可能返回 yyyy-MM-dd HH:mm:ss） */
function dayOf(d: string): string { return (d || '').slice(0, 10) }

/** 根据真实数据动态计算日历区间：取计划日期涵盖的最小~最大月份；无数据则回退到当前月 */
function computeRange(): string[] {
  const months = plans.value
    .map((p) => dayOf(p.planDate).slice(0, 7))
    .filter((m) => /^\d{4}-\d{2}$/.test(m))
  const uniq = [...new Set(months)].sort()
  if (!uniq.length) {
    const now = new Date()
    return [`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`]
  }
  return uniq.length === 1 ? [uniq[0]] : [uniq[0], uniq[uniq.length - 1]]
}

/** 标题随区间动态生成 */
const calTitle = computed(() => {
  const r = computeRange()
  if (r.length === 1) {
    const [y, m] = r[0].split('-')
    return `${y}年${Number(m)}月审核日历`
  }
  const [a, b] = r
  return `${a} ~ ${b} 审核日历`
})

function renderCalendar() {
  if (!calRef.value) return
  if (!calInst) calInst = echarts.init(calRef.value)
  const range = computeRange()
  // 同一天多个计划聚合，tooltip 展示明细
  const byDate = new Map<string, AuditPlan[]>()
  plans.value.forEach((p) => {
    const d = dayOf(p.planDate)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return
    if (!byDate.has(d)) byDate.set(d, [])
    byDate.get(d)!.push(p)
  })
  const data = [...byDate.entries()].map(([date, list]) => ({ value: [date, list.length], plans: list }))
  const maxCnt = Math.max(1, ...data.map((d) => d.value[1]))
  calInst.setOption({
    tooltip: {
      formatter: (p: any) => {
        const list: AuditPlan[] = p.data?.plans || []
        if (!list.length) return p.data?.value?.[0] ?? ''
        return list.map((x) => `${x.id} · ${x.supName} · ${x.type}（${x.status}）`).join('<br/>')
      },
    },
    visualMap: { min: 0, max: maxCnt, show: false, inRange: { color: ['#e8f0fe', '#1e4d8b'] } },
    calendar: {
      top: 44, left: 30, right: 20, cellSize: ['auto', 30], range,
      itemStyle: { borderWidth: 0.5, borderColor: '#e5e7eb' },
      yearLabel: { show: range.length === 1 },
      monthLabel: { show: true },
      dayLabel: { firstDay: 1, nameMap: 'cn' },
    },
    series: [{
      type: 'scatter', coordinateSystem: 'calendar',
      data, symbolSize: (val: number[]) => 8 + (val[1] || 1) * 6,
      itemStyle: { color: '#f59e0b' },
    }],
  }, true)
  calInst.resize()
}
// 视图切换或数据加载完成后，若在日历视图则重渲染
watch([view, plans], () => { if (view.value === 'calendar') nextTick(renderCalendar) })
onMounted(() => { if (view.value === 'calendar') nextTick(renderCalendar) })
onBeforeUnmount(() => { calInst?.dispose(); calInst = null })
</script>

<template>
  <div class="sqm-audit">
    <div class="qms-banner">
      <div class="qms-banner__icon" :style="{ background: authStore.currentRole?.color }">🔍</div>
      <div>
        <div class="qms-banner__title">{{ banner.title }}</div>
        <div class="qms-banner__desc">{{ banner.desc }}</div>
      </div>
    </div>

    <!-- 供应商准入申请审批（预选目标状态） -->
    <div class="qms-card" style="border-color:#f5d6a8">
      <div class="qms-card__header">
        <h3>🔔 待审批的供应商准入申请</h3>
        <span class="qms-pill" :class="pendingApplies.length ? 'y' : 'gray'">{{ pendingApplies.length }} 条</span>
      </div>
      <div class="qms-card__body" style="padding:0">
        <table v-if="pendingApplies.length" class="tbl">
          <thead><tr><th>供应商</th><th>编码</th><th>类别</th><th>联系人</th><th>资质</th><th>预选目标状态</th><th>操作</th></tr></thead>
          <tbody>
            <tr v-for="s in pendingApplies" :key="s.id">
              <td><strong>{{ s.name }}</strong></td>
              <td>{{ s.code }}</td>
              <td>{{ s.category }}</td>
              <td>{{ s.contact }} / {{ s.tel }}</td>
              <td>{{ (s.qualifications || []).length }} 项</td>
              <td>
                <el-select v-model="approveTarget[s.id]" size="small" style="width:130px" @click.stop>
                  <el-option label="合格（正式合作）" value="合格" />
                  <el-option label="观察（观察期）" value="观察" />
                  <el-option label="整改中" value="整改中" />
                </el-select>
              </td>
              <td>
                <el-button type="success" size="small" @click="approveApply(s)">通过</el-button>
                <el-button type="danger" size="small" plain @click="rejectApply(s)">拒绝</el-button>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-else style="padding:24px;text-align:center;color:#9ca3af;font-size:13px">
          暂无待审批的供应商准入申请。请先在「供应商全生命周期」页发起准入申请。
        </div>
      </div>
      <div style="padding:8px 14px;font-size:12px;color:#6b7785;background:#fffbe6;border-radius:0 0 10px 10px">
        提示：审批通过后供应商将进入所选目标状态，后续可在「供应商全生命周期」页进行状态升级。
      </div>
    </div>

    <!-- 工具栏：列表/日历切换 + 筛选 + 搜索 + 新增 -->
    <div class="toolbar">
      <div class="seg">
        <button :class="{ on: view === 'list' }" @click="view = 'list'">列表视图</button>
        <button :class="{ on: view === 'calendar' }" @click="view = 'calendar'">日历视图</button>
      </div>
      <span class="sp"></span>
      <select v-model="fType" class="qms-select">
        <option value="">全部类型</option>
        <option>物料变更审核</option><option>资质审核</option><option>年度审核</option><option>季度审核</option>
        <option>来料异常审核</option><option>临时审核</option><option>重大来料异常审核</option><option>供应商准入审核</option>
        <option>年度复审</option><option>过程审核</option><option>专项审核</option><option>飞行检查</option>
      </select>
      <select v-model="fStatus" class="qms-select">
        <option value="">全部状态</option>
        <option>计划中</option><option>待执行</option><option>进行中</option><option>已完成</option>
      </select>
      <input v-model="fSearch" type="text" class="qms-input" placeholder="搜索供应商..." />
      <button v-if="canAdd" class="btn pri" @click="openAdd">+ 新增审核计划</button>
    </div>

    <!-- 列表视图：审核计划 -->
    <div v-show="view === 'list'" class="qms-card">
      <div class="qms-card__header">
        <h3>审核计划</h3></div>
      <div class="qms-card__body" style="padding: 0">
        <el-table :data="filteredPlans" border size="small">
          <el-table-column prop="id" label="计划号" width="120" />
          <el-table-column prop="supName" label="供应商" />
          <el-table-column prop="type" label="审核类型" width="110" />
          <el-table-column prop="planDate" label="计划日期" width="110" />
          <el-table-column prop="auditor" label="审核员" width="140" />
          <el-table-column prop="scope" label="审核范围" />
          <el-table-column label="状态" width="90">
            <template #default="{ row }"><span class="qms-pill" :class="statusClass(row.status)">{{ row.status }}</span></template>
          </el-table-column>
          <el-table-column label="操作" width="270" fixed="right">
            <template #default="{ row }">
              <el-button v-if="row.status === '计划中'" link type="warning" size="small" @click="confirmPlan(row)">确认排期</el-button>
              <el-button v-if="row.status === '待执行'" link type="primary" size="small" @click="startAudit(row)">开始</el-button>
              <el-button v-if="row.status === '进行中'" link type="success" size="small" @click="openExec(row)">执行审核</el-button>
              <el-button link type="primary" size="small" @click="detailPlan(row)">详情</el-button>
              <el-button link type="warning" size="small" @click="openLifecycle(row)">审核时间线</el-button>
              <el-button link size="small" @click="goSupplierProfile(row.supId)">供应商档案</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <!-- 日历视图 -->
    <div v-show="view === 'calendar'" class="qms-card">
      <div class="qms-card__header">
        <h3>{{ calTitle }}</h3></div>
      <div class="qms-card__body">
        <div ref="calRef" class="audit-calendar"></div>
        <div v-if="!plans.length" class="cal-empty">暂无审核计划数据</div>
      </div>
    </div>

    <!-- 审核记录（始终可见，对齐 HTML 审核记录表） -->
    <div class="qms-card">
      <div class="qms-card__header">
        <h3>审核记录</h3></div>
      <div class="qms-card__body" style="padding: 0">
        <el-table :data="records" border size="small">
          <el-table-column prop="id" label="记录号" width="130" />
          <el-table-column prop="supName" label="供应商" />
          <el-table-column prop="type" label="审核类型" width="110" />
          <el-table-column prop="date" label="审核日期" width="110" />
          <el-table-column prop="auditor" label="审核员" width="140" />
          <el-table-column label="结果" width="110">
            <template #default="{ row }"><span class="qms-pill" :class="resultClass(row.result)">{{ row.result }}</span></template>
          </el-table-column>
          <el-table-column label="得分" width="70"><template #default="{ row }"><strong>{{ row.score }}</strong></template></el-table-column>
          <el-table-column prop="ncCount" label="不符合项" width="80" />
          <el-table-column label="状态" width="90">
            <template #default="{ row }"><span class="qms-pill" :class="statusClass(row.status)">{{ row.status }}</span></template>
          </el-table-column>
          <el-table-column label="操作" width="90" fixed="right">
            <template #default="{ row }"><el-button link type="primary" size="small" @click="viewRecord(row)">查看报告</el-button></template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <!-- 不符合项跟踪（始终可见，对齐 HTML 不符合项跟踪） -->
    <div class="qms-card">
      <div class="qms-card__header">
        <h3>不符合项跟踪</h3></div>
      <div class="qms-card__body">
        <div class="filter-bar" style="margin-bottom: 10px">
          <select v-model="fNcLevel" class="qms-select">
            <option value="">全部级别</option><option>严重</option><option>一般</option><option>观察项</option>
          </select>
          <select v-model="fNcStatus" class="qms-select">
            <option value="">全部状态</option><option>整改中</option><option>已整改待验证</option><option>已关闭</option>
          </select>
        </div>
        <el-table :data="filteredNc" border size="small">
          <el-table-column prop="id" label="NC编号" width="130" />
          <el-table-column prop="arId" label="关联审核" width="120" />
          <el-table-column prop="supName" label="供应商" />
          <el-table-column prop="desc" label="不符合描述" min-width="200" />
          <el-table-column prop="clause" label="条款" width="80" />
          <el-table-column label="级别" width="80">
            <template #default="{ row }"><span class="qms-pill" :class="levelClass(row.level)">{{ row.level }}</span></template>
          </el-table-column>
          <el-table-column prop="responsible" label="责任人" width="90" />
          <el-table-column prop="deadline" label="截止日期" width="110" />
          <el-table-column label="状态" width="100">
            <template #default="{ row }"><span class="qms-pill" :class="statusClass(row.status)">{{ row.status }}</span></template>
          </el-table-column>
          <el-table-column label="操作" width="170" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" size="small" @click="trackNc(row)">异常整改</el-button>
              <el-button v-if="row.status === '已整改待验证'" link type="success" size="small" @click="passNcBatch(row)">合格批({{ ncClosure[row.id] || 0 }}/3)</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <!-- 执行审核弹窗（SR-SQA-007 检查表 / SR-SQA-009 不符合项分级 / SR-SQA-021 结论建议） -->
    <el-dialog v-model="execVisible" :title="`执行审核 · ${execTarget?.supName || ''}`" width="720px">
      <template v-if="execTarget">
        <div class="kv-box">
          <div><b>审核计划：</b>{{ execTarget.id }} · {{ execTarget.type }} · 范围：{{ execTarget.scope }}</div>
          <div><b>审核员：</b>{{ execTarget.auditor }} · <b>计划日期：</b>{{ execTarget.planDate }}</div>
        </div>

        <h4 style="margin:14px 0 8px">审核检查表（ISO 13485 / GMP 条款）</h4>
        <table class="tbl" style="margin-bottom: 6px">
          <thead><tr><th>条款</th><th>判定</th><th>备注</th></tr></thead>
          <tbody>
            <tr v-for="(c, i) in checklist" :key="i">
              <td>{{ c.clause }}</td>
              <td>
                <select v-model="c.judge" class="qms-select" style="height:30px">
                  <option value="">—</option><option>符合</option><option>不符合</option><option>不适用</option>
                </select>
              </td>
              <td><input v-model="c.note" type="text" class="qms-input" style="min-width:auto;height:30px" placeholder="备注..." /></td>
            </tr>
          </tbody>
        </table>

        <h4 style="margin:14px 0 8px">不符合项录入与分级（SR-SQA-009 / SR-SQA-010）</h4>
        <div class="nc-form">
          <select v-model="newNc.level" class="qms-select" style="height:30px">
            <option>严重</option><option>一般</option><option>观察项</option>
          </select>
          <input v-model="newNc.clause" type="text" class="qms-input" style="min-width:120px;height:30px" placeholder="条款编号" />
          <input v-model="newNc.desc" type="text" class="qms-input" style="flex:1;height:30px" placeholder="不符合描述" />
          <button class="btn sm" @click="addNc">添加</button>
        </div>
        <div v-if="newNc.level === '严重'" class="contain-row">
          <span class="qms-pill r">严重</span>
          <input v-model="newNc.contain" type="text" class="qms-input" style="flex:1;height:30px" placeholder="必填：即时遏制措施（SR-SQA-009）" />
        </div>
        <div v-if="execNcs.length" class="nc-list">
          <div v-for="(n, i) in execNcs" :key="i" class="nc-item">
            <span class="qms-pill" :class="levelClass(n.level)">{{ n.level }}</span>
            <span class="meta">{{ n.clause }}</span> {{ n.desc }}
            <span v-if="n.contain" class="contain">遏制：{{ n.contain }}</span>
          </div>
        </div>

        <div class="conclusion">
          <span class="lbl">系统自动建议结论（SR-SQA-021）：</span>
          <span class="qms-pill" :class="conclusionSuggestion().cls">{{ conclusionSuggestion().txt }}</span>
          <span class="meta" style="margin-left:8px">严重=不通过 / 一般>5=不通过 / 一般&无严重=有条件通过 / 无不符合=推荐通过</span>
        </div>
        <div class="note" style="margin-top:8px">提交后系统双通道（系统通知+邮件）推送整改，期限按分级：严重15天 / 一般30天 / 观察项无期限（SR-SQA-013）。</div>
      </template>
      <template #footer>
        <button class="btn pri" @click="submitExec">提交审核（生成报告）</button>
        <button class="btn ghost" @click="execVisible = false">取消</button>
      </template>
    </el-dialog>

    <el-dialog v-model="dialog" title="新增审核计划" width="520px">
      <SchemaForm :schema="schema" :model-value="model" @submit="onSubmit" />
    </el-dialog>

    <!-- 审核计划详情（从总览看板「查看」下钻） -->
    <el-dialog v-model="detailVisible" :title="`审核计划详情 · ${detailTarget?.id || ''}`" width="520px">
      <template v-if="detailTarget">
        <div class="kv-box">
          <div><b>供应商：</b>{{ detailTarget.supName }}</div>
          <div><b>审核类型：</b>{{ detailTarget.type }}</div>
          <div><b>审核范围：</b>{{ detailTarget.scope }}</div>
          <div><b>审核员：</b>{{ detailTarget.auditor }}</div>
          <div><b>计划日期：</b>{{ detailTarget.planDate }}</div>
          <div><b>状态：</b><span class="qms-pill" :class="statusClass(detailTarget.status)">{{ detailTarget.status }}</span></div>
        </div>
      </template>
      <template #footer>
        <button class="btn ghost" @click="detailVisible = false">关闭</button>
      </template>
    </el-dialog>

    <!-- 审核记录报告详情 -->
    <el-dialog v-model="recordVisible" :title="`审核报告 · ${recordTarget?.id || ''}`" width="560px">
      <template v-if="recordTarget">
        <div class="kv-box">
          <div><b>记录编号：</b>{{ recordTarget.id }}</div>
          <div><b>供应商：</b>{{ recordTarget.supName }}</div>
          <div><b>审核类型：</b>{{ recordTarget.type }}</div>
          <div><b>审核日期：</b>{{ recordTarget.date }}</div>
          <div><b>审核员：</b>{{ recordTarget.auditor }}</div>
          <div><b>审核结论：</b><span class="qms-pill" :class="resultClass(recordTarget.result)">{{ recordTarget.result }}</span></div>
          <div><b>得分：</b><strong>{{ recordTarget.score }}</strong></div>
          <div><b>不符合项数：</b>{{ recordTarget.ncCount }}</div>
          <div><b>状态：</b><span class="qms-pill" :class="statusClass(recordTarget.status)">{{ recordTarget.status }}</span></div>
        </div>
      </template>
      <template #footer>
        <button class="btn ghost" @click="recordVisible = false">关闭</button>
      </template>
    </el-dialog>

    <!-- 审核计划自身生命周期时间线 -->
    <el-dialog v-model="lifecycleVisible" :title="`审核计划时间线 · ${lifecycleTarget?.id || ''}`" width="560px">
      <template v-if="lifecycleTarget">
        <div class="kv-box" style="margin-bottom:16px">
          <div><b>供应商：</b>{{ lifecycleTarget.supName }}</div>
          <div><b>审核类型：</b>{{ lifecycleTarget.type }} · <b>状态：</b><span class="qms-pill" :class="statusClass(lifecycleTarget.status)">{{ lifecycleTarget.status }}</span></div>
        </div>
        <div class="timeline">
          <div v-for="(item, i) in lifecycleTimeline" :key="i" class="tl-item" :class="{ 'tl-last': i === lifecycleTimeline.length - 1 }">
            <div class="tl-dot" :class="item.cls"></div>
            <div class="tl-content">
              <div class="tl-head">
                <span class="tl-label">{{ item.label }}</span>
                <span class="tl-time">{{ item.time }}</span>
              </div>
              <div class="tl-desc">{{ item.desc }}</div>
            </div>
          </div>
        </div>
        <div v-if="!lifecycleTimeline.length" style="text-align:center;color:#9ca3af;padding:24px">暂无时间线数据</div>
      </template>
      <template #footer>
        <button class="btn ghost" @click="lifecycleVisible = false">关闭</button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.sqm-audit { display: flex; flex-direction: column; gap: 14px; }

.toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;

  .sp { flex: 1 1 auto; }
}

.audit-calendar { width: 100%; height: 220px; }
.cal-empty { margin-top: 8px; color: #9ca3af; font-size: 13px; text-align: center; }

.kv-box { background: #f8fafc; border: 1px solid #eef2f7; border-radius: 8px; padding: 10px 12px; font-size: 13px; line-height: 1.8; margin-bottom: 6px; }
.nc-form { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
.contain-row { display: flex; gap: 8px; align-items: center; margin-top: 8px; }
.nc-list { margin-top: 10px; display: flex; flex-direction: column; gap: 6px; }
.nc-item { background: #fafbfc; border: 1px solid #e5e7eb; border-radius: 6px; padding: 6px 10px; font-size: 13px; }
.nc-item .contain { display: inline-block; margin-left: 8px; color: #c0392b; font-size: 12px; }
.conclusion { margin-top: 12px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; .lbl { font-weight: 600; font-size: 13px; } }

/* 审核计划时间线 */
.timeline { position: relative; padding-left: 28px; }
.timeline::before { content: ''; position: absolute; left: 8px; top: 4px; bottom: 0; width: 2px; background: #e5e7eb; }
.tl-item { position: relative; padding-bottom: 18px; }
.tl-item.tl-last { padding-bottom: 0; }
.tl-dot {
  position: absolute; left: -22px; top: 3px; width: 10px; height: 10px; border-radius: 50%;
  border: 2px solid #d1d5db; background: #fff; z-index: 1;
  &.g  { border-color: #10b981; background: #d1fae5; }
  &.b  { border-color: #3b82f6; background: #dbeafe; }
  &.y  { border-color: #f59e0b; background: #fef3c7; }
  &.r  { border-color: #ef4444; background: #fee2e2; }
  &.gray { border-color: #9ca3af; background: #f3f4f6; }
}
.tl-content { font-size: 13px; }
.tl-head { display: flex; align-items: center; gap: 10px; margin-bottom: 2px; }
.tl-label { font-weight: 600; color: #1f2937; }
.tl-time { font-size: 12px; color: #9ca3af; }
.tl-desc { color: #6b7280; font-size: 12px; line-height: 1.5; }
.note { font-size: 12px; color: #6b7785; line-height: 1.6; background: #f7f9fc; border-left: 3px solid #1e4d8b; padding: 8px 12px; border-radius: 6px; }
.btn {
  border: 1px solid #e1e8f0; background: #fff; border-radius: 6px; padding: 4px 10px; font-size: 12px; cursor: pointer; transition: 0.15s;
  &.sm { padding: 3px 8px; }
  &.pri { background: #1e4d8b; border-color: #1e4d8b; color: #fff; }
  &.ghost { background: #fff; color: #5a6b7e; }
  &:hover { filter: brightness(0.96); }
}
.tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
.tbl th, .tbl td { border-bottom: 1px solid #eef2f7; padding: 8px 10px; text-align: left; }
.tbl th { background: #f7f9fc; color: #5a6b7e; font-weight: 600; }
</style>
