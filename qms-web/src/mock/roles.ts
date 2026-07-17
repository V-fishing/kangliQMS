/**
 * 角色定义 - 从 HTML 原型提取
 * 对应原型 ROLE_MAP（10 个角色）
 */

export type RoleId =
  | 'operator'
  | 'inspector'
  | 'shiftleader'
  | 'sqe'
  | 'qmanager'
  | 'aftersales'
  | 'metrology'
  | 'qualitysys'
  | 'supplier'
  | 'sysadmin'

export interface RoleDef {
  id: RoleId
  name: string
  color: string
  icon: string
  perm: string
}

export const ROLES: RoleDef[] = [
  { id: 'operator', name: '操作员', color: '#5b8def', icon: '👷', perm: '生产操作、自检数据录入' },
  { id: 'inspector', name: '检验员', color: '#1e4d8b', icon: '🔍', perm: '首件/来料检验、不良录入、器具使用' },
  { id: 'shiftleader', name: '班组长', color: '#8e44ad', icon: '📋', perm: '产线管理、报警确认关闭、工装状态' },
  { id: 'sqe', name: 'SQE', color: '#16a085', icon: '🏭', perm: '供应商审核、来料异常处置、整改验证' },
  { id: 'qmanager', name: '质量主管', color: '#c0392b', icon: '👔', perm: '审批授权、豁免放行、趋势分析、绩效评审' },
  { id: 'aftersales', name: '售后工程师', color: '#2980b9', icon: '🔧', perm: '工单处理、客户服务、满意度跟进' },
  { id: 'metrology', name: '计量管理员', color: '#d4a017', icon: '📐', perm: '计量器具校准、维修、报废管理' },
  { id: 'qualitysys', name: '体系管理员', color: '#34495e', icon: '📚', perm: '质量目标、内审管理、体系合规监控' },
  { id: 'supplier', name: '供应商用户', color: '#7f8c8d', icon: '🚚', perm: '查看整改通知、提交改善报告' },
  { id: 'sysadmin', name: '系统管理员', color: '#2c3e50', icon: '⚙', perm: '配置管理、权限管理、基础数据维护' },
]

export const ROLE_MAP = ROLES.reduce(
  (acc, r) => {
    acc[r.id] = r
    return acc
  },
  {} as Record<string, RoleDef>,
)

/** 模块×角色横幅文案 */
export const BANNERS: Record<string, Record<string, { title: string; desc: string }>> = {
  overview: {
    inspector: { title: '检验员工作台', desc: '今日待检任务、首件状态、SPC 监控一览' },
    operator: { title: '操作员工作台', desc: '我的工单、自检任务、首件锁定状态' },
    sqe: { title: 'SQE 工作台', desc: '来料异常、供应商整改、审核计划' },
    qmanager: { title: '质量主管看板', desc: '全厂质量概况、超期事项、审批待办' },
    shiftleader: { title: '班组长工作台', desc: '产线不良、SPC 报警、工装状态' },
  },
  fia: {
    inspector: { title: '首件检验', desc: '检验任务、首件录入、审批跟进' },
    qmanager: { title: '首件检验管理', desc: '审批授权、豁免放行、标准维护' },
  },
  spc: {
    inspector: { title: 'SPC 过程能力', desc: '控制图监控、数据采集、告警处理' },
    shiftleader: { title: 'SPC 过程能力', desc: '产线监控、报警确认、趋势分析' },
  },
  ncm: {
    inspector: { title: '不良管理', desc: '不良录入、分析、8D 整改' },
    qmanager: { title: '不良管理', desc: '趋势分析、8D 审批、纠正措施' },
  },
  sqm: {
    sqe: { title: '供应商质量管理', desc: '审核计划、来料异常、FMEA 风险' },
    qmanager: { title: '供应商质量管理', desc: '供应商绩效、变更审批' },
  },
  asm: {
    aftersales: { title: '售后管理', desc: '售后工单处理、客户满意度跟进（SR-ASM-001 ~ SR-ASM-014）' },
    qmanager: { title: '售后管理', desc: '客户投诉分析与服务改进、满意度纳入质量考核' },
  },
  tlm: {
    shiftleader: { title: '工装管理', desc: '工装全生命周期、保养与状态管控（SR-TLM-001 ~ SR-TLM-018）' },
  },
  msm: {
    metrology: { title: '计量管理', desc: '计量器具校准、维修与报废管控（SR-MSM-001 ~ SR-MSM-014）' },
  },
  qsm: {
    qualitysys: { title: '体系管理', desc: '内审管理、体系合规监控与改进（SR-QSM-007 ~ SR-QSM-018）' },
    qmanager: { title: '体系管理', desc: '质量目标与体系健康度看板' },
  },
}

/** 角色进入各模块的默认 Tab */
export const DEF_TAB: Record<string, Record<string, string>> = {
  fia: { inspector: 'tasks', qmanager: 'approve' },
  spc: { inspector: 'control', shiftleader: 'control' },
  ncm: { inspector: 'entry', qmanager: '8d' },
  sqm: { sqe: 'abnormal', qmanager: 'dash' },
}
