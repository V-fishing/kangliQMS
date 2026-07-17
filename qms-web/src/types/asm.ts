/**
 * ASM 售后管理类型定义
 * 对应 SRS §13 售后工单流程、§14 客户满意度管理流程
 */

export type AsmSource = '手动' | 'CRM同步'
export type AsmType = '安装' | '维修' | '投诉'
export type AsmWoStatus = '新建' | '处理中' | '待确认' | '已关闭'

export interface AsmWorkorder {
  id: string
  source: AsmSource
  type: AsmType
  status: AsmWoStatus
  customer: string
  product: string
  /** 分配售后工程师 */
  engineer: string
  /** 现场处理：故障描述 */
  faultDesc: string
  /** 现场处理：处理措施 */
  measure: string
  /** 现场处理：更换配件 */
  parts: string
  createdDate: string
  processDate: string
  confirmDate: string
  /** 关闭后客户满意度评分（1-5），未评价为 null */
  score: number | null
  /** 超时未确认自动关闭（SR-ASM-011） */
  autoClose: boolean
  /** 评分≤2 自动通知负责人（SR-ASM-012） */
  lowScoreNotified: boolean
}

export type SatReason = '响应慢' | '维修不彻底' | '服务态度' | ''
export type SatStatus = '已归档' | '跟进中'

export interface AsmSatisfaction {
  id: string
  workorderId: string
  customer: string
  /** 1-5 分制 */
  score: number
  /** 低分诱因分析（SR-ASM-010） */
  reason: SatReason
  date: string
  status: SatStatus
  /** 负责人跟进改进措施（SR-ASM-013） */
  followUp: string
  /** 关联质量改进：转入不良记录或 CAPA（SR-ASM-014） */
  linkedTo: string
}

export interface AsmKpi {
  woTotal: number
  woDoing: number
  woConfirm: number
  woClosed: number
  avgScore: number
  lowScoreRate: number
}
