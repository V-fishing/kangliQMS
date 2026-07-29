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

/** 工单锁定记录(SR-FIA-022~026) */
export interface FiaWoLock {
  id?: string
  woNo?: string
  lockStatus: string      // 锁定 / 正常
  lockReason?: string     // 首件未完成 / 首件不合格
  lockedAt?: string
  wipHold?: boolean       // 在制品待处理
  unlockType?: string     // 自动解锁 / 紧急放行
  unlockedAt?: string
  approverId?: string
  releaseReason?: string
  traceTag?: string       // 放行追溯标签
  taskCode?: string
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
  /** 校验单号(如 FA-...),仅用于展示,不是数据库主键 */
  code?: string
  wo: string
  line: string
  st: string
  trig: string
  who: string
  t: string
  u: number
  /** 以下为详情/录入页扩展字段（列表接口可选返回） */
  productName?: string
  procName?: string
  batchNo?: string
  result?: string
  /** 不合格处理路径:退货 / 返工 / 让步接收 */
  disposition?: string
  /** 供应商送检信息(供应商/送货单/联系人等),统一归入备注 */
  remark?: string
  /** 绑定的真实供应商(来自供应商质量库 sqm_supplier),后端仅存 supplierId */
  supplierId?: string
  /** 供应商名称(前端按 supplierId 从供应商质量库解析) */
  supplierName?: string
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
  /** 数据库主键 UUID；新建任务时作为 stdId 传给后端（绝不可用 code） */
  id?: string
  orgId?: string
  code: string
  mat: string
  proc: string
  aql: string
  lvl: string
  ctq: string
  ver: string
  st: string
  /** 来料批次驱动匹配键：物料编码 + 供应商ID */
  partNo?: string
  supplierId?: string
  /** 检验项目明细（标准值 / 公差 / 单位等） */
  items?: FiaStdItem[]
}

/**
 * 检验标准库中的单个检验项：配置标准值、公差、单位后，建任务时自动带入检验录入。
 * 字段与后端实体 ops.fia_insp_std_item 对齐（驼峰↔下划线映射见 api/modules/fia.ts）。
 */
export interface FiaStdItem {
  id?: string
  seq?: number
  /** 检验项名称，如「长度」「外观」 */
  name: string
  /** 是否关键特性 CTQ */
  ctq?: boolean
  /** 标准值 */
  std: string
  /** 公差（±0.02 / ≥50 / 18-22 等文本规则） */
  tol: string
  /** 单位 */
  unit: string
  /** 检验项类型：数值 / 文本（对应后端 value_type 原始值） */
  valueType?: string
  /** 定性项枚举可选值，逗号分隔，如 "合格,不合格"（对应后端 enum_values） */
  enumValues?: string
  /** 规格上限（数值型自动判定用，对应后端 upper_limit） */
  specUpper?: number
  /** 规格下限（数值型自动判定用，对应后端 lower_limit） */
  specLower?: number
  /** 检验方法/项类型，对应后端 item_type */
  itemType?: string
}

/** 新建首件检验任务的请求体（含来料批次驱动匹配键） */
export interface FiaTaskCreate {
  orgId: string
  woNo: string
  lineName: string
  productName: string
  procName: string
  triggerType: string
  stdId?: string
  batchNo?: string
  isUrgent?: boolean
  remark?: string
  /** 来料批次驱动匹配键 */
  partNo?: string
  supplierId?: string
  lotId?: string
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
  id?: string
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
  /** 判定：合格 / 不合格 */
  result?: string
  /** 是否已签名 */
  signed?: boolean
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

/** 触发事件类型（对应后端 FiaTriggerType: id/typeName/description/enabled） */
export interface FiaTrigType {
  id?: string
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
  /** 电子签名配置已迁移至「系统管理 / 配置中心」独立维护，此处不再承载 */
  signature?: FiaSigConfig
}

export interface FiaFlowNode {
  id: string
  name: string
  type: string
  status: 'done' | 'current' | 'pending'
  assignee?: string
  time?: string
}
