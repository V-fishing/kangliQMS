/**
 * SQM 供应商质量类型定义
 * 从 HTML 原型 MOCK.sqm 提取
 */

export interface Supplier {
  id: string
  name: string
  code: string
  category: string
  level: 'A' | 'B' | 'C'
  status: '合格' | '观察' | '整改中' | '不合格'
  score: number
  contact: string
  tel: string
  address: string
  cert: string
  lastAudit: string
  nextAudit: string
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
  status: 'done' | 'doing' | 'pending'
  operator: string
  date?: string
  veto?: boolean
  note?: string
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
  stage: string
  stages: D8Stage[]
  capaTriggered: boolean
  capaId?: string
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
  product: string
  process: string
  failureMode: string
  severity: number
  occurrence: number
  detection: number
  rpn: number
  status: '待闭环' | '进行中' | '已闭环'
  owner: string
  targetDate: string
  action: string
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
