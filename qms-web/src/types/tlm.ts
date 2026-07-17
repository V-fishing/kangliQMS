/**
 * TLM 工装管理类型定义
 * 对应 SRS §15 工装全生命周期流程
 */

export type ToolStatus = '使用中' | '维修中' | '停用' | '报废'
/** 工装子状态（首件验证不通过锁定，对应 §15 InUse/Locked） */
export type ToolLock = '正常' | '锁定'

export interface Tool {
  id: string
  /** 一物一码（§15 采购入库一物一码绑定BOM） */
  code: string
  name: string
  category: string
  /** 绑定 BOM 工序 */
  bom: string
  status: ToolStatus
  /** 首件验证锁定状态 */
  lock: ToolLock
  location: string
  purchaseDate: string
  /** 已使用寿命（次/小时） */
  lifeUsed: number
  /** 寿命上限（达到强制下线，§15 ForceRetire） */
  lifeLimit: number
  /** 下次周/月/年保养到期 */
  nextMaint: string
  /** 上次首件验证结果 */
  firstArticleVerified: boolean
}

export type MaintType = '周保养' | '月保养' | '年保养'

export interface ToolMaint {
  id: string
  toolId: string
  type: MaintType
  date: string
  result: '完成' | '异常'
  operator: string
}

export interface ToolRepair {
  id: string
  toolId: string
  faultDesc: string
  date: string
  /** 维修结果（§15 Repair→InUse 或 →Scrap） */
  result: '修复合格' | '无法修复'
  /** 维修完成精度验证（§15 精度验证合格） */
  precisionVerified: boolean
  operator: string
}

export interface TlmKpi {
  toolTotal: number
  inUse: number
  repairing: number
  disabled: number
  scrapped: number
  maintDue: number
  locked: number
}
