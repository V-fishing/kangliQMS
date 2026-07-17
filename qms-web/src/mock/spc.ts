/**
 * SPC 过程能力 Mock 数据
 * 从 HTML 原型 MOCK.spc 提取
 */
import type {
  SpcKpi, SpcSubgroup, SpcLimit, SpcMark, SpcHistogram,
  SpcLevel, SpcCpkTrend, SpcRule, SpcAlarm, SpcParam, SpcSupplierCpk,
} from '@/types/spc'

export const spcKpi: SpcKpi = {
  cpk: 1.42,
  ppk: 1.35,
  alarm: 3,
  monitor: 28,
  passRate: 99.6,
  window: '30天',
  capPassRate: 89.5,
  capPassParams: '17/19参数',
}

// 25 子组 Xbar 与 R（对齐 HTML MOCK.spc.xbar / r）
const SPC_XBAR = [10.02, 9.98, 10.05, 9.95, 10.01, 10.08, 9.97, 10.03, 10.34, 10.10, 9.96, 10.04, 10.06, 9.99, 10.10, 10.15, 10.18, 10.22, 10.25, 10.28, 9.94, 10.00, 10.11, 9.93, 10.07]
const SPC_R = [0.18, 0.22, 0.15, 0.25, 0.19, 0.21, 0.17, 0.20, 0.38, 0.24, 0.16, 0.19, 0.21, 0.18, 0.23, 0.26, 0.28, 0.30, 0.33, 0.35, 0.17, 0.20, 0.25, 0.16, 0.22]
// 异常点标注（对齐 HTML MOCK.spc.marks：#9 超3σ 报警 / #15-20 连续6点递增 预警）
const SPC_OUTLIER: Record<number, string> = { 9: '①', 15: '③', 16: '③', 17: '③', 18: '③', 19: '③', 20: '③' }

export const spcSubgroups: SpcSubgroup[] = SPC_XBAR.map((xbar, i) => {
  const no = i + 1
  return {
    no,
    xbar: +xbar.toFixed(4),
    r: +SPC_R[i].toFixed(4),
    time: `07-14 ${8 + Math.floor(i / 2)}:${((i * 7) % 60) < 10 ? '0' : ''}${(i * 7) % 60}`,
    shift: i % 3 === 0 ? '早班' : i % 3 === 1 ? '中班' : '晚班',
    outlierRule: SPC_OUTLIER[no],
  }
})

export const spcLimit: SpcLimit = {
  ucl: 10.30,
  cl: 10.00,
  lcl: 9.70,
  rUcl: 0.49,
  rCl: 0.22,
  rLcl: 0,
}

export const spcMarks: SpcMark[] = [
  { i: 8, rule: '①1点超3σ', level: '报警' },
  { i: 14, rule: '③连续6点递增', level: '预警', range: '连续6点递增' },
]

export const spcHistogram: SpcHistogram = {
  bins: [9.7, 9.8, 9.9, 10.0, 10.1, 10.2, 10.3],
  freq: [2, 5, 9, 12, 8, 4, 2],
  usl: 10.3,
  lsl: 9.7,
}

export const spcLevels: SpcLevel[] = [
  { name: '充足(CPK≥1.33)', value: 12, color: '#2f7d32' },
  { name: '尚可(1.0-1.33)', value: 5, color: '#d4a017' },
  { name: '不足(<1.0)', value: 2, color: '#c0392b' },
]

export const spcCpkTrend: SpcCpkTrend = {
  m: ['2月', '3月', '4月', '5月', '6月', '7月'],
  v: [1.28, 1.31, 1.35, 1.33, 1.4, 1.42],
}

export const spcRules: SpcRule[] = [
  { code: '①', name: '单点超3σ', desc: '1个点超出3σ控制限', level: '报警', enabled: true, cnt: 1 },
  { code: '②', name: '连续7点同侧', desc: '连续7个点在中心线同一侧', level: '预警', enabled: true, cnt: 1 },
  { code: '③', name: '连续6点递增', desc: '连续6个点持续递增或递减', level: '预警', enabled: true, cnt: 0 },
  { code: '④', name: '连续14点交替', desc: '连续14个点交替上下', level: '预警', enabled: false, cnt: 0 },
  { code: '⑤', name: '3点中2点超2σ', desc: '连续3个点中有2个在2σ外', level: '预警', enabled: true, cnt: 1 },
  { code: '⑥', name: '5点中4点超1σ', desc: '连续5个点中有4个在1σ外', level: '预警', enabled: true, cnt: 0 },
  { code: '⑦', name: '连续15点在1σ内', desc: '连续15个点全部在1σ内（层变）', level: '预警', enabled: false, cnt: 0 },
  { code: '⑧', name: '连续8点超1σ', desc: '连续8个点在1σ外', level: '报警', enabled: true, cnt: 0 },
]

// 告警列表（对齐 HTML MOCKX.spc.alarmAll）
export const spcAlarms: SpcAlarm[] = [
  { id: 'AL-0714-01', par: '注塑压力(MPa)', val: 132.5, rule: '①1点超3σ', lvl: '报警', t: '10:05', st: '待确认' },
  { id: 'AL-0714-02', par: '焊接温度(℃)', val: 365.2, rule: '③连续6点递增', lvl: '预警', t: '09:42', st: '待确认' },
  { id: 'AL-0714-03', par: '组装扭矩(N·m)', val: 4.82, rule: '②连续9点同侧', lvl: '预警', t: '09:15', st: '已关闭' },
  { id: 'AL-0713-08', par: '注塑压力(MPa)', val: 135.1, rule: '①1点超3σ', lvl: '报警', t: '昨日', st: '已关闭' },
]

// 参数配置（对齐 HTML MOCK.spc.params；控制图类型列原型固定展示 Xbar-R）
export const spcParams: SpcParam[] = [
  { p: '注塑压力', proc: '注塑', unit: 'MPa', sl: '120-130', freq: '1次/30min', sg: 5, chartType: 'Xbar-R' },
  { p: '焊接温度', proc: '焊接', unit: '℃', sl: '350-360', freq: '1次/15min', sg: 5, chartType: 'Xbar-R' },
  { p: '组装扭矩', proc: '组装', unit: 'N·m', sl: '4.5-5.0', freq: '1次/20min', sg: 5, chartType: 'Xbar-R' },
  { p: '密封性', proc: '检测', unit: 'kPa', sl: '≥50', freq: '1次/批', sg: 5, chartType: 'Xbar-R' },
]

export const spcSupplierCpk: SpcSupplierCpk[] = [
  { sup: '华星电子', mat: 'PCBA主板', cpk: 1.45, lvl: '充足' },
  { sup: '精工医疗', mat: '采样针组', cpk: 1.28, lvl: '边缘' },
  { sup: '深圳鑫源', mat: '连接器', cpk: 0.95, lvl: '不足' },
]

// 数据采集任务（对齐 HTML MOCKX.spc.collectTasks）
export const spcCollectTasks: SpcCollectTask[] = [
  { par: '注塑压力', proc: '注塑', freq: '1次/30min', last: '128.5', due: '10:50', st: '待采集' },
  { par: '焊接温度', proc: '焊接', freq: '1次/15min', last: '355.0', due: '10:45', st: '待采集' },
  { par: '组装扭矩', proc: '组装', freq: '1次/20min', last: '4.82', due: '10:40', st: '待采集' },
  { par: '密封性', proc: '检测', freq: '1次/批', last: '52', due: '-', st: '已完成' },
]

// 导入历史（对齐 HTML MOCKX.spc.importHistory）
export const spcImportHistory: SpcImportRecord[] = [
  { id: 'IMP-20260716-001', fileName: 'SPC_注塑压力_批量数据.csv', paramName: '注塑压力', records: 25, status: '成功', time: '2026-07-16 08:15:22', operator: '张检验', errors: 0, size: '12.5 KB' },
  { id: 'IMP-20260716-002', fileName: 'SPC_焊接温度_粘贴导入.txt', paramName: '焊接温度', records: 8, status: '成功', time: '2026-07-16 07:42:10', operator: '李检验', errors: 0, size: '0.8 KB' },
  { id: 'IMP-20260715-003', fileName: 'SPC_组装扭矩_扫码导入.json', paramName: '组装扭矩', records: 5, status: '成功', time: '2026-07-15 16:30:05', operator: '王班组长', errors: 0, size: '0.9 KB' },
]

// 判异规则配置（对齐 HTML MOCKX.spc.rulesCfg）
export const spcRulesCfg: SpcRuleCfg[] = [
  { id: '①', name: '1点超出3σ控制线', lvl: '报警', on: true },
  { id: '②', name: '连续9点在中心线同侧', lvl: '预警', on: true },
  { id: '③', name: '连续6点递增或递减', lvl: '预警', on: true },
  { id: '④', name: '连续14点交替上下', lvl: '预警', on: false },
  { id: '⑤', name: '3点中2点超出2σ', lvl: '报警', on: true },
  { id: '⑥', name: '5点中4点超出1σ', lvl: '预警', on: false },
  { id: '⑦', name: '连续15点在1σ以内', lvl: '预警', on: false },
  { id: '⑧', name: '连续8点在中心线两侧且无一点在1σ内', lvl: '预警', on: false },
]
