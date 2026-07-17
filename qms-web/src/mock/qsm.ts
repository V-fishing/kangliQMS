/**
 * QSM 体系管理 MOCK 数据
 * 对应 SRS §17 内审管理流程、§18 体系合规监控流程
 */
import type { InternalAudit, NcFinding, HealthDim, ImprovementSuggestion, QsmKpi } from '@/types/qsm'

export const internalAudits: InternalAudit[] = [
  {
    id: 'IA-2025-001', planName: '2025 Q1 生产体系内审', scope: '生产部 / 质量部 / 仓储',
    auditors: '周体系, 李内审员', date: '2025-01-18', status: '进行中',
    ncCount: 3, score: 88, reportStatus: '未生成',
  },
  {
    id: 'IA-2025-002', planName: '2025 采购与供应商管理内审', scope: '采购部 / SQM',
    auditors: '周体系, 王内审员', date: '2025-02-12', status: '计划中',
    ncCount: 0, score: 0, reportStatus: '未生成',
  },
  {
    id: 'IA-2024-011', planName: '2024 Q4 全公司 GMP 内审', scope: '全公司',
    auditors: '周体系, 李内审员, 赵内审员', date: '2024-12-15', status: '已完成',
    ncCount: 6, score: 91, reportStatus: '已生成',
  },
  {
    id: 'IA-2024-010', planName: '2024 计量与工装专项内审', scope: '计量室 / 工装组',
    auditors: '周体系, 孙计量', date: '2024-11-20', status: '已完成',
    ncCount: 2, score: 94, reportStatus: '已生成',
  },
]

export const ncFindings: NcFinding[] = [
  {
    id: 'NC-2025-001', auditId: 'IA-2025-001', clause: 'ISO9001 8.5.1', level: '严重',
    desc: '关键工序作业指导书未受控，现场使用版本与文控中心不一致', dept: '生产部',
    status: '整改中', action: '收回旧版并重新发放受控文件，建立版本核对签收表', owner: '生产部 张主管', dueDate: '2025-02-05',
  },
  {
    id: 'NC-2025-002', auditId: 'IA-2025-001', clause: 'GMP 第6.3条', level: '一般',
    desc: '仓储区温湿度记录存在断点', dept: '仓储', status: '待整改',
    action: '加装自动温湿度记录仪并设置越限报警', owner: '仓储 李管理员', dueDate: '2025-02-10',
  },
  {
    id: 'NC-2025-003', auditId: 'IA-2025-001', clause: 'ISO9001 7.1.5', level: '观察项',
    desc: '部分量具校准标签字迹模糊', dept: '质量部', status: '已验证',
    action: '统一更换耐磨校准标签', owner: '质量部 孙计量', dueDate: '2025-01-28',
  },
  {
    id: 'NC-2024-018', auditId: 'IA-2024-011', clause: 'ISO9001 8.7', level: '严重',
    desc: '不合格品隔离区标识不清，存在混用风险', dept: '生产部', status: '已关闭',
    action: '重新划分红色隔离区并挂牌，纳入班前点检', owner: '生产部 王组长', dueDate: '2024-12-30',
  },
  {
    id: 'NC-2024-017', auditId: 'IA-2024-011', clause: 'ISO9001 9.2', level: '一般',
    desc: '上次内审不符合项整改验证记录缺失', dept: '质量部', status: '已关闭',
    action: '补充闭环验证记录并纳入 QMS 归档', owner: '质量部 周体系', dueDate: '2024-12-28',
  },
]

/** §18 体系健康度维度 */
export const healthDims: HealthDim[] = [
  { name: '内审整改完成率', value: 82, threshold: 90, unit: '%' },
  { name: '来料合格率', value: 94.5, threshold: 92, unit: '%' },
  { name: '过程一次合格率', value: 96.2, threshold: 95, unit: '%' },
  { name: '客户满意度', value: 88, threshold: 90, unit: '分' },
  { name: 'CAPA 按期关闭率', value: 78, threshold: 85, unit: '%' },
  { name: '计量器具受检率', value: 97, threshold: 95, unit: '%' },
]

export const improvementSuggestions: ImprovementSuggestion[] = [
  {
    id: 'IMP-2025-001', dim: '内审整改完成率',
    content: '对逾期未整改的不符合项启动红黄牌预警，逾期3天升级至质量总监',
    adopted: true, decisionReason: '', trackResult: '整改完成率由 76% 提升至 82%，持续观察',
  },
  {
    id: 'IMP-2025-002', dim: 'CAPA 按期关闭率',
    content: '将 CAPA 责任人绩效与关闭时效挂钩，并每周推送待办清单',
    adopted: true, decisionReason: '', trackResult: '待办响应提速，本月新增 CAPA 无逾期',
  },
  {
    id: 'IMP-2025-003', dim: '客户满意度',
    content: '引入第三方 NPS 调研机构进行季度回访',
    adopted: false, decisionReason: '本年度预算有限，先由售后团队自行回访，明年评估外包', trackResult: '',
  },
]

export const qsmKpi: QsmKpi = {
  auditPlan: internalAudits.filter((a) => a.status === '计划中').length,
  auditDoing: internalAudits.filter((a) => a.status === '进行中').length,
  ncOpen: ncFindings.filter((n) => n.status !== '已关闭').length,
  ncSevere: ncFindings.filter((n) => n.level === '严重' && n.status !== '已关闭').length,
  healthScore: 87,
  rectifyRate: 82,
}
