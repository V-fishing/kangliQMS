/**
 * SPC 过程能力类型定义
 * 从 HTML 原型 MOCK.spc 提取
 */
import type { ShiftType } from './common'

export interface SpcKpi {
  cpk: number
  /** 长期性能 PPK（对应 HTML MOCK.spc.ppk） */
  ppk: number
  alarm: number
  monitor: number
  passRate: number
  /** 能力计算窗口（对应 HTML 能力分析 KPI「计算窗口」） */
  window: string
  /** 参数能力达标率（对应 HTML KPI「达标率」，如 89.5） */
  capPassRate: number
  /** 达标参数数/总参数（对应 HTML KPI「达标率」副标题，如 17/19参数） */
  capPassParams: string
}

export interface SpcSubgroup {
  no: number
  xbar: number
  r: number
  /** 子组采集时间（对应 HTML MOCKX.spc.subgroupTbl.t） */
  time?: string
  shift?: ShiftType
  /** 命中判异规则编号，如 ① / ③ */
  outlierRule?: string
  /** 子组主键（溯源用） */
  id?: string
  /** 关联参数 ID（用于映射参数名） */
  paramId?: string
  /** 合格判定：合格 / 不合格 */
  judge?: string
  /** 数据来源：fia = 首件联动写入，manual/空 = 正常采集 */
  dataSource?: string
  /** 关联工单（首件联动时即首件工单） */
  woNo?: string
  /** 关联批次（首件联动时即首件批次） */
  batchNo?: string
}

export interface SpcLimit {
  ucl: number
  cl: number
  lcl: number
  rUcl?: number
  rCl?: number
  rLcl?: number
  baselineSource?: string
  nSubgroups?: number
  insufficient?: boolean   // SR-SPC-007:子组<25 基线未建立
}

export interface SpcMark {
  i: number
  rule: string
  level: '预警' | '报警'
  range?: string
}

export interface SpcHistogram {
  bins: number[]
  freq: number[]
  usl: number
  lsl: number
}

export interface SpcLevel {
  name: string
  value: number
  color: string
}

export interface SpcCpkTrend {
  m: string[]
  v: number[]
}

export interface SpcRule {
  code: string
  name: string
  desc: string
  level: '预警' | '报警'
  enabled: boolean
  cnt: number
}

export interface SpcAlarm {
  id: string
  par: string
  val: number
  rule: string
  lvl: '预警' | '报警'
  t: string
  st: string
  /** 关闭原因与处置措施（确认关闭后回填） */
  reason?: string
}

export interface SpcParam {
  p: string
  proc: string
  unit: string
  sl: string
  freq: string
  sg: number
  chartType: 'Xbar-R' | 'Xbar-s' | 'I-MR'
}

export interface SpcSupplierCpk {
  sup: string
  mat: string
  cpk: number
  lvl: string
}

export interface SpcControlData {
  subgroups: SpcSubgroup[]
  limit: SpcLimit
  marks: SpcMark[]
  chartType: 'Xbar-R' | 'Xbar-s' | 'I-MR'
  rules: { code: string; level: '预警' | '报警' }[]
}

/** 数据采集任务（对应 HTML MOCKX.spc.collectTasks） */
export interface SpcCollectTask {
  id: string
  par: string
  proc: string
  freq: string
  last: string
  due: string
  st: '待采集' | '已完成' | '缺失'
  isPlannedDowntime?: boolean
}

/** 导入历史记录（对应 HTML MOCKX.spc.importHistory） */
export interface SpcImportRecord {
  id: string
  fileName: string
  paramName: string
  records: number
  status: '成功' | '部分成功' | '失败'
  time: string
  operator: string
  errors: number
  size: string
}

/** 判异规则配置（对应 HTML MOCKX.spc.rulesCfg） */
export interface SpcRuleCfg {
  /** 展示用规则编码（如 ①/R1） */
  id: string
  /** 后端真实主键 id，用于启停接口 */
  rid?: string
  name: string
  lvl: '报警' | '预警'
  on: boolean
}

/** SPC 通知渠道（对应后端 ops.spc_notify_channel） */
export interface SpcNotifyChannel {
  id: string
  /** 渠道编码：wecom / email / sms / dingtalk ... */
  channel: string
  /** 是否启用 */
  isEnabled: boolean
  configJson?: string
}

/** SPC 推送通知记录（报警触发后按启用渠道生成，留痕） */
export interface SpcNotifyRecord {
  id: string
  alarmId: string
  channel: string
  channelName?: string
  message: string
  /** SENT / FAILED / PENDING */
  status: string
  sentAt?: string
  error?: string
  createdAt?: string
}
