/**
 * 多分公司相关类型定义
 * 对应设计方案 §6 登录选公司 / §7 数据隔离 / §8 管理员聚合视图
 */
import type { RoleId } from '@/mock/roles'

/** 公司标识（数据驱动，可扩展 N 家） */
export type CompanyId = 'MZ' | 'SZ' | 'CD'

/** 当前上下文：具体公司 或 集团总览 */
export type CompanyContextId = CompanyId | 'GROUP'

export interface Company {
  id: CompanyId
  name: string
  code: string
  shortName: string
  status: 'active' | 'disabled'
  sort: number
  color: string
  region: string
}

/** 单公司对账号的权限 */
export type CompanyPerm = '无' | '只读' | '可操作'

/** 内置演示账号 */
export interface DemoAccount {
  account: string
  password: string
  name: string
  role: RoleId
  dept: string
  /** 关联公司列表 */
  companies: CompanyId[]
  /** 是否为跨公司/集团管理员 */
  isGroupAdmin: boolean
  /** 各公司权限矩阵 */
  perm: Record<CompanyId, CompanyPerm>
}

/** 各公司核心 KPI（用于概览与各模块看板的差异化取数） */
export interface CompanyKpi {
  /** 一次交检合格率 % */
  passRate: number
  /** 不良率 % */
  defectRate: number
  /** 在制不良数 */
  openNc: number
  /** SPC 告警数 */
  spcAlarm: number
  /** 来料异常数 */
  supplierAbn: number
  /** 审核通过率 % */
  auditPass: number
  /** 近 6 月合格率趋势 */
  monthlyTrend: number[]
  /** 不良 TOP */
  topDefects: { name: string; count: number }[]
}
