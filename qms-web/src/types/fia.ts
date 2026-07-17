/**
 * FIA 首件检验类型定义
 * 从 HTML 原型 MOCK.fia / MOCKX.fia 提取
 */
import type { TimelineNode } from './common'

export interface FiaKpi {
  pending: number
  passRate: number
  locked: number
  overdue: number
}

export interface FiaTaskStatus {
  name: string
  value: number
  color: string
}

export interface FiaPass7d {
  days: string[]
  vals: number[]
  target: number
}

export interface FiaTrigger {
  name: string
  value: number
}

export interface FiaLine {
  line: string
  rate: number
}

export interface FiaTask {
  id: string
  wo: string
  line: string
  st: string
  trig: string
  who: string
  t: string
  u: number
}

export interface FiaApproval {
  id: string
  type: string
  wo: string
  reason: string
  who: string
  t: string
  st?: string
  /** 审批通过后记录（审批人 + 时间），已审批行展示 */
  hist?: string
}

export interface FiaTimeout {
  id: string
  wo: string
  line: string
  od: string
  who: string
}

export interface FiaMywo {
  wo: string
  prod: string
  st: string
  lr: string
  exempt: number
}

export interface FiaSupplier {
  mat: string
  sup: string
  batch: string
  res: string
  d: string
}

export interface FiaGauge {
  name: string
  st: string
  exp: string
}

export interface FiaStdlib {
  code: string
  mat: string
  proc: string
  aql: string
  lvl: string
  ctq: string
  ver: string
  st: string
}

export interface FiaInspItem {
  no: number
  name: string
  std: string
  lsl?: string
  usl?: string
  method: string
  ctq: number
}

/** 检验录入工单元信息（对应 HTML MOCKX.fia.inspMeta） */
export interface FiaInspMeta {
  code: string
  wo: string
  prod: string
  proc: string
  trig: string
  std: string
  aql: string
  sample: string
  batch: string
}

/** 检验录入项（对应 HTML MOCKX.fia.inspItems，可录入实测值） */
export interface FiaInspEntry {
  no: number
  name: string
  /** 是否关键 CTQ 特性 */
  ctq: boolean
  /** 标准值文本 */
  std: string
  /** 公差文本（±0.02 / ≥50 / 18-22 等） */
  tol: string
  /** 单位 */
  unit: string
  /** 实测值：数值字符串，或 no=4 外观类的 合格/不合格 选择 */
  val: string
  /** 缺陷类项（外观）用选择而非输入 */
  select?: boolean
}

export interface FiaStdlibDetail extends FiaStdlib {
  items: FiaInspItem[]
  revision: string
  approver: string
  effDate: string
}

export type FiaTrace = TimelineNode

/** 全链路追溯节点（正/反向，对应 HTML MOCKX.fia.traceFwd/traceBack） */
export interface FiaTraceLink {
  n: string
  v: string
}

/** 归档报告（保留15年，对应 SR-FIA-030/031/032 首件校验自动归档报告）
 * 字段对齐 SRS：校验单含检验数据、签名与判定结论；保留15年、到期前6个月提醒；按角色控制调阅权限
 */
export interface FiaArchived {
  rpt: string
  wo: string
  /** 产品名称 */
  prod: string
  /** 工序 */
  proc: string
  /** 归档日期 */
  d: string
  /** 保留到期日（归档日期 + 15 年） */
  retainUntil: string
  /** 关联检验标准编号 + 版本 */
  std: string
  /** 抽样方案 AQL 等级 */
  aql: string
  /** 样本量 / 接收数（如 13/13，Ac=0） */
  sample: string
  /** 来料批次号 */
  batch: string
  /** 检验人签名（检验人 + 时间） */
  inspector: string
  /** 复核人签名（复核人 + 时间） */
  reviewer: string
  /** 判定结论（合格 / 不合格） */
  conclusion: string
  /** 报告状态（已归档 / 只读） */
  st: string
  /** 调阅权限说明（如：质量/审计可阅，操作员只读） */
  perm: string
}

/** 触发事件类型（对应 HTML MOCKX.fia.trigTypes） */
export interface FiaTrigType {
  name: string
  enabled: boolean
  desc: string
}

/** 拦截与时效配置（对应 HTML renderFiaTrigcfg 拦截与时效面板） */
export interface FiaIntercept {
  /** 硬阻断 hard / 软阻断 soft */
  blockMode: 'hard' | 'soft'
  /** 多触发合并 merge / 各自生成 separate */
  multiTrigger: 'merge' | 'separate'
  /** 校验时效 SLA 小时 */
  slaHours: number
  /** 连续不合格升级次数 */
  escalateTimes: number
}

/** 电子签名方式（可多选） */
export interface FiaSigMethod {
  key: 'pwd' | 'hand' | 'ca'
  name: string
  enabled: boolean
}

/** 电子签名配置（对应 HTML renderFiaTrigcfg 电子签名配置面板） */
export interface FiaSigConfig {
  methods: FiaSigMethod[]
  /** 签名节点：two 两级 / three 三级 */
  node: 'two' | 'three'
  /** 签名粒度：order 整单 / item 逐项 */
  granularity: 'order' | 'item'
}

export interface FiaTrigConfig {
  triggers: FiaTrigType[]
  intercept: FiaIntercept
  signature: FiaSigConfig
}

export interface FiaFlowNode {
  id: string
  name: string
  type: string
  status: 'done' | 'current' | 'pending'
  assignee?: string
  time?: string
}
