/**
 * NCM 不良管理 Mock 数据
 * 从 HTML 原型 MOCK.ncm 提取
 */
import type {
  NcmKpi, NcmPareto, NcmTrend30, NcmType, NcmProcTop,
  NcmCompare, NcmShift, NcmRealtime, NcmRecord, NcmSupplierRank,
  NcmCorrective, NcmDict, NcmEvent, Ncm8D, NcmDefectHeatmap,
  Ncm8DListItem, NcmCapa,
} from '@/types/ncm'

export const ncmKpi: NcmKpi = {
  defectCnt: 156,
  defectRate: 0.82,
  ppm: 8200,
  scrap: 23,
}

export const ncmPareto: NcmPareto[] = [
  { name: '尺寸超差', v: 52 },
  { name: '外观划伤', v: 38 },
  { name: '密封不良', v: 28 },
  { name: '焊接虚焊', v: 18 },
  { name: '装配错位', v: 12 },
  { name: '其他', v: 8 },
]

export const ncmTrend30: NcmTrend30 = {
  last5up: true,
  over2sigma: false,
  vals: [0.85, 0.78, 0.92, 0.80, 0.88, 0.75, 0.82, 0.90, 0.78, 0.86,
         0.79, 0.84, 0.91, 0.77, 0.83, 0.85, 0.80, 0.88, 0.76, 0.82,
         0.87, 0.79, 0.85, 0.81, 0.89, 0.78, 0.84, 0.82, 0.86, 0.82],
  target: 0.85,
}

export const ncmTypes: NcmType[] = [
  { name: '尺寸超差', v: 52 },
  { name: '外观划伤', v: 38 },
  { name: '密封不良', v: 28 },
  { name: '焊接虚焊', v: 18 },
  { name: '装配错位', v: 12 },
  { name: '其他', v: 8 },
]

export const ncmProcTop: NcmProcTop[] = [
  { proc: '注塑', rate: 1.2 },
  { proc: '焊接', rate: 0.9 },
  { proc: '组装', rate: 0.7 },
  { proc: '检测', rate: 0.5 },
  { proc: '包装', rate: 0.3 },
]

export const ncmCompare: NcmCompare = {
  labels: ['注塑', '焊接', '组装', '检测', '包装'],
  cur: [1.2, 0.9, 0.7, 0.5, 0.3],
  prev: [1.5, 0.8, 0.6, 0.4, 0.4],
  yoy: [-0.3, 0.1, 0.1, 0.1, -0.1],
}

export const ncmShifts: NcmShift[] = [
  { shift: '早班', rate: 0.75, cnt: 58 },
  { shift: '中班', rate: 0.88, cnt: 62 },
  { shift: '晚班', rate: 0.95, cnt: 36 },
]

export const ncmRealtime: NcmRealtime = {
  shift: '中班',
  cnt: 12,
  rate: 0.88,
  top3: [
    { name: '尺寸超差', cnt: 5 },
    { name: '外观划伤', cnt: 4 },
    { name: '密封不良', cnt: 3 },
  ],
}

export const ncmRecords: NcmRecord[] = [
  { id: 'NC-001', wo: 'WO-071401', proc: '注塑', type: '尺寸超差', cnt: 3, who: '张检验', t: '07-14 08:30', dev: '针管外径超+0.03', batch: 'B0712', prod: '采样针组-A', sev: '一般' },
  { id: 'NC-002', wo: 'WO-071402', proc: '焊接', type: '焊接虚焊', cnt: 2, who: '李检验', t: '07-14 09:15', dev: 'PCBA焊点虚焊', batch: 'B0712', prod: 'PCBA主板-V2', sev: '严重' },
  { id: 'NC-003', wo: 'WO-071403', proc: '组装', type: '装配错位', cnt: 1, who: '王检验', t: '07-14 10:00', dev: '连接器插偏', batch: 'B0711', prod: '连接器X3', sev: '轻微' },
  { id: 'NC-004', wo: 'WO-071404', proc: '注塑', type: '外观划伤', cnt: 5, who: '张检验', t: '07-14 10:30', dev: '外壳表面划痕', batch: 'B0712', prod: '外壳组件', sev: '一般' },
  { id: 'NC-005', wo: 'WO-071405', proc: '组装', type: '密封不良', cnt: 2, who: '李检验', t: '07-14 11:00', dev: '密封圈泄漏', batch: 'B0710', prod: '采样针组-B', sev: '严重' },
]

export const ncmSupplierRank: NcmSupplierRank[] = [
  { sup: '华星电子', cnt: 45, rate: 1.2, ppm: 12000 },
  { sup: '精工医疗', cnt: 32, rate: 0.9, ppm: 9000 },
  { sup: '深圳鑫源', cnt: 28, rate: 1.5, ppm: 15000 },
]

export const ncmCorrective: NcmCorrective[] = [
  { id: 'CA-001', issue: '针管外径超差', owner: '张检验', due: '07-16', st: '进行中', progress: 60 },
  { id: 'CA-002', issue: 'PCBA虚焊', owner: '李检验', due: '07-18', st: '待处理', progress: 0 },
  { id: 'CA-003', issue: '密封圈泄漏', owner: '王检验', due: '07-15', st: '已完成', progress: 100 },
]

export const ncmDict: NcmDict[] = [
  { code: 'D001', name: '尺寸超差', cat: '尺寸类', lvl: '严重', cnt: 42, status: '启用' },
  { code: 'D002', name: '外观缺陷', cat: '外观类', lvl: '一般', cnt: 28, status: '启用' },
  { code: 'D003', name: '密封不良', cat: '功能类', lvl: '严重', cnt: 18, status: '启用' },
  { code: 'D004', name: '功能异常', cat: '功能类', lvl: '严重', cnt: 10, status: '停用' },
  { code: 'D005', name: '装配错位', cat: '装配类', lvl: '一般', cnt: 14, status: '启用' },
]

/** 不良字典分类（对应 HTML MOCKX.ncm.dictCats） */
export const ncmDictCats: string[] = ['尺寸类', '外观类', '功能类', '装配类', '包装类']

export const ncmEvents: NcmEvent[] = [
  { id: 'EV-001', type: '批量不良', where: '产线A-注塑', prod: '采样针组-A', sev: '严重', t: '07-14 08:30' },
  { id: 'EV-002', type: '客户投诉', where: '客户A', prod: 'PCBA主板-V2', sev: '严重', t: '07-13 15:00' },
  { id: 'EV-003', type: '过程异常', where: '产线C-焊接', prod: 'PCBA主板-V2', sev: '一般', t: '07-14 09:15' },
]

export const ncm8D: Ncm8D = {
  id: '8D-001',
  title: 'PCBA虚焊批量不良',
  prod: 'PCBA主板-V2',
  sev: '严重',
  currentStage: 3,
  stages: [
    { name: 'D1-组建团队', status: 'done', owner: '钱经理', due: '07-13' },
    { name: 'D2-描述问题', status: 'done', owner: '张检验', due: '07-13', content: 'PCBA焊接后出现虚焊，不良率5%...' },
    { name: 'D3-临时措施', status: 'done', owner: '李检验', due: '07-14', content: '增加X-Ray全检，隔离不良品' },
    { name: 'D4-根因分析', status: 'current', owner: '王工程师', due: '07-16' },
    { name: 'D5-永久措施', status: 'pending', due: '07-18' },
    { name: 'D6-实施验证', status: 'pending', due: '07-20' },
    { name: 'D7-预防再发', status: 'pending', due: '07-22' },
    { name: 'D8-团队致谢', status: 'pending', due: '07-23' },
  ],
  rootCause: '焊接温度偏低，焊锡膏活性不足',
  actions: [
    { desc: '调整焊接温度+10℃', owner: '王工程师', due: '07-16', done: true },
    { desc: '更换焊锡膏批次', owner: '李检验', due: '07-17', done: false },
  ],
  fishbone: [
    { category: '人', causes: ['新员工培训不足', '操作手法不一致'] },
    { category: '机', causes: ['焊接温度漂移', '设备保养不到位'] },
    { category: '料', causes: ['焊锡膏过期', 'PCB氧化'] },
    { category: '法', causes: ['工艺参数未更新', 'SOP不明确'] },
    { category: '环', causes: ['车间湿度偏高'] },
    { category: '测', causes: ['检测标准不统一'] },
  ],
  fiveWhy: [
    { why: '为什么PCBA会虚焊？', answer: '焊接温度不够导致焊锡未充分熔化' },
    { why: '为什么焊接温度不够？', answer: '设备温度设置偏低' },
    { why: '为什么设备温度设置偏低？', answer: '换型时未更新温度参数' },
    { why: '为什么换型时未更新？', answer: 'SOP中未明确换型温度参数' },
    { why: '为什么SOP未明确？', answer: '工艺文件评审不充分' },
  ],
}

/** 8D 报告列表（对应 HTML MOCKX.ncm.eightD） */
export const ncm8DList: Ncm8DListItem[] = [
  { id: '8D-2026-007', issue: '注塑尺寸超差', src: '不良记录', sev: 'S=7', stage: 'D5', sla: '5天', st: '进行中' },
  { id: '8D-2026-006', issue: '焊接密封不良', src: 'SPC报警', sev: 'S=6', stage: 'D3', sla: '18h', st: '审批中' },
  { id: '8D-2026-005', issue: '组装错位', src: '不良记录', sev: 'S=5', stage: 'D8', sla: '已关闭', st: '效果验证' },
  { id: '8D-2026-004', issue: 'PCBA功能异常', src: '客诉', sev: 'S=8', stage: 'D8', sla: '已关闭', st: '已闭环' },
]

/** 8D 详情团队与阶段文本（对应 HTML MOCKX.ncm.d8Detail） */
export const ncm8DTeam = ['李工程师(质量)', '王班组长(生产)', '赵技术(工艺)']
export const ncm8DForms = {
  problem: '注塑工序采样针组-A 针管外径实测 0.93mm，超出公差 0.90±0.02mm，连续3件不合格。',
  d3: '临时措施：暂停该模具生产，隔离在制品13件，换备用模具。',
  d4: '根因（鱼骨图-机）：模具型芯磨损导致尺寸偏大；5Why：→磨损→未按周期保养→保养计划遗漏→计划系统未覆盖该模具。',
  d5: '纠正措施：更换模具型芯；修订保养计划纳入该模具；责任人 李工程师；计划 07-20 完成。',
}

/** CAPA 关联列表（人工手动触发，SR-PTL-019） */
export const ncmCapaList: NcmCapa[] = [
  { id: 'CAPA-2026-011', from8D: '8D-2026-004', trigger: 'S≥7', reason: 'PCBA功能异常客诉，严重度 S=8，需系统性纠正预防', owner: '钱经理', due: '2026-08-10', st: '执行中', createdAt: '2026-07-10' },
]

export const ncmHeatmap: NcmDefectHeatmap = {
  processes: ['注塑', '焊接', '组装', '检测', '包装'],
  types: ['尺寸超差', '外观划伤', '密封不良', '焊接虚焊', '装配错位'],
  data: [
    [0, 0, 35], [0, 1, 12], [0, 2, 5],
    [1, 0, 8], [1, 1, 6], [1, 3, 18],
    [2, 0, 5], [2, 1, 15], [2, 2, 8], [2, 4, 12],
    [3, 1, 4], [3, 2, 10],
    [4, 1, 3],
  ],
}

/** 不良分析聚合指标（对应 HTML MOCKX.ncm.analysisAgg） */
export const ncmAnalysisAgg: NcmAnalysisAgg = {
  count: 128,
  rate: 1.82,
  ppm: 1820,
  scrap: 0.35,
  topN: '尺寸超差(42)',
}

/** 层级下钻（工序→工位→参数，对应 HTML MOCKX.ncm.drill） */
export const ncmDrill: NcmDrill[] = [
  { lvl: '工序', name: '注塑', rate: '3.2%' },
  { lvl: '工位', name: '注塑机#3', rate: '4.1%' },
  { lvl: '参数', name: '注塑压力', rate: '超限5次' },
]
