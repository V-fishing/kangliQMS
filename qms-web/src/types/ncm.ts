/**
 * NCM 不良管理类型定义
 * 从 HTML 原型 MOCK.ncm 提取
 */
import type { Severity } from './common'

export interface NcmKpi {
  defectCnt: number
  defectRate: number
  ppm: number
  scrap: number
}

export interface NcmPareto {
  name: string
  v: number
}

export interface NcmTrend30 {
  last5up: boolean
  over2sigma: boolean
  vals: number[]
  target: number
}

export interface NcmType {
  name: string
  v: number
}

export interface NcmProcTop {
  proc: string
  rate: number
}

export interface NcmCompare {
  labels: string[]
  cur: number[]
  prev: number[]
  yoy: number[]
}

export interface NcmShift {
  shift: string
  rate: number
  cnt: number
}

export interface NcmRealtime {
  shift: string
  cnt: number
  rate: number
  top3: { name: string; cnt: number }[]
}

export interface NcmRecord {
  id: string
  wo: string
  proc: string
  type: string
  cnt: number
  who: string
  t: string
  dev: string
  batch: string
  prod: string
  sev: Severity
}

export interface NcmSupplierRank {
  sup: string
  cnt: number
  rate: number
  ppm: number
}

export interface NcmCorrective {
  id: string
  issue: string
  owner: string
  due: string
  st: string
  progress: number
}

export interface NcmDict {
  code: string
  name: string
  cat: string
  lvl: string
  cnt: number
  /** 状态：启用 / 停用（有统计数不可删除，仅可停用，SR-NCM-005） */
  status: '启用' | '停用'
}

export interface NcmEvent {
  id: string
  type: string
  where: string
  prod: string
  sev: Severity
  t: string
}

/** 8D 报告列表项（对应 HTML MOCKX.ncm.eightD） */
export interface Ncm8DListItem {
  id: string
  issue: string
  /** 来源：不良记录 / SPC报警 / 客诉 */
  src: string
  /** 严重度，如 S=7 */
  sev: string
  /** 当前阶段 D1-D8 */
  stage: string
  /** SLA 描述 */
  sla: string
  /** 状态：进行中 / 审批中 / 效果验证 / 已闭环 */
  st: string
}

/** CAPA（纠正预防措施），由 8D 人工手动触发关联（SR-PTL-019） */
export interface NcmCapa {
  id: string
  /** 关联 8D 编号 */
  from8D: string
  /** 触发原因：S≥7 / 30天重复 */
  trigger: string
  reason: string
  owner: string
  due: string
  st: '执行中' | '待启动' | '已关闭'
  createdAt: string
}

/** 8D 相关 */
export interface Ncm8D {
  id: string
  title: string
  prod: string
  sev: Severity
  currentStage: number
  stages: {
    name: string
    status: 'done' | 'current' | 'pending'
    owner?: string
    due?: string
    content?: string
  }[]
  rootCause?: string
  actions?: { desc: string; owner: string; due: string; done: boolean }[]
  fishbone: { category: string; causes: string[] }[]
  fiveWhy: { why: string; answer: string }[]
}

export interface NcmDefectHeatmap {
  processes: string[]
  types: string[]
  data: [number, number, number][] // [x, y, value]
}

/** 不良分析聚合指标（对应 HTML MOCKX.ncm.analysisAgg） */
export interface NcmAnalysisAgg {
  count: number
  rate: number
  ppm: number
  scrap: number
  topN: string
}

/** 层级下钻项（工序→工位→参数，对应 HTML MOCKX.ncm.drill） */
export interface NcmDrill {
  lvl: string
  name: string
  rate: string
}
