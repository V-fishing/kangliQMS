/**
 * FIA 首件检验 API（以后端为准）
 * 全部走真实后端接口，无静态业务数据。
 *  - GET  /api/v1/fia/tasks          -> List<FiaTask>
 *  - GET  /api/v1/fia/approvals      -> List<FiaApproval>
 *  - GET  /api/v1/fia/tasks/dashboard -> Map{今日任务/完成数/合格率/超时数/状态分布/近7天趋势}
 *  - GET  /api/v1/fia/triggers       -> List<FiaTriggerType>
 *  - GET  /api/v1/fia/stds           -> List<FiaInspStd>
 *  - GET  /api/v1/fia/stds/{id}      -> InspStdVo { std, items }
 *  - GET  /api/v1/fia/intercept-config -> FiaInterceptConfig（无配置行时空兜底）
 *  - PUT  /api/v1/fia/intercept-config -> 保存拦截配置（错误向上抛出）
 *  - GET  /api/v1/fia/sign-config    -> FiaSignConfig
 *
 * 后端无对应接口的项（getMywo/getSupplier/getGauges/getTrace/getInspItems/getLockRate）返回空结构，绝不返回 mock。
 */
import { request } from '@/utils/request'
import type {
  FiaKpi, FiaTaskStatus, FiaPass7d, FiaTrigger, FiaLine, FiaArchived,
  FiaTask, FiaApproval, FiaTimeout, FiaMywo, FiaSupplier, FiaGauge,
  FiaTrace, FiaStdlib, FiaInspItem, FiaInspEntry, FiaTrigConfig, FiaTrigType, FiaStdItem,
  FiaWoLock, FiaTaskCreate,
} from '@/types/fia'

// ---------- 兜底工具 ----------
function lit<T>(v: unknown): T {
  return v as T
}
function str(v: unknown, fallback = ''): string {
  return v == null ? fallback : String(v)
}
function num(v: unknown, fallback = 0): number {
  if (v == null || v === '') return fallback
  const n = typeof v === 'number' ? v : Number(v)
  return isNaN(n) ? fallback : n
}

// ---------- 后端 DTO 形状（仅声明用到的字段） ----------
interface BTask {
  id?: string; code?: string; woNo?: string; lineName?: string; status?: string; supplierId?: string
  productName?: string; procName?: string; batchNo?: string; overallJudge?: string
  triggerType?: string; inspectorId?: string; reviewerId?: string; createdAt?: string
  isUrgent?: boolean; [k: string]: unknown
}
interface BApproval {
  id?: string; woNo?: string; type?: string; approvalType?: string; reason?: string; applicant?: string
  status?: string; createdAt?: string; [k: string]: unknown
}
interface BDashboard {
  todayCount?: number; todayCompleted?: number
  qualifiedCount?: number; completedCount?: number
  passRate?: number | string; overdueCount?: number
  statusDistribution?: Record<string, number>
  trend7d?: Array<{ date?: string; createCount?: number; completeCount?: number }>
  [k: string]: unknown
}
interface BTriggerType {
  id?: string; name?: string; isEnabled?: boolean; description?: string; [k: string]: unknown
}
interface BInspStd {
  id?: string; orgId?: string; code?: string; material?: string; procName?: string; aql?: string
  inspectLevel?: string; samplePlan?: string; ctqText?: string; stdVersion?: string
  status?: string; partNo?: string; supplierId?: string; [k: string]: unknown
}
interface BInterceptConfig {
  id?: string; orgId?: string
  interceptMode?: string; multiTriggerMode?: string
  slaHours?: number | string; escalateFailCount?: number
  [k: string]: unknown
}
interface BInspItemRaw {
  id?: string; seq?: number; itemName?: string; isCtq?: boolean; stdValue?: string
  tolerance?: string; unit?: string; valueType?: string
  enumValues?: string; upperLimit?: number | string; lowerLimit?: number | string; itemType?: string
  measuredValue?: string; judge?: string; [k: string]: unknown
}

// ---------- 适配器 ----------
function mapTask(b: BTask): FiaTask {
  return {
    // id 必须是数据库主键(UUID),供详情/录入/签名等写接口按主键定位;
    // code 仅用于展示校验单号,不可作为主键传给后端。
    id: str(b.id),
    code: str(b.code),
    wo: str(b.woNo),
    line: str(b.lineName),
    st: str(b.status),
    trig: str(b.triggerType),
    who: str(b.inspectorId, str(b.reviewerId)),
    t: str(b.createdAt),
    u: b.isUrgent ? 1 : 0,
    productName: str(b.productName),
    procName: str(b.procName),
    batchNo: str(b.batchNo),
    result: str(b.overallJudge),
    disposition: str(b.disposition),
    supplierId: str(b.supplierId),
  }
}
function mapApproval(b: BApproval): FiaApproval {
  return {
    id: str(b.id),
    type: str(b.approvalType, b.type),
    wo: str(b.woNo),
    reason: str(b.reason),
    who: str(b.applicant),
    t: str(b.createdAt),
    st: str(b.status),
  }
}

/** 状态→饼图颜色，与原 mock 保持一致 */
const STATUS_COLOR: Record<string, string> = {
  待检: '#d4a017',
  进行中: '#1e4d8b',
  待复核: '#8e44ad',
  已完成: '#2f7d32',
  超时: '#c0392b',
  已作废: '#909399',
}

/** dashboard Map → FiaKpi */
function mapKpi(b: BDashboard): FiaKpi {
  // todayCount 近似 pending（待检任务）；overdueCount 即 overdue；passRate 即合格率；locked 后端无对应，置 0
  return {
    pending: num(b.todayCount),
    passRate: num(b.passRate, 0),
    locked: 0,
    overdue: num(b.overdueCount),
  }
}

/** dashboard Map.statusDistribution → FiaTaskStatus[] */
function mapTaskStatus(b: BDashboard): FiaTaskStatus[] {
  const dist = b.statusDistribution || {}
  const order = ['待检', '进行中', '待复核', '已完成', '超时', '已作废']
  const seen = new Set<string>()
  const out: FiaTaskStatus[] = []
  for (const st of order) {
    if (dist[st] != null) {
      out.push({ name: st, value: num(dist[st]), color: STATUS_COLOR[st] || '#909399' })
      seen.add(st)
    }
  }
  // 兜底：后端返回了 order 之外的状态
  for (const k of Object.keys(dist)) {
    if (!seen.has(k)) out.push({ name: k, value: num(dist[k]), color: STATUS_COLOR[k] || '#909399' })
  }
  return out
}

/** dashboard Map.trend7d → FiaPass7d（合格率近似用 completeCount/createCount 的比值；无则 0） */
function mapPass7d(b: BDashboard): FiaPass7d {
  const trend = b.trend7d || []
  const days: string[] = []
  const vals: number[] = []
  for (const it of trend) {
    // 日期取 MM-DD
    const d = str(it.date)
    days.push(d.length >= 10 ? d.slice(5) : d)
    const create = num(it.createCount)
    const complete = num(it.completeCount)
    vals.push(create > 0 ? Math.round((complete / create) * 1000) / 10 : 0)
  }
  return { days, vals, target: 98 }
}

/** dashboard Map.overdueCount → FiaTimeout[]（无明细，仅返回计数占位行） */
function mapTimeouts(b: BDashboard): FiaTimeout[] {
  const cnt = num(b.overdueCount)
  if (cnt <= 0) return []
  return [{
    id: '-', wo: '-', line: '-', od: `${cnt} 项`, who: '-',
  }]
}

/** dashboard Map.statusDistribution → FiaLine[]（后端无产线维度，返回空） */
function mapLines(_b: BDashboard): FiaLine[] {
  return []
}

/** 后端 FiaTriggerType → 前端 FiaTrigger（仅统计列表，value 暂置 0，因后端无聚合统计） */
function mapTrigger(b: BTriggerType): FiaTrigger {
  return { name: str((b as any).typeName, str(b.name)), value: 0 }
}

/** 后端 FiaTriggerType → 前端 FiaTrigType（配置页，含 id/启用状态） */
function mapTrigType(b: any): FiaTrigType {
  return {
    id: str(b.id),
    name: str(b.typeName, str(b.name)),
    enabled: b.enabled === undefined ? !!b.isEnabled : !!b.enabled,
    desc: str(b.description, str(b.desc)),
  }
}

/** 后端 FiaInspStd → 前端 FiaStdlib */
function mapStdlib(b: BInspStd): FiaStdlib {
  return {
    id: str(b.id),
    orgId: str(b.orgId),
    code: str(b.code, str(b.id)),
    mat: str(b.material),
    proc: str(b.procName),
    aql: str(b.aql),
    lvl: str(b.inspectLevel),
    ctq: str(b.ctqText),
    ver: str(b.stdVersion),
    st: str(b.status, '生效'),
    partNo: str(b.partNo),
    supplierId: str(b.supplierId),
  }
}

/** 后端拦截模式文本 → hard/soft */
function normBlockMode(v?: string): 'hard' | 'soft' {
  const s = (v || '').trim()
  if (s.includes('软')) return 'soft'
  return 'hard'
}
/** 后端多触发模式文本 → merge/separate */
function normMultiTrigger(v?: string): 'merge' | 'separate' {
  const s = (v || '').trim()
  if (s.includes('各开') || s.includes('各自') || s.includes('separate')) return 'separate'
  return 'merge'
}

/** 后端 FiaInterceptConfig → 前端 FiaTrigConfig（仅 intercept 字段；triggers/signature 后端无对应接口，置空） */
function mapInterceptToTrigConfig(b: BInterceptConfig | undefined): FiaTrigConfig {
  return {
    triggers: [],
    intercept: {
      blockMode: normBlockMode(b?.interceptMode),
      multiTrigger: normMultiTrigger(b?.multiTriggerMode),
      slaHours: num(b?.slaHours, 2),
      escalateTimes: num(b?.escalateFailCount, 3),
    },
    signature: {
      methods: [
        { key: 'pwd', name: '用户名+密码(默认)', enabled: true },
        { key: 'hand', name: '手写笔迹', enabled: false },
        { key: 'ca', name: 'CA证书(FDA 21 CFR Part 11)', enabled: false },
      ],
      node: 'two',
      granularity: 'order',
    },
  }
}

/** 前端 FiaTrigConfig → 后端 FiaInterceptConfig（PUT 请求体） */
function toBInterceptConfig(cfg: FiaTrigConfig): BInterceptConfig {
  return {
    interceptMode: cfg.intercept.blockMode === 'soft' ? '软提示' : '硬阻断',
    multiTriggerMode: cfg.intercept.multiTrigger === 'separate' ? '各开一张' : '合并一张校验单',
    slaHours: cfg.intercept.slaHours,
    escalateFailCount: cfg.intercept.escalateTimes,
  }
}

// 空兜底常量
const EMPTY_TIMEOUTS: FiaTimeout[] = []
const EMPTY_MYWO: FiaMywo[] = []
const EMPTY_SUPPLIER: FiaSupplier[] = []
const EMPTY_GAUGES: FiaGauge[] = []
const EMPTY_TRACE: FiaTrace[] = []
const EMPTY_INSP_ITEMS: FiaInspItem[] = []

export const fiaApi = {
  // ---- 看板：统一来自 /fia/tasks/dashboard ----
  getKpi: async (): Promise<FiaKpi> => {
    const res = await request.get<BDashboard>('/v1/fia/tasks/dashboard')
    return mapKpi(res ?? {})
  },
  getTaskStatus: async (): Promise<FiaTaskStatus[]> => {
    const res = await request.get<BDashboard>('/v1/fia/tasks/dashboard')
    return mapTaskStatus(res ?? {})
  },
  getPass7d: async (): Promise<FiaPass7d> => {
    const res = await request.get<BDashboard>('/v1/fia/tasks/dashboard')
    return mapPass7d(res ?? {})
  },
  getTimeouts: async (): Promise<FiaTimeout[]> => {
    const res = await request.get<BDashboard>('/v1/fia/tasks/dashboard')
    return mapTimeouts(res ?? {})
  },
  getLines: async (): Promise<FiaLine[]> => {
    const res = await request.get<BDashboard>('/v1/fia/tasks/dashboard')
    return mapLines(res ?? {})
  },
  getLockRate: async (): Promise<number> => 0,

  // ---- 列表 ----
  getTasks: async (): Promise<FiaTask[]> => {
    const res = await request.get<BTask[]>('/v1/fia/tasks')
    return (res ?? []).map(mapTask)
  },
  /** 来料批次→自动拆分检验任务:POST /v1/fia/tasks/batch-by-lot */
  batchCreateByLot: async (lotNo: string): Promise<{ tasksCreated: number; tasks: any[] }> => {
    const res = await request.post<any>('/v1/fia/tasks/batch-by-lot', { lotNo, orgId: '019f701f-0411-71ed-9eac-ab9440335832' })
    return (res && typeof res === 'object' ? res : { tasksCreated: 0, tasks: [] }) as any
  },
  /** 工单锁定状态(SR-FIA-022~026):查工单当前锁定记录,无则 null */
  getWoLock: async (woNo: string): Promise<FiaWoLock | null> => {
    if (!woNo) return null
    const res = await request.get<any>('/v1/fia/wo-lock', { params: { woNo } })
    return res ?? null
  },
  getTaskDetail: async (id: string): Promise<{ task: FiaTask; items: FiaInspEntry[] }> => {
    const res = await request.get<{ task?: BTask; items?: BInspItemRaw[] }>(`/v1/fia/tasks/${id}`)
    const t = res?.task ?? {}
    const items: FiaInspEntry[] = (res?.items ?? []).map((it, i) => ({
      id: str(it.id),
      no: it.seq ?? i + 1,
      name: str(it.itemName),
      ctq: !!it.isCtq,
      std: str(it.stdValue),
      tol: str(it.tolerance),
      unit: str(it.unit),
      val: str(it.measuredValue),
      result: str(it.judge),
    }))
    return {
      task: mapTask(t),
      items,
    }
  },
  /** 不合格处理路径:退货/返工/让步接收;让步接收后端自动发起审批单 */
  setDisposition: async (taskId: string, disposition: string, remark?: string): Promise<void> => {
    await request.post(`/v1/fia/tasks/${taskId}/disposition`, null, { params: { disposition, remark } })
  },
  /** 新建任务时按检验标准预览其检验项(只读确认),来自 GET /v1/fia/stds/{id} -> { std, items } */
  getStdItems: async (stdId: string): Promise<FiaInspEntry[]> => {
    const res = await request.get<{ items?: BInspItemRaw[] }>(`/v1/fia/stds/${stdId}`)
    return (res?.items ?? []).map((it, i) => ({
      id: str(it.id),
      no: it.seq ?? i + 1,
      name: str(it.itemName),
      ctq: !!it.isCtq,
      std: str(it.stdValue),
      tol: str(it.tolerance),
      unit: str(it.unit),
      val: '',
      result: '',
    }))
  },
  getApprovals: async (): Promise<FiaApproval[]> => {
    const res = await request.get<BApproval[]>('/v1/fia/approvals')
    return (res ?? []).map(mapApproval)
  },
  approveApproval: async (id: string, opinion: string, approved: boolean): Promise<void> => {
    await request.post(`/v1/fia/approvals/${id}/approve`, null, { params: { opinion, approved } })
  },

  // ---- 触发事件类型 ----
  getTriggers: async (): Promise<FiaTrigger[]> => {
    const res = await request.get<BTriggerType[]>('/v1/fia/triggers')
    return (res ?? []).map(mapTrigger)
  },

  // 触发类型配置（配置页，含增删改）
  getTriggerTypes: async (): Promise<FiaTrigType[]> => {
    const res = await request.get<any[]>('/v1/fia/triggers')
    return (res ?? []).map(mapTrigType)
  },
  createTriggerType: async (t: { name: string; desc?: string; enabled?: boolean }): Promise<void> => {
    // 后端实体字段为 name / description / isEnabled；
    // org_id 由后端按当前登录用户上下文自动填充(真实 UUID),前端无需传业务代码
    await request.post<void>('/v1/fia/triggers', { name: t.name, description: t.desc ?? '', isEnabled: t.enabled ?? true })
  },
  updateTriggerType: async (t: { id: string; name: string; desc?: string; enabled?: boolean }): Promise<void> => {
    // 后端 PUT /triggers/{id}，实体字段 name / description / isEnabled
    await request.put<void>(`/v1/fia/triggers/${t.id}`, { name: t.name, description: t.desc ?? '', isEnabled: t.enabled })
  },
  deleteTriggerType: async (id: string): Promise<void> => {
    await request.delete<void>(`/v1/fia/triggers/${id}`)
  },
  toggleTriggerType: async (id: string, enabled: boolean): Promise<void> => {
    // 后端 PUT /triggers/{id}/toggle?enabled=xxx（boolean 必填）
    await request.put<void>(`/v1/fia/triggers/${id}/toggle`, null, { params: { enabled } })
  },

  // ---- 检验标准库 ----
  getStdlib: async (): Promise<FiaStdlib[]> => {
    const res = await request.get<BInspStd[]>('/v1/fia/stds')
    return (res ?? []).map(mapStdlib)
  },
  /** 检验标准详情（含检验项明细：标准值/公差/单位），GET /v1/fia/stds/{id} -> InspStdVo { std, items } */
  getStdDetail: async (id: string): Promise<{ header: FiaStdlib; items: FiaStdItem[] }> => {
    const res = await request.get<{ std?: BInspStd; items?: BInspItemRaw[] }>(`/v1/fia/stds/${id}`)
    const std = res?.std ?? {}
    const header: FiaStdlib = {
      id: str(std.id),
      orgId: str(std.orgId),
      code: str(std.code),
      mat: str(std.material),
      proc: str(std.procName),
      aql: str(std.aql),
      lvl: str(std.inspectLevel),
      ctq: str(std.ctqText),
      ver: str(std.stdVersion),
      st: str(std.status),
    }
    const items: FiaStdItem[] = (res?.items ?? []).map((it, i) => ({
      id: str(it.id),
      seq: it.seq ?? i + 1,
      name: str(it.itemName),
      ctq: !!it.isCtq,
      std: str(it.stdValue),
      tol: str(it.tolerance),
      unit: str(it.unit),
      // 后端 value_type 原始值为 '数值'/'文本', 保持原样透传, 避免被错改成
      // 'numeric'/'enum' 导致 Stdlib 编辑时按 '数值' 判定失败、清空公差/单位
      valueType: ((it.valueType as string) || '数值'),
      enumValues: str(it.enumValues),
      specUpper: num(it.upperLimit),
      specLower: num(it.lowerLimit),
      itemType: str(it.itemType),
    }))
    return { header, items }
  },
  /** 来料批次驱动：按 物料编码 + 供应商 + 工序 从标准库自动匹配检验标准（后端 matchStd） */
  matchStd: async (orgId: string, partNo: string, supplierId?: string, procName?: string): Promise<FiaStdlib | null> => {
    if (!partNo) return null
    const res = await request.get<BInspStd>('/v1/fia/tasks/match-std', {
      params: { orgId, partNo, supplierId: supplierId || undefined, procName: procName || undefined },
    })
    return res ? mapStdlib(res) : null
  },
  getInspItems: async (): Promise<FiaInspItem[]> => EMPTY_INSP_ITEMS,

  // ---- 后端无对应接口：返回空，绝不返回 mock ----
  getMywo: async (): Promise<FiaMywo[]> => EMPTY_MYWO,
  getSupplier: async (): Promise<FiaSupplier[]> => EMPTY_SUPPLIER,
  getGauges: async (): Promise<FiaGauge[]> => EMPTY_GAUGES,
  getTrace: async (): Promise<FiaTrace[]> => EMPTY_TRACE,

  // ---- 追溯归档（真实后端接口） ----
  getArchives: async (): Promise<FiaArchived[]> => {
    const res = await request.get<any[]>('/v1/fia/tasks/archives')
    return (res ?? []) as FiaArchived[]
  },
  /** 单条归档报告详情（实体），taskId 支持主键 UUID 或校验单号 code */
  getArchive: async (taskId: string): Promise<Record<string, unknown> | null> => {
    const res = await request.get<Record<string, unknown>>(`/v1/fia/tasks/${taskId}/archive`)
    return (res ?? null) as Record<string, unknown> | null
  },
  getTaskLog: async (id: string): Promise<FiaTrace[]> => {
    const res = await request.get<any[]>(`/v1/fia/tasks/${id}/log`)
    return (res ?? []) as FiaTrace[]
  },

  // ---- 拦截/签名配置 ----
  // 读取：后端无配置行时返回空结构兜底（首次进入不报错）；保存：错误向上抛出由页面提示。
  getTrigConfig: async (): Promise<FiaTrigConfig> => {
    const res = await request.get<BInterceptConfig>('/v1/fia/intercept-config')
    return mapInterceptToTrigConfig(res ?? undefined)
  },
  saveTrigConfig: async (cfg: FiaTrigConfig): Promise<void> => {
    await request.put<void>('/v1/fia/intercept-config', toBInterceptConfig(cfg))
  },

  // ---- 电子签名配置(独立接口,控制两级/三级、粒度、方式) ----
  getSignConfig: async (): Promise<any> => {
    const res = await request.get<any>('/v1/fia/sign-config')
    return res ?? null
  },
  saveSignConfig: async (cfg: Record<string, unknown>): Promise<void> => {
    await request.put<void>('/v1/fia/sign-config', cfg)
  },

  // ---- 写操作 ----
  createTask: async (data: FiaTaskCreate): Promise<void> => {
    await request.post('/v1/fia/tasks', data)
  },
  enterResults: async (taskId: string, items: Array<{ id: string; measuredValue: string; judge: string }>): Promise<void> => {
    await request.post(`/v1/fia/tasks/${taskId}/items`, { items })
  },
  signInspector: async (taskId: string, password: string, itemId?: string): Promise<void> => {
    await request.post(`/v1/fia/tasks/${taskId}/sign-inspector`, { password, itemId })
  },
  signReviewer: async (taskId: string, password: string, itemId?: string): Promise<void> => {
    await request.post(`/v1/fia/tasks/${taskId}/sign-reviewer`, { password, itemId })
  },
  signApprover: async (taskId: string, password: string): Promise<void> => {
    await request.post(`/v1/fia/tasks/${taskId}/sign-approver`, { password })
  },
  createStd: async (data: Record<string, unknown>): Promise<void> => {
    await request.post('/v1/fia/stds', data)
  },
  updateStd: async (id: string, data: Record<string, unknown>): Promise<void> => {
    await request.put(`/v1/fia/stds/${id}`, data)
  },
  deleteStd: async (id: string): Promise<void> => {
    await request.delete(`/v1/fia/stds/${id}`)
  },
}
