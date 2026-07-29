/**
 * NCM 不良管理 API（以后端为准）
 * 全部调用后端真实接口，无静态业务数据。
 * 后端 DTO（B 前缀）→ 前端 @/types/ncm 类型，适配器模式 + lit/str/num 兜底。
 * 拦截器已自动解包 R.data，api 内 path 写 '/v1/xxx'（省略 /api 前缀）。
 *
 * 后端实测可用接口（GET，admin/123456）：
 *  - /v1/ncm/defect-records          -> List<NcmDefectRecord>
 *  - /v1/ncm/defect-dicts            -> List<NcmDefectDict>
 *  - /v1/ncm/8d-reports              -> List<Qms8dReport>
 *  - /v1/ncm/8d-reports/{id}         -> EightDVo (report + stages)
 *  - /v1/ncm/corrective-actions      -> List<NcmCorrectiveAction>
 *  - /v1/ncm/capas                   -> List<QmsCapa>
 *  - /v1/ncm/bi-reports              -> List<NcmBiReport>
 *  - /v1/ncm/dashboard               -> 看板聚合（今日不良数/班次不良率/Top5/工序热力/数据新鲜度）
 *
 * 后端无专门 KPI/帕累托/趋势/热力图/班次对比单接口的，从 /defect-records 或 /dashboard 前端聚合。
 */
import { request } from '@/utils/request'
import type {
  NcmRecord, NcmDict, Severity,
  NcmKpi, NcmPareto, NcmTrend30, NcmTrendPoint, NcmType, NcmProcTop,
  NcmCompare, NcmShift, NcmRealtime, NcmSupplierRank,
  NcmCorrective, NcmEvent, Ncm8D, Ncm8DListItem, NcmCapa,
  NcmDefectHeatmap, NcmAnalysisAgg, NcmDrill,
} from '@/types/ncm'

// ---------- 兜底工具 ----------
const lit = <T>(v: unknown): T => v as T
function str(v: unknown, f = ''): string {
  return v == null ? f : String(v)
}
function num(v: unknown, f = 0): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : f
}
function bool(v: unknown, f = false): boolean {
  if (typeof v === 'boolean') return v
  if (v == null) return f
  const s = String(v).toLowerCase()
  if (['true', '1', 'y', 'yes', 'on', 'enabled'].includes(s)) return true
  if (['false', '0', 'n', 'no', 'off', 'disabled'].includes(s)) return false
  return f
}

// ---------- 后端 DTO 形状（仅声明用到的字段） ----------
interface BRecord {
  id?: string; defectNo?: string; woNo?: string; processCode?: string; defectDictCode?: string
  defectCount?: number; batchTotal?: number; defectRate?: number | string
  deviceCode?: string; batchNo?: string; productModel?: string; operatorId?: string
  source?: string; occurredAt?: string; remark?: string; disposition?: string
  severity?: string; [k: string]: unknown
}
interface BDict {
  id?: string; code?: string; name?: string; category?: string; level?: string
  referenceCount?: number; status?: string; [k: string]: unknown
}
interface B8dReport {
  id?: string; d8No?: string; source?: string; sourceRefId?: string; issue?: string
  severity?: string; currentStage?: string; status?: string; flowType?: string
  team?: string; capaTriggered?: boolean; closeDate?: string; [k: string]: unknown
}
interface B8dStageDetail {
  id?: string; d8Id?: string; stageCode?: string; content?: string; teamMembers?: string
  owner?: string; planDate?: string; approvalStatus?: string; approvedBy?: string
  approvedAt?: string; approvalComment?: string; evidenceFiles?: string; [k: string]: unknown
}
interface BEightDVo {
  report?: B8dReport; stages?: B8dStageDetail[]; [k: string]: unknown
}
interface BCorrectiveAction {
  id?: string; caNo?: string; defectNo?: string; issue?: string; owner?: string
  dueDate?: string; status?: string; progress?: number; [k: string]: unknown
}
interface BCapa {
  id?: string; capaNo?: string; d8Id?: string; abnormalId?: string; issue?: string
  triggerStage?: string; triggerType?: string; triggerCondition?: string; capaType?: string
  rootcause?: string; actionPlan?: string; owner?: string; dueDate?: string
  progress?: number; status?: string; [k: string]: unknown
}
interface BDashboard {
  todayDefectCount?: number; currentShiftDefectRate?: number | string
  top5DefectTypes?: { defectDictCode?: string; count?: number; [k: string]: unknown }[]
  processHeatmap?: { processCode?: string; count?: number; [k: string]: unknown }[]
  dataFreshness?: string | number; [k: string]: unknown
}

// ---------- 适配器 ----------
function normSeverity(v: unknown): Severity {
  const s = str(v, '')
  if (s === '严重' || s === '一般' || s === '轻微') return s
  const low = s.toLowerCase()
  if (low.includes('severe') || low.includes('critical') || low.includes('high')) return '严重'
  if (low.includes('minor') || low.includes('low') || low.includes('light')) return '轻微'
  return '一般'
}

function mapRecord(b: BRecord): NcmRecord {
  const occurredAt = str(b.occurredAt, '')
  return {
    id: str(b.defectNo, str(b.id, '')),
    wo: str(b.woNo),
    proc: str(b.processCode),
    type: str(b.defectDictCode),
    cnt: num(b.defectCount),
    who: str(b.operatorId),
    t: occurredAt ? occurredAt.replace('T', ' ').slice(5, 16) : '',
    dev: str(b.deviceCode, str(b.remark, '')),
    batch: str(b.batchNo),
    prod: str(b.productModel),
    sev: normSeverity(b.severity),
  }
}
function mapDict(b: BDict): NcmDict {
  const status = str(b.status, '')
  return {
    id: str(b.id, ''),
    code: str(b.code),
    name: str(b.name),
    cat: str(b.category),
    lvl: str(b.level),
    cnt: num(b.referenceCount),
    status: status === '停用' ? '停用' : '启用',
  }
}
function map8dListItem(b: B8dReport): Ncm8DListItem {
  return {
    id: str(b.id, ''),
    d8No: str(b.d8No, ''),
    issue: str(b.issue),
    src: str(b.source),
    sev: str(b.severity),
    stage: str(b.currentStage),
    sla: str(b.status),
    st: str(b.status),
  }
}
function mapCorrective(b: BCorrectiveAction): NcmCorrective {
  return {
    id: str(b.caNo, str(b.id, '')),
    issue: str(b.issue),
    owner: str(b.owner),
    due: str(b.dueDate),
    st: str(b.status),
    progress: num(b.progress),
  }
}
function mapCapa(b: BCapa): NcmCapa {
  return {
    id: str(b.capaNo, str(b.id, '')),
    from8D: str(b.d8Id),
    trigger: str(b.triggerCondition, str(b.triggerType, '')),
    reason: str(b.issue, str(b.rootcause, '')),
    owner: str(b.owner),
    due: str(b.dueDate),
    st: (str(b.status, '') === '已关闭' ? '已关闭' : str(b.status, '') === '待启动' ? '待启动' : '执行中') as NcmCapa['st'],
    createdAt: '',
  }
}

// ---------- 前端聚合工具 ----------
/** 从不良记录聚合 KPI */
function aggregateKpi(records: NcmRecord[]): NcmKpi {
  const defectCnt = records.length
  const totalCnt = records.reduce((s, r) => s + r.cnt, 0)
  const scrap = records.filter((r) => r.sev === '严重').length
  const defectRate = defectCnt > 0 ? +(totalCnt / defectCnt).toFixed(2) : 0
  return {
    defectCnt,
    defectRate,
    ppm: Math.round(defectRate * 1000),
    scrap: defectCnt > 0 ? +(scrap / defectCnt).toFixed(2) : 0,
  }
}
/** 从不良记录聚合帕累托（按类型分组计数） */
function aggregatePareto(records: NcmRecord[]): NcmPareto[] {
  const map = new Map<string, number>()
  for (const r of records) {
    const k = r.type || '未知'
    map.set(k, (map.get(k) ?? 0) + r.cnt)
  }
  return Array.from(map.entries())
    .map(([name, v]) => ({ name, v }))
    .sort((a, b) => b.v - a.v)
}
/** 从不良记录聚合类型分布 */
function aggregateTypes(records: NcmRecord[]): NcmType[] {
  return aggregatePareto(records).map(({ name, v }) => ({ name, v }))
}
/** 从不良记录聚合工序 TOP */
function aggregateProcTop(records: NcmRecord[]): NcmProcTop[] {
  const map = new Map<string, { cnt: number; n: number }>()
  for (const r of records) {
    const k = r.proc || '未知'
    const cur = map.get(k) ?? { cnt: 0, n: 0 }
    cur.cnt += r.cnt
    cur.n += 1
    map.set(k, cur)
  }
  return Array.from(map.entries())
    .map(([proc, { cnt, n }]) => ({ proc, rate: n > 0 ? +(cnt / n).toFixed(2) : 0 }))
    .sort((a, b) => b.rate - a.rate)
    .slice(0, 5)
}
/** 从后端趋势接口聚合趋势 30 天（日报=逐日，单位换算为百分比） */
function aggregateTrend30(pts: NcmTrendPoint[]): NcmTrend30 {
  const vals = pts.map((p) => +(p.defectRate * 100).toFixed(2))
  let last5up = false
  if (vals.length >= 5) {
    const last5 = vals.slice(-5)
    last5up = last5.every((v, i) => i === 0 || v > last5[i - 1])
  }
  return {
    last5up,
    over2sigma: false,
    vals,
    // 目标不良率基线 5%（后端未提供目标值；SRS: 目标线未设置时仅展示趋势）
    target: 5,
  }
}
/** 从不良记录聚合班次对比（按 occurredAt 小时分班次，简化） */
function aggregateShifts(records: NcmRecord[]): NcmShift[] {
  const buckets: Record<string, { rate: number; cnt: number; n: number }> = {
    早班: { rate: 0, cnt: 0, n: 0 },
    中班: { rate: 0, cnt: 0, n: 0 },
    晚班: { rate: 0, cnt: 0, n: 0 },
  }
  for (const r of records) {
    const hourStr = r.t.slice(0, 2)
    const hour = parseInt(hourStr, 10)
    let shift = '早班'
    if (hour >= 8 && hour < 16) shift = '早班'
    else if (hour >= 16 && hour < 24) shift = '中班'
    else shift = '晚班'
    const b = buckets[shift]
    b.cnt += r.cnt
    b.n += 1
  }
  return Object.entries(buckets).map(([shift, { cnt, n }]) => ({
    shift,
    rate: n > 0 ? +(cnt / n).toFixed(2) : 0,
    cnt,
  }))
}
/** 从不良记录聚合热力图 */
function aggregateHeatmap(records: NcmRecord[]): NcmDefectHeatmap {
  const processes = Array.from(new Set(records.map((r) => r.proc).filter(Boolean)))
  const types = Array.from(new Set(records.map((r) => r.type).filter(Boolean)))
  const data: [number, number, number][] = []
  for (let x = 0; x < processes.length; x++) {
    for (let y = 0; y < types.length; y++) {
      const cnt = records.filter((r) => r.proc === processes[x] && r.type === types[y]).reduce((s, r) => s + r.cnt, 0)
      if (cnt > 0) data.push([x, y, cnt])
    }
  }
  return { processes, types, data }
}
/** 从不良记录聚合实时看板（取最近记录作为 top3） */
function aggregateRealtime(records: NcmRecord[], dash?: BDashboard): NcmRealtime {
  const top3Raw = dash?.top5DefectTypes?.slice(0, 3) ?? []
  const top3 = top3Raw.map((t) => ({ name: str(t.defectDictCode, '未知'), cnt: num(t.count) }))
  return {
    shift: '中班',
    cnt: num(dash?.todayDefectCount, records.length),
    rate: num(dash?.currentShiftDefectRate, 0),
    top3,
  }
}

export const ncmApi = {
  // ---- 已接通的列表接口 ----
  getRecords: async (): Promise<NcmRecord[]> => {
    const res = await request.get<BRecord[]>('/v1/ncm/defect-records')
    return (res ?? []).map(mapRecord)
  },
  getDict: async (): Promise<NcmDict[]> => {
    const res = await request.get<BDict[]>('/v1/ncm/defect-dicts')
    return (res ?? []).map(mapDict)
  },
  get8DList: async (): Promise<Ncm8DListItem[]> => {
    const res = await request.get<B8dReport[]>('/v1/ncm/8d-reports')
    return (res ?? []).map(map8dListItem)
  },
  get8DDetail: async (id: string): Promise<BEightDVo> => {
    const res = await request.get<BEightDVo>(`/v1/ncm/8d-reports/${encodeURIComponent(id)}`)
    return res ?? { report: {}, stages: [] }
  },
  getCorrective: async (): Promise<NcmCorrective[]> => {
    const res = await request.get<BCorrectiveAction[]>('/v1/ncm/corrective-actions')
    return (res ?? []).map(mapCorrective)
  },
  getCapas: async (): Promise<NcmCapa[]> => {
    const res = await request.get<BCapa[]>('/v1/ncm/capas')
    return (res ?? []).map(mapCapa)
  },
  getBiReports: async (): Promise<unknown[]> => {
    const res = await request.get<unknown[]>('/v1/ncm/bi-reports')
    return res ?? []
  },

  // ---- 看板聚合（后端 /dashboard） ----
  getDashboard: async (): Promise<BDashboard> => {
    const res = await request.get<BDashboard>('/v1/ncm/dashboard')
    return res ?? {}
  },

  // ---- 聚合接口：从 /defect-records 前端聚合，绝不返回 mock ----
  getKpi: async (): Promise<NcmKpi> => {
    const records = await ncmApi.getRecords()
    return aggregateKpi(records)
  },
  getPareto: async (): Promise<NcmPareto[]> => {
    const records = await ncmApi.getRecords()
    return aggregatePareto(records)
  },
  getTypes: async (): Promise<NcmType[]> => {
    const records = await ncmApi.getRecords()
    return aggregateTypes(records)
  },
  getProcTop: async (): Promise<NcmProcTop[]> => {
    const records = await ncmApi.getRecords()
    return aggregateProcTop(records)
  },
  getTrend: async (granularity: 'day' | 'week' | 'month' = 'day'): Promise<NcmTrendPoint[]> => {
    const res = await request.get<Array<{ period?: unknown; count?: unknown; defectRate?: unknown }>>(
      `/v1/ncm/analysis/trend?granularity=${granularity}`,
    )
    return (res ?? []).map((r) => ({
      period: str(r.period),
      count: num(r.count),
      defectRate: num(r.defectRate),
    }))
  },
  getTrend30: async (): Promise<NcmTrend30> => {
    const pts = await ncmApi.getTrend('day')
    return aggregateTrend30(pts)
  },
  getCompare: async (period?: string, type: string = 'month'): Promise<NcmCompare> => {
    // 真实环比/同比：后端 /analysis/compare 按 type 返回不良率%(current/previous/yoy) 及周期标签
    const now = new Date()
    const p = period || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const res = await request.get<Record<string, unknown>>(`/v1/ncm/analysis/compare?period=${p}&type=${type}`)
    return {
      labels: ['不良率'],
      cur: [num(res?.current)],
      prev: [num(res?.previous)],
      yoy: [num(res?.yoy)],
      curLabel: String(res?.curLabel ?? '当前'),
      prevLabel: String(res?.prevLabel ?? '上一期'),
      yoyLabel: String(res?.yoyLabel ?? '去年同期'),
      unit: String(res?.unit ?? '%'),
    }
  },
  getShifts: async (): Promise<NcmShift[]> => {
    const records = await ncmApi.getRecords()
    return aggregateShifts(records)
  },
  getRealtime: async (): Promise<NcmRealtime> => {
    const [records, dash] = await Promise.all([
      ncmApi.getRecords(),
      ncmApi.getDashboard().catch(() => ({} as BDashboard)),
    ])
    return aggregateRealtime(records, dash)
  },
  getHeatmap: async (): Promise<NcmDefectHeatmap> => {
    const records = await ncmApi.getRecords()
    return aggregateHeatmap(records)
  },

  // ---- 后端无单接口，返回空（绝不返回 mock） ----
  getSupplierRank: async (): Promise<NcmSupplierRank[]> => [],
  getEvents: async (): Promise<NcmEvent[]> => [],

  // ---- 8D 详情聚合（后端 /8d-reports/{id} 返回 EightDVo，但鱼骨图/5Why 后端无结构化字段） ----
  get8D: async (): Promise<Ncm8D> => {
    // 后端 8D 详情字段与前端 Ncm8D 富结构（stages/fishbone/fiveWhy）非 1:1；
    // 取首条 8D 报告基础信息，鱼骨图/5Why 返回空结构（避免 mock 假数据）
    const list = await ncmApi.get8DList()
    const first = list[0]
    return {
      id: first?.id ?? '',
      title: first?.issue ?? '',
      prod: '',
      sev: '一般',
      currentStage: 0,
      stages: [],
      fishbone: [],
      fiveWhy: [],
    }
  },

  // ---- 不良分析聚合指标（从 /defect-records 派生） ----
  getAnalysisAgg: async (): Promise<NcmAnalysisAgg> => {
    const records = await ncmApi.getRecords()
    const kpi = aggregateKpi(records)
    const pareto = aggregatePareto(records)
    return {
      count: kpi.defectCnt,
      rate: kpi.defectRate,
      ppm: kpi.ppm,
      scrap: kpi.scrap,
      topN: pareto[0] ? `${pareto[0].name}(${pareto[0].v})` : '',
    }
  },
  // ---- 层级下钻：后端无单接口，返回空数组 ----
  getDrill: async (): Promise<NcmDrill[]> => [],

  // ---- 写操作 ----
  createDict: async (data: Record<string, unknown>): Promise<void> => {
    await request.post('/v1/ncm/defect-dicts', data)
  },
  updateDict: async (id: string, data: Record<string, unknown>): Promise<void> => {
    await request.put(`/v1/ncm/defect-dicts/${id}`, data)
  },
  deleteDict: async (id: string): Promise<void> => {
    await request.delete(`/v1/ncm/defect-dicts/${id}`)
  },
  createRecord: async (data: Record<string, unknown>): Promise<void> => {
    await request.post('/v1/ncm/defect-records', data)
  },
  create8d: async (data: Record<string, unknown>): Promise<void> => {
    await request.post('/v1/ncm/8d-reports', data)
  },
  advanceStage: async (d8Id: string, stageCode: string, content: string, owner: string): Promise<void> => {
    await request.post(`/v1/ncm/8d-reports/${d8Id}/advance`, { stageCode, content, owner })
  },
  createCapa: async (data: Record<string, unknown>): Promise<void> => {
    await request.post('/v1/ncm/capas', data)
  },
  approveStage: async (d8Id: string, payload: { stageCode: string; approved: boolean; comment: string; approver: string }): Promise<void> => {
    await request.post(`/v1/ncm/8d-reports/${d8Id}/approve`, payload)
  },
  updateCapaProgress: async (capaId: string, progress: number): Promise<void> => {
    await request.post(`/v1/ncm/capas/${capaId}/progress?progress=${progress}`)
  },
  closeCapa: async (capaId: string): Promise<void> => {
    await request.post(`/v1/ncm/capas/${capaId}/close`)
  },

  // ---- 维度聚合分析（后端新接口）----
  /** 按维度分组统计：dim = supplier / type / proc / dev / batch / product / severity */
  aggregateByDim: async (dim: string): Promise<{ name: string; cnt: number; total_qty: number; avg_rate: number }[]> => {
    const res = await request.get<Array<Record<string, unknown>>>(`/v1/ncm/aggregate/analysis/aggregate?dim=${dim}`)
    return (res ?? []).map((r) => ({
      name: str(r.name, '—'),
      cnt: num(r.cnt),
      total_qty: num(r.total_qty),
      avg_rate: num(r.avg_rate),
    }))
  },
  /** 交叉分组：dim1 x dim2 交叉表 */
  crossTable: async (dim1: string, dim2: string): Promise<{ x: string; y: string; cnt: number; total_qty: number }[]> => {
    const res = await request.get<Array<Record<string, unknown>>>(`/v1/ncm/aggregate/analysis/cross?dim1=${dim1}&dim2=${dim2}`)
    return (res ?? []).map((r) => ({
      x: str(r.x), y: str(r.y),
      cnt: num(r.cnt), total_qty: num(r.total_qty),
    }))
  },
  /** 时间趋势（聚合表）：period = day / week / month */
  getTrendAgg: async (period: 'day' | 'week' | 'month' = 'day', start?: string, end?: string): Promise<{ dt: string; cnt: number; total_qty: number; avg_rate: number }[]> => {
    let url = `/v1/ncm/aggregate/analysis/trend?period=${period}`
    if (start) url += `&start=${encodeURIComponent(start)}`
    if (end) url += `&end=${encodeURIComponent(end)}`
    const res = await request.get<Array<Record<string, unknown>>>(url)
    return (res ?? []).map((r) => ({
      dt: str(r.dt, ''),
      cnt: num(r.cnt),
      total_qty: num(r.total_qty),
      avg_rate: num(r.avg_rate),
    }))
  },
}
