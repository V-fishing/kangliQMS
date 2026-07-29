/**
 * FIA (First Article Inspection) API Types
 * Sources: backend entities, .openapi.json schemas
 */

// ── Task ──

export interface FiaTask {
  id: string
  orgId: string
  code: string
  woNo: string
  lineName: string
  productName: string
  procName: string
  triggerType: string
  stdId: string
  stdVersion: string
  partNo: string
  supplierId: string
  lotId: string
  aql: string
  sampleSize: number
  sampleCount: number
  batchNo: string
  status: FiaTaskStatus
  overallJudge: string        // 合格 | 警告 | 不合格
  inspectorId: string
  isUrgent: boolean
  slaDueAt: string
  isOverdue: boolean
  disposition: string         // 退货 | 返工 | 让步接收 | 紧急放行 | 豁免开工 | 拦截
  remark: string
  submittedAt: string
  reviewerId: string
  reviewedAt: string
  approverId: string
  approvedAt: string
  createdAt: string
  updatedAt: string
  createdBy: string
}

export type FiaTaskStatus =
  | '待检'
  | '进行中'
  | '待复核'
  | '待批准'
  | '审批中'
  | '已完成'
  | '已驳回'
  | '超时'
  | '已作废'

export interface FiaTaskVo extends FiaTask {
  items: FiaInspItem[]
}

export interface FiaInspItem {
  id: string
  taskId: string
  seq: number
  itemName: string
  isCtq: boolean
  stdValue: string
  tolerance: string
  unit: string
  measuredValue: string
  judge: string               // 合格 | 不合格 | -
  stdItemId: string
}

export interface CreateFiaTaskRequest {
  orgId?: string
  woNo: string
  lineName?: string
  productName: string
  procName: string
  triggerType?: string
  stdId?: string
  partNo?: string
  supplierId?: string
  lotId?: string
  batchNo?: string
  isUrgent?: boolean
  remark?: string
}

export interface InspItemResultRequest {
  items: { id: string; measuredValue: string; judge: string }[]
}

export interface SignRequest {
  password?: string
  itemId?: string
}

// ── Approval ──

export interface FiaApproval {
  id: string
  orgId: string
  code: string
  approvalType: string        // 豁免 | 紧急放行 | 让步接收
  woNo: string
  taskId: string
  reason: string
  applicantId: string
  applyAt: string
  status: string              // 待审批 | 已通过 | 已驳回
  approverId: string
  approveOpinion: string
  approveAt: string
}

// ── Standard ──

export interface FiaInspStd {
  id: string
  orgId: string
  code: string
  stdName: string
  partNo: string
  supplierId: string
  material: string
  procName: string
  aql: string
  inspectLevel: string
  samplePlan: string
  ctqText: string
  stdVersion: string
  status: string              // 草稿 | 生效 | 停用
  prevVersionId: string
  isDefault: boolean
}

export interface FiaInspStdItem {
  id: string
  stdId: string
  seq: number
  itemName: string
  isCtq: boolean
  stdValue: string
  tolerance: string
  unit: string
  valueType: string           // numeric | enum
  enumValues: string
  upperLimit: string
  lowerLimit: string
  itemType: string
}

export interface InspStdVo extends FiaInspStd {
  items: FiaInspStdItem[]
}

export interface CreateInspStdRequest {
  code?: string
  stdName: string
  partNo?: string
  supplierId?: string
  material?: string
  procName?: string
  aql?: string
  inspectLevel?: string
  samplePlan?: string
  ctqText?: string
  items?: FiaStdItemRequest[]
}

export interface FiaStdItemRequest {
  seq: number
  itemName: string
  isCtq?: boolean
  stdValue?: string
  tolerance?: string
  unit?: string
  valueType?: string
  enumValues?: string
}

// ── Trigger Type ──

export interface FiaTriggerType {
  id: string
  orgId: string
  name: string
  isEnabled: boolean
  description: string
}

// ── Sign Config ──

export interface FiaSignConfig {
  id: string
  orgId: string
  signMethods: string[]       // password | handwriting | ca
  signNodes: string           // 两级 | 三级
  signGranularity: string     // 整单签名 | 逐项
  lockAfterFail: number
  lockMinutes: number
}

// ── Intercept Config ──

export interface FiaInterceptConfig {
  id: string
  orgId: string
  interceptMode: string       // 硬阻断 | 软提示
  multiTriggerMode: string    // 合并一张校验单 | 各开一张
  slaHours: number
  escalateFailCount: number
}

// ── WO Lock ──

export interface FiaWoLock {
  id: string
  orgId: string
  woNo: string
  lockStatus: string          // 锁定 | 正常
  lockReason: string
  lockedAt: string
  wipHold: boolean
  unlockType: string
  unlockedAt: string
  unlockReason: string
  approverId: string
  releaseReason: string
  traceTag: string
  taskCode: string
}

// ── Archive ──

export interface FiaArchivedReport {
  reportNo: string
  taskId: string
  woNo: string
  archiveDate: string
  status: string
  pdfRef: string
  reportHash: string
  retentionUntil: string
}
