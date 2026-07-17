/**
 * 公共类型定义
 */

/** 统一 API 响应结构 */
export interface ApiResponse<T = unknown> {
  code: number
  message: string
  data: T
}

/** 分页响应 */
export interface PageResult<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
}

/** 分页查询参数 */
export interface PageQuery {
  page?: number
  pageSize?: number
  keyword?: string
}

/** 通用状态枚举 */
export type StatusType = 'pending' | 'processing' | 'done' | 'rejected' | 'overdue'

/** 班次类型 */
export type ShiftType = '早班' | '中班' | '晚班'

/** 审批类型 */
export type ApprovalType = '豁免开工' | '紧急放行' | '让步接收' | '变更会签' | '8D审批' | '整改验证'

/** 严重程度 */
export type Severity = '严重' | '一般' | '轻微'

/** KPI 卡片数据 */
export interface KpiData {
  label: string
  value: number | string
  unit?: string
  sub?: string
  status?: 'ok' | 'warn' | 'bad'
}

/** 时间线节点 */
export interface TimelineNode {
  node: string
  t: string
  o: string
  done?: boolean
}
