/**
 * SQM (Supplier Quality Management) API Types
 */

// ── Supplier ──

export interface SqmSupplier {
  id: string
  orgId: string
  supplierCode: string
  supplierName: string
  level: string               // A | B | C | D
  status: string              // 启用 | 待审核 | 停用
  contactName: string
  contactPhone: string
  address: string
  score: number
  lastAuditDate: string
  nextAuditDate: string
  createdAt: string
}

// ── Audit ──

export interface SqmAuditPlan {
  id: string
  orgId: string
  planNo: string
  auditType: string           // 年度 | 专项 | 临时
  supplierId: string
  plannedDate: string
  leadAuditor: string
  team: string
  status: '计划中' | '待执行' | '进行中' | '已完成'
  createdAt: string
}

export interface SqmAuditRecord {
  id: string
  orgId: string
  planId: string
  recordNo: string
  supplierId: string
  auditDate: string
  score: number
  result: string
  conclusion: string
  ncCount: number
  status: string
  archiveId: string
  createdAt: string
}

export interface SqmAuditNc {
  id: string
  orgId: string
  recordId: string
  ncNo: string
  clause: string
  level: string               // 严重 | 一般 | 观察项
  description: string
  deadline: string
  status: '待整改' | '已闭环'
  verifyResult: string
  verifyComment: string
  verifyDate: string
  closeDate: string
  createdAt: string
}

export interface SqmAuditReportArchive {
  id: string
  archiveNo: string
  recordId: string
  reportHash: string
  pdfPath: string
  retentionUntil: string
  createdAt: string
}

// ── Abnormal ──

export interface SqmIncomingAbnormal {
  id: string
  orgId: string
  abnormalNo: string
  supplierId: string
  partNo: string
  lotId: string
  level: string               // 严重 | 一般
  status: '待处理' | '已关闭'
  description: string
  disposal: string
  disposalRemark: string
  closeDate: string
  rectifyType: string         // 8D | CAPA
  d8Id: string
  capaId: string
  overdueDays: number
  createdAt: string
}

// ── Change ──

export interface SqmChangeOrder {
  id: string
  orgId: string
  changeNo: string
  supplierId: string
  partNo: string
  changeType: string
  description: string
  riskPreMark: string         // 高 | 中 | 低
  strictFlag: boolean
  source: string              // 门户提报 | 系统检测
  urgency: string             // 高 | 中 | 低
  status: '待申请' | '审批中' | '已批准' | '已驳回' | '已关闭' | '已回滚'
  receiveFrozen: boolean
  createdAt: string
}

export interface SqmChangeOrderVo extends SqmChangeOrder {
  approvals: SqmChangeApproval[]
}

export interface SqmChangeApproval {
  id: string
  changeId: string
  role: string                // quality | purchase | rd
  hasVeto: boolean
  status: string              // pending | done | rejected
  opinion: string
  approvedAt: string
}

// ── FMEA ──

export interface QmsFmeaRisk {
  id: string
  orgId: string
  riskNo: string
  supplierId: string
  fmeaType: string
  product: string
  process: string
  failureMode: string
  effect: string
  cause: string
  control: string
  severity: number            // S: 1-10
  occurrence: number          // O: 1-10
  detection: number           // D: 1-10
  rpn: number                 // S × O × D
  riskLevel: string           // 高 | 中 | 低
  highRiskFlag: boolean
  status: '待闭环' | '进行中' | '已闭环'
  action: string
  owner: string
  targetDate: string
  closeDate: string
  evidence: string
  recurrenceVerified: boolean
  createdAt: string
}

export interface QmsFmeaRiskTrack {
  id: string
  riskId: string
  action: string
  operator: string
  operateTime: string
}

// ── Trace ──

export interface SqmIncomingLot {
  id: string
  orgId: string
  lotNo: string
  partName: string
  partNo: string
  supplierId: string
  qty: number
  usedQty: number
  inspectResult: string       // 待检 | 合格 | 不合格
  inspectType: string         // 正常 | 加严
  iqcPass: boolean
  receivedAt: string
  createdAt: string
}

export interface SqmTraceNode {
  id: string
  orgId: string
  rootLotId: string
  rootNodeId: string
  parentNodeId: string
  nodeType: string            // incoming | raw | semi | ship | customer
  nodeName: string
  batchNo: string
  materialCode: string
  supplierName: string
  treeLevel: number
  isValid: string
  createdAt: string
}

export interface SqmTraceRawDetail {
  nodeId: string
  rawMaterial: string
  lotNo: string
  supplierName: string
  qty: number
  unit: string
  certificateNo: string
}

export interface SqmTraceProductDetail {
  nodeId: string
  productName: string
  model: string
  batchNo: string
  qty: number
  lineName: string
  woNo: string
  producedAt: string
}

export interface SqmKeyPartSn {
  id: string
  nodeId: string
  partName: string
  sn: string
  createdAt: string
}

export interface TraceNodeSearchVO {
  id: string
  nodeType: string
  nodeName: string
  batchNo: string
  materialCode: string
  supplierName: string
  treeLevel: number
}

export interface TraceFullTreeVO {
  roots: TraceNodeTreeVO[]
  nodes: TraceNodeTreeVO[]
}

export interface TraceNodeTreeVO {
  id: string
  nodeType: string
  nodeName: string
  batchNo: string
  supplierName: string
  children: TraceNodeTreeVO[]
}

export interface TraceNodeFullVO {
  node: SqmTraceNode
  detail: Record<string, unknown>
  supplierName: string
  parents: TraceDirectionNode[]
  children: TraceDirectionNode[]
}

export interface TraceDirectionNode {
  id: string
  nodeName: string
  batchNo: string
  linkType: string
}

// ── Performance ──

export interface SqmSupplierPerformance {
  id: string
  supplierId: string
  period: string
  incomingPassRate: number
  deliveryTimelyRate: number
  score: number
  level: string               // A | B | C | D
  dataMissingFlag: boolean
  createdAt: string
}

// ── Grade Rule ──

export interface SqmSupplierGradeRule {
  id: string
  scoreMin: number
  scoreMax: number
  level: string
}

// ── Share ──

export interface SqmSupplierShare {
  id: string
  supplierId: string
  shareRatio: number
  effectiveDate: string
}

// ── Escalation ──

export interface SqmSupplierEscalation {
  id: string
  supplierId: string
  partNo: string
  repeatCount: number
  suggestedAction: string
  escalationStatus: string    // 观察中 | 已升级
  noticeSentFlag: boolean
  createdAt: string
}

// ── Cert ──

export interface SqmSupplierCert {
  id: string
  supplierId: string
  certName: string
  certNo: string
  issueDate: string
  expiryDate: string
  status: string
  certVersion: number
}

// ── Measure ──

export interface SqmSupplierMeasure {
  id: string
  abnormalId: string
  seq: number
  action: string
  owner: string
  deadline: string
  completeDate: string
  evidence: string
}

// ── SQE Verification ──

export interface SqmSqeVerification {
  id: string
  abnormalId: string
  verifyDate: string
  verifiedBy: string
  result: string
  comment: string
}

// ── Audit Freq Rule ──

export interface SqmAuditFreqRule {
  id: string
  level: string
  baseFreqMonths: number
  riskWeight: number
}

// ── Strict Inspect ──

export interface SqmChangeStrictInspect {
  id: string
  changeId: string
  strictNo: string
  aqlLevel: string
  seq: number
  totalSeq: number
  result: string
  restored: boolean
}
