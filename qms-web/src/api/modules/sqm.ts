/**
 * SQM 供应商质量 API 服务骨架
 * 当前返回 mock 数据，后端就绪后替换为 request 调用
 */
import type {
  Supplier, AuditPlan, NcItem, ChangeOrder,
  Abnormal, FmeaItem, TraceNode,
} from '@/types/sqm'
import {
  sqmKpi, suppliers, auditPlans, auditRecords, ncItems,
  changeOrders, abnormals, fmeaItems, traceTreeData,
} from '@/mock/sqm'

export const sqmApi = {
  getKpi: async () => sqmKpi,
  getSuppliers: async (params?: { keyword?: string }): Promise<Supplier[]> => {
    if (params?.keyword) return suppliers.filter((s) => s.name.includes(params.keyword!) || s.code.includes(params.keyword!))
    return suppliers
  },
  getAuditPlans: async (): Promise<AuditPlan[]> => auditPlans,
  getAuditRecords: async () => auditRecords,
  getNcItems: async (): Promise<NcItem[]> => ncItems,
  getChangeOrders: async (): Promise<ChangeOrder[]> => changeOrders,
  getAbnormals: async (): Promise<Abnormal[]> => abnormals,
  getFmeaItems: async (): Promise<FmeaItem[]> => fmeaItems,
  getTraceTree: async (lotId: string): Promise<TraceNode[]> => traceTreeData,
}
