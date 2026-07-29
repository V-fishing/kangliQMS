<script setup lang="ts">
/**
 * 4.3 物料变更管理 —— §10 物料变更审批全流程实现
 * 流程:变更发生 → 感知 → 生成变更单(D) → E冻结收货 → F评估资料上传 → G FMEA风险评估
 *      → H风险分级(+高风险强制小批试产) → I/J审批分支 → K并行会签(质量/采购/研发,质量一票否决)
 *      → L质量否决/M拒绝/N批准 → O更新检验标准/SOP → P通知部门 → Q解冻
 *      → R加严检验/S连续3批合格自动判定 → T恢复正常/U回滚变更+退货重评
 * 特殊要求:并行会签(质量/采购/研发)复用「首件检验(FIA)电子签名配置」(密码/手写/CA × 两级/三级 × 整单/逐项,可配置)。
 */
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { useChangeExtStore } from '@/stores/changeExt'
import type { RoleId } from '@/mock/roles'
import { BANNERS } from '@/config/banners'
import { sqmApi, fiaApi, mapSuppliers } from '@/api'
import type {
  ChangeOrder, ChangeApproval, ChangeApprovalNode, ChangeDoc, ChangeDetail,
  StrictInspect, Supplier, ChangeRiskLevel,
} from '@/types/sqm'

const authStore = useAuthStore()
const extStore = useChangeExtStore()
const myDept = computed(() => authStore.currentRole?.label || '')
// 修正:authStore 属性为 userName(非 username)
const userName = computed(() => authStore.userName || myDept.value || '系统')

// 角色门控
const canApply = (['sqe', 'qmanager', 'supplier', 'sysadmin'] as RoleId[]).includes(authStore.role) || true
function canApproveRow(o: ChangeOrder) {
  // 演示阶段放开: 检验员(inspector)亦可进入并行会签审批
  return o.status === '审批中' && (['inspector', 'qmanager', 'shiftleader', 'sysadmin'] as RoleId[]).includes(authStore.role)
}

// ----- 数据源 -----
const changeOrders = ref<ChangeOrder[]>([])
const suppliers = ref<Supplier[]>([])
const changeDocs = ref<Record<string, ChangeDoc>>({})
const changeApprovals = ref<Record<string, ChangeApproval>>({})
const changeDetails = ref<Record<string, ChangeDetail>>({})
const strictInspect = ref<StrictInspect[]>([])

interface SopUpdate {
  changeId: string; file: string; version: string; content: string
  publishDate: string; status: '已发布' | '待更新'; notified: string[]
  unfreeze: string; aqlUpgrade: string
}
const sopUpdates = ref<SopUpdate[]>([])

// ----- banner(动态数据) -----
const banner = computed(() => {
  const total = changeOrders.value.length
  const done = changeOrders.value.filter((o) => o.status === '已关闭' || o.status === '已执行').length
  const frozen = changeOrders.value.filter((o) => extStore.get(o.id).frozen).length
  if (total === 0) return BANNERS.sqm?.[authStore.role] || { title: 'SQM · 物料变更', desc: '供应商物料/工艺变更管理与审批' }
  const desc = `共 ${total} 个变更单,已完成 ${done} 个,加严检验批次 ${strictInspect.value.length} 条`
  return { title: '供应商物料变更管理', desc: frozen > 0 ? `${desc} · ⚠ ${frozen} 个变更单处于收货冻结中` : desc }
})

// ----- 筛选 -----
const fStatus = ref('')
const fType = ref('')
const fSearch = ref('')
const filteredOrders = computed(() => {
  const k = fStatus.value
  const t = fType.value
  const s = fSearch.value.trim().toLowerCase()
  return changeOrders.value.filter((o) => {
    if (k && o.status !== k) return false
    if (t && o.type !== t) return false
    if (s && !(`${o.title} ${o.partNo} ${o.id}`.toLowerCase().includes(s))) return false
    return true
  })
})

// ========== 数据加载 ==========
async function loadData() {
  try {
    const [supList, orderList, docsMap, apprMap, detailMap, strictList] = await Promise.all([
      sqmApi.getSuppliers(),
      sqmApi.getChangeOrders(),
      sqmApi.getChangeDocs(),
      sqmApi.getChangeApprovals(),
      sqmApi.getChangeDetails(),
      sqmApi.getStrictInspects(),
    ])
    suppliers.value = supList
    const supMap = mapSuppliers(supList)
    changeOrders.value = orderList.map((o) => ({ ...o, supName: o.supName || supMap[o.supId]?.name || o.supId }))
    changeDocs.value = docsMap
    changeApprovals.value = apprMap
    changeDetails.value = detailMap
    strictInspect.value = strictList

    const doneOrders = orderList.filter((o) =>
      o.status === '已批准' || o.status === '已执行' || o.status === '已关闭')
    sopUpdates.value = doneOrders.map((o, i) => ({
      changeId: o.id,
      file: `SOP-${o.partNo || o.id.slice(-6)}`,
      version: `v${i + 1}.0`,
      content: `变更类型:${o.type} · 原因:${o.reason || '—'} · 紧急度:${o.urgency}`,
      publishDate: o.applyDate || '',
      status: (o.status === '已关闭' ? '已发布' : '待更新') as '已发布' | '待更新',
      notified: o.status === '已关闭' ? ['质量部', '采购部', '生产部', '仓储部'] : [],
      unfreeze: o.status === '已关闭' ? '变更已关闭,已解冻该物料收货' : '变更尚未关闭,仍冻结收货',
      aqlUpgrade: o.strictFlag ? '执行连续3批加严检验,AQL提一级' : '无加严检验计划',
    }))
  } catch (e) {
    console.error('加载物料变更数据失败', e)
  }
}
onMounted(async () => {
  await loadData()
  // 加载 FIA 电子签名配置(并行会签复用)
  try {
    signConfig.value = await fiaApi.getSignConfig()
  } catch {
    signConfig.value = null
  }
})

// ----- 药丸配色 -----
function statusPill(s: ChangeOrder['status']): string {
  return { 待申请: 'y', 审批中: 'b', 已批准: 'g', 已执行: 'g', 已关闭: 'gray', 已驳回: 'r' }[s] || 'gray'
}
function urgencyPill(u: ChangeOrder['urgency']): string {
  return u === '高' ? 'r' : u === '中' ? 'y' : 'g'
}
function riskPill(r: ChangeRiskLevel): string {
  return r === '高' ? 'r' : r === '中' ? 'y' : r === '低' ? 'g' : 'gray'
}

// 审批数据防御性封装:保证 quality/purchase/rd/trial 节点始终存在,避免 undefined 访问崩溃
function emptyNode(): ChangeApprovalNode {
  return { status: 'pending', operator: '', date: undefined, note: undefined }
}
function emptyApproval(): ChangeApproval {
  return { quality: emptyNode(), purchase: emptyNode(), rd: emptyNode(), trial: { status: 'pending', operator: '', date: undefined } }
}
function safeApproval(a?: ChangeApproval): ChangeApproval {
  if (!a) return emptyApproval()
  return {
    quality: a.quality ?? emptyNode(),
    purchase: a.purchase ?? emptyNode(),
    rd: a.rd ?? emptyNode(),
    trial: a.trial ?? { status: 'pending', operator: '', date: undefined },
  }
}

// 并行审批汇总状态
function apprStatus(o: ChangeOrder): { cls: string; text: string } {
  const appr = changeApprovals.value[o.id]
  if (appr) {
    const a = safeApproval(appr)
    const done = (a.quality.status === 'done' ? 1 : 0) + (a.purchase.status === 'done' ? 1 : 0) + (a.rd.status === 'done' ? 1 : 0)
    if (done === 3) return { cls: 'g', text: '三方通过' }
    if (done > 0) return { cls: 'y', text: `并行中 ${done}/3` }
    return { cls: 'gray', text: '待启动' }
  }
  if (o.status === '已关闭' || o.status === '已执行') return { cls: 'g', text: '已完成' }
  return { cls: 'gray', text: '—' }
}



function changeDoc(id: string): ChangeDoc {
  return changeDocs.value[id] || { changeNote: false, verifyReport: false, fmea: false }
}
// 评估资料图标:后端推导 + 扩展 store 上传附件叠加
function docState(id: string) {
  const base = changeDoc(id)
  const ext = extStore.get(id)
  return {
    changeNote: base.changeNote || ext.changeNote,
    verifyReport: base.verifyReport || ext.verifyReport,
    fmea: base.fmea || ext.fmeaDone,
    files: ext.files.length,
  }
}

// 自动触发规则
const triggerRules = [
  { icon: '📤', title: '供应商门户提报变更', desc: '供应商通过门户主动提交PCN/ECN变更申请,系统自动生成变更单号' },
  { icon: '🔍', title: '物料主数据字段变更自动检测', desc: '系统自动监控物料规格、材质、供应商等关键字段变更,触发评估流程' },
  { icon: '🚫', title: '变更未关闭前冻结收货', desc: '关联物料在变更流程未关闭前,系统自动拦截来料收货并提醒IQC' },
]

// ========== 弹窗: 发起变更 ==========
const applyVisible = ref(false)
const applyForm = reactive({ title: '', supId: '', partNo: '', type: '材料升级', reason: '', urgency: '中', strict: true })
const applyLoading = ref(false)

function openApply() {
  applyForm.title = ''; applyForm.supId = ''; applyForm.partNo = ''; applyForm.type = '材料升级'
  applyForm.reason = ''; applyForm.urgency = '中'; applyForm.strict = true
  applyVisible.value = true
}

async function submitApply() {
  if (!applyForm.title || !applyForm.supId || !applyForm.partNo) {
    ElMessage.warning('请填写变更标题、供应商与物料料号')
    return
  }
  applyLoading.value = true
  try {
    await sqmApi.createChange({
      title: applyForm.title,
      supplierId: applyForm.supId,
      partNo: applyForm.partNo,
      changeType: applyForm.type,
      reason: applyForm.reason,
      applicant: userName.value,
      urgency: applyForm.urgency,
      strictFlag: applyForm.strict,
    })
    applyVisible.value = false
    ElMessage.success('变更申请已创建,可提交评估材料进入审批')
    await loadData()
  } catch (e: any) {
    console.error(e)
    ElMessage.error(e?.response?.data?.msg || e?.message || '创建失败')
  } finally {
    applyLoading.value = false
  }
}

// ========== 弹窗: 提交评估资料(F) ==========
const evalVisible = ref(false)
const evalId = ref('')
const evalForm = reactive({ changeNote: true, verifyReport: true })
const evalFiles = ref<{ name: string; size: number; uploadedAt: string }[]>([])
function onEvalFile(e: Event) {
  const input = e.target as HTMLInputElement
  if (!input.files) return
  for (const f of Array.from(input.files)) {
    evalFiles.value.push({ name: f.name, size: f.size, uploadedAt: new Date().toISOString().slice(0, 19).replace('T', ' ') })
  }
}
function openEval(id: string) {
  evalId.value = id
  const ext = extStore.get(id)
  evalForm.changeNote = ext.changeNote || true
  evalForm.verifyReport = ext.verifyReport || true
  evalFiles.value = [...ext.files]
  evalVisible.value = true
}
async function submitEval() {
  extStore.patch(evalId.value, {
    files: evalFiles.value,
    changeNote: evalForm.changeNote,
    verifyReport: evalForm.verifyReport,
    frozen: true, // E 冻结收货拦截
  })
  extStore.pushLog(evalId.value, `提交变更评估资料(F),共 ${evalFiles.value.length} 个附件;冻结该物料收货(E)`)
  evalVisible.value = false
  ElMessage.success('评估资料已提交,变更单冻结收货并进入审批流程')
  await submitForApproval(evalId.value)
}

// 提交评估材料(将"待申请"的变更单提交,进入审批流程)
async function submitForApproval(id: string) {
  try {
    await sqmApi.submitChange(id)
    ElMessage.success('评估材料已提交,进入审批流程')
    await loadData()
  } catch (e: any) {
    console.error(e)
    ElMessage.error(e?.response?.data?.msg || e?.message || '提交失败')
  }
}

// ========== 弹窗: 变更详情 ==========
const detailVisible = ref(false)
const detailData = ref<{
  order: ChangeOrder; doc: ChangeDoc; appr?: ChangeApproval; detail: ChangeDetail
} | null>(null)

function openDetail(id: string) {
  const o = changeOrders.value.find((c) => c.id === id)
  if (!o) return
  detailData.value = {
    order: o,
    doc: changeDoc(id),
    appr: changeApprovals.value[id] ? safeApproval(changeApprovals.value[id]) : undefined,
    detail: changeDetails.value[id] || ({ impact: '', strictPlan: '' } as ChangeDetail),
  }
  detailVisible.value = true
}

// ========== 弹窗: 会签审批(复用 FIA 电子签名配置) ==========
const approveVisible = ref(false)
const approveData = ref<ChangeOrder | null>(null)
const approveOpinion = ref('')
const approveTargetStatus = ref('合格')
const approveLoading = ref(false)

// ---- FIA 电子签名配置(复用首件检验录入) ----
const signConfig = ref<any>(null)
interface SigMethod { key: string; label: string }
function normMethods(arr?: string[]): SigMethod[] {
  const raw = arr && arr.length ? arr : ['password']
  const map: Record<string, SigMethod> = {
    password: { key: 'password', label: '用户名+密码' },
    密码: { key: 'password', label: '用户名+密码' },
    handwriting: { key: 'handwriting', label: '手写笔迹' },
    手写: { key: 'handwriting', label: '手写笔迹' },
    ca: { key: 'ca', label: 'CA证书(21 CFR Part 11)' },
    CA: { key: 'ca', label: 'CA证书(21 CFR Part 11)' },
  }
  const out = raw.map((r) => map[r] || { key: r, label: r })
  const seen = new Set<string>()
  const dedup = out.filter((m) => (seen.has(m.key) ? false : (seen.add(m.key), true)))
  return dedup.length ? dedup : [{ key: 'password', label: '用户名+密码' }]
}
// 并行会签三角色(与后端 pre-build 的 quality/purchase/rd 对齐)
const coSignRoles = ['quality', 'purchase', 'rd'] as const
const roleLabelMap: Record<string, string> = { quality: '质量部', purchase: '采购部', rd: '研发部' }
const signMethods = computed(() => normMethods(signConfig.value?.signMethods))
const isThreeLevel = computed(() => (signConfig.value?.signNodes || '两级') === '三级')
const signGranularity = computed(() => signConfig.value?.signGranularity || '整单签名')
const signMethodLabel = computed(() => signMethods.value.map((m) => m.label).join(' / ') || '用户名+密码')
// 每个会签角色的电子签名状态(用户名+密码/手写/CA,经后端校验)
interface SignState { signed: boolean; method?: string; ts?: string; signer?: string }
const signerState = reactive<Record<string, SignState>>({})
const signerUser = reactive<Record<string, string>>({})
const signerPwd = reactive<Record<string, string>>({})
const signerCA = reactive<Record<string, string>>({})
// 每个角色当前选用的签名方式(可选范围由 FIA 配置决定,默认用户名+密码)
const signerMethod = reactive<Record<string, string>>({})
// 默认签名方式: 配置含 password 则默认密码,否则取配置的第一种
function defaultMethod(): string {
  const ms = signMethods.value
  return ms.some((m) => m.key === 'password') ? 'password' : (ms[0]?.key || 'password')
}

// 手写笔迹画布
const canvases = ref<Record<string, HTMLCanvasElement | null>>({})
const drawing = ref(false)
const drawn = reactive<Record<string, boolean>>({})
const lastPt = reactive<Record<string, { x: number; y: number }>>({})
function setCanvas(signer: string, el: any) {
  if (el) {
    canvases.value[signer] = el as HTMLCanvasElement
    const ctx = el.getContext('2d')
    if (ctx) { ctx.strokeStyle = '#1f2d3d'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round' }
  }
}
function toCanvas(c: HTMLCanvasElement, e: PointerEvent) {
  const r = c.getBoundingClientRect()
  return { x: (e.clientX - r.left) * (c.width / r.width), y: (e.clientY - r.top) * (c.height / r.height) }
}
function onDown(signer: string, e: PointerEvent) {
  const c = canvases.value[signer]; if (!c) return
  drawing.value = true
  const p = toCanvas(c, e); const ctx = c.getContext('2d')!
  ctx.beginPath(); ctx.moveTo(p.x, p.y); lastPt[signer] = p; drawn[signer] = true
}
function onMove(signer: string, e: PointerEvent) {
  if (!drawing.value || !lastPt[signer]) return
  const c = canvases.value[signer]; if (!c) return
  const ctx = c.getContext('2d')!; const p = toCanvas(c, e)
  ctx.lineTo(p.x, p.y); ctx.stroke(); lastPt[signer] = p
}
function onUp() { drawing.value = false }
function clearSig(signer: string) {
  const c = canvases.value[signer]; if (!c) return
  c.getContext('2d')!.clearRect(0, 0, c.width, c.height); drawn[signer] = false
}
function resetAllSigns() {
  coSignRoles.forEach((r) => {
    signerState[r] = { signed: false }
    signerUser[r] = authStore.userName || ''
    signerPwd[r] = ''
    signerCA[r] = ''
    signerMethod[r] = defaultMethod()
    drawn[r] = false
    clearSig(r)
  })
}

function nowTs(): string {
  return new Date().toISOString().slice(0, 19).replace('T', ' ')
}
// 并行会签单角色电子签名(与首件检验录入相同的验证)
async function doSign(role: string) {
  const method = signerMethod[role] || 'password'
  if (method === 'password') {
    // 用户名+密码: 真实校验(后端 PasswordEncoder 比对)
    const user = (signerUser[role] || '').trim()
    const pwd = signerPwd[role] || ''
    if (!user || !pwd) { ElMessage.warning('请输入签名用户名与密码'); return }
    try {
      await sqmApi.verifySign(approveData.value!.id, role, user, pwd)
      signerState[role] = { signed: true, method: 'password', ts: nowTs(), signer: user }
      ElMessage.success(`${roleLabelMap[role]} 电子签名校验通过`)
    } catch (e: any) {
      ElMessage.error(e?.response?.data?.msg || e?.message || '用户名或密码错误,签名校验失败')
    }
    return
  }
  if (method === 'handwriting') {
    if (!drawn[role]) { ElMessage.warning('请在签名区手写笔迹'); return }
    signerState[role] = { signed: true, method: 'handwriting', ts: nowTs(), signer: signerUser[role] || authStore.userName }
    ElMessage.success(`${roleLabelMap[role]} 手写签名完成`)
    return
  }
  // CA 证书
  const ca = (signerCA[role] || '').trim()
  if (!ca) { ElMessage.warning('请完成 CA 证书验证'); return }
  signerState[role] = { signed: true, method: 'ca', ts: nowTs(), signer: signerUser[role] || authStore.userName }
  ElMessage.success(`${roleLabelMap[role]} CA 证书签名完成`)
}
// 三角色全部完成电子签名 -> 闸门通过(并行会签必须三方都通过)
const signGatePassed = computed(() => coSignRoles.every((r) => signerState[r]?.signed))

async function openApprove(id: string) {
  const o = changeOrders.value.find((c) => c.id === id)
  if (!o) return
  approveData.value = o
  approveOpinion.value = ''
  // 初始化并行会签三角色的签名状态(复用 FIA 电子签名配置)
  coSignRoles.forEach((r) => {
    signerState[r] = { signed: false }
    signerUser[r] = authStore.userName || ''
    signerPwd[r] = ''
    signerCA[r] = ''
    drawn[r] = false
    clearSig(r)
  })
  // 复用首件检验的电子签名配置(两级/三级 × 整单/逐项,方式:密码/手写/CA)
  try {
    signConfig.value = await fiaApi.getSignConfig()
  } catch {
    signConfig.value = null
  }
  // 配置加载完成后,按配置可选范围设定每个角色的默认签名方式(默认密码)
  coSignRoles.forEach((r) => { signerMethod[r] = defaultMethod() })
  approveTargetStatus.value = '合格'
  drawing.value = false
  approveVisible.value = true
  nextTick(() => { drawing.value = true })
}

async function submitApprove(decision: 'approve' | 'reject') {
  if (!approveData.value) return
  // 并行会签: 必须三方(质量/采购/研发)电子签名全部完成后方可提交
  if (decision === 'approve' && !signGatePassed.value) {
    ElMessage.warning('请完成质量/采购/研发三方的电子签名(与首件检验录入相同的用户名+密码验证)后再提交')
    return
  }
  const esign = coSignRoles.map((r) => `${roleLabelMap[r]}:${signerState[r]?.method || '未签'}`).join(' / ')
  const opinion = `${approveOpinion.value || (decision === 'approve' ? '三方会签通过' : '质量否决')} 【电子签名(${isThreeLevel.value ? '三级' : '两级'}/${signGranularity.value}):${esign}】`
  approveLoading.value = true
  try {
    if (decision === 'approve') {
      // 三方会签通过: 依次提交三角色审批,后端汇聚三方后进入「已批准」(进入试产验证生命周期)
      for (const role of coSignRoles) {
        const st = signerState[role]
        await sqmApi.approveChange(approveData.value.id, role, true, opinion)
      }
      // 电子签名落库(按 quality/purchase/rd 区分)
      const cur = extStore.get(approveData.value.id)
      const esigns: Record<string, unknown> = { ...cur.esigns }
      for (const role of coSignRoles) {
        const st = signerState[role]
        if (st) esigns[role] = { method: st.method, signer: st.signer, signedAt: st.ts }
      }
      extStore.patch(approveData.value.id, { esigns })
      if (approveData.value.supId) {
        try {
          await sqmApi.updateSupplier(approveData.value.supId, { id: approveData.value.supId, status: approveTargetStatus.value })
        } catch { /* 非关键操作 */ }
      }
      extStore.pushLog(approveData.value.id, `并行会签(质量/采购/研发)采用 FIA 电子签名完成,结果:批准`)
      ElMessage.success(`三方会签通过,变更已批准,进入试产验证`)
    } else {
      // 驳回: 质量一票否决(quality.hasVeto=true) -> 整单驳回
      await sqmApi.approveChange(approveData.value.id, 'quality', false, opinion)
      extStore.pushLog(approveData.value.id, `并行会签中质量部行使一票否决,结果:驳回`)
      ElMessage.success('变更已驳回(质量一票否决)')
    }
    approveVisible.value = false
    await loadData()
  } catch (e: any) {
    console.error(e)
    ElMessage.error(e?.response?.data?.msg || e?.message || '审批失败')
  } finally {
    approveLoading.value = false
  }
}

// 关闭变更单(解冻 Q)
async function closeChangeOrder(id: string) {
  const ext = extStore.get(id)
  if (ext.riskLevel === '高' && !ext.trialDone) {
    ElMessage.warning('高风险变更须完成小批试产(H)后方可关闭')
    return
  }
  try {
    await sqmApi.closeChange(id)
    extStore.patch(id, { frozen: false })
    extStore.pushLog(id, '变更单关闭,解冻收货(Q)')
    ElMessage.success('变更单已关闭,解冻收货')
    await loadData()
  } catch (e: any) {
    console.error(e)
    ElMessage.error(e?.response?.data?.msg || e?.message || '关闭失败')
  }
}

// ========== FMEA 风险评估(G) ==========
const fmeaVisible = ref(false)
const fmeaId = ref('')
const fmeaRisks = ref<any[]>([])
const fmeaForm = reactive<{ riskLevel: ChangeRiskLevel }>({ riskLevel: '' })
async function openFmea(id: string) {
  fmeaId.value = id
  fmeaForm.riskLevel = extStore.get(id).riskLevel || ''
  try { fmeaRisks.value = await sqmApi.getFmeaRisks() } catch { fmeaRisks.value = [] }
  fmeaVisible.value = true
}
function submitFmea() {
  extStore.patch(fmeaId.value, { fmeaDone: true, riskLevel: fmeaForm.riskLevel })
  const force = fmeaForm.riskLevel === '高' ? ';高风险→强制小批试产(H)' : ''
  extStore.pushLog(fmeaId.value, `完成 FMEA 风险预评估(G),风险等级:${fmeaForm.riskLevel || '未定'}${force}`)
  fmeaVisible.value = false
  ElMessage.success('FMEA 风险评估已记录')
}

// ========== 小批试产(H) ==========
function startTrial(id: string) {
  extStore.patch(id, { trialStarted: true, trialQty: extStore.get(id).trialQty || 200 })
  extStore.pushLog(id, '启动小批试产(H)')
  ElMessage.success('小批试产已启动')
}
function completeTrial(id: string) {
  extStore.patch(id, { trialDone: true })
  extStore.pushLog(id, '小批试产完成(H),可进入批准')
  ElMessage.success('小批试产已完成')
}


// ========== 加严检验批次(R/S) ==========
const inspectVisible = ref(false)
const inspectForm = reactive({
  changeId: '', inspectType: '全检', aqlLevel: 'AQL=0.65',
  lotId: '', result: '待检', inspectDate: '',
})
const inspectLoading = ref(false)

function openInspect(changeId: string) {
  inspectForm.changeId = changeId
  inspectForm.inspectType = '全检'
  inspectForm.aqlLevel = 'AQL=0.65'
  inspectForm.lotId = `LOT-${Date.now()}`
  inspectForm.result = '待检'
  inspectForm.inspectDate = new Date().toISOString().slice(0, 10)
  inspectVisible.value = true
}

async function submitInspect() {
  if (!inspectForm.changeId || !inspectForm.lotId) {
    ElMessage.warning('请填写关联变更单和批次号')
    return
  }
  inspectLoading.value = true
  try {
    await sqmApi.createStrictInspect({
      changeId: inspectForm.changeId,
      inspectType: inspectForm.inspectType,
      aqlLevel: inspectForm.aqlLevel,
      lotId: inspectForm.lotId,
      result: inspectForm.result,
      inspectDate: inspectForm.inspectDate,
    })
    inspectVisible.value = false
    ElMessage.success('加严检验批次已录入(R)')
    await loadData()
    // S 连续3批合格自动判定
    await autoRestoreIfPassed(inspectForm.changeId)
  } catch (e: any) {
    console.error(e)
    ElMessage.error(e?.response?.data?.msg || e?.message || '录入失败')
  } finally {
    inspectLoading.value = false
  }
}

// S:连续3批合格自动恢复常态检验
async function autoRestoreIfPassed(changeId: string) {
  const list = strictInspect.value.filter((s) => s.changeId === changeId)
  const sorted = [...list].sort((a, b) => a.seq - b.seq)
  const last3 = sorted.slice(-3)
  if (last3.length === 3 && last3.every((x) => x.result === '合格') && last3.some((x) => !x.restored)) {
    for (const x of last3) {
      if (!x.restored) {
        try { await sqmApi.restoreStrictInspect(x.id) } catch { /* ignore */ }
      }
    }
    extStore.pushLog(changeId, '连续3批加严检验合格(S),自动恢复常态检验(T)')
    ElMessage.success('连续3批合格,已自动恢复常态检验')
    await loadData()
  }
}

async function restoreInspect(id: string) {
  try {
    await sqmApi.restoreStrictInspect(id)
    ElMessage.success('已恢复正常检验')
    await loadData()
  } catch (e: any) {
    console.error(e)
    ElMessage.error(e?.response?.data?.msg || e?.message || '操作失败')
  }
}

// ========== 回滚变更 + 退货重评(U) ==========
const rollbackVisible = ref(false)
const rollbackId = ref('')
const rollbackReason = ref('')
function openRollback(id: string) {
  rollbackId.value = id
  rollbackReason.value = extStore.get(id).rollbackReason || ''
  rollbackVisible.value = true
}
async function submitRollback() {
  if (!rollbackReason.value.trim()) { ElMessage.warning('请填写回滚/退货原因'); return }
  const o = changeOrders.value.find((c) => c.id === rollbackId.value)
  extStore.patch(rollbackId.value, { rollback: true, returned: true, rollbackReason: rollbackReason.value, frozen: false })
  extStore.pushLog(rollbackId.value, `回滚变更 + 退货重评(U),原因:${rollbackReason.value}`)
  if (o?.supId) {
    try { await sqmApi.updateSupplier(o.supId, { id: o.supId, status: '整改中' }) } catch { /* ignore */ }
  }
  rollbackVisible.value = false
  ElMessage.success('变更已回滚,物料退货并重新评估')
  await loadData()
}

// ========== SOP 更新通知详情 ==========
const sopDetailVisible = ref(false)
const sopCur = ref<SopUpdate | null>(null)
function openSopDetail(s: SopUpdate) {
  sopCur.value = s
  sopDetailVisible.value = true
}

// ========== 操作轨迹 ==========
function openLog(id: string) {
  const log = extStore.get(id).log
  if (!log.length) { ElMessage.info('暂无扩展流程操作记录'); return }
  ElMessage.success(`流程轨迹(${log.length} 条):` + log.map((l) => `${l.t} ${l.msg}`).join(' | '))
}
</script>

<template>
  <div class="sqm-change">
    <div class="qms-banner">
      <div class="qms-banner__icon" :style="{ background: authStore.currentRole?.color }">🔄</div>
      <div>
        <div class="qms-banner__title">{{ banner.title }}</div>
        <div class="qms-banner__desc">{{ banner.desc }}</div>
      </div>
    </div>

    <!-- 工具栏 -->
    <div class="toolbar">
      <select v-model="fStatus" class="qms-select">
        <option value="">全部状态</option>
        <option>待申请</option><option>审批中</option><option>已批准</option><option>已执行</option><option>已关闭</option>
      </select>
      <select v-model="fType" class="qms-select">
        <option value="">全部类型</option>
        <option>材料升级</option><option>配方变更</option><option>工艺变更</option><option>材料变更</option><option>封装变更</option>
      </select>
      <input v-model="fSearch" type="text" class="qms-input" placeholder="搜索变更单号或物料..." />
      <span class="sp" />
      <button v-if="canApply" class="btn pri" @click="openApply">+ 发起变更</button>
    </div>

    <!-- 1. 自动触发规则 -->
    <div class="qms-card">
      <div class="qms-card__header"><h3>自动触发规则 </h3></div>
      <div class="qms-card__body">
        <div class="trigger-rules">
          <div v-for="r in triggerRules" :key="r.title" class="trigger-rule-item">
            <div class="tr-icon">{{ r.icon }}</div>
            <div>
              <div class="tr-title">{{ r.title }}</div>
              <div class="tr-desc">{{ r.desc }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 2. 物料变更单列表 -->
    <div class="qms-card">
      <div class="qms-card__header"><h3>物料变更单列表 </h3></div>
      <div class="qms-card__body" style="padding: 0; overflow-x: auto">
        <table class="tbl" style="min-width: 1180px">
          <thead>
            <tr>
              <th>变更单号</th><th>变更标题</th><th>供应商</th><th>物料料号</th><th>变更类型</th>
              <th>紧急度</th><th>申请人</th><th>申请日期</th><th>评估资料</th><th>审批状态</th>
              <th>加严标记</th><th>冻结</th><th>风险</th><th>状态</th><th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="o in filteredOrders" :key="o.id">
              <td>{{ o.id }}</td>
              <td><strong>{{ o.title }}</strong></td>
              <td>{{ o.supName }}</td>
              <td>{{ o.partNo }}</td>
              <td>{{ o.type }}</td>
              <td><span class="qms-pill" :class="urgencyPill(o.urgency)">{{ o.urgency }}</span></td>
              <td>{{ o.applicant }}</td>
              <td>{{ o.applyDate }}</td>
              <td>
                <div class="doc-icons">
                  <span class="doc-icon" :class="docState(o.id).changeNote ? 'ok' : 'miss'" title="变更说明">📄{{ docState(o.id).changeNote ? '✓' : '—' }}</span>
                  <span class="doc-icon" :class="docState(o.id).verifyReport ? 'ok' : 'miss'" title="验证报告">📊{{ docState(o.id).verifyReport ? '✓' : '—' }}</span>
                  <span class="doc-icon" :class="docState(o.id).fmea ? 'ok' : 'miss'" title="FMEA风险评估">🛡️{{ docState(o.id).fmea ? '✓' : '—' }}</span>
                  <span v-if="docState(o.id).files" class="doc-icon ok" title="评估附件">📎{{ docState(o.id).files }}</span>
                </div>
              </td>
              <td>
                <span class="qms-pill" :class="apprStatus(o).cls">{{ apprStatus(o).text }}</span>
              </td>
              <td>
                <span class="qms-pill" :class="o.strictFlag ? 'r' : 'gray'">{{ o.strictFlag ? '加严' : '正常' }}</span>
              </td>
              <td>
                <span class="qms-pill" :class="extStore.get(o.id).frozen ? 'r' : 'g'">{{ extStore.get(o.id).frozen ? '冻结' : '可收' }}</span>
              </td>
              <td>
                <span class="qms-pill" :class="riskPill(extStore.get(o.id).riskLevel)">{{ extStore.get(o.id).riskLevel || '—' }}</span>
              </td>
              <td><span class="qms-pill" :class="statusPill(o.status)">{{ o.status }}</span></td>
              <td class="ops-cell">
                <button class="btn sm text-link" @click="openDetail(o.id)">查看</button>
                <button
                  v-if="o.status === '待申请'" class="btn sm pri" @click="openEval(o.id)">提交评估</button>
                <button v-else-if="canApproveRow(o)" class="btn sm pri" @click="openApprove(o.id)">审批</button>
                <button v-else-if="o.status === '已批准' || o.status === '已执行'" class="btn sm pri" @click="closeChangeOrder(o.id)">关闭</button>
                <el-dropdown size="small" trigger="click">
                  <button class="btn sm text-link">更多</button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item v-if="o.status === '待申请'" @click="openEval(o.id)">提交评估资料</el-dropdown-item>
                      <el-dropdown-item v-if="canApproveRow(o)" @click="openApprove(o.id)">会签审批</el-dropdown-item>
                      <el-dropdown-item v-if="o.status === '审批中' || o.status === '已批准'" @click="openFmea(o.id)">FMEA 风险评估</el-dropdown-item>
                      <el-dropdown-item v-if="o.status === '审批中' && extStore.get(o.id).riskLevel === '高' && !extStore.get(o.id).trialStarted" @click="startTrial(o.id)">启动小批试产</el-dropdown-item>
                      <el-dropdown-item v-if="o.status === '审批中' && extStore.get(o.id).trialStarted && !extStore.get(o.id).trialDone" @click="completeTrial(o.id)">完成小批试产</el-dropdown-item>
                      <el-dropdown-item v-if="o.status === '已批准' || o.status === '已执行'" @click="closeChangeOrder(o.id)">关闭变更单</el-dropdown-item>
                      <el-dropdown-item v-if="o.strictFlag && (o.status === '已批准' || o.status === '已执行')" @click="openInspect(o.id)">+加严检验</el-dropdown-item>
                      <el-dropdown-item v-if="['已批准','已执行','已关闭'].includes(o.status)" @click="openRollback(o.id)">回滚退货</el-dropdown-item>
                      <el-dropdown-item @click="openLog(o.id)">流程轨迹</el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </td>
            </tr>
            <tr v-if="filteredOrders.length === 0">
              <td colspan="15" class="muted" style="text-align:center;padding:20px">无匹配数据</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 4. 加严检验跟踪 -->
    <div class="qms-card">
      <div class="qms-card__header"><h3>加严检验跟踪 </h3></div>
      <div class="qms-card__body">
        <div v-if="strictInspect.length === 0" style="padding:24px;text-align:center;color:#9ca3af;font-size:13px">
          暂无加严检验记录。变更批准后可新增加严检验批次(R)。
        </div>
        <div v-if="strictInspect.length" class="strict-track">
          <div v-for="si in strictInspect" :key="si.id" class="strict-track-item" :class="si.result === '合格' ? 'passed' : si.result === '不合格' ? 'failed' : 'pending'">
            <div class="st-batch">{{ si.batchNo }} <span v-if="si.restored" class="qms-pill g" style="margin-left:4px">已恢复</span></div>
            <div class="st-row"><span>关联变更</span><strong>{{ si.changeId }}</strong></div>
            <div class="st-row"><span>检验类型</span><strong>{{ si.inspectType }}</strong></div>
            <div class="st-row"><span>AQL等级</span><strong>{{ si.aql }}</strong></div>
            <div class="st-row"><span>检验结果</span><strong :class="{ ok: si.result === '合格', bad: si.result === '不合格' }">{{ si.result }}</strong></div>
            <div class="st-row"><span>进度</span><strong>{{ si.seq }}/{{ si.totalSeq }}</strong></div>
            <div class="st-row"><span>检验日期</span><strong>{{ si.date || '—' }}</strong></div>
            <div v-if="!si.restored && si.result === '合格'" style="margin-top:8px">
              <button class="btn sm pri" @click="restoreInspect(si.id)">恢复正常检验</button>
            </div>
          </div>
        </div>
        <div v-if="strictInspect.length" class="ac-box" style="margin-top:12px">
          <strong>连续3批合格后可恢复正常检验(S)</strong>。当前已跟踪批次：<strong>{{ strictInspect.length }}</strong> 批，其中已恢复正常的有 <strong>{{ strictInspect.filter((x) => x.restored).length }}</strong> 批。
        </div>
      </div>
    </div>

    <!-- 5. SOP更新通知 -->
    <div class="qms-card">
      <div class="qms-card__header"><h3>SOP更新通知 </h3></div>
      <div class="qms-card__body" style="padding: 0; overflow-x: auto">
        <table v-if="sopUpdates.length" class="tbl">
          <thead><tr><th>关联变更单</th><th>SOP文件</th><th>版本</th><th>更新内容</th><th>发布日期</th><th>状态</th><th>操作</th></tr></thead>
          <tbody>
            <tr v-for="s in sopUpdates" :key="s.changeId">
              <td>{{ s.changeId }}</td>
              <td>{{ s.file }}</td>
              <td>{{ s.version }}</td>
              <td>{{ s.content }}</td>
              <td>{{ s.publishDate }}</td>
              <td><span class="qms-pill" :class="s.status === '已发布' ? 'g' : 'y'">{{ s.status }}</span></td>
              <td><button class="btn sm ghost" @click="openSopDetail(s)">详情</button></td>
            </tr>
          </tbody>
        </table>
        <div v-else style="padding:24px;text-align:center;color:#9ca3af;font-size:13px">
          暂无SOP更新通知。变更批准生效后自动生成更新通知。
        </div>
      </div>
    </div>

    <!-- 发起变更弹窗 -->
    <el-dialog v-model="applyVisible" title="发起物料变更" width="520px">
      <div class="form-row">
        <label>变更标题</label>
        <input v-model="applyForm.title" type="text" class="qms-input" placeholder="简要描述变更内容" />
        <label>供应商</label>
        <select v-model="applyForm.supId" class="qms-select">
          <option value="">选择供应商</option>
          <option v-for="s in suppliers" :key="s.id" :value="s.id">{{ s.name }}</option>
        </select>
        <label>物料料号</label>
        <input v-model="applyForm.partNo" type="text" class="qms-input" placeholder="输入物料料号" />
        <label>变更类型</label>
        <select v-model="applyForm.type" class="qms-select">
          <option>材料升级</option><option>配方变更</option><option>工艺变更</option><option>材料变更</option><option>封装变更</option>
        </select>
        <label>变更原因</label>
        <textarea v-model="applyForm.reason" rows="2" class="qms-input" placeholder="说明变更原因..."></textarea>
        <label>紧急度</label>
        <select v-model="applyForm.urgency" class="qms-select"><option>高</option><option>中</option><option>低</option></select>
        <label><input v-model="applyForm.strict" type="checkbox" /> 变更后需加严检验</label>
      </div>
      <template #footer>
        <button class="btn pri" :disabled="applyLoading" @click="submitApply">提交申请</button>
        <button class="btn ghost" @click="applyVisible = false">取消</button>
      </template>
    </el-dialog>

    <!-- 提交评估资料(F)弹窗 -->
    <el-dialog v-model="evalVisible" title="提交变更评估资料(F)" width="540px">
      <div class="form-row">
        <label><input v-model="evalForm.changeNote" type="checkbox" /> 变更说明</label>
        <label><input v-model="evalForm.verifyReport" type="checkbox" /> 验证报告</label>
        <label>评估资料附件上传</label>
        <input type="file" multiple class="qms-input" @change="onEvalFile" />
        <div v-if="evalFiles.length" class="note">
          <div v-for="f in evalFiles" :key="f.name + f.uploadedAt" style="font-size:12px">📎 {{ f.name }}（{{ (f.size / 1024).toFixed(1) }} KB）</div>
        </div>
        <div class="note warn">提交后系统将冻结该物料收货(E),进入并行会签审批。</div>
      </div>
      <template #footer>
        <button class="btn pri" @click="submitEval">提交并冻结收货</button>
        <button class="btn ghost" @click="evalVisible = false">取消</button>
      </template>
    </el-dialog>

    <!-- 变更详情弹窗 -->
    <el-dialog v-model="detailVisible" title="变更详情" width="640px">
      <template v-if="detailData">
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="变更单号">{{ detailData.order.id }}</el-descriptions-item>
          <el-descriptions-item label="状态"><span class="qms-pill" :class="statusPill(detailData.order.status)">{{ detailData.order.status }}</span></el-descriptions-item>
          <el-descriptions-item label="标题" :span="2">{{ detailData.order.title }}</el-descriptions-item>
          <el-descriptions-item label="供应商">{{ detailData.order.supName }}</el-descriptions-item>
          <el-descriptions-item label="物料料号">{{ detailData.order.partNo }}</el-descriptions-item>
          <el-descriptions-item label="变更类型">{{ detailData.order.type }}</el-descriptions-item>
          <el-descriptions-item label="变更原因">{{ detailData.order.reason }}</el-descriptions-item>
          <el-descriptions-item label="申请人">{{ detailData.order.applicant }}</el-descriptions-item>
          <el-descriptions-item label="申请日期">{{ detailData.order.applyDate }}</el-descriptions-item>
          <el-descriptions-item label="收货冻结"><span class="qms-pill" :class="extStore.get(detailData.order.id).frozen ? 'r' : 'g'">{{ extStore.get(detailData.order.id).frozen ? '冻结中' : '可收货' }}</span></el-descriptions-item>
          <el-descriptions-item label="风险等级"><span class="qms-pill" :class="riskPill(extStore.get(detailData.order.id).riskLevel)">{{ extStore.get(detailData.order.id).riskLevel || '未评估' }}</span></el-descriptions-item>
        </el-descriptions>

        <h4 style="margin:16px 0 8px">评估资料</h4>
        <div class="doc-icons" style="gap:8px">
          <span class="doc-icon" :class="docState(detailData.order.id).changeNote ? 'ok' : 'miss'">📄 变更说明 {{ docState(detailData.order.id).changeNote ? '✓ 已提交' : '— 未提交' }}</span>
          <span class="doc-icon" :class="docState(detailData.order.id).verifyReport ? 'ok' : 'miss'">📊 验证报告 {{ docState(detailData.order.id).verifyReport ? '✓ 已提交' : '— 未提交' }}</span>
          <span class="doc-icon" :class="docState(detailData.order.id).fmea ? 'ok' : 'miss'">🛡️ FMEA风险评估 {{ docState(detailData.order.id).fmea ? '✓ 已提交' : '— 未提交' }}</span>
        </div>

        <template v-if="detailData.appr">
          <h4 style="margin:16px 0 8px">并行审批状态</h4>
          <div class="parallel-approval" style="margin:10px 0">
            <template v-for="(node, i) in [
              { name: '质量审批', data: detailData.appr.quality },
              { name: '采购审批', data: detailData.appr.purchase },
              { name: '研发审批', data: detailData.appr.rd },
            ]" :key="node.name">
              <div class="approval-node" :class="[node.data.status, { veto: node.data.veto }]">
                <div class="ap-icon">{{ node.data.status === 'done' ? '✓' : node.data.status === 'doing' ? '⏳' : '○' }}</div>
                <div class="ap-name">{{ node.name }}</div>
                <div class="ap-status">{{ node.data.status === 'done' ? '已通过' : node.data.status === 'doing' ? '审批中' : '待审批' }}</div>
                <div class="ap-status">{{ node.data.operator || '—' }}</div>
                <div v-if="node.data.veto" class="ap-veto">一票否决权</div>
              </div>
              <div v-if="i < 2" class="approval-join">&</div>
            </template>
          </div>
        </template>

        <template v-if="detailData.detail.workflow && detailData.detail.workflow.length">
          <h4 style="margin:16px 0 8px">历史流程记录</h4>
          <div class="timeline">
            <div v-for="(w, i) in detailData.detail.workflow" :key="i" class="tl-item">
              <div class="tl-t">{{ w.date || '待定' }}</div>
              <div class="tl-op"><strong>{{ w.step }}</strong> — {{ w.operator || '—' }}</div>
              <div class="meta">{{ w.action }} — {{ w.status === 'done' ? '已完成' : w.status === 'doing' ? '进行中' : '待处理' }}</div>
            </div>
          </div>
        </template>
      </template>
      <template #footer>
        <button class="btn" @click="detailVisible = false">关闭</button>
      </template>
    </el-dialog>

    <!-- 并行会签审批弹窗(质量/采购/研发,复用首件检验电子签名验证) -->
    <el-dialog v-model="approveVisible" title="变更并行会签（复用首件检验电子签名）" width="700px">
      <template v-if="approveData">
        <p><strong>变更单号：</strong>{{ approveData.id }}　<strong>标题：</strong>{{ approveData.title }}</p>
        <p><strong>供应商：</strong>{{ approveData.supName }}　<strong>风险等级：</strong>{{ approveData.riskLevel || '未评估' }}</p>

        <div class="esign-note" style="margin:8px 0 12px">
          并行会签（质量 / 采购 / 研发）需三方各自完成电子签名，验证方式与「首件检验录入」一致：
          <strong>{{ signMethodLabel }}</strong>（{{ isThreeLevel ? '三级' : '两级' }} / {{ signGranularity }}）。三方全部签名后方可批准。
        </div>

        <div class="cosign-grid">
          <div v-for="role in coSignRoles" :key="role" class="cosign-card" :class="{ done: signerState[role]?.signed }">
            <div class="cosign-head">
              <strong>{{ roleLabelMap[role] }}</strong>
              <span v-if="signerState[role]?.signed" class="qms-pill g">已签名</span>
              <span v-else class="qms-pill gray">待签名</span>
            </div>
            <div class="cosign-body">
              <label class="esign-label">签名人</label>
              <input v-model="signerUser[role]" class="qms-input esign-input" :placeholder="`${roleLabelMap[role]}签名人`" :disabled="signerState[role]?.signed" />

              <label class="esign-label">签名方式（与首件检验录入一致，可配置）</label>
              <select v-model="signerMethod[role]" class="qms-select esign-input" :disabled="signerState[role]?.signed">
                <option v-for="m in signMethods" :key="m.key" :value="m.key">{{ m.label }}</option>
              </select>

              <template v-if="signerMethod[role] === 'password'">
                <label class="esign-label">用户名 + 密码</label>
                <div class="esign-input-row">
                  <input v-model="signerPwd[role]" type="password" class="qms-input esign-input" :placeholder="`${roleLabelMap[role]}签名口令`" :disabled="signerState[role]?.signed" />
                  <button class="btn sm" :disabled="signerState[role]?.signed || !signerUser[role] || !signerPwd[role]" @click="doSign(role)">确认签名</button>
                </div>
              </template>
              <template v-else-if="signerMethod[role] === 'handwriting'">
                <label class="esign-label">手写笔迹</label>
                <canvas :ref="(el) => setCanvas(role, el)" width="260" height="70" class="esign-canvas"
                  @pointerdown="onDown(role, $event)" @pointermove="onMove(role, $event)" @pointerup="onUp" @pointerleave="onUp"></canvas>
                <div class="esign-input-row">
                  <button class="btn sm" :disabled="signerState[role]?.signed" @click="doSign(role)">确认笔迹</button>
                  <button class="btn sm ghost" :disabled="signerState[role]?.signed" @click="clearSig(role)">清除</button>
                </div>
              </template>
              <template v-else>
                <label class="esign-label">CA 证书</label>
                <div class="esign-input-row">
                  <input v-model="signerCA[role]" class="qms-input esign-input" placeholder="CA 证书标识" :disabled="signerState[role]?.signed" />
                  <button class="btn sm" :disabled="signerState[role]?.signed || !signerCA[role]" @click="doSign(role)">CA 验证</button>
                </div>
              </template>
              <div v-if="signerState[role]?.signed" class="esign-done">✓ {{ signerState[role].signer }} 于 {{ signerState[role].ts }}（{{ signerState[role].method }}）</div>
            </div>
          </div>
        </div>

        <p style="margin-top:12px"><strong>供应商目标状态：</strong>
          <select v-model="approveTargetStatus" class="qms-select" style="width:160px">
            <option value="合格">合格（正式合作）</option>
            <option value="观察">观察（观察期）</option>
            <option value="整改中">整改中</option>
          </select>
          <span class="meta" style="margin-left:8px;font-size:12px">会签通过后同步更新供应商生命周期状态</span>
        </p>
        <hr style="margin:12px 0;border:0;border-top:1px solid #e5e7eb" />
        <label>会签意见 <span style="color:#e74c3c;font-size:12px">（质量部拥有一票否决权）</span></label>
        <textarea v-model="approveOpinion" rows="3" class="qms-input" placeholder="输入会签意见..."></textarea>
      </template>
      <template #footer>
        <button class="btn pri" :disabled="approveLoading || !signGatePassed" @click="submitApprove('approve')">{{ approveLoading ? '提交中...' : '批准会签（三方通过）' }}</button>
        <button class="btn" :disabled="approveLoading" @click="submitApprove('reject')">驳回（质量否决）</button>
        <button class="btn ghost" :disabled="approveLoading" @click="resetAllSigns">重置签名</button>
        <button class="btn ghost" @click="approveVisible = false">取消</button>
      </template>
    </el-dialog>

    <!-- FMEA 风险评估(G)弹窗 -->
    <el-dialog v-model="fmeaVisible" title="FMEA 风险评估(G)" width="600px">
      <div class="form-row">
        <label>风险等级（H 风险分级依据）</label>
        <select v-model="fmeaForm.riskLevel" class="qms-select">
          <option value="">未评估</option><option>高</option><option>中</option><option>低</option>
        </select>
        <div v-if="fmeaForm.riskLevel === '高'" class="note warn">高风险变更：须强制小批试产(H)后方可批准关闭。</div>
        <label>关联 FMEA 风险项（来自 FMEA 模块）</label>
        <div v-if="fmeaRisks.length" class="fmea-list">
          <div v-for="r in fmeaRisks.slice(0, 8)" :key="r.id" class="fmea-item">
            <span>{{ r.product }} / {{ r.process }}</span>
            <span class="qms-pill" :class="r.riskLevel === '高' ? 'r' : r.riskLevel === '中' ? 'y' : 'g'">{{ r.riskLevel || '—' }}</span>
            <span class="meta">RPN {{ r.rpn }}</span>
          </div>
        </div>
        <div v-else class="meta">暂无 FMEA 风险项数据。</div>
      </div>
      <template #footer>
        <button class="btn pri" @click="submitFmea">保存风险评估</button>
        <button class="btn ghost" @click="fmeaVisible = false">取消</button>
      </template>
    </el-dialog>

    <!-- 新增加严检验批次弹窗 -->
    <el-dialog v-model="inspectVisible" title="新增加严检验批次(R)" width="480px">
      <div class="form-row">
        <label>关联变更单</label>
        <input v-model="inspectForm.changeId" type="text" class="qms-input" readonly />
        <label>批次号</label>
        <input v-model="inspectForm.lotId" type="text" class="qms-input" placeholder="输入来料批号" />
        <label>检验类型</label>
        <select v-model="inspectForm.inspectType" class="qms-select">
          <option>全检</option><option>抽样检验</option><option>首件检验</option>
        </select>
        <label>AQL等级</label>
        <select v-model="inspectForm.aqlLevel" class="qms-select">
          <option>AQL=0.65</option><option>AQL=0.40</option><option>AQL=0.25</option><option>AQL=0.15</option>
        </select>
        <label>检验结果</label>
        <select v-model="inspectForm.result" class="qms-select">
          <option>待检</option><option>合格</option><option>不合格</option>
        </select>
        <label>检验日期</label>
        <input v-model="inspectForm.inspectDate" type="date" class="qms-input" />
      </div>
      <template #footer>
        <button class="btn pri" :disabled="inspectLoading" @click="submitInspect">{{ inspectLoading ? '提交中...' : '录入检验结果' }}</button>
        <button class="btn ghost" @click="inspectVisible = false">取消</button>
      </template>
    </el-dialog>

    <!-- 回滚变更 + 退货重评(U)弹窗 -->
    <el-dialog v-model="rollbackVisible" title="回滚变更 + 退货重评(U)" width="520px">
      <div class="form-row">
        <div class="note warn">将回滚该物料变更,关联来料退货并重新评估供应商;同时解除收货冻结。</div>
        <label>回滚/退货原因</label>
        <textarea v-model="rollbackReason" rows="3" class="qms-input" placeholder="说明回滚与退货重评原因..."></textarea>
      </div>
      <template #footer>
        <button class="btn warn" @click="submitRollback">确认回滚退货</button>
        <button class="btn ghost" @click="rollbackVisible = false">取消</button>
      </template>
    </el-dialog>

    <!-- SOP 更新通知详情弹窗 -->
    <el-dialog v-model="sopDetailVisible" :title="`SOP 更新通知详情 · ${sopCur?.changeId || ''}`" width="560px">
      <template v-if="sopCur">
        <el-descriptions :column="1" border size="small">
          <el-descriptions-item label="SOP 文件">{{ sopCur.file }}（{{ sopCur.version }}）</el-descriptions-item>
          <el-descriptions-item label="更新内容">{{ sopCur.content }}</el-descriptions-item>
          <el-descriptions-item label="发布日期">{{ sopCur.publishDate }}</el-descriptions-item>
          <el-descriptions-item label="状态"><span class="qms-pill" :class="sopCur.status === '已发布' ? 'g' : 'y'">{{ sopCur.status }}</span></el-descriptions-item>
        </el-descriptions>
        <h4 style="margin:16px 0 8px">① 通知情况（SR-SCM-016 多部门推送）</h4>
        <div v-if="sopCur.notified.length" class="note">
          已向以下部门推送变更通知：<br />
          <span v-for="d in sopCur.notified" :key="d" class="qms-pill g" style="margin:2px 4px 2px 0">{{ d }}</span><br />
          <span class="meta">通知内容含变更摘要、生效时间与新标准版本号。</span>
        </div>
        <div v-else class="note warn">变更尚未批准生效，待推送（质量/采购/生产/仓储）。</div>
        <h4 style="margin:14px 0 8px">② 解冻收货（SR-SCM-004）</h4>
        <div class="note">{{ sopCur.unfreeze }}</div>
        <h4 style="margin:14px 0 8px">③ AQL 提级（加严检验）</h4>
        <div class="note">{{ sopCur.aqlUpgrade }}</div>
      </template>
      <template #footer>
        <button class="btn ghost" @click="sopDetailVisible = false">关闭</button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.sqm-change { display: flex; flex-direction: column; gap: 14px; }

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
.sp { flex: 1; }

.trigger-rules { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; }
.trigger-rule-item {
  display: flex; gap: 12px; align-items: flex-start;
  padding: 12px; border: 1px solid var(--line, #e5e7eb); border-radius: 8px; background: #fafbfc;
}
.tr-icon { font-size: 22px; line-height: 1; }
.tr-title { font-weight: 600; font-size: 14px; margin-bottom: 4px; }
.tr-desc { font-size: 12px; color: #6b7785; line-height: 1.5; }

.doc-icons { display: inline-flex; gap: 6px; flex-wrap: wrap; }
.doc-icon {
  display: inline-flex; align-items: center; gap: 2px;
  font-size: 11px; padding: 2px 6px; border-radius: 10px; white-space: nowrap;
  border: 1px solid #e5e7eb; background: #f4f6f8; color: #98a2b0;
}
.doc-icon.ok { background: #e8f5e9; color: #2f7d32; border-color: #bfe3c4; }
.doc-icon.miss { background: #f4f6f8; color: #98a2b0; border-color: #e5e7eb; }

.parallel-approval { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
.approval-join { color: #8a94a6; font-weight: 700; font-size: 18px; }
.approval-node {
  position: relative; min-width: 120px; text-align: center;
  padding: 14px 12px 10px; border-radius: 10px; border: 2px solid #e5e7eb; background: #f7f8fa;
}
.approval-node.done { border-color: #2f7d32; background: #eefaf0; }
.approval-node.doing { border-color: #1e4d8b; background: #eaf1fb; }
.ap-icon { width: 30px; height: 30px; margin: 0 auto 6px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; background: #fff; border: 1px solid #d8dee6; }
.approval-node.done .ap-icon { color: #2f7d32; border-color: #2f7d32; }
.approval-node.doing .ap-icon { color: #1e4d8b; border-color: #1e4d8b; }
.ap-name { font-weight: 600; font-size: 13px; }
.ap-status { font-size: 11px; color: #6b7785; margin-top: 2px; }
.ap-veto { margin-top: 6px; font-size: 10px; color: #c0392b; background: #fdecea; border-radius: 8px; padding: 1px 6px; display: inline-block; }

.strict-track { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px; }
.strict-track-item {
  border: 1px solid #e5e7eb; border-left: 3px solid #8a94a6; border-radius: 8px; padding: 10px 12px; background: #fafbfc;
}
.strict-track-item.passed { border-left-color: #2f7d32; }
.strict-track-item.failed { border-left-color: #c0392b; }
.strict-track-item.pending { border-left-color: #d4a017; }
.st-batch { font-weight: 700; font-size: 13px; margin-bottom: 6px; }
.st-row { display: flex; justify-content: space-between; font-size: 12px; color: #6b7785; padding: 2px 0; }
.st-row strong { color: #1f2d3d; }
.st-row strong.ok { color: #2f7d32; }
.st-row strong.bad { color: #c0392b; }

.form-row { display: flex; flex-direction: column; gap: 6px; }
.form-row label { font-size: 13px; color: #44515f; margin-top: 6px; }
textarea.qms-input { height: auto; padding: 8px 10px; resize: vertical; }

.grid.g-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
@media (max-width: 720px) { .grid.g-2 { grid-template-columns: 1fr; } }
.note { font-size: 12px; color: #6b7785; line-height: 1.6; background: #f7f9fc; border-left: 3px solid #1e4d8b; padding: 8px 12px; border-radius: 6px; }
.note.warn { background: #fdecea; border-left-color: #c0392b; color: #b03021; }
.ex-box { font-size: 12px; color: #6b7785; line-height: 1.6; background: #f7f9fc; border-left: 3px solid #2f7d32; padding: 8px 12px; border-radius: 6px; }
.ac-box { font-size: 12px; color: #44515f; background: #fff8e6; border: 1px solid #f3d99a; border-radius: 6px; padding: 8px 12px; }

.btn.warn { background: #c0392b; color: #fff; border-color: #c0392b; }

/* 操作列统一风格：药丸式圆角 + 纯文字链接，td 自身恢复 table-cell 垂直居中 */
.ops-cell { vertical-align: middle; white-space: nowrap; }
.ops-cell .btn.sm,
.ops-cell .btn.sm.text-link,
.ops-cell .btn.sm.pri {
  display: inline-flex; align-items: center; justify-content: center; vertical-align: middle;
  height: 24px; padding: 0 10px; font-size: 12px; border-radius: 12px; border-width: 1px; border-style: solid; min-width: auto; white-space: nowrap; transition: all 0.2s ease; font-weight: 500; cursor: pointer;
}
.ops-cell .btn.sm + .btn.sm { margin-left: 4px; }
.ops-cell .btn.sm.text-link {
  background: transparent; border-color: transparent; color: #6b7785;
}
.ops-cell .btn.sm.text-link:hover { color: #1e4d8b; background: rgba(30,77,139,0.06); }
.ops-cell .btn.sm.pri {
  background: #1e4d8b; border-color: #1e4d8b; color: #fff;
}
.ops-cell .btn.sm.pri:hover { background: #163d72; border-color: #163d72; }

/* FIA 电子签名面板 */
.esign-box { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; background: #fafbfc; margin-top: 8px; }
.esign-head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 10px; font-size: 13px; }
.esign-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; padding: 8px 0; border-top: 1px dashed #e5e7eb; }
.esign-who { min-width: 110px; display: flex; align-items: center; gap: 6px; }
.esign-ok { font-size: 11px; color: #2f7d32; }
.esign-canvas { border: 1px solid #cbd5e1; border-radius: 6px; background: #fff; width: 200px; height: 70px; touch-action: none; }
.esign-gate { margin-top: 10px; padding: 8px 10px; border-radius: 6px; font-size: 12px; font-weight: 600; }
.esign-gate.pass { background: #e8f5e9; color: #2f7d32; }
.esign-gate.block { background: #fdecea; color: #c0392b; }

/* 并行会签三角色卡片 */
.cosign-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 4px; }
.cosign-card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px; background: #fff; }
.cosign-card.done { border-color: #2f7d32; background: #f3faf4; }
.cosign-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; font-size: 13px; }
.cosign-body { display: flex; flex-direction: column; gap: 6px; }
.cosign-body .esign-label { font-size: 12px; color: #6b7785; margin-top: 2px; }
.cosign-body .esign-input { width: 100%; }
.cosign-body .esign-input-row { display: flex; gap: 6px; align-items: center; }
.cosign-body .esign-input-row .esign-input { flex: 1; min-width: 0; }
.cosign-body .esign-done { font-size: 12px; color: #2f7d32; margin-top: 2px; }

/* FMEA 列表 */
.fmea-list { display: flex; flex-direction: column; gap: 6px; margin-top: 4px; }
.fmea-item { display: flex; align-items: center; gap: 10px; font-size: 12px; padding: 6px 10px; border: 1px solid #e5e7eb; border-radius: 6px; background: #fff; }
.fmea-item .meta { margin-left: auto; color: #6b7785; }
</style>
