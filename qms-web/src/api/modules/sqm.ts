/**
 * SQM 供应商质量 API（以后端为准）
 * 全部列表/明细/聚合类接口调用真实后端，API 层做 DTO 适配；
 * 后端无对应接口的（追溯树 / CAPA 列表 / 供应商生命周期 / D8 / 变更审批详情等）返回空，避免使用静态业务数据。
 *  - GET /api/v1/sqm/suppliers            -> sqm.supplier.list   -> List<SqmSupplier>
 *  - GET /api/v1/sqm/audits/plans         -> sqm.audit.list      -> List<SqmAuditPlan>
 *  - GET /api/v1/sqm/audits/records       -> sqm.audit.list      -> List<SqmAuditRecord>
 *  - GET /api/v1/sqm/audits/ncs           -> sqm.audit.list      -> List<SqmAuditNc>
 *  - GET /api/v1/sqm/abnormals            -> sqm.abnormal.list   -> List<SqmAbnormal>
 *  - GET /api/v1/sqm/changes              -> sqm.change.list     -> List<SqmChangeOrder>
 *  - GET /api/v1/sqm/fmea                 -> sqm.fmea.list       -> List<SqmFmea>
 *  - GET /api/v1/sqm/dashboard/incoming   -> 来料看板 KPI
 *  - GET /api/v1/sqm/analysis/incoming    -> 来料分析（按维度聚合）
 *  - GET /api/v1/sqm/analysis/abnormal    -> 异常分析（按维度聚合）
 *  - GET /api/v1/sqm/performance/ranking  -> 供应商绩效排名
 *  - GET /api/v1/sqm/performance          -> 供应商绩效列表
 *  - GET /api/v1/sqm/supplier-certs       -> 供应商资质
 *  - GET /api/v1/sqm/measures             -> 整改措施
 *  - GET /api/v1/sqm/grade-rules          -> 等级规则
 *  - GET /api/v1/sqm/escalations          -> 升级记录
 *  - GET /api/v1/sqm/shares               -> 共享
 *  - GET /api/v1/sqm/verifications        -> 验证
 *  - GET /api/v1/sqm/strict-inspects      -> 加严检验
 *  - GET /api/v1/sqm/audit-freq-rules     -> 审核频次规则
 */
import { request } from '@/utils/request'
import type {
  Supplier, AuditPlan, AuditRecord, NcItem, ChangeOrder,
  Abnormal, FmeaItem, TraceNode, SqmKpi, FmeaRisk, FmeaRiskTrack, Capa, SupLifecycle, D8Link,
  ChangeDoc, ChangeApproval, ChangeDetail, StrictInspect,
  D8Stage, CapaType, CapaStatus, CapaStage,
  SqmIncomingLot, SqmTraceNode, SqmTraceRawDetail, SqmTraceProductDetail,
  SqmKeyPartSn, SqmAuditReportArchive, ArchiveItem, ArchiveExpiringItem,
  TraceFullTreeVO,
  TraceNodeSearchVO, PageResult,
  TraceNodeSaveRequest,
  TraceComponentItem,
  SupplierPerformance, GradeRule, SupplierShare, SupplierEscalation, AuditFreqRule,
} from '@/types/sqm'

/** 后端枚举值未知时，安全地映射为前端联合类型字面量 */
function lit<T>(v: unknown): T {
  return v as T
}
function str(v: unknown, fallback = ''): string {
  return v == null ? fallback : String(v)
}
function num(v: unknown, fallback = 0): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}
/** 后端返回可能是数组或 { list: [] } 等包装，统一兜底为数组 */
function arr<T = unknown>(v: unknown): T[] {
  if (Array.isArray(v)) return v as T[]
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>
    if (Array.isArray(o.list)) return o.list as T[]
    if (Array.isArray(o.data)) return o.data as T[]
    if (Array.isArray(o.records)) return o.records as T[]
  }
  return []
}

/** 后端 R<T> 包装或裸对象,统一解包。 */
function unwrap<T = unknown>(v: unknown): T | null {
  if (v && typeof v === 'object' && 'data' in (v as any)) {
    return ((v as any).data ?? null) as T
  }
  return (v ?? null) as T
}

// ---------- 后端 DTO 形状 ----------
interface BSupplier {
  id?: string; name?: string; supplierCode?: string; category?: string
  level?: string; status?: string; contactPerson?: string; contactPhone?: string; [k: string]: unknown
}
interface BPlan {
  id?: string; planNo?: string; supplierId?: string; auditType?: string
  scope?: string; auditLead?: string; riskLevel?: string; planDate?: string; status?: string; [k: string]: unknown
}
interface BRecord {
  id?: string; recordNo?: string; planId?: string; supplierId?: string; auditType?: string
  auditLead?: string; auditDate?: string; score?: number; result?: string; status?: string
  ncCount?: number; conclusion?: string; [k: string]: unknown
}
interface BNc {
  id?: string; ncNo?: string; recordId?: string; supplierId?: string; clause?: string
  description?: string; level?: string; responsible?: string; deadline?: string; status?: string
  verifyResult?: string; verifyComment?: string; verifyDate?: string; closeDate?: string
  needSiteReview?: boolean; [k: string]: unknown
}
interface BAbnormal {
  id?: string; abnormalNo?: string; lotId?: string; supplierId?: string; partNo?: string
  partName?: string; description?: string; qty?: number; level?: string; occurDate?: string
  status?: string; overdueDays?: number; disposal?: string; disposalRemark?: string
  d8Id?: string; capaId?: string; rectifyType?: string; closeDate?: string; [k: string]: unknown
}
interface BChange {
  id?: string; title?: string; supplierId?: string; partNo?: string; changeType?: string
  reason?: string; applicant?: string; applyDate?: string; status?: string
  urgency?: string; strictFlag?: boolean; [k: string]: unknown
}
interface BFmea {
  id?: string; riskNo?: string; fmeaType?: string; product?: string; process?: string
  failureMode?: string; action?: string; status?: string; owner?: string; targetDate?: string
  severityS?: number; occurrenceO?: number; detectionD?: number; rpn?: number
  riskLevel?: string; highRiskFlag?: boolean; evidence?: string | null; closeDate?: string | null
  createdAt?: string; [k: string]: unknown
}
interface BFmeaTrack {
  id?: string; riskId?: string; fromStatus?: string | null; toStatus?: string
  operator?: string; operateTime?: string; actionNote?: string; evidence?: string | null
  [k: string]: unknown
}

// ---------- dashboard / analysis 后端 DTO ----------
interface BDashboardIncoming {
  todayLots?: number; passRate?: number; pendingAbnormals?: number
  top5BadSuppliers?: { supplierId?: string; supplierName?: string; failCount?: number }[]
  trend7d?: { date?: string; passRate?: number; lots?: number }[]
  [k: string]: unknown
}

/** 将供应商列表转为 id -> Supplier 映射，供其他页面补全 supName */
export function mapSuppliers(list: Supplier[]): Record<string, Supplier> {
  const m: Record<string, Supplier> = {}
  for (const s of list) {
    if (s.id) m[s.id] = s
  }
  return m
}

function mapSupplier(b: BSupplier): Supplier {
  let qualifications: SupQualification[] = []
  try {
    const raw = b.certs
    if (typeof raw === 'string' && raw.trim()) qualifications = JSON.parse(raw)
    else if (Array.isArray(raw)) qualifications = raw as SupQualification[]
  } catch { /* certs 非 JSON 时忽略 */ }
  qualifications = qualifications.map((q) => ({
    name: str(q.name), type: str(q.type), uploader: str(q.uploader) || '供应商申请',
    uploadDate: str(q.uploadDate) || '—', expireDate: str(q.expireDate),
    warnLevel: (q.warnLevel as SupQualification['warnLevel']) || '正常',
  }))
  return {
    id: str(b.id), name: str(b.name), code: str(b.supplierCode), category: str(b.category),
    level: lit<Supplier['level']>(b.level) || 'D', status: str(b.status) || '待审核', score: num(b.score),
    contact: str(b.contactPerson), tel: str(b.contactPhone), address: str(b.address),
    cert: '', lastAudit: str((b as { lastAuditDate?: string }).lastAuditDate), nextAudit: str((b as { nextAuditDate?: string }).nextAuditDate),
    supplierNo: str(b.supplierNo), qualifications,
  }
}

function mapPerformance(b: Record<string, unknown>): SupplierPerformance {
  const lvl = str(b.level)
  return {
    id: str(b.id), supplierId: str(b.supplierId), period: str(b.period),
    score: num(b.score),
    deliveryScore: num(b.deliveryScore), qualityScore: num(b.qualityScore), serviceScore: num(b.serviceScore),
    incomingPassRate: num(b.incomingPassRate), defectRate: num(b.defectRate),
    rectifyTimelyRate: num(b.rectifyTimelyRate), deliveryTimelyRate: num(b.deliveryTimelyRate),
    complianceRate: num(b.complianceRate),
    level: (['A', 'B', 'C', 'D'].includes(lvl) ? lvl : 'D') as SupplierPerformance['level'],
    observeFlag: !!b.observeFlag, dataMissingFlag: !!b.dataMissingFlag,
  }
}
function mapGradeRule(b: Record<string, unknown>): GradeRule {
  const lvl = str(b.level)
  return {
    id: str(b.id), orgId: str(b.orgId), scoreMin: num(b.scoreMin), scoreMax: num(b.scoreMax),
    level: (['A', 'B', 'C', 'D'].includes(lvl) ? lvl : 'D') as GradeRule['level'],
    observeFirstYear: !!b.observeFirstYear,
  }
}
function mapShare(b: Record<string, unknown>): SupplierShare {
  const lvl = str(b.linkedLevel || b.level)
  return {
    id: str(b.id), orgId: str(b.orgId), supplierId: str(b.supplierId),
    partNo: str(b.partNo), shareRatio: num(b.shareRatio), effectiveDate: str(b.effectiveDate),
    changeReason: str(b.changeReason), prevRatio: num(b.prevRatio),
    linkedLevel: (['A', 'B', 'C', 'D'].includes(lvl) ? lvl : 'D') as SupplierShare['linkedLevel'],
  }
}
function mapEscalation(b: Record<string, unknown>): SupplierEscalation {
  const lvl = str(b.currentLevel || b.level)
  return {
    id: str(b.id), orgId: str(b.orgId), supplierId: str(b.supplierId),
    currentLevel: (['A', 'B', 'C', 'D'].includes(lvl) ? lvl : 'D') as SupplierEscalation['currentLevel'],
    qualityIssueCount6m: num(b.qualityIssueCount6m), repeatProblemCount: num(b.repeatProblemCount),
    suggestedAction: str(b.suggestedAction), escalationStatus: str(b.escalationStatus),
    escalationAction: str(b.escalationAction), noticeSentFlag: !!b.noticeSentFlag,
  }
}
function mapFreqRule(b: Record<string, unknown>): AuditFreqRule {
  const lvl = str(b.level)
  return {
    id: str(b.id), orgId: str(b.orgId), riskLevel: str(b.riskLevel),
    level: (['A', 'B', 'C', 'D'].includes(lvl) ? lvl : 'D') as AuditFreqRule['level'],
    freqPerYear: num(b.freqPerYear), auditType: str(b.auditType),
  }
}
function mapPlan(b: BPlan): AuditPlan {
  return {
    id: str(b.id), supId: str(b.supplierId), supName: '',
    type: lit<AuditPlan['type']>(b.auditType),
    planDate: str(b.planDate), auditor: str(b.auditLead),
    status: lit<AuditPlan['status']>(b.status), scope: str(b.scope),
  }
}
function mapRecord(b: BRecord): AuditRecord {
  return {
    id: str(b.id), supId: str(b.supplierId), supName: '', planId: str(b.planId),
    type: str(b.auditType), date: str(b.auditDate), auditor: str(b.auditLead),
    score: num(b.score), result: lit<AuditRecord['result']>(b.result), status: str(b.status),
    ncCount: num(b.ncCount),
  }
}
function mapNc(b: BNc): NcItem {
  return {
    id: str(b.id), arId: str(b.recordId), supId: str(b.supplierId), supName: '',
    desc: str(b.description), clause: str(b.clause), level: lit<NcItem['level']>(b.level),
    status: lit<NcItem['status']>(b.status), deadline: str(b.deadline), responsible: str(b.responsible),
  }
}
function mapAbnormal(b: BAbnormal): Abnormal {
  return {
    id: str(b.id), lotId: str(b.lotId), supId: str(b.supplierId),
    supName: '', partNo: str(b.partNo), partName: str(b.partName), desc: str(b.description),
    qty: num(b.qty), level: lit<Abnormal['level']>(b.level), date: str(b.occurDate),
    handler: '', status: lit<Abnormal['status']>(str(b.status) || '待处理'),
    d8Id: b.d8Id ? str(b.d8Id) : null,
    capaId: b.capaId ? str(b.capaId) : null,
    rectifyType: b.rectifyType ? str(b.rectifyType) : null,
    noticeSent: false, noticeDate: null, noticeContent: null,
    planDate: null, extensionApproved: false, extensionDate: null, measures: null,
    measuresDate: null, measuresContent: null, measureLogs: [],
    verifyResult: null, verifyDate: null, verifyComment: null, returnReason: null,
    batchTrack: [], closeDate: b.closeDate ? str(b.closeDate) : null, closeAuditor: null, archived: false,
    notify7: false, notify14: false, notify21: false, overdueDays: num(b.overdueDays),
    triggerRule: lit<Abnormal['triggerRule']>(''),
  }
}
function mapChange(b: BChange): ChangeOrder {
  return {
    id: str(b.id), title: str(b.title), supId: str(b.supplierId), supName: '',
    partNo: str(b.partNo), type: lit<ChangeOrder['type']>(b.changeType), reason: str(b.reason),
    applicant: str(b.applicant), applyDate: str(b.applyDate), status: lit<ChangeOrder['status']>(b.status),
    urgency: lit<ChangeOrder['urgency']>(b.urgency), strictFlag: !!b.strictFlag,
  }
}
/** 根据变更单状态构建工作流步骤(前端展示用) */
function buildChangeWorkflow(o: ChangeOrder): ChangeWorkflowStep[] {
  const steps: ChangeWorkflowStep[] = [
    { step: '提交变更申请', operator: o.applicant, date: o.applyDate, action: '发起', status: 'done' },
    { step: '变更评估(FMEA)', operator: '', date: '', action: '评估', status: o.status === '待申请' ? 'pending' : 'done' },
    { step: '并行会签(质量/采购/研发)', operator: '', date: '', action: '会签', status: (['待申请'].includes(o.status)) ? 'pending' : (['审批中'].includes(o.status) ? 'doing' : 'done') },
    { step: '质量一票否决', operator: '', date: '', action: '否决/通过', status: o.status === '已批准' || o.status === '已执行' || o.status === '已关闭' ? 'done' : (o.status === '已驳回' ? 'done' : 'pending') },
    { step: '更新检验标准+SOP', operator: '', date: '', action: '更新', status: o.status === '已执行' || o.status === '已关闭' ? 'done' : 'pending' },
    { step: '解冻收货+加严检验', operator: '', date: '', action: '执行', status: o.status === '已关闭' ? 'done' : 'pending' },
  ]
  return steps
}
function mapFmea(b: BFmea): FmeaItem {
  return {
    id: str(b.id), supId: '', supName: '', partNo: str(b.product), partName: str(b.process),
    failureMode: str(b.failureMode), effect: '', cause: '', severity: num(b.severityS),
    occurrence: num(b.occurrenceO), detection: num(b.detectionD), rpn: num(b.rpn),
    action: str(b.action), status: lit<FmeaItem['status']>(b.status), owner: str(b.owner),
    dueDate: str(b.targetDate),
  }
}
/** FMEA 风险项：后端 /v1/sqm/fmea 已含 rpn/severity/occurrence/detection，映射为 FmeaRisk 用于 Fmea.vue */
function mapFmeaRisk(b: BFmea): FmeaRisk {
  const rpn = num(b.rpn)
  const sev = num(b.severityS)
  const occ = num(b.occurrenceO)
  const det = num(b.detectionD)
  return {
    id: str(b.id), riskNo: str(b.riskNo), fmeaType: str(b.fmeaType),
    product: str(b.product), process: str(b.process), failureMode: str(b.failureMode),
    severity: sev, occurrence: occ, detection: det, rpn, riskLevel: str(b.riskLevel),
    highRiskFlag: !!b.highRiskFlag, status: lit<FmeaRisk['status']>(b.status || '进行中'),
    owner: str(b.owner), targetDate: str(b.targetDate), action: str(b.action),
    evidence: b.evidence ?? null, closeDate: b.closeDate ?? null,
  }
}
function mapFmeaTrack(b: BFmeaTrack): FmeaRiskTrack {
  return {
    id: str(b.id), riskId: str(b.riskId), fromStatus: b.fromStatus ?? null,
    toStatus: str(b.toStatus), operator: str(b.operator), operateTime: str(b.operateTime),
    actionNote: str(b.actionNote), evidence: b.evidence ?? null,
  }
}

// ---------- 8D / CAPA 后端 DTO ----------
interface B8dReport {
  id?: string; d8No?: string; source?: string; sourceRefId?: string
  issue?: string; severity?: string; currentStage?: string; status?: string
  flowType?: string; team?: string; capaTriggered?: boolean; closeDate?: string
  [k: string]: unknown
}
interface BCapa {
  id?: string; capaNo?: string; d8Id?: string; abnormalId?: string
  issue?: string; triggerStage?: string; triggerType?: string; triggerCondition?: string
  capaType?: string; rootcause?: string; actionPlan?: string; owner?: string
  dueDate?: string; progress?: number; status?: string; esignId?: string; closeDate?: string
  [k: string]: unknown
}

const D8_STAGE_NAMES: Record<string, string> = {
  D1: '建立小组', D2: '问题描述', D3: '临时措施', D4: '根因分析',
  D5: '永久对策', D6: '验证', D7: '预防再发', D8: '结案',
}
const D8_ORDER = ['D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8']
/** 依据 8D 当前阶段与整体状态，合成前端步骤条 stages */
function build8dStages(current?: string, status?: string): D8Stage[] {
  const idx = D8_ORDER.indexOf((current || 'D1').toUpperCase())
  return D8_ORDER.map((d, i) => {
    let s: 'done' | 'doing' | 'pending' = 'pending'
    if (status === '已闭环') s = 'done'
    else if (i < idx) s = 'done'
    else if (i === idx) s = 'doing'
    return { d, name: D8_STAGE_NAMES[d] || d, status: s }
  })
}
function map8dLink(r: B8dReport, capaId?: string): D8Link {
  const cur = (r.currentStage || 'D1').toUpperCase()
  return {
    id: str(r.id),
    d8No: str(r.d8No),
    source: str(r.source),
    sourceRefId: str(r.sourceRefId),
    issue: str(r.issue),
    severity: str(r.severity),
    stage: cur,
    currentStage: cur,
    status: str(r.status),
    flowType: str(r.flowType),
    team: str(r.team),
    capaTriggered: !!r.capaTriggered,
    capaId: capaId || (r.capaTriggered ? null : undefined),
    closeDate: r.closeDate ? str(r.closeDate) : null,
    stages: build8dStages(cur, r.status),
  }
}
function mapCapa(b: BCapa): Capa {
  return {
    id: str(b.id),
    type: lit<CapaType>(str(b.capaType) || '纠正措施'),
    source: str(b.triggerType),
    sourceId: str(b.d8Id || b.abnormalId),
    d8Id: str(b.d8Id),
    abnormalId: str(b.abnormalId),
    title: str(b.capaNo),
    problem: str(b.issue),
    rootcause: str(b.rootcause),
    corrective: { action: str(b.actionPlan), owner: str(b.owner), due: str(b.dueDate), status: '待执行', evidence: '' },
    preventive: { action: '', owner: '', due: '', status: '待执行', evidence: '' },
    owner: str(b.owner),
    dueDate: str(b.dueDate),
    status: lit<CapaStatus>(str(b.status) || '待启动'),
    effResult: null,
    closeDate: b.closeDate ? str(b.closeDate) : undefined,
    stages: [] as CapaStage[],
  }
}

/** 看板 KPI：后端 dashboard/incoming 适配为前端 SqmKpi + 扩展字段 */
function mapDashboardKpi(b: BDashboardIncoming): SqmKpi & {
  todayLots: number; passRate: number; pendingAbnormals: number
  top5BadSuppliers: { supplierId: string; supplierName: string; failCount: number }[]
  trend7d: { date: string; passRate: number; lots: number }[]
} {
  return {
    supplierCount: 0,
    qualifiedRate: num(b.passRate),
    pendingAudit: 0,
    openNc: num(b.pendingAbnormals),
    todayLots: num(b.todayLots),
    passRate: num(b.passRate),
    pendingAbnormals: num(b.pendingAbnormals),
    top5BadSuppliers: arr(b.top5BadSuppliers).map((s) => ({
      supplierId: str((s as { supplierId?: string }).supplierId),
      supplierName: str((s as { supplierName?: string }).supplierName),
      failCount: num((s as { failCount?: number }).failCount),
    })),
    trend7d: arr(b.trend7d).map((t) => ({
      date: str((t as { date?: string }).date),
      passRate: num((t as { passRate?: number }).passRate),
      lots: num((t as { lots?: number }).lots),
    })),
  }
}

export const sqmApi = {
  /** 来料看板 KPI：GET /v1/sqm/dashboard/incoming */
  getKpi: async () => {
    const res = await request.get<BDashboardIncoming>('/v1/sqm/dashboard/incoming')
    return mapDashboardKpi(res ?? {})
  },
  getSuppliers: async (params?: { keyword?: string }): Promise<Supplier[]> => {
    const res = await request.get<BSupplier[]>('/v1/sqm/suppliers')
    const list = arr<BSupplier>(res).map(mapSupplier)
    if (params?.keyword) {
      const k = params.keyword.toLowerCase()
      return list.filter((s) => s.name.toLowerCase().includes(k) || s.code.toLowerCase().includes(k))
    }
    return list
  },
  getAuditPlans: async (): Promise<AuditPlan[]> => {
    const res = await request.get<BPlan[]>('/v1/sqm/audits/plans')
    return arr<BPlan>(res).map(mapPlan)
  },
  getAuditRecords: async (): Promise<AuditRecord[]> => {
    const res = await request.get<BRecord[]>('/v1/sqm/audits/records')
    return arr<BRecord>(res).map(mapRecord)
  },
  getNcItems: async (): Promise<NcItem[]> => {
    const res = await request.get<BNc[]>('/v1/sqm/audits/ncs')
    return arr<BNc>(res).map(mapNc)
  },
  getChangeOrders: async (): Promise<ChangeOrder[]> => {
    const res = await request.get<BChange[]>('/v1/sqm/changes')
    return arr<BChange>(res).map(mapChange)
  },
  getAbnormals: async (): Promise<Abnormal[]> => {
    const res = await request.get<BAbnormal[]>('/v1/sqm/abnormals')
    return arr<BAbnormal>(res).map(mapAbnormal)
  },
  getFmeaItems: async (): Promise<FmeaItem[]> => {
    const res = await request.get<BFmea[]>('/v1/sqm/fmea')
    return arr<BFmea>(res).map(mapFmea)
  },
  /** FMEA 风险项列表：GET /v1/sqm/fmea?status= */
  getFmeaRisks: async (status?: string): Promise<FmeaRisk[]> => {
    const res = await request.get<BFmea[]>('/v1/sqm/fmea', { params: status ? { status } : {} })
    return arr<BFmea>(res).map(mapFmeaRisk)
  },
  /** FMEA 类型：GET /v1/sqm/fmea/types */
  getFmeaTypes: async (): Promise<string[]> => {
    const res = await request.get<string[]>('/v1/sqm/fmea/types')
    return arr<string>(res)
  },
  /** 依据 S/O/D 预测 RPN 与风险等级：GET /v1/sqm/fmea/predict */
  predictRisk: async (severity: number, occurrence: number, detection: number) => {
    const res = await request.get<Record<string, unknown>>('/v1/sqm/fmea/predict', {
      params: { severity, occurrence, detection },
    })
    return (res && typeof res === 'object' ? res : {}) as { rpn: number; riskLevel: string; highRisk: boolean }
  },
  /** FMEA 风险项闭环轨迹：GET /v1/sqm/fmea/:id/tracks */
  getFmeaTracks: async (id: string): Promise<FmeaRiskTrack[]> => {
    const res = await request.get<BFmeaTrack[]>(`/v1/sqm/fmea/${id}/tracks`)
    return arr<BFmeaTrack>(res).map(mapFmeaTrack)
  },
  /** 更新 FMEA 风险项(措施分配/评分/状态)：PUT /v1/sqm/fmea/:id */
  updateFmea: async (id: string, body: Partial<FmeaRisk>): Promise<FmeaRisk> => {
    const res = await request.put<FmeaRisk>(`/v1/sqm/fmea/${id}`, body)
    return (res && typeof res === 'object' ? res : {}) as FmeaRisk
  },
  /** 来料分析：GET /v1/sqm/analysis/incoming?dim=supplierId|partNo|inspectResult */
  getAnalysisIncoming: async (dim: 'supplierId' | 'partNo' | 'inspectResult' = 'supplierId') => {
    const res = await request.get<Record<string, unknown>[]>('/v1/sqm/analysis/incoming', { params: { dim } })
    return arr<Record<string, unknown>>(res)
  },
  /** 异常分析：GET /v1/sqm/analysis/abnormal?dim=supplierId */
  getAnalysisAbnormal: async (dim: 'supplierId' | 'partNo' | 'inspectResult' = 'supplierId') => {
    const res = await request.get<Record<string, unknown>[]>('/v1/sqm/analysis/abnormal', { params: { dim } })
    return arr<Record<string, unknown>>(res)
  },
  /** 供应商绩效排名：基于真实绩效数据按最新周期聚合计算（后端无独立 ranking 端点，前端聚合避免静态数据） */
  getPerformanceRanking: async (period?: string) => {
    const all = await sqmApi.getPerformance()
    const best = new Map<string, SupplierPerformance>()
    for (const p of all) {
      if (period && p.period !== period) continue
      const prev = best.get(p.supplierId)
      if (!prev || p.period > prev.period) best.set(p.supplierId, p)
    }
    return Array.from(best.values()).map((p) => ({
      supplierId: p.supplierId,
      supplierName: '',
      score: p.score,
      delivery: p.deliveryTimelyRate ?? 0,
      quality: p.incomingPassRate ?? 0,
      service: p.serviceScore ?? 0,
      level: p.level,
      period: p.period,
    }))
  },
  /** 供应商绩效列表：GET /v1/sqm/performance?supplierId= */
  getPerformance: async (supplierId?: string): Promise<SupplierPerformance[]> => {
    const res = await request.get<Record<string, unknown>[]>('/v1/sqm/performance', {
      params: supplierId ? { supplierId } : {},
    })
    return arr<Record<string, unknown>>(res).map(mapPerformance)
  },
  /** 采集并自动计算绩效：POST /v1/sqm/performance/calc?supplierId=&period= */
  calcPerformance: async (supplierId: string, period: string): Promise<SupplierPerformance> => {
    const res = await request.post<Record<string, unknown>>('/v1/sqm/performance/calc', {}, {
      params: { supplierId, period },
    })
    return mapPerformance((res && typeof res === 'object' ? res : {}) as Record<string, unknown>)
  },
  /** 新增绩效记录：POST /v1/sqm/performance */
  createPerformance: async (data: Partial<SupplierPerformance>): Promise<SupplierPerformance> => {
    const res = await request.post<Record<string, unknown>>('/v1/sqm/performance', data)
    return mapPerformance((res && typeof res === 'object' ? res : {}) as Record<string, unknown>)
  },
  /** 评级规则：GET /v1/sqm/grade-rules */
  getGradeRules: async (): Promise<GradeRule[]> => {
    const res = await request.get<Record<string, unknown>[]>('/v1/sqm/grade-rules')
    return arr<Record<string, unknown>>(res).map(mapGradeRule)
  },
  createGradeRule: async (data: Partial<GradeRule>): Promise<GradeRule> => {
    const res = await request.post<Record<string, unknown>>('/v1/sqm/grade-rules', data)
    return mapGradeRule((res && typeof res === 'object' ? res : {}) as Record<string, unknown>)
  },
  updateGradeRule: async (data: Partial<GradeRule>): Promise<void> => {
    await request.put('/v1/sqm/grade-rules', data)
  },
  deleteGradeRule: async (id: string): Promise<void> => {
    await request.delete(`/v1/sqm/grade-rules/${id}`)
  },
  /** 份额：GET /v1/sqm/shares?supplierId= */
  getShares: async (supplierId?: string): Promise<SupplierShare[]> => {
    const res = await request.get<Record<string, unknown>[]>('/v1/sqm/shares', {
      params: supplierId ? { supplierId } : {},
    })
    return arr<Record<string, unknown>>(res).map(mapShare)
  },
  createShare: async (data: Partial<SupplierShare>): Promise<SupplierShare> => {
    const res = await request.post<Record<string, unknown>>('/v1/sqm/shares', data)
    return mapShare((res && typeof res === 'object' ? res : {}) as Record<string, unknown>)
  },
  /** 升级与淘汰：GET /v1/sqm/escalations?supplierId= */
  getEscalations: async (supplierId?: string): Promise<SupplierEscalation[]> => {
    const res = await request.get<Record<string, unknown>[]>('/v1/sqm/escalations', {
      params: supplierId ? { supplierId } : {},
    })
    return arr<Record<string, unknown>>(res).map(mapEscalation)
  },
  createEscalation: async (data: Partial<SupplierEscalation>): Promise<SupplierEscalation> => {
    const res = await request.post<Record<string, unknown>>('/v1/sqm/escalations', data)
    return mapEscalation((res && typeof res === 'object' ? res : {}) as Record<string, unknown>)
  },
  /** 审核频次规则：GET /v1/sqm/audit-freq-rules */
  getAuditFreqRules: async (): Promise<AuditFreqRule[]> => {
    const res = await request.get<Record<string, unknown>[]>('/v1/sqm/audit-freq-rules')
    return arr<Record<string, unknown>>(res).map(mapFreqRule)
  },
  createAuditFreqRule: async (data: Partial<AuditFreqRule>): Promise<AuditFreqRule> => {
    const res = await request.post<Record<string, unknown>>('/v1/sqm/audit-freq-rules', data)
    return mapFreqRule((res && typeof res === 'object' ? res : {}) as Record<string, unknown>)
  },
  updateAuditFreqRule: async (data: Partial<AuditFreqRule>): Promise<void> => {
    await request.put('/v1/sqm/audit-freq-rules', data)
  },
  deleteAuditFreqRule: async (id: string): Promise<void> => {
    await request.delete(`/v1/sqm/audit-freq-rules/${id}`)
  },
  // ---------- 以下后端无对应业务数据的接口，返回空 ----------
  /** 追溯树：后端无接口，返回空数组（Trace.vue 仍可使用 sqmTrace 逻辑层渲染空状态） */
  getTraceTree: async (_lotId: string): Promise<TraceNode[]> => [],
  /** CAPA 列表：GET /v1/ncm/capas */
  getCapaList: async (): Promise<Capa[]> => {
    const res = await request.get<BCapa[]>('/v1/ncm/capas')
    return arr<BCapa>(res).map(mapCapa)
  },
  /** 供应商生命周期：后端无接口，返回空 */
  getSupplierLifecycles: async (): Promise<SupLifecycle[]> => [],
  /** 8D 报告列表：GET /v1/ncm/8d-reports（前端 8D 概览与推进用） */
  get8dReports: async (): Promise<D8Link[]> => {
    const reports = await request.get<B8dReport[]>('/v1/ncm/8d-reports')
    const capas = await request.get<BCapa[]>('/v1/ncm/capas').catch(() => [] as BCapa[])
    const capaByD8 = new Map<string, string>()
    arr<BCapa>(capas).forEach((c) => { if (c.d8Id) capaByD8.set(str(c.d8Id), str(c.id)) })
    return arr<B8dReport>(reports).map((r) => map8dLink(r, capaByD8.get(str(r.id))))
  },
  /** D8 链接：按来源异常单 sourceRefId 建索引，供异常单关联展示 */
  getD8Links: async (): Promise<Record<string, D8Link>> => {
    const links = await sqmApi.get8dReports()
    const map: Record<string, D8Link> = {}
    links.forEach((l) => { const ref = l.sourceRefId; if (ref) map[ref] = l })
    return map
  },
  /** 变更评估资料：基于变更单状态推导（提交后即视为已提供变更说明+验证报告） */
  getChangeDocs: async (): Promise<Record<string, ChangeDoc>> => {
    const orders = await sqmApi.getChangeOrders()
    const map: Record<string, ChangeDoc> = {}
    orders.forEach((o) => {
      const submitted = o.status !== '待申请'
      map[o.id] = {
        changeNote: submitted,
        verifyReport: submitted,
        fmea: o.status === '已批准' || o.status === '已执行' || o.status === '已关闭',
      }
    })
    return map
  },
  /** 变更并行审批：批量取变更单详情(含会签记录)映射为前端 ChangeApproval */
  getChangeApprovals: async (): Promise<Record<string, ChangeApproval>> => {
    const orders = await sqmApi.getChangeOrders()
    const ids = orders.map((o) => o.id)
    if (ids.length === 0) return {}
    const res = await request.post<Record<string, { order: any; approvals: any[] }>>('/v1/sqm/changes/batch-detail', ids)
    const details = (res as any) || {}
    const map: Record<string, ChangeApproval> = {}
    function mapNode(a: any): ChangeApprovalNode {
      if (!a || typeof a !== 'object') return { status: 'pending', operator: '', date: undefined, veto: false, note: undefined }
      let st: ChangeApprovalNode['status'] = 'pending'
      if (a.status === 'done' || a.status === 'approved') st = 'done'
      else if (a.status === 'rejected') st = 'veto'
      else if (a.status === 'doing') st = 'doing'
      return {
        status: st,
        operator: a.operator || '',
        date: a.operateDate || undefined,
        veto: a.status === 'rejected' || !!a.hasVeto,
        note: a.opinion || undefined,
      }
    }
    for (const [id, vo] of Object.entries(details)) {
      if (!vo || typeof (vo as any) !== 'object') continue
      const approvals = (vo as any).approvals || []
      const byRole: Record<string, any> = {}
      approvals.forEach((a: any) => { byRole[a.approvalRole] = a })
      map[id] = {
        quality: mapNode(byRole.quality),
        purchase: mapNode(byRole.purchase),
        rd: mapNode(byRole.rd),
        trial: mapNode(byRole.trial),
      }
    }
    return map
  },
  /** 变更详情：基于变更单数据推导工作流 */
  getChangeDetails: async (): Promise<Record<string, ChangeDetail>> => {
    const orders = await sqmApi.getChangeOrders()
    const map: Record<string, ChangeDetail> = {}
    orders.forEach((o) => {
      map[o.id] = {
        workflow: buildChangeWorkflow(o),
        impact: `${o.partNo || '未指定'} 物料变更 · 类型:${o.type} · 紧急程度:${o.urgency}`,
        strictPlan: o.strictFlag ? '连续3批加严检验(AQL提一级)' : '无加严计划',
      }
    })
    return map
  },
  /** 加严检验：GET /v1/sqm/strict-inspects */
  getStrictInspects: async (): Promise<StrictInspect[]> => {
    const res = await request.get<StrictInspect[]>('/v1/sqm/strict-inspects')
    return arr<StrictInspect>(res)
  },

  // ---- 写操作 ----
  createSupplier: async (data: Record<string, unknown>): Promise<void> => {
    await request.post('/v1/sqm/suppliers', data)
  },
  updateSupplier: async (id: string, data: Record<string, unknown>): Promise<void> => {
    await request.put('/v1/sqm/suppliers', { ...data, id })
  },
  deleteSupplier: async (id: string): Promise<void> => {
    await request.delete(`/v1/sqm/suppliers/${id}`)
  },
  createAuditPlan: async (data: Record<string, unknown>): Promise<void> => {
    await request.post('/v1/sqm/audits/plans', data)
  },
  /** 确认排期：PUT /v1/sqm/audits/plans/{id}/confirm（计划中→待执行） */
  confirmAuditPlan: async (id: string): Promise<void> => {
    await request.put(`/v1/sqm/audits/plans/${id}/confirm`)
  },
  /** 启动审核计划：POST /v1/sqm/audits/plans/{id}/start（状态置「进行中」） */
  startAuditPlan: async (id: string): Promise<{ id: string }> => {
    return await request.post(`/v1/sqm/audits/plans/${id}/start`)
  },
  createAuditRecord: async (data: Record<string, unknown>): Promise<{ id: string }> => {
    return await request.post('/v1/sqm/audits/records', data)
  },
  createAuditNc: async (data: Record<string, unknown>): Promise<void> => {
    await request.post('/v1/sqm/audits/ncs', data)
  },
  closeAuditNc: async (ncId: string, verifyResult: string, verifyComment: string): Promise<void> => {
    await request.post(`/v1/sqm/audits/ncs/${ncId}/close`, { verifyResult, verifyComment })
  },
  createChange: async (data: Record<string, unknown>): Promise<void> => {
    await request.post('/v1/sqm/changes', data)
  },
  submitChange: async (changeId: string): Promise<void> => {
    await request.post(`/v1/sqm/changes/${changeId}/submit`)
  },
  approveChange: async (changeId: string, approvalRole: string, approved: boolean, opinion: string): Promise<void> => {
    await request.post(`/v1/sqm/changes/${changeId}/approve`, { approvalRole, approved, opinion })
  },
  /** 并行会签电子签名校验(用户名+密码,与首件检验录入一致)。仅校验不落库。 */
  verifySign: async (changeId: string, approvalRole: string, username: string, password: string): Promise<void> => {
    await request.post(`/v1/sqm/changes/${changeId}/verify-sign`, {}, {
      params: { approvalRole, username, password },
    })
  },
  closeChange: async (changeId: string): Promise<void> => {
    await request.post(`/v1/sqm/changes/${changeId}/close`)
  },
  /** 新增加严检验批次：POST /v1/sqm/strict-inspects */
  createStrictInspect: async (data: Record<string, unknown>): Promise<void> => {
    await request.post('/v1/sqm/strict-inspects', data)
  },
  /** 恢复正常检验：POST /v1/sqm/strict-inspects/{id}/restore */
  restoreStrictInspect: async (inspectId: string): Promise<void> => {
    await request.post(`/v1/sqm/strict-inspects/${inspectId}/restore`)
  },
  createLot: async (data: Record<string, unknown>): Promise<SqmIncomingLot> => {
    const res = await request.post<SqmIncomingLot>('/v1/sqm/lots', data)
    return (res && typeof res === 'object' ? res : ({} as SqmIncomingLot))
  },
  createTraceNode: async (data: Record<string, unknown>): Promise<void> => {
    await request.post('/v1/sqm/trace/nodes', data)
  },
  /** 批量追溯录入:一次投料(支持混批),POST /v1/sqm/trace/nodes/batch */
  batchCreateNodes: async (data: {
    orgId?: string; woNo: string; processCode?: string; shift?: string
    inputs: { lotNo: string; qty: number }[]
    outputs: { batchNo: string; qty?: number; snPrefix?: string; snCount?: number }[]
  }): Promise<void> => {
    await request.post('/v1/sqm/trace/nodes/batch', data)
  },
  createAbnormal: async (data: Record<string, unknown>): Promise<void> => {
    await request.post('/v1/sqm/abnormals', data)
  },
  closeAbnormal: async (abnormalId: string, disposal: string, disposalRemark: string): Promise<void> => {
    await request.post(`/v1/sqm/abnormals/${abnormalId}/close`, { disposal, disposalRemark })
  },
  /** V21: 持久化异常整改记录（通知/措施/验证/批验/关闭） */
  saveAbnormalRectification: async (abnormalId: string, payload: Record<string, unknown>): Promise<void> => {
    await request.put(`/v1/sqm/abnormals/${abnormalId}/rectification`, payload)
  },
  /** V21: 加载整改记录（措施列表 + 三批验证列表） */
  loadAbnormalRectification: async (abnormalId: string): Promise<{ measures: any[]; batchVerifies: any[] }> => {
    return await request.get(`/v1/sqm/abnormals/${abnormalId}/rectification`)
  },
  /** 手动触发重复问题升级扫描 */
  triggerEscalation: async (): Promise<void> => {
    await request.post(`/v1/sqm/abnormals/check-escalation`)
  },
  // ---- 8D / CAPA 闭环写操作 ----
  /** 由来料异常单发起 8D：POST /v1/ncm/8d-reports/launch（body 需带 sourceRefId），返回新建的 8D 报告 */
  launch8d: async (abnormalId: string, payload: {
    issue?: string; severity?: string; team?: string
  }): Promise<{ id: string; d8No?: string }> => {
    const res = await request.post<{ id: string; d8No?: string }>('/v1/ncm/8d-reports/launch', {
      sourceRefId: abnormalId,
      source: 'SQM异常',
      issue: payload.issue,
      severity: payload.severity,
      team: payload.team,
    })
    return res ?? { id: '' }
  },
  /** 推进 8D 当前阶段：POST /v1/ncm/8d-reports/{id}/advance（D4 触发 CAPA，D8 闭环） */
  advance8d: async (id: string, stageCode: string): Promise<void> => {
    await request.post(`/v1/ncm/8d-reports/${id}/advance`, { stageCode })
  },
  /** 发起 CAPA：POST /v1/ncm/capas（可关联异常单 abnormalId 或 8D 的 d8Id） */
  createCapa: async (data: {
    capaNo?: string; abnormalId?: string; d8Id?: string; capaType?: string; issue?: string
    rootcause?: string; actionPlan?: string; owner?: string; dueDate?: string
    triggerType?: string; triggerStage?: string
  }): Promise<void> => {
    await request.post('/v1/ncm/capas', data)
  },
  /** 更新 CAPA 进度：POST /v1/ncm/capas/{id}/progress?progress=（progress=100 时后端自动置为已验证） */
  updateCapaProgress: async (id: string, progress: number): Promise<void> => {
    await request.post(`/v1/ncm/capas/${id}/progress?progress=${progress}`)
  },
  /** 关闭 CAPA：POST /v1/ncm/capas/{id}/close（级联闭环 8D 与异常单） */
  closeCapa: async (id: string): Promise<void> => {
    await request.post(`/v1/ncm/capas/${id}/close`)
  },
  createFmea: async (data: Record<string, unknown>): Promise<void> => {
    await request.post('/v1/sqm/fmea', data)
  },
  closeFmea: async (fmeaId: string, payload: { evidence: string; note?: string; recurrenceVerified: boolean }): Promise<FmeaRisk> => {
    const res = await request.post<FmeaRisk>(`/v1/sqm/fmea/${fmeaId}/close`, payload)
    return (res && typeof res === 'object' ? res : {}) as FmeaRisk
  },

  // ---------- 来料追溯（真实后端接口，11 个新端点） ----------
  /** 来料批次列表：GET /v1/sqm/lots */
  listLots: async (): Promise<SqmIncomingLot[]> => {
    const res = await request.get<SqmIncomingLot[]>('/v1/sqm/lots')
    return arr<SqmIncomingLot>(res)
  },
  /** 递归追溯树(WITH RECURSIVE)：GET /v1/sqm/trace/tree-recursive?rootLotId= */
  getTraceTreeRecursive: async (rootLotId: string): Promise<SqmTraceNode[]> => {
    const res = await request.get<SqmTraceNode[]>('/v1/sqm/trace/tree-recursive', { params: { rootLotId } })
    return arr<SqmTraceNode>(res)
  },
  /** 完整追溯树(嵌套 + 明细 + 供应商)：GET /v1/sqm/trace/full-tree?rootLotId= */
  getFullTraceTree: async (rootLotId: string): Promise<TraceFullTreeVO> => {
    const res = await request.get<TraceFullTreeVO>('/v1/sqm/trace/full-tree', { params: { rootLotId } })
    return (res && typeof res === 'object' ? res : {}) as TraceFullTreeVO
  },
  /** 原料追溯明细：GET /v1/sqm/trace/nodes/{nodeId}/raw-detail（无则返回 null） */
  getRawDetail: async (nodeId: string): Promise<SqmTraceRawDetail | null> => {
    const res = await request.get<SqmTraceRawDetail>(`/v1/sqm/trace/nodes/${nodeId}/raw-detail`)
    return res && typeof res === 'object' && Object.keys(res).length ? res : null
  },
  /** 保存原料追溯明细(upsert)：PUT /v1/sqm/trace/nodes/{nodeId}/raw-detail */
  upsertRawDetail: async (nodeId: string, data: SqmTraceRawDetail): Promise<void> => {
    await request.put(`/v1/sqm/trace/nodes/${nodeId}/raw-detail`, data)
  },
  /** 产品追溯明细：GET /v1/sqm/trace/nodes/{nodeId}/product-detail（无则返回 null） */
  getProductDetail: async (nodeId: string): Promise<SqmTraceProductDetail | null> => {
    const res = await request.get<SqmTraceProductDetail>(`/v1/sqm/trace/nodes/${nodeId}/product-detail`)
    return res && typeof res === 'object' && Object.keys(res).length ? res : null
  },
  /** 保存产品追溯明细(upsert)：PUT /v1/sqm/trace/nodes/{nodeId}/product-detail */
  upsertProductDetail: async (nodeId: string, data: SqmTraceProductDetail): Promise<void> => {
    await request.put(`/v1/sqm/trace/nodes/${nodeId}/product-detail`, data)
  },
  /** 关键件 SN 列表(逐件追溯)：GET /v1/sqm/key-part-sns?lotId= */
  listKeyPartSn: async (lotId: string): Promise<SqmKeyPartSn[]> => {
    const res = await request.get<SqmKeyPartSn[]>('/v1/sqm/key-part-sns', { params: { lotId } })
    return arr<SqmKeyPartSn>(res)
  },
  /** 创建关键件 SN：POST /v1/sqm/key-part-sns */
  createKeyPartSn: async (data: SqmKeyPartSn): Promise<void> => {
    await request.post('/v1/sqm/key-part-sns', data)
  },
  /** 全局追溯节点检索(分页,不限定来料批次)：GET /v1/sqm/trace/nodes/search?nodeType&keyword&orgId&page&size */
  searchTraceNodes: async (params: { nodeType?: string; keyword?: string; orgId?: string; page?: number; size?: number }): Promise<PageResult<TraceNodeSearchVO>> => {
    const res = await request.get<PageResult<TraceNodeSearchVO>>('/v1/sqm/trace/nodes/search', { params })
    return (res && typeof res === 'object' ? res : { records: [], total: 0, page: 1, size: 20 }) as PageResult<TraceNodeSearchVO>
  },

  // ---------- 追溯工作台(无来料批次依赖的新录入模型) ----------

  /** 列出当前组织的全部追溯树根节点: GET /v1/sqm/trace/roots?orgId= */
  listTraceRoots: async (orgId: string): Promise<SqmTraceNode[]> => {
    const res = await request.get<SqmTraceNode[]>('/v1/sqm/trace/roots', { params: { orgId } })
    return arr<SqmTraceNode>(res)
  },
  /** 按树根节点 id 取完整嵌套树: GET /v1/sqm/trace/full-tree-by-root?rootNodeId= */
  getTraceTreeByRoot: async (rootNodeId: string): Promise<TraceFullTreeVO> => {
    const res = await request.get<TraceFullTreeVO>('/v1/sqm/trace/full-tree-by-root', { params: { rootNodeId } })
    return (res && typeof res === 'object' ? res : {}) as TraceFullTreeVO
  },
  /** 以任意节点为根向下展开下游子树: GET /v1/sqm/trace/tree-from-node?nodeId= */
  getTraceTreeFromNode: async (nodeId: string): Promise<TraceFullTreeVO> => {
    const res = await request.get<TraceFullTreeVO>('/v1/sqm/trace/tree-from-node', { params: { nodeId } })
    return (res && typeof res === 'object' ? res : {}) as TraceFullTreeVO
  },
  /** 建一个产出/头节点(semi/ship/customer)+明细: POST /v1/sqm/trace/nodes/save */
  saveTraceNode: async (data: TraceNodeSaveRequest): Promise<SqmTraceNode> => {
    const res = await request.post<SqmTraceNode>('/v1/sqm/trace/nodes/save', data)
    return (res && typeof res === 'object' ? res : {}) as SqmTraceNode
  },
  /** 给某节点挂一个组成(raw/semi): POST /v1/sqm/trace/nodes/{parentId}/components */
  attachComponent: async (parentId: string, item: TraceComponentItem): Promise<SqmTraceNode> => {
    const res = await request.post<SqmTraceNode>(`/v1/sqm/trace/nodes/${parentId}/components`, item)
    return (res && typeof res === 'object' ? res : {}) as SqmTraceNode
  },
  /** 查询节点完整详情(主表全部字段+明细+供应商+组成关系): GET /v1/sqm/trace/nodes/{nodeId}/detail */
  getTraceNodeDetail: async (nodeId: string): Promise<TraceNodeFullVO> => {
    const res = await request.get<TraceNodeFullVO>(`/v1/sqm/trace/nodes/${nodeId}/detail`)
    return (res && typeof res === 'object' ? res : {}) as TraceNodeFullVO
  },
  /** 按方向追溯: GET /v1/sqm/trace/nodes/{nodeId}/direction?direction=forward|backward|both */
  traceDirection: async (nodeId: string, direction: 'forward' | 'backward' | 'both' = 'both'): Promise<TraceDirectionNode[]> => {
    const res = await request.get<TraceDirectionNode[]>(`/v1/sqm/trace/nodes/${nodeId}/direction`, { params: { direction } })
    return arr<TraceDirectionNode>(res)
  },
  /** 审核报告归档查询：GET /v1/sqm/audits/records/{id}/archive */
  getAuditArchive: async (recordId: string): Promise<SqmAuditReportArchive[]> => {
    const res = await request.get<SqmAuditReportArchive[]>(`/v1/sqm/audits/records/${recordId}/archive`)
    return arr<SqmAuditReportArchive>(res)
  },
  /** 触发审核报告归档(PDF+SHA256+15年)：POST /v1/sqm/audits/records/{id}/archive/generate */
  generateAuditArchive: async (recordId: string): Promise<SqmAuditReportArchive> => {
    const res = await request.post<SqmAuditReportArchive>(`/v1/sqm/audits/records/${recordId}/archive/generate`)
    return res ?? ({} as SqmAuditReportArchive)
  },

  // ---------- 统一归档（跨模块 UNION） ----------
  /** 统一归档查询：GET /v1/archives?type&keyword&page&size */
  getArchives: async (params: { type?: string; keyword?: string; page?: number; size?: number }): Promise<ArchiveItem[]> => {
    const res = await request.get<ArchiveItem[]>('/v1/archives', { params })
    return arr<ArchiveItem>(res)
  },
  /** 留存到期提醒：GET /v1/archives/expiring?days= */
  getArchivesExpiring: async (days = 30): Promise<ArchiveExpiringItem[]> => {
    const res = await request.get<ArchiveExpiringItem[]>('/v1/archives/expiring', { params: { days } })
    return arr<ArchiveExpiringItem>(res)
  },

  // ---------- IQC 来料检验 ----------
  /** IQC 待检任务列表：GET /api/sqm/iqc/tasks */
  iqcListTasks: async (params: { orgId?: string; partNo?: string; supplierId?: string } = {}): Promise<any[]> => {
    const res = await request.get<any>('/sqm/iqc/tasks', { params })
    return arr<any>(unwrap<any[]>(res))
  },
  /** IQC 按物料+供应商匹配检验标准：GET /api/sqm/iqc/match-std */
  iqcMatchStd: async (orgId: string, partNo: string, supplierId?: string): Promise<any> => {
    const res = await request.get<any>('/sqm/iqc/match-std', { params: { orgId, partNo, supplierId } })
    return unwrap<any>(res) ?? res ?? null
  },
  /** IQC 检验标准明细项列表：GET /api/sqm/iqc/stds/{stdId}/items */
  iqcListItems: async (stdId: string): Promise<any[]> => {
    const res = await request.get<any>(`/sqm/iqc/stds/${stdId}/items`)
    return arr<any>(unwrap<any[]>(res))
  },
  /** IQC 提交检验结果：POST /api/sqm/iqc/inspect */
  iqcSubmitInspect: async (data: Record<string, unknown>): Promise<any> => {
    const res = await request.post<any>('/sqm/iqc/inspect', data)
    return unwrap<any>(res) ?? res ?? {}
  },
  /** IQC 按来料批次查询检验记录：GET /api/sqm/iqc/inspect/record?lotId= */
  iqcGetRecord: async (lotId: string): Promise<any> => {
    const res = await request.get<any>('/sqm/iqc/inspect/record', { params: { lotId } })
    return unwrap<any>(res) ?? res ?? null
  },
  /** IQC 检验明细结果列表：GET /api/sqm/iqc/inspect/items?recordId= */
  iqcListItemResults: async (recordId: string): Promise<any[]> => {
    const res = await request.get<any>('/sqm/iqc/inspect/items', { params: { recordId } })
    return arr<any>(unwrap<any[]>(res))
  },
}
