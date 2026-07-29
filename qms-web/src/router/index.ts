import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { setupRouterGuard } from './guard'
import BasicLayout from '@/layouts/BasicLayout.vue'

const routes: RouteRecordRaw[] = [
  { path: '/login', name: 'Login', component: () => import('@/views/login/index.vue'), meta: { title: '登录', hidden: true } },
  { path: '/company-select', name: 'CompanySelect', component: () => import('@/views/login/CompanySelect.vue'), meta: { title: '选择公司', hidden: true } },

  // 根布局(含 overview)
  { path: '/', component: BasicLayout, redirect: '/overview', children: [
    { path: 'overview', name: 'Overview', component: () => import('@/views/overview/index.vue'), meta: { title: '概览总览', module: 'overview' } },
    { path: 'group', name: 'Group', component: () => import('@/views/overview/Group.vue'), meta: { title: '集团总览', module: 'group' } },
  ]},

  // FIA
  { path: '/fia', component: BasicLayout, redirect: '/fia/dash', meta: { title: '首件检验', module: 'fia' }, children: [
    { path: 'dash', name: 'FiaDash', component: () => import('@/views/fia/Dash.vue'), meta: { title: '看板总览', module: 'fia' } },
    { path: 'tasks', name: 'FiaTasks', component: () => import('@/views/fia/Tasks.vue'), meta: { title: '检验任务', module: 'fia' } },
    { path: 'entry', name: 'FiaEntry', component: () => import('@/views/fia/Entry.vue'), meta: { title: '检验录入', module: 'fia' } },
    { path: 'approve', name: 'FiaApprove', component: () => import('@/views/fia/Approve.vue'), meta: { title: '审批中心', module: 'fia' } },
    { path: 'stdlib', name: 'FiaStdlib', component: () => import('@/views/fia/Stdlib.vue'), meta: { title: '检验标准库', module: 'fia' } },
    { path: 'trace', name: 'FiaTrace', component: () => import('@/views/fia/Trace.vue'), meta: { title: '追溯归档', module: 'fia' } },
    { path: 'supplier', name: 'FiaSupplier', component: () => import('@/views/fia/SupplierEntry.vue'), meta: { title: '供应商送检', module: 'fia' } },
  ]},

  // SPC
  { path: '/spc', component: BasicLayout, redirect: '/spc/dash', meta: { title: 'SPC过程能力', module: 'spc' }, children: [
    { path: 'dash', name: 'SpcDash', component: () => import('@/views/spc/Dash.vue'), meta: { title: '看板总览', module: 'spc' } },
    { path: 'control', name: 'SpcControl', component: () => import('@/views/spc/Control.vue'), meta: { title: '控制图监控', module: 'spc' } },
    { path: 'collect', name: 'SpcCollect', component: () => import('@/views/spc/Collect.vue'), meta: { title: '数据采集', module: 'spc' } },
    { path: 'alarm', name: 'SpcAlarm', component: () => import('@/views/spc/Alarm.vue'), meta: { title: '告警处理', module: 'spc' } },
    { path: 'capability', name: 'SpcCapability', component: () => import('@/views/spc/Capability.vue'), meta: { title: '能力分析', module: 'spc' } },
  ]},

  // NCM
  { path: '/ncm', component: BasicLayout, redirect: '/ncm/dash', meta: { title: '不良管理', module: 'ncm' }, children: [
    { path: 'dash', name: 'NcmDash', component: () => import('@/views/ncm/Dash.vue'), meta: { title: '看板总览', module: 'ncm' } },
    { path: 'dict', name: 'NcmDict', component: () => import('@/views/ncm/Dict.vue'), meta: { title: '不良字典', module: 'ncm' } },
    { path: 'entry', name: 'NcmEntry', component: () => import('@/views/ncm/Entry.vue'), meta: { title: '不良录入', module: 'ncm' } },
    { path: 'analysis', name: 'NcmAnalysis', component: () => import('@/views/ncm/Analysis.vue'), meta: { title: '不良分析', module: 'ncm' } },
    { path: 'trend', name: 'NcmTrend', component: () => import('@/views/ncm/Trend.vue'), meta: { title: '趋势报表', module: 'ncm' } },
    { path: 'compare', name: 'NcmCompare', component: () => import('@/views/ncm/Compare.vue'), meta: { title: '环比同比', module: 'ncm' } },
    { path: '8d', name: 'Ncm8D', component: () => import('@/views/ncm/EightD.vue'), meta: { title: '8D整改', module: 'ncm' } },
  ]},

  // SQM
  { path: '/sqm', component: BasicLayout, redirect: '/sqm/dash', meta: { title: '供应商质量', module: 'sqm' }, children: [
    { path: 'dash', name: 'SqmDash', component: () => import('@/views/sqm/Dash.vue'), meta: { title: '总览看板', module: 'sqm' } },
    { path: 'lifecycle', name: 'SqmLifecycle', component: () => import('@/views/sqm/Lifecycle.vue'), meta: { title: '供应商生命周期', module: 'sqm' } },
    { path: 'audit', name: 'SqmAudit', component: () => import('@/views/sqm/Audit.vue'), meta: { title: '供应商审核', module: 'sqm' } },
    { path: 'change', name: 'SqmChange', component: () => import('@/views/sqm/Change.vue'), meta: { title: '物料变更', module: 'sqm' } },
    { path: 'abnormal', name: 'SqmAbnormal', component: () => import('@/views/sqm/Abnormal.vue'), meta: { title: '来料异常', module: 'sqm' } },
    { path: 'fmea', name: 'SqmFmea', component: () => import('@/views/sqm/Fmea.vue'), meta: { title: 'FMEA风险', module: 'sqm' } },
    { path: 'trace', name: 'SqmTrace', component: () => import('@/views/sqm/trace/TracePage.vue'), meta: { title: '来料追溯', module: 'sqm' } },
    { path: 'capa', name: 'SqmCapa', component: () => import('@/views/sqm/Capa.vue'), meta: { title: 'CAPA', module: 'sqm' } },
  ]},

  // System
  { path: '/system/user', component: BasicLayout, children: [{ path: '', name: 'SystemUser', component: () => import('@/views/system/User.vue'), meta: { title: '用户管理', module: 'system' } }] },
  { path: '/system/role', component: BasicLayout, children: [{ path: '', name: 'SystemRole', component: () => import('@/views/system/Role.vue'), meta: { title: '角色管理', module: 'system' } }] },
  { path: '/system/role/:id/permission', component: BasicLayout, children: [{ path: '', name: 'RolePermission', component: () => import('@/views/system/RolePermission.vue'), meta: { title: '权限配置', module: 'system' } }] },
  { path: '/system/menu', component: BasicLayout, children: [{ path: '', name: 'SystemMenu', component: () => import('@/views/system/Menu.vue'), meta: { title: '菜单管理', module: 'system' } }] },
  { path: '/system/org', component: BasicLayout, children: [{ path: '', name: 'SystemOrg', component: () => import('@/views/system/Org.vue'), meta: { title: '组织管理', module: 'system' } }] },
  { path: '/system/delegation', component: BasicLayout, children: [{ path: '', name: 'SystemDelegation', component: () => import('@/views/system/DelegationList.vue'), meta: { title: '委派管理', module: 'system' } }] },
  { path: '/system/config', component: BasicLayout, children: [{ path: '', name: 'SystemConfig', component: () => import('@/views/system/Config.vue'), meta: { title: '配置中心', module: 'system' } }] },

  // Patrol (NEW)
  { path: '/patrol', component: BasicLayout, redirect: '/patrol/routes', meta: { title: '巡检管理', module: 'patrol' }, children: [
    { path: 'routes', name: 'PatrolRoutes', component: () => import('@/views/patrol/RouteList.vue'), meta: { title: '巡检路线', module: 'patrol' } },
    { path: 'tasks', name: 'PatrolTasks', component: () => import('@/views/patrol/TaskList.vue'), meta: { title: '巡检任务', module: 'patrol' } },
    { path: 'abnormals', name: 'PatrolAbnormals', component: () => import('@/views/patrol/AbnormalList.vue'), meta: { title: '巡检异常', module: 'patrol' } },
  ]},

  // Archive（归档查询）
  { path: '/archive', component: BasicLayout, meta: { title: '归档查询', module: 'archive' }, children: [
    { path: '', name: 'ArchiveList', component: () => import('@/views/archive/ArchiveList.vue'), meta: { title: '归档查询', module: 'archive' } },
  ]},

  // 404
  { path: '/:pathMatch(.*)*', name: 'NotFound', component: () => import('@/views/error/404.vue'), meta: { title: '页面不存在', hidden: true } },
]

const router = createRouter({ history: createWebHistory(), routes, scrollBehavior: () => ({ top: 0 }) })
setupRouterGuard(router)
export default router
