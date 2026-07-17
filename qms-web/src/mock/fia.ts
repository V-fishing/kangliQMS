/**
 * FIA 首件检验 Mock 数据
 * 从 HTML 原型 MOCK.fia / MOCKX.fia 提取
 */
import type {
  FiaKpi, FiaTaskStatus, FiaPass7d, FiaTrigger, FiaLine,
  FiaTask, FiaApproval, FiaTimeout, FiaMywo, FiaSupplier, FiaGauge,
  FiaTrace, FiaStdlib, FiaInspItem, FiaTrigConfig,
  FiaInspMeta, FiaInspEntry, FiaTraceLink, FiaArchived,
} from '@/types/fia'

export const fiaKpi: FiaKpi = {
  pending: 8,
  passRate: 98.2,
  locked: 3,
  overdue: 2,
}

export const fiaTaskStatus: FiaTaskStatus[] = [
  { name: '待检', value: 8, color: '#d4a017' },
  { name: '进行中', value: 5, color: '#1e4d8b' },
  { name: '已完成', value: 42, color: '#2f7d32' },
  { name: '超时', value: 3, color: '#c0392b' },
]

export const fiaPass7d: FiaPass7d = {
  days: ['07-08', '07-09', '07-10', '07-11', '07-12', '07-13', '07-14'],
  vals: [97.2, 98.0, 96.5, 99.1, 98.3, 97.8, 98.2],
  target: 98,
}

export const fiaTriggers: FiaTrigger[] = [
  { name: '换模具', value: 18 },
  { name: '换批次', value: 12 },
  { name: '材料变更', value: 9 },
  { name: '换设备', value: 6 },
  { name: '系统升级', value: 4 },
]

export const fiaLines: FiaLine[] = [
  { line: '产线A-注塑', rate: 98.5 },
  { line: '产线B-组装', rate: 95.2 },
  { line: '产线C-焊接', rate: 92.8 },
  { line: '产线D-包装', rate: 99.1 },
  { line: '产线E-检测', rate: 90.4 },
]

export const fiaLockRate = 6.0

export const fiaTasks: FiaTask[] = [
  { id: 'FAI-0714-01', wo: 'WO-071401', line: '产线A-注塑', st: '待检', trig: '换模具', who: '-', t: '08:20', u: 1 },
  { id: 'FAI-0714-02', wo: 'WO-071402', line: '产线C-焊接', st: '进行中', trig: '换批次', who: '张检验', t: '08:45', u: 0 },
  { id: 'FAI-0714-03', wo: 'WO-071403', line: '产线B-组装', st: '待检', trig: '材料变更', who: '-', t: '09:00', u: 1 },
  { id: 'FAI-0714-04', wo: 'WO-071404', line: '产线D-包装', st: '已完成', trig: '换模具', who: '李检验', t: '昨日', u: 0 },
  { id: 'FAI-0714-05', wo: 'WO-071405', line: '产线E-检测', st: '超时', trig: '换设备', who: '王检验', t: '昨日', u: 0 },
  { id: 'FAI-0714-06', wo: 'WO-071406', line: '产线A-注塑', st: '进行中', trig: '换批次', who: '张检验', t: '09:30', u: 0 },
  { id: 'FAI-0714-07', wo: 'WO-071407', line: '产线C-焊接', st: '待检', trig: '系统升级', who: '-', t: '10:00', u: 0 },
  { id: 'FAI-0714-08', wo: 'WO-071408', line: '产线B-组装', st: '已完成', trig: '换模具', who: '李检验', t: '昨日', u: 0 },
]

export const fiaApprovals: FiaApproval[] = [
  { id: 'AP-001', type: '豁免开工', wo: 'WO-071401', reason: '客户紧急交付，首件检验进行中', who: '赵操作员', t: '08:35', st: '待审批' },
  { id: 'AP-002', type: '紧急放行', wo: 'WO-071405', reason: '设备更换需重新首检，在制品积压', who: '钱班组长', t: '09:10', st: '待审批' },
  { id: 'AP-003', type: '让步接收', wo: 'WO-071402', reason: '非关键尺寸超差0.02mm，申请让步', who: '张检验', t: '09:40', st: '待审批' },
  { id: 'AP-004', type: '豁免开工', wo: 'WO-071309', reason: '试产验证', who: '孙操作员', t: '昨日', st: '已通过', hist: '质量主管 07-13' },
]

export const fiaTimeouts: FiaTimeout[] = [
  { id: 'FAI-0714-05', wo: 'WO-071405', line: '产线E-检测', od: '2h15m', who: '王检验' },
  { id: 'FAI-0713-09', wo: 'WO-071309', line: '产线C-焊接', od: '0h48m', who: '李检验' },
]

export const fiaMywo: FiaMywo[] = [
  { wo: 'WO-071401', prod: '采样针组-A', st: '锁定', lr: '首件未通过', exempt: 0 },
  { wo: 'WO-071406', prod: '采样针组-B', st: '正常', lr: '-', exempt: 0 },
  { wo: 'WO-071407', prod: 'PCBA主板-V2', st: '待首检', lr: '触发首件检验', exempt: 0 },
]

export const fiaSupplier: FiaSupplier[] = [
  { mat: 'PCBA主板V2', sup: '华星电子', batch: 'B0712', res: '合格', d: '07-12' },
  { mat: '采样针组', sup: '精工医疗', batch: 'B0710', res: '合格', d: '07-10' },
  { mat: '连接器X3', sup: '深圳鑫源', batch: 'B0711', res: '不合格', d: '07-11' },
]

export const fiaGauges: FiaGauge[] = [
  { name: '游标卡尺-001', st: '合格', exp: '2026-12-20' },
  { name: '千分尺-008', st: '即将到期', exp: '2026-07-30' },
  { name: '通止规-003', st: '合格', exp: '2026-09-15' },
]

export const fiaTrace: FiaTrace[] = [
  { node: '换批次触发', t: '07-14 08:20', o: '系统', done: true },
  { node: '生成首件任务 FAI-0714-02', t: '07-14 08:20', o: '系统', done: true },
  { node: '自动调取标准 STD-001 v3', t: '07-14 08:21', o: '系统', done: true },
  { node: '检验录入（6项）', t: '07-14 09:05', o: '张检验', done: true },
  { node: '检验人签名', t: '07-14 09:28', o: '张检验', done: true },
  { node: '复核人签名', t: '07-14 09:30', o: '李复核', done: true },
  { node: '工单解锁', t: '07-14 09:31', o: '系统', done: true },
  { node: '首件数据写入SPC基准', t: '07-14 09:31', o: '系统', done: true },
  { node: '报告归档 PDF', t: '07-14 09:32', o: '系统', done: true },
]

// 全链路追溯：正向（来料→客户）与反向（客户→来料）
export const fiaTraceFwd: FiaTraceLink[] = [
  { n: '来料批次', v: 'B20260712' },
  { n: '供应商', v: '精工医疗' },
  { n: '生产批次', v: 'WO-071402' },
  { n: '成品SN', v: 'SN-A001~A013' },
  { n: '客户', v: '省人民医院' },
]
export const fiaTraceBack: FiaTraceLink[] = [
  { n: '成品SN', v: 'SN-A007' },
  { n: '生产批次', v: 'WO-071402' },
  { n: '来料批次', v: 'B20260712 + B20260710' },
  { n: '供应商', v: '精工医疗' },
]

// 归档报告（保留15年，字段对齐 SR-FIA-030/031/032）
export const fiaArchived: FiaArchived[] = [
  {
    rpt: 'RPT-FAI-0714-02', wo: 'WO-071402', prod: '采样针组-A', proc: '注塑',
    d: '2026-07-14', retainUntil: '2041-07-14', std: 'STD-001 v3', aql: '0.65 / II级',
    sample: '13/13 · Ac=0', batch: 'B20260712', inspector: '张检验 09:28', reviewer: '李复核 09:30',
    conclusion: '合格', st: '已归档', perm: '质量/审计可阅 · 操作员只读',
  },
  {
    rpt: 'RPT-FAI-0714-01', wo: 'WO-071401', prod: '采样针组-B', proc: '注塑',
    d: '2026-07-14', retainUntil: '2041-07-14', std: 'STD-001 v2', aql: '0.65 / II级',
    sample: '13/13 · Ac=0', batch: 'B20260711', inspector: '张检验 08:50', reviewer: '李复核 08:52',
    conclusion: '合格', st: '已归档', perm: '质量/审计可阅 · 操作员只读',
  },
  {
    rpt: 'RPT-FAI-0713-09', wo: 'WO-071309', prod: 'PCBA主板-V2', proc: '焊接',
    d: '2026-07-13', retainUntil: '2041-07-13', std: 'STD-002 v2', aql: '0.65 / II级',
    sample: '20/20 · Ac=0', batch: 'B20260708', inspector: '王检验 16:20', reviewer: '李复核 16:25',
    conclusion: '不合格（已让步接收）', st: '已归档', perm: '质量/审计可阅 · 操作员只读',
  },
]

export const fiaStdlib: FiaStdlib[] = [
  { code: 'STD-001', mat: '采样针组-A', proc: '注塑', aql: '0.65', lvl: 'II', ctq: '针管外径/密封性', ver: 'v3', st: '生效' },
  { code: 'STD-002', mat: 'PCBA主板-V2', proc: '焊接', aql: '0.65', lvl: 'II', ctq: '焊点拉力/绝缘', ver: 'v2', st: '生效' },
  { code: 'STD-003', mat: '连接器X3', proc: '组装', aql: '1.0', lvl: 'II', ctq: '插拔力/接触电阻', ver: 'v2', st: '生效' },
  { code: 'STD-004', mat: '外壳组件', proc: '注塑', aql: '1.5', lvl: 'I', ctq: '外观/尺寸', ver: 'v1', st: '停用' },
]

export const fiaInspItems: FiaInspItem[] = [
  { no: 1, name: '针管外径', std: '0.8±0.02mm', lsl: '0.78', usl: '0.82', method: '千分尺', ctq: 1 },
  { no: 2, name: '密封性', std: '≥0.5MPa保压30s', method: '气密测试仪', ctq: 1 },
  { no: 3, name: '外观', std: '无毛刺/缩水', method: '目视', ctq: 0 },
  { no: 4, name: '长度', std: '50±0.1mm', lsl: '49.9', usl: '50.1', method: '游标卡尺', ctq: 0 },
]

export const fiaTrigConfig: FiaTrigConfig = {
  // 触发事件类型（对应 HTML MOCKX.fia.trigTypes，满足任一即触发首件检验）
  triggers: [
    { name: '换模具', enabled: true, desc: '模具更换后自动触发首件检验' },
    { name: '系统升级', enabled: true, desc: '系统版本升级后触发' },
    { name: '换批次', enabled: true, desc: '物料批次更换后自动触发' },
    { name: '换设备', enabled: true, desc: '设备更换/大修后触发' },
    { name: '材料批次变更', enabled: true, desc: '材料或批次变更后触发' },
  ],
  // 拦截与时效（对应 HTML renderFiaTrigcfg 拦截与时效面板）
  intercept: {
    blockMode: 'hard',
    multiTrigger: 'merge',
    slaHours: 2,
    escalateTimes: 3,
  },
  // 电子签名配置（对应 HTML renderFiaTrigcfg 电子签名配置面板）
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

// 检验录入：工单元信息（对应 HTML MOCKX.fia.inspMeta）
export const fiaInspMeta: FiaInspMeta = {
  code: 'FAI-0714-02', wo: 'WO-071402', prod: '采样针组-A', proc: '注塑',
  trig: '换批次', std: 'STD-001 v3', aql: '0.65', sample: '13/13', batch: 'B20260712',
}

// 检验录入：检验项目（对应 HTML MOCKX.fia.inspItems，可录入实测值）
export const fiaInspEntries: FiaInspEntry[] = [
  { no: 1, name: '针管外径', ctq: true, std: '0.90', tol: '±0.02', unit: 'mm', val: '0.91' },
  { no: 2, name: '针管长度', ctq: false, std: '25.0', tol: '±0.1', unit: 'mm', val: '25.05' },
  { no: 3, name: '密封性', ctq: true, std: '≥50', tol: '≥50', unit: 'kPa', val: '52' },
  { no: 4, name: '外观', ctq: false, std: '-', tol: '无缺陷', unit: '', val: '合格', select: true },
  { no: 5, name: '流量', ctq: true, std: '-', tol: '18-22', unit: 'mL/s', val: '20.5' },
  { no: 6, name: '回血性能', ctq: true, std: '-', tol: '≤3', unit: 's', val: '2.5' },
]
