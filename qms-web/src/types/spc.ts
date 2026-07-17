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
}

export interface SpcLimit {
  ucl: number
  cl: number
  lcl: number
  rUcl?: number
  rCl?: number
  rLcl?: number
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
  par: string
  proc: string
  freq: string
  last: string
  due: string
  st: '待采集' | '已完成'
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
  id: string
  name: string
  lvl: '报警' | '预警'
  on: boolean
}
