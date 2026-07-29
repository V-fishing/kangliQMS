/**
 * NCM (Non-Conformance Management) API Types
 */

// ── Defect Dict ──

export interface NcmDefectDict {
  id: string
  orgId: string
  code: string
  name: string
  category: string
  level: string
  status: string
  referenceCount: number
}

// ── Defect Record ──

export interface NcmDefectRecord {
  id: string
  orgId: string
  defectNo: string
  woNo: string
  processCode: string
  defectDictCode: string
  severity: string            // 严重 | 一般
  defectCount: number
  batchTotal: number
  defectRate: number
  deviceCode: string
  batchNo: string
  productModel: string
  operatorId: string
  source: string
  occurredAt: string
  remark: string
  disposition: string
  createdAt: string
}

// ── 8D Report ──

export interface Qms8dReport {
  id: string
  orgId: string
  d8No: string
  source: string              // SPC报警 | 不良记录 | SQM异常 | 手动
  sourceRefId: string
  issue: string
  severity: string            // 高 | 中 | 低
  flowType: string            // 8D | 简易
  currentStage: string        // D1-D8
  status: '进行中' | '已闭环'
  team: string
  teamMembers: string
  capaTriggered: boolean
  closeDate: string
  createdAt: string
}

export interface EightDVo extends Qms8dReport {
  stages: Qms8dStageDetail[]
  fishbones: Qms8dFishbone[]
}

export interface Qms8dStageDetail {
  id: string
  d8Id: string
  stageCode: string
  content: string
  owner: string
  approvalStatus: string      // 待审批 | 已通过 | 已驳回
  approvedBy: string
  approvalComment: string
  evidenceFiles: string
  createdAt: string
}

export interface AdvanceStageRequest {
  stageCode: string
  content: string
  owner?: string
}

export interface StageApproveDTO {
  stageCode: string
  approved: boolean
  comment?: string
  approver?: string
}

// ── Fishbone ──

export interface Qms8dFishbone {
  id: string
  d8Id: string
  problem: string
  category: string            // 人 | 机 | 料 | 法 | 环 | 测
  causeText: string
  sortOrder: number
}

// ── CAPA ──

export interface QmsCapa {
  id: string
  orgId: string
  capaNo: string
  d8Id: string
  abnormalId: string
  issue: string
  triggerType: string         // 8D | 来料异常 | 重复问题 | 体系审核 | 客户投诉
  triggerStage: string
  triggerCondition: string
  capaType: string            // 纠正措施 | 预防措施
  progress: number            // 0-100
  status: '待启动' | '待审批' | '实施中' | '已验证' | '已关闭' | '分析中'
  owner: string
  dueDate: string
  closeDate: string
  createdAt: string
}

export interface CapaVo extends QmsCapa {
  actions: QmsCapaAction[]
}

export interface QmsCapaAction {
  id: string
  capaId: string
  seq: number
  actionText: string
  done: boolean
  completeDate: string
}

// ── Corrective Action ──

export interface NcmCorrectiveAction {
  id: string
  orgId: string
  caNo: string
  defectNo: string
  issue: string
  status: string
  progress: number
  owner: string
  dueDate: string
  createdAt: string
}

// ── Filter Scheme ──

export interface NcmFilterScheme {
  id: string
  schemeName: string
  ownerId: string
  filterJson: string
}

// ── Alert Escalation ──

export interface NcmAlertEscalation {
  id: string
  level: string
  timeoutMinutes: number
  notifyRole: string
  offHoursDelay: number
}

// ── Daily Report Config ──

export interface NcmDailyReportConfig {
  id: string
  pushTime: string
  receivers: string
  enabled: boolean
}

// ── BI Report ──

export interface NcmBiReport {
  id: string
  reportNo: string
  reportType: string
  period: string
  fileUrl: string
  status: string
  generatedAt: string
}
