/**
 * 侧边栏菜单配置
 *
 * 每个菜单项显式标注可访问的角色列表。
 * 渲染时根据当前用户角色过滤：角色不在 roles 数组中 → 不显示该项。
 */

export interface ModuleMenuItem {
  path: string
  title: string
  icon: string
  /** 可访问的角色编码列表（前端 RoleId，如 'inspector'） */
  roles: string[]
}

export interface ModuleMenuGroup {
  label: string
  items: ModuleMenuItem[]
}

// ── 模块树（含子页面，供 BasicLayout 侧边栏 + 子标签栏使用） ──

export interface ModuleTreeNode {
  path: string
  name: string
  title: string
  icon: string
  module: string
  /** 可访问的角色列表 */
  roles: string[]
  /** 子页面（为 null 表示叶子节点） */
  children: { path: string; name: string; title: string; icon: string; module: string }[] | null
}

/** 完整模块树 = 侧边栏 + 顶部子标签栏的数据源 */
export const MODULE_TREE: ModuleTreeNode[] = [
  { path: '/overview', name: 'overview', title: '总览看板', icon: 'DataBoard', module: 'overview',
    roles: ['sysadmin','operator','inspector','shiftleader','sqe','qmanager','aftersales','metrology','qualitysys','supplier'],
    children: null },
  { path: '/fia', name: 'fia', title: '首件检验', icon: 'Document', module: 'fia',
    roles: ['sysadmin','inspector','shiftleader','qmanager'],
    children: [
      { path: 'dash', name: 'fia.dash', title: '看板总览', icon: 'Chart', module: 'fia' },
      { path: 'tasks', name: 'fia.tasks', title: '检验任务', icon: 'List', module: 'fia' },
      { path: 'entry', name: 'fia.entry', title: '检验录入', icon: 'Edit', module: 'fia' },
      { path: 'approve', name: 'fia.approve', title: '审批中心', icon: 'Check', module: 'fia' },
      { path: 'stdlib', name: 'fia.stdlib', title: '标准库', icon: 'Collection', module: 'fia' },
      { path: 'trace', name: 'fia.trace', title: '追溯归档', icon: 'Link', module: 'fia' },
      { path: 'supplier', name: 'fia.supplier', title: '供应商送检', icon: 'Truck', module: 'fia' },
    ] },
  { path: '/spc', name: 'spc', title: 'SPC 过程能力', icon: 'TrendCharts', module: 'spc',
    roles: ['sysadmin','inspector','shiftleader','qmanager'],
    children: [
      { path: 'dash', name: 'spc.dash', title: '看板总览', icon: 'Chart', module: 'spc' },
      { path: 'control', name: 'spc.control', title: '控制图', icon: 'TrendCharts', module: 'spc' },
      { path: 'collect', name: 'spc.collect', title: '数据采集', icon: 'Upload', module: 'spc' },
      { path: 'alarm', name: 'spc.alarm', title: '告警处理', icon: 'Bell', module: 'spc' },
      { path: 'capability', name: 'spc.capability', title: '能力分析', icon: 'Aim', module: 'spc' },
    ] },
  { path: '/ncm', name: 'ncm', title: '不良管理', icon: 'Warning', module: 'ncm',
    roles: ['sysadmin','inspector','shiftleader','sqe','qmanager'],
    children: [
      { path: 'dash', name: 'ncm.dash', title: '看板总览', icon: 'Chart', module: 'ncm' },
      { path: 'dict', name: 'ncm.dict', title: '不良字典', icon: 'Collection', module: 'ncm' },
      { path: 'entry', name: 'ncm.entry', title: '不良录入', icon: 'Edit', module: 'ncm' },
      { path: 'analysis', name: 'ncm.analysis', title: '不良分析', icon: 'Search', module: 'ncm' },
      { path: 'trend', name: 'ncm.trend', title: '趋势报表', icon: 'TrendCharts', module: 'ncm' },
      { path: 'compare', name: 'ncm.compare', title: '环比同比', icon: 'Refresh', module: 'ncm' },
      { path: '8d', name: 'ncm.8d', title: '8D 整改', icon: 'Aim', module: 'ncm' },
    ] },
  { path: '/sqm', name: 'sqm', title: '供应商质量', icon: 'OfficeBuilding', module: 'sqm',
    roles: ['sysadmin','inspector','shiftleader','sqe','qmanager','supplier'],
    children: [
      { path: 'dash', name: 'sqm.dash', title: '总览看板', icon: 'Chart', module: 'sqm' },
      { path: 'lifecycle', name: 'sqm.lifecycle', title: '全生命周期', icon: 'DataLine', module: 'sqm' },
      { path: 'audit', name: 'sqm.audit', title: '供应商审核', icon: 'Search', module: 'sqm' },
      { path: 'change', name: 'sqm.change', title: '物料变更', icon: 'Refresh', module: 'sqm' },
      { path: 'abnormal', name: 'sqm.abnormal', title: '来料异常', icon: 'Warning', module: 'sqm' },
      { path: 'fmea', name: 'sqm.fmea', title: 'FMEA 风险', icon: 'Aim', module: 'sqm' },
      { path: 'trace', name: 'sqm.trace', title: '来料追溯', icon: 'Link', module: 'sqm' },
      { path: 'capa', name: 'sqm.capa', title: 'CAPA', icon: 'Shield', module: 'sqm' },
    ] },
  { path: '/patrol', name: 'patrol', title: '巡检管理', icon: 'Guide', module: 'patrol',
    roles: ['sysadmin','inspector','shiftleader','qmanager'],
    children: [
      { path: 'routes', name: 'patrol.routes', title: '巡检路线', icon: 'MapLocation', module: 'patrol' },
      { path: 'tasks', name: 'patrol.tasks', title: '巡检任务', icon: 'List', module: 'patrol' },
      { path: 'abnormals', name: 'patrol.abnormals', title: '巡检异常', icon: 'Warning', module: 'patrol' },
    ] },
  { path: '/archive', name: 'archive', title: '归档查询', icon: 'FolderOpened', module: 'archive',
    roles: ['sysadmin','operator','inspector','shiftleader','sqe','qmanager','aftersales','metrology','qualitysys','supplier'],
    children: null },
  { path: '/system/user', name: 'system.user', title: '用户管理', icon: 'User', module: 'system',
    roles: ['sysadmin','shiftleader','qmanager'], children: null },
  { path: '/system/role', name: 'system.role', title: '角色管理', icon: 'Key', module: 'system',
    roles: ['sysadmin','qmanager'], children: null },
  { path: '/system/menu', name: 'system.menu', title: '菜单管理', icon: 'Menu', module: 'system',
    roles: ['sysadmin','qmanager'], children: null },
  { path: '/system/org', name: 'system.org', title: '组织管理', icon: 'Share', module: 'system',
    roles: ['sysadmin','qmanager'], children: null },
  { path: '/system/config', name: 'system.config', title: '配置中心', icon: 'Setting', module: 'system',
    roles: ['sysadmin','qmanager'], children: null },
]

// ── 侧边栏菜单分组（按业务流程分组，用于左侧导航） ──

export const MODULE_MENU_GROUPS: ModuleMenuGroup[] = [
  {
    label: '工作台',
    items: [
      { path: '/overview',  title: '总览看板', icon: 'DataBoard', roles: ['sysadmin','operator','inspector','shiftleader','sqe','qmanager','aftersales','metrology','qualitysys','supplier'] },
    ],
  },
  {
    label: '过程质量',
    items: [
      { path: '/fia',       title: '首件检验',       icon: 'Document',        roles: ['sysadmin','inspector','shiftleader','qmanager'] },
      { path: '/spc',       title: 'SPC 过程能力',   icon: 'TrendCharts',     roles: ['sysadmin','inspector','shiftleader','qmanager'] },
      { path: '/ncm',       title: '不良管理',       icon: 'Warning',         roles: ['sysadmin','inspector','shiftleader','sqe','qmanager'] },
      { path: '/patrol',    title: '巡检管理',       icon: 'Guide',           roles: ['sysadmin','inspector','shiftleader','qmanager'] },
    ],
  },
  {
    label: '供应商质量',
    items: [
      { path: '/sqm',       title: '供应商质量',     icon: 'OfficeBuilding',  roles: ['sysadmin','inspector','shiftleader','sqe','qmanager','supplier'] },
    ],
  },
  {
    label: '查询与归档',
    items: [
      { path: '/archive',   title: '归档查询',       icon: 'FolderOpened',    roles: ['sysadmin','operator','inspector','shiftleader','sqe','qmanager','aftersales','metrology','qualitysys','supplier'] },
    ],
  },
  {
    label: '系统管理',
    items: [
      { path: '/system/user',   title: '用户管理',   icon: 'User',            roles: ['sysadmin','shiftleader','qmanager'] },
      { path: '/system/role',   title: '角色管理',   icon: 'Key',             roles: ['sysadmin','qmanager'] },
      { path: '/system/menu',   title: '菜单管理',   icon: 'Menu',            roles: ['sysadmin','qmanager'] },
      { path: '/system/org',    title: '组织管理',   icon: 'Share',           roles: ['sysadmin','qmanager'] },
      { path: '/system/config', title: '配置中心',   icon: 'Setting',         roles: ['sysadmin','qmanager'] },
    ],
  },
]
