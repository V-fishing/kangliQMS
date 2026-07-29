/**
 * 概览 API 服务
 * 以后端为准：后端无专门 overview 接口，拼装 /spc/dashboard + /sqm/dashboard/incoming
 * 适配为前端 KpiData / 趋势 / 待办 / 告警等类型；无对应项返回空，绝不返回 mock。
 */
import { request } from '@/utils/request'
import type { KpiData } from '@/types/common'

// ---------- 后端 DTO 形状 ----------
interface SpcDashboardDto {
  cpkDistribution?: { sufficient?: number; adequate?: number; insufficient?: number; [k: string]: unknown }
  pendingAlarms?: number
  todaySubgroups?: number
  todayDue?: number
  [k: string]: unknown
}

interface SqmDashboardIncomingDto {
  todayLots?: number
  passRate?: number
  pendingAbnormals?: number
  top5BadSuppliers?: { supplierId?: string; supplierName?: string; failCount?: number }[]
  trend7d?: { date?: string; passRate?: number; lots?: number }[]
  [k: string]: unknown
}

function num(v: unknown, fallback = 0): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}
function str(v: unknown, fallback = ''): string {
  return v == null ? fallback : String(v)
}

/** 今日待办（后端无专门接口，由 SPC 今日待办子组 + 来料异常待处理派生，结构对齐 overviewTodos） */
export interface OverviewTodo {
  id: string
  title: string
  module: string
  priority: 'high' | 'medium' | 'low'
  time: string
}

/** 实时告警（后端无专门接口，由 SPC 待处理告警派生；无则返回空） */
export interface OverviewAlert {
  id: string
  type: string
  msg: string
  time: string
  level: string
}

export const overviewApi = {
  /** KPI：拼装 SPC 看板 + SQM 来料看板，适配为前端 KpiData[] */
  getKpi: async (): Promise<KpiData[]> => {
    const [spc, sqm] = await Promise.all([
      request.get<SpcDashboardDto>('/v1/spc/dashboard').catch(() => ({} as SpcDashboardDto)),
      request.get<SqmDashboardIncomingDto>('/v1/sqm/dashboard/incoming').catch(() => ({} as SqmDashboardIncomingDto)),
    ])

    const spcAlarm = num(spc?.pendingAlarms)
    const spcMonitor = num(spc?.todaySubgroups)
    const todayDue = num(spc?.todayDue)
    const dist = spc?.cpkDistribution ?? {}
    const suf = num(dist.sufficient)
    const ade = num(dist.adequate)
    const ins = num(dist.insufficient)
    const total = suf + ade + ins
    const capPassRate = total > 0 ? +(((suf + ade) / total) * 100).toFixed(1) : 0

    const todayLots = num(sqm?.todayLots)
    const passRate = num(sqm?.passRate)
    const pendingAbnormals = num(sqm?.pendingAbnormals)

    return [
      { label: '来料合格率', value: +passRate.toFixed(1), unit: '%', sub: `今日 ${todayLots} 批`, status: passRate >= 98 ? 'ok' : passRate >= 95 ? 'warn' : 'bad' },
      { label: 'SPC 待处理告警', value: spcAlarm, unit: '项', sub: '过程监控', status: spcAlarm <= 4 ? 'ok' : spcAlarm <= 8 ? 'warn' : 'bad' },
      { label: '今日待采集', value: todayDue, unit: '项', sub: 'SPC 子组', status: todayDue <= 5 ? 'ok' : 'warn' },
      { label: '来料异常待处理', value: pendingAbnormals, unit: '项', sub: '供应商', status: pendingAbnormals <= 3 ? 'ok' : pendingAbnormals <= 6 ? 'warn' : 'bad' },
      { label: '参数能力达标率', value: capPassRate, unit: '%', sub: total > 0 ? `${suf + ade}/${total} 参数` : '—', status: capPassRate >= 90 ? 'ok' : capPassRate >= 80 ? 'warn' : 'bad' },
      { label: '今日 SPC 子组', value: spcMonitor, unit: '组', sub: '过程监控', status: 'ok' },
    ]
  },

  /** 趋势：取 SQM 来料看板 trend7d（合格率），无对应项返回空结构 */
  getTrend: async (): Promise<{ days: string[]; passRate: number[]; defectRate: number[] }> => {
    const sqm = await request.get<SqmDashboardIncomingDto>('/v1/sqm/dashboard/incoming').catch(() => ({} as SqmDashboardIncomingDto))
    const trend = Array.isArray(sqm?.trend7d) ? sqm.trend7d : []
    return {
      days: trend.map((t) => str(t.date).slice(5)), // MM-DD
      passRate: trend.map((t) => +num(t.passRate).toFixed(2)),
      defectRate: trend.map((t) => +(100 - num(t.passRate)).toFixed(2)),
    }
  },

  /** 待办：后端无专门接口，由今日待采集子组 + 来料异常待处理派生 */
  getTodos: async (): Promise<OverviewTodo[]> => {
    const [spc, sqm] = await Promise.all([
      request.get<SpcDashboardDto>('/v1/spc/dashboard').catch(() => ({} as SpcDashboardDto)),
      request.get<SqmDashboardIncomingDto>('/v1/sqm/dashboard/incoming').catch(() => ({} as SqmDashboardIncomingDto)),
    ])
    const todos: OverviewTodo[] = []
    const todayDue = num(spc?.todayDue)
    if (todayDue > 0) {
      todos.push({ id: 'T-SPC-DUE', title: `SPC 今日待采集: ${todayDue} 项`, module: 'spc', priority: todayDue > 5 ? 'high' : 'medium', time: '今日' })
    }
    const pendingAbnormals = num(sqm?.pendingAbnormals)
    if (pendingAbnormals > 0) {
      todos.push({ id: 'T-SQM-ABN', title: `来料异常待处理: ${pendingAbnormals} 项`, module: 'sqm', priority: pendingAbnormals > 3 ? 'high' : 'medium', time: '今日' })
    }
    const spcAlarm = num(spc?.pendingAlarms)
    if (spcAlarm > 0) {
      todos.push({ id: 'T-SPC-ALARM', title: `SPC 告警处理: ${spcAlarm} 项`, module: 'spc', priority: 'high', time: '今日' })
    }
    return todos
  },

  /** 告警：后端无专门接口，由 SPC 待处理告警数派生；无则返回空 */
  getAlerts: async (): Promise<OverviewAlert[]> => {
    const spc = await request.get<SpcDashboardDto>('/v1/spc/dashboard').catch(() => ({} as SpcDashboardDto))
    const spcAlarm = num(spc?.pendingAlarms)
    if (spcAlarm <= 0) return []
    return [{
      id: 'A-SPC-ALARM',
      type: 'spc',
      msg: `SPC 待处理告警: ${spcAlarm} 项`,
      time: '今日',
      level: spcAlarm > 8 ? 'alarm' : spcAlarm > 4 ? 'warn' : 'info',
    }]
  },
}
