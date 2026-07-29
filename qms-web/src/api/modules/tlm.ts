/**
 * TLM 工装管理 API
 * 以后端为准：后端无 tlm 模块（巡检 patrol 接近但结构差异大），无对应业务数据的接口返回空，绝不返回 mock。
 *  - GET /api/v1/patrol/tasks  -> 巡检任务（结构与 Tool 不匹配，仅作占位）
 */
import { request } from '@/utils/request'
import type { Tool, ToolMaint, ToolRepair, TlmKpi } from '@/types/tlm'

function arr<T = unknown>(v: unknown): T[] {
  if (Array.isArray(v)) return v as T[]
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>
    if (Array.isArray(o.list)) return o.list as T[]
    if (Array.isArray(o.data)) return o.data as T[]
    if (Array.isArray(o.records)) return o.records as T[]
  }
  return []
}

export const tlmApi = {
  /** 工装台账：后端无对应接口，返回空 */
  getTools: async (): Promise<Tool[]> => {
    // 后端 /v1/patrol/tasks 与 Tool 结构差异大，不强行映射；返回空避免假数据
    await request.get('/v1/patrol/tasks').catch(() => [])
    return []
  },
  /** 保养记录：后端无对应接口，返回空 */
  getMaints: async (): Promise<ToolMaint[]> => [],
  /** 维修记录：后端无对应接口，返回空 */
  getRepairs: async (): Promise<ToolRepair[]> => [],
  /** KPI：后端无聚合接口，由空列表派生全 0 */
  getKpi: async (): Promise<TlmKpi> => {
    const tools = await tlmApi.getTools()
    return {
      toolTotal: tools.length,
      inUse: 0,
      repairing: 0,
      disabled: 0,
      scrapped: 0,
      maintDue: 0,
      locked: 0,
    }
  },
}
