/**
 * SQM 供应商质量类型定义
 * 从 HTML 原型 MOCK.sqm 提取
 */

export interface Supplier {
  id: string
  name: string
  code: string
  category: string
  level: 'A' | 'B' | 'C' | 'D'
  status: '待审核' | '合格' | '观察' | '整改中' | '不合格' | '启用' | '暂停' | '淘汰'
  score: number
  contact: string
  tel: string
  address: string
  cert: string
  lastAudit: string
  nextAudit: string
  supplierNo?: string
  /** 资质列表（后端 certs JSON 解析，含到期预警） */
  qualifications?: SupQualification[]
}

export interface AuditPlan {
  id: string
  supId: string
  supName: string
  type: '年度复审' | '过程审核' | '专项审核' | '飞行检查' | '初次审核' | '年度审核' | '附加审核' | '重新审核'
  planDate: string
  auditor: string
  status: '计划中' | '待执行' | '进行中' | '已完成' | '已取消'
  scope: string
}

export interface AuditRecord {
  id: string
  supId: string
  supName: string
  planId: string
  type: string
  date: string
  auditor: string
  result: '通过' | '有条件通过' | '不通过'
  score: number
  ncCount: number
  status: string
}

export interface NcItem {
  id: string
  arId: string
  supId: string
  supName: string
  desc: string
  clause: string
  level: '严重' | '一般' | '观察项'
  status: '待整改' | '整改中' | '已整改待验证' | '已验证' | '已关闭'
  deadline: string
  responsible: string
}

export interface ChangeOrder {
  id: string
  title: string
  supId: string
  supName: string
  partNo: string
  type: '材料升级' | '配方变更' | '工艺变更' | '材料变更' | '封装变更'
  reason: string
  applicant: string
  applyDate: string
  status: '待申请' | '审批中' | '已批准' | '已执行' | '已关闭'
  urgency: '高' | '中' | '低'
  strictFlag: boolean
}

export interface ChangeDoc {
  changeNote: boolean
  verifyReport: boolean
  fmea: boolean
}

export interface ChangeApprovalNode {
  status: 'done' | 'doing' | 'pending' | 'veto'
  operator: string
  date?: string
  veto?: boolean
  note?: string
  /** 电子签名落库：方式+时间 */
  signed?: string
}

export interface ChangeApproval {
  quality: ChangeApprovalNode
  purchase: ChangeApprovalNode
  rd: ChangeApprovalNode
  trial: { status: 'done' | 'doing' | 'pending'; operator: string; date?: string; note?: string }
}

export interface ChangeWorkflowStep {
  step: string
  operator: string
  date: string
  action: string
  status: 'done' | 'doing' | 'pending'
}

export interface ChangeDetail {
  workflow?: ChangeWorkflowStep[]
  impact: string
  strictPlan: string
}

// ===== 物料变更(§10)扩展状态：承载后端未暴露端点的流程节点 =====
export type ChangeRiskLevel = '高' | '中' | '低' | ''
export interface ChangeDocFile {
  name: string
  size: number
  uploadedAt: string
}
export interface ChangeExtLog {
  t: string
  msg: string
}
/** 并行会签电子签名落库记录 */
export interface ESignRecord {
  method: string
  ts: string
  signedAt: string
}
export interface ChangeExtState {
  /** E 冻结收货：变更未关闭前拦截 IQC 来料 */
  frozen: boolean
  /** G FMEA 风险预评估是否完成 */
  fmeaDone: boolean
  /** H 风险分级（驱动强制试产分支） */
  riskLevel: ChangeRiskLevel
  /** F 评估资料附件 */
  files: ChangeDocFile[]
  changeNote: boolean
  verifyReport: boolean
  /** H 小批试产 */
  trialStarted: boolean
  trialDone: boolean
  trialQty: number
  /** U 回滚变更 + 退货重评 */
  rollback: boolean
  rollbackReason: string
  returned: boolean
  /** 并行会签签名落库：key=quality/purchase/rd */
  esigns: Record<string, ESignRecord>
  log: ChangeExtLog[]
}

export interface StrictInspect {
  id: string
  changeId: string
  batchNo: string
  inspectType: string
  aql: string
  result: '合格' | '不合格' | '待检'
  date?: string
  seq: number
  totalSeq: number
  restored?: boolean
}

export interface TraceNode {
  id: string
  label: string
  type: 'material' | 'batch' | 'product' | 'ship' | 'process'
  parent?: string
  children?: TraceNode[]
  info?: {
    batchNo?: string
    qty?: number
    date?: string
    supplier?: string
    status?: string
  }
}

export interface AbnormalMeasure {
  content: string
  rootcause: string
  prevention: string
  deadline: string
  owner: string
}

export interface Attachment {
  name: string
  size: number // 字节
}

/** 整改措施执行记录（SR-CAR-007：每次更新形成时间线，支持附件） */
export interface MeasureLog {
  content: string
  completeDate: string
  operator: string
  evidence: Attachment[]
}

/** 连续三批合格验证批次记录（SR-CAR-009） */
export interface BatchResult {
  batchNo: string
  result: '合格' | '不合格'
  date: string
  linked: boolean
}

export interface Abnormal {
  id: string
  lotId: string
  supId: string
  supName: string
  partNo: string
  partName: string
  desc: string
  qty: number
  level: '严重' | '一般'
  date: string
  handler: string
  status: '待处理' | '整改中' | '待验证' | '三批验证' | '已关闭'
  d8Id: string | null
  capaId: string | null
  rectifyType?: string | null
  noticeSent: boolean
  noticeDate: string | null
  noticeContent: string | null
  planDate: string | null
  extensionApproved: boolean
  extensionDate: string | null
  measures: AbnormalMeasure | null
  measuresDate: string | null
  measuresContent: string | null
  // SR-CAR-007 措施执行时间线（逐次更新 + 附件）
  measureLogs: MeasureLog[]
  // SR-CAR-008 SQE验证
  verifyResult: string | null
  verifyDate: string | null
  verifyComment: string | null
  returnReason: string | null
  // SR-CAR-009 连续三批合格验证
  batchTrack: BatchResult[]
  // SR-CAR-012 闭环归档
  closeDate: string | null
  closeAuditor: string | null
  archived: boolean
  // SR-CAR-010/011 超期升级通知（已触发标记）
  notify7: boolean
  notify14: boolean
  notify21: boolean
  overdueDays: number
  // SR-CAR-001 / SR-CAR-002 整改触发意见：严重1件即触发(一键即触发) 或 一般不良累计≥3件(滚动30天)
  triggerRule: '一键即触发' | '累计≥3件' | ''
}

export interface D8Stage {
  d: string
  name: string
  status: 'done' | 'doing' | 'pending'
  date?: string
  operator?: string
}

export interface D8Link {
  id: string
  d8No?: string
  source?: string
  sourceRefId?: string
  issue?: string
  severity?: string
  stage: string
  currentStage?: string
  status?: string
  flowType?: string
  team?: string
  capaTriggered: boolean
  capaId?: string | null
  closeDate?: string | null
  stages: D8Stage[]
}

export interface FmeaItem {
  id: string
  supId: string
  supName: string
  partNo: string
  partName: string
  failureMode: string
  effect: string
  cause: string
  severity: number
  occurrence: number
  detection: number
  rpn: number
  action: string
  status: '未开始' | '进行中' | '已完成'
  owner: string
  dueDate: string
}

/** FMEA 高风险项（RPN≥100，对应 HTML MOCKX.fmeaRisk.highRisks） */
export interface FmeaRisk {
  id: string
  riskNo?: string
  fmeaType?: string
  product: string
  process: string
  failureMode: string
  severity: number
  occurrence: number
  detection: number
  rpn: number
  riskLevel?: string
  highRiskFlag?: boolean
  status: '待闭环' | '进行中' | '已闭环'
  owner: string
  targetDate?: string
  action: string
  evidence?: string | null
  closeDate?: string | null
}

/** FMEA 高风险闭环轨迹：每次状态流转(识别→措施分配→措施验证→闭环)写入一条。 */
export interface FmeaRiskTrack {
  id: string
  riskId?: string
  fromStatus?: string | null
  toStatus?: string
  operator?: string
  operateTime?: string
  actionNote?: string
  evidence?: string | null
}

export interface SqmKpi {
  supplierCount: number
  qualifiedRate: number
  pendingAudit: number
  openNc: number
}

// ===== CAPA 纠正与预防措施（SR-PTL-019 触发 / SR-CAR-025 升级） =====
export type CapaType = '纠正措施' | '预防措施' | '系统改进'
export type CapaStatus = '待启动' | '原因分析' | '措施制定' | '实施验证' | '效果确认' | '已关闭'

export interface CapaStage {
  key: string
  name: string
  status: 'done' | 'doing' | 'pending'
  date?: string
  operator?: string
  approval?: boolean
}
/** 纠正措施(CA) + 预防措施(PA) 双线（SR-PTL 纠正预防措施管理） */
export interface CapaCorrective {
  action: string
  owner: string
  due: string
  status: '待执行' | '执行中' | '已完成'
  evidence?: string
}
export interface CapaPreventive {
  action: string
  owner: string
  due: string
  status: '待执行' | '执行中' | '已完成'
  evidence?: string
}
export interface Capa {
  id: string
  type: CapaType
  /** 触发来源：8D手动触发 / CAR升级（SR-CAR-025）/ 客诉 / 手动 */
  source: string
  sourceId?: string
  d8Id?: string
  abnormalId?: string
  title: string
  problem: string
  /** 根本原因分析（5Why/鱼骨） */
  rootcause: string
  corrective: CapaCorrective
  preventive: CapaPreventive
  owner: string
  dueDate: string
  status: CapaStatus
  /** 效果验证期（SR-PTL-020 类比：30天效果验证） */
  effVerifyDate?: string
  effResult?: '通过' | '不通过' | null
  closeDate?: string
  closeAuditor?: string
  archived?: boolean
  stages: CapaStage[]
}

// ===== 供应商全生命周期电子档案（SR-SBM-001~019） =====
export type SupLifeStatus = '待审核' | '合格' | '暂停' | '淘汰'
export type RiskLevel = '高' | '中' | '低'

export interface SupQualification {
  name: string
  type: string
  uploader: string
  uploadDate: string
  expireDate: string
  /** SR-SBM-003 三级预警 90/60/30 天 */
  warnLevel: '正常' | '提醒' | '警告' | '紧急' | '已过期'
}

// ===== 供应商绩效（SR-SBM-017 绩效采集/评审/分级） =====
export interface SupplierPerformance {
  id: string
  orgId?: string
  supplierId: string
  /** 周期，如 2026-07 */
  period: string
  score: number
  deliveryScore?: number
  qualityScore?: number
  serviceScore?: number
  incomingPassRate?: number
  defectRate?: number
  rectifyTimelyRate?: number
  deliveryTimelyRate?: number
  complianceRate?: number
  level: 'A' | 'B' | 'C' | 'D'
  observeFlag?: boolean
  dataMissingFlag?: boolean
}

// ===== 评级规则（A/B/C/D 分数区间映射） =====
export interface GradeRule {
  id: string
  orgId?: string
  scoreMin: number
  scoreMax: number
  level: 'A' | 'B' | 'C' | 'D'
  observeFirstYear?: boolean
}

// ===== 供应商份额（按物料分配比例，关联等级） =====
export interface SupplierShare {
  id: string
  orgId?: string
  supplierId: string
  partNo: string
  shareRatio: number
  effectiveDate: string
  changeReason: string
  prevRatio?: number
  linkedLevel: 'A' | 'B' | 'C' | 'D'
}

// ===== 升级与淘汰（SR-SBM-019 持续不达标） =====
export interface SupplierEscalation {
  id: string
  orgId?: string
  supplierId: string
  currentLevel: 'A' | 'B' | 'C' | 'D'
  qualityIssueCount6m?: number
  repeatProblemCount?: number
  suggestedAction?: string
  escalationStatus?: string
  escalationAction?: string
  noticeSentFlag?: boolean
}

// ===== 审核频次规则（按等级/风险联动审核频次） =====
export interface AuditFreqRule {
  id: string
  orgId?: string
  riskLevel?: string
  level: 'A' | 'B' | 'C' | 'D'
  freqPerYear: number
  auditType: string
}

export interface SupLifecycle {
  id: string
  name: string
  code: string
  category: string
  status: SupLifeStatus
  risk: RiskLevel
  score: number
  contact: string
  tel: string
  address: string
  /** 资质列表 + 到期预警 */
  qualifications: SupQualification[]
  /** 审核记录（SR-SBM-008） */
  auditCount: number
  /** 整改记录数（SR-SBM-009） */
  rectifyCount: number
  /** 绩效季度评分（SR-SBM-017） */
  perfTrend: { q: string; score: number }[]
  /** 生命周期轨迹（SR-SBM-010 状态流转） */
  timeline: { date: string; action: string; operator: string }[]
}

// ===== 来料追溯（SQM Trace） =====
export interface SqmIncomingLot {
  id: string
  orgId?: string
  lotNo?: string
  supplierId?: string
  partNo?: string
  partName?: string
  qty?: number
  unit?: string
  incomingDate?: string
  inspectResult?: string
  inspectType?: string
  iqcPass?: boolean
  poNo?: string
  isKeyPart?: boolean
  usedQty?: number
}
export type SqmTraceNodeType = 'incoming' | 'raw' | 'semi' | 'ship' | 'customer'
export interface SqmTraceNode {
  id: string
  orgId?: string
  rootLotId?: string
  rootNodeId?: string
  parentNodeId?: string | null
  nodeType?: SqmTraceNodeType
  nodeName?: string
  batchNo?: string
  qty?: number
  unit?: string
  nodeDate?: string
  supplierId?: string
  remark?: string
  qualificationType?: string
  treeLevel?: number
  isValid?: boolean
}
export interface SqmTraceRawDetail {
  id?: string
  orgId?: string
  nodeId?: string
  category?: string
  woNo?: string
  productBarcode?: string
  productPartNo?: string
  productName?: string
  woQty?: number
  materialBarcode?: string
  materialCode?: string
  materialName?: string
  specModel?: string
  scanner?: string
  scanTime?: string
  processCode?: string
  processName?: string
}
export interface SqmTraceProductDetail {
  id?: string
  orgId?: string
  nodeId?: string
  isUrgent?: string
  qcReview?: string
  mgApprove?: string
  inspectResult?: string
  reportNo?: string
  inspectOrderNo?: string
  productionOrderNo?: string
  materialCode?: string
  productName?: string
  modelSpec?: string
  batchNo?: string
  productionDate?: string
  expiryDate?: string
  inspectQty?: number
  inspectCount?: number
  passQty?: number
  failQty?: number
  unit?: string
  inspector?: string
  category?: string
  qcReviewer?: string
  qcReviewTime?: string
  mgApprover?: string
  mgApproveTime?: string
  drugRegNo?: string
  perfInspectMethod?: string
  perfBatchNo?: string
  customer?: string
  customerCode?: string
  customerOrderNo?: string
  shipDate?: string
  trackingNo?: string
  shipAddress?: string
}
export interface SqmTraceCustomerDetail {
  id?: string
  orgId?: string
  nodeId?: string
  customerName?: string
  customerCode?: string
  customerOrderNo?: string
  shipDate?: string
  trackingNo?: string
  shipAddress?: string
  contactPerson?: string
  contactPhone?: string
  qty?: number
  unit?: string
}
export interface SqmKeyPartSn {
  id?: string
  orgId?: string
  lotId?: string
  rootLotId?: string
  sn?: string
  snStatus?: string
  bindNodeId?: string
  remark?: string
}

/** 完整追溯树:嵌套节点(后端已构建 children),detail 为对应明细表行(camelCase 键)。 */
export interface TraceNodeTreeVO {
  id: string
  rootLotId?: string
  rootNodeId?: string
  parentNodeId?: string | null
  nodeType?: SqmTraceNodeType
  nodeName?: string
  batchNo?: string
  qty?: number
  unit?: string
  nodeDate?: string
  supplierId?: string
  supplierName?: string
  remark?: string
  qualificationType?: string
  treeLevel?: number
  isValid?: string
  detail?: Record<string, any>
  children?: TraceNodeTreeVO[]
}
export interface TraceFullTreeVO {
  rootLotId?: string
  rootLotNo?: string
  rootNodeId?: string
  isKeyPart?: boolean
  tree?: TraceNodeTreeVO
  /** 上游组成树(tree-from-node 接口返回):children 为组成该节点的上游来源 */
  upTree?: TraceNodeTreeVO
}

/** 前端构造的保存请求(saveNode) */
export interface TraceNodeSaveRequest {
  orgId: string
  nodeType: 'semi' | 'ship' | 'customer'
  parentNodeId?: string
  nodeName?: string
  batchNo?: string
  qty?: number
  unit?: string
  nodeDate?: string
  supplierId?: string
  remark?: string
  qualificationType?: string
  // 产出明细(semi/ship)
  productName?: string
  materialCode?: string
  modelSpec?: string
  productionOrderNo?: string
  productionDate?: string
  inspectQty?: number
  inspector?: string
  drugRegNo?: string
  perfInspectMethod?: string
  perfBatchNo?: string
  // 客户出货(customer)
  customerName?: string
  customerCode?: string
  customerOrderNo?: string
  shipDate?: string
  trackingNo?: string
  shipAddress?: string
  contactPerson?: string
  contactPhone?: string
  // 一次性建树模式
  components?: TraceComponentItem[]
}
export interface TraceComponentItem {
  componentType: 'raw' | 'semi' | 'ship' | 'customer'
  sourceNodeId?: string
  refNodeId?: string        // 引用已存在节点(直接建组成关系, 不新建), 用于多对多
  materialCode?: string
  materialName?: string
  specModel?: string
  usageQty?: number
  unit?: string
  processName?: string
}
/** 通用分页结果 */
export interface PageResult<T> {
  records: T[]
  total: number
  page: number
  size: number
}
/** 全局追溯节点检索结果(后端 /v1/sqm/trace/nodes/search) */
export interface TraceNodeSearchVO {
  id?: string
  rootLotId?: string
  rootLotNo?: string
  nodeType?: SqmTraceNodeType
  nodeName?: string
  batchNo?: string
  materialCode?: string
  qty?: number | string
  unit?: string
  nodeDate?: string
  supplierId?: string
  supplierName?: string
  remark?: string
  treeLevel?: number
  isValid?: string
}

/** 组成关系引用（用于树/详情展示上级(被使用)或下级(组成)节点） */
export interface TraceLinkRef {
  id?: string
  nodeType?: SqmTraceNodeType
  nodeName?: string
  batchNo?: string
}

/** 单条追溯结果节点（正向/反向/全部），depth 为相对起始节点的层级 */
export interface TraceDirectionNode {
  id?: string
  nodeType?: SqmTraceNodeType
  nodeName?: string
  batchNo?: string
  qty?: number | string
  unit?: string
  nodeDate?: string
  supplierName?: string
  isValid?: string
  treeLevel?: number
  depth?: number
}

/** 节点完整详情（表 + 树共用）：主表全部字段 + 明细 + 供应商 + 组成关系 */
export interface TraceNodeFullVO {
  node?: SqmTraceNode
  detail?: Record<string, any>
  supplierName?: string
  /** 正向（用于）：包含本节点的上层节点 */
  parents?: TraceLinkRef[]
  /** 反向（组成）：本节点包含的下层节点 */
  children?: TraceLinkRef[]
}
export interface SqmAuditReportArchive {
  id?: string
  orgId?: string
  auditRecordId?: string
  archiveNo?: string
  reportNo?: string
  archiveDate?: string
  retentionUntil?: string
  reportPath?: string
  reportHash?: string
  status?: string
}
/** 统一归档查询返回行 */
export interface ArchiveItem {
  archiveType?: string
  archiveNo?: string
  refId?: string
  refNo?: string
  archiveDate?: string
  retentionUntil?: string
  reportHash?: string
}
/** 留存到期提醒返回行 */
export interface ArchiveExpiringItem {
  archiveType?: string
  archiveNo?: string
  refId?: string
  retentionUntil?: string
  daysRemaining?: number
}
