/**
 * 系统 Mock - 菜单树/用户/角色/组织/配置
 * 对应技术栈文档 §6.2 动态路由 + §11 RBAC
 * 模拟后端 sys_menu 表数据
 */
import type { RoleId } from './roles'

export interface MockMenuItem {
  path: string
  name: string
  title: string
  icon: string
  module: string
  component?: string
  children?: MockMenuItem[]
  roles?: RoleId[]
  permissions?: string[]
}

/** Mock 菜单树 - 一期模块 */
const MENU_TREE: MockMenuItem[] = [
  {
    path: 'fia',
    name: 'FIA',
    title: '首件检验',
    icon: '①',
    module: 'fia',
    children: [
      { path: 'dash', name: 'FiaDash', title: '看板总览', icon: '📊', module: 'fia', component: 'fia/Dash' },
      { path: 'supplier', name: 'FiaSupplier', title: '供应商送检', icon: '🏭', module: 'fia', component: 'fia/SupplierEntry' },
      { path: 'tasks', name: 'FiaTasks', title: '检验任务', icon: '📋', module: 'fia', component: 'fia/Tasks' },
      { path: 'entry', name: 'FiaEntry', title: '检验录入', icon: '✏', module: 'fia', component: 'fia/Entry' },
      { path: 'approve', name: 'FiaApprove', title: '审批中心', icon: '✅', module: 'fia', component: 'fia/Approve' },
      { path: 'stdlib', name: 'FiaStdlib', title: '检验标准库', icon: '📚', module: 'fia', component: 'fia/Stdlib' },
      { path: 'trace', name: 'FiaTrace', title: '追溯归档', icon: '🔗', module: 'fia', component: 'fia/Trace' },
    ],
  },
  {
    path: 'spc',
    name: 'SPC',
    title: '过程能力',
    icon: '②',
    module: 'spc',
    children: [
      { path: 'dash', name: 'SpcDash', title: '看板总览', icon: '📊', module: 'spc', component: 'spc/Dash' },
      { path: 'control', name: 'SpcControl', title: '控制图监控', icon: '📈', module: 'spc', component: 'spc/Control' },
      { path: 'collect', name: 'SpcCollect', title: '数据采集', icon: '📥', module: 'spc', component: 'spc/Collect' },
      { path: 'alarm', name: 'SpcAlarm', title: '告警处理', icon: '🚨', module: 'spc', component: 'spc/Alarm' },
      { path: 'capability', name: 'SpcCapability', title: '能力分析', icon: '🎯', module: 'spc', component: 'spc/Capability' },
    ],
  },
  {
    path: 'ncm',
    name: 'NCM',
    title: '不良管理',
    icon: '③',
    module: 'ncm',
    children: [
      { path: 'dash', name: 'NcmDash', title: '看板总览', icon: '📊', module: 'ncm', component: 'ncm/Dash' },
      { path: 'entry', name: 'NcmEntry', title: '不良录入', icon: '✏', module: 'ncm', component: 'ncm/Entry' },
      { path: 'analysis', name: 'NcmAnalysis', title: '不良分析', icon: '🔍', module: 'ncm', component: 'ncm/Analysis' },
      { path: 'trend', name: 'NcmTrend', title: '趋势报表', icon: '📈', module: 'ncm', component: 'ncm/Trend' },
      { path: 'compare', name: 'NcmCompare', title: '不良对比', icon: '📊', module: 'ncm', component: 'ncm/Compare' },
      { path: '8d', name: 'Ncm8D', title: '8D 整改', icon: '🎯', module: 'ncm', component: 'ncm/EightD' },
      { path: 'dict', name: 'NcmDict', title: '不良字典', icon: '📚', module: 'ncm', component: 'ncm/Dict' },
      { path: 'realtime', name: 'NcmRealtime', title: '实时看板', icon: '🔴', module: 'ncm', component: 'ncm/Realtime' },
    ],
  },
  {
      path: 'sqm',
      name: 'SQM',
      title: '供应商质量',
      icon: '④',
      module: 'sqm',
      children: [
        { path: 'dash', name: 'SqmDash', title: '总览看板', icon: '📊', module: 'sqm', component: 'sqm/Dash' },
        { path: 'audit', name: 'SqmAudit', title: '供应商审核', icon: '🏢', module: 'sqm', component: 'sqm/Audit' },
        { path: 'lifecycle', name: 'SqmLifecycle', title: '供应商全生命周期', icon: '🗂', module: 'sqm', component: 'sqm/Lifecycle' },
        { path: 'capa', name: 'SqmCapa', title: 'CAPA 纠正预防', icon: '🛡', module: 'sqm', component: 'sqm/Capa' },
        { path: 'change', name: 'SqmChange', title: '物料变更', icon: '🔄', module: 'sqm', component: 'sqm/Change' },
        { path: 'trace', name: 'SqmTrace', title: '来料追溯', icon: '🔗', module: 'sqm', component: 'sqm/trace/TracePage' },
        { path: 'archive', name: 'SqmArchive', title: '统一归档', icon: '🗄', module: 'sqm', component: 'archive/ArchiveList' },
        { path: 'abnormal', name: 'SqmAbnormal', title: '来料异常整改', icon: '⚠', module: 'sqm', component: 'sqm/Abnormal' },
        { path: 'fmea', name: 'SqmFmea', title: 'FMEA 风险跟踪', icon: '🎯', module: 'sqm', component: 'sqm/Fmea' },
      ],
    },
  {
    path: 'asm',
    name: 'ASM',
    title: '售后管理',
    icon: '⑤',
    module: 'asm',
    children: [
      { path: 'dash', name: 'AsmDash', title: '总览看板', icon: '📊', module: 'asm', component: 'asm/Dash' },
      { path: 'workorder', name: 'AsmWorkorder', title: '售后工单', icon: '🛠', module: 'asm', component: 'asm/Workorder' },
      { path: 'satisfaction', name: 'AsmSatisfaction', title: '客户满意度', icon: '⭐', module: 'asm', component: 'asm/Satisfaction' },
    ],
  },
  {
    path: 'tlm',
    name: 'TLM',
    title: '工装管理',
    icon: '⑥',
    module: 'tlm',
    children: [
      { path: 'dash', name: 'TlmDash', title: '工装总览', icon: '📊', module: 'tlm', component: 'tlm/Dash' },
      { path: 'lifecycle', name: 'TlmLifecycle', title: '全生命周期', icon: '🔄', module: 'tlm', component: 'tlm/Lifecycle' },
      { path: 'maint', name: 'TlmMaint', title: '保养管理', icon: '🛡', module: 'tlm', component: 'tlm/Maint' },
    ],
  },
  {
    path: 'msm',
    name: 'MSM',
    title: '计量管理',
    icon: '⑦',
    module: 'msm',
    children: [
      { path: 'dash', name: 'MsmDash', title: '计量总览', icon: '📊', module: 'msm', component: 'msm/Dash' },
      { path: 'calib', name: 'MsmCalib', title: '器具与校准', icon: '📐', module: 'msm', component: 'msm/Calib' },
    ],
  },
  {
    path: 'qsm',
    name: 'QSM',
    title: '体系管理',
    icon: '⑧',
    module: 'qsm',
    children: [
      { path: 'dash', name: 'QsmDash', title: '体系总览', icon: '📊', module: 'qsm', component: 'qsm/Dash' },
      { path: 'audit', name: 'QsmAudit', title: '内审管理', icon: '📋', module: 'qsm', component: 'qsm/Audit' },
      { path: 'health', name: 'QsmHealth', title: '合规监控', icon: '📈', module: 'qsm', component: 'qsm/Health' },
    ],
  },
  {
    path: 'system',
    name: 'System',
    title: '系统管理',
    icon: '⚙',
    module: 'system',
    children: [
      { path: 'user', name: 'SystemUser', title: '用户组织', icon: '👥', module: 'system', component: 'system/User' },
      { path: 'role', name: 'SystemRole', title: '角色权限', icon: '🔑', module: 'system', component: 'system/Role' },
      { path: 'config', name: 'SystemConfig', title: '配置中心', icon: '🛠', module: 'system', component: 'system/Config' },
    ],
  },
  {
    path: 'cmp',
    name: 'Cmp',
    title: '分公司对比',
    icon: '⇄',
    module: 'cmp',
    children: [
      { path: 'compare', name: 'KpiCompare', title: 'KPI 对比', icon: '📊', module: 'cmp', component: 'overview/KpiCompare' },
    ],
  },
]

/** 获取 mock 菜单树 */
export function getMockMenuTree(_role?: RoleId): MockMenuItem[] {
  return MENU_TREE
}

/** Mock 用户列表 */
export const MOCK_USERS = [
  { id: 'U001', name: '张检验', account: 'zhang', role: 'inspector' as RoleId, dept: '质量部', status: 'active' },
  { id: 'U002', name: '李操作', account: 'li', role: 'operator' as RoleId, dept: '生产一部', status: 'active' },
  { id: 'U003', name: '王班长', account: 'wang', role: 'shiftleader' as RoleId, dept: '生产一部', status: 'active' },
  { id: 'U004', name: '赵SQE', account: 'zhao', role: 'sqe' as RoleId, dept: '质量部', status: 'active' },
  { id: 'U005', name: '钱经理', account: 'qian', role: 'qmanager' as RoleId, dept: '质量部', status: 'active' },
  { id: 'U006', name: '孙计量', account: 'sun', role: 'metrology' as RoleId, dept: '设备部', status: 'active' },
  { id: 'U007', name: '周体系', account: 'zhou', role: 'qualitysys' as RoleId, dept: '质量部', status: 'active' },
  { id: 'U008', name: '吴管理', account: 'wu', role: 'sysadmin' as RoleId, dept: '信息部', status: 'active' },
]

/** Mock 组织树 */
export const MOCK_ORGS = [
  { id: 'O001', name: '康立精密制造', parentId: '', type: 'company' },
  { id: 'O002', name: '质量部', parentId: 'O001', type: 'dept' },
  { id: 'O003', name: '生产一部', parentId: 'O001', type: 'dept' },
  { id: 'O004', name: '生产二部', parentId: 'O001', type: 'dept' },
  { id: 'O005', name: '设备部', parentId: 'O001', type: 'dept' },
  { id: 'O006', name: '信息部', parentId: 'O001', type: 'dept' },
  { id: 'O007', name: '采购部', parentId: 'O001', type: 'dept' },
]
