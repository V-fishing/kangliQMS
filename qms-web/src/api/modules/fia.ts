/**
 * FIA 首件检验 API 服务骨架
 * 当前返回 mock 数据，后端就绪后替换为 request 调用
 */
import type { FiaTask, FiaApproval, FiaTrace, FiaStdlib, FiaTrigConfig } from '@/types/fia'
import {
  fiaKpi, fiaTaskStatus, fiaPass7d, fiaTriggers, fiaLines,
  fiaLockRate, fiaTasks, fiaApprovals, fiaTimeouts,
  fiaMywo, fiaSupplier, fiaGauges, fiaTrace, fiaStdlib,
  fiaInspItems, fiaTrigConfig,
} from '@/mock/fia'

export const fiaApi = {
  getKpi: async () => fiaKpi,
  getTaskStatus: async () => fiaTaskStatus,
  getPass7d: async () => fiaPass7d,
  getTriggers: async () => fiaTriggers,
  getLines: async () => fiaLines,
  getLockRate: async () => fiaLockRate,
  getTasks: async (params?: { st?: string; keyword?: string }): Promise<FiaTask[]> => {
    let result = fiaTasks
    if (params?.st) result = result.filter((t) => t.st === params.st)
    if (params?.keyword) result = result.filter((t) => t.wo.includes(params.keyword!) || t.id.includes(params.keyword!))
    return result
  },
  getApprovals: async (): Promise<FiaApproval[]> => fiaApprovals,
  getTimeouts: async () => fiaTimeouts,
  getMywo: async () => fiaMywo,
  getSupplier: async () => fiaSupplier,
  getGauges: async () => fiaGauges,
  getTrace: async (wo?: string): Promise<FiaTrace[]> => fiaTrace,
  getStdlib: async (): Promise<FiaStdlib[]> => fiaStdlib,
  getInspItems: async () => fiaInspItems,
  getTrigConfig: async (): Promise<FiaTrigConfig> => fiaTrigConfig,
  saveTrigConfig: async (config: FiaTrigConfig) => { console.info('save', config) },
}
