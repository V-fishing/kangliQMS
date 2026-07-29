/**
 * SPC 过程能力 API
 * 全部调用后端真实接口，无静态业务数据。
 * 后端 DTO（B 前缀）→ 前端 @/types/spc 类型，适配器模式 + lit/str/num 兜底。
 * 拦截器已自动解包 R.data，api 内 path 写 '/v1/xxx'（省略 /api 前缀）。
 *
 * 后端实测可用接口（GET，admin/123456）：
 *  - /v1/spc/subgroups、/v1/spc/params、/v1/spc/rules、/v1/spc/alarms
 *  - /v1/spc/dashboard → 看板聚合
 *  - /v1/spc/capability → 过程能力列表
 *  - /v1/spc/capability/trend?paramId=xxx&months=12 → CPK 趋势
 *  - /v1/spc/control-chart?paramId=xxx → 控制图（子组+控制限）
 *  - /v1/spc/control-limits、/v1/spc/collect-tasks、/v1/spc/notify-channels、/v1/spc/global-config
 */
import { request } from '@/utils/request'
import type {
  SpcSubgroup, SpcLimit, SpcAlarm, SpcParam, SpcRule,
  SpcControlData, ShiftType, SpcKpi, SpcLevel, SpcCpkTrend,
  SpcCollectTask, SpcImportRecord, SpcRuleCfg, SpcHistogram, SpcSupplierCpk,
  SpcNotifyChannel, SpcNotifyRecord,
} from '@/types/spc'

// ---------- 兜底工具 ----------
const lit = <T>(v: unknown): T => v as T
function str(v: unknown, f = ''): string {
  return v == null ? f : String(v)
}
function num(v: unknown, f = 0): number {
  const n = Number(v)
  return isNaN(n) ? f : n
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
interface BSubgroup {
  id?: string; paramId?: string; subgroupNo?: number; xbar?: number; rangeR?: number; subgroupTime?: string
  shift?: string; isOutlier?: boolean; judge?: string; operatorId?: string; [k: string]: unknown
}
interface BParam {
  paramName?: string; procName?: string; unit?: string; specText?: string
  specLower?: number; specUpper?: number; collectFreq?: string; subgroupSize?: number
  chartType?: string; [k: string]: unknown
}
interface BRule { id?: string; ruleCode?: string; ruleName?: string; level?: string; isEnabled?: boolean; [k: string]: unknown }
interface BAlarm {
  id?: string; paramName?: string; currentValue?: number; triggeredRule?: string
  level?: string; alarmTime?: string; status?: string; [k: string]: unknown
}
interface BLimit {
  ucl?: number; cl?: number; lcl?: number
  rUcl?: number; rCl?: number; rLcl?: number
  baselineSource?: string; nSubgroups?: number; [k: string]: unknown
}
interface BControlChart {
  subgroups?: BSubgroup[]; limit?: BLimit; marks?: { i?: number; rule?: string; level?: string; range?: string }[]
  chartType?: string; rules?: { code?: string; level?: string }[]; [k: string]: unknown
}
interface BDashboard {
  cpkDistribution?: { sufficient?: number; adequate?: number; insufficient?: number; [k: string]: unknown }
  pendingAlarms?: number; todaySubgroups?: number; todayDue?: number
  avgCpk?: number; passRate?: number; monitor?: number; [k: string]: unknown
}
interface BCapability {
  id?: string; orgId?: string; paramId?: string; periodType?: string; periodValue?: string
  cp?: number; cpk?: number; pp?: number; ppk?: number; [k: string]: unknown
}
interface BCollectTask {
  id?: string; paramName?: string; procName?: string; collectFreq?: string
  lastValue?: string; nextDue?: string; status?: string; isPlannedDowntime?: boolean; [k: string]: unknown
}
interface BNotifyChannel { id?: string; channel?: string; isEnabled?: boolean; configJson?: string; [k: string]: unknown }
interface BNotifyRecord {
  id?: string; alarmId?: string; channel?: string; channelName?: string
  message?: string; status?: string; sentAt?: string; error?: string; createdAt?: string; [k: string]: unknown
}
interface BGlobalConfig { [k: string]: unknown }
interface BHistogram { bins?: number[]; freq?: number[]; usl?: number; lsl?: number; [k: string]: unknown }
interface BSupplierCpk { sup?: string; mat?: string; cpk?: number; lvl?: string; [k: string]: unknown }
interface BRuleTrigger { code?: string; name?: string; level?: string; cnt?: number; [k: string]: unknown }

function normLevel(v?: string): '预警' | '报警' {
  if (!v) return '预警'
  const s = String(v).toLowerCase()
  if (s.includes('alarm') || s.includes('error') || s === '报警') return '报警'
  return '预警'
}
function normShift(v?: string): ShiftType {
  if (!v) return '早班'
  const s = String(v).toLowerCase()
  if (s.includes('night') || s === '晚班' || s === '夜班') return '晚班'
  if (s.includes('mid') || s === '中班') return '中班'
  return '早班'
}
function normChartType(v?: string): 'Xbar-R' | 'Xbar-s' | 'I-MR' {
  if (!v) return 'Xbar-R'
  const s = String(v).toLowerCase().replace(/[-_]/g, '')
  if (s.includes('imr')) return 'I-MR'
  if (s.includes('xbar') && s.includes('s')) return 'Xbar-s'
  return 'Xbar-R'
}

function mapSubgroup(b: BSubgroup): SpcSubgroup {
  return {
    no: num(b.subgroupNo, 0),
    xbar: num(b.xbar, 0),
    r: num(b.rangeR, 0),
    time: str(b.subgroupTime, undefined),
    shift: normShift(str(b.shift, undefined)),
    outlierRule: bool(b.isOutlier) ? (b.judge ? String(b.judge) : '①') : undefined,
    id: str(b.id, undefined),
    paramId: str(b.paramId, undefined),
    judge: str(b.judge, undefined),
    dataSource: str(b.dataSource, undefined),
    woNo: str(b.woNo, undefined),
    batchNo: str(b.batchNo, undefined),
  }
}
function mapParam(b: BParam): SpcParam & { id: string } {
  const sl = str(b.specText, undefined)
    ?? (b.specLower != null && b.specUpper != null ? `${b.specLower}~${b.specUpper}` : '')
  return {
    id: str((b as { id?: string }).id, ''),
    p: str(b.paramName, ''),
    proc: str(b.procName, ''),
    unit: str(b.unit, ''),
    sl,
    freq: str(b.collectFreq, ''),
    sg: num(b.subgroupSize, 5),
    chartType: normChartType(str(b.chartType, undefined)),
  }
}
function mapRule(b: BRule): SpcRule {
  return {
    code: str(b.ruleCode, ''),
    name: str(b.ruleName, ''),
    desc: '',
    level: normLevel(str(b.level, undefined)),
    enabled: bool(b.isEnabled),
    cnt: 0,
  }
}
function mapRuleCfg(b: BRule): SpcRuleCfg {
  return {
    id: str(b.ruleCode, ''),
    rid: str(b.id, ''),
    name: str(b.ruleName, ''),
    lvl: normLevel(str(b.level, undefined)),
    on: bool(b.isEnabled),
  }
}
function mapAlarm(b: BAlarm): SpcAlarm {
  return {
    id: str(b.id, ''),
    par: str(b.paramName, ''),
    val: num(b.currentValue, 0),
    rule: str(b.triggeredRule, ''),
    lvl: normLevel(str(b.level, undefined)),
    t: str(b.alarmTime, ''),
    st: str(b.status, ''),
  }
}
function mapLimit(b?: BLimit): SpcLimit {
  if (!b) return { ucl: 0, cl: 0, lcl: 0 }
  const nSub = num(b.nSubgroups, 0)
  return {
    ucl: num(b.ucl, 0),
    cl: num(b.cl, 0),
    lcl: num(b.lcl, 0),
    rUcl: b.rUcl != null ? num(b.rUcl, 0) : undefined,
    rCl: b.rCl != null ? num(b.rCl, 0) : undefined,
    rLcl: b.rLcl != null ? num(b.rLcl, 0) : undefined,
    baselineSource: str(b.baselineSource, ''),
    nSubgroups: nSub,
    insufficient: nSub > 0 && nSub < 25,   // SR-SPC-007:子组<25 基线未建立
  }
}
function mapControlChart(b: BControlChart): SpcControlData {
  return {
    subgroups: (b.subgroups ?? []).map(mapSubgroup),
    limit: mapLimit(b.limit),
    marks: (b.marks ?? []).map((m) => ({
      i: num(m.i, 0),
      rule: str(m.rule, ''),
      level: normLevel(str(m.level, undefined)),
      range: m.range != null ? String(m.range) : undefined,
    })),
    chartType: normChartType(str(b.chartType, undefined)),
    rules: (b.rules ?? []).map((r) => ({ code: str(r.code, ''), level: normLevel(str(r.level, undefined)) })),
  }
}
function mapDashboard(b: BDashboard): {
  kpi: SpcKpi; levels: SpcLevel[]
} {
  const d = b.cpkDistribution ?? {}
  const suf = num(d.sufficient, 0)
  const ade = num(d.adequate, 0)
  const ins = num(d.insufficient, 0)
  const total = suf + ade + ins
  const passRate = total > 0 ? +(((suf + ade) / total) * 100).toFixed(1) : 0
  return {
    kpi: {
      cpk: num(b.avgCpk, 0),
      ppk: num(b.avgCpk, 0),
      alarm: num(b.pendingAlarms, 0),
      monitor: num(b.todaySubgroups, 0),
      passRate,
      window: '30天',
      capPassRate: passRate,
      capPassParams: total > 0 ? `${suf + ade}/${total}参数` : '',
    },
    levels: [
      { name: '充足(CPK≥1.33)', value: suf, color: '#2f7d32' },
      { name: '尚可(1.0-1.33)', value: ade, color: '#d4a017' },
      { name: '不足(<1.0)', value: ins, color: '#c0392b' },
    ],
  }
}
function mapCpkTrend(list: BCapability[]): SpcCpkTrend {
  return {
    m: list.map((c) => str(c.periodValue, '')),
    v: list.map((c) => +num(c.cpk, 0).toFixed(2)),
  }
}
function mapCollectTask(b: BCollectTask): SpcCollectTask {
  const raw = str(b.status, '')
  const st = (raw === '已完成' ? '已完成' : raw === '缺失' ? '缺失' : '待采集') as SpcCollectTask['st']
  return {
    id: str(b.id, ''),
    par: str(b.paramName, ''),
    proc: str(b.procName, ''),
    freq: str(b.collectFreq, ''),
    last: str(b.lastValue, ''),
    due: str(b.nextDue, ''),
    st,
    isPlannedDowntime: !!b.isPlannedDowntime,
  }
}
function mapNotifyChannel(b: BNotifyChannel): SpcNotifyChannel {
  return {
    id: str(b.id, ''),
    channel: str(b.channel, ''),
    isEnabled: bool(b.isEnabled),
    configJson: str(b.configJson, undefined),
  }
}
function mapNotifyRecord(b: BNotifyRecord): SpcNotifyRecord {
  return {
    id: str(b.id, ''),
    alarmId: str(b.alarmId, ''),
    channel: str(b.channel, ''),
    channelName: str(b.channelName, undefined),
    message: str(b.message, ''),
    status: str(b.status, ''),
    sentAt: str(b.sentAt, undefined),
    error: str(b.error, undefined),
    createdAt: str(b.createdAt, undefined),
  }
}

export const spcApi = {
  // ---- 已接通的列表接口 ----
  getSubgroups: async (): Promise<SpcSubgroup[]> => {
    const res = await request.get<BSubgroup[]>('/v1/spc/subgroups')
    return (res ?? []).map(mapSubgroup)
  },
  getParams: async (): Promise<(SpcParam & { id: string })[]> => {
    const res = await request.get<BParam[]>('/v1/spc/params')
    return (res ?? []).map(mapParam)
  },
  getRules: async (): Promise<SpcRule[]> => {
    const res = await request.get<BRule[]>('/v1/spc/rules')
    return (res ?? []).map(mapRule)
  },
  getRulesCfg: async (): Promise<SpcRuleCfg[]> => {
    const res = await request.get<BRule[]>('/v1/spc/rules')
    return (res ?? []).map(mapRuleCfg)
  },
  getAlarms: async (params?: { status?: string }): Promise<SpcAlarm[]> => {
    const res = await request.get<BAlarm[]>('/v1/spc/alarms')
    const list = (res ?? []).map(mapAlarm)
    return params?.status ? list.filter((a) => a.st === params.status) : list
  },

  // ---- 看板 ----
  getDashboard: async (): Promise<{ kpi: SpcKpi; levels: SpcLevel[] }> => {
    const res = await request.get<BDashboard>('/v1/spc/dashboard')
    return mapDashboard(res ?? {})
  },
  // 旧名兼容：直接返回 kpi 对象
  getKpi: async (): Promise<SpcKpi> => (await spcApi.getDashboard()).kpi,
  getLevels: async (): Promise<SpcLevel[]> => (await spcApi.getDashboard()).levels,

  // ---- 过程能力 ----
  getCapability: async (): Promise<BCapability[]> => {
    const res = await request.get<BCapability[]>('/v1/spc/capability')
    return res ?? []
  },
  getCpkTrend: async (paramId?: string, months = 12): Promise<SpcCpkTrend> => {
    const query = paramId ? `?paramId=${encodeURIComponent(paramId)}&months=${months}` : `?months=${months}`
    const res = await request.get<BCapability[]>(`/v1/spc/capability/trend${query}`)
    return mapCpkTrend(res ?? [])
  },

  // ---- 控制图 ----
  getControlChart: async (paramId: string): Promise<SpcControlData> => {
    const query = paramId ? `?paramId=${encodeURIComponent(paramId)}` : ''
    const res = await request.get<BControlChart>(`/v1/spc/control-chart${query}`)
    return mapControlChart(res ?? {})
  },
  getLimit: async (paramId?: string): Promise<SpcLimit> => {
    const query = paramId ? `?paramId=${encodeURIComponent(paramId)}` : ''
    const res = await request.get<BLimit | BLimit[]>(`/v1/spc/control-limits${query}`)
    if (Array.isArray(res)) return mapLimit(res[0])
    return mapLimit(res)
  },

  // ---- 采集任务 / 通知渠道 / 全局配置 ----
  getCollectTasks: async (): Promise<SpcCollectTask[]> => {
    const res = await request.get<BCollectTask[]>('/v1/spc/collect-tasks')
    return (res ?? []).map(mapCollectTask)
  },
  /** SR-SPC-003:标记采集缺失 -> status='缺失' + 告警班组长(停产不告警) */
  markMissing: async (taskId: string, reason?: string): Promise<void> => {
    await request.post(`/v1/spc/collect-tasks/${taskId}/mark-missing`, { reason: reason ?? '' })
  },
  /** SR-SPC-003:手动触发到期未录入扫描(返回标记条数) */
  scanMissing: async (): Promise<number> => {
    const res = await request.post<number>('/v1/spc/collect-tasks/scan-missing', null)
    return typeof res === 'number' ? res : 0
  },
  /** SR-SPC-003:计划停产标记(停产期间不告警) */
  markDowntime: async (taskId: string, isPlannedDowntime: boolean, reason?: string): Promise<void> => {
    await request.post(`/v1/spc/collect-tasks/${taskId}/downtime`, { isPlannedDowntime, reason: reason ?? '' })
  },
  getNotifyChannels: async (): Promise<SpcNotifyChannel[]> => {
    const res = await request.get<BNotifyChannel[]>('/v1/spc/notify-channels')
    return (res ?? []).map(mapNotifyChannel)
  },
  /** 启用/停用通知渠道（落库） */
  setNotifyChannel: async (id: string, enabled: boolean): Promise<void> => {
    await request.put(`/v1/spc/notify-channels/${id}/toggle?enabled=${enabled}`)
  },
  /** 推送通知记录（留痕）；alarmId 为空取全局最近记录 */
  getNotifyRecords: async (alarmId?: string): Promise<SpcNotifyRecord[]> => {
    const query = alarmId ? `?alarmId=${encodeURIComponent(alarmId)}` : ''
    const res = await request.get<BNotifyRecord[]>(`/v1/spc/notify-channels/records${query}`)
    return (res ?? []).map(mapNotifyRecord)
  },
  getGlobalConfig: async (): Promise<Record<string, unknown>> => {
    const res = await request.get<BGlobalConfig>('/v1/spc/global-config')
    return lit<Record<string, unknown>>(res ?? {})
  },

  // ---- 看板聚合接口（后端真实计算） ----
  // 直方图：基于参数子组均值分箱（/v1/spc/histogram）
  getHistogram: async (paramId?: string): Promise<SpcHistogram> => {
    const query = paramId ? `?paramId=${encodeURIComponent(paramId)}` : ''
    const res = await request.get<BHistogram>(`/v1/spc/histogram${query}`)
    const b = res ?? {}
    return {
      bins: (b.bins ?? []).map((x: number) => num(x, 0)),
      freq: (b.freq ?? []).map((x: number) => num(x, 0)),
      usl: num(b.usl, 0),
      lsl: num(b.lsl, 0),
    }
  },
  // 跨参数 CPK 对比：后端对每个参数实时计算 CPK（/v1/spc/capability/supplier-cpk）
  getSupplierCpk: async (): Promise<SpcSupplierCpk[]> => {
    const res = await request.get<BSupplierCpk[]>('/v1/spc/capability/supplier-cpk')
    return (res ?? []).map((b) => ({
      sup: str(b.sup, ''),
      mat: str(b.mat, ''),
      cpk: num(b.cpk, 0),
      lvl: str(b.lvl, ''),
    }))
  },
  // 判异规则触发次数：后端统计每条规则命中异常子组数量（/v1/spc/rules/triggers）
  getRuleTriggers: async (): Promise<SpcRule[]> => {
    const res = await request.get<BRuleTrigger[]>('/v1/spc/rules/triggers')
    return (res ?? []).map((b) => ({
      code: str(b.code, ''),
      name: str(b.name, ''),
      desc: '',
      level: normLevel(str(b.level, undefined)),
      enabled: true,
      cnt: num(b.cnt, 0),
    }))
  },
  // 导入历史：后端无单接口，返回空数组（前端新增记录仍可临时缓存）
  getImportHistory: async (): Promise<SpcImportRecord[]> => [],

  // ---- 写操作 ----
  createParam: async (data: Record<string, unknown>): Promise<void> => {
    await request.post('/v1/spc/params', data)
  },
  updateParam: async (id: string, data: Record<string, unknown>): Promise<void> => {
    await request.put(`/v1/spc/params/${id}`, data)
  },
  deleteParam: async (id: string): Promise<void> => {
    await request.delete(`/v1/spc/params/${id}`)
  },
  createSubgroup: async (data: { orgId?: string; paramId: string; subgroupTime?: string; shift?: string; woNo?: string; batchNo?: string; values: number[] }): Promise<void> => {
    await request.post('/v1/spc/subgroups', data)
  },
  closeAlarm: async (alarmId: string, closeReason: string, disposition: string): Promise<void> => {
    await request.post(`/v1/spc/alarms/${alarmId}/close`, { closeReason, disposition })
  },
  toggleRule: async (ruleId: string, enabled: boolean): Promise<void> => {
    await request.put(`/v1/spc/rules/${ruleId}?enabled=${enabled}`)
  },
  calcCapability: async (paramId: string, periodType: string, periodValue: string): Promise<void> => {
    await request.post(`/v1/spc/capability/calc?paramId=${paramId}&periodType=${periodType}&periodValue=${periodValue}`)
  },
  calcControlLimit: async (paramId: string): Promise<void> => {
    await request.post(`/v1/spc/control-limits/calc?paramId=${paramId}`)
  },
}
