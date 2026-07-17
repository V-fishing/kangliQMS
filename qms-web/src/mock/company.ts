/**
 * 多分公司 Mock 数据
 * 对应设计方案 §6/§7/§8：公司列表、内置演示账号、集团总览对比、各公司 KPI 隔离
 *
 * 说明：companyId 维度的数据隔离在此集中提供，业务 mock 通过
 * `COMPANY_KPI` / `byCompany` 实现“按当前公司取数”的演示模式。
 */
import type { Company, CompanyId, CompanyKpi, CompanyPerm, DemoAccount } from '@/types/company'

/** 公司列表（数据驱动，可扩展至 N 家） */
export const COMPANIES: Company[] = [
  {
    id: 'MZ',
    name: '康立精密制造（梅州）有限公司',
    code: 'MZ',
    shortName: '梅州',
    status: 'active',
    sort: 1,
    color: '#2a6bb0',
    region: '广东·梅州',
  },
  {
    id: 'SZ',
    name: '康立精密制造（深圳）有限公司',
    code: 'SZ',
    shortName: '深圳',
    status: 'active',
    sort: 2,
    color: '#e07b39',
    region: '广东·深圳',
  },
  {
    id: 'CD',
    name: '康立精密制造（成都）有限公司',
    code: 'CD',
    shortName: '成都',
    status: 'active',
    sort: 3,
    color: '#2f9e6b',
    region: '四川·成都',
  },
]

/** 内置演示账号（账号均小写；密码统一 123456） */
export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    account: 'admin',
    password: '123456',
    name: '吴集团管理员',
    role: 'sysadmin',
    dept: '集团信息部',
    companies: ['MZ', 'SZ', 'CD'],
    isGroupAdmin: true,
    perm: { MZ: '可操作', SZ: '只读', CD: '可操作' },
  },
  {
    account: 'mz.insp',
    password: '123456',
    name: '张梅州检验',
    role: 'inspector',
    dept: '梅州质量部',
    companies: ['MZ'],
    isGroupAdmin: false,
    perm: { MZ: '可操作', SZ: '无', CD: '无' },
  },
  {
    account: 'sz.insp',
    password: '123456',
    name: '李深圳检验',
    role: 'inspector',
    dept: '深圳质量部',
    companies: ['SZ'],
    isGroupAdmin: false,
    perm: { MZ: '无', SZ: '可操作', CD: '无' },
  },
  {
    account: 'sz.sqe',
    password: '123456',
    name: '赵深圳SQE',
    role: 'sqe',
    dept: '深圳质量部',
    companies: ['SZ'],
    isGroupAdmin: false,
    perm: { MZ: '无', SZ: '可操作', CD: '无' },
  },
]

/** 根据账号查找演示账号（大小写不敏感） */
export function findDemoAccount(account: string): DemoAccount | undefined {
  const a = account.trim().toLowerCase()
  return DEMO_ACCOUNTS.find((x) => x.account === a)
}

/** 各公司核心 KPI（差异化的演示数据） */
export const COMPANY_KPI: Record<CompanyId, CompanyKpi> = {
  MZ: {
    passRate: 98.2,
    defectRate: 1.8,
    openNc: 12,
    spcAlarm: 3,
    supplierAbn: 5,
    auditPass: 95.5,
    monthlyTrend: [96.1, 96.8, 97.2, 97.9, 98.0, 98.2],
    topDefects: [
      { name: '尺寸超差', count: 28 },
      { name: '外观划伤', count: 19 },
      { name: '装配间隙', count: 14 },
      { name: '毛刺', count: 9 },
    ],
  },
  SZ: {
    passRate: 96.4,
    defectRate: 3.6,
    openNc: 23,
    spcAlarm: 7,
    supplierAbn: 11,
    auditPass: 89.0,
    monthlyTrend: [94.2, 93.8, 95.1, 95.6, 96.0, 96.4],
    topDefects: [
      { name: '焊点虚焊', count: 41 },
      { name: '外观划伤', count: 26 },
      { name: '尺寸超差', count: 22 },
      { name: '漏装', count: 15 },
    ],
  },
  CD: {
    passRate: 97.5,
    defectRate: 2.5,
    openNc: 17,
    spcAlarm: 5,
    supplierAbn: 8,
    auditPass: 92.3,
    monthlyTrend: [95.5, 95.9, 96.4, 97.0, 97.2, 97.5],
    topDefects: [
      { name: '装配间隙', count: 33 },
      { name: '外观划伤', count: 21 },
      { name: '毛刺', count: 18 },
      { name: '尺寸超差', count: 12 },
    ],
  },
}

/**
 * 通用访问器：按 companyId 从映射中取数据，缺省回退
 */
export function byCompany<T>(
  map: Partial<Record<CompanyId, T>>,
  companyId: CompanyId,
  fallback: T,
): T {
  return map[companyId] ?? fallback
}

/** 集团总览对比行（指标对比） */
export interface GroupKpiRow {
  label: string
  unit: string
  MZ: number
  SZ: number
  /** 越高越好 / 越低越好，用于高亮领先方 */
  better: 'high' | 'low'
}

export const GROUP_KPI: GroupKpiRow[] = [
  { label: '一次交检合格率', unit: '%', MZ: COMPANY_KPI.MZ.passRate, SZ: COMPANY_KPI.SZ.passRate, better: 'high' },
  { label: '不良率', unit: '%', MZ: COMPANY_KPI.MZ.defectRate, SZ: COMPANY_KPI.SZ.defectRate, better: 'low' },
  { label: '在制不良', unit: '项', MZ: COMPANY_KPI.MZ.openNc, SZ: COMPANY_KPI.SZ.openNc, better: 'low' },
  { label: 'SPC 告警', unit: '项', MZ: COMPANY_KPI.MZ.spcAlarm, SZ: COMPANY_KPI.SZ.spcAlarm, better: 'low' },
  { label: '来料异常', unit: '项', MZ: COMPANY_KPI.MZ.supplierAbn, SZ: COMPANY_KPI.SZ.supplierAbn, better: 'low' },
  { label: '审核通过率', unit: '%', MZ: COMPANY_KPI.MZ.auditPass, SZ: COMPANY_KPI.SZ.auditPass, better: 'high' },
]

/** 近 6 月趋势对比（两公司合格率） */
export const GROUP_TREND = {
  months: ['1月', '2月', '3月', '4月', '5月', '6月'],
  MZ: COMPANY_KPI.MZ.monthlyTrend,
  SZ: COMPANY_KPI.SZ.monthlyTrend,
}

/** 集团总览：两公司不良 TOP 对比 */
export const GROUP_DEFECTS = {
  MZ: COMPANY_KPI.MZ.topDefects,
  SZ: COMPANY_KPI.SZ.topDefects,
}

/**
 * 对比用 KPI 指标定义（数据驱动，支持 N 家公司）
 * better: 'high' 越高越好 / 'low' 越低越好
 */
export interface KpiMetricSpec {
  key: 'passRate' | 'defectRate' | 'openNc' | 'spcAlarm' | 'supplierAbn' | 'auditPass'
  label: string
  unit: string
  better: 'high' | 'low'
  /** 雷达归一化参考上限（越低越优类指标用，越大越优类置 100） */
  refMax: number
}

export const KPI_METRICS: KpiMetricSpec[] = [
  { key: 'passRate', label: '一次交检合格率', unit: '%', better: 'high', refMax: 100 },
  { key: 'defectRate', label: '不良率', unit: '%', better: 'low', refMax: 10 },
  { key: 'openNc', label: '在制不良', unit: '项', better: 'low', refMax: 30 },
  { key: 'spcAlarm', label: 'SPC 告警', unit: '项', better: 'low', refMax: 15 },
  { key: 'supplierAbn', label: '来料异常', unit: '项', better: 'low', refMax: 20 },
  { key: 'auditPass', label: '审核通过率', unit: '%', better: 'high', refMax: 100 },
]

/** 将原始指标值归一化为 0~100 的「得分」（越高越好），用于雷达图对比 */
export function normalizeScore(key: KpiMetricSpec['key'], value: number, better: 'high' | 'low', refMax: number): number {
  if (better === 'high') return Math.max(0, Math.min(100, value))
  return Math.max(0, Math.min(100, ((refMax - value) / refMax) * 100))
}

/** 生成任意公司集合的对比行（含领先方 id） */
export interface KpiCompareRow {
  key: KpiMetricSpec['key']
  label: string
  unit: string
  better: 'high' | 'low'
  values: { id: CompanyId; value: number }[]
  leaderId: CompanyId
}

export function buildCompareRows(ids: CompanyId[]): KpiCompareRow[] {
  return KPI_METRICS.map((m) => {
    const values = ids.map((id) => ({ id, value: COMPANY_KPI[id][m.key] }))
    let leaderId = ids[0]
    let best = COMPANY_KPI[ids[0]][m.key]
    for (const id of ids) {
      const v = COMPANY_KPI[id][m.key]
      if (m.better === 'high' ? v > best : v < best) {
        best = v
        leaderId = id
      }
    }
    return {
      key: m.key,
      label: m.label,
      unit: m.unit,
      better: m.better,
      values,
      leaderId,
    }
  })
}

/** 默认权限矩阵（无账号时） */
export const EMPTY_PERM: Record<CompanyId, CompanyPerm> = { MZ: '无', SZ: '无', CD: '无' }
