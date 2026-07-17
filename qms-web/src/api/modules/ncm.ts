/**
 * NCM 不良管理 API 服务骨架
 * 当前返回 mock 数据，后端就绪后替换为 request 调用
 */
import type { NcmRecord, Ncm8D, NcmDict, NcmDefectHeatmap } from '@/types/ncm'
import {
  ncmKpi, ncmPareto, ncmTrend30, ncmTypes, ncmProcTop,
  ncmCompare, ncmShifts, ncmRealtime, ncmRecords,
  ncmSupplierRank, ncmCorrective, ncmDict as ncmDictData,
  ncmEvents, ncm8D, ncmHeatmap,
} from '@/mock/ncm'

export const ncmApi = {
  getKpi: async () => ncmKpi,
  getPareto: async () => ncmPareto,
  getTrend30: async () => ncmTrend30,
  getTypes: async () => ncmTypes,
  getProcTop: async () => ncmProcTop,
  getCompare: async () => ncmCompare,
  getShifts: async () => ncmShifts,
  getRealtime: async () => ncmRealtime,
  getRecords: async (params?: { keyword?: string }): Promise<NcmRecord[]> => {
    if (params?.keyword) return ncmRecords.filter((r) => r.wo.includes(params.keyword!) || r.type.includes(params.keyword!))
    return ncmRecords
  },
  getSupplierRank: async () => ncmSupplierRank,
  getCorrective: async () => ncmCorrective,
  getDict: async (): Promise<NcmDict[]> => ncmDictData,
  getEvents: async () => ncmEvents,
  get8D: async (id: string): Promise<Ncm8D> => ncm8D,
  getHeatmap: async (): Promise<NcmDefectHeatmap> => ncmHeatmap,
}
