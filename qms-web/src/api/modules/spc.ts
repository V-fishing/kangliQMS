/**
 * SPC 过程能力 API 服务骨架
 * 当前返回 mock 数据，后端就绪后替换为 request 调用
 */
import type {
  SpcSubgroup, SpcLimit, SpcAlarm, SpcParam, SpcRule,
  SpcControlData,
} from '@/types/spc'
import {
  spcKpi, spcSubgroups, spcLimit, spcMarks, spcHistogram,
  spcLevels, spcCpkTrend, spcRules, spcAlarms, spcParams,
  spcSupplierCpk,
} from '@/mock/spc'

export const spcApi = {
  getKpi: async () => spcKpi,
  getControlChart: async (paramId: number): Promise<SpcControlData> => ({
    subgroups: spcSubgroups,
    limit: spcLimit,
    marks: spcMarks,
    chartType: 'Xbar-R',
    rules: spcRules.filter((r) => r.enabled).map((r) => ({ code: r.code, level: r.level })),
  }),
  getSubgroups: async (): Promise<SpcSubgroup[]> => spcSubgroups,
  getLimit: async (): Promise<SpcLimit> => spcLimit,
  getHistogram: async () => spcHistogram,
  getLevels: async () => spcLevels,
  getCpkTrend: async () => spcCpkTrend,
  getRules: async (): Promise<SpcRule[]> => spcRules,
  getAlarms: async (params?: { status?: string }): Promise<SpcAlarm[]> => {
    if (params?.status) return spcAlarms.filter((a) => a.st === params.status)
    return spcAlarms
  },
  getParams: async (): Promise<SpcParam[]> => spcParams,
  getSupplierCpk: async () => spcSupplierCpk,
}
