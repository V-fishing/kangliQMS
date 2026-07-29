/**
 * QSM 体系管理 API
 * 以后端为准：后端无 qsm 专门模块，复用 SQM 审核记录 / 不符合项接口做 DTO 适配；
 * 体系健康度维度 / 改进建议 / 体系 KPI 无对应接口返回空，绝不返回 mock。
 *  - GET /api/v1/sqm/audits/records -> 适配为 InternalAudit[]
 *  - GET /api/v1/sqm/audits/ncs     -> 适配为 NcFinding[]
 */
import { request } from '@/utils/request'
import type { InternalAudit, NcFinding, HealthDim, ImprovementSuggestion, QsmKpi } from '@/types/qsm'

function lit<T>(v: unknown): T {
  return v as T
}
function str(v: unknown, fallback = ''): string {
  return v == null ? fallback : String(v)
}
function num(v: unknown, fallback = 0): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}
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

// ---------- 后端 DTO 形状 ----------
interface BRecord {
  id?: string; recordNo?: string; planId?: string; supplierId?: string; auditType?: string
  auditLead?: string; auditDate?: string; score?: number; result?: string; status?: string
  ncCount?: number; conclusion?: string; scope?: string; [k: string]: unknown
}
interface BNc {
  id?: string; ncNo?: string; recordId?: string; supplierId?: string; clause?: string
  description?: string; level?: string; responsible?: string; deadline?: string; status?: string
  verifyResult?: string; verifyComment?: string; verifyDate?: string; closeDate?: string
  needSiteReview?: boolean; [k: string]: unknown
}

function normAuditStatus(v: string): InternalAudit['status'] {
  if (v === '已完成' || v === 'done' || v === 'completed') return '已完成'
  if (v === '进行中' || v === 'doing' || v === 'in_progress') return '进行中'
  return '计划中'
}
function normNcLevel(v: string): NcFinding['level'] {
  if (v === '严重' || v === 'major' || v === 'critical') return '严重'
  if (v === '观察项' || v === 'observation') return '观察项'
  return '一般'
}
function normNcStatus(v: string): NcFinding['status'] {
  if (v === '已关闭' || v === 'closed') return '已关闭'
  if (v === '已验证' || v === 'verified') return '已验证'
  if (v === '整改中' || v === 'rectifying') return '整改中'
  return '待整改'
}

function mapRecord(b: BRecord): InternalAudit {
  return {
    id: str(b.id) || str(b.recordNo),
    planName: str(b.conclusion) || str(b.auditType) || '内审记录',
    scope: str(b.scope) || str(b.conclusion) || '',
    auditors: str(b.auditLead),
    date: str(b.auditDate),
    status: normAuditStatus(str(b.status)),
    ncCount: num(b.ncCount),
    score: num(b.score),
    reportStatus: '未生成',
  }
}
function mapNc(b: BNc): NcFinding {
  const status = normNcStatus(str(b.status))
  return {
    id: str(b.id) || str(b.ncNo),
    auditId: str(b.recordId),
    clause: str(b.clause),
    level: normNcLevel(str(b.level)),
    desc: str(b.description),
    dept: str(b.responsible),
    status,
    action: str(b.verifyComment),
    owner: str(b.responsible),
    dueDate: str(b.deadline),
  }
}

/** 由内审记录 + 不符合项派生 QSM 体系 KPI */
function buildKpi(audits: InternalAudit[], findings: NcFinding[]): QsmKpi {
  return {
    auditPlan: audits.filter((a) => a.status === '计划中').length,
    auditDoing: audits.filter((a) => a.status === '进行中').length,
    ncOpen: findings.filter((n) => n.status !== '已关闭').length,
    ncSevere: findings.filter((n) => n.level === '严重' && n.status !== '已关闭').length,
    healthScore: 0,
    rectifyRate: 0,
  }
}

export const qsmApi = {
  getKpi: async (): Promise<QsmKpi> => {
    const [audits, findings] = await Promise.all([qsmApi.getAudits(), qsmApi.getNcFindings()])
    return buildKpi(audits, findings)
  },
  getAudits: async (): Promise<InternalAudit[]> => {
    const res = await request.get<BRecord[]>('/v1/sqm/audits/records')
    return arr<BRecord>(res).map(mapRecord)
  },
  getNcFindings: async (): Promise<NcFinding[]> => {
    const res = await request.get<BNc[]>('/v1/sqm/audits/ncs')
    return arr<BNc>(res).map(mapNc)
  },
  // 体系健康度维度：后端无对应接口，返回空
  getHealthDims: async (): Promise<HealthDim[]> => [],
  // 改进建议：后端无对应接口，返回空
  getImprovementSuggestions: async (): Promise<ImprovementSuggestion[]> => [],
}
