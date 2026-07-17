/**
 * 概览 API 服务骨架
 * 当前返回 mock 数据，后端就绪后替换为 request 调用
 */
import type { KpiData } from '@/types/common'
import { overviewKpi, overviewTrend, overviewTodos, overviewAlerts } from '@/mock/overview'

export const overviewApi = {
  getKpi: async (): Promise<KpiData[]> => overviewKpi,

  getTrend: async () => overviewTrend,

  getTodos: async () => overviewTodos,

  getAlerts: async () => overviewAlerts,
}
