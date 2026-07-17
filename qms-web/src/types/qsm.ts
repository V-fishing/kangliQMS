/**
 * QSM 体系管理类型定义
 * 对应 SRS §17 内审管理流程、§18 体系合规监控流程
 */

export type AuditStatus = '计划中' | '进行中' | '已完成'
export type NcLevel = '严重' | '一般' | '观察项'
export type NcStatus = '待整改' | '整改中' | '已验证' | '已关闭'

export interface InternalAudit {
  id: string
  planName: string
  /** 审核范围 */
  scope: string
  auditors: string
  date: string
  status: AuditStatus
  ncCount: number
  score: number
  /** 报表生成状态（§17 PDF+Excel） */
  reportStatus: '未生成' | '已生成'
}

export interface NcFinding {
  id: string
  auditId: string
  /** 关联 GMP/ISO 条款号（§17） */
  clause: string
  level: NcLevel
  desc: string
  dept: string
  status: NcStatus
  /** 整改措施 + 责任人 + 截止时间（§17） */
  action: string
  owner: string
  dueDate: string
}

/** 体系健康度维度（§18 数据汇聚） */
export interface HealthDim {
  name: string
  /** 当前值（百分比或评分） */
  value: number
  /** 预警阈值（低于则预警） */
  threshold: number
  unit: '%' | '分'
}

export interface ImprovementSuggestion {
  id: string
  /** 关联维度 */
  dim: string
  content: string
  /** 是否采纳（§18 采纳建议） */
  adopted: boolean
  /** 决策原因（不采纳时记录，§18） */
  decisionReason: string
  /** 改进效果跟踪（§18） */
  trackResult: string
}

export interface QsmKpi {
  auditPlan: number
  auditDoing: number
  ncOpen: number
  ncSevere: number
  /** 体系综合健康度评分 */
  healthScore: number
  /** 内审整改完成率 */
  rectifyRate: number
}
