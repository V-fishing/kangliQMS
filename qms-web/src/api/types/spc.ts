/**
 * SPC (Statistical Process Control) API Types
 */

// ── Param ──

export interface SpcParam {
  id: string
  orgId: string
  paramName: string
  procName: string
  chartType: string           // Xbar-R | Xbar-s | I-MR
  subgroupSize: number
  specUpper: number
  specLower: number
  unit: string
  collectFreq: string
  isActive: boolean
}

// ── Subgroup ──

export interface SpcSubgroup {
  id: string
  orgId: string
  paramId: string
  subgroupNo: number
  subgroupTime: string
  shift: string
  woNo: string
  batchNo: string
  n: number
  xbar: number
  rangeR: number
  judge: string               // 正常 | 异常
  isOutlier: boolean
  outlierRule: string         // ①-⑧
  dataSource: string
  operator: string
}

export interface SpcSubgroupVo extends SpcSubgroup {
  measurements: SpcMeasurement[]
}

export interface SpcMeasurement {
  id: string
  subgroupId: string
  subgroupTime: string
  seq: number
  value: number
}

export interface CreateSubgroupRequest {
  orgId?: string
  paramId: string
  subgroupTime?: string
  shift?: string
  woNo?: string
  batchNo?: string
  values: number[]
}

// ── Alarm ──

export interface SpcAlarm {
  id: string
  orgId: string
  paramId: string
  code: string
  status: '待确认' | '已关闭'
  level: '预警' | '报警'
  triggeredRule: string       // ①-⑧
  currentValue: number
  alarmTime: string
  closeReason: string
  disposition: string
  closedBy: string
  closedAt: string
}

export interface CloseAlarmRequest {
  closeReason: string
  disposition: string
}

// ── Control Limit ──

export interface SpcControlLimit {
  id: string
  orgId: string
  paramId: string
  isActive: boolean
  xbarUcl: number
  xbarCl: number
  xbarLcl: number
  rUcl: number
  rCl: number
  rLcl: number
  nSubgroups: number
  baselineSource: string
  calcAt: string
}

// ── Capability ──

export interface SpcCapability {
  id: string
  orgId: string
  paramId: string
  cpk: number
  ppk: number
  level: string               // 充足 | 尚可 | 不足 | 样本过少,无法计算 | 数据不足,仅供参考
  periodType: string
  periodValue: string
  sampleCount: number
  calcWindowDays: number
  calcAt: string
}

export interface SpcSupplierCpkVo {
  sup: string
  mat: string
  cpk: number
  lvl: string
}

// ── Rule ──

export interface SpcRule {
  id: string
  ruleCode: string            // ①-⑧
  ruleName: string
  level: string               // 预警 | 报警
  isEnabled: boolean
}

export interface SpcRuleTriggerVo {
  code: string
  name: string
  level: string
  cnt: number
}

// ── Collect Task ──

export interface SpcCollectTask {
  id: string
  orgId: string
  paramId: string
  status: '待采集' | '缺失'
  isPlannedDowntime: boolean
  nextDueAt: string
  createdAt: string
}

// ── Notify Channel ──

export interface SpcNotifyChannel {
  id: string
  orgId: string
  channel: string
  isEnabled: boolean
  configJson: string
}

export interface SpcNotifyRecord {
  id: string
  alarmId: string
  channel: string
  status: string              // SENT | FAILED | PENDING
  sentAt: string
  error: string
}

// ── Global Config ──

export interface SpcGlobalConfig {
  id: string
  orgId: string
  baselineMode: string
  defaultSubgroupSize: number
  chartAutoRules: string
  cpkPeriod: string
  cpkSufficient: number
  cpkAcceptable: number
  specSource: string
  alertLevel: string
  suppressMinutes: number
}

// ── Dashboard / Chart ──

export interface SpcDashboardVo {
  cpkDistribution: Record<string, number>
  pendingAlarms: number
  todaySubgroups: number
  todayDue: number
}

export interface ControlChartVo {
  subgroups: SpcSubgroup[]
  limit: SpcControlLimit | null
  marks: ControlChartMark[]
}

export interface ControlChartMark {
  index: number
  ruleCode: string
  level: string
}

export interface SpcHistogramVo {
  bins: number[]
  freq: number[]
  usl: number
  lsl: number
}
